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
echo "$(ts) Projekt: ${PROJECT_ID}, Region: ${REGION}"

echo
echo "$(ts) 1) Letzte Execution des Jobs ${JOB_NAME} ermitteln"
LATEST_EXEC="$(
  gcloud run jobs executions list \
    --job="${JOB_NAME}" \
    --region="${REGION}" \
    --sort-by=~createTime \
    --limit=1 \
    --format='value(metadata.name)'
)"

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
echo "$(ts) 3) Logs via Cloud Logging lesen (Root Cause im Container-Log)"
FILTER="resource.type=\"cloud_run_job\" \
AND resource.labels.location=\"${REGION}\" \
AND resource.labels.job_name=\"${JOB_NAME}\" \
AND labels.\"run.googleapis.com/execution_name\"=\"${LATEST_EXEC}\""

echo "$(ts) Verwendeter Logging-Filter:"
echo "  ${FILTER}"
echo

gcloud logging read "${FILTER}" \
  --project="${PROJECT_ID}" \
  --limit=200 \
  --format='value(textPayload)'
