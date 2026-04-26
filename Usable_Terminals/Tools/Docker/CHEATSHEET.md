# Docker — Cheat Sheet

> **Path:** `C:\Program Files\Docker\Docker\resources\bin\docker.exe`  
> **Version:** Docker Desktop (CLI 28.1.1, Engine 28.1.1, Compose v5.1.1)  
> **Type:** Container runtime + orchestration  
> **AegisForge Role:** Service containers, database containers, deployment  
> **Status:** Docker Desktop running, WSL backend (docker-desktop distro)

---

## Core Concepts

Docker packages applications into **containers** — lightweight, isolated environments that include everything needed to run. **Images** are the blueprints; **containers** are running instances. **Compose** orchestrates multi-container apps.

---

## Container Lifecycle

```bash
# Run containers
docker run hello-world                     # Test installation
docker run -d --name myapp nginx           # Run detached (background) with name
docker run -it ubuntu bash                 # Interactive terminal
docker run -d -p 8080:80 nginx             # Map host:container ports
docker run -d -p 8080:80 -v ./data:/app/data nginx   # Mount volume
docker run --rm -it python:3.11 python     # Run + auto-remove when done
docker run -d --env-file .env myimage      # Load environment variables
docker run -d --restart unless-stopped myapp  # Auto-restart policy

# Manage containers
docker ps                                  # Running containers
docker ps -a                               # All containers (including stopped)
docker stop container_name                 # Graceful stop
docker start container_name                # Start stopped container
docker restart container_name              # Restart
docker kill container_name                 # Force stop
docker rm container_name                   # Remove stopped container
docker rm -f container_name                # Force remove (even if running)

# Interact with running container
docker exec -it container_name bash        # Shell into container
docker exec -it container_name sh          # Shell (Alpine Linux)
docker exec container_name ls /app         # Run command in container
docker logs container_name                 # View logs
docker logs -f container_name              # Follow logs (live)
docker logs --tail 100 container_name      # Last 100 lines
docker inspect container_name              # Full container details (JSON)
docker stats                               # Live resource usage (CPU/RAM)
docker top container_name                  # Processes inside container
```

---

## Images

```bash
# Image management
docker images                              # List local images
docker pull nginx:latest                   # Download image
docker pull python:3.11-slim              # Specific tag
docker rmi image_name                      # Remove image
docker rmi $(docker images -q --filter "dangling=true")  # Remove dangling images

# Build images
docker build -t myapp:latest .             # Build from Dockerfile in current dir
docker build -t myapp:v1.0 -f Dockerfile.prod .  # Custom Dockerfile
docker build --no-cache -t myapp .         # Build without cache
docker tag myapp:latest myregistry/myapp:v1.0     # Tag for registry

# Push to registry
docker login                               # Login to Docker Hub
docker push myregistry/myapp:v1.0          # Push image

# Image info
docker history image_name                  # Show image layers
docker inspect image_name                  # Full image details
```

---

## Dockerfile Reference

```dockerfile
# Start from base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy dependency files first (cache layer)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Set environment variable
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/health || exit 1

# Run command
CMD ["python", "app.py"]
```

### Dockerfile Best Practices
- Order instructions from least-changing to most-changing (caching)
- Use `.dockerignore` to exclude unnecessary files
- Use slim/alpine base images when possible
- Don't run as root: `RUN adduser --disabled-password appuser && USER appuser`
- Multi-stage builds reduce final image size

---

## Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

```bash
# Compose commands
docker compose up -d                       # Start all services (detached)
docker compose up -d --build               # Rebuild images + start
docker compose down                        # Stop + remove containers
docker compose down -v                     # Stop + remove containers + volumes
docker compose logs                        # All service logs
docker compose logs -f web                 # Follow specific service logs
docker compose ps                          # Status of services
docker compose exec web bash               # Shell into service
docker compose restart web                 # Restart specific service
docker compose pull                        # Pull latest images
docker compose build                       # Rebuild images
docker compose top                         # Processes in all containers
docker compose config                      # Validate + display resolved config
```

---

## Volumes & Data

```bash
# Named volumes
docker volume create mydata                # Create volume
docker volume ls                           # List volumes
docker volume inspect mydata               # Volume details
docker volume rm mydata                    # Remove volume
docker volume prune                        # Remove unused volumes

# Mount types
-v mydata:/app/data                        # Named volume
-v $(pwd)/data:/app/data                   # Bind mount (host directory)
-v /app/data                               # Anonymous volume
--mount type=bind,src=./data,dst=/app/data  # Explicit bind mount
```

---

## Networking

```bash
# Network management
docker network ls                          # List networks
docker network create mynetwork            # Create network
docker network inspect bridge              # Inspect default network
docker network connect mynetwork container  # Connect container to network
docker network disconnect mynetwork container

# Run on specific network
docker run -d --network mynetwork --name web nginx

# Container DNS — containers on same network can reach each other by name
# Example: web container can connect to db container as `db:5432`
```

---

## Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune                         # Dangling only
docker image prune -a                      # All unused

# Remove unused volumes
docker volume prune

# Nuclear option — remove everything unused
docker system prune                        # Containers + images + networks
docker system prune -a --volumes           # EVERYTHING unused (reclaim disk)

# Disk usage
docker system df                           # Show Docker disk usage
```

---

## Useful AegisForge Patterns

```bash
# Run PostgreSQL for development
docker run -d --name aegis-db \
  -p 5432:5432 \
  -e POSTGRES_USER=aegis \
  -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=aegisforge \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16

# Run Redis for caching
docker run -d --name aegis-redis -p 6379:6379 redis:7-alpine

# Quick Python environment
docker run -it --rm -v $(pwd):/app -w /app python:3.11 python script.py

# Check what's using disk space
docker system df -v

# Copy files from container
docker cp container_name:/app/output.txt ./output.txt

# Copy files into container
docker cp ./config.json container_name:/app/config.json

# Export/Import images (for offline transfer)
docker save myapp:latest | gzip > myapp.tar.gz
docker load < myapp.tar.gz
```

---

## Docker Desktop Specific

```bash
# Docker Desktop integration
docker context ls                          # List contexts (desktop-linux, etc.)
docker context use desktop-linux           # Switch context

# WSL integration
wsl -d docker-desktop                      # Shell into Docker's WSL distro

# Kubernetes (Docker Desktop built-in)
# Enable in Docker Desktop Settings → Kubernetes → Enable
kubectl config get-contexts                # Should show docker-desktop
kubectl config use-context docker-desktop  # Switch to Docker Desktop k8s
```
