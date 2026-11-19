import type { FormEvent } from 'react';
import type { Poem, PoemInput } from '../types';

type Props = {
  editing: Poem | 'new';
  form: PoemInput;
  setForm: (updater: (value: PoemInput) => PoemInput) => void;
  busy: boolean;
  setEditing: (value: null) => void;
  save: (event: FormEvent) => void;
};

export function PoemEditor({ editing, form, setForm, busy, setEditing, save }: Props) {
  return (
    <div className="modal-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && !busy) setEditing(null);
    }}>
      <form className="modal" onSubmit={save}>
        <div className="modal-head">
          <h2>{editing === 'new' ? 'Добавить стихотворение' : 'Редактировать стихотворение'}</h2>
          <button type="button" className="close" aria-label="Закрыть" disabled={busy} onClick={() => setEditing(null)}>×</button>
        </div>
        <div className="modal-body">
          <label>Название
            <input required maxLength={250} value={form.title} onChange={event => setForm(value => ({ ...value, title: event.target.value }))} />
          </label>
          <label>Автор
            <input required maxLength={250} value={form.author} onChange={event => setForm(value => ({ ...value, author: event.target.value }))} />
          </label>
          <label>Источник
            <input required value={form.source} onChange={event => setForm(value => ({ ...value, source: event.target.value }))} />
          </label>
          <label>Текст стихотворения
            <textarea required rows={10} value={form.content} onChange={event => setForm(value => ({ ...value, content: event.target.value }))} />
          </label>
        </div>
        <div className="modal-footer">
          <button type="button" className="secondary" disabled={busy} onClick={() => setEditing(null)}>Отмена</button>
          <button className="primary" disabled={busy} type="submit">{busy ? 'Сохранение…' : 'Сохранить'}</button>
        </div>
      </form>
    </div>
  );
}
