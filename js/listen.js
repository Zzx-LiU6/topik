// ========== 听力测验 ==========

// ---- 听力状态 ----
let listenQuestions = [];
let listenIndex = 0;
let listenScore = 0;
let listenMode = 'today';
let listenResults = [];

// ---- 显示模式选择器 ----
function showListenModePicker() {
    // 检测 TTS
    if (!('speechSynthesis' in window)) {
        showToast('⚠️ 当前浏览器不支持语音，请使用 Chrome 或 Edge', 3000);
        return;
    }

    // 检测是否有韩语语音（简单检测）
    var voices = window.speechSynthesis.getVoices();
    var hasKorean = voices.some(function(v) {
        return v.lang && v.lang.includes('ko');
    });
    if (!hasKorean) {
        // 等待语音加载
        setTimeout(function() {
            var voices2 = window.speechSynthesis.getVoices();
            var hasKorean2 = voices2.some(function(v) {
                return v.lang && v.lang.includes('ko');
            });
            if (!hasKorean2) {
                showToast('⚠️ 未检测到韩语语音，发音可能不准确', 3000);
            }
        }, 300);
    }

    var overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-coffee-600/30 backdrop-blur-sm';
    overlay.innerHTML = `
        <div class="bg-cream-100 rounded-3xl shadow-2xl p-6 w-[90%] max-w-sm border border-cream-300 fade-in">
            <h3 class="text-lg font-medium text-coffee-600 text-center mb-4">🎧 选择练习范围</h3>
            <div class="space-y-3">
                <button class="listen-mode-btn w-full px-4 py-3 bg-white border border-cream-300 rounded-2xl text-left hover:bg-cream-50 transition-colors" data-mode="today">
                    <div class="font-medium text-coffee-600">📖 今日学习 <span class="text-xs text-green-500 ml-1">推荐</span></div>
                    <div class="text-xs text-coffee-400 mt-0.5">当前套装 + 待复习词汇</div>
                </button>
                <button class="listen-mode-btn w-full px-4 py-3 bg-white border border-cream-300 rounded-2xl text-left hover:bg-cream-50 transition-colors" data-mode="primary">
                    <div class="font-medium text-coffee-600">📗 初级专练</div>
                    <div class="text-xs text-coffee-400 mt-0.5">仅初级词汇 (set 1-90)</div>
                </button>
                <button class="listen-mode-btn w-full px-4 py-3 bg-white border border-cream-300 rounded-2xl text-left hover:bg-cream-50 transition-colors" data-mode="intermediate">
                    <div class="font-medium text-coffee-600">📘 中级专练</div>
                    <div class="text-xs text-coffee-400 mt-0.5">仅中级词汇 (set 91-272)</div>
                </button>
                <button class="listen-mode-btn w-full px-4 py-3 bg-white border border-cream-300 rounded-2xl text-left hover:bg-cream-50 transition-colors" data-mode="all">
                    <div class="font-medium text-coffee-600">🌐 全部混合</div>
                    <div class="text-xs text-coffee-400 mt-0.5">所有未掌握词汇大乱斗</div>
                </button>
            </div>
            <button class="w-full mt-4 px-4 py-2 bg-cream-200 hover:bg-cream-300 text-coffee-500 rounded-xl text-sm transition-colors" id="cancel-listen-picker">
                取消
            </button>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector('#cancel-listen-picker').addEventListener('click', function() {
        overlay.remove();
    });
    overlay.querySelectorAll('.listen-mode-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var mode = this.dataset.mode;
            overlay.remove();
            onListenModeSelected(mode);
        });
    });
}

// ---- 模式选择后处理 ----
function onListenModeSelected(mode) {
    var saved = localStorage.getItem('topik_listen_state');
    if (saved) {
        try {
            var state = JSON.parse(saved);
            if (state.questions && state.questions.length > 0 && state.index < state.questions.length) {
                showListenResumeDialog(mode, state);
                return;
            }
        } catch (e) {
            localStorage.removeItem('topik_listen_state');
        }
    }
    startListen(mode);
}

// ---- 恢复进度弹窗 ----
function showListenResumeDialog(newMode, savedState) {
    var overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-coffee-600/30 backdrop-blur-sm';
    overlay.innerHTML = `
        <div class="bg-cream-100 rounded-3xl shadow-2xl p-6 w-[90%] max-w-sm border border-cream-300 fade-in text-center">
            <div class="text-4xl mb-4">📋</div>
            <h3 class="text-lg font-medium text-coffee-600 mb-2">检测到未完成的听力测验</h3>
            <p class="text-sm text-coffee-400 mb-6">
                上次进度：第 ${savedState.index + 1}/${savedState.questions.length} 题，
                已答对 ${savedState.score} 题
            </p>
            <div class="space-y-3">
                <button class="w-full px-4 py-3 bg-coffee-400 hover:bg-coffee-500 text-white rounded-2xl font-medium transition-all" id="resume-listen-btn">
                    继续上次测验
                </button>
                <button class="w-full px-4 py-3 bg-cream-200 hover:bg-cream-300 text-coffee-600 rounded-2xl font-medium transition-all border border-cream-300" id="new-listen-btn">
                    开始新测验
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#resume-listen-btn').addEventListener('click', function() {
        overlay.remove();
        listenQuestions = savedState.questions;
        listenIndex = savedState.index;
        listenScore = savedState.score;
        listenMode = savedState.mode || 'today';
        state.currentView = 'listen';
        renderCurrentView();
    });

    overlay.querySelector('#new-listen-btn').addEventListener('click', function() {
        overlay.remove();
        localStorage.removeItem('topik_listen_state');
        startListen(newMode);
    });

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.remove();
    });
}

