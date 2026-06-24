#!/usr/bin/env node
/**
 * Capture admin UI screenshots from a running DAP instance.
 * Usage: node scripts/capture-screenshots.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] || 'http://localhost:8080';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/screenshots');
const LOGIN = 'admin';
const PASSWORD = 'Admin123!';
const VIEWPORT = { width: 1280, height: 800 };

const AUTH_PAGES = [
  { file: 'dashboard.png', path: '/', wait: 1500 },
  { file: 'endpoints.png', path: '/endpoints', wait: 1000 },
  { file: 'api-schema.png', path: '/api-schema', wait: 2000 },
  { file: 'api-docs.png', path: '/api-docs', wait: 3000 },
  { file: 'cron-jobs.png', path: '/cron', wait: 1000 },
  { file: 'webhooks.png', path: '/webhooks', wait: 1000 },
  { file: 'api-keys.png', path: '/api-keys', wait: 1000 },
  { file: 'mcp-server.png', path: '/mcp', wait: 1000 },
  { file: 'database.png', path: '/database', wait: 1500 },
  { file: 'settings.png', path: '/settings', wait: 1000 },
  { file: 'system.png', path: '/system', wait: 1500 },
  { file: 'logs.png', path: '/logs', wait: 1000 },
];

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="text"]').fill(LOGIN);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

async function resolveEndpointHandlerPath(page) {
  const token = await page.evaluate(() => localStorage.getItem('accessToken'));
  if (!token) return null;

  const res = await page.request.get(`${BASE}/api/endpoints`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return null;

  const body = await res.json();
  const payload = body?.data;
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : payload?.items ?? [];
  const endpoint = list.find((e) => e?.id || e?._id);
  const id = endpoint?.id || endpoint?._id;
  return id ? `/endpoints/${id}?tab=handler` : null;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log(`Base URL: ${BASE}`);
  console.log(`Output: ${OUT}`);

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(OUT, 'login.png') });
  console.log('  login.png');

  await login(page);

  for (const { file, path, wait } of AUTH_PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    if (wait) await page.waitForTimeout(wait);
    await page.screenshot({ path: join(OUT, file) });
    console.log(`  ${file}`);
  }

  const handlerPath = await resolveEndpointHandlerPath(page);
  if (handlerPath) {
    await page.goto(`${BASE}${handlerPath}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(OUT, 'endpoint-handler.png') });
    console.log('  endpoint-handler.png');
  } else {
    console.warn('  skip endpoint-handler.png — no endpoints found');
  }

  await browser.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
