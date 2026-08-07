locals {
  tags = {
    Project     = "smartretailx"
    Environment = var.environment
  }
}

module "vpc" {
  source = "../../modules/vpc"

  name_prefix        = var.name_prefix
  vpc_cidr           = var.vpc_cidr
  az_count           = 2
  single_nat_gateway = true
  tags               = local.tags
}

module "eks" {
  source = "../../modules/eks"

  name_prefix            = var.name_prefix
  environment            = var.environment
  cluster_name           = "${var.name_prefix}-eks"
  vpc_id                 = module.vpc.vpc_id
  vpc_cidr               = module.vpc.vpc_cidr
  private_subnet_ids     = module.vpc.private_subnet_ids
  public_subnet_ids      = module.vpc.public_subnet_ids
  endpoint_public_access = true
  instance_types         = ["t3.medium"]
  capacity_type          = "SPOT"
  desired_size           = 2
  min_size               = 1
  max_size               = 4
  tags                   = local.tags
}

module "rds" {
  source = "../../modules/rds"

  name_prefix                = var.name_prefix
  vpc_id                     = module.vpc.vpc_id
  vpc_cidr                   = module.vpc.vpc_cidr
  private_subnet_ids         = module.vpc.private_subnet_ids
  eks_node_security_group_id = module.eks.node_security_group_id
  serverless_v2              = true
  serverless_min_capacity    = 0.5
  serverless_max_capacity    = 2
  backup_retention_period    = 1
  deletion_protection        = false
  skip_final_snapshot        = true
  tags                       = local.tags
}

module "dynamodb" {
  source = "../../modules/dynamodb"

  name_prefix            = var.name_prefix
  point_in_time_recovery = false
  tags                   = local.tags
}

module "s3" {
  source = "../../modules/s3"

  bucket_name                = var.assets_bucket_name
  noncurrent_expiration_days = 30
  cors_allowed_origins       = ["https://${var.domain_name}"]
  tags                       = local.tags
}

module "cloudfront" {
  source = "../../modules/cloudfront"

  name_prefix                    = var.name_prefix
  s3_bucket_id                   = module.s3.bucket_id
  s3_bucket_arn                  = module.s3.bucket_arn
  s3_bucket_regional_domain_name = module.s3.bucket_regional_domain_name
  alb_domain_name                = var.alb_dns_name
  aliases                        = var.acm_certificate_arn_us_east_1 != null ? ["assets.${var.domain_name}"] : []
  acm_certificate_arn            = var.acm_certificate_arn_us_east_1
  price_class                    = "PriceClass_100"
  tags                           = local.tags
}

module "route53" {
  source = "../../modules/route53"

  domain_name               = var.domain_name
  create_zone               = var.create_route53_zone
  cdn_record_name           = "assets.${var.domain_name}"
  api_record_name           = "api.${var.domain_name}"
  cloudfront_domain_name    = module.cloudfront.domain_name
  cloudfront_hosted_zone_id = module.cloudfront.hosted_zone_id
  alb_dns_name              = var.alb_dns_name
  alb_zone_id               = var.alb_zone_id
  tags                      = local.tags
}

module "acm" {
  source = "../../modules/acm"

  name_prefix               = var.name_prefix
  api_domain_name           = "api.${var.domain_name}"
  subject_alternative_names = []
  zone_id                   = module.route53.zone_id
  create_validation_records = var.create_route53_zone
  tags                      = local.tags
}

module "messaging" {
  source = "../../modules/messaging"

  name_prefix = var.name_prefix
  tags        = local.tags
}

module "lambda" {
  source = "../../modules/lambda"

  name_prefix   = var.name_prefix
  environment   = var.environment
  sqs_queue_arn = module.messaging.notification_queue_arn
  tags          = local.tags
}

module "secrets" {
  source = "../../modules/secrets"

  name_prefix             = var.name_prefix
  db_username             = module.rds.master_username
  db_password             = module.rds.master_password
  db_host                 = module.rds.cluster_endpoint
  db_port                 = module.rds.port
  db_name                 = module.rds.database_name
  recovery_window_in_days = 0
  tags                    = local.tags
}

module "iam" {
  source = "../../modules/iam"

  name_prefix            = var.name_prefix
  oidc_provider_arn      = module.eks.oidc_provider_arn
  oidc_provider_url      = module.eks.oidc_provider_url
  jwt_secret_arn         = module.secrets.jwt_secret_arn
  db_secret_arn          = module.secrets.db_secret_arn
  order_events_topic_arn = module.messaging.order_events_topic_arn
  event_bus_arn          = module.messaging.event_bus_arn
  dynamodb_table_arn     = module.dynamodb.table_arn
  assets_bucket_arn      = module.s3.bucket_arn
  tags                   = local.tags
}

module "cloudwatch_alarms" {
  source = "../../modules/cloudwatch-alarms"

  name_prefix      = var.name_prefix
  eks_cluster_name = module.eks.cluster_name
  alb_arn_suffix   = var.alb_arn_suffix
  tags             = local.tags
}
