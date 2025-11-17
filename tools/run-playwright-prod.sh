#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="hugs-headshop-20251108122937"
REGION="europe-west3"
SERVICE_NAME="hugs-frontend-prod"

# 1) Frontend-URL aus Cloud Run holen
FRONTEND_URL="$(gcloud run services describe "${SERVICE_NAME}" \
  --platform=managed \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format='value(status.url)')"

if [[ -z "${FRONTEND_URL:-}" ]]; then
  echo "ERROR: Could not resolve frontend URL from Cloud Run (${SERVICE_NAME})." >&2
  exit 1
fi

echo "Using FRONTEND_URL=${FRONTEND_URL}"

# 2) Playwright-Basis-URL setzen
export NEXT_PUBLIC_BASE_URL="${FRONTEND_URL}"
export PW_BASE_URL="${FRONTEND_URL}"

# 3) Report/Log-Verzeichnis vorbereiten
STAMP="$(date +%s)"
REPORT_DIR=".deploy-info-${STAMP}"
mkdir -p "${REPORT_DIR}"

LOG_PATH="${REPORT_DIR}/playwright-prod.log"
REPORT_PATH="${REPORT_DIR}/playwright-report"

echo "Running Playwright E2E (chromium) against PROD…"
(
  set -euo pipefail
  cd frontend
  npx playwright test --project=chromium --reporter=line,html \
    2>&1 | tee "../${LOG_PATH}"
)

if [[ -d "frontend/playwright-report" ]]; then
  mv "frontend/playwright-report" "${REPORT_PATH}"
else
  echo "WARN: Playwright HTML report directory not found; expected frontend/playwright-report" >&2
fi

echo "Playwright report stored under ${REPORT_PATH}"
echo "Plain log: ${LOG_PATH}"