// ---- 开始听力测验 ----
function startListen(mode) {
    var words = getListenWords(mode);
    
    if (words.length === 0) {
        showToast('没有可测验的单词，请先学习一些单词。', 2000);
        return;
    }

    var shuffled = shuffle(words);
    var selected = shuffled.slice(0, Math.min(10, shuffled.length));

    // 收集所有可选释义作为干扰项来源
    var allMeanings = words.map(function(w) { return w.meaning; }).filter(function(m) { return m; });

    listenQuestions = selected.map(function(word) {
        var correctAnswer = word.meaning;
        var distractors = allMeanings
            .filter(function(m) { return m !== correctAnswer; })
            .sort(function() { return Math.random() - 0.5; })
            .slice(0, 3);
        while (distractors.length < 3) distractors.push('——');
        var options = [correctAnswer].concat(distractors).sort(function() { return Math.random() - 0.5; });
        return {
            word: word,
            options: options,
            correctIndex: options.indexOf(correctAnswer),
            userChoice: null,
            isCorrect: null
        };
    });

    listenMode = mode;
    listenIndex = 0;
    listenScore = 0;
    listenResults = [];
    localStorage.removeItem('topik_listen_state');
    state.currentView = 'listen';
    renderCurrentView();
}

// ---- 获取听力用词 ----
function getListenWords(mode) {
    var words = [];
    var today = getToday();

    var currentSetWords = (allVocabularySets[state.currentSetKey] || []).filter(function(w) {
        var p = wordProgress[w.id];
        return !p || p.status !== 'permanent';
    });

    var reviewWords = [];
    for (var wordId in wordProgress) {
        var progress = wordProgress[wordId];
        if (progress.status === 'mastered' && progress.nextReviewDate && progress.nextReviewDate <= today) {
            for (var i = 0; i < sortedSetKeys.length; i++) {
                var setKey = sortedSetKeys[i];
                var w = allVocabularySets[setKey]?.find(function(w) { return w.id === wordId; });
                if (w && !reviewWords.some(function(rw) { return rw.id === w.id; })) {
                    reviewWords.push(w);
                    break;
                }
            }
        }
    }

    var primaryWords = [];
    var intermediateWords = [];
    for (var j = 0; j < sortedSetKeys.length; j++) {
        var key = sortedSetKeys[j];
        var setNumber = parseInt(key, 10);
        var ws = (allVocabularySets[key] || []).filter(function(w) {
            var p = wordProgress[w.id];
            return !p || p.status !== 'permanent';
        });
        if (setNumber <= 90) {
            primaryWords.push.apply(primaryWords, ws);
        } else {
            intermediateWords.push.apply(intermediateWords, ws);
        }
    }

    switch (mode) {
        case 'today':
            var todayMap = {};
            currentSetWords.forEach(function(w) { todayMap[w.id] = w; });
            reviewWords.forEach(function(w) { todayMap[w.id] = w; });
            for (var id in todayMap) {
                if (todayMap.hasOwnProperty(id)) words.push(todayMap[id]);
            }
            break;
        case 'primary':
            words = primaryWords;
            break;
        case 'intermediate':
            words = intermediateWords;
            break;
        case 'all':
            words = primaryWords.concat(intermediateWords);
            break;
        default:
            words = currentSetWords;
    }
    return words;
}

