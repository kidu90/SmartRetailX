const request = require('supertest');
const createApp = require('../../src/app');
const catalogueStore = require('../../src/store/catalogueStore');

describe('catalogue-service API', () => {
  let app;

  beforeEach(() => {
    catalogueStore.clear();
    app = createApp();
  });

  it('GET /health and /ready', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
    expect((await request(app).get('/ready')).status).toBe(200);
  });

  it('supports category and product CRUD plus search', async () => {
    const categoryRes = await request(app)
      .post('/api/v1/categories')
      .send({ name: 'Electronics', description: 'Gadgets' });
    expect(categoryRes.status).toBe(201);
    const categoryId = categoryRes.body.id;

    const productRes = await request(app)
      .post('/api/v1/products')
      .send({
        name: 'Wireless Headphones',
        description: 'Noise cancelling',
        price: 99.99,
        categoryId,
        stock: 10,
      });
    expect(productRes.status).toBe(201);

    const list = await request(app).get('/api/v1/products');
    expect(list.body).toHaveLength(1);

    const search = await request(app).get('/api/v1/search').query({ q: 'headphones' });
    expect(search.status).toBe(200);
    expect(search.body).toHaveLength(1);

    const updated = await request(app)
      .put(`/api/v1/products/${productRes.body.id}`)
      .send({
        name: 'Pro Headphones',
        price: 129.99,
        categoryId,
        stock: 8,
      });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Pro Headphones');

    const del = await request(app).delete(`/api/v1/products/${productRes.body.id}`);
    expect(del.status).toBe(204);
  });

  it('validates product create', async () => {
    const res = await request(app).post('/api/v1/products').send({ name: 'X' });
    expect(res.status).toBe(400);
  });

  it('serves swagger docs', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
  });
});
