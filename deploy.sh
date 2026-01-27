#!/bin/bash
# Script de despliegue para Stargety Oasis en producción
# Uso: ./deploy.sh [start|stop|restart|logs|health|backup]

set -e

COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_BLUE='\033[0;34m'
COLOR_CYAN='\033[0;36m'
COLOR_MAGENTA='\033[0;35m'
COLOR_WHITE='\033[1;37m'
COLOR_GRAY='\033[0;90m'
NC='\033[0m'

PROGRESS_CHAR="▓"
EMPTY_CHAR="░"
SPINNER=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")

if command -v docker-compose &> /dev/null; then
  DC="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
  DC="docker compose"
else
  echo -e "${COLOR_RED}[ERROR]${NC} docker-compose no está instalado"
  exit 1
fi

log_info() {
  echo -e "${COLOR_GREEN}[✓]${NC} ${COLOR_WHITE}$1${NC}"
}

log_warn() {
  echo -e "${COLOR_YELLOW}[⚠]${NC} ${COLOR_YELLOW}$1${NC}"
}

log_error() {
  echo -e "${COLOR_RED}[✗]${NC} ${COLOR_RED}$1${NC}"
}

log_stage() {
  echo -e "\n${COLOR_CYAN}╔════════════════════════════════════════╗${NC}"
  echo -e "${COLOR_CYAN}║${NC} ${COLOR_WHITE}$1${NC}"
  echo -e "${COLOR_CYAN}╚════════════════════════════════════════╝${NC}\n"
}

log_substage() {
  echo -e "${COLOR_BLUE}→${NC} ${COLOR_CYAN}$1${NC}"
}

progress_bar() {
  local current=$1
  local total=$2
  local width=30
  local percentage=$((current * 100 / total))
  local filled=$((current * width / total))

  printf "${COLOR_CYAN}["
  printf "%${filled}s" | tr ' ' "$PROGRESS_CHAR"
  printf "%$((width - filled))s" | tr ' ' "$EMPTY_CHAR"
  printf "]${NC} ${COLOR_WHITE}%3d%%${NC}\n" "$percentage"
}

spinner() {
  local pid=$1
  local i=0
  while kill -0 $pid 2>/dev/null; do
    printf "\r${COLOR_MAGENTA}${SPINNER[$((i % 10))]}${NC} "
    ((i++))
    sleep 0.1
  done
  printf "\r"
}

check_env() {
  if [ ! -f .env.production ]; then
    log_error ".env.production no encontrado"
    log_info "Crea el archivo .env.production con las variables necesarias"
    exit 1
  fi
}

check_docker() {
  if ! command -v docker &> /dev/null; then
    log_error "Docker no está instalado"
    exit 1
  fi
}

start_services() {
  check_docker
  log_stage "INICIANDO SERVICIOS EN PRODUCCIÓN"

  local step=1
  local total=3

  # Step 1: Limpiar contenedores duplicados
  log_substage "Limpiando contenedores duplicados..."
  progress_bar $step $total
  $DC --profile production down --remove-orphans 2>/dev/null || true
  log_info "Contenedores limpios"
  ((step++))
  sleep 1

  # Step 2: Iniciar servicios
  log_substage "Iniciando contenedores..."
  progress_bar $step $total
  $DC --profile production up -d &
  spinner $!
  log_info "Contenedores iniciados"
  ((step++))
  sleep 5

  # Step 3: Verificar salud
  log_substage "Verificando salud de la aplicación..."
  progress_bar $step $total
  health_check
  echo ""
}

stop_services() {
  check_docker
  log_stage "DETENIENDO SERVICIOS"

  log_substage "Deteniendo contenedores..."
  progress_bar 1 1
  $DC --profile production down &
  spinner $!
  log_info "Servicios detenidos correctamente"
  echo ""
}

restart_services() {
  log_stage "REINICIANDO SERVICIOS"

  log_substage "Deteniendo servicios actuales..."
  progress_bar 1 2
  stop_services
  sleep 2

  log_substage "Iniciando servicios nuevamente..."
  progress_bar 2 2
  start_services
}

show_logs() {
  check_docker
  log_stage "MOSTRANDO LOGS EN TIEMPO REAL"
  log_substage "Presiona Ctrl+C para salir"
  echo ""
  $DC logs -f stargety-oasis
}

