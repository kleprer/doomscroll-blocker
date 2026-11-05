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

async function refresh(
  msg: Extract<BgRequest, { type: 'REFRESH' }>,
): Promise<Result<Captcha>> {
  const res = await api.refresh({ requestId: msg.requestId });
  if (res.ok) {
    await patchState({ activeCaptcha: res.data });
    return res;
  }
  const k = res.error.kind;
  if (['unavailable', 'conflict', 'expired', 'not_found', 'forbidden'].includes(k)) {
    const fallback = await getCaptcha();
    if (fallback.ok) await patchState({ activeCaptcha: fallback.data });
    return fallback;
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
    
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'HIDE_CAPTCHA' } as ContentMessage).catch(() => {});
      }
    }
  }
  return res;
}

async function triggerCaptcha(): Promise<void> {
  const state = await getState();
  if (state.activeCaptcha || Date.now() < state.snoozeUntil) return;

  const res = await getCaptcha();
  if (res.ok) {
    await patchState({ activeCaptcha: res.data });
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'SHOW_CAPTCHA', captcha: res.data } as ContentMessage).catch(() => {});
      }
    }
  }
}

async function handle(msg: BgRequest): Promise<Result<unknown>> {
  switch (msg.type) {
    case 'GET_STATUS':
      return { ok: true, data: await getState() };
    case 'GET_ACTIVE_CAPTCHA': {
      const state = await getState();
      return { ok: true, data: state.activeCaptcha };
    }
    case 'TRIGGER_CAPTCHA':
      await triggerCaptcha();
      return { ok: true, data: null };
    case 'GET_CAPTCHA':
      return getCaptcha();
    case 'REFRESH':
      return refresh(msg);
    case 'VERIFY':
      return verify(msg);
    case 'HEALTH':
      return api.health();
    case 'RESET_SNOOZE':
      await patchState({ snoozeUntil: 0 });
      return { ok: true, data: null };
  }
}

chrome.runtime.onMessage.addListener((msg: BgRequest, _sender, sendResponse) => {
  void handle(msg).then(sendResponse);
  return true;
});