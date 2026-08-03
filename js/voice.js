// ========== 语音朗读（强制刷新版） ==========

var isSpeaking = false;
var isNativeFailed = false;
var isGooglePlaying = false;
var currentToast = null;
var speakTimer = null;
var currentGoogleAudio = null;
var toastTimer = null;
var lastToastMsg = '';

function showToast(msg, duration) {
  duration = duration || 1500;
  if (lastToastMsg === msg && currentToast) return;
  lastToastMsg = msg;
  if (currentToast) { currentToast.remove(); currentToast = null; }
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
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

// 【关键】直接获取韩语语音，不依赖任何缓存
function getKoreanVoice() {
  if (!window.speechSynthesis) return null;
  var voices = window.speechSynthesis.getVoices();
  for (var i = 0; i < voices.length; i++) {
    if (voices[i].lang && voices[i].lang.indexOf('ko') !== -1) {
      return voices[i];
    }
  }
  return null;
}

function stopGoogleTTS() {
  if (currentGoogleAudio) {
    try { currentGoogleAudio.pause(); currentGoogleAudio.currentTime = 0; currentGoogleAudio = null; } catch(e) {}
  }
  isGooglePlaying = false;
}

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
      audio.onended = function() { isGooglePlaying = false; currentGoogleAudio = null; showToast('✅ 播放完成', 1000); };
      audio.onerror = function() { isGooglePlaying = false; currentGoogleAudio = null; showToast('❌ 网络语音播放失败'); };
      return audio.play();
    })
    .catch(function(e) {
      clearTimeout(timeoutId);
      isGooglePlaying = false;
      currentGoogleAudio = null;
      showToast('❌ 网络语音不可用（国内可能无法访问 Google 服务）');
    });
}

function speakWithNative(text, koVoice) {
  stopGoogleTTS();
  window.speechSynthesis.cancel();
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 0.9;
  utterance.pitch = 1;
  if (koVoice) utterance.voice = koVoice;
  utterance.onstart = function() { isSpeaking = true; isNativeFailed = false; showToast('🔊 正在朗读...'); };
  utterance.onend = function() { isSpeaking = false; showToast('✅ 播放完成', 1000); };
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
    alert('您的浏览器不支持语音朗读功能');
    return;
  }

  // 防抖
  if (speakTimer) { clearTimeout(speakTimer); speakTimer = null; }
  if (isSpeaking) { window.speechSynthesis.cancel(); isSpeaking = false; }
  if (isGooglePlaying) { stopGoogleTTS(); }

  // 【核心】每次点击都强制从浏览器获取最新韩语语音
  var koVoice = getKoreanVoice();

  if (koVoice) {
    // 有韩语语音 → 原生 TTS
    isNativeFailed = false;
    speakWithNative(text, koVoice);
    speakTimer = setTimeout(function() { speakTimer = null; }, 500);
    return;
  }

  // 没有韩语语音 → 先尝试唤醒，再试一次
  showToast('⏳ 准备语音...');
  setTimeout(function() {
    var koVoice2 = getKoreanVoice();
    if (koVoice2) {
      isNativeFailed = false;
      speakWithNative(text, koVoice2);
      speakTimer = setTimeout(function() { speakTimer = null; }, 500);
    } else {
      // 真的没有韩语语音 → Google TTS
      speakWithGoogleTTS(text);
      speakTimer = setTimeout(function() { speakTimer = null; }, 500);
    }
  }, 300);
};

console.log('✅ voice.js 已加载（强制刷新版）');
