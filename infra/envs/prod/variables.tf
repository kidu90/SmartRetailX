variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "name_prefix" {
  type    = string
  default = "smartretailx-prod"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "domain_name" {
  type    = string
  default = "smartretailx.example.com"
}

variable "assets_bucket_name" {
  type = string
}

variable "create_route53_zone" {
  type    = bool
  default = true
}

variable "alb_dns_name" {
  type    = string
  default = null
}

variable "alb_zone_id" {
  type    = string
  default = null
}

variable "acm_certificate_arn_us_east_1" {
  type    = string
  default = null
}

variable "alb_arn_suffix" {
  description = "ALB CloudWatch dimension (app/name/id) — set after ALB is provisioned"
  type        = string
  default     = ""
}

variable "alert_email" {
  description = "Email for CloudWatch alarm SNS subscription (confirm after apply)"
  type        = string
  default     = ""
}

variable "wait_for_acm_validation" {
  description = "Deprecated — use enable_acm. Kept so old tfvars still parse."
  type        = bool
  default     = false
}

variable "enable_acm" {
  description = "Create ACM cert. Keep false for example.com / undelegated lab domains."
  type        = bool
  default     = false
}
