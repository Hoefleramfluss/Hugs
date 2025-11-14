# Setting Up Monitoring Notification Channels

Alerting policies defined in Terraform need to send notifications to a channel (e.g., email, Slack, PagerDuty). These channels are typically created once in the GCP Console.

This guide explains how to create a channel and get its ID for use in `infra/variables.tf`.

## Step 1: Navigate to Notification Channels

1.  Open the Google Cloud Console.
2.  In the navigation menu, go to **Monitoring**.
3.  In the Monitoring navigation pane, click on **Alerting**.
4.  In the top-right corner, click **Edit Notification Channels**.

## Step 2: Create a Notification Channel

You will see a list of channel types (Email, Slack, SMS, etc.).

### Example: Creating an Email Channel

1.  Scroll down to the **Email** section and click **Add New**.
2.  Enter the **Email Address** where you want to receive alerts.
3.  Provide a **Display name** (e.g., `HUGS Ops Email`).
4.  Click **Save**.

### Example: Creating a Slack Channel

1.  Scroll down to the **Slack** section and click **Add New**.
2.  GCP will guide you through an authentication flow to connect to your Slack workspace.
3.  You will need to authorize the Google Cloud Alerts app in Slack.
4.  Choose the **Slack channel name** (e.g., `#hugs-alerts`) and a **Display name**.
5.  Click **Save**.

## Step 3: Get the Channel ID for Terraform

After creating a channel, you need its unique ID to wire it up in Terraform.

1.  On the **Notification channels** page, find the channel you just created.
2.  Click the three vertical dots (more options) next to the channel and select **Copy resource name to clipboard** (or a similar option to get the full name).
3.  The copied value will look like this:
    `projects/hugs-headshop-20251108122937/notificationChannels/1234567890123456789`
4.  Paste this full string as the value for the `notification_channel_email` variable (or a new variable you create) in your `terraform.tfvars` file.

Now, when you run `terraform apply`, the alerting policies in `ops/monitoring.tf` will be configured to send notifications to this channel.
