#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="hugs-headshop-20251108122937"
BUILD_ID="1f0c2f7e-4da2-4ea6-8347-caf11974d231"

echo "== 1) Build-Metadaten & Steps =="
gcloud builds describe "${BUILD_ID}" \
  --project="${PROJECT_ID}" \
  --format="yaml(
    status,
    logUrl,
    steps.name,
    steps.status,
    steps.args
  )"

echo
echo "== 2) Vollständige Build-Logs (inkl. Step 'Run Prisma migrations') =="
gcloud builds log tail "${BUILD_ID}" \
  --project="${PROJECT_ID}"
