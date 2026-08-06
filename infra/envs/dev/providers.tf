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
    tls = {
      source  = "hashicorp/tls"
      version = ">= 4.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4"
    }
  }

  # Populate bucket/table after bootstrap. Example:
  # terraform init -backend-config=backend.hcl
  backend "s3" {
    # bucket         = "smartretailx-tfstate-ACCOUNT"
    # key            = "envs/dev/terraform.tfstate"
    # region         = "ap-south-1"
    # dynamodb_table = "smartretailx-terraform-locks"
    # encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "smartretailx"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
