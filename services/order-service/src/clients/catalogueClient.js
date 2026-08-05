const config = require('../config');
const AppError = require('../utils/AppError');

async function getProduct(productId, fetchImpl = fetch) {
  const url = `${config.catalogueServiceUrl}/api/v1/products/${productId}`;
  let response;
  try {
    response = await fetchImpl(url);
  } catch (err) {
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

module.exports = { getProduct };
