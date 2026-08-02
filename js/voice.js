// ========== 语音朗读（带反馈版） ==========

window.speakWord = function(text) {
  if (!text) return;

  // 显示提示：正在朗读
  showToast('🔊 正在朗读...');

  // 1. 尝试原生 TTS
  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9;

      var voices = window.speechSynthesis.getVoices();
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].lang.indexOf('ko') !== -1) {
          utterance.voice = voices[i];
          break;
        }
      }

      window.speechSynthesis.speak(utterance);
      // 监听是否播放成功
      utterance.onstart = function() {
        showToast('🔊 正在播放...');
      };
      utterance.onend = function() {
        showToast('✅ 播放完成');
      };
      utterance.onerror = function(e) {
        console.warn('原生 TTS 错误:', e);
        // 原生失败，尝试 Google TTS
        fallbackToGoogleTTS(text);
      };
      return; // 原生已尝试
    } catch (e) {
      console.warn('原生 TTS 异常:', e);
      // 异常则走 fallback
    }
  }

  // 2. 备用：Google TTS
  fallbackToGoogleTTS(text);
};

// Google TTS 备用
function fallbackToGoogleTTS(text) {
  showToast('📡 使用网络语音...');
  var url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(text) + '&tl=ko&client=tw-ob';
  fetch(url)
    .then(function(response) {
      if (!response.ok) throw new Error('网络请求失败');
      return response.blob();
    })
    .then(function(blob) {
      var audioUrl = URL.createObjectURL(blob);
      var audio = new Audio(audioUrl);
      audio.play();
      showToast('✅ 网络语音播放中');
    })
    .catch(function(error) {
      console.error('Google TTS 失败:', error);
      showToast('❌ 语音播放失败，请检查网络');
    });
}

// Toast 提示函数
function showToast(msg) {
  var existing = document.querySelector('.voice-toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.className = 'voice-toast';
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:8px 20px;border-radius:20px;font-size:14px;z-index:9999;opacity:0;transition:opacity 0.3s;';
  document.body.appendChild(toast);
  requestAnimationFrame(function() { toast.style.opacity = 1; });
  setTimeout(function() {
    toast.style.opacity = 0;
    setTimeout(function() { toast.remove(); }, 400);
  }, 3000);
}

console.log('✅ voice.js 已加载（带反馈版）');
