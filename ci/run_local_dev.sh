#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
POSTGRES_CONTAINER=${POSTGRES_CONTAINER:-hugs-dev-postgres}
REDIS_CONTAINER=${REDIS_CONTAINER:-hugs-dev-redis}
MAILCATCHER_CONTAINER=${MAILCATCHER_CONTAINER:-hugs-dev-mailcatcher}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-devpassword}
POSTGRES_PORT=${POSTGRES_PORT:-5544}
DATABASE_URL="postgresql://shopuser:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT}/shopdb"
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:4000}

start_container() {
  local name=$1
  local image=$2
  local args=$3
  if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
    echo "[+] ${name} already running"
    return
  fi
  if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
    docker rm -f "${name}" >/dev/null
  fi
  echo "[+] Starting ${name}..."
  eval "docker run -d --name ${name} ${args} ${image}" >/dev/null
}

start_container "${POSTGRES_CONTAINER}" "postgres:15-alpine" "-e POSTGRES_USER=shopuser -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} -e POSTGRES_DB=shopdb -p ${POSTGRES_PORT}:5432"
start_container "${REDIS_CONTAINER}" "redis:7-alpine" "-p 6379:6379"
start_container "${MAILCATCHER_CONTAINER}" "dockage/mailcatcher:latest" "-p 1025:1025 -p 1080:1080"

echo "[+] DATABASE_URL=${DATABASE_URL}"
pushd "${ROOT_DIR}/backend" >/dev/null
export DATABASE_URL
npm run prisma:generate
npm run migrate:deploy
npm run seed
popd >/dev/null

cleanup() {
  echo "[+] Stopping dev servers"
  [[ -n "${BACKEND_PID:-}" ]] && kill "${BACKEND_PID}" 2>/dev/null || true
  [[ -n "${FRONTEND_PID:-}" ]] && kill "${FRONTEND_PID}" 2>/dev/null || true
}
trap cleanup EXIT

echo "[+] Starting Fastify backend on :4000"
(cd "${ROOT_DIR}" && DATABASE_URL="${DATABASE_URL}" npm run dev:backend) &
BACKEND_PID=$!

sleep 5

echo "[+] Starting Next.js frontend on :3000"
(cd "${ROOT_DIR}" && NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" npm run dev:frontend) &
FRONTEND_PID=$!

echo "[+] Mailcatcher UI available at http://localhost:1080"
echo "[+] Press Ctrl+C to stop both servers."
wait
