# Unio — Platform SRE / FinTech Engineering Showcase

> A fully interactive, four-round engineering demonstration covering microservice design, internal developer tooling, Kubernetes observability, and FinTech security compliance — running in a single unified dashboard.

---
# Screenshots
https://github.com/slkshine001-wq/SRE-Platform-/blob/main/Demo-Screenshot/

## Table of Contents

1. [Quick Start — One Command](#quick-start--one-command-docker-compose)
2. [Manual Start — Terminal per Service](#manual-start--terminal-per-service)
3. [Architecture Overview](#architecture-overview)
4. [Round 1 — User Metadata Service](#round-1--user-metadata-service)
5. [Round 2 — Internal Developer Portal (IDP)](#round-2--internal-developer-portal-idp)
6. [Round 3 — K8s Topology & SLO Management](#round-3--k8s-topology--slo-management)
7. [Round 4 — Security & Compliance](#round-4--security--compliance)
8. [Showcase Dashboard](#showcase-dashboard)
9. [Docker Compose Reference](#docker-compose-reference)
10. [Helm Chart (K8s Deployment)](#helm-chart-k8s-deployment)
11. [Port Reference](#port-reference)
12. [Project Structure](#project-structure)
13. [Troubleshooting](#troubleshooting)
14. [Stopping All Services](#stopping-all-services)

---

## Quick Start — One Command (Docker Compose)

> **Recommended for demos and evaluation.** Starts all 5 services in containers automatically.

### Prerequisites

| Tool | Check Command |
|---|---|
| Docker Desktop (running) | `docker --version` |
| Docker Compose v2 | `docker compose version` |

### Start Everything

```powershell
cd d:\Projects\unio
docker-compose up --build
```

Wait for all containers to become healthy (about 45–60 seconds), then open:

```
http://localhost:8080
```

### Services started by Docker Compose

| Container | Port | Round | Status Check |
|---|---|---|---|
| `unio-mysql` | 3306 | Database | `docker ps` |
| `unio-user-service` | 54321 | Round 1 | http://localhost:54321/metrics |
| `unio-idp-service` | 4001 | Round 2 | http://localhost:4001/dashboard |
| `unio-k8s-slo` | 4002 | Round 3 | http://localhost:4002/slo |
| `unio-security` | 4003 | Round 4 | http://localhost:4003/compliance |
| `unio-dashboard` | 8080 | Frontend | http://localhost:8080 |

### Useful Docker Compose Commands

```powershell
# Start in background (detached)
docker-compose up --build -d

# View logs for a specific service
docker-compose logs -f user-service
docker-compose logs -f security-service

# Restart a single service
docker-compose restart idp-service

# Stop everything
docker-compose down

# Stop and remove volumes (fresh DB)
docker-compose down -v
```

---

## Manual Start — Terminal per Service

> Use this if you don't have Docker, or want to run services directly with `ts-node` for development.

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 18.x | https://nodejs.org |
| npm | ≥ 9.x | bundled with Node |
| live-server | latest | `npm install -g live-server` |

### Step-by-Step

Open **5 separate PowerShell terminals** and run one command per terminal:

#### Terminal 1 — Round 1: User Metadata Service
```powershell
cd d:\Projects\unio\round-1-user-service
npm install
npx ts-node src/index.ts
# ✓ Server listening on http://localhost:54321
```

#### Terminal 2 — Round 2: IDP Backend
```powershell
cd d:\Projects\unio\round-2-platform-portal
npm install
npx ts-node src/index.ts
# ✓ Server listening on http://localhost:4001
```

#### Terminal 3 — Round 3: K8s & SLO API
```powershell
cd d:\Projects\unio\round-3-k8s-observability
npm install
npx ts-node src/index.ts
# ✓ [Round 3] K8s Topology & SLO API running on http://localhost:4002
```

#### Terminal 4 — Round 4: Security API
```powershell
cd d:\Projects\unio\round-4-security-design
npm install
npx ts-node src/index.ts
# ✓ [Round 4] Security & Compliance API running on http://localhost:4003
```

#### Terminal 5 — Dashboard
```powershell
cd d:\Projects\unio\showcase-portal
npx live-server --port=8080 .
# ✓ Serving at http://localhost:8080
```

Then open **http://localhost:8080** in your browser.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│               Showcase Dashboard  :8080  (live-server)           │
│              Single-page HTML · Auto-refresh 1–4s polling        │
└────────┬──────────────┬──────────────┬───────────────────────────┘
         │              │              │              │
      :54321         :4001          :4002          :4003
         │              │              │              │
┌────────┴──────┐ ┌─────┴──────┐ ┌────┴───────┐ ┌───┴────────────┐
│   Round 1     │ │  Round 2   │ │  Round 3   │ │   Round 4      │
│ User Service  │ │ IDP Portal │ │  K8s / SLO │ │   Security     │
│ Fastify + TS  │ │ Fastify+TS │ │ Fastify+TS │ │  Fastify + TS  │
│ SQLite/MySQL  │ │ GitOps Sim │ │  HPA + SLO │ │ PCI + PMLA     │
│ Sequelize ORM │ │ Helm/K8s   │ │ Error Budg │ │ SAST/DAST/SCA  │
└───────┬───────┘ └────────────┘ └────────────┘ └────────────────┘
        │
   ┌────┴─────┐
   │  MySQL   │  (Docker only)
   │  :3306   │
   └──────────┘
```

---

## Round 1 — User Metadata Service

**Directory:** `round-1-user-service/`  
**Port:** `54321`  
**Dashboard Tab:** _Microservice Health_

### What It Does

A production-grade FinTech microservice for user metadata CRUD with enterprise resiliency patterns: idempotency, retry/backoff, circuit breaking, Prometheus metrics, and dual-database support.

### Features

| Feature | Implementation |
|---|---|
| **Idempotency** | `x-idempotency-key` header — duplicate POSTs return cached response, preventing double-writes |
| **Auto Idempotency** | No key provided? SHA-256 hash of payload is used automatically |
| **Retry + Backoff** | `cockatiel` — 3 attempts, 100ms→1000ms exponential backoff |
| **Circuit Breaker** | Opens after 5 consecutive failures, half-opens after 10s |
| **SQLite** | Default mode — zero config, file at `data/database.sqlite` |
| **MySQL** | Production mode — set `DB_HOST` env var to switch automatically |
| **Prometheus Metrics** | `/metrics` endpoint — `success_count`, `failure_count`, `total_requests`, `request_latency_ms` |
| **Structured Logging** | `pino` JSON logs with request correlation |
| **Idempotency Table** | Stores key→response mapping in same transaction as user record |

### API Endpoints

#### `POST /user` — Create User

```powershell
Invoke-RestMethod http://localhost:54321/user `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{"x-idempotency-key"="key-001"} `
  -Body '{"user_id":"u001","name":"Alice","email":"alice@bank.com","phone":"+91-9876543210"}'
```

```bash
curl -X POST http://localhost:54321/user \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: key-001" \
  -d '{"user_id":"u001","name":"Alice","email":"alice@bank.com","phone":"+91-9876543210"}'
```

**Response:**
```json
{
  "user_id": "u001",
  "name": "Alice",
  "email": "alice@bank.com",
  "phone": "+91-9876543210",
  "created_at": "2026-02-27T16:00:00.000Z"
}
```

> **Tip:** Send the same request twice with the same `x-idempotency-key` — you get the same response, no duplicate record created.

#### `GET /user/:id` — Fetch User

```bash
curl http://localhost:54321/user/u001
```

#### `GET /metrics` — Prometheus Metrics

```bash
curl http://localhost:54321/metrics
# Returns counters: success_count, failure_count, total_requests
# Returns histogram: request_latency_ms (p50, p95, p99)
```

### Database Configuration

| Mode | How to enable | Notes |
|---|---|---|
| **SQLite** (default) | No env vars needed | File created at `data/database.sqlite` |
| **MySQL** | Set `DB_HOST=localhost` | See env vars below |
| **Docker MySQL** | `docker-compose up` | Auto-configured |

**MySQL env vars:**
```powershell
$env:DB_HOST = "localhost"
$env:DB_NAME = "user_db"
$env:DB_USER = "root"
$env:DB_PASS = "password"
npx ts-node src/index.ts
```

### Dashboard Features (Microservice Health tab)

- ✅ Live success rate, failure count, avg latency KPI cards
- ✅ Real-time throughput chart (ApexCharts, auto-refresh)
- ✅ Request method distribution (GET vs POST)
- ✅ System event log stream (last 10 events)
- ✅ Interactive user creation form with idempotency key generator
- ✅ User lookup by ID

---

## Round 2 — Internal Developer Portal (IDP)

**Directory:** `round-2-platform-portal/`  
**Port:** `4001`  
**Dashboard Tab:** _Self-Service Portal_

### What It Does

A self-service **Internal Developer Portal** that lets any engineering team bootstrap a new microservice with a single API call — automatically generating Kubernetes manifests, GitHub Actions CI/CD pipelines, Terraform configs, and simulated AWS ECR provisioning.

### Features

| Feature | Implementation |
|---|---|
| **Service Registration** | Register name, team, repo URL — gets a UUID and status `REGISTERED` |
| **K8s Manifest** | Auto-generates `Deployment` + `Service` + `HPA` + `PodDisruptionBudget` YAML |
| **CI/CD Pipeline** | Auto-generates GitHub Actions workflow (build→test→push→deploy) |
| **Terraform Config** | Auto-generates `aws_ecr_repository` + `aws_iam_role` HCL |
| **ECR Provisioning** | Returns simulated ECR URL and IAM role ARN |
| **GitOps Deploy** | Trigger deployment → returns `build_id` for polling |
| **Async Status** | `RUNNING` → `SUCCESS` state machine tracked by build_id |
| **CI/CD Console** | Frontend streams live pipeline step logs |
| **Audit Log** | Timestamped deployment history in the dashboard |
| **Central Dashboard** | All registered services + last deployment status |

### API Endpoints

#### `POST /services` — Register & Scaffold

```bash
curl -X POST http://localhost:4001/services \
  -H "Content-Type: application/json" \
  -d '{"service_name":"payment-gateway","team_name":"FinTech-Ops","repo_url":"https://github.com/org/payment-gateway"}'
```

**Response:**
```json
{
  "id": "uuid-xxxx",
  "service_name": "payment-gateway",
  "ecr_repo": "https://aws_account_id.dkr.ecr.us-east-1.amazonaws.com/payment-gateway:latest",
  "iam_role": "arn:aws:iam::123456789012:role/payment-gateway-role",
  "status": "REGISTERED",
  "scaffold": {
    "deployment_yaml": "apiVersion: apps/v1\nkind: Deployment...",
    "pipeline_yaml": "name: CI/CD Pipeline\non:\n  push...",
    "terraform_tf": "resource \"aws_ecr_repository\" ..."
  }
}
```

#### `POST /deploy/:service_name` — Trigger Deployment

```bash
curl -X POST http://localhost:4001/deploy/payment-gateway \
  -H "Content-Type: application/json" -d '{}'
```

**Response:** `{ "build_id": "uuid-yyyy", "status": "RUNNING" }`

#### `GET /deploy/:build_id` — Poll Status

```bash
curl http://localhost:4001/deploy/uuid-yyyy
# After ~6s: { "status": "SUCCESS" }
```

#### `GET /dashboard` — All Services

```bash
curl http://localhost:4001/dashboard
```

### Dashboard Usage (Self-Service Portal tab)

1. Fill **Service Name** (e.g. `payment-gateway`), **Team Name**, **Git URL**
2. Click **"Bootstrap & Generate Manifests"** → see ECR URL + IAM ARN
3. Switch **K8s / CI/CD / Terraform** tabs to view each generated manifest
4. Click **"Trigger GitOps Deployment"** → live CI/CD console streams steps
5. Check **Audit Log** section below for timestamped deployment history

---

## Round 3 — K8s Topology & SLO Management

**Directory:** `round-3-k8s-observability/`  
**Port:** `4002`  
**Dashboard Tab:** _K8s & Observability_

### What It Does

Simulates a live Kubernetes production cluster with 5 microservices. Demonstrates HPA scaling, SLO compliance tracking, error budget management, and multi-window burn-rate alerting — all auto-refreshing every 3 seconds.

### Features

| Feature | Implementation |
|---|---|
| **5 Live Services** | user-metadata, payment-gateway, notification, audit-logger, api-gateway |
| **CPU/Memory Drift** | Metrics realistically drift ±4% every 3s |
| **HPA Simulation** | Auto scale-out when CPU > 70%, scale-in when CPU < 30% |
| **Availability SLO** | Target 99.9% — tracks against `100 - errorBudgetConsumed * 0.01` |
| **Latency p95/p99** | Target 200ms / 500ms — color-coded MET/BREACHED |
| **Error Budget Ring** | SVG gauge: green (>50%) → yellow (>20%) → red (<20%) |
| **Budget Policy** | Policy automatically → FREEZE when budget > 80% consumed |
| **Alert Timeline** | HPA events, budget burns, deployment events — auto-generated |
| **Manifest Viewer** | K8s, Helm, HPA, OTel manifests from actual project files |
| **Interactive Controls** | "Inject Incident" (burns 5% budget), "Manual Scale-Out" |

### API Endpoints

#### `GET /cluster` — Live Pod Topology

```bash
curl http://localhost:4002/cluster
```

```json
[
  {
    "name": "user-metadata-service",
    "namespace": "production",
    "replicas": 3, "maxReplicas": 10,
    "cpu": 55.2, "memory": 60.1,
    "version": "v1.2.3",
    "status": "Healthy"
  }
]
```

#### `GET /slo` — Current SLO Health

```bash
curl http://localhost:4002/slo
```

```json
{
  "availability": { "target": 99.9, "current": 99.917, "status": "MET" },
  "latency_p95":  { "target_ms": 200, "current_ms": 143,  "status": "MET" },
  "latency_p99":  { "target_ms": 500, "current_ms": 310,  "status": "MET" },
  "error_budget":  { "remaining_pct": 91.66, "remaining_minutes": 396, "policy": "NORMAL" }
}
```

#### `GET /alerts` — Event Timeline

```bash
curl http://localhost:4002/alerts
```

#### `POST /simulate/incident` — Burn 5% Budget

```bash
curl -X POST http://localhost:4002/simulate/incident \
  -H "Content-Type: application/json" -d '{}'
```

#### `POST /simulate/scale` — HPA Scale-Out

```bash
curl -X POST http://localhost:4002/simulate/scale \
  -H "Content-Type: application/json" -d '{}'
```

### Supporting Files

| File | Description |
|---|---|
| `k8s/production.yaml` | Full K8s manifest: Deployment, Service, HPA, PodDisruptionBudget |
| `helm/Chart.yaml` | Helm chart definition |
| `helm/values.yaml` | Helm values (replicas, resources, HPA config) |
| `helm/templates/deployment.yaml` | Helm template with FluentBit sidecar |
| `dashboards/service-dashboard.json` | Grafana dashboard (throughput, error rate, latency, CPU) |
| `SLO_DOCUMENT.md` | Formal SLO doc: SLIs, burn-rate alert thresholds, compliance periods |
| `tracing-example.ts` | OpenTelemetry SDK setup for distributed tracing |

### Dashboard Features (K8s & Observability tab)

- ✅ 4 SLO KPI cards with live values and MET/BREACHED badges
- ✅ Animated error budget donut ring + remaining minutes counter
- ✅ 5-service pod topology (CPU/memory bars + pod dots per service)
- ✅ Alert timeline with 🔴/🟡/🟢 severity icons
- ✅ Manifest viewer: K8s · Helm · HPA · OTel tabs
- ✅ SLO Document reference panel (SLIs, policy, burn-rate alerts)
- ✅ Interactive buttons: Inject Incident · Manual Scale-Out

---

## Round 4 — Security & Compliance

**Directory:** `round-4-security-design/`  
**Port:** `4003`  
**Dashboard Tab:** _Security Comply_

### What It Does

Demonstrates FinTech security engineering: PCI-DSS compliance tracking, PMLA-compliant audit log streaming, interactive multi-tool security scanning (SAST/DAST/SCA/Secrets), and a visual shift-left CI/CD security pipeline.

### Features

| Feature | Implementation |
|---|---|
| **PCI-DSS Score** | 11 controls scored PASS/WARN/FAIL — animated ring gauge |
| **11 PCI Controls** | Firewall, encryption, IAM, patch mgmt, audit trails, pen tests, etc. |
| **PMLA Audit Stream** | New log entry every 4s: DEPOSIT, WITHDRAW, KYC_VERIFY, CARD_ACCESS, etc. |
| **PII Masking** | HIGH severity events flagged `🔒PCI`, `change_diff` field is `[REDACTED]` |
| **Severity Filtering** | Filter logs by ALL / HIGH / MEDIUM in real-time |
| **Security Scanner** | Interactive scan: SAST → DAST → SCA → Secrets → SBOM |
| **Scanner Tools** | SonarQube, Snyk, gitleaks, Trivy (CVE), OWASP ZAP, Syft/Grype |
| **Progressive Findings** | Findings stream in one-by-one as scan progresses |
| **Auto-flag** | HIGH/CRITICAL findings emit console log entry with count |
| **7-Stage Pipeline** | Git Push → SAST → Build/SBOM → SCA → Staging → DAST → Prod Gate |

### API Endpoints

#### `GET /compliance` — PCI-DSS Controls

```bash
curl http://localhost:4003/compliance
```

```json
{
  "score": 82,
  "summary": { "pass": 9, "warn": 2, "fail": 0, "total": 11 },
  "controls": [
    {
      "id": "PCI-3.4", "category": "Data",
      "title": "PAN Data Encryption at Rest",
      "status": "PASS",
      "detail": "AES-256 via AWS KMS CMK (us-east-1)"
    }
  ]
}
```

#### `GET /audit-logs` — PMLA Event Stream

```bash
# Last 20 events (default)
curl http://localhost:4003/audit-logs

# Filter by severity
curl "http://localhost:4003/audit-logs?severity=HIGH&limit=10"
```

```json
{
  "id": "uuid",
  "timestamp": "2026-02-27T16:09:31.000Z",
  "user_id": "u_9f2a",
  "action": "CARD_ACCESS",
  "source_ip": "10.0.1.45",
  "request_id": "req_a1b2c3d4",
  "severity": "HIGH",
  "masked": true,
  "change_diff": "[REDACTED - PCI-DSS]",
  "status": "SUCCESS"
}
```

#### `POST /scan` — Trigger Security Scan

```bash
curl -X POST http://localhost:4003/scan \
  -H "Content-Type: application/json" -d '{}'
# Returns: { "scan_id": "uuid", "status": "RUNNING" }
```

#### `GET /scan/:id` — Poll Scan Progress

```bash
curl http://localhost:4003/scan/{scan_id}
```

```json
{
  "status": "RUNNING",
  "progress": 51,
  "findings": [
    {
      "severity": "HIGH",
      "tool": "Trivy",
      "title": "CVE-2024-29018 in base image",
      "desc": "node:18-alpine has unpatched OpenSSL. Rebuild with node:20-alpine",
      "cve": "CVE-2024-29018"
    }
  ]
}
```

### Dashboard Features (Security Comply tab)

- ✅ PCI-DSS score ring (animated SVG) — 0–100% compliance
- ✅ Control checklist: 11 controls, color-coded PASS/WARN/FAIL
- ✅ "Run Full Scan" button → progress bar streams findings live
- ✅ PMLA audit log terminal feed — auto-refreshes every 4s
- ✅ Log severity filter: ALL / HIGH / MED
- ✅ Security architecture cards: IAM/IRSA, mTLS, Secrets Rotation, WAF
- ✅ 7-stage shift-left CI/CD pipeline visualizer

---

## Showcase Dashboard

**Directory:** `showcase-portal/`  
**Port:** `8080`

A single `index.html` page with:
- Glassmorphism dark UI with animated gradients and micro-animations
- ApexCharts for real-time metrics (throughput, latency)
- Left sidebar navigation between all 4 rounds
- Auto-polling every 1–4 seconds per section

### Starting

```powershell
cd showcase-portal
npx live-server --port=8080 .
```

### Sidebar Navigation

| Tab Label | Round | Backend Port |
|---|---|---|
| Microservice Health | Round 1 | :54321 |
| Self-Service Portal | Round 2 | :4001 |
| K8s & Observability | Round 3 | :4002 |
| Security Comply | Round 4 | :4003 |

---

## Docker Compose Reference

```
d:\Projects\unio\docker-compose.yml
```

### Services & Dependencies

```
mysql (healthcheck: mysqladmin ping)
  └── user-service (depends_on mysql healthy)

idp-service         (standalone)
k8s-slo-service     (standalone)
security-service    (standalone)

dashboard (depends_on all 4 services, no health condition)
```

### Build & Run Targets

```powershell
# Build and start all (foreground)
docker-compose up --build

# Background mode
docker-compose up --build -d

# Only specific services (e.g. skip Docker for dev)
docker-compose up --build mysql user-service

# View all container status
docker-compose ps

# Follow logs for one service
docker-compose logs -f security-service

# Rebuild just one image
docker-compose build idp-service
docker-compose up -d idp-service

# Full teardown including volumes
docker-compose down -v --remove-orphans
```

---

## Helm Chart (K8s Deployment)

> For deploying to a real Kubernetes cluster (minikube, EKS, GKE, AKS).

**Location:** `helm/`

### Files

```
helm/
├── Chart.yaml           ← Umbrella chart, lists all 5 sub-charts
├── values.yaml          ← All service config: image, replicas, HPA, env
└── templates/
    └── deployment.yaml  ← Shared Deployment + Service + HPA template
```

### Deploy to minikube

```bash
# Start minikube
minikube start

# Build images into minikube's Docker daemon
eval $(minikube docker-env)
docker build -t unio/user-service:1.0.0   ./round-1-user-service
docker build -t unio/idp-service:1.0.0    ./round-2-platform-portal
docker build -t unio/k8s-slo-service:1.0.0 ./round-3-k8s-observability
docker build -t unio/security-service:1.0.0 ./round-4-security-design
docker build -t unio/dashboard:1.0.0       ./showcase-portal

# Create namespace
kubectl create namespace unio-prod

# Deploy umbrella chart
helm install unio ./helm --namespace unio-prod

# Check pods
kubectl get pods -n unio-prod

# Get dashboard URL
minikube service unio-dashboard -n unio-prod
```

### Upgrade / Rollback

```bash
# Upgrade after code change
helm upgrade unio ./helm --namespace unio-prod

# Rollback
helm rollback unio 1 --namespace unio-prod

# Uninstall
helm uninstall unio --namespace unio-prod
```

### Key values.yaml options

```yaml
# Scale user-service replicas
user-service:
  replicaCount: 3
  hpa:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    cpuUtilization: 70

# Point to custom ECR registry
global:
  imageRegistry: "123456789.dkr.ecr.us-east-1.amazonaws.com"

# Expose dashboard externally
dashboard:
  service:
    type: LoadBalancer
```

---

## Port Reference

| Service | Port | Protocol | Health Check URL |
|---|---|---|---|
| Showcase Dashboard | `8080` | HTTP | http://localhost:8080 |
| Round 1 — User Service | `54321` | HTTP | http://localhost:54321/metrics |
| Round 2 — IDP Backend | `4001` | HTTP | http://localhost:4001/dashboard |
| Round 3 — K8s/SLO API | `4002` | HTTP | http://localhost:4002/slo |
| Round 4 — Security API | `4003` | HTTP | http://localhost:4003/compliance |
| MySQL | `3306` | TCP | `docker-compose ps` |

---

## Project Structure

```
d:\Projects\unio\
│
├── README.md                              ← This file
├── docker-compose.yml                     ← Full stack: all 6 services
│
├── helm/                                  ← Kubernetes Umbrella Helm Chart
│   ├── Chart.yaml                         ← All sub-chart dependencies
│   ├── values.yaml                        ← Per-service config (image, HPA, env)
│   └── templates/
│       └── deployment.yaml                ← Shared Deployment+Service+HPA template
│
├── showcase-portal/
│   ├── index.html                         ← Unified dashboard (all 4 rounds)
│   └── Dockerfile
│
├── round-1-user-service/
│   ├── src/
│   │   ├── index.ts                       ← Entrypoint: server init, MySQL sync
│   │   ├── app.ts                         ← Fastify routes: POST /user, GET /user/:id, GET /metrics
│   │   ├── repository.ts                  ← Sequelize ORM + retry + circuit breaker + idempotency
│   │   └── metrics.ts                     ← Prometheus counters and histograms
│   ├── data/database.sqlite               ← Auto-created SQLite file
│   ├── Dockerfile                         ← node:20-alpine, exposes :54321
│   ├── .dockerignore
│   └── package.json
│
├── round-2-platform-portal/
│   ├── src/
│   │   └── index.ts                       ← IDP: /services, /deploy/:name, /deploy/:id, /dashboard
│   ├── templates/
│   │   ├── deployment.yaml.tmpl           ← K8s manifest template
│   │   └── pipeline.yaml.tmpl             ← CI/CD pipeline template
│   ├── terraform/
│   │   └── main.tf                        ← Terraform ECR + IAM definitions
│   ├── Dockerfile                         ← node:20-alpine, exposes :4001
│   ├── .dockerignore
│   └── package.json
│
├── round-3-k8s-observability/
│   ├── src/
│   │   └── index.ts                       ← K8s sim: /cluster, /slo, /alerts, /simulate/*
│   ├── k8s/
│   │   └── production.yaml                ← Real K8s manifest (Deployment+Service+HPA+PDB)
│   ├── helm/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/deployment.yaml      ← Helm template with FluentBit sidecar
│   ├── dashboards/
│   │   └── service-dashboard.json         ← Grafana dashboard definition
│   ├── SLO_DOCUMENT.md                    ← SLOs, SLIs, burn-rate alerts, compliance
│   ├── tracing-example.ts                 ← OpenTelemetry SDK setup
│   ├── Dockerfile                         ← node:20-alpine, exposes :4002
│   ├── .dockerignore
│   └── package.json
│
└── round-4-security-design/
    ├── src/
    │   └── index.ts                       ← Security API: /compliance, /audit-logs, /scan
    ├── SECURITY_DESIGN.md                 ← Full security design: SAST/DAST, IAM, mTLS, PCI-DSS, PMLA
    ├── Dockerfile                         ← node:20-alpine, exposes :4003
    ├── .dockerignore
    └── package.json
```

---

## Troubleshooting

### "Loading controls..." / blank tab in dashboard

The Security Comply or K8s tab shows loading state.

**Fix:**
1. Hard reload the browser: `Ctrl+Shift+R`
2. Check the backend is running: `Invoke-RestMethod http://localhost:4003/compliance`
3. Switch to the tab after all services are confirmed up

### Port already in use

```powershell
# Find what's using port 4003
Get-NetTCPConnection -LocalPort 4003 | Select-Object LocalPort, OwningProcess
Get-Process -Id <PID>

# Kill it
Stop-Process -Id <PID> -Force
```

### Docker container exits immediately

```powershell
# Check logs
docker-compose logs user-service

# Most common cause: MySQL not ready yet
# Solution: docker-compose down; docker-compose up --build
```

### MySQL connection refused (manual mode)

Ensure MySQL is running. Alternatively, **just remove `DB_HOST`** from your env to use SQLite (zero setup):

```powershell
Remove-Item Env:DB_HOST -ErrorAction SilentlyContinue
npx ts-node src/index.ts
```

### ts-node not found

```powershell
npm install  # inside the service directory first
npx ts-node src/index.ts  # use npx prefix
```

### Round 3 API returns stale data after incident injection

The `RUNNING → SUCCESS` SLO transition resets on restart. Restart the service to reset state:

```powershell
# Docker
docker-compose restart k8s-slo-service

# Manual — Ctrl+C then re-run ts-node
```

---

## Stopping All Services

### Docker Compose

```powershell
# Stop containers (keep volumes)
docker-compose down

# Stop and delete all data (fresh start)
docker-compose down -v
```

### Manual (Kill all Node.js processes)

```powershell
Get-Process node | Stop-Process -Force
```

### Manual (Kill by port)

```powershell
@(54321, 4001, 4002, 4003, 8080) | ForEach-Object {
    $port = $_
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "Killed process on :$port"
    }
}
```

---

## Why Docker Compose over Helm for this Showcase?

| | Docker Compose | Helm (K8s) |
|---|---|---|
| **Setup** | Docker Desktop only | minikube/kind + Helm CLI |
| **Start command** | `docker-compose up` | minikube start + helm install |
| **Windows support** | ✅ Native | ⚠️ Extra setup needed |
| **Demo use case** | ✅ Best for demos | ✅ Best for real clusters |
| **Interview eval** | ✅ Zero friction | ⚠️ Needs K8s cluster running |
| **Config management** | `docker-compose.yml` | `helm/values.yaml` |
| **Scaling** | Manual `--scale` flag | HPA + `replicaCount` |

**Recommendation:**
- 🚀 **For demo / evaluation → `docker-compose up --build`**
- ☸️ **For K8s cluster deployment → `helm install unio ./helm`**

---

*Built for Platform SRE / FinTech Engineering Assessment — February 2026*
