const userService = require('../services/userService');

async function getMe(req, res, next) {
  try {
    const profile = userService.getProfile(req.user.id);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const profile = await userService.updateProfile(req.user.id, req.body);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

async function eraseMe(req, res, next) {
  try {
    const result = userService.eraseUser(req.user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, updateMe, eraseMe };
