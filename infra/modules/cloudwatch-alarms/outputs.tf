output "ops_alerts_topic_arn" {
  value = aws_sns_topic.ops_alerts.arn
}

output "ops_alerts_topic_name" {
  value = aws_sns_topic.ops_alerts.name
}

output "alarm_names" {
  value = compact(concat(
    [aws_cloudwatch_metric_alarm.emf_gateway_5xx.alarm_name],
    [aws_cloudwatch_metric_alarm.emf_gateway_latency.alarm_name],
    [aws_cloudwatch_metric_alarm.pod_restarts.alarm_name],
    try([aws_cloudwatch_metric_alarm.alb_high_5xx[0].alarm_name], []),
    try([aws_cloudwatch_metric_alarm.alb_high_latency[0].alarm_name], []),
    [for a in aws_cloudwatch_metric_alarm.sqs_depth : a.alarm_name],
  ))
}
