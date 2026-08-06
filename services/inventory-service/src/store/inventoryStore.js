/** In-memory stock ledger for the scaffold (productId -> { stock, reserved }) */
const stock = new Map();

const inventoryStore = {
  seed(productId, quantity) {
    stock.set(productId, { stock: quantity, reserved: 0 });
    return stock.get(productId);
  },
  get(productId) {
    return stock.get(productId) || null;
  },
  ensure(productId, defaultStock = 100) {
    if (!stock.has(productId)) {
      stock.set(productId, { stock: defaultStock, reserved: 0 });
    }
    return stock.get(productId);
  },
  /**
   * Reserve quantity for an order. Returns false if insufficient available stock.
   */
  reserve(productId, quantity) {
    const row = this.ensure(productId);
    const available = row.stock - row.reserved;
    if (available < quantity) {
      return { ok: false, available };
    }
    row.reserved += quantity;
    return { ok: true, ...row };
  },
  /**
   * Confirm reservation (stock decremented, reserved released).
   */
  commit(productId, quantity) {
    const row = this.ensure(productId);
    row.reserved = Math.max(0, row.reserved - quantity);
    row.stock = Math.max(0, row.stock - quantity);
    return { ...row };
  },
  /**
   * Compensating transaction: release a prior reservation.
   */
  release(productId, quantity) {
    const row = this.ensure(productId);
    row.reserved = Math.max(0, row.reserved - quantity);
    return { ...row };
  },
  clear() {
    stock.clear();
  },
  snapshot() {
    return Object.fromEntries(
      [...stock.entries()].map(([id, v]) => [id, { ...v }])
    );
  },
};

module.exports = inventoryStore;
