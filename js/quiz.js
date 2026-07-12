// ========== 选择模式 ==========
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
  const shuffled = shuffle(words);
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
      <h3 class="text-lg font-medium text-coffee-600 text-center mb-4">选择练习模式</h3>
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
      // 不删除存档，也不自动开始新测验
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
    // 保存进度（此时 index 已指向下一题）
    localStorage.setItem('topik_quiz_state', JSON.stringify({
      questions: state.quizQuestions,
      index: state.quizIndex,
      score: state.quizScore,
      mode: state.quizMode
    }));

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
  showToast('测验进度已保存', 1500);
  goHome();
}

function renderQuizResult() {
  localStorage.removeItem('topik_quiz_state');
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

function showSpellModePicker() {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-coffee-600/30 backdrop-blur-sm';
  overlay.innerHTML = `
    <div class="bg-cream-100 rounded-3xl shadow-2xl p-6 w-[90%] max-w-sm border border-cream-300 fade-in">
      <h3 class="text-lg font-medium text-coffee-600 text-center mb-4">选择练习范围</h3>
      <div class="space-y-3">
        <button class="spell-mode-btn w-full px-4 py-3 bg-white border border-cream-300 rounded-2xl text-left hover:bg-cream-50 transition-colors" data-mode="today">
          <div class="font-medium text-coffee-600">📖 今日学习 <span class="text-xs text-green-500 ml-1">推荐</span></div>
          <div class="text-xs text-coffee-400 mt-0.5">当前套装 + 待复习词汇</div>
        </button>
        <button class="spell-mode-btn w-full px-4 py-3 bg-white border border-cream-300 rounded-2xl text-left hover:bg-cream-50 transition-colors" data-mode="primary">
          <div class="font-medium text-coffee-600">📗 初级专练</div>
          <div class="text-xs text-coffee-400 mt-0.5">仅初级词汇 (set 1-90)</div>
        </button>
        <button class="spell-mode-btn w-full px-4 py-3 bg-white border border-cream-300 rounded-2xl text-left hover:bg-cream-50 transition-colors" data-mode="intermediate">
          <div class="font-medium text-coffee-600">📘 中级专练</div>
          <div class="text-xs text-coffee-400 mt-0.5">仅中级词汇 (set 91-272)</div>
        </button>
        <button class="spell-mode-btn w-full px-4 py-3 bg-white border border-cream-300 rounded-2xl text-left hover:bg-cream-50 transition-colors" data-mode="all">
          <div class="font-medium text-coffee-600">🌐 全部混合</div>
          <div class="text-xs text-coffee-400 mt-0.5">所有未掌握词汇</div>
        </button>
      </div>
      <button class="w-full mt-4 px-4 py-2 bg-cream-200 hover:bg-cream-300 text-coffee-500 rounded-xl text-sm transition-colors" id="cancel-spell-picker">
        取消
      </button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('#cancel-spell-picker').addEventListener('click', () => overlay.remove());
  overlay.querySelectorAll('.spell-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      overlay.remove();
      onSpellModeSelected(mode);
    });
  });
}

function onSpellModeSelected(mode) {
  const saved = localStorage.getItem('topik_spell_state');
  if (saved) {
    try {
      const spellState = JSON.parse(saved);
      if (spellState.words && spellState.words.length > 0 && spellState.index < spellState.words.length) {
        showSpellResumeDialog(mode, spellState);
        return;
      }
    } catch (e) {
      localStorage.removeItem('topik_spell_state');
    }
  }
  startSpell(mode);
}

function showSpellResumeDialog(newMode, savedState) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-coffee-600/30 backdrop-blur-sm';
  overlay.innerHTML = `
    <div class="bg-cream-100 rounded-3xl shadow-2xl p-6 w-[90%] max-w-sm border border-cream-300 fade-in text-center">
      <div class="text-4xl mb-4">📋</div>
      <h3 class="text-lg font-medium text-coffee-600 mb-2">检测到未完成的测验</h3>
      <p class="text-sm text-coffee-400 mb-6">
        上次进度：第 ${savedState.index + 1}/${savedState.words.length} 题，
        已拼对 ${savedState.score} 题
      </p>
      <div class="space-y-3">
        <button class="w-full px-4 py-3 bg-coffee-400 hover:bg-coffee-500 text-white rounded-2xl font-medium transition-all" id="resume-spell-btn">
          继续上次测验
        </button>
        <button class="w-full px-4 py-3 bg-cream-200 hover:bg-cream-300 text-coffee-600 rounded-2xl font-medium transition-all border border-cream-300" id="new-spell-btn">
          开始新测验
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#resume-spell-btn').addEventListener('click', () => {
    overlay.remove();
    state.spellWords = savedState.words;
    state.spellIndex = savedState.index;
    state.spellScore = savedState.score;
    state.spellResults = savedState.results || [];
    state.spellMode = savedState.mode || 'today';
    state.currentView = 'spell';
    renderCurrentView();
  });

  overlay.querySelector('#new-spell-btn').addEventListener('click', () => {
    overlay.remove();
    localStorage.removeItem('topik_spell_state');
    startSpell(newMode);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      // 不删除存档，也不自动开始新测验，让用户下次再选择
    }
  });
}

