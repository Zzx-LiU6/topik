// ========== 生词收藏本页面（异步） ==========

// 当前查看的分类（用于分类内单词列表）
let currentBookmarkCategory = null;

// ---- 获取所有收藏的单词对象 ----
async function getBookmarkedWords() {
  const words = [];
  // bookmarkedWords 现在是对象数组 [{word: '사과', category: '水果'}, ...]
  for (const item of bookmarkedWords) {
    const kw = item.word;
    // 在所有套装中寻找匹配的单词
    for (const setKey of sortedSetKeys) {
      const word = allVocabularySets[setKey]?.find(w => w.korean === kw);
      if (word) {
        words.push(word);
        break;
      }
    }
  }
  return words;
}

// ---- 渲染收藏本主视图 ----
async function renderBookmarksView() {
  // 如果收藏为空，显示空状态
  if (bookmarkedWords.length === 0) {
    elements.app.innerHTML = `
      <div>
        <header class="mb-6">
          <button onclick="goHome()" class="flex items-center text-coffee-400 hover:text-coffee-500 transition-colors">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            返回首页
          </button>
        </header>
        <div class="text-center py-12">
          <div class="text-5xl mb-4">📭</div>
          <h2 class="text-lg font-medium text-coffee-600 mb-2">收藏本为空</h2>
          <p class="text-sm text-coffee-400 mb-6">在背诵页面点击「加入生词本」可收藏难点词汇</p>
          <button onclick="goHome()" class="px-6 py-2 bg-coffee-400 hover:bg-coffee-500 text-white rounded-xl transition-colors">
            返回首页
          </button>
        </div>
      </div>
    `;
    return;
  }
  
  // 如果有选中的分类，显示该分类的单词列表
  if (currentBookmarkCategory) {
    await renderCategoryWords(currentBookmarkCategory);
    return;
  }
  
  // 否则显示分类列表
  await renderCategoryList();
}

