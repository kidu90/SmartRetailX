# SmartRetailX — Project Summary (Appendix)

Maps repository paths to the assignment’s **8 tasks**. Use as a report appendix index.

| Task | Theme |
|------|--------|
| **1** | Cloud architecture design (AWS) |
| **2** | Distributed microservices & API |
| **3** | Security, JWT, RBAC |
| **4** | Real-time events & sync |
| **5** | Resilience & DR |
| **6** | Performance testing (k6) |
| **7** | Observability |
| **8** | Testing strategy (unit/API/E2E) |

---

## Top-level layout

| Path | Primary task(s) | Role |
|------|-----------------|------|
| `frontend/` | **2**, 3, 4, 5, 7, **8** | React/Vite UI, RTL + Playwright |
| `services/` | **2**, 4, 5, 7 | Domain microservices |
| `gateway/` | **2**, 3, 5, 7 | API gateway, JWT edge, resilient proxy |
| `packages/` | **2**, 3, 4, 5, 7 | Shared libraries (incl. EMF + X-Ray) |
| `k8s/` | **2**, 5, **7** | Manifests, HPA, PDB, Fluent Bit, X-Ray daemon |
| `infra/` | **1**, 5, **7** | Terraform (ap-south-1) — CW Logs, dashboard, alarms |
| `testing/k6/` | **6** | Load / stress / spike |
| `testing/newman/` | **8** | Newman API tests + HTML evidence reports |
| `docs/` | **3**, 8 | Auth Postman + `.http` |
| `docker-compose.yml` | **2** | Local stack + frontend `:8080` |
| `ARCHITECTURE.md` | **1**, **2** | Design narrative |
| `SECURITY.md` | **3** | Threat model |
| `EVENTING.md` | **4** | Saga / messaging |
| `RESILIENCE.md` / `DR.md` | **5** | Breakers + RTO/RPO |
| `OBSERVABILITY.md` | **7** | CloudWatch Logs / Insights / EMF / X-Ray |
| `TEST_REPORT_TEMPLATE.md` | **6**, **8** | Results tables + CW screenshot placeholders |
| `PROJECT_SUMMARY.md` | — | This appendix |

---

## Frontend screens → report evidence

| Screen / route | Evidence for |
|----------------|--------------|
| `/login`, `/register` + navbar role chip | Task **3** — JWT auth |
| `/catalogue` + RBAC 403 | Task **3** — backend 403; Task **2** — API |
| `/cart`, `/checkout` | Task **2** — order API |
| `/orders`, `/orders/:id` event log + live badge | Task **4** — WebSocket sync |
| `/inventory` (ProtectedRoute) | Task **3** frontend RBAC + Task **4** stock events |
| `/admin/dashboard` health + CloudWatch link | Task **7** |
| Toast on 502/503 fallback | Task **5** |
| `npm test` + Playwright e2e | Task **8** |

---

## Task 5 — Resilience

| Path | Notes |
|------|--------|
| `packages/resilient-http`, `RESILIENCE.md`, `DR.md` | opossum, HPA, Multi-AZ, Aurora/S3 RTO/RPO |
| Frontend toasts | Surfaces breaker fallbacks |

## Task 6 — Performance

| Path | Notes |
|------|--------|
| `testing/k6/` | load / stress / spike |
| `TEST_REPORT_TEMPLATE.md` | Latency/throughput tables |

## Task 7 — Observability (CloudWatch only)

| Path | Notes |
|------|--------|
| `OBSERVABILITY.md` | Overview |
| `packages/logger` | Structured JSON → stdout (no direct CW ship from app) |
| `packages/emf-metrics` | CloudWatch EMF business metrics |
| `packages/tracing` | AWS X-Ray SDK (+ optional OTel) |
| `k8s/base/observability/` | Fluent Bit + X-Ray DaemonSets |
| `infra/modules/monitoring` | Log groups, Fluent Bit/X-Ray IRSA, Container Insights add-on, **dashboard** |
| `infra/modules/cloudwatch-alarms` | 5xx / p99 / pod restarts / SQS depth → SNS email |
| `terraform output cloudwatch_dashboard_url` | Screenshot evidence |

## Task 8 — Testing

| Path | Notes |
|------|--------|
| Jest + `testing/newman` (HTML reports) | |
| `frontend/src/test/*`, `frontend/e2e/*` | RTL + Playwright |
| `TEST_REPORT_TEMPLATE.md` | Fill after runs |
