// ========== 学习/复习页面（异步） ==========
async function renderLearnView() {
    const isReview = state.mode === 'review' || state.currentView === 'review';
    const isBookmarks = state.currentView === 'bookmarks';
    const isWrongReview = state.currentView === 'wrong';   // 新增错题集识别

    let queue = [];
    let total = 1;

    if (isReview) {
        // 优先使用已存在的队列，避免覆盖
        if (state.currentQueue && state.currentQueue.length > 0 && state.mode === 'review') {
            queue = state.currentQueue;
        } else {
            queue = await getWordsToReviewToday();
            state.currentQueue = queue;
            state.reviewTotal = queue.length;
        }
        total = queue.length || 1;
    } else if (isBookmarks) {
        queue = await getBookmarkedWords();
        state.currentQueue = queue;
        total = queue.length || 1;
    } else if (isWrongReview) {
        // 错题集复习：直接使用 state.currentQueue
        queue = state.currentQueue || [];
        total = queue.length || 1;
        if (queue.length === 0) {
            showCompletionModal();
            return;
        }
    } else {
        queue = state.currentQueue.length > 0 ? state.currentQueue : initializeLearnQueue();
        total = allVocabularySets[state.currentSetKey]?.length || TOTAL_WORDS_PER_SET;
    }
    
    if (queue.length === 0 || state.currentIndex >= queue.length) {
        showCompletionModal();
        return;
    }

    state.currentQueue = queue;
  
    const currentWord = queue[state.currentIndex];
  
    // 进度计算
    let completed, percent, progressText;
    if (isReview) {
        if (state.reviewTotal === 0 || state.reviewTotal < total) {
            state.reviewTotal = total;
        }
        completed = Math.max(0, state.reviewTotal - total);
        percent = state.reviewTotal > 0 ? Math.round((completed / state.reviewTotal) * 100) : 0;
        progressText = `进度 ${completed}/${state.reviewTotal}`;
    } else if (isBookmarks) {
        completed = state.currentIndex;
        percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        progressText = `进度 ${completed}/${total}`;
    } else if (isWrongReview) {
        // 使用初始总题数（如果未设置则回退到当前总数）
        const initialTotal = state.wrongInitialTotal || total;
        completed = initialTotal - queue.length;  // 已完成的 = 初始总数 - 剩余数量
        percent = initialTotal > 0 ? Math.round((completed / initialTotal) * 100) : 0;
        progressText = `错题复习 ${completed}/${initialTotal}`;
    } else {
        completed = await getCompletedCountForSet(state.currentSetKey);
        percent = Math.round((completed / total) * 100);
        progressText = `学习进度 ${completed} 个 / 共 ${total} 个`;
    }
  
    const isBookmarked = bookmarkedWords.includes(currentWord.korean);
  
    let pageTitle;
    if (isReview) pageTitle = '🔁 复习模式';
    else if (isBookmarks) pageTitle = '⭐ 生词收藏本';
    else if (isWrongReview) pageTitle = '📝 错题复习';
    else pageTitle = '📖 新词背诵';
  
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
  ${!(isBookmarks) ? `
    <!-- 进度区 -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h1 class="text-lg font-medium text-coffee-600">${pageTitle}</h1>
        <div class="text-right">
          <span class="text-2xl font-light text-coffee-500">${percent}%</span>
          <p class="text-xs text-coffee-400 mt-1">完成度</p>
        </div>
      </div>
      <div class="bg-cream-300 rounded-full h-3 overflow-hidden shadow-inner">
        <div class="h-full bg-gradient-to-r from-coffee-400 to-coffee-500 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
      </div>
      <p class="text-center text-sm text-coffee-400 mt-2">
        ${isReview ? `进度 ${completed}/${state.reviewTotal}` :
          isWrongReview ? `错题复习 ${completed}/${(state.wrongInitialTotal || total)}` :
          `学习进度 ${completed} 个 / 共 ${total} 个`}
      </p>
    </div>
  ` : ''}
  ${isBookmarks ? `
  <p class="text-center text-sm text-coffee-400 mb-2">
  当前 ${state.currentIndex + 1} / 共 ${total} 个收藏单词
  </p>
  ` : ''}
        <!-- 单词卡片 -->
        <main class="mb-6">
          <div class="perspective-container" style="perspective: 1200px;">
            <div id="flashcard" class="flashcard relative w-full h-80 md:h-96">
              <!-- 正面 -->
              <div class="flashcard-front absolute inset-0 bg-white rounded-3xl shadow-lg flex flex-col items-center justify-center p-6 backface-hidden border border-cream-300 card-hover"
                   onclick="flipCard()">
                <!-- 喇叭按钮 - 单独层级，不触发翻转 -->
                <div class="speaker-wrapper absolute top-4 right-4 z-10">
                  <button class="p-2 rounded-full hover:bg-cream-100 transition-all duration-200 speaker-btn"
                          onclick="event.stopPropagation(); window.speakWord('${currentWord.korean}', true)"
                          aria-label="朗读单词">
                    <svg class="w-6 h-6 text-coffee-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6 10v4a2 2 0 002 2h2l3 3V8l-3 3H8a2 2 0 00-2 2z"/>
                    </svg>
                  </button>
                </div>
                <span class="text-5xl md:text-6xl font-medium text-coffee-600 mb-3">${currentWord.korean}</span>
                <span class="text-lg md:text-xl text-coffee-400 font-light tracking-widest">[${currentWord.roman || ''}]</span>
                <p class="absolute bottom-4 text-xs text-coffee-300">点击卡片查看释义</p>
              </div>
              <!-- 背面 -->
              <div class="flashcard-back absolute inset-0 bg-cream-200 rounded-3xl shadow-lg flex flex-col items-center justify-center p-6 backface-hidden rotate-y-180 border border-cream-300 card-hover"
                   onclick="flipCard()">
                <div class="text-center w-full max-w-sm space-y-4">
                  <div class="pb-3 border-b border-cream-300">
                    <span class="text-3xl md:text-4xl font-medium text-coffee-600">${currentWord.korean}</span>
                  </div>
                  <div>
                    <span class="inline-block px-3 py-1 bg-cream-300 rounded-full text-sm text-coffee-500">${currentWord.pos || '词性未知'}</span>
                  </div>
                  <div class="py-2">
                    <p class="text-xl md:text-2xl text-coffee-500 font-medium">${currentWord.meaning || '（待补充）'}</p>
                  </div>
                  ${currentWord.exampleKr ? `
                  <div class="bg-white/60 rounded-2xl p-4 mt-4">
                    <p class="text-base md:text-lg text-coffee-600 leading-relaxed mb-2">${currentWord.exampleKr}</p>
                    <p class="text-sm text-coffee-400 leading-relaxed">${currentWord.exampleCn || ''}</p>
                  </div>
                  ` : ''}
                </div>
                <p class="absolute bottom-4 text-xs text-coffee-300">点击卡片返回</p>
              </div>
            </div>
          </div>
        </main>
  
        <!-- 操作按钮 -->
        <footer class="space-y-3">
          <!-- 收藏按钮 -->
          <div class="flex justify-center mb-2">
            <button onclick="toggleBookmark('${currentWord.id}')"
                    class="flex items-center px-4 py-2 rounded-xl text-sm transition-all duration-200 ${isBookmarked ? 'bg-yellow-100 text-yellow-600' : 'bg-cream-200 text-coffee-500 hover:bg-cream-300'}">
              <svg class="w-4 h-4 mr-1 ${isBookmarked ? 'fill-current' : ''}" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
              </svg>
              ${isBookmarked ? '已收藏' : '加入生词本'}
            </button>
          </div>
  ${!(isBookmarks || isWrongReview) ? `
  ${state.mode === 'viewOnly' ? `
  <div class="flex justify-center">
    <p class="text-sm text-coffee-400">仅查看单词，无法修改记忆进度</p>
  </div>
  ` : `
          <div class="flex gap-3">
          <button onclick="handleAction('review')" class="action-btn flex-1 px-2 py-3 bg-cream-300 hover:bg-cream-400 text-coffee-600 rounded-2xl font-medium transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 border border-cream-300 whitespace-nowrap text-sm">
            再看一次
          </button>
          <button onclick="handleAction('mastered')" class="action-btn flex-1 px-2 py-3 bg-coffee-400 hover:bg-coffee-500 text-white rounded-2xl font-medium transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 whitespace-nowrap text-sm">
            本轮记住
          </button>
          <button onclick="handleAction('permanent')" class="action-btn flex-1 px-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-medium transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 whitespace-nowrap text-sm">
            彻底掌握
          </button>
          </div>
          <p class="text-center text-xs text-coffee-300">
            提示：「本轮记住」计入周期复习；「彻底掌握」永久归档不再推送；「再看一次」延后复习不计进度
          </p>
  `}
          ` : `
          ${isWrongReview ? `
          <div class="flex gap-3">
            <button onclick="handleAction('review')" class="action-btn flex-1 px-2 py-3 bg-cream-300 hover:bg-cream-400 text-coffee-600 rounded-2xl font-medium transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 border border-cream-300 whitespace-nowrap text-sm">
              再看一次
            </button>
            <button onclick="handleAction('mastered')" class="action-btn flex-1 px-2 py-3 bg-coffee-400 hover:bg-coffee-500 text-white rounded-2xl font-medium transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 whitespace-nowrap text-sm">
              本轮记住
            </button>
            <button onclick="handleAction('permanent')" class="action-btn flex-1 px-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-medium transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 whitespace-nowrap text-sm">
              彻底掌握
            </button>
          </div>
          <p class="text-center text-xs text-coffee-300">
            掌握后将从错题集移除，并计入复习计划
          </p>
          ` : `
          <div class="flex gap-3 justify-center">
            <button onclick="prevBookmarkWord()" class="px-5 py-2 bg-cream-200 text-coffee-600 rounded-xl">
              上一个
            </button>
            <button onclick="nextBookmarkWord()" class="px-5 py-2 bg-coffee-400 text-white rounded-xl">
              下一个
            </button>
          </div>
          `}
  `}
        </footer>
      </div>
    `;
}
  
// ========== 操作处理 ==========
function initializeLearnQueue() {
    const words = allVocabularySets[state.currentSetKey] || [];
    state.currentQueue = words.filter(w => {
      const progress = wordProgress[w.id];
      if (!progress) return true;
      if (progress.status === 'permanent') return false;
      return progress.status !== 'mastered';
    });
    return state.currentQueue;
}
  
async function handleAction(action) {
    if (state.mode === 'viewOnly') return;

    const queue = state.currentQueue;
    const currentWord = queue[state.currentIndex];
    if (!currentWord) return;

    const today = getToday();
    const existing = wordProgress[currentWord.id];

    if (action === 'mastered') {
        const isNewWord = !existing || existing.status !== 'mastered';
      
        if (isNewWord) {
            // 首次掌握：初始化 reviewHistory 为空数组
            wordProgress[currentWord.id] = {
                status: 'mastered',
                firstLearnedDate: today,
                lastReviewDate: null,
                nextReviewDate: addDays(today, 1),
                reviewCount: 0,
                reviewHistory: []   // ← 必须有这一行
            };
        } else {
            // 复习：记录复习日期
            existing.reviewCount = (existing.reviewCount || 0) + 1;
            existing.lastReviewDate = today;  // ← 保留 lastReviewDate 用于兼容
            
            // 确保 reviewHistory 是数组
            if (!Array.isArray(existing.reviewHistory)) {
                existing.reviewHistory = [];
            }
            existing.reviewHistory.push(today);   // ← 记录本次复习日期
            
            const intervals = [1, 2, 4, 7, 15, 30];
            const idx = Math.min(existing.reviewCount, intervals.length - 1);
            existing.nextReviewDate = addDays(today, intervals[idx]);
        }

        // 从队列中移除当前词
        queue.splice(state.currentIndex, 1);
      
        // 如果是错题集复习，同步从错题集中移除
        if (state.currentView === 'wrong') {
            const kw = currentWord.korean;
            const wrongIdx = state.wrongWords.indexOf(kw);
            if (wrongIdx !== -1) {
                state.wrongWords.splice(wrongIdx, 1);
            }
        }
      
        if (queue.length === 0) {
            saveToStorageDebounced();
            showCompletionModal();
            return;
        }
        if (state.currentIndex >= queue.length) {
            state.currentIndex = 0;
        }

    } else if (action === 'permanent') {
        // 彻底掌握：不更新 lastReviewDate（不计入“今日复习”）
        wordProgress[currentWord.id] = {
            status: 'permanent',
            firstLearnedDate: existing?.firstLearnedDate || today,
            permanentDate: today,
            nextReviewDate: null,
            reviewCount: 0
        };

        // 从队列中移除
        queue.splice(state.currentIndex, 1);
      
        // 如果是错题集复习，同步从错题集中移除
        if (state.currentView === 'wrong') {
            const kw = currentWord.korean;
            const wrongIdx = state.wrongWords.indexOf(kw);
            if (wrongIdx !== -1) {
                state.wrongWords.splice(wrongIdx, 1);
            }
        }

        if (queue.length === 0) {
            saveToStorageDebounced();
            showCompletionModal();
            return;
        }
        if (state.currentIndex >= queue.length) {
            state.currentIndex = 0;
        }

    } else if (action === 'review') {
        // 再看一次：只移动位置，不更新任何日期，不计入任何统计
        // 如果是在错题集复习，也不从错题集移除（保持原样）
        queue.splice(state.currentIndex, 1);
        queue.push(currentWord);
    }

    saveToStorageDebounced();
    saveWrongReviewState();
    resetCard();
    if (state.currentView === 'wrong') {
        renderLearnView();
    } else {
        renderCurrentView();
    }
}
  
function toggleBookmark(wordId) {
    // 遍历所有套装，查找 id 匹配的单词对象
    let word = null;
    for (const setKey of sortedSetKeys) {
      const found = allVocabularySets[setKey]?.find(w => w.id === wordId);
      if (found) {
        word = found;
        break;
      }
    }
    if (!word) return; // 没找到对应的单词，不执行收藏操作
  
    const kw = word.korean; // 使用韩文单词作为收藏标识
    const index = bookmarkedWords.indexOf(kw);
    if (index > -1) {
      bookmarkedWords.splice(index, 1);
    } else {
      bookmarkedWords.push(kw);
    }
    saveToStorageDebounced();
    renderCurrentView();
}
  
function setFilter(filter) {
    state.selectedFilter = filter;
    renderCurrentView();
}
function setLevelFilter(level) {
    state.levelFilter = level;
    renderCurrentView();
}
const debounceSearch = debounce(function(keyword) {
    state.searchKeyword = keyword.trim();
    renderCurrentView();
}, 500);
  
// 总览点击单词：打开独立详情页，不进入背诵、不会弹出完成弹窗
async function startLearnWord(wordId) {
    // 遍历所有套装，找到匹配的单词
    let word = null;
    for (const setKey of sortedSetKeys) {
      const found = allVocabularySets[setKey]?.find(w => w.id === wordId);
      if (found) {
        word = found;
        break;
      }
    }
    if (!word) {
      goHome();
      return;
    }
    // 切换到单词详情视图
    state.currentView = 'wordDetail';
    state.targetWord = word;
    renderCurrentView();
}
