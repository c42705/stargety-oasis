#!/usr/bin/env python3
import paramiko
import sys

def connect_and_execute():
    # Connect to main server
    print("🔗 Connecting to oasis.stargety.com...")
    client1 = paramiko.SSHClient()
    client1.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client1.connect('oasis.stargety.com', username='root', password='Netflix$1000')
    print("✓ Connected to main server\n")
    
    # SSH to Docker VM from main server
    print("🔗 Connecting to Docker VM (192.168.0.205)...")
    transport = client1.get_transport()
    dest_addr = ('192.168.0.205', 22)
    local_addr = ('192.168.0.200', 22)
    channel = transport.open_channel('direct-tcpip', dest_addr, local_addr)
    
    client2 = paramiko.SSHClient()
    client2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client2.connect('192.168.0.205', username='root', password='Netflix$1000', sock=channel)
    print("✓ Connected to Docker VM\n")
    
    # Execute commands
    print("=" * 50)
    print("📂 Current Directory:")
    print("=" * 50)
    stdin, stdout, stderr = client2.exec_command('pwd')
    print(stdout.read().decode())
    
    print("=" * 50)
    print("📋 Files in stargety-oasis:")
    print("=" * 50)
    stdin, stdout, stderr = client2.exec_command('cd ~/stargety-oasis && ls -lah')
    print(stdout.read().decode())
    
    print("=" * 50)
    print("🔍 Docker Status:")
    print("=" * 50)
    stdin, stdout, stderr = client2.exec_command('docker ps -a')
    docker_output = stdout.read().decode()
    print(docker_output if docker_output.strip() else "⚠️  No containers found")

    print("=" * 50)
    print("🔍 Service Status (docker-compose):")
    print("=" * 50)
    stdin, stdout, stderr = client2.exec_command('cd ~/stargety-oasis && docker-compose --profile production ps')
    compose_output = stdout.read().decode()
    print(compose_output if compose_output.strip() else "⚠️  No services found")

    print("=" * 50)
    print("📊 Production Logs (Last 50 lines):")
    print("=" * 50)
    stdin, stdout, stderr = client2.exec_command('cd ~/stargety-oasis && docker-compose logs stargety-oasis --tail=50')
    logs_output = stdout.read().decode()
    if logs_output.strip():
        print(logs_output)
    else:
        print("⚠️  No logs available - containers may not be running")
    
    # Close connections
    client2.close()
    client1.close()
    print("\n✓ Done")

if __name__ == '__main__':
    try:
        connect_and_execute()
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

