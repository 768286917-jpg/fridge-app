/**
 * 家庭冰箱库存 App - 主应用 V2
 * 智能首页、三餐推荐、PWA支持、TabBar导航
 */

const App = {
  currentPage: 'home', userName: '',

  init() {
    initRecipeData();
    const settings = Storage.getSettings();
    if (settings.theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    this.renderNavbar();
    this.renderPages();
    this.navigate('home');
    this.bindShortcuts();
    this.registerPWA();
    setTimeout(() => {
      const hint = document.getElementById('shortcut-hint');
      if (hint) hint.classList.add('show');
      setTimeout(() => { if (hint) hint.classList.remove('show'); }, 4000);
    }, 2000);
  },

  renderNavbar() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    const items = Storage.getInventory();
    const expiringCount = items.filter(i => Storage.getExpiryStatus(i.expiry) === 'expiring' || Storage.getExpiryStatus(i.expiry) === 'expired').length;
    const now = new Date();
    const hour = now.getHours();
    let greet = hour < 6 ? '夜深了' : hour < 9 ? '早上好' : hour < 12 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
    this.userName = greet;

    nav.innerHTML = `
      <div class="navbar-inner">
        <div class="navbar-brand" onclick="App.navigate('home')">
          <span class="brand-icon">🏮</span><span>冰箱管家</span>
        </div>
        <!-- PC 导航 -->
        <div class="navbar-links" id="nav-links">
          <button class="nav-link active" data-page="home" onclick="App.navigate('home')">🏠 首页</button>
          <button class="nav-link" data-page="inventory" onclick="App.navigate('inventory')">🧊 库存${expiringCount > 0 ? ' <span class=\"badge badge-warning\">'+expiringCount+'</span>' : ''}</button>
          <button class="nav-link" data-page="recipes" onclick="App.navigate('recipes')">🍳 菜谱</button>
          <button class="nav-link" data-page="stats" onclick="App.navigate('stats')">📊 统计</button>
          <button class="nav-link" data-page="settings" onclick="App.navigate('settings')">⚙️ 设置</button>
        </div>
        <div class="navbar-actions">
          <button class="theme-toggle" onclick="App.toggleTheme()" title="切换主题">${document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'}</button>
          <button class="mobile-menu-btn" onclick="App.toggleMobileMenu()">☰</button>
        </div>
      </div>
      <!-- 移动端 TabBar -->
      <div class="tabbar" id="tabbar">
        <button class="tabbar-item active" data-page="home" onclick="App.navigate('home')"><span>🏠</span><span>首页</span></button>
        <button class="tabbar-item" data-page="inventory" onclick="App.navigate('inventory')"><span>🧊</span><span>库存</span></button>
        <button class="tabbar-item" data-page="recipes" onclick="App.navigate('recipes')"><span>🍳</span><span>菜谱</span></button>
        <button class="tabbar-item" data-page="stats" onclick="App.navigate('stats')"><span>📊</span><span>统计</span></button>
        <button class="tabbar-item" data-page="settings" onclick="App.navigate('settings')"><span>⚙️</span><span>设置</span></button>
      </div>`;
  },

  renderPages() {
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
      <div class="page active" id="page-home"></div>
      <div class="page" id="page-inventory"></div>
      <div class="page" id="page-recipes"></div>
      <div class="page" id="page-stats"></div>
      <div class="page" id="page-settings"></div>
      <div class="shortcut-hint" id="shortcut-hint">
        <span><span class="shortcut-key">H</span> 首页</span>
        <span><span class="shortcut-key">I</span> 库存</span>
        <span><span class="shortcut-key">R</span> 菜谱</span>
        <span><span class="shortcut-key">S</span> 统计</span>
        <span><span class="shortcut-key">T</span> 主题</span>
        <span><span class="shortcut-key">Esc</span> 关闭弹窗</span>
      </div>`;
  },

  navigate(page) {
    this.currentPage = page;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
    document.querySelectorAll('.tabbar-item').forEach(l => l.classList.toggle('active', l.dataset.page === page));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    document.getElementById('nav-links')?.classList.remove('open');

    switch (page) {
      case 'home': this.renderHome(); break;
      case 'inventory': Inventory.render(); break;
      case 'recipes': RecipeEngine.render(); break;
      case 'stats': Stats.render(); break;
      case 'settings': ExcelManager.render(); break;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.updateExpiryBadge();
  },

  // ===== 首页 V2（智能推荐 + 三餐计划 + 饮食建议） =====
  renderHome() {
    const container = document.getElementById('page-home');
    if (!container) return;

    const items = Storage.getInventory();
    const expiringItems = items.filter(i => Storage.getExpiryStatus(i.expiry) === 'expiring' || Storage.getExpiryStatus(i.expiry) === 'expired');
    const expiredItems = items.filter(i => Storage.getExpiryStatus(i.expiry) === 'expired');
    const categories = new Set(items.map(i => i.category)).size;

    // 智能推荐
    const allRecs = RecipeEngine.getRecommendations();
    const topRecs = allRecs.slice(0, 6);
    const bestMatch = allRecs.length > 0 ? allRecs[0] : null;

    // 快速消耗推荐（优先使用快过期食材）
    const quickUseRecs = expiringItems.length > 0 ? allRecs.filter(r =>
      r.ingredients.some(i => expiringItems.some(e => e.name.includes(i) || i.includes(e.name)))
    ).slice(0, 3) : [];

    // 三餐推荐
    const mealPlan = this.generateMealPlan(items);

    // 营养分析
    const nutrition = this.analyzeNutrition(items);

    // 推荐理由
    const reasons = this.generateReasons(items, expiringItems, nutrition);

    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 星期${'日一二三四五六'[now.getDay()]}`;
    const hour = now.getHours();
    const timeGreeting = hour < 9 ? '🌅 开启美好的一天' : hour < 12 ? '☀️ 上午好' : hour < 14 ? '🌤️ 中午好' : hour < 18 ? '🌇 下午好' : '🌙 温馨的夜晚';

    container.innerHTML = `
      <!-- Banner -->
      <div class="home-banner">
        <div class="banner-content">
          <div class="banner-greeting">${timeGreeting}</div>
          <div class="banner-date">${dateStr} · ${items.length > 0 ? '冰箱里有 ' + items.length + ' 种食材' : '冰箱空空如也'}</div>
          <div class="banner-stats">
            <div class="banner-stat"><div class="banner-stat-value">${items.length}</div><div class="banner-stat-label">食材</div></div>
            <div class="banner-stat"><div class="banner-stat-value">${categories}</div><div class="banner-stat-label">分类</div></div>
            <div class="banner-stat ${expiringItems.length > 0 ? 'banner-stat-danger' : ''}">
              <div class="banner-stat-value">${expiringItems.length}</div>
              <div class="banner-stat-label">${expiringItems.length > 0 ? '⚠️ 待处理' : '✅ 良好'}</div>
            </div>
            <div class="banner-stat"><div class="banner-stat-value">${allRecs.length}</div><div class="banner-stat-label">可做菜</div></div>
          </div>
        </div>
      </div>

      <!-- 推荐理由 -->
      ${reasons.length > 0 ? `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
        ${reasons.map(r => `<div style="padding:8px 16px;background:rgba(201,161,77,0.08);border-radius:8px;font-size:0.82rem;color:var(--text-secondary);border:1px solid var(--border-color)">💡 ${r}</div>`).join('')}
      </div>` : ''}

      <!-- 今日最佳推荐 -->
      ${bestMatch ? `
      <div class="glass-card" style="margin-bottom:20px;background:linear-gradient(135deg,rgba(201,161,77,0.06),rgba(196,30,58,0.04));border-color:var(--gold-primary)">
        <div class="glass-card-header">
          <span class="glass-card-title" style="font-size:1.2rem">🏆 今日最佳推荐</span>
        </div>
        <div style="display:flex;align-items:center;gap:20px;cursor:pointer" onclick="RecipeEngine.showDetail('${bestMatch.id}')">
          <div style="font-size:4rem;flex-shrink:0">${RecipeEngine.getCuisineIcon(bestMatch)}</div>
          <div style="flex:1">
            <div style="font-family:var(--font-heading);font-size:1.3rem;font-weight:700;color:var(--gold-dark);margin-bottom:4px">${bestMatch.name}</div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:6px">
              ⏱ ${bestMatch.cookTime || 20}分钟 · 🔥 ${bestMatch.calories || 250}千卡 · ${bestMatch.difficulty || '简单'}
              ${bestMatch.protein ? ` · 💪 蛋白质${bestMatch.protein}g` : ''}
            </div>
            <div style="font-size:0.8rem;color:var(--text-secondary)">
              库存匹配 <strong style="color:var(--gold-dark)">${Math.round(bestMatch._matchRate*100)}%</strong>
              · 需要 ${bestMatch.ingredients.length} 种食材 · ${bestMatch._missing > 0 ? '缺少 ' + bestMatch._missing + ' 种' : '✅ 食材齐全'}
            </div>
          </div>
          <div style="font-size:1.5rem;color:var(--text-muted)">→</div>
        </div>
      </div>` : items.length === 0 ? `
      <div class="glass-card" style="margin-bottom:20px;text-align:center;padding:32px">
        <div style="font-size:3rem;margin-bottom:12px">🧊</div>
        <div style="font-size:1.1rem;color:var(--text-secondary);margin-bottom:8px">冰箱是空的</div>
        <button class="btn btn-primary btn-lg" onclick="Inventory.showAddModal()">＋ 添加食材</button>
      </div>` : ''}

      <!-- 快速消耗区 -->
      ${quickUseRecs.length > 0 ? `
      <div class="glass-card" style="margin-bottom:20px;border-color:var(--color-warning)">
        <div class="glass-card-header">
          <span class="glass-card-title">⏰ 优先消耗 · 临期食材推荐</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px">
          ${quickUseRecs.map(r => RecipeEngine.renderRecipeCard(r)).join('')}
        </div>
      </div>` : ''}

      <!-- 今日推荐菜谱 -->
      ${topRecs.length > 0 ? `
      <div class="glass-card" style="margin-bottom:20px">
        <div class="glass-card-header">
          <span class="glass-card-title">🍳 今日推荐菜谱</span>
          <button class="btn btn-sm btn-ghost" onclick="App.navigate('recipes')">查看全部 →</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px">
          ${topRecs.map(r => RecipeEngine.renderRecipeCard(r)).join('')}
        </div>
      </div>` : ''}

      <!-- 三餐推荐 + 营养分析 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
        <div class="glass-card">
          <div class="glass-card-header">
            <span class="glass-card-title">📅 今日饮食计划</span>
            <button class="btn btn-sm btn-ghost" onclick="RecipeEngine.randomPick()">🎲 换一换</button>
          </div>
          ${mealPlan ? `
            <div style="display:flex;flex-direction:column;gap:8px">
              ${['早餐','午餐','晚餐'].map((meal, i) => `
                <div onclick="RecipeEngine.showDetail('${mealPlan[i].id}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg-card);border-radius:10px;border:1px solid var(--border-color);cursor:pointer;transition:all 0.2s">
                  <span style="font-size:1.5rem">${i === 0 ? '🌅' : i === 1 ? '☀️' : '🌙'}</span>
                  <div style="flex:1">
                    <div style="font-weight:600;font-size:0.9rem;color:var(--text-primary)">${meal.name}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">⏱ ${meal.cookTime || 15}分钟 · 🔥 ${meal.calories || 200}千卡</div>
                  </div>
                  <span style="font-size:0.8rem;color:var(--text-muted)">→</span>
                </div>`).join('')}
            </div>
            <div style="margin-top:12px;padding:10px;background:rgba(201,161,77,0.06);border-radius:8px;font-size:0.8rem;color:var(--text-secondary)">
              📊 三餐总计：约 <strong style="color:var(--gold-dark)">${mealPlan.reduce((s,m) => s + (m.calories||200), 0)}</strong> 千卡
            </div>
          ` : '<div style="color:var(--text-muted);padding:12px;text-align:center">添加食材后自动生成饮食计划</div>'}
        </div>

        <div class="glass-card">
          <div class="glass-card-header">
            <span class="glass-card-title">📊 营养分析</span>
          </div>
          ${items.length > 0 ? `
            <div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:0.8rem;color:var(--text-muted)">蛋白质来源</span>
                <span style="font-size:0.8rem;font-weight:600;color:var(--gold-dark)">${nutrition.protein}</span>
              </div>
              <div style="height:6px;background:var(--bg-card);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${Math.min(nutrition.proteinScore,100)}%;background:linear-gradient(90deg,#c9a14d,#e0c878);border-radius:3px;transition:width 0.5s"></div>
              </div>
            </div>
            <div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:0.8rem;color:var(--text-muted)">蔬菜纤维</span>
                <span style="font-size:0.8rem;font-weight:600;color:var(--gold-dark)">${nutrition.veggie}</span>
              </div>
              <div style="height:6px;background:var(--bg-card);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${Math.min(nutrition.veggieScore,100)}%;background:linear-gradient(90deg,#5a9e6f,#8bc9a0);border-radius:3px;transition:width 0.5s"></div>
              </div>
            </div>
            <div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:0.8rem;color:var(--text-muted)">营养均衡度</span>
                <span style="font-size:0.8rem;font-weight:600;color:var(--gold-dark)">${nutrition.balanceScore}/100</span>
              </div>
              <div style="height:6px;background:var(--bg-card);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${nutrition.balanceScore}%;background:linear-gradient(90deg,${nutrition.balanceScore > 70 ? '#4a9e5c' : nutrition.balanceScore > 40 ? '#d4a030' : '#c41e3a'},${nutrition.balanceScore > 70 ? '#6bc47e' : nutrition.balanceScore > 40 ? '#e8c040' : '#e84a5f'});border-radius:3px;transition:width 0.5s"></div>
              </div>
            </div>
            ${nutrition.suggestion ? `<div style="padding:8px 12px;background:rgba(201,161,77,0.06);border-radius:8px;font-size:0.8rem;color:var(--text-secondary)">💡 ${nutrition.suggestion}</div>` : ''}
          ` : '<div style="color:var(--text-muted);padding:12px;text-align:center">添加食材后自动分析营养</div>'}
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="glass-card" style="margin-bottom:20px">
        <div class="glass-card-header">
          <span class="glass-card-title">⚡ 快捷操作</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">
          ${[
            ['🥬','添加食材',"Inventory.showAddModal()"],
            ['🍳','智能推荐',"App.navigate('recipes')"],
            ['🎲','今天吃什么',"RecipeEngine.randomPick()"],
            ['📋','管理库存',"App.navigate('inventory')"],
            ['📤','导入导出',"App.navigate('settings')"],
            ['📊','数据统计',"App.navigate('stats')"],
            ['💝','我的收藏',"App.navigate('recipes');setTimeout(()=>RecipeEngine.showFavorites(),200)"]
          ].map(([icon, label, action]) =>
            `<button class="btn btn-outline" onclick="${action}" style="padding:14px 10px;flex-direction:column;gap:6px;height:auto;border-radius:12px">
              <span style="font-size:1.5rem">${icon}</span>
              <span style="font-size:0.8rem">${label}</span>
            </button>`
          ).join('')}
        </div>
      </div>

      <!-- 过期提醒 -->
      ${expiredItems.length > 0 ? `
      <div class="glass-card" style="border-color:var(--color-danger)">
        <div class="glass-card-header">
          <span class="glass-card-title" style="color:var(--color-danger)">⚠️ 已过期食材</span>
          <button class="btn btn-sm btn-danger" onclick="Inventory.render();App.navigate('inventory')">去处理</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${expiredItems.slice(0,5).map(i => `
            <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(196,30,58,0.04);border-radius:8px;font-size:0.85rem">
              <span style="font-size:1.2rem">${getIngredientIcon(i.name)}</span>
              <span style="flex:1">${i.name}</span>
              <span style="color:var(--color-danger);font-size:0.8rem">已于 ${i.expiry} 过期</span>
              <button class="btn btn-sm btn-ghost" onclick="Inventory.deleteItem('${i.id}');App.renderHome()" style="color:var(--color-danger)">移除</button>
            </div>`).join('')}
        </div>
      </div>` : ''}
    `;
  },

  // ===== 三餐推荐生成 =====
  generateMealPlan(items) {
    const allRecs = RecipeEngine.getRecommendations();
    if (allRecs.length === 0) return null;
    const breakfasts = allRecs.filter(r => r.isBreakfast || r.cookTime <= 10 || r.tags?.includes('早餐'));
    const lunches = allRecs.filter(r => !r.isBreakfast && !r.isSnack && !r.isSoup);
    const dinners = allRecs.filter(r => r.isDiet || r.isSoup || r.calories <= 400);

    const pick = (list) => list.length > 0 ? list[Math.floor(Math.random() * Math.min(list.length, 5))] : allRecs[0];
    return [pick(breakfasts.length > 0 ? breakfasts : allRecs.slice(0,5)), pick(lunches), pick(dinners)];
  },

  // ===== 营养分析 =====
  analyzeNutrition(items) {
    const meatItems = items.filter(i => ['肉类','海鲜'].includes(i.category));
    const veggieItems = items.filter(i => ['蔬菜','水果'].includes(i.category));
    const allItems = items.length;
    const protein = meatItems.length;
    const veggie = veggieItems.length;
    const proteinScore = Math.round((protein / Math.max(allItems, 1)) * 100);
    const veggieScore = Math.round((veggie / Math.max(allItems, 1)) * 100);
    const balanceScore = Math.round((proteinScore + veggieScore) / 2);
    let suggestion = '';
    if (protein < 3) suggestion = '🥩 蛋白质来源偏少，建议补充肉类或豆制品';
    else if (veggie < 3) suggestion = '🥬 蔬菜摄入不足，建议补充绿色蔬菜';
    else if (balanceScore > 70) suggestion = '🥗 营养均衡，继续保持！';
    else suggestion = '📊 建议多样化饮食，补充不同种类的食材';
    return { protein: protein + '种', veggie: veggie + '种', proteinScore, veggieScore, balanceScore, suggestion };
  },

  // ===== 智能推荐理由 =====
  generateReasons(items, expiringItems, nutrition) {
    const reasons = [];
    if (expiringItems.length > 0) {
      const names = expiringItems.slice(0, 2).map(i => i.name).join('、');
      reasons.push(`"${names}"即将过期，建议优先使用`);
    }
    if (nutrition.proteinScore < 30) reasons.push('当前蛋白质偏少，推荐高蛋白菜谱');
    if (nutrition.veggieScore < 30) reasons.push('蔬菜摄入不足，建议搭配绿色蔬菜');
    if (items.length < 5) reasons.push('冰箱库存较少，建议补充食材');
    if (items.length > 15) reasons.push('冰箱食材丰富，可尝试复杂菜谱');
    if (new Date().getHours() >= 17) reasons.push('🌙 晚餐时间，推荐低脂易消化菜谱');
    else if (new Date().getHours() < 10) reasons.push('🌅 早餐时间，推荐快手营养菜谱');
    return reasons;
  },

  // ===== 主题 =====
  toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    if (isDark) html.removeAttribute('data-theme');
    const settings = Storage.getSettings();
    settings.theme = isDark ? 'dark' : 'light';
    Storage.saveSettings(settings);
    document.querySelector('.theme-toggle') && (document.querySelector('.theme-toggle').textContent = isDark ? '🌙' : '☀️');
    const toggleSetting = document.getElementById('theme-toggle-setting');
    if (toggleSetting) toggleSetting.checked = !isDark;
    App.toast(isDark ? '🌙 已切换深色模式' : '☀️ 已切换浅色模式', 'info');
  },

  toggleMobileMenu() { document.getElementById('nav-links')?.classList.toggle('open'); },

  updateExpiryBadge() {
    const items = Storage.getInventory();
    const count = items.filter(i => Storage.getExpiryStatus(i.expiry) === 'expiring' || Storage.getExpiryStatus(i.expiry) === 'expired').length;
    // Update navbar badge
    const navLinks = document.getElementById('nav-links');
    if (navLinks) {
      const invLink = navLinks.querySelector('[data-page="inventory"]');
      if (invLink) {
        const badge = invLink.querySelector('.badge');
        if (badge) { badge.textContent = count; badge.style.display = count > 0 ? '' : 'none'; }
        else if (count > 0) invLink.innerHTML += ' <span class="badge badge-warning">'+count+'</span>';
      }
    }
  },

  // ===== Toast =====
  toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container') || (() => {
      const c = document.createElement('div'); c.id = 'toast-container'; c.className = 'toast-container';
      document.body.appendChild(c); return c;
    })();
    const icons = { success: '✅', warning: '⚠️', error: '❌', info: '💡' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]||'💡'}</span><span class="toast-text">${message}</span>
      <button class="toast-close" onclick="this.closest('.toast').classList.add('toast-leaving');setTimeout(()=>this.closest('.toast').remove(),300)">✕</button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast-leaving'); setTimeout(() => toast.remove(), 300); }, duration);
  },

  // ===== 确认弹窗 =====
  confirm(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px" onclick="event.stopPropagation()">
        <div class="modal-body" style="text-align:center;padding:32px">
          <div style="font-size:2.5rem;margin-bottom:12px">🤔</div>
          <div style="font-size:1.05rem;color:var(--text-primary);margin-bottom:20px;line-height:1.5">${message}</div>
          <div style="display:flex;gap:12px;justify-content:center">
            <button class="btn btn-ghost btn-lg" onclick="this.closest('.modal-overlay').remove()">取消</button>
            <button class="btn btn-danger btn-lg" id="confirm-btn">确定</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('confirm-btn')?.addEventListener('click', () => { overlay.remove(); if (onConfirm) onConfirm(); });
    // ESC close
    const esc = e => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); }};
    document.addEventListener('keydown', esc);
  },

  // ===== 快捷键 =====
  bindShortcuts() {
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      const key = e.key.toLowerCase();
      if (key === 'h') this.navigate('home');
      else if (key === 'i') this.navigate('inventory');
      else if (key === 'r') this.navigate('recipes');
      else if (key === 's') this.navigate('stats');
      else if (key === 't') this.toggleTheme();
      else if (key === 'escape') {
        // 优先关闭菜谱详情
        RecipeEngine.closeDetail();
        // 然后关闭其他弹窗
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
      }
    });
  },

  // ===== PWA 注册 =====
  registerPWA() {
    if ('serviceWorker' in navigator) {
      // 不注册 service worker，因为需要 HTTPS
      // 但添加 PWA 所需的 meta 标签
    }
    // 检查是否可安装
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      // 在设置页面显示安装按钮
      setTimeout(() => {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
          installBtn.style.display = 'flex';
          installBtn.onclick = () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(result => {
              if (result.outcome === 'accepted') App.toast('🎉 安装成功！', 'success');
              deferredPrompt = null;
            });
          };
        }
      }, 1000);
    });
  },

  onScroll() {
    document.getElementById('nav-links')?.classList.remove('open');
    // TabBar 自动隐藏
    const tabbar = document.getElementById('tabbar');
    if (tabbar) {
      // 简单实现：滚动时不下滑隐藏，保持固定
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
window.addEventListener('scroll', () => App.onScroll());
window.App = App;