const users = new Map();

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
  clear() {
    users.clear();
  },
  count() {
    return users.size;
  },
};

module.exports = userStore;
