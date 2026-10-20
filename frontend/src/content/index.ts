import { SCROLL_THRESHOLD, SCROLL_WINDOW_MS } from '../shared/constants';

let scrolled = 0;
let lastY = window.scrollY;
let triggered = false;

window.addEventListener(
  'scroll',
  () => {
    scrolled += Math.abs(window.scrollY - lastY);
    lastY = window.scrollY;
  },
  { passive: true }
);

setInterval(() => {
  console.log('[doomscroll] scrolled:', scrolled, 'px');

  if (scrolled > SCROLL_THRESHOLD && !triggered) {
    triggered = true;
    console.log('[doomscroll] TRIGGER');
    chrome.runtime.sendMessage({ type: 'TRIGGER_CAPTCHA' });
  }

  scrolled = 0;
}, SCROLL_WINDOW_MS);