// TOPIK - 主程序 v6.6

// ========== 全局词库数据 ==========
let allVocabularySets = {};          // 词库对象，键为套装编号字符串
let sortedSetKeys = [];              // 有序套装键列表，如 ["1","2","3",...,"40"]
const TOTAL_WORDS_PER_SET = 20;      // 固定为20，不再动态覆盖
let vocabularyLoaded = false;        // 词库加载状态
let vocabularyLoadError = null;      // 加载错误信息，用于友好提示

// ========== 存储键 ==========
const STORAGE_KEYS = {
  wordProgress: 'topik_word_progress_v3',
  currentSet: 'topik_current_set_v3',
  bookmarkedWords: 'topik_bookmarked_words_v3'
};

// ========== 状态管理 ==========
let state = {
  currentView: 'home',
  currentSet: 1,
  currentSetKey: '1',
  currentIndex: 0,
  currentQueue: [],
  mode: 'new',
  selectedFilter: 'all',
  searchKeyword: '',
  targetWord: null,
  levelFilter: 'all',
  quizQuestions: [],
  quizIndex: 0,
  quizScore: 0,
  wrongWords: [],
  wrongViewMode: 'list',
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth() + 1,
  selectedDate: null,
  darkMode: false
};

// 单词进度数据
let wordProgress = {};
// 收藏的单词ID列表
let bookmarkedWords = [];

// ========== DOM ==========
const elements = {};

// ========== 核心异步加载函数 ==========
async function loadVocabularyData() {
  try {
    const response = await fetch('public/data/vocabulary.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: 无法访问词库文件`);
    }

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (parseError) {
      throw new Error('JSON格式错误: ' + parseError.message);
    }

    allVocabularySets = {};
    sortedSetKeys = [];
    const invalidSets = [];

    for (const [key, words] of Object.entries(data)) {
      if (typeof key !== 'string' || key.trim() === '') {
        invalidSets.push(`键"${key}"无效`);
        continue;
      }

      if (!Array.isArray(words)) {
        invalidSets.push(`套装"${key}"不是有效数组`);
        continue;
      }

      const validWords = [];
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if (w && typeof w.id === 'string' && typeof w.korean === 'string' && w.korean.trim() !== '') {
          
          const setNumber = parseInt(key, 10);
          validWords.push({
            id: w.id,
            korean: w.korean,
            roman: w.roman || '',
            meaning: w.meaning || '（待补充）',
            pos: w.pos || '词性未知',
            exampleKr: w.exampleKr || '',
            exampleCn: w.exampleCn || '',
            level: setNumber <= 90 ? '初级' : '中级'   // ← 新增这一行
          });
        }
      }

      if (validWords.length > 0) {
        allVocabularySets[key] = validWords;
        sortedSetKeys.push(key);
      } else {
        invalidSets.push(`套装"${key}"无有效单词`);
      }
    }

    sortedSetKeys.sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });

    if (sortedSetKeys.length === 0) {
      throw new Error('词库无有效套装数据');
    }

    vocabularyLoaded = true;
    vocabularyLoadError = null;

    console.log(`词库加载成功: ${sortedSetKeys.length}套，共${Object.values(allVocabularySets).reduce((sum, arr) => sum + arr.length, 0)}词`);
    if (invalidSets.length > 0) {
      console.warn('部分套装被跳过:', invalidSets);
    }

    return allVocabularySets;

  } catch (error) {
    console.error('加载词库失败:', error);
    allVocabularySets = {};
    sortedSetKeys = [];
    vocabularyLoaded = false;
    vocabularyLoadError = error.message || '未知错误';
    return {};
  }
}

// ========== 程序初始化总入口 ==========
async function init() {
  await loadVocabularyData();
  loadFromStorage();

  // 读取夜间模式偏好
  const savedDarkMode = localStorage.getItem('topik_dark_mode');
  if (savedDarkMode === 'true') {
    state.darkMode = true;
    document.body.classList.add('dark');
  }
  
  // 如果词库已加载，检查 bookmarkedWords 是否为旧格式（id 包含 '-'），进行迁移
  if (vocabularyLoaded && bookmarkedWords.length > 0 && typeof bookmarkedWords[0] === 'string' && bookmarkedWords[0].includes('-')) {
    const migrated = [];
    for (const item of bookmarkedWords) {
      const setKey = getSetKeyFromWordId(item);
      if (setKey && allVocabularySets[setKey]) {
        const word = allVocabularySets[setKey].find(w => w.id === item);
        if (word) migrated.push(word.korean);
      }
    }
    if (migrated.length > 0) {
      bookmarkedWords = migrated;
      saveToStorage();
      console.log('收藏格式已迁移到 korean');
    } else {
      // 如果旧收藏全都找不到对应单词，清空收藏本
      bookmarkedWords = [];
      saveToStorage();
    }
  }

  syncCurrentSetKey();
  setupElements();
  await renderCurrentView();
  setupKeyboard();
}

function setupElements() {
  elements.app = document.getElementById('app');
  elements.completionModal = document.getElementById('completion-modal');
  elements.resetModal = document.getElementById('reset-modal');
}

function syncCurrentSetKey() {
  if (sortedSetKeys.length === 0) return;

  const targetKey = String(state.currentSet);

  if (sortedSetKeys.includes(targetKey)) {
    state.currentSetKey = targetKey;
  } else {
    state.currentSetKey = sortedSetKeys[0];
    state.currentSet = parseInt(sortedSetKeys[0], 10) || 1;
  }
}

// ========== 本地存储 ==========
function loadFromStorage() {
  try {
    const savedProgress = localStorage.getItem(STORAGE_KEYS.wordProgress);
    const savedSet = localStorage.getItem(STORAGE_KEYS.currentSet);
    const savedBookmarks = localStorage.getItem(STORAGE_KEYS.bookmarkedWords);

    if (savedProgress) wordProgress = JSON.parse(savedProgress) || {};
    if (savedSet) state.currentSet = parseInt(savedSet, 10) || 1;
    if (savedBookmarks) bookmarkedWords = JSON.parse(savedBookmarks) || [];
  } catch (e) {
    console.warn('加载存储失败:', e);
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.wordProgress, JSON.stringify(wordProgress));
    localStorage.setItem(STORAGE_KEYS.currentSet, state.currentSet.toString());
    localStorage.setItem(STORAGE_KEYS.bookmarkedWords, JSON.stringify(bookmarkedWords));
  } catch (e) {
    console.warn('保存存储失败:', e);
  }
}