function startSpell(mode) {
  // 复用 startQuiz 的选词逻辑
  let words = [];
  const today = getToday();

  const currentSetWords = (allVocabularySets[state.currentSetKey] || []).filter(w => {
    const p = wordProgress[w.id];
    return !p || p.status !== 'permanent';
  });

  const reviewWords = [];
  for (const [wordId, progress] of Object.entries(wordProgress)) {
    if (progress.status === 'mastered' && progress.nextReviewDate && progress.nextReviewDate <= today) {
      for (const setKey of sortedSetKeys) {
        const w = allVocabularySets[setKey]?.find(w => w.id === wordId);
        if (w && !reviewWords.some(rw => rw.id === w.id)) { reviewWords.push(w); break; }
      }
    }
  }

  const primaryWords = [];
  const intermediateWords = [];
  for (const setKey of sortedSetKeys) {
    const setNumber = parseInt(setKey, 10);
    const ws = (allVocabularySets[setKey] || []).filter(w => {
      const p = wordProgress[w.id];
      return !p || p.status !== 'permanent';
    });
    if (setNumber <= 90) primaryWords.push(...ws);
    else intermediateWords.push(...ws);
  }

  switch (mode) {
    case 'today':
      const todayMap = new Map();
      currentSetWords.forEach(w => todayMap.set(w.id, w));
      reviewWords.forEach(w => todayMap.set(w.id, w));
      words = Array.from(todayMap.values());
      break;
    case 'primary': words = primaryWords; break;
    case 'intermediate': words = intermediateWords; break;
    case 'all': words = [...primaryWords, ...intermediateWords]; break;
    default: words = currentSetWords;
  }

  if (words.length === 0) {
    showToast('没有可练习的单词，请先学习一些单词。', 2000);
    return;
  }

  const shuffled = shuffle(words);
  state.spellWords = shuffled.slice(0, Math.min(10, shuffled.length));
  state.spellMode = mode;
  state.spellIndex = 0;
  state.spellScore = 0;
  state.spellResults = [];
  localStorage.removeItem('topik_spell_state');
  state.currentView = 'spell';
  renderCurrentView();
}

async function renderSpellView() {
  if (!state.spellWords || state.spellWords.length === 0) { goHome(); return; }
  if (state.spellIndex >= state.spellWords.length) { renderSpellResult(); return; }

  const currentWord = state.spellWords[state.spellIndex];
  const lastResult = state.spellResults[state.spellResults.length - 1];

  elements.app.innerHTML = `
    <div>
      <header class="mb-6">
        <div class="flex items-center justify-between">
          <button onclick="goHome()" class="flex items-center text-coffee-400 hover:text-coffee-500 transition-colors">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            返回首页
          </button>
          <button onclick="saveSpellAndExit()" class="text-xs px-3 py-1 bg-cream-200 hover:bg-cream-300 text-coffee-600 rounded-full transition">
            💾 保存并退出
          </button>
        </div>
      </header>

      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h1 class="text-lg font-medium text-coffee-600">✍️ 拼写挑战</h1>
          <span class="text-sm text-coffee-400">第 ${state.spellIndex + 1}/${state.spellWords.length} 题</span>
        </div>
        <div class="bg-cream-300 rounded-full h-3 overflow-hidden shadow-inner">
          <div class="h-full bg-gradient-to-r from-coffee-400 to-coffee-500 rounded-full transition-all duration-500" style="width: ${(state.spellIndex / state.spellWords.length) * 100}%"></div>
        </div>
      </div>

      <div class="bg-white rounded-3xl p-6 shadow-md border border-cream-300 mb-6">
        <p class="text-center text-coffee-400 text-sm mb-2">다음 뜻에 해당하는 한국어 단어는?</p>
        <p class="text-center text-3xl font-medium text-coffee-600 mb-8">${currentWord.meaning}</p>
        ${lastResult ? `
        <div class="mb-4 p-3 rounded-xl ${lastResult.isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} text-sm text-center">
          ${lastResult.isCorrect ? '✅ 上一题正确！' : `❌ 上一题错误！正确答案：${lastResult.word.korean}`}
        </div>` : ''}
        <input type="text" id="spell-input" autocomplete="off" autofocus
               class="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-xl text-coffee-600 text-lg text-center focus:outline-none focus:border-coffee-400 transition-colors"
               placeholder="输入韩文单词...">
        <button onclick="submitSpellAnswer()" class="w-full mt-3 px-4 py-3 bg-coffee-400 hover:bg-coffee-500 text-white rounded-2xl font-medium transition-all">
          提交
        </button>
      </div>
    </div>
  `;

  // 自动聚焦输入框
  setTimeout(() => {
    const input = document.getElementById('spell-input');
    if (input) input.focus();
  }, 100);
}

