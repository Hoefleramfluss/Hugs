# Copy this file to terraform.tfvars and adjust for your environment.
gcp_project_id              = "hugs-headshop-20251108122937"
gcp_region                  = "europe-west3"
network_name                = "hugs-vpc"
subnet_cidr                 = "10.10.0.0/20"
connector_cidr              = "10.8.0.0/28"
artifact_repository_id      = "hugs-headshop-repo"
cloud_run_service_account_id = "hugs-cloud-run-sa"
db_instance_name            = "hugs-pg-instance-prod"
db_tier                     = "db-custom-2-4096"
db_disk_size_gb             = 50
db_name                     = "shopdb"
deletion_protection         = true
