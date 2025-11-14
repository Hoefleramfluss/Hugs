# Cloud SQL Backup and Recovery Policy

This document outlines the backup strategy for the production PostgreSQL database (`hugs-pg-instance-prod`) to ensure data durability and enable recovery from failures.

## 1. Automated Backups

-   **Frequency**: Daily.
-   **Timing**: Backups are scheduled during a low-traffic window (e.g., 03:00 AM CET) to minimize performance impact. This is configured in `infra/cloud_sql.tf`.
-   **Retention**: The 7 most recent backups are retained. This provides a one-week window for restoring from a daily snapshot.
-   **Location**: Backups are stored geo-redundantly in the `EU` multi-region for disaster recovery purposes.

## 2. Point-in-Time Recovery (PITR)

-   **Status**: Enabled.
-   **How it Works**: PITR allows us to restore the database to its state at any specific moment within the retention period (down to the second). It uses a combination of the daily backups and transaction logs (Write-Ahead Logs or WALs).
-   **Log Retention**: Transaction logs are retained for 7 days, matching the backup retention period.
-   **Use Case**: This is the primary tool for recovering from accidental data deletion, data corruption from a bad code deploy, or other logical errors.

## 3. Recovery Procedures

### Scenario A: Full Instance Failure

If the entire Cloud SQL instance becomes unavailable, a new instance can be created from the latest successful automated backup.

1.  Navigate to the Cloud SQL console in GCP.
2.  Go to the "Backups" tab.
3.  Select the latest valid backup and click "Restore".
4.  This will create a **new** Cloud SQL instance with the restored data.
5.  Update the application's `DATABASE_URL` secret to point to the new instance's connection name and IP address.
6.  Redeploy the backend service to pick up the new database connection details.

### Scenario B: Data Corruption or Accidental Deletion

If a specific set of data needs to be recovered (e.g., a `DELETE` without a `WHERE` clause was run), use Point-in-Time Recovery.

1.  Navigate to the Cloud SQL instance page.
2.  Click "Restore" from the top menu.
3.  Select "Point in time".
4.  Choose the exact timestamp (date and time) to which you want to recover. This should be a time *just before* the data corruption event occurred.
5.  This process will also create a **new** instance.
6.  Follow steps 5 and 6 from Scenario A to switch the application over to the restored instance.

**Important**: Both recovery methods create a new instance and do not modify the original one. This is a safety feature. The old, corrupted instance must be manually decommissioned after a successful recovery.
