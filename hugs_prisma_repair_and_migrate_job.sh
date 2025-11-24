#!/usr/bin/env bash
set -euo pipefail

ts() { date +"[%Y-%m-%d %H:%M:%S]"; }

PROJECT_ID="hugs-headshop-20251108122937"
REGION="europe-west3"
SERVICE_NAME="hugs-backend-prod"
INSTANCE_NAME="hugs-pg-instance-prod"
DB_NAME="shopdb"
DB_USER="shopuser"
DB_PASSWORD_SECRET="db-password"
VPC_CONNECTOR="hugs-vpc-connector"
SERVICE_ACCOUNT_EMAIL="hugs-cloud-run-sa@hugs-headshop-20251108122937.iam.gserviceaccount.com"
JOB_NAME="hugs-prisma-repair-migrate-prod"
BACKEND_URL="https://hugs-backend-prod-vqak3arhva-ey.a.run.app"
ADMIN_EMAIL="admin@hugs.garden"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
BAD_MIGRATION="20251115_add_tax_rate_to_product"

echo
echo "$(ts) 0) gcloud-Setup & Kontext"

echo "-- pwd --"
pwd
echo
echo "-- ls --"
ls

echo
echo "$(ts) 0.1) gcloud-Version & Auth-Info"
gcloud --version || true
echo
gcloud auth list || true
echo
gcloud config list || true

echo
echo "$(ts) 0.2) Projekt & Region auf PROD setzen"
gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud config set run/region "${REGION}" >/dev/null

echo
echo "$(ts) 0.3) Konfiguration nach Anpassung"
gcloud config list

# ---------------------------------------------------------------------------
# 1) Vorab-Smoke-Tests Backend
# ---------------------------------------------------------------------------

echo
echo "$(ts) 1.1) /api/healthz vor Repair+Migration"
HEALTH_RESPONSE="$(
  curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
    "${BACKEND_URL}/api/healthz" || true
)"
printf '%s\n' "${HEALTH_RESPONSE}"
HEALTH_STATUS="$(printf '%s\n' "${HEALTH_RESPONSE}" | awk -F: '/HTTP_STATUS/ {print $2}' | tr -d '\r')"

if [ "${HEALTH_STATUS}" != "200" ]; then
  echo
  echo "$(ts) WARNUNG: /api/healthz Status=${HEALTH_STATUS}. Backend ist nicht vollständig gesund."
fi

TOKEN=""

echo
echo "$(ts) 1.2) Admin-Login /api/auth/login (nur wenn ADMIN_PASSWORD gesetzt ist)"
if [ -z "${ADMIN_PASSWORD}" ]; then
  echo "$(ts) WARNUNG: ADMIN_PASSWORD ist nicht gesetzt – Admin-Login wird übersprungen."
else
  LOGIN_RESPONSE="$(
    curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
      -H 'Content-Type: application/json' \
      -X POST \
      -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
      "${BACKEND_URL}/api/auth/login" || true
  )"
  printf '%s\n' "${LOGIN_RESPONSE}"
  LOGIN_STATUS="$(printf '%s\n' "${LOGIN_RESPONSE}" | awk -F: '/HTTP_STATUS/ {print $2}' | tr -d '\r')"

  if [ "${LOGIN_STATUS}" != "200" ]; then
    echo
    echo "$(ts) WARNUNG: Login-Call Status=${LOGIN_STATUS}. TOKEN wird nicht gesetzt."
  else
    LOGIN_BODY="$(printf '%s\n' "${LOGIN_RESPONSE}" | sed '/HTTP_STATUS:/d')"
    TOKEN="$(printf '%s\n' "${LOGIN_BODY}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
    if [ -z "${TOKEN}" ]; then
      echo "$(ts) WARNUNG: Konnte kein JWT-Token aus Login-Response extrahieren."
    fi
  fi
fi

echo
echo "$(ts) 1.3) /api/pages vor Repair+Migration"
if [ -n "${TOKEN}" ]; then
  PAGES_BEFORE="$(
    curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
      -H "Authorization: Bearer ${TOKEN}" \
      "${BACKEND_URL}/api/pages" || true
  )"
else
  PAGES_BEFORE="$(
    curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
      "${BACKEND_URL}/api/pages" || true
  )"
fi
printf '%s\n' "${PAGES_BEFORE}"
PAGES_STATUS_BEFORE="$(printf '%s\n' "${PAGES_BEFORE}" | awk -F: '/HTTP_STATUS/ {print $2}' | tr -d '\r')"

echo
echo "$(ts) Hinweis: Erwartet wird derzeit ein Fehler (z.B. HTTP 500 / PrismaClientKnownRequestError P2022)."
echo "$(ts) Tatsächlicher Status vor Repair: ${PAGES_STATUS_BEFORE}"

# ---------------------------------------------------------------------------
# 2) Backend-Image & DB-Zugangsdaten ermitteln
# ---------------------------------------------------------------------------

