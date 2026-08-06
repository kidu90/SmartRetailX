const { ROLES } = require('@smartretailx/auth-middleware');
const orderService = require('../services/orderService');
const AppError = require('../utils/AppError');

async function create(req, res, next) {
  try {
    const userId =
      req.user.role === ROLES.CUSTOMER ? req.user.id : req.body.userId || req.user.id;

    if (req.user.role === ROLES.CUSTOMER && req.body.userId && req.body.userId !== req.user.id) {
      throw new AppError('Customers may only create orders for themselves', 403);
    }

    const order = await orderService.createOrder({ ...req.body, userId });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const userId = req.user.role === ROLES.CUSTOMER ? req.user.id : req.query.userId;
    res.status(200).json(orderService.listOrders(userId));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const order = orderService.getOrder(req.params.id);
    if (req.user.role === ROLES.CUSTOMER && order.userId !== req.user.id) {
      throw new AppError('Forbidden', 403);
    }
    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const order = orderService.updateOrderStatus(req.params.id, req.body.status);
    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, updateStatus };
