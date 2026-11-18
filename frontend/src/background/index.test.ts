import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BgRequest } from '../shared/messages';
import type { Captcha, Result } from '../shared/types';

type Listener = (msg: BgRequest, sender: unknown, send: (r: Result<unknown>) => void) => boolean;

const cap = (id: string): Captcha => ({
  requestId: id, poemId: 'p' + id, title: 't', author: 'a', lines: ['x'],
  lineCount: 1, difficultyLevel: 1, type: 'RETYPE', displayText: 'x',
});

let store: Record<string, unknown>;
let listener: Listener;
let fetchMock: ReturnType<typeof vi.fn>;
const sentToTabs: unknown[] = [];

async function call(msg: BgRequest, tabId?: number): Promise<Result<unknown>> {
  return new Promise((resolve) => listener(msg, tabId ? { tab: { id: tabId } } : {}, resolve));
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(async () => {
  store = {};
  sentToTabs.length = 0;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (keys: string | Record<string, unknown>) =>
          typeof keys === 'string'
            ? { [keys]: store[keys] }
            : Object.fromEntries(Object.entries(keys).map(([k, d]) => [k, store[k] ?? d])),
        set: async (patch: Record<string, unknown>) => void Object.assign(store, patch),
      },
    },
    runtime: { onMessage: { addListener: (l: Listener) => (listener = l) } },
    tabs: {
      query: async () => [{ id: 1 }, { id: 2 }],
      sendMessage: async (id: number, m: unknown) => void sentToTabs.push([id, m]),
    },
  });
  vi.resetModules();
  await import('./index');
});

describe('background', () => {
  it('каждый запрос к /captcha уходит с X-Client-Id, id стабилен', async () => {
    fetchMock.mockImplementation(async () => json(200, cap('1')));
    await call({ type: 'GET_CAPTCHA' });
    await call({ type: 'GET_CAPTCHA' });
    const ids = fetchMock.mock.calls.map(([, init]) => (init.headers as Headers).get('X-Client-Id'));
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(ids[1]).toBe(ids[0]);
    expect(store.clientId).toBe(ids[0]);
  });

  it('REFRESH: при 409/410 откатывается на /captcha/new и сохраняет activeCaptcha', async () => {
    fetchMock
      .mockResolvedValueOnce(json(410, { message: 'expired' })) // refresh
      .mockResolvedValueOnce(json(200, cap('2'))); // new
    const res = await call({ type: 'REFRESH', requestId: '1' });
    expect(res.ok && (res.data as Captcha).requestId).toBe('2');
    expect((store.activeCaptcha as Captcha).requestId).toBe('2');
  });

  it('TRIGGER_CAPTCHA с force=true показывает капчу даже во время паузы (кнопка в popup)', async () => {
    store.snoozeUntil = Date.now() + 10 * 60_000;
    fetchMock.mockResolvedValue(json(200, cap('9')));
    await call({ type: 'TRIGGER_CAPTCHA', force: true });
    expect(fetchMock).toHaveBeenCalled();
    expect((store.activeCaptcha as Captcha | undefined)?.requestId).toBe('9');
  });

  it('TRIGGER_CAPTCHA без force не беспокоит во время паузы', async () => {
    store.snoozeUntil = Date.now() + 10 * 60_000;
    await call({ type: 'TRIGGER_CAPTCHA' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('REFRESH рассылает новое задание в другие вкладки, но не обратно инициатору', async () => {
    fetchMock.mockResolvedValue(json(200, cap('5')));
    await call({ type: 'REFRESH', requestId: '1' }, 1);
    expect(sentToTabs).toEqual([[2, { type: 'SHOW_CAPTCHA', captcha: cap('5') }]]);
  });

  it('force при уже активной капче показывает её, а не создаёт новую', async () => {
    store.activeCaptcha = cap('7');
    await call({ type: 'TRIGGER_CAPTCHA', force: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sentToTabs).toHaveLength(2);
  });

  it('force при недоступном бэке возвращает ошибку (popup её покажет)', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const res = await call({ type: 'TRIGGER_CAPTCHA', force: true });
    expect(res.ok).toBe(false);
  });

  it('успешный VERIFY снимает капчу и шлёт HIDE во все вкладки', async () => {
    store.activeCaptcha = cap('1');
    fetchMock.mockResolvedValue(json(200, {
      requestId: '1', blockedUntil: new Date(Date.now() + 900_000).toISOString(),
      poemsSolved: 3, nextDifficulty: 2,
    }));
    await call({ type: 'VERIFY', requestId: '1', poemId: 'p1', userInput: 'x' });
    expect(store.activeCaptcha).toBeNull();
    expect(store.nextDifficulty).toBe(2);
    expect(sentToTabs).toHaveLength(2);
  });
});