// ---- 分类列表视图 ----
async function renderCategoryList() {
  // 提取所有分类
  var categories = [];
  bookmarkedWords.forEach(function(item) {
    var cat = item.category || '未分类';
    if (categories.indexOf(cat) === -1) categories.push(cat);
  });
  categories.sort();
  // 把"未分类"放到最后
  var idx = categories.indexOf('未分类');
  if (idx > -1) {
    categories.splice(idx, 1);
    categories.push('未分类');
  }
  
  var totalWords = bookmarkedWords.length;
  
  elements.app.innerHTML = `
    <div>
      <header class="mb-6">
        <button onclick="goHome()" class="flex items-center text-coffee-400 hover:text-coffee-500 transition-colors">
          <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          返回首页
        </button>
      </header>
      
      <h1 class="text-xl font-medium text-coffee-600 mb-2">⭐ 收藏本</h1>
      <p class="text-sm text-coffee-400 mb-4">共 ${totalWords} 个单词 · ${categories.length} 个分类</p>
      
      <div class="grid grid-cols-2 gap-3">
        ${categories.map(function(cat) {
          var count = bookmarkedWords.filter(function(item) {
            return (item.category || '未分类') === cat;
          }).length;
          var emoji = getCategoryEmoji(cat);
          return `
            <div class="p-4 bg-white rounded-2xl shadow-md border border-cream-300 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
                 onclick="selectBookmarkCategory('${cat}')">
              <div class="text-3xl mb-1">${emoji}</div>
              <div class="font-medium text-coffee-600 text-sm truncate">${cat}</div>
              <div class="text-xs text-coffee-400">${count} 个单词</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ---- 选择分类 ----
function selectBookmarkCategory(category) {
  currentBookmarkCategory = category;
  renderCurrentView();
}

// ---- 返回分类列表 ----
function backToCategoryList() {
  currentBookmarkCategory = null;
  renderCurrentView();
}

// ---- 渲染分类内的单词列表（卡片翻页模式） ----
async function renderCategoryWords(category) {
  // 从 bookmarkedWords 中筛选该分类的单词
  var words = [];
  bookmarkedWords.forEach(function(item) {
    if ((item.category || '未分类') === category) {
      for (var key of sortedSetKeys) {
        var found = allVocabularySets[key]?.find(function(w) {
          return w.korean === item.word;
        });
        if (found) {
          words.push(found);
          break;
        }
      }
    }
  });
  
  if (words.length === 0) {
    currentBookmarkCategory = null;
    renderCurrentView();
    return;
  }
  
  state.currentView = 'bookmarks';
  state.currentQueue = words;
  state.currentIndex = 0;
  
  await renderLearnView();
  
  // ===== 替换顶部导航栏：返回按钮 + 分类名（带下拉切换） + 单词数量 =====
  var header = document.querySelector('.mb-6');
  if (header) {
    // 获取所有分类（用于下拉菜单）
    var allCategories = [];
    bookmarkedWords.forEach(function(item) {
      var cat = item.category || '未分类';
      if (allCategories.indexOf(cat) === -1) allCategories.push(cat);
    });
    allCategories.sort();
    var idx = allCategories.indexOf('未分类');
    if (idx > -1) {
      allCategories.splice(idx, 1);
      allCategories.push('未分类');
    }
    
    header.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button onclick="backToCategoryList()" class="flex items-center text-coffee-400 hover:text-coffee-500 transition-colors">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            返回
          </button>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-lg font-medium text-coffee-600">${getCategoryEmoji(category)} ${category}</span>
          <span class="text-sm text-coffee-400">(${words.length}个)</span>
          <button onclick="toggleCategoryDropdown('${category}')" 
                  class="p-1 rounded hover:bg-cream-200 transition-colors text-coffee-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        </div>
      </div>
      <div id="category-dropdown-container" class="relative mt-2 hidden">
        <div class="absolute right-0 z-20 w-48 bg-white rounded-xl shadow-lg border border-cream-300 py-1 max-h-48 overflow-y-auto">
          ${allCategories.map(function(cat) {
            var count = bookmarkedWords.filter(function(item) {
              return (item.category || '未分类') === cat;
            }).length;
            var isActive = cat === category;
            return `
              <button onclick="switchToCategory('${cat}')" 
                      class="w-full text-left px-4 py-2 text-sm hover:bg-cream-50 transition-colors flex items-center justify-between ${isActive ? 'bg-cream-100 text-coffee-600 font-medium' : 'text-coffee-500'}">
                <span>${getCategoryEmoji(cat)} ${cat}</span>
                <span class="text-xs text-coffee-400">${count}个</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}

// ---- 切换分类下拉菜单显示/隐藏 ----
function toggleCategoryDropdown(currentCategory) {
  var container = document.getElementById('category-dropdown-container');
  if (!container) return;
  container.classList.toggle('hidden');
  // 点击其他地方关闭下拉（只绑定一次）
  if (!container.dataset.listener) {
    container.dataset.listener = 'true';
    document.addEventListener('click', function(e) {
      var dropdown = document.getElementById('category-dropdown-container');
      if (!dropdown) return;
      var target = e.target.closest('#category-dropdown-container');
      var btn = e.target.closest('[onclick*="toggleCategoryDropdown"]');
      if (!target && !btn) {
        dropdown.classList.add('hidden');
      }
    });
  }
}

// ---- 切换到其他分类 ----
function switchToCategory(category) {
    var container = document.getElementById('category-dropdown-container');
    if (container) container.classList.add('hidden');
    currentBookmarkCategory = category;
    state.currentView = 'bookmarks';
    // 重新渲染，会触发 renderCategoryWords 重新设置队列
    renderCurrentView();
}

// ---- 分类图标映射 ----
function getCategoryEmoji(category) {
  var map = {
    '未分类': '📂',
    '水果': '🍎',
    '动物': '🐱',
    '食物': '🍜',
    '教育': '📚',
    '旅游': '✈️',
    '购物': '🛍️',
    '家庭': '🏠',
    '工作': '💼',
    '健康': '💪',
    '天气': '🌤️',
    '颜色': '🎨',
    '交通': '🚗',
    '服装': '👔',
    '建筑': '🏛️',
    '艺术': '🎨',
    '音乐': '🎵',
    '运动': '⚽',
    '科技': '💻',
    '自然': '🌿'
  };
  return map[category] || '📁';
}

// ---- 显示分类选择器弹窗 ----
function showCategoryPicker(wordId) {
  // 获取单词
  let word = null;
  for (const setKey of sortedSetKeys) {
    const found = allVocabularySets[setKey]?.find(w => w.id === wordId);
    if (found) { word = found; break; }
  }
  if (!word) return;
  
  // 当前收藏状态
  const existing = bookmarkedWords.find(function(item) {
    return item.word === word.korean;
  });
  const currentCategory = existing ? existing.category : null;
  
  // 获取所有分类
  var categories = [];
  bookmarkedWords.forEach(function(item) {
    var cat = item.category || '未分类';
    if (categories.indexOf(cat) === -1) categories.push(cat);
  });
  categories.sort();
  var idx = categories.indexOf('未分类');
  if (idx > -1) {
    categories.splice(idx, 1);
    categories.push('未分类');
  }
  
  // 创建弹窗
  var overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-coffee-600/30 backdrop-blur-sm';
  overlay.innerHTML = `
    <div class="bg-cream-100 rounded-3xl shadow-2xl p-6 w-[90%] max-w-sm border border-cream-300 fade-in">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium text-coffee-600">⭐ 添加到收藏</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-coffee-400 hover:text-coffee-600 text-xl">✕</button>
      </div>
      
      <p class="text-sm text-coffee-500 mb-3">
        ${word.korean} <span class="text-coffee-400">${word.meaning}</span>
      </p>
      
      <div class="space-y-2 max-h-48 overflow-y-auto">
        ${categories.map(function(cat) {
          var count = bookmarkedWords.filter(function(item) {
            return (item.category || '未分类') === cat;
          }).length;
          var isActive = (currentCategory === cat);
          return `
            <button class="category-option w-full px-4 py-2.5 rounded-xl text-left transition-all text-sm
              ${isActive ? 'bg-coffee-400 text-white' : 'bg-white hover:bg-cream-50 border border-cream-300 text-coffee-600'}"
              data-category="${cat}">
              📂 ${cat} (${count}个)
              ${isActive ? ' ✅' : ''}
            </button>
          `;
        }).join('')}
        
        <button class="w-full px-4 py-2.5 rounded-xl text-left text-sm border-2 border-dashed border-cream-300 text-coffee-400 hover:border-coffee-400 hover:text-coffee-600 transition-all"
                onclick="createNewCategoryFromPicker('${wordId}')">
          ＋ 新建分类
        </button>
      </div>
      
      <div class="flex gap-2 mt-4">
        ${currentCategory ? `
          <button onclick="removeBookmark('${wordId}')" class="flex-1 px-4 py-2 bg-red-50 text-red-500 rounded-xl text-sm transition-all hover:bg-red-100">
            移除收藏
          </button>
        ` : ''}
        <button onclick="this.closest('.fixed').remove()" class="flex-1 px-4 py-2 bg-cream-200 text-coffee-500 rounded-xl text-sm transition-all hover:bg-cream-300">
          取消
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  // 分类点击事件
  overlay.querySelectorAll('.category-option').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var category = this.dataset.category;
      toggleBookmarkWithCategory(wordId, category);
      overlay.remove();
    });
  });
}

// ---- 新建分类（自定义弹窗） ----
function createNewCategoryFromPicker(wordId) {
  // 获取当前分类选择器弹窗
  var parentOverlay = document.querySelector('.fixed');
  
  // 创建自定义输入弹窗
  var inputOverlay = document.createElement('div');
  inputOverlay.className = 'fixed inset-0 z-[55] flex items-center justify-center bg-coffee-600/30 backdrop-blur-sm';
  inputOverlay.innerHTML = `
    <div class="bg-cream-100 rounded-3xl shadow-2xl p-6 w-[90%] max-w-sm border border-cream-300 fade-in">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium text-coffee-600">📁 新建分类</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-coffee-400 hover:text-coffee-600 text-xl">✕</button>
      </div>
      
      <p class="text-sm text-coffee-400 mb-3">输入新分类的名称：</p>
      
      <input type="text" id="new-category-input" 
             class="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl text-coffee-600 text-base focus:outline-none focus:border-coffee-400 transition-colors"
             placeholder="例如：水果、动物、旅行..."
             autofocus
             onkeydown="if(event.key==='Enter') confirmNewCategory('${wordId}')">
      
      <div class="flex gap-2 mt-4">
        <button onclick="this.closest('.fixed').remove()" 
                class="flex-1 px-4 py-2.5 bg-cream-200 hover:bg-cream-300 text-coffee-500 rounded-xl text-sm font-medium transition-all">
          取消
        </button>
        <button onclick="confirmNewCategory('${wordId}')" 
                class="flex-1 px-4 py-2.5 bg-coffee-400 hover:bg-coffee-500 text-white rounded-xl text-sm font-medium transition-all">
          创建
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(inputOverlay);
  
  // 自动聚焦输入框
  setTimeout(function() {
    var input = document.getElementById('new-category-input');
    if (input) input.focus();
  }, 100);
}

// ---- 确认新建分类 ----
function confirmNewCategory(wordId) {
  var input = document.getElementById('new-category-input');
  if (!input) return;
  var categoryName = input.value.trim();
  if (!categoryName) {
    // 简单提示：输入框抖动或变色
    input.classList.add('border-red-400', 'bg-red-50');
    setTimeout(function() {
      input.classList.remove('border-red-400', 'bg-red-50');
    }, 800);
    return;
  }
  // 关闭输入弹窗
  var inputOverlay = document.querySelector('.fixed');
  if (inputOverlay) inputOverlay.remove();
  // 执行收藏
  toggleBookmarkWithCategory(wordId, categoryName);
  // 关闭分类选择器弹窗
  var parentOverlay = document.querySelector('.fixed');
  if (parentOverlay) parentOverlay.remove();
}

// ---- 带分类的收藏 ----
function toggleBookmarkWithCategory(wordId, category) {
  let word = null;
  for (const setKey of sortedSetKeys) {
    const found = allVocabularySets[setKey]?.find(w => w.id === wordId);
    if (found) { word = found; break; }
  }
  if (!word) return;
  const kw = word.korean;
  
  const existingIndex = bookmarkedWords.findIndex(function(item) {
    return item.word === kw;
  });
  
  if (existingIndex > -1) {
    bookmarkedWords[existingIndex].category = category;
  } else {
    bookmarkedWords.push({ word: kw, category: category });
  }
  
  // 先保存，再渲染（避免多次触发）
  saveToStorage();
  renderCurrentView();
}

// ---- 移除收藏 ----
function removeBookmark(wordId) {
  let word = null;
  for (const setKey of sortedSetKeys) {
    const found = allVocabularySets[setKey]?.find(w => w.id === wordId);
    if (found) { word = found; break; }
  }
  if (!word) return;
  const kw = word.korean;
  const index = bookmarkedWords.findIndex(function(item) {
    return item.word === kw;
  });
  if (index > -1) {
    bookmarkedWords.splice(index, 1);
    saveToStorageDebounced();
    renderCurrentView();
    var overlay = document.querySelector('.fixed');
    if (overlay) overlay.remove();
  }
}

// ---- 收藏本上下翻页 ----
function prevBookmarkWord() {
    console.log('prevBookmarkWord 被点击了！');
    console.log('当前索引:', state.currentIndex);
    console.log('队列长度:', state.currentQueue ? state.currentQueue.length : '队列为空');
    if (state.currentIndex > 0) {
        state.currentIndex--;
        console.log('新索引:', state.currentIndex);
        renderLearnView();
    } else {
        showToast('已经是第一个单词了', 1500);
    }
}

function nextBookmarkWord() {
    console.log('nextBookmarkWord 被点击了！');
    console.log('当前索引:', state.currentIndex);
    console.log('队列长度:', state.currentQueue ? state.currentQueue.length : '队列为空');
    if (state.currentIndex < state.currentQueue.length - 1) {
        state.currentIndex++;
        console.log('新索引:', state.currentIndex);
        renderLearnView();
    } else {
        showToast('已经是最后一个单词了', 1500);
    }
}
