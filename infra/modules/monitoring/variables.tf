variable "name_prefix" {
  type = string
}

variable "eks_cluster_name" {
  type = string
}

variable "oidc_provider_arn" {
  type = string
}

variable "oidc_provider_url" {
  description = "OIDC issuer without https://"
  type        = string
}

variable "observability_namespace" {
  type    = string
  default = "amazon-cloudwatch"
}

variable "service_names" {
  type = list(string)
  default = [
    "gateway",
    "user-service",
    "catalogue-service",
    "order-service",
    "inventory-service",
    "payment-service",
    "notification-service",
  ]
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "enable_container_insights" {
  type    = bool
  default = true
}

variable "sqs_queue_names" {
  description = "SQS queue names for dashboard widgets"
  type        = list(string)
  default     = []
}

variable "tags" {
  type    = map(string)
  default = {}
}
