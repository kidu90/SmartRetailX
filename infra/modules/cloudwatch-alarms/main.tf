resource "aws_sns_topic" "ops_alerts" {
  name = "${var.name_prefix}-ops-alerts"
  tags = var.tags
}

resource "aws_sns_topic_policy" "ops_alerts" {
  arn = aws_sns_topic.ops_alerts.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudWatchPublish"
        Effect    = "Allow"
        Principal = { Service = "cloudwatch.amazonaws.com" }
        Action    = "SNS:Publish"
        Resource  = aws_sns_topic.ops_alerts.arn
      }
    ]
  })
}

# Email subscription for alarm evidence (confirm in inbox after apply)
resource "aws_sns_topic_subscription" "ops_email" {
  count = var.alert_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.ops_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

locals {
  actions = length(var.alarm_actions) > 0 ? var.alarm_actions : [aws_sns_topic.ops_alerts.arn]
}

# High 5xx rate on the public ALB (requires alb_arn_suffix)
resource "aws_cloudwatch_metric_alarm" "alb_high_5xx" {
  count = var.alb_arn_suffix != "" ? 1 : 0

  alarm_name          = "${var.name_prefix}-alb-high-5xx"
  alarm_description   = "ALB 5XX error count elevated — stop a service or run k6 past capacity to demonstrate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = var.alb_5xx_threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.actions
  ok_actions          = local.actions

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = var.tags
}

# High target response time (p99)
resource "aws_cloudwatch_metric_alarm" "alb_high_latency" {
  count = var.alb_arn_suffix != "" ? 1 : 0

  alarm_name          = "${var.name_prefix}-alb-high-latency-p99"
  alarm_description   = "ALB target response time p99 elevated"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p99"
  threshold           = var.alb_latency_p99_threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.actions
  ok_actions          = local.actions

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = var.tags
}

# EMF application 5xx (gateway) — works without ALB suffix
resource "aws_cloudwatch_metric_alarm" "emf_gateway_5xx" {
  alarm_name          = "${var.name_prefix}-emf-gateway-5xx"
  alarm_description   = "Gateway ServerErrorCount (EMF) above threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ServerErrorCount"
  namespace           = "SmartRetailX"
  period              = 60
  statistic           = "Sum"
  threshold           = var.emf_5xx_threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.actions
  ok_actions          = local.actions

  dimensions = {
    Service = "gateway"
  }

  tags = var.tags
}

# EMF p99 latency (gateway)
resource "aws_cloudwatch_metric_alarm" "emf_gateway_latency" {
  alarm_name          = "${var.name_prefix}-emf-gateway-latency-p99"
  alarm_description   = "Gateway Latency p99 (EMF) above threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Latency"
  namespace           = "SmartRetailX"
  period              = 60
  extended_statistic  = "p99"
  threshold           = var.emf_latency_p99_ms
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.actions
  ok_actions          = local.actions

  dimensions = {
    Service = "gateway"
  }

  tags = var.tags
}

# Pod / container restarts via Container Insights
resource "aws_cloudwatch_metric_alarm" "pod_restarts" {
  alarm_name          = "${var.name_prefix}-eks-pod-restarts"
  alarm_description   = "Elevated pod restart count (Container Insights)"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = var.pod_restart_threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.actions
  ok_actions          = local.actions

  metric_query {
    id          = "restarts"
    return_data = true
    metric {
      metric_name = "pod_number_of_container_restarts"
      namespace   = "ContainerInsights"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ClusterName = var.eks_cluster_name
      }
    }
  }

  tags = var.tags
}

# SQS backlog growing (one alarm per queue name)
resource "aws_cloudwatch_metric_alarm" "sqs_depth" {
  for_each = toset(var.sqs_queue_names)

  alarm_name          = "${var.name_prefix}-sqs-depth-${each.value}"
  alarm_description   = "SQS ApproximateNumberOfMessagesVisible high for ${each.value}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Average"
  threshold           = var.sqs_depth_threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.actions
  ok_actions          = local.actions

  dimensions = {
    QueueName = each.value
  }

  tags = var.tags
}
