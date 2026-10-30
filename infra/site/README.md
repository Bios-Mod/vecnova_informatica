# Infraestructura del Sitio Web (AWS S3 + CloudFront)

Este módulo de Terraform gestiona la infraestructura serverless para el alojamiento de la web estática de **Vecnova Informática**, conforme a la decisión de arquitectura **T-008**.

## Arquitectura

- **S3 privado:** Aloja los ficheros estáticos de la web compilada (`dist/`). Posee bloqueo total de acceso público, cifrado en reposo (AES256), versionado habilitado y regla de ciclo de vida para expirar versiones antiguas a los 30 días.
- **CloudFront OAC:** El acceso a los objetos de S3 se realiza exclusivamente mediante Origin Access Control (SigV4), impidiendo cualquier acceso directo por HTTP/S3.
- **CloudFront Function (viewer-request):** Redirige con HTTP 301 peticiones del subdominio `www.` al dominio principal (ápice) conservando la ruta y los parámetros de consulta; reescribe las URLs para resolver directorios añadiendo `index.html` (ej. `/servicios/` -> `/servicios/index.html`) y redirige con HTTP 301 rutas limpias sin barra final (ej. `/servicios` -> `/servicios/`).
- **Política de cabeceras de respuesta:** Inyecta cabeceras de seguridad estrictas (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`), soporte condicional para `Strict-Transport-Security` (`enable_hsts = true`) y opcionalmente `X-Robots-Tag: noindex, nofollow` mientras la indexación pública esté bloqueada (`block_indexing = true`).
- **Páginas de error:** Mapeo de respuestas 403 y 404 al documento `/404.html` con código de estado HTTP 404.

## Gestión del Estado (Local) y Copias de Seguridad

Conforme a **T-002** y **T-008**, el estado de Terraform (`terraform.tfstate`) se mantiene **local** y está rigurosamente excluido del repositorio en `.gitignore`.

> [!IMPORTANT]
> **Copia de seguridad obligatoria:** Tras ejecutar cualquier comando que altere el estado (`terraform apply` o `terraform destroy`), es obligatorio ejecutar el script de respaldo:
> ```bash
> ./scripts/backup-state.sh
> ```
> Este script copia el archivo de estado con marca temporal y permisos restrictivos (`600`) al directorio seguro `$HOME/.vecnova/tfstate-backup` (o la ruta configurada en `VECNOVA_STATE_BACKUP_DIR`), rotando y conservando las 10 versiones más recientes. La carpeta de respaldos reside fuera del repositorio y nunca se sube a Git.

## Inicialización y Validación

```bash
cd infra/site

# Inicializar proveedores (sin backend remoto)
terraform init

# Validar formato y sintaxis
terraform fmt -check
terraform validate
```

## Obtención de Identificadores (Outputs)

Una vez aplicada la infraestructura en tu entorno AWS con tu perfil local (`AWS_PROFILE`), puedes consultar las salidas necesarias para el despliegue con:

```bash
# Mostrar todas las salidas
terraform output

# Obtener valores individuales para variables de entorno
export VECNOVA_BUCKET=$(terraform output -raw s3_bucket_name)
export VECNOVA_DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
export PUBLIC_SITE_URL="https://$(terraform output -raw cloudfront_domain_name)"
```

## Dominio Personalizado y Certificado HTTPS

Por defecto, la infraestructura se despliega sin dominio personalizado (`enable_custom_domain = false`), utilizando el certificado por defecto de CloudFront y su dominio asignado (`*.cloudfront.net`).

### Orden de activación

1. **Configurar el dominio:** En `terraform.tfvars`, fijar:
   ```hcl
   domain_name          = "tudominio.com"
   enable_custom_domain = true
   ```
   *Nota sobre dominios en Route 53:* Si el dominio se compró a través de Route 53 o ya existe una zona alojada pública para el dominio en la cuenta, especifica su identificador con `existing_hosted_zone_id = "Z..."`. Terraform utilizará esa zona existente (`data "aws_route53_zone"`) y no intentará crear otra duplicada.
2. **Aplicar la infraestructura:** Ejecutar `terraform apply`. Si no se especificó `existing_hosted_zone_id`, Terraform crea la zona Route 53 (`aws_route53_zone.main`). Esta zona incluye `lifecycle { prevent_destroy = true }` para evitar que una recreación o destrucción accidental cambie los servidores de nombres asignados por AWS y rompa la delegación DNS. Para destruir la zona de forma intencionada, es necesario retirar o comentar esa regla de ciclo de vida en `route53.tf` antes de ejecutar `terraform destroy`.
3. **Delegación de servidores de nombres:** Si el dominio está registrado fuera de AWS (en un registrador externo como Namecheap, GoDaddy, etc.), introduce en el registrador los servidores devueltos en la salida:
   ```bash
   terraform output route53_name_servers
   ```
4. **Esperar la validación DNS del certificado:** Terraform habrá creado los registros CNAME de validación en Route 53. ACM validará el certificado automáticamente una vez propagados los registros DNS.
5. **Comprobar acceso HTTPS:** Probar la navegación en `https://tudominio.com` y verificar que las visitas a `https://www.tudominio.com` redirigen con HTTP 301 al dominio principal conservando la ruta y parámetros.
6. **Activar HSTS:** Tras comprobar que HTTPS funciona con normalidad en todos los navegadores, fijar `enable_hsts = true` y ejecutar `terraform apply` para emitir la cabecera `Strict-Transport-Security: max-age=31536000` (1 año, sin includeSubdomains ni preload).
7. **Lanzamiento e indexación:** Cambiar `block_indexing = false` únicamente al momento del lanzamiento público definitivo.

## Despliegue con GitHub Actions y Autenticación OIDC

El rol IAM `vecnova-github-deploy` permite a los flujos de GitHub Actions autenticarse mediante OIDC sin utilizar claves de larga duración.

### Formatos del claim `sub`

GitHub Actions emite el claim `sub` en dos variantes según el momento de creación o renombramiento del repositorio:
1. **Formato clásico:** `repo:<owner>/<repo>:ref:refs/heads/main`
2. **Formato inmutable (GitHub desde julio de 2026):** `repo:<owner>@<owner_id>/<repo>@<repo_id>:ref:refs/heads/main`

Para garantizar la compatibilidad con ambos formatos manteniendo una comprobación estricta (`StringEquals` sin comodines ni `StringLike`), la política de confianza admite ambos si se definen las variables `github_owner_id` y `github_repository_id`.

> [!IMPORTANT]
> **Recreación de repositorios:** Si el repositorio de GitHub se elimina y se vuelve a crear (o se traslada a un nuevo repositorio con el mismo nombre, por ejemplo en la transición a público en la versión 1.0), GitHub asignará un nuevo identificador numérico interno (`github_repository_id`). En ese caso es imprescindible actualizar el valor de `github_repository_id` en `terraform.tfvars` y ejecutar `terraform apply` para que el rol OIDC reconozca el nuevo repositorio.

## Variables Disponibles

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `project` | Identificador de proyecto para nombres y etiquetas | `"vecnova"` |
| `region` | Región AWS principal para el bucket S3 | `"eu-west-1"` |
| `block_indexing` | Inyecta cabecera `X-Robots-Tag: noindex, nofollow` | `true` |
| `price_class` | Clase de precio de CloudFront (`PriceClass_100`) | `"PriceClass_100"` |
| `domain_name` | Nombre de dominio personalizado para el sitio web | `null` |
| `enable_custom_domain` | Habilita la configuración de dominio en Route 53, ACM y CloudFront | `false` |
| `existing_hosted_zone_id` | Identificador de zona alojada existente en Route 53 | `null` |
| `enable_hsts` | Habilita la cabecera Strict-Transport-Security (max-age 1 año) | `false` |
| `github_repository` | Repositorio de GitHub en formato propietario/repositorio | *(requerido)* |
| `create_oidc_provider` | Indica si se debe crear el proveedor OIDC de GitHub en IAM | `true` |
| `github_owner_id` | Identificador numérico del propietario de GitHub para el sub inmutable | `null` |
| `github_repository_id` | Identificador numérico del repositorio de GitHub para el sub inmutable | `null` |
