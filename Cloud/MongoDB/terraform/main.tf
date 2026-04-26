# =============================================================================
#  AegisForge — Terraform MongoDB Atlas Provider
#  Cloud/MongoDB/terraform/main.tf
#
#  Loads credentials via environment variables:
#    MONGODB_ATLAS_PUBLIC_KEY   = public key from Vault (sug3mBfKH5lcKg)
#    MONGODB_ATLAS_PRIVATE_KEY  = private key from Vault
#    TF_VAR_atlas_org_id        = your Atlas Org ID
# =============================================================================

terraform {
  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.15"
    }
  }
}

provider "mongodbatlas" {
  public_key  = var.atlas_public_key
  private_key = var.atlas_private_key
}

variable "atlas_public_key" {
  description = "MongoDB Atlas API public key"
  type        = string
  sensitive   = true
}

variable "atlas_private_key" {
  description = "MongoDB Atlas API private key"
  type        = string
  sensitive   = true
}

variable "atlas_org_id" {
  description = "MongoDB Atlas Organization ID"
  type        = string
}

# Existing cluster reference (read-only data source — no changes made)
data "mongodbatlas_cluster" "aegis_cluster0" {
  project_id = var.atlas_org_id
  name       = "cluster0"
}

output "cluster_connection_string" {
  description = "Atlas cluster0 SRV connection string"
  value       = data.mongodbatlas_cluster.aegis_cluster0.connection_strings[0].standard_srv
  sensitive   = true
}