echo
echo "$(ts) 2.1) Backend-Image aus Cloud Run Service ${SERVICE_NAME} lesen"
BACKEND_IMAGE="$(
  gcloud run services describe "${SERVICE_NAME}" \
    --region="${REGION}" \
    --format='value(spec.template.spec.containers[0].image)'
)"

if [ -z "${BACKEND_IMAGE}" ]; then
  echo "$(ts) FEHLER: Konnte Backend-Image aus Service ${SERVICE_NAME} nicht ermitteln."
  exit 1
fi
echo "$(ts) Verwendetes Backend-Image: ${BACKEND_IMAGE}"

echo
echo "$(ts) 2.2) DB-Host (private IP) aus Cloud SQL Instanz ${INSTANCE_NAME} lesen"
DB_HOST_IP="$(
  gcloud sql instances describe "${INSTANCE_NAME}" \
    --project="${PROJECT_ID}" \
    --format='value(ipAddresses[0].ipAddress)'
)"

if [ -z "${DB_HOST_IP}" ]; then
  echo "$(ts) FEHLER: Konnte DB_HOST_IP nicht ermitteln."
  exit 1
fi

DB_HOST="${DB_HOST_IP}:5432"
echo "$(ts) DB_HOST (private IP): ${DB_HOST}"

echo
echo "$(ts) 2.3) DB-Passwort via Secret Manager (${DB_PASSWORD_SECRET}) lesen"
DB_PASSWORD="$(
  gcloud secrets versions access latest \
    --secret="${DB_PASSWORD_SECRET}" \
    --project="${PROJECT_ID}"
)"

if [ -z "${DB_PASSWORD}" ]; then
  echo "$(ts) FEHLER: DB_PASSWORD ist leer – Secret ${DB_PASSWORD_SECRET} liefert keinen Wert."
  exit 1
fi

echo
echo "$(ts) 2.4) DATABASE_URL zusammensetzen (nur maskiert loggen)"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}?schema=public"
DATABASE_URL_MASKED="postgresql://${DB_USER}:***@${DB_HOST}/${DB_NAME}?schema=public"
echo "$(ts) DATABASE_URL(maskiert): ${DATABASE_URL_MASKED}"

# ---------------------------------------------------------------------------
# 3) Repair-Job hugs-prisma-repair-migrate-prod anlegen/aktualisieren
# ---------------------------------------------------------------------------

echo
echo "$(ts) 3) Repair-Job ${JOB_NAME} anlegen/aktualisieren"

if gcloud run jobs describe "${JOB_NAME}" --region="${REGION}" >/dev/null 2>&1; then
  JOB_CMD="update"
  echo "$(ts) Job ${JOB_NAME} existiert bereits – wird aktualisiert."
else
  JOB_CMD="create"
  echo "$(ts) Job ${JOB_NAME} existiert noch nicht – wird neu erstellt."
fi

REPAIR_INLINE_SCRIPT="
set -euo pipefail
cd /app/backend || cd /workspace/backend || cd /app || cd /srv/backend || cd /srv

echo \"[Job] Verwende Prisma-Schema: prisma/schema.prisma\"
echo

echo \"[Job] Migrationsstatus VOR Repair:\"
npx prisma migrate status --schema=prisma/schema.prisma || true
echo

echo \"[Job] Markiere problematische Migration ${BAD_MIGRATION} als applied (resolve)...\"
npx prisma migrate resolve \\
  --applied ${BAD_MIGRATION} \\
  --schema=prisma/schema.prisma

echo
echo \"[Job] Starte prisma migrate deploy nach Repair ...\"
npx prisma migrate deploy --schema=prisma/schema.prisma

echo
echo \"[Job] Migrationslauf abgeschlossen. Migrationsstatus NACH deploy:\"
npx prisma migrate status --schema=prisma/schema.prisma || true
"

echo
echo "$(ts) 3.1) gcloud run jobs ${JOB_CMD} ${JOB_NAME}"
gcloud run jobs "${JOB_CMD}" "${JOB_NAME}" \
  --image="${BACKEND_IMAGE}" \
  --region="${REGION}" \
  --max-retries=0 \
  --task-timeout=900s \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=${DATABASE_URL}" \
  --service-account="${SERVICE_ACCOUNT_EMAIL}" \
  --vpc-connector="${VPC_CONNECTOR}" \
  --vpc-egress="all-traffic" \
  --command="bash" \
  --args="-lc","${REPAIR_INLINE_SCRIPT}"

echo
echo "$(ts) Job-Konfiguration für ${JOB_NAME} abgeschlossen."

# ---------------------------------------------------------------------------
# 4) Job ausführen & Execution-Status
# ---------------------------------------------------------------------------

echo
echo "$(ts) 4) Job ${JOB_NAME} ausführen"
EXEC_NAME="$(
  gcloud run jobs execute "${JOB_NAME}" \
    --region="${REGION}" \
    --format='value(metadata.name)'
)"

