const { z } = require('zod');

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price: z.number().nonnegative(),
  categoryId: z.string().uuid(),
  sku: z.string().min(1).max(64).optional(),
  stock: z.number().int().nonnegative().optional().default(0),
});

const searchQuerySchema = z.object({
  q: z.string().min(1),
});

const listProductsQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
});

module.exports = {
  categorySchema,
  productSchema,
  searchQuerySchema,
  listProductsQuerySchema,
};
