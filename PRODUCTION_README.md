# 🚀 Stargety Oasis - Guía de Producción

## ⚡ Inicio Rápido (5 minutos)

```bash
# 1. Preparar variables de entorno
cp .env.production.example .env.production
nano .env.production  # Editar valores críticos

# 2. Iniciar servicios
./deploy.sh start

# 3. Verificar despliegue
./deploy.sh health

# 4. Ejecutar migraciones
./deploy.sh migrate
```

## 📖 Documentación

### Para Empezar
- **[QUICK_START_PRODUCTION.md](QUICK_START_PRODUCTION.md)** - Guía de inicio rápido (5 min)

### Para Entender
- **[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)** - Guía detallada de despliegue (15 min)

### Para Seguridad
- **[SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)** - Checklist de seguridad (20 min)

### Para Problemas
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Solución de problemas y monitoreo (30 min)

### Referencia Técnica
- **[BEST_PRACTICES_IMPLEMENTED.md](BEST_PRACTICES_IMPLEMENTED.md)** - Mejores prácticas implementadas

## 📊 Comandos Principales

```bash
./deploy.sh start       # Iniciar servicios
./deploy.sh stop        # Detener servicios
./deploy.sh restart     # Reiniciar servicios
./deploy.sh logs        # Ver logs en tiempo real
./deploy.sh health      # Verificar salud
./deploy.sh status      # Ver estado de servicios
./deploy.sh backup      # Crear backup de BD
./deploy.sh migrate     # Ejecutar migraciones
```

## 🔒 Variables Críticas

Edita `.env.production` con estos valores:

```bash
JWT_SECRET=<generar con: openssl rand -base64 32>
DATABASE_URL=postgresql://stargety:<password>@postgres:5432/stargety_oasis
CLIENT_URL=https://oasis.stargety.com
REACT_APP_API_URL=https://oasis.stargety.com/api
REACT_APP_WS_URL=wss://oasis.stargety.com
NTFY_SERVER_URL=https://ntfy.stargety.com
ALLOWED_ORIGINS=https://oasis.stargety.com,https://stargety.com
```

## ✨ Características

✅ Multi-stage Docker build
✅ Usuario no-root
✅ Health checks automáticos
✅ Nginx reverse proxy (SSL/TLS)
✅ Rate limiting
✅ Security headers
✅ Persistent volumes
✅ Backups automáticos
✅ Migraciones de BD
✅ Logging estructurado

## 🔐 Checklist de Seguridad

- [ ] Cambiar JWT_SECRET
- [ ] Cambiar contraseña PostgreSQL
- [ ] Configurar HTTPS/SSL
- [ ] Configurar firewall (puertos 80, 443)
- [ ] Habilitar backups automáticos
- [ ] Revisar SECURITY_CHECKLIST.md completo

## 📞 Soporte

```bash
# Ver logs
docker-compose logs stargety-oasis

# Ver estado
docker-compose ps

# Verificar variables
cat .env.production

# Consultar documentación
cat TROUBLESHOOTING.md
```

## 🎯 Próximos Pasos

1. Leer [QUICK_START_PRODUCTION.md](QUICK_START_PRODUCTION.md)
2. Crear `.env.production`
3. Ejecutar `./deploy.sh start`
4. Revisar [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)
5. Configurar backups y monitoreo

---

**¡Tu aplicación está lista para producción!** 🚀

