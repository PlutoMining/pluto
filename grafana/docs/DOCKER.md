# Grafana Docker Documentation

## Overview

This document describes the Docker setup for Grafana in the Pluto project.

## Dockerfiles

### Dockerfile (Production/Release)

**Purpose:** Production/release build

**Base Image:** `grafana/grafana:11.1.2`

**Configuration:**
```dockerfile
FROM grafana/grafana:11.1.2
COPY ./grafana/grafana.ini /etc/grafana/grafana.ini
COPY ./grafana/dashboard.yaml /etc/grafana/provisioning/dashboards/main.yaml
COPY ./grafana/datasource.release.yaml /etc/grafana/provisioning/datasources/main.yaml
```

**Features:**
- Uses official Grafana image (version 11.1.2)
- Copies server configuration
- Copies dashboard provisioning config
- Copies datasource configuration (release)

**Build:**
```bash
docker build -f Dockerfile -t pluto-grafana .
```

**Run:**
```bash
docker run -p 3001:3000 pluto-grafana
```

---

### Dockerfile.next

**Purpose:** Next/preview environment build

**Base Image:** `grafana/grafana:11.1.2`

**Configuration:**
```dockerfile
FROM grafana/grafana:11.1.2
COPY ./grafana/grafana.next.ini /etc/grafana/grafana.ini
COPY ./grafana/dashboard.yaml /etc/grafana/provisioning/dashboards/main.yaml
COPY ./grafana/datasource.next.yaml /etc/grafana/provisioning/datasources/main.yaml
```

**Features:**
- Uses official Grafana image
- Copies next environment server config
- Copies dashboard provisioning config
- Copies datasource configuration (next)

**Build:**
```bash
docker build -f Dockerfile.next -t pluto-grafana-next .
```

**Run:**
```bash
docker run -p 3001:3000 pluto-grafana-next
```

---

### Dockerfile.development

**Purpose:** Development build (minimal)

**Base Image:** `grafana/grafana:11.1.2`

**Configuration:**
```dockerfile
FROM grafana/grafana:11.1.2
```

**Features:**
- Uses official Grafana image
- No configuration copied (use volume mounts)
- For development with live config editing

**Build:**
```bash
docker build -f Dockerfile.development -t pluto-grafana-dev .
```

**Run with Volumes:**
```bash
docker run -p 3001:3000 \
  -v $(pwd)/grafana/grafana.ini:/etc/grafana/grafana.ini \
  -v $(pwd)/grafana/datasource.yaml:/etc/grafana/provisioning/datasources/main.yaml \
  -v $(pwd)/grafana/dashboard.yaml:/etc/grafana/provisioning/dashboards/main.yaml \
  pluto-grafana-dev
```

---

## Docker Compose Integration

### Service Configuration

**Example docker compose.yml:**
```yaml
services:
  grafana:
    build:
      context: .
      dockerfile: grafana/Dockerfile
    ports:
      - "3001:3000"
    networks:
      - pluto-network
    depends_on:
      - prometheus
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/templates:/var/lib/grafana/dashboards
```

### Network Requirements

- Must be on same network as Prometheus
- Service name must match datasource configuration
- Port 3000 must be exposed (mapped to 3001 or 7777/7677)

---

## Port Configuration

### Internal Port
- **3000**: Grafana web UI (internal)

### External Ports
- **3001**: Development (direct access)
- **7777**: Production/release (via reverse proxy at `/grafana/`)
- **7677**: Next environment (via reverse proxy at `/grafana/`)

### Port Mapping
```bash
-p 3001:3000  # Direct access
-p 7777:3000  # Via reverse proxy
```

---

## Volume Mounts

### Configuration Files
```bash
-v $(pwd)/grafana/grafana.ini:/etc/grafana/grafana.ini
-v $(pwd)/grafana/datasource.yaml:/etc/grafana/provisioning/datasources/main.yaml
-v $(pwd)/grafana/dashboard.yaml:/etc/grafana/provisioning/dashboards/main.yaml
```

