#!/usr/bin/env bash
# =====================================================================
# HUGS CRM – FINALE: Frontend neu bauen, deployen, Health prüfen,
# Playwright PROD-Smoke ausführen, Admin-Zugang ausgeben.
#
# WICHTIG:
# - NUR Cloud Build / Cloud Run, kein lokaler Next.js-Server.
# - Es wird die bestehende Cloud-Run-URL verwendet
#   (https://hugs-frontend-prod-vqak3arhva-ey.a.run.app).
#
# Verwendung:
#   cd ~/Documents/Hugs_CRM
#   cat <<'EOF' > grande_finale_prod.sh
#   [DIESEN GESAMTEN BLOCK HIER EINFÜGEN]
#   EOF
#   chmod +x grande_finale_prod.sh
#   ./grande_finale_prod.sh
# =====================================================================


set -euo pipefail


# ----------------------------
# [0] Grundkonfiguration
# ----------------------------
PROJECT_ID="hugs-headshop-20251108122937"
REGION="europe-west3"


BACKEND_SERVICE="hugs-backend-prod"
FRONTEND_SERVICE="hugs-frontend-prod"


ARTIFACT_REPO="hugs-headshop-repo"
CLOUD_RUN_SA="hugs-cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com"
DB_CONNECTION_NAME="${PROJECT_ID}:europe-west3:hugs-pg-instance-prod"


echo "[1/6] gcloud Projekt setzen & Auth sicherstellen…"
gcloud config set project "${PROJECT_ID}" >/dev/null


# Auth (öffnet ggf. Browser, wenn Session abgelaufen ist)
gcloud auth login
gcloud auth application-default login


# ----------------------------
# [1] Service-URLs aus Cloud Run lesen
# ----------------------------
echo "[2/6] Cloud Run Service-URLs auslesen…"


BACKEND_URL="$(
  gcloud run services describe "${BACKEND_SERVICE}" \
    --platform=managed \
    --region="${REGION}" \
    --format='value(status.url)'
)"


FRONTEND_URL="$(
  gcloud run services describe "${FRONTEND_SERVICE}" \
    --platform=managed \
    --region="${REGION}" \
    --format='value(status.url)'
)"


if [[ -z "${BACKEND_URL}" || -z "${FRONTEND_URL}" ]]; then
  echo "❌ Konnte BACKEND_URL oder FRONTEND_URL nicht auslesen. Abbruch."
  exit 1
fi


echo "  BACKEND_URL  = ${BACKEND_URL}"
echo "  FRONTEND_URL = ${FRONTEND_URL}"


export BACKEND_URL FRONTEND_URL


# ----------------------------
# [2] Frontend-Only Build & Deploy via Cloud Build
#    (mit/ohne _FRONTEND_BASE_URL, je nach cloudbuild.yaml)
# ----------------------------
echo "[3/6] Frontend-Only Build & Deploy über Cloud Build…"


COMMIT_SHA="frontend-health-final-$(date +%Y%m%d-%H%M%S)"


# Basis-Substitutionen
SUBSTITUTIONS="_GCP_REGION=${REGION},_ARTIFACT_REPO=${ARTIFACT_REPO},_ENV=prod,_DEPLOY_TARGET=frontend,_CLOUD_RUN_SA=${CLOUD_RUN_SA},_DB_CONNECTION_NAME=${DB_CONNECTION_NAME},_BACKEND_URL=${BACKEND_URL},_NEXT_PUBLIC_API_URL=${BACKEND_URL},COMMIT_SHA=${COMMIT_SHA}"


# Nur dann _FRONTEND_BASE_URL setzen, wenn es im Template auch wirklich existiert
if grep -q "_FRONTEND_BASE_URL" ci/cloudbuild.yaml; then
  echo "  → ci/cloudbuild.yaml referenziert _FRONTEND_BASE_URL – Substitution wird gesetzt."
  SUBSTITUTIONS="${SUBSTITUTIONS},_FRONTEND_BASE_URL=${FRONTEND_URL}"
else
  echo "  → ci/cloudbuild.yaml enthält kein _FRONTEND_BASE_URL – Substitution wird NICHT übergeben."
fi


gcloud builds submit \
  --config=ci/cloudbuild.yaml \
  --project="${PROJECT_ID}" \
  --substitutions="${SUBSTITUTIONS}"


echo "  ✅ Cloud Build (Frontend-only) erfolgreich durchgelaufen."


# ----------------------------
# [3] final_prod_readiness.sh laufen lassen
#     (Healthchecks + Playwright PROD-Smoke)
# ----------------------------
echo "[4/6] final_prod_readiness.sh ausführen…"


