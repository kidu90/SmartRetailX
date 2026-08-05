const orderController = require('../../src/controllers/orderController');
const orderService = require('../../src/services/orderService');

jest.mock('../../src/services/orderService');

describe('orderController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { body: {}, params: {}, query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('creates an order', async () => {
    const order = { id: 'o1', status: 'paid' };
    orderService.createOrder.mockResolvedValue(order);
    req.body = { userId: 'u1', items: [], paymentMethod: 'card' };

    await orderController.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(order);
  });

  it('lists orders', async () => {
    orderService.listOrders.mockReturnValue([{ id: 'o1' }]);
    req.query.userId = 'u1';

    await orderController.list(req, res, next);

    expect(orderService.listOrders).toHaveBeenCalledWith('u1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('gets order by id', async () => {
    const order = { id: 'o1' };
    orderService.getOrder.mockReturnValue(order);
    req.params.id = 'o1';

    await orderController.getById(req, res, next);

    expect(res.json).toHaveBeenCalledWith(order);
  });

  it('updates order status', async () => {
    const order = { id: 'o1', status: 'shipped' };
    orderService.updateOrderStatus.mockReturnValue(order);
    req.params.id = 'o1';
    req.body = { status: 'shipped' };

    await orderController.updateStatus(req, res, next);

    expect(orderService.updateOrderStatus).toHaveBeenCalledWith('o1', 'shipped');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('forwards create errors', async () => {
    const err = new Error('downstream');
    orderService.createOrder.mockRejectedValue(err);

    await orderController.create(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('forwards get errors', async () => {
    const err = new Error('missing');
    orderService.getOrder.mockImplementation(() => {
      throw err;
    });
    req.params.id = 'missing';

    await orderController.getById(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('forwards updateStatus errors', async () => {
    const err = new Error('bad transition');
    orderService.updateOrderStatus.mockImplementation(() => {
      throw err;
    });
    req.params.id = 'o1';
    req.body = { status: 'delivered' };

    await orderController.updateStatus(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('forwards list errors', async () => {
    const err = new Error('list fail');
    orderService.listOrders.mockImplementation(() => {
      throw err;
    });

    await orderController.list(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
