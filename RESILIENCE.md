# Resilience

How SmartRetailX survives partial failure, traffic spikes, and AZ loss.

## Application: retry + circuit breaker (opossum)

Shared library: `@smartretailx/resilient-http`.

| Default | Value |
|---------|-------|
| Request timeout | 3–4s |
| Retries | 2 (exponential backoff) |
| Breaker error threshold | 50% |
| Volume threshold | 5 requests |
| Reset / half-open | 10s |

**Used by**

- Gateway → upstream proxies (`createProxyBreaker` + 503 fallback JSON)
- order-service → catalogue + payment HTTP clients (`createResilientClient`)
- `@smartretailx/events` HTTP fan-out publishers

When the breaker is open, callers receive a **fallback** (503 with `code: CIRCUIT_OPEN`) instead of hanging. The React UI surfaces these as toasts.

## Kubernetes: HPA + PDB

| Control | Purpose |
|---------|---------|
| **HPA** (`k8s/base/*/hpa.yaml`) | Scales replicas on CPU ~70% / memory ~80%. Dev max 5; prod max 10. |
| **PDB** (`pdb.yaml`) | `minAvailable: 1` (prod overlay `2`) so rolling updates / node drains never take all pods offline. |
| Readiness / liveness | `/ready`, `/health` — traffic only to healthy pods. |
| Rolling updates | Deployment strategy + PDB → zero-downtime deploys. |

## Multi-AZ node groups

Terraform `modules/eks` places the managed node group on **private subnets across AZs** from `modules/vpc` (`az_count = 2`). If one AZ fails:

- Remaining nodes in the other AZ keep serving.
- HPA can scale up on surviving capacity.
- Aurora reader/writer endpoints (see `DR.md`) continue from the surviving AZ.

## Gateway readiness

`GET /ready` on the gateway includes upstream breaker status so load balancers can shed traffic when too many circuits are open.
