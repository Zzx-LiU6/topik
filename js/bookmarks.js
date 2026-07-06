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
  
