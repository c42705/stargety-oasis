# 🔒 Checklist de Seguridad - Stargety Oasis Producción

## Antes del Despliegue

### Secretos y Credenciales
- [ ] **JWT_SECRET**: Generar clave segura (mínimo 32 caracteres)
  ```bash
  openssl rand -base64 32
  ```
- [ ] **DATABASE_PASSWORD**: Cambiar contraseña por defecto
- [ ] **POSTGRES_PASSWORD**: Cambiar en docker-compose.yml
- [ ] Verificar que NO hay secretos en el código
  ```bash
  grep -r "password\|secret\|token" --include="*.ts" --include="*.js" server/src/
  ```

### Variables de Entorno
- [ ] Crear `.env.production` desde `.env.production.example`
- [ ] Verificar que `.env.production` está en `.gitignore`
- [ ] No commitear archivos `.env`
- [ ] Usar variables de entorno para todas las configuraciones sensibles

### Base de Datos
- [ ] Cambiar usuario y contraseña de PostgreSQL
- [ ] Habilitar SSL en conexión a BD (si es remota)
- [ ] Configurar backups automáticos
- [ ] Verificar permisos de usuario en BD
- [ ] Ejecutar migraciones: `npm run prisma:migrate:deploy`

### Docker
- [ ] Verificar que la aplicación corre como usuario no-root
- [ ] Usar imágenes base actualizadas (node:18-alpine)
- [ ] Escanear imágenes por vulnerabilidades
  ```bash
  docker scan stargety-oasis:latest
  ```
- [ ] Usar multi-stage builds (ya implementado ✓)
- [ ] Minimizar tamaño de imagen

### Certificados SSL/TLS
- [ ] Obtener certificados válidos (Let's Encrypt recomendado)
- [ ] Configurar renovación automática
- [ ] Usar TLS 1.2 mínimo
- [ ] Configurar HSTS headers

### Firewall y Red
- [ ] Abrir solo puertos necesarios (80, 443)
- [ ] Cerrar puerto 5432 (PostgreSQL) a internet
- [ ] Configurar security groups en cloud
- [ ] Usar VPN para acceso administrativo

### Aplicación
- [ ] Validar todas las entradas de usuario
- [ ] Implementar rate limiting
- [ ] Configurar CORS correctamente
- [ ] Habilitar CSRF protection
- [ ] Usar headers de seguridad (X-Frame-Options, etc.)

### Monitoreo y Logging
- [ ] Configurar logging centralizado
- [ ] NO loguear datos sensibles (passwords, tokens)
- [ ] Configurar alertas para errores críticos
- [ ] Monitorear uso de recursos
- [ ] Revisar logs regularmente

### Backups
- [ ] Configurar backups automáticos de BD
- [ ] Probar restauración de backups
- [ ] Almacenar backups en ubicación segura
- [ ] Encriptar backups
- [ ] Documentar procedimiento de recuperación

## Durante el Despliegue

### Verificaciones Iniciales
- [ ] Verificar que todos los servicios están corriendo
  ```bash
  docker-compose ps
  ```
- [ ] Verificar health check
  ```bash
  curl https://oasis.stargety.com/health
  ```
- [ ] Revisar logs para errores
  ```bash
  docker-compose logs stargety-oasis
  ```

### Pruebas Funcionales
- [ ] Acceder a la aplicación desde navegador
- [ ] Probar login/autenticación
- [ ] Probar funcionalidades críticas
- [ ] Verificar WebSocket (si aplica)
- [ ] Probar upload de archivos

### Performance
- [ ] Verificar tiempos de respuesta
- [ ] Monitorear uso de CPU/memoria
- [ ] Verificar conexiones de BD
- [ ] Probar bajo carga

## Después del Despliegue

### Monitoreo Continuo
- [ ] Revisar logs diariamente
- [ ] Monitorear métricas de performance
- [ ] Verificar alertas de seguridad
- [ ] Revisar accesos no autorizados

### Mantenimiento
- [ ] Actualizar dependencias mensualmente
- [ ] Parchear vulnerabilidades inmediatamente
- [ ] Rotar secretos periódicamente
- [ ] Revisar y actualizar políticas de seguridad

### Incidentes
- [ ] Documentar cualquier incidente
- [ ] Realizar análisis post-mortem
- [ ] Implementar mejoras preventivas
- [ ] Comunicar a usuarios si es necesario

## Herramientas Recomendadas

| Herramienta | Propósito |
|-------------|----------|
| Snyk | Escanear vulnerabilidades |
| OWASP ZAP | Pruebas de seguridad |
| Fail2ban | Protección contra ataques |
| Prometheus | Monitoreo de métricas |
| ELK Stack | Logging centralizado |

## Referencias
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

