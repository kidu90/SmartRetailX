# Eventing

SmartRetailX uses domain events for the order placement saga (inventory reserve → payment → status updates).

| Mode | When | Transport |
|------|------|-----------|
| `local` | Unit tests / single process | In-process bus |
| `http` | Docker Compose | HTTP fan-out to `/internal/events` (resilient-http) |
| `aws` | EKS / AWS | SNS `order-events` → SQS per consumer + DLQs |

Services: order-service (orchestrator), inventory-service, payment-service, notification-service (WebSocket bridge).

See also: saga code under `services/order-service/src/saga/`, `packages/events/`, Terraform `infra/modules/messaging`.
