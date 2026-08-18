# IAM Module (cross-cutting least-privilege IRSA roles)
#
# Cost-efficiency note:
# IRSA roles cost nothing beyond CloudTrail; they replace broad node-instance
# profiles that over-permission every pod. Policies pin Resource ARNs (no "*")
# so blast radius stays small if a service account is compromised. Creating
# roles once here avoids duplicated IAM in each app module.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
  }
}

locals {
  tags = merge(var.tags, {
    Module = "iam"
  })

  oidc_subjects = {
    user-service      = "system:serviceaccount:${var.k8s_namespace}:user-service"
    order-service     = "system:serviceaccount:${var.k8s_namespace}:order-service"
    catalogue-service = "system:serviceaccount:${var.k8s_namespace}:catalogue-service"
    gateway           = "system:serviceaccount:${var.k8s_namespace}:gateway"
  }
}

data "aws_iam_policy_document" "irsa_assume" {
  for_each = local.oidc_subjects

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:sub"
      values   = [each.value]
    }
  }
}

resource "aws_iam_role" "user_service" {
  name               = "${var.name_prefix}-irsa-user-service"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume["user-service"].json
  tags               = merge(local.tags, { Service = "user-service" })
}

resource "aws_iam_role_policy" "user_service" {
  name = "${var.name_prefix}-user-service"
  role = aws_iam_role.user_service.id

  # Least privilege: only the JWT signing secret + RDS credentials secret
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadJwtSecret"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
        Resource = [var.jwt_secret_arn]
      },
      {
        Sid      = "ReadDbSecret"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
        Resource = [var.db_secret_arn]
      }
    ]
  })
}

resource "aws_iam_role" "order_service" {
  name               = "${var.name_prefix}-irsa-order-service"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume["order-service"].json
  tags               = merge(local.tags, { Service = "order-service" })
}

resource "aws_iam_role_policy" "order_service" {
  name = "${var.name_prefix}-order-service"
  role = aws_iam_role.order_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadJwtSecret"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
        Resource = [var.jwt_secret_arn]
      },
      {
        Sid      = "ReadDbSecret"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
        Resource = [var.db_secret_arn]
      },
      {
        Sid      = "PublishOrderEvents"
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = [var.order_events_topic_arn]
      },
      {
        Sid      = "PutEvents"
        Effect   = "Allow"
        Action   = ["events:PutEvents"]
        Resource = [var.event_bus_arn]
      }
    ]
  })
}

resource "aws_iam_role" "catalogue_service" {
  name               = "${var.name_prefix}-irsa-catalogue-service"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume["catalogue-service"].json
  tags               = merge(local.tags, { Service = "catalogue-service" })
}

resource "aws_iam_role_policy" "catalogue_service" {
  name = "${var.name_prefix}-catalogue-service"
  role = aws_iam_role.catalogue_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadJwtSecret"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
        Resource = [var.jwt_secret_arn]
      },
      {
        Sid    = "DynamoDBCatalogue"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:DescribeTable"
        ]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*"
        ]
      },
      {
        Sid    = "S3ProductImages"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:AbortMultipartUpload"
        ]
        Resource = ["${var.assets_bucket_arn}/*"]
      },
      {
        Sid      = "S3ListBucket"
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = [var.assets_bucket_arn]
      }
    ]
  })
}

resource "aws_iam_role" "gateway" {
  name               = "${var.name_prefix}-irsa-gateway"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume["gateway"].json
  tags               = merge(local.tags, { Service = "gateway" })
}

resource "aws_iam_role_policy" "gateway" {
  name = "${var.name_prefix}-gateway"
  role = aws_iam_role.gateway.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadJwtSecret"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
        Resource = [var.jwt_secret_arn]
      },
      {
        Sid    = "CloudWatchReadOnlyMetrics"
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics",
          "cloudwatch:GetDashboard",
          "cloudwatch:ListDashboards",
          "cloudwatch:DescribeAlarms"
        ]
        Resource = "*"
      }
    ]
  })
}
