// ========== 弹窗 ==========
function showCompletionModal() {
  const modal = document.getElementById('completion-modal');
  if (!modal) return;

  const isReviewOrWrong = state.mode === 'review' || state.currentView === 'review' || state.currentView === 'wrong';
  const loadNewSetBtn = modal.querySelector('#load-new-set-btn');
  const resetBtn = modal.querySelector('#reset-current-set-btn');

  if (loadNewSetBtn) {
    loadNewSetBtn.style.display = isReviewOrWrong ? 'none' : '';
  }
  if (resetBtn) {
    resetBtn.style.display = isReviewOrWrong ? 'none' : '';
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
      localStorage.removeItem('topik_wrong_review_state'); 
      state.wrongInitialTotal = 0;  // 重置初始总数
      if (state.currentView === 'wrong') {
          goToWrongWords();
      } else {
          goHome();
      }
  }
  
  function resetCurrentSet() {
    state.currentQueue = [];   // 清空队列，防止残留
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
      state.wrongWords = [];
      state.currentSet = 1;
      state.currentSetKey = '1';
      state.currentIndex = 0;
      state.currentQueue = [];
      saveToStorage();
      goHome();
    }
  }
