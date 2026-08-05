const userController = require('../../src/controllers/userController');
const userService = require('../../src/services/userService');

jest.mock('../../src/services/userService');

describe('userController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { user: { id: 'user-1' }, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('returns profile', async () => {
      const profile = { id: 'user-1', email: 'a@b.com', name: 'A' };
      userService.getProfile.mockReturnValue(profile);

      await userController.getMe(req, res, next);

      expect(userService.getProfile).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(profile);
    });

    it('forwards errors to next', async () => {
      const err = new Error('not found');
      userService.getProfile.mockImplementation(() => {
        throw err;
      });

      await userController.getMe(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('updateMe', () => {
    it('returns updated profile', async () => {
      const profile = { id: 'user-1', email: 'a@b.com', name: 'Updated' };
      userService.updateProfile.mockResolvedValue(profile);
      req.body = { name: 'Updated' };

      await userController.updateMe(req, res, next);

      expect(userService.updateProfile).toHaveBeenCalledWith('user-1', req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(profile);
    });

    it('forwards errors to next', async () => {
      const err = new Error('conflict');
      userService.updateProfile.mockRejectedValue(err);

      await userController.updateMe(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
