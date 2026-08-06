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

  it('getMe returns profile', async () => {
    const profile = { id: 'user-1', email: 'a@b.com', role: 'customer' };
    userService.getProfile.mockReturnValue(profile);
    await userController.getMe(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(profile);
  });

  it('getMe forwards errors', async () => {
    const err = new Error('not found');
    userService.getProfile.mockImplementation(() => {
      throw err;
    });
    await userController.getMe(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('updateMe returns updated profile', async () => {
    const profile = { id: 'user-1', name: 'Updated' };
    userService.updateProfile.mockResolvedValue(profile);
    req.body = { name: 'Updated' };
    await userController.updateMe(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('updateMe forwards errors', async () => {
    const err = new Error('conflict');
    userService.updateProfile.mockRejectedValue(err);
    await userController.updateMe(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('eraseMe deletes account', async () => {
    userService.eraseUser.mockReturnValue({ erased: true, id: 'user-1' });
    await userController.eraseMe(req, res, next);
    expect(userService.eraseUser).toHaveBeenCalledWith('user-1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('eraseMe forwards errors', async () => {
    const err = new Error('missing');
    userService.eraseUser.mockImplementation(() => {
      throw err;
    });
    await userController.eraseMe(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
