#!/bin/bash
# Script para limpiar contenedores duplicados y resolver conflictos

set -e

COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
NC='\033[0m'

log_info() {
  echo -e "${COLOR_GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${COLOR_YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${COLOR_RED}[ERROR]${NC} $1"
}

log_info "Limpiando contenedores duplicados..."

# Detener todos los contenedores de stargety-oasis
log_info "Deteniendo contenedores..."
docker-compose --profile production down --remove-orphans 2>/dev/null || true

# Esperar un poco
sleep 2

# Eliminar contenedores huérfanos
log_info "Eliminando contenedores huérfanos..."
docker container prune -f --filter "label!=keep" 2>/dev/null || true

# Limpiar volúmenes no utilizados (opcional)
log_warn "Limpiando volúmenes no utilizados..."
docker volume prune -f 2>/dev/null || true

# Mostrar estado
log_info "Estado actual de contenedores:"
docker-compose ps

log_info "Limpieza completada ✓"
log_info "Ahora puedes ejecutar: ./deploy.sh start"

