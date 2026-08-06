output "order_events_topic_arn" {
  description = "SNS topic ARN for order events"
  value       = aws_sns_topic.order_events.arn
}

output "notification_queue_arn" {
  description = "SQS queue ARN for notification-service"
  value       = aws_sqs_queue.notification.arn
}

output "notification_queue_url" {
  value = aws_sqs_queue.notification.url
}

output "notification_dlq_arn" {
  value = aws_sqs_queue.notification_dlq.arn
}

output "event_bus_name" {
  value = aws_cloudwatch_event_bus.smartretailx.name
}

output "event_bus_arn" {
  value = aws_cloudwatch_event_bus.smartretailx.arn
}
