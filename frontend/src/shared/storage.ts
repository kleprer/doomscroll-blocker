export type State = {
  snoozeUntil: number; // epoch ms: до этого момента скроллить можно
  poemsSolved: number;
  nextDifficulty: number;
};

export const DEFAULT_STATE: State = {
  snoozeUntil: 0,
  poemsSolved: 0,
  nextDifficulty: 1,
};

export async function getState(): Promise<State> {
  return (await chrome.storage.local.get(DEFAULT_STATE)) as State;
}

export function patchState(patch: Partial<State>): Promise<void> {
  return chrome.storage.local.set(patch);
}