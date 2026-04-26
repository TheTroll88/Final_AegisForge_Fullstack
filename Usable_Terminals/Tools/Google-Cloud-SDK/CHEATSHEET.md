# Google Cloud SDK (gcloud) — Cheat Sheet

> **Path:** `C:\Users\natha\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd`  
> **Shell:** "Google Cloud SDK Shell" (Start Menu shortcut)  
> **Version:** 563.0.0  
> **Type:** Cloud CLI — manages all Google Cloud Platform services  
> **Sub-tools:** gcloud (main), gsutil (storage), bq (BigQuery), docker-credential-gcloud

---

## Authentication & Config

```bash
# Login & auth
gcloud auth login                          # Browser-based login
gcloud auth login --no-launch-browser      # Copy/paste URL login
gcloud auth application-default login      # Set Application Default Credentials
gcloud auth list                           # List authenticated accounts
gcloud auth revoke                         # Revoke credentials

# Configuration
gcloud init                                # Interactive setup (project, region, zone)
gcloud config set project PROJECT_ID       # Set active project
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a
gcloud config list                         # Show current config
gcloud config get project                  # Get specific value

# Configurations (profiles)
gcloud config configurations create dev    # Create named config
gcloud config configurations activate dev  # Switch config
gcloud config configurations list          # List configs

# Project info
gcloud projects list                       # List all projects
gcloud projects describe PROJECT_ID        # Project details
```

---

## Compute Engine (VMs)

```bash
# List instances
gcloud compute instances list
gcloud compute instances list --filter="zone:us-central1-a"

# Create VM
gcloud compute instances create my-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB

# SSH into VM
gcloud compute ssh my-vm --zone=us-central1-a

# Start/Stop/Delete
gcloud compute instances start my-vm --zone=us-central1-a
gcloud compute instances stop my-vm --zone=us-central1-a
gcloud compute instances delete my-vm --zone=us-central1-a

# Firewall rules
gcloud compute firewall-rules list
gcloud compute firewall-rules create allow-8080 \
  --allow=tcp:8080 --source-ranges=0.0.0.0/0
```

---

## Google Kubernetes Engine (GKE)

```bash
# Clusters
gcloud container clusters list
gcloud container clusters create my-cluster \
  --zone=us-central1-a --num-nodes=3 --machine-type=e2-medium
gcloud container clusters get-credentials my-cluster --zone=us-central1-a  # Configure kubectl
gcloud container clusters delete my-cluster --zone=us-central1-a

# After get-credentials, use kubectl normally:
kubectl get pods
kubectl get services
```

---

## Cloud Storage (gsutil)

```bash
# Buckets
gsutil ls                                  # List buckets
gsutil mb gs://my-bucket                   # Create bucket
gsutil rb gs://my-bucket                   # Remove empty bucket

# Files
gsutil cp file.txt gs://my-bucket/         # Upload file
gsutil cp gs://my-bucket/file.txt .        # Download file
gsutil cp -r folder/ gs://my-bucket/       # Upload directory
gsutil mv gs://bucket/old.txt gs://bucket/new.txt  # Move/rename
gsutil rm gs://my-bucket/file.txt          # Delete file
gsutil rm -r gs://my-bucket/folder/        # Delete directory

# List & info
gsutil ls gs://my-bucket/                  # List bucket contents
gsutil ls -l gs://my-bucket/              # Long format (sizes, dates)
gsutil du -s gs://my-bucket/              # Bucket size

# Sync (like rsync)
gsutil rsync -r local-dir/ gs://my-bucket/    # Sync local to GCS
gsutil rsync -r gs://my-bucket/ local-dir/    # Sync GCS to local
gsutil rsync -d -r src/ gs://bucket/dest/     # Delete destination extras (-d)

# Access control
gsutil iam ch allUsers:objectViewer gs://my-bucket  # Make bucket public
gsutil acl set private gs://my-bucket/file.txt      # Make file private
```

---

## Cloud Functions

```bash
# Deploy function
gcloud functions deploy my-function \
  --runtime=python311 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=handler \
  --source=.

# List functions
gcloud functions list

# Call function
gcloud functions call my-function --data='{"key":"value"}'

# View logs
gcloud functions logs read my-function

# Delete function
gcloud functions delete my-function
```

---

## Cloud Run (Containers)

```bash
# Deploy container
gcloud run deploy my-service \
  --image=gcr.io/PROJECT/my-image \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated

# Build + deploy from source
gcloud run deploy my-service --source=.

# List services
gcloud run services list

# Get URL
gcloud run services describe my-service --format='value(status.url)'

# View logs
gcloud run services logs read my-service
```

---

## BigQuery (bq)

```bash
# Query
bq query --use_legacy_sql=false 'SELECT * FROM dataset.table LIMIT 10'
bq query --use_legacy_sql=false < query.sql    # From file

# Datasets
bq ls                                     # List datasets
bq mk dataset_name                        # Create dataset
bq rm -r dataset_name                     # Remove dataset + tables

# Tables
bq ls dataset_name                        # List tables in dataset
bq show dataset.table                     # Table schema/info
bq mk --table dataset.table col1:STRING,col2:INTEGER  # Create table

# Load data
bq load --source_format=CSV dataset.table data.csv col1:STRING,col2:INTEGER
bq load --source_format=NEWLINE_DELIMITED_JSON dataset.table data.json

# Export
bq extract dataset.table gs://bucket/export.csv
```

---

## IAM & Service Accounts

```bash
# IAM policies
gcloud projects get-iam-policy PROJECT_ID
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="user:email@example.com" --role="roles/editor"

# Service accounts
gcloud iam service-accounts list
gcloud iam service-accounts create my-sa --display-name="My Service Account"
gcloud iam service-accounts keys create key.json \
  --iam-account=my-sa@PROJECT.iam.gserviceaccount.com
```

---

## Container Registry

```bash
# Configure Docker to use GCR
gcloud auth configure-docker

# Tag and push
docker tag myimage gcr.io/PROJECT/myimage:latest
docker push gcr.io/PROJECT/myimage:latest

# List images
gcloud container images list --repository=gcr.io/PROJECT
gcloud container images list-tags gcr.io/PROJECT/myimage
```

---

## Useful Commands

```bash
# Resource overview
gcloud services list --enabled             # Enabled APIs
gcloud services enable compute.googleapis.com   # Enable an API

# Billing
gcloud billing accounts list
gcloud billing projects describe PROJECT_ID

# Regions & zones
gcloud compute regions list
gcloud compute zones list
gcloud compute machine-types list --filter="zone:us-central1-a"

# Logs
gcloud logging read "resource.type=cloud_function" --limit=50 --format=json

# SSH tunneling
gcloud compute ssh my-vm --zone=us-central1-a -- -L 8080:localhost:8080

# Interactive SQL (Cloud SQL)
gcloud sql connect my-instance --user=root
```
