#!/usr/bin/env bash
# Генерация демо-карт, привязанных к постам и автомойкам
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${API_URL:-http://localhost:3001}"
export API_URL ADMIN_LOGIN="${ADMIN_LOGIN:-admin}" ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"

echo "==> Generate demo cards (API: $API_URL)"
node "$ROOT/scripts/generate-demo-cards.mjs"
