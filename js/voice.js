// ========== 语音朗读（Chrome 手势版） ==========

window.speakWord = function(text) {
  if (!text) return;
  
  // Via 等不支持的浏览器会走这里
  if (!('speechSynthesis' in window)) {
    alert('浏览器不支持语音朗读');
    return;
  }
  
  // 取消所有正在播放的语音
  window.speechSynthesis.cancel();
  
  // 创建语音对象（同步执行）
  var u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 0.9;
  u.pitch = 1;
  
  // 尝试找韩语语音（同步执行）
  var voices = window.speechSynthesis.getVoices();
  for (var i = 0; i < voices.length; i++) {
    if (voices[i].lang.indexOf('ko') !== -1) {
      u.voice = voices[i];
      break;
    }
  }
  
  // 直接播放（同步执行）
  window.speechSynthesis.speak(u);
  console.log('🔊 已触发朗读:', text);
};

// 预加载语音（页面加载时执行）
if ('speechSynthesis' in window) {
  // 空触发一次，让浏览器初始化语音引擎
  var dummy = new SpeechSynthesisUtterance('');
  window.speechSynthesis.speak(dummy);
  window.speechSynthesis.cancel();
}

console.log('✅ voice.js 已加载（Chrome 手势版）');
