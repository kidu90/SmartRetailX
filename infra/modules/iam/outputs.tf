output "user_service_role_arn" {
  value = aws_iam_role.user_service.arn
}

output "order_service_role_arn" {
  value = aws_iam_role.order_service.arn
}

output "catalogue_service_role_arn" {
  value = aws_iam_role.catalogue_service.arn
}
