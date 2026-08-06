output "cluster_endpoint" {
  description = "Aurora writer endpoint"
  value       = aws_rds_cluster.this.endpoint
}

output "reader_endpoint" {
  description = "Aurora reader endpoint"
  value       = aws_rds_cluster.this.reader_endpoint
}

output "cluster_id" {
  value = aws_rds_cluster.this.id
}

output "database_name" {
  value = aws_rds_cluster.this.database_name
}

output "master_username" {
  value = aws_rds_cluster.this.master_username
}

output "master_password" {
  description = "Generated master password (store in Secrets Manager)"
  value       = random_password.master.result
  sensitive   = true
}

output "port" {
  value = aws_rds_cluster.this.port
}

output "security_group_id" {
  value = aws_security_group.this.id
}
