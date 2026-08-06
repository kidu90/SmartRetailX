# Lambda Module (notification-service example)
#
# Cost-efficiency note:
# Lambda is ideal for sparse notification traffic — no idle EC2/Fargate cost.
# ARM64 (arm64) is ~20% cheaper than x86. Memory sized modestly (128–256 MB);
# duration billing means over-provisioning memory can still save money if it
# reduces runtime. SQS event source mapping with batching amortizes invocations.
# archive_file packages the stub at plan time — no CI artifact store required
# for this scaffold.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4"
    }
  }
}

data "aws_partition" "current" {}
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  tags = merge(var.tags, {
    Module = "lambda"
  })
}

data "archive_file" "notification" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/build/notification-service.zip"
}

resource "aws_iam_role" "notification" {
  name = "${var.name_prefix}-notification-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = local.tags
}

resource "aws_iam_role_policy" "notification" {
  name = "${var.name_prefix}-notification-lambda"
  role = aws_iam_role.notification.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Logs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "arn:${data.aws_partition.current.partition}:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.name_prefix}-notification-service",
          "arn:${data.aws_partition.current.partition}:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.name_prefix}-notification-service:*"
        ]
      },
      {
        Sid    = "SQSConsume"
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = [var.sqs_queue_arn]
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "notification" {
  name              = "/aws/lambda/${var.name_prefix}-notification-service"
  retention_in_days = var.log_retention_days

  tags = local.tags
}

resource "aws_lambda_function" "notification" {
  function_name = "${var.name_prefix}-notification-service"
  role          = aws_iam_role.notification.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  architectures = ["arm64"]
  timeout       = var.timeout
  memory_size   = var.memory_size

  filename         = data.archive_file.notification.output_path
  source_code_hash = data.archive_file.notification.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT = var.environment
      SERVICE     = "notification-service"
    }
  }

  depends_on = [
    aws_iam_role_policy.notification,
    aws_cloudwatch_log_group.notification,
  ]

  tags = merge(local.tags, {
    Name    = "${var.name_prefix}-notification-service"
    Service = "notification-service"
  })
}

resource "aws_lambda_event_source_mapping" "notification_sqs" {
  event_source_arn = var.sqs_queue_arn
  function_name    = aws_lambda_function.notification.arn
  batch_size       = var.batch_size
  enabled          = true
}
