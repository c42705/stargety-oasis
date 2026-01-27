# ⚡ Quick Start - Producción en 5 Minutos

## Paso 1: Preparar Variables de Entorno (2 min)

```bash
# Copiar archivo de ejemplo
cp .env.production.example .env.production

# Editar con tus valores
nano .env.production
```

**Valores CRÍTICOS a cambiar:**
```bash
JWT_SECRET=tu-clave-segura-aqui  # Generar: openssl rand -base64 32
DATABASE_URL=postgresql://stargety:tu-password@postgres:5432/stargety_oasis
CLIENT_URL=https://oasis.stargety.com
REACT_APP_API_URL=https://oasis.stargety.com/api
REACT_APP_WS_URL=wss://oasis.stargety.com
```

## Paso 2: Iniciar Servicios (1 min)

```bash
# Opción A: Usar script (recomendado)
./deploy.sh start

# Opción B: Comando directo
docker-compose --profile production up -d
```

## Paso 3: Verificar Despliegue (1 min)

```bash
# Ver estado
docker-compose ps

# Health check
curl http://localhost:3001/health

# Ver logs
docker-compose logs -f stargety-oasis
```

## Paso 4: Ejecutar Migraciones (1 min)

```bash
./deploy.sh migrate

# O manualmente
docker-compose exec stargety-oasis npm run prisma:migrate:deploy
```

## ✅ ¡Listo!

Tu aplicación está corriendo en producción.

**Acceso:**
- Aplicación: `https://oasis.stargety.com`
- API: `https://oasis.stargety.com/api`
- Health: `https://oasis.stargety.com/health`

---

## Comandos Útiles

```bash
# Ver logs en tiempo real
./deploy.sh logs

# Crear backup
./deploy.sh backup

# Reiniciar servicios
./deploy.sh restart

# Ver estado de recursos
./deploy.sh status

# Detener servicios
./deploy.sh stop
```

---

## 🔒 Seguridad - NO OLVIDES

- [ ] Cambiar `JWT_SECRET`
- [ ] Cambiar contraseña de PostgreSQL
- [ ] Configurar HTTPS/SSL
- [ ] Revisar `SECURITY_CHECKLIST.md`
- [ ] Configurar firewall
- [ ] Habilitar backups automáticos

---

## 📚 Documentación Completa

- **PRODUCTION_DEPLOYMENT.md** - Guía detallada
- **SECURITY_CHECKLIST.md** - Checklist de seguridad
- **TROUBLESHOOTING.md** - Solución de problemas
- **nginx.conf** - Configuración de reverse proxy

---

## 🆘 Problemas?

```bash
# Ver logs detallados
docker-compose logs stargety-oasis

# Verificar variables
cat .env.production

# Revisar TROUBLESHOOTING.md
```

**Estructura de archivos creados:**
```
.
├── PRODUCTION_DEPLOYMENT.md    ← Guía completa
├── SECURITY_CHECKLIST.md       ← Checklist de seguridad
├── TROUBLESHOOTING.md          ← Solución de problemas
├── QUICK_START_PRODUCTION.md   ← Este archivo
├── deploy.sh                   ← Script de despliegue
├── .env.production.example     ← Plantilla de variables
├── .env.production             ← TUS VARIABLES (crear)
├── nginx.conf                  ← Config de Nginx
├── Dockerfile                  ← Multi-stage build ✓
└── docker-compose.yml          ← Orquestación ✓
```

