output "db_secret_arn" {
  value = aws_secretsmanager_secret.db.arn
}

output "db_secret_name" {
  value = aws_secretsmanager_secret.db.name
}

output "jwt_secret_arn" {
  value = aws_secretsmanager_secret.jwt.arn
}

output "jwt_secret_name" {
  value = aws_secretsmanager_secret.jwt.name
}
