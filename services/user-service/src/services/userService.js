const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const userStore = require('../store/userStore');
const AppError = require('../utils/AppError');

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

function signToken(user) {
  return jwt.sign({ email: user.email }, config.jwtSecret, {
    subject: user.id,
    expiresIn: config.jwtExpiresIn,
  });
}

async function register({ email, password, name }) {
  const existing = userStore.findByEmail(email);
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = userStore.create({
    id: uuidv4(),
    email: email.toLowerCase(),
    name,
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { token: signToken(user), user: toPublicUser(user) };
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

  return { token: signToken(user), user: toPublicUser(user) };
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

module.exports = { register, login, getProfile, updateProfile, toPublicUser };
