variable "name_prefix" {
  type        = string
  description = "Resource name prefix"
}

variable "alarm_actions" {
  type        = list(string)
  description = "SNS topic ARNs for alarm notifications"
  default     = []
}

variable "alb_arn_suffix" {
  type        = string
  description = "ALB ARN suffix for CloudWatch metric dimensions (app/name/id)"
  default     = ""
}

variable "eks_cluster_name" {
  type        = string
  description = "EKS cluster name for Container Insights metrics"
}

variable "alert_email" {
  type        = string
  description = "Email subscribed to ops-alerts SNS (confirm subscription after apply)"
  default     = ""
}

variable "sqs_queue_names" {
  type        = list(string)
  description = "SQS queue names to alarm on depth"
  default     = []
}

variable "alb_5xx_threshold" {
  type    = number
  default = 20
}

variable "alb_latency_p99_threshold" {
  type    = number
  default = 1.5
}

variable "emf_5xx_threshold" {
  type    = number
  default = 10
}

variable "emf_latency_p99_ms" {
  type    = number
  default = 1500
}

variable "pod_restart_threshold" {
  type    = number
  default = 5
}

variable "sqs_depth_threshold" {
  type    = number
  default = 100
}

variable "tags" {
  type    = map(string)
  default = {}
}
