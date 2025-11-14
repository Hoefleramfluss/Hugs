output "network_self_link" {
  description = "Primary VPC network self link."
  value       = google_compute_network.primary.self_link
}

output "subnet_self_link" {
  description = "Primary subnet self link."
  value       = google_compute_subnetwork.primary.self_link
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL instance connection string (used by Cloud Run / Cloud Build)."
  value       = google_sql_database_instance.primary.connection_name
}

output "serverless_connector" {
  description = "Serverless VPC connector resource ID."
  value       = google_vpc_access_connector.serverless.id
}

output "cloud_run_service_account_email" {
  description = "Email for the Cloud Run runtime service account."
  value       = google_service_account.cloud_run.email
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository fully-qualified ID."
  value       = google_artifact_registry_repository.containers.id
}

output "secret_manager_resources" {
  description = "Secret Manager resource names for runtime secrets (lookups only, no rotation)."
  value       = { for id, secret in data.google_secret_manager_secret.managed : id => secret.name }
}
