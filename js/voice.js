// ========== 语音朗读（最终万能版） ==========

window.speakWord = function(text) {
  if (!text) return;
  console.log('🔊 speakWord 被调用:', text);

  // 方法1：原生 TTS（如果可用）
  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      u.rate = 0.9;
      var voices = window.speechSynthesis.getVoices();
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].lang.indexOf('ko') !== -1) { u.voice = voices[i]; break; }
      }
      window.speechSynthesis.speak(u);
      console.log('✅ 原生 TTS 已调用');
      return;
    } catch(e) {
      console.warn('原生 TTS 失败:', e);
    }
  }

  // 方法2：Google TTS（备用）
  try {
    var url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(text) + '&tl=ko&client=tw-ob';
    fetch(url)
      .then(function(r) { return r.blob(); })
      .then(function(b) {
        var a = new Audio(URL.createObjectURL(b));
        a.play();
        console.log('✅ Google TTS 已调用');
      })
      .catch(function(e) {
        console.warn('Google TTS 失败:', e);
        alert('朗读失败，请检查网络');
      });
  } catch(e) {
    alert('朗读功能不可用');
  }
};

console.log('✅ voice.js 已加载');
