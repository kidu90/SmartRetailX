output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "eks_node_security_group_id" {
  value = module.eks.node_security_group_id
}

output "rds_cluster_endpoint" {
  value = module.rds.cluster_endpoint
}

output "rds_reader_endpoint" {
  value = module.rds.reader_endpoint
}

output "dynamodb_table_name" {
  value = module.dynamodb.table_name
}

output "cloudfront_domain_name" {
  value = module.cloudfront.domain_name
}

output "s3_assets_bucket" {
  value = module.s3.bucket_id
}

output "sns_order_events_arn" {
  value = module.messaging.order_events_topic_arn
}

output "sqs_notification_arn" {
  value = module.messaging.notification_queue_arn
}

output "sqs_inventory_url" {
  value = module.messaging.inventory_queue_url
}

output "sqs_payment_url" {
  value = module.messaging.payment_queue_url
}

output "sqs_order_saga_url" {
  value = module.messaging.order_saga_queue_url
}

output "event_bus_name" {
  value = module.messaging.event_bus_name
}

output "lambda_notification_arn" {
  value = module.lambda.function_arn
}

output "route53_zone_id" {
  value = module.route53.zone_id
}

output "route53_name_servers" {
  value = module.route53.name_servers
}

output "irsa_user_service_role_arn" {
  value = module.iam.user_service_role_arn
}

output "irsa_order_service_role_arn" {
  value = module.iam.order_service_role_arn
}

output "irsa_catalogue_service_role_arn" {
  value = module.iam.catalogue_service_role_arn
}

output "secrets_db_arn" {
  value = module.secrets.db_secret_arn
}

output "secrets_jwt_arn" {
  value = module.secrets.jwt_secret_arn
}

output "acm_certificate_arn" {
  description = "Regional ACM cert ARN — set on ALB Ingress annotation alb.ingress.kubernetes.io/certificate-arn"
  value       = module.acm.validated_certificate_arn
}

output "irsa_gateway_role_arn" {
  value = module.iam.gateway_role_arn
}

output "ops_alerts_topic_arn" {
  value       = module.cloudwatch_alarms.ops_alerts_topic_arn
  description = "SNS topic for CloudWatch ops alarms (5xx, latency, pod restarts, SQS depth)"
}

output "cloudwatch_dashboard_url" {
  value       = module.monitoring.dashboard_console_url
  description = "CloudWatch ops dashboard — open for report screenshots"
}

output "fluent_bit_role_arn" {
  value = module.monitoring.fluent_bit_role_arn
}

output "xray_daemon_role_arn" {
  value = module.monitoring.xray_daemon_role_arn
}
