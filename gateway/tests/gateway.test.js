const request = require('supertest');
const jwt = require('jsonwebtoken');
const { ROLES } = require('@smartretailx/auth-middleware');
const createApp = require('../src/app');

const SECRET = 'dev-secret-change-me';

describe('gateway', () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('gateway');
  });

  it('GET /ready lists upstreams', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.upstreams.users).toBeDefined();
  });

  it('serves aggregated swagger', async () => {
    const docs = await request(app).get('/docs/');
    expect(docs.status).toBe(200);
    const spec = await request(app).get('/swagger.json');
    expect(spec.body.info.title).toContain('Gateway');
  });

  it('requires JWT for /orders', async () => {
    const res = await request(app).get('/orders/api/v1/orders');
    expect(res.status).toBe(401);
  });

  it('returns 403 for catalogue mutations with customer role', async () => {
    const token = jwt.sign(
      { email: 'c@example.com', role: ROLES.CUSTOMER, typ: 'access' },
      SECRET,
      { subject: 'c1', expiresIn: '15m' }
    );
    const res = await request(app)
      .post('/catalogue/api/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown');
    expect(res.status).toBe(404);
  });

  it('GET /ops/metrics/summary requires admin', async () => {
    const denied = await request(app).get('/ops/metrics/summary');
    expect(denied.status).toBe(401);

    const customer = jwt.sign(
      { email: 'c@example.com', role: ROLES.CUSTOMER, typ: 'access' },
      SECRET,
      { subject: 'c1', expiresIn: '15m' }
    );
    const forbid = await request(app)
      .get('/ops/metrics/summary')
      .set('Authorization', `Bearer ${customer}`);
    expect(forbid.status).toBe(403);
  });

  it('GET /ops/metrics/summary returns series for admin', async () => {
    process.env.CW_METRICS_DEMO = 'true';
    const token = jwt.sign(
      { email: 'a@example.com', role: ROLES.ADMIN, typ: 'access' },
      SECRET,
      { subject: 'a1', expiresIn: '15m' }
    );
    const res = await request(app)
      .get('/ops/metrics/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.series).toBeDefined();
    expect(res.body.series.requestRate).toBeInstanceOf(Array);
    expect(res.body.totals).toHaveProperty('requests');
    expect(res.body.dashboardConsoleUrl).toBeTruthy();
    delete process.env.CW_METRICS_DEMO;
  });
});
