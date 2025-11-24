#!/usr/bin/env bash
set -euo pipefail

########################################
# 0) Basis-Konfiguration
########################################
PROJECT_ID="hugs-headshop-20251108122937"
REGION="europe-west3"
FRONTEND_SERVICE="hugs-frontend-prod"
BACKEND_SERVICE="hugs-backend-prod"

FRONTEND_URL="https://hugs-frontend-prod-vqak3arhva-ey.a.run.app"
BACKEND_URL="https://hugs-backend-prod-vqak3arhva-ey.a.run.app"
BACKEND_ORIGIN="${BACKEND_URL}"

export PROJECT_ID REGION FRONTEND_URL BACKEND_URL

echo "[i] Projekt setzen auf ${PROJECT_ID}…"
gcloud config set project "${PROJECT_ID}"

########################################
# 1) (Optional) Logs der defekten Backend-Revision sichern
########################################
FAILED_REV="hugs-backend-prod-00015-rfd"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG_DIR=".deploy-info-${STAMP}"
mkdir -p "${LOG_DIR}"

echo "[i] Versuche Logs von Revision ${FAILED_REV} zu sichern (falls noch vorhanden)…"
if gcloud run revisions list \
      --service="${BACKEND_SERVICE}" \
      --region="${REGION}" \
      --format="value(metadata.name)" | grep -q "${FAILED_REV}"; then
  gcloud logging read \
    "resource.type=\"cloud_run_revision\" \
     resource.labels.service_name=\"${BACKEND_SERVICE}\" \
     resource.labels.revision_name=\"${FAILED_REV}\"" \
    --limit=200 \
    --project="${PROJECT_ID}" \
    --format=json > "${LOG_DIR}/backend-${FAILED_REV}-logs.json" || true
  echo "[i] Backend-Logs in ${LOG_DIR}/backend-${FAILED_REV}-logs.json gesichert."
else
  echo "[i] Revision ${FAILED_REV} existiert nicht mehr – überspringe Log-Export."
fi

########################################
# 2) CSP im Frontend sicher korrekt setzen
########################################
echo "[i] Prüfe CSP-Konfiguration im Frontend…"
TARGET_FILE=""
if [[ -f frontend/next.config.mjs ]]; then
  TARGET_FILE="frontend/next.config.mjs"
elif [[ -f frontend/next.config.js ]]; then
  TARGET_FILE="frontend/next.config.js"
fi

if [[ -z "${TARGET_FILE}" ]]; then
  echo "[!] Konnte weder frontend/next.config.mjs noch frontend/next.config.js finden."
  echo "    Bitte CSP manuell anpassen (connect-src 'self' ${BACKEND_ORIGIN}) und Skript erneut laufen lassen."
  exit 1
fi

if ! grep -q "Content-Security-Policy" "${TARGET_FILE}"; then
  echo "[!] In ${TARGET_FILE} wird aktuell kein Content-Security-Policy-Header gesetzt."
  echo "    Falls CSP an anderer Stelle kommt (Middleware, Header-Config), dort connect-src um ${BACKEND_ORIGIN} ergänzen."
else
  if grep -q "${BACKEND_ORIGIN}" "${TARGET_FILE}"; then
    echo "[i] ${BACKEND_ORIGIN} ist bereits in der CSP eingetragen."
  else
    echo "[i] Ergänze ${BACKEND_ORIGIN} in connect-src…"
    if ! python3 update_csp.py "${TARGET_FILE}" "${BACKEND_ORIGIN}"; then
      echo "[!] Konnte connect-src nicht automatisch patchen. Bitte ${TARGET_FILE} manuell anpassen." >&2
      exit 1
    fi
    echo "[i] CSP connect-src erfolgreich erweitert."
  fi
fi

########################################
# 3) Aktuelles Frontend-Image aus Cloud Run auslesen
########################################
echo "[i] Lese aktuelles Image des Frontend-Services aus…"
CURRENT_IMAGE="$(gcloud run services describe "${FRONTEND_SERVICE}" \
  --region="${REGION}" \
  --format="value(spec.template.spec.containers[0].image)")"

if [[ -z "${CURRENT_IMAGE}" ]]; then
  echo "[!] Konnte aktuelles Image von ${FRONTEND_SERVICE} nicht auslesen." >&2
  exit 1
fi

echo "[i] Aktuelles Image: ${CURRENT_IMAGE}"

