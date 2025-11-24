#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Basis-Konfiguration
# ============================================
PROJECT_ID="hugs-headshop-20251108122937"
GCP_REGION="europe-west3"  # Cloud Run-Region der Services
BACKEND_URL="https://hugs-backend-prod-vqak3arhva-ey.a.run.app"

ADMIN_EMAIL="admin@hugs.garden"
ADMIN_PASSWORD="HugsAdmin!2025"

echo "== 0) Quick-Check: gcloud-Basis =="
command -v gcloud >/dev/null 2>&1 || {
  echo "ERROR: gcloud nicht im PATH. Bitte Google Cloud SDK installieren."
  exit 1
}
gcloud --version || {
  echo "ERROR: gcloud --version fehlgeschlagen"
  exit 1
}

# ============================================
# 1) Auth & Config verifizieren
# ============================================
echo
echo "== 1) gcloud Auth & Config =="

echo
echo "-- 1.1) Credentialed Accounts --"
gcloud auth list

echo
echo "-- 1.2) Aktive Konfiguration vor Anpassung --"
gcloud config list

echo
echo "-- 1.3) Projekt & Run-Region setzen (hart für diesen Run) --"
gcloud config set project "${PROJECT_ID}"
gcloud config set run/region "${GCP_REGION}"

echo
echo "Aktuelle Konfiguration nach Anpassung:"
gcloud config list

echo
echo "run/region (sollte ${GCP_REGION} sein):"
gcloud config get-value run/region || true

# ============================================
# 2) Cloud Build mit _RUN_DB_MIGRATIONS=true
#    Nur Backend-Deploy
# ============================================
echo
echo "== 2) Starte Cloud Build mit Prisma-Migrationen =="

COMMIT_SHA="run-prisma-migrations-$(date +%Y%m%d-%H%M%S)"

BUILD_ID="$(
  gcloud builds submit \
    --config=ci/cloudbuild.yaml \
    --project="${PROJECT_ID}" \
    --substitutions="_GCP_REGION=${GCP_REGION},_ARTIFACT_REPO=hugs-headshop-repo,_ENV=prod,_CLOUD_RUN_SA=hugs-cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com,_DB_CONNECTION_NAME=${PROJECT_ID}:${GCP_REGION}:hugs-pg-instance-prod,_NEXT_PUBLIC_API_URL=${BACKEND_URL},_BACKEND_URL=,_DEPLOY_TARGET=backend,_RUN_DB_MIGRATIONS=true,COMMIT_SHA=${COMMIT_SHA}" \
    --format="value(id)"
)"

if [[ -z "${BUILD_ID}" ]]; then
  echo "ERROR: BUILD_ID leer – bitte Output von gcloud builds submit prüfen."
  exit 1
fi

echo "Gestarteter Build: ${BUILD_ID}"

echo
echo "== 2.1) Build-Logs tailen bis Abschluss =="
gcloud builds log tail "${BUILD_ID}" --project="${PROJECT_ID}"

echo
echo "== 2.2) Build-Status zusammengefasst =="
gcloud builds describe "${BUILD_ID}" \
  --project="${PROJECT_ID}" \
  --format="yaml(status,substitutions,steps.name,steps.status)"

echo
echo "Wichtig im Step 'Run Prisma migrations':"
echo "  - Ausgabe 'Run Prisma migrations: _RUN_DB_MIGRATIONS=true'"
echo "  - Aufruf von: npx prisma migrate deploy --schema=prisma/schema.prisma"
echo "  - Keine Prisma-P20xx-Fehler."

# ============================================
# 3) Aktive Backend-Revision ermitteln
# ============================================
echo
echo "== 3) Aktive Backend-Revision bestimmen =="

ACTIVE_REVISION="$(gcloud run revisions list \
  --service=hugs-backend-prod \
  --region="${GCP_REGION}" \
  --sort-by=~createTime \
  --limit=1 \
  --format="value(metadata.name)")"

if [[ -z "${ACTIVE_REVISION}" ]]; then
  echo "ERROR: Konnte aktive Revision von hugs-backend-prod nicht ermitteln."
  exit 1
fi

echo "Aktive Backend-Revision: ${ACTIVE_REVISION}"

# ============================================
# 4) Smoke-Checks: /api/healthz & Login
# ============================================
echo
echo "== 4) Smoke-Checks Backend =="

echo
echo "-- 4.1) /api/healthz --"
curl -sS -D - \
  -w '\nHTTP_STATUS:%{http_code}\n' \
  "${BACKEND_URL}/api/healthz"

echo
echo "-- 4.2) /api/auth/login --"
LOGIN_RESPONSE="$(
  curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
    -H 'Content-Type: application/json' \
    -X POST \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
    "${BACKEND_URL}/api/auth/login"
)"
printf '%s\n' "${LOGIN_RESPONSE}"

# ============================================
# 5) JWT aus Login-Response extrahieren
# ============================================
echo
echo "== 5) JWT aus Login-Response extrahieren =="

TOKEN="$(printf '%s\n' "${LOGIN_RESPONSE}" | sed -n 's/.*\"token\":\"\([^\"]*\)\".*/\1/p')"

if [[ -z "${TOKEN}" ]]; then
  echo "ERROR: Konnte Token aus LOGIN_RESPONSE nicht extrahieren."
  exit 1
fi

echo "JWT extrahiert (gekürzt): ${TOKEN:0:32}..."

# ============================================
# 6) /api/pages testen – Erwartung: 200, kein P2022
# ============================================
echo
echo "== 6) GET /api/pages mit Bearer-Token =="

curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
  -H "Authorization: Bearer ${TOKEN}" \
  "${BACKEND_URL}/api/pages"

echo
echo "Wenn hier HTTP_STATUS:200 kommt und ein JSON-Array zurückkommt,"
echo "sollte die Page-Query inkl. 'status'-Spalte sauber laufen."

# ============================================
# 7) Cloud-Run-Logs für /api/pages prüfen
# ============================================
echo
echo "== 7) Cloud-Run-Logs der aktiven Revision (${ACTIVE_REVISION}) =="

gcloud beta run revisions logs read "${ACTIVE_REVISION}" \
  --region="${GCP_REGION}" \
  --limit=100

echo
echo "Bitte in den Logs prüfen:"
echo "  - Eintrag 'GET /api/pages' mit statusCode 200"
echo "  - Keine 'PrismaClientKnownRequestError P2022 (Page.status)' mehr."

# ============================================
# 8) Nächster manueller Schritt: Browser-Check
# ============================================
echo
echo "== 8) Manuelle Validierung im Browser =="
echo "  - Frontend Admin UI öffnen:"
echo "      https://hugs-frontend-prod-787273457651.europe-west3.run.app/admin"
echo "  - Login mit:"
echo "      ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}"
echo "  - Admin > Page Builder / Seiten öffnen und prüfen,"
echo "    dass keine 'Could not load pages'-Fehler mehr auftreten."
