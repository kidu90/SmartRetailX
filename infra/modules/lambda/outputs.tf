output "function_name" {
  value = aws_lambda_function.notification.function_name
}

output "function_arn" {
  value = aws_lambda_function.notification.arn
}

output "role_arn" {
  value = aws_iam_role.notification.arn
}
