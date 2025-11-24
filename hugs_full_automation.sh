#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Hugs End-to-End Automatisierung (ohne destruktives Terraform Apply)
#
# Orchestriert:
# 1) gcloud-Kontext (Account, Projekt, Region)
# 2) Terraform-State-Fix (SQL-User + run.googleapis.com) im ./infra-Verzeichnis
# 3) Optionale PROD-Prisma-Migrationen via cloud-sql-proxy
# 4) Optionale Cloud Build & Deploy (mit _RUN_DB_MIGRATIONS=false)
# 5) Smoke-Tests (Healthz, Login, /api/pages)
#
# WICHTIG:
# - Kein terraform apply
# - Prisma-Migrationen und Deploy nur nach interaktiver Bestätigung
###############################################################################

###############################################################################
# 0) Projektkonstanten & Basis-Konfiguration
###############################################################################
PROJECT_ID="hugs-headshop-20251108122937"
GCP_REGION="europe-west3"

BACKEND_SERVICE="hugs-backend-prod"
FRONTEND_SERVICE="hugs-frontend-prod"

ARTIFACT_REPO="hugs-headshop-repo"
CLOUD_RUN_SA="hugs-cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com"
DB_INSTANCE="hugs-pg-instance-prod"
DB_NAME="shopdb"
DB_USER="shopuser"
DB_PASS="${DB_PASS:-}"

BACKEND_EXTERNAL_URL="https://hugs-backend-prod-vqak3arhva-ey.a.run.app"
NEXT_PUBLIC_API_URL="${BACKEND_EXTERNAL_URL}"

###############################################################################
# Hilfsfunktionen
###############################################################################
log() {
  printf '\n[%s] %s\n\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

confirm() {
  local msg="${1:-Weiterfahren?}"
  read -r -p "${msg} (yes/no): " answer
  case "$answer" in
    yes|y|Y) return 0 ;;
    *)       return 1 ;;
  esac
}

###############################################################################
# 1) Grundchecks: Verzeichnis, gcloud, Terraform
###############################################################################
log "0) Kontext & Tooling-Checks"

echo "-- Aktuelles Verzeichnis --"
pwd
echo

echo "-- Verzeichnisinhalt --"
ls
echo

if ! command -v gcloud >/dev/null 2>&1; then
  echo "FEHLER: gcloud ist nicht im PATH. Bitte Google Cloud SDK installieren."
  exit 1
fi
if ! command -v terraform >/dev/null 2>&1; then
  echo "FEHLER: terraform ist nicht im PATH. Bitte Terraform installieren."
  exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "FEHLER: curl ist nicht im PATH. Bitte curl installieren."
  exit 1
fi

log "0.1) gcloud-Version"
gcloud version
echo

log "0.2) Aktive gcloud-Accounts"
gcloud auth list
echo

log "0.3) Aktive gcloud-Konfiguration (vor Anpassung)"
gcloud config list
echo

log "0.4) Projekt & Run-Region hart setzen für diesen Run"
gcloud config set core/project "${PROJECT_ID}"
gcloud config set run/region "${GCP_REGION}"

log "0.5) Aktive Konfiguration (nach Anpassung)"
gcloud config list
echo

###############################################################################
# 2) Terraform-Infra automatisiert initialisieren & State fixen
###############################################################################
log "1) Terraform-Setup & State-Korrekturen (ohne Apply)"

TF_DIR=""

if ls *.tf *.tf.json >/dev/null 2>&1; then
  TF_DIR="."
  echo "Terraform-Konfiguration im aktuellen Verzeichnis gefunden."
elif [ -d "infra" ]; then
  TF_DIR="infra"
  echo "Terraform-Konfiguration im Unterverzeichnis ./infra gefunden."
else
  echo "FEHLER: Keine Terraform-Konfiguration gefunden (.tf/.tf.json) und kein ./infra-Verzeichnis."
  exit 1
fi

echo "Arbeitsverzeichnis für Terraform: ${TF_DIR}"
echo

if [ "${TF_DIR}" != "." ]; then
  cd "${TF_DIR}"
fi

echo "-- Terraform-Dateien in $(pwd) --"
ls *.tf *.tf.json 2>/dev/null || true
echo

log "1.1) terraform init (read-only, sicher)"
terraform init -input=false -upgrade
echo

log "1.2) Erster terraform plan (Fehler brechen Skript nicht ab)"
set +e
if [ -f "terraform.tfvars" ]; then
  terraform plan -var-file=terraform.tfvars
  PLAN_EXIT=$?
else
  echo "Hinweis: Keine terraform.tfvars gefunden – Plan ohne var-file."
  terraform plan
  PLAN_EXIT=$?
fi
set -e

if [ ${PLAN_EXIT} -ne 0 ]; then
  echo "WARNUNG: Erster terraform plan ist mit Exit-Code ${PLAN_EXIT} fehlgeschlagen."
fi
echo

log "1.3) Terraform-State: google_project_service|google_sql_user"
set +e
terraform state list | grep -E "google_project_service|google_sql_user" || true
set -e
echo

