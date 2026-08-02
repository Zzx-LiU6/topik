// ========== 语音朗读 ==========

// 判断是否为手机端
function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// 主函数：PC 优先原生 TTS，手机优先 Google TTS
window.speakWord = function(text) {
  if (!text) return;

  // 如果浏览器不支持语音，直接尝试 Google TTS
  if (!('speechSynthesis' in window)) {
    speakWithGoogleTTS(text);
    return;
  }

  // ===== PC 端：原生 TTS =====
  if (!isMobile()) {
    speakWithNativeTTS(text);
    return;
  }

  // ===== 手机端：优先 Google TTS =====
  speakWithGoogleTTS(text);
};

// ===== 原生 TTS（PC 端） =====
function speakWithNativeTTS(text) {
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
}

// ===== Google TTS（手机端，通过 Audio 播放） =====
function speakWithGoogleTTS(text) {
  var url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(text) + '&tl=ko&client=tw-ob';

  fetch(url)
    .then(function(response) {
      if (!response.ok) throw new Error('Google TTS 请求失败');
      return response.blob();
    })
    .then(function(blob) {
      var audioUrl = URL.createObjectURL(blob);
      var audio = new Audio(audioUrl);
      audio.play();
    })
    .catch(function() {
      // 如果 Google TTS 失败，尝试原生 TTS 作为保底
      if ('speechSynthesis' in window) {
        speakWithNativeTTS(text);
      }
    });
}

// 暴露到全局
window.speakWithGoogleTTS = speakWithGoogleTTS;
window.speakWithNativeTTS = speakWithNativeTTS;

console.log('✅ voice.js 已加载（PC=原生TTS / 手机=GoogleTTS）');
