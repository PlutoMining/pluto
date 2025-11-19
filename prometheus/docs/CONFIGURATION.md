# Prometheus Configuration Documentation

## Overview

This document describes the Prometheus configuration files and their settings.

## Configuration Files

### prometheus.yml (Development)

**Purpose:** Development environment configuration

**Target:** `backend:7776`

**Configuration:**
```yaml
global:
  scrape_interval: 5s

scrape_configs:
  - job_name: "backend-metrics"
    static_configs:
      - targets: ["backend:7776"]
    metrics_path: "/metrics"
```

**Settings:**
- **Scrape Interval**: 5 seconds
- **Job Name**: `backend-metrics`
- **Target**: `backend:7776` (Docker service name)
- **Metrics Path**: `/metrics`

---

### prometheus.release.yml (Production/Release)

**Purpose:** Production/release environment configuration

**Target:** `pluto_backend_1:7776`

**Configuration:**
```yaml
global:
  scrape_interval: 5s

scrape_configs:
  - job_name: "backend-metrics"
    static_configs:
      - targets: ["pluto_backend_1:7776"]
    metrics_path: "/metrics"
```

**Settings:**
- **Scrape Interval**: 5 seconds
- **Job Name**: `backend-metrics`
- **Target**: `pluto_backend_1:7776` (Docker Compose service name)
- **Metrics Path**: `/metrics`

**Usage:**
- Used in production Docker builds
- Referenced in `Dockerfile`

---

### prometheus.next.yml (Next Environment)

**Purpose:** Next/preview environment configuration

**Target:** `pluto-next_backend_1:7676`

**Configuration:**
```yaml
global:
  scrape_interval: 5s

scrape_configs:
  - job_name: "backend-metrics"
    static_configs:
      - targets: ["pluto-next_backend_1:7676"]
    metrics_path: "/metrics"
```

**Settings:**
- **Scrape Interval**: 5 seconds
- **Job Name**: `backend-metrics`
- **Target**: `pluto-next_backend_1:7676` (Next environment service name)
- **Metrics Path**: `/metrics`

**Usage:**
- Used in next/preview Docker builds
- Referenced in `Dockerfile.next`

---

## Configuration Options

### Global Settings

**scrape_interval: 5s**
- How often Prometheus scrapes targets
- 5 seconds = high-frequency monitoring
- Suitable for real-time device monitoring

### Scrape Configs

**job_name: "backend-metrics"**
- Name of the scraping job
- Used for labeling metrics
- Appears in Prometheus UI

**static_configs**
- Static target configuration
- List of targets to scrape
- Target format: `hostname:port`

**targets**
- Array of target endpoints
- Format: `["hostname:port"]`
- Must be accessible from Prometheus container

**metrics_path: "/metrics"**
- HTTP path to metrics endpoint
- Backend exposes metrics at `/metrics`
- Returns Prometheus format

---

## Target Configuration

### Development
- **Target**: `backend:7776`
- **Network**: Docker Compose network
- **Service**: Backend service name

### Production/Release
- **Target**: `pluto_backend_1:7776`
- **Network**: Docker Compose network
- **Service**: Full Docker Compose service name

### Next Environment
- **Target**: `pluto-next_backend_1:7676`
- **Network**: Next environment network
- **Service**: Next environment service name
- **Port**: 7676 (different from standard 7776)

---

## Metrics Collection

### Metrics Exposed by Backend

The backend service exposes metrics at `/metrics` endpoint:

**Device-Specific Metrics:**
- `{hostname}_power_watts`
- `{hostname}_voltage_volts`
- `{hostname}_current_amps`
- `{hostname}_temperature_celsius`
- `{hostname}_hashrate_ghs`
- `{hostname}_shares_accepted`
- `{hostname}_shares_rejected`
- `{hostname}_uptime_seconds`
- `{hostname}_free_heap_bytes`
- `{hostname}_core_voltage_volts`
- `{hostname}_frequency_mhz`
- `{hostname}_efficiency`

**Overview Metrics:**
- `total_hardware`
- `hardware_online`
- `hardware_offline`
- `total_hashrate`
- `average_hashrate`
- `total_power_watts`
- `firmware_version_distribution{version}`
- `shares_by_pool_accepted{pool}`
- `shares_by_pool_rejected{pool}`
- `total_efficiency`

### Scraping Process

1. **Prometheus** sends HTTP GET to `http://target/metrics`
2. **Backend** returns metrics in Prometheus format
3. **Prometheus** parses and stores metrics
4. **Process repeats** every 5 seconds

---

## Querying Metrics

### PromQL Examples

**Total Hardware:**
```promql
total_hardware
```

**Online Devices:**
```promql
hardware_online
```

**Device Power:**
```promql
mockaxe1_power_watts
```

**Total Hashrate:**
```promql
total_hashrate
```

**Average Hashrate:**
```promql
average_hashrate
```

**Shares by Pool:**
```promql
shares_by_pool_accepted{pool="Ocean Main"}
```

---

## Configuration Management

### Environment-Specific Configs

Each environment has its own configuration file:
- **Development**: `prometheus.yml`
- **Production**: `prometheus.release.yml`
- **Next**: `prometheus.next.yml`

### Dockerfile Selection

Different Dockerfiles use different configs:
- `Dockerfile` → `prometheus.release.yml`
- `Dockerfile.next` → `prometheus.next.yml`
- `Dockerfile.development` → Uses default (no config copied)

---

## Best Practices

1. **Scrape Interval**
   - 5 seconds is appropriate for real-time monitoring
   - Consider increasing for production if needed
   - Balance between freshness and load

2. **Target Configuration**
   - Use service names in Docker networks
   - Ensure network connectivity
   - Verify port accessibility

3. **Job Naming**
   - Use descriptive job names
   - Helps with metric organization
   - Appears in Prometheus UI

4. **Metrics Path**
   - Standard path is `/metrics`
   - Ensure backend exposes at this path
   - Verify metrics format

---

## Troubleshooting

### Metrics Not Scraping

**Issue:** Targets show as down
- **Solution**: Check network connectivity, verify target hostname/port

**Issue:** No metrics received
- **Solution**: Verify backend `/metrics` endpoint is accessible

**Issue:** Wrong target
- **Solution**: Check configuration file matches environment

### Configuration Not Applied

**Issue:** Changes not reflected
- **Solution**: Restart Prometheus container, verify config file copied correctly

**Issue:** Wrong config file used
- **Solution**: Check Dockerfile COPY command, verify file path

---

## Next Steps

- Review [Docker Setup](./DOCKER.md) for deployment
- Check [Integration Guide](./INTEGRATION.md) for service integration

