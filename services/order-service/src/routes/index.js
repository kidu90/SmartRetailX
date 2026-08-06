const express = require('express');
const { ROLES, authenticate, requireRoles } = require('@smartretailx/auth-middleware');
const validate = require('../middleware/validate');
const orderController = require('../controllers/orderController');
const config = require('../config');
const {
  createOrderSchema,
  updateStatusSchema,
  listOrdersQuerySchema,
} = require('../validators/orderSchemas');

const router = express.Router();
const requireAuth = authenticate({ jwtSecret: () => config.jwtSecret });
const requireCustomerOrAdmin = requireRoles(ROLES.CUSTOMER, ROLES.ADMIN);
const requireFulfillment = requireRoles(ROLES.ADMIN, ROLES.WAREHOUSE_STAFF);

router.get(
  '/orders',
  requireAuth,
  requireCustomerOrAdmin,
  validate(listOrdersQuerySchema, 'query'),
  orderController.list
);
router.post(
  '/orders',
  requireAuth,
  requireCustomerOrAdmin,
  validate(createOrderSchema),
  orderController.create
);
router.get('/orders/:id', requireAuth, requireCustomerOrAdmin, orderController.getById);
router.patch(
  '/orders/:id/status',
  requireAuth,
  requireFulfillment,
  validate(updateStatusSchema),
  orderController.updateStatus
);

module.exports = router;
