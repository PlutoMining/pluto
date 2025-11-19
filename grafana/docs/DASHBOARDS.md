# Grafana Dashboards Documentation

## Overview

This document describes the Grafana dashboard templates and provisioning system.

## Dashboard Templates

### Location

**Directory:** `grafana/templates/`

**Templates:**
- `bitaxe_dashboard_template.json` - Individual device dashboard
- `bitaxe_overview_dashboard_template.json` - Overview dashboard

---

### bitaxe_dashboard_template.json

**Purpose:** Template for individual device dashboards

**Usage:**
- Backend creates device-specific dashboards from this template
- Replaces `@@hostname@@` placeholders with device hostname
- Generates unique UID for each device

**Template Variables:**
- `@@hostname@@` - Replaced with sanitized device hostname

**Dashboard Features:**
- Device-specific metrics visualization
- Real-time data display
- Historical data graphs
- Device status indicators

**Creation Flow:**
1. Backend reads template
2. Finds all `@@hostname@@` occurrences
3. Replaces with device hostname
4. Generates unique UID
5. Writes to `/var/lib/grafana/dashboards/{hostname}.json`
6. Grafana automatically loads

---

### bitaxe_overview_dashboard_template.json

**Purpose:** Template for overview dashboard (all devices)

**Usage:**
- Backend creates overview dashboard from this template
- Aggregates metrics from all devices
- Single dashboard for system-wide view

**Dashboard Features:**
- Aggregated metrics
- Device count
- Total hashrate
- Total power consumption
- Device status overview

**Creation Flow:**
1. Backend reads template
2. Generates unique UID
3. Writes to `/var/lib/grafana/dashboards/overview.json`
4. Grafana automatically loads

---

## Dashboard Provisioning

### Configuration

**File:** `dashboard.yaml`

**Settings:**
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

### Provisioning Behavior

**Automatic Loading:**
- Grafana scans directory every 10 seconds
- New dashboards automatically appear
- Updated dashboards are reloaded

**Read-Only UI:**
- `allowUiUpdates: false` prevents UI edits
- Dashboards managed by backend
- Changes via backend API only

**Folder Structure:**
- `foldersFromFilesStructure: true`
- Directory structure creates folders
- Flat structure = default folder

---

## Dashboard Lifecycle

### Creation

1. **Backend Service** creates dashboard JSON
2. **Writes** to `/var/lib/grafana/dashboards/`
3. **Grafana** detects new file (within 10 seconds)
4. **Loads** dashboard automatically
5. **Publishes** as public dashboard via API

### Updates

1. **Backend Service** updates dashboard JSON
2. **Grafana** detects file change (within 10 seconds)
3. **Reloads** dashboard automatically

### Deletion

1. **Backend Service** deletes dashboard JSON
2. **Grafana** detects file removal (within 10 seconds)
3. **Removes** dashboard automatically
4. **Unpublishes** public dashboard via API

---

## Dashboard Structure

### Dashboard JSON Format

```json
{
  "uid": "unique-dashboard-id",
  "title": "Dashboard Title",
  "panels": [...],
  "templating": {...},
  "time": {...},
  "refresh": "5s"
}
```

### Key Properties

- **uid**: Unique identifier (14-character alphanumeric)
- **title**: Dashboard title (device hostname or "Overview")
- **panels**: Visualization panels (graphs, gauges, etc.)
- **templating**: Template variables
- **time**: Time range settings
- **refresh**: Auto-refresh interval

---

## Public Dashboards

### Publishing

Backend publishes dashboards as public dashboards:

1. **Creates** dashboard JSON file
2. **Waits** 2 seconds (for Grafana to detect)
3. **Calls** Grafana API to publish
4. **Gets** access token
5. **Returns** public URL

### Public URL Format

```
/grafana/public-dashboards/{accessToken}?orgId=1&theme={mode}&refresh=5s
```

### Access

- **No authentication** required
- **Embeddable** in iframes
- **Theme** support (light/dark)
- **Auto-refresh** configurable

---

## Dashboard Metrics

### Device Dashboard Metrics

**Power:**
- `{hostname}_power_watts`

**Voltage:**
- `{hostname}_voltage_volts`

**Current:**
- `{hostname}_current_amps`

**Temperature:**
- `{hostname}_temperature_celsius`

**Hashrate:**
- `{hostname}_hashrate_ghs`

**Shares:**
- `{hostname}_shares_accepted`
- `{hostname}_shares_rejected`

**System:**
- `{hostname}_uptime_seconds`
- `{hostname}_free_heap_bytes`
- `{hostname}_frequency_mhz`
- `{hostname}_efficiency`

### Overview Dashboard Metrics

**Hardware:**
- `total_hardware`
- `hardware_online`
- `hardware_offline`

**Performance:**
- `total_hashrate`
- `average_hashrate`
- `total_power_watts`
- `total_efficiency`

**Distribution:**
- `firmware_version_distribution{version}`
- `shares_by_pool_accepted{pool}`
- `shares_by_pool_rejected{pool}`

---

## Dashboard Customization

### Template Modification

To modify dashboard templates:

1. **Edit** template JSON file
2. **Add** new panels
3. **Modify** queries
4. **Update** visualizations
5. **Backend** uses updated template for new dashboards

### Adding New Metrics

1. **Backend** exposes new metric
2. **Update** template to include metric panel
3. **New dashboards** include metric
4. **Existing dashboards** need manual update or recreation

---

## Best Practices

1. **Template Design**
   - Use template variables for device-specific values
   - Design for multiple devices
   - Include all relevant metrics

2. **UID Generation**
   - Use unique UIDs (14-character alphanumeric)
   - Avoid conflicts
   - Deterministic per device

3. **Provisioning**
   - Use file-based provisioning for automation
   - Set appropriate update interval
   - Consider read-only for production

4. **Public Dashboards**
   - Use for embedding
   - Consider security implications
   - Monitor access

---

## Troubleshooting

### Dashboards Not Appearing

**Issue:** Dashboard file exists but not visible
- **Solution**: Check provisioning config, verify update interval, check file permissions

**Issue:** Wrong dashboard content
- **Solution**: Verify template replacement, check hostname sanitization

### Dashboard Updates Not Reflecting

**Issue:** Changes not appearing
- **Solution**: Check update interval, verify file was written, restart Grafana

**Issue:** Public dashboard not accessible
- **Solution**: Verify publishing API call, check access token, verify URL format

---

## Next Steps

- Review [Configuration Documentation](./CONFIGURATION.md) for config details
- Check [Docker Setup](./DOCKER.md) for deployment
- Understand [Integration Guide](./INTEGRATION.md) for service integration

