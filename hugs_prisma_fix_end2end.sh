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
SERVICE_ACCOUNT="hugs-cloud-run-sa@hugs-headshop-20251108122937.iam.gserviceaccount.com"
BACKEND_URL="https://hugs-backend-prod-vqak3arhva-ey.a.run.app"

ADMIN_EMAIL="admin@hugs.garden"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

BAD_MIGRATION="20251115_add_tax_rate_to_product"
JOB_NAME_FIX="hugs-prisma-fix-end2end-prod"

echo
echo "$(ts) 0) Kontext & gcloud-Setup"

echo "-- pwd --"
pwd || true
echo
echo "-- ls --"
ls || true

echo
echo "$(ts) 0.1) gcloud-Version & aktuelle Konfiguration"
gcloud --version || true
echo
gcloud auth list || true
echo
gcloud config list || true

echo
echo "$(ts) 0.2) Projekt & Region hart auf PROD setzen"
gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud config set run/region "${REGION}" >/dev/null

echo
echo "$(ts) 0.3) Konfiguration nach Anpassung"
gcloud config list || true

# ---------------------------------------------------------------------------
# 1) Vorab-Smoke-Test Backend
# ---------------------------------------------------------------------------

echo
echo "$(ts) 1.1) /api/healthz vor Fix"
HEALTH_OUT="$(
  curl -sS -D - -w '\nHTTP_STATUS:%{http_code}\n' \
    "${BACKEND_URL}/api/healthz" || true
)"
printf '%s\n' "${HEALTH_OUT}"
HEALTH_STATUS="$(printf '%s\n' "${HEALTH_OUT}" | awk -F: '/HTTP_STATUS/ {print $2}' | tr -d '\r')"

if [ "${HEALTH_STATUS}" != "200" ]; then
  echo
  echo "$(ts) WARNUNG: /api/healthz liefert Status=${HEALTH_STATUS}. Backend ist möglicherweise nicht vollständig gesund."
fi

TOKEN=""

echo
echo "$(ts) 1.2) Admin-Login (optional, nur wenn ADMIN_PASSWORD gesetzt ist)"
if [ -z "${ADMIN_PASSWORD}" ]; then
  echo "$(ts) WARNUNG: ADMIN_PASSWORD ist nicht gesetzt – Admin-Login wird übersprungen."
else
  LOGIN_OUT="$(
    curl -sS -D - -w '\nHTTP_STATUS:%{http_code}\n' \
      -H 'Content-Type: application/json' \
      -X POST \
      -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
      "${BACKEND_URL}/api/auth/login" || true
  )"
  printf '%s\n' "LOGIN_OUT_PLACEHOLDER" | sed "s/LOGIN_OUT_PLACEHOLDER/${LOGIN_OUT}/" # Ausgabe beibehalten

  LOGIN_STATUS="$(printf '%s\n' "${LOGIN_OUT}" | awk -F: '/HTTP_STATUS/ {print $2}' | tr -d '\r')"

  if [ "${LOGIN_STATUS}" != "200" ]; then
    echo
    echo "$(ts) WARNUNG: Login-Call Status=${LOGIN_STATUS}. TOKEN wird nicht gesetzt."
  else
    LOGIN_BODY="$(printf '%s\n' "${LOGIN_OUT}" | sed '/HTTP_STATUS:/d')"
    TOKEN="$(printf '%s\n' "${LOGIN_BODY}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
    if [ -z "${TOKEN}" ]; then
      echo "$(ts) WARNUNG: Konnte kein JWT-Token aus Login-Response extrahieren."
    else
      echo "$(ts) Hinweis: JWT-Token wurde erfolgreich extrahiert."
    fi
  fi
fi

echo
echo "$(ts) 1.3) /api/pages VOR Fix (mit Bearer-Token falls vorhanden)"
if [ -n "${TOKEN}" ]; then
  PAGES_BEFORE="$(
    curl -sS -D - -w '\nHTTP_STATUS:%{http_code}\n' \
      -H "Authorization: Bearer ${TOKEN}" \
      "${BACKEND_URL}/api/pages" || true
  )"
else
  PAGES_BEFORE="$(
    curl -sS -D - -w '\nHTTP_STATUS:%{http_code}\n' \
      "${BACKEND_URL}/api/pages" || true
  )"
fi
printf '%s\n' "${PAGES_BEFORE}"
PAGES_STATUS_BEFORE="$(printf '%s\n' "${PAGES_BEFORE}" | awk -F: '/HTTP_STATUS/ {print $2}' | tr -d '\r')"

echo
echo "$(ts) Erwartung VOR Fix: HTTP 500 mit Prisma P2022 (Spalte Page.status fehlt)."
echo "$(ts) Tatsächlicher /api/pages-Status vor Fix: ${PAGES_STATUS_BEFORE}"

