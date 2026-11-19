let csrfToken: string | null = null;
const root = '/api/v1/admin';

async function parseError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => null) as { message?: string; detail?: string } | null;
  if (response.status === 401) return new Error('Неверные учётные данные или сессия завершилась');
  if (response.status === 403) return new Error('Нет доступа или CSRF-токен устарел');
  return new Error(body?.message || body?.detail || `Ошибка сервера: ${response.status}`);
}

export async function ensureCsrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch(`${root}/auth/csrf`, { credentials: 'same-origin' });
  if (!res.ok) throw await parseError(res);
  const data = await res.json() as { token: string };
  csrfToken = data.token;
  return csrfToken;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const method = (options.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('X-XSRF-TOKEN', await ensureCsrf());
  }
  const res = await fetch(`${root}${path}`, { ...options, headers, credentials: 'same-origin' });
  if (!res.ok) {
    if (res.status === 403) csrfToken = null;
    throw await parseError(res);
  }
  if (res.status === 204) return undefined as T;
  return await res.json() as T;
}


export function resetCsrf() { csrfToken = null; }
