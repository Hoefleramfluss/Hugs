data "google_project" "current" {
  project_id = var.gcp_project_id
}

locals {
  project_number    = data.google_project.current.number
  project_id        = data.google_project.current.project_id
  cloud_build_sa    = "${local.project_number}@cloudbuild.gserviceaccount.com"
  region            = var.gcp_region
  db_instance_name  = var.db_instance_name
  artifact_repo_id  = var.artifact_repository_id
  run_sa_account_id = var.cloud_run_service_account_id
}
