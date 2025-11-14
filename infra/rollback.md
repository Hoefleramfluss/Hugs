
# Deployment Rollback Runbook

A failed deployment can happen. This runbook provides steps to safely roll back the application to a previous, stable state.

## Scenario 1: Application Code Rollback (No Database Changes)

This is the most common and safest scenario. Use this if a new code revision introduces a bug but does not involve a breaking database schema change.

**Cloud Run's revision management makes this straightforward.**

### Steps:

1.  **Identify the Bad Revision**: Go to the Cloud Run service in the GCP Console. In the "Revisions" tab, you will see a history of all deployed revisions. Identify the latest, faulty revision and the last known good revision.

2.  **Shift Traffic Back**: The quickest way to roll back is to redirect 100% of the traffic to the last known good revision.

    *   **Via GCP Console**:
        *   Go to your Cloud Run service.
        *   Click "Manage Traffic".
        *   Find the last known good revision, and in the text box under "%", enter `100`.
        *   Ensure the new, faulty revision has `0`.
        *   Click "Save". Traffic will immediately be routed to the old revision.

    *   **Via `gcloud` CLI**:
        Replace `<SERVICE_NAME>`, `<GOOD_REVISION_NAME>`, and `<REGION>` with your values.

        ```bash
        gcloud run services update-traffic <SERVICE_NAME> --to-revisions=<GOOD_REVISION_NAME>=100 --region=<REGION>
        ```

3.  **Investigate**: Analyze the logs and Playwright traces from the failed deployment to understand the root cause.

4.  **Fix and Redeploy**: Once the bug is fixed, a new deployment will create a new revision.

## Scenario 2: Rollback with a Breaking Database Migration

This is a more complex and dangerous scenario. Rolling back a database migration that has already been applied (`prisma migrate deploy`) is not directly supported by Prisma and can be risky.

**The primary goal is to prevent this scenario through careful testing and deployment strategies (e.g., canary deployments).**

If a rollback is absolutely necessary, here is a high-level approach:

### Phase 1: Mitigate Immediately

1.  **Roll back the application code immediately** using the steps in Scenario 1. This prevents the faulty code from interacting with the (now mismatched) database schema. Your application will likely be in an error state, but this stops further data corruption.

### Phase 2: Database Recovery (Choose one)

**Option A: Restore from Backup (Safest, but involves data loss)**

This is the recommended approach if you can afford to lose the data generated since the bad deployment.

1.  **Restore the Database**: Use the Point-in-Time Recovery (PITR) feature in Cloud SQL to restore the database to a new instance from a time *just before* the bad migration was applied. See `ops/cloudsql-backup-policy.md`.
2.  **Validate the Restored DB**: Connect to the new instance and verify the data.
3.  **Update Application**: Point your stable Cloud Run revision to the newly restored database instance (by updating the `DATABASE_URL` secret and redeploying or updating the service).
4.  **Decommission**: Once stable, delete the faulty database instance.

**Option B: Manual Compensating Migration (High Risk)**

This is for experts and should only be attempted if data loss is unacceptable.

1.  **Create a "Down" Migration**: Manually write a new Prisma migration file with the SQL commands necessary to reverse the changes from the bad migration. For example, if you added a non-nullable column, the down migration might need to drop it or make it nullable.
2.  **Test Thoroughly**: Test this down migration on a staging or temporary copy of the production database.
3.  **Apply the Down Migration**: Run `prisma migrate deploy` with the new compensating migration.
4.  **Verify**: Ensure the database schema is back to the state expected by the old, stable application code.
5.  **Confirm Application Health**: The stable Cloud Run revision (which should still be serving traffic) should now be able to connect and operate correctly.

**Prevention is the best strategy.** Always design database migrations to be backward-compatible whenever possible.
