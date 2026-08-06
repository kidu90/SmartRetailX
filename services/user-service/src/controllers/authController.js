const userService = require('../services/userService');

async function register(req, res, next) {
  try {
    const result = await userService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await userService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await userService.refresh(req.body.refreshToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const result = userService.logout(req.body.refreshToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout };
