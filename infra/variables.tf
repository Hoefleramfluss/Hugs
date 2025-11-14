variable "gcp_project_id" {
  description = "Google Cloud project ID that hosts all resources."
  type        = string
}

variable "gcp_region" {
  description = "Default region for regional Google Cloud resources (e.g. europe-west3)."
  type        = string
  default     = "europe-west3"
}

variable "network_name" {
  description = "Name for the dedicated VPC network."
  type        = string
  default     = "hugs-vpc"
}

variable "subnet_cidr" {
  description = "CIDR block for the custom subnetwork used by private workloads."
  type        = string
  default     = "10.10.0.0/20"
}

variable "connector_cidr" {
  description = "/28 CIDR for the Serverless VPC connector reserved range."
  type        = string
  default     = "10.8.0.0/28"
}

variable "artifact_repository_id" {
  description = "Artifact Registry repository ID for container images."
  type        = string
  default     = "hugs-headshop-repo"
}

variable "cloud_run_service_account_id" {
  description = "Service account ID (without domain) used by Cloud Run services."
  type        = string
  default     = "hugs-cloud-run-sa"
}

variable "db_instance_name" {
  description = "Cloud SQL instance name."
  type        = string
  default     = "hugs-pg-instance-prod"
}

variable "db_tier" {
  description = "Machine tier for the PostgreSQL instance."
  type        = string
  default     = "db-custom-2-4096"
}

variable "db_disk_size_gb" {
  description = "Disk size (GB) for Cloud SQL. Terraform will ignore manual upsizing to avoid churn."
  type        = number
  default     = 50
}

variable "db_name" {
  description = "Primary application database name."
  type        = string
  default     = "shopdb"
}

variable "deletion_protection" {
  description = "Whether to enable deletion protection for long-lived resources like SQL."
  type        = bool
  default     = true
}
