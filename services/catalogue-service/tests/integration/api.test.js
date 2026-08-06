const request = require('supertest');
const jwt = require('jsonwebtoken');
const { ROLES } = require('@smartretailx/auth-middleware');
const createApp = require('../../src/app');
const catalogueStore = require('../../src/store/catalogueStore');

const SECRET = 'dev-secret-change-me';

function authHeader(role = ROLES.ADMIN, sub = 'admin-1') {
  const token = jwt.sign(
    { email: `${role}@example.com`, role, typ: 'access' },
    SECRET,
    { subject: sub, expiresIn: '15m' }
  );
  return `Bearer ${token}`;
}

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

  it('supports category and product CRUD plus search with admin token', async () => {
    const categoryRes = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', authHeader(ROLES.ADMIN))
      .send({ name: 'Electronics', description: 'Gadgets' });
    expect(categoryRes.status).toBe(201);
    const categoryId = categoryRes.body.id;

    const productRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', authHeader(ROLES.ADMIN))
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

    const updated = await request(app)
      .put(`/api/v1/products/${productRes.body.id}`)
      .set('Authorization', authHeader(ROLES.WAREHOUSE_STAFF))
      .send({ name: 'Pro Headphones', price: 129.99, categoryId, stock: 8 });
    expect(updated.status).toBe(200);

    const forbidden = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', authHeader(ROLES.CUSTOMER))
      .send({ name: 'Nope' });
    expect(forbidden.status).toBe(403);

    const del = await request(app)
      .delete(`/api/v1/products/${productRes.body.id}`)
      .set('Authorization', authHeader(ROLES.ADMIN));
    expect(del.status).toBe(204);
  });

  it('rejects unauthenticated mutations', async () => {
    const res = await request(app).post('/api/v1/products').send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('serves swagger docs', async () => {
    expect((await request(app).get('/docs/')).status).toBe(200);
  });
});
