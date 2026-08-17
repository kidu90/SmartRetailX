const { ROLES } = require('@smartretailx/auth-middleware');
const orderService = require('../services/orderService');
const AppError = require('../utils/AppError');

function getPublisher(req) {
  return req.app.locals.publisher;
}

async function create(req, res, next) {
  try {
    // Customers always order as themselves (ignore spoofed body.userId).
    // Admins may place on behalf of a userId when provided.
    const userId =
      req.user.role === ROLES.ADMIN
        ? req.body.userId || req.user.id
        : req.user.id;

    if (!userId) {
      throw new AppError('Authenticated user id missing from token', 401);
    }

    if (
      req.user.role !== ROLES.ADMIN &&
      req.body.userId &&
      req.body.userId !== req.user.id
    ) {
      throw new AppError('Customers may only create orders for themselves', 403);
    }

    const order = await orderService.createOrder(
      { ...req.body, userId },
      getPublisher(req)
    );
    res.status(201).json(order);
  } catch (err) {
    try {
      const { recordCheckoutFailure } = require('@smartretailx/emf-metrics');
      recordCheckoutFailure('order-service', err.message || 'create_failed').catch(() => {});
    } catch {
      /* optional */
    }
    next(err);
  }
}

async function list(req, res, next) {
  try {
    // Admins may list all (optional ?userId= filter). Everyone else only sees own orders.
    if (req.user.role === ROLES.ADMIN) {
      return res.status(200).json(orderService.listOrders(req.query.userId));
    }

    if (!req.user.id) {
      throw new AppError('Authenticated user id missing from token', 401);
    }

    res.status(200).json(orderService.listOrders(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const order = orderService.getOrder(req.params.id);
    const isAdmin = req.user.role === ROLES.ADMIN;
    if (!isAdmin && order.userId !== req.user.id) {
      throw new AppError('Forbidden', 403);
    }
    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const order = await orderService.updateOrderStatus(
      req.params.id,
      req.body.status,
      getPublisher(req)
    );
    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, updateStatus };
