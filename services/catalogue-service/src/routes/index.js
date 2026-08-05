const express = require('express');
const validate = require('../middleware/validate');
const categoryController = require('../controllers/categoryController');
const productController = require('../controllers/productController');
const {
  categorySchema,
  productSchema,
  searchQuerySchema,
  listProductsQuerySchema,
} = require('../validators/catalogueSchemas');

const router = express.Router();

router.get('/categories', categoryController.list);
router.post('/categories', validate(categorySchema), categoryController.create);
router.get('/categories/:id', categoryController.getById);
router.put('/categories/:id', validate(categorySchema), categoryController.update);
router.delete('/categories/:id', categoryController.remove);

router.get('/products', validate(listProductsQuerySchema, 'query'), productController.list);
router.post('/products', validate(productSchema), productController.create);
router.get('/products/:id', productController.getById);
router.put('/products/:id', validate(productSchema), productController.update);
router.delete('/products/:id', productController.remove);

router.get('/search', validate(searchQuerySchema, 'query'), productController.search);

module.exports = router;
