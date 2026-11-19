import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeBackend } from '../../test/fakeBackend';
import { api, resetCsrf } from './http';

let be: ReturnType<typeof createFakeBackend>;
beforeEach(() => {
  resetCsrf();
  be = createFakeBackend();
  vi.stubGlobal('fetch', be.fetchImpl);
});

const login = () =>
  api('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'admin', password: 'secret-secret-1' }),
  });

describe('api()', () => {
  it('GET не запрашивает CSRF-токен', async () => {
    await login();
    be.calls.length = 0;
    await api('/auth/me');
    expect(be.calls).toHaveLength(1);
    expect(be.calls[0].headers.has('X-XSRF-TOKEN')).toBe(false);
  });

  it('POST: сначала /auth/csrf, затем запрос с заголовком X-XSRF-TOKEN', async () => {
    await login();
    expect(be.calls[0].url).toContain('/auth/csrf');
    expect(be.calls[1].headers.get('X-XSRF-TOKEN')).toBe('tok-1');
  });

  it('токен кэшируется: второй POST не ходит за новым', async () => {
    await login();
    be.calls.length = 0;
    await api('/poems/p1/deactivate', { method: 'PATCH' });
    expect(be.calls.map((c) => c.url)).toEqual(['/api/v1/admin/poems/p1/deactivate']);
  });

  it('204 → undefined, без попытки разобрать тело', async () => {
    await login();
    await expect(api<void>('/poems/p1/activate', { method: 'PATCH' })).resolves.toBeUndefined();
  });

  it('401 → понятное сообщение', async () => {
    await expect(api('/auth/me')).rejects.toThrow('Неверные учётные данные или сессия завершилась');
  });

  it('текст ошибки берётся из message бэка', async () => {
    await login();
    await expect(api('/poems/zzz/activate', { method: 'PATCH' })).rejects.toThrow('Poem not found');
  });

  it('403 сбрасывает кэш токена (следующий POST запросит новый)', async () => {
    await login();
    be.calls.length = 0;
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) =>
      String(url).includes('/auth/csrf') ? be.fetchImpl(url, init) : new Response(null, { status: 403 }),
    );
    await expect(api('/poems/p1/activate', { method: 'PATCH' })).rejects.toThrow('CSRF');
    vi.stubGlobal('fetch', be.fetchImpl);
    be.calls.length = 0;
    await api('/poems/p1/activate', { method: 'PATCH' });
    expect(be.calls[0].url).toContain('/auth/csrf');
  });
});
