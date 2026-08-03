// ========== 语音朗读（初版修复版 - 移动端兼容） ==========

// 检测是否有韩语语音（增加重试机制）
function hasKoreanVoice() {
  if (!('speechSynthesis' in window)) return false;
  var voices = window.speechSynthesis.getVoices();
  // 如果为空，可能是还没加载完成，等待 200ms 后重试一次
  if (voices.length === 0) {
    // 同步重试：直接再获取一次（部分浏览器第二次就能拿到）
    voices = window.speechSynthesis.getVoices();
  }
  return voices.some(function(v) {
    return v.lang && (v.lang.includes('ko') || v.lang.includes('Korean'));
  });
}

// 主函数（改为同步，保留三重保障）
window.speakWord = function(text) {
  if (!text) return;

  // 第一层：原生 TTS
  if (hasKoreanVoice()) {
    speakWithNative(text);
    return;
  }

  // 第二层：等待 300ms 后重试原生 TTS（移动端语音列表加载慢）
  showToast('⏳ 准备语音...', 1000);
  setTimeout(function() {
    if (hasKoreanVoice()) {
      speakWithNative(text);
      return;
    }
    // 第三层：Google TTS（保底）
    speakWithGoogleTTS(text);
  }, 300);
};

// 原生 TTS 播放
function speakWithNative(text) {
  window.speechSynthesis.cancel();
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 0.8;
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
}

// Google TTS 播放
function speakWithGoogleTTS(text) {
  var url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(text) + '&tl=ko&client=tw-ob';
  fetch(url)
    .then(function(r) { return r.blob(); })
    .then(function(b) {
      var audio = new Audio(URL.createObjectURL(b));
      audio.play();
    })
    .catch(function() {
      showToast('当前浏览器不支持朗读，请使用 Chrome', 3000);
    });
}

// Toast 提示
function showToast(msg, duration) {
  duration = duration || 3000;
  var toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#6B5B45;color:white;padding:10px 24px;border-radius:24px;font-size:14px;z-index:1000;opacity:0;transition:opacity 0.3s;text-align:center;width:max-content;max-width:95vw;';
  document.body.appendChild(toast);
  requestAnimationFrame(function() { toast.style.opacity = '1'; });
  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { toast.remove(); }, 300);
  }, duration);
}
