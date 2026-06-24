/**
 * Load test for Dynamic API Platform backend.
 *
 * Usage:
 *   npm run test:load
 *   LOAD_TEST_DURATION=30 LOAD_TEST_CONNECTIONS=50 npm run test:load
 *
 * Note: default API rate limit is 1000 req/window. For heavy load tests,
 * raise RATE_LIMIT_MAX in .env or Settings → Rate Limits.
 */

import autocannon from 'autocannon';

const BASE = process.env.LOAD_TEST_URL || 'http://localhost:3001';
const DURATION = Number(process.env.LOAD_TEST_DURATION || 10);
const CONNECTIONS = Number(process.env.LOAD_TEST_CONNECTIONS || 10);
const PIPELINING = Number(process.env.LOAD_TEST_PIPELINING || 1);
const LOGIN = process.env.LOAD_TEST_LOGIN || 'admin';
const PASSWORD = process.env.LOAD_TEST_PASSWORD || 'Admin123!';

function scenarioFailed(result) {
  return result.errors > 0 || (result.non2xx || 0) > 0;
}

function printResult(name, result) {
  console.log(`\n=== ${name} ===`);
  console.log(`  Requests:  ${result.requests.total} (${result.requests.average} req/sec)`);
  console.log(`  Throughput: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/sec`);
  console.log(`  Latency:   avg ${result.latency.average} ms | p99 ${result.latency.p99} ms`);
  console.log(`  Errors:    ${result.errors}`);
  console.log(`  Timeouts:  ${result.timeouts}`);
  if (result.non2xx) {
    console.log(`  Non-2xx:   ${result.non2xx}`);
  }
  if (scenarioFailed(result)) {
    console.log('  Status:    FAILED (check rate limits — default max 1000 req/window)');
  } else {
    console.log('  Status:    OK');
  }
}

function runScenario(options) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    autocannon.track(instance, { renderProgressBar: true });
  });
}

async function fetchToken() {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: LOGIN, password: PASSWORD }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: HTTP ${response.status}`);
  }

  const body = await response.json();
  const token = body?.data?.accessToken;
  if (!token) {
    throw new Error('Login response missing accessToken');
  }
  return token;
}

async function main() {
  console.log('Dynamic API Platform — load test');
  console.log(`Target:      ${BASE}`);
  console.log(`Duration:    ${DURATION}s per scenario`);
  console.log(`Connections: ${CONNECTIONS}`);

  let token;
  try {
    token = await fetchToken();
    console.log('Login OK — token acquired');
  } catch (error) {
    console.error(`Login failed: ${error.message}`);
    console.error('Ensure backend is running with seed data (admin / Admin123!)');
    process.exit(1);
  }

  const authHeaders = { Authorization: `Bearer ${token}` };
  const results = [];

  results.push(await runScenario({
    url: `${BASE}/api/health`,
    connections: CONNECTIONS,
    duration: DURATION,
    pipelining: PIPELINING,
  }));
  printResult('GET /api/health (public)', results[0]);

  results.push(await runScenario({
    url: `${BASE}/api/dashboard/stats`,
    connections: CONNECTIONS,
    duration: DURATION,
    pipelining: PIPELINING,
    headers: authHeaders,
  }));
  printResult('GET /api/dashboard/stats (JWT)', results[1]);

  results.push(await runScenario({
    url: `${BASE}/api/endpoints`,
    connections: CONNECTIONS,
    duration: DURATION,
    pipelining: PIPELINING,
    headers: authHeaders,
  }));
  printResult('GET /api/endpoints (JWT)', results[2]);

  const failed = results.filter(scenarioFailed).length;
  if (failed > 0) {
    console.error(`\nLoad test finished with ${failed} failed scenario(s)`);
    console.error('Tip: increase rate_limit_max in Settings or RATE_LIMIT_MAX env for heavier tests');
    process.exit(1);
  }

  console.log('\nLoad test completed successfully');
}

main().catch((error) => {
  console.error('Load test failed:', error.message);
  process.exit(1);
});
