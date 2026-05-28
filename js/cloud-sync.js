/**
 * 家庭冰箱库存 App - 云同步模块 v2 (JSONBin)
 * 修复版 - 更好的错误处理 + CORS 兼容
 */

const CloudSync = {
  API_KEY: "SYNC_KEY",
  BASE_URL: "https://api.jsonbin.io/v3",
  binId: null, syncTimer: null, lastSync: null, isSyncing: false,

  init() {
    this.binId = localStorage.getItem("fridge_bin_id");
    this.lastSync = localStorage.getItem("fridge_last_sync");
  },

  getStatus() {
    return { connected: !!this.binId, lastSync: this.lastSync, binId: this.binId };
  },

  // 连接（创建云端存储）
  async connect() {
    App.toast("☁️ 正在连接云存储...", "info");
    try {
      // 步骤1: 先测试网络连通性
      console.log("云同步: 开始测试连接...");
      const testRes = await fetch("https://api.jsonbin.io/v3/b", { method: "GET", headers: { "X-Master-Key": this.API_KEY } });
      console.log("云同步: API 连通性 OK, 状态", testRes.status);
      
      // 步骤2: 创建新存储
      const res = await fetch(this.BASE_URL + "/b", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Master-Key": this.API_KEY, "X-Bin-Name": "FridgeApp" },
        body: JSON.stringify({ inventory: Storage.getInventory(), updatedAt: new Date().toISOString() })
      });
      console.log("云同步: POST 响应状态", res.status);
      
      if (!res.ok) {
        const errText = await res.text().catch(() => "无响应体");
        throw new Error("HTTP " + res.status + ": " + errText.slice(0, 100));
      }
      const result = await res.json();
      console.log("云同步: 创建成功, binId=", result.metadata.id);
      
      this.binId = result.metadata.id;
      localStorage.setItem("fridge_bin_id", this.binId);
      this.lastSync = new Date().toISOString();
      localStorage.setItem("fridge_last_sync", this.lastSync);
      App.toast("✅ 云同步已开启！", "success");
      this.startAutoSync();
      this.renderSettings();
      return true;
    } catch (err) {
      console.error("云同步失败详情:", err);
      App.toast("❌ 连接失败: " + (err.message || "未知错误，请打开浏览器控制台查看详情"), "error", 8000);
      return false;
    }
  },

  disconnect() {
    this.stopAutoSync();
    localStorage.removeItem("fridge_bin_id");
    localStorage.removeItem("fridge_last_sync");
    this.binId = null;
    App.toast("☁️ 已断开云同步", "info");
    this.renderSettings();
  },

  async upload(inventory) {
    if (!this.binId || this.isSyncing) return;
    this.isSyncing = true;
    try {
      const res = await fetch(this.BASE_URL + "/b/" + this.binId, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": this.API_KEY
        },
        body: JSON.stringify({
          inventory: inventory,
          updatedAt: new Date().toISOString()
        })
      });
      if (res.ok) {
        this.lastSync = new Date().toISOString();
        localStorage.setItem("fridge_last_sync", this.lastSync);
      }
    } catch (e) {
      console.warn("☁️ 上传失败:", e);
    }
    this.isSyncing = false;
  },

  async download() {
    if (!this.binId || this.isSyncing) return null;
    this.isSyncing = true;
    try {
      const res = await fetch(this.BASE_URL + "/b/" + this.binId + "/latest", {
        method: "GET",
        headers: { "X-Master-Key": this.API_KEY }
      });
      if (!res.ok) return null;
      const result = await res.json();
      this.lastSync = result.record.updatedAt;
      localStorage.setItem("fridge_last_sync", this.lastSync);
      return result.record;
    } catch (e) {
      console.warn("☁️ 下载失败:", e);
      return null;
    } finally {
      this.isSyncing = false;
    }
  },

  async sync() {
    if (!this.binId) {
      return App.toast("☁️ 请先在设置中开启云同步", "warning");
    }
    App.toast("☁️ 同步中...", "info");

    // 先上传本地
    await this.upload(Storage.getInventory());

    // 再下载云端
    const cloud = await this.download();
    if (!cloud || !cloud.inventory) {
      return App.toast("☁️ 同步完成（仅上传）", "success");
    }

    // 合并数据
    const localMap = {};
    Storage.getInventory().forEach(i => { localMap[i.id] = i; });
    let changed = false;

    cloud.inventory.forEach(item => {
      if (!localMap[item.id]) {
        localMap[item.id] = item;
        changed = true;
      }
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
      if (this.binId && !this.isSyncing) {
        this.download().then(data => {
          if (!data || !data.inventory) return;
          const localLen = Storage.getInventory().length;
          const cloudLen = data.inventory.length;
          if (cloudLen > localLen) {
            App.toast("☁️ 检测到云端有新数据，点击同步", "info", 5000);
          }
        });
      }
    }, 60000);
  },

  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  },

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
      '<div class="settings-item-desc" style="font-size:0.75rem">' + (s.connected ? "上次同步：" + (s.lastSync ? new Date(s.lastSync).toLocaleString() : "未知") : "开启后你和老婆的数据实时共享") + "</div>",
      "</div></div>",
      '<div style="display:flex;gap:8px;flex-wrap:wrap">',
      s.connected
        ? '<button class="btn btn-primary" onclick="CloudSync.sync()">🔄 立即同步</button><button class="btn btn-ghost" onclick="CloudSync.disconnect();CloudSync.renderSettings()">🔌 断开</button>'
        : '<button class="btn btn-primary" onclick="CloudSync.connect().then(function(){CloudSync.renderSettings()})">☁️ 开启云同步</button>',
      "</div></div></div>"
    ].join("\n");
  }
};

// 注入 API Key
CloudSync.API_KEY = "$2a$10$jr5ki8dnG5fVtZiOBqtafuLVSo3GuFtoIstiLOiIutz.OLPwISTmO";

// 拦截保存，自动上传
(function() {
  const _origSave = Storage.saveInventory;
  Storage.saveInventory = function(items) {
    _origSave.call(this, items);
    setTimeout(function() { CloudSync.upload(items); }, 200);
  };
})();

CloudSync.init();
window.CloudSync = CloudSync;