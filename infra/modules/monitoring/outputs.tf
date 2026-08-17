output "log_group_names" {
  value = { for k, g in aws_cloudwatch_log_group.service : k => g.name }
}

output "fluent_bit_role_arn" {
  value = aws_iam_role.fluent_bit.arn
}

output "xray_daemon_role_arn" {
  value = aws_iam_role.xray_daemon.arn
}

output "dashboard_name" {
  value = aws_cloudwatch_dashboard.ops.dashboard_name
}

output "dashboard_arn" {
  value = aws_cloudwatch_dashboard.ops.dashboard_arn
}

output "dashboard_console_url" {
  description = "Open this URL for CloudWatch dashboard evidence screenshots"
  value       = "https://${data.aws_region.current.id}.console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.id}#dashboards:name=${aws_cloudwatch_dashboard.ops.dashboard_name}"
}
