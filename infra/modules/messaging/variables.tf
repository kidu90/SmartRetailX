variable "name_prefix" {
  type = string
}

variable "notification_visibility_timeout" {
  description = "Must be >= Lambda timeout"
  type        = number
  default     = 60
}

variable "kms_key_id" {
  description = "Optional CMK id/arn for SNS/SQS encryption"
  type        = string
  default     = null
}

variable "tags" {
  type    = map(string)
  default = {}
}
