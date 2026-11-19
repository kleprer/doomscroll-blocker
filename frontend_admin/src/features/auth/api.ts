import { api, resetCsrf } from '../../shared/api/http';
import type { Admin } from './types';
export const authApi = {
  me: () => api<Admin>('/auth/me'),
  async login(username: string, password: string) {
    const body = new URLSearchParams({ username, password });
    const result = await api<{ username: string }>('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    resetCsrf();
    return result;
  },
  async logout() {
    try { await api<{ message: string }>('/auth/logout', { method: 'POST' }); }
    finally { resetCsrf(); }
  }
};
