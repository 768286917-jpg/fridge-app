/**
 * 家庭冰箱库存 App - Excel/CSV 导入导出模块
 * 使用 SheetJS 库处理 Excel 文件
 */

const ExcelManager = {
  // 加载 SheetJS 库
  loadLibrary(callback) {
    if (typeof XLSX !== 'undefined') { callback(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = callback;
    script.onerror = () => App.toast('加载 Excel 库失败，请检查网络', 'error');
    document.head.appendChild(script);
  },

  // 渲染导入导出页面
  render() {
    const container = document.getElementById('page-settings');
    if (!container) return;

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">设置</h1>
        <p class="page-subtitle">管理应用配置与数据</p>
      </div>

      <div class="settings-group">
        <div class="settings-group-title">🎨 主题设置</div>
        <div class="settings-item">
          <div>
            <div class="settings-item-label">深色模式</div>
            <div class="settings-item-desc">切换明暗主题</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="theme-toggle-setting" ${Storage.getSettings().theme === 'dark' ? 'checked' : ''} onchange="App.toggleTheme()">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-title">📂 数据导入导出</div>
        <div class="settings-item" style="flex-direction:column;align-items:stretch;gap:12px">
          <div>
            <div class="settings-item-label">导出库存数据</div>
            <div class="settings-item-desc">导出为 Excel(.xlsx) 或 CSV 格式</div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" onclick="ExcelManager.exportExcel()">📥 导出 Excel</button>
            <button class="btn btn-ghost" onclick="ExcelManager.exportCSV()">📥 导出 CSV</button>
          </div>
        </div>
        <div class="settings-item" style="flex-direction:column;align-items:stretch;gap:12px">
          <div>
            <div class="settings-item-label">导入库存数据</div>
            <div class="settings-item-desc">从 Excel 或 CSV 文件导入食材（自动识别字段）</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <label class="file-upload-label">📤 选择文件导入
              <input type="file" accept=".xlsx,.xls,.csv" onchange="ExcelManager.importFile(event)">
            </label>
            <button class="btn btn-ghost btn-sm" onclick="ExcelManager.downloadTemplate()">📄 下载模板</button>
          </div>
          <div id="import-result"></div>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-title">📖 菜谱管理</div>
        <div class="settings-item">
          <div>
            <div class="settings-item-label">恢复默认菜谱</div>
            <div class="settings-item-desc">重置为内置的 130+ 道菜谱数据</div>
          </div>
          <button class="btn btn-ghost" onclick="ExcelManager.resetRecipes()">🔄 恢复</button>
        </div>
        <div class="settings-item">
          <div>
            <div class="settings-item-label">清除所有数据</div>
            <div class="settings-item-desc">删除所有库存和菜谱数据</div>
          </div>
          <button class="btn btn-danger" onclick="ExcelManager.clearAllData()">🗑️ 清除</button>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-title">📱 关于</div>
        <div class="glass-card" style="text-align:center;padding:24px">
          <div style="font-size:2rem;margin-bottom:8px">🏮</div>
          <div style="font-family:var(--font-heading);font-size:1.1rem;font-weight:600;color:var(--gold-dark);margin-bottom:4px">家庭冰箱库存 · 智能菜谱推荐</div>
          <div style="font-size:0.85rem;color:var(--text-muted)">Version 1.0 · 为夫妻二人打造的温馨家庭应用</div>
        </div>
      </div>
    `;

    // 恢复主题状态
    const cb = document.getElementById('theme-toggle-setting');
    if (cb) cb.checked = Storage.getSettings().theme === 'dark';
  },

  // 导出 Excel
  exportExcel() {
    this.loadLibrary(() => {
      const items = Storage.getInventory();
      if (items.length === 0) return App.toast('冰箱为空，没有可导出的数据', 'warning');

      const data = items.map(i => ({
        '食材名称': i.name, '分类': i.category || '', '数量': i.quantity || 1,
        '单位': i.unit || '', '保质期': i.expiry || '', '备注': i.notes || ''
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, '冰箱库存');
      XLSX.writeFile(wb, `冰箱库存_${new Date().toISOString().slice(0,10)}.xlsx`);
      App.toast(`已导出 ${data.length} 条食材数据`, 'success');
    });
  },

  // 导出 CSV
  exportCSV() {
    this.loadLibrary(() => {
      const items = Storage.getInventory();
      if (items.length === 0) return App.toast('冰箱为空', 'warning');

      const data = items.map(i => ({
        '食材名称': i.name, '分类': i.category || '', '数量': i.quantity || 1,
        '单位': i.unit || '', '保质期': i.expiry || '', '备注': i.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `冰箱库存_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      App.toast(`已导出 ${data.length} 条数据`, 'success');
    });
  },

  // 导入文件
  importFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    this.loadLibrary(() => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);

          if (json.length === 0) {
            document.getElementById('import-result').innerHTML = '<div class="toast toast-error" style="margin-top:8px;pointer-events:auto"><span>❌ 文件为空或无有效数据</span></div>';
            return;
          }

          // 自动识别字段映射
          const fieldMap = this.autoMapFields(Object.keys(json[0]));
          let success = 0, fail = 0;

          json.forEach(row => {
            try {
              const item = {
                name: row[fieldMap.name] || row['食材名称'] || row['名称'] || row['name'] || '',
                category: row[fieldMap.category] || row['分类'] || row['category'] || '其他',
                quantity: parseInt(row[fieldMap.quantity] || row['数量'] || row['quantity'] || 1) || 1,
                unit: row[fieldMap.unit] || row['单位'] || row['unit'] || '个',
                expiry: row[fieldMap.expiry] || row['保质期'] || row['expiry'] || '',
                notes: row[fieldMap.notes] || row['备注'] || row['notes'] || ''
              };
              if (item.name) {
                Storage.addItem(item);
                success++;
              } else {
                fail++;
              }
            } catch { fail++; }
          });

          const resultDiv = document.getElementById('import-result');
          if (resultDiv) {
            resultDiv.innerHTML = `<div class="toast ${fail > 0 ? 'toast-warning' : 'toast-success'}" style="margin-top:8px;pointer-events:auto">
              <span>✅ 成功导入 ${success} 条${fail > 0 ? `，${fail} 条失败` : ''}</span>
            </div>`;
          }
          App.toast(`成功导入 ${success} 条食材`, 'success');
          Inventory.refresh();
        } catch (err) {
          App.toast('导入失败: ' + err.message, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    });
  },

  // 自动映射字段
  autoMapFields(fields) {
    const map = { name: '', category: '', quantity: '', unit: '', expiry: '', notes: '' };
    fields.forEach(f => {
      const lower = f.toLowerCase();
      if (lower.includes('名称') || lower.includes('name') || lower.includes('食材')) map.name = f;
      else if (lower.includes('分类') || lower.includes('类别') || lower.includes('category')) map.category = f;
      else if (lower.includes('数量') || lower.includes('quantity') || lower.includes('qty')) map.quantity = f;
      else if (lower.includes('单位') || lower.includes('unit')) map.unit = f;
      else if (lower.includes('保质') || lower.includes('expiry') || lower.includes('到期')) map.expiry = f;
      else if (lower.includes('备注') || lower.includes('notes') || lower.includes('note')) map.notes = f;
    });
    return map;
  },

  // 下载模板
  downloadTemplate() {
    this.loadLibrary(() => {
      const template = [
        { '食材名称': '番茄', '分类': '蔬菜', '数量': 3, '单位': '个', '保质期': '2026-06-10', '备注': '做番茄炒蛋' },
        { '食材名称': '鸡蛋', '分类': '其他', '数量': 10, '单位': '个', '保质期': '2026-06-15', '备注': '' },
        { '食材名称': '鸡胸肉', '分类': '肉类', '数量': 2, '单位': '块', '保质期': '2026-06-08', '备注': '减脂餐用' }
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(template);
      XLSX.utils.book_append_sheet(wb, ws, '模板');
      XLSX.writeFile(wb, '冰箱库存_导入模板.xlsx');
      App.toast('模板已下载', 'success');
    });
  },

  // 恢复默认菜谱
  resetRecipes() {
    App.confirm('确定恢复默认菜谱吗？自定义菜谱将被覆盖。', () => {
      initRecipeData();
      App.toast('菜谱已恢复为默认数据', 'success');
    });
  },

  // 清除所有数据
  clearAllData() {
    App.confirm('确定清除所有数据吗？此操作不可恢复！', () => {
      localStorage.clear();
      initRecipeData();
      App.toast('数据已清除', 'success');
      Inventory.render();
    });
  }
};

window.ExcelManager = ExcelManager;