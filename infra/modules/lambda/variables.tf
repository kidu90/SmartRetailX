variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "sqs_queue_arn" {
  description = "SQS queue that triggers the Lambda"
  type        = string
}

variable "timeout" {
  type    = number
  default = 30
}

variable "memory_size" {
  type    = number
  default = 128
}

variable "batch_size" {
  type    = number
  default = 5
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "tags" {
  type    = map(string)
  default = {}
}
