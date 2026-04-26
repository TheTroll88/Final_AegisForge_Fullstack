# Kubernetes Cluster Inventory
**Compiled by:** Anvil (Lead Architect)
**Date:** 2026-04-12
**Source:** `kubectl config get-contexts`, `kubectl get pods`, Docker Desktop Kind cluster
**Classification:** OPERATIONAL — cluster topology and access issues

---

## 1. kubectl Contexts (3)

| # | Context Name | Cluster | User | Namespace | Current | Status |
|---|-------------|---------|------|-----------|---------|--------|
| 1 | `docker-desktop` | docker-desktop | docker-desktop | default | No | **Working** — standard kube-system |
| 2 | `hub-54465` | hub-54465 | hub-54465 | **Nate** | **Yes** (current) | **FORBIDDEN** — returns 403 as system:anonymous |
| 3 | `desktop-hub` | — | — | — | No | **Not tested** |

---

## 2. docker-desktop Context (Working)

### 2a. Cluster Info
| Field | Value |
|-------|-------|
| Type | Kind (Kubernetes IN Docker) |
| Node | `desktop-control-plane` (container: `kindest/node:v1.34.3`) |
| API Endpoint | `127.0.0.1:54465` → container port 6443 |
| K8s Version | v1.34.3 |
| Network | `kind` Docker network |

### 2b. Running Pods (kube-system namespace ONLY)
| Pod | Status | Role |
|-----|--------|------|
| `coredns-*` (x2) | Running | DNS resolution |
| `etcd-desktop-control-plane` | Running | etcd key-value store |
| `kindnet-*` | Running | CNI networking |
| `kube-proxy-*` | Running | Network proxy/load balancing |
| `kube-scheduler-desktop-control-plane` | Running | Pod scheduling |
| `kube-controller-manager-desktop-control-plane` | Running | Controller manager |
| `kube-apiserver-desktop-control-plane` | Running | API server |
| `local-path-provisioner-*` | Running | Local path persistent volumes |

### 2c. Custom Workloads
**NONE** — Only standard kube-system pods. No user-deployed workloads, services, deployments, or namespaces beyond default/kube-system.

---

## 3. hub-54465 Context (FORBIDDEN)

### 3a. Issue
| Field | Value |
|-------|-------|
| Context | `hub-54465` |
| Namespace | `Nate` |
| Error | `pods is forbidden: User "system:anonymous" cannot list resource "pods" in API group "" at the cluster scope` |
| Root Cause | **Authentication not passing through** — despite thetroll888 credentials being configured, the API server sees the request as `system:anonymous` |

### 3b. Possible Causes
1. **Token expired or invalid** — the kubeconfig may reference a bearer token or client cert that's no longer valid
2. **RBAC not configured** — the "Nate" namespace may exist but no RoleBinding/ClusterRoleBinding grants access
3. **Wrong auth mechanism** — kubeconfig may be using exec-based auth (e.g., Docker Desktop plugin) that's failing silently
4. **Stale context** — hub-54465 may reference a cluster endpoint that's been reconfigured

### 3c. Investigation Steps (NOT YET DONE)
```
# Check the kubeconfig entry for hub-54465:
kubectl config view --context hub-54465 -o jsonpath='{.users[?(@.name=="hub-54465")].user}'

# Check if namespace "Nate" exists on docker-desktop context:
kubectl get namespace Nate --context docker-desktop

# Check cluster-role bindings:
kubectl get clusterrolebinding --context docker-desktop | grep -i nate

# Try with explicit token:
kubectl --context hub-54465 auth whoami
```

---

## 4. Known K8s Resources

### 4a. Services (docker-desktop context only)
| Service | Namespace | Type | Ports |
|---------|-----------|------|-------|
| `kubernetes` | default | ClusterIP | 443 |
| `kube-dns` | kube-system | ClusterIP | 53/UDP, 53/TCP, 9153 |

### 4b. Storage
| PV/PVC | Status | Notes |
|--------|--------|-------|
| local-path-provisioner | Running | Handles dynamic PVC on single-node Kind |

---

## 5. Cluster Security Assessment

| Check | Result | Notes |
|-------|--------|-------|
| API exposed to internet? | **NO** — 127.0.0.1 only | Safe |
| Anonymous access granted? | **YES on hub-54465** (by default) | But returns Forbidden — no ClusterRoleBinding for anonymous |
| Custom workloads? | **None** | Clean cluster |
| Secrets in cluster? | Only kube-system defaults | No user secrets |
| Risk level | **Low** | Single-node local dev cluster, no exposed services |

---

## 6. Docker Desktop K8s Configuration

| Setting | Value |
|---------|-------|
| K8s enabled | Yes (via Docker Desktop) |
| Runtime | Kind (in-container K8s) |
| Container runtime | containerd |
| Registry mirror | `docker/desktop-containerd-registry-mirror:v0.0.3` (healthy) |
| Cloud provider | `docker/desktop-cloud-provider-kind:v0.5.0` |

---

*Cross-reference: PORT_MAP.md Section 1 (port 54465 — K8s API)*
*Cross-reference: DOCKER_INVENTORY.md Section 2e (desktop-control-plane container)*
