#!/usr/bin/env bash
set -euo pipefail

########################################
# 0) Basis-Konfiguration
########################################
PROJECT_ID="hugs-headshop-20251108122937"
REGION="europe-west3"
FRONTEND_SERVICE="hugs-frontend-prod"

BACKEND_URL="https://hugs-backend-prod-vqak3arhva-ey.a.run.app"
FRONTEND_URL="https://hugs-frontend-prod-vqak3arhva-ey.a.run.app"

ARTIFACT_REPO="hugs-headshop-repo"
CLOUD_RUN_SA="hugs-cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com"
DB_CONNECTION_NAME="${PROJECT_ID}:europe-west3:hugs-pg-instance-prod"

# Optional: Custom-Domain-URL via Umgebung übergeben
CUSTOM_DOMAIN_URL="${CUSTOM_DOMAIN_URL:-""}"

export PROJECT_ID REGION BACKEND_URL FRONTEND_URL

echo "[i] Projekt setzen auf ${PROJECT_ID}…"
gcloud config set project "${PROJECT_ID}" >/dev/null

########################################
# 1) Auth sicherstellen
########################################
echo
echo "=== GCP Auth ==="
gcloud auth login
gcloud auth application-default login

########################################
# 2) Service-Details anzeigen
########################################
echo
echo "=== Cloud Run Service-Status (${FRONTEND_SERVICE}) ==="
SERVICE_URL="$(gcloud run services describe "${FRONTEND_SERVICE}" \
  --region="${REGION}" \
  --format='value(status.url)')"

if [[ -z "${SERVICE_URL}" ]]; then
  echo "[!] Konnte status.url des Services nicht lesen – bitte in der Console prüfen." >&2
  exit 1
fi

echo "[i] Service-URL laut Cloud Run: ${SERVICE_URL}"
echo
echo "[i] Aktive Revision(en) & Traffic:"
gcloud run services describe "${FRONTEND_SERVICE}" \
  --region="${REGION}" \
  --format='table(status.traffic.revisionName,status.traffic.percent,status.traffic.tag)' || true

########################################
# 3) /healthz minimal im Code absichern
########################################
echo
echo "=== Frontend /healthz-Page absichern ==="

mkdir -p frontend/pages

cat > frontend/pages/healthz.tsx <<'TSX'
import type { NextPage } from 'next';

