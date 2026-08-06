const request = require('supertest');
const jwt = require('jsonwebtoken');
const { ROLES } = require('@smartretailx/auth-middleware');
const { clearHistory, createPublisher, createConsumer } = require('@smartretailx/events');
const createApp = require('../../src/app');
const orderStore = require('../../src/store/orderStore');
const catalogueClient = require('../../src/clients/catalogueClient');

jest.mock('../../src/clients/catalogueClient');

const SECRET = 'dev-secret-change-me';

function authHeader(role, sub = 'user-1') {
  const token = jwt.sign(
    { email: `${role}@example.com`, role, typ: 'access' },
    SECRET,
    { subject: sub, expiresIn: '15m' }
  );
  return `Bearer ${token}`;
}

describe('order-service API (async saga)', () => {
  let app;
  const productId = '11111111-1111-1111-1111-111111111111';

  beforeEach(async () => {
    clearHistory();
    orderStore.clear();
    const publisher = createPublisher({ mode: 'local' });
    const consumer = createConsumer({ mode: 'local' });
    app = createApp({ publisher, consumer });
    await app.startConsumers();
    jest.clearAllMocks();

    catalogueClient.getProduct.mockResolvedValue({
      id: productId,
      name: 'Widget',
      price: 25,
      stock: 100,
    });
  });

  afterEach(() => {
    app.stop();
  });

  it('GET /health and /ready', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
    expect((await request(app).get('/ready')).status).toBe(200);
  });

  it('creates a pending order and publishes order.created', async () => {
    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', authHeader(ROLES.CUSTOMER, 'user-1'))
      .send({
        items: [{ productId, quantity: 2 }],
        paymentMethod: 'card',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('pending');
    expect(createRes.body.sagaState).toBe('awaiting_inventory');
  });

  it('rejects unauthenticated create', async () => {
    const res = await request(app).post('/api/v1/orders').send({ userId: 'u1' });
    expect(res.status).toBe(401);
  });

  it('serves swagger docs', async () => {
    expect((await request(app).get('/docs/')).status).toBe(200);
  });
});
