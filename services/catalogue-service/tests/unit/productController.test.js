const productController = require('../../src/controllers/productController');
const catalogueService = require('../../src/services/catalogueService');

jest.mock('../../src/services/catalogueService');

describe('productController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { body: {}, params: {}, query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('lists products', async () => {
    catalogueService.listProducts.mockReturnValue([{ id: 'p1' }]);
    req.query.categoryId = 'c1';
    await productController.list(req, res, next);
    expect(catalogueService.listProducts).toHaveBeenCalledWith('c1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('creates product', async () => {
    const product = { id: 'p1', name: 'Phone' };
    catalogueService.createProduct.mockReturnValue(product);
    await productController.create(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(product);
  });

  it('gets product by id', async () => {
    const product = { id: 'p1' };
    catalogueService.getProduct.mockReturnValue(product);
    req.params.id = 'p1';
    await productController.getById(req, res, next);
    expect(res.json).toHaveBeenCalledWith(product);
  });

  it('updates product', async () => {
    const product = { id: 'p1', name: 'Updated' };
    catalogueService.updateProduct.mockReturnValue(product);
    req.params.id = 'p1';
    await productController.update(req, res, next);
    expect(res.json).toHaveBeenCalledWith(product);
  });

  it('deletes product', async () => {
    req.params.id = 'p1';
    await productController.remove(req, res, next);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('searches products', async () => {
    catalogueService.searchProducts.mockReturnValue([{ id: 'p1' }]);
    req.query.q = 'phone';
    await productController.search(req, res, next);
    expect(catalogueService.searchProducts).toHaveBeenCalledWith('phone');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('forwards errors', async () => {
    const err = new Error('boom');
    catalogueService.getProduct.mockImplementation(() => {
      throw err;
    });
    req.params.id = 'missing';
    await productController.getById(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
