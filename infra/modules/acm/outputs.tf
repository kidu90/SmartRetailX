output "certificate_arn" {
  description = "Regional ACM certificate ARN (null when enabled=false)"
  value       = try(aws_acm_certificate.regional[0].arn, null)
}

output "validated_certificate_arn" {
  description = "Same as certificate_arn when present"
  value       = try(aws_acm_certificate.regional[0].arn, null)
}
