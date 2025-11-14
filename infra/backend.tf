terraform {
  backend "gcs" {
    bucket = "hugs-headshop-terraform-state"
    prefix = "terraform/state"
  }
}
