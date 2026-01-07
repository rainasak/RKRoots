terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_ecs_cluster" "main" {
  name = "rkroots-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_db_instance" "postgres" {
  identifier             = "rkroots-db"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  storage_encrypted      = true
  db_name                = "rkroots"
  username               = "postgres"
  skip_final_snapshot    = true
  backup_retention_period = 7
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "rkroots-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
}

resource "aws_ecr_repository" "backend" {
  name                 = "rkroots-backend"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_s3_bucket" "images" {
  bucket = "rkroots-images-${var.environment}"
}

variable "aws_region" {
  default = "us-east-1"
}

variable "environment" {
  default = "prod"
}
