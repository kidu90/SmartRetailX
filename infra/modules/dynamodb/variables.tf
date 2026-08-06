variable "name_prefix" {
  type = string
}

variable "point_in_time_recovery" {
  type    = bool
  default = false
}

variable "kms_key_arn" {
  description = "Optional CMK; null uses AWS-owned key"
  type        = string
  default     = null
}

variable "tags" {
  type    = map(string)
  default = {}
}
