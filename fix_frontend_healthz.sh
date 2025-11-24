#!/usr/bin/env bash
set -euo pipefail

########################################
# 0) Basis-Setup
########################################
PROJECT_ID="hugs-headshop-20251108122937"
REGION="europe-west3"
FRONTEND_SERVICE="hugs-frontend-prod"

FRONTEND_URL="https://hugs-frontend-prod-vqak3arhva-ey.a.run.app"
BACKEND_URL="https://hugs-backend-prod-vqak3arhva-ey.a.run.app"

export PROJECT_ID REGION FRONTEND_URL BACKEND_URL

echo "[i] Projekt setzen auf ${PROJECT_ID}…"
gcloud config set project "${PROJECT_ID}"

########################################
# 1) Frontend-/healthz-Seite (Pages- oder App-Router)
########################################
echo "[i] Stelle sicher, dass /healthz im Frontend existiert…"

if [[ -d frontend/app ]]; then
  echo "[i] Next.js App Router erkannt (frontend/app/*). Erzeuge app/healthz/page.tsx…"
  mkdir -p frontend/app/healthz

  cat > frontend/app/healthz/page.tsx <<'TSX'
/**
 * Sehr einfache Healthcheck-Seite:
 * GET /healthz -> 200 OK + statisches JSON
 */
export const dynamic = 'force-static';
export const revalidate = 0;

export default function HealthzPage() {
  return (
    <main style={{ padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
      <pre>
        {JSON.stringify(
          {
            status: 'ok',
            app: 'hugs-frontend',
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        )}
      </pre>
    </main>
  );
}
TSX

elif [[ -d frontend/pages ]]; then
  echo "[i] Next.js Pages Router erkannt (frontend/pages/*). Erzeuge pages/healthz.tsx…"

  cat > frontend/pages/healthz.tsx <<'TSX'
import type { NextPage } from 'next';

const Healthz: NextPage = () => {
  return (
    <main style={{ padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
      <pre>
        {JSON.stringify(
          {
            status: 'ok',
            app: 'hugs-frontend',
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        )}
      </pre>
    </main>
  );
};

export default Healthz;
TSX

else
  echo "[!] Konnte weder frontend/app noch frontend/pages finden – bitte Projektstruktur prüfen." >&2
  exit 1
fi

echo "[i] /healthz-Seite geschrieben."

########################################
# 2) CSP sicherstellen (Backend-Origin in connect-src)
########################################
BACKEND_ORIGIN="${BACKEND_URL}"

echo "[i] Prüfe CSP in frontend/next.config.* …"

TARGET_FILE=""
if [[ -f frontend/next.config.mjs ]]; then
  TARGET_FILE="frontend/next.config.mjs"
elif [[ -f frontend/next.config.js ]]; then
  TARGET_FILE="frontend/next.config.js"
fi

if [[ -z "${TARGET_FILE}" ]]; then
  echo "[!] Keine next.config.(mjs|js) im frontend gefunden – CSP wird von diesem Skript nicht geändert." >&2
else
  echo "[i] Verwende ${TARGET_FILE} für CSP-Check."
  if grep -q "Content-Security-Policy" "${TARGET_FILE}"; then
    if grep -q "${BACKEND_ORIGIN}" "${TARGET_FILE}"; then
      echo "[i] Backend-Origin bereits in CSP enthalten."
    else
      echo "[i] Ergänze Backend-Origin in connect-src…"
      python3 <<PY
from pathlib import Path

cfg_path = Path("${TARGET_FILE}")
text = cfg_path.read_text(encoding="utf-8")

needle = "connect-src"
if needle not in text:
    print("[!] Konnte 'connect-src' in CSP nicht finden – bitte Datei manuell prüfen.")
else:
    backend = "${BACKEND_ORIGIN}"
    if backend in text:
        print("[i] Backend-Origin bereits vorhanden.")
    else:
        import re
        def repl(match):
            return match.group(0).replace("connect-src", f"connect-src {backend}")
        new = re.sub(r"connect-src([^;]*);", repl, text, count=1)
        cfg_path.write_text(new, encoding="utf-8")
        print("[i] CSP erfolgreich gepatcht (connect-src).")
PY
    fi
  else
    echo "[!] In ${TARGET_FILE} wird keine CSP gesetzt – ggf. Middleware/Headers separat prüfen."
  fi
fi

########################################
# 3) Frontend-Image-Tag bestimmen (auf Basis aktuellen Images)
########################################
echo "[i] Lese aktuelles Image von ${FRONTEND_SERVICE}…"
CURRENT_IMAGE="$(gcloud run services describe "${FRONTEND_SERVICE}" \
  --region="${REGION}" \
  --format="value(spec.template.spec.containers[0].image)")"

if [[ -z "${CURRENT_IMAGE}" ]]; then
  echo "[!] Konnte aktuelles Image nicht auslesen." >&2
  exit 1
fi

IMAGE_REPO="${CURRENT_IMAGE%:*}"
NEW_TAG="healthz-csp-fix-$(date +%Y%m%d-%H%M%S)"
NEW_IMAGE="${IMAGE_REPO}:${NEW_TAG}"

echo "[i] Neues Image: ${NEW_IMAGE}"

########################################
# 4) Dockerfile & Build-Kontext bestimmen
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
  echo "[!] Kein Dockerfile gefunden (weder frontend/Dockerfile noch ./Dockerfile)." >&2
  exit 1
fi

echo "[i] Verwende Dockerfile ${DOCKERFILE_PATH} (Context: ${BUILD_CONTEXT})."

########################################
# 5) Cloud Build Konfiguration (Frontend-only) erzeugen
########################################
CB_FILE="ci/cloudbuild-frontend-healthz-csp.yaml"
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

echo "[i] Cloud Build Config unter ${CB_FILE} geschrieben."

########################################
# 6) Cloud Build ausführen (nur Frontend)
########################################
echo "[i] Starte Cloud Build für Frontend (Healthz + CSP)…"
gcloud builds submit \
  --config="${CB_FILE}" \
  --project="${PROJECT_ID}"

echo "[i] Cloud Build erfolgreich abgeschlossen. Warte kurz, bis neue Revision aktiv ist…"
sleep 25

########################################
# 7) /healthz prüfen und Admin-Daten ausgeben
########################################
echo "[i] Prüfe ${FRONTEND_URL}/healthz …"
set +e
HTTP_CODE=$(curl -s -o /tmp/healthz_body.txt -w "%{http_code}" "${FRONTEND_URL}/healthz")
set -e

echo "[i] HTTP-Status /healthz: ${HTTP_CODE}"
echo "[i] Auszug Body:"
head -n 5 /tmp/healthz_body.txt || true

cat <<OUT

====================================================
Frontend /healthz + Admin-Login
====================================================

Frontend-URL:  ${FRONTEND_URL}
Backend-URL:   ${BACKEND_URL}

/healthz Status-Code: ${HTTP_CODE}
(Erwartet: 200. Falls nicht 200, bitte Screenshot + Body-Inhalt mitbringen.)

Admin-UI Login in PROD:

  URL:      ${FRONTEND_URL}/admin
  E-Mail:   admin@hugs.garden
  Passwort: HugsAdmin!2025

Bitte im Browser:
1. Hard-Reload auf ${FRONTEND_URL}/admin (Cache leeren).
2. Mit obigen Daten einloggen.
3. In der DevTools-Konsole prüfen, dass keine CSP-connect-src-Fehler mehr kommen
   und der Request zu ${BACKEND_URL}/api/auth/login mit 200 beantwortet wird.

OUT
