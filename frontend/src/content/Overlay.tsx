import { useEffect, useState } from 'react';
import { send } from '../shared/messages';
import type { ApiErrorInfo, Captcha, VerifySuccess } from '../shared/types';

type Props = { onSolved: () => void };

function messageFor(e: ApiErrorInfo): string {
  switch (e.kind) {
    case 'mismatch':
      return e.attemptsLeft !== undefined
        ? `Не совпадает. Осталось попыток: ${e.attemptsLeft}.`
        : 'Не совпадает. Проверь текст и попробуй ещё раз.';
    case 'forbidden':
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

  async function refreshCaptcha() {
    if (!captcha || busy) return;
    setBusy(true);
    setError(null);
    const res = await send<Captcha>({ type: 'REFRESH', requestId: captcha.requestId });
    setInput('');
    if (res.ok) setCaptcha(res.data);
    else setError(messageFor(res.error));
    setBusy(false);
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
    if (k === 'expired' || k === 'conflict' || k === 'not_found' || k === 'forbidden') {
      reload(messageFor(res.error));
      return;
    }
    if (k === 'mismatch' && res.error.attemptsLeft === 0) {
      reload('Попытки закончились — загружаю новое задание.');
      return;
    }
    setError(messageFor(res.error));
    setBusy(false);
  }

  const isFill = captcha?.type === 'FILL_IN';
  const canSubmit = !busy && input.trim() !== '';

  const blanks = captcha ? captcha.displayText.split('_____').length - 1 : 0;
  const fillHint =
    blanks > 1
      ? `Впиши пропущенные слова (их ${blanks}) через пробел, по порядку.`
      : 'Впиши пропущенное слово.';

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
                ? fillHint
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
              <button className="secondary" onClick={() => void refreshCaptcha()} disabled={busy}>
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