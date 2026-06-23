#!/usr/bin/env bash
# Обновить vendored dynamic-api/ из Dynamic API Platform и применить патчи WASH-PHO-CRM.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DA="$ROOT/dynamic-api"
UPSTREAM_REPO="${DYNAMIC_API_UPSTREAM:-https://github.com/Dynamic-API-Platform/Dynamic-API-Platform.git}"
# По умолчанию — последняя ветка с фичами; после merge в main: DYNAMIC_API_REF=origin/main
UPSTREAM_REF="${DYNAMIC_API_REF:-origin/cursor/db-explorer-reference-fields-and-auth-fixes}"

echo "==> Fetch upstream: $UPSTREAM_REPO ($UPSTREAM_REF)"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

git -C "$tmpdir" init -q
git -C "$tmpdir" remote add origin "$UPSTREAM_REPO"
git -C "$tmpdir" fetch -q origin "${UPSTREAM_REF#origin/}" --depth 1

echo "==> Replace $DA (except .git)"
rm -rf "$DA"
mkdir -p "$DA"
git -C "$tmpdir" archive FETCH_HEAD | tar -x -C "$DA"

echo "==> Apply WASH-PHO-CRM patches"
# CORS: несколько origin
perl -i -0pe 's/app\.use\(cors\(\{\n    origin: env\.corsOrigin,/const corsOrigins = env.corsOrigin.split(\x27,\x27).map((o) => o.trim()).filter(Boolean);\n\n  app.use(cors({\n    origin: corsOrigins.length > 1 ? corsOrigins : corsOrigins[0] || true,/s' \
  "$DA/backend/src/app.ts" 2>/dev/null || true

# api.ts: 502 hint (если upstream ещё без него)
if grep -q 'Request failed (\${response.status})' "$DA/frontend/src/services/api.ts" 2>/dev/null; then
  perl -i -pe 'BEGIN{undef $/;} s/throw new Error\(`Request failed \(\$\{response\.status\}\)`\);/const hint = response.status === 502\n          ? \x27API unavailable (502). Restart dynamic-api-panel or check dynamic-api.\x27\n          : `Request failed (\${response.status})`;\n        throw new Error(hint);/s' \
    "$DA/frontend/src/services/api.ts" || true
fi

# UsersPage: Safari email
if grep -q 'type="email"' "$DA/frontend/src/pages/UsersPage.tsx" 2>/dev/null; then
  perl -i -pe 's/<form onSubmit=\{handleSubmit\} className="space-y-4">/<form onSubmit={handleSubmit} className="space-y-4" noValidate>/' \
    "$DA/frontend/src/pages/UsersPage.tsx"
  perl -i -0pe 's/<input type="email" className="input" value=\{form\.email\} onChange=\{\(e\) => setForm\(\{ \.\.\.form, email: e\.target\.value \}\)\} required \/>/<input\n                type="text"\n                inputMode="email"\n                autoComplete="email"\n                className="input"\n                value={form.email}\n                onChange={(e) => setForm({ ...form, email: e.target.value })}\n                required\n              \/>/s' \
    "$DA/frontend/src/pages/UsersPage.tsx" || true
fi

echo "==> Done. Rebuild: docker compose up -d --build dynamic-api dynamic-api-panel"
echo "    Then if needed: ./scripts/run-init-seed.sh"
