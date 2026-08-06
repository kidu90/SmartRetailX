const request = require('supertest');
const jwt = require('jsonwebtoken');
const { ROLES } = require('@smartretailx/auth-middleware');
const createApp = require('../../src/app');
const orderStore = require('../../src/store/orderStore');
const catalogueClient = require('../../src/clients/catalogueClient');
const paymentClient = require('../../src/clients/paymentClient');
const eventPublisher = require('../../src/events/eventPublisher');

jest.mock('../../src/clients/catalogueClient');
jest.mock('../../src/clients/paymentClient');

const SECRET = 'dev-secret-change-me';

function authHeader(role, sub = 'user-1') {
  const token = jwt.sign(
    { email: `${role}@example.com`, role, typ: 'access' },
    SECRET,
    { subject: sub, expiresIn: '15m' }
  );
  return `Bearer ${token}`;
}

describe('order-service API', () => {
  let app;
  const productId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    orderStore.clear();
    eventPublisher.clearPublished();
    app = createApp();
    jest.clearAllMocks();

    catalogueClient.getProduct.mockResolvedValue({
      id: productId,
      name: 'Widget',
      price: 25,
      stock: 100,
    });
    paymentClient.chargePayment.mockResolvedValue({
      id: 'pay-1',
      status: 'succeeded',
      amount: 50,
    });
  });

  it('GET /health and /ready', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
    expect((await request(app).get('/ready')).status).toBe(200);
  });

  it('creates, fetches, and updates an order with correct roles', async () => {
    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', authHeader(ROLES.CUSTOMER, 'user-1'))
      .send({
        userId: 'user-1',
        items: [{ productId, quantity: 2 }],
        paymentMethod: 'card',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('paid');

    const getRes = await request(app)
      .get(`/api/v1/orders/${createRes.body.id}`)
      .set('Authorization', authHeader(ROLES.CUSTOMER, 'user-1'));
    expect(getRes.status).toBe(200);

    const forbiddenStatus = await request(app)
      .patch(`/api/v1/orders/${createRes.body.id}/status`)
      .set('Authorization', authHeader(ROLES.CUSTOMER, 'user-1'))
      .send({ status: 'processing' });
    expect(forbiddenStatus.status).toBe(403);

    const statusRes = await request(app)
      .patch(`/api/v1/orders/${createRes.body.id}/status`)
      .set('Authorization', authHeader(ROLES.WAREHOUSE_STAFF, 'wh-1'))
      .send({ status: 'processing' });
    expect(statusRes.status).toBe(200);
  });

  it('rejects unauthenticated create', async () => {
    const res = await request(app).post('/api/v1/orders').send({ userId: 'u1' });
    expect(res.status).toBe(401);
  });

  it('serves swagger docs', async () => {
    expect((await request(app).get('/docs/')).status).toBe(200);
  });
});
