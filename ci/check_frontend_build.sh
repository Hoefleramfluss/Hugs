#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://hugs-backend-prod-787273457651.europe-west3.run.app}"

FRONTEND_URL="${FRONTEND_URL:-}"

echo "[check_frontend_build] Using NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"
if [[ -n "${FRONTEND_URL}" ]]; then
  echo "[check_frontend_build] Healthcheck endpoint: ${FRONTEND_URL}/health"
else
  echo "[check_frontend_build] FRONTEND_URL not set; will validate health page in build output"
fi

cd "${REPO_ROOT}"

npm config set fund false
npm config set audit false
npm install --include-workspace-root --workspace=frontend

npm run build --workspace=frontend

HEALTH_BUILD_PATH="frontend/.next/server/pages/health.html"
if [[ -f "${HEALTH_BUILD_PATH}" ]]; then
  echo "[check_frontend_build] Found generated health page at ${HEALTH_BUILD_PATH}"
else
  echo "[check_frontend_build] ERROR: Expected ${HEALTH_BUILD_PATH} to exist" >&2
  exit 1
fi

if [[ -n "${FRONTEND_URL}" ]]; then
  curl -svf "${FRONTEND_URL}/health" >/dev/null
  echo "[check_frontend_build] Frontend /health responded with 200 OK."
else
  echo "[check_frontend_build] Skipping remote /health curl (FRONTEND_URL unset)."
fi
