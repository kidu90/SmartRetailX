const express = require('express');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimit');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  updateProfileSchema,
} = require('../validators/userSchemas');

const router = express.Router();

router.post('/auth/register', validate(registerSchema), authController.register);
router.post(
  '/auth/login',
  loginRateLimiter,
  validate(loginSchema),
  authController.login
);
router.post('/auth/refresh', validate(refreshSchema), authController.refresh);
router.post('/auth/logout', validate(refreshSchema), authController.logout);

router.get('/users/me', authenticate, userController.getMe);
router.put('/users/me', authenticate, validate(updateProfileSchema), userController.updateMe);
// GDPR Art. 17 — right to erasure
router.delete('/users/me', authenticate, userController.eraseMe);

module.exports = router;
