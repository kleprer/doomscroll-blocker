import { API_BASE } from '../constants';
import type {
  ApiError,
  ApiErrorInfo,
  Captcha,
  Health,
  Poem,
  Result,
  VerifyRequest,
  VerifySuccess,
} from '../types';

function kindFor(status: number): ApiErrorInfo['kind'] {
  switch (status) {
    case 400: return 'bad_request';
    case 404: return 'not_found';
    case 409: return 'conflict';
    case 410: return 'expired';
    case 422: return 'mismatch';
    case 503: return 'unavailable';
    default: return 'unknown';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, init);
    if (res.ok) return { ok: true, data: (await res.json()) as T };

    const body = (await res.json().catch(() => null)) as Partial<ApiError> | null;
    return {
      ok: false,
      error: {
        kind: kindFor(res.status),
        status: res.status,
        message: body?.message ?? `HTTP ${res.status}`,
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
};