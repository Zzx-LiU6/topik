// ========== 样式注入 ==========
const styleSheet = document.createElement('style');
styleSheet.textContent = `
:root {
  --bg-primary: #FFF9F0;
  --bg-secondary: #FFFEFA;
  --bg-card: #FFFFFF;
  --bg-card-hover: #FFF5E6;
  --bg-muted: #F5EBE0;
  --bg-overlay: rgba(107, 91, 69, 0.3);
  --text-primary: #6B5B45;
  --text-secondary: #8B7355;
  --text-muted: #B8A89A;
  --text-on-primary: #FFFFFF;
  --border-color: #F5EBE0;
  --border-strong: #E8DDD4;
  --shadow-color: rgba(107, 91, 69, 0.08);
  --accent-coffee: #8B7355;
  --accent-green: #22C55E;
  --accent-amber: #c97f47;
  --accent-red: #EF4444;
  --accent-blue: #60A5FA;
  --accent-purple: #A78BFA;
  --progress-bg: #F5EBE0;
  /* 错题按钮底色 */
  --bg-amber-100: #ffe9d8;
  --bg-amber-200: #ffd9bc;
}

  body.dark {
    --bg-primary: #103050;
    --bg-secondary: #14385c;
    --bg-card: #1a3654;
    --bg-card-hover: #204062;
    --bg-muted: #2b2742;
    --bg-overlay: rgba(0, 0, 0, 0.6);
    --text-primary: #f0e6d8;
    --text-secondary: #d1c2b0;
    --text-muted: #a09080;
    --text-on-primary: #FFFFFF;
    --border-color: #364b63;
    --border-strong: #475569;
    --shadow-color: rgba(0, 0, 0, 0.3);
    --accent-coffee: #b4a386;
    --accent-green: #4ADE80;
    --accent-amber: #f0c987;
    --accent-red: #F87171;
    --accent-blue: #818CF8;
    --accent-purple: #403c58;
    --progress-bg: #2a3f58;    /* 错题按钮深色底色 */
    --bg-amber-100: #253f57;
    --bg-amber-200: #304c68;
      #spell-input {
        background: var(--bg-card);
        color: var(--text-primary);
        border-color: var(--border-strong);
      }
  }

  /* 全局应用变量 */
  body {
    background: linear-gradient(to bottom, var(--bg-primary), var(--bg-secondary));
    color: var(--text-primary);
  }

  #app {
    color: var(--text-primary);
  }

  .home-card {
    background: var(--bg-card);
    border-color: var(--border-strong);
    box-shadow: 0 4px 6px var(--shadow-color);
  }

  .home-card:hover {
    box-shadow: 0 10px 20px var(--shadow-color);
  }

  button {
    color: inherit;
  }

  /* 原来的其他样式保持不变，但把颜色相关换成变量 */
  .bg-cream-100 { background-color: var(--bg-primary) !important; }
  .bg-cream-200 { background-color: var(--bg-muted) !important; }
  .bg-cream-300 { background-color: var(--border-color) !important; }
  .bg-white { background-color: var(--bg-card) !important; }
  .bg-coffee-400 { background-color: var(--accent-coffee) !important; }
  .bg-coffee-500 { background-color: var(--text-secondary) !important; }
  .bg-green-500 { background-color: var(--accent-green) !important; }
  .bg-amber-500 { background-color: var(--accent-amber) !important; }
  .bg-red-400 { background-color: var(--accent-red) !important; }
  .bg-red-50 { background-color: rgba(239, 68, 68, 0.1) !important; }
  .bg-blue-400 { background-color: var(--accent-blue) !important; }
  .bg-purple-400 { background-color: var(--accent-purple) !important; }
  .bg-yellow-100 { background-color: rgba(251, 191, 36, 0.2) !important; }
  .bg-green-100 { background-color: rgba(34, 197, 94, 0.2) !important; }
  .bg-cream-50 { background-color: var(--bg-card-hover) !important; }
  .bg-coffee-50 { background-color: rgba(139, 115, 85, 0.1) !important; }
  .bg-amber-50 { background-color: rgba(245, 158, 11, 0.1) !important; }
  .bg-green-50 { background-color: rgba(34, 197, 94, 0.1) !important; }
  .bg-purple-50 { background-color: rgba(167, 139, 250, 0.1) !important; }

  .text-coffee-600 { color: var(--text-primary) !important; }
  .text-coffee-500 { color: var(--text-secondary) !important; }
  .text-coffee-400 { color: var(--text-muted) !important; }
  .text-coffee-300 { color: var(--text-muted) !important; }
  .text-white { color: var(--text-on-primary) !important; }
  .text-green-600 { color: var(--accent-green) !important; }
  .text-amber-600 { color: var(--accent-amber) !important; }
  .text-red-500 { color: var(--accent-red) !important; }
  .text-yellow-600 { color: #D97706 !important; }
  .text-blue-600 { color: var(--accent-blue) !important; }
  .text-purple-600 { color: var(--accent-purple) !important; }

  .border-cream-300 { border-color: var(--border-color) !important; }
  .border-cream-200 { border-color: var(--border-strong) !important; }

  .from-cream-100 { --tw-gradient-from: var(--bg-primary); }
  .to-cream-200 { --tw-gradient-to: var(--bg-secondary); }
  .from-coffee-400 { --tw-gradient-from: var(--accent-coffee); }
  .to-coffee-500 { --tw-gradient-to: var(--text-secondary); }

  .bg-gradient-to-b {
    background-image: linear-gradient(to bottom, var(--tw-gradient-stops));
  }

  /* 保留原来的动画等样式... (不需要改动) */

  .flashcard {
    transition: transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
    transform-style: preserve-3d;
  }
  .flashcard.is-flipped {
    transform: rotateY(180deg);
  }
  .backface-hidden {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  .rotate-y-180 {
    transform: rotateY(180deg);
  }
  .perspective-container {
    perspective: 1200px;
    perspective-origin: center;
  }
  .card-hover {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  @media (hover: hover) and (pointer: fine) {
    #flashcard:hover .flashcard-front.card-hover {
      transform: translateY(-6px);
      box-shadow: 0 20px 40px var(--shadow-color);
    }
    #flashcard:hover .flashcard-back.card-hover {
      transform: translateY(-6px) rotateY(180deg);
      box-shadow: 0 20px 40px var(--shadow-color);
    }
  }
  .speaker-btn:hover svg {
    color: var(--text-secondary);
  }
  .speaker-wrapper {
    z-index: 20;
  }
  .action-btn {
    position: relative;
    overflow: hidden;
  }
  .action-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s;
  }
  .action-btn:hover::after {
    transform: translateX(100%);
  }
  .home-card:active {
    transform: scale(0.98);
  }
  @media (prefers-reduced-motion: reduce) {
    .flashcard, .action-btn, .card-hover, .fade-in {
      transition: none;
      animation: none;
    }
  }
  #app {
    transform: translateZ(0);
    will-change: contents;
  }
  #search-input {
    transform: translateZ(0);
    will-change: border-color;
    background: var(--bg-card);
    color: var(--text-primary);
    border-color: var(--border-strong);
  }
  #search-input::placeholder {
    color: var(--text-muted);
  }
  /* Toast 提示背景 */
  .toast-bg {
    background: var(--text-secondary);
  }
`;
document.head.appendChild(styleSheet);
