#!/usr/bin/env node
/**
 * Генерация демо-данных WASH PRO CRM:
 * - 30 объектов (автомоек)
 * - 100 постов
 * - 50 finance-stats до инкассации + 50 после
 * - 50 usage-stats до инкассации + 50 после
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

const WASH_COUNT = Number(process.env.WASH_COUNT || 30);
const POST_COUNT = Number(process.env.POST_COUNT || 100);
const STATS_PER_PERIOD = Number(process.env.STATS_PER_PERIOD || 50);

const CATEGORIES = ['regular', 'service', 'unlimited'];
const STREETS = ['Ленина', 'Мира', 'Советская', 'Победы', 'Гагарина', 'Кирова', 'Садовая', 'Новая', 'Центральная', 'Заречная'];
const CITIES = ['Москва', 'Санкт-Петербург', 'Казань', 'Новосибирск', 'Екатеринбург', 'Краснодар', 'Самара', 'Воронеж', 'Ростов-на-Дону', 'Уфа'];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function round2(n) {
  return Math.round(n * 100) / 100;
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

async function main() {
  console.log(`API: ${API_URL}`);
  const token = await login();
  console.log('Admin login OK');

  const washes = [];
  for (let i = 1; i <= WASH_COUNT; i++) {
    const city = pick(CITIES);
    const street = pick(STREETS);
    const body = {
      name: `Автомойка «Чистый авто ${i}»`,
      description: `Объект самообслуживания №${i}`,
      address: `г. ${city}, ул. ${street}, ${rand(1, 120)}`,
      registeredAt: new Date(Date.now() - rand(30, 900) * 86400000).toISOString(),
      cloudEnabled: Math.random() > 0.3,
    };
    const created = await api(token, 'POST', '/api/crm/washes', body);
    washes.push(created);
    if (i % 10 === 0) console.log(`  washes: ${i}/${WASH_COUNT}`);
  }
  console.log(`Created ${washes.length} washes`);

  const posts = [];
  for (let i = 1; i <= POST_COUNT; i++) {
    const wash = washes[(i - 1) % washes.length];
    const postNumber = Math.floor((i - 1) / washes.length) + 1;
    const body = {
      washId: wash.id,
      postNumber,
      name: `Пост ${postNumber}`,
      serialNumber: `SN-${wash.id.slice(-6)}-${String(i).padStart(4, '0')}`,
      settings: {},
    };
    const created = await api(token, 'POST', '/api/crm/posts', body);
    posts.push(created);
    if (i % 25 === 0) console.log(`  posts: ${i}/${POST_COUNT}`);
  }
  console.log(`Created ${posts.length} posts`);

  for (const period of ['before_collection', 'after_collection']) {
    const label = period === 'before_collection' ? 'до' : 'после';
    for (let i = 0; i < STATS_PER_PERIOD; i++) {
      const wash = pick(washes);
      const post = pick(posts.filter((p) => p.washId === wash.id) || posts);
      const cash = round2(rand(500, 25000));
      const cashless = round2(rand(300, 18000));
      const discountOps = round2(rand(50, 3000));
      const totalRevenue = round2(cash + cashless);
      await api(token, 'POST', '/api/crm/finance-stats', {
        washId: wash.id,
        postId: post?.id,
        period,
        cash,
        cashless,
        discountOps,
        totalRevenue,
        avgCheck: round2(totalRevenue / rand(5, 40)),
        recordedAt: new Date(Date.now() - rand(0, 14) * 86400000).toISOString(),
      });
    }
    console.log(`Finance stats (${label} инкассации): ${STATS_PER_PERIOD}`);
  }

  for (const period of ['before_collection', 'after_collection']) {
    const label = period === 'before_collection' ? 'до' : 'после';
    for (let i = 0; i < STATS_PER_PERIOD; i++) {
      const wash = pick(washes);
      const post = pick(posts.filter((p) => p.washId === wash.id) || posts);
      const usageTime = rand(120, 86400);
      const launchCount = rand(5, 200);
      await api(token, 'POST', '/api/crm/usage-stats', {
        washId: wash.id,
        postId: post?.id,
        period,
        category: pick(CATEGORIES),
        launchCount,
        usageTime,
        avgWashTime: Math.round(usageTime / launchCount),
        clientCount: rand(3, launchCount),
        recordedAt: new Date(Date.now() - rand(0, 14) * 86400000).toISOString(),
      });
    }
    console.log(`Usage stats (${label} инкассации): ${STATS_PER_PERIOD}`);
  }

  console.log('Done.');
  console.log(`Summary: ${washes.length} washes, ${posts.length} posts, ${STATS_PER_PERIOD * 2} finance + ${STATS_PER_PERIOD * 2} usage records`);
  console.log('');
  console.log('Tip: run scripts/generate-demo-cards.sh to seed cards linked to posts');
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
