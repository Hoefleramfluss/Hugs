# Terraform Infrastructure Guide

This directory provisions the Google Cloud infrastructure required for the Head & Growshop stack. The configuration is intentionally conservative—stateful resources use private networking, deletion protection, and Secret Manager lookups so production credentials are never rotated automatically.

## Prerequisites

1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) + authenticated account with `roles/editor`, `roles/iam.serviceAccountAdmin`, and `roles/compute.networkAdmin`.
2. Terraform >= 1.5 (`brew install terraform` or download from Hashicorp).
3. A GCS bucket for remote state, e.g.
   ```bash
   export TF_STATE_BUCKET=hugs-headshop-terraform-state
   gcloud storage buckets create "gs://${TF_STATE_BUCKET}" --project=hugs-headshop-20251108122937 --location=europe-west3 --uniform-bucket-level-access
   gcloud storage buckets update "gs://${TF_STATE_BUCKET}" --versioning
   ```
   Update `infra/backend.tf` with your bucket/prefix before running `terraform init`.

## Configure variables

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars and keep secrets out of version control
```

### Important variable notes
- `cloud_run_service_account_id` should match the service account already used in production. Terraform creates it if missing but will **never** rotate existing keys.
- `db_instance_name`, `db_name`, and other SQL settings must reflect the production instance so that imports line up with reality.

## Bootstrapping existing resources

Many resources (VPC, SQL, Artifact Registry, secrets) already exist. Import them once so Terraform adopts rather than recreates them:

```bash
cd infra
./import_commands.sh            # prints terraform import commands
EXECUTE_IMPORTS=true ./import_commands.sh   # optional helper to run them automatically
```

Only run the import script **after** `terraform init` has completed successfully. Review the commands before executing, especially those that reference production project IDs.

## Safe plan/apply workflow

```bash
cd infra
terraform init -reconfigure
terraform validate
terraform plan -var-file=terraform.tfvars
# If the plan only shows the expected changes, apply:
terraform apply -var-file=terraform.tfvars
```

Guidelines:
- Never run `terraform destroy` against the production project.
- Keep `deletion_protection = true` for Cloud SQL unless you have an out-of-band backup/restore plan.
- Secrets are referenced via `data.google_secret_manager_secret`; the module will **not** create or rotate values. Populate Secret Manager manually via `gcloud secrets versions add` before deploying application workloads.
- SQL users/passwords are intentionally unmanaged. Use `gcloud sql users` or Cloud Console if credentials need to change.

## Post-apply verification

1. Cloud SQL: `gcloud sql instances describe hugs-pg-instance-prod --project ${PROJECT_ID}` should show `PRIVATE` IP only.
2. Serverless connector: `gcloud compute networks vpc-access connectors describe ${network_name}-connector --region ${gcp_region}` must be `READY`.
3. Artifact Registry: confirm that the repo `${artifact_repository_id}` exists via `gcloud artifacts repositories list`.
4. Secret references: `terraform output secret_manager_resources` lists fully-qualified secret paths used by Cloud Run/Build.

If anything looks incorrect, prefer `terraform plan` to revert instead of editing resources manually.
