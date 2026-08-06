output "zone_id" {
  value = local.zone_id
}

output "name_servers" {
  description = "NS records when zone is created here"
  value       = try(aws_route53_zone.this[0].name_servers, [])
}

output "cdn_fqdn" {
  value = try(aws_route53_record.cdn[0].fqdn, null)
}

output "api_fqdn" {
  value = try(aws_route53_record.api[0].fqdn, null)
}
