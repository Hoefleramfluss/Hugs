#!/usr/bin/env bash
set -euo pipefail

GCP_PROJECT="${GCP_PROJECT:-hugs-headshop-20251108122937}"
REGION="${REGION:-europe-west3}"
INSTANCE="${INSTANCE:-hugs-pg-instance-prod}"
DB_USER="${DB_USER:-shopuser}"
DB_PASSWORD_SECRET="${DB_PASSWORD_SECRET:-db-password}"

INFO_DIR=".deploy-info-$(date +%s)"
mkdir -p "${INFO_DIR}"

LOG_FILE="${INFO_DIR}/sync-cloudsql-pass.log"

echo "[info] Project: ${GCP_PROJECT}, Instance: ${INSTANCE}, User: ${DB_USER}" | tee "${LOG_FILE}"

echo "[info] Fetching DB password from Secret Manager: ${DB_PASSWORD_SECRET}" | tee -a "${LOG_FILE}"
DB_PASSWORD=$(gcloud secrets versions access latest \
  --secret="${DB_PASSWORD_SECRET}" \
  --project="${GCP_PROJECT}" 2>> "${LOG_FILE}")

if [[ -z "${DB_PASSWORD}" ]]; then
  echo "[error] Secret ${DB_PASSWORD_SECRET} is empty. Abort." | tee -a "${LOG_FILE}"
  exit 1
fi

echo "[info] Updating Cloud SQL user password to match secret (value not logged)..." | tee -a "${LOG_FILE}"
gcloud sql users set-password "${DB_USER}" \
  --instance="${INSTANCE}" \
  --password="${DB_PASSWORD}" \
  --project="${GCP_PROJECT}" >> "${LOG_FILE}" 2>&1

echo "[info] Password synced successfully for user ${DB_USER} on instance ${INSTANCE}." | tee -a "${LOG_FILE}"
