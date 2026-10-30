#!/usr/bin/env bash
set -euo pipefail

# Script de despliegue a AWS (S3 + CloudFront) para Vecnova Informatica
# Compila la web, sincroniza dist/ con politicas diferenciadas de cache e invalida CloudFront.

DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      ;;
    -h|--help)
      echo "Uso: $0 [--dry-run]"
      echo ""
      echo "Opciones:"
      echo "  --dry-run   Muestra los comandos de despliegue sin ejecutarlos."
      echo ""
      echo "Variables de entorno requeridas:"
      echo "  AWS_PROFILE              Perfil de credenciales AWS (o AWS_ACCESS_KEY_ID en el entorno)"
      echo "  VECNOVA_BUCKET           Nombre del bucket S3 destino"
      echo "  VECNOVA_DISTRIBUTION_ID  Identificador de la distribucion CloudFront a invalidar"
      exit 0
      ;;
    *)
      echo "Error: Argumento no reconocido: $arg" >&2
      echo "Uso: $0 [--dry-run]" >&2
      exit 1
      ;;
  esac
done

# Validacion de variables requeridas
MISSING_VARS=()

if [[ -z "${AWS_PROFILE:-}" && -z "${AWS_ACCESS_KEY_ID:-}" ]]; then
  MISSING_VARS+=("AWS_PROFILE (o credenciales AWS_ACCESS_KEY_ID)")
fi

if [[ -z "${VECNOVA_BUCKET:-}" ]]; then
  MISSING_VARS+=("VECNOVA_BUCKET")
fi

if [[ -z "${VECNOVA_DISTRIBUTION_ID:-}" ]]; then
  MISSING_VARS+=("VECNOVA_DISTRIBUTION_ID")
fi

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
  echo "Error: Faltan variables de entorno requeridas para el despliegue:" >&2
  for var in "${MISSING_VARS[@]}"; do
    echo "  - $var" >&2
  done
  echo "" >&2
  echo "Ejemplo de definicion previa:" >&2
  echo "  export AWS_PROFILE=tu-perfil-aws" >&2
  echo "  export VECNOVA_BUCKET=\$(terraform -chdir=infra/site output -raw s3_bucket_name)" >&2
  echo "  export VECNOVA_DISTRIBUTION_ID=\$(terraform -chdir=infra/site output -raw cloudfront_distribution_id)" >&2
  echo "  export PUBLIC_SITE_URL=\"https://\$(terraform -chdir=infra/site output -raw cloudfront_domain_name)\"" >&2
  exit 1
fi

# Validacion de formato de variables
if [[ ! "$VECNOVA_BUCKET" =~ ^[a-z0-9][a-z0-9.-]{2,62}$ ]]; then
  echo "Error: VECNOVA_BUCKET no tiene un formato de bucket S3 valido: [${VECNOVA_BUCKET}]" >&2
  exit 1
fi

if [[ ! "$VECNOVA_DISTRIBUTION_ID" =~ ^E[A-Z0-9]+$ ]]; then
  echo "Error: VECNOVA_DISTRIBUTION_ID no tiene un formato de distribucion CloudFront valido: [${VECNOVA_DISTRIBUTION_ID}]" >&2
  exit 1
fi

if [[ "$DRY_RUN" == true ]]; then
  echo "[DRY-RUN] Modo simulacion activado. Comandos que se ejecutarian:"
  echo ""
  echo "1. Compilacion estatica:"
  echo "   npm run build"
  echo ""
  echo "2. Sincronizacion de activos inmutables (_astro/):"
  echo "   aws s3 sync dist/_astro/ \"s3://${VECNOVA_BUCKET}/_astro/\" --cache-control \"public, max-age=31536000, immutable\""
  echo ""
  echo "3. Sincronizacion de HTML y resto de ficheros (sin cache):"
  echo "   aws s3 sync dist/ \"s3://${VECNOVA_BUCKET}/\" --delete --exclude \"_astro/*\" --cache-control \"max-age=0, must-revalidate\""
  echo ""
  echo "4. Invalidacion de cache en CloudFront:"
  echo "   aws cloudfront create-invalidation --distribution-id \"${VECNOVA_DISTRIBUTION_ID}\" --paths \"/*\" --query 'Invalidation.Id' --output text"
  exit 0
fi

echo "==> 1. Compilando aplicacion web..."
npm run build

npm run check:assets

if grep -rIl "TODO_" dist; then
  exit 1
fi

echo "==> 2. Subiendo activos inmutables (_astro/) con cache-control publico..."
aws s3 sync dist/_astro/ "s3://${VECNOVA_BUCKET}/_astro/" \
  --cache-control "public, max-age=31536000, immutable"

echo "==> 3. Sincronizando ficheros base y HTML con max-age=0, must-revalidate..."
aws s3 sync dist/ "s3://${VECNOVA_BUCKET}/" \
  --delete \
  --exclude "_astro/*" \
  --cache-control "max-age=0, must-revalidate"

echo "==> 4. Creando invalidacion global de cache en CloudFront (/*)..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "${VECNOVA_DISTRIBUTION_ID}" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "Invalidation ID: ${INVALIDATION_ID}"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "invalidation_id=${INVALIDATION_ID}" >> "$GITHUB_OUTPUT"
fi

echo "==> Despliegue completado con exito."
