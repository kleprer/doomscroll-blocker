import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { send, type ContentMessage } from '../shared/messages';
import type { State } from '../shared/storage';
import type { Health } from '../shared/types';

function formatLeft(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const btn = {
  padding: '6px 12px',
  fontSize: 13,
  cursor: 'pointer',
  borderRadius: 6,
  border: '1px solid #ccc',
  background: '#fff',
  marginRight: 6,
} as const;

function Popup() {
  const [health, setHealth] = useState<Health | 'down' | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [left, setLeft] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void send<Health>({ type: 'HEALTH' }).then((r) => {
      if (!cancelled) setHealth(r.ok ? r.data : 'down');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void send<State>({ type: 'GET_STATUS' }).then((r) => {
      if (!cancelled && r.ok) setState(r.data);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!state) return;
    const update = () => setLeft(Math.max(0, state.snoozeUntil - Date.now()));
    const first = setTimeout(update, 0);
    const id = setInterval(update, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [state]);

  async function showCaptcha() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) return;
    try {
      const msg: ContentMessage = { type: 'SHOW_CAPTCHA' };
      await chrome.tabs.sendMessage(tab.id, msg);
      window.close();
    } catch {
      setNote('Открой YouTube / X / Reddit и обнови вкладку.');
    }
  }

  async function resetSnooze() {
    await send({ type: 'RESET_SNOOZE' });
    setReloadKey((k) => k + 1);
  }

  return (
    <div style={{ width: 320, padding: 16, fontFamily: 'system-ui', fontSize: 13 }}>
      <h1 style={{ fontSize: 16, margin: '0 0 12px' }}>Doomscroll Blocker</h1>

      <p style={{ color: '#666', margin: '0 0 8px' }}>
        Бэкенд:{' '}
        <b>{health === null ? '…' : health === 'down' ? 'недоступен' : health.status}</b>
      </p>

      {state && (
        <>
          <p style={{ color: '#666', margin: '0 0 8px' }}>
            {left > 0 ? (
              <>Пауза: ещё <b>{formatLeft(left)}</b></>
            ) : (
              <b>Блокировка активна</b>
            )}
          </p>
          <p style={{ color: '#666', margin: '0 0 12px' }}>
            Решено: <b>{state.poemsSolved}</b> · следующий уровень: <b>{state.nextDifficulty}</b>
          </p>
        </>
      )}

      <button style={btn} onClick={() => void showCaptcha()}>Показать капчу</button>
      <button style={btn} onClick={() => void resetSnooze()}>Сбросить паузу</button>

      {note && <p style={{ color: '#c33', margin: '10px 0 0' }}>{note}</p>}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Popup />);