
# Essential `gcloud` Commands for Operators

This file is a cheat sheet for common operational tasks using the `gcloud` command-line tool.

**Note**: Replace placeholders like `<PROJECT_ID>`, `<REGION>`, etc., with your actual values.

## Initial Project Setup

### Enable Required APIs

```bash
gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    secretmanager.googleapis.com \
    pubsub.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    cloudresourcemanager.googleapis.com \
    iam.googleapis.com \
    compute.googleapis.com \
    vpcaccess.googleapis.com \
    storage.googleapis.com \
    monitoring.googleapis.com \
    logging.googleapis.com \
    dns.googleapis.com \
    --project=<PROJECT_ID>
```

## Cloud Build

### Manually Trigger a Build

```bash
gcloud builds submit --config=ci/cloudbuild.yaml --substitutions=_ENV=prod --project=<PROJECT_ID>
```

### View Build History

```bash
gcloud builds list --project=<PROJECT_ID>
```

## Cloud Run

### View Service Logs

```bash
gcloud logging read "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"hugs-backend-prod\"" --project=<PROJECT_ID> --limit=100 --format=json
```

### Map a Custom Domain

```bash
gcloud run domain-mappings create --service=hugs-frontend-prod --domain=www.your-shop.com --region=<REGION> --project=<PROJECT_ID>
```
*After running this, follow the instructions to update your DNS records (A, AAAA, CNAME) with your domain registrar.*

## Secret Manager

### Add a New Secret Version

```bash
# Example for Stripe key
echo "sk_test_12345" | gcloud secrets versions add stripe-secret-key --data-file=- --project=<PROJECT_ID>
```

### Access a Secret's Value

```bash
gcloud secrets versions access latest --secret="db-password" --project=<PROJECT_ID>
```

## Cloud SQL

### Connect to the Database via Proxy

This allows you to connect to your private IP database from your local machine using tools like `psql`.

1.  **Start the proxy:**
    ```bash
    gcloud sql connect hugs-pg-instance-prod --user=shopuser --project=<PROJECT_ID>
    ```

2.  **In a new terminal, connect with `psql`:**
    ```bash
    psql -h 127.0.0.1 -p 5432 -U shopuser -d shopdb
    ```
