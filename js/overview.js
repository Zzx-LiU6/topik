// ========== 词汇总览页面（异步） ==========

const PAGE_SIZE = 48;  // 每页显示 50 个单词

async function renderOverviewView() {
    // 汇总所有单词
    let allWords = [];
    for (const setKey of sortedSetKeys) {
      allWords = allWords.concat(allVocabularySets[setKey] || []);
    }
  
    // 先按等级过滤出当前范围内的单词
    let levelFilteredWords = allWords;
    if (state.levelFilter === 'primary') {
      levelFilteredWords = allWords.filter(w => w.level === '初级');
    } else if (state.levelFilter === 'intermediate') {
      levelFilteredWords = allWords.filter(w => w.level === '中级');
    }
  
    const statusCount = { new: 0, learning: 0, permanent: 0, review: 0, mastered: 0 };
    levelFilteredWords.forEach(w => {
      const s = getWordStatus(w.id);
      if (s === 'permanent') {
        statusCount.permanent++;
      } else if (s === 'review') {
        statusCount.review++;
        statusCount.learning++;
      } else if (s === 'mastered') {
        statusCount.mastered++;
        statusCount.learning++;
      } else if (s === 'new') {
        statusCount.new++;
      } else {
        statusCount.learning++;
      }
    });
  
    const total = allWords.length;
  
    let filteredWords = allWords;
  
    // 先按等级过滤
    if (state.levelFilter === 'primary') {
      filteredWords = filteredWords.filter(w => w.level === '初级');
    } else if (state.levelFilter === 'intermediate') {
      filteredWords = filteredWords.filter(w => w.level === '中级');
    }
  
    // 再按状态过滤（基于已等级筛选的结果）
    if (state.selectedFilter === 'new') {
      filteredWords = levelFilteredWords.filter(w => getWordStatus(w.id) === 'new');
    } else if (state.selectedFilter === 'review') {
      filteredWords = levelFilteredWords.filter(w => getWordStatus(w.id) === 'review');
    } else if (state.selectedFilter === 'mastered') {
      filteredWords = levelFilteredWords.filter(w => getWordStatus(w.id) === 'mastered');
    } else if (state.selectedFilter === 'permanent') {
      filteredWords = levelFilteredWords.filter(w => getWordStatus(w.id) === 'permanent');
    } else if (state.selectedFilter === 'bookmarked') {
      filteredWords = levelFilteredWords.filter(w => bookmarkedWords.some(item => item.word === w.korean));
    } else {
      filteredWords = levelFilteredWords;  // 'all' 状态
    }
  
    // 应用搜索过滤
    const rawKeyword = state.searchKeyword.trim();
    const lowerKeyword = rawKeyword.toLowerCase();
    if (rawKeyword) {
      filteredWords = filteredWords.filter(w =>
        w.korean.includes(rawKeyword) ||
        w.roman.toLowerCase().includes(lowerKeyword) ||
        w.meaning.toLowerCase().includes(lowerKeyword)
      );
    }
  
    // ===== 分页逻辑 =====
    const totalPages = Math.ceil(filteredWords.length / PAGE_SIZE);
    // 确保当前页码有效
    if (state.overviewPage < 1) state.overviewPage = 1;
    if (state.overviewPage > totalPages && totalPages > 0) state.overviewPage = totalPages;
    const startIndex = (state.overviewPage - 1) * PAGE_SIZE;
    const pageWords = filteredWords.slice(startIndex, startIndex + PAGE_SIZE);
    // ===== 分页结束 =====
  
    elements.app.innerHTML = `
      <div>
        <!-- 顶部导航 -->
        <header class="mb-6">
          <button onclick="goHome()" class="flex items-center text-coffee-400 hover:text-coffee-500 transition-colors">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            返回首页
          </button>
        </header>
  
        <h1 class="text-xl font-medium text-coffee-600 mb-4">📊 词汇状态总览 (${getTotalSetCount()}套词库)</h1>
  
        <!-- 搜索框 -->
        <div class="mb-4">
          <div class="relative">
            <input type="text"
                   id="search-input"
                   autocomplete="off"
                   placeholder="搜索单词（韩文/罗马音/中文）..."
                   value="${state.searchKeyword}"
                   onblur="debounceSearch(this.value)"
                   onkeydown="if(event.key==='Enter')debounceSearch(this.value)"
                   class="w-full px-4 py-2.5 pr-10 bg-white rounded-xl border border-cream-300 text-coffee-600 placeholder-coffee-300 focus:outline-none focus:border-coffee-400 transition-colors text-sm">
            <svg class="w-5 h-5 text-coffee-300 absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          ${rawKeyword ? `<p class="text-xs text-coffee-400 mt-1">搜索结果：${filteredWords.length} 个单词</p>` : ''}
        </div>
  
        <!-- 等级筛选漏斗 -->
        <div class="flex items-center gap-2 mb-4">
          <span class="text-sm text-coffee-400 mr-1">🔽</span>
          <button onclick="setLevelFilter('all')"
                  class="px-3 py-1.5 rounded-full text-sm transition-all ${state.levelFilter === 'all' ? 'bg-coffee-400 text-white' : 'bg-cream-200 text-coffee-500 hover:bg-cream-300'}">
            全部词库
          </button>
          <button onclick="setLevelFilter('primary')"
                  class="px-3 py-1.5 rounded-full text-sm transition-all ${state.levelFilter === 'primary' ? 'bg-blue-400 text-white' : 'bg-cream-200 text-coffee-500 hover:bg-cream-300'}">
            📗 初级
          </button>
          <button onclick="setLevelFilter('intermediate')"
                  class="px-3 py-1.5 rounded-full text-sm transition-all ${state.levelFilter === 'intermediate' ? 'bg-purple-400 text-white' : 'bg-cream-200 text-coffee-500 hover:bg-cream-300'}">
            📘 中级
          </button>
        </div>
  
        <!-- 饼图 + 统计 -->
        <div class="bg-white rounded-3xl p-6 shadow-md border border-cream-300 mb-6">
          <div class="flex items-center justify-center mb-4">
          <svg viewBox="0 0 36 36" class="w-32 h-32">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E8DDD4" stroke-width="3"></circle>
            ${(()=>{
              const total = levelFilteredWords.length;
              const pNew = total > 0 ? (statusCount.new / total) * 100 : 0;
              const pLearning = total > 0 ? ((statusCount.mastered + statusCount.review) / total) * 100 : 0;
              const pPermanent = total > 0 ? (statusCount.permanent / total) * 100 : 0;
              const dispLearning = Math.max(0.3, pLearning);
              const dispPermanent = Math.max(0.3, pPermanent);
              return `
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#D4C4B5" stroke-width="3"
                  stroke-dasharray="${pNew} 100"
                  stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 18 18)"></circle>
              ${pLearning > 0 ? `
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#8B7355" stroke-width="3"
                  stroke-dasharray="${dispLearning} 100"
                  stroke-dashoffset="-${pNew}"
                  stroke-linecap="round" transform="rotate(-90 18 18)"></circle>
              ` : ''}
              ${pPermanent > 0 ? `
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#22C55E" stroke-width="3"
                  stroke-dasharray="${dispPermanent} 100"
                  stroke-dashoffset="-${pNew + pLearning}"
                  stroke-linecap="round" transform="rotate(-90 18 18)"></circle>
              ` : ''}
              `;
            })()}
            <text x="18" y="20.5" text-anchor="middle" font-size="7">📊</text>
           </svg>
          </div>
          <div class="flex flex-wrap justify-center gap-3 text-sm">
            <div class="flex items-center">
              <span class="w-3 h-3 rounded-full bg-cream-400 mr-1"></span>
              <span class="text-coffee-500">未学习 ${statusCount.new}</span>
            </div>
            <div class="flex items-center">
              <span class="w-3 h-3 rounded-full bg-coffee-500 mr-1"></span>
              <span class="text-coffee-500">学习中 ${statusCount.learning}</span>
            </div>
            <div class="flex items-center">
              <span class="w-3 h-3 rounded-full bg-green-500 mr-1"></span>
              <span class="text-coffee-500">已掌握 ${statusCount.permanent}</span>
            </div>
          </div>
          <div class="text-xs text-coffee-400 text-center mt-2">
            待复习 ${statusCount.review} 词 · 今日已学 ${statusCount.mastered} 词
          </div>
        </div>
  
        <!-- 筛选标签 -->
        <div class="flex flex-wrap gap-2 mb-4">
          <button onclick="setFilter('all')" class="px-3 py-1.5 rounded-full text-sm transition-all ${state.selectedFilter === 'all' ? 'bg-coffee-400 text-white' : 'bg-cream-200 text-coffee-500 hover:bg-cream-300'}">
            全部 (${levelFilteredWords.length})
          </button>
          <button onclick="setFilter('new')" class="px-3 py-1.5 rounded-full text-sm transition-all ${state.selectedFilter === 'new' ? 'bg-coffee-400 text-white' : 'bg-cream-200 text-coffee-500 hover:bg-cream-300'}">
            未学习 (${statusCount.new})
          </button>
          <button onclick="setFilter('review')" class="px-3 py-1.5 rounded-full text-sm transition-all ${state.selectedFilter === 'review' ? 'bg-amber-500 text-white' : 'bg-cream-200 text-coffee-500 hover:bg-cream-300'}">
            待复习 (${statusCount.review})
          </button>
          <button onclick="setFilter('mastered')" class="px-3 py-1.5 rounded-full text-sm transition-all ${state.selectedFilter === 'mastered' ? 'bg-coffee-400 text-white' : 'bg-cream-200 text-coffee-500 hover:bg-cream-300'}">
            今日已学 (${statusCount.mastered})
          </button>
          <button onclick="setFilter('permanent')" class="px-3 py-1.5 rounded-full text-sm transition-all ${state.selectedFilter === 'permanent' ? 'bg-green-500 text-white' : 'bg-cream-200 text-coffee-500 hover:bg-cream-300'}">
            已掌握 (${statusCount.permanent})
          </button>
          <button onclick="setFilter('bookmarked')" class="px-3 py-1.5 rounded-full text-sm transition-all ${state.selectedFilter === 'bookmarked' ? 'bg-yellow-500 text-white' : 'bg-cream-200 text-coffee-500 hover:bg-cream-300'}">
            已收藏 (${bookmarkedWords.length})
          </button>
        </div>
  
        <!-- 词汇列表 -->
        ${pageWords.length === 0 ? `
          <div class="text-center py-12 bg-white rounded-3xl border border-cream-300 shadow-sm">
            <div class="flex justify-center mb-4">
              <svg class="w-12 h-12 text-cream-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <h4 class="text-coffee-500 font-medium mb-2">暂无匹配单词</h4>
            <p class="text-sm text-coffee-400">请更换关键词</p>
          </div>
        ` : `
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          ${pageWords.map(w => {
            const status = getWordStatus(w.id);
            const statusClass = status === 'permanent' ? 'bg-green-50 border-green-200' :
                                status === 'mastered' ? 'bg-coffee-50 border-coffee-200' :
                                status === 'review' ? 'bg-amber-50 border-amber-200' : 'bg-cream-50 border-cream-300';
            const statusText = status === 'permanent' ? '永久掌握' :
                               status === 'mastered' ? '今日已学' :
                               status === 'review' ? '待复习' : '未学习';
            const statusBadgeClass = status === 'permanent' ? 'bg-green-100 text-green-600' :
                                     status === 'mastered' ? 'bg-coffee-100 text-coffee-600' :
                                     status === 'review' ? 'bg-amber-100 text-amber-600' : 'bg-cream-200 text-coffee-400';
            return `
              <div class="p-3 rounded-xl ${statusClass} border cursor-pointer hover:shadow-md transition-all"
                   onclick="startLearnWord('${w.id}')">
                <div class="flex justify-between items-start mb-1">
                  <span class="font-medium text-coffee-600 text-sm">${w.korean}</span>
                  ${bookmarkedWords.some(item => item.word === w.korean) ? '<span class="text-yellow-500 text-xs">⭐</span>' : ''}
                </div>
                <p class="text-xs text-coffee-400 mb-2">${w.meaning}</p>
                <span class="text-xs px-2 py-0.5 rounded-full ${statusBadgeClass}">${statusText}</span>
              </div>
            `;
          }).join('')}
        </div>
        `}
  
        <!-- ===== 分页导航 ===== -->
        ${filteredWords.length > PAGE_SIZE ? `
        <div class="flex items-center justify-between mt-4 pt-3 border-t border-cream-200">
          <button onclick="changeOverviewPage(-1)" 
                  class="px-3 py-1.5 rounded-lg text-sm ${state.overviewPage <= 1 ? 'text-coffee-300 cursor-not-allowed' : 'text-coffee-500 hover:bg-cream-200'}">
            ← 上一页
          </button>
          <span class="text-sm text-coffee-400">${state.overviewPage} / ${totalPages}（共 ${filteredWords.length} 个单词）</span>
          <button onclick="changeOverviewPage(1)" 
                  class="px-3 py-1.5 rounded-lg text-sm ${state.overviewPage >= totalPages ? 'text-coffee-300 cursor-not-allowed' : 'text-coffee-500 hover:bg-cream-200'}">
            下一页 →
          </button>
        </div>
        ` : ''}
        <!-- ===== 分页导航结束 ===== -->
  
      </div>
    `;
}

