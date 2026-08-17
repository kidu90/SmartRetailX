const jwt = require('jsonwebtoken');
const { ALL_ROLES } = require('./roles');

/**
 * Verify Bearer access token and attach `req.user`.
 *
 * @param {object} options
 * @param {string|(() => string)} options.jwtSecret
 * @param {string[]} [options.algorithms]
 */
function authenticate(options = {}) {
  const algorithms = options.algorithms || ['HS256'];

  return function authenticateMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { message: 'Missing or invalid Authorization header' },
      });
    }

    const token = header.slice(7);
    const secret =
      typeof options.jwtSecret === 'function' ? options.jwtSecret() : options.jwtSecret;

    if (!secret) {
      return res.status(500).json({
        error: { message: 'JWT secret is not configured' },
      });
    }

    try {
      const payload = jwt.verify(token, secret, { algorithms });

      if (payload.typ && payload.typ !== 'access') {
        return res.status(401).json({
          error: { message: 'Access token required' },
        });
      }

      const role = payload.role;
      if (!role || !ALL_ROLES.includes(role)) {
        return res.status(401).json({
          error: { message: 'Token missing a valid role claim' },
        });
      }

      const userId = payload.sub || payload.userId || payload.id;
      if (!userId) {
        return res.status(401).json({
          error: { message: 'Token missing subject / user id' },
        });
      }

      req.user = {
        id: userId,
        email: payload.email,
        role,
        tokenId: payload.jti,
      };
      req.auth = payload;
      return next();
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid or expired token';
      return res.status(401).json({ error: { message } });
    }
  };
}

/**
 * Require that `req.user.role` is one of the allowed roles.
 * Must run after `authenticate`.
 *
 * @param {...string} allowedRoles
 */
function requireRoles(...allowedRoles) {
  const allowed = allowedRoles.flat();

  return function requireRolesMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: { message: 'Authentication required' },
      });
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: 'Forbidden: insufficient role',
          required: allowed,
          actual: req.user.role,
        },
      });
    }

    return next();
  };
}

/**
 * Optional auth — attaches user when a valid token is present, otherwise continues.
 */
function optionalAuthenticate(options = {}) {
  const required = authenticate(options);
  return function optionalAuthenticateMiddleware(req, res, next) {
    if (!req.headers.authorization) {
      return next();
    }
    return required(req, res, next);
  };
}

module.exports = {
  authenticate,
  requireRoles,
  optionalAuthenticate,
};
