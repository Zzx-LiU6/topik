// ========== 语音朗读 ==========

// 缓存语音列表，避免每次重新获取
let cachedVoices = [];
let voicesLoaded = false;

// 预加载语音列表
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  
  // 如果已经加载完成，直接返回
  if (voicesLoaded) return;
  
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
    voicesLoaded = true;
    return;
  }
  
  // 监听 voiceschanged 事件（移动端需要这个）
  window.speechSynthesis.onvoiceschanged = function() {
    const newVoices = window.speechSynthesis.getVoices();
    if (newVoices.length > 0) {
      cachedVoices = newVoices;
      voicesLoaded = true;
      console.log('✅ 语音列表已加载，共', cachedVoices.length, '个语音');
    }
    // 只触发一次，避免重复
    window.speechSynthesis.onvoiceschanged = null;
  };
}

// 在页面加载时预加载
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', loadVoices);
  // 如果 DOMContentLoaded 已经触发，直接调用
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadVoices);
  } else {
    loadVoices();
  }
}

// 检测是否有韩语语音（使用缓存）
function hasKoreanVoice() {
  if (!('speechSynthesis' in window)) return false;
  
  // 如果缓存还没加载，尝试立即获取
  if (!voicesLoaded) {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      voicesLoaded = true;
    }
  }
  
  return cachedVoices.some(v => v.lang.includes('ko') || v.lang.includes('Korean'));
}

// 原生 TTS 播放
function speakWithNative(text) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 0.8;
  utterance.pitch = 1;

  const koreanVoice = cachedVoices.find(v => v.lang.includes('ko') || v.lang.includes('Korean'));
  if (koreanVoice) utterance.voice = koreanVoice;

  window.speechSynthesis.speak(utterance);
}

// Google TTS 播放（备用方案）
async function speakWithGoogleTTS(text) {
  try {
    // 注意：Google TTS 在某些地区可能被墙，添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ko&client=tw-ob`;
    const response = await fetch(url, { 
      signal: controller.signal,
      // 增加缓存策略，避免重复请求
      cache: 'force-cache'
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) return false;

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve(true);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        resolve(false);
      };
      audio.play().catch(() => resolve(false));
    });
  } catch (e) {
    console.warn('Google TTS 播放失败:', e);
    return false;
  }
}

// 主函数：尝试多种方式播放
async function speakWord(text) {
  if (!text) return;
  
  console.log('🔊 尝试朗读:', text);
  
  // 1. 尝试原生 TTS
  if (hasKoreanVoice()) {
    try {
      speakWithNative(text);
      console.log('✅ 使用原生 TTS 播放');
      return;
    } catch (e) {
      console.warn('原生 TTS 失败:', e);
    }
  } else {
    // 如果语音列表还没加载，尝试等待一下再检测
    if (!voicesLoaded) {
      console.log('⏳ 语音列表未加载，等待加载...');
      await new Promise(resolve => {
        const checkVoices = () => {
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            cachedVoices = voices;
            voicesLoaded = true;
            resolve();
          } else {
            setTimeout(checkVoices, 200);
          }
        };
        checkVoices();
        // 最多等待 3 秒
        setTimeout(resolve, 3000);
      });
      
      // 再次检测
      if (hasKoreanVoice()) {
        try {
          speakWithNative(text);
          console.log('✅ 等待后使用原生 TTS 播放');
          return;
        } catch (e) {
          console.warn('原生 TTS 仍然失败:', e);
        }
      }
    }
  }

  // 2. 尝试 Google TTS（备用方案）
  console.log('⏳ 尝试 Google TTS...');
  const success = await speakWithGoogleTTS(text);
  if (success) {
    console.log('✅ 使用 Google TTS 播放');
    return;
  }

  // 3. 都失败了
  console.warn('❌ 所有朗读方式都失败了');
  showToast('朗读暂不可用，请检查网络', 2000);
}

// Toast 提示（确保 voice.js 独立可用）
function showToast(msg, duration = 2000) {
  const existing = document.querySelector('.voice-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'voice-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.75);
    color: white;
    padding: 8px 20px;
    border-radius: 20px;
    font-size: 13px;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
  `;
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
