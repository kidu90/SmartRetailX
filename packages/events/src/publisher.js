const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { publishLocal } = require('./localBus');
const { createEvent } = require('./types');

/**
 * Publish domain events.
 *
 * Modes:
 * - local (default): in-process EventEmitter (+ optional HTTP fan-out)
 * - aws: SNS Publish to ORDER_EVENTS_TOPIC_ARN
 */
function createPublisher(options = {}) {
  const mode = options.mode || process.env.EVENTING_MODE || 'local';
  const topicArn = options.topicArn || process.env.ORDER_EVENTS_TOPIC_ARN;
  const httpTargets = (
    options.httpTargets ||
    process.env.EVENT_HTTP_TARGETS ||
    ''
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const sns =
    mode === 'aws'
      ? new SNSClient({ region: process.env.AWS_REGION || 'ap-south-1' })
      : null;

  async function publish(type, payload, meta = {}) {
    const event = createEvent(type, payload, meta);

    if (mode === 'local' || mode === 'http') {
      publishLocal(event);
    }

    if ((mode === 'http' || mode === 'local') && httpTargets.length) {
      await Promise.all(
        httpTargets.map(async (url) => {
          try {
            await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(event),
            });
          } catch (err) {
            // Best-effort fan-out in local/docker
            if (process.env.NODE_ENV !== 'test') {
              console.warn(`Event HTTP fan-out failed for ${url}:`, err.message);
            }
          }
        })
      );
    }

    if (mode === 'aws') {
      if (!topicArn) {
        throw new Error('ORDER_EVENTS_TOPIC_ARN is required when EVENTING_MODE=aws');
      }
      await sns.send(
        new PublishCommand({
          TopicArn: topicArn,
          Message: JSON.stringify(event),
          MessageAttributes: {
            eventType: { DataType: 'String', StringValue: type },
          },
        })
      );
    }

    return event;
  }

  return { publish, mode };
}

module.exports = { createPublisher };
