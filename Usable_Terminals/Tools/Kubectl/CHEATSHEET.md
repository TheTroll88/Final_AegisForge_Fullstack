# kubectl (Kubernetes) — Cheat Sheet

> **Path:** `C:\Program Files\Docker\Docker\resources\bin\kubectl.exe`  
> **Version:** v1.34.1 (Kustomize v5.7.1)  
> **Type:** Kubernetes cluster management CLI  
> **Source:** Ships with Docker Desktop  
> **AegisForge Role:** Container orchestration, service deployment, scaling

---

## Context & Config

```bash
# Cluster contexts
kubectl config get-contexts                # List all contexts
kubectl config current-context             # Show active context
kubectl config use-context docker-desktop  # Switch to Docker Desktop k8s
kubectl config use-context my-gke-cluster  # Switch context

# Cluster info
kubectl cluster-info                       # API server URL + cluster DNS
kubectl version                            # Client + server versions
kubectl api-resources                      # All available resource types
```

---

## Viewing Resources (GET)

```bash
# Core resources
kubectl get pods                           # List pods (default namespace)
kubectl get pods -A                        # All namespaces
kubectl get pods -n my-namespace           # Specific namespace
kubectl get pods -o wide                   # Extra info (node, IP)
kubectl get pods -o yaml                   # Full YAML output
kubectl get pods -o json                   # Full JSON output
kubectl get pods --watch                   # Live updates
kubectl get pods -l app=myapp              # Filter by label

# Other resources
kubectl get services                       # Services (svc)
kubectl get deployments                    # Deployments (deploy)
kubectl get nodes                          # Cluster nodes
kubectl get namespaces                     # Namespaces (ns)
kubectl get configmaps                     # ConfigMaps (cm)
kubectl get secrets                        # Secrets
kubectl get ingress                        # Ingress rules
kubectl get pv                             # Persistent Volumes
kubectl get pvc                            # Persistent Volume Claims
kubectl get events --sort-by=.lastTimestamp  # Events sorted by time

# All resources
kubectl get all                            # Pods, services, deployments, etc.
kubectl get all -A                         # Everything in all namespaces
```

---

## Describe & Inspect

```bash
kubectl describe pod pod-name              # Detailed pod info (events, conditions)
kubectl describe node node-name            # Node capacity, conditions, pods
kubectl describe service svc-name          # Service endpoints, ports
kubectl describe deployment deploy-name    # Deployment strategy, replicas, events
```

---

## Creating & Applying Resources

```bash
# From YAML/JSON files
kubectl apply -f manifest.yaml             # Create or update resource
kubectl apply -f ./manifests/              # Apply all files in directory
kubectl apply -f https://url/manifest.yaml # From URL

# Quick create (imperative)
kubectl create namespace my-ns
kubectl create deployment nginx --image=nginx:latest
kubectl create service clusterip nginx --tcp=80:80
kubectl create configmap my-config --from-literal=key=value
kubectl create secret generic my-secret --from-literal=password=s3cret

# From stdin
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
  - name: test
    image: nginx:latest
    ports:
    - containerPort: 80
EOF
```

---

## Deployment Management

```bash
# Scale
kubectl scale deployment my-app --replicas=3

# Rolling update
kubectl set image deployment/my-app container=image:v2  # Update image
kubectl rollout status deployment/my-app                 # Watch rollout progress
kubectl rollout history deployment/my-app                # Rollout history
kubectl rollout undo deployment/my-app                   # Rollback to previous
kubectl rollout undo deployment/my-app --to-revision=2   # Rollback to specific revision
kubectl rollout restart deployment/my-app                # Restart all pods

# Autoscaling
kubectl autoscale deployment my-app --min=2 --max=10 --cpu-percent=80
kubectl get hpa                            # Horizontal Pod Autoscalers
```

---

## Exec & Debug

```bash
# Shell into pod
kubectl exec -it pod-name -- bash          # Bash shell
kubectl exec -it pod-name -- sh            # Shell (Alpine, minimal images)
kubectl exec -it pod-name -c container -- bash  # Specific container in pod

# Run command in pod
kubectl exec pod-name -- ls /app
kubectl exec pod-name -- cat /etc/config
kubectl exec pod-name -- env               # Environment variables

# Logs
kubectl logs pod-name                      # Pod logs
kubectl logs pod-name -c container-name    # Specific container
kubectl logs pod-name --previous           # Previous container (after crash)
kubectl logs pod-name -f                   # Follow (stream) logs
kubectl logs pod-name --tail=100           # Last 100 lines
kubectl logs -l app=myapp                  # Logs for all pods with label
kubectl logs deployment/my-app             # Logs for a deployment

# Debug
kubectl debug pod-name -it --image=busybox  # Ephemeral debug container
kubectl top pods                            # Resource usage (requires metrics-server)
kubectl top nodes                           # Node resource usage
```

---

## Port Forwarding & Proxy

```bash
# Port forward (access pod from localhost)
kubectl port-forward pod-name 8080:80      # localhost:8080 → pod:80
kubectl port-forward svc/my-service 8080:80  # Forward to service
kubectl port-forward deployment/my-app 8080:80  # Forward to deployment

# Proxy (access entire API)
kubectl proxy                              # http://localhost:8001/api/v1/...
```

---

## Delete Resources

```bash
kubectl delete pod pod-name                # Delete specific pod
kubectl delete -f manifest.yaml            # Delete resources defined in file
kubectl delete deployment my-app           # Delete deployment + pods
kubectl delete namespace my-ns             # Delete namespace + everything in it (CAREFUL!)
kubectl delete pods --all -n my-ns         # Delete all pods in namespace
kubectl delete pods -l app=test            # Delete by label
```

---

## Namespaces

```bash
# Set default namespace
kubectl config set-context --current --namespace=my-ns

# Common operations
kubectl create namespace staging
kubectl get namespaces
kubectl get pods -n staging
kubectl delete namespace staging           # Deletes EVERYTHING in it
```

---

## ConfigMaps & Secrets

```bash
# ConfigMaps
kubectl create configmap app-config \
  --from-literal=DB_HOST=localhost \
  --from-literal=DB_PORT=5432
kubectl create configmap app-config --from-file=config.json
kubectl get configmap app-config -o yaml

# Secrets
kubectl create secret generic db-creds \
  --from-literal=username=admin \
  --from-literal=password=s3cret
kubectl get secret db-creds -o jsonpath='{.data.password}' | base64 -d  # Decode
```

---

## YAML Template (Deployment + Service)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aegis-api
  labels:
    app: aegis-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: aegis-api
  template:
    metadata:
      labels:
        app: aegis-api
    spec:
      containers:
      - name: api
        image: my-registry/aegis-api:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-creds
              key: password
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: aegis-api-svc
spec:
  selector:
    app: aegis-api
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

---

## Useful Shortcuts

```bash
# Short names
po = pods           svc = services      deploy = deployments
no = nodes          ns = namespaces     cm = configmaps
ing = ingress       pv = persistentvolumes   pvc = persistentvolumeclaims
sa = serviceaccounts  hpa = horizontalpodautoscalers

# kubectl get po = kubectl get pods

# JSON filtering with jsonpath
kubectl get pods -o jsonpath='{.items[*].metadata.name}'
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.phase}{"\n"}{end}'

# Sort by creation time
kubectl get pods --sort-by=.metadata.creationTimestamp
```
