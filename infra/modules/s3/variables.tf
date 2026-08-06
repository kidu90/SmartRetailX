variable "bucket_name" {
  description = "Globally unique S3 bucket name"
  type        = string
}

variable "kms_key_arn" {
  type    = string
  default = null
}

variable "noncurrent_expiration_days" {
  description = "Expire noncurrent versions after N days"
  type        = number
  default     = 90
}

variable "cors_allowed_origins" {
  type    = list(string)
  default = []
}

variable "tags" {
  type    = map(string)
  default = {}
}
