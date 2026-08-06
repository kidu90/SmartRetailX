# SmartRetailX Security

This document describes the security model for the SmartRetailX distributed retail platform: authentication, authorization, network controls, secrets handling, and compliance considerations (GDPR / PCI-DSS).

## Threat model

| Threat | Example | Mitigations |
|--------|---------|-------------|
| **API abuse** | Credential stuffing, brute-force login, scraping | Short-lived access JWTs; refresh-token rotation; `express-rate-limit` on `/auth/login`; bcrypt cost factor ≥ 12 |
| **Token theft** | XSS / malware steals Bearer token | Access token TTL **15m**; refresh tokens hashed at rest and rotated; `typ=access` enforced by middleware; HTTPS-only at the edge |
| **Lateral movement** | Compromised pod calls other services freely | Kubernetes NetworkPolicies (gateway → backends only; order → catalogue); IRSA roles scoped per service; no shared node IAM for app secrets |
| **Data exfiltration** | Dumping PII / catalogue / orders | Private subnets; RDS SG allows EKS nodes only; encryption at rest (RDS / DynamoDB / S3 SSE); least-privilege Secrets Manager ARNs |
| **Privilege escalation** | Customer mutates catalogue or fulfills orders | RBAC roles (`customer`, `admin`, `warehouse_staff`); gateway + service dual enforcement |
| **Card data exposure** | Storing PAN/CVV in order DB | Payment path tokenizes via mock PSP; only opaque `paymentToken` retained (PCI-DSS SAQ A intent) |

## Zero Trust mapping

| Zero Trust principle | Implementation |
|----------------------|----------------|
| **Verify every request** | JWT access token verified on gateway (edge) **and** again in catalogue/order/user services (`@smartretailx/auth-middleware`) |
| **Least privilege** | IRSA policies with explicit secret/table/topic ARNs — no `Resource: "*"` |
| **Assume breach / segment** | NetworkPolicy denies east-west traffic except approved peers; backends are ClusterIP-only |
| **Encrypt in transit** | ALB terminates TLS (ACM). Internal cluster traffic stays on the VPC CNI fabric; NetworkPolicy limits who can speak to whom. Full mTLS (service mesh) is the recommended next step |
| **Encrypt at rest** | Aurora storage encryption, DynamoDB SSE, S3 SSE-S3/KMS |

### TLS termination (ALB) and internal traffic

```
Client --HTTPS--> ALB (ACM cert) --HTTP--> gateway pods --HTTP--> services
```

- Terraform module `infra/modules/acm` issues a **regional** ACM certificate for `api.<domain>`.
- Output `acm_certificate_arn` is applied to the Ingress annotation:

  `alb.ingress.kubernetes.io/certificate-arn`
  plus `ssl-redirect: "443"` (see `k8s/base/ingress.yaml`).

- **Between gateway and internal services**, traffic is confined by NetworkPolicy (zero-trust segmentation). Pods do not expose NodePorts. For stricter assurance, add a mesh (Istio/Linkerd) for **mTLS** without changing application code.

## Authentication & RBAC

### Token model (OAuth2-style)

| Token | Lifetime | Claims | Storage |
|-------|----------|--------|---------|
| **Access** | 15m (`JWT_EXPIRES_IN`) | `sub`, `email`, `role`, `typ=access`, `jti` | Client memory / Authorization header |
| **Refresh** | 7d | `typ=refresh`, `jti` | Client; server stores **bcrypt hash** of token by `jti` |

Endpoints: `POST /api/v1/auth/register|login|refresh|logout`.

### Sample decoded access JWT payload

```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "shopper@example.com",
  "role": "customer",
  "typ": "access",
  "jti": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "iat": 1735689600,
  "exp": 1735690500
}
```

### RBAC decision table

| Action | customer | warehouse_staff | admin |
|--------|:--------:|:---------------:|:-----:|
| Register / login / refresh | ✓ | ✓ | ✓ |
| Read catalogue (GET) | ✓ (public) | ✓ | ✓ |
| Create/update/delete product or category | ✗ → **403** | ✓ | ✓ |
| Create / list / get **own** orders | ✓ | ✗* | ✓ |
| Patch order status (fulfillment) | ✗ → **403** | ✓ | ✓ |
| DELETE `/users/me` (erasure) | ✓ (self) | ✓ (self) | ✓ (self) |

\* Warehouse staff use status APIs, not customer order creation, in this scaffold.

Shared package: [`packages/auth-middleware`](./packages/auth-middleware) — `authenticate` + `requireRoles`.

## Secrets Manager + IRSA

Services call `@smartretailx/secrets-client` at startup when `USE_SECRETS_MANAGER=true`:

```javascript
const { loadServiceSecrets } = require('@smartretailx/secrets-client');
const secrets = await loadServiceSecrets({
  jwtSecretId: process.env.JWT_SECRET_ARN,
  dbSecretId: process.env.DB_SECRET_ARN,
});
// secrets.jwtSecret, secrets.database.{host,user,password,...}
```

Corresponding IAM (IRSA) fragment — **no wildcards**:

```json
{
  "Sid": "ReadJwtSecret",
  "Effect": "Allow",
  "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
  "Resource": ["arn:aws:secretsmanager:REGION:ACCOUNT:secret:smartretailx-dev/jwt/signing-key-XXXX"]
}
```

Roles are defined in `infra/modules/iam` for `user-service`, `order-service`, `catalogue-service`, and `gateway`. Annotate Kubernetes ServiceAccounts with `eks.amazonaws.com/role-arn`.

## GDPR

| Control | Where |
|---------|--------|
| **Data minimisation** | Public user DTO exposes `id`, `email`, `name`, `role`, `createdAt` only — no password hashes |
| **Right to erasure** | `DELETE /api/v1/users/me` removes the user and revokes refresh tokens |
| **Encryption at rest** | RDS, DynamoDB, S3 SSE as provisioned by Terraform |
| **Access control** | JWT + RBAC; audit via ALB / app logs (extend with CloudTrail) |

## PCI-DSS considerations

- **Never store raw card data (PAN/CVV)** in SmartRetailX databases.
- `order-service` payment client calls `tokenizeCard()` (mock PSP) and persists only an opaque `paymentToken` (`tok_mock_…`).
- Prefer a SAQ A / hosted fields model in production (Stripe Elements, Adyen Drop-in) so the retail platform never touches PANs.
- Restrict payment-service network access; log tokens redacted.

## Shared packages

| Package | Purpose |
|---------|---------|
| `@smartretailx/auth-middleware` | JWT verify + RBAC for all Node services |
| `@smartretailx/secrets-client` | Secrets Manager loader with local env fallback |

## Related files

- Auth flow collection: [`docs/SmartRetailX-Auth.postman_collection.json`](./docs/SmartRetailX-Auth.postman_collection.json)
- HTTP script: [`docs/auth-flow.http`](./docs/auth-flow.http)
- NetworkPolicies: `k8s/base/*/networkpolicy.yaml`
- ACM / ALB TLS: `infra/modules/acm`, `k8s/base/ingress.yaml`
