// ========== 语音朗读（手机稳用版） ==========

// 显式暴露到全局
window.speakWord = function(text) {
  if (!text) return;
  
  // 如果浏览器不支持语音
  if (!('speechSynthesis' in window)) {
    showToast('浏览器不支持语音');
    return;
  }
  
  // 取消之前的所有朗读
  window.speechSynthesis.cancel();
  
  // 创建语音对象
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 0.9;
  utterance.pitch = 1;
  
  // 尝试找韩语语音
  var voices = window.speechSynthesis.getVoices();
  var koreanVoice = null;
  for (var i = 0; i < voices.length; i++) {
    if (voices[i].lang.indexOf('ko') !== -1) {
      koreanVoice = voices[i];
      break;
    }
  }
  if (koreanVoice) utterance.voice = koreanVoice;
  
  // 朗读
  window.speechSynthesis.speak(utterance);
  console.log('🔊 朗读:', text);
};

// Toast 提示（独立实现）
function showToast(msg) {
  var toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#fff;padding:8px 20px;border-radius:20px;font-size:13px;z-index:9999;opacity:0;transition:opacity 0.3s;';
  document.body.appendChild(toast);
  requestAnimationFrame(function() { toast.style.opacity = '1'; });
  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { toast.remove(); }, 300);
  }, 2000);
}

// 确保暴露
window.showToast = showToast;

console.log('✅ voice.js 已加载');