IMAGE_REPO="${CURRENT_IMAGE%:*}"
NEW_TAG="csp-fix-$(date +%Y%m%d-%H%M%S)"
NEW_IMAGE="${IMAGE_REPO}:${NEW_TAG}"

echo "[i] Neues Image wird: ${NEW_IMAGE}"

########################################
# 4) Prüfen, wo das Dockerfile für das Frontend liegt
########################################
DOCKERFILE_PATH=""
BUILD_CONTEXT="."

if [[ -f frontend/Dockerfile ]]; then
  DOCKERFILE_PATH="frontend/Dockerfile"
  BUILD_CONTEXT="."
elif [[ -f Dockerfile ]]; then
  DOCKERFILE_PATH="Dockerfile"
  BUILD_CONTEXT="."
else
  echo "[!] Konnte kein Dockerfile finden (weder frontend/Dockerfile noch ./Dockerfile)." >&2
  echo "    Bitte Pfad zum Dockerfile im Skript deploy_frontend_csp_only.sh anpassen." >&2
  exit 1
fi

echo "[i] Verwende Dockerfile: ${DOCKERFILE_PATH} (Context: ${BUILD_CONTEXT})"

########################################
# 5) Cloud Build Config für Frontend-Only-Deploy erzeugen
########################################
CB_FILE="ci/cloudbuild-frontend-csp.yaml"
mkdir -p ci

cat > "${CB_FILE}" <<YAML
steps:
  - name: 'gcr.io/cloud-builders/npm'
    id: 'Install frontend deps'
    dir: 'frontend'
    args: ['ci']

  - name: 'gcr.io/cloud-builders/npm'
    id: 'Build frontend'
    dir: 'frontend'
    args: ['run', 'build']

  - name: 'gcr.io/cloud-builders/docker'
    id: 'Build frontend image'
    args: ['build', '-t', '${NEW_IMAGE}', '-f', '${DOCKERFILE_PATH}', '${BUILD_CONTEXT}']

  - name: 'gcr.io/cloud-builders/docker'
    id: 'Push frontend image'
    args: ['push', '${NEW_IMAGE}']

  - name: 'gcr.io/cloud-builders/gcloud'
    id: 'Deploy frontend service'
    args:
      - 'run'
      - 'deploy'
      - '${FRONTEND_SERVICE}'
      - '--image'
      - '${NEW_IMAGE}'
      - '--region'
      - '${REGION}'
      - '--platform'
      - 'managed'
      - '--quiet'

images:
  - '${NEW_IMAGE}'
YAML

echo "[i] Cloud Build Config für Frontend-Only unter ${CB_FILE} erstellt."

########################################
# 6) Cloud Build ausführen (nur Frontend)
########################################
echo "[i] Starte Cloud Build für Frontend-Only-Deploy…"

gcloud builds submit \
  --config="${CB_FILE}" \
  --project="${PROJECT_ID}"

echo "[i] Cloud Build erfolgreich abgeschlossen."

########################################
# 7) Healthcheck Frontend + Kurzer Hinweis
########################################
echo "[i] Warte einige Sekunden, bis die neue Revision aktiv ist…"
sleep 25

echo "[i] Prüfe Frontend /healthz…"
set +e
HEALTHZ_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/healthz")
set -e
echo "[i] /healthz Status: ${HEALTHZ_STATUS}"

cat <<OUT

====================================================
Frontend-CSP-Fix & Admin-Login
====================================================

Frontend-URL: ${FRONTEND_URL}
Backend-URL:  ${BACKEND_URL}

Die neue Frontend-Revision wurde mit Image
  ${NEW_IMAGE}
ausgerollt. Die Content-Security-Policy enthält jetzt
  connect-src 'self' ${BACKEND_ORIGIN}

Admin-Login in PROD:

  Admin-UI:   ${FRONTEND_URL}/admin
  E-Mail:     admin@hugs.garden
  Passwort:   HugsAdmin!2025

Bitte im Browser:
1. Seite im Admin-UI mit Hard-Reload neu laden.
2. Obige Zugangsdaten eingeben.
3. Die bisherigen "Network Error / CSP connect-src 'self'"-Fehler
   sollten nicht mehr auftreten.

Falls etwas schief wirkt:
- Logs der defekten Backend-Revision liegen (falls vorhanden) unter:
    ${LOG_DIR}/backend-${FAILED_REV}-logs.json

OUT
