output "table_name" {
  description = "Catalogue DynamoDB table name"
  value       = aws_dynamodb_table.catalogue.name
}

output "table_arn" {
  description = "Catalogue DynamoDB table ARN"
  value       = aws_dynamodb_table.catalogue.arn
}

output "table_stream_arn" {
  description = "Stream ARN if enabled"
  value       = try(aws_dynamodb_table.catalogue.stream_arn, null)
}
