# RDS Aurora PostgreSQL Module
#
# Cost-efficiency note:
# Dev uses Aurora Serverless v2 with low min ACU (0.5) so idle DB cost stays
# low. Prod uses provisioned Multi-AZ writer+reader for predictable latency.
# Storage encryption (KMS) and private-subnet placement avoid public exposure
# without extra NAT hops for in-VPC access. Automated backups retained briefly
# in dev (1–3 days) vs longer in prod.

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
    Module = "rds"
  })
}

# First matching version that AWS still allows CreateDBCluster for in this region.
data "aws_rds_engine_version" "aurora_postgresql" {
  engine = "aurora-postgresql"
  preferred_versions = compact(concat(
    var.engine_version != null ? [var.engine_version] : [],
    ["16.4", "16.2", "16.1", "15.10", "15.8", "15.7", "15.5", "15.3", "14.15", "14.13", "14.12"]
  ))
}

resource "random_password" "master" {
  length           = 32
  special          = true
  override_special = "!#$%^&*()-_=+[]{}"
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name_prefix}-aurora"
  subnet_ids = var.private_subnet_ids

  tags = merge(local.tags, {
    Name = "${var.name_prefix}-aurora"
  })
}

resource "aws_security_group" "this" {
  name        = "${var.name_prefix}-aurora-sg"
  description = "Aurora PostgreSQL - ingress from EKS nodes only"
  vpc_id      = var.vpc_id

  tags = merge(local.tags, {
    Name = "${var.name_prefix}-aurora-sg"
  })
}

resource "aws_security_group_rule" "ingress_from_eks_nodes" {
  type                     = "ingress"
  description              = "PostgreSQL from EKS node SG"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.this.id
  source_security_group_id = var.eks_node_security_group_id
}

resource "aws_security_group_rule" "egress_vpc" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  security_group_id = aws_security_group.this.id
  cidr_blocks       = [var.vpc_cidr]
}

resource "aws_rds_cluster" "this" {
  cluster_identifier = "${var.name_prefix}-aurora"
  engine             = "aurora-postgresql"
  engine_mode        = var.serverless_v2 ? "provisioned" : "provisioned"
  engine_version     = data.aws_rds_engine_version.aurora_postgresql.version
  database_name      = var.database_name
  master_username    = var.master_username
  master_password    = random_password.master.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]

  storage_encrypted         = true
  kms_key_id                = var.kms_key_arn
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.name_prefix}-aurora-final"

  backup_retention_period = var.backup_retention_period
  preferred_backup_window = "03:00-04:00"
  copy_tags_to_snapshot   = true

  dynamic "serverlessv2_scaling_configuration" {
    for_each = var.serverless_v2 ? [1] : []
    content {
      min_capacity = var.serverless_min_capacity
      max_capacity = var.serverless_max_capacity
    }
  }

  tags = merge(local.tags, {
    Name = "${var.name_prefix}-aurora"
  })
}

resource "aws_rds_cluster_instance" "this" {
  count = var.serverless_v2 ? 1 : var.instance_count

  identifier         = "${var.name_prefix}-aurora-${count.index}"
  cluster_identifier = aws_rds_cluster.this.id
  instance_class     = var.serverless_v2 ? "db.serverless" : var.instance_class
  engine             = aws_rds_cluster.this.engine
  engine_version     = aws_rds_cluster.this.engine_version

  publicly_accessible = false

  tags = local.tags
}
