const categories = new Map();
const products = new Map();

const catalogueStore = {
  createCategory(category) {
    categories.set(category.id, category);
    return category;
  },
  getCategory(id) {
    return categories.get(id) || null;
  },
  listCategories() {
    return [...categories.values()];
  },
  updateCategory(id, updates) {
    const existing = categories.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    categories.set(id, updated);
    return updated;
  },
  deleteCategory(id) {
    return categories.delete(id);
  },
  createProduct(product) {
    products.set(product.id, product);
    return product;
  },
  getProduct(id) {
    return products.get(id) || null;
  },
  listProducts(categoryId) {
    const all = [...products.values()];
    if (!categoryId) return all;
    return all.filter((p) => p.categoryId === categoryId);
  },
  updateProduct(id, updates) {
    const existing = products.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    products.set(id, updated);
    return updated;
  },
  deleteProduct(id) {
    return products.delete(id);
  },
  searchProducts(query) {
    const q = query.toLowerCase();
    return [...products.values()].filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    );
  },
  clear() {
    categories.clear();
    products.clear();
  },
  counts() {
    return { categories: categories.size, products: products.size };
  },
};

module.exports = catalogueStore;
