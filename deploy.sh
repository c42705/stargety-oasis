#!/bin/bash

# Script de despliegue para Stargety Oasis en producción
# Uso: ./deploy.sh [start|stop|restart|logs|health|backup]

set -e

COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${COLOR_GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${COLOR_YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${COLOR_RED}[ERROR]${NC} $1"
}

# Verificar si .env.production existe
check_env() {
    if [ ! -f .env.production ]; then
        log_error ".env.production no encontrado"
        log_info "Crea el archivo .env.production con las variables necesarias"
        exit 1
    fi
}

# Iniciar servicios
start_services() {
    log_info "Iniciando servicios en modo producción..."
    docker-compose --profile production up -d
    log_info "Servicios iniciados ✓"
    sleep 5
    health_check
}

# Detener servicios
stop_services() {
    log_info "Deteniendo servicios..."
    docker-compose --profile production down
    log_info "Servicios detenidos ✓"
}

# Reiniciar servicios
restart_services() {
    log_warn "Reiniciando servicios..."
    stop_services
    sleep 2
    start_services
}

# Ver logs
show_logs() {
    log_info "Mostrando logs (Ctrl+C para salir)..."
    docker-compose logs -f stargety-oasis
}

# Health check
health_check() {
    log_info "Verificando salud de la aplicación..."
    
    if docker-compose ps stargety-oasis | grep -q "Up"; then
        sleep 3
        if curl -s http://localhost:3001/health > /dev/null; then
            log_info "✓ Aplicación saludable"
        else
            log_warn "⚠ Health check falló, pero contenedor está corriendo"
        fi
    else
        log_error "✗ Contenedor no está corriendo"
        return 1
    fi
}

# Backup de BD
backup_database() {
    log_info "Creando backup de la base de datos..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backups/stargety_oasis_${TIMESTAMP}.sql"
    
    mkdir -p backups
    docker-compose exec -T postgres pg_dump -U stargety stargety_oasis > "$BACKUP_FILE"
    
    log_info "Backup creado: $BACKUP_FILE ✓"
}

# Mostrar estado
show_status() {
    log_info "Estado de los servicios:"
    docker-compose ps
    echo ""
    log_info "Uso de recursos:"
    docker stats --no-stream
}

# Ejecutar migraciones
run_migrations() {
    log_info "Ejecutando migraciones de BD..."
    docker-compose exec stargety-oasis npm run prisma:migrate:deploy
    log_info "Migraciones completadas ✓"
}

# Menú principal
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
        echo "Uso: $0 {start|stop|restart|logs|health|backup|status|migrate}"
        echo ""
        echo "Comandos:"
        echo "  start    - Iniciar servicios en producción"
        echo "  stop     - Detener servicios"
        echo "  restart  - Reiniciar servicios"
        echo "  logs     - Ver logs en tiempo real"
        echo "  health   - Verificar salud de la aplicación"
        echo "  backup   - Crear backup de la BD"
        echo "  status   - Ver estado de servicios"
        echo "  migrate  - Ejecutar migraciones de BD"
        exit 1
        ;;
esac

