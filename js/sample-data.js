/**
 * 默认示例数据 - 首次使用时自动植入
 */
(function() {
  if (typeof Storage === 'undefined') return;

  const existing = Storage.getInventory();
  if (existing.length > 0) return; // 已有数据不覆盖

  const sampleItems = [
    { name: '番茄', category: '蔬菜', quantity: 3, unit: '个', expiry: '2026-06-10', notes: '做番茄炒蛋用' },
    { name: '鸡蛋', category: '其他', quantity: 12, unit: '个', expiry: '2026-06-20', notes: '' },
    { name: '鸡胸肉', category: '肉类', quantity: 2, unit: '块', expiry: '2026-06-05', notes: '减脂餐用' },
    { name: '豆腐', category: '蔬菜', quantity: 1, unit: '盒', expiry: '2026-05-30', notes: '麻婆豆腐' },
    { name: '青椒', category: '蔬菜', quantity: 4, unit: '个', expiry: '2026-06-08', notes: '' },
    { name: '牛肉', category: '肉类', quantity: 1, unit: '斤', expiry: '2026-06-03', notes: '周末做水煮牛肉' },
    { name: '西兰花', category: '蔬菜', quantity: 2, unit: '颗', expiry: '2026-06-07', notes: '' },
    { name: '虾仁', category: '海鲜', quantity: 1, unit: '包', expiry: '2026-06-12', notes: '冷冻保存' },
    { name: '土豆', category: '蔬菜', quantity: 5, unit: '个', expiry: '2026-06-15', notes: '' },
    { name: '牛奶', category: '饮料', quantity: 1, unit: '盒', expiry: '2026-06-02', notes: '快喝完了' },
    { name: '五花肉', category: '肉类', quantity: 1, unit: '斤', expiry: '2026-06-06', notes: '做回锅肉' },
    { name: '黄瓜', category: '蔬菜', quantity: 3, unit: '根', expiry: '2026-06-09', notes: '' },
    { name: '苹果', category: '水果', quantity: 6, unit: '个', expiry: '2026-06-14', notes: '' },
    { name: '生姜', category: '调料', quantity: 1, unit: '块', expiry: '2026-06-20', notes: '' },
    { name: '大蒜', category: '调料', quantity: 1, unit: '头', expiry: '2026-06-25', notes: '' }
  ];

  sampleItems.forEach(item => {
    // 部分设置快过期或已过期以展示提醒功能
    if (item.name === '豆腐') item.expiry = '2026-05-29'; // 已过期
    if (item.name === '牛奶') item.expiry = '2026-05-30'; // 已过期
    Storage.addItem(item);
  });

  console.log('✅ 默认示例数据已添加 (' + sampleItems.length + ' 条)');
})();