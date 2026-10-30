variable "project" {
  description = "Nombre identificador del proyecto utilizado en prefijos y etiquetas"
  type        = string
  default     = "vecnova"
}

variable "region" {
  description = "Region de AWS por defecto para el bucket S3 y recursos regionales"
  type        = string
  default     = "eu-west-1"
}

variable "block_indexing" {
  description = "Indica si se debe inyectar la cabecera X-Robots-Tag: noindex, nofollow"
  type        = bool
  default     = true
}

variable "price_class" {
  description = "Clase de precio de CloudFront para optimizacion de costes"
  type        = string
  default     = "PriceClass_100"
}

variable "domain_name" {
  description = "Nombre de dominio personalizado para el sitio web (ej. ejemplo.invalid)"
  type        = string
  default     = null
}

variable "enable_custom_domain" {
  description = "Habilita la configuracion de dominio personalizado en Route 53, ACM y CloudFront"
  type        = bool
  default     = false
}

variable "existing_hosted_zone_id" {
  description = "Identificador de zona alojada existente en Route 53 para no crear una nueva"
  type        = string
  default     = null
}

variable "enable_hsts" {
  description = "Habilita la cabecera Strict-Transport-Security en la politica de respuesta"
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "Repositorio de GitHub en formato propietario/repositorio (ej. Bios-Mod/vecnova_informatica)"
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "github_repository must follow the owner/repository format (e.g. owner/repo)."
  }
}

variable "create_oidc_provider" {
  description = "Indica si se debe crear el proveedor OIDC de GitHub en IAM o usar uno existente"
  type        = bool
  default     = true
}

variable "github_owner_id" {
  description = "Identificador numerico del propietario de GitHub para el sub inmutable OIDC"
  type        = string
  default     = null

  validation {
    condition     = var.github_owner_id == null || can(regex("^[0-9]+$", var.github_owner_id))
    error_message = "github_owner_id must be a numeric string or null."
  }
}

variable "github_repository_id" {
  description = "Identificador numerico del repositorio de GitHub para el sub inmutable OIDC"
  type        = string
  default     = null

  validation {
    condition     = var.github_repository_id == null || can(regex("^[0-9]+$", var.github_repository_id))
    error_message = "github_repository_id must be a numeric string or null."
  }
}
