# LXC Container Configuration for Stargety Oasis

## Container Specifications
- **OS**: Ubuntu 22.04 LTS or Debian 12
- **CPU**: 2 cores minimum (4 cores recommended for production)
- **RAM**: 4GB minimum (8GB recommended for production)
- **Storage**: 20GB minimum (50GB recommended for production)
- **Network**: Bridge configuration with static IP

## Proxmox VE Configuration Commands

```bash
# Create LXC container
pct create 100 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname stargety-oasis \
  --cores 2 \
  --memory 4096 \
  --rootfs local-lvm:20 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.1.100/24,gw=192.168.1.1 \
  --ssh-public-keys ~/.ssh/id_rsa.pub \
  --unprivileged 1

# Start container
pct start 100

# Enter container
pct enter 100
```

## Network Configuration
- Static IP: 192.168.1.100 (adjust based on your network)
- Gateway: 192.168.1.1
- DNS: 8.8.8.8, 8.8.4.4
- Ports to expose: 3000 (frontend), 3001 (backend), 80/443 (nginx)

## Security Configuration
- SSH key-based authentication only
- Firewall rules for specific ports
- Regular security updates
- Non-root user for application deployment

## Resource Monitoring
- CPU usage should stay below 80%
- Memory usage should stay below 85%
- Disk I/O monitoring for database operations
- Network bandwidth monitoring for real-time features

## Backup Strategy
- Daily snapshots of container
- Weekly full backups
- Database dumps before major updates
- Configuration files backup

Note: For development, we'll use local Docker containers to simulate the LXC environment.
