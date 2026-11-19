import { api } from '../shared/api/client';
import type { BgRequest, ContentMessage } from '../shared/messages';
import { getState, patchState } from '../shared/storage';
import type { Captcha, Result, VerifySuccess } from '../shared/types';

async function getCaptcha(): Promise<Result<Captcha>> {
  const auto = await api.newCaptcha('auto');
  if (auto.ok || auto.error.kind !== 'unavailable') return auto;

  const { nextDifficulty } = await getState();
  let last: Result<Captcha> = auto;
  for (let level = nextDifficulty - 1; level >= 1; level--) {
    last = await api.newCaptcha(level);
    if (last.ok || last.error.kind !== 'unavailable') return last;
  }
  return last;
}

// Шлём сообщение во все вкладки, кроме инициатора (он уже в курсе)
async function broadcast(msg: ContentMessage, exceptTabId?: number): Promise<void> {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id === undefined || tab.id === exceptTabId) continue;
    chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
  }
}

async function refresh(
  msg: Extract<BgRequest, { type: 'REFRESH' }>,
  senderTabId?: number,
): Promise<Result<Captcha>> {
  let res = await api.refresh({ requestId: msg.requestId });
  if (
    !res.ok &&
    ['unavailable', 'conflict', 'expired', 'not_found', 'forbidden'].includes(res.error.kind)
  ) {
    // старое задание уже недействительно (а при 503 — ещё и отменено): берём новое
    res = await getCaptcha();
  }
  if (res.ok) {
    await patchState({ activeCaptcha: res.data });
    // остальные вкладки не должны показывать отменённое задание
    await broadcast({ type: 'SHOW_CAPTCHA', captcha: res.data }, senderTabId);
  }
  return res;
}

async function verify(
  msg: Extract<BgRequest, { type: 'VERIFY' }>,
): Promise<Result<VerifySuccess>> {
  const res = await api.verify({
    requestId: msg.requestId,
    poemId: msg.poemId,
    userInput: msg.userInput,
  });
  if (res.ok) {
    await patchState({
      snoozeUntil: Date.parse(res.data.blockedUntil),
      poemsSolved: res.data.poemsSolved,
      nextDifficulty: res.data.nextDifficulty,
      activeCaptcha: null,
    });
    await broadcast({ type: 'HIDE_CAPTCHA' });
  }
  return res;
}

async function triggerCaptcha(force: boolean): Promise<Result<null>> {
  const state = await getState();
  if (!force && (state.activeCaptcha || Date.now() < state.snoozeUntil)) {
    return { ok: true, data: null };
  }

  let captcha = state.activeCaptcha;
  if (!captcha) {
    const res = await getCaptcha();
    if (!res.ok) return res; // popup покажет причину
    captcha = res.data;
    await patchState({ activeCaptcha: captcha });
  }
  await broadcast({ type: 'SHOW_CAPTCHA', captcha });
  return { ok: true, data: null };
}

async function handle(
  msg: BgRequest,
  sender: chrome.runtime.MessageSender,
): Promise<Result<unknown>> {
  switch (msg.type) {
    case 'GET_STATUS':
      return { ok: true, data: await getState() };
    case 'GET_ACTIVE_CAPTCHA': {
      const state = await getState();
      return { ok: true, data: state.activeCaptcha };
    }
    case 'TRIGGER_CAPTCHA':
      return triggerCaptcha(msg.force === true);
    case 'GET_CAPTCHA':
      return getCaptcha();
    case 'REFRESH':
      return refresh(msg, sender.tab?.id);
    case 'VERIFY':
      return verify(msg);
    case 'HEALTH':
      return api.health();
    case 'RESET_SNOOZE':
      await patchState({ snoozeUntil: 0 });
      return { ok: true, data: null };
  }
}

chrome.runtime.onMessage.addListener((msg: BgRequest, sender, sendResponse) => {
  void handle(msg, sender).then(sendResponse);
  return true;
});