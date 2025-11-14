#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PROJECT_ID="${PROJECT_ID:-hugs-headshop-20251108122937}"
GCP_REGION="${GCP_REGION:-europe-west3}"
ARTIFACT_REPO="${ARTIFACT_REPO:-hugs-headshop-repo}"
ENVIRONMENT="${ENVIRONMENT:-prod}"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://hugs-backend-prod-787273457651.europe-west3.run.app}"
DEPLOY_TARGET="${DEPLOY_TARGET:-frontend}"
DB_CONNECTION_NAME="${DB_CONNECTION_NAME:-hugs-headshop-20251108122937:europe-west3:hugs-pg-instance-prod}"
CLOUD_RUN_SA="${CLOUD_RUN_SA:-hugs-cloud-run-sa@hugs-headshop-20251108122937.iam.gserviceaccount.com}"

printf '[deploy_frontend_prod] Submitting build for project %s (target=%s)\n' "${PROJECT_ID}" "${DEPLOY_TARGET}"

cd "${REPO_ROOT}"

gcloud builds submit \
  --config "ci/cloudbuild.yaml" \
  --project "${PROJECT_ID}" \
  --substitutions "_GCP_REGION=${GCP_REGION},_ARTIFACT_REPO=${ARTIFACT_REPO},_ENV=${ENVIRONMENT},_DB_CONNECTION_NAME=${DB_CONNECTION_NAME},_CLOUD_RUN_SA=${CLOUD_RUN_SA},_NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL},_DEPLOY_TARGET=${DEPLOY_TARGET}" \
  --gcs-source-staging-dir "gs://${PROJECT_ID}_cloudbuild/source"
