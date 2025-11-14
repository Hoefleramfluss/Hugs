#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID=${PROJECT_ID:-hugs-headshop-20251108122937}
GCP_REGION=${GCP_REGION:-europe-west3}
NETWORK_NAME=${NETWORK_NAME:-hugs-vpc}
SUBNET_NAME="${SUBNET_NAME:-${NETWORK_NAME}-subnet}"
CONNECTOR_NAME=${CONNECTOR_NAME:-${NETWORK_NAME}-connector}
DB_INSTANCE_NAME=${DB_INSTANCE_NAME:-hugs-pg-instance-prod}
DB_NAME=${DB_NAME:-shopdb}
ARTIFACT_REPO=${ARTIFACT_REPO:-hugs-headshop-repo}
SERVICE_ACCOUNT_ID=${SERVICE_ACCOUNT_ID:-hugs-cloud-run-sa}
PRIVATE_RANGE_NAME=${PRIVATE_RANGE_NAME:-${NETWORK_NAME}-psa}
PROJECT_NUMBER=${PROJECT_NUMBER:-$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')}

SERVICES=(
  run.googleapis.com
  sqladmin.googleapis.com
  secretmanager.googleapis.com
  artifactregistry.googleapis.com
  cloudbuild.googleapis.com
  iam.googleapis.com
  compute.googleapis.com
  vpcaccess.googleapis.com
  cloudresourcemanager.googleapis.com
)

echo "# Preview of terraform import commands. Set EXECUTE_IMPORTS=true to run them automatically."

run_cmd() {
  local cmd=("$@")
  if [[ "${EXECUTE_IMPORTS:-false}" == "true" ]]; then
    "${cmd[@]}"
  else
    printf '%s\n' "${cmd[*]}"
  fi
}

for service in "${SERVICES[@]}"; do
  run_cmd terraform import "google_project_service.required[\"${service}\"]" "projects/${PROJECT_ID}/services/${service}"
done

run_cmd terraform import google_compute_network.primary "projects/${PROJECT_ID}/global/networks/${NETWORK_NAME}"
run_cmd terraform import google_compute_subnetwork.primary "projects/${PROJECT_ID}/regions/${GCP_REGION}/subnetworks/${SUBNET_NAME}"
run_cmd terraform import google_compute_global_address.private_service_range "projects/${PROJECT_ID}/global/addresses/${PRIVATE_RANGE_NAME}"
run_cmd terraform import google_service_networking_connection.private_vpc_connection "projects/${PROJECT_NUMBER}/global/networks/${NETWORK_NAME}"
run_cmd terraform import google_vpc_access_connector.serverless "projects/${PROJECT_ID}/locations/${GCP_REGION}/connectors/${CONNECTOR_NAME}"
run_cmd terraform import google_sql_database_instance.primary "projects/${PROJECT_ID}/instances/${DB_INSTANCE_NAME}"
run_cmd terraform import google_sql_database.app "projects/${PROJECT_ID}/instances/${DB_INSTANCE_NAME}/databases/${DB_NAME}"
run_cmd terraform import google_artifact_registry_repository.containers "projects/${PROJECT_ID}/locations/${GCP_REGION}/repositories/${ARTIFACT_REPO}"
run_cmd terraform import google_service_account.cloud_run "projects/${PROJECT_ID}/serviceAccounts/${SERVICE_ACCOUNT_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
