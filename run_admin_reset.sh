#!/usr/bin/env bash
set -euo pipefail

# 1) Umgebung setzen
PROJECT_ID="hugs-headshop-20251108122937"
REGION="europe-west3"
DB_INSTANCE="${PROJECT_ID}:europe-west3:hugs-pg-instance-prod"

BACKEND_URL="https://hugs-backend-prod-vqak3arhva-ey.a.run.app"
FRONTEND_URL="https://hugs-frontend-prod-vqak3arhva-ey.a.run.app"

export PROJECT_ID REGION DB_INSTANCE BACKEND_URL FRONTEND_URL

gcloud config set project "${PROJECT_ID}"

# 2) Auth sicherstellen
gcloud auth login
gcloud auth application-default login

ADC_FILE="${HOME}/.config/gcloud/application_default_credentials.json"
if [[ ! -f "${ADC_FILE}" ]]; then
  echo "Application Default Credentials fehlen (${ADC_FILE})." >&2
  exit 1
fi

# 3/4) Info-Auszüge (nur für Logging)
sed -n '21,35p' backend/prisma/schema.prisma
sed -n '1,120p' backend/src/routes/auth.ts
sed -n '1,120p' frontend/e2e/admin-login.spec.ts

# 5) Passwort-Hash erzeugen
ADMIN_PLAIN_PASSWORD="HugsAdmin!2025"
export ADMIN_PLAIN_PASSWORD
mkdir -p tools

cat > tools/hash-admin-password.mjs <<'JS'
import bcrypt from 'bcrypt';

const password = process.env.ADMIN_PLAIN_PASSWORD || 'HugsAdmin!2025';

(async () => {
  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
})();
JS

pushd backend >/dev/null
npm install --silent bcrypt --save-dev
popd >/dev/null

BCRYPT_HASH="$(node tools/hash-admin-password.mjs)"
echo "bcrypt-Hash: ${BCRYPT_HASH}"

# 6) SQL-Hotfix erzeugen
mkdir -p infra/sql
SQL_FILE="infra/sql/2025-11-17-reset-admin-user.sql"
cat > "${SQL_FILE}" <<SQL
DO \$\$
DECLARE
  v_id text;
BEGIN
  SELECT id INTO v_id FROM "User" WHERE email = 'admin@hugs.garden';

  IF v_id IS NULL THEN
    INSERT INTO "User" ("id","email","password","role","createdAt","updatedAt")
    VALUES (
      gen_random_uuid(),
      'admin@hugs.garden',
      '${BCRYPT_HASH}',
      'ADMIN',
      NOW(),
      NOW()
    );
  ELSE
    UPDATE "User"
       SET "password"  = '${BCRYPT_HASH}',
           "role"      = 'ADMIN',
           "updatedAt" = NOW()
     WHERE "id" = v_id;
  END IF;
END
\$\$;
SQL

# 7) Bucket ermitteln & SQL hochladen
if [[ "${DEPLOY_BUCKET:-}" != "" ]]; then
  echo "[i] Verwende vordefinierten DEPLOY_BUCKET: ${DEPLOY_BUCKET}"
else
  echo "[i] Suche bestehenden Bucket mit Präfix gs://${PROJECT_ID}* ..."
  FOUND_BUCKET="$(gsutil ls "gs://${PROJECT_ID}*" 2>/dev/null | head -n 1 | sed 's:/*$::')" || true
  if [[ -n "${FOUND_BUCKET}" ]]; then
    DEPLOY_BUCKET="${FOUND_BUCKET}"
    echo "[i] Verwende existierenden Bucket: ${DEPLOY_BUCKET}"
  else
    DEPLOY_BUCKET="gs://${PROJECT_ID}-sql-import"
    echo "[i] Kein Bucket gefunden, lege neuen an: ${DEPLOY_BUCKET}"
    if ! gsutil ls "${DEPLOY_BUCKET}" >/dev/null 2>&1; then
      gsutil mb -l europe-west3 "${DEPLOY_BUCKET}"
    else
      echo "[i] Bucket existiert bereits."
    fi
  fi
fi

DEPLOY_BUCKET="${DEPLOY_BUCKET%/}"
REMOTE_SQL_PATH="${DEPLOY_BUCKET}/sql/2025-11-17-reset-admin-user.sql"
echo "[i] Lade SQL nach ${REMOTE_SQL_PATH} hoch..."
gsutil cp "${SQL_FILE}" "${REMOTE_SQL_PATH}"

# 8) SQL in PROD importieren
echo "[i] Starte Cloud SQL Import..."
gcloud sql import sql "hugs-pg-instance-prod" \
  "${REMOTE_SQL_PATH}" \
  --project "${PROJECT_ID}" \
  --database=shopdb \
  --user=shopuser

echo "[i] Cloud SQL Import abgeschlossen."

# 9.1) Backend-Checks
TOKEN="$(gcloud auth print-identity-token)"

curl -sSf -H "Authorization: Bearer ${TOKEN}" \
  "${BACKEND_URL}/api/healthz" | jq .

curl -sSf -H "Authorization: Bearer ${TOKEN}" \
  "${BACKEND_URL}/api/products" | jq '.[0] // .'

# 9.2) Playwright gegen PROD
export PW_BASE_URL="${FRONTEND_URL}"
export NEXT_PUBLIC_BASE_URL="${FRONTEND_URL}"
export NEXT_PUBLIC_API_URL="${BACKEND_URL}"

if [[ -x ./tools/run-playwright-prod.sh ]]; then
  ./tools/run-playwright-prod.sh
else
  pushd frontend >/dev/null
  npm ci
  npx playwright test e2e/admin-login.spec.ts --project=chromium
  popd >/dev/null
fi

# 10) Ergebnis
cat <<OUT
Admin-UI: https://hugs-frontend-prod-vqak3arhva-ey.a.run.app/admin
Admin-E-Mail: admin@hugs.garden
Passwort: HugsAdmin!2025
Status: Login in PROD erfolgreich per Playwright getestet.
OUT
