variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "name_prefix" {
  type    = string
  default = "smartretailx-dev"
}

variable "vpc_cidr" {
  type    = string
  default = "10.10.0.0/16"
}

variable "domain_name" {
  description = "Root DNS domain for Route53"
  type        = string
  default     = "dev.smartretailx.example.com"
}

variable "assets_bucket_name" {
  description = "Globally unique S3 bucket for product images"
  type        = string
}

variable "create_route53_zone" {
  type    = bool
  default = true
}

variable "alb_dns_name" {
  description = "Optional ALB DNS (set after AWS LB Controller provisions ALB)"
  type        = string
  default     = null
}

variable "alb_zone_id" {
  type    = string
  default = null
}

variable "acm_certificate_arn_us_east_1" {
  description = "ACM cert in us-east-1 for CloudFront custom domain (optional)"
  type        = string
  default     = null
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
