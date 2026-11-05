import type { Captcha } from './types';

export type State = {
  snoozeUntil: number;
  poemsSolved: number;
  nextDifficulty: number;
  activeCaptcha: Captcha | null;
};

export const DEFAULT_STATE: State = {
  snoozeUntil: 0,
  poemsSolved: 0,
  nextDifficulty: 1,
  activeCaptcha: null,
};

export async function getState(): Promise<State> {
  return (await chrome.storage.local.get(DEFAULT_STATE)) as State;
}

export function patchState(patch: Partial<State>): Promise<void> {
  return chrome.storage.local.set(patch);
}

const CLIENT_ID_KEY = 'clientId';
let clientIdPromise: Promise<string> | null = null;

async function loadClientId(): Promise<string> {
  const saved = (await chrome.storage.local.get(CLIENT_ID_KEY))[CLIENT_ID_KEY];
  if (typeof saved === 'string') return saved;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ [CLIENT_ID_KEY]: id });
  return id;
}

export function getClientId(): Promise<string> {
  return (clientIdPromise ??= loadClientId());
}