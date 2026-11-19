import type { Admin } from '../../auth/types';
import type { usePoems } from '../hooks/usePoems';
import { PoemEditor } from './PoemEditor';

type Props = {
  admin: Admin;
  busy: boolean;
  error: string;
  notice: string;
  logout: () => Promise<void>;
  poems: ReturnType<typeof usePoems>;
};

export function PoemLibraryPage({
  admin,
  busy,
  error,
  notice,
  logout,
  poems,
}: Props) {
  const {
    data,
    page,
    setPage,
    editing,
    setEditing,
    form,
    setForm,
    loadingList,
    load,
    openEditor,
    save,
    toggle,
  } = poems;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
           doomscroll
          <span className="brand-light">/admin</span>
        </div>

        <div className="nav-item selected">
          Библиотека стихов
        </div>

        <div className="side-bottom">
          <div className="profile">
            <div className="avatar">
              {admin.username.slice(0, 1).toUpperCase()}
            </div>

            <div>
              <strong>{admin.username}</strong>
            </div>
          </div>

          <button
            className="logout"
            onClick={logout}
            disabled={busy}
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="crumb">Панель администратора для управления стихотворениями</span>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>

              <h1>
                Библиотека стихов
                <span className="heading-dot">.</span>
              </h1>

              <p>
                Создавайте и редактируйте стихотворения для CAPTCHA.
              </p>
            </div>

            <button
              className="primary"
              onClick={() => openEditor()}
            >
              Добавить стихотворение
            </button>
          </div>

          <div className="stats">
            <div className="stat">
              <span>Всего стихотворений</span>
              <strong>{data?.totalElements ?? '—'}</strong>
              <small>Во всей библиотеке</small>
            </div>

            <div className="stat">
              <span>На текущей странице</span>
              <strong>{data?.content.length ?? '—'}</strong>
              <small>Записей загружено</small>
            </div>

            <div className="stat">
              <span>Активных на странице</span>
              <strong>
                {data?.content.filter(p => p.isActive).length ?? '—'}
              </strong>
              <small>Доступны для CAPTCHA</small>
            </div>
          </div>

          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}

          {notice && (
            <div className="success" role="status">
              ✓ {notice}
            </div>
          )}

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Все стихотворения</h2>

              </div>

              <button
                className="secondary"
                onClick={() => void load()}
                disabled={loadingList}
              >
                Обновить
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>СТИХОТВОРЕНИЕ</th>
                    <th>АВТОР</th>
                    <th>СТАТУС</th>
                    <th>ДОБАВЛЕНО</th>
                    <th>ДЕЙСТВИЯ</th>
                  </tr>
                </thead>

                <tbody>
                  {(data?.content ?? []).map(poem => (
                    <tr key={poem.id}>
                      <td>
                        <div className="poem-title">
                          {poem.title}
                        </div>

                        <div className="poem-preview">
                          {poem.content
                            .replace(/\s+/g, ' ')
                            .slice(0, 75)}
                          {poem.content.length > 75 ? '…' : ''}
                        </div>
                      </td>

                      <td>{poem.author}</td>

                      <td>
                        <span
                          className={
                            poem.isActive ? 'pill on' : 'pill off'
                          }
                        >
                          <i />
                          {poem.isActive ? 'Активно' : 'Отключено'}
                        </span>
                      </td>

                      <td className="date">
                        {poem.createdAt
                          ? new Date(poem.createdAt).toLocaleDateString(
                              'ru-RU'
                            )
                          : '—'}
                      </td>

                      <td>
                        <div className="actions">
                          <button
                            className="link-btn"
                            onClick={() => openEditor(poem)}
                          >
                            Изменить
                          </button>

                          <button
                            className="link-btn subtle"
                            disabled={busy}
                            onClick={() => void toggle(poem)}
                          >
                            {poem.isActive ? 'Отключить' : 'Включить'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

            </div>

            <footer className="panel-foot">
              <span>
                Страница {page + 1} из{' '}
                {Math.max(data?.totalPages ?? 1, 1)} · Всего записей:{' '}
                {data?.totalElements ?? 0}
              </span>

              <div>
                <button
                  className="secondary"
                  disabled={page === 0 || loadingList}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Назад
                </button>

                <button
                  className="secondary"
                  disabled={
                    !data ||
                    page + 1 >= data.totalPages ||
                    loadingList
                  }
                  onClick={() => setPage(p => p + 1)}
                >
                  Далее →
                </button>
              </div>
            </footer>
          </section>
        </div>
      </main>

      {editing && (
        <PoemEditor
          editing={editing}
          form={form}
          setForm={setForm}
          busy={busy}
          setEditing={setEditing}
          save={save}
        />
      )}
    </div>
  );
}