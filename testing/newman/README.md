# SmartRetailX Newman API tests

Automated API testing and evidence capture via [Newman](https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman/) (Postman CLI).

## Prerequisites

Start the stack (gateway + services) first, for example:

```bash
docker compose up -d
# or run each service locally on ports 3000–3006
```

## Install & run

From this folder:

```bash
cd testing/newman
npm install
npm run test:api
```

From the repo root:

```bash
npm run test:api
```

## Where to view the report

After a run, open the HTML evidence report:

**`testing/newman/reports/newman-report.html`**

(full path: `/Users/masha/Desktop/SmartRetailX/testing/newman/reports/newman-report.html`)

Open it in a browser (double-click, or `open testing/newman/reports/newman-report.html` on macOS).

CLI results also print in the terminal. Exit code is non-zero if any assertion fails.

## Collection layout (execution order)

| Folder | Purpose |
|--------|---------|
| `01 Auth` | Register/login customer + admin, refresh, `/me`, 401 negatives |
| `02 Catalogue` | Category + product CRUD, **403 RBAC** when customer creates a product |
| `03 Inventory` | Stock GET, **403 RBAC** PATCH as customer, PATCH as admin |
| `04 Orders` | Create/list/get order, **ownership** check (other customer → 403) |
| `05 Health & Observability` | `/health` + `/metrics` for gateway and all services |
| `06 Cleanup` | DELETE product (after orders/inventory so `productId` stays valid) |

Tokens and IDs (`customerToken`, `adminToken`, `productId`, `orderId`, …) are written into the environment by test scripts — no manual copy-paste.

## Files

| File | Role |
|------|------|
| `smartretailx.postman_collection.json` | Collection v2.1 |
| `dev.postman_environment.json` | Local URLs + runtime placeholders |
| `reports/newman-report.html` | Generated evidence (gitignored) |
