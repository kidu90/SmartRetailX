# DynamoDB Module (catalogue-service)
#
# Cost-efficiency note:
# PAY_PER_REQUEST (on-demand) billing avoids provisioned RCU/WCU waste for
# bursty catalogue traffic and eliminates capacity planning in early stages.
# Encryption at rest with AWS-owned keys has no extra charge; switch to CMK
# only when compliance requires it. Point-in-time recovery is optional (costs
# ~20% of table storage) — enabled in prod, off in dev.

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
    Module = "dynamodb"
  })
}

resource "aws_dynamodb_table" "catalogue" {
  name         = "${var.name_prefix}-catalogue"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "gsi1pk"
    type = "S"
  }

  attribute {
    name = "gsi1sk"
    type = "S"
  }

  global_secondary_index {
    name            = "gsi1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  point_in_time_recovery {
    enabled = var.point_in_time_recovery
  }

  tags = merge(local.tags, {
    Name    = "${var.name_prefix}-catalogue"
    Service = "catalogue-service"
  })
}
