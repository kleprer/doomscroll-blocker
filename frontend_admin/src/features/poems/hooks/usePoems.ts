
import { useEffect, useState, type FormEvent } from 'react';
import { poemsApi } from '../api';
import type { Poem, PoemInput, Page } from '../types';

const empty: PoemInput = {
  title: '',
  author: '',
  content: '',
  source: '',
};

export function usePoems(
  admin: unknown,
  busy: boolean,
  setBusy: (v: boolean) => void,
  setError: (v: string) => void,
  setNotice: (v: string) => void
) {
  const [data, setData] = useState<Page<Poem> | null>(null);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Poem | 'new' | null>(null);
  const [form, setForm] = useState<PoemInput>(empty);
  const [loadingList, setLoadingList] = useState(false);

  async function load(p = page) {
    setLoadingList(true);

    try {
      setData(await poemsApi.list(p));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    if (admin) {
      void load(page);
    }
  }, [admin, page]);

  function openEditor(poem?: Poem) {
    setError('');
    setNotice('');
    setEditing(poem || 'new');

    setForm(
      poem
        ? {
            title: poem.title,
            author: poem.author,
            content: poem.content,
            source: poem.source,
          }
        : { ...empty }
    );
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');

    try {
      if (editing === 'new') {
        await poemsApi.create(form);
      } else if (editing) {
        await poemsApi.update(editing.id, form);
      }

      setEditing(null);

      setNotice(
        editing === 'new'
          ? 'Стихотворение добавлено'
          : 'Изменения сохранены'
      );

      if (page !== 0) {
        setPage(0);
      } else {
        await load(0);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(poem: Poem) {
    setBusy(true);
    setError('');
    setNotice('');

    try {
      if (poem.isActive) {
        await poemsApi.deactivate(poem.id);
      } else {
        await poemsApi.activate(poem.id);
      }

      setNotice(
        poem.isActive
          ? 'Стихотворение деактивировано'
          : 'Стихотворение активировано'
      );

      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return {
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
  };
}
