
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import {
  BASE_URL,
  PRODUCT_ID,
  authHeaders,
  obtainToken,
  createOrderPayload,
} from './config.js';

const errorRate = new Rate('order_errors');
const orderLatency = new Trend('order_latency_ms', true);

export const options = {
  scenarios: {
    steady_100: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    order_errors: ['rate<0.05'],
  },
};

export function setup() {
  const token = obtainToken(http, 'load');
  return { token };
}

export default function (data) {
  const res = http.post(
    `${BASE_URL}/orders/api/v1/orders`,
    createOrderPayload(PRODUCT_ID),
    authHeaders(data.token)
  );
  orderLatency.add(res.timings.duration);
  const ok = check(res, {
    'order accepted (201/202)': (r) => r.status === 201 || r.status === 202,
  });
  errorRate.add(!ok);
  sleep(1);
}
