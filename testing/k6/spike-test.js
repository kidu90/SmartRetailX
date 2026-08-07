
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import {
  BASE_URL,
  PRODUCT_ID,
  authHeaders,
  obtainToken,
  createOrderPayload,
} from './config.js';

const errorRate = new Rate('order_errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '10s', target: 300 },
    { duration: '1m', target: 300 },
    { duration: '10s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.15'],
    http_req_duration: ['p(95)<2000'],
  },
};

export function setup() {
  return { token: obtainToken(http, 'spike') };
}

export default function (data) {
  const res = http.post(
    `${BASE_URL}/orders/api/v1/orders`,
    createOrderPayload(PRODUCT_ID),
    authHeaders(data.token)
  );
  const ok = check(res, {
    'order path responsive': (r) => r.status === 201 || r.status === 202 || r.status === 400,
  });
  errorRate.add(!ok && res.status >= 500);
  sleep(0.2);
}
