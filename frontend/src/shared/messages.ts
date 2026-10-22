import type { Result } from './types';

// content / popup -> background
export type BgRequest =
  | { type: 'GET_STATUS' }
  | { type: 'GET_CAPTCHA' }
  | { type: 'VERIFY'; requestId: string; poemId: string; userInput: string }
  | { type: 'HEALTH' }
  | { type: 'RESET_SNOOZE' };

// popup -> content
export type ContentMessage = { type: 'SHOW_CAPTCHA' };

export async function send<T>(msg: BgRequest): Promise<Result<T>> {
  try {
    return (await chrome.runtime.sendMessage(msg)) as Result<T>;
  } catch {
    return {
      ok: false,
      error: { kind: 'network', message: 'Расширение недоступно — обнови страницу' },
    };
  }
}