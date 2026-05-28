/**
 * 家庭冰箱库存 App - 智能菜谱推荐引擎 V2
 * 专业菜谱详情、做菜计时器、收藏系统、步骤追踪
 */

const RecipeEngine = {
  currentFilter: 'all', currentSearch: '', currentTimer: null, timerSeconds: 0,

  render() {
    const container = document.getElementById('page-recipes');
    if (!container) return;
    const favCount = this.getFavorites().length;

    container.innerHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <h1 class="page-title">🍳 智能菜谱</h1>
          <p class="page-subtitle">依据冰箱库存智能匹配 · <strong>${favCount}</strong> 道收藏</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="RecipeEngine.showFavorites()">❤️ 收藏 (${favCount})</button>
          <button class="btn btn-outline btn-sm" onclick="RecipeEngine.randomPick()">🎲 今天吃什么</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" class="form-input" id="recipe-search" placeholder="搜索菜名或食材..." oninput="RecipeEngine.onSearch(this.value)">
        </div>
        <div class="filter-group" id="recipe-filters">
          <button class="filter-chip active" data-filter="all" onclick="RecipeEngine.filterBy('all')">🏠 全部</button>
          <button class="filter-chip" data-filter="sichuan" onclick="RecipeEngine.filterBy('sichuan')">🌶️ 川菜</button>
          <button class="filter-chip" data-filter="home" onclick="RecipeEngine.filterBy('home')">🥘 家常</button>
          <button class="filter-chip" data-filter="diet" onclick="RecipeEngine.filterBy('diet')">🥗 减脂</button>
          <button class="filter-chip" data-filter="quick" onclick="RecipeEngine.filterBy('quick')">⚡ 快手</button>
          <button class="filter-chip" data-filter="breakfast" onclick="RecipeEngine.filterBy('breakfast')">🌅 早餐</button>
          <button class="filter-chip" data-filter="soup" onclick="RecipeEngine.filterBy('soup')">🍲 汤类</button>
          <button class="filter-chip" data-filter="snack" onclick="RecipeEngine.filterBy('snack')">🌙 小吃</button>
        </div>
      </div>
      <div id="recipe-results"></div>
    `;
    this.renderResults();
  },

  renderResults() {
    const container = document.getElementById('recipe-results');
    if (!container) return;
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><span class="loading-text">智能匹配中...</span></div>';

    setTimeout(() => {
      const results = this.getRecommendations();
      if (results.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🍳</div><div class="empty-state-title">暂无匹配菜谱</div><div class="empty-state-desc">去冰箱添加食材，或换个筛选条件试试</div></div>';
        return;
      }
      container.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">' +
        results.map(r => this.renderRecipeCard(r)).join('') + '</div>';
    }, 200);
  },

  // ===== 菜谱卡片 V2 =====
  renderRecipeCard(recipe) {
    const inventory = Storage.getInventory();
    const invNames = inventory.map(i => i.name);
    const has = recipe.ingredients.filter(i => invNames.some(n => i.includes(n)));
    const missing = recipe.ingredients.filter(i => !invNames.some(n => i.includes(n)));
    const matchRate = Math.round((has.length / Math.max(recipe.ingredients.length,1)) * 100);
    const favs = this.getFavorites();
    const isFav = favs.includes(recipe.id);
    const icon = this.getCuisineIcon(recipe);
    const tags = this.getTags(recipe);

    return `
      <div class="recipe-card" onclick="RecipeEngine.showDetail('${recipe.id}')">
        <div class="recipe-card-img" style="position:relative;background:linear-gradient(135deg,var(--bg-secondary),var(--bg-card))">
          <span style="font-size:3.5rem;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.1))">${icon}</span>
          <button class="btn btn-sm" onclick="event.stopPropagation();RecipeEngine.toggleFavorite('${recipe.id}')"
            style="position:absolute;top:8px;right:8px;background:${isFav?'var(--red-gradient)':'rgba(255,255,255,0.6)'};border:none;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:0.9rem;backdrop-filter:blur(4px);color:${isFav?'white':'var(--text-muted)'}">
            ${isFav ? '❤️' : '🤍'}
          </button>
          <div class="badge ${matchRate >= 100 ? 'badge-success' : matchRate >= 50 ? 'badge-warning' : 'badge-gold'}" style="position:absolute;bottom:8px;left:8px;font-size:0.7rem">${matchRate}% 匹配</div>
        </div>
        <div class="recipe-card-body">
          <div class="recipe-card-title">${recipe.name}</div>
          <div class="recipe-card-meta">
            <span>⏱ ${recipe.cookTime || recipe.totalTime || 20}分钟</span>
            <span>🔥 ${recipe.calories || 250}千卡</span>
            ${recipe.protein ? `<span>💪 ${recipe.protein}g蛋白质</span>` : ''}
          </div>
          <div class="recipe-card-tags">${tags}</div>
          ${missing.length > 0
            ? `<div class="recipe-card-missing">❌ 缺少: ${missing.slice(0,3).map(m => getIngredientIcon(m) + m).join('、')}${missing.length > 3 ? ' 等' : ''}</div>`
            : '<div class="recipe-card-missing" style="color:var(--color-success)">✅ 食材齐全，即刻开做！</div>'}
        </div>
      </div>`;
  },

  getCuisineIcon(recipe) {
    if (recipe.isBreakfast) return '🌅';
    if (recipe.isSoup) return '🍲';
    if (recipe.isSnack) return '🌙';
    if (recipe.isSichuan) return '🌶️';
    if (recipe.isHome) return '🥘';
    if (recipe.isDiet) return '🥗';
    if (recipe.isQuick) return '⚡';
    return '🍳';
  },

  getTags(recipe) {
    const tags = [];
    if (recipe.isSichuan) tags.push('<span class="recipe-tag recipe-tag-sichuan">🌶️ 川菜</span>');
    if (recipe.isHome) tags.push('<span class="recipe-tag" style="background:rgba(201,161,77,0.1);color:var(--gold-dark)">🥘 家常</span>');
    if (recipe.isDiet) tags.push('<span class="recipe-tag recipe-tag-diet">🥗 减脂</span>');
    if (recipe.isQuick) tags.push('<span class="recipe-tag recipe-tag-quick">⚡ 快手</span>');
    if (recipe.isBreakfast) tags.push('<span class="recipe-tag" style="background:rgba(232,160,64,0.1);color:#c47a20">🌅 早餐</span>');
    if (recipe.isSoup) tags.push('<span class="recipe-tag" style="background:rgba(91,127,165,0.1);color:var(--color-info)">🍲 汤类</span>');
    if (recipe.isSnack) tags.push('<span class="recipe-tag" style="background:rgba(180,80,120,0.1);color:#b45068">🌙 小吃</span>');
    if (recipe.tags) recipe.tags.forEach(t => {
      if (!['川菜','经典','麻辣','家常','减脂','快手','早餐','汤类','小吃'].includes(t))
        tags.push(`<span class="recipe-tag" style="background:var(--border-color);color:var(--text-muted)">${t}</span>`);
    });
    return tags.join('');
  },

  // ===== 推荐引擎 V2 =====
  getRecommendations() {
    const inventory = Storage.getInventory();
    const allRecipes = Storage.getRecipes();
    const invNames = inventory.map(i => i.name);
    let filtered = [...allRecipes];

    if (this.currentFilter === 'sichuan') filtered = filtered.filter(r => r.isSichuan);
    else if (this.currentFilter === 'home') filtered = filtered.filter(r => r.isHome);
    else if (this.currentFilter === 'diet') filtered = filtered.filter(r => r.isDiet);
    else if (this.currentFilter === 'quick') filtered = filtered.filter(r => r.isQuick);
    else if (this.currentFilter === 'breakfast') filtered = filtered.filter(r => r.isBreakfast);
    else if (this.currentFilter === 'soup') filtered = filtered.filter(r => r.isSoup);
    else if (this.currentFilter === 'snack') filtered = filtered.filter(r => r.isSnack);

    if (this.currentSearch) {
      const q = this.currentSearch.toLowerCase();
      filtered = filtered.filter(r => r.name.includes(q) || r.ingredients.some(i => i.includes(q)));
    }

    return filtered.map(recipe => {
      const has = recipe.ingredients.filter(i => invNames.some(n => i.includes(n)));
      const matchRate = has.length / Math.max(recipe.ingredients.length, 1);
      const score = matchRate * 100 + has.length * 5;
      return { ...recipe, _has: has.length, _missing: recipe.ingredients.length - has.length, _matchRate: matchRate, _score: score };
    }).sort((a, b) => b._score - a._score);
  },

  onSearch(q) { this.currentSearch = q; this.renderResults(); },

  filterBy(filter) {
    this.currentFilter = filter;
    document.querySelectorAll('#recipe-filters .filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === filter));
    this.renderResults();
  },

  // ===== 收藏系统 =====
  getFavorites() {
    try { return JSON.parse(localStorage.getItem('fridge_favorites') || '[]'); } catch { return []; }
  },
  saveFavorites(favs) { localStorage.setItem('fridge_favorites', JSON.stringify(favs)); },

  toggleFavorite(id) {
    let favs = this.getFavorites();
    const idx = favs.indexOf(id);
    if (idx >= 0) { favs.splice(idx, 1); App.toast('已取消收藏', 'info'); }
    else { favs.push(id); App.toast('❤️ 已收藏', 'success'); }
    this.saveFavorites(favs);
    this.renderResults();
  },

  isFavorite(id) { return this.getFavorites().includes(id); },

  showFavorites() {
    const favs = this.getFavorites();
    if (favs.length === 0) return App.toast('还没有收藏菜谱哦 💝', 'info');
    const allRecipes = Storage.getRecipes();
    const filtered = allRecipes.filter(r => favs.includes(r.id));
    if (filtered.length === 0) return App.toast('收藏的菜谱已被移除', 'warning');

    this.currentFilter = 'all';
    this.currentSearch = '';
    document.querySelectorAll('#recipe-filters .filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-filter="all"]')?.classList.add('active');
    document.getElementById('recipe-search') && (document.getElementById('recipe-search').value = '');

    const container = document.getElementById('recipe-results');
    if (container) {
      container.innerHTML = `
        <div style="margin-bottom:16px">
          <span class="glass-card-title">❤️ 我的收藏 (${filtered.length})</span>
          <button class="btn btn-sm btn-ghost" style="margin-left:8px" onclick="RecipeEngine.renderResults()">返回全部</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
          ${filtered.map(r => this.renderRecipeCard(r)).join('')}
        </div>`;
    }
  },

  // ===== 随机推荐 =====
  randomPick() {
    const inventory = Storage.getInventory();
    if (inventory.length === 0) return App.toast('冰箱是空的，先去添加食材吧！🧊', 'warning');
    const results = this.getRecommendations().filter(r => r._matchRate > 0);
    if (results.length === 0) return App.toast('没有匹配的菜谱，试试添加更多食材', 'info');
    const pick = results[Math.floor(Math.random() * Math.min(results.length, 20))];
    this.showDetail(pick.id);
    App.toast(`🎲 今日推荐：${pick.name}！`, 'success');
  },

  // ===== 菜谱详情 V2（大图Banner + 计时器 + 步骤进度） =====
  showDetail(id) {
    const allRecipes = Storage.getRecipes();
    const recipe = allRecipes.find(r => r.id === id);
    if (!recipe) return;

    const inventory = Storage.getInventory();
    const invNames = inventory.map(i => i.name);
    const hasIngredients = recipe.ingredients.filter(i => invNames.some(n => i.includes(n)));
    const missingIngredients = recipe.ingredients.filter(i => !invNames.some(n => i.includes(n)));
    const icon = this.getCuisineIcon(recipe);
    const isFav = this.isFavorite(id);

    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) this.closeDetail(overlay); };

    overlay.innerHTML = `
      <div class="modal modal-lg" onclick="event.stopPropagation()" style="padding:0;overflow:hidden">
        <!-- 顶部大图 Banner -->
        <div style="height:200px;background:linear-gradient(135deg,rgba(201,161,77,0.15),rgba(196,30,58,0.1));display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
          <span style="font-size:5rem;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.15))">${icon}</span>
          <div style="position:absolute;top:0;left:0;right:0;padding:16px;display:flex;justify-content:space-between">
            <button class="btn btn-sm" style="background:rgba(0,0,0,0.3);backdrop-filter:blur(4px);color:white;border:none;border-radius:8px" onclick="RecipeEngine.closeDetail(this.closest('.modal-overlay'))">← 返回</button>
            <button class="btn btn-sm" style="background:${isFav?'var(--red-gradient)':'rgba(0,0,0,0.3)'};backdrop-filter:blur(4px);color:white;border:none;border-radius:8px" onclick="RecipeEngine.toggleFavorite('${recipe.id}');this.innerHTML=RecipeEngine.isFavorite('${recipe.id}')?'❤️ 已收藏':'🤍 收藏'">
              ${isFav ? '❤️ 已收藏' : '🤍 收藏'}
            </button>
          </div>
        </div>

        <!-- 基本信息 -->
        <div style="padding:24px 24px 0">
          <h2 class="recipe-detail-title">${recipe.name}</h2>
          <div class="recipe-detail-meta">
            <span class="recipe-detail-meta-item">⏱ ${recipe.prepTime || 5}分钟(备) + ${recipe.cookTime || 20}分钟(烹)</span>
            <span class="recipe-detail-meta-item">🔥 ${recipe.calories || 250}千卡</span>
            ${recipe.protein ? `<span class="recipe-detail-meta-item">💪 蛋白质 ${recipe.protein}g</span>` : ''}
            ${recipe.carbs ? `<span class="recipe-detail-meta-item">🌾 碳水 ${recipe.carbs}g</span>` : ''}
            ${recipe.fat ? `<span class="recipe-detail-meta-item">🧈 脂肪 ${recipe.fat}g</span>` : ''}
            <span class="recipe-detail-meta-item">📊 ${recipe.difficulty || '简单'}</span>
          </div>
        </div>

        <div style="padding:0 24px 24px;display:grid;grid-template-columns:1fr 1fr;gap:24px">

          <!-- 左侧：食材 -->
          <div>
            <div class="recipe-detail-section">
              <div class="recipe-detail-section-title"><span style="font-size:1.2rem">📋</span> 所需食材</div>
              <div class="recipe-detail-ingredients">
                ${recipe.ingredients.map(i => {
                  const has = hasIngredients.includes(i);
                  const cleanName = i.replace(/\d+[克g斤两勺ml毫升个块根包盒袋只条片碗]/g,'').trim();
                  return `<div class="ingredient-item" style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:${has?'rgba(74,158,92,0.06)':'var(--bg-card)'};border-radius:8px;font-size:0.85rem">
                    <span style="font-size:1rem">${getIngredientIcon(cleanName)}</span>
                    <span style="flex:1">${i}</span>
                    <span class="${has ? 'has-icon' : 'missing-icon'}" style="font-size:0.8rem">${has ? '✅ 有' : '❌ 缺'}</span>
                  </div>`;
                }).join('')}
              </div>
              ${missingIngredients.length > 0 ? `
                <div style="margin-top:8px;padding:8px 12px;background:rgba(212,160,48,0.08);border-radius:8px;font-size:0.8rem;color:var(--color-warning)">
                  ⚠️ 缺少 ${missingIngredients.length} 种食材：${missingIngredients.join('、')}
                </div>` : `
                <div style="margin-top:8px;padding:8px 12px;background:rgba(74,158,92,0.08);border-radius:8px;font-size:0.8rem;color:var(--color-success)">
                  ✅ 所有食材齐全！
                </div>`}
            </div>
          </div>

          <!-- 右侧：步骤 + 计时器 -->
          <div>
            <!-- 计时器 -->
            <div style="margin-bottom:16px;padding:12px;background:var(--bg-card);border-radius:12px;border:1px solid var(--border-color);text-align:center">
              <div style="display:flex;align-items:center;justify-content:center;gap:12px">
                <span style="font-size:1.3rem;font-weight:700;color:var(--gold-dark);font-family:var(--font-heading)" id="recipe-timer-display">00:00</span>
                <button class="btn btn-sm ${this.currentTimer ? 'btn-danger' : 'btn-primary'}" id="recipe-timer-btn" onclick="RecipeEngine.toggleTimer(${recipe.cookTime || 20})">
                  ${this.currentTimer ? '⏹️ 停止' : '▶️ 开始计时'}
                </button>
                <button class="btn btn-sm btn-ghost" onclick="RecipeEngine.resetTimer()">🔄 重置</button>
              </div>
            </div>

            <div class="recipe-detail-section">
              <div class="recipe-detail-section-title"><span style="font-size:1.2rem">👨‍🍳</span> 烹饪步骤</div>
              <div class="recipe-detail-steps" id="recipe-steps">
                ${recipe.steps.map((s, i) => `
                  <div class="recipe-step" id="step-${i}" onclick="RecipeEngine.toggleStep(${i})" style="cursor:pointer;transition:all 0.3s">
                    <span style="display:flex;align-items:flex-start;gap:8px;width:100%">
                      <span class="step-check" id="step-check-${i}" style="flex-shrink:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border:2px solid var(--border-color);border-radius:50%;font-size:0.75rem;font-weight:700;color:var(--text-muted);transition:all 0.3s">${i+1}</span>
                      <span id="step-text-${i}" style="flex:1;padding-top:2px">${s}</span>
                    </span>
                  </div>`).join('')}
              </div>
            </div>

            ${recipe.tips ? `
            <div class="recipe-detail-section">
              <div class="recipe-detail-section-title"><span style="font-size:1.2rem">💡</span> 小技巧</div>
              <div style="padding:10px 14px;background:rgba(201,161,77,0.06);border-radius:8px;font-size:0.85rem;color:var(--text-secondary);border:1px solid var(--border-color)">${recipe.tips}</div>
            </div>` : ''}
          </div>
        </div>

        <div class="modal-footer" style="border-top:1px solid var(--border-light);padding:16px 24px">
          <button class="btn btn-ghost" onclick="RecipeEngine.closeDetail(this.closest('.modal-overlay'))">关闭</button>
          <button class="btn btn-primary" onclick="RecipeEngine.toggleFavorite('${recipe.id}');App.toast(RecipeEngine.isFavorite('${recipe.id}')?'❤️ 已收藏':'已取消收藏','success')">
            ${isFav ? '❤️ 已收藏' : '🤍 收藏'}
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // ESC 关闭
    this._detailEscHandler = e => { if (e.key === 'Escape') this.closeDetail(overlay); };
    document.addEventListener('keydown', this._detailEscHandler);
  },

  closeDetail(overlay) {
    if (this._detailEscHandler) { document.removeEventListener('keydown', this._detailEscHandler); this._detailEscHandler = null; }
    this.stopTimer();
    if (!overlay) overlay = document.querySelector('.modal-overlay');
    if (overlay) {
      overlay.style.opacity = '0'; overlay.style.transition = 'opacity 0.2s';
      setTimeout(() => overlay.remove(), 200);
    }
  },

  // ===== 步骤勾选 =====
  toggleStep(idx) {
    const check = document.getElementById(`step-check-${idx}`);
    const text = document.getElementById(`step-text-${idx}`);
    if (!check || !text) return;
    const done = check.style.background !== 'var(--gold-gradient)';
    if (done) {
      check.style.background = 'var(--gold-gradient)';
      check.style.borderColor = 'var(--gold-primary)';
      check.style.color = 'var(--text-on-gold)';
      check.textContent = '✓';
      text.style.opacity = '0.6';
      text.style.textDecoration = 'line-through';
    } else {
      check.style.background = '';
      check.style.borderColor = '';
      check.style.color = '';
      check.textContent = idx + 1;
      text.style.opacity = '1';
      text.style.textDecoration = 'none';
    }
  },

  // ===== 计时器 =====
  toggleTimer(minutes) {
    if (this.currentTimer) { this.stopTimer(); return; }
    this.timerSeconds = minutes * 60;
    this.startTimer();
    document.getElementById('recipe-timer-btn') && (document.getElementById('recipe-timer-btn').textContent = '⏹️ 停止');
    App.toast(`⏰ 计时开始，共 ${minutes} 分钟`, 'info');
  },

  startTimer() {
    this.updateTimerDisplay();
    this.currentTimer = setInterval(() => {
      this.timerSeconds--;
      if (this.timerSeconds <= 0) {
        this.stopTimer();
        App.toast('⏰ 时间到！', 'success');
        const display = document.getElementById('recipe-timer-display');
        if (display) display.textContent = '⏰ 完成！';
        return;
      }
      this.updateTimerDisplay();
    }, 1000);
  },

  stopTimer() {
    if (this.currentTimer) { clearInterval(this.currentTimer); this.currentTimer = null; }
    const btn = document.getElementById('recipe-timer-btn');
    if (btn) btn.textContent = '▶️ 继续';
  },

  resetTimer() {
    this.stopTimer();
    this.timerSeconds = 0;
    const display = document.getElementById('recipe-timer-display');
    if (display) display.textContent = '00:00';
    const btn = document.getElementById('recipe-timer-btn');
    if (btn) btn.textContent = '▶️ 开始计时';
  },

  updateTimerDisplay() {
    const display = document.getElementById('recipe-timer-display');
    if (!display) return;
    const m = Math.floor(this.timerSeconds / 60);
    const s = this.timerSeconds % 60;
    display.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (this.timerSeconds < 60) display.style.color = 'var(--color-danger)';
    else display.style.color = 'var(--gold-dark)';
  }
};

window.RecipeEngine = RecipeEngine;