variable "domain_name" {
  description = "Root domain (e.g. smartretailx.example.com)"
  type        = string
}

variable "create_zone" {
  description = "Create a new hosted zone"
  type        = bool
  default     = true
}

variable "zone_id" {
  description = "Existing hosted zone ID when create_zone=false"
  type        = string
  default     = null
}

variable "cdn_record_name" {
  description = "Record for CloudFront (e.g. assets.smartretailx.example.com or apex)"
  type        = string
}

variable "api_record_name" {
  description = "Record for ALB API (e.g. api.smartretailx.example.com)"
  type        = string
}

variable "cloudfront_domain_name" {
  type    = string
  default = null
}

variable "cloudfront_hosted_zone_id" {
  type    = string
  default = null
}

variable "alb_dns_name" {
  description = "ALB DNS name (set after ALB exists; optional at first apply)"
  type        = string
  default     = null
}

variable "alb_zone_id" {
  description = "ALB hosted zone ID"
  type        = string
  default     = null
}

variable "tags" {
  type    = map(string)
  default = {}
}