function exportProgress() {
  const data = {
    wordProgress: wordProgress,
    currentSet: state.currentSet,
    bookmarkedWords: bookmarkedWords
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `topik_backup_${getToday()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importProgress() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.wordProgress) wordProgress = data.wordProgress;
      if (data.currentSet) state.currentSet = data.currentSet;
      if (data.bookmarkedWords) bookmarkedWords = data.bookmarkedWords;
      saveToStorage();
      alert('进度已导入，页面将刷新。');
      location.reload();
    } catch (err) {
      alert('导入失败，请检查文件格式。');
    }
  };
  input.click();
}

// ========== 日期工具 ==========
function getToday() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// ========== 获取当前有效套装总数 ==========
function getTotalSetCount() {
  return sortedSetKeys.length;
}

function getSetKeyFromWordId(wordId) {
  if (typeof wordId !== 'string') return null;
  const dashIndex = wordId.indexOf('-');
  if (dashIndex === -1) return null;
  return wordId.substring(0, dashIndex);
}

// ========== 复习逻辑（异步） ==========
async function getWordsToReviewToday() {
  if (!vocabularyLoaded) return [];
  const today = getToday();
  const reviewWords = [];

  for (const [wordId, progress] of Object.entries(wordProgress)) {
    if (progress.status !== 'mastered') continue;
    if (!progress.nextReviewDate || progress.nextReviewDate > today) continue;

    // 遍历所有套装找到该单词
    for (const setKey of sortedSetKeys) {
      const word = allVocabularySets[setKey]?.find(w => w.id === wordId);
      if (word) {
        reviewWords.push({ ...word, progress });
        break; // 找到就跳出内层循环
      }
    }
  }
  return reviewWords;
}

async function getNewWordsForSet(setKey) {
  if (!vocabularyLoaded) return [];
  const words = allVocabularySets[setKey] || [];
  return words.filter(w => {
    const progress = wordProgress[w.id];
    if (!progress) return true;
    if (progress.status === 'permanent') return false;
    return progress.status === 'new';
  });
}

async function getCompletedCountForSet(setKey) {
  if (!vocabularyLoaded) return 0;
  const words = allVocabularySets[setKey] || [];
  return words.filter(w => {
    const status = wordProgress[w.id]?.status;
    return status === 'mastered' || status === 'permanent';
  }).length;
}

function getWordStatus(wordId) {
  const progress = wordProgress[wordId];
  if (!progress || progress.status === 'new') return 'new';
  if (progress.status === 'permanent') return 'permanent';
  if (progress.status === 'mastered' && progress.nextReviewDate && progress.nextReviewDate <= getToday()) return 'review';
  if (progress.status === 'mastered') return 'mastered';
  return 'learning';
}

// ========== 视图渲染 ==========
async function renderCurrentView() {
  elements.app.innerHTML = '';

  if (!vocabularyLoaded) {
    renderLoadError();
    return;
  }

  switch (state.currentView) {
    case 'home': await renderHomeView(); break;
    case 'learn': await renderLearnView(); break;
    case 'review': await renderLearnView(); break;
    case 'overview': await renderOverviewView(); break;
    case 'bookmarks': await renderBookmarksView(); break;
    case 'wordDetail': await renderWordDetailView(state.targetWord); break;
    case 'quiz': await renderQuizView(); break;
    case 'wrong': await renderWrongView(); break;
    case 'calendar': await renderCalendarView(); break;
  }
}

// ========== 加载失败提示 ==========
function renderLoadError() {
  elements.app.innerHTML = `
    <div class="fade-in text-center py-12">
      <div class="text-5xl mb-4">📭</div>
      <h2 class="text-xl font-medium text-coffee-600 mb-3">词库加载失败</h2>
      <p class="text-sm text-coffee-400 mb-2">
        无法加载词汇数据文件
      </p>
      <p class="text-xs text-red-400 mb-6 px-4">
        ${vocabularyLoadError || '请检查 data/vocabulary.json 文件是否存在'}
      </p>
      <button onclick="location.reload()" class="px-6 py-2 bg-coffee-400 hover:bg-coffee-500 text-white rounded-xl transition-colors">
        重新加载
      </button>
    </div>
  `;
}

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
            <div class="text-xs px-2 py-1 rounded-full ${currentSetCompleted >= currentSetTotal ? 'bg-green-100 text-green-600' : 'bg-cream-200 text-coffee-500'}">
              词库第${state.currentSet}套
            </div>
          </div>
          <h2 class="text-lg font-medium text-coffee-600 mb-1">今日新词背诵</h2>
          <p class="text-sm text-coffee-400 mb-3">待学 ${Math.max(0, currentSetTotal - currentSetCompleted)} 个单词</p>
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
        <div class="home-card bg-white rounded-3xl p-5 shadow-md border border-cream-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div class="flex items-start justify-between mb-3">
            <div class="text-3xl">🎯</div>
          </div>
          <h2 class="text-lg font-medium text-coffee-600 mb-3">测验·错题</h2>
          <div class="flex gap-2">
            <button onclick="showQuizModePicker()" class="flex-1 px-4 py-2.5 bg-coffee-400 hover:bg-coffee-500 text-white text-sm font-medium rounded-2xl transition-all duration-200 hover:shadow-md active:scale-95">
              开始测验
            </button>
            <button onclick="goToWrongWords()" class="flex-1 px-4 py-2.5 bg-cream-200 hover:bg-cream-300 text-coffee-600 text-sm font-medium rounded-2xl transition-all duration-200 border border-cream-300 active:scale-95 ${state.wrongWords.length === 0 ? 'opacity-50' : ''}">
              错题集 ${state.wrongWords.length > 0 ? `(${state.wrongWords.length})` : ''}
            </button>
          </div>
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
            <div class="text-xs px-2 py-1 rounded-full bg-cream-200 text-coffee-500">${totalMastered}/${totalWords}</div>
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

// ========== 学习/复习页面（异步） ==========
async function renderLearnView() {
  const isReview = state.mode === 'review' || state.currentView === 'review';
  const isBookmarks = state.currentView === 'bookmarks';

  let queue = [];
  let total = TOTAL_WORDS_PER_SET;

  if (isReview) {
    queue = await getWordsToReviewToday();
    total = queue.length || 1;
  } else if (isBookmarks) {
    queue = await getBookmarkedWords();
    total = queue.length || 1;
  } else {
    queue = state.currentQueue.length > 0 ? state.currentQueue : initializeLearnQueue();
    total = allVocabularySets[state.currentSetKey]?.length || TOTAL_WORDS_PER_SET;
  }

  if (queue.length === 0 || state.currentIndex >= queue.length) {
    showCompletionModal();
    return;
  }

  const currentWord = queue[state.currentIndex];

  //【修改】修复进度百分比计算 - 三种场景独立计算
  let completed, percent;
  if (isReview) {
    // 复习模式：用当前位置作为进度
    completed = state.currentIndex;
    percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  } else if (isBookmarks) {
    //【修改】收藏本模式：仅用currentIndex作为分子，total为队列长度
    completed = state.currentIndex;
    percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  } else {
    // 新词模式：用套装已完成数
    completed = await getCompletedCountForSet(state.currentSetKey);
    percent = Math.round((completed / total) * 100);
  }

  const isBookmarked = bookmarkedWords.includes(currentWord.korean);

  const pageTitle = isReview ? '🔁 复习模式' :
                    (isBookmarks ? '⭐ 生词收藏本' : '📖 新词背诵');

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
${!isBookmarks ? `
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
          ${isReview || isBookmarks ? `进度 ${state.currentIndex + 1}/${total}` : `学习进度 ${completed} 个 / 共 ${total} 个`}
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
                        onclick="event.stopPropagation(); speakWord('${currentWord.korean}')"
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
${!isBookmarks ? `
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
        <div class="flex gap-3 justify-center">
          <button onclick="prevBookmarkWord()" class="px-5 py-2 bg-cream-200 text-coffee-600 rounded-xl">
            上一个
          </button>
          <button onclick="nextBookmarkWord()" class="px-5 py-2 bg-coffee-400 text-white rounded-xl">
            下一个
          </button>
        </div>
`}
      </footer>
    </div>
  `;
}

// ========== 词汇总览页面（异步） ==========
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

  // 再按状态过滤（原有的代码保持不变）
  if (state.selectedFilter === 'new') {
    filteredWords = allWords.filter(w => getWordStatus(w.id) === 'new');
  } else if (state.selectedFilter === 'review') {
    filteredWords = allWords.filter(w => getWordStatus(w.id) === 'review');
  } else if (state.selectedFilter === 'mastered') {
    filteredWords = allWords.filter(w => getWordStatus(w.id) === 'mastered');
  } else if (state.selectedFilter === 'permanent') {
    filteredWords = allWords.filter(w => getWordStatus(w.id) === 'permanent');
  } else if (state.selectedFilter === 'bookmarked') {  // ← 新增
    filteredWords = allWords.filter(w => bookmarkedWords.includes(w.korean));
  } else if (state.selectedFilter === 'bookmarked') {
    filteredWords = allWords.filter(w => bookmarkedWords.includes(w.korean));
  }

  //【修改】应用搜索过滤
  const rawKeyword = state.searchKeyword.trim();
  const lowerKeyword = rawKeyword.toLowerCase();
  if (rawKeyword) {
    filteredWords = filteredWords.filter(w =>
    // 韩文不转小写，韩文字母无大小写，转小写会匹配失败
      w.korean.includes(rawKeyword) ||
    // 罗马音、中文释义统一小写模糊匹配
      w.roman.toLowerCase().includes(lowerKeyword) ||
      w.meaning.toLowerCase().includes(lowerKeyword)
    );
  }

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

      <!--【修改】新增搜索框 -->
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
          <!-- 底层完整底色环 -->
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E8DDD4" stroke-width="3"></circle>
          ${(()=>{
            const total = levelFilteredWords.length;
            const pNew = total > 0 ? (statusCount.new / total) * 100 : 0;
            const pLearning = total > 0 ? ((statusCount.mastered + statusCount.review) / total) * 100 : 0;
            const pPermanent = total > 0 ? (statusCount.permanent / total) * 100 : 0;
            const dispLearning = Math.max(0.3, pLearning);
            const dispPermanent = Math.max(0.3, pPermanent);
            return `
            <!-- 1.未学习 浅米色 -->
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#D4C4B5" stroke-width="3"
                stroke-dasharray="${pNew} 100"
                stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 18 18)"></circle>
            <!-- 2.学习中（今日已学+待复习，不含永久掌握）棕色 -->
            ${pLearning > 0 ? `
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#8B7355" stroke-width="3"
                stroke-dasharray="${dispLearning} 100"
                stroke-dashoffset="-${pNew}"
                stroke-linecap="round" transform="rotate(-90 18 18)"></circle>
            ` : ''}
            <!-- 3.永久掌握 绿色，偏移=未学习+学习中两段总和 -->
            ${pPermanent > 0 ? `
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#22C55E" stroke-width="3"
                stroke-dasharray="${dispPermanent} 100"
                stroke-dashoffset="-${pNew + pLearning}"
                stroke-linecap="round" transform="rotate(-90 18 18)"></circle>
            ` : ''}
            `;
          })()}
          <!-- 中间固定图标 -->
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
        <!-- 明细数字 -->
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

      <!--【修改】词汇列表 - 卡片可点击进入背诵 -->
      ${filteredWords.length === 0 ? `
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
        ${filteredWords.map(w => {
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
                ${bookmarkedWords.includes(w.korean) ? '<span class="text-yellow-500 text-xs">⭐</span>' : ''}
              </div>
              <p class="text-xs text-coffee-400 mb-2">${w.meaning}</p>
              <span class="text-xs px-2 py-0.5 rounded-full ${statusBadgeClass}">${statusText}</span>
            </div>
          `;
        }).join('')}
      </div>
      `}
    </div>
  `;
}

// ========== 生词收藏本页面（异步） ==========
async function getBookmarkedWords() {
  const words = [];
  for (const kw of bookmarkedWords) { // 现在 bookmarkedWords 里是韩文单词字符串
    // 在所有套装中寻找匹配的单词（取第一个匹配即可）
    for (const setKey of sortedSetKeys) {
      const word = allVocabularySets[setKey]?.find(w => w.korean === kw);
      if (word) {
        words.push(word);
        break; // 找到一个就跳出，避免重复添加
      }
    }
  }
  return words;
}

async function renderBookmarksView() {
  const bookmarkedWordsList = await getBookmarkedWords();

  if (bookmarkedWordsList.length === 0) {
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
          <h2 class="text-lg font-medium text-coffee-600 mb-2">生词收藏本为空</h2>
          <p class="text-sm text-coffee-400 mb-6">在背诵页面点击「加入生词本」可收藏难点词汇</p>
          <button onclick="goHome()" class="px-6 py-2 bg-coffee-400 hover:bg-coffee-500 text-white rounded-xl transition-colors">
            返回首页
          </button>
        </div>
      </div>
    `;
    return;
  }

  state.currentView = 'bookmarks';
  state.currentQueue = bookmarkedWordsList;
  if (state.currentIndex >= bookmarkedWordsList.length) {
    state.currentIndex = 0;
  }
  await renderLearnView();
}

// 单词详情查看页（仅浏览，不参与背诵，不会弹出完成弹窗）
async function renderWordDetailView(targetWord) {
  const word = targetWord;
  const status = getWordStatus(word.id);
  const isBookmarked = bookmarkedWords.includes(word.korean);

  elements.app.innerHTML = `
    <div>
      <header class="mb-6">
        <button onclick="goToOverview()" class="flex items-center text-coffee-400 hover:text-coffee-500 transition-colors">
          <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          返回词汇总览
        </button>
      </header>

      <h1 class="text-xl font-medium text-coffee-600 mb-4">单词详情</h1>

      <div class="bg-white rounded-3xl p-6 shadow-md border border-cream-300 mb-4">
        <div class="flex justify-between items-start mb-4">
          <span class="text-4xl font-medium text-coffee-600">${word.korean}</span>
          <button class="p-2 rounded-full hover:bg-cream-100 transition-all speaker-btn"
                  onclick="speakWord('${word.korean}')">
            <svg class="w-6 h-6 text-coffee-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6 10v4a2 2 0 002 2h2l3 3V8l-3 3H8a2 2 0 00-2 2z"/>
            </svg>
          </button>
        </div>
        <p class="text-lg text-coffee-400 tracking-widest mb-4">[${word.roman || ''}]</p>

        <div class="mb-4">
          <span class="inline-block px-3 py-1 bg-cream-300 rounded-full text-sm text-coffee-500">${word.pos || '词性未知'}</span>
          ${(()=>{
            const statusText = status === 'permanent' ? '永久掌握' :
                               status === 'mastered' ? '已熟记' :
                               status === 'review' ? '待复习' : '未学习';
            const statusBadgeClass = status === 'permanent' ? 'bg-green-100 text-green-600' :
                                     status === 'mastered' ? 'bg-coffee-100 text-coffee-600' :
                                     status === 'review' ? 'bg-amber-100 text-amber-600' : 'bg-cream-200 text-coffee-400';
            return `<span class="ml-2 text-xs px-2 py-0.5 rounded-full ${statusBadgeClass}">${statusText}</span>`;
          })()}
        </div>

        <div class="py-3 border-t border-b border-cream-200 mb-4">
          <p class="text-xl text-coffee-500 font-medium">${word.meaning || '（待补充）'}</p>
        </div>

        ${word.exampleKr ? `
        <div class="bg-cream-50 rounded-2xl p-4">
          <p class="text-base text-coffee-600 mb-2">${word.exampleKr}</p>
          <p class="text-sm text-coffee-400">${word.exampleCn || ''}</p>
        </div>
        ` : ''}
      </div>

      <div class="flex justify-center">
        <button onclick="toggleBookmark('${word.id}')"
                class="flex items-center px-4 py-2 rounded-xl text-sm transition-all ${isBookmarked ? 'bg-yellow-100 text-yellow-600' : 'bg-cream-200 text-coffee-500 hover:bg-cream-300'}">
          <svg class="w-4 h-4 mr-1 ${isBookmarked ? 'fill-current' : ''}" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
          </svg>
          ${isBookmarked ? '已收藏' : '加入生词本'}
        </button>
      </div>
    </div>
  `;
}

// ========== 测验模式 ==========
function startQuiz(mode = 'today') {
  let words = [];

  const today = getToday();

  // 1. 当前套装未掌握的词汇
  const currentSetWords = (allVocabularySets[state.currentSetKey] || []).filter(w => {
    const p = wordProgress[w.id];
    return !p || p.status !== 'permanent';
  });

  // 2. 待复习词汇
  const reviewWords = [];
  for (const [wordId, progress] of Object.entries(wordProgress)) {
    if (progress.status === 'mastered' && progress.nextReviewDate && progress.nextReviewDate <= today) {
      for (const setKey of sortedSetKeys) {
        const w = allVocabularySets[setKey]?.find(w => w.id === wordId);
        if (w && !reviewWords.some(rw => rw.id === w.id)) {
          reviewWords.push(w);
          break;
        }
      }
    }
  }

  // 3. 所有初级未掌握的词汇
  const primaryWords = [];
  for (const setKey of sortedSetKeys) {
    const setNumber = parseInt(setKey, 10);
    if (setNumber <= 90) {
      const ws = (allVocabularySets[setKey] || []).filter(w => {
        const p = wordProgress[w.id];
        return !p || p.status !== 'permanent';
      });
      primaryWords.push(...ws);
    }
  }

  // 4. 所有中级未掌握的词汇
  const intermediateWords = [];
  for (const setKey of sortedSetKeys) {
    const setNumber = parseInt(setKey, 10);
    if (setNumber > 90) {
      const ws = (allVocabularySets[setKey] || []).filter(w => {
        const p = wordProgress[w.id];
        return !p || p.status !== 'permanent';
      });
      intermediateWords.push(...ws);
    }
  }

  // 5. 全部未掌握的词汇
  const allUnmastered = [...primaryWords, ...intermediateWords];

  // 根据模式选词
  switch (mode) {
    case 'today':
      // 当前套装 + 待复习，去重合并
      const todayMap = new Map();
      currentSetWords.forEach(w => todayMap.set(w.id, w));
      reviewWords.forEach(w => todayMap.set(w.id, w));
      words = Array.from(todayMap.values());
      break;
    case 'primary':
      words = primaryWords;
      break;
    case 'intermediate':
      words = intermediateWords;
      break;
    case 'all':
      words = allUnmastered;
      break;
    default:
      words = currentSetWords;
  }

  if (words.length === 0) {
    showToast('没有可测验的单词，请先学习一些单词。', 2000);
    return;
  }

  // 随机抽取 10 题
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(10, shuffled.length));

  // 收集所有可选释义作为干扰项来源
  const allMeanings = words.map(w => w.meaning).filter(m => m);

  state.quizQuestions = selected.map(word => {
    const correctAnswer = word.meaning;
    let distractors = allMeanings
      .filter(m => m !== correctAnswer)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    while (distractors.length < 3) distractors.push('——');
    const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
    return {
      word: word,
      options: options,
      correctIndex: options.indexOf(correctAnswer),
      userChoice: null,
      isCorrect: null
    };
  });

  state.quizMode = mode;
  state.quizIndex = 0;
  state.quizScore = 0;
  state.currentView = 'quiz';
  renderCurrentView();
}

