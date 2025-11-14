# Infrastructure, Deployment, and Operations

This directory contains all resources related to provisioning, deploying, and operating the HUGS Headshop platform on Google Cloud Platform.

## 🚀 Quick Start

1.  **Setup & Provisioning**: Follow the [Terraform Setup Guide](./terraform-readme.md) to provision all the necessary cloud infrastructure.
2.  **Deployment**: See the [Cloud Build configuration](../ci/cloudbuild.yaml) for the automated CI/CD pipeline. For manual deployments, use the [`gcloud` commands](./ops/gcloud-commands.md) or the [`deploy.sh` script](../ci/deploy.sh).

## 📄 Key Documents

### Infrastructure as Code (Terraform)

*   [**Terraform Setup Guide**](./terraform-readme.md): How to initialize and apply the Terraform configuration.
*   [**Cost & Security Notes**](./notes-cost-security.md): Important considerations for managing costs and securing the platform.

### Operations & Runbooks

*   [**Essential `gcloud` Commands**](./ops/gcloud-commands.md): A cheat sheet for common operational tasks.
*   [**Monitoring Setup Guide**](./ops/monitoring-setup.md): How to create notification channels for alerts.
*   [**Rollback Runbook**](./rollback.md): Critical procedures for rolling back a failed deployment.
*   [**Database Backup Policy**](./ops/cloudsql-backup-policy.md): Details on the automated backup and recovery strategy.
*   [**Database Migration Guide**](./prisma-deploy.md): How database migrations are handled in the CI/CD pipeline.
