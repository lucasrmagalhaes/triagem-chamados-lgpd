data "aws_availability_zones" "disponiveis" {
  state = "available"
}

resource "aws_vpc" "principal" {
  cidr_block           = "10.42.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = var.nome }
}

resource "aws_internet_gateway" "principal" {
  vpc_id = aws_vpc.principal.id
  tags   = { Name = var.nome }
}

resource "aws_subnet" "publica" {
  count                   = 2
  vpc_id                  = aws_vpc.principal.id
  cidr_block              = cidrsubnet(aws_vpc.principal.cidr_block, 8, count.index + 1)
  availability_zone       = data.aws_availability_zones.disponiveis.names[count.index]
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.nome}-publica-${count.index}" }
}

resource "aws_route_table" "publica" {
  vpc_id = aws_vpc.principal.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.principal.id
  }
  tags = { Name = var.nome }
}

resource "aws_route_table_association" "publica" {
  count          = 2
  subnet_id      = aws_subnet.publica[count.index].id
  route_table_id = aws_route_table.publica.id
}

resource "aws_security_group" "alb" {
  name   = "${var.nome}-alb"
  vpc_id = aws_vpc.principal.id
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "api" {
  name   = "${var.nome}-api"
  vpc_id = aws_vpc.principal.id
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "banco" {
  name   = "${var.nome}-banco"
  vpc_id = aws_vpc.principal.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "random_password" "banco" {
  length  = 24
  special = false
}

resource "aws_db_subnet_group" "banco" {
  name       = var.nome
  subnet_ids = aws_subnet.publica[*].id
}

resource "aws_db_instance" "banco" {
  identifier              = var.nome
  engine                  = "postgres"
  engine_version          = var.versao_postgres
  instance_class          = "db.t4g.micro"
  allocated_storage       = 20
  db_name                 = "triagem"
  username                = "triagem"
  password                = random_password.banco.result
  db_subnet_group_name    = aws_db_subnet_group.banco.name
  vpc_security_group_ids  = [aws_security_group.banco.id]
  publicly_accessible     = false
  storage_encrypted       = true
  backup_retention_period = 7
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.nome}-final"
  deletion_protection     = false
}

resource "aws_secretsmanager_secret" "banco" {
  name = "${var.nome}/database-url"
}

resource "aws_secretsmanager_secret_version" "banco" {
  secret_id = aws_secretsmanager_secret.banco.id
  secret_string = "postgres://triagem:${random_password.banco.result}@${aws_db_instance.banco.address}:5432/triagem"
}

resource "aws_secretsmanager_secret" "gateway" {
  name = "${var.nome}/ai-gateway"
}

resource "aws_secretsmanager_secret_version" "gateway" {
  secret_id     = aws_secretsmanager_secret.gateway.id
  secret_string = var.ai_gateway_api_key
  lifecycle {
    ignore_changes = [secret_string]
  }
}

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execucao" {
  name               = "${var.nome}-execucao"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "execucao" {
  role       = aws_iam_role.execucao.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "segredos" {
  statement {
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      aws_secretsmanager_secret.banco.arn,
      aws_secretsmanager_secret.gateway.arn,
    ]
  }
}

resource "aws_iam_role_policy" "segredos" {
  name   = "${var.nome}-segredos"
  role   = aws_iam_role.execucao.id
  policy = data.aws_iam_policy_document.segredos.json
}

resource "aws_iam_role" "tarefa" {
  name               = "${var.nome}-tarefa"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.nome}"
  retention_in_days = 14
}

resource "aws_ecs_cluster" "principal" {
  name = var.nome
}

resource "aws_lb" "api" {
  name               = var.nome
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.publica[*].id
}

resource "aws_lb_target_group" "api" {
  name        = var.nome
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.principal.id
  target_type = "ip"
  health_check {
    path = "/saude"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = var.nome
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execucao.arn
  task_role_arn            = aws_iam_role.tarefa.arn
  container_definitions = jsonencode([
    {
      name      = "api"
      image     = var.imagem_container
      essential = true
      portMappings = [{ containerPort = 3000, protocol = "tcp" }]
      environment = [
        { name = "PORT", value = "3000" },
        { name = "MODELO_TRIAGEM", value = var.modelo_triagem },
        { name = "LIMIAR_CONFIANCA", value = var.limiar_confianca },
        { name = "MODELO_EMBEDDING", value = "openai/text-embedding-3-small" },
        { name = "USAR_EMBEDDING_GATEWAY", value = "false" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.banco.arn },
        { name = "AI_GATEWAY_API_KEY", valueFrom = aws_secretsmanager_secret.gateway.arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.api.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "api"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "api" {
  name            = var.nome
  cluster         = aws_ecs_cluster.principal.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  network_configuration {
    subnets          = aws_subnet.publica[*].id
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = true
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }
  depends_on = [aws_lb_listener.http]
}