log "1.4) SQL-User-State (google_sql_user.app) prüfen"

if grep -R 'resource[[:space:]]*"google_sql_user"[[:space:]]*"app"' . >/dev/null 2>&1; then
  echo "Konfiguration für 'google_sql_user.app' vorhanden."

  set +e
  terraform state show google_sql_user.app >/dev/null 2>&1
  STATE_SQL_USER_EXISTS=$?
  set -e

  if [ ${STATE_SQL_USER_EXISTS} -eq 0 ]; then
    echo "OK: 'google_sql_user.app' ist bereits im State."
  else
    echo "INFO: 'google_sql_user.app' fehlt im State – Import wird durchgeführt."
    terraform import google_sql_user.app "projects/${PROJECT_ID}/instances/${DB_INSTANCE}/users/${DB_USER}"
    echo "Import google_sql_user.app abgeschlossen."
  fi
else
  echo "Hinweis: 'google_sql_user.app' ist in der Terraform-Konfiguration nicht definiert – Import übersprungen."
fi
echo

log "1.5) Projektservice-State (google_project_service.apis[\"run.googleapis.com\"]) prüfen"

SERVICE_ADDR="google_project_service.apis[\"run.googleapis.com\"]"

if grep -R 'resource[[:space:]]*"google_project_service"[[:space:]]*"apis"' . >/dev/null 2>&1; then
  echo "Konfiguration für 'google_project_service.apis' vorhanden."

  set +e
  terraform state show "${SERVICE_ADDR}" >/dev/null 2>&1
  STATE_RUN_API_EXISTS=$?
  set -e

  if [ ${STATE_RUN_API_EXISTS} -eq 0 ]; then
    echo "OK: '${SERVICE_ADDR}' ist bereits im State."
  else
    echo "INFO: '${SERVICE_ADDR}' fehlt im State – Import wird durchgeführt."
    terraform import "${SERVICE_ADDR}" "projects/${PROJECT_ID}/services/run.googleapis.com"
    echo "Import ${SERVICE_ADDR} abgeschlossen."
  fi
else
  echo "Hinweis: 'google_project_service.apis' ist in der Terraform-Konfiguration nicht definiert – Import übersprungen."
fi
echo

log "1.6) Zweiter terraform plan nach State-Korrekturen (read-only)"
set +e
if [ -f "terraform.tfvars" ]; then
  terraform plan -var-file=terraform.tfvars
  FINAL_PLAN_EXIT=$?
else
  terraform plan
  FINAL_PLAN_EXIT=$?
fi
set -e

if [ ${FINAL_PLAN_EXIT} -eq 0 ]; then
  echo "OK: terraform plan nach State-Imports erfolgreich."
else
  echo "WARNUNG: terraform plan nach State-Imports mit Exit-Code ${FINAL_PLAN_EXIT}."
fi
echo

cd ..

###############################################################################
# 3) Optionale PROD-Prisma-Migrationen via cloud-sql-proxy
###############################################################################
log "2) Optionale PROD-Prisma-Migrationen (P1001-Fix für Page.status)"

if ! confirm "Prisma-Migrationen gegen PROD-Datenbank ausführen"; then
  echo "Überspringe Prisma-Migrationen (Produktivdatenbank bleibt unangetastet)."
else
  if [ ! -x "./cloud-sql-proxy" ]; then
    echo "FEHLER: ./cloud-sql-proxy nicht gefunden oder nicht ausführbar."
    echo "Bitte Binary in Projektroot legen und erneut versuchen."
    exit 1
  fi

  if [ -z "${DB_PASS}" ]; then
    echo "Kein DB_PASS in Environment gefunden."
    read -r -s -p "Bitte PROD-DB-Passwort für Benutzer '${DB_USER}' eingeben: " DB_PASS
    echo
  fi

  CONN_NAME="${PROJECT_ID}:${GCP_REGION}:${DB_INSTANCE}"
  log "2.1) cloud-sql-proxy für ${CONN_NAME} starten (Port 5432)"

  ./cloud-sql-proxy "${CONN_NAME}" --port 5432 >/tmp/cloud-sql-proxy.log 2>&1 &
  PROXY_PID=$!

  sleep 5

  if ! ps -p "${PROXY_PID}" >/dev/null 2>&1; then
    echo "FEHLER: cloud-sql-proxy konnte nicht gestartet werden. Log unter /tmp/cloud-sql-proxy.log prüfen."
    exit 1
  fi

  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}?schema=public"
  log "2.2) Prisma-Migrationen im Backend-Verzeichnis ausführen"
  echo "DATABASE_URL=${DATABASE_URL}"

  if [ ! -d "backend" ]; then
    echo "FEHLER: backend-Verzeichnis nicht gefunden."
    kill "${PROXY_PID}" || true
    exit 1
  fi

  pushd backend >/dev/null

  if [ ! -f "package.json" ]; then
    echo "FEHLER: Keine package.json im backend-Verzeichnis – Abbruch."
    kill "${PROXY_PID}" || true
    popd >/dev/null
    exit 1
  fi

  log "2.2.1) npm ci im Backend (falls node_modules fehlen)"
  if [ ! -d "node_modules" ]; then
    npm ci
  else
    echo "node_modules im Backend bereits vorhanden – npm ci übersprungen."
  fi

  log "2.2.2) npx prisma migrate deploy --schema=prisma/schema.prisma"
  npx prisma migrate deploy --schema=prisma/schema.prisma

  popd >/dev/null

  log "2.3) cloud-sql-proxy herunterfahren"
  kill "${PROXY_PID}" || true
  wait "${PROXY_PID}" 2>/dev/null || true
