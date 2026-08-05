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
    expect(res.body.status).toBe('ok');
  });

  it('GET /ready returns ready', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  it('registers and logs in a user', async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'shopper@example.com', password: 'password123', name: 'Shopper' });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.token).toBeDefined();
    expect(registerRes.body.user.email).toBe('shopper@example.com');

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'shopper@example.com', password: 'password123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
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

  it('gets and updates profile with JWT', async () => {
    const { body } = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'me@example.com', password: 'password123', name: 'Me' });

    const me = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${body.token}`);

    expect(me.status).toBe(200);
    expect(me.body.name).toBe('Me');

    const updated = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${body.token}`)
      .send({ name: 'Updated Me' });

    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Updated Me');
  });

  it('validates register payload', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
  });

  it('serves swagger docs', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
  });
});
