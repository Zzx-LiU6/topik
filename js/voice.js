// ========== 语音朗读（最终完善版） ==========

// 全局状态
var isSpeaking = false;
var isNativeFailed = false;
var isGooglePlaying = false;
var currentToast = null;
var speakTimer = null;
var currentGoogleAudio = null;
var toastTimer = null;           // Toast 自动消失定时器
var lastToastMsg = '';           // 上次显示的 Toast 内容

// 缓存语音列表
var cachedVoices = [];
var voicesLoaded = false;

function loadVoices() {
  if (!window.speechSynthesis) return;
  var voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
    voicesLoaded = true;
    // 语音列表更新后，重置失败标记（用户可能安装了新语音包）
    isNativeFailed = false;
  }
}
loadVoices();
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = function() {
    cachedVoices = window.speechSynthesis.getVoices();
    voicesLoaded = true;
    // 【修复3】语音列表更新后重置失败标记，允许重试本地朗读
    isNativeFailed = false;
  };
}

// 【修复1】Toast 单例 + 防闪动
function showToast(msg, duration) {
  duration = duration || 1500;
  
  // 如果连续显示相同内容，不重复刷新（防闪）
  if (lastToastMsg === msg && currentToast) {
    return;
  }
  lastToastMsg = msg;

  if (currentToast) {
    currentToast.remove();
    currentToast = null;
  }
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  var toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:8px 20px;border-radius:20px;font-size:14px;z-index:9999;opacity:0;transition:opacity 0.3s;';
  document.body.appendChild(toast);
  currentToast = toast;
  requestAnimationFrame(function() { toast.style.opacity = 1; });

  toastTimer = setTimeout(function() {
    toast.style.opacity = 0;
    setTimeout(function() {
      if (toast.parentNode) toast.remove();
      if (currentToast === toast) currentToast = null;
      if (lastToastMsg === msg) lastToastMsg = '';
    }, 400);
    toastTimer = null;
  }, duration);
}

// 检查韩语语音
function hasKoreanVoice() {
  if (!voicesLoaded) {
    var v = window.speechSynthesis.getVoices();
    if (v.length > 0) { cachedVoices = v; voicesLoaded = true; }
  }
  for (var i = 0; i < cachedVoices.length; i++) {
    if (cachedVoices[i].lang.indexOf('ko') !== -1) return true;
  }
  return false;
}

// 打断 Google TTS
function stopGoogleTTS() {
  if (currentGoogleAudio) {
    try {
      currentGoogleAudio.pause();
      currentGoogleAudio.currentTime = 0;
      currentGoogleAudio = null;
    } catch(e) {}
  }
  isGooglePlaying = false;
}

// 【修复1】Google TTS 错误提示更友好
function speakWithGoogleTTS(text) {
  stopGoogleTTS();

  isGooglePlaying = true;
  showToast('🌐 尝试网络语音...');

  var url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(text) + '&tl=ko&client=tw-ob';
  
  var timeoutId = setTimeout(function() {
    isGooglePlaying = false;
    showToast('⏰ 网络请求超时（请检查网络环境）');
  }, 6000);

  fetch(url)
    .then(function(r) {
      clearTimeout(timeoutId);
      if (!r.ok) throw new Error('Google TTS 请求失败');
      return r.blob();
    })
    .then(function(b) {
      var audio = new Audio(URL.createObjectURL(b));
      currentGoogleAudio = audio;

      audio.onended = function() {
        isGooglePlaying = false;
        currentGoogleAudio = null;
        showToast('✅ 播放完成', 1000);
      };
      audio.onerror = function() {
        isGooglePlaying = false;
        currentGoogleAudio = null;
        showToast('❌ 网络语音播放失败');
      };
      return audio.play();
    })
    .catch(function(e) {
      clearTimeout(timeoutId);
      isGooglePlaying = false;
      currentGoogleAudio = null;
      // 【修复1】明确提示网络限制
      showToast('❌ 网络语音不可用（国内可能无法访问 Google 服务）');
    });
}

// 原生 TTS
function speakWithNative(text) {
  stopGoogleTTS();

  if (!isSpeaking) {
    window.speechSynthesis.cancel();
  }

  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 0.9;
  utterance.pitch = 1;

  var koVoice = null;
  for (var i = 0; i < cachedVoices.length; i++) {
    if (cachedVoices[i].lang.indexOf('ko') !== -1) {
      koVoice = cachedVoices[i];
      break;
    }
  }
  if (koVoice) utterance.voice = koVoice;

  utterance.onstart = function() {
    isSpeaking = true;
    isNativeFailed = false;
    showToast('🔊 正在朗读...');
  };

  utterance.onend = function() {
    isSpeaking = false;
    showToast('✅ 播放完成', 1000);
  };

  utterance.onerror = function(e) {
    isSpeaking = false;
    isNativeFailed = true;
    console.warn('原生 TTS 错误:', e);
    showToast('⚠️ 本地语音失败，切换网络...');
    speakWithGoogleTTS(text);
  };

  window.speechSynthesis.speak(utterance);
}

// ===== 主函数 =====
window.speakWord = function(text, isUserClick) {
  if (!text) return;

  if (isUserClick !== true) {
    console.warn('⚠️ 语音播放需要用户手势触发');
    return;
  }

  if (!window.speechSynthesis) {
    alert('您的浏览器不支持语音朗读功能，请使用 Chrome 等现代浏览器。');
    return;
  }

  // 防抖：清空旧定时器 → 立即执行 → 锁 500ms
  if (speakTimer) {
    clearTimeout(speakTimer);
    speakTimer = null;
  }

  if (isSpeaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
  }
  if (isGooglePlaying) {
    stopGoogleTTS();
  }

  // 有韩语人声时重置失败标记
  if (hasKoreanVoice()) {
    isNativeFailed = false;
    speakWithNative(text);
    speakTimer = setTimeout(function() {
      speakTimer = null;
    }, 500);
    return;
  }

  speakWithGoogleTTS(text);
  speakTimer = setTimeout(function() {
    speakTimer = null;
  }, 500);
};

console.log('✅ voice.js 已加载（最终完善版）');
