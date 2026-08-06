variable "name_prefix" {
  type = string
}

variable "db_username" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_host" {
  type = string
}

variable "db_port" {
  type    = number
  default = 5432
}

variable "db_name" {
  type = string
}

variable "jwt_expires_in" {
  type    = string
  default = "24h"
}

variable "recovery_window_in_days" {
  description = "0 for immediate delete (dev); 7–30 for prod"
  type        = number
  default     = 7
}

variable "tags" {
  type    = map(string)
  default = {}
}
