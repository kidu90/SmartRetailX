const { v4: uuidv4 } = require('uuid');
const { EventTypes } = require('@smartretailx/events');
const config = require('./config');

function createPaymentHandlers(publisher) {
  async function onPaymentRequested(event) {
    const { orderId, userId, amount, method, items } = event.payload;

    if (config.forceFailure || method === 'fail_card') {
      await publisher.publish(
        EventTypes.PAYMENT_FAILED,
        {
          orderId,
          userId,
          amount,
          items,
          reason: 'simulated_payment_failure',
        },
        { correlationId: orderId, source: 'payment-service' }
      );
      return;
    }

    // PCI: charge using opaque token only (never PAN)
    const paymentToken = `tok_mock_${method || 'card'}_${Date.now()}`;
    await publisher.publish(
      EventTypes.PAYMENT_SUCCEEDED,
      {
        orderId,
        userId,
        amount,
        items,
        paymentId: uuidv4(),
        paymentToken,
      },
      { correlationId: orderId, source: 'payment-service' }
    );
  }

  return { onPaymentRequested };
}

module.exports = { createPaymentHandlers };