# ---------------------------------------------------------------------------
# 2) Backend-Image & DB-Connection ermitteln
# ---------------------------------------------------------------------------

echo
echo "$(ts) 2.1) Aktuelles Backend-Image aus Cloud Run Service ${SERVICE_NAME} lesen"
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
echo "$(ts) 2.2) Private IP der Cloud SQL Instanz ${INSTANCE_NAME} lesen"
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
echo "$(ts) 2.3) DB-Passwort aus Secret Manager (${DB_PASSWORD_SECRET}) lesen"
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
# 3) Analyse des Prisma-Schemas (Page.status) – im Job inline
# ---------------------------------------------------------------------------
# Die eigentliche Analyse erfolgt im Job (siehe Inline-Skript in Schritt 4),
# indem der Page-Model-Block aus schema.prisma geloggt und migrate status ausgegeben wird.

# ---------------------------------------------------------------------------
# 4) Cloud Run Job ${JOB_NAME_FIX} erstellen/aktualisieren
# ---------------------------------------------------------------------------

echo
echo "$(ts) 4) Cloud Run Job ${JOB_NAME_FIX} für End-to-End-Fix vorbereiten"

if gcloud run jobs describe "${JOB_NAME_FIX}" --region="${REGION}" >/dev/null 2>&1; then
  CMD="update"
  echo "$(ts) Job ${JOB_NAME_FIX} existiert bereits – wird aktualisiert."
else
  CMD="create"
  echo "$(ts) Job ${JOB_NAME_FIX} existiert noch nicht – wird neu erstellt."
fi

FIX_INLINE_SCRIPT="
set -euo pipefail

cd /app/backend || cd /workspace/backend || cd /app || cd /srv/backend || cd /srv

echo '[Job] Prisma-Schema Ausschnitt (Page):'
sed -n '/model Page/,/}/p' prisma/schema.prisma || echo '[Job] WARN: model Page nicht gefunden'
echo

echo '[Job] Migrationsübersicht:'
ls -1 prisma/migrations || true
echo

echo '[Job] Prisma migrate status (VOR Repair):'
npx prisma migrate status --schema=prisma/schema.prisma || true
echo

echo '[Job] Markiere fehlerhafte Migration ${BAD_MIGRATION} als applied (resolve)...'
npx prisma migrate resolve --applied ${BAD_MIGRATION} --schema=prisma/schema.prisma || true
echo

echo '[Job] Prüfe Schema-Drift für Page.status – ggf. manueller Hinweis im Log.'
echo '[Job] HINWEIS: Falls Page.status weiterhin in der DB fehlt, bitte ein separates SQL-Patch über'
echo '[Job]         prisma db execute oder ein manuelles ALTER TABLE auf der PROD-DB einspielen.'
echo

echo '[Job] Starte prisma migrate deploy ...'
npx prisma migrate deploy --schema=prisma/schema.prisma
echo

echo '[Job] Prisma migrate status (NACH deploy):'
npx prisma migrate status --schema=prisma/schema.prisma || true
echo '[Job] Fix-Job abgeschlossen.'
"

echo
echo "$(ts) 4.1) gcloud run jobs ${CMD} ${JOB_NAME_FIX}"

gcloud run jobs "${CMD}" "${JOB_NAME_FIX}" \
  --image="${BACKEND_IMAGE}" \
  --region="${REGION}" \
  --max-retries=0 \
  --task-timeout=900s \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=${DATABASE_URL}" \
  --service-account="${SERVICE_ACCOUNT}" \
  --vpc-connector="${VPC_CONNECTOR}" \
  --vpc-egress="all-traffic" \
  --command="bash" \
  --args="-lc","${FIX_INLINE_SCRIPT}"

echo
echo "$(ts) Job-Definition für ${JOB_NAME_FIX} wurde erstellt/aktualisiert."

# ---------------------------------------------------------------------------
# 5) Job ausführen & Logs evaluieren
# ---------------------------------------------------------------------------

echo
echo "$(ts) 5) Job ${JOB_NAME_FIX} ausführen"

EXEC_NAME="$(
  gcloud run jobs execute "${JOB_NAME_FIX}" \
    --region="${REGION}" \
    --format='value(metadata.name)'
)"

if [ -z "${EXEC_NAME}" ]; then
  echo "$(ts) FEHLER: Konnte Execution-Namen nach Job-Start nicht ermitteln."
  exit 1
fi

echo "$(ts) Ausgeführte Execution: ${EXEC_NAME}"

echo
echo "$(ts) 5.1) Execution-Status anzeigen"
gcloud run jobs executions describe "${EXEC_NAME}" \
  --region="${REGION}" \
  --format="yaml(status,conditions,taskCount)"

echo
echo "$(ts) 5.2) Logs der Job-Execution aus Cloud Logging lesen"