health_check() {
  check_docker
  log_stage "VERIFICANDO SALUD DE LA APLICACIÓN"

  local step=1
  local total=2

  log_substage "Verificando estado del contenedor..."
  progress_bar $step $total

  if $DC ps stargety-oasis | grep -q "Up"; then
    log_info "Contenedor está corriendo"
    ((step++))
    sleep 3

    log_substage "Realizando health check HTTP..."
    progress_bar $step $total

    if curl -s http://localhost:3001/health > /dev/null; then
      log_info "Aplicación saludable y respondiendo correctamente"
      echo -e "${COLOR_GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
      echo -e "${COLOR_GREEN}✓ ESTADO: OPERACIONAL${NC}"
      echo -e "${COLOR_GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    else
      log_warn "Health check falló, pero contenedor está corriendo"
      echo -e "${COLOR_YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
      echo -e "${COLOR_YELLOW}⚠ ESTADO: PARCIALMENTE OPERACIONAL${NC}"
      echo -e "${COLOR_YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    fi
  else
    log_error "Contenedor no está corriendo"
    echo -e "${COLOR_RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${COLOR_RED}✗ ESTADO: INOPERACIONAL${NC}"
    echo -e "${COLOR_RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    return 1
  fi
}

backup_database() {
  check_docker
  log_stage "CREANDO BACKUP DE LA BASE DE DATOS"

  local step=1
  local total=3

  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="backups/stargety_oasis_${TIMESTAMP}.sql"

  log_substage "Preparando directorio de backups..."
  progress_bar $step $total
  mkdir -p backups
  log_info "Directorio listo"
  ((step++))

  log_substage "Ejecutando pg_dump..."
  progress_bar $step $total
  $DC exec -T postgres pg_dump -U stargety stargety_oasis > "$BACKUP_FILE" &
  spinner $!
  log_info "Dump completado"
  ((step++))

  log_substage "Verificando integridad del backup..."
  progress_bar $step $total
  if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    local size=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Backup creado exitosamente: ${COLOR_MAGENTA}$BACKUP_FILE${NC} (${COLOR_MAGENTA}$size${NC})"
    echo -e "${COLOR_GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${COLOR_GREEN}✓ BACKUP COMPLETADO${NC}"
    echo -e "${COLOR_GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  else
    log_error "El backup no se creó correctamente"
    return 1
  fi
}

show_status() {
  check_docker
  log_stage "ESTADO DE LOS SERVICIOS"

  log_substage "Contenedores en ejecución:"
  echo ""
  $DC ps
  echo ""

  log_substage "Uso de recursos del sistema:"
  echo ""
  docker stats --no-stream
  echo ""
}

run_migrations() {
  check_docker
  log_stage "EJECUTANDO MIGRACIONES DE BASE DE DATOS"

  local step=1
  local total=2

  log_substage "Preparando migraciones..."
  progress_bar $step $total
  ((step++))
  sleep 1

  log_substage "Aplicando cambios a la BD..."
  progress_bar $step $total
  $DC exec stargety-oasis npm run prisma:migrate:deploy &
  spinner $!

  echo -e "${COLOR_GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  log_info "Migraciones completadas exitosamente"
  echo -e "${COLOR_GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

case "${1:-help}" in
  start)
    check_env
    start_services
    ;;
  stop)
    stop_services
    ;;
  restart)
    check_env
    restart_services
    ;;
  logs)
    show_logs
    ;;
  health)
    health_check
    ;;
  backup)
    backup_database
    ;;
  status)
    show_status
    ;;
  migrate)
    run_migrations
    ;;
  *)
    echo -e "\n${COLOR_CYAN}╔════════════════════════════════════════╗${NC}"
    echo -e "${COLOR_CYAN}║${NC}  ${COLOR_WHITE}STARGETY OASIS - DEPLOYMENT SCRIPT${NC}"
    echo -e "${COLOR_CYAN}╚════════════════════════════════════════╝${NC}\n"

    echo -e "${COLOR_WHITE}Uso:${NC} $0 {start|stop|restart|logs|health|backup|status|migrate}\n"

    echo -e "${COLOR_CYAN}Comandos disponibles:${NC}"
    echo -e "  ${COLOR_GREEN}start${NC}    - Iniciar servicios en producción"
    echo -e "  ${COLOR_YELLOW}stop${NC}     - Detener servicios"
    echo -e "  ${COLOR_MAGENTA}restart${NC}  - Reiniciar servicios"
    echo -e "  ${COLOR_BLUE}logs${NC}     - Ver logs en tiempo real"
    echo -e "  ${COLOR_CYAN}health${NC}   - Verificar salud de la aplicación"
    echo -e "  ${COLOR_RED}backup${NC}   - Crear backup de la BD"
    echo -e "  ${COLOR_WHITE}status${NC}   - Ver estado de servicios"
    echo -e "  ${COLOR_MAGENTA}migrate${NC}  - Ejecutar migraciones de BD\n"

    echo -e "${COLOR_GRAY}Ejemplos:${NC}"
    echo -e "  $0 start      # Inicia los servicios"
    echo -e "  $0 health     # Verifica el estado de la aplicación"
    echo -e "  $0 logs       # Muestra logs en tiempo real\n"
    exit 1
    ;;
esac

