import { useEffect, useState } from 'react';
import { send } from '../shared/messages';
import type { ApiErrorInfo, Captcha, VerifySuccess } from '../shared/types';

type Props = { onSolved: () => void };

function messageFor(e: ApiErrorInfo): string {
  switch (e.kind) {
    case 'mismatch':
      return 'Не совпадает. Проверь текст и попробуй ещё раз.';
    case 'expired':
    case 'conflict':
    case 'not_found':
      return 'Задание устарело — загружаю новое.';
    case 'unavailable':
      return 'На сервере нет подходящих стихов.';
    case 'network':
      return 'Сервер недоступен. Запущен ли бэкенд?';
    default:
      return e.message;
  }
}

export default function Overlay({ onSolved }: Props) {
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void send<Captcha>({ type: 'GET_CAPTCHA' }).then((res) => {
      if (cancelled) return;
      if (res.ok) setCaptcha(res.data);
      else setError(messageFor(res.error));
      setBusy(false);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function reload(message: string | null = null) {
    setCaptcha(null);
    setInput('');
    setError(message);
    setBusy(true);
    setAttempt((a) => a + 1);
  }

  async function submit() {
    if (!captcha || busy || input.trim() === '') return;
    setBusy(true);
    setError(null);

    const res = await send<VerifySuccess>({
      type: 'VERIFY',
      requestId: captcha.requestId,
      poemId: captcha.poemId,
      userInput: input,
    });

    if (res.ok) {
      onSolved();
      return;
    }
    const k = res.error.kind;
    if (k === 'expired' || k === 'conflict' || k === 'not_found') {
      reload(messageFor(res.error));
      return;
    }
    setError(messageFor(res.error));
    setBusy(false);
  }

  const isFill = captcha?.type === 'FILL_IN';
  const canSubmit = !busy && input.trim() !== '';

  return (
    <div className="backdrop" role="dialog" aria-modal="true">
      <div className="card">
        <h2>Сначала — стихи</h2>

        {captcha ? (
          <>
            <p className="author">
              {captcha.author} — «{captcha.title}»
            </p>
            <p className="hint">
              {isFill
                ? 'Впиши пропущенное слово.'
                : 'Перепечатай стихотворение целиком (вставка отключена).'}
            </p>
            <pre className="poem">{captcha.displayText}</pre>

            {isFill ? (
              <input
                value={input}
                autoFocus
                onChange={(e) => setInput(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit();
                }}
              />
            ) : (
              <textarea
                value={input}
                autoFocus
                onChange={(e) => setInput(e.target.value)}
                onPaste={(e) => e.preventDefault()}
              />
            )}

            <div className="row">
              <button onClick={() => void submit()} disabled={!canSubmit}>
                Проверить
              </button>
              <button className="secondary" onClick={() => reload()} disabled={busy}>
                Другое задание
              </button>
            </div>
          </>
        ) : busy ? (
          <p className="hint">Загружаю задание…</p>
        ) : (
          <button onClick={() => reload()}>Повторить</button>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}