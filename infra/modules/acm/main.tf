# ACM Module — TLS certificates for ALB (regional) and CloudFront (us-east-1)
#
# Cost-efficiency note:
# Public ACM certificates are free. DNS validation via Route53 avoids email
# delays. We issue a regional cert for ALB HTTPS listeners and optionally a
# us-east-1 cert for CloudFront custom domains (CloudFront requires that region).

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
  for_each = var.create_validation_records ? {
    for dvo in aws_acm_certificate.regional.domain_validation_options : dvo.domain_name => {
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

resource "aws_acm_certificate_validation" "regional" {
  count = var.create_validation_records ? 1 : 0

  certificate_arn         = aws_acm_certificate.regional.arn
  validation_record_fqdns = [for record in aws_route53_record.regional_validation : record.fqdn]
}
