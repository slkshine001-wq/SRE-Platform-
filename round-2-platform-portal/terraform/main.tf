resource "aws_ecr_repository" "service_repo" {
  name                 = var.service_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_iam_role" "service_role" {
  name = "${var.service_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      },
    ]
  })
}

variable "service_name" {
  type = string
}

output "repository_url" {
  value = aws_ecr_repository.service_repo.repository_url
}

output "role_arn" {
  value = aws_iam_role.service_role.arn
}
