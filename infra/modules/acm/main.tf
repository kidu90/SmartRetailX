# ACM Module — TLS certificates for ALB (regional)
#
# Lab / example.com domains cannot complete DNS validation (NS not delegated).
# Set enabled=false to skip certificate creation so terraform apply succeeds.
# Set enabled=true + create_validation_records=true only for a real domain.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
  }
}

locals {
  tags = merge(var.tags, {
    Module = "acm"
  })
}

resource "aws_acm_certificate" "regional" {
  count = var.enabled ? 1 : 0

  domain_name               = var.api_domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.tags, {
    Name = "${var.name_prefix}-api-cert"
  })
}

resource "aws_route53_record" "regional_validation" {
  for_each = var.enabled && var.create_validation_records ? {
    for dvo in aws_acm_certificate.regional[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.zone_id
}
