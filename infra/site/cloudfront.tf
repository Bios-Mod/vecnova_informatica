resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.project}-site-oac"
  description                       = "Control de acceso al origen S3 para ${var.project}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id

  depends_on = [aws_s3_bucket_public_access_block.site]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.site.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.site.arn
          }
        }
      }
    ]
  })
}

resource "aws_cloudfront_function" "url_rewrite" {
  name    = "${var.project}-url-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Redirige www al apice, agrega index.html a carpetas y redirige rutas sin extension a barra final"
  publish = true
  code    = <<-EOT
function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // Redirige con 301 www hacia el dominio principal conservando ruta y cadena de consulta
    var host = (request.headers && request.headers.host && request.headers.host.value) ? request.headers.host.value : '';
    if (host.startsWith('www.')) {
        var apex = host.slice(4);
        var qs = '';
        if (request.querystring) {
            var params = [];
            for (var key in request.querystring) {
                if (Object.prototype.hasOwnProperty.call(request.querystring, key)) {
                    var item = request.querystring[key];
                    if (item.multiValue) {
                        for (var i = 0; i < item.multiValue.length; i++) {
                            params.push(encodeURIComponent(key) + '=' + encodeURIComponent(item.multiValue[i].value));
                        }
                    } else if (item.value === '') {
                        params.push(encodeURIComponent(key));
                    } else if (item.value !== undefined && item.value !== null) {
                        params.push(encodeURIComponent(key) + '=' + encodeURIComponent(item.value));
                    }
                }
            }
            if (params.length > 0) {
                qs = '?' + params.join('&');
            }
        }
        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: {
                'location': { value: 'https://' + apex + uri + qs }
            }
        };
    }

    // Redirige con 301 las rutas sin extension y sin barra final a la version con barra
    if (!uri.includes('.') && !uri.endsWith('/')) {
        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: {
                'location': { value: uri + '/' }
            }
        };
    }

    // Agrega index.html a las rutas acabadas en /
    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    }

    return request;
}
EOT
}

resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "${var.project}-security-headers"
  comment = "Cabeceras de seguridad para ${var.project} (HSTS configurable por variable)"

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    dynamic "strict_transport_security" {
      for_each = var.enable_hsts ? [1] : []
      content {
        access_control_max_age_sec = 31536000
        include_subdomains         = false
        preload                    = false
        override                   = true
      }
    }
  }

  dynamic "custom_headers_config" {
    for_each = var.block_indexing ? [1] : []
    content {
      items {
        header   = "X-Robots-Tag"
        value    = "noindex, nofollow"
        override = true
      }
    }
  }
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Distribucion CloudFront para la web estatica de ${var.project}"
  default_root_object = "index.html"
  price_class         = var.price_class
  http_version        = "http2and3"
  aliases             = var.enable_custom_domain && var.domain_name != null ? [var.domain_name, "www.${var.domain_name}"] : null

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-${aws_s3_bucket.site.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-${aws_s3_bucket.site.id}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }
  }

  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  dynamic "viewer_certificate" {
    for_each = var.enable_custom_domain ? [] : [1]
    content {
      cloudfront_default_certificate = true
    }
  }

  dynamic "viewer_certificate" {
    for_each = var.enable_custom_domain ? [1] : []
    content {
      acm_certificate_arn      = aws_acm_certificate_validation.site[0].certificate_arn
      ssl_support_method       = "sni-only"
      minimum_protocol_version = "TLSv1.2_2021"
    }
  }

  lifecycle {
    precondition {
      condition     = !var.enable_custom_domain || (var.domain_name != null && length(trimspace(var.domain_name)) > 0)
      error_message = "domain_name must be configured with a non-empty string when enable_custom_domain is true."
    }
  }

  tags = {
    Name = "${var.project}-distribution"
  }
}
