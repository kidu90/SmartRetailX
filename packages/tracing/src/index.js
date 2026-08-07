const { context, trace, SpanStatusCode } = require('@opentelemetry/api');

let sdk = null;

/**
 * Initialise OpenTelemetry when OTEL_ENABLED=true or AWS_XRAY_ENABLED=true.
 * Export via OTLP HTTP (default localhost:4318). On EKS, point at the ADOT
 * collector which can forward to AWS X-Ray.
 */
async function initTracing(serviceName) {
  const enabled =
    process.env.OTEL_ENABLED === 'true' ||
    process.env.AWS_XRAY_ENABLED === 'true';

  if (!enabled || sdk) {
    return { enabled: Boolean(sdk), shutdown: async () => {} };
  }

  try {
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const {
      OTLPTraceExporter,
    } = require('@opentelemetry/exporter-trace-otlp-http');
    const {
      Resource,
    } = require('@opentelemetry/resources');
    const {
      ATTR_SERVICE_NAME,
    } = require('@opentelemetry/semantic-conventions');
    const {
      HttpInstrumentation,
    } = require('@opentelemetry/instrumentation-http');
    const {
      ExpressInstrumentation,
    } = require('@opentelemetry/instrumentation-express');

    const endpoint =
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://127.0.0.1:4318';

    sdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: serviceName,
      }),
      traceExporter: new OTLPTraceExporter({
        url: `${endpoint.replace(/\/$/, '')}/v1/traces`,
      }),
      instrumentations: [
        new HttpInstrumentation({
          ignoreIncomingRequestHook: (req) =>
            ['/health', '/ready', '/metrics'].includes(req.url?.split('?')[0]),
        }),
        new ExpressInstrumentation(),
      ],
    });

    await sdk.start();
    return {
      enabled: true,
      async shutdown() {
        await sdk.shutdown();
        sdk = null;
      },
    };
  } catch (err) {
    // Tracing must never take down the service
    console.warn(`[tracing] init failed for ${serviceName}:`, err.message);
    return { enabled: false, shutdown: async () => {} };
  }
}

/**
 * Lightweight Express middleware that tags the active span with route info.
 * Safe when tracing is disabled (no-op).
 */
function tracingMiddleware(serviceName) {
  return (req, res, next) => {
    const span = trace.getSpan(context.active());
    if (span) {
      span.setAttribute('service.name', serviceName);
      span.setAttribute('http.route', req.path);
      res.on('finish', () => {
        if (res.statusCode >= 500) {
          span.setStatus({ code: SpanStatusCode.ERROR });
        }
      });
    }
    next();
  };
}

module.exports = { initTracing, tracingMiddleware };