fi

###############################################################################
# 4) Optionale Cloud Build & Deploy (mit _RUN_DB_MIGRATIONS=false)
###############################################################################
log "3) Optionale Cloud Build & Deploy (Backend/Frontend) ohne Prisma-Migrationen"

if ! confirm "Cloud Build & Deploy jetzt starten"; then
  echo "Überspringe Cloud Build & Deploy."
else
  COMMIT_SHA="full-automation-$(date +%Y%m%d-%H%M%S)"

  log "3.1) Cloud Build Submit mit _RUN_DB_MIGRATIONS=false"
  gcloud builds submit \
    --config=ci/cloudbuild.yaml \
    --project="${PROJECT_ID}" \
    --substitutions="_GCP_REGION=${GCP_REGION},_ARTIFACT_REPO=${ARTIFACT_REPO},_ENV=prod,_CLOUD_RUN_SA=${CLOUD_RUN_SA},_DB_CONNECTION_NAME=${PROJECT_ID}:${GCP_REGION}:${DB_INSTANCE},_NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL},_BACKEND_URL=,_DEPLOY_TARGET=backend,_RUN_DB_MIGRATIONS=false,COMMIT_SHA=${COMMIT_SHA}"

  log "3.2) Revisionsübersicht Backendservice"
  gcloud run revisions list \
    --service="${BACKEND_SERVICE}" \
    --region="${GCP_REGION}" \
    --sort-by=~createTime \
    --limit=3

  ACTIVE_REVISION="$(gcloud run revisions list \
    --service="${BACKEND_SERVICE}" \
    --region="${GCP_REGION}" \
    --sort-by=~createTime \
    --limit=1 \
    --format='value(METADATA.name)')"

  echo "Aktive Revision Backend: ${ACTIVE_REVISION}"
fi

###############################################################################
# 5) Smoke-Tests: Healthz, Login, /api/pages
###############################################################################
log "4) Smoke-Tests gegen Backend-Endpoint ${BACKEND_EXTERNAL_URL}"

BACKEND_URL="${BACKEND_EXTERNAL_URL}"

log "4.1) /api/healthz"
curl -sS -D - \
  -w '\nHTTP_STATUS:%{http_code}\n' \
  "${BACKEND_URL}/api/healthz"

log "4.2) Admin-Login"
LOGIN_RESPONSE="$(
  curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{"email":"admin@hugs.garden","password":"HugsAdmin!2025"}' \
    "${BACKEND_URL}/api/auth/login"
)"
printf '%s\n' "${LOGIN_RESPONSE}"

TOKEN="$(echo "${LOGIN_RESPONSE}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p' || true)"

if [ -z "${TOKEN}" ]; then
  echo "WARNUNG: Konnte JWT-Token aus Login-Response nicht extrahieren – /api/pages-Test wird übersprungen."
else
  log "4.3) /api/pages mit Bearer-Token"
  curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
    -H "Authorization: Bearer ${TOKEN}" \
    "${BACKEND_URL}/api/pages"
fi

###############################################################################
# 6) Zusammenfassung
###############################################################################
log "5) Zusammenfassung"

echo "Projekt:                 ${PROJECT_ID}"
echo "Region:                  ${GCP_REGION}"
echo "Backend-Service:         ${BACKEND_SERVICE}"
echo "Frontend-Service:        ${FRONTEND_SERVICE}"
echo "Cloud SQL Instance:      ${DB_INSTANCE}"
echo "Datenbank:               ${DB_NAME}"
echo "DB-User:                 ${DB_USER}"
echo
echo "- Terraform-State wurde geprüft und (falls nötig) via terraform import korrigiert."
echo "- Es wurde KEIN terraform apply ausgeführt."
echo "- Prisma-Migrationen und Deploy wurden nur ausgeführt, wenn du explizit 'yes' bestätigt hast."
echo "- Smoke-Tests (Healthz, Login, Pages) wurden gefahren."
echo
echo "Bitte die obenstehenden Logs (insb. terraform plan, Prisma, Cloud Build, Smoke-Tests) prüfen."
echo "Wenn alles erwartungsgemäß aussieht, kann ein separates terraform apply nach formaler Freigabe erfolgen."
echo
echo "Hugs-Full-Automation-Run abgeschlossen."
