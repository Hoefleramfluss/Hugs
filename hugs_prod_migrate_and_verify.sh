#!/usr/bin/env bash
set -euo pipefail

ts() { date +"[%Y-%m-%d %H:%M:%S]"; }

PROJECT_ID="hugs-headshop-20251108122937"
INSTANCE_CONNECTION_NAME="${PROJECT_ID}:europe-west3:hugs-pg-instance-prod"
DB_NAME="shopdb"
DB_USER="shopuser"
DB_SECRET_NAME="db-password"

BACKEND_URL_DEFAULT="https://hugs-backend-prod-vqak3arhva-ey.a.run.app"
BACKEND_URL="${BACKEND_URL:-$BACKEND_URL_DEFAULT}"

ADMIN_EMAIL="admin@hugs.garden"
ADMIN_PASSWORD="HugsAdmin!2025"

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
gcloud config set core/project "${PROJECT_ID}" >/dev/null
gcloud config set run/region "europe-west3" >/dev/null

echo
echo "$(ts) 0.3) Konfiguration nach Anpassung"
gcloud config list
echo

echo "$(ts) 1) Backend-Smoketests gegen ${BACKEND_URL}"

echo
echo "$(ts) 1.1) /api/healthz"
HEALTH_RESPONSE="$(
  curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
    "${BACKEND_URL}/api/healthz"
)"
printf '%s\n' "$HEALTH_RESPONSE"
HEALTH_STATUS="$(printf '%s\n' "$HEALTH_RESPONSE" | awk -F: '/HTTP_STATUS/ {print $2}' | tr -d '\r')"

if [ "${HEALTH_STATUS}" != "200" ]; then
  echo "$(ts) FEHLER: /api/healthz Status=${HEALTH_STATUS}. Migration wird abgebrochen."
  exit 1
fi

echo
echo "$(ts) 1.2) Login /api/auth/login (Admin)"
LOGIN_RESPONSE="$(
  curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
    -H 'Content-Type: application/json' \
    -X POST \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
    "${BACKEND_URL}/api/auth/login"
)"
printf '%s\n' "$LOGIN_RESPONSE"
LOGIN_STATUS="$(printf '%s\n' "$LOGIN_RESPONSE" | awk -F: '/HTTP_STATUS/ {print $2}' | tr -d '\r')"

if [ "${LOGIN_STATUS}" != "200" ]; then
  echo "$(ts) FEHLER: Login-Call Status=${LOGIN_STATUS}. Migration wird abgebrochen."
  exit 1
fi

LOGIN_BODY="$(printf '%s\n' "$LOGIN_RESPONSE" | sed '/HTTP_STATUS:/d')"
TOKEN="$(printf '%s\n' "$LOGIN_BODY" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"

if [ -z "${TOKEN}" ]; then
  echo "$(ts) FEHLER: Konnte kein JWT-Token aus Login-Response extrahieren."
  exit 1
fi

echo
echo "$(ts) 1.3) /api/pages vor Migration (mit Bearer-Token)"
PAGES_RESPONSE_BEFORE="$(
  curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
    -H "Authorization: Bearer ${TOKEN}" \
    "${BACKEND_URL}/api/pages"
)"
printf '%s\n' "$PAGES_RESPONSE_BEFORE"
PAGES_STATUS_BEFORE="$(printf '%s\n' "$PAGES_RESPONSE_BEFORE" | awk -F: '/HTTP_STATUS/ {print $2}' | tr -d '\r')"

if [ "${PAGES_STATUS_BEFORE}" = "200" ]; then
  echo
  echo "$(ts) HINWEIS: /api/pages liefert bereits 200. Prisma-Migration ist vermutlich schon durch."
  echo "$(ts) Skript beendet sich ohne Migration."
  exit 0
fi

echo
echo "$(ts) 2) Prisma-Migration auf PROD-DB via Cloud SQL Proxy"
echo "      ACHTUNG: Dieser Schritt ändert das Schema der PROD-Datenbank (${DB_NAME})."

