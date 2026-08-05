const request = require('supertest');
const createApp = require('../src/app');

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
    expect(res.body.upstreams.catalogue).toBeDefined();
    expect(res.body.upstreams.orders).toBeDefined();
  });

  it('serves aggregated swagger', async () => {
    const docs = await request(app).get('/docs/');
    expect(docs.status).toBe(200);

    const spec = await request(app).get('/swagger.json');
    expect(spec.status).toBe(200);
    expect(spec.body.info.title).toContain('Gateway');
    expect(spec.body.paths['/users/api/v1/auth/register']).toBeDefined();
    expect(spec.body.paths['/catalogue/api/v1/products']).toBeDefined();
    expect(spec.body.paths['/orders/api/v1/orders']).toBeDefined();
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown');
    expect(res.status).toBe(404);
  });
});
