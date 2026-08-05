const orderService = require('../services/orderService');

async function create(req, res, next) {
  try {
    const order = await orderService.createOrder(req.body);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    res.status(200).json(orderService.listOrders(req.query.userId));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    res.status(200).json(orderService.getOrder(req.params.id));
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
