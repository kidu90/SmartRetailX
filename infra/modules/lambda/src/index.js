/**
 * SmartRetailX notification-service (example)
 * Triggered by SQS messages from the order-events SNS subscription.
 */
exports.handler = async (event) => {
  const results = [];

  for (const record of event.Records || []) {
    let body = record.body;
    try {
      body = JSON.parse(record.body);
      // SNS → SQS wraps the payload
      if (body.Message) {
        body = typeof body.Message === 'string' ? JSON.parse(body.Message) : body.Message;
      }
    } catch {
      // keep raw body
    }

    console.log(JSON.stringify({
      level: 'info',
      message: 'notification dispatched',
      service: process.env.SERVICE,
      environment: process.env.ENVIRONMENT,
      orderEvent: body,
      messageId: record.messageId,
    }));

    results.push({ messageId: record.messageId, status: 'notified' });
  }

  return { ok: true, count: results.length, results };
};
