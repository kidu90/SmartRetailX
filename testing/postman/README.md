# Postman / Newman API tests

Collection: `SmartRetailX-Full.postman_collection.json`

## Import in Postman

File → Import → select the JSON file. Set `baseUrl` (default `http://localhost:3000`).

## Newman (CI)

```bash
npm install -g newman
# or: npx newman

newman run testing/postman/SmartRetailX-Full.postman_collection.json \
  --env-var "baseUrl=http://localhost:3000" \
  --reporters cli,junit \
  --reporter-junit-export testing/postman/newman-results.xml
```

Exit code is non-zero if assertions fail — suitable for CI gates.