function showQuizModePicker() {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-coffee-600/30 backdrop-blur-sm';
  overlay.innerHTML = `
    <div class="bg-cream-100 rounded-3xl shadow-2xl p-6 w-[90%] max-w-sm border border-cream-300 fade-in">
      <h3 class="text-lg font-medium text-coffee-600 text-center mb-4">选择测验模式</h3>
      <div class="space-y-3">
        <button class="quiz-mode-btn w-full px-4 py-3 bg-white border border-cream-300 rounded-2xl text-left hover:bg-cream-50 transition-colors" data-mode="today">
          <div class="font-medium text-coffee-600">📖 今日学习 <span class="text-xs text-green-500 ml-1">推荐</span></div>
          <div class="text-xs text-coffee-400 mt-0.5">当前套装 + 待复习词汇</div>
        </button>
        <button class="quiz-mode-btn w-full px-4 py-3 bg-white border border-cream-300 rounded-2xl text-left hover:bg-cream-50 transition-colors" data-mode="primary">
          <div class="font-medium text-coffee-600">📗 初级专练</div>
          <div class="text-xs text-coffee-400 mt-0.5">仅初级词汇 (set 1-90)</div>
        </button>
        <button class="quiz-mode-btn w-full px-4 py-3 bg-white border border-cream-300 rounded-2xl text-left hover:bg-cream-50 transition-colors" data-mode="intermediate">
          <div class="font-medium text-coffee-600">📘 中级专练</div>
          <div class="text-xs text-coffee-400 mt-0.5">仅中级词汇 (set 91-272)</div>
        </button>
        <button class="quiz-mode-btn w-full px-4 py-3 bg-white border border-cream-300 rounded-2xl text-left hover:bg-cream-50 transition-colors" data-mode="all">
          <div class="font-medium text-coffee-600">🌐 全部混合</div>
          <div class="text-xs text-coffee-400 mt-0.5">所有未掌握词汇大乱斗</div>
        </button>
      </div>
      <button class="w-full mt-4 px-4 py-2 bg-cream-200 hover:bg-cream-300 text-coffee-500 rounded-xl text-sm transition-colors" id="cancel-quiz-picker">
        取消
      </button>
    </div>
  `;
  document.body.appendChild(overlay);

  // 点击遮罩关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // 取消按钮
  overlay.querySelector('#cancel-quiz-picker').addEventListener('click', () => overlay.remove());

  // 四个模式按钮
  overlay.querySelectorAll('.quiz-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      overlay.remove();
      onQuizModeSelected(mode);   // 不直接开始，先检查存档
    });
  });
}

