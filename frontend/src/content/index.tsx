import { createRoot, type Root } from 'react-dom/client';
import {
  SAMPLE_INTERVAL_MS,
  SCROLL_THRESHOLD_PX,
  SCROLL_WINDOW_MS,
} from '../shared/constants';
import { send, type ContentMessage } from '../shared/messages';
import type { Captcha } from '../shared/types';
import Overlay from './Overlay';
import styles from './overlay.css?inline';

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

let busy = false;
let currentRoot: Root | null = null;
let currentHost: HTMLElement | null = null;

function mountOverlay(captcha: Captcha) {
  if (busy) return;
  busy = true;

  const host = document.createElement('div');
  host.id = 'doomscroll-blocker-host';
  host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647;';
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

  currentHost = host;
  currentRoot = createRoot(mount);

  const close = () => {
    if (currentRoot) currentRoot.unmount();
    if (currentHost) currentHost.remove();
    html.style.overflow = prevOverflow;
    buckets.length = 0;
    busy = false;
    currentRoot = null;
    currentHost = null;
  };

  currentRoot.render(<Overlay initialCaptcha={captcha} onSolved={close} />);
}

async function checkActiveCaptcha() {
  const res = await send<Captcha | null>({ type: 'GET_ACTIVE_CAPTCHA' });
  if (res.ok && res.data) {
    mountOverlay(res.data);
  }
}

checkActiveCaptcha();

setInterval(() => {
  if (busy) return;
  if (scrolledInWindow() > SCROLL_THRESHOLD_PX) {
    buckets.length = 0;
    void send({ type: 'TRIGGER_CAPTCHA' });
  }
}, SAMPLE_INTERVAL_MS);

chrome.runtime.onMessage.addListener((msg: ContentMessage) => {
  if (msg.type === 'SHOW_CAPTCHA') {
    mountOverlay(msg.captcha);
  }
  if (msg.type === 'HIDE_CAPTCHA') {
    if (currentRoot) {
      currentRoot.unmount();
      currentHost?.remove();
      document.documentElement.style.overflow = '';
      busy = false;
      currentRoot = null;
      currentHost = null;
    }
  }
});