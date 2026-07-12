// TOPIK - 主程序 v10.0

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
  spellWords: [],
  spellIndex: 0,
  spellScore: 0,
  spellResults: [],
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
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
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
      saveToStorageDebounced();
      console.log('收藏格式已迁移到 korean');
    } else {
      // 如果旧收藏全都找不到对应单词，清空收藏本
      bookmarkedWords = [];
      saveToStorageDebounced();
    }
  }

    // 如果 URL 带有 hash，恢复对应视图（用于刷新停留在当前页面）
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== 'home' && hash !== '') {
      state.currentView = hash;
    }
  // 如果恢复到测验页面，从 localStorage 恢复数据
  if (state.currentView === 'quiz') {
    const savedQuiz = localStorage.getItem('topik_quiz_state');
    if (savedQuiz) {
      try {
        const qs = JSON.parse(savedQuiz);
        if (qs.questions && qs.questions.length > 0 && qs.index < qs.questions.length) {
          state.quizQuestions = qs.questions;
          state.quizIndex = qs.index || 0;
          state.quizScore = qs.score || 0;
          state.quizMode = qs.mode || 'today';
        } else {
          state.currentView = 'home';
        }
      } catch (e) {
        state.currentView = 'home';
      }
    } else {
      state.currentView = 'home';
    }
  }

  // 如果恢复到拼写页面，从 localStorage 恢复数据
  if (state.currentView === 'spell') {
    const savedSpell = localStorage.getItem('topik_spell_state');
    if (savedSpell) {
      try {
        const ss = JSON.parse(savedSpell);
        if (ss.words && ss.words.length > 0 && ss.index < ss.words.length) {
          state.spellWords = ss.words;
          state.spellIndex = ss.index || 0;
          state.spellScore = ss.score || 0;
          state.spellResults = ss.results || [];
          state.spellMode = ss.mode || 'today';
        } else {
          state.currentView = 'home';
        }
      } catch (e) {
        state.currentView = 'home';
      }
    } else {
      state.currentView = 'home';
    }
  }

  syncCurrentSetKey();
  setupElements();
  await renderCurrentView();
  setupKeyboard();
  if (loading) loading.style.display = 'none';
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
    const savedWrong = localStorage.getItem('topik_wrong_words');

    if (savedProgress) wordProgress = JSON.parse(savedProgress) || {};
    if (savedSet) state.currentSet = parseInt(savedSet, 10) || 1;
    if (savedBookmarks) bookmarkedWords = JSON.parse(savedBookmarks) || [];
    if (savedWrong) state.wrongWords = JSON.parse(savedWrong) || [];
  } catch (e) {
    console.warn('加载存储失败:', e);
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.wordProgress, JSON.stringify(wordProgress));
    localStorage.setItem(STORAGE_KEYS.currentSet, state.currentSet.toString());
    localStorage.setItem(STORAGE_KEYS.bookmarkedWords, JSON.stringify(bookmarkedWords));
    localStorage.setItem('topik_wrong_words', JSON.stringify(state.wrongWords));
  } catch (e) {
    console.warn('保存存储失败:', e);
    showToast('⚠️ 进度保存失败，请检查浏览器存储空间或隐私设置', 3000);
  }
}

const saveToStorageDebounced = debounce(saveToStorage, 300);

function exportProgress() {
  const data = {
    wordProgress: wordProgress,
    currentSet: state.currentSet,
    bookmarkedWords: bookmarkedWords,
    wrongWords: state.wrongWords
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
      if (data.wrongWords) state.wrongWords = data.wrongWords;
      saveToStorage();
      alert('进度已导入，页面将刷新。');
      location.reload();
    } catch (err) {
      alert('导入失败，请检查文件格式。');
    }
  };
  input.click();
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

  // 同步 URL hash 与当前视图（刷新时用于恢复）
  const targetHash = state.currentView === 'home' ? '' : `#${state.currentView}`;
  if (window.location.hash !== targetHash) {
    history.replaceState({ view: state.currentView }, '', targetHash);
  }

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
    case 'spell': await renderSpellView(); break;
    case 'calendar': await renderCalendarView(); break;
  }
}

// ========== 加载失败提示 ==========
function renderLoadError() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
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
// ========== 页面跳转 ==========
function goHome() {
  state.currentView = 'home';
  state.currentIndex = 0;
  state.searchKeyword = '';  //【修改】清空搜索词
  history.replaceState({ view: 'home' }, '', window.location.pathname);
  renderCurrentView();
}
  
function goToOverview() {
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

// ========== 夜间模式 ==========
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
  
// ========== 浏览器后退支持（手机侧滑返回） ==========
  window.addEventListener('popstate', (e) => {
    const view = (e.state && e.state.view) ? e.state.view : 'home';
    state.currentView = view;
    renderCurrentView();
  });
  
// ========== 语音初始化 ==========
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
  
// ========== 启动 ==========
  document.addEventListener('DOMContentLoaded', init);
