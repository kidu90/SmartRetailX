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
  // Mock third-party gateway response — real impl would call Stripe/Adyen/etc.
  return {
    token: `tok_mock_${paymentMethod}_${Date.now()}`,
    method: paymentMethod,
    psp: 'mock-psp',
  };
}

async function chargePayment(
  { orderId, amount, method, userId, paymentToken },
  fetchImpl = fetch
) {
  const tokenized = paymentToken || tokenizeCard(method).token;
  const url = `${config.paymentServiceUrl}/api/v1/payments`;
  const body = JSON.stringify({
    orderId,
    amount,
    method,
    userId,
    // Opaque token only — never a card number / CVV
    paymentToken: tokenized,
  });

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
      paymentToken: tokenized,
      simulated: true,
    };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new AppError(`Payment failed (${response.status}): ${text}`, 502);
  }

  return response.json();
}

module.exports = { chargePayment, tokenizeCard };
