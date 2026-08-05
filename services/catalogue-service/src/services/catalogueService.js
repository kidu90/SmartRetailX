const { v4: uuidv4 } = require('uuid');
const catalogueStore = require('../store/catalogueStore');
const AppError = require('../utils/AppError');

function createCategory(input) {
  return catalogueStore.createCategory({
    id: uuidv4(),
    name: input.name,
    description: input.description || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function listCategories() {
  return catalogueStore.listCategories();
}

function getCategory(id) {
  const category = catalogueStore.getCategory(id);
  if (!category) throw new AppError('Category not found', 404);
  return category;
}

function updateCategory(id, input) {
  getCategory(id);
  return catalogueStore.updateCategory(id, {
    name: input.name,
    description: input.description || '',
  });
}

function deleteCategory(id) {
  getCategory(id);
  const productsInCategory = catalogueStore.listProducts(id);
  if (productsInCategory.length > 0) {
    throw new AppError('Cannot delete category with products', 409);
  }
  catalogueStore.deleteCategory(id);
}

function createProduct(input) {
  getCategory(input.categoryId);
  return catalogueStore.createProduct({
    id: uuidv4(),
    name: input.name,
    description: input.description || '',
    price: input.price,
    categoryId: input.categoryId,
    sku: input.sku || `SKU-${Date.now()}`,
    stock: input.stock ?? 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function listProducts(categoryId) {
  if (categoryId) getCategory(categoryId);
  return catalogueStore.listProducts(categoryId);
}

function getProduct(id) {
  const product = catalogueStore.getProduct(id);
  if (!product) throw new AppError('Product not found', 404);
  return product;
}

function updateProduct(id, input) {
  getProduct(id);
  getCategory(input.categoryId);
  return catalogueStore.updateProduct(id, {
    name: input.name,
    description: input.description || '',
    price: input.price,
    categoryId: input.categoryId,
    sku: input.sku,
    stock: input.stock,
  });
}

function deleteProduct(id) {
  getProduct(id);
  catalogueStore.deleteProduct(id);
}

function searchProducts(query) {
  return catalogueStore.searchProducts(query);
}

module.exports = {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
};
