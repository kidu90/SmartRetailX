const express = require('express');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
} = require('../validators/userSchemas');

const router = express.Router();

router.post('/auth/register', validate(registerSchema), authController.register);
router.post('/auth/login', validate(loginSchema), authController.login);

router.get('/users/me', authenticate, userController.getMe);
router.put('/users/me', authenticate, validate(updateProfileSchema), userController.updateMe);

module.exports = router;
