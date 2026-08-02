// ========== 语音朗读（极简移动版） ==========

// 1. 预加载语音列表（移动端关键）
let koreanVoice = null;
let voicesReady = false;

function initVoices() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    koreanVoice = voices.find(v => v.lang.includes('ko') || v.lang.includes('Korean')) || null;
    voicesReady = true;
    return;
  }
  window.speechSynthesis.onvoiceschanged = function() {
    const v = window.speechSynthesis.getVoices();
    if (v.length > 0) {
      koreanVoice = v.find(v2 => v2.lang.includes('ko') || v2.lang.includes('Korean')) || null;
      voicesReady = true;
    }
    window.speechSynthesis.onvoiceschanged = null;
  };
}
// 页面加载时执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVoices);
} else {
  initVoices();
}

// 2. 用户点击任意位置激活 speechSynthesis（移动端关键）
document.addEventListener('click', function activate() {
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const dummy = new SpeechSynthesisUtterance(' ');
      dummy.lang = 'ko-KR';
      window.speechSynthesis.speak(dummy);
      setTimeout(() => window.speechSynthesis.cancel(), 50);
    } catch(e) {}
  }
}, { once: true });

// 3. 主朗读函数（不是 async，保证同步触发）
function speakWord(text) {
  if (!text) return;
  console.log('🔊 朗读:', text);
  
  // 取消之前朗读
  window.speechSynthesis.cancel();

  // 如果语音还没准备好，再尝试加载一次
  if (!voicesReady || !koreanVoice) {
    const fresh = window.speechSynthesis.getVoices();
    if (fresh.length > 0) {
      koreanVoice = fresh.find(v => v.lang.includes('ko') || v.lang.includes('Korean')) || null;
      voicesReady = true;
    }
  }

  // 有韩语语音 → 原生 TTS（同步触发，手势有效）
  if (koreanVoice) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.voice = koreanVoice;
    window.speechSynthesis.speak(utterance);
    return;
  }

  // 没有韩语语音 → 尝试 Google TTS（不阻塞，不等待）
  tryGoogleTTS(text);
}

// 4. Google TTS 备用（不等待，不阻塞）
function tryGoogleTTS(text) {
  try {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ko&client=tw-ob`;
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const audio = new Audio(URL.createObjectURL(blob));
        audio.play().catch(() => {});
      })
      .catch(() => {});
  } catch(e) {}
}
