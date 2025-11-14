#!/usr/bin/env bash
set -euo pipefail
DEPLOY_INFO=".deploy-info-1763042763"
INFRA_DIR="infra"

# Guard: approval file must exist
if [ ! -f "$DEPLOY_INFO/approval.txt" ]; then
  echo "ERROR: Approval missing. Create $DEPLOY_INFO/approval.txt with the approval string from infra-team." >&2
  exit 2
fi

# Pre-apply backups
cd "$INFRA_DIR"
terraform state pull > "../$DEPLOY_INFO/terraform-state-before-apply.json"
echo "Cloud SQL: creating backup before apply..."
gcloud sql backups create --instance=hugs-pg-instance-prod --project=hugs-headshop-20251108122937 2>&1 | tee "../$DEPLOY_INFO/cloudsql-backup-before-apply.txt"

# Apply only if RUN_APPLY=true
if [ "${RUN_APPLY:-}" != "true" ]; then
  echo "RUN_APPLY not set. To execute apply run: RUN_APPLY=true ./$DEPLOY_INFO/apply-and-deploy.sh" >&2
  exit 0
fi

# Execute apply (non-interactive)
terraform apply "tfplan-post-maint.out" 2>&1 | tee "../$DEPLOY_INFO/terraform-apply.txt"

# After apply: record Cloud Run service status
gcloud run services describe hugs-backend-prod --region=europe-west3 --project=hugs-headshop-20251108122937 --format='yaml(status,traffic)' > "../$DEPLOY_INFO/cloudrun-backend-after-apply.yaml" 2>&1
gcloud run services describe hugs-frontend-prod --region=europe-west3 --project=hugs-headshop-20251108122937 --format='yaml(status,traffic)' > "../$DEPLOY_INFO/cloudrun-frontend-after-apply.yaml" 2>&1

echo "Apply finished. See $DEPLOY_INFO/terraform-apply.txt and Cloud Run describe files."
