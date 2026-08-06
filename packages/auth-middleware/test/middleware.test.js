const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { authenticate, requireRoles, ROLES } = require('../src');

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('authenticate', () => {
  const secret = 'test-secret';

  it('accepts a valid access token', () => {
    const token = jwt.sign(
      { email: 'a@b.com', role: ROLES.CUSTOMER, typ: 'access' },
      secret,
      { subject: 'user-1', expiresIn: '15m' }
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let called = false;
    authenticate({ jwtSecret: secret })(req, res, () => {
      called = true;
    });
    assert.equal(called, true);
    assert.equal(req.user.role, ROLES.CUSTOMER);
  });

  it('rejects refresh tokens used as access', () => {
    const token = jwt.sign(
      { email: 'a@b.com', role: ROLES.CUSTOMER, typ: 'refresh' },
      secret,
      { subject: 'user-1', expiresIn: '7d' }
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    authenticate({ jwtSecret: secret })(req, res, () => {
      assert.fail('should not call next');
    });
    assert.equal(res.statusCode, 401);
  });
});

describe('requireRoles', () => {
  it('returns 403 when role is wrong', () => {
    const req = { user: { id: '1', role: ROLES.CUSTOMER } };
    const res = mockRes();
    requireRoles(ROLES.ADMIN)(req, res, () => {
      assert.fail('should not call next');
    });
    assert.equal(res.statusCode, 403);
  });

  it('allows matching role', () => {
    const req = { user: { id: '1', role: ROLES.ADMIN } };
    const res = mockRes();
    let called = false;
    requireRoles(ROLES.ADMIN, ROLES.WAREHOUSE_STAFF)(req, res, () => {
      called = true;
    });
    assert.equal(called, true);
  });
});
