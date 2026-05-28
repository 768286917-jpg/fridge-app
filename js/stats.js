/**
 * 家庭冰箱库存 App - 数据统计模块
 * 使用 Chart.js 绘制图表，展示库存分析
 */

const Stats = {
  charts: {},

  // 渲染统计页面
  render() {
    const container = document.getElementById('page-stats');
    if (!container) return;

    const items = Storage.getInventory();
    const expiring = items.filter(i => Storage.getExpiryStatus(i.expiry) === 'expiring' || Storage.getExpiryStatus(i.expiry) === 'expired');

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">数据统计</h1>
        <p class="page-subtitle">冰箱库存数据分析与可视化</p>
      </div>

      <div class="stats-grid">
        <div class="glass-card stat-card">
          <div class="stat-card-icon">🧊</div>
          <div class="stat-card-value">${items.length}</div>
          <div class="stat-card-label">库存食材总数</div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-card-icon">📂</div>
          <div class="stat-card-value">${new Set(items.map(i => i.category)).size}</div>
          <div class="stat-card-label">食材分类数</div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-card-icon">⏰</div>
          <div class="stat-card-value" style="color:var(--color-warning)">${expiring.length}</div>
          <div class="stat-card-label">临期/过期食材</div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-card-icon">📊</div>
          <div class="stat-card-value">${items.reduce((s,i) => s + (i.quantity || 1), 0)}</div>
          <div class="stat-card-label">食材总数量</div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="glass-card">
          <div class="glass-card-header">
            <span class="glass-card-title">分类占比</span>
          </div>
          <div class="chart-container"><canvas id="chart-category"></canvas></div>
        </div>
        <div class="glass-card">
          <div class="glass-card-header">
            <span class="glass-card-title">保质期状态</span>
          </div>
          <div class="chart-container"><canvas id="chart-expiry"></canvas></div>
        </div>
      </div>

      <div style="margin-top:24px" class="glass-card">
        <div class="glass-card-header">
          <span class="glass-card-title">各分类食材数量</span>
        </div>
        <div class="chart-container" style="height:250px"><canvas id="chart-bar"></canvas></div>
      </div>
    `;

    // 绘制图表
    setTimeout(() => this.drawCharts(), 100);
  },

  // 绘制所有图表
  drawCharts() {
    if (typeof Chart === 'undefined') {
      // 加载 Chart.js
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.onload = () => this.drawChartsInternal();
      document.head.appendChild(script);
      return;
    }
    this.drawChartsInternal();
  },

  drawChartsInternal() {
    // 清除旧图表
    Object.values(this.charts).forEach(c => c?.destroy());
    this.charts = {};

    const items = Storage.getInventory();
    if (items.length === 0) return;

    // 颜色配置
    const colors = {
      vegetables: '#5a9e6f', meat: '#c45a3a', seafood: '#4a8ba5', fruit: '#e8a040',
      drink: '#7a6ba5', seasoning: '#b8860b', frozen: '#5a8ab5', snack: '#d47a5a', other: '#8a8a8a'
    };

    // 1. 分类饼图
    const catMap = {};
    items.forEach(i => { catMap[i.category] = (catMap[i.category] || 0) + 1; });
    const catLabels = Object.keys(catMap);
    const catData = Object.values(catMap);
    const catColors = catLabels.map(l => colors[l] || colors.other);

    const ctx1 = document.getElementById('chart-category');
    if (ctx1) {
      this.charts.category = new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{ data: catData, backgroundColor: catColors, borderColor: 'var(--bg-card)', borderWidth: 2 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { padding: 12, font: { size: 12 } } }
          }
        }
      });
    }

    // 2. 保质期状态饼图
    const statuses = { normal: 0, expiring: 0, expired: 0 };
    items.forEach(i => {
      const s = Storage.getExpiryStatus(i.expiry);
      if (s === 'expired') statuses.expired++;
      else if (s === 'expiring') statuses.expiring++;
      else statuses.normal++;
    });

    const ctx2 = document.getElementById('chart-expiry');
    if (ctx2) {
      this.charts.expiry = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: ['正常', '快过期', '已过期'],
          datasets: [{
            data: [statuses.normal, statuses.expiring, statuses.expired],
            backgroundColor: ['#4a9e5c', '#d4a030', '#c41e3a'],
            borderColor: 'var(--bg-card)', borderWidth: 2
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { padding: 12, font: { size: 12 } } }
          }
        }
      });
    }

    // 3. 柱状图
    const ctx3 = document.getElementById('chart-bar');
    if (ctx3) {
      this.charts.bar = new Chart(ctx3, {
        type: 'bar',
        data: {
          labels: catLabels,
          datasets: [{
            label: '食材数量',
            data: catData,
            backgroundColor: catColors,
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { stepSize: 1 } },
            y: { grid: { display: false } }
          }
        }
      });
    }
  }
};

window.Stats = Stats;