variable "aws_region" {
  description = "Regiao da API e do Postgres. sa-east-1 deixa o dado operacional no Brasil."
  type        = string
  default     = "sa-east-1"
}

variable "nome" {
  description = "Prefixo dos recursos."
  type        = string
  default     = "triagem-chamados"
}

variable "imagem_container" {
  description = "URI da imagem no ECR. Exemplo: 123456789012.dkr.ecr.sa-east-1.amazonaws.com/triagem:1"
  type        = string
}

variable "modelo_triagem" {
  description = "ID provider/modelo no AI Gateway."
  type        = string
  default     = "google/gemini-2.5-flash-lite"
}

variable "limiar_confianca" {
  description = "Abaixo deste valor o chamado vai para fila_revisao."
  type        = string
  default     = "0.72"
}

variable "ai_gateway_api_key" {
  description = "Chave do AI Gateway. Vazio deixa a API no classificador heuristico."
  type        = string
  default     = ""
  sensitive   = true
}

variable "versao_postgres" {
  description = "Versao menor disponivel de PostgreSQL na regiao. pgvector entra na migracao da aplicacao."
  type        = string
  default     = "16.8"
}
