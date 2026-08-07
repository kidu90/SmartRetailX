output "ops_alerts_topic_arn" {
  value = aws_sns_topic.ops_alerts.arn
}

output "ops_alerts_topic_name" {
  value = aws_sns_topic.ops_alerts.name
}
