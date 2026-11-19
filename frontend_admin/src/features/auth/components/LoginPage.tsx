import type { FormEvent } from 'react';

type Props = {
  username: string;
  password: string;
  error: string;
  busy: boolean;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  onLogin: (event: FormEvent) => void;
};

export function LoginPage({ username, password, error, busy, setUsername, setPassword, onLogin }: Props) {
  return (
    <main className="login-layout">
      <form className="login-card" onSubmit={onLogin}>
        <h1>Админ-панель</h1>
        {error && <div className="alert" role="alert">{error}</div>}
        <label>
          Логин
          <input autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} />
        </label>
        <label>
          Пароль
          <input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
        </label>
        <button className="primary full" disabled={busy} type="submit">{busy ? 'Вход…' : 'Войти'}</button>
      </form>
    </main>
  );
}
