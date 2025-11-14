#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID=${PROJECT_ID:-hugs-headshop-20251108122937}
GCP_REGION=${GCP_REGION:-europe-west3}
ARTIFACT_REPO=${ARTIFACT_REPO:-hugs-headshop-repo}
ENVIRONMENT=${ENVIRONMENT:-prod}
CLOUD_RUN_SA=${CLOUD_RUN_SA:-hugs-cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com}
DB_CONNECTION_NAME=${DB_CONNECTION_NAME:-${PROJECT_ID}:${GCP_REGION}:hugs-pg-instance-prod}
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://hugs-backend-prod-787273457651.europe-west3.run.app}

SUBSTITUTIONS="_GCP_REGION=${GCP_REGION},_ARTIFACT_REPO=${ARTIFACT_REPO},_ENV=${ENVIRONMENT},_CLOUD_RUN_SA=${CLOUD_RUN_SA},_DB_CONNECTION_NAME=${DB_CONNECTION_NAME},_NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"

echo "[+] Triggering Cloud Build for project ${PROJECT_ID}"
gcloud builds submit \
  --config=ci/cloudbuild.yaml \
  --project="${PROJECT_ID}" \
  --substitutions="${SUBSTITUTIONS}" \
  --timeout=30m
