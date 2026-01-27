# 🔧 Troubleshooting y Monitoreo - Stargety Oasis

## Problemas Comunes

### 1. Contenedor no inicia

**Síntoma:** `docker-compose up` falla o contenedor se detiene inmediatamente

**Soluciones:**
```bash
# Ver logs detallados
docker-compose logs stargety-oasis

# Verificar que .env.production existe
ls -la .env.production

# Reconstruir imagen
docker-compose build --no-cache stargety-oasis

# Iniciar con output
docker-compose up stargety-oasis
```

### 2. Error de conexión a BD

**Síntoma:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Soluciones:**
```bash
# Verificar que PostgreSQL está corriendo
docker-compose ps postgres

# Verificar DATABASE_URL en .env.production
cat .env.production | grep DATABASE_URL

# Probar conexión
docker-compose exec postgres psql -U stargety -d stargety_oasis -c "SELECT 1"

# Reiniciar PostgreSQL
docker-compose restart postgres
```

### 3. Puerto ya en uso

**Síntoma:** `Error: bind: address already in use`

**Soluciones:**
```bash
# Encontrar proceso usando puerto 3001
lsof -i :3001

# Matar proceso
kill -9 <PID>

# O cambiar puerto en docker-compose.yml
# ports:
#   - "3002:3001"
```

### 4. Migraciones fallan

**Síntoma:** `Error: Migration failed`

**Soluciones:**
```bash
# Ver estado de migraciones
docker-compose exec stargety-oasis npx prisma migrate status

# Resolver migraciones pendientes
docker-compose exec stargety-oasis npx prisma migrate resolve --rolled-back <migration_name>

# Forzar reset (⚠️ CUIDADO: borra datos)
docker-compose exec stargety-oasis npx prisma migrate reset --force
```

### 5. Aplicación lenta

**Síntoma:** Respuestas lentas, timeouts

**Soluciones:**
```bash
# Monitorear recursos
docker stats stargety-oasis

# Ver logs de errores
docker-compose logs -f stargety-oasis | grep -i error

# Aumentar límites de memoria en docker-compose.yml
# deploy:
#   resources:
#     limits:
#       memory: 2G

# Verificar conexiones de BD
docker-compose exec postgres psql -U stargety -d stargety_oasis -c "SELECT count(*) FROM pg_stat_activity;"
```

### 6. WebSocket no conecta

**Síntoma:** Errores de conexión en cliente, socket.io no funciona

**Soluciones:**
```bash
# Verificar que socket.io está escuchando
docker-compose exec stargety-oasis lsof -i :3001

# Verificar CORS en servidor
# Revisar server/src/index.ts

# Verificar URLs en cliente
# REACT_APP_WS_URL debe ser wss:// en producción

# Reiniciar servicios
docker-compose restart stargety-oasis
```

### 7. Certificado SSL inválido

**Síntoma:** Errores de certificado en navegador

**Soluciones:**
```bash
# Verificar certificado
openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout

# Renovar con Let's Encrypt
certbot renew --force-renewal

# Recargar Nginx
docker-compose exec nginx nginx -s reload
```

## Monitoreo

### Ver estado de servicios
```bash
docker-compose ps
```

### Monitorear recursos en tiempo real
```bash
docker stats --no-stream
```

### Ver logs en tiempo real
```bash
# Todos los servicios
docker-compose logs -f

# Solo aplicación
docker-compose logs -f stargety-oasis

# Últimas 100 líneas
docker-compose logs --tail=100 stargety-oasis

# Con timestamps
docker-compose logs -f --timestamps stargety-oasis
```

### Health check
```bash
# Verificar salud (local)
curl -v http://localhost:3001/health

# Con HTTPS (producción)
curl -v https://oasis.stargety.com/health
```

### Estadísticas de BD
```bash
# Conexiones activas
docker-compose exec postgres psql -U stargety -d stargety_oasis -c "SELECT count(*) FROM pg_stat_activity;"

# Tamaño de BD
docker-compose exec postgres psql -U stargety -d stargety_oasis -c "SELECT pg_size_pretty(pg_database_size('stargety_oasis'));"

# Tablas más grandes
docker-compose exec postgres psql -U stargety -d stargety_oasis -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

## Mantenimiento

### Backup manual
```bash
./deploy.sh backup
```

### Limpiar recursos no usados
```bash
# Contenedores parados
docker container prune

# Imágenes no usadas
docker image prune

# Volúmenes no usados
docker volume prune

# Todo
docker system prune -a
```

### Actualizar aplicación
```bash
# Descargar cambios
git pull origin main

# Reconstruir imagen
docker-compose build stargety-oasis

# Reiniciar
docker-compose restart stargety-oasis

# Ejecutar migraciones si es necesario
./deploy.sh migrate
```

### Escalar recursos
```bash
# Aumentar memoria en docker-compose.yml
# Luego reiniciar
docker-compose up -d
```

## Alertas Importantes

| Alerta | Acción |
|--------|--------|
| CPU > 80% | Investigar procesos, considerar escalar |
| Memoria > 90% | Aumentar límites o optimizar código |
| Errores en logs | Revisar y corregir inmediatamente |
| BD desconectada | Reiniciar PostgreSQL |
| Certificado expira en 30 días | Renovar certificado |
| Backups fallando | Verificar espacio en disco |

## Contacto y Soporte

Para problemas no resueltos:
1. Revisar logs completos: `docker-compose logs stargety-oasis`
2. Verificar variables de entorno: `cat .env.production`
3. Consultar documentación oficial de dependencias
4. Crear issue en repositorio con logs y contexto

