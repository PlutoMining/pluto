# Grafana Integration Documentation

## Overview

This document describes how Grafana integrates with other services in the Pluto ecosystem.

## Integration Points

### Prometheus

**Purpose:** Data source for metrics visualization

**Connection:**
- Grafana connects to Prometheus
- Uses PromQL queries
- Retrieves time-series data

**Configuration:**
- Datasource URL: `http://prometheus:9090` (varies by environment)
- Type: Prometheus
- Access: Proxy mode
- HTTP Method: POST

**Flow:**
```
Grafana Dashboard → PromQL Query → Prometheus API → Metrics Data → Visualization
```

**Queries:**
- Device-specific metrics: `{hostname}_power_watts`
- Overview metrics: `total_hashrate`
- Aggregations: `sum(...)`, `avg(...)`

---

### Backend Service

**Purpose:** Dashboard creation and management

**Integration Points:**

1. **Dashboard Creation**
   - Backend creates dashboard JSON files
   - Writes to `/var/lib/grafana/dashboards/`
   - Grafana automatically loads

2. **Dashboard Publishing**
   - Backend calls Grafana API
   - Publishes dashboards as public
   - Gets access tokens for embedding

3. **Dashboard Deletion**
   - Backend deletes dashboard files
   - Calls Grafana API to unpublish
   - Grafana automatically removes

**API Endpoints Used:**
- `GET /grafana/api/dashboards/uid/{uid}/public-dashboards`
- `POST /grafana/api/dashboards/uid/{uid}/public-dashboards`
- `PATCH /grafana/api/dashboards/uid/{uid}/public-dashboards/{publicUid}`
- `DELETE /grafana/api/dashboards/uid/{uid}/public-dashboards/{publicUid}`

**Authentication:**
- Uses `X-WEBAUTH-USER: admin` header
- Proxy authentication enabled

---

### Frontend

**Purpose:** Dashboard embedding and visualization

**Integration:**
- Frontend embeds Grafana dashboards in iframes
- Uses public dashboard URLs
- Applies custom styling

**Flow:**
```
Frontend → Iframe → Grafana Public Dashboard → Prometheus → Metrics
```

**URL Format:**
```
/grafana/public-dashboards/{accessToken}?orgId=1&theme={mode}&refresh=5s
```

**Styling:**
- Frontend applies custom CSS to iframe
- Matches frontend theme
- Hides Grafana UI elements

---

## Service Flow

### Complete Dashboard Flow

```
1. Backend Service
   ├─→ Device Polling (every 5 seconds)
   ├─→ Updates Prometheus Metrics
   └─→ Creates/Updates Dashboard JSON
   ↓
2. Grafana
   ├─→ Detects Dashboard File (every 10 seconds)
   ├─→ Loads Dashboard
   └─→ Publishes as Public Dashboard (via API)
   ↓
3. Frontend
   ├─→ Fetches Dashboard List
   ├─→ Gets Public URL
   └─→ Embeds in Iframe
   ↓
4. User
   └─→ Views Dashboard with Real-Time Metrics
```

---

## Authentication Flow

### Proxy Authentication

```
1. User Request
   ↓
2. Reverse Proxy (Frontend/Backend)
   ├─→ Adds X-WEBAUTH-USER: admin header
   └─→ Forwards to Grafana
   ↓
3. Grafana
   ├─→ Reads X-WEBAUTH-USER header
   ├─→ Creates user if not exists (auto_sign_up)
   └─→ Authenticates user
   ↓
4. Access Granted
```

### Public Dashboards

- **No authentication** required
- **Access token** in URL
- **Embeddable** in iframes
- **Read-only** access

---

## Network Configuration

### Service Discovery

**Development:**
- Prometheus: `prometheus:9090`
- Grafana: `grafana:3000`

**Production:**
- Prometheus: `pluto_prometheus_1:9090`
- Grafana: `pluto_grafana_1:3000`

**Next:**
- Prometheus: `pluto-next_prometheus_1:9090`
- Grafana: `pluto-next_grafana_1:3000`

### Network Requirements

- Grafana and Prometheus on same Docker network
- Service names must be resolvable
- Ports must be accessible

---

## Dashboard Lifecycle

### Creation Flow

1. **Backend** reads template
2. **Backend** replaces placeholders
3. **Backend** writes JSON file
4. **Grafana** detects file (10 seconds)
5. **Backend** publishes via API
6. **Grafana** creates public dashboard
7. **Backend** gets access token
8. **Frontend** embeds dashboard

### Update Flow

1. **Backend** updates JSON file
2. **Grafana** detects change (10 seconds)
3. **Grafana** reloads dashboard
4. **Public dashboard** updates automatically

### Deletion Flow

1. **Backend** unpublishes via API
2. **Backend** deletes JSON file
3. **Grafana** detects removal (10 seconds)
4. **Grafana** removes dashboard

---

## API Integration

### Backend → Grafana API

**Authentication:**
```http
X-WEBAUTH-USER: admin
Origin: {GF_HOST}
```

**Endpoints:**
- `GET /api/dashboards/uid/{uid}/public-dashboards`
- `POST /api/dashboards/uid/{uid}/public-dashboards`
- `PATCH /api/dashboards/uid/{uid}/public-dashboards/{publicUid}`
- `DELETE /api/dashboards/uid/{uid}/public-dashboards/{publicUid}`

**Response Format:**
```json
{
  "uid": "public-dashboard-uid",
  "dashboardUid": "dashboard-uid",
  "accessToken": "access-token",
  "isEnabled": true,
  "timeSelectionEnabled": true
}
```

---

## Frontend Integration

### Dashboard Embedding

**Iframe Setup:**
```tsx
<iframe
  src={`${dashboardPublicUrl}&theme=${colorMode}&refresh=5s`}
  style={{ width: "100%", height: "100%", border: "none" }}
/>
```

**Custom Styling:**
- Frontend applies CSS to iframe content
- Matches frontend theme
- Hides Grafana UI elements

**Theme Support:**
- Light/dark mode
- Passed via URL parameter
- Grafana applies theme

---

## Best Practices

1. **Dashboard Management**
   - Use backend for creation/updates
   - Keep templates in version control
   - Test template changes

2. **Public Dashboards**
   - Use for embedding only
   - Consider security implications
   - Monitor access

3. **Network Configuration**
   - Use Docker networks
   - Verify service names
   - Test connectivity

4. **Authentication**
   - Use proxy authentication
   - Secure in production
   - Consider HTTPS

---

## Troubleshooting

### Integration Issues

**Issue:** Dashboards not appearing
- **Solution**: Check provisioning config, verify file path, check update interval

**Issue:** Datasource not connecting
- **Solution**: Verify Prometheus URL, check network connectivity

**Issue:** Public dashboard not accessible
- **Solution**: Verify publishing API call, check access token, verify URL

**Issue:** Authentication failing
- **Solution**: Check proxy header, verify `X-WEBAUTH-USER` is set

---

## Next Steps

- Review [Configuration Documentation](./CONFIGURATION.md) for config details
- Check [Docker Setup](./DOCKER.md) for deployment
- Review [Dashboards Documentation](./DASHBOARDS.md) for dashboard details

