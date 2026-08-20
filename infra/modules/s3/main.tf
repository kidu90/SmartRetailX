# S3 Module (product images / static assets)
#
# Cost-efficiency note:
# Versioning protects against accidental deletes; lifecycle rules transition
# noncurrent versions to Intelligent-Tiering / Glacier IR and expire them to
# cap storage growth. Block Public Access is on — CloudFront OAC is the only
# read path, avoiding public-bucket risk and Direct S3 egress charges for end
# users. SSE-S3 (AES256) encryption has no KMS request fees.

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
    Module = "s3"
  })
}

resource "aws_s3_bucket" "assets" {
  bucket = var.bucket_name

  tags = merge(local.tags, {
    Name = var.bucket_name
  })
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_arn == null ? "AES256" : "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    id     = "noncurrent-cost-control"
    status = "Enabled"

    filter {}

    noncurrent_version_transition {
      # Must be strictly less than noncurrent_version_expiration.noncurrent_days
      noncurrent_days = 7
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_expiration {
      noncurrent_days = max(var.noncurrent_expiration_days, 30)
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "assets" {
  count  = length(var.cors_allowed_origins) > 0 ? 1 : 0
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    max_age_seconds = 3000
  }
}
