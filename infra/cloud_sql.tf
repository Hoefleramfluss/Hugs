resource "google_sql_database_instance" "primary" {
  name                = var.db_instance_name
  project             = var.gcp_project_id
  region              = var.gcp_region
  database_version    = "POSTGRES_15"
  deletion_protection = var.deletion_protection

  settings {
    tier              = var.db_tier
    disk_autoresize   = true
    disk_size         = var.db_disk_size_gb
    availability_type = "ZONAL"

    backup_configuration {
      enabled            = true
      start_time         = "03:00"
      point_in_time_recovery_enabled = true
    }

    maintenance_window {
      day          = 7
      hour         = 0
      update_track = "stable"
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.primary.id
    }
  }

  depends_on = [google_service_networking_connection.private_vpc_connection]

  lifecycle {
    ignore_changes = [
      settings[0].tier,
      settings[0].disk_size,
      settings[0].backup_configuration
    ]
  }
}

resource "google_sql_database" "app" {
  name     = var.db_name
  project  = var.gcp_project_id
  instance = google_sql_database_instance.primary.name
}

resource "google_sql_user" "app" {
  name     = "shopuser"
  instance = google_sql_database_instance.primary.name

  lifecycle {
    prevent_destroy = true
  }
}
