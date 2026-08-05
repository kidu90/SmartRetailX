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
    it('returns 201 with token and user', async () => {
      const payload = { token: 'jwt', user: { id: '1', email: 'a@b.com', name: 'A' } };
      userService.register.mockResolvedValue(payload);
      req.body = { email: 'a@b.com', password: 'password1', name: 'A' };

      await authController.register(req, res, next);

      expect(userService.register).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(payload);
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next', async () => {
      const err = new Error('conflict');
      userService.register.mockRejectedValue(err);

      await authController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('login', () => {
    it('returns 200 with token and user', async () => {
      const payload = { token: 'jwt', user: { id: '1', email: 'a@b.com', name: 'A' } };
      userService.login.mockResolvedValue(payload);
      req.body = { email: 'a@b.com', password: 'password1' };

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
});
