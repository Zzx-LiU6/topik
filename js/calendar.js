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

// 获取某一天的单词列表
function getWordsByDate(dateStr, type) {
  var today = getToday();
  var words = [];

  if (type === 'review' && dateStr > today) {
    return words;
  }

  for (var wordId in wordProgress) {
    var progress = wordProgress[wordId];
    var match = false;

    if (type === 'new' && progress.firstLearnedDate === dateStr && progress.status !== 'permanent') {
      match = true;
    }
    
    if (type === 'review' && progress.status === 'mastered' && progress.firstLearnedDate !== dateStr) {
      // 优先使用 reviewHistory（新数据），如果没有则回退到 lastReviewDate（旧数据）
      if (Array.isArray(progress.reviewHistory) && progress.reviewHistory.includes(dateStr)) {
        match = true;
      } else if (progress.lastReviewDate === dateStr) {
        // 兼容旧数据：如果 lastReviewDate 匹配，也认为是复习记录
        match = true;
      }
    }
    
    if (type === 'permanent' && progress.permanentDate === dateStr) {
      match = true;
    }

    if (match) {
      for (var i = 0; i < sortedSetKeys.length; i++) {
        var setKey = sortedSetKeys[i];
        var w = allVocabularySets[setKey]?.find(function(w) { return w.id === wordId; });
        if (w) {
          words.push(w);
          break;
        }
      }
    }
  }
  return words;
}

// 获取日历数据
function getCalendarData(year, month) {
  var firstDay = new Date(year, month - 1, 1).getDay();
  var daysInMonth = new Date(year, month, 0).getDate();
  var today = getToday();
  var days = [];

  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var isPastOrToday = dateStr <= today;

    var newCount = 0;
    var reviewCount = 0;
    var permanentCount = 0;

    // 在循环每个日期时
    for (var wordId in wordProgress) {
      var p = wordProgress[wordId];

      if (p.firstLearnedDate === dateStr && p.status !== 'permanent') {
        newCount++;
      }
      
      if (isPastOrToday && p.status === 'mastered' && p.firstLearnedDate !== dateStr) {
        // 优先使用 reviewHistory，没有则回退到 lastReviewDate
        var hasReview = false;
        if (Array.isArray(p.reviewHistory) && p.reviewHistory.includes(dateStr)) {
          hasReview = true;
        } else if (p.lastReviewDate === dateStr) {
          hasReview = true;
        }
        if (hasReview) {
          reviewCount++;
        }
      }
      
      if (p.permanentDate === dateStr) {
        permanentCount++;
      }
    }

    days.push({
      day: d,
      dateStr: dateStr,
      newCount: newCount,
      reviewCount: reviewCount,
      permanentCount: permanentCount,
      isToday: dateStr === today
    });
  }

  return { firstDay: firstDay, days: days };
}

// 渲染日历
async function renderCalendarView() {
  var year = state.calendarYear;
  var month = state.calendarMonth;
  var data = getCalendarData(year, month);
  var firstDay = data.firstDay;
  var days = data.days;

  var detailHTML = '';
  if (state.selectedDate) {
    var newWords = getWordsByDate(state.selectedDate, 'new');
    var reviewWords = getWordsByDate(state.selectedDate, 'review');
    var permanentWords = getWordsByDate(state.selectedDate, 'permanent');

    detailHTML = `
      <div class="bg-white rounded-2xl p-4 mt-4 space-y-3">
        ${newWords.length > 0 ? `
        <div>
          <h4 class="text-sm font-medium text-coffee-600 mb-2">📖 今日新学 (${newWords.length})</h4>
          <div class="flex flex-wrap gap-2">
            ${newWords.map(function(w) { return '<span class="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">' + w.korean + '</span>'; }).join('')}
          </div>
        </div>` : ''}
        ${reviewWords.length > 0 ? `
        <div>
          <h4 class="text-sm font-medium text-coffee-600 mb-2">🔁 今日复习 (${reviewWords.length})</h4>
          <div class="flex flex-wrap gap-2">
            ${reviewWords.map(function(w) { return '<span class="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">' + w.korean + '</span>'; }).join('')}
          </div>
        </div>` : ''}
        ${permanentWords.length > 0 ? `
        <div>
          <h4 class="text-sm font-medium text-coffee-600 mb-2">🏆 彻底掌握 (${permanentWords.length})</h4>
          <div class="flex flex-wrap gap-2">
            ${permanentWords.map(function(w) { return '<span class="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">' + w.korean + '</span>'; }).join('')}
          </div>
        </div>` : ''}
        ${newWords.length === 0 && reviewWords.length === 0 && permanentWords.length === 0 ? '<p class="text-sm text-coffee-400 text-center">当天没有学习记录</p>' : ''}
      </div>
    `;
  }

  var weekDays = ['日', '一', '二', '三', '四', '五', '六'];
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
          ${weekDays.map(function(d) { return '<div>' + d + '</div>'; }).join('')}
        </div>
        <div class="grid grid-cols-7 gap-1">
          ${Array.from({ length: firstDay }).map(function() { return '<div></div>'; }).join('')}
          ${days.map(function(d) {
            return '<div class="p-1 cursor-pointer rounded-lg text-center ' + (d.isToday ? 'bg-cream-200' : 'hover:bg-cream-100') + ' ' + (state.selectedDate === d.dateStr ? 'ring-2 ring-coffee-400' : '') + '" onclick="selectCalendarDate(\'' + d.dateStr + '\')">' +
              '<div class="text-sm font-medium text-coffee-600">' + d.day + '</div>' +
              '<div class="flex justify-center gap-1 mt-0.5">' +
                (d.newCount > 0 ? '<span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>' : '') +
                (d.reviewCount > 0 ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>' : '') +
                (d.permanentCount > 0 ? '<span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>' : '') +
              '</div>' +
            '</div>';
          }).join('')}
        </div>
      </div>

      ${detailHTML}
    </div>
  `;
}
