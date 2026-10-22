import { api } from '../shared/api/client';
import type { BgRequest } from '../shared/messages';
import { getState, patchState } from '../shared/storage';
import type { Captcha, Result, VerifySuccess } from '../shared/types';

// Если для уровня нет стихов (503), спускаемся на уровень ниже
async function getCaptcha(): Promise<Result<Captcha>> {
  const { nextDifficulty } = await getState();
  let last: Result<Captcha> = {
    ok: false,
    error: { kind: 'unavailable', message: 'Нет подходящих стихов' },
  };
  for (let level = nextDifficulty; level >= 1; level--) {
    last = await api.newCaptcha(level);
    if (last.ok || last.error.kind !== 'unavailable') return last;
  }
  return last;
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
  return true; // ответ будет асинхронным
});