function submitSpellAnswer() {
  const input = document.getElementById('spell-input');
  if (!input) return;
  const userAnswer = input.value.trim();
  if (!userAnswer) { showToast('请输入韩文单词', 1500); return; }

  const currentWord = state.spellWords[state.spellIndex];
  const isCorrect = userAnswer === currentWord.korean;

  state.spellResults.push({ word: currentWord, userAnswer, isCorrect });
  if (isCorrect) state.spellScore++;

  // 删除这里原有的保存

  state.spellIndex++;

  // 保存进度（此时 index 已指向下一题）
  localStorage.setItem('topik_spell_state', JSON.stringify({
    words: state.spellWords,
    index: state.spellIndex,
    score: state.spellScore,
    results: state.spellResults,
    mode: state.spellMode
  }));

  if (state.spellIndex < state.spellWords.length) {
    renderCurrentView();
  } else {
    renderSpellResult();
  }
}

function renderSpellResult() {
  localStorage.removeItem('topik_spell_state');
  const total = state.spellWords.length;
  const score = state.spellScore;
  const wrongResults = state.spellResults.filter(r => !r.isCorrect);

  // 错词加入错题集
  wrongResults.forEach(r => {
    if (!state.wrongWords.includes(r.word.korean)) {
      state.wrongWords.push(r.word.korean);
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
        <p class="text-lg text-coffee-400">共 ${total} 题，拼对 <span class="text-coffee-600 font-bold">${score}</span> 题</p>
        <p class="text-sm text-coffee-300 mt-1">正确率 ${Math.round((score/total)*100)}%</p>
      </div>

      ${wrongResults.length > 0 ? `
      <div class="bg-white rounded-3xl p-6 shadow-md border border-cream-300 mb-6">
        <h3 class="text-base font-medium text-coffee-600 mb-3">📝 需要复习的单词</h3>
        <div class="space-y-2">
          ${wrongResults.map(r => `
            <div class="p-3 bg-cream-50 rounded-xl">
              <div class="flex items-center justify-between">
                <span class="font-medium text-coffee-600">${r.word.korean}</span>
                <span class="text-sm text-coffee-400">${r.word.meaning}</span>
              </div>
              <p class="text-xs text-red-400 mt-1">你的输入：${r.userAnswer}</p>
            </div>
          `).join('')}
        </div>
      </div>
      ` : `
      <div class="text-center py-8 text-coffee-400"><p class="text-lg">🎉 全部拼对，太棒了！</p></div>
      `}

      <div class="flex gap-3 justify-center flex-wrap">
        <button onclick="startSpell('today')" class="px-6 py-3 bg-coffee-400 hover:bg-coffee-500 text-white rounded-2xl font-medium transition-all">再来一次</button>
        ${state.wrongWords.length > 0 ? `<button onclick="goToWrongWords()" class="px-6 py-3 bg-red-400 hover:bg-red-500 text-white rounded-2xl font-medium transition-all">📝 错题集 (${state.wrongWords.length})</button>` : ''}
        <button onclick="goHome()" class="px-6 py-3 bg-cream-200 hover:bg-cream-300 text-coffee-600 rounded-2xl font-medium transition-all">返回首页</button>
      </div>
    </div>
  `;
}

function saveSpellAndExit() {
  localStorage.setItem('topik_spell_state', JSON.stringify({
    words: state.spellWords,
    index: state.spellIndex,
    score: state.spellScore,
    results: state.spellResults,
    mode: state.spellMode || 'today'
  }));
  showToast('测验进度已保存', 1500);
  goHome();
}