FILTER="resource.type=\"cloud_run_job\" \
AND resource.labels.location=\"${REGION}\" \
AND resource.labels.job_name=\"${JOB_NAME_FIX}\" \
AND labels.\"run.googleapis.com/execution_name\"=\"${EXEC_NAME}\""

echo "$(ts) Verwendeter Logging-Filter:"
echo "  ${FILTER}"
echo

gcloud logging read "${FILTER}" \
  --project="${PROJECT_ID}" \
  --limit=200 \
  --format='value(textPayload)' || true

echo
echo "$(ts) Ziel der Log-Analyse:"
echo "  - Keine Prisma-Fehler P3009/P3018 mehr für ${BAD_MIGRATION}"
echo "  - prisma migrate deploy läuft ohne Fehler durch"
echo "  - Klarer Hinweis, ob Page.status durch Migration angelegt wurde oder manuelles SQL nötig ist."

# ---------------------------------------------------------------------------
# 6) /api/pages nach Fix erneut testen
# ---------------------------------------------------------------------------

echo
echo "$(ts) 6) /api/pages nach Fix erneut testen"

# Optional: erneuter Admin-Login, falls ADMIN_PASSWORD gesetzt ist
if [ -n "${ADMIN_PASSWORD}" ]; then
  echo
  echo "$(ts) 6.1) (Optional) Admin-Login nach Fix"
  LOGIN2_OUT="$(
    curl -sS -D - -w '\nHTTP_STATUS:%{http_code}\n' \
      -H 'Content-Type: application/json' \
      -X POST \
      -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
      "${BACKEND_URL}/api/auth/login" || true
  )"
  printf '%s\n' "${LOGIN2_OUT}"

  LOGIN2_STATUS="$(printf '%s\n' "${LOGIN2_OUT}" | awk -F: '/HTTP_STATUS/ {print $2}' | tr -d '\r')"
  if [ "${LOGIN2_STATUS}" = "200" ]; then
    LOGIN2_BODY="$(printf '%s\n' "${LOGIN2_OUT}" | sed '/HTTP_STATUS:/d')"
    TOKEN="$(printf '%s\n' "${LOGIN2_BODY}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
    if [ -n "${TOKEN}" ]; then
      echo "$(ts) Hinweis: Neuer JWT-Token wurde nach Fix erfolgreich extrahiert."
    else
      echo "$(ts) WARNUNG: Konnte nach Fix keinen JWT-Token extrahieren."
    fi
  else
    echo "$(ts) WARNUNG: Login nach Fix war nicht erfolgreich (Status=${LOGIN2_STATUS})."
  fi
fi

echo
echo "$(ts) 6.2) /api/pages nach Fix aufrufen"

if [ -n "${TOKEN:-}" ]; then
  PAGES_AFTER="$(
    curl -sS -D - -w '\nHTTP_STATUS:%{http_code}\n' \
      -H "Authorization: Bearer ${TOKEN}" \
      "${BACKEND_URL}/api/pages" || true
  )"
else
  PAGES_AFTER="$(
    curl -sS -D - -w '\nHTTP_STATUS:%{http_code}\n' \
      "${BACKEND_URL}/api/pages" || true
  )"
fi

printf '%s\n' "${PAGES_AFTER}"
PAGES_STATUS_AFTER="$(printf '%s\n' "${PAGES_AFTER}" | awk -F: '/HTTP_STATUS/ {print $2}' | tr -d '\r')"

echo
if [ "${PAGES_STATUS_AFTER}" = "200" ]; then
  echo "$(ts) ERFOLG: /api/pages liefert jetzt HTTP 200."
  echo "$(ts) Erwartung: PrismaClientKnownRequestError P2022 ist behoben und Schema/DB sind konsistent."
else
  echo "$(ts) HINWEIS: /api/pages liefert weiterhin Status=${PAGES_STATUS_AFTER}."
  echo "$(ts) Wahrscheinlich ist ein manueller DB-Patch für Page.status erforderlich (ALTER TABLE)"
  echo "$(ts) sowie anschließendes prisma migrate resolve für die zugehörige Page-Migration."
fi

# ---------------------------------------------------------------------------
# 7) Reminder Cloud Run Revisions Logs
# ---------------------------------------------------------------------------

echo
echo "$(ts) 7) Reminder: Backend-Revisions-Logs manuell prüfen (nur Befehle anzeigen, nicht ausführen)"

echo "  gcloud run revisions list \\""
echo "    --service=${SERVICE_NAME} \\""
echo "    --region=${REGION} \\""
echo "    --sort-by=~createTime \\""
echo "    --limit=3"
echo
echo "  gcloud beta run revisions logs read <AKTIVE_REVISION> \\""
echo "    --region=${REGION} \\""
echo "    --limit=50"
echo
echo "$(ts) Ziel: Kein 'PrismaClientKnownRequestError P2022' und keine 'P3009/P3018' mehr in den Logs."
