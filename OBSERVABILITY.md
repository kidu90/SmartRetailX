# Observability — CloudWatch only

SmartRetailX ships **structured JSON logs to stdout**, **CloudWatch Embedded Metric Format (EMF)** for business metrics, **Container Insights** for pod/node infra metrics, and **AWS X-Ray** for distributed tracing. There is **no Prometheus/Grafana** dependency for the assignment evidence path.

## Architecture

```
Pod stdout (pino JSON)
    → Fluent Bit DaemonSet
    → CloudWatch Logs  (/smartretailx/<service>)

EMF log lines (aws-embedded-metrics)
    → same stdout / Fluent Bit
    → CloudWatch Metrics namespace SmartRetailX

Container Insights (EKS add-on + node CW agent policy)
    → ContainerInsights metrics (CPU, memory, restarts)

aws-xray-sdk → UDP :2000 → X-Ray DaemonSet → AWS X-Ray
```

## Logging

| Piece | Location |
|-------|----------|
| App logger | `@smartretailx/logger` (pino → stdout JSON). Apps do **not** call CloudWatch APIs. |
| Shipper | `k8s/base/observability/` Fluent Bit DaemonSet (`aws-for-fluent-bit`) |
| Log groups | Terraform `infra/modules/monitoring` — `/smartretailx/user-service`, `/smartretailx/order-service`, … (14d retention in **dev**, 30d in **prod**) |
| IRSA | `fluent_bit_role_arn` output — annotate SA `fluent-bit` in `amazon-cloudwatch` |

## Metrics — two layers

### Container Insights (infra — zero app code)

- Enabled via EKS add-on `amazon-cloudwatch-observability` (`enable_container_insights`)
- Node role attaches `CloudWatchAgentServerPolicy`
- Examples: `pod_cpu_utilization`, `pod_memory_utilization`, `pod_number_of_container_restarts`

### EMF (application — app emits structured metric lines)

Package: `@smartretailx/emf-metrics` (namespace **`SmartRetailX`**, dimension **`Service`**).

| Metric | Meaning |
|--------|---------|
| `RequestCount` | HTTP requests |
| `Latency` | Request duration (ms) |
| `ServerErrorCount` | HTTP 5xx |
| `RbacDeniedCount` | HTTP 403 |
| `OrdersCreated` | Successful order create |
| `CheckoutFailures` | Failed order create |

Wired automatically by `instrumentExpress` (HTTP) and order-service (OrdersCreated / CheckoutFailures).

Local `GET /metrics` (prom-client) remains for health/Newman probes only — **not** used for CloudWatch evidence.

## Tracing (X-Ray)

1. Set `AWS_XRAY_ENABLED=true` on services (ConfigMap).
2. Set `AWS_XRAY_DAEMON_ADDRESS` to the node host IP `:2000` (DaemonSet `hostPort`) or `xray-daemon.amazon-cloudwatch:2000`.
3. `@smartretailx/tracing` loads **aws-xray-sdk** (inbound Express segments + outbound HTTP capture). SNS publish uses `captureAWSv3Client` when X-Ray is on.
4. Cluster-wide DaemonSet: `k8s/base/observability/xray-daemonset.yaml` + IRSA `xray_daemon_role_arn`.

Optional alternative: `OTEL_ENABLED=true` + ADOT collector → X-Ray (OTLP).

## Dashboard & alarms (Terraform)

| Resource | Module |
|----------|--------|
| Ops dashboard | `infra/modules/monitoring` → `aws_cloudwatch_dashboard` |
| Console URL | `terraform output cloudwatch_dashboard_url` |
| Alarms | `infra/modules/cloudwatch-alarms` — ALB 5xx/p99, EMF gateway 5xx/p99, pod restarts, SQS depth |
| SNS | `${name_prefix}-ops-alerts` + optional `alert_email` subscription |

### Trigger evidence once

1. Confirm SNS email subscription.
2. Scale/stop a backend or run `testing/k6` stress past capacity.
3. Screenshot: CloudWatch alarm **ALARM** state + SNS email + dashboard spike.

## Admin UI

Admin dashboard links to CloudWatch (set `VITE_CLOUDWATCH_DASHBOARD_URL` from Terraform output). Grafana is removed.
