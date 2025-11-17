#!/usr/bin/env bash
set -euo pipefail

GCP_PROJECT="${GCP_PROJECT:-hugs-headshop-20251108122937}"
REGION="${REGION:-europe-west3}"
SECRET_DB_PASSWORD_NAME="${SECRET_DB_PASSWORD_NAME:-db-password}"
SECRET_DATABASE_URL_NAME="${SECRET_DATABASE_URL_NAME:-database-url}"
DB_USER="${DB_USER:-shopuser}"
DB_NAME="${DB_NAME:-shopdb}"

INFO_DIR=".deploy-info-$(date +%s)"
mkdir -p "${INFO_DIR}"

LOG_FILE="${INFO_DIR}/dburl-update.log"

echo "[info] Using project: ${GCP_PROJECT}" | tee "${LOG_FILE}"

echo "[info] Reading Terraform output for cloud_sql_connection_name..." | tee -a "${LOG_FILE}"
pushd infra >/dev/null
CONNECTION_NAME=$(terraform output -raw cloud_sql_connection_name 2>> "../${LOG_FILE}")
popd >/dev/null

if [[ -z "${CONNECTION_NAME}" ]]; then
  echo "[error] Could not read cloud_sql_connection_name from terraform output" | tee -a "${LOG_FILE}"
  exit 1
fi

echo "[info] Cloud SQL connection name: ${CONNECTION_NAME}" | tee -a "${LOG_FILE}"

echo "[info] Fetching DB password from Secret Manager: ${SECRET_DB_PASSWORD_NAME}" | tee -a "${LOG_FILE}"
DB_PASSWORD=$(gcloud secrets versions access latest \
  --secret="${SECRET_DB_PASSWORD_NAME}" \
  --project="${GCP_PROJECT}" \
  2>> "${LOG_FILE}")

if [[ -z "${DB_PASSWORD}" ]]; then
  echo "[error] DB_PASSWORD is empty. Abort." | tee -a "${LOG_FILE}"
  exit 1
fi

NEW_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"

LEN=${#NEW_DATABASE_URL}
echo "[info] Built DATABASE_URL (length=${LEN}, value not printed)" | tee -a "${LOG_FILE}"

echo "[info] Creating new secret version for ${SECRET_DATABASE_URL_NAME}" | tee -a "${LOG_FILE}"
printf '%s' "${NEW_DATABASE_URL}" | gcloud secrets versions add "${SECRET_DATABASE_URL_NAME}" \
  --data-file=- \
  --project="${GCP_PROJECT}" >> "${LOG_FILE}" 2>&1

echo "[info] DATABASE_URL secret updated successfully." | tee -a "${LOG_FILE}"

gcloud secrets versions access latest \
  --secret="${SECRET_DATABASE_URL_NAME}" \
  --project="${GCP_PROJECT}" \
  | sed 's/:.*@/:[REDACTED]@/' > "${INFO_DIR}/database-url-redacted.txt"

echo "[info] Redacted DATABASE_URL stored in ${INFO_DIR}/database-url-redacted.txt" | tee -a "${LOG_FILE}"
echo "[info] Done." | tee -a "${LOG_FILE}"
