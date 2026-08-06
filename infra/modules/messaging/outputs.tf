output "order_events_topic_arn" {
  description = "SNS topic ARN for platform domain events"
  value       = aws_sns_topic.order_events.arn
}

output "notification_queue_arn" {
  description = "SQS queue ARN for notification-service"
  value       = aws_sqs_queue.consumer["notification"].arn
}

output "notification_queue_url" {
  value = aws_sqs_queue.consumer["notification"].url
}

output "notification_dlq_arn" {
  value = aws_sqs_queue.dlq["notification"].arn
}

output "inventory_queue_arn" {
  value = aws_sqs_queue.consumer["inventory"].arn
}

output "inventory_queue_url" {
  value = aws_sqs_queue.consumer["inventory"].url
}

output "payment_queue_arn" {
  value = aws_sqs_queue.consumer["payment"].arn
}

output "payment_queue_url" {
  value = aws_sqs_queue.consumer["payment"].url
}

output "order_saga_queue_arn" {
  value = aws_sqs_queue.consumer["order"].arn
}

output "order_saga_queue_url" {
  value = aws_sqs_queue.consumer["order"].url
}

output "event_bus_name" {
  value = aws_cloudwatch_event_bus.smartretailx.name
}

output "event_bus_arn" {
  value = aws_cloudwatch_event_bus.smartretailx.arn
}
