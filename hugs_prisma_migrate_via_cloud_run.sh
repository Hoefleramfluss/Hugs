#!/usr/bin/env bash
set -euo pipefail

ts() { date "+[%Y-%m-%d %H:%M:%S]"; }

# --- Feste Parameter für HUGS PROD ---
PROJECT_ID="hugs-headshop-20251108122937"
REGION="europe-west3"
SERVICE_NAME="hugs-backend-prod"
JOB_NAME="hugs-prisma-migrate-prod"
INSTANCE_ID="hugs-pg-instance-prod"

DB_USER="shopuser"
DB_NAME="shopdb"
DB_PORT="5432"

DB_PASSWORD_SECRET_ID="db-password"     # Secret Manager: db-password
VPC_CONNECTOR="hugs-vpc-connector"      # serverless VPC Connector
RUN_SA="hugs-cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com"

BACKEND_URL="https://hugs-backend-prod-vqak3arhva-ey.a.run.app"

echo
echo "$(ts) 0) Kontext & gcloud-Setup"
echo "-- pwd --"
pwd
echo
echo "-- ls --"
ls

echo
echo "$(ts) 0.1) gcloud-Konfiguration anzeigen"
gcloud --version
echo
gcloud auth list
echo
gcloud config list

echo
echo "$(ts) 0.2) Projekt & Region hart auf PROD setzen"
gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud config set run/region "${REGION}" >/dev/null

echo
echo "$(ts) 0.3) Konfiguration nach Anpassung"
gcloud config list

# ---------------------------------------------------------------------------
# 1) Backend-Smoketests vor Migration
# ---------------------------------------------------------------------------

echo
echo "$(ts) 1) Backend-Smoketests gegen ${BACKEND_URL}"

echo
echo "$(ts) 1.1) /api/healthz"
HEALTHZ_OUT=$(curl -sS -w "\nHTTP_STATUS:%{http_code}\n" "${BACKEND_URL}/api/healthz" || true)
echo "${HEALTHZ_OUT}"

if ! echo "${HEALTHZ_OUT}" | grep -q "HTTP_STATUS:200"; then
  echo
  echo "$(ts) FEHLER: /api/healthz liefert keinen HTTP 200. Migration wird abgebrochen."
  exit 1
fi

echo
echo "$(ts) 1.2) Login /api/auth/login (Admin)"

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@hugs.garden}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

if [ -z "${ADMIN_PASSWORD}" ]; then
  echo
  echo "$(ts) WARNUNG: ADMIN_PASSWORD ist nicht gesetzt."
  echo "  -> Login-/Pages-Checks werden nur teilweise ausgeführt."
  TOKEN=""
else
  LOGIN_OUT=$(curl -sS -w "\nHTTP_STATUS:%{http_code}\n" \
    -X POST "${BACKEND_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" || true)

  echo "${LOGIN_OUT}"

  if ! echo "${LOGIN_OUT}" | grep -q "HTTP_STATUS:200"; then
    echo
    echo "$(ts) WARNUNG: Login liefert keinen 200. Token wird nicht gesetzt, Pages-Check ggf. nicht aussagekräftig."
    TOKEN=""
  else
    TOKEN=$(echo "${LOGIN_OUT}" | head -n1 | sed -E 's/.*"token":"([^"]+)".*/\1/')
  fi
fi

echo
echo "$(ts) 1.3) /api/pages vor Migration (mit Bearer-Token, falls vorhanden)"
if [ -n "${TOKEN}" ]; then
  PAGES_OUT_BEFORE=$(curl -sS -w "\nHTTP_STATUS:%{http_code}\n" \
    -H "Authorization: Bearer ${TOKEN}" \
    "${BACKEND_URL}/api/pages" || true)
else
  PAGES_OUT_BEFORE=$(curl -sS -w "\nHTTP_STATUS:%{http_code}\n" \
    "${BACKEND_URL}/api/pages" || true)
fi

echo "${PAGES_OUT_BEFORE}"

if echo "${PAGES_OUT_BEFORE}" | grep -q "P2022"; then
  echo
  echo "$(ts) Bestätigung: P2022-Fehler (fehlende Spalte) ist vor der Migration sichtbar."
fi

# ---------------------------------------------------------------------------
# 2) Cloud Run Job für Prisma-Migration definieren/aktualisieren
# ---------------------------------------------------------------------------

echo
echo "$(ts) 2) Cloud Run Job für Prisma-Migration vorbereiten"

echo
echo "$(ts) 2.1) Backend-Image aus bestehendem Cloud Run Service lesen"
BACKEND_IMAGE=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${REGION}" \
  --format='value(spec.template.spec.containers[0].image)')

if [ -z "${BACKEND_IMAGE}" ]; then
  echo "$(ts) FEHLER: Konnte Backend-Image aus Cloud Run Service ${SERVICE_NAME} nicht ermitteln."
  exit 1
fi

echo "$(ts) Verwendetes Backend-Image: ${BACKEND_IMAGE}"

echo
echo "$(ts) 2.2) Private IP der Cloud SQL Instanz ermitteln"
DB_HOST=$(gcloud sql instances describe "${INSTANCE_ID}" \
  --project="${PROJECT_ID}" \
  --format='get(ipAddresses[0].ipAddress)')

if [ -z "${DB_HOST}" ]; then
  echo "$(ts) FEHLER: Konnte DB_HOST nicht ermitteln."
  exit 1
fi

echo "$(ts) DB_HOST (private IP): ${DB_HOST}:${DB_PORT}"

