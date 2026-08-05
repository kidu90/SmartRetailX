const catalogueService = require('../services/catalogueService');

async function list(req, res, next) {
  try {
    res.status(200).json(catalogueService.listCategories());
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const category = catalogueService.createCategory(req.body);
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    res.status(200).json(catalogueService.getCategory(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    res.status(200).json(catalogueService.updateCategory(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    catalogueService.deleteCategory(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, getById, update, remove };
