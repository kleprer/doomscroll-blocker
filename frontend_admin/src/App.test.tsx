import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { resetCsrf } from './shared/api/http';
import { createFakeBackend } from './test/fakeBackend';

let be: ReturnType<typeof createFakeBackend>;
function setup(seed = 2) {
  resetCsrf();
  be = createFakeBackend(seed);
  vi.stubGlobal('fetch', be.fetchImpl);
}
beforeEach(() => setup());
afterEach(cleanup);

async function logIn(password = 'secret-secret-1') {
  render(<App />);
  fireEvent.change(await screen.findByLabelText('Логин'), { target: { value: 'admin' } });
  fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: password } });
  fireEvent.click(screen.getByText('Войти'));
}

describe('админка', () => {
  it('без сессии показывает форму входа', async () => {
    render(<App />);
    expect(await screen.findByText('Админ-панель')).toBeTruthy();
  });

  it('неверный пароль: сообщение об ошибке, остаёмся на входе', async () => {
    await logIn('wrong');
    expect((await screen.findByRole('alert')).textContent).toContain('Неверные учётные данные');
    expect(screen.queryByText('Библиотека стихов')).toBeNull();
  });

  it('вход → таблица со стихами и счётчиками', async () => {
    await logIn();
    expect(await screen.findByText('Стих 1')).toBeTruthy();
    expect(screen.getByText('Стих 2')).toBeTruthy();
    expect(screen.getByText('Активно')).toBeTruthy();
    expect(screen.getByText('Отключено')).toBeTruthy();
  });

  it('отключить / включить стихотворение', async () => {
    await logIn();
    await screen.findByText('Стих 1');
    fireEvent.click(screen.getByText('Отключить'));
    await waitFor(() => expect(be.poems.find((p) => p.id === 'p1')!.isActive).toBe(false));
    expect(await screen.findByText(/деактивировано/)).toBeTruthy();
    expect(screen.getAllByText('Включить')).toHaveLength(2);
  });

  it('создание стихотворения через модалку', async () => {
    await logIn();
    await screen.findByText('Стих 1');
    fireEvent.click(screen.getByText('Добавить стихотворение'));

    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Парус' } });
    fireEvent.change(screen.getByLabelText('Автор'), { target: { value: 'Лермонтов' } });
    fireEvent.change(screen.getByLabelText('Источник'), { target: { value: 'сборник' } });
    fireEvent.change(screen.getByLabelText('Текст стихотворения'), { target: { value: 'Белеет парус\nодинокий' } });
    fireEvent.click(screen.getByText('Сохранить'));

    expect(await screen.findByText(/Стихотворение добавлено/)).toBeTruthy();
    expect(be.poems).toHaveLength(3);
    const post = be.calls.find((c) => c.method === 'POST' && c.url.endsWith('/poems'))!;
    expect(post.headers.get('Content-Type')).toBe('application/json');
    expect(JSON.parse(post.body!)).toEqual({
      title: 'Парус', author: 'Лермонтов', source: 'сборник', content: 'Белеет парус\nодинокий',
    });
  });

  it('пагинация: 10 стихов → 2 страницы по 8', async () => {
    cleanup();
    setup(10);
    await logIn();
    await screen.findByText('Стих 1');
    expect(screen.getByText(/Страница 1 из 2/)).toBeTruthy();
    fireEvent.click(screen.getByText('Далее →'));
    expect(await screen.findByText(/Страница 2 из 2/)).toBeTruthy();
    expect(screen.getByText('Стих 9')).toBeTruthy();
    expect(within(screen.getByRole('table')).queryByText('Стих 1')).toBeNull();
  });

  it('выход возвращает на форму входа', async () => {
    await logIn();
    await screen.findByText('Стих 1');
    fireEvent.click(screen.getByText('Выйти'));
    expect(await screen.findByText('Админ-панель')).toBeTruthy();
    expect(be.isLoggedIn()).toBe(false);
  });
});
