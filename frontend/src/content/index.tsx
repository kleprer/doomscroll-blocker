import { createRoot } from 'react-dom/client';
import {
  SAMPLE_INTERVAL_MS,
  SCROLL_THRESHOLD_PX,
  SCROLL_WINDOW_MS,
} from '../shared/constants';
import { send, type ContentMessage } from '../shared/messages';
import type { State } from '../shared/storage';
import Overlay from './Overlay';
import styles from './overlay.css?inline';

// ---- учёт прокрутки: корзины по секундам в скользящем окне ----
type Bucket = { sec: number; px: number };
const buckets: Bucket[] = [];
const lastPos = new WeakMap<EventTarget, number>();

function addScroll(px: number) {
  const sec = Math.floor(Date.now() / 1000);
  const last = buckets[buckets.length - 1];
  if (last && last.sec === sec) last.px += px;
  else buckets.push({ sec, px });
}

function scrolledInWindow(): number {
  const min = Math.floor((Date.now() - SCROLL_WINDOW_MS) / 1000);
  while (buckets.length > 0 && buckets[0].sec < min) buckets.shift();
  return buckets.reduce((sum, b) => sum + b.px, 0);
}

function positionOf(target: EventTarget): number {
  if (target === document || target === window) return window.scrollY;
  return target instanceof Element ? target.scrollTop : 0;
}

document.addEventListener(
  'scroll',
  (e) => {
    const target = e.target ?? document;
    const pos = positionOf(target);
    const prev = lastPos.get(target) ?? pos;
    lastPos.set(target, pos);
    addScroll(Math.abs(pos - prev));
  },
  { capture: true, passive: true },
);

// ---- оверлей ----
let busy = false; // оверлей открыт или идёт проверка статуса

function mountOverlay() {
  const host = document.createElement('div');
  host.id = 'doomscroll-blocker-host';
  host.style.cssText =
    'all: initial; position: fixed; inset: 0; z-index: 2147483647;';
  // Не пускаем нажатия клавиш к горячим клавишам сайта (пробел, j/k и т.п.)
  for (const type of ['keydown', 'keyup', 'keypress']) {
    host.addEventListener(type, (e) => e.stopPropagation());
  }

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  const mount = document.createElement('div');
  shadow.append(style, mount);
  document.documentElement.append(host);

  const html = document.documentElement;
  const prevOverflow = html.style.overflow;
  html.style.overflow = 'hidden';

  const root = createRoot(mount);
  const close = () => {
    root.unmount();
    host.remove();
    html.style.overflow = prevOverflow;
    buckets.length = 0;
    busy = false;
  };
  root.render(<Overlay onSolved={close} />);
}

async function trigger(force: boolean) {
  if (busy) return;
  busy = true;
  if (!force) {
    const res = await send<State>({ type: 'GET_STATUS' });
    if (res.ok && res.data.snoozeUntil > Date.now()) {
      buckets.length = 0; // пауза ещё идёт — считаем заново
      busy = false;
      return;
    }
  }
  mountOverlay();
}

setInterval(() => {
  if (!busy && scrolledInWindow() > SCROLL_THRESHOLD_PX) void trigger(false);
}, SAMPLE_INTERVAL_MS);

// Кнопка «показать капчу» в popup (для проверки без скролла)
chrome.runtime.onMessage.addListener((msg: ContentMessage) => {
  if (msg.type === 'SHOW_CAPTCHA') void trigger(true);
});