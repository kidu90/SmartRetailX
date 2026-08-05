const catalogueService = require('../services/catalogueService');

async function list(req, res, next) {
  try {
    res.status(200).json(catalogueService.listProducts(req.query.categoryId));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const product = catalogueService.createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    res.status(200).json(catalogueService.getProduct(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    res.status(200).json(catalogueService.updateProduct(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    catalogueService.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function search(req, res, next) {
  try {
    res.status(200).json(catalogueService.searchProducts(req.query.q));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, getById, update, remove, search };
