// ========== 语音朗读（三重保障 + 重试版） ==========

// 新增：获取韩语语音（支持重试）
function getKoreanVoiceWithRetry() {
  var voices = window.speechSynthesis.getVoices();
  for (var i = 0; i < voices.length; i++) {
    if (voices[i].lang && voices[i].lang.indexOf('ko') !== -1) {
      return voices[i];
    }
  }
  return null;
}

async function speakWord(text) {
    // 1. 先尝试获取韩语语音
    var koVoice = getKoreanVoiceWithRetry();

    // 如果第一次没获取到，等待 300ms 重试（移动端语音列表加载慢）
    if (!koVoice) {
      await new Promise(function(resolve) { setTimeout(resolve, 300); });
      koVoice = getKoreanVoiceWithRetry();
    }

    // 1. 尝试原生 TTS（如果有韩语语音）
    if (koVoice) {
      speakWithNative(text, koVoice);
      return;
    }

    // 2. 尝试 Google TTS（通过 fetch 加载，更可靠）
    var success = await speakWithGoogleTTS(text);
    if (success) return;

    // 3. 都失败了，给出明确提示
    showToast('当前浏览器不支持朗读', 3000);
}

// 原生 TTS 播放（支持传入语音对象）
function speakWithNative(text, koVoice) {
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.8;
    utterance.pitch = 1;
    if (koVoice) utterance.voice = koVoice;
    window.speechSynthesis.speak(utterance);
}

// Google TTS 播放（保持不变）
async function speakWithGoogleTTS(text) {
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ko&client=tw-ob`;
      const response = await fetch(url);
      if (!response.ok) return false;
  
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
  
      await new Promise((resolve, reject) => {
        audio.onended = resolve;
        audio.onerror = reject;
        audio.play().catch(reject);
      });
  
      return true;
    } catch (e) {
      console.warn('Google TTS 播放失败:', e);
      return false;
    }
}

// Toast 提示（保持不变）
function showToast(msg, duration = 1000) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #6B5B45;
      color: white;
      padding: 10px 24px;
      border-radius: 24px;
      font-size: 14px;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s;
      text-align: center;
      width: max-content;
      max-width: 95vw;
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => (toast.style.opacity = '1'));
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
}
