#!/usr/bin/env bash
set -euo pipefail

# Script de copia de seguridad de terraform.tfstate para Vecnova Informatica
# Almacena copias con marca temporal fuera del repositorio con permisos restrictivos (700/600)
# y conserva unicamente las 10 copias mas recientes sin imprimir el contenido sensible.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="${REPO_ROOT}/infra/site/terraform.tfstate"
BACKUP_DIR="${VECNOVA_STATE_BACKUP_DIR:-${HOME}/.vecnova/tfstate-backup}"
MAX_BACKUPS=10

# Validar existencia del fichero de estado
if [[ ! -f "$STATE_FILE" ]]; then
  echo "Error: No se encontro el archivo de estado de Terraform en: $STATE_FILE" >&2
  echo "Asegurate de haber ejecutado 'terraform apply' en 'infra/site' antes de realizar un respaldo." >&2
  exit 1
fi

# Crear directorio de respaldo seguro con permisos 700
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Generar nombre con marca temporal AAAAMMDD-HHMMSS
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
DEST_FILE="${BACKUP_DIR}/terraform.tfstate.${TIMESTAMP}"

# Copiar el archivo y aplicar permisos restrictivos 600
cp "$STATE_FILE" "$DEST_FILE"
chmod 600 "$DEST_FILE"

# Rotacion: conservar solo las 10 copias mas recientes
BACKUP_FILES=()
while IFS= read -r file; do
  [[ -n "$file" ]] && BACKUP_FILES+=("$file")
done < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name "terraform.tfstate.*" | sort)

TOTAL_BACKUPS="${#BACKUP_FILES[@]}"

if (( TOTAL_BACKUPS > MAX_BACKUPS )); then
  NUM_TO_DELETE=$(( TOTAL_BACKUPS - MAX_BACKUPS ))
  for (( i=0; i<NUM_TO_DELETE; i++ )); do
    rm -f "${BACKUP_FILES[i]}"
  done
fi

REMAINING_COUNT="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "terraform.tfstate.*" | wc -l | tr -d ' ')"

echo "==> Copia de seguridad de terraform.tfstate completada con exito."
echo "    Destino: ${DEST_FILE}"
echo "    Permisos: 600 (directorio: 700)"
echo "    Copias conservadas en ${BACKUP_DIR}: ${REMAINING_COUNT} (maximo ${MAX_BACKUPS})"
