// ========== 首页渲染（异步） ==========
async function renderHomeView() {
    const reviewWords = await getWordsToReviewToday();
    const reviewCount = reviewWords.length;
    const currentSetCompleted = await getCompletedCountForSet(state.currentSetKey);
    const bookmarkCount = bookmarkedWords.length;
    const totalSetCount = getTotalSetCount();
  
    let totalWords = 0;
    let statusCount = { new: 0, learning: 0, permanent: 0, review: 0, mastered: 0 };
  
    for (const setKey of sortedSetKeys) {
      const words = allVocabularySets[setKey] || [];
      totalWords += words.length;
      words.forEach(w => {
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
    }
  
    const totalMastered = statusCount.mastered + statusCount.permanent;
  
    const currentSetTotal = allVocabularySets[state.currentSetKey]?.length || TOTAL_WORDS_PER_SET;
  
    elements.app.innerHTML = `
      <div>
        <!-- 头部 -->
        <header class="text-center mb-8">
          <h1 class="text-2xl md:text-3xl font-medium text-coffee-600 mb-2">🍽️ 단어 먹방</h1>
          <p class="text-sm text-coffee-400">一口气吃掉 TOPIK 5426 词</p>
          <button onclick="toggleDarkMode()" class="mt-2 text-xs px-3 py-1 rounded-full bg-cream-200 hover:bg-cream-300 text-coffee-500 transition">
            ${state.darkMode ? '☀️ 日间模式' : '🌙 夜间模式'}
          </button>
          </header>
        
        <div class="flex justify-center gap-2 mb-4">
          <button onclick="exportProgress()" class="text-xs px-3 py-1 bg-cream-200 hover:bg-cream-300 rounded-full text-coffee-500 transition">
            📤 导出进度
          </button>
          <button onclick="importProgress()" class="text-xs px-3 py-1 bg-cream-200 hover:bg-cream-300 rounded-full text-coffee-500 transition">
            📥 导入进度
          </button>
        </div>
        <div class="flex justify-center gap-2 mb-4">
          <button onclick="resetAllProgress()"
                  class="text-xs px-3 py-1 bg-red-50 hover:bg-red-100 rounded-full text-red-500 transition">
            🗑 重置全部进度
          </button>
        </div>
  
        <!-- 功能模块卡片网格 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4 mb-10">
          <!-- 今日新词 -->
          <div class="home-card bg-white rounded-3xl p-5 shadow-md border border-cream-300 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
               onclick="startLearnNew()">
            <div class="flex items-start justify-between mb-3">
              <div class="text-3xl">📖</div>
              <div class="text-xs px-2 py-1 rounded-full bg-cream-200 text-coffee-500">
                词库第${state.currentSet}套
              </div>
            </div>
            <h2 class="text-lg font-medium text-coffee-600 mb-1">今日新词背诵</h2>
            <p class="text-sm text-coffee-400 mb-3">${(() => {
              const today = getToday();
              const todayNewCount = Object.values(wordProgress).filter(p => p.firstLearnedDate === today && (p.status === 'mastered' || p.status === 'permanent')).length;
              return todayNewCount > 0 ? `今日已学习 ${todayNewCount} 词` : '今天还没有开始学习哦';
            })()}
            <div class="bg-cream-200 rounded-full h-2">
              <div class="bg-coffee-400 h-2 rounded-full transition-all duration-300" style="width: ${(currentSetCompleted / currentSetTotal) * 100}%"></div>
            </div>
          </div>
  
          <!-- 待复习计划 -->
          <div class="home-card bg-white rounded-3xl p-5 shadow-md border border-cream-300 cursor-pointer transition-all duration-300 ${reviewCount === 0 ? 'opacity-60' : ''} hover:-translate-y-1 hover:shadow-lg"
               onclick="${reviewCount > 0 ? 'startReview()' : ''}">
            <div class="flex items-start justify-between mb-3">
              <div class="text-3xl">🔁</div>
              ${reviewCount > 0 ? `<div class="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-600 animate-pulse">${reviewCount}个待复习</div>` : ''}
            </div>
            <h2 class="text-lg font-medium text-coffee-600 mb-1">待复习计划</h2>
            <p class="text-sm text-coffee-400">${reviewCount > 0 ? '基于艾宾浩斯遗忘曲线' : '暂无待复习单词'}</p>
          </div>
  
          <!-- 测验·错题 -->
          <div class="home-card 
            bg-white dark:bg-[#1a3654] 
            rounded-3xl p-5 shadow-md dark:shadow-none 
            border border-cream-300 dark:border-slate-700 
            transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div class="flex items-start justify-between mb-3">
              <div class="text-3xl">🎯</div>
            </div>
            <h2 class="text-lg font-medium text-coffee-600 dark:text-slate-100 mb-3">练习</h2>
            <div class="flex gap-2 mb-2">
              <!-- 选择按钮 -->
              <button onclick="showQuizModePicker()" class="flex-1 px-4 py-2.5 
                bg-coffee-400 dark:bg-[#a8997e] 
                hover:bg-coffee-500 dark:hover:bg-[#b8a88c] 
                text-white text-sm font-medium rounded-2xl transition-all duration-200">
                📝 选择
              </button>
              <!-- 拼写按钮 -->
              <button onclick="showSpellModePicker()" class="flex-1 px-4 py-2.5 
                bg-cream-200 dark:bg-[#27243b] 
                hover:bg-cream-300 dark:hover:bg-[#332f4c] 
                text-coffee-600 dark:text-slate-100 text-sm font-medium rounded-2xl transition-all duration-200 
                border border-cream-300 dark:border-slate-600">
                ✍️ 拼写
              </button>
            </div>
            <!-- 错题集按钮 -->
            <button onclick="goToWrongWords()" class="w-full px-4 py-2.5
            bg-amber-100 dark:bg-[#223a4e]
            hover:bg-amber-200 dark:hover:bg-[#2b475e]
            text-amber-700 dark:text-[#d4b878] text-sm font-medium rounded-2xl transition-all duration-200
            border border-amber-300 dark:border-[#d4b878]
            ${state.wrongWords.length === 0 ? 'opacity-50' : ''}">
            📝 错题集 ${state.wrongWords.length > 0 ? `(${state.wrongWords.length})` : ''}
          </button>
          </div>
  
          <!-- 生词收藏本 -->
          <div class="home-card bg-white rounded-3xl p-5 shadow-md border border-cream-300 cursor-pointer transition-all duration-300 ${bookmarkCount === 0 ? 'opacity-60' : ''} hover:-translate-y-1 hover:shadow-lg"
               onclick="${bookmarkCount > 0 ? 'goToBookmarks()' : ''}">
            <div class="flex items-start justify-between mb-3">
              <div class="text-3xl">⭐</div>
              ${bookmarkCount > 0 ? `<div class="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-600">${bookmarkCount}个</div>` : ''}
            </div>
            <h2 class="text-lg font-medium text-coffee-600 mb-1">生词收藏本</h2>
            <p class="text-sm text-coffee-400">${bookmarkCount > 0 ? '复习收藏的难点词汇' : '暂无收藏单词'}</p>
          </div>
  
          <!-- 学习日历 -->
          <div class="home-card bg-white rounded-3xl p-5 shadow-md border border-cream-300 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
               onclick="startCalendar()">
            <div class="flex items-start justify-between mb-3">
              <div class="text-3xl">📅</div>
            </div>
            <h2 class="text-lg font-medium text-coffee-600 mb-1">学习日历</h2>
            <p class="text-sm text-coffee-400">记录每天的学习足迹</p>
          </div>
  
          <!-- 词汇状态总览 -->
          <div class="home-card bg-white rounded-3xl p-5 shadow-md border border-cream-300 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
               onclick="goToOverview()">
            <div class="flex items-start justify-between mb-3">
              <div class="text-3xl">📊</div>
              <div class="text-xs px-2 py-1 rounded-full bg-cream-200 text-coffee-500">${statusCount.permanent}/${totalWords}</div>
            </div>
            <h2 class="text-lg font-medium text-coffee-600 mb-1">词汇状态总览</h2>
            <p class="text-sm text-coffee-400">查看全部词汇掌握情况</p>
            <div class="mt-3 flex justify-center">
            <svg viewBox="0 0 36 36" class="w-16 h-16">
              <!-- 底层完整底色环 -->
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E8DDD4" stroke-width="3"></circle>
              ${(()=>{
                const total = totalWords;
                const pNew = total > 0 ? (statusCount.new / total) * 100 : 0;
                const pLearning = total > 0 ? ((statusCount.mastered + statusCount.review) / total) * 100 : 0;
                const pPermanent = total > 0 ? (statusCount.permanent / total) * 100 : 0;
                const dispLearning = Math.max(0.3, pLearning);
                const dispPermanent = Math.max(0.3, pPermanent);
                return `
                <!-- 未学习 -->
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#D4C4B5" stroke-width="3"
                        stroke-dasharray="${pNew} 100"
                        stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 18 18)"></circle>
                <!-- 学习中棕色 -->
                ${pLearning > 0 ? `
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#8B7355" stroke-width="3"
                     stroke-dasharray="${dispLearning} 100"
                     stroke-dashoffset="-${pNew}"
                     stroke-linecap="round" transform="rotate(-90 18 18)"></circle>
                ` : ''}
                <!-- 永久掌握绿色 -->
                ${pPermanent > 0 ? `
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#22C55E" stroke-width="3"
                     stroke-dasharray="${dispPermanent} 100"
                     stroke-dashoffset="-${pNew + pLearning}"
                     stroke-linecap="round" transform="rotate(-90 18 18)"></circle>
                ` : ''}
                `;
              })()}
              <!-- 中间固定图标 -->
             <text x="18" y="20.5" text-anchor="middle" font-size="6">📊</text>
            </svg>
            </div>
          </div>
        </div>
  
        <!-- ========== 页面最底部来源标注（整页底端，不在卡片里） ========== -->
        <div class="mt-12 text-center text-sm text-coffee-300 pb-4">
          <span>单词来源：</span>
          <a 
            href="https://www.topik.go.kr/TWINFO/TWINFO0021.do?bbsId=BBSMSTR00073&nttId=1553&nttClCode1=ALL&pageIndex=2&searchType=&searchWord=" 
            target="_blank" 
            class="underline text-coffee-500 hover:text-coffee-600 transition-colors"
          >
            TOPIK 공식 단어 목록
          </a>
          <span> · made by LiU</span>
        </div>
      </div>
    `;
  }
  
