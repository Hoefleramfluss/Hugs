#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL=${BACKEND_URL:-${1:-}}
FRONTEND_URL=${FRONTEND_URL:-${2:-}}

if [[ -z "${BACKEND_URL}" || -z "${FRONTEND_URL}" ]]; then
  echo "Usage: BACKEND_URL=<url> FRONTEND_URL=<url> ci/check_post_deploy.sh"
  exit 1
fi

echo "[+] Checking backend health at ${BACKEND_URL}/api/healthz"
BACKEND_PAYLOAD=$(curl -sfS "${BACKEND_URL}/api/healthz" || true)
if ! echo "${BACKEND_PAYLOAD}" | grep -q '"status":"ok"'; then
  echo "Backend health check failed: ${BACKEND_PAYLOAD}"
  exit 1
fi

echo "[+] Checking frontend availability at ${FRONTEND_URL}"
HTTP_CODE=$(curl -sfS -o /dev/null -w "%{http_code}" "${FRONTEND_URL}")
if [[ "${HTTP_CODE}" -ge 400 ]]; then
  echo "Frontend responded with status ${HTTP_CODE}"
  exit 1
fi

echo "[+] Smoke checks passed"
