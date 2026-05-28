/**
 * 家庭冰箱库存 App - 云同步模块 v4
 * 使用 npoint.io，支持共享码配对
 */

const CloudSync = {
  BIN_ID: null, isSyncing: false,

  init() {
    this.BIN_ID = localStorage.getItem("fridge_share_id");
  },

  getStatus() {
    return { connected: !!this.BIN_ID, shareId: this.BIN_ID };
  },

  // 创建新的云存储（第一个设备用）
  async connect() {
    App.toast("☁️ 创建云端存储...", "info");
    try {
      const res = await fetch("https://api.npoint.io/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory: Storage.getInventory(), updatedAt: Date.now() })
      });
      if (!res.ok) throw new Error("服务器错误 " + res.status);
      const data = await res.json();
      // npoint 返回格式: { "id": "xxx", "url": "https://api.npoint.io/xxx" }
      this.BIN_ID = data.id;
      localStorage.setItem("fridge_share_id", this.BIN_ID);
      App.toast("✅ 云同步已开启！", "success");
      this.renderSettings();
      return true;
    } catch (e) {
      App.toast("❌ 创建失败: " + (e.message || e), "error", 6000);
      return false;
    }
  },

  // 加入已有的云存储（另一个设备用）
  async join() {
    const id = prompt("请输入共享码（从另一台设备的设置页面获取）：");
    if (!id || id.length < 5) return App.toast("共享码无效", "warning");
    this.BIN_ID = id.trim();
    localStorage.setItem("fridge_share_id", this.BIN_ID);
    // 立即同步一次
    App.toast("☁️ 连接中...", "info");
    const ok = await this.sync();
    if (ok) App.toast("✅ 已连接到共享云存储！", "success");
    else App.toast("❌ 连接失败，请检查共享码是否正确", "error");
    this.renderSettings();
  },

  disconnect() {
    localStorage.removeItem("fridge_share_id");
    this.BIN_ID = null;
    App.toast("☁️ 已断开", "info");
    this.renderSettings();
  },

  async upload(items) {
    if (!this.BIN_ID) return;
    try {
      await fetch("https://api.npoint.io/" + this.BIN_ID, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory: items, updatedAt: Date.now() }),
        mode: "cors"
      });
    } catch (e) {
      console.warn("上传失败", e);
    }
  },

  async download() {
    if (!this.BIN_ID) return null;
    try {
      const res = await fetch("https://api.npoint.io/" + this.BIN_ID, { mode: "cors" });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async sync() {
    if (!this.BIN_ID) { App.toast("☁️ 请先创建或加入云同步", "warning"); return false; }
    // 上传本地数据
    await this.upload(Storage.getInventory());
    // 下载云端数据
    const cloud = await this.download();
    if (!cloud || !cloud.inventory) { return true; }
    // 合并（取最新的）
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
      App.toast("☁️ 同步完成！有新食材", "success");
    } else {
      App.toast("☁️ 已是最新", "info");
    }
    return true;
  },

  renderSettings() {
    const el = document.getElementById("cloud-settings");
    if (!el) return;
    const s = this.getStatus();
    el.innerHTML = [
      '<div class="settings-group">',
      '<div class="settings-group-title">☁️ 云端同步（夫妻共享）</div>',
      '<div class="settings-item" style="flex-direction:column;align-items:stretch;gap:12px">',
      '<div style="display:flex;align-items:center;gap:12px">',
      '<span style="font-size:2rem">' + (s.connected ? "✅" : "🌐") + "</span>",
      "<div>",
      '<div class="settings-item-label">' + (s.connected ? "已连接！" : "未连接") + "</div>",
      '<div class="settings-item-desc">' + (s.connected ? "共享码: " + s.shareId : "两个人需要连接到同一个云存储") + "</div>",
      "</div></div>",
      '<div style="display:flex;gap:8px;flex-wrap:wrap">',
      s.connected
        ? '<button class="btn btn-primary" onclick="CloudSync.sync()">🔄 同步</button>'
        + '<button class="btn btn-ghost" onclick="CloudSync.join()">🔗 加入已有</button>'
        + '<button class="btn btn-ghost" onclick="CloudSync.disconnect();CloudSync.renderSettings()">🔌 断开</button>'
        : '<button class="btn btn-primary" onclick="CloudSync.connect().then(function(){CloudSync.renderSettings()})">✨ 创建云存储</button>'
        + '<button class="btn btn-outline" onclick="CloudSync.join()">🔗 加入已有</button>',
      "</div></div></div>"
    ].join("\n");
  }
};

// 接管保存
(function() {
  const _save = Storage.saveInventory;
  Storage.saveInventory = function(items) {
    _save.call(this, items);
    if (CloudSync.BIN_ID) {
      clearTimeout(CloudSync._saveTimer);
      CloudSync._saveTimer = setTimeout(function() { CloudSync.upload(items); }, 1000);
    }
  };
})();

CloudSync.init();
window.CloudSync = CloudSync;