function onQuizModeSelected(mode) {
  const saved = localStorage.getItem('topik_quiz_state');
  if (saved) {
    try {
      const quizState = JSON.parse(saved);
      if (quizState.questions && quizState.questions.length > 0 && quizState.index < quizState.questions.length) {
        // 有未完成的测验，弹出自定义恢复弹窗
        showQuizResumeDialog(mode, quizState);
        return;
      }
    } catch (e) {
      localStorage.removeItem('topik_quiz_state');
    }
  }
  // 没有存档，直接开始新测验
  startQuiz(mode);
}

function showQuizResumeDialog(newMode, savedState) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-coffee-600/30 backdrop-blur-sm';
  overlay.innerHTML = `
    <div class="bg-cream-100 rounded-3xl shadow-2xl p-6 w-[90%] max-w-sm border border-cream-300 fade-in text-center">
      <div class="text-4xl mb-4">📋</div>
      <h3 class="text-lg font-medium text-coffee-600 mb-2">检测到未完成的测验</h3>
      <p class="text-sm text-coffee-400 mb-6">
        上次进度：第 ${savedState.index + 1}/${savedState.questions.length} 题，
        已答对 ${savedState.score} 题
      </p>
      <div class="space-y-3">
        <button class="w-full px-4 py-3 bg-coffee-400 hover:bg-coffee-500 text-white rounded-2xl font-medium transition-all" id="resume-quiz-btn">
          继续上次测验
        </button>
        <button class="w-full px-4 py-3 bg-cream-200 hover:bg-cream-300 text-coffee-600 rounded-2xl font-medium transition-all border border-cream-300" id="new-quiz-btn">
          开始新测验
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#resume-quiz-btn').addEventListener('click', () => {
    overlay.remove();
    state.quizQuestions = savedState.questions;
    state.quizIndex = savedState.index;
    state.quizScore = savedState.score;
    state.quizMode = savedState.mode || 'today';
    state.currentView = 'quiz';
    renderCurrentView();
  });

  overlay.querySelector('#new-quiz-btn').addEventListener('click', () => {
    overlay.remove();
    localStorage.removeItem('topik_quiz_state');
    startQuiz(newMode);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      localStorage.removeItem('topik_quiz_state');
      startQuiz(newMode);
    }
  });
}

async function renderQuizView() {
  if (!state.quizQuestions || state.quizQuestions.length === 0) {
    goHome();
    return;
  }

  if (state.quizIndex >= state.quizQuestions.length) {
    renderQuizResult();
    return;
  }

  const q = state.quizQuestions[state.quizIndex];
  const currentWord = q.word;

  elements.app.innerHTML = `
    <div>
    <header class="mb-6">
      <div class="flex items-center justify-between">
        <button onclick="goHome()" class="flex items-center text-coffee-400 hover:text-coffee-500 transition-colors">
          <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          返回首页
        </button>
        <button onclick="saveQuizAndExit()" class="text-xs px-3 py-1 bg-cream-200 hover:bg-cream-300 text-coffee-600 rounded-full transition">
          💾 保存并退出
        </button>
      </div>
    </header>

      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h1 class="text-lg font-medium text-coffee-600">🎯 测验模式</h1>
          <span class="text-sm text-coffee-400">第 ${state.quizIndex + 1}/${state.quizQuestions.length} 题</span>
        </div>
        <div class="bg-cream-300 rounded-full h-3 overflow-hidden shadow-inner">
          <div class="h-full bg-gradient-to-r from-coffee-400 to-coffee-500 rounded-full transition-all duration-500" style="width: ${(state.quizIndex / state.quizQuestions.length) * 100}%"></div>
        </div>
      </div>

      <div class="bg-white rounded-3xl p-6 shadow-md border border-cream-300 mb-6">
        <p class="text-center text-coffee-400 text-sm mb-4">다음 단어의 올바른 뜻은 무엇인가요?</p>
        <p class="text-center text-4xl font-medium text-coffee-600 mb-8">${currentWord.korean}</p>
        <div class="space-y-3">
          ${q.options.map((opt, i) => {
            let btnClass = 'bg-cream-200 border-cream-300 text-coffee-600 hover:bg-cream-300';
            if (q.userChoice !== null) {
              if (i === q.correctIndex) {
                btnClass = 'bg-green-100 border-green-400 text-green-700';
              } else if (i === q.userChoice) {
                btnClass = 'bg-red-100 border-red-400 text-red-700';
              } else {
                btnClass = 'bg-cream-100 border-cream-200 text-coffee-400 opacity-60';
              }
            }
            return `
              <button onclick="handleQuizAnswer(${state.quizIndex}, ${i})"
                      class="w-full px-4 py-3 rounded-xl border text-left text-base font-medium transition-all duration-200 ${btnClass}"
                      ${q.userChoice !== null ? 'disabled' : ''}>
                ${String.fromCharCode(65 + i)}. ${opt}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function handleQuizAnswer(questionIndex, choiceIndex) {
  const q = state.quizQuestions[questionIndex];
  if (q.userChoice !== null) return;

  q.userChoice = choiceIndex;
  q.isCorrect = (choiceIndex === q.correctIndex);
  if (q.isCorrect) state.quizScore++;

  renderCurrentView();

  setTimeout(() => {
    state.quizIndex++;
    if (state.quizIndex < state.quizQuestions.length) {
      renderCurrentView();
    } else {
      renderQuizResult();
    }
  }, 800);
}

function saveQuizAndExit() {
  localStorage.setItem('topik_quiz_state', JSON.stringify({
    questions: state.quizQuestions,
    index: state.quizIndex,
    score: state.quizScore,
    mode: state.quizMode
  }));
  goHome();
}

function renderQuizResult() {
  const total = state.quizQuestions.length;
  const score = state.quizScore;
  const wrongWords = state.quizQuestions.filter(q => !q.isCorrect).map(q => q.word);

  // 把错词加入错题集
  wrongWords.forEach(w => {
    if (!state.wrongWords.includes(w.korean)) {
      state.wrongWords.push(w.korean);
    }
  });

  elements.app.innerHTML = `
    <div>
      <header class="mb-6">
        <button onclick="goHome()" class="flex items-center text-coffee-400 hover:text-coffee-500 transition-colors">
          <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          返回首页
        </button>
      </header>

      <div class="text-center mb-8">
        <div class="text-5xl mb-4">${score === total ? '🏆' : score >= total/2 ? '👍' : '📚'}</div>
        <h1 class="text-2xl font-medium text-coffee-600 mb-2">测验完成！</h1>
        <p class="text-lg text-coffee-400">共 ${total} 题，答对 <span class="text-coffee-600 font-bold">${score}</span> 题</p>
        <p class="text-sm text-coffee-300 mt-1">正确率 ${Math.round((score/total)*100)}%</p>
      </div>

      ${wrongWords.length > 0 ? `
      <div class="bg-white rounded-3xl p-6 shadow-md border border-cream-300 mb-6">
        <h3 class="text-base font-medium text-coffee-600 mb-3">📝 需要复习的单词</h3>
        <div class="space-y-2">
          ${wrongWords.map(w => `
            <div class="flex items-center justify-between p-3 bg-cream-50 rounded-xl">
              <div><span class="font-medium text-coffee-600">${w.korean}</span><span class="text-sm text-coffee-400 ml-2">[${w.roman}]</span></div>
              <span class="text-sm text-coffee-500">${w.meaning}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : `
      <div class="text-center py-8 text-coffee-400"><p class="text-lg">🎉 全部答对，太棒了！</p></div>
      `}

      <div class="flex gap-3 justify-center flex-wrap">
        <button onclick="startQuiz()" class="px-6 py-3 bg-coffee-400 hover:bg-coffee-500 text-white rounded-2xl font-medium transition-all">再来一次</button>
        ${state.wrongWords.length > 0 ? `<button onclick="goToWrongWords()" class="px-6 py-3 bg-red-400 hover:bg-red-500 text-white rounded-2xl font-medium transition-all">📝 错题集 (${state.wrongWords.length})</button>` : ''}
        <button onclick="goHome()" class="px-6 py-3 bg-cream-200 hover:bg-cream-300 text-coffee-600 rounded-2xl font-medium transition-all">返回首页</button>
      </div>
    </div>
  `;
}

// ========== 错题集 ==========
async function goToWrongWords() {
  state.currentView = 'wrong';
  state.wrongViewMode = 'list';
  state.currentIndex = 0;
  await renderCurrentView();
}

async function renderWrongView() {
  if (state.wrongWords.length === 0) {
    elements.app.innerHTML = `
      <div>
        <header class="mb-6">
          <button onclick="goHome()" class="flex items-center text-coffee-400 hover:text-coffee-500 transition-colors">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            返回首页
          </button>
        </header>
        <div class="text-center py-12">
          <div class="text-5xl mb-4">🎉</div>
          <h2 class="text-lg font-medium text-coffee-600 mb-2">错题集为空</h2>
          <p class="text-sm text-coffee-400 mb-6">测验错题会在复习掌握后自动移除</p>
          <button onclick="goHome()" class="px-6 py-2 bg-coffee-400 text-white rounded-xl transition-colors">返回首页</button>
        </div>
      </div>
    `;
    return;
  }

  const wrongWordsList = [];
  for (const kw of state.wrongWords) {
    for (const setKey of sortedSetKeys) {
      const word = allVocabularySets[setKey]?.find(w => w.korean === kw);
      if (word) {
        if (wordProgress[word.id]?.status !== 'permanent') {
          wrongWordsList.push(word);
        }
        break;
      }
    }
  }

  if (wrongWordsList.length === 0) {
    state.wrongWords = [];
    await renderWrongView();
    return;
  }

  if (state.wrongViewMode === 'list') {
    elements.app.innerHTML = `
      <div>
        <header class="mb-6">
          <button onclick="goHome()" class="flex items-center text-coffee-400 hover:text-coffee-500 transition-colors">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            返回首页
          </button>
        </header>
        <h1 class="text-xl font-medium text-coffee-600 mb-4">📝 错题集 (${wrongWordsList.length}题)</h1>
        <div class="flex gap-2 mb-4">
          <button onclick="startWrongReview()" class="px-4 py-2 bg-coffee-400 text-white rounded-xl text-sm">🔁 开始复习</button>
          <button onclick="state.wrongWords=[];goHome();" class="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-sm">🗑 清空</button>
        </div>
        <div class="space-y-2">
          ${wrongWordsList.map(w => {
            const status = getWordStatus(w.id);
            const statusBadge = status === 'review' ? 'bg-amber-100 text-amber-600' : 'bg-cream-200 text-coffee-400';
            const statusText = status === 'review' ? '待复习' : '未学习';
            return `
              <div class="p-3 bg-white rounded-xl border border-cream-300 flex items-center justify-between">
                <div><span class="font-medium text-coffee-600">${w.korean}</span><span class="text-sm text-coffee-400 ml-2">${w.meaning}</span></div>
                <span class="text-xs px-2 py-0.5 rounded-full ${statusBadge}">${statusText}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}

function startWrongReview() {
  const wrongWordsList = [];
  for (const kw of state.wrongWords) {
    for (const setKey of sortedSetKeys) {
      const word = allVocabularySets[setKey]?.find(w => w.korean === kw);
      if (word && wordProgress[word.id]?.status !== 'permanent') {
        wrongWordsList.push(word);
        break;
      }
    }
  }
  if (wrongWordsList.length === 0) {
    state.wrongWords = [];
    goHome();
    return;
  }
  state.currentView = 'wrong';
  state.wrongViewMode = 'learn';
  state.currentQueue = wrongWordsList;
  state.currentIndex = 0;
  state.mode = 'new';
  renderLearnView();
}

// ========== 学习日历 ==========
function startCalendar() {
  state.currentView = 'calendar';
  state.selectedDate = null;
  renderCurrentView();
}

function changeCalendarMonth(delta) {
  state.calendarMonth += delta;
  if (state.calendarMonth > 12) {
    state.calendarMonth = 1;
    state.calendarYear++;
  } else if (state.calendarMonth < 1) {
    state.calendarMonth = 12;
    state.calendarYear--;
  }
  state.selectedDate = null;
  renderCurrentView();
}

function selectCalendarDate(dateStr) {
  state.selectedDate = dateStr;
  renderCurrentView();
}

function getWordsByDate(dateStr, type) {
  const words = [];
  for (const [wordId, progress] of Object.entries(wordProgress)) {
    let match = false;
    if (type === 'new' && progress.firstLearnedDate === dateStr) match = true;
    if (type === 'review' && progress.lastReviewDate === dateStr && progress.firstLearnedDate !== dateStr) match = true;
    if (type === 'permanent' && progress.permanentDate === dateStr) match = true;
    if (match) {
      for (const setKey of sortedSetKeys) {
        const w = allVocabularySets[setKey]?.find(w => w.id === wordId);
        if (w) {
          words.push(w);
          break;
        }
      }
    }
  }
  return words;
}

function getCalendarData(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = getToday();
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const newCount = Object.values(wordProgress).filter(p => p.firstLearnedDate === dateStr).length;
    const reviewCount = Object.values(wordProgress).filter(p => p.lastReviewDate === dateStr && p.firstLearnedDate !== dateStr).length;
    const permanentCount = Object.values(wordProgress).filter(p => p.permanentDate === dateStr).length;
    days.push({ day: d, dateStr, newCount, reviewCount, permanentCount, isToday: dateStr === today });
  }
  return { firstDay, days };
}

async function renderCalendarView() {
  const year = state.calendarYear;
  const month = state.calendarMonth;
  const { firstDay, days } = getCalendarData(year, month);

  let detailHTML = '';
  if (state.selectedDate) {
    const newWords = getWordsByDate(state.selectedDate, 'new');
    const reviewWords = getWordsByDate(state.selectedDate, 'review');
    const permanentWords = getWordsByDate(state.selectedDate, 'permanent');
    detailHTML = `
      <div class="bg-white rounded-2xl p-4 mt-4 space-y-3">
        ${newWords.length > 0 ? `
        <div>
          <h4 class="text-sm font-medium text-coffee-600 mb-2">📖 今日新学 (${newWords.length})</h4>
          <div class="flex flex-wrap gap-2">
            ${newWords.map(w => `<span class="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">${w.korean}</span>`).join('')}
          </div>
        </div>` : ''}
        ${reviewWords.length > 0 ? `
        <div>
          <h4 class="text-sm font-medium text-coffee-600 mb-2">🔁 今日复习 (${reviewWords.length})</h4>
          <div class="flex flex-wrap gap-2">
            ${reviewWords.map(w => `<span class="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">${w.korean}</span>`).join('')}
          </div>
        </div>` : ''}
        ${permanentWords.length > 0 ? `
        <div>
          <h4 class="text-sm font-medium text-coffee-600 mb-2">🏆 彻底掌握 (${permanentWords.length})</h4>
          <div class="flex flex-wrap gap-2">
            ${permanentWords.map(w => `<span class="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">${w.korean}</span>`).join('')}
          </div>
        </div>` : ''}
        ${newWords.length === 0 && reviewWords.length === 0 && permanentWords.length === 0 ? '<p class="text-sm text-coffee-400 text-center">当天没有学习记录</p>' : ''}
      </div>
    `;
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  elements.app.innerHTML = `
    <div>
      <header class="mb-6">
        <button onclick="goHome()" class="flex items-center text-coffee-400 hover:text-coffee-500 transition-colors">
          <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          返回首页
        </button>
      </header>
      <h1 class="text-xl font-medium text-coffee-600 mb-4">📅 学习日历</h1>

      <div class="flex items-center justify-between mb-4">
        <button onclick="changeCalendarMonth(-1)" class="p-2 rounded-full hover:bg-cream-200 transition-colors">
          <svg class="w-5 h-5 text-coffee-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span class="text-lg font-medium text-coffee-600">${year}年 ${month}月</span>
        <button onclick="changeCalendarMonth(1)" class="p-2 rounded-full hover:bg-cream-200 transition-colors">
          <svg class="w-5 h-5 text-coffee-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>

      <div class="bg-white rounded-3xl p-4 shadow-md border border-cream-300">
        <div class="grid grid-cols-7 gap-1 text-center text-sm text-coffee-400 mb-2">
          ${weekDays.map(d => `<div>${d}</div>`).join('')}
        </div>
        <div class="grid grid-cols-7 gap-1">
          ${Array.from({ length: firstDay }).map(() => '<div></div>').join('')}
          ${days.map(d => `
            <div class="p-1 cursor-pointer rounded-lg text-center ${d.isToday ? 'bg-cream-200' : 'hover:bg-cream-100'} ${state.selectedDate === d.dateStr ? 'ring-2 ring-coffee-400' : ''}" onclick="selectCalendarDate('${d.dateStr}')">
              <div class="text-sm font-medium text-coffee-600">${d.day}</div>
              <div class="flex justify-center gap-1 mt-0.5">
                ${d.newCount > 0 ? '<span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>' : ''}
                ${d.reviewCount > 0 ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>' : ''}
                ${d.permanentCount > 0 ? '<span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>' : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      ${detailHTML}
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

  const isReview = state.mode === 'review';
  const isBookmarks = state.currentView === 'bookmarks';
  let queue;

  if (isBookmarks) {
    queue = state.currentQueue;
  } else if (isReview) {
    queue = await getWordsToReviewToday();
  } else {
    queue = state.currentQueue;
  }

  const currentWord = queue[state.currentIndex];
  if (!currentWord) return;

  const today = getToday();

  if (action === 'mastered') {
    if (!wordProgress[currentWord.id] || wordProgress[currentWord.id].status !== 'mastered') {
      wordProgress[currentWord.id] = {
        status: 'mastered',
        firstLearnedDate: today,
        lastReviewDate: today,
        nextReviewDate: addDays(today, 1),
        reviewCount: 0
      };
    } else {
      wordProgress[currentWord.id].reviewCount++;
      wordProgress[currentWord.id].lastReviewDate = today;
      wordProgress[currentWord.id].nextReviewDate = addDays(
        today,
        [1, 2, 4, 7, 15, 30][Math.min(wordProgress[currentWord.id].reviewCount, 5)]
      );
    }

    queue.splice(state.currentIndex, 1);

    if (queue.length === 0) {
      saveToStorage();
      showCompletionModal();
      return;
    }

    // 如果是错题复习模式，掌握后从错题集移除
    if (state.currentView === 'wrong' && state.wrongViewMode === 'learn') {
      state.wrongWords = state.wrongWords.filter(kw => kw !== currentWord.korean);
    }

    if (state.currentIndex >= queue.length) {
      state.currentIndex = 0;
    }
  } else if (action === 'permanent') {
    wordProgress[currentWord.id] = {
      status: 'permanent',
      firstLearnedDate: wordProgress[currentWord.id]?.firstLearnedDate || today,
      lastReviewDate: wordProgress[currentWord.id]?.lastReviewDate || today,
      permanentDate: today,
      nextReviewDate: null,
      reviewCount: 0
    };

    queue.splice(state.currentIndex, 1);

    if (queue.length === 0) {
      saveToStorage();
      showCompletionModal();
      return;
    }

    // 如果是错题复习模式，掌握后从错题集移除
    if (state.currentView === 'wrong' && state.wrongViewMode === 'learn') {
      state.wrongWords = state.wrongWords.filter(kw => kw !== currentWord.korean);
    }

    if (state.currentIndex >= queue.length) {
      state.currentIndex = 0;
    }
  } else if (action === 'review') {
    if (!wordProgress[currentWord.id]) {
      wordProgress[currentWord.id] = {};
    }
    wordProgress[currentWord.id].lastReviewDate = today;
    queue.splice(state.currentIndex, 1);
    queue.push(currentWord);
  }

  saveToStorage();
  resetCard();
  renderCurrentView();
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
  saveToStorage();
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
let searchTimer = null;
function debounceSearch(keyword) {
  clearTimeout(searchTimer);
  state.searchKeyword = keyword.trim();
  searchTimer = setTimeout(() => {
    renderCurrentView();
  }, 500);
}

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

// ========== 页面跳转 ==========
function goHome() {
  clearTimeout(searchTimer);
  state.currentView = 'home';
  state.currentIndex = 0;
  state.searchKeyword = '';  //【修改】清空搜索词
  renderCurrentView();
}

function goToOverview() {
  clearTimeout(searchTimer);
  state.currentView = 'overview';
  state.selectedFilter = 'all';
  state.searchKeyword = '';  //【修改】清空搜索词
  state.targetWord = null;
  renderCurrentView();
}

async function goToBookmarks() {
  const words = await getBookmarkedWords();
  if (words.length === 0) {
    goHome();
    return;
  }
  state.currentView = 'bookmarks';
  state.currentQueue = words;
  state.currentIndex = 0;
  renderCurrentView();
}

function startLearnNew() {
  state.mode = 'new';
  state.currentView = 'learn';
  state.currentIndex = 0;
  state.currentQueue = [];
  initializeLearnQueue();

  if (state.currentQueue.length === 0) {
    showCompletionModal();
    return;
  }
  renderCurrentView();
}

async function startReview() {
  const reviewWords = await getWordsToReviewToday();
  if (reviewWords.length === 0) {
    goHome();
    return;
  }
  state.mode = 'review';
  state.currentView = 'review';
  state.currentQueue = reviewWords;
  state.currentIndex = 0;
  renderCurrentView();
}

// ========== 卡片翻转 ==========
function flipCard() {
  const card = document.getElementById('flashcard');
  if (card) card.classList.toggle('is-flipped');
}

function resetCard() {
  const card = document.getElementById('flashcard');
  if (card) card.classList.remove('is-flipped');
}

// ========== 语音朗读（三重保障） ==========
async function speakWord(text) {
  // 1. 尝试原生 TTS
  if (hasKoreanVoice()) {
    speakWithNative(text);
    return;
  }

  // 2. 尝试 Google TTS（通过 fetch 加载，更可靠）
  const success = await speakWithGoogleTTS(text);
  if (success) return;

  // 3. 都失败了，给出明确提示
  showToast('当前浏览器不支持朗读', 3000);
}

// 检测是否有韩语语音
function hasKoreanVoice() {
  if (!('speechSynthesis' in window)) return false;
  const voices = window.speechSynthesis.getVoices();
  return voices.some(v => v.lang.includes('ko') || v.lang.includes('Korean'));
}

// 原生 TTS 播放
function speakWithNative(text) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 0.8;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  const koreanVoice = voices.find(v => v.lang.includes('ko') || v.lang.includes('Korean'));
  if (koreanVoice) utterance.voice = koreanVoice;

  window.speechSynthesis.speak(utterance);
}

// Google TTS 播放（返回 Promise<boolean>）
async function speakWithGoogleTTS(text) {
  try {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ko&client=tw-ob`;
    const response = await fetch(url);
    if (!response.ok) return false;

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    // 等待播放完毕或失败
    await new Promise((resolve, reject) => {
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play().catch(reject);
    });

    return true;
  } catch (e) {
    console.warn('Google TTS 播放失败:', e);
    return false;
  }
}

// Toast 提示（可自定义时长）
function showToast(msg, duration = 1000) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #6B5B45;
    color: white;
    padding: 10px 24px;
    border-radius: 24px;
    font-size: 14px;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s;
    text-align: center;
    width: max-content;
    max-width: 95vw;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => (toast.style.opacity = '1'));
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ========== 弹窗 ==========
function showCompletionModal() {
  const modal = document.getElementById('completion-modal');
  if (!modal) return;

  // 根据当前模式调整弹窗按钮
  const isReviewMode = state.mode === 'review' || state.currentView === 'review';
  const loadNewSetBtn = modal.querySelector('#load-new-set-btn');
  const resetBtn = modal.querySelector('#reset-current-set-btn');

  if (loadNewSetBtn) {
    // 复习模式下隐藏“背诵下一套单词”按钮
    loadNewSetBtn.style.display = isReviewMode ? 'none' : '';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCompletionModal() {
  const modal = document.getElementById('completion-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function dismissCompletionModal() {
  closeCompletionModal();
  goHome();   // 直接返回首页，避免卡在空白进度页
}

function resetCurrentSet() {
  const words = allVocabularySets[state.currentSetKey] || [];
  words.forEach(w => delete wordProgress[w.id]);
  state.currentIndex = 0;
  saveToStorage();
  closeCompletionModal();
  startLearnNew();
}

function loadNewSet() {
  // 复习模式下不允许跳转
  if (state.mode === 'review' || state.currentView === 'review') {
    closeCompletionModal();
    goHome();
    return;
  }

  if (sortedSetKeys.length === 0) {
    closeCompletionModal();
    goHome();
    return;
  }

  const currentKeyIndex = sortedSetKeys.indexOf(state.currentSetKey);
  const nextKeyIndex = (currentKeyIndex + 1) % sortedSetKeys.length;
  const nextSetKey = sortedSetKeys[nextKeyIndex];

  state.currentSetKey = nextSetKey;
  state.currentSet = parseInt(nextSetKey, 10) || 1;

  const words = allVocabularySets[nextSetKey] || [];
  words.forEach(w => delete wordProgress[w.id]);

  state.currentIndex = 0;
  saveToStorage();
  closeCompletionModal();
  startLearnNew();
}

function showResetConfirm() {
  const modal = document.getElementById('reset-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeResetModal() {
  const modal = document.getElementById('reset-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function confirmReset() {
  closeResetModal();
  resetCurrentSet();
}

function resetAllProgress() {
  if (window.confirm('确定要清空所有学习记录和收藏吗？此操作不可撤销。')) {
    wordProgress = {};
    bookmarkedWords = [];
    state.currentSet = 1;
    state.currentSetKey = '1';
    state.currentIndex = 0;
    state.currentQueue = [];
    saveToStorage();
    goHome();
  }
}

function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  if (state.darkMode) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
  localStorage.setItem('topik_dark_mode', state.darkMode.toString());
  renderCurrentView(); // 重新渲染以更新按钮图标
}

// ========== 键盘支持 ==========
function setupKeyboard() {
  document.addEventListener('keydown', async (e) => {
    if (state.currentView !== 'learn' && state.currentView !== 'review' && state.currentView !== 'bookmarks') return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        flipCard();
        break;
      case 'Enter':
        e.preventDefault();
            flipCard();
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        handleAction('review');
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        handleAction('mastered');
        break;
      case 'p':
      case 'P':
        e.preventDefault();
        handleAction('permanent');
       break;
      case 'd':
      case 'D':
      case 's':
      case 'S':
        e.preventDefault();
        {
          let queue;
          if (state.currentView === 'bookmarks') {
            queue = state.currentQueue;
          } else if (state.mode === 'review') {
            queue = await getWordsToReviewToday();
          } else {
            queue = state.currentQueue;
          }
          if (queue[state.currentIndex]) {
            speakWord(queue[state.currentIndex].korean);
          }
        }
        break;
      case 'b':
      case 'B':
        e.preventDefault();
        {
          let q;
          if (state.currentView === 'bookmarks') {
            q = state.currentQueue;
          } else if (state.mode === 'review') {
            q = await getWordsToReviewToday();
          } else {
            q = state.currentQueue;
          }
          if (q[state.currentIndex]) {
            toggleBookmark(q[state.currentIndex].id);
          }
        }
        break;
      case 'ArrowLeft':
        if (state.currentView === 'bookmarks') {
          e.preventDefault();
          prevBookmarkWord();
        }
        break;
      case 'ArrowRight':
        if (state.currentView === 'bookmarks') {
          e.preventDefault();
          nextBookmarkWord();
        }
        break;
      case 'Escape':
        goHome();
        break;
    }
  });
}

// 收藏本切换上一个单词
function prevBookmarkWord() {
  const total = state.currentQueue.length;
  if (total <= 1) return;
  state.currentIndex = state.currentIndex - 1;
  if (state.currentIndex < 0) state.currentIndex = total - 1;
  resetCard();
  renderCurrentView();
}

// 收藏本切换下一个单词
function nextBookmarkWord() {
  const total = state.currentQueue.length;
  if (total <= 1) return;
  state.currentIndex = state.currentIndex + 1;
  if (state.currentIndex >= total) state.currentIndex = 0;
  resetCard();
  renderCurrentView();
}

// ========== 全局导出 ==========
window.goHome = goHome;
window.goToOverview = goToOverview;
window.goToBookmarks = goToBookmarks;
window.startLearnNew = startLearnNew;
window.startReview = startReview;
window.flipCard = flipCard;
window.handleAction = handleAction;
window.speakWord = speakWord;
window.toggleBookmark = toggleBookmark;
window.setFilter = setFilter;
window.debounceSearch = debounceSearch;
window.startLearnWord = startLearnWord;
window.closeCompletionModal = closeCompletionModal;
window.resetCurrentSet = resetCurrentSet;
window.loadNewSet = loadNewSet;
window.showResetConfirm = showResetConfirm;
window.confirmReset = confirmReset;
window.prevBookmarkWord = prevBookmarkWord;
window.nextBookmarkWord = nextBookmarkWord;
window.dismissCompletionModal = dismissCompletionModal;
window.exportProgress = exportProgress;
window.importProgress = importProgress;
window.resetAllProgress = resetAllProgress;
window.showToast = showToast;
window.setLevelFilter = setLevelFilter;
window.startQuiz = startQuiz;
window.handleQuizAnswer = handleQuizAnswer;
window.goToWrongWords = goToWrongWords;
window.startWrongReview = startWrongReview;
window.startCalendar = startCalendar;
window.changeCalendarMonth = changeCalendarMonth;
window.selectCalendarDate = selectCalendarDate;
window.showQuizModePicker = showQuizModePicker;
window.saveQuizAndExit = saveQuizAndExit;
window.onQuizModeSelected = onQuizModeSelected;
window.showQuizResumeDialog = showQuizResumeDialog;
window.toggleDarkMode = toggleDarkMode;

// ========== 语音初始化 ==========
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

// ========== 样式注入 ==========
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  :root {
    --bg-primary: #FFF9F0;
    --bg-secondary: #FFFEFA;
    --bg-card: #FFFFFF;
    --bg-card-hover: #FFF5E6;
    --bg-muted: #F5EBE0;
    --bg-overlay: rgba(107, 91, 69, 0.3);
    --text-primary: #6B5B45;
    --text-secondary: #8B7355;
    --text-muted: #B8A89A;
    --text-on-primary: #FFFFFF;
    --border-color: #F5EBE0;
    --border-strong: #E8DDD4;
    --shadow-color: rgba(107, 91, 69, 0.08);
    --accent-coffee: #8B7355;
    --accent-green: #22C55E;
    --accent-amber: #F59E0B;
    --accent-red: #EF4444;
    --accent-blue: #60A5FA;
    --accent-purple: #A78BFA;
    --progress-bg: #F5EBE0;
  }

  body.dark {
    --bg-primary: #1A1A2E;
    --bg-secondary: #16213E;
    --bg-card: #0F3460;
    --bg-card-hover: #1A1A40;
    --bg-muted: #2A2A4A;
    --bg-overlay: rgba(0, 0, 0, 0.6);
    --text-primary: #E0D5C1;
    --text-secondary: #C9B8A8;
    --text-muted: #9A8A7A;
    --text-on-primary: #FFFFFF;
    --border-color: #2A2A4A;
    --border-strong: #3A3A5A;
    --shadow-color: rgba(0, 0, 0, 0.3);
    --accent-coffee: #A89880;
    --accent-green: #4ADE80;
    --accent-amber: #FBBF24;
    --accent-red: #F87171;
    --accent-blue: #818CF8;
    --accent-purple: #C084FC;
    --progress-bg: #2A2A4A;
  }

  /* 全局应用变量 */
  body {
    background: linear-gradient(to bottom, var(--bg-primary), var(--bg-secondary));
    color: var(--text-primary);
  }

  #app {
    color: var(--text-primary);
  }

  .home-card {
    background: var(--bg-card);
    border-color: var(--border-strong);
    box-shadow: 0 4px 6px var(--shadow-color);
  }

  .home-card:hover {
    box-shadow: 0 10px 20px var(--shadow-color);
  }

  button {
    color: inherit;
  }

  /* 原来的其他样式保持不变，但把颜色相关换成变量 */
  .bg-cream-100 { background-color: var(--bg-primary) !important; }
  .bg-cream-200 { background-color: var(--bg-muted) !important; }
  .bg-cream-300 { background-color: var(--border-color) !important; }
  .bg-white { background-color: var(--bg-card) !important; }
  .bg-coffee-400 { background-color: var(--accent-coffee) !important; }
  .bg-coffee-500 { background-color: var(--text-secondary) !important; }
  .bg-green-500 { background-color: var(--accent-green) !important; }
  .bg-amber-500 { background-color: var(--accent-amber) !important; }
  .bg-red-400 { background-color: var(--accent-red) !important; }
  .bg-red-50 { background-color: rgba(239, 68, 68, 0.1) !important; }
  .bg-blue-400 { background-color: var(--accent-blue) !important; }
  .bg-purple-400 { background-color: var(--accent-purple) !important; }
  .bg-yellow-100 { background-color: rgba(251, 191, 36, 0.2) !important; }
  .bg-green-100 { background-color: rgba(34, 197, 94, 0.2) !important; }
  .bg-amber-100 { background-color: rgba(245, 158, 11, 0.2) !important; }
  .bg-cream-50 { background-color: var(--bg-card-hover) !important; }
  .bg-coffee-50 { background-color: rgba(139, 115, 85, 0.1) !important; }
  .bg-amber-50 { background-color: rgba(245, 158, 11, 0.1) !important; }
  .bg-green-50 { background-color: rgba(34, 197, 94, 0.1) !important; }
  .bg-purple-50 { background-color: rgba(167, 139, 250, 0.1) !important; }

  .text-coffee-600 { color: var(--text-primary) !important; }
  .text-coffee-500 { color: var(--text-secondary) !important; }
  .text-coffee-400 { color: var(--text-muted) !important; }
  .text-coffee-300 { color: var(--text-muted) !important; }
  .text-white { color: var(--text-on-primary) !important; }
  .text-green-600 { color: var(--accent-green) !important; }
  .text-amber-600 { color: var(--accent-amber) !important; }
  .text-red-500 { color: var(--accent-red) !important; }
  .text-yellow-600 { color: #D97706 !important; }
  .text-blue-600 { color: var(--accent-blue) !important; }
  .text-purple-600 { color: var(--accent-purple) !important; }

  .border-cream-300 { border-color: var(--border-color) !important; }
  .border-cream-200 { border-color: var(--border-strong) !important; }

  .from-cream-100 { --tw-gradient-from: var(--bg-primary); }
  .to-cream-200 { --tw-gradient-to: var(--bg-secondary); }
  .from-coffee-400 { --tw-gradient-from: var(--accent-coffee); }
  .to-coffee-500 { --tw-gradient-to: var(--text-secondary); }

  .bg-gradient-to-b {
    background-image: linear-gradient(to bottom, var(--tw-gradient-stops));
  }

  /* 保留原来的动画等样式... (不需要改动) */

  .flashcard {
    transition: transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
    transform-style: preserve-3d;
  }
  .flashcard.is-flipped {
    transform: rotateY(180deg);
  }
  .backface-hidden {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  .rotate-y-180 {
    transform: rotateY(180deg);
  }
  .perspective-container {
    perspective: 1200px;
    perspective-origin: center;
  }
  .card-hover {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  @media (hover: hover) and (pointer: fine) {
    #flashcard:hover .flashcard-front.card-hover {
      transform: translateY(-6px);
      box-shadow: 0 20px 40px var(--shadow-color);
    }
    #flashcard:hover .flashcard-back.card-hover {
      transform: translateY(-6px) rotateY(180deg);
      box-shadow: 0 20px 40px var(--shadow-color);
    }
  }
  .speaker-btn:hover svg {
    color: var(--text-secondary);
  }
  .speaker-wrapper {
    z-index: 20;
  }
  .action-btn {
    position: relative;
    overflow: hidden;
  }
  .action-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s;
  }
  .action-btn:hover::after {
    transform: translateX(100%);
  }
  .home-card:active {
    transform: scale(0.98);
  }
  @media (prefers-reduced-motion: reduce) {
    .flashcard, .action-btn, .card-hover, .fade-in {
      transition: none;
      animation: none;
    }
  }
  #app {
    transform: translateZ(0);
    will-change: contents;
  }
  #search-input {
    transform: translateZ(0);
    will-change: border-color;
    background: var(--bg-card);
    color: var(--text-primary);
    border-color: var(--border-strong);
  }
  #search-input::placeholder {
    color: var(--text-muted);
  }
  /* Toast 提示背景 */
  .toast-bg {
    background: var(--text-secondary);
  }
`;
document.head.appendChild(styleSheet);

// ========== 启动 ==========
document.addEventListener('DOMContentLoaded', init);
