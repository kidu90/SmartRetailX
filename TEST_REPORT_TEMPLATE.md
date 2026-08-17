# Test Report Template — SmartRetailX

Fill this after k6 + Newman runs. Attach CloudWatch dashboard / alarm screenshots.

## Environment

| Item | Value |
|------|--------|
| Date | |
| Git commit / tag | |
| Target (gateway URL) | |
| Region | ap-south-1 |
| CloudWatch dashboard URL | `terraform output cloudwatch_dashboard_url` |

---

## 1. Functional / API (Newman)

| Suite | Pass | Fail | Report path |
|-------|------|------|-------------|
| `testing/newman` | | | `testing/newman/reports/newman-report.html` |

Key evidence to tick:

- [ ] Auth login + `/me` 401 negatives
- [ ] Catalogue RBAC 403 (customer create product)
- [ ] Inventory RBAC 403 (customer PATCH stock)
- [ ] Order ownership 403 (other customer)

---

## 2. Performance (k6)

Scripts: `testing/k6/load-test.js`, `stress-test.js`, `spike-test.js` (order creation).

### Latency (ms)

| Scenario | p50 | p90 | p95 | p99 |
|----------|-----|-----|-----|-----|
| Load | | | | |
| Stress | | | | |
| Spike | | | | |

### Throughput & errors

| Scenario | req/s (approx) | http_reqs | http_req_failed % |
|----------|----------------|-----------|-------------------|
| Load | | | |
| Stress | | | |
| Spike | | | |

Paste k6 summary JSON/CLI excerpt below:

```
(paste here)
```

---

## 3. CloudWatch evidence during k6

| Screenshot | What it shows |
|------------|----------------|
| Dashboard — RequestCount / Latency / ServerErrorCount | EMF app metrics under load |
| Dashboard — pod CPU / memory | Container Insights |
| Dashboard — SQS depth | Backlog under stress |
| Alarm state ALARM | e.g. EMF 5xx or ALB 5xx |
| SNS email | Alarm notification |

Dashboard URL: _______________________________

---

## 4. Bottleneck analysis

Describe where the system saturated and why (reference screenshots):

1. **Suspected bottleneck** (gateway / catalogue / order-service / DB / SQS):
2. **Evidence** (p99 latency rise, 5xx EMF, pod CPU, queue depth):
3. **Mitigation** (HPA scale-out, breaker fallback, capacity, query fix):
4. **Follow-up actions**:

---

## 5. Resilience / DR notes

| Check | Result |
|-------|--------|
| Circuit breaker fallback observed (503 CIRCUIT_OPEN) | |
| HPA scaled during stress | |
| Alarm email received | |
| DR drill RTO / RPO (see `DR.md`) | |

---

## 6. Sign-off

| Role | Name | Date |
|------|------|------|
| Author | | |
| Reviewer | | |
