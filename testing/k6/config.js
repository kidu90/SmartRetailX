export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const PRODUCT_ID =
  __ENV.PRODUCT_ID || '11111111-1111-1111-1111-111111111111';

export function authHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

/**
 * Register (or login on conflict) and return accessToken.
 */
export function obtainToken(http, emailPrefix = 'k6') {
  const email = `${emailPrefix}-${Date.now()}@example.com`;
  const password = 'password123';
  const register = http.post(
    `${BASE_URL}/users/api/v1/auth/register`,
    JSON.stringify({
      email,
      password,
      name: 'K6 Shopper',
      role: 'customer',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (register.status === 201) {
    return register.json('accessToken');
  }

  const login = http.post(
    `${BASE_URL}/users/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  return login.json('accessToken');
}

export function createOrderPayload(productId = PRODUCT_ID) {
  return JSON.stringify({
    items: [{ productId, quantity: 1 }],
    paymentMethod: 'card',
  });
}
