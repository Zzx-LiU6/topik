// ========== 语音朗读 ==========

window.speakWord = function(text) {
  if (!text) return;
  if (!('speechSynthesis' in window)) return alert('不支持语音');
  window.speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 0.9;
  var voices = window.speechSynthesis.getVoices();
  for (var i = 0; i < voices.length; i++) {
    if (voices[i].lang.indexOf('ko') !== -1) { u.voice = voices[i]; break; }
  }
  window.speechSynthesis.speak(u);
};

console.log('✅ voice.js 已加载');
