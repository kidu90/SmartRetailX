# Observability module — CloudWatch Logs, Container Insights, dashboard, Fluent Bit / X-Ray IRSA

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
data "aws_region" "current" {}

locals {
  tags = merge(var.tags, { Module = "monitoring" })

  services = toset(var.service_names)

  dashboard_name = "${var.name_prefix}-ops"
}

# --- CloudWatch Log Groups (one per service; Fluent Bit targets these) ---
resource "aws_cloudwatch_log_group" "service" {
  for_each = local.services

  name              = "/smartretailx/${each.value}"
  retention_in_days = var.log_retention_days
  tags = merge(local.tags, {
    Service = each.value
  })
}

resource "aws_cloudwatch_log_group" "fluent_bit" {
  name              = "/smartretailx/fluent-bit"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "xray_daemon" {
  name              = "/smartretailx/xray-daemon"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}

# --- Fluent Bit IRSA (PutLogEvents) ---
data "aws_iam_policy_document" "fluent_bit_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"
    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:sub"
      values   = ["system:serviceaccount:${var.observability_namespace}:fluent-bit"]
    }
    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "fluent_bit" {
  name               = "${var.name_prefix}-fluent-bit"
  assume_role_policy = data.aws_iam_policy_document.fluent_bit_assume.json
  tags               = local.tags
}

data "aws_iam_policy_document" "fluent_bit" {
  statement {
    sid    = "CWLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:CreateLogGroup",
      "logs:DescribeLogStreams",
      "logs:PutLogEvents",
      "logs:PutRetentionPolicy",
    ]
    resources = concat(
      [for g in aws_cloudwatch_log_group.service : "${g.arn}:*"],
      ["${aws_cloudwatch_log_group.fluent_bit.arn}:*"],
      ["arn:${data.aws_partition.current.partition}:logs:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:log-group:/smartretailx/*:*"]
    )
  }
}

resource "aws_iam_role_policy" "fluent_bit" {
  name   = "${var.name_prefix}-fluent-bit-logs"
  role   = aws_iam_role.fluent_bit.id
  policy = data.aws_iam_policy_document.fluent_bit.json
}

# --- X-Ray daemon IRSA ---
data "aws_iam_policy_document" "xray_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"
    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:sub"
      values   = ["system:serviceaccount:${var.observability_namespace}:xray-daemon"]
    }
    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "xray_daemon" {
  name               = "${var.name_prefix}-xray-daemon"
  assume_role_policy = data.aws_iam_policy_document.xray_assume.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "xray_daemon" {
  role       = aws_iam_role.xray_daemon.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# --- CloudWatch Container Insights (CloudWatch Observability add-on) ---
resource "aws_eks_addon" "cloudwatch_observability" {
  count = var.enable_container_insights ? 1 : 0

  cluster_name                = var.eks_cluster_name
  addon_name                  = "amazon-cloudwatch-observability"
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"
  tags                        = local.tags
}

# --- Ops dashboard (EMF + Container Insights + SQS) ---
locals {
  region = data.aws_region.current.id

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# SmartRetailX ops — EMF app metrics · Container Insights · SQS"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "Gateway — EMF"
          region = local.region
          period = 60
          metrics = [
            ["SmartRetailX", "RequestCount", "Service", "gateway", { label = "Requests", stat = "Sum" }],
            [".", "ServerErrorCount", ".", ".", { label = "5xx", stat = "Sum", yAxis = "right" }],
            [".", "Latency", ".", ".", { stat = "p99", label = "p99 ms", yAxis = "right" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "Order service — EMF"
          region = local.region
          period = 60
          metrics = [
            ["SmartRetailX", "OrdersCreated", "Service", "order-service", { stat = "Sum" }],
            [".", "CheckoutFailures", ".", ".", { stat = "Sum", yAxis = "right" }],
            [".", "RequestCount", ".", ".", { stat = "Sum" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "RBAC denials (EMF 403)"
          region = local.region
          period = 60
          metrics = [
            ["SmartRetailX", "RbacDeniedCount", "Service", "gateway", { stat = "Sum" }],
            [".", "RbacDeniedCount", "Service", "catalogue-service", { stat = "Sum" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 7
        width  = 12
        height = 6
        properties = {
          title  = "EKS pod CPU (Container Insights)"
          region = local.region
          period = 60
          metrics = [
            ["ContainerInsights", "pod_cpu_utilization", "ClusterName", var.eks_cluster_name, { stat = "Average" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 7
        width  = 12
        height = 6
        properties = {
          title  = "EKS pod memory (Container Insights)"
          region = local.region
          period = 60
          metrics = [
            ["ContainerInsights", "pod_memory_utilization", "ClusterName", var.eks_cluster_name, { stat = "Average" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 13
        width  = 24
        height = 6
        properties = {
          title  = "SQS queue depth"
          region = local.region
          period = 60
          stat   = "Average"
          metrics = [
            for q in var.sqs_queue_names : ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", q]
          ]
        }
      }
    ]
  })
}

resource "aws_cloudwatch_dashboard" "ops" {
  dashboard_name = local.dashboard_name
  dashboard_body = local.dashboard_body
}
