const { createResilientClient } = require('@smartretailx/resilient-http');
const config = require('../config');
const AppError = require('../utils/AppError');

const catalogueHttp = createResilientClient({
  name: 'catalogue-service',
  timeoutMs: 3000,
  retries: 2,
  baseDelayMs: 100,
  breakerOptions: {
    errorThresholdPercentage: 50,
    resetTimeout: 10000,
    volumeThreshold: 5,
  },
  fallback: async () => {
    const err = new AppError('Catalogue service unavailable (circuit open)', 503);
    err.code = 'CIRCUIT_OPEN';
    throw err;
  },
});

async function getProduct(productId, fetchImpl) {
  const url = `${config.catalogueServiceUrl}/api/v1/products/${productId}`;
  const doFetch = fetchImpl
    ? (u, init) => fetchImpl(u, init)
    : (u, init) => catalogueHttp.fetch(u, init);

  let response;
  try {
    response = await doFetch(url);
  } catch (err) {
    if (err.statusCode === 503 || err.code === 'CIRCUIT_OPEN') throw err;
    throw new AppError(`Catalogue service unreachable: ${err.message}`, 502);
  }

  if (response.status === 404) {
    throw new AppError(`Product not found: ${productId}`, 400);
  }
  if (!response.ok) {
    throw new AppError(`Catalogue service error (${response.status})`, 502);
  }

  return response.json();
}

module.exports = { getProduct, catalogueHttp };