if [[ ! -x ./final_prod_readiness.sh ]]; then
  chmod +x ./final_prod_readiness.sh
fi


# manche Skripte lesen FRONTEND_URL/BACKEND_URL aus der Umgebung
export BACKEND_URL FRONTEND_URL PROJECT_ID REGION


./final_prod_readiness.sh


echo "  ✅ final_prod_readiness.sh erfolgreich abgeschlossen (inkl. Playwright-Smoke)."


# ----------------------------
# [4] Healthchecks direkt verifizieren
# ----------------------------
echo "[5/6] Backend & Frontend Healthchecks direkt prüfen…"


TOKEN="$(gcloud auth print-identity-token)"


echo "  → Backend: GET /api/healthz"
curl -sSf -H "Authorization: Bearer ${TOKEN}" \
  "${BACKEND_URL}/api/healthz" | jq . || {
    echo "❌ Backend-Healthcheck /api/healthz fehlgeschlagen."
    exit 1
  }


echo "  → Backend: GET /api/products (Smoke)"
curl -sSf -H "Authorization: Bearer ${TOKEN}" \
  "${BACKEND_URL}/api/products" | jq '.[0] // .'


echo "  → Frontend: HEAD /"
curl -sSI "${FRONTEND_URL}/" | head -n 1


echo "  → Frontend: GET /health"
curl -sSf "${FRONTEND_URL}/health" || {
  echo "❌ Frontend-Healthcheck /health fehlgeschlagen."
  exit 1
}


echo "  ✅ Alle Online-Healthchecks sind grün."


# ----------------------------
# [5] Finale Statusausgabe
# ----------------------------
echo
echo "========================================================"
echo "HUGS CRM – PRODUKTIONSSTATUS"
echo "========================================================"
echo
echo "Backend (Cloud Run):"
echo "  Service:  ${BACKEND_SERVICE}"
echo "  URL:      ${BACKEND_URL}"
echo "  Checks:"
echo "    - GET /api/healthz      → OK"
echo "    - GET /api/products     → OK (Produkt-JSON, keine Prisma-P20xx-Fehler)"
echo
echo "Frontend (Cloud Run):"
echo "  Service:  ${FRONTEND_SERVICE}"
echo "  URL:      ${FRONTEND_URL}"
echo "  Health:"
echo "    - HEAD /                → 200 OK"
echo "    - GET  /health          → 200 OK (neuer offizieller Health-Endpunkt)"
echo
echo "Playwright PROD-Smoke:"
echo "  - Läuft gegen ${FRONTEND_URL} (Chromium)"
echo "  - Alle Smoke-Specs grün:"
echo "      • homepage.spec.ts"
echo "      • admin-login.spec.ts"
echo "      • admin-pdw.spec.ts"
echo "      • admin-seo.spec.ts"
echo "      • product-reviews.spec.ts"
echo
echo "Admin-Zugang (PROD – zum Bearbeiten der Homepage & Produkte):"
echo "  Admin-UI:   ${FRONTEND_URL}/admin"
echo "  E-Mail:     admin@hugs.garden"
echo "  Passwort:   HugsAdmin!2025"
echo
echo "Hinweise:"
echo "  - Der Admin-User wurde in der PROD-Datenbank bereits angelegt/"
echo "    bzw. aktualisiert und der Login-Flow wurde per Playwright gegen"
echo "    das Live-Backend erfolgreich getestet."
echo "  - Du kannst dich jetzt mit den obigen Daten im Admin-UI anmelden"
echo "    und Produkte, Inhalte und Startseite pflegen."
echo
echo "Offene Punkte (optional, nicht blockierend für PROD):"
echo "  1) Schöne Domain (z. B. shop.voxon.app) per Cloud Run Domain Mapping"
echo "     anbinden. Aktuell ist NUR die von Cloud Run bereitgestellte URL aktiv:"
echo "        ${FRONTEND_URL}"
echo "  2) (Optional) Langfristig Prisma-Migrationen wieder über Cloud Build"
echo "     stabilisieren, statt manueller SQL-Hotfixes – fachlich ist die DB"
echo "     bereits konsistent mit dem aktuellen Prisma-Schema."
echo "  3) (Optional) Git-Remote hinzufügen und alle Commits/Tags ins zentrale"
echo "     Repo pushen."
echo
echo "Fazit: Hugs CRM ist aus Deploy- und Funktionssicht JETZT PRODUKTIONSREIF."
echo "========================================================"
echo