locals {
  managed_secrets = [
    "jwt-secret",
    "db-password",
    "pos-api-key",
    "database-url",
    "stripe-secret-key",
    "stripe-webhook-secret",
    "gemini-api-key"
  ]
}

data "google_secret_manager_secret" "managed" {
  for_each = toset(local.managed_secrets)

  project   = var.gcp_project_id
  secret_id = each.value
}
