#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="hugs-headshop-20251108122937"
REGION="europe-west3"
DB_INSTANCE="hugs-pg-instance-prod"
DB_NAME="shopdb"
DB_USER="shopuser"

BACKEND_SERVICE="hugs-backend-prod"
FRONTEND_SERVICE="hugs-frontend-prod"

echo "==[1/5] gcloud Projekt setzen & Auth sicherstellen =="
gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud auth login
gcloud auth application-default login

echo
echo "==[2/5] Service-URLs ermitteln =="
BACKEND_URL="$(
  gcloud run services describe "${BACKEND_SERVICE}" \
    --platform=managed \
    --region="${REGION}" \
    --format='value(status.url)'
)"
FRONTEND_URL="$(
  gcloud run services describe "${FRONTEND_SERVICE}" \
    --platform=managed \
    --region="${REGION}" \
    --format='value(status.url)'
)"
if [[ -z "${BACKEND_URL}" || -z "${FRONTEND_URL}" ]]; then
  echo "FEHLER: Konnte BACKEND_URL oder FRONTEND_URL nicht auslesen."
  exit 1
fi
echo "  BACKEND_URL  = ${BACKEND_URL}"
echo "  FRONTEND_URL = ${FRONTEND_URL}"

if ! command -v jq >/dev/null 2>&1; then
  echo "FEHLER: jq ist nicht installiert. Bitte z.B. mit 'brew install jq' installieren."
  exit 1
fi

echo
echo "==[3/5] User.status-Spalte in PROD-DB sicherstellen =="

mkdir -p infra/sql
SQL_FILE="infra/sql/2025-11-18-add-user-status.sql"

cat > "${SQL_FILE}" <<SQL
-- Stellt sicher, dass die Spalte "status" zur Tabelle "User" passt
-- zum Prisma-Schema: status String @default("ACTIVE")

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';
SQL

echo "  SQL-Datei geschrieben: ${SQL_FILE}"

echo "  Suche bestehenden Bucket mit Präfix gs://${PROJECT_ID}_cloudbuild/db-maint* …"
MAINT_BUCKET_RAW="$(gsutil ls "gs://${PROJECT_ID}_cloudbuild/*" 2>/dev/null | head -n 1 || true)"
if [[ -z "${MAINT_BUCKET_RAW}" ]]; then
  MAINT_BUCKET="gs://${PROJECT_ID}_cloudbuild/db-maint"
  echo "  Hinweis: kein expliziter db-maint Ordner gefunden, verwende ${MAINT_BUCKET}"
else
  MAINT_BUCKET="$(dirname "${MAINT_BUCKET_RAW%/}")"
fi
if ! echo "${MAINT_BUCKET}" | grep -q "db-maint"; then
  MAINT_BUCKET="gs://${PROJECT_ID}_cloudbuild/db-maint"
fi

echo "  Verwende Bucket-Pfad: ${MAINT_BUCKET}"
gsutil cp "${SQL_FILE}" "${MAINT_BUCKET}/sql/2025-11-18-add-user-status.sql"

echo "  Starte Cloud SQL Import für User.status…"
gcloud sql import sql "${DB_INSTANCE}" \
  "${MAINT_BUCKET}/sql/2025-11-18-add-user-status.sql" \
  --database="${DB_NAME}" \
  --user="${DB_USER}"

echo "  OK: User.status-Spalte sollte jetzt existieren."

echo
echo "==[4/5] JWT_SECRET für Backend-Service setzen und neue Revision auslösen =="

JWT_SECRET="$(openssl rand -hex 32)"
echo "  Generiertes JWT_SECRET (nur für dieses Update): ${JWT_SECRET}"

echo "  Aktualisiere Cloud-Run-Service ${BACKEND_SERVICE} mit JWT_SECRET…"
gcloud run services update "${BACKEND_SERVICE}" \
  --platform=managed \
  --region="${REGION}" \
  --set-env-vars="JWT_SECRET=${JWT_SECRET}"

echo "  Warte kurz, bis neue Revision aktiv ist (ca. 30 Sekunden)…"
sleep 30

echo
echo "==[5/5] Admin-Login-Endpoint in PROD testen =="

ADMIN_EMAIL="admin@hugs.garden"
ADMIN_PASSWORD="HugsAdmin!2025"

LOGIN_PAYLOAD=$(cat <<JSON
{
  "email": "${ADMIN_EMAIL}",
  "password": "${ADMIN_PASSWORD}"
}
JSON
)

echo "  Sende POST /api/auth/login an Backend…"
set +e
LOGIN_RESPONSE="$(
  curl -sS -w "\nHTTP_STATUS:%{http_code}\n" \
    -H "Content-Type: application/json" \
    -X POST \
    -d "${LOGIN_PAYLOAD}" \
    "${BACKEND_URL}/api/auth/login"
)"
CURL_EXIT=$?
set -e

if [[ ${CURL_EXIT} -ne 0 ]]; then
  echo "FEHLER: curl auf /api/auth/login ist fehlgeschlagen (Exit-Code ${CURL_EXIT})."
  echo "${LOGIN_RESPONSE}"
  exit 1
fi

HTTP_STATUS="$(printf '%s\n' "${LOGIN_RESPONSE}" | awk -F: '/HTTP_STATUS/ {print $2}' | tr -d '\r')"
BODY_JSON="$(printf '%s\n' "${LOGIN_RESPONSE}" | sed '/HTTP_STATUS:/d')"

echo "  HTTP-Status: ${HTTP_STATUS}"
echo "  Antwort-Body:"
printf '%s\n' "${BODY_JSON}" | jq . || echo "${BODY_JSON}"

if [[ "${HTTP_STATUS}" != "200" ]]; then
  echo "FEHLER: /api/auth/login liefert Status ${HTTP_STATUS}, erwartete 200."
  exit 1
fi

echo
echo "========================================================"
echo "Backend-Admin-Login-Fix abgeschlossen."
echo "Du solltest dich jetzt im Browser so einloggen können:"
echo
echo "  Admin-UI:   ${FRONTEND_URL}/admin"
echo "  E-Mail:     ${ADMIN_EMAIL}"
echo "  Passwort:   ${ADMIN_PASSWORD}"
echo
echo "Falls der Login im Browser weiterhin scheitert, bitte die"
echo "Netzwerk-Konsole für das POST /api/auth/login-Request prüfen"
echo "und mir die Meldung schicken."
echo "========================================================"
