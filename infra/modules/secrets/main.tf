# Secrets Manager Module
#
# Cost-efficiency note:
# Secrets Manager is ~$0.40/secret/month + API calls. We store only secrets that
# must rotate (DB credentials, JWT signing key) rather than ConfigMap-equivalents.
# Automatic rotation is left optional — enable for prod DB secrets; skip for
# short-lived JWT keys rotated via CI to avoid Lambda rotation infrastructure.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5"
    }
  }
}

locals {
  tags = merge(var.tags, {
    Module = "secrets"
  })
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "db" {
  name                    = "${var.name_prefix}/rds/credentials"
  description             = "Aurora PostgreSQL credentials for user-service and order-service"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(local.tags, {
    Name = "${var.name_prefix}-rds-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = var.db_host
    port     = var.db_port
    dbname   = var.db_name
    engine   = "postgres"
  })
}

resource "aws_secretsmanager_secret" "jwt" {
  name                    = "${var.name_prefix}/jwt/signing-key"
  description             = "JWT signing key for user-service"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(local.tags, {
    Name = "${var.name_prefix}-jwt-signing-key"
  })
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id = aws_secretsmanager_secret.jwt.id
  secret_string = jsonencode({
    JWT_SECRET     = random_password.jwt.result
    JWT_EXPIRES_IN = var.jwt_expires_in
  })
}
