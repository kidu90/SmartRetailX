output "certificate_arn" {
  description = "Regional ACM certificate ARN for ALB HTTPS listeners"
  value       = aws_acm_certificate.regional.arn
}

output "validated_certificate_arn" {
  description = "ARN after DNS validation (null if validation skipped)"
  value       = try(aws_acm_certificate_validation.regional[0].certificate_arn, aws_acm_certificate.regional.arn)
}
