# Local monitoring (Prometheus + Grafana)

## Start

```bash
# From repo root — start app services first (npm or docker compose)
docker compose -f monitoring/docker-compose.yml up -d
```

| UI | URL | Credentials |
|----|-----|-------------|
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3100 | `admin` / `admin` |

Dashboard **SmartRetailX Service Overview** is auto-provisioned (latency, error rate, request rate).

## Scraping

`prometheus/prometheus.yml` scrapes `/metrics` on ports 3000–3006 via `host.docker.internal`.  
Each service exposes Prometheus text format via `@smartretailx/metrics`.

## Tracing

Set `OTEL_ENABLED=true` and `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` on services to export OpenTelemetry traces (pair with an OTLP collector / ADOT → AWS X-Ray in EKS).
