
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
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 400 },
    { duration: '2m', target: 600 },
    { duration: '3m', target: 0 },
  ],
  thresholds: {
    // Document the breaking point; do not fail the run solely on errors
    http_req_duration: ['p(95)<3000'],
  },
};

export function setup() {
  return { token: obtainToken(http, 'stress') };
}

export default function (data) {
  const res = http.post(
    `${BASE_URL}/orders/api/v1/orders`,
    createOrderPayload(PRODUCT_ID),
    authHeaders(data.token)
  );
  const ok = check(res, {
    'status < 500': (r) => r.status < 500,
  });
  errorRate.add(!ok);
  sleep(0.5);
}
