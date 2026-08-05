const categoryController = require('../../src/controllers/categoryController');
const catalogueService = require('../../src/services/catalogueService');

jest.mock('../../src/services/catalogueService');

describe('categoryController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { body: {}, params: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('lists categories', async () => {
    catalogueService.listCategories.mockReturnValue([{ id: '1' }]);
    await categoryController.list(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: '1' }]);
  });

  it('creates category', async () => {
    const category = { id: '1', name: 'Electronics' };
    catalogueService.createCategory.mockReturnValue(category);
    req.body = { name: 'Electronics' };
    await categoryController.create(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(category);
  });

  it('gets category by id', async () => {
    const category = { id: '1', name: 'Electronics' };
    catalogueService.getCategory.mockReturnValue(category);
    req.params.id = '1';
    await categoryController.getById(req, res, next);
    expect(res.json).toHaveBeenCalledWith(category);
  });

  it('updates category', async () => {
    const category = { id: '1', name: 'Updated' };
    catalogueService.updateCategory.mockReturnValue(category);
    req.params.id = '1';
    req.body = { name: 'Updated' };
    await categoryController.update(req, res, next);
    expect(res.json).toHaveBeenCalledWith(category);
  });

  it('deletes category', async () => {
    req.params.id = '1';
    await categoryController.remove(req, res, next);
    expect(catalogueService.deleteCategory).toHaveBeenCalledWith('1');
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('forwards errors', async () => {
    const err = new Error('boom');
    catalogueService.listCategories.mockImplementation(() => {
      throw err;
    });
    await categoryController.list(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
