/**
 * 家庭冰箱库存 App - 库存管理模块 (V2 升级版)
 * 全新视觉系统 + 智能图标匹配 + 高级卡片UI
 */

const Inventory = {
  currentCategory: 'all', searchQuery: '', sortBy: 'name', viewMode: 'card', recentItems: [],

  render() {
    const container = document.getElementById('page-inventory');
    if (!container) return;
    this.viewMode = Storage.getSettings().viewMode || 'card';
    this.recentItems = this.getRecentItems();

    container.innerHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <h1 class="page-title">🧊 冰箱库存</h1>
          <p class="page-subtitle">共 <strong id="inv-count" style="color:var(--gold-dark)">0</strong> 种食材 · <span id="inv-expiring-count">0</span> 条待处理</p>
        </div>
        <button class="btn btn-primary" onclick="Inventory.showAddModal()"><span style="font-size:1.1rem">＋</span> 添加食材</button>
      </div>
      <div class="toolbar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" class="form-input" id="inv-search" placeholder="搜索食材..." oninput="Inventory.onSearch(this.value)">
        </div>
        <div class="filter-group" id="inv-filters">
          ${['全部','蔬菜','肉类','海鲜','水果','饮料','调料','冷冻','零食','其他'].map(c =>
            `<button class="filter-chip ${c==='全部'?'active':''}" data-cat="${c}" onclick="Inventory.filterBy('${c}')">${c==='全部'?'🏠 全部':(this.getCategoryEmoji(c)+' '+c)}</button>`
          ).join('')}
        </div>
        <select class="form-select" style="width:auto" id="inv-sort" onchange="Inventory.setSort(this.value)">
          <option value="name">按名称 ↑</option>
          <option value="category">按分类</option>
          <option value="expiry">按保质期</option>
          <option value="qty">按数量 ↓</option>
        </select>
        <div class="btn-group" style="display:flex;gap:4px;background:var(--bg-card);border-radius:8px;padding:2px;border:1px solid var(--border-color)">
          <button class="btn btn-sm ${this.viewMode==='card'?'btn-primary':'btn-ghost'}" onclick="Inventory.setView('card')" title="卡片视图">📇</button>
          <button class="btn btn-sm ${this.viewMode==='list'?'btn-primary':'btn-ghost'}" onclick="Inventory.setView('list')" title="列表视图">📋</button>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="Inventory.clearAll()" title="清空冰箱">🗑️ 清空</button>
      </div>
      <div id="inv-content"></div>
      <div id="inv-recent" style="margin-top:24px;display:none"></div>
    `;
    this.refresh();
  },

  refresh() {
    const items = this.getFilteredItems();
    const allItems = Storage.getInventory();
    const expiring = allItems.filter(i => Storage.getExpiryStatus(i.expiry) === 'expiring' || Storage.getExpiryStatus(i.expiry) === 'expired');

    const countEl = document.getElementById('inv-count');
    if (countEl) countEl.textContent = items.length;
    const expiringEl = document.getElementById('inv-expiring-count');
    if (expiringEl) {
      expiringEl.textContent = expiring.length + ' 条待处理';
      expiringEl.style.color = expiring.length > 0 ? 'var(--color-warning)' : 'var(--color-success)';
    }

    const content = document.getElementById('inv-content');
    if (!content) return;

    if (items.length === 0) {
      content.innerHTML = `
        <div class="empty-state" style="padding:80px 24px">
          <div class="empty-state-icon">🧊</div>
          <div class="empty-state-title">冰箱空空如也</div>
          <div class="empty-state-desc">点击「添加食材」开始记录吧！<br>也可以从 Excel 导入已有清单</div>
          <button class="btn btn-primary btn-lg" onclick="Inventory.showAddModal()">＋ 添加第一种食材</button>
          <button class="btn btn-ghost" onclick="ExcelManager.render()" style="margin-left:8px">📤 导入 Excel</button>
        </div>`;
      return;
    }

    if (this.viewMode === 'list') this.renderListView(content, items);
    else this.renderCardView(content, items);

    this.renderRecentItems();
  },

  // ===== 卡片视图 V2 =====
  renderCardView(container, items) {
    container.innerHTML = '<div class="inventory-grid">' + items.map(item => {
      const status = Storage.getExpiryStatus(item.expiry);
      const icon = getIngredientIcon(item.name, item.category);
      const daysLeft = item.expiry ? Math.ceil((new Date(item.expiry) - new Date()) / (1000*60*60*24)) : null;
      const statusLabel = status === 'expired' ? '已过期' : status === 'expiring' ? '即将过期' : '新鲜';
      const statusColor = status === 'expired' ? 'var(--color-danger)' : status === 'expiring' ? 'var(--color-warning)' : 'var(--color-success)';

      return `
        <div class="item-card ${status}" onclick="Inventory.showEditModal('${item.id}')" style="cursor:pointer">
          <div class="item-card-img" style="background:linear-gradient(135deg,${status==='expired'?'rgba(196,30,58,0.08)':'rgba(201,161,77,0.08)'},var(--bg-card));position:relative">
            <span style="font-size:2.2rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.1))">${item.image ? '<img src="'+item.image+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px">' : icon}</span>
            <span class="badge ${status==='expired'?'badge-danger':status==='expiring'?'badge-warning':'badge-success'}" style="position:absolute;top:-4px;right:-4px;font-size:10px">${statusLabel}</span>
          </div>
          <div class="item-card-name">${item.name}</div>
          <div class="item-card-category">${item.category || '未分类'} · ${item.quantity || 1}${item.unit || ''}</div>
          ${item.expiry ? `<div class="item-card-expiry ${status}" style="color:${statusColor}">${status === 'expired' ? '⚠️ 已过期' : status === 'expiring' ? '⏰ 还剩'+daysLeft+'天' : '✅ '+item.expiry}</div>` : '<div class="item-card-expiry" style="color:var(--text-light)">无保质期信息</div>'}
          ${item.notes ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">💬 ${item.notes}</div>` : ''}
          <div class="item-card-actions">
            <button class="btn btn-sm ${status==='expired'?'btn-danger':'btn-ghost'}" onclick="event.stopPropagation();Inventory.showEditModal('${item.id}')">✏️ 编辑</button>
            <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();Inventory.deleteItem('${item.id}')" style="color:var(--color-danger)">🗑️</button>
          </div>
        </div>`;
    }).join('') + '</div>';
  },

  renderListView(container, items) {
    container.innerHTML = '<div class="inventory-list">' +
      `<div class="item-row" style="font-weight:600;color:var(--text-muted);font-size:0.78rem;background:transparent;border-color:transparent;padding:4px 16px">
        <span></span><span>名称</span><span>分类</span><span>数量</span><span>保质期</span><span>状态</span><span>操作</span>
      </div>` +
      items.map(item => {
        const status = Storage.getExpiryStatus(item.expiry);
        const icon = getIngredientIcon(item.name, item.category);
        return `
        <div class="item-row ${status}" style="cursor:pointer" onclick="Inventory.showEditModal('${item.id}')">
          <div class="item-row-img"><span style="font-size:1.2rem">${item.image ? '<img src="'+item.image+'" style="width:100%;height:100%;object-fit:cover;border-radius:4px">' : icon}</span></div>
          <div class="item-row-name">${item.name}</div>
          <div class="item-row-category"><span class="badge badge-gold" style="font-size:0.72rem">${item.category||'-'}</span></div>
          <div class="item-row-qty">${item.quantity||1} ${item.unit||''}</div>
          <div class="item-row-expiry ${status}">${item.expiry || '-'}</div>
          <div><span class="badge ${status==='expired'?'badge-danger':status==='expiring'?'badge-warning':'badge-success'}">${status==='expired'?'已过期':status==='expiring'?'即将过期':'正常'}</span></div>
          <div class="item-row-actions">
            <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();Inventory.showEditModal('${item.id}')">✏️</button>
            <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();Inventory.deleteItem('${item.id}')" style="color:var(--color-danger)">🗑️</button>
          </div>
        </div>`;
    }).join('') + '</div>';
  },

  // ===== 最近浏览 =====
  getRecentItems() {
    try { return JSON.parse(localStorage.getItem('fridge_recent') || '[]'); } catch { return []; }
  },
  saveRecentItems(items) {
    localStorage.setItem('fridge_recent', JSON.stringify(items.slice(0, 20)));
  },
  addRecentItem(id) {
    let items = this.getRecentItems().filter(i => i !== id);
    items.unshift(id);
    this.saveRecentItems(items);
  },
  renderRecentItems() {
    const el = document.getElementById('inv-recent');
    if (!el) return;
    const ids = this.getRecentItems();
    if (ids.length === 0) { el.style.display = 'none'; return; }
    const items = ids.map(id => Storage.getItemById(id)).filter(Boolean);
    if (items.length === 0) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.innerHTML = `
      <div class="glass-card">
        <div class="glass-card-header">
          <span class="glass-card-title">🕐 最近浏览</span>
          <button class="btn btn-sm btn-ghost" onclick="localStorage.removeItem('fridge_recent');Inventory.renderRecentItems()">清除</button>
        </div>
        <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px">
          ${items.map(i => `<div onclick="Inventory.showEditModal('${i.id}')" style="flex-shrink:0;display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--bg-card);border-radius:8px;border:1px solid var(--border-color);cursor:pointer;font-size:0.8rem">
            <span>${getIngredientIcon(i.name,i.category)}</span>
            <span>${i.name}</span>
          </div>`).join('')}
        </div>
      </div>`;
  },

  // ===== 分类 Emoji =====
  getCategoryEmoji(cat) {
    const map = {'全部':'🏠','蔬菜':'🥬','肉类':'🥩','海鲜':'🦐','水果':'🍎','饮料':'🥤','调料':'🧂','冷冻':'❄️','零食':'🍪','其他':'📦'};
    return map[cat] || '📦';
  },

  onSearch(q) { this.searchQuery = q.toLowerCase(); this.refresh(); },
  filterBy(cat) {
    this.currentCategory = cat === '全部' ? 'all' : cat;
    document.querySelectorAll('#inv-filters .filter-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
    this.refresh();
  },
  setSort(field) { this.sortBy = field; this.refresh(); },
  setView(mode) {
    this.viewMode = mode;
    const settings = Storage.getSettings(); settings.viewMode = mode; Storage.saveSettings(settings);
    this.render();
  },

  getFilteredItems() {
    let items = Storage.getInventory();
    if (this.currentCategory !== 'all') items = items.filter(i => i.category === this.currentCategory);
    if (this.searchQuery) items = items.filter(i => i.name.toLowerCase().includes(this.searchQuery));
    const sortFns = {
      name: (a,b) => a.name.localeCompare(b.name),
      category: (a,b) => (a.category||'').localeCompare(b.category||''),
      expiry: (a,b) => (a.expiry||'9999-99-99').localeCompare(b.expiry||'9999-99-99'),
      qty: (a,b) => (b.quantity||0) - (a.quantity||0)
    };
    items.sort(sortFns[this.sortBy] || sortFns.name);
    return items;
  },

  // ===== 弹窗 V2（支持点击遮罩关闭+ESC） =====
  showAddModal() { this.showFormModal(null); },
  showEditModal(id) {
    const item = Storage.getItemById(id);
    if (item) { this.addRecentItem(id); this.showFormModal(item); this.refresh(); }
  },

  showFormModal(item) {
    const isEdit = !!item;
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) this.closeModal(overlay); };

    const icon = !isEdit ? '➕' : getIngredientIcon(item.name, item.category);

    overlay.innerHTML = `
      <div class="modal" onclick="event.stopPropagation()" style="transform:none">
        <div class="modal-header">
          <h3 class="modal-title"><span style="font-size:1.3rem;margin-right:8px">${icon}</span>${isEdit ? '编辑「'+item.name+'」' : '添加食材'}</h3>
          <button class="modal-close" onclick="Inventory.closeModal(this.closest('.modal-overlay'))">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">🍴 食材名称 *</label>
              <input class="form-input" id="f-name" value="${isEdit ? item.name : ''}" placeholder="如：番茄" oninput="Inventory.previewIcon(this.value)">
              <div id="f-icon-preview" style="margin-top:4px;font-size:0.8rem;color:var(--text-muted)"></div>
            </div>
            <div class="form-group">
              <label class="form-label">📂 分类</label>
              <select class="form-select" id="f-category" onchange="Inventory.previewIcon(document.getElementById('f-name')?.value)">
                ${['蔬菜','肉类','海鲜','水果','饮料','调料','冷冻食品','零食','其他'].map(c =>
                  `<option value="${c}" ${isEdit && item.category === c ? 'selected' : ''}>${this.getCategoryEmoji(c)} ${c}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">🔢 数量</label>
              <input class="form-input" type="number" id="f-qty" value="${isEdit ? item.quantity : 1}" min="0.5" step="0.5">
            </div>
            <div class="form-group">
              <label class="form-label">📏 单位</label>
              <input class="form-input" id="f-unit" value="${isEdit ? item.unit : '个'}" placeholder="个/斤/克/毫升">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">📅 保质期</label>
              <input class="form-input" type="date" id="f-expiry" value="${isEdit ? item.expiry : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">🖼️ 图片</label>
              <div class="file-upload">
                <label class="file-upload-label" id="f-img-label">📷 上传图片</label>
                <input type="file" accept="image/*" id="f-image" onchange="Inventory.handleImageUpload(this)">
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">💬 备注</label>
            <input class="form-input" id="f-notes" value="${isEdit ? (item.notes||'') : ''}" placeholder="如：做番茄炒蛋用">
          </div>
          ${!isEdit ? `<div id="f-autosuggest" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"></div>` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Inventory.closeModal(this.closest('.modal-overlay'))">取消</button>
          <button class="btn btn-primary btn-lg" onclick="Inventory.saveForm('${isEdit ? item.id : ''}')">${isEdit ? '✅ 保存修改' : '➕ 添加'}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    setTimeout(() => {
      const input = document.getElementById('f-name');
      if (input) { input.focus(); if (!isEdit) this.previewIcon(''); }
    }, 100);

    // ESC 关闭
    this._escHandler = e => { if (e.key === 'Escape') { this.closeModal(overlay); }};
    document.addEventListener('keydown', this._escHandler);
  },

  previewIcon(name) {
    const preview = document.getElementById('f-icon-preview');
    if (!preview) return;
    const cat = document.getElementById('f-category')?.value;
    if (!name) { preview.innerHTML = ''; return; }
    const icon = getIngredientIcon(name, cat);
    preview.innerHTML = `图标预览：<span style="font-size:1.5rem">${icon}</span>`;
  },

  closeModal(overlay) {
    if (this._escHandler) { document.removeEventListener('keydown', this._escHandler); this._escHandler = null; }
    if (!overlay) overlay = document.querySelector('.modal-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.2s';
      setTimeout(() => overlay.remove(), 200);
    }
  },

  handleImageUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const label = document.getElementById('f-img-label');
      if (label) label.innerHTML = '✅ 已选择: ' + file.name;
      window._tempImgData = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  saveForm(id) {
    const name = document.getElementById('f-name')?.value?.trim();
    if (!name) return App.toast('请输入食材名称', 'warning');

    const data = {
      name,
      category: document.getElementById('f-category')?.value || '其他',
      quantity: parseFloat(document.getElementById('f-qty')?.value) || 1,
      unit: document.getElementById('f-unit')?.value || '个',
      expiry: document.getElementById('f-expiry')?.value || '',
      notes: document.getElementById('f-notes')?.value || '',
      image: window._tempImgData || (id ? Storage.getItemById(id)?.image : '')
    };
    window._tempImgData = null;

    if (id) {
      Storage.updateItem(id, data);
      App.toast(`✅ 「${data.name}」已更新`, 'success');
    } else {
      Storage.addItem(data);
      App.toast(`✅ 「${data.name}」已添加到冰箱`, 'success');
    }
    this.closeModal();
    this.refresh();
    App.updateExpiryBadge();
  },

  deleteItem(id) {
    const item = Storage.getItemById(id);
    if (!item) return;
    App.confirm(`确定要把「${item.name}」从冰箱移除吗？`, () => {
      Storage.deleteItem(id);
      this.refresh();
      App.updateExpiryBadge();
      App.toast(`🗑️ 「${item.name}」已移除`, 'success');
    });
  },

  clearAll() {
    const items = Storage.getInventory();
    if (items.length === 0) return App.toast('冰箱已经空了 🧊', 'info');
    App.confirm(`确定要清空全部 ${items.length} 种食材吗？此操作不可恢复！`, () => {
      Storage.clearAll();
      this.refresh();
      App.updateExpiryBadge();
      App.toast('🧹 冰箱已清空', 'success');
    });
  }
};

window.Inventory = Inventory;