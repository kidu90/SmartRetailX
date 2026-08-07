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

variable "tags" {
  type    = map(string)
  default = {}
}
