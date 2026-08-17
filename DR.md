# Disaster Recovery (DR)

## Targets

| Metric | Dev | Prod (target) | Notes |
|--------|-----|---------------|-------|
| **RTO** (recovery time) | ≤ 4 hours | ≤ 1 hour | Restore service path (EKS + Aurora + config) |
| **RPO** (data loss) | ≤ 24 hours | ≤ 5 minutes | Aurora automated backups + PITR where enabled; S3 versioning for assets |

Document actual measured values in `TEST_REPORT_TEMPLATE.md` after a restore drill.

## How AWS building blocks support RTO/RPO

### Aurora Multi-AZ + automated snapshots

- Cluster spans **multiple AZs** via DB subnet group (`infra/modules/rds`).
- Writer failure → Aurora promotes a replica / replaces the writer in another AZ (RTO minutes for HA failover; full region restore is longer).
- **`backup_retention_period`**: short in dev (cost), longer in prod — automated continuous backups enable restore to a point in time (RPO ≈ seconds–minutes when PITR is on).
- Storage encryption + `copy_tags_to_snapshot` keep restore artifacts identifiable.

### S3 versioning (assets)

- `aws_s3_bucket_versioning` on the assets bucket (`infra/modules/s3`).
- Accidental overwrite/delete → restore a prior object version (RPO ≈ 0 for versioned objects).
- Lifecycle rules expire noncurrent versions to control cost.

### EKS / compute

- Multi-AZ node group + HPA/PDB (see `RESILIENCE.md`) restore capacity without redeploying the control plane from scratch.
- Container images in ECR; manifests in `k8s/` — re-apply with `kubectl` / CI for RTO after cluster loss.

### Messaging

- SNS/SQS with **DLQs** (`infra/modules/messaging`) — poison messages do not block recovery; replay from DLQ after fix.

## Suggested drill (evidence)

1. Snapshot / note Aurora restore point.
2. Delete a non-prod object version in S3 and restore it — screenshot.
3. Optionally cordon an AZ’s nodes (or stop a node group) and show HPA/PDB keeping API healthy — screenshot CloudWatch dashboard.
4. Record wall-clock RTO/RPO in the test report.
