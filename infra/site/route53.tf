resource "aws_route53_zone" "main" {
  count   = var.enable_custom_domain && var.existing_hosted_zone_id == null ? 1 : 0
  name    = var.domain_name
  comment = "Zona alojada gestionada por Terraform para ${var.project}"

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = "${var.project}-hosted-zone"
  }
}

data "aws_route53_zone" "existing" {
  count   = var.enable_custom_domain && var.existing_hosted_zone_id != null ? 1 : 0
  zone_id = var.existing_hosted_zone_id
}

locals {
  hosted_zone_id = var.enable_custom_domain ? (
    var.existing_hosted_zone_id != null ? data.aws_route53_zone.existing[0].zone_id : aws_route53_zone.main[0].zone_id
  ) : null

  route53_name_servers = var.enable_custom_domain ? (
    var.existing_hosted_zone_id != null ? data.aws_route53_zone.existing[0].name_servers : aws_route53_zone.main[0].name_servers
  ) : []
}

resource "aws_route53_record" "cert_validation" {
  for_each = var.enable_custom_domain ? {
    for dvo in aws_acm_certificate.site[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = local.hosted_zone_id
}

resource "aws_route53_record" "apex_a" {
  count   = var.enable_custom_domain ? 1 : 0
  zone_id = local.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex_aaaa" {
  count   = var.enable_custom_domain ? 1 : 0
  zone_id = local.hosted_zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_a" {
  count   = var.enable_custom_domain ? 1 : 0
  zone_id = local.hosted_zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_aaaa" {
  count   = var.enable_custom_domain ? 1 : 0
  zone_id = local.hosted_zone_id
  name    = "www.${var.domain_name}"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
