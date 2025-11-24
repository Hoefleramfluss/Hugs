#!/usr/bin/env bash
set -euo pipefail

########################################
# 0) Basis-Variablen
########################################
PROJECT_ID="hugs-headshop-20251108122937"
REGION="europe-west3"
FRONTEND_URL="https://hugs-frontend-prod-vqak3arhva-ey.a.run.app"
BACKEND_URL="https://hugs-backend-prod-vqak3arhva-ey.a.run.app"
BACKEND_ORIGIN="${BACKEND_URL}"

export PROJECT_ID REGION FRONTEND_URL BACKEND_URL

echo "[i] Projekt setzen: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

########################################
# 1) CSP-Stelle im Frontend finden
########################################
echo "[i] Suche nach Content-Security-Policy in frontend/…"

TARGET_FILE=""
if [[ -f frontend/next.config.mjs ]]; then
  TARGET_FILE="frontend/next.config.mjs"
elif [[ -f frontend/next.config.js ]]; then
  TARGET_FILE="frontend/next.config.js"
fi

if [[ -z "${TARGET_FILE}" ]]; then
  echo "[!] Konnte weder frontend/next.config.mjs noch frontend/next.config.js finden."
  echo "    Bitte CSP manuell anpassen (connect-src 'self' ${BACKEND_ORIGIN})."
  exit 1
fi

if ! grep -q "Content-Security-Policy" "${TARGET_FILE}"; then
  echo "[!] In ${TARGET_FILE} wird aktuell kein Content-Security-Policy-Header gesetzt."
  echo "    Falls CSP an anderer Stelle gesetzt wird (z.B. eigener Header-Middleware), bitte dort"
  echo "    connect-src um ${BACKEND_ORIGIN} ergänzen."
  exit 1
fi

echo "[i] Verwende CSP-Definition in: ${TARGET_FILE}"

########################################
# 2) Backend-Origin in connect-src eintragen
########################################
echo "[i] Patche connect-src, um API-Origin zu erlauben…"
if grep -q "${BACKEND_ORIGIN}" "${TARGET_FILE}"; then
  echo "[i] ${BACKEND_ORIGIN} ist bereits in CSP enthalten – kein Patch nötig."
else
  perl -0pi -e '$origin=$ENV{BACKEND_ORIGIN}; s/(connect-src[^;]*\x27self\x27)(?![^;]*$origin)([^;]*;)/$1 $origin$2/' "${TARGET_FILE}" || {
    echo "[!] Konnte connect-src nicht automatisch patchen. Bitte Datei manuell anpassen." >&2
    exit 1
  }
  echo "[i] CSP connect-src erfolgreich um ${BACKEND_ORIGIN} erweitert."
fi

########################################
# 3) Frontend-Build lokal prüfen
########################################
echo "[i] Baue Frontend lokal zur Sicherheit…"
pushd frontend >/dev/null

if [[ ! -d node_modules ]]; then
  echo "[i] npm ci im Frontend…"
  npm ci
fi

npm run build

popd >/dev/null

echo "[i] Frontend-Build lokal OK."

########################################
# 4) Frontend neu nach PROD deployen (Cloud Build)
########################################
echo "[i] Starte Cloud Build für reinen Frontend-Deploy…"

BACKEND_SA="hugs-cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com"
ARTIFACT_REPO="hugs-headshop-repo"
DB_CONNECTION_NAME="${PROJECT_ID}:europe-west3:hugs-pg-instance-prod"

COMMIT_SHA="frontend-csp-fix-$(date +%Y%m%d-%H%M%S)"

SUBSTITUTIONS="_GCP_REGION=${REGION},_ARTIFACT_REPO=${ARTIFACT_REPO},_ENV=prod,_DEPLOY_TARGET=frontend,_CLOUD_RUN_SA=${BACKEND_SA},_DB_CONNECTION_NAME=${DB_CONNECTION_NAME},_BACKEND_URL=${BACKEND_URL},_NEXT_PUBLIC_API_URL=${BACKEND_URL},COMMIT_SHA=${COMMIT_SHA}"

gcloud builds submit \
  --config=ci/cloudbuild.yaml \
  --project="${PROJECT_ID}" \
  --substitutions="${SUBSTITUTIONS}"

echo "[i] Cloud Build für Frontend-Deploy abgeschlossen."

########################################
# 5) Kurzer Sanity-Check nach Deploy
########################################
echo "[i] Warte ein paar Sekunden, damit der neue Revision live geht…"
sleep 20

echo "[i] Prüfe Frontend /healthz…"
if ! curl -sSf "${FRONTEND_URL}/healthz" >/dev/null; then
  echo "[!] /healthz liefert keinen 2xx-Status – bitte manuell prüfen." >&2
fi

########################################
# 6) Hinweise für manuellen Admin-Login
########################################
cat <<OUT

====================================================
Admin-Login in PROD – aktuelle Zugangsdaten
====================================================

Admin-UI:   ${FRONTEND_URL}/admin

E-Mail:     admin@hugs.garden
Passwort:   HugsAdmin!2025

Änderungen:
- Content-Security-Policy "connect-src" erlaubt jetzt:
    'self' ${BACKEND_ORIGIN}
- Frontend neu gebaut und via Cloud Build mit DEPLOY_TARGET=frontend
  nach PROD deployed.

Bitte im Browser:
1. Seite komplett neu laden (ggf. mit Hard-Reload).
2. Obige Zugangsdaten verwenden.
3. Die vorherigen "Network Error / CSP connect-src 'self'" Fehler
   sollten jetzt verschwunden sein.

OUT
