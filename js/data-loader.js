// Recipe data expansion loader - 加载所有扩展菜谱
(function() {
  function mergeRecipes(base, ext) {
    if (!ext) return;
    const ids = new Set(base.map(r => r.id));
    ext.forEach(r => { if (!ids.has(r.id)) { base.push(r); ids.add(r.id); } });
  }

  // 按顺序加载各类扩展菜谱
  const expansions = [
    window.RecipeMore_Breakfast,
    window.RecipeMore_Quick,
    window.RecipeMore_Diet,
    window.RecipeMore_Soup,
    window.RecipeMore_Snack,
    window.RecipeMore_Home2
  ];

  expansions.forEach(e => mergeRecipes(RecipeDB, e));

  // 更新本地存储
  const stored = localStorage.getItem('fridge_recipes');
  if (!stored || JSON.parse(stored).length < 200) {
    localStorage.setItem('fridge_recipes', JSON.stringify(RecipeDB));
  }
  console.log('🍳 菜谱加载完成：共 ' + RecipeDB.length + ' 道菜谱');
})();