// ===== 翻页函数 =====
function changeOverviewPage(delta) {
    const newPage = state.overviewPage + delta;
    if (newPage < 1) return;
    
    // 重新计算总页数（需要重新获取筛选结果）
    let allWords = [];
    for (const setKey of sortedSetKeys) {
        allWords = allWords.concat(allVocabularySets[setKey] || []);
    }
    
    let levelFilteredWords = allWords;
    if (state.levelFilter === 'primary') {
        levelFilteredWords = allWords.filter(w => w.level === '初级');
    } else if (state.levelFilter === 'intermediate') {
        levelFilteredWords = allWords.filter(w => w.level === '中级');
    }
    
    let filteredWords = allWords;
    if (state.levelFilter === 'primary') {
        filteredWords = filteredWords.filter(w => w.level === '初级');
    } else if (state.levelFilter === 'intermediate') {
        filteredWords = filteredWords.filter(w => w.level === '中级');
    }
    
    if (state.selectedFilter === 'new') {
        filteredWords = levelFilteredWords.filter(w => getWordStatus(w.id) === 'new');
    } else if (state.selectedFilter === 'review') {
        filteredWords = levelFilteredWords.filter(w => getWordStatus(w.id) === 'review');
    } else if (state.selectedFilter === 'mastered') {
        filteredWords = levelFilteredWords.filter(w => getWordStatus(w.id) === 'mastered');
    } else if (state.selectedFilter === 'permanent') {
        filteredWords = levelFilteredWords.filter(w => getWordStatus(w.id) === 'permanent');
    } else if (state.selectedFilter === 'bookmarked') {
        filteredWords = levelFilteredWords.filter(w => bookmarkedWords.some(item => item.word === w.korean));
    } else {
        filteredWords = levelFilteredWords;
    }
    
    const rawKeyword = state.searchKeyword.trim();
    const lowerKeyword = rawKeyword.toLowerCase();
    if (rawKeyword) {
        filteredWords = filteredWords.filter(w =>
            w.korean.includes(rawKeyword) ||
            w.roman.toLowerCase().includes(lowerKeyword) ||
            w.meaning.toLowerCase().includes(lowerKeyword)
        );
    }
    
    const totalPages = Math.ceil(filteredWords.length / PAGE_SIZE);
    if (newPage > totalPages) return;
    
    state.overviewPage = newPage;
    renderCurrentView();
}
// ===== 翻页函数结束 =====
