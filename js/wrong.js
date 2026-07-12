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
    saveToStorageDebounced();
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
          <button onclick="state.wrongWords=[];saveToStorageDebounced();goHome();" class="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-sm">🗑 清空</button>
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
    saveToStorageDebounced();
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
