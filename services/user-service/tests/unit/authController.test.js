const authController = require('../../src/controllers/authController');
const userService = require('../../src/services/userService');

jest.mock('../../src/services/userService');

describe('authController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('returns 201 with token pair', async () => {
      const payload = {
        accessToken: 'a',
        refreshToken: 'r',
        user: { id: '1', email: 'a@b.com', role: 'customer' },
      };
      userService.register.mockResolvedValue(payload);
      req.body = { email: 'a@b.com', password: 'password1', name: 'A' };

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(payload);
    });

    it('forwards errors to next', async () => {
      const err = new Error('conflict');
      userService.register.mockRejectedValue(err);
      await authController.register(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('login', () => {
    it('returns 200 with token pair', async () => {
      const payload = { accessToken: 'a', refreshToken: 'r', user: { id: '1' } };
      userService.login.mockResolvedValue(payload);
      await authController.login(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(payload);
    });

    it('forwards errors to next', async () => {
      const err = new Error('unauthorized');
      userService.login.mockRejectedValue(err);
      await authController.login(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('refresh', () => {
    it('returns rotated tokens', async () => {
      const payload = { accessToken: 'a2', refreshToken: 'r2' };
      userService.refresh.mockResolvedValue(payload);
      req.body = { refreshToken: 'r1' };
      await authController.refresh(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(payload);
    });

    it('forwards errors', async () => {
      const err = new Error('bad');
      userService.refresh.mockRejectedValue(err);
      await authController.refresh(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('logout', () => {
    it('returns ok', async () => {
      userService.logout.mockReturnValue({ ok: true });
      req.body = { refreshToken: 'r' };
      await authController.logout(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
