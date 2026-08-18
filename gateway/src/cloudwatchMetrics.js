const {
  CloudWatchClient,
  GetMetricDataCommand,
} = require('@aws-sdk/client-cloudwatch');

const SERVICES = [
  'gateway',
  'order-service',
  'user-service',
  'catalogue-service',
];

/**
 * Read-only CloudWatch summary for the admin dashboard (last hour).
 * Uses GetMetricData against EMF namespace SmartRetailX.
 * Falls back to a demo series when AWS is unavailable (local docker).
 */
function createCloudWatchMetrics(options = {}) {
  const region = options.region || process.env.AWS_REGION || 'ap-south-1';
  const namespace = options.namespace || process.env.CW_METRICS_NAMESPACE || 'SmartRetailX';
  const dashboardName =
    options.dashboardName ||
    process.env.CW_DASHBOARD_NAME ||
    '';
  const dashboardConsoleUrl =
    options.dashboardConsoleUrl ||
    process.env.CW_DASHBOARD_URL ||
    `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:`;

  const client =
    options.client ||
    new CloudWatchClient({
      region,
      // Default credential chain: IRSA / env / instance profile
    });

  function buildQueries(start, end, period) {
    const queries = [];
    let id = 0;
    for (const service of SERVICES) {
      queries.push({
        Id: `req${id}`,
        MetricStat: {
          Metric: {
            Namespace: namespace,
            MetricName: 'RequestCount',
            Dimensions: [{ Name: 'Service', Value: service }],
          },
          Period: period,
          Stat: 'Sum',
        },
        ReturnData: true,
        Label: `requests:${service}`,
      });
      queries.push({
        Id: `err${id}`,
        MetricStat: {
          Metric: {
            Namespace: namespace,
            MetricName: 'ServerErrorCount',
            Dimensions: [{ Name: 'Service', Value: service }],
          },
          Period: period,
          Stat: 'Sum',
        },
        ReturnData: true,
        Label: `errors:${service}`,
      });
      queries.push({
        Id: `lat${id}`,
        MetricStat: {
          Metric: {
            Namespace: namespace,
            MetricName: 'Latency',
            Dimensions: [{ Name: 'Service', Value: service }],
          },
          Period: period,
          Stat: 'p99',
        },
        ReturnData: true,
        Label: `latency:${service}`,
      });
      id += 1;
    }
    return { queries, start, end, period };
  }

  function seriesFromResults(metricDataResults, kind) {
    const byTime = new Map();
    for (const result of metricDataResults || []) {
      const label = result.Label || '';
      if (!label.startsWith(`${kind}:`)) continue;
      const service = label.slice(kind.length + 1);
      const timestamps = result.Timestamps || [];
      const values = result.Values || [];
      for (let i = 0; i < timestamps.length; i += 1) {
        const t = new Date(timestamps[i]).toISOString();
        if (!byTime.has(t)) byTime.set(t, { t });
        byTime.get(t)[service] = Number(values[i] ?? 0);
      }
    }
    return [...byTime.values()].sort((a, b) => a.t.localeCompare(b.t));
  }

  function demoSummary(start, end, period) {
    const points = [];
    for (let ms = start.getTime(); ms <= end.getTime(); ms += period * 1000) {
      const t = new Date(ms).toISOString();
      const wave = Math.round(8 + 6 * Math.sin(ms / 600000));
      points.push({
        t,
        gateway: wave + 4,
        'order-service': Math.max(1, wave - 2),
        'user-service': Math.max(1, Math.round(wave / 2)),
        'catalogue-service': Math.max(1, Math.round(wave / 3)),
      });
    }
    const errors = points.map((p) => ({
      t: p.t,
      gateway: p.gateway > 12 ? 1 : 0,
      'order-service': 0,
      'user-service': 0,
      'catalogue-service': 0,
    }));
    const latency = points.map((p) => ({
      t: p.t,
      gateway: 40 + (p.gateway % 5) * 8,
      'order-service': 60 + (p['order-service'] % 5) * 10,
      'user-service': 30,
      'catalogue-service': 35,
    }));
    const totalRequests = points.reduce(
      (s, p) => s + p.gateway + p['order-service'] + p['user-service'] + p['catalogue-service'],
      0
    );
    return {
      window: {
        start: start.toISOString(),
        end: end.toISOString(),
        periodSeconds: period,
      },
      dashboardName: dashboardName || null,
      dashboardConsoleUrl,
      source: 'demo',
      message:
        'CloudWatch unreachable or no credentials — showing demo series for local UI. Deploy with IRSA for live EMF data.',
      series: {
        requestRate: points,
        errorRate: errors,
        latencyP99: latency,
      },
      totals: {
        requests: totalRequests,
        errors: errors.reduce((s, p) => s + p.gateway, 0),
        avgLatencyMs: 55,
      },
    };
  }

  async function getHourlySummary() {
    const end = new Date();
    const start = new Date(end.getTime() - 60 * 60 * 1000);
    const period = 300; // 5-minute buckets

    if (process.env.CW_METRICS_DEMO === 'true') {
      return demoSummary(start, end, period);
    }

    try {
      const { queries } = buildQueries(start, end, period);
      const response = await client.send(
        new GetMetricDataCommand({
          StartTime: start,
          EndTime: end,
          MetricDataQueries: queries,
          ScanBy: 'TimestampAscending',
        })
      );

      const results = response.MetricDataResults || [];
      const requestRate = seriesFromResults(results, 'requests');
      const errorRate = seriesFromResults(results, 'errors');
      const latencyP99 = seriesFromResults(results, 'latency');

      const hasData =
        requestRate.some((p) =>
          SERVICES.some((s) => Number(p[s] || 0) > 0)
        ) ||
        errorRate.length > 0 ||
        latencyP99.length > 0;

      if (!hasData && process.env.NODE_ENV !== 'production') {
        return demoSummary(start, end, period);
      }

      const totals = {
        requests: requestRate.reduce(
          (sum, p) =>
            sum +
            SERVICES.reduce((s, name) => s + Number(p[name] || 0), 0),
          0
        ),
        errors: errorRate.reduce(
          (sum, p) =>
            sum +
            SERVICES.reduce((s, name) => s + Number(p[name] || 0), 0),
          0
        ),
        avgLatencyMs: (() => {
          const vals = [];
          for (const p of latencyP99) {
            for (const name of SERVICES) {
              if (p[name] != null) vals.push(Number(p[name]));
            }
          }
          if (!vals.length) return 0;
          return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        })(),
      };

      return {
        window: {
          start: start.toISOString(),
          end: end.toISOString(),
          periodSeconds: period,
        },
        dashboardName: dashboardName || null,
        dashboardConsoleUrl,
        source: 'cloudwatch',
        series: { requestRate, errorRate, latencyP99 },
        totals,
      };
    } catch (err) {
      const demo = demoSummary(start, end, period);
      demo.message = `CloudWatch GetMetricData failed (${err.name || 'Error'}: ${err.message}). Showing demo series.`;
      demo.error = err.message;
      return demo;
    }
  }

  return { getHourlySummary, SERVICES };
}

module.exports = { createCloudWatchMetrics, SERVICES };
