const { context, trace, SpanStatusCode } = require('@opentelemetry/api');

let sdk = null;
let xrayExpress = null;
let xrayEnabled = false;

/**
 * Initialise tracing:
 * - AWS_XRAY_ENABLED=true → aws-xray-sdk (UDP to X-Ray daemon)
 * - OTEL_ENABLED=true → OpenTelemetry OTLP (e.g. ADOT → X-Ray)
 */
async function initTracing(serviceName) {
  if (process.env.AWS_XRAY_ENABLED === 'true') {
    try {
      const AWSXRay = require('aws-xray-sdk-core');
      xrayExpress = require('aws-xray-sdk-express');
      const daemon =
        process.env.AWS_XRAY_DAEMON_ADDRESS || '127.0.0.1:2000';
      AWSXRay.setDaemonAddress(daemon);
      AWSXRay.captureHTTPsGlobal(require('http'));
      AWSXRay.captureHTTPsGlobal(require('https'));
      xrayEnabled = true;
      if (process.env.NODE_ENV !== 'test') {
        console.info(`[tracing] AWS X-Ray SDK enabled for ${serviceName} → ${daemon}`);
      }
      return { enabled: true, mode: 'xray-sdk', shutdown: async () => {} };
    } catch (err) {
      console.warn(`[tracing] X-Ray SDK init failed for ${serviceName}:`, err.message);
    }
  }

  const otelOn = process.env.OTEL_ENABLED === 'true';
  if (!otelOn || sdk) {
    return { enabled: Boolean(sdk) || xrayEnabled, shutdown: async () => {} };
  }

  try {
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const {
      OTLPTraceExporter,
    } = require('@opentelemetry/exporter-trace-otlp-http');
    const { Resource } = require('@opentelemetry/resources');
    const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');
    const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
    const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');

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
      mode: 'otel',
      async shutdown() {
        await sdk.shutdown();
        sdk = null;
      },
    };
  } catch (err) {
    console.warn(`[tracing] OTel init failed for ${serviceName}:`, err.message);
    return { enabled: false, shutdown: async () => {} };
  }
}

/**
 * Inbound middleware: X-Ray openSegment, or OTel span tags.
 */
function tracingMiddleware(serviceName) {
  if (xrayEnabled && xrayExpress) {
    return xrayExpress.openSegment(serviceName);
  }

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

/** Call after all routes when using the X-Ray Express SDK. */
function closeTracing(app) {
  if (xrayEnabled && xrayExpress) {
    app.use(xrayExpress.closeSegment());
  }
}

module.exports = { initTracing, tracingMiddleware, closeTracing };
