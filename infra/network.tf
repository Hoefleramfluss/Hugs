resource "google_compute_network" "primary" {
  name                    = var.network_name
  project                 = var.gcp_project_id
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "primary" {
  name                     = "${var.network_name}-subnet"
  project                  = var.gcp_project_id
  ip_cidr_range            = var.subnet_cidr
  region                   = var.gcp_region
  network                  = google_compute_network.primary.id
  private_ip_google_access = true
}

# Reserve an IP range for private service access (Cloud SQL private IP).
resource "google_compute_global_address" "private_service_range" {
  name          = "${var.network_name}-psa"
  project       = var.gcp_project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.primary.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.primary.id
  service                 = "services/servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]
}

resource "google_vpc_access_connector" "serverless" {
  name           = "${var.network_name}-connector"
  project        = var.gcp_project_id
  region         = var.gcp_region
  network        = google_compute_network.primary.name
  ip_cidr_range  = var.connector_cidr
  min_throughput = 200
  max_throughput = 300
  depends_on     = [google_compute_subnetwork.primary]
}
