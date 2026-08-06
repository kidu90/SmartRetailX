variable "name_prefix" {
  type = string
}

variable "k8s_namespace" {
  type    = string
  default = "smartretailx"
}

variable "oidc_provider_arn" {
  type = string
}

variable "oidc_provider_url" {
  description = "OIDC issuer without https://"
  type        = string
}

variable "jwt_secret_arn" {
  type = string
}

variable "db_secret_arn" {
  type = string
}

variable "order_events_topic_arn" {
  type = string
}

variable "event_bus_arn" {
  type = string
}

variable "dynamodb_table_arn" {
  type = string
}

variable "assets_bucket_arn" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
