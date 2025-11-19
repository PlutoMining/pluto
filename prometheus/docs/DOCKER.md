# Prometheus Docker Documentation

## Overview

This document describes the Docker setup for Prometheus in the Pluto project.

## Dockerfiles

### Dockerfile (Production/Release)

**Purpose:** Production/release build

**Base Image:** `prom/prometheus:v2.53.1`

**Configuration:**
```dockerfile
FROM prom/prometheus:v2.53.1

COPY ./prometheus/prometheus.release.yml /etc/prometheus/prometheus.yml
```

**Features:**
- Uses official Prometheus image
- Copies release configuration
- Target: `pluto_backend_1:7776`

**Build:**
```bash
docker build -f Dockerfile -t pluto-prometheus .
```

**Run:**
```bash
docker run -p 9090:9090 pluto-prometheus
```

---

### Dockerfile.next

**Purpose:** Next/preview environment build

**Base Image:** `prom/prometheus:v2.53.1`

**Configuration:**
```dockerfile
FROM prom/prometheus:v2.53.1

COPY ./prometheus/prometheus.next.yml /etc/prometheus/prometheus.yml
```

**Features:**
- Uses official Prometheus image
- Copies next environment configuration
- Target: `pluto-next_backend_1:7676`

**Build:**
```bash
docker build -f Dockerfile.next -t pluto-prometheus-next .
```

**Run:**
```bash
docker run -p 9090:9090 pluto-prometheus-next
```

---

### Dockerfile.development

**Purpose:** Development build (minimal)

**Base Image:** `prom/prometheus:v2.53.1`

**Configuration:**
```dockerfile
FROM prom/prometheus:v2.53.1
```

**Features:**
- Uses official Prometheus image
- No configuration copied (use volume mount)
- For development with live config editing

**Build:**
```bash
docker build -f Dockerfile.development -t pluto-prometheus-dev .
```

**Run with Volume:**
```bash
docker run -p 9090:9090 \
  -v $(pwd)/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  pluto-prometheus-dev
```

---

## Docker Compose Integration

### Service Configuration

**Example docker compose.yml:**
```yaml
services:
  prometheus:
    build:
      context: .
      dockerfile: prometheus/Dockerfile
    ports:
      - "9090:9090"
    networks:
      - pluto-network
    depends_on:
      - backend
```

### Network Requirements

- Must be on same network as backend service
- Service name must match configuration target
- Port 9090 must be exposed

---

## Port Configuration

### Default Port
- **9090**: Prometheus web UI and API

### Backend Metrics Port
- **7776**: Backend metrics endpoint (development/release)
- **7676**: Backend metrics endpoint (next environment)

---

## Volume Mounts

### Configuration File
```bash
-v $(pwd)/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
```

### Data Persistence (Optional)
```bash
-v prometheus-data:/prometheus
```

---

## Environment Variables

Prometheus can be configured via environment variables, though this setup uses config files.

**Common Variables:**
- `PROMETHEUS_CONFIG_FILE`: Path to config file (default: `/etc/prometheus/prometheus.yml`)
- `PROMETHEUS_STORAGE_PATH`: Storage path (default: `/prometheus`)

---

## Health Checks

### Check Prometheus Status
```bash
curl http://localhost:9090/-/healthy
```

### Check Targets
```bash
curl http://localhost:9090/api/v1/targets
```

### Check Configuration
```bash
curl http://localhost:9090/api/v1/status/config
```

---

## Accessing Prometheus UI

### Web Interface
- **URL**: `http://localhost:9090`
- **Features**:
  - Query metrics (PromQL)
  - View targets
  - Check configuration
  - Graph visualization

### API Endpoints
- **Query**: `GET /api/v1/query?query=...`
- **Query Range**: `GET /api/v1/query_range?query=...&start=...&end=...`
- **Targets**: `GET /api/v1/targets`
- **Config**: `GET /api/v1/status/config`

---

## Best Practices

1. **Use Appropriate Dockerfile**
   - Production: `Dockerfile`
   - Next: `Dockerfile.next`
   - Development: `Dockerfile.development` with volume

2. **Network Configuration**
   - Ensure backend is accessible
   - Use Docker networks for service discovery
   - Verify service names match

3. **Data Persistence**
   - Mount volume for metrics storage
   - Prevents data loss on container restart
   - Consider retention policies

4. **Resource Limits**
   - Set memory limits
   - Monitor disk usage
   - Configure retention

---

## Troubleshooting

### Container Won't Start

**Issue:** Port already in use
- **Solution**: Change port mapping or kill process

**Issue:** Config file not found
- **Solution**: Verify COPY command in Dockerfile

**Issue:** Permission denied
- **Solution**: Check file permissions, use correct user

### Targets Not Scraping

**Issue:** Network connectivity
- **Solution**: Verify Docker network, check service names

**Issue:** Wrong port
- **Solution**: Verify backend port matches configuration

**Issue:** Backend not running
- **Solution**: Start backend service first

---

## Next Steps

- Review [Configuration Documentation](./CONFIGURATION.md) for config details
- Check [Integration Guide](./INTEGRATION.md) for service integration

