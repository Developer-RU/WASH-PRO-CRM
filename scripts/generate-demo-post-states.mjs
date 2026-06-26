#!/usr/bin/env node
/**
 * Генерация состояний постов (SCADA) для демо.
 * Создаёт или обновляет запись post-states для каждого поста.
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

/** Доля постов без данных (ожидание первых данных) */
const WAITING_RATIO = Number(process.env.STATE_WAITING_RATIO || 0.12);

const MODES = [
  { mode: 'idle', modeName: 'Ожидание', modeNumber: 0 },
  { mode: 'wash', modeName: 'Мойка высокого давления', modeNumber: 1 },
  { mode: 'foam', modeName: 'Пена', modeNumber: 2 },
  { mode: 'rinse', modeName: 'Ополаскивание', modeNumber: 3 },
  { mode: 'wax', modeName: 'Воск', modeNumber: 4 },
  { mode: 'dry', modeName: 'Сушка', modeNumber: 5 },
  { mode: 'pause', modeName: 'Пауза', modeNumber: 6 },
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

async function login() {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: ADMIN_LOGIN, password: ADMIN_PASSWORD }),
  });
  const json = await res.json();
  if (!json.success || !json.data?.accessToken) {
    throw new Error(`Login failed: ${json.error || res.statusText}`);
  }
  return json.data.accessToken;
}

async function api(token, method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`${method} ${path}: ${json.error || res.statusText}`);
  }
  return json.data;
}

async function listAll(token, path) {
  const all = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const res = await fetch(`${API_URL}${path}?page=${page}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(`GET ${path}: ${json.error}`);
    all.push(...(json.data || []));
    totalPages = json.pagination?.totalPages ?? 1;
    page += 1;
  }
  return all;
}

function refId(value) {
  if (value == null) return undefined;
  if (typeof value === 'object') return value.id || value._id;
  return value;
}

function buildState(post, withData) {
  const washId = refId(post.washId);
  if (!withData) {
    return {
      postId: post.id,
      washId,
      connected: false,
      mode: '',
      modeName: '',
      modeNumber: 0,
      freePause: 0,
      paidPause: 0,
      modeTime: 0,
      equipmentState: {},
    };
  }

  const modeDef = pick(MODES.filter((m) => m.modeNumber > 0));
  const lastMessageAt = new Date(Date.now() - rand(5, 7200) * 1000).toISOString();

  return {
    postId: post.id,
    washId,
    mode: modeDef.mode,
    modeName: modeDef.modeName,
    modeNumber: modeDef.modeNumber,
    freePause: rand(0, 120),
    paidPause: rand(0, 300),
    modeTime: rand(30, 900),
    equipmentState: {
      pump: pick(['ok', 'ok', 'warn']),
      valve: 'ok',
      pressure: rand(80, 150),
    },
    lastMessageAt,
    connected: true,
  };
}

async function main() {
  console.log(`API: ${API_URL}`);
  const token = await login();

  const [posts, states] = await Promise.all([
    listAll(token, '/api/crm/posts'),
    listAll(token, '/api/crm/post-states'),
  ]);

  if (posts.length === 0) {
    throw new Error('Нет постов — сначала generate-demo-data.mjs');
  }

  const stateByPost = new Map(states.map((s) => [refId(s.postId), s]));
  let created = 0;
  let updated = 0;
  let waiting = 0;

  for (const post of posts) {
    const withData = Math.random() > WAITING_RATIO;
    if (!withData) waiting += 1;

    const body = buildState(post, withData);
    const existing = stateByPost.get(post.id);

    if (existing) {
      await api(token, 'PUT', `/api/crm/post-states/${existing.id}`, body);
      updated += 1;
    } else {
      await api(token, 'POST', '/api/crm/post-states', body);
      created += 1;
    }

    if ((created + updated) % 25 === 0) {
      console.log(`  processed ${created + updated}/${posts.length}…`);
    }
  }

  console.log(`Done. Posts: ${posts.length}, created: ${created}, updated: ${updated}, waiting: ${waiting}`);
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
