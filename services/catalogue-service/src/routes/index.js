const express = require('express');
const { ROLES, authenticate, requireRoles } = require('@smartretailx/auth-middleware');
const validate = require('../middleware/validate');
const categoryController = require('../controllers/categoryController');
const productController = require('../controllers/productController');
const config = require('../config');
const {
  categorySchema,
  productSchema,
  searchQuerySchema,
  listProductsQuerySchema,
} = require('../validators/catalogueSchemas');

const router = express.Router();
const requireAuth = authenticate({ jwtSecret: () => config.jwtSecret });
const requireCatalogueWriters = requireRoles(ROLES.ADMIN, ROLES.WAREHOUSE_STAFF);

// Public read endpoints
router.get('/categories', categoryController.list);
router.get('/categories/:id', categoryController.getById);
router.get('/products', validate(listProductsQuerySchema, 'query'), productController.list);
router.get('/products/:id', productController.getById);
router.get('/search', validate(searchQuerySchema, 'query'), productController.search);

// Mutations require admin or warehouse_staff
router.post(
  '/categories',
  requireAuth,
  requireCatalogueWriters,
  validate(categorySchema),
  categoryController.create
);
router.put(
  '/categories/:id',
  requireAuth,
  requireCatalogueWriters,
  validate(categorySchema),
  categoryController.update
);
router.delete(
  '/categories/:id',
  requireAuth,
  requireCatalogueWriters,
  categoryController.remove
);

router.post(
  '/products',
  requireAuth,
  requireCatalogueWriters,
  validate(productSchema),
  productController.create
);
router.put(
  '/products/:id',
  requireAuth,
  requireCatalogueWriters,
  validate(productSchema),
  productController.update
);
router.delete(
  '/products/:id',
  requireAuth,
  requireCatalogueWriters,
  productController.remove
);

module.exports = router;
