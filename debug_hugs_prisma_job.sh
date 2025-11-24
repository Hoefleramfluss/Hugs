#!/usr/bin/env bash
set -euo pipefail

ts() { date "+[%Y-%m-%d %H:%M:%S]"; }

PROJECT_ID="hugs-headshop-20251108122937"
REGION="europe-west3"
JOB_NAME="hugs-prisma-migrate-prod"

echo
echo "$(ts) 0) gcloud-Kontext hart setzen"
gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud config set run/region "${REGION}" >/dev/null

echo
echo "$(ts) 1) Letzte Execution des Jobs ${JOB_NAME} ermitteln"
LATEST_EXEC=$(
  gcloud run jobs executions list \
    --job="${JOB_NAME}" \
    --region="${REGION}" \
    --sort-by=~createTime \
    --limit=1 \
    --format='value(metadata.name)'
)

if [ -z "${LATEST_EXEC}" ]; then
  echo "$(ts) FEHLER: Keine Execution für Job ${JOB_NAME} gefunden."
  exit 1
fi

echo "$(ts) Letzte Execution: ${LATEST_EXEC}"

echo
echo "$(ts) 2) Execution-Status anzeigen"
gcloud run jobs executions describe "${LATEST_EXEC}" \
  --region="${REGION}" \
  --format="yaml(status,conditions,taskCount)"

echo
echo "$(ts) 3) Logs der Execution lesen (Root Cause im Container-Log suchen)"
gcloud run jobs executions logs read "${LATEST_EXEC}" \
  --region="${REGION}" \
  --limit=200
