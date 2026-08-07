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

locals {
  actions = length(var.alarm_actions) > 0 ? var.alarm_actions : [aws_sns_topic.ops_alerts.arn]
}

# High 5xx rate on the public ALB (requires alb_arn_suffix)
resource "aws_cloudwatch_metric_alarm" "alb_high_5xx" {
  count = var.alb_arn_suffix != "" ? 1 : 0

  alarm_name          = "${var.name_prefix}-alb-high-5xx"
  alarm_description   = "ALB 5XX error count elevated"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 20
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.actions
  ok_actions          = local.actions

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = var.tags
}

# High target response time (latency)
resource "aws_cloudwatch_metric_alarm" "alb_high_latency" {
  count = var.alb_arn_suffix != "" ? 1 : 0

  alarm_name          = "${var.name_prefix}-alb-high-latency"
  alarm_description   = "ALB target response time p99-ish (avg) elevated"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p95"
  threshold           = 1.5
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.actions
  ok_actions          = local.actions

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = var.tags
}

# Pod / container restarts via Container Insights (cluster-wide signal)
resource "aws_cloudwatch_metric_alarm" "pod_restarts" {
  alarm_name          = "${var.name_prefix}-eks-pod-restarts"
  alarm_description   = "Elevated pod restart count (Container Insights)"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5
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
