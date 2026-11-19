import { useAuth } from './features/auth/hooks/useAuth';
import { LoginPage } from './features/auth/components/LoginPage';
import { usePoems } from './features/poems/hooks/usePoems';
import { PoemLibraryPage } from './features/poems/components/PoemLibraryPage';
export function App() {
  const auth = useAuth();
  const poems = usePoems(auth.admin, auth.busy, auth.setBusy, auth.setError, auth.setNotice);
  if (auth.checking) return <main className="center-screen"><div className="spinner"/>Проверяем сессию…</main>;
  if (!auth.admin) return <LoginPage username={auth.username} password={auth.password} error={auth.error} busy={auth.busy} setUsername={auth.setUsername} setPassword={auth.setPassword} onLogin={auth.login}/>;
  return <PoemLibraryPage admin={auth.admin} busy={auth.busy} error={auth.error} notice={auth.notice} logout={auth.logout} poems={poems}/>;
}
