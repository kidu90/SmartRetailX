const users = new Map();
const refreshTokens = new Map(); // jti -> { userId, tokenHash, expiresAt }

const userStore = {
  create(user) {
    users.set(user.id, user);
    return user;
  },
  findByEmail(email) {
    return [...users.values()].find((u) => u.email === email.toLowerCase()) || null;
  },
  findById(id) {
    return users.get(id) || null;
  },
  update(id, updates) {
    const existing = users.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    users.set(id, updated);
    return updated;
  },
  delete(id) {
    const removed = users.delete(id);
    for (const [jti, meta] of refreshTokens.entries()) {
      if (meta.userId === id) refreshTokens.delete(jti);
    }
    return removed;
  },
  saveRefreshToken(jti, meta) {
    refreshTokens.set(jti, meta);
  },
  getRefreshToken(jti) {
    return refreshTokens.get(jti) || null;
  },
  revokeRefreshToken(jti) {
    return refreshTokens.delete(jti);
  },
  revokeAllRefreshTokensForUser(userId) {
    for (const [jti, meta] of refreshTokens.entries()) {
      if (meta.userId === userId) refreshTokens.delete(jti);
    }
  },
  clear() {
    users.clear();
    refreshTokens.clear();
  },
  count() {
    return users.size;
  },
};

module.exports = userStore;