echo
echo "$(ts) 2.3) Prüfen, ob Cloud Run Job ${JOB_NAME} bereits existiert"
if gcloud run jobs describe "${JOB_NAME}" --region="${REGION}" >/dev/null 2>&1; then
  ACTION="update"
  echo "$(ts) Job ${JOB_NAME} existiert – wird aktualisiert."
else
  ACTION="create"
  echo "$(ts) Job ${JOB_NAME} existiert noch nicht – wird neu angelegt."
fi

echo
echo "$(ts) 2.4) Job ${ACTION}: ${JOB_NAME}"

# Skript, das im Job im Container ausgeführt wird (nur doppelte Anführungszeichen verwenden!)
MIGRATE_CMD="
set -euo pipefail
echo \"[Job] Starte Prisma migrate deploy gegen ${DB_HOST}:${DB_PORT}/${DB_NAME}...\"

if [ -z \"\${DB_PASS:-}\" ]; then
  echo \"[Job] FEHLER: DB_PASS ist leer (Secret nicht gesetzt?)\" >&2
  exit 1
fi

export DATABASE_URL=\"postgresql://${DB_USER}:\${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public\"
echo \"[Job] DATABASE_URL ist gesetzt (Passwort maskiert).\"

# Prisma-Schema in bekannten Pfaden suchen
for DIR in /workspace/backend /app/backend /app /srv/backend /srv; do
  if [ -f \"\$DIR/prisma/schema.prisma\" ]; then
    cd \"\$DIR\"
    echo \"[Job] Verwende Prisma-Schema: \$DIR/prisma/schema.prisma\"
    npx prisma migrate deploy --schema=prisma/schema.prisma
    echo \"[Job] Prisma migrate deploy erfolgreich abgeschlossen.\"
    exit 0
  fi
done

echo \"[Job] FEHLER: prisma/schema.prisma nicht in bekannten Pfaden gefunden.\" >&2
ls -R .
exit 1
"

gcloud run jobs "${ACTION}" "${JOB_NAME}" \
  --region="${REGION}" \
  --image="${BACKEND_IMAGE}" \
  --service-account="${RUN_SA}" \
  --vpc-connector="${VPC_CONNECTOR}" \
  --vpc-egress=all-traffic \
  --set-env-vars="DB_USER=${DB_USER},DB_NAME=${DB_NAME},DB_HOST=${DB_HOST},DB_PORT=${DB_PORT}" \
  --set-secrets="DB_PASS=${DB_PASSWORD_SECRET_ID}:latest" \
  --command="/bin/bash" \
  --args="-lc","${MIGRATE_CMD}"

echo
echo "$(ts) 2.5) Job-Konfiguration abgeschlossen."

# ---------------------------------------------------------------------------
# 3) Job ausführen und auf Abschluss warten
# ---------------------------------------------------------------------------

echo
echo "$(ts) 3) Job ausführen: ${JOB_NAME}"
gcloud run jobs execute "${JOB_NAME}" \
  --region="${REGION}" \
  --wait

EXECUTIONS=$(gcloud run jobs executions list \
  --job="${JOB_NAME}" \
  --region="${REGION}" \
  --format='value(metadata.name)' \
  --limit=1)

LATEST_EXEC=$(echo "${EXECUTIONS}" | head -n1 || true)

echo
echo "$(ts) Letzte Job-Execution: ${LATEST_EXEC}"

if [ -n "${LATEST_EXEC}" ]; then
  echo
  echo "$(ts) 3.1) (Optional) Logs der letzten Execution anzeigen"
  gcloud run jobs executions logs read "${LATEST_EXEC}" \
    --region="${REGION}" \
    --limit=200 || true
fi

# ---------------------------------------------------------------------------
# 4) Backend-Check nach Migration
# ---------------------------------------------------------------------------

echo
echo "$(ts) 4) /api/pages nach Migration prüfen"

# Falls vorhin kein Token gesetzt werden konnte, hier ggf. abbrechen
if [ -z "${TOKEN:-}" ]; then
  echo
  echo "$(ts) WARNUNG: Kein Bearer-Token vorhanden – /api/pages-Check nur anonym möglich."
  PAGES_OUT_AFTER=$(curl -sS -w "\nHTTP_STATUS:%{http_code}\n" \
    "${BACKEND_URL}/api/pages" || true)
else
  PAGES_OUT_AFTER=$(curl -sS -w "\nHTTP_STATUS:%{http_code}\n" \
    -H "Authorization: Bearer ${TOKEN}" \
    "${BACKEND_URL}/api/pages" || true)
fi

echo "${PAGES_OUT_AFTER}"

if echo "${PAGES_OUT_AFTER}" | grep -q "HTTP_STATUS:200"; then
  echo
  echo "$(ts) ERFOLG: /api/pages liefert jetzt HTTP 200."
  echo "       P2022 sollte damit verschwunden sein."
else
  echo
  echo "$(ts) HINWEIS: /api/pages liefert weiterhin keinen 200er Status."
  echo "       -> Details der Job-Logs und Backend-Logs prüfen."
fi

echo
echo "$(ts) 5) Hinweis zu Cloud Run Logs (optional manuell ausführen)"
echo "  gcloud run revisions list \\"
echo "    --service=${SERVICE_NAME} \\"
echo "    --region=${REGION} \\"
echo "    --sort-by=~createTime \\"
echo "    --limit=3"
echo
echo "  # Danach aktive Revision einsetzen:"
echo "  gcloud beta run revisions logs read <AKTIVE_REVISION> \\"
echo "    --region=${REGION} \\"
echo "    --limit=50"
echo
echo "$(ts) Zielbild: Kein 'PrismaClientKnownRequestError P2022' mehr in den Logs."
