const { ROLES } = require('@smartretailx/auth-middleware');
const orderController = require('../../src/controllers/orderController');
const orderService = require('../../src/services/orderService');

jest.mock('../../src/services/orderService');

describe('orderController', () => {
  let req;
  let res;
  let next;
  const publisher = { publish: jest.fn() };

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 'u1', role: ROLES.CUSTOMER },
      app: { locals: { publisher } },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('creates an order for the authenticated customer', async () => {
    const order = { id: 'o1', status: 'pending' };
    orderService.createOrder.mockResolvedValue(order);
    req.body = { items: [], paymentMethod: 'card' };

    await orderController.create(req, res, next);

    expect(orderService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
      publisher
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('lists orders scoped to customer', async () => {
    orderService.listOrders.mockReturnValue([{ id: 'o1' }]);
    await orderController.list(req, res, next);
    expect(orderService.listOrders).toHaveBeenCalledWith('u1');
  });

  it('gets order by id when owned', async () => {
    orderService.getOrder.mockReturnValue({ id: 'o1', userId: 'u1' });
    req.params.id = 'o1';
    await orderController.getById(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ id: 'o1', userId: 'u1' });
  });

  it('updates order status', async () => {
    orderService.updateOrderStatus.mockResolvedValue({ id: 'o1', status: 'shipped' });
    req.user = { id: 'wh-1', role: ROLES.WAREHOUSE_STAFF };
    req.params.id = 'o1';
    req.body = { status: 'shipped' };
    await orderController.updateStatus(req, res, next);
    expect(orderService.updateOrderStatus).toHaveBeenCalledWith('o1', 'shipped', publisher);
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
    orderService.updateOrderStatus.mockRejectedValue(err);
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

  it('forbids customers creating orders for other users', async () => {
    req.body = { userId: 'other', items: [], paymentMethod: 'card' };
    await orderController.create(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('forbids customers reading another users order', async () => {
    orderService.getOrder.mockReturnValue({ id: 'o1', userId: 'other' });
    req.params.id = 'o1';
    await orderController.getById(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('admin can create for a specified userId', async () => {
    req.user = { id: 'admin-1', role: ROLES.ADMIN };
    req.body = { userId: 'customer-9', items: [], paymentMethod: 'card' };
    orderService.createOrder.mockResolvedValue({ id: 'o2' });
    await orderController.create(req, res, next);
    expect(orderService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'customer-9' }),
      publisher
    );
  });
});
