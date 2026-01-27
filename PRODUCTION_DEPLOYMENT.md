# 🚀 Guía de Despliegue en Producción - Stargety Oasis

## Requisitos Previos
- Docker y Docker Compose instalados
- Variables de entorno configuradas
- Base de datos PostgreSQL lista
- Certificados SSL (si usas HTTPS)

## 1. Preparar Variables de Entorno para Producción

Crea un archivo `.env.production` en la raíz del proyecto:

```bash
# Seguridad
NODE_ENV=production
JWT_SECRET=tu-clave-secreta-muy-segura-cambiar-esto
JWT_EXPIRES_IN=7d
TWO_FA_CODE_EXPIRY_MINUTES=5
TWO_FA_MAX_ATTEMPTS=3

# Base de Datos
DATABASE_URL=postgresql://stargety:tu-password-seguro@postgres:5432/stargety_oasis

# URLs
PORT=3001
CLIENT_URL=https://oasis.stargety.com
REACT_APP_API_URL=https://oasis.stargety.com/api
REACT_APP_WS_URL=wss://oasis.stargety.com

# Servicios Externos
NTFY_SERVER_URL=https://ntfy.stargety.com

# Logging
LOG_LEVEL=info
```

## 2. Ejecutar en Modo Producción

### Opción A: Con PostgreSQL en Docker (Recomendado)

```bash
# Construir y ejecutar todos los servicios
docker-compose --profile production up -d

# Ver logs
docker-compose logs -f stargety-oasis

# Verificar salud
docker-compose ps
```

### Opción B: Con PostgreSQL Externo

Modifica `docker-compose.yml` para usar tu BD externa:

```yaml
stargety-oasis:
  environment:
    DATABASE_URL: postgresql://user:pass@tu-host:5432/db
```

## 3. Verificar Despliegue

```bash
# Health check
curl https://oasis.stargety.com/health

# Ver logs en tiempo real
docker-compose logs -f stargety-oasis

# Acceder a la aplicación
# https://oasis.stargety.com
```

## 4. Gestión de Datos

```bash
# Ejecutar migraciones
docker-compose exec stargety-oasis npm run prisma:migrate:deploy

# Backup de BD
docker-compose exec postgres pg_dump -U stargety stargety_oasis > backup.sql

# Restaurar BD
docker-compose exec -T postgres psql -U stargety stargety_oasis < backup.sql
```

## 5. Monitoreo y Mantenimiento

```bash
# Ver recursos
docker stats

# Limpiar contenedores parados
docker-compose down

# Actualizar imagen
docker-compose pull
docker-compose up -d
```

## 6. Seguridad en Producción

✅ **Checklist:**
- [ ] Cambiar JWT_SECRET
- [ ] Cambiar contraseña PostgreSQL
- [ ] Configurar HTTPS/SSL
- [ ] Usar variables de entorno seguras
- [ ] Configurar firewall
- [ ] Habilitar backups automáticos
- [ ] Monitorear logs regularmente

## 7. Nginx (Reverse Proxy Opcional)

Si usas Nginx, crea `nginx.conf`:

```nginx
upstream app {
    server stargety-oasis:3001;
}

server {
    listen 80;
    server_name tu-dominio.com;
    
    location / {
        proxy_pass http://app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Ejecuta: `docker-compose --profile production up -d nginx`

## Troubleshooting

| Problema | Solución |
|----------|----------|
| Contenedor no inicia | `docker-compose logs stargety-oasis` |
| BD no conecta | Verificar DATABASE_URL y health de postgres |
| Puerto en uso | `lsof -i :3001` y cambiar puerto |
| Permisos denegados | Verificar usuario no-root en Dockerfile |

