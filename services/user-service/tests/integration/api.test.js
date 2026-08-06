const request = require('supertest');
const createApp = require('../../src/app');
const userStore = require('../../src/store/userStore');

describe('user-service API', () => {
  let app;

  beforeEach(() => {
    userStore.clear();
    app = createApp();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('registers and logs in with access + refresh tokens', async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'shopper@example.com', password: 'password123', name: 'Shopper' });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.accessToken).toBeDefined();
    expect(registerRes.body.refreshToken).toBeDefined();
    expect(registerRes.body.user.role).toBe('customer');

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'shopper@example.com', password: 'password123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeDefined();
  });

  it('refreshes tokens and erases account (GDPR)', async () => {
    const { body } = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'me@example.com', password: 'password123', name: 'Me' });

    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: body.refreshToken });

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeDefined();

    const me = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`);
    expect(me.status).toBe(200);

    const erased = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`);
    expect(erased.status).toBe(200);
    expect(erased.body.erased).toBe(true);
  });

  it('rejects duplicate registration', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'dup@example.com', password: 'password123', name: 'Dup' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'dup@example.com', password: 'password123', name: 'Dup' });

    expect(res.status).toBe(409);
  });

  it('validates register payload', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
  });
});
