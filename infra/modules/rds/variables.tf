variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "eks_node_security_group_id" {
  description = "EKS node SG allowed to reach PostgreSQL"
  type        = string
}

variable "database_name" {
  type    = string
  default = "smartretailx"
}

variable "master_username" {
  type    = string
  default = "srx_admin"
}

variable "engine_version" {
  type    = string
  default = "15.4"
}

variable "serverless_v2" {
  description = "Use Aurora Serverless v2 (recommended for dev)"
  type        = bool
  default     = true
}

variable "serverless_min_capacity" {
  type    = number
  default = 0.5
}

variable "serverless_max_capacity" {
  type    = number
  default = 4
}

variable "instance_class" {
  description = "Used when serverless_v2 is false"
  type        = string
  default     = "db.r6g.large"
}

variable "instance_count" {
  description = "Writer + readers when not serverless (Multi-AZ via AZ placement)"
  type        = number
  default     = 2
}

variable "backup_retention_period" {
  type    = number
  default = 3
}

variable "deletion_protection" {
  type    = bool
  default = false
}

variable "skip_final_snapshot" {
  type    = bool
  default = true
}

variable "kms_key_arn" {
  description = "Optional CMK ARN for storage encryption (default AWS-managed if null)"
  type        = string
  default     = null
}

variable "tags" {
  type    = map(string)
  default = {}
}
