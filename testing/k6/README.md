# k6 performance scripts

| Script | Purpose |
|--------|---------|
| `load-test.js` | Steady **100 VUs** for 5m |
| `stress-test.js` | Ramp to 600 VUs to find breaking point |
| `spike-test.js` | Sudden jump 20 → 300 VUs |

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/)
- Running gateway (+ deps), or EKS ingress URL

```bash
export BASE_URL=http://localhost:3000
# optional: PRODUCT_ID=<uuid from catalogue seed>

k6 run testing/k6/load-test.js
k6 run testing/k6/stress-test.js
k6 run testing/k6/spike-test.js
```

Paste summary metrics into `TEST_REPORT_TEMPLATE.md`.
