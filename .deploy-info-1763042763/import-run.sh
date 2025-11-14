#!/usr/bin/env bash
set -euo pipefail

DEPLOY_INFO=".deploy-info-1763042763"
INFRA_DIR="infra"

# Safety: required files
for f in "$DEPLOY_INFO/import-suggestion.txt" "$DEPLOY_INFO/terraform-state-backup.json" "$DEPLOY_INFO/tfplan-post-mv.txt" "$DEPLOY_INFO/state-google_sql_user.app.txt" "$DEPLOY_INFO/gcloud-sql-users.txt"; do
  if [ ! -f "$f" ]; then
    echo "FEHLER: Erwartete Datei fehlt: $f" >&2
    exit 2
  fi
done

cd "$INFRA_DIR"

echo "==== IMPORT RUN START ====" | tee "../$DEPLOY_INFO/import-run.log"
echo "Import suggestion (preview):" | tee -a "../$DEPLOY_INFO/import-run.log"
cat "../$DEPLOY_INFO/import-suggestion.txt" | tee -a "../$DEPLOY_INFO/import-run.log"
echo

if [ "${RUN_IMPORT:-}" != "true" ]; then
  echo "RUN_IMPORT != true — Abbruch. Falls gewünscht, erneut mit RUN_IMPORT=true ausführen." | tee -a "../$DEPLOY_INFO/import-run.log"
  exit 0
fi

# Execute import command (the line in import-suggestion.txt must be a single terraform import cmd)
IMPORT_CMD=$(tr -d '\r' < "../$DEPLOY_INFO/import-suggestion.txt")
echo "Executing: $IMPORT_CMD" | tee -a "../$DEPLOY_INFO/import-run.log"

/bin/sh -c "$IMPORT_CMD" 2>&1 | tee -a "../$DEPLOY_INFO/import-run.log"

echo "Verifying state for google_sql_user.app" | tee -a "../$DEPLOY_INFO/import-run.log"
terraform state show google_sql_user.app 2>&1 | tee "../$DEPLOY_INFO/state-google_sql_user.app.after-import.txt"

echo "Re-running terraform plan (post-import)" | tee -a "../$DEPLOY_INFO/import-run.log"
terraform plan -var-file=terraform.tfvars -out=tfplan-post-import.out 2>&1 | tee "../$DEPLOY_INFO/terraform-plan-post-import.txt"
terraform show -no-color tfplan-post-import.out | tee "../$DEPLOY_INFO/tfplan-post-import.txt"

# Check for remaining destroys
grep -n "will be destroyed" "../$DEPLOY_INFO/tfplan-post-import.txt" > "../$DEPLOY_INFO/tfplan-post-import-destroys.txt" || true

echo "==== IMPORT RUN END ====" | tee -a "../$DEPLOY_INFO/import-run.log"
