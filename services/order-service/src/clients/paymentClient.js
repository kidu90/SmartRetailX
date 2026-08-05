const config = require('../config');
const AppError = require('../utils/AppError');

/**
 * Calls payment-service over REST. For local scaffolding without a real
 * payment-service, falls back to a simulated successful charge when the
 * downstream host is unreachable in development.
 */
async function chargePayment({ orderId, amount, method, userId }, fetchImpl = fetch) {
  const url = `${config.paymentServiceUrl}/api/v1/payments`;
  const body = JSON.stringify({ orderId, amount, method, userId });

  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch (err) {
    if (config.nodeEnv === 'production') {
      throw new AppError(`Payment service unreachable: ${err.message}`, 502);
    }
    return {
      id: `sim-pay-${orderId}`,
      status: 'succeeded',
      amount,
      simulated: true,
    };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new AppError(`Payment failed (${response.status}): ${text}`, 502);
  }

  return response.json();
}

module.exports = { chargePayment };
