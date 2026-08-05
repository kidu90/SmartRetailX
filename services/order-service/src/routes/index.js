const express = require('express');
const validate = require('../middleware/validate');
const orderController = require('../controllers/orderController');
const {
  createOrderSchema,
  updateStatusSchema,
  listOrdersQuerySchema,
} = require('../validators/orderSchemas');

const router = express.Router();

router.get('/orders', validate(listOrdersQuerySchema, 'query'), orderController.list);
router.post('/orders', validate(createOrderSchema), orderController.create);
router.get('/orders/:id', orderController.getById);
router.patch(
  '/orders/:id/status',
  validate(updateStatusSchema),
  orderController.updateStatus
);

module.exports = router;
