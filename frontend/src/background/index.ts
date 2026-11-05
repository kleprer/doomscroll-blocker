import { api } from '../shared/api/client';
import type { BgRequest } from '../shared/messages';
import { getState, patchState } from '../shared/storage';
import type { Captcha, Result, VerifySuccess } from '../shared/types';

// сначала пусть бэк сам выберет уровень по клиентскому id
// если на этом уровне нет стихов (503), спускаемся ниже
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

// бэк сначала гасит старую капчу, потом делает новую
// если новая не получилась, старой уже нет, просто берём свежую
async function refresh(
  msg: Extract<BgRequest, { type: 'REFRESH' }>,
): Promise<Result<Captcha>> {
  const res = await api.refresh({ requestId: msg.requestId });
  if (res.ok) return res;
  const k = res.error.kind;
  if (['unavailable', 'conflict', 'expired', 'not_found', 'forbidden'].includes(k)) {
    return getCaptcha();
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
    });
  }
  return res;
}

async function handle(msg: BgRequest): Promise<Result<unknown>> {
  switch (msg.type) {
    case 'GET_STATUS':
      return { ok: true, data: await getState() };
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
  return true; // ответ асинхронный
});