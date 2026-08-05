const { z } = require('zod');

const ORDER_STATUSES = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

const createOrderSchema = z.object({
  userId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  paymentMethod: z.enum(['card', 'wallet', 'cash_on_delivery']),
});

const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

const listOrdersQuerySchema = z.object({
  userId: z.string().min(1).optional(),
});

module.exports = {
  createOrderSchema,
  updateStatusSchema,
  listOrdersQuerySchema,
  ORDER_STATUSES,
};
