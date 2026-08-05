# SmartRetailX Architecture

## Overview

SmartRetailX is a cloud-native retail platform decomposed into independent Express.js microservices behind a lightweight API Gateway. Each service owns its domain data (in-memory for this scaffold) and exposes a versioned REST API under `/api/v1`.

```
Client
  │
  ▼
API Gateway (:3000)
  ├─ /users/*      → user-service      (:3001)
  ├─ /catalogue/*  → catalogue-service (:3002)
  └─ /orders/*     → order-service     (:3003)
                         │
                         ├─ REST → catalogue-service (product lookup / stock)
                         ├─ REST → payment-service   (charge; stubbed locally)
                         └─ async events on status change
```

## Service boundaries

| Service | Responsibility |
|---------|----------------|
| **user-service** | Registration, login, profile; issues JWTs |
| **catalogue-service** | Products, categories, search |
| **order-service** | Order lifecycle; orchestrates catalogue + payment; publishes status events |
| **gateway** | Single entry point, path-based routing, aggregated Swagger UI |

## Inter-service communication: REST vs async

### Synchronous REST (request/response)

Used when the caller **needs an immediate answer** to complete the current transaction:

1. **order-service → catalogue-service**  
   Creating an order must resolve product price, name, and stock *before* the order is persisted. A failed catalogue lookup should fail the HTTP request to the client. REST is the right fit.

2. **order-service → payment-service**  
   Payment authorization is part of the order-creation critical path. The order cannot be marked `paid` without a payment result. Again, synchronous REST.

Trade-offs accepted: tighter coupling and cascading latency/failure. Mitigations in production would include timeouts, retries with idempotency keys, circuit breakers, and a dedicated payment saga/outbox.

### Asynchronous events (pub/sub)

Used when **other systems should react** but the caller does not need their reply:

- On every order status transition (`pending` → `paid` → `processing` → …), order-service publishes `order.status.changed`.
- Downstream consumers (notifications, inventory sync, analytics, shipping) can subscribe without blocking the status API.

In this scaffold the event bus is an in-process `EventEmitter` that logs events—ready to swap for Kafka, NATS, or SNS/SQS without changing the domain API.

### Rule of thumb used here

| Need | Choice |
|------|--------|
| Must succeed/fail with this request | **REST** |
| Notify others; eventual consistency OK | **Async events** |
| Cross-service query for display only | Prefer **API composition at the gateway** or BFF later |

## Health & readiness

Every service exposes:

- `GET /health` – process is up
- `GET /ready` – service can accept traffic (store reachable / counts)

The gateway and Compose healthchecks use these endpoints for dependency ordering.
