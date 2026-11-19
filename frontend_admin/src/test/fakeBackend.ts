import type { Poem } from '../features/poems/types';

/** Имитация SecurityConfig + PoemFragmentController: сессия, CSRF, пагинация. */
export function createFakeBackend(seed = 2) {
  const token = 'tok-1';
  let loggedIn = false;
  const poems: Poem[] = Array.from({ length: seed }, (_, i) => ({
    id: `p${i + 1}`,
    author: `Автор ${i + 1}`,
    title: `Стих ${i + 1}`,
    content: 'строка один\nстрока два',
    source: 'src',
    isActive: i % 2 === 0,
    createdAt: '2026-11-01T10:00:00',
  }));
  const calls: { method: string; url: string; headers: Headers; body?: string }[] = [];
  const reply = (status: number, body?: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const fetchImpl = async (url: string, init: RequestInit = {}): Promise<Response> => {
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    const body = init.body === undefined ? undefined : String(init.body);
    calls.push({ method, url, headers, body });
    const [path, query = ''] = url.replace('/api/v1/admin', '').split('?');

    if (path === '/auth/csrf') return reply(200, { token, headerName: 'X-XSRF-TOKEN', parameterName: '_csrf' });
    if (method !== 'GET' && headers.get('X-XSRF-TOKEN') !== token) return reply(403);

    if (path === '/auth/login') {
      const f = new URLSearchParams(body);
      if (f.get('username') === 'admin' && f.get('password') === 'secret-secret-1') {
        loggedIn = true;
        return reply(200, { message: 'Login successful', username: 'admin' });
      }
      return reply(401, { message: 'Invalid username or password' });
    }
    if (path === '/auth/logout') {
      loggedIn = false;
      return reply(200, { message: 'Logout successful' });
    }
    if (!loggedIn) return reply(401);

    if (path === '/auth/me') return reply(200, { username: 'admin', role: 'ADMIN' });
    if (path === '/poems' && method === 'GET') {
      const q = new URLSearchParams(query);
      const page = Number(q.get('page') ?? 0);
      const size = Number(q.get('size') ?? 20);
      return reply(200, {
        content: poems.slice(page * size, page * size + size),
        number: page,
        size,
        totalElements: poems.length,
        totalPages: Math.max(1, Math.ceil(poems.length / size)),
      });
    }
    if (path === '/poems' && method === 'POST') {
      const data = JSON.parse(body!);
      if (Object.values(data).some((v) => String(v).trim() === '')) return reply(400, { message: 'content: must not be blank' });
      const created: Poem = { ...data, id: `p${poems.length + 1}`, isActive: true, createdAt: '2026-11-02T10:00:00' };
      poems.unshift(created);
      return reply(201, created);
    }
    const act = /^\/poems\/(.+)\/(activate|deactivate)$/.exec(path);
    if (act && method === 'PATCH') {
      const poem = poems.find((x) => x.id === act[1]);
      if (!poem) return reply(404, { message: 'Poem not found' });
      poem.isActive = act[2] === 'activate';
      return reply(204);
    }
    return reply(404);
  };

  return { fetchImpl, calls, poems, isLoggedIn: () => loggedIn };
}