### Dashboard Directory
```bash
-v ./grafana/templates:/var/lib/grafana/dashboards
```

### Data Persistence
```bash
-v grafana-data:/var/lib/grafana
```

**Data Stored:**
- Dashboard definitions
- User preferences
- Organization settings
- Alert configurations

---

## Environment Variables

Grafana can be configured via environment variables (though this setup uses config files).

**Common Variables:**
- `GF_SERVER_HTTP_PORT`: HTTP port (default: 3000)
- `GF_SERVER_ROOT_URL`: Root URL
- `GF_SECURITY_ADMIN_PASSWORD`: Admin password
- `GF_AUTH_PROXY_ENABLED`: Enable proxy auth

---

## Health Checks

### Check Grafana Status
```bash
curl http://localhost:3001/api/health
```

### Check Datasources
```bash
curl http://localhost:3001/api/datasources
```

### Check Dashboards
```bash
curl http://localhost:3001/api/search?type=dash-db
```

---

## Accessing Grafana UI

### Web Interface
- **Direct**: `http://localhost:3001`
- **Via Proxy**: `http://localhost:7777/grafana/` (production)
- **Via Proxy**: `http://localhost:7677/grafana/` (next)

### Authentication
- Proxy authentication via `X-WEBAUTH-USER` header
- Auto sign-up enabled
- No manual login required (if proxy configured)

### Default Access
- Username: From `X-WEBAUTH-USER` header
- Password: Not required (proxy auth)
- Theme: System (follows OS theme)

---

## Dashboard Management

### Automatic Provisioning

Dashboards are automatically provisioned from:
- **Path**: `/var/lib/grafana/dashboards`
- **Update Interval**: 10 seconds
- **Source**: Backend creates dashboard JSON files

### Dashboard Creation

Backend service creates dashboards:
1. Reads template from `grafana/templates/`
2. Customizes with device hostname
3. Writes to `/var/lib/grafana/dashboards/`
4. Grafana automatically loads

### Dashboard Templates

**Location:** `grafana/templates/`

**Templates:**
- `bitaxe_dashboard_template.json` - Device dashboard
- `bitaxe_overview_dashboard_template.json` - Overview dashboard

---

## Best Practices

1. **Use Appropriate Dockerfile**
   - Production: `Dockerfile`
   - Next: `Dockerfile.next`
   - Development: `Dockerfile.development` with volumes

2. **Data Persistence**
   - Mount volume for Grafana data
   - Prevents data loss on restart
   - Preserves user settings

3. **Configuration Management**
   - Use environment-specific configs
   - Verify root URL matches access pattern
   - Test datasource connectivity

4. **Network Configuration**
   - Ensure Prometheus is accessible
   - Use Docker networks for service discovery
   - Verify service names match

5. **Security**
   - Use proxy authentication
   - Consider HTTPS in production
   - Restrict network access

---

## Troubleshooting

### Container Won't Start

**Issue:** Port already in use
- **Solution**: Change port mapping or kill process

**Issue:** Config file not found
- **Solution**: Verify COPY commands in Dockerfile

**Issue:** Permission denied
- **Solution**: Check file permissions, use correct user

### Cannot Access UI

**Issue:** Connection refused
- **Solution**: Check port mapping, verify container is running

**Issue:** Authentication failed
- **Solution**: Verify proxy authentication header

**Issue:** Wrong root URL
- **Solution**: Check `root_url` in config matches access URL

### Datasource Issues

**Issue:** Datasource not connecting
- **Solution**: Verify Prometheus URL, check network connectivity

**Issue:** Wrong datasource URL
- **Solution**: Check datasource config matches environment

### Dashboard Issues

**Issue:** Dashboards not appearing
- **Solution**: Verify dashboard directory, check provisioning config

**Issue:** Dashboards not updating
- **Solution**: Check update interval, verify file changes

---

## Next Steps

- Review [Configuration Documentation](./CONFIGURATION.md) for config details
- Check [Dashboards Documentation](./DASHBOARDS.md) for dashboard details
- Understand [Integration Guide](./INTEGRATION.md) for service integration

