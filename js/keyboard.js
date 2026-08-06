// ========== 键盘支持 ==========
function setupKeyboard() {
  document.addEventListener('keydown', async (e) => {
    // 检测完成弹窗是否打开
    const completionModal = document.getElementById('completion-modal');
    if (completionModal && !completionModal.classList.contains('hidden')) {
      // 弹窗打开时，只允许 Escape 关闭弹窗，其他按键全部忽略
      if (e.key === 'Escape') {
        dismissCompletionModal();
        e.preventDefault();
      }
      return;
    }

    // 原有的视图检测
    if (state.currentView !== 'learn' && state.currentView !== 'review' && state.currentView !== 'bookmarks') return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        flipCard();
        break;
      case 'Enter':
        e.preventDefault();
        if (state.currentView === 'spell') {
          submitSpellAnswer();
        } else {
          flipCard();
        }
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
