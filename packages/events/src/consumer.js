const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require('@aws-sdk/client-sqs');
const { subscribeLocal } = require('./localBus');

function unwrapSqsBody(body) {
  const parsed = JSON.parse(body);
  // SNS → SQS subscription wraps the payload
  if (parsed.Type === 'Notification' && parsed.Message) {
    return typeof parsed.Message === 'string'
      ? JSON.parse(parsed.Message)
      : parsed.Message;
  }
  return parsed;
}

/**
 * Consume events from SQS (aws) or local bus (local/http).
 */
function createConsumer(options = {}) {
  const mode = options.mode || process.env.EVENTING_MODE || 'local';
  const queueUrl = options.queueUrl || process.env.EVENTS_QUEUE_URL;
  const handlers = new Map();

  function on(eventType, handler) {
    handlers.set(eventType, handler);
  }

  function onAny(handler) {
    handlers.set('*', handler);
  }

  async function dispatch(event) {
    const specific = handlers.get(event.type);
    if (specific) await specific(event);
    const any = handlers.get('*');
    if (any) await any(event);
  }

  let unsub = null;
  let polling = false;
  let sqs = null;

  async function start() {
    if (mode === 'local' || mode === 'http') {
      unsub = subscribeLocal('*', (event) => {
        Promise.resolve(dispatch(event)).catch((err) => {
          console.error('Local event handler error', err);
        });
      });
      // Also accept HTTP-injected events via options.attachExpress if provided
      return;
    }

    if (!queueUrl) {
      throw new Error('EVENTS_QUEUE_URL is required when EVENTING_MODE=aws');
    }

    sqs = new SQSClient({ region: process.env.AWS_REGION || 'ap-south-1' });
    polling = true;

    (async function poll() {
      while (polling) {
        try {
          const res = await sqs.send(
            new ReceiveMessageCommand({
              QueueUrl: queueUrl,
              MaxNumberOfMessages: 5,
              WaitTimeSeconds: 20,
              VisibilityTimeout: 30,
            })
          );

          for (const message of res.Messages || []) {
            try {
              const event = unwrapSqsBody(message.Body);
              await dispatch(event);
              await sqs.send(
                new DeleteMessageCommand({
                  QueueUrl: queueUrl,
                  ReceiptHandle: message.ReceiptHandle,
                })
              );
            } catch (err) {
              console.error('Failed to process SQS message', err);
            }
          }
        } catch (err) {
          console.error('SQS poll error', err);
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    })();
  }

  function stop() {
    polling = false;
    if (unsub) unsub();
  }

  /**
   * Express middleware for docker/http fan-out: POST /internal/events
   */
  function expressHandler() {
    return async (req, res) => {
      try {
        await dispatch(req.body);
        res.status(202).json({ accepted: true });
      } catch (err) {
        res.status(500).json({ error: { message: err.message } });
      }
    };
  }

  return { on, onAny, start, stop, expressHandler, dispatch };
}

module.exports = { createConsumer, unwrapSqsBody };
