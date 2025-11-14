#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

API_URL_DEFAULT="http://localhost:4000"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-${API_URL_DEFAULT}}"

printf '[run_frontend_local] NEXT_PUBLIC_API_URL=%s\n' "${NEXT_PUBLIC_API_URL}"

cd "${REPO_ROOT}"

npm install --include-workspace-root --workspace=frontend
npm run dev --workspace=frontend
