#!/usr/bin/env node
/**
 * Заменяет устаревшие статусы карт (active, blocked, expired) на success | rejected.
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

function normalizeStatus(status) {
  if (status === 'success' || status === 'rejected') return status;
  if (status === 'active') return 'success';
  return 'rejected';
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

async function main() {
  console.log(`API: ${API_URL}`);
  const token = await login();
  const cards = await listAll(token, '/api/crm/cards');
  console.log(`Cards total: ${cards.length}`);

  let updated = 0;
  for (const card of cards) {
    const next = normalizeStatus(card.status);
    if (card.status === next) continue;

    const body = {
      cardNumber: card.cardNumber,
      cardType: card.cardType,
      balance: card.balance ?? 0,
      discount: card.discount ?? 0,
      discountType: card.discountType,
      status: next,
      washId: refId(card.washId),
      postId: refId(card.postId),
      createdAt: card.createdAt,
      validFrom: card.validFrom,
      validUntil: card.validUntil,
    };

    const res = await fetch(`${API_URL}/api/crm/cards/${card.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(`PUT ${card.id}: ${json.error}`);
    }
    updated += 1;
    if (updated % 25 === 0) console.log(`  updated ${updated}…`);
  }

  console.log(`Done. Updated ${updated} card(s).`);
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
