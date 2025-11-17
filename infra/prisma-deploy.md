
# Production Prisma migration playbook

This document defines **the official procedure** for applying Prisma schema changes to the production Cloud SQL instance that backs the Hugs backend. Follow these steps whenever a migration needs to be rolled out to production.

## 1. Prepare a safe migration

1. Generate the migration on your local dev/stage database: `npx prisma migrate dev`.
2. Review the generated SQL in `backend/prisma/migrations/<timestamp>_<name>/migration.sql` and commit it.
3. Merge the migration into the default branch so that the backend image is built with the latest Prisma client.

## 2. Run the migration against production (recommended workflow)

> We run production migrations manually from a trusted workstation using the Cloud SQL Auth Proxy over a private connection. This avoids the Cloud Build environment limitations and keeps control in the hands of the operator who owns the release.

Open a new terminal and start the proxy:

```bash
export PROJECT_ID="hugs-headshop-20251108122937"
export DB_INSTANCE="${PROJECT_ID}:europe-west3:hugs-pg-instance-prod"

docker run --rm -it \
  -v "${HOME}/.config/gcloud:/root/.config/gcloud" \
  -p 127.0.0.1:5432:5432 \
  gcr.io/cloudsql-docker/gce-proxy:1.33.1 /cloud_sql_proxy \
    -instances="${DB_INSTANCE}=tcp:0.0.0.0:5432"
```

In your repo terminal:

```bash
cd /Users/christophermarik/Documents/Hugs_CRM

export DATABASE_URL="$(gcloud secrets versions access latest \
  --project=hugs-headshop-20251108122937 \
  --secret=database-url)"

npx prisma migrate deploy --schema=backend/prisma/schema.prisma

# Optional sanity check
npx prisma migrate status --schema=backend/prisma/schema.prisma
```

Clean up by stopping the proxy container when you are done.

### Golden rules

- **Always** validate the migration in a non-production environment before touching prod.
- **Always** run the commands above before releasing backend code that depends on the new schema.
- If seeding production data is required, set `CONFIRM_PROD_SEED=true` explicitly and double-check backups.

## 3. Post-migration smoke checks

After `prisma migrate deploy` finishes successfully:

1. Hit the backend health endpoint with an identity token: `curl -H "Authorization: Bearer $TOKEN" "$BACKEND_URL/api/healthz"`.
2. Verify products load: `curl -H "Authorization: Bearer $TOKEN" "$BACKEND_URL/api/products"`.
3. Optionally run end-to-end smoke tests via Playwright:

   ```bash
   export NEXT_PUBLIC_BASE_URL="https://<your-frontend-url>"
   export PW_BASE_URL="$NEXT_PUBLIC_BASE_URL"

   cd frontend
   npx playwright test --project=chromium
   ```

## Appendix: Cloud Build migration job

We keep a Cloud Build job (`ci/prisma-migrate.yaml`) for one-off execution in controlled environments. It mirrors the manual workflow above, using `gcr.io/google-appengine/exec-wrapper` to start the Cloud SQL Auth Proxy and execute `npx prisma migrate deploy` inside a Node 20 container.

```yaml
- name: 'gcr.io/google-appengine/exec-wrapper'
  args:
    - '-i'
    - 'node:20'
    - '-s'
    - '${_DB_CONNECTION_NAME}'
    - '-e'
    - 'DATABASE_URL'
    - '--'
    - 'bash'
    - '-lc'
    - |
        set -euo pipefail
        cd /workspace/backend
        npx prisma migrate deploy --schema=prisma/schema.prisma
  env:
    - 'CLOUD_SQL_PROXY_ARGS=--private-ip'
  secretEnv: ['DATABASE_URL']
```

> Cloud Build should **not** run migrations as part of every backend deployment. The main pipeline in `ci/cloudbuild.yaml` gates the migration step behind `_RUN_DB_MIGRATIONS=true` and should normally skip it.
