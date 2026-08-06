# Route53 Module
#
# Cost-efficiency note:
# A hosted zone is ~$0.50/mo; alias records to CloudFront/ALB are free and
# avoid CNAME lookup fees. Creating the zone here is optional — set
# create_zone=false and pass an existing zone_id in shared DNS accounts.
# Health checks are omitted by default (each check is billed).

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
    Module = "route53"
  })

  zone_id = var.create_zone ? aws_route53_zone.this[0].zone_id : var.zone_id
}

resource "aws_route53_zone" "this" {
  count = var.create_zone ? 1 : 0

  name = var.domain_name

  tags = merge(local.tags, {
    Name = var.domain_name
  })
}

resource "aws_route53_record" "cdn" {
  count = var.cloudfront_domain_name != null ? 1 : 0

  zone_id = local.zone_id
  name    = var.cdn_record_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cdn_aaaa" {
  count = var.cloudfront_domain_name != null ? 1 : 0

  zone_id = local.zone_id
  name    = var.cdn_record_name
  type    = "AAAA"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api" {
  count = var.alb_dns_name != null ? 1 : 0

  zone_id = local.zone_id
  name    = var.api_record_name
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
