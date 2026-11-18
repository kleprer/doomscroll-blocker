import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Captcha, Result } from '../shared/types';

// Overlay общается с background только через send() — подменяем его
const sendMock = vi.fn();
vi.mock('../shared/messages', () => ({ send: (m: unknown) => sendMock(m) }));

import Overlay from './Overlay';

const captcha = (id: string, over: Partial<Captcha> = {}): Captcha => ({
  requestId: id,
  poemId: 'p-' + id,
  title: 'Т',
  author: 'А',
  lines: ['a'],
  lineCount: 1,
  difficultyLevel: 1,
  type: 'RETYPE',
  displayText: 'строка',
  ...over,
});

const ok = <T,>(data: T): Result<T> => ({ ok: true, data });
const fail = (kind: string, extra = {}): Result<never> =>
  ({ ok: false, error: { kind, message: kind, ...extra } }) as Result<never>;

afterEach(() => {
  cleanup();
  sendMock.mockReset();
});

function typeAndSubmit(text: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
  fireEvent.click(screen.getByText('Проверить'));
}

describe('Overlay', () => {
  it('закрывается при успешной проверке', async () => {
    const onSolved = vi.fn();
    sendMock.mockResolvedValueOnce(ok({}));
    render(<Overlay initialCaptcha={captcha('1')} onSolved={onSolved} />);
    typeAndSubmit('строка');
    await waitFor(() => expect(onSolved).toHaveBeenCalled());
  });

  it('показывает сколько попыток осталось при MISMATCH', async () => {
    sendMock.mockResolvedValueOnce(fail('mismatch', { attemptsLeft: 2 }));
    render(<Overlay initialCaptcha={captcha('1')} onSolved={vi.fn()} />);
    typeAndSubmit('не то');
    expect(await screen.findByText(/Осталось попыток: 2/)).toBeTruthy();
  });

  it('при attemptsLeft=0 запрашивает новое задание и не зависает', async () => {
    sendMock
      .mockResolvedValueOnce(fail('mismatch', { attemptsLeft: 0 })) // VERIFY
      .mockResolvedValueOnce(ok(captcha('2', { displayText: 'новое' }))); // REFRESH
    render(<Overlay initialCaptcha={captcha('1')} onSolved={vi.fn()} />);
    typeAndSubmit('не то');

    expect(await screen.findByText('новое')).toBeTruthy();
    expect(sendMock).toHaveBeenLastCalledWith({ type: 'REFRESH', requestId: '1' });
    expect(screen.getByText('Проверить')).toBeTruthy();
    await waitFor(() =>
      expect((screen.getByText('Другое задание') as HTMLButtonElement).disabled).toBe(false),
    );
  });

  it('при устаревшем задании (410) подгружает новое и снимает блокировку кнопок', async () => {
    sendMock
      .mockResolvedValueOnce(fail('expired')) // VERIFY
      .mockResolvedValueOnce(ok(captcha('3', { displayText: 'свежее' }))); // REFRESH
    render(<Overlay initialCaptcha={captcha('1')} onSolved={vi.fn()} />);
    typeAndSubmit('что-то');

    expect(await screen.findByText('свежее')).toBeTruthy();
    await waitFor(() =>
      expect((screen.getByText('Другое задание') as HTMLButtonElement).disabled).toBe(false),
    );
  });

  it('подсказка FILL_IN учитывает число пропусков', () => {
    render(
      <Overlay
        initialCaptcha={captcha('1', { type: 'FILL_IN', displayText: 'а _____ б _____ в _____' })}
        onSolved={vi.fn()}
      />,
    );
    expect(screen.getByText(/их 3/)).toBeTruthy();
  });
});
