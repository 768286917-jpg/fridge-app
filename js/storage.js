/**
 * 家庭冰箱库存 App - LocalStorage 数据管理模块
 * 封装所有本地存储操作，支持自动过期检查
 */

const Storage = {
  // 存储键名
  KEYS: {
    INVENTORY: 'fridge_inventory',
    RECIPES: 'fridge_recipes',
    SETTINGS: 'fridge_settings',
    STATS: 'fridge_stats'
  },

  // ===== 库存数据 =====
  getInventory() {
    try {
      const data = localStorage.getItem(this.KEYS.INVENTORY);
      return data ? JSON.parse(data) : [];
    } catch { return [] }
  },

  saveInventory(items) {
    localStorage.setItem(this.KEYS.INVENTORY, JSON.stringify(items));
  },

  addItem(item) {
    const items = this.getInventory();
    item.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    item.createdAt = new Date().toISOString();
    items.push(item);
    this.saveInventory(items);
    return item;
  },

  updateItem(id, updates) {
    const items = this.getInventory();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    this.saveInventory(items);
    return items[idx];
  },

  deleteItem(id) {
    const items = this.getInventory().filter(i => i.id !== id);
    this.saveInventory(items);
  },

  clearAll() {
    this.saveInventory([]);
  },

  getItemById(id) {
    return this.getInventory().find(i => i.id === id) || null;
  },

  // ===== 菜谱数据 =====
  getRecipes() {
    try {
      const data = localStorage.getItem(this.KEYS.RECIPES);
      return data ? JSON.parse(data) : [];
    } catch { return [] }
  },

  saveRecipes(recipes) {
    localStorage.setItem(this.KEYS.RECIPES, JSON.stringify(recipes));
  },

  addRecipe(recipe) {
    const recipes = this.getRecipes();
    recipe.id = Date.now().toString(36);
    recipes.push(recipe);
    this.saveRecipes(recipes);
    return recipe;
  },

  // ===== 设置 =====
  getSettings() {
    try {
      const data = localStorage.getItem(this.KEYS.SETTINGS);
      return data ? JSON.parse(data) : this.getDefaultSettings();
    } catch { return this.getDefaultSettings() }
  },

  getDefaultSettings() {
    return {
      theme: 'light',
      viewMode: 'card',
      expiryWarnDays: 3,
      lowStockWarn: true,
      notifications: true
    };
  },

  saveSettings(settings) {
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
  },

  // ===== 工具方法 =====
  isExpiring(dateStr, warnDays) {
    if (!dateStr) return false;
    const warn = warnDays || Storage.getSettings().expiryWarnDays;
    const expiry = new Date(dateStr);
    const now = new Date();
    const diff = (expiry - now) / (1000 * 60 * 60 * 24);
    return diff <= warn && diff > 0;
  },

  isExpired(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  },

  getExpiryStatus(dateStr, warnDays) {
    if (!dateStr) return 'normal';
    const warn = warnDays || Storage.getSettings().expiryWarnDays;
    const expiry = new Date(dateStr);
    const now = new Date();
    const diff = (expiry - now) / (1000 * 60 * 60 * 24);
    if (diff <= 0) return 'expired';
    if (diff <= warn) return 'expiring';
    return 'normal';
  }
};

// 暴露到全局
window.Storage = Storage;