if [ -z "${EXEC_NAME}" ]; then
  echo "$(ts) FEHLER: Konnte Execution-Namen nach Job-Start nicht ermitteln."
  exit 1
fi

echo "$(ts) Ausgeführte Execution: ${EXEC_NAME}"

echo
echo "$(ts) 4.1) Execution-Status anzeigen"
gcloud run jobs executions describe "${EXEC_NAME}" \
  --region="${REGION}" \
  --format="yaml(status,conditions,taskCount)"

# ---------------------------------------------------------------------------
# 5) Logs aus Cloud Logging für diese Execution
# ---------------------------------------------------------------------------

echo
echo "$(ts) 5) Logs aus Cloud Logging für Execution ${EXEC_NAME} lesen"

FILTER="resource.type=\"cloud_run_job\" \
AND resource.labels.location=\"${REGION}\" \
AND resource.labels.job_name=\"${JOB_NAME}\" \
AND labels.\"run.googleapis.com/execution_name\"=\"${EXEC_NAME}\""

echo "$(ts) Verwendeter Logging-Filter:"
echo "  ${FILTER}"
echo

gcloud logging read "${FILTER}" \
  --project="${PROJECT_ID}" \
  --limit=200 \
  --format='value(textPayload)' || true

echo
echo "$(ts) Ziel: Sicherstellen, dass keine neuen Prisma-Fehler P3009/P3018 mehr auftreten."

# ---------------------------------------------------------------------------
# 6) /api/pages nach Repair+Migration prüfen
# ---------------------------------------------------------------------------

echo
echo "$(ts) 6) /api/pages nach Repair+Migration prüfen"

if [ -n "${ADMIN_PASSWORD}" ]; then
  echo
  echo "$(ts) 6.1) (Optional) Admin-Login nach Migration"
  LOGIN_RESPONSE2="$(
    curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
      -H 'Content-Type: application/json' \
      -X POST \
      -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
      "${BACKEND_URL}/api/auth/login" || true
  )"
  printf '%s\n' "${LOGIN_RESPONSE2}"
  LOGIN_STATUS2="$(printf '%s\n' "${LOGIN_RESPONSE2}" | awk -F: '/HTTP_STATUS/ {print $2}' | tr -d '\r')"
  if [ "${LOGIN_STATUS2}" = "200" ]; then
    LOGIN_BODY2="$(printf '%s\n' "${LOGIN_RESPONSE2}" | sed '/HTTP_STATUS:/d')"
    TOKEN="$(printf '%s\n' "${LOGIN_BODY2}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
  else
    echo "$(ts) WARNUNG: Login nach Migration war nicht erfolgreich (Status=${LOGIN_STATUS2})."
  fi
fi

echo
echo "$(ts) 6.2) /api/pages nach Repair (mit Bearer-Token falls verfügbar)"
if [ -n "${TOKEN:-}" ]; then
  PAGES_AFTER="$(
    curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
      -H "Authorization: Bearer ${TOKEN}" \
      "${BACKEND_URL}/api/pages" || true
  )"
else
  PAGES_AFTER="$(
    curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
      "${BACKEND_URL}/api/pages" || true
  )"
fi

printf '%s\n' "${PAGES_AFTER}"
PAGES_STATUS_AFTER="$(printf '%s\n' "${PAGES_AFTER}" | awk -F: '/HTTP_STATUS/ {print $2}' | tr -d '\r')"

echo
if [ "${PAGES_STATUS_AFTER}" = "200" ]; then
  echo "$(ts) ERFOLG: /api/pages liefert nach Repair+Migration HTTP_STATUS:200."
  echo "$(ts) Erwartung: Kein PrismaClientKnownRequestError P2022 und keine P3009/P3018 mehr."
else
  echo "$(ts) HINWEIS: /api/pages liefert nach Repair+Migration Status=${PAGES_STATUS_AFTER}."
  echo "$(ts) Bitte Container-Logs und Job-Logs auf weitere Fehlermeldungen prüfen."
fi

# ---------------------------------------------------------------------------
# 7) Reminder für Backend-Revisions-Logs
# ---------------------------------------------------------------------------

echo
echo "$(ts) 7) Reminder: Backend-Revisions-Logs manuell prüfen (nur Befehle anzeigen)"

echo "  gcloud run revisions list \\\""
echo "    --service=${SERVICE_NAME} \\\""
echo "    --region=${REGION} \\\""
echo "    --sort-by=~createTime \\\""
echo "    --limit=3"
echo
echo "  gcloud beta run revisions logs read <AKTIVE_REVISION> \\\""
echo "    --region=${REGION} \\\""
echo "    --limit=50"
echo
echo "$(ts) Ziel: „Kein PrismaClientKnownRequestError P2022 und keine P3009/P3018 mehr in den Logs.“"
