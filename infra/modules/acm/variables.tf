variable "name_prefix" {
  type = string
}

variable "enabled" {
  description = "Create an ACM certificate. Disable for undelegated / example.com lab domains."
  type        = bool
  default     = false
}

variable "api_domain_name" {
  description = "Primary API hostname (e.g. api.dev.smartretailx.example.com)"
  type        = string
}

variable "subject_alternative_names" {
  type    = list(string)
  default = []
}

variable "zone_id" {
  description = "Route53 zone for DNS validation"
  type        = string
  default     = ""
}

variable "create_validation_records" {
  description = "Create Route53 DNS validation records for the certificate"
  type        = bool
  default     = false
}

variable "wait_for_validation" {
  description = "Unused — kept for backwards-compatible module callers"
  type        = bool
  default     = false
}

variable "tags" {
  type    = map(string)
  default = {}
}
