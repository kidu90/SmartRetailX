const { createResilientClient } = require('@smartretailx/resilient-http');
const config = require('../config');
const AppError = require('../utils/AppError');

/**
 * PCI-DSS: never accept or persist raw PANs. Tokenize via a mock PSP and charge
 * using the opaque token only.
 */
function tokenizeCard(paymentMethod) {
  if (paymentMethod === 'cash_on_delivery') {
    return { token: null, method: paymentMethod };
  }
  return {
    token: `tok_mock_${paymentMethod}_${Date.now()}`,
    method: paymentMethod,
    psp: 'mock-psp',
  };
}

const paymentHttp = createResilientClient({
  name: 'payment-service',
  timeoutMs: 4000,
  retries: 2,
  breakerOptions: {
    errorThresholdPercentage: 50,
    resetTimeout: 15000,
    volumeThreshold: 5,
  },
  fallback: async (_url, init) => {
    if (config.nodeEnv === 'production') {
      const err = new AppError('Payment service unavailable (circuit open)', 503);
      err.code = 'CIRCUIT_OPEN';
      throw err;
    }
    // Dev/test degraded mode — simulate success so local saga can proceed
    const body = init?.body ? JSON.parse(init.body) : {};
    return {
      ok: true,
      status: 200,
      json: async () => ({
        id: `sim-pay-${body.orderId || 'unknown'}`,
        status: 'succeeded',
        amount: body.amount,
        paymentToken: body.paymentToken,
        simulated: true,
        fallback: true,
      }),
    };
  },
});

async function chargePayment(
  { orderId, amount, method, userId, paymentToken },
  fetchImpl
) {
  const tokenized = paymentToken || tokenizeCard(method).token;
  const url = `${config.paymentServiceUrl}/api/v1/payments`;
  const body = JSON.stringify({
    orderId,
    amount,
    method,
    userId,
    paymentToken: tokenized,
  });

  const doFetch = fetchImpl
    ? (u, init) => fetchImpl(u, init)
    : (u, init) => paymentHttp.fetch(u, init);

  let response;
  try {
    response = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch (err) {
    if (err.statusCode === 503 || err.code === 'CIRCUIT_OPEN') throw err;
    if (config.nodeEnv === 'production') {
      throw new AppError(`Payment service unreachable: ${err.message}`, 502);
    }
    return {
      id: `sim-pay-${orderId}`,
      status: 'succeeded',
      amount,
      paymentToken: tokenized,
      simulated: true,
    };
  }

  if (!response.ok) {
    const text = typeof response.text === 'function'
      ? await response.text().catch(() => '')
      : '';
    throw new AppError(`Payment failed (${response.status}): ${text}`, 502);
  }

  return response.json();
}

module.exports = { chargePayment, tokenizeCard, paymentHttp };
