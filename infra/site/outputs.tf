output "s3_bucket_name" {
  description = "Nombre del bucket S3 privado que aloja los archivos compilados de la web"
  value       = aws_s3_bucket.site.id
}

output "cloudfront_distribution_id" {
  description = "Identificador de la distribucion de CloudFront"
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain_name" {
  description = "Nombre de dominio asignado por CloudFront (ej. d111111abcdef8.cloudfront.net)"
  value       = aws_cloudfront_distribution.site.domain_name
}

output "cloudfront_distribution_arn" {
  description = "ARN de la distribucion de CloudFront"
  value       = aws_cloudfront_distribution.site.arn
}

output "route53_name_servers" {
  description = "Servidores de nombres asignados a la zona de Route 53"
  value       = local.route53_name_servers
}

output "configured_domain_name" {
  description = "Nombre de dominio personalizado configurado para el sitio"
  value       = var.domain_name
}

output "github_deploy_role_arn" {
  description = "ARN del rol IAM para despliegue desde GitHub Actions mediante OIDC"
  value       = aws_iam_role.github_deploy.arn
}
