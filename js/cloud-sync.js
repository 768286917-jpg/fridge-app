/**
 * 家庭冰箱库存 App - 云同步模块 v3
 * 使用 npoint.io 替代 JSONBin（更好的 CORS 支持）
 */

const CloudSync = {
  // npoint.io 更友好的 API
  BIN_URL: null, // 从 localStorage 读取
  isSyncing: false,

  init() {
    this.BIN_URL = localStorage.getItem("fridge_bin_url");
  },

  getStatus() {
    return { connected: !!this.BIN_URL };
  },

  // 创建新点
  async connect() {
    App.toast("☁️ 正在创建云端存储...", "info");
    try {
      // npoint.io 支持从浏览器直接调用
      const data = { inventory: Storage.getInventory(), updatedAt: new Date().toISOString() };

      const res = await fetch("https://api.npoint.io/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error("HTTP " + res.status);

      const result = await res.json();
      // npoint.io 返回格式: { "url": "https://api.npoint.io/xxx", "id": "xxx" }
      let url = result.url || ("https://api.npoint.io/" + result.id);
      this.BIN_URL = url;
      localStorage.setItem("fridge_bin_url", url);

      App.toast("✅ 云同步已开启！", "success");
      this.startAutoSync();
      this.renderSettings();
      return true;
    } catch (err) {
      console.error("云同步连接失败:", err);
      // 如果 npoint 也失败，提示用户
      App.toast("❌ 连接失败: " + (err.message || "请检查网络"), "error", 8000);
      return false;
    }
  },

  disconnect() {
    this.stopAutoSync();
    localStorage.removeItem("fridge_bin_url");
    this.BIN_URL = null;
    App.toast("☁️ 已断开云同步", "info");
    this.renderSettings();
  },

  async upload(inventory) {
    if (!this.BIN_URL || this.isSyncing) return;
    this.isSyncing = true;
    try {
      const res = await fetch(this.BIN_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory: inventory, updatedAt: new Date().toISOString() })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
    } catch (e) {
      console.warn("☁️ 上传失败:", e);
    }
    this.isSyncing = false;
  },

  async download() {
    if (!this.BIN_URL || this.isSyncing) return null;
    this.isSyncing = true;
    try {
      const res = await fetch(this.BIN_URL);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    } finally {
      this.isSyncing = false;
    }
  },

  async sync() {
    if (!this.BIN_URL) return App.toast("☁️ 请先开启云同步", "warning");
    App.toast("☁️ 同步中...", "info");
    await this.upload(Storage.getInventory());
    const cloud = await this.download();
    if (!cloud || !cloud.inventory) return App.toast("☁️ 同步完成", "success");
    const localMap = {};
    Storage.getInventory().forEach(i => { localMap[i.id] = i; });
    let changed = false;
    cloud.inventory.forEach(item => {
      if (!localMap[item.id]) { localMap[item.id] = item; changed = true; }
    });
    if (changed) {
      Storage.saveInventory(Object.values(localMap));
      if (window.Inventory) Inventory.refresh();
      App.updateExpiryBadge();
      App.toast("☁️ 同步完成！获取到新数据", "success");
    } else {
      App.toast("☁️ 数据已是最新", "info");
    }
  },

  startAutoSync() {
    this.stopAutoSync();
    this.syncTimer = setInterval(() => {
      if (this.BIN_URL && !this.isSyncing) this.sync();
    }, 60000);
  },
  stopAutoSync() { if (this.syncTimer) { clearInterval(this.syncTimer); this.syncTimer = null; } },

  renderSettings() {
    const el = document.getElementById("cloud-settings");
    if (!el) return;
    const s = this.getStatus();
    el.innerHTML = [
      '<div class="settings-group">',
      '<div class="settings-group-title">☁️ 云端同步（夫妻共享数据）</div>',
      '<div class="settings-item" style="flex-direction:column;align-items:stretch;gap:12px">',
      '<div style="display:flex;align-items:center;gap:12px">',
      '<span style="font-size:2rem">' + (s.connected ? "✅" : "🌐") + "</span>",
      "<div>",
      '<div class="settings-item-label">' + (s.connected ? "已连接！数据自动同步" : "未开启云同步") + "</div>",
      '<div class="settings-item-desc">' + (s.connected ? "每天自动同步<br>点击「立即同步」手动刷新" : "开启后你和老婆的数据实时共享") + "</div>",
      "</div></div>",
      '<div style="display:flex;gap:8px;flex-wrap:wrap">',
      s.connected
        ? '<button class="btn btn-primary" onclick="CloudSync.sync()">🔄 立即同步</button><button class="btn btn-ghost" onclick="CloudSync.disconnect();CloudSync.renderSettings()">🔌 断开</button>'
        : '<button class="btn btn-primary" onclick="CloudSync.connect().then(function(){CloudSync.renderSettings()})">☁️ 开启云同步</button>',
      "</div></div></div>"
    ].join("\n");
  }
};

// 拦截保存
(function() {
  const _save = Storage.saveInventory;
  Storage.saveInventory = function(items) {
    _save.call(this, items);
    setTimeout(function() { if (CloudSync.BIN_URL) CloudSync.upload(items); }, 500);
  };
})();

CloudSync.init();
window.CloudSync = CloudSync;