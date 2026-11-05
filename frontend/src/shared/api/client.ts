import { API_BASE } from '../constants';
import { getClientId } from '../storage';
import type {
  ApiError,
  ApiErrorInfo,
  Captcha,
  Health,
  MismatchBody,
  Poem,
  RefreshRequest,
  Result,
  VerifyRequest,
  VerifySuccess,
} from '../types';

function kindFor(status: number): ApiErrorInfo['kind'] {
  switch (status) {
    case 400: return 'bad_request';
    case 403: return 'forbidden';
    case 404: return 'not_found';
    case 409: return 'conflict';
    case 410: return 'expired';
    case 422: return 'mismatch';
    case 503: return 'unavailable';
    default: return 'unknown';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<Result<T>> {
  try {
    const headers = new Headers(init.headers);
    headers.set('X-Client-Id', await getClientId());
    const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    if (res.ok) return { ok: true, data: (await res.json()) as T };

    const body = (await res.json().catch(() => null)) as
      (Partial<ApiError> & Partial<MismatchBody>) | null;
    return {
      ok: false,
      error: {
        kind: kindFor(res.status),
        status: res.status,
        message: body?.message ?? `HTTP ${res.status}`,
        attemptsLeft: body?.details?.attemptsLeft,
      },
    };
  } catch {
    return { ok: false, error: { kind: 'network', message: 'Сервер недоступен' } };
  }
}

export const api = {
  health: () => request<Health>('/health'),
  poems: () => request<Poem[]>('/poems'),
  newCaptcha: (difficulty: number | 'auto' = 'auto') =>
    request<Captcha>(`/captcha/new?difficulty=${difficulty}`),
  verify: (body: VerifyRequest) =>
    request<VerifySuccess>('/captcha/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  refresh: (body: RefreshRequest) =>
    request<Captcha>('/captcha/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
};