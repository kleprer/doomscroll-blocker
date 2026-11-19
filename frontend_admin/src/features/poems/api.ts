import { api } from '../../shared/api/http';
import type { Page, Poem, PoemInput } from './types';
export const poemsApi = {
  list: (page: number, size = 8) => api<Page<Poem>>(`/poems?page=${page}&size=${size}&sort=createdAt,desc`),
  create: (body: PoemInput) => api<Poem>('/poems', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  update: (id: string, body: PoemInput) => api<Poem>(`/poems/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  activate: (id: string) => api<void>(`/poems/${encodeURIComponent(id)}/activate`, { method: 'PATCH' }),
  deactivate: (id: string) => api<void>(`/poems/${encodeURIComponent(id)}/deactivate`, { method: 'PATCH' }),
};
