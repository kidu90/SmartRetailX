const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { ROLES, ALL_ROLES } = require('@smartretailx/auth-middleware');
const config = require('../config');
const userStore = require('../store/userStore');
const AppError = require('../utils/AppError');

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function signAccessToken(user) {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
      typ: 'access',
    },
    config.jwtSecret,
    {
      subject: user.id,
      expiresIn: config.jwtExpiresIn,
      jwtid: uuidv4(),
    }
  );
}

async function issueRefreshToken(user) {
  const jti = uuidv4();
  const refreshToken = jwt.sign(
    {
      email: user.email,
      role: user.role,
      typ: 'refresh',
    },
    config.jwtSecret,
    {
      subject: user.id,
      expiresIn: config.jwtRefreshExpiresIn,
      jwtid: jti,
    }
  );

  const tokenHash = await bcrypt.hash(refreshToken, 10);
  const decoded = jwt.decode(refreshToken);
  userStore.saveRefreshToken(jti, {
    userId: user.id,
    tokenHash,
    expiresAt: decoded.exp * 1000,
  });

  return refreshToken;
}

async function issueTokenPair(user) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: await issueRefreshToken(user),
    tokenType: 'Bearer',
    expiresIn: config.jwtExpiresIn,
    user: toPublicUser(user),
  };
}

async function register({ email, password, name, role = ROLES.CUSTOMER }) {
  if (!ALL_ROLES.includes(role)) {
    throw new AppError('Invalid role', 400);
  }

  // Only bootstrap admins via explicit env in non-production scaffolds;
  // customers are the default self-service role.
  const assignedRole = role === ROLES.ADMIN && config.nodeEnv === 'production'
    ? ROLES.CUSTOMER
    : role;

  const existing = userStore.findByEmail(email);
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  const user = userStore.create({
    id: uuidv4(),
    email: email.toLowerCase(),
    name,
    role: assignedRole,
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return issueTokenPair(user);
}

async function login({ email, password }) {
  const user = userStore.findByEmail(email);
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  return issueTokenPair(user);
}

async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, config.jwtSecret);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  if (payload.typ !== 'refresh' || !payload.jti) {
    throw new AppError('Invalid refresh token', 401);
  }

  const stored = userStore.getRefreshToken(payload.jti);
  if (!stored || stored.userId !== payload.sub) {
    throw new AppError('Refresh token revoked', 401);
  }

  const match = await bcrypt.compare(refreshToken, stored.tokenHash);
  if (!match) {
    userStore.revokeRefreshToken(payload.jti);
    throw new AppError('Refresh token revoked', 401);
  }

  // Rotate refresh token
  userStore.revokeRefreshToken(payload.jti);
  const user = userStore.findById(payload.sub);
  if (!user) {
    throw new AppError('User not found', 401);
  }

  return issueTokenPair(user);
}

function logout(refreshToken) {
  try {
    const payload = jwt.verify(refreshToken, config.jwtSecret, { ignoreExpiration: true });
    if (payload.jti) userStore.revokeRefreshToken(payload.jti);
  } catch {
    // idempotent logout
  }
  return { ok: true };
}

function getProfile(userId) {
  const user = userStore.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return toPublicUser(user);
}

async function updateProfile(userId, updates) {
  const user = userStore.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (updates.email && updates.email.toLowerCase() !== user.email) {
    const conflict = userStore.findByEmail(updates.email);
    if (conflict) {
      throw new AppError('Email already registered', 409);
    }
  }

  const updated = userStore.update(userId, {
    ...(updates.name ? { name: updates.name } : {}),
    ...(updates.email ? { email: updates.email.toLowerCase() } : {}),
  });

  return toPublicUser(updated);
}

/**
 * GDPR Art. 17 — right to erasure.
 * Deletes the user profile and revokes all refresh tokens.
 */
function eraseUser(userId) {
  const user = userStore.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  userStore.delete(userId);
  return { erased: true, id: userId };
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  getProfile,
  updateProfile,
  eraseUser,
  toPublicUser,
  issueTokenPair,
};
