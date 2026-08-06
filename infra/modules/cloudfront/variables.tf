variable "name_prefix" {
  type = string
}

variable "s3_bucket_id" {
  type = string
}

variable "s3_bucket_arn" {
  type = string
}

variable "s3_bucket_regional_domain_name" {
  type = string
}

variable "alb_domain_name" {
  description = "Optional ALB DNS name to front API paths (/api/*)"
  type        = string
  default     = null
}

variable "aliases" {
  description = "Alternate domain names (must match ACM cert)"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ACM cert in us-east-1 for CloudFront custom domains"
  type        = string
  default     = null
}

variable "price_class" {
  type    = string
  default = "PriceClass_100"
}

variable "default_root_object" {
  type    = string
  default = "index.html"
}

variable "web_acl_id" {
  type    = string
  default = null
}

variable "tags" {
  type    = map(string)
  default = {}
}
