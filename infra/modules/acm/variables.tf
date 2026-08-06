variable "name_prefix" {
  type = string
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
}

variable "create_validation_records" {
  description = "Create Route53 validation records and wait for ISSUED"
  type        = bool
  default     = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
