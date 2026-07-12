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
    saveToStorageDebounced();
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
    saveToStorageDebounced();
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
      state.wrongWords = [];
      state.currentSet = 1;
      state.currentSetKey = '1';
      state.currentIndex = 0;
      state.currentQueue = [];
      saveToStorageDebounced();
      goHome();
    }
  }