const HealthzPage: NextPage = () => {
  // Simpler Text-Body reicht für Healthchecks vollkommen
  return (
    <main style={{ padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
      <pre>{JSON.stringify({ status: 'ok', component: 'frontend' }, null, 2)}</pre>
    </main>
  );
};

export default HealthzPage;
TSX

echo "[i] frontend/pages/healthz.tsx wurde (neu) geschrieben."

########################################
# 4) Lokalen Next-Build zur Sicherheit laufen lassen
########################################
echo
echo "=== Lokaler Next-Build (Sanity Check) ==="
pushd frontend >/dev/null

# Dependencies nur installieren, wenn node_modules fehlt
if [[ ! -d node_modules ]]; then
  echo "[i] npm ci (node_modules fehlt)…"
  npm ci
fi

echo "[i] npm run build (lokal)…"
npm run build

echo
echo "[i] Prüfe, ob /healthz in der Routenliste auftaucht:"
if grep -R "/healthz" -n .next 2>/dev/null | head -n 5; then
  echo "[i] /healthz scheint im Build vorhanden zu sein."
elif find .next -type f -name 'healthz.html' | head -n 1 >/dev/null; then
  echo "[i] healthz.html wurde im Build gefunden."
else
  echo "[!] Konnte /healthz nicht im Build finden – bitte .next-Routenliste ggf. manuell prüfen."
fi

popd >/dev/null

########################################
# 5) Reines Frontend-Deploy via Cloud Build
########################################
echo
echo "=== Cloud Build: Frontend-only Deploy mit /healthz-Fix ==="

CURRENT_IMAGE="$(gcloud run services describe "${FRONTEND_SERVICE}" \
  --region="${REGION}" \
  --format="value(spec.template.spec.containers[0].image)")"

if [[ -z "${CURRENT_IMAGE}" ]]; then
  echo "[!] Konnte aktuelles Frontend-Image nicht ermitteln." >&2
  exit 1
fi

IMAGE_REPO="${CURRENT_IMAGE%:*}"
NEW_TAG="healthz-fix-$(date +%Y%m%d-%H%M%S)"
NEW_IMAGE="${IMAGE_REPO}:${NEW_TAG}"

echo "[i] Neues Frontend-Image: ${NEW_IMAGE}"

CB_FILE="ci/cloudbuild-frontend-healthz.yaml"
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
    args: ['build', '-t', '${NEW_IMAGE}', '-f', 'frontend/Dockerfile', '.']

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

gcloud builds submit \
  --config="${CB_FILE}" \
  --project="${PROJECT_ID}"

echo
echo "[i] Cloud Build für Frontend-only wurde erfolgreich abgeschlossen."

########################################
# 6) HTTP-Checks für / und /healthz
########################################
check_url () {
  local label="$1"
  local url="$2"

  if [[ -z "${url}" ]]; then
    return 0
  fi

  echo
  echo "---- Check: ${label} ----"
  echo "[*] GET ${url}"
  code_root=$(curl -sS -o /tmp/healthz_root_body.txt -w '%{http_code}' "${url}" || echo "ERR")
  echo "  / -> HTTP ${code_root}"
  head -n 3 /tmp/healthz_root_body.txt || true

  echo
  echo "[*] GET ${url%/}/healthz"
  code_healthz=$(curl -sS -o /tmp/healthz_body.txt -w '%{http_code}' "${url%/}/healthz" || echo "ERR")
  echo "  /healthz -> HTTP ${code_healthz}"
  head -n 3 /tmp/healthz_body.txt || true

  if [[ "${code_healthz}" == "404" ]] && grep -qi "That’s all we know" /tmp/healthz_body.txt 2>/dev/null; then
    echo "  -> GFE-/Google-404: Request erreicht den Container vermutlich NICHT."
  elif [[ "${code_healthz}" == "404" ]]; then
    echo "  -> 404 ohne Google-Text: wahrscheinlich ein Next.js-/Anwendungs-404."
  elif [[ "${code_healthz}" == "200" ]]; then
    echo "  -> /healthz OK (HTTP 200)."
  fi

  echo
}

echo
echo "=== HTTP-Checks nach Deploy ==="
check_url "Cloud Run Service URL" "${SERVICE_URL}"
check_url "Dokumentations-URL (FRONTEND_URL)" "${FRONTEND_URL}"

if [[ -n "${CUSTOM_DOMAIN_URL}" ]]; then
  check_url "Custom-Domain" "${CUSTOM_DOMAIN_URL}"
fi

########################################
# 7) Kurz-Logauszug zur Kontrolle
########################################
echo
echo "=== Letzte Logs des Frontend-Service (nur Info) ==="
gcloud run services logs read "${FRONTEND_SERVICE}" \
  --region="${REGION}" \
  --limit=40 || true

########################################
# 8) Zusammenfassung & Admin-Zugangsdaten
########################################
echo
echo "===================================================="
echo "Zusammenfassung"
echo "===================================================="

echo "- Service-URL laut Cloud Run:  ${SERVICE_URL}"
echo "- Dokumentations-URL:          ${FRONTEND_URL}"
if [[ -n "${CUSTOM_DOMAIN_URL}" ]]; then
  echo "- Custom-Domain (falls gesetzt): ${CUSTOM_DOMAIN_URL}"
fi

cat <<'TXT'

Erwarteter Soll-Zustand:
  - GET <Service-URL>/healthz -> HTTP 200 mit kleinem JSON-Body
  - GET <Frontend-URL>/healthz -> HTTP 200 (ggf. nach kurzer Propagationszeit)

Wenn du nach dem Deploy weiterhin einen **Google-/GFE-404** auf /healthz siehst,
ist das Problem mit hoher Wahrscheinlichkeit VOR dem Container gelagert:
  - Domain-Mapping zeigt ggf. auf einen anderen Service
  - ein externer Proxy/LB (z. B. Cloudflare, HTTP(S)-Load-Balancer) fängt /healthz ab

In diesem Fall:
  - `gcloud run domain-mappings list --region=europe-west3`
  - Prüfen, ob der betroffene Host auf **hugs-frontend-prod** zeigt
  - Falls nicht: Mapping korrigieren oder neu anlegen.

Admin-Login in PROD:
  - Admin-UI: https://hugs-frontend-prod-vqak3arhva-ey.a.run.app/admin
  - E-Mail:   admin@hugs.garden
  - Passwort: HugsAdmin!2025

TXT
