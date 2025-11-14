#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://hugs-backend-prod-787273457651.europe-west3.run.app}"

echo "[check_frontend_build] Using NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"

cd "${REPO_ROOT}"

npm config set fund false
npm config set audit false
npm install --include-workspace-root --workspace=frontend

npm run build --workspace=frontend
