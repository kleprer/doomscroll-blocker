import { useEffect, useState, type FormEvent } from 'react';
import { authApi } from '../api';
import type { Admin } from '../types';
export function useAuth() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => {
    authApi.me().then(setAdmin).catch(() => setAdmin(null)).finally(() => setChecking(false));
  }, []);
  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await authApi.login(username.trim(), password); setAdmin(await authApi.me()); setPassword(''); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try { await authApi.logout(); setAdmin(null);  }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return {admin, checking, busy, setBusy, error, setError, notice, setNotice, username, setUsername, password, setPassword, login, logout};
}
