resource "google_artifact_registry_repository" "containers" {
  project       = var.gcp_project_id
  location      = var.gcp_region
  repository_id = var.artifact_repository_id
  description   = "Docker images for the HUGS Head & Growshop platform"
  format        = "DOCKER"
}
