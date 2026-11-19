#!/usr/bin/env node
// Наполняет базу стихами через admin API (нужен Node 18+, ничего устанавливать не надо).
//
//   node scripts/seed-poems.mjs
//
// Логин/пароль берутся из .env (ADMIN_INIT_USERNAME / ADMIN_INIT_PASSWORD)
// или из переменных окружения ADMIN_USER / ADMIN_PASSWORD. Адрес — API_URL
// (по умолчанию http://localhost:8080/api/v1/admin). Повторный запуск безопасен:
// уже существующие стихи (по названию и автору) пропускаются.
import { existsSync, readFileSync } from 'node:fs';

const BASE = process.env.API_URL ?? 'http://localhost:8080/api/v1/admin';

function readEnvFile() {
  if (!existsSync('.env')) return {};
  return Object.fromEntries(
    readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  );
}
const env = readEnvFile();
const username = process.env.ADMIN_USER ?? env.ADMIN_INIT_USERNAME ?? 'admin';
const password = process.env.ADMIN_PASSWORD ?? env.ADMIN_INIT_PASSWORD;
if (!password) {
  console.error('Нет пароля: задайте ADMIN_INIT_PASSWORD в .env или переменную ADMIN_PASSWORD.');
  process.exit(1);
}

// ---- мини-клиент с cookie (сессия + CSRF) ----
const jar = new Map();
function remember(res) {
  const list = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie')].filter(Boolean);
  for (const c of list) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
}
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');

async function call(path, init = {}, csrf) {
  const headers = { ...init.headers, Cookie: cookieHeader() };
  if (csrf) headers[csrf.headerName] = csrf.token;
  const res = await fetch(BASE + path, { ...init, headers });
  remember(res);
  return res;
}

const POEMS = [
  // уровень 1 (до 4 строк)
  ['Лермонтов', 'Парус', ['Белеет парус одинокой', 'В тумане моря голубом!..', 'Что ищет он в стране далекой?', 'Что кинул он в краю родном?..']],
  ['Тютчев', 'Умом Россию не понять', ['Умом Россию не понять,', 'Аршином общим не измерить:', 'У ней особенная стать —', 'В Россию можно только верить.']],
  // уровень 2 (5–8 строк)
  ['Пушкин', 'Я вас любил', ['Я вас любил: любовь еще, быть может,', 'В душе моей угасла не совсем;', 'Но пусть она вас больше не тревожит;', 'Я не хочу печалить вас ничем.', 'Я вас любил безмолвно, безнадежно,', 'То робостью, то ревностью томим;', 'Я вас любил так искренно, так нежно,', 'Как дай вам бог любимой быть другим.']],
  ['Пушкин', 'Зимний вечер', ['Буря мглою небо кроет,', 'Вихри снежные крутя;', 'То, как зверь, она завоет,', 'То заплачет, как дитя,', 'То по кровле обветшалой', 'Вдруг соломой зашумит,', 'То, как путник запоздалый,', 'К нам в окошко застучит.']],
  ['Пушкин', 'Зимнее утро', ['Мороз и солнце; день чудесный!', 'Еще ты дремлешь, друг прелестный —', 'Пора, красавица, проснись:', 'Открой сомкнуты негой взоры', 'Навстречу северной Авроры,', 'Звездою севера явись!']],
  // уровень 3 (9–14 строк)
  ['Пушкин', 'Я помню чудное мгновенье', ['Я помню чудное мгновенье:', 'Передо мной явилась ты,', 'Как мимолетное виденье,', 'Как гений чистой красоты.', 'В томленьях грусти безнадежной,', 'В тревогах шумной суеты,', 'Звучал мне долго голос нежный', 'И снились милые черты.', 'Шли годы. Бурь порыв мятежный', 'Рассеял прежние мечты,', 'И я забыл твой голос нежный,', 'Твои небесные черты.']],
];

const csrfOf = async () => {
  const res = await call('/auth/csrf');
  if (!res.ok) throw new Error(`/auth/csrf → HTTP ${res.status}. Запущен ли бэкенд?`);
  return res.json();
};

try {
  let csrf = await csrfOf();
  const login = await call(
    '/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password }),
    },
    csrf,
  );
  if (login.status === 401) throw new Error('Неверный логин или пароль админа (см. .env).');
  if (!login.ok) throw new Error(`Вход не удался: HTTP ${login.status}`);
  csrf = await csrfOf(); // после входа берём токен заново

  const existing = await (await call('/poems?page=0&size=200')).json();
  const have = new Set((existing.content ?? []).map((p) => `${p.author}|${p.title}`));

  let added = 0;
  for (const [author, title, lines] of POEMS) {
    if (have.has(`${author}|${title}`)) {
      console.log(`пропуск (уже есть): ${author} — ${title}`);
      continue;
    }
    const res = await call(
      '/poems',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, title, content: lines.join('\n'), source: 'Public domain' }),
      },
      csrf,
    );
    if (!res.ok) throw new Error(`Не удалось добавить «${title}»: HTTP ${res.status} ${await res.text()}`);
    console.log(`добавлено: ${author} — ${title}`);
    added++;
  }
  console.log(`Готово. Добавлено: ${added}, всего в наборе: ${POEMS.length}.`);
} catch (e) {
  const down = e.message === 'fetch failed';
  console.error('Ошибка:', down ? `не удалось подключиться к ${BASE}. Запущен ли бэкенд (docker compose up -d --build mongodb redis backend)?` : e.message);
  process.exit(1);
}
