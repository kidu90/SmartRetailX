# Messaging Module (SNS / SQS / EventBridge)
#
# Cost-efficiency note:
# SNS fan-out + SQS consumers is pay-per-request with no idle broker cost
# (unlike always-on MSK/Rabbit). SQS long polling (20s) reduces empty receives.
# EventBridge custom bus is free for AWS-service events; custom events are
# cheap per million. Dead-letter queues prevent poison messages from burning
# Lambda retries. Separate queues per consumer isolate failures.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  tags = merge(var.tags, {
    Module = "messaging"
  })

  consumer_queues = {
    notification = {
      name    = "${var.name_prefix}-notification"
      service = "notification-service"
    }
    inventory = {
      name    = "${var.name_prefix}-inventory"
      service = "inventory-service"
    }
    payment = {
      name    = "${var.name_prefix}-payment"
      service = "payment-service"
    }
    order = {
      name    = "${var.name_prefix}-order-saga"
      service = "order-service"
    }
  }
}

resource "aws_sns_topic" "order_events" {
  name              = "${var.name_prefix}-order-events"
  kms_master_key_id = var.kms_key_id

  tags = merge(local.tags, {
    Name    = "${var.name_prefix}-order-events"
    Purpose = "platform-domain-events"
  })
}

resource "aws_sqs_queue" "dlq" {
  for_each = local.consumer_queues

  name                      = "${each.value.name}-dlq"
  message_retention_seconds = 1209600
  kms_master_key_id         = var.kms_key_id

  tags = merge(local.tags, {
    Name    = "${each.value.name}-dlq"
    Service = each.value.service
  })
}

resource "aws_sqs_queue" "consumer" {
  for_each = local.consumer_queues

  name                       = each.value.name
  visibility_timeout_seconds = var.notification_visibility_timeout
  receive_wait_time_seconds  = 20
  message_retention_seconds  = 345600
  kms_master_key_id          = var.kms_key_id

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = 3
  })

  tags = merge(local.tags, {
    Name    = each.value.name
    Service = each.value.service
  })
}

resource "aws_sqs_queue_policy" "consumer" {
  for_each = local.consumer_queues

  queue_url = aws_sqs_queue.consumer[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSNSSend"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.consumer[each.key].arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.order_events.arn
          }
        }
      }
    ]
  })
}

resource "aws_sns_topic_subscription" "consumer" {
  for_each = local.consumer_queues

  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.consumer[each.key].arn
}

resource "aws_cloudwatch_event_bus" "smartretailx" {
  name = "${var.name_prefix}-events"

  tags = merge(local.tags, {
    Name = "${var.name_prefix}-events"
  })
}

resource "aws_cloudwatch_event_rule" "order_status_changed" {
  name           = "${var.name_prefix}-order-status-changed"
  description    = "Capture order status domain events"
  event_bus_name = aws_cloudwatch_event_bus.smartretailx.name

  event_pattern = jsonencode({
    source      = ["smartretailx.order-service"]
    detail-type = ["order.status_changed", "order.status.changed"]
  })

  tags = local.tags
}

resource "aws_cloudwatch_event_target" "order_to_sns" {
  rule           = aws_cloudwatch_event_rule.order_status_changed.name
  event_bus_name = aws_cloudwatch_event_bus.smartretailx.name
  target_id      = "order-events-sns"
  arn            = aws_sns_topic.order_events.arn
}

resource "aws_sns_topic_policy" "order_events" {
  arn = aws_sns_topic.order_events.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowAccountPublish"
        Effect = "Allow"
        Principal = {
          AWS = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = ["sns:Publish", "sns:Subscribe"]
        Resource = aws_sns_topic.order_events.arn
      },
      {
        Sid    = "AllowEventBridgePublish"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.order_events.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_cloudwatch_event_rule.order_status_changed.arn
          }
        }
      }
    ]
  })
}
