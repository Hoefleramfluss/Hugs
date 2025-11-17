# Deployment & Operations Checklist

This guide covers local development, database seeding, infrastructure imports, and production deployment to Google Cloud Run for the `hugs-headshop-20251108122937` project.

## 1. Local development

```bash
# 1. Install dependencies (one time)
npm install

# 2. Start Postgres, Redis, Mailcatcher, run migrations + seed, and launch both apps
ci/run_local_dev.sh

# Frontend: http://localhost:3000
# Backend health: http://localhost:4000/api/healthz
# Mailcatcher UI: http://localhost:1080
```

## 2. Database migrations & seed

### Against local containers
```bash
cd backend
export DATABASE_URL="postgresql://shopuser:devpassword@127.0.0.1:5544/shopdb"
npm run prisma:generate
npm run migrate:deploy
npm run seed
```

### Against production (Cloud SQL)
Follow the [Production Prisma migration playbook](infra/prisma-deploy.md) for the canonical process. Quick reference:

1. Start the Cloud SQL Auth Proxy (new terminal):
   ```bash
   export PROJECT_ID="hugs-headshop-20251108122937"
   export DB_INSTANCE="${PROJECT_ID}:europe-west3:hugs-pg-instance-prod"

   docker run --rm -it \
     -v "${HOME}/.config/gcloud:/root/.config/gcloud" \
     -p 127.0.0.1:5432:5432 \
     gcr.io/cloudsql-docker/gce-proxy:1.33.1 /cloud_sql_proxy \
       -instances="${DB_INSTANCE}=tcp:0.0.0.0:5432"
   ```
2. Export the managed connection string and apply migrations:
   ```bash
   cd /Users/christophermarik/Documents/Hugs_CRM
   export DATABASE_URL="$(gcloud secrets versions access latest \
     --project=hugs-headshop-20251108122937 \
     --secret=database-url)"

   npx prisma migrate deploy --schema=backend/prisma/schema.prisma
   ```
3. Optional sanity checks:
   ```bash
   npx prisma migrate status --schema=backend/prisma/schema.prisma
   curl -H "Authorization: Bearer $TOKEN" "$BACKEND_URL/api/healthz"
   curl -H "Authorization: Bearer $TOKEN" "$BACKEND_URL/api/products"
   ```

> **Note:** Production seeding remains opt-in. If you ever need to seed, set `CONFIRM_PROD_SEED=true` and take a backup first.

## 3. Terraform workflow

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars  # edit values as needed
terraform init -reconfigure
./import_commands.sh        # review imports, then run with EXECUTE_IMPORTS=true when ready
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

Secrets are **not** managed by Terraform. Load values manually:
```bash
echo "<secret-value>" | gcloud secrets versions add jwt-secret --data-file=- --project=hugs-headshop-20251108122937
# repeat for db-password, stripe-secret-key, stripe-webhook-secret, pos-api-key, database-url, gemini-api-key
```

## 4. Production deploy pipeline

Use Cloud Build to run tests, build/push images, migrate, deploy, and smoke-test both Cloud Run services:

```bash
PROJECT_ID=hugs-headshop-20251108122937 \
NEXT_PUBLIC_API_URL=https://hugs-backend-prod-787273457651.europe-west3.run.app \
ci/deploy_prod.sh
```

The script wraps:
- `npm ci`, backend unit tests, Next.js build verification
- Docker image builds/pushes to Artifact Registry (`${_ARTIFACT_REPO}`)
- `prisma migrate deploy` via Cloud SQL Proxy
- Cloud Run deploys for `hugs-backend-${_ENV}` and `hugs-frontend-${_ENV}`
- Smoke tests via `ci/check_post_deploy.sh`

If you need to run Cloud Build manually:
```bash
gcloud builds submit \
  --config=ci/cloudbuild.yaml \
  --project=hugs-headshop-20251108122937 \
  --substitutions=_GCP_REGION=europe-west3,_ARTIFACT_REPO=hugs-headshop-repo,_ENV=prod,_CLOUD_RUN_SA=hugs-cloud-run-sa@hugs-headshop-20251108122937.iam.gserviceaccount.com,_DB_CONNECTION_NAME=hugs-headshop-20251108122937:europe-west3:hugs-pg-instance-prod,_NEXT_PUBLIC_API_URL=https://hugs-backend-prod-787273457651.europe-west3.run.app
```

## 5. Post-deploy verification

```bash
# Backend health
curl https://hugs-backend-prod-787273457651.europe-west3.run.app/api/healthz

# Frontend reachability (temporärer Healthcheck, `/healthz` folgt)
curl -I https://hugs-frontend-prod-787273457651.europe-west3.run.app/

# Smoke tests (uses deployed URLs)
BACKEND_URL=https://hugs-backend-prod-787273457651.europe-west3.run.app \
FRONTEND_URL=https://hugs-frontend-prod-20251108122937-url-placeholder \
ci/check_post_deploy.sh
```

Update the placeholder frontend URL once Cloud Run returns the live endpoint (`gcloud run services describe hugs-frontend-prod --region europe-west3 --format='value(status.url)'`).

### Post-Deploy

- Backend-/Frontend-Healthchecks (siehe oben; Frontend aktuell via `HEAD /`, `/healthz` als Follow-up)
- Prisma-Migrationen: siehe `infra/prisma-deploy.md`
- **E2E-Smoketests (PROD):** siehe `ops/release-checklist.md` („E2E Smoke – Playwright (PROD)“)
  - Letzter grüner Run: 2025-11-17, Artefakte `.deploy-info-1763380384/`