if [ ! -x "./cloud-sql-proxy" ]; then
  echo "$(ts) FEHLER: ./cloud-sql-proxy nicht gefunden oder nicht ausführbar."
  echo "       Bitte sicherstellen, dass der Proxy-Binary im Projekt-Root liegt und chmod +x gesetzt ist."
  exit 1
fi

echo
echo "$(ts) 2.1) DB-Passwort aus Secret Manager lesen (${DB_SECRET_NAME})"
DB_PASS="$(
  gcloud secrets versions access latest \
    --secret="${DB_SECRET_NAME}" \
    --project="${PROJECT_ID}"
)"

if [ -z "${DB_PASS}" ]; then
  echo "$(ts) FEHLER: DB-Passwort aus Secret Manager leer."
  exit 1
fi

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}?schema=public"
echo "$(ts) DATABASE_URL (maskiert): postgresql://${DB_USER}:***@127.0.0.1:5432/${DB_NAME}?schema=public"

echo
echo "$(ts) 2.2) Cloud SQL Proxy starten gegen ${INSTANCE_CONNECTION_NAME}"
./cloud-sql-proxy \
  --address=127.0.0.1 \
  --port=5432 \
  "${INSTANCE_CONNECTION_NAME}" &
PROXY_PID=$!

cleanup() {
  if ps -p "${PROXY_PID}" >/dev/null 2>&1; then
    echo
    echo "$(ts) Stoppe Cloud SQL Proxy (PID=${PROXY_PID})"
    kill "${PROXY_PID}" || true
  fi
}
trap cleanup EXIT

echo "$(ts) Warte bis Port 5432 erreichbar ist..."
READY=0
for i in $(seq 1 30); do
  if command -v nc >/dev/null 2>&1; then
    if nc -z 127.0.0.1 5432 2>/dev/null; then
      READY=1
      break
    fi
  else
    sleep 2
    READY=1
    break
  fi
  sleep 1
done

if [ "${READY}" -ne 1 ]; then
  echo "$(ts) FEHLER: Port 5432 nicht rechtzeitig erreichbar. Proxy/Instanz prüfen."
  exit 1
fi

echo
echo "$(ts) 2.3) Prisma-Migration ausführen (npx prisma migrate deploy)"
cd backend

npx prisma migrate deploy --schema=prisma/schema.prisma

cd ..
echo
echo "$(ts) 2.4) Prisma-Migration erfolgreich. Cloud SQL Proxy wird im cleanup gestoppt."

echo
echo "$(ts) 3) /api/pages nach Migration erneut testen"

PAGES_RESPONSE_AFTER="$(
  curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
    -H "Authorization: Bearer ${TOKEN}" \
    "${BACKEND_URL}/api/pages"
)"
printf '%s\n' "$PAGES_RESPONSE_AFTER"
PAGES_STATUS_AFTER="$(printf '%s\n' "$PAGES_RESPONSE_AFTER" | awk -F: '/HTTP_STATUS/ {print $2}' | tr -d '\r')"

if [ "${PAGES_STATUS_AFTER}" != "200" ]; then
  echo
  echo "$(ts) WARNUNG: /api/pages liefert nach Migration weiterhin Status=${PAGES_STATUS_AFTER}."
  echo "         Response oben prüfen, ggf. Cloud Run Logs für die aktive Revision ansehen."
else
  echo
  echo "$(ts) ERFOLG: /api/pages liefert jetzt 200. Pages-API ist produktiv verfügbar."
fi

echo
echo "$(ts) 4) Hinweis zu Cloud Run Logs (optional manuell ausführen)"
echo "  gcloud run revisions list \\"
echo "    --service=hugs-backend-prod \\"
echo "    --region=europe-west3 \\"
echo "    --sort-by=~createTime \\"
echo "    --limit=3"
echo
echo "  # Danach aktive Revision einsetzen:"
echo "  gcloud beta run revisions logs read <AKTIVE_REVISION> \\"
echo "    --region=europe-west3 \\"
echo "    --limit=50"
echo
echo "$(ts) Zielbild: Kein 'PrismaClientKnownRequestError P2022' mehr in den Logs."
