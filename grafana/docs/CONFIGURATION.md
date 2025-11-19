# Grafana Configuration Documentation

## Overview

This document describes the Grafana configuration files and their settings.

## Configuration Files

### grafana.ini (Development)

**Purpose:** Development environment configuration

**Settings:**
```ini
[server]
protocol = http
http_port = 3000
root_url = %(protocol)s://%(domain)s:7777/grafana/
serve_from_sub_path = true

[auth.proxy]
enabled = true
header_name = X-WEBAUTH-USER
header_property = username
auto_sign_up = true

[users]
default_theme = system
```

**Key Settings:**
- **Port**: 3000 (internal)
- **Root URL**: `http://domain:7777/grafana/` (sub-path)
- **Proxy Auth**: Enabled with `X-WEBAUTH-USER` header
- **Auto Sign Up**: Enabled
- **Default Theme**: System (follows OS theme)

---

### grafana.next.ini (Next Environment)

**Purpose:** Next/preview environment configuration

**Settings:**
```ini
[server]
protocol = http
http_port = 3000
root_url = %(protocol)s://%(domain)s:7677/grafana/
serve_from_sub_path = true

[auth.proxy]
enabled = true
header_name = X-WEBAUTH-USER
header_property = username
auto_sign_up = true

[users]
default_theme = system
```

**Key Settings:**
- **Port**: 3000 (internal)
- **Root URL**: `http://domain:7677/grafana/` (sub-path, different port)
- **Proxy Auth**: Enabled
- **Auto Sign Up**: Enabled
- **Default Theme**: System

---

## Server Configuration

### Protocol and Port

**protocol = http**
- HTTP protocol (consider HTTPS for production)

**http_port = 3000**
- Internal Grafana port
- Exposed via Docker port mapping

### Root URL

**root_url**
- Base URL for Grafana
- Used for redirects and links
- Format: `%(protocol)s://%(domain)s:PORT/grafana/`

**serve_from_sub_path = true**
- Enables sub-path serving
- Grafana accessible at `/grafana/` path
- Required for reverse proxy setups

---

## Authentication Configuration

### Proxy Authentication

**enabled = true**
- Enables proxy authentication
- Requires reverse proxy with auth header

**header_name = X-WEBAUTH-USER**
- Header name for username
- Backend/frontend sets this header
- Grafana uses for authentication

**header_property = username**
- Property to extract from header
- Username for Grafana user

**auto_sign_up = true**
- Automatically creates users
- Users created on first access
- No manual user creation needed

### Authentication Flow

```
1. User accesses Grafana
   ↓
2. Reverse Proxy adds X-WEBAUTH-USER header
   ↓
3. Grafana reads header
   ↓
4. Creates user if not exists (auto_sign_up)
   ↓
5. Authenticates user
   ↓
6. Grants access
```

---

## User Configuration

### Default Theme

**default_theme = system**
- Follows system theme (light/dark)
- Users can override in preferences
- Matches OS/browser theme

---

## Datasource Configuration

### datasource.yaml (Development)

**Purpose:** Development datasource configuration

**Configuration:**
```yaml
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    uid: PBFA97CFB590B2093
    jsonData:
      httpMethod: POST
```

**Settings:**
- **Name**: Prometheus
- **Type**: prometheus
- **Access**: proxy (Grafana proxies requests)
- **URL**: `http://prometheus:9090` (Docker service name)
- **Default**: Yes (default datasource)
- **UID**: Unique identifier
- **HTTP Method**: POST (for queries)

---

### datasource.release.yaml (Production)

**Purpose:** Production/release datasource configuration

**Configuration:**
```yaml
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://pluto_prometheus_1:9090
    isDefault: true
    uid: PBFA97CFB590B2093
    jsonData:
      httpMethod: POST
```

**Settings:**
- **URL**: `http://pluto_prometheus_1:9090` (Docker Compose service name)
- Other settings same as development

---

### datasource.next.yaml (Next Environment)

**Purpose:** Next/preview environment datasource configuration

**Configuration:**
```yaml
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://pluto-next_prometheus_1:9090
    isDefault: true
    uid: PBFA97CFB590B2093
    jsonData:
      httpMethod: POST
```

**Settings:**
- **URL**: `http://pluto-next_prometheus_1:9090` (Next environment service name)
- Other settings same as development

---

## Dashboard Provisioning

### dashboard.yaml

**Purpose:** Dashboard provisioning configuration

**Configuration:**
```yaml
apiVersion: 1

providers:
  - name: "Dashboard provider"
    orgId: 1
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: false
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

**Settings:**
- **Name**: Dashboard provider name
- **Org ID**: 1 (default organization)
- **Type**: file (file-based provisioning)
- **Disable Deletion**: false (allow deletion)
- **Update Interval**: 10 seconds (check for updates)
- **Allow UI Updates**: false (dashboards read-only from UI)
- **Path**: `/var/lib/grafana/dashboards` (dashboard directory)
- **Folders from Structure**: true (use directory structure for folders)

**Behavior:**
- Automatically loads dashboards from `/var/lib/grafana/dashboards`
- Updates every 10 seconds
- Dashboards created by backend are automatically available
- UI edits are not persisted (read-only)

---

## Configuration Management

### Environment-Specific Configs

Each environment has its own configuration:

**Development:**
- `grafana.ini` (root URL: `:7777`)
- `datasource.yaml` (target: `prometheus:9090`)

**Production/Release:**
- `grafana.ini` (root URL: `:7777`)
- `datasource.release.yaml` (target: `pluto_prometheus_1:9090`)

**Next:**
- `grafana.next.ini` (root URL: `:7677`)
- `datasource.next.yaml` (target: `pluto-next_prometheus_1:9090`)

### Dockerfile Selection

Different Dockerfiles use different configs:
- `Dockerfile` → `grafana.ini` + `datasource.release.yaml`
- `Dockerfile.next` → `grafana.next.ini` + `datasource.next.yaml`
- `Dockerfile.development` → Uses default (no config copied)

---

## Best Practices

1. **Root URL Configuration**
   - Must match actual access URL
   - Include port if not standard
   - Include sub-path if used

2. **Proxy Authentication**
   - Ensure reverse proxy sets header
   - Use secure headers in production
   - Consider HTTPS

3. **Datasource Configuration**
   - Use service names in Docker networks
   - Verify network connectivity
   - Test datasource connection

4. **Dashboard Provisioning**
   - Use file-based for automation
   - Set appropriate update interval
   - Consider read-only for production

---

## Troubleshooting

### Authentication Issues

**Issue:** Cannot access Grafana
- **Solution**: Check proxy authentication header, verify `X-WEBAUTH-USER` is set

**Issue:** Users not created
- **Solution**: Verify `auto_sign_up = true`, check header format

### Datasource Issues

**Issue:** Datasource not connecting
- **Solution**: Verify Prometheus URL, check network connectivity

**Issue:** Wrong datasource URL
- **Solution**: Check configuration file matches environment

### Dashboard Issues

**Issue:** Dashboards not appearing
- **Solution**: Verify dashboard directory, check provisioning config

**Issue:** Dashboards not updating
- **Solution**: Check update interval, verify file changes

---

## Next Steps

- Review [Docker Setup](./DOCKER.md) for deployment
- Check [Dashboards Documentation](./DASHBOARDS.md) for dashboard details
- Understand [Integration Guide](./INTEGRATION.md) for service integration

