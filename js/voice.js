// ========== 语音朗读（移动端最终版） ==========

// 缓存语音列表
let cachedVoices = [];

// 预加载语音
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
    console.log('✅ 语音已加载:', cachedVoices.length);
  }
  window.speechSynthesis.onvoiceschanged = function() {
    const voices2 = window.speechSynthesis.getVoices();
    if (voices2.length > 0) {
      cachedVoices = voices2;
      console.log('✅ 语音已加载(onvoiceschanged):', cachedVoices.length);
    }
    window.speechSynthesis.onvoiceschanged = null;
  };
}
// 页面加载时执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadVoices);
} else {
  loadVoices();
}

// 用户点击任意位置时激活 speechSynthesis（移动端最关键）
document.addEventListener('click', function activateSpeech() {
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const dummy = new SpeechSynthesisUtterance('');
      dummy.lang = 'ko-KR';
      window.speechSynthesis.speak(dummy);
      setTimeout(() => window.speechSynthesis.cancel(), 100);
      console.log('✅ 已激活 speechSynthesis');
    } catch(e) {}
  }
}, { once: true });

// 主朗读函数
async function speakWord(text) {
  if (!text) return;
  console.log('🔊 朗读:', text);

  // 1. 先取消之前的所有朗读
  window.speechSynthesis.cancel();

  // 2. 尝试原生 TTS
  if (cachedVoices.length > 0) {
    const koreanVoice = cachedVoices.find(v => v.lang.includes('ko'));
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.8;
    utterance.pitch = 1;
    if (koreanVoice) utterance.voice = koreanVoice;
    window.speechSynthesis.speak(utterance);
    console.log('✅ 原生 TTS 已触发');
    return;
  }

  // 3. 如果语音还没加载好，等待 500ms 再试一次
  if (cachedVoices.length === 0) {
    setTimeout(() => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        cachedVoices = voices;
        const koreanVoice = cachedVoices.find(v => v.lang.includes('ko'));
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.8;
        utterance.pitch = 1;
        if (koreanVoice) utterance.voice = koreanVoice;
        window.speechSynthesis.speak(utterance);
        console.log('✅ 原生 TTS 已触发（延迟）');
        return;
      }
      // 还是没语音，尝试 Google TTS
      speakWithGoogleTTS(text);
    }, 500);
    return;
  }

  // 4. 没有韩语语音，尝试 Google TTS
  speakWithGoogleTTS(text);
}

// Google TTS 备用
async function speakWithGoogleTTS(text) {
  try {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ko&client=tw-ob`;
    const response = await fetch(url);
    if (!response.ok) return;
    const blob = await response.blob();
    const audio = new Audio(URL.createObjectURL(blob));
    audio.play();
    console.log('✅ Google TTS 已触发');
  } catch (e) {
    console.warn('❌ Google TTS 失败');
  }
}
