output "url_http" {
  value = "http://${aws_lb.api.dns_name}"
}

output "cluster_ecs" {
  value = aws_ecs_cluster.principal.name
}

output "endpoint_rds" {
  value = aws_db_instance.banco.address
}

output "segredo_banco" {
  value = aws_secretsmanager_secret.banco.arn
}

output "segredo_gateway" {
  value = aws_secretsmanager_secret.gateway.arn
}
