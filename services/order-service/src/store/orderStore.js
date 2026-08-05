const orders = new Map();

const orderStore = {
  create(order) {
    orders.set(order.id, order);
    return order;
  },
  findById(id) {
    return orders.get(id) || null;
  },
  list(userId) {
    const all = [...orders.values()];
    if (!userId) return all;
    return all.filter((o) => o.userId === userId);
  },
  update(id, updates) {
    const existing = orders.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    orders.set(id, updated);
    return updated;
  },
  clear() {
    orders.clear();
  },
  count() {
    return orders.size;
  },
};

module.exports = orderStore;
