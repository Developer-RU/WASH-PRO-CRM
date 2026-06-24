#!/usr/bin/env bash
set -euo pipefail

JOB_ID="${1:?job id required}"
DATA_DIR="${2:?data dir required}"
DEPLOY_MODE="${3:-docker}"
COMPOSE_FILE="${4:-/deploy/docker-compose.yml}"
PROJECT_ROOT="${5:-/deploy}"
PORT="${6:-3001}"
HEALTH_URL="${7:-http://localhost:3001/api/health}"

SNAPSHOT_FILE="$DATA_DIR/rollback-${JOB_ID}.json"

if [[ ! -f "$SNAPSHOT_FILE" ]]; then
  echo "Rollback snapshot not found: $SNAPSHOT_FILE"
  exit 1
fi

cd "$PROJECT_ROOT"

GIT_REF="$(jq -r '.gitRef // empty' "$SNAPSHOT_FILE")"
MODE="$(jq -r '.mode // "docker"' "$SNAPSHOT_FILE")"
USE_GIT="$(jq -r '.useGit // 1' "$SNAPSHOT_FILE")"
FROM_VERSION="$(jq -r '.fromVersion // empty' "$SNAPSHOT_FILE")"
GITHUB_REPO="$(jq -r '.githubRepo // "Dynamic-API-Platform/Dynamic-API-Platform"' "$SNAPSHOT_FILE")"

echo "Rolling back job $JOB_ID to v${FROM_VERSION:-$GIT_REF}"

if [[ "$DEPLOY_MODE" == "docker-replica" ]]; then
  export COMPOSE_PROJECT_NAME=dap-replica
elif [[ "$DEPLOY_MODE" == "docker" ]]; then
  export COMPOSE_PROJECT_NAME=dap
fi

if [[ "$USE_GIT" == "1" && -n "$GIT_REF" && "$GIT_REF" != "unknown" && "$GIT_REF" != "null" && "$GIT_REF" != "archive" ]]; then
  git fetch --tags --force origin || true
  git checkout "$GIT_REF"
elif [[ -n "$FROM_VERSION" ]]; then
  TMP_ARCHIVE="/tmp/dap-rollback-${JOB_ID}.tar.gz"
  TAG="v${FROM_VERSION#v}"
  if ! curl -sfL "https://github.com/${GITHUB_REPO}/archive/refs/tags/${TAG}.tar.gz" -o "$TMP_ARCHIVE"; then
    curl -sfL "https://github.com/${GITHUB_REPO}/archive/refs/tags/${FROM_VERSION}.tar.gz" -o "$TMP_ARCHIVE"
  fi
  EXTRACT_DIR="/tmp/dap-rollback-extract-${JOB_ID}"
  rm -rf "$EXTRACT_DIR"
  mkdir -p "$EXTRACT_DIR"
  tar -xzf "$TMP_ARCHIVE" -C "$EXTRACT_DIR"
  SRC_DIR="$(find "$EXTRACT_DIR" -mindepth 1 -maxdepth 1 -type d | head -1)"
  rsync -a --delete \
    --exclude='node_modules' \
    --exclude='backend/node_modules' \
    --exclude='frontend/node_modules' \
    --exclude='.git' \
    "$SRC_DIR"/ "$PROJECT_ROOT"/
  rm -rf "$EXTRACT_DIR" "$TMP_ARCHIVE"
else
  echo "No git ref or version available for rollback"
  exit 1
fi

if [[ "$MODE" == "docker" || "$MODE" == "docker-replica" || "$DEPLOY_MODE" == "docker" || "$DEPLOY_MODE" == "docker-replica" ]]; then
  docker compose -f "$COMPOSE_FILE" up -d --build --remove-orphans
else
  npm install --prefix backend --omit=dev
  npm run build --prefix backend
  if command -v systemctl >/dev/null 2>&1; then
    systemctl restart dynamic-api-backend || true
  fi
fi

for i in $(seq 1 60); do
  if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    echo "Rollback health check OK"
    exit 0
  fi
  sleep 5
done

echo "Rollback completed but health check did not pass"
exit 1
