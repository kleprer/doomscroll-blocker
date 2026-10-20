import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

type Health = { status: string; service: string; version: string };
type Poem = {
  poemId: number;
  title: string;
  author: string;
  lines: string[];
  lineCount: number;
  difficultyLevel: number;
};

const MOCK_HEALTH: Health = { status: 'UP', service: 'mock', version: '0.1.0' };
const MOCK_POEMS: Poem[] = [
  {
    poemId: 1,
    title: 'Зимнее утро',
    author: 'А.С. Пушкин',
    lines: ['Мороз и солнце; день чудесный!', 'Ещё ты дремлешь, друг прелестный —'],
    lineCount: 4,
    difficultyLevel: 1,
  },
  {
    poemId: 2,
    title: 'Парус',
    author: 'М.Ю. Лермонтов',
    lines: ['Белеет парус одинокой', 'В тумане моря голубом!..'],
    lineCount: 4,
    difficultyLevel: 1,
  },
];

function Popup() {
  const [health, setHealth] = useState<Health | null>(null);
  const [poems, setPoems] = useState<Poem[]>([]);
  const [preview, setPreview] = useState<Poem | null>(null);

  useEffect(() => {
    setHealth(MOCK_HEALTH);
    setPoems(MOCK_POEMS);
  }, []);

  const handleGetPoem = () => {
    const random = MOCK_POEMS[Math.floor(Math.random() * MOCK_POEMS.length)];
    setPreview(random);
  };

  return (
    <div style={{ width: 320, padding: 16, fontFamily: 'system-ui', fontSize: 13 }}>
      <h1 style={{ fontSize: 16, margin: '0 0 12px' }}>Doomscroll Blocker</h1>

      {health && (
        <p style={{ color: '#666', margin: '0 0 8px' }}>
          Backend: <b>{health.status}</b> · {health.service}
        </p>
      )}

      <p style={{ color: '#666', margin: '0 0 8px' }}>
        Стихов в базе: <b>{poems.length}</b>
      </p>

      <button
        onClick={handleGetPoem}
        style={{
          padding: '6px 12px',
          fontSize: 13,
          cursor: 'pointer',
          borderRadius: 6,
          border: '1px solid #ccc',
          background: '#fff',
        }}
      >
        Получить стих
      </button>

      {preview && (
        <div style={{ marginTop: 12, padding: 8, background: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ fontWeight: 600 }}>{preview.title}</div>
          <div style={{ color: '#666', marginBottom: 6 }}>{preview.author}</div>
          {preview.lines.map((line: string, i: number) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Popup />);