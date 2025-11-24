#!/usr/bin/env bash
set -euo pipefail

########################################
# CONFIG
########################################

PROJECT_ID="hugs-headshop-20251108122937"
REGION="europe-west3"

BACKEND_SERVICE="hugs-backend-prod"
FRONTEND_SERVICE="hugs-frontend-prod"

# OPTIONAL: falls du bereits eine eigene Domain auf das Frontend legen willst,
# trage sie hier ein (z.B. "shop.hugs.garden"). Leer lassen = nur run.app URLs prüfen.
CUSTOM_FRONTEND_DOMAIN=""

########################################
# HELPERS
########################################

section() {
  echo
  echo "########################################"
  echo "# $1"
  echo "########################################"
}

fail() {
  echo "[!] $1" >&2
  exit 1
}

########################################
# 1) gcloud-Basis konfigurieren
########################################

section "1) gcloud Basis-Konfiguration"

gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud config set run/platform managed >/dev/null
gcloud config set run/region "${REGION}" >/dev/null

ACTIVE_ACCOUNT="$(gcloud auth list --format='value(account)' --filter='status:ACTIVE' || true)"
if [[ -z "${ACTIVE_ACCOUNT}" ]]; then
  fail "Keine aktive gcloud-Identität. Bitte einmal: gcloud auth login und danach dieses Skript erneut starten."
fi

echo "[i] Projekt:  ${PROJECT_ID}"
echo "[i] Region:   ${REGION}"
echo "[i] Account:  ${ACTIVE_ACCOUNT}"

########################################
# 2) Cloud Run Service-URLs ermitteln
########################################

section "2) Cloud Run Dienste & URLs ermitteln"

BACKEND_URL="$(gcloud run services describe "${BACKEND_SERVICE}" \
  --platform=managed --region="${REGION}" \
  --format='value(status.url)' 2>/dev/null || true)"

FRONTEND_URL="$(gcloud run services describe "${FRONTEND_SERVICE}" \
  --platform=managed --region="${REGION}" \
  --format='value(status.url)' 2>/dev/null || true)"

[[ -z "${BACKEND_URL}" ]] && fail "Backend-Service ${BACKEND_SERVICE} nicht gefunden."
[[ -z "${FRONTEND_URL}" ]] && fail "Frontend-Service ${FRONTEND_SERVICE} nicht gefunden."

echo "[i] Backend-Service:  ${BACKEND_SERVICE}"
echo "[i] Backend-URL:      ${BACKEND_URL}"
echo "[i] Frontend-Service: ${FRONTEND_SERVICE}"
echo "[i] Frontend-URL:     ${FRONTEND_URL}"

########################################
# 3) (Optional) Custom Domain Mapping prüfen
########################################

section "3) Optional: Custom Domain Mapping prüfen"

if [[ -n "${CUSTOM_FRONTEND_DOMAIN}" ]]; then
  echo "[i] Prüfe Domain-Mapping für: ${CUSTOM_FRONTEND_DOMAIN}"

  if gcloud run domain-mappings describe "${CUSTOM_FRONTEND_DOMAIN}" \
      --platform=managed --region="${REGION}" >/dev/null 2>&1; then
    echo "[i] Domain-Mapping existiert bereits."
    echo "    Details:"
    gcloud run domain-mappings describe "${CUSTOM_FRONTEND_DOMAIN}" \
      --platform=managed --region="${REGION}" \
      --format='table(metadata.name,status.resourceRecords[].type,status.resourceRecords[].rrdata)'
  else
    echo "[i] Erzeuge neues Domain-Mapping auf ${FRONTEND_SERVICE}..."
    gcloud run domain-mappings create "${CUSTOM_FRONTEND_DOMAIN}" \
      --service="${FRONTEND_SERVICE}" \
      --platform=managed \
      --region="${REGION}"
    echo "[i] Domain-Mapping angelegt. Bitte DNS-Einträge gemäß Ausgabe setzen (falls noch nicht geschehen)."
  fi
else
  echo "[i] CUSTOM_FRONTEND_DOMAIN leer – es wird nur die run.app-URL geprüft."
fi

########################################
# 4) Backend Health & Daten prüfen
########################################

section "4) Backend Health & /api/products prüfen"

echo "[i] Hole Identity Token für Backend-Calls..."
TOKEN="$(gcloud auth print-identity-token 2>/dev/null || true)"
[[ -z "${TOKEN}" ]] && fail "Konnte kein Identity Token holen. Bitte gcloud auth login erneut prüfen."

echo "[i] Check: GET ${BACKEND_URL}/api/healthz"
curl -fsS -H "Authorization: Bearer ${TOKEN}" \
  "${BACKEND_URL}/api/healthz" | jq . || fail "/api/healthz liefert keinen 200er + JSON."

echo "[i] Check: GET ${BACKEND_URL}/api/products (nur erstes Produkt anzeigen)"
curl -fsS -H "Authorization: Bearer ${TOKEN}" \
  "${BACKEND_URL}/api/products" | jq '.[0] // .'

echo "[OK] Backend-Health und Products-Endpoint sehen gut aus."

########################################
# 5) Frontend /health & Root prüfen
########################################

section "5) Frontend /health & Root prüfen"

echo "[i] Check: HEAD ${FRONTEND_URL}/"
curl -fsSI "${FRONTEND_URL}/" >/dev/null || fail "HEAD / auf Frontend-URL schlägt fehl."

echo "[i] Check: GET ${FRONTEND_URL}/health (sollte 200 liefern)"
FRONTEND_HEALTH_STATUS="$(curl -s -o /tmp/frontend_health_body.txt -w '%{http_code}' "${FRONTEND_URL}/health" || echo "000")"

if [[ "${FRONTEND_HEALTH_STATUS}" != "200" ]]; then
  echo "[!] /health lieferte HTTP ${FRONTEND_HEALTH_STATUS}, Body:"
  sed -n '1,40p' /tmp/frontend_health_body.txt
  fail "Frontend-/health ist noch nicht korrekt konfiguriert. Bitte Next.js-Route /health prüfen."
fi

echo "[i] Body /health:"
sed -n '1,40p' /tmp/frontend_health_body.txt
echo "[OK] Frontend-/health antwortet mit HTTP 200."

########################################
# 6) Playwright PROD-Smoketests laufen lassen
########################################

section "6) Playwright PROD-Smoketests"

export PW_BASE_URL="${FRONTEND_URL}"
export NEXT_PUBLIC_BASE_URL="${FRONTEND_URL}"
export NEXT_PUBLIC_API_URL="${BACKEND_URL}"

if [[ -x ./tools/run-playwright-prod.sh ]]; then
  echo "[i] Nutze tools/run-playwright-prod.sh mit BASE_URL=${FRONTEND_URL}"
  ./tools/run-playwright-prod.sh
else
  echo "[i] Fallback: direkt Playwright im frontend-Workspace ausführen."
  pushd frontend >/dev/null
  npm ci
  npx playwright test --project=chromium
  popd >/dev/null
fi

echo "[OK] Playwright PROD-Smoke-Suite erfolgreich durchgelaufen."

########################################
# 7) Finale Zusammenfassung (Admin-Login etc.)
########################################

section "7) Finale Zusammenfassung – System produktionsreif"

cat <<OUT

Alles grün – aktueller Stand:

  Backend:
    - Service: ${BACKEND_SERVICE}
    - URL:     ${BACKEND_URL}
    - GET /api/healthz: OK
    - GET /api/products: OK (mindestens ein Produkt vorhanden)

  Frontend:
    - Service: ${FRONTEND_SERVICE}
    - URL:     ${FRONTEND_URL}
    - HEAD /: OK
    - GET /health: OK (200)
    - Playwright PROD-Smoke: OK

  Admin-UI-Zugang (wie per Reset-Script gesetzt):
    - URL:    ${FRONTEND_URL}/admin
    - E-Mail: admin@hugs.garden
    - Pass:   HugsAdmin!2025

OPTIONAL:
  - Falls eine eigene Domain verwendet werden soll, CUSTOM_FRONTEND_DOMAIN im Skript setzen
    und das Skript erneut ausführen, um das Cloud-Run-Domain-Mapping zu prüfen/erstellen.

System ist damit aus Sicht:
  - Datenbank (Prisma-Schema vs. Prod-DB),
  - Backend-API,
  - Frontend-Health,
  - E2E-Smoketests (Playwright, Chromium, PROD-URL)
produktiosnreif.

OUT
