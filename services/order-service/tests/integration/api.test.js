const request = require('supertest');
const createApp = require('../../src/app');
const orderStore = require('../../src/store/orderStore');
const catalogueClient = require('../../src/clients/catalogueClient');
const paymentClient = require('../../src/clients/paymentClient');
const eventPublisher = require('../../src/events/eventPublisher');

jest.mock('../../src/clients/catalogueClient');
jest.mock('../../src/clients/paymentClient');

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

  it('creates, fetches, and updates an order with events', async () => {
    const createRes = await request(app)
      .post('/api/v1/orders')
      .send({
        userId: 'user-1',
        items: [{ productId, quantity: 2 }],
        paymentMethod: 'card',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('paid');
    expect(createRes.body.total).toBe(50);
    expect(eventPublisher.getPublished()).toHaveLength(1);

    const getRes = await request(app).get(`/api/v1/orders/${createRes.body.id}`);
    expect(getRes.status).toBe(200);

    const statusRes = await request(app)
      .patch(`/api/v1/orders/${createRes.body.id}/status`)
      .send({ status: 'processing' });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe('processing');
    expect(eventPublisher.getPublished()).toHaveLength(2);
  });

  it('validates create payload', async () => {
    const res = await request(app).post('/api/v1/orders').send({ userId: 'u1' });
    expect(res.status).toBe(400);
  });

  it('serves swagger docs', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
  });
});