// ---- 渲染听力视图 ----
async function renderListenView() {
    if (!listenQuestions || listenQuestions.length === 0) {
        goHome();
        return;
    }

    if (listenIndex >= listenQuestions.length) {
        renderListenResult();
        return;
    }

    var q = listenQuestions[listenIndex];
    var currentWord = q.word;

    elements.app.innerHTML = `
        <div>
            <header class="mb-6">
                <div class="flex items-center justify-between">
                    <button onclick="goHome()" class="flex items-center text-coffee-400 hover:text-coffee-500 transition-colors">
                        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                        返回首页
                    </button>
                    <button onclick="saveListenAndExit()" class="text-xs px-3 py-1 bg-cream-200 hover:bg-cream-300 text-coffee-600 rounded-full transition">
                        💾 保存并退出
                    </button>
                </div>
            </header>

            <div class="mb-6">
                <div class="flex items-center justify-between mb-3">
                    <h1 class="text-lg font-medium text-coffee-600">🎧 听力测验</h1>
                    <span class="text-sm text-coffee-400">第 ${listenIndex + 1}/${listenQuestions.length} 题</span>
                </div>
                <div class="bg-cream-300 rounded-full h-3 overflow-hidden shadow-inner">
                    <div class="h-full bg-gradient-to-r from-coffee-400 to-coffee-500 rounded-full transition-all duration-500" style="width: ${(listenIndex / listenQuestions.length) * 100}%"></div>
                </div>
            </div>

            <div class="bg-white rounded-3xl p-6 shadow-md border border-cream-300 mb-6">
                <p class="text-center text-coffee-400 text-sm mb-2">🎧 请听单词发音，选择正确的含义</p>
                
                <div class="flex justify-center items-center gap-4 mb-6">
                    <button onclick="playListenWord('${currentWord.korean}')" 
                            class="w-16 h-16 rounded-full bg-coffee-400 hover:bg-coffee-500 text-white text-3xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center">
                        🔊
                    </button>
                    <span class="text-sm text-coffee-400">点击喇叭播放</span>
                </div>

                <div class="text-center mb-6">
                    <div class="text-2xl text-coffee-400 font-light tracking-widest">[${currentWord.roman || ''}]</div>
                </div>

                <div class="space-y-3">
                    ${q.options.map(function(opt, i) {
                        var btnClass = 'bg-cream-200 border-cream-300 text-coffee-600 hover:bg-cream-300';
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
                            <button onclick="handleListenAnswer(${listenIndex}, ${i})"
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

// ---- 播放听力单词 ----
function playListenWord(text) {
    if (!text) return;
    if (!('speechSynthesis' in window)) {
        showToast('⚠️ 当前浏览器不支持语音，请使用 Chrome', 2000);
        return;
    }
    try {
        window.speechSynthesis.cancel();
        var utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.7;
        utterance.pitch = 1;
        var voices = window.speechSynthesis.getVoices();
        var koreanVoice = null;
        for (var i = 0; i < voices.length; i++) {
            if (voices[i].lang && (voices[i].lang.includes('ko') || voices[i].lang.includes('Korean'))) {
                koreanVoice = voices[i];
                break;
            }
        }
        if (koreanVoice) utterance.voice = koreanVoice;
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        showToast('⚠️ 语音播放失败，请检查浏览器设置', 2000);
    }
}

// ---- 处理听力答案 ----
function handleListenAnswer(questionIndex, choiceIndex) {
    var q = listenQuestions[questionIndex];
    if (q.userChoice !== null) return;

    q.userChoice = choiceIndex;
    q.isCorrect = (choiceIndex === q.correctIndex);
    if (q.isCorrect) listenScore++;

    renderCurrentView();

    setTimeout(function() {
        listenIndex++;
        localStorage.setItem('topik_listen_state', JSON.stringify({
            questions: listenQuestions,
            index: listenIndex,
            score: listenScore,
            mode: listenMode
        }));

        if (listenIndex < listenQuestions.length) {
            renderCurrentView();
        } else {
            renderListenResult();
        }
    }, 800);
}

// ---- 保存并退出 ----
function saveListenAndExit() {
    localStorage.setItem('topik_listen_state', JSON.stringify({
        questions: listenQuestions,
        index: listenIndex,
        score: listenScore,
        mode: listenMode
    }));
    showToast('听力进度已保存', 1500);
    goHome();
}

// ---- 渲染听力结果 ----
function renderListenResult() {
    localStorage.removeItem('topik_listen_state');
    var total = listenQuestions.length;
    var score = listenScore;
    var wrongWords = listenQuestions.filter(function(q) { return !q.isCorrect; }).map(function(q) { return q.word; });

    wrongWords.forEach(function(w) {
        if (!state.wrongWords.includes(w.korean)) {
            state.wrongWords.push(w.korean);
        }
    });

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

            <div class="text-center mb-8">
                <div class="text-5xl mb-4">${score === total ? '🏆' : score >= total/2 ? '👍' : '📚'}</div>
                <h1 class="text-2xl font-medium text-coffee-600 mb-2">听力测验完成！</h1>
                <p class="text-lg text-coffee-400">共 ${total} 题，答对 <span class="text-coffee-600 font-bold">${score}</span> 题</p>
                <p class="text-sm text-coffee-300 mt-1">正确率 ${Math.round((score/total)*100)}%</p>
            </div>

            ${wrongWords.length > 0 ? `
            <div class="bg-white rounded-3xl p-6 shadow-md border border-cream-300 mb-6">
                <h3 class="text-base font-medium text-coffee-600 mb-3">📝 需要复习的单词</h3>
                <div class="space-y-2">
                    ${wrongWords.map(function(w) {
                        return `
                            <div class="flex items-center justify-between p-3 bg-cream-50 rounded-xl">
                                <div><span class="font-medium text-coffee-600">${w.korean}</span><span class="text-sm text-coffee-400 ml-2">[${w.roman}]</span></div>
                                <span class="text-sm text-coffee-500">${w.meaning}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            ` : `
            <div class="text-center py-8 text-coffee-400"><p class="text-lg">🎉 全部答对，太棒了！</p></div>
            `}

            <div class="flex gap-3 justify-center flex-wrap">
                <button onclick="startListen('today')" class="px-6 py-3 bg-coffee-400 hover:bg-coffee-500 text-white rounded-2xl font-medium transition-all">再来一次</button>
                ${state.wrongWords.length > 0 ? `<button onclick="goToWrongWords()" class="px-6 py-3 bg-red-400 hover:bg-red-500 text-white rounded-2xl font-medium transition-all">📝 错题集 (${state.wrongWords.length})</button>` : ''}
                <button onclick="goHome()" class="px-6 py-3 bg-cream-200 hover:bg-cream-300 text-coffee-600 rounded-2xl font-medium transition-all">返回首页</button>
            </div>
        </div>
    `;
}