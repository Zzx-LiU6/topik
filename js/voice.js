// ========== 语音朗读（三重保障） ==========
async function speakWord(text) {
    // 1. 尝试原生 TTS
    if (hasKoreanVoice()) {
      speakWithNative(text);
      return;
    }
  
    // 2. 尝试 Google TTS（通过 fetch 加载，更可靠）
    const success = await speakWithGoogleTTS(text);
    if (success) return;
  
    // 3. 都失败了，给出明确提示
    showToast('当前浏览器不支持朗读', 3000);
  }
  
  // 检测是否有韩语语音
  function hasKoreanVoice() {
    if (!('speechSynthesis' in window)) return false;
    const voices = window.speechSynthesis.getVoices();
    return voices.some(v => v.lang.includes('ko') || v.lang.includes('Korean'));
  }
  
  // 原生 TTS 播放
  function speakWithNative(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.8;
    utterance.pitch = 1;
  
    const voices = window.speechSynthesis.getVoices();
    const koreanVoice = voices.find(v => v.lang.includes('ko') || v.lang.includes('Korean'));
    if (koreanVoice) utterance.voice = koreanVoice;
  
    window.speechSynthesis.speak(utterance);
  }
  
  // Google TTS 播放（返回 Promise<boolean>）
  async function speakWithGoogleTTS(text) {
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ko&client=tw-ob`;
      const response = await fetch(url);
      if (!response.ok) return false;
  
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
  
      // 等待播放完毕或失败
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
  
  // Toast 提示（可自定义时长）
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
  
