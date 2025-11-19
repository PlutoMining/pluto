# Prometheus Integration Documentation

## Overview

This document describes how Prometheus integrates with other services in the Pluto ecosystem.

## Integration Points

### Backend Service

**Purpose:** Scrapes metrics from backend service

**Endpoint:** `http://backend:7776/metrics`

**Flow:**
```
Prometheus → HTTP GET → Backend /metrics → Prometheus Format → Storage
```

**Metrics Collected:**
- Device-specific metrics (prefixed with hostname)
- Overview metrics (aggregated)
- Prometheus standard format

**Configuration:**
- Job name: `backend-metrics`
- Scrape interval: 5 seconds
- Metrics path: `/metrics`

---

### Grafana

**Purpose:** Provides data source for Grafana dashboards

**Connection:**
- Grafana connects to Prometheus
- Uses PromQL queries
- Visualizes metrics in dashboards

**Configuration:**
- Datasource URL: `http://prometheus:9090`
- Type: Prometheus
- Access: Proxy mode

**Flow:**
```
Grafana Dashboard → PromQL Query → Prometheus API → Metrics Data → Visualization
```

---

## Service Discovery

### Static Configuration

Prometheus uses static configuration for backend service:

**Development:**
```yaml
targets: ["backend:7776"]
```

**Production:**
```yaml
targets: ["pluto_backend_1:7776"]
```

**Next:**
```yaml
targets: ["pluto-next_backend_1:7676"]
```

### Network Requirements

- Prometheus and backend must be on same Docker network
- Service names must be resolvable
- Ports must be accessible

---

## Metrics Flow

### Complete Flow

```
1. Backend Service
   ├─→ Device Polling (every 5 seconds)
   ├─→ Updates Prometheus Metrics
   └─→ Exposes /metrics endpoint
   ↓
2. Prometheus
   ├─→ Scrapes /metrics (every 5 seconds)
   ├─→ Parses Prometheus Format
   └─→ Stores in Time-Series Database
   ↓
3. Grafana
   ├─→ Queries Prometheus via PromQL
   ├─→ Retrieves Metrics Data
   └─→ Visualizes in Dashboards
```

---

## Query Examples

### Device Metrics

**Device Power:**
```promql
mockaxe1_power_watts
```

**Device Hashrate:**
```promql
mockaxe1_hashrate_ghs
```

**Device Temperature:**
```promql
mockaxe1_temperature_celsius
```

### Overview Metrics

**Total Hardware:**
```promql
total_hardware
```

**Online Devices:**
```promql
hardware_online
```

**Total Hashrate:**
```promql
total_hashrate
```

**Average Hashrate:**
```promql
average_hashrate
```

### Aggregations

**Sum of All Device Power:**
```promql
sum({__name__=~".*_power_watts"})
```

**Average Temperature:**
```promql
avg({__name__=~".*_temperature_celsius"})
```

---

## Dashboard Integration

### Grafana Dashboards

Grafana dashboards use Prometheus as data source:

1. **Data Source Configuration**
   - Type: Prometheus
   - URL: `http://prometheus:9090`
   - Access: Proxy

2. **Panel Queries**
   - Use PromQL
   - Query device metrics
   - Query overview metrics

3. **Visualization**
   - Graphs, gauges, tables
   - Real-time updates
   - Historical data

---

## Performance Considerations

### Scrape Interval

- **Current**: 5 seconds
- **Impact**: High-frequency updates
- **Load**: Moderate (depends on device count)

### Storage

- Metrics stored with timestamps
- Retention: Default Prometheus retention
- Consider retention policies for long-term storage

### Query Performance

- PromQL queries are fast
- Indexed by metric name and labels
- Consider query optimization for complex queries

---

## Monitoring Prometheus

### Health Checks

**Health Endpoint:**
```bash
curl http://localhost:9090/-/healthy
```

**Targets Status:**
```bash
curl http://localhost:9090/api/v1/targets
```

### Metrics

Prometheus exposes its own metrics:
- `prometheus_target_interval_length_seconds` - Scrape duration
- `prometheus_target_scrapes_exceeded_sample_limit_total` - Scrape errors
- `prometheus_tsdb_head_samples` - Sample count

---

## Best Practices

1. **Network Configuration**
   - Use Docker networks
   - Verify service names
   - Test connectivity

2. **Scrape Configuration**
   - Appropriate scrape interval
   - Monitor scrape duration
   - Handle scrape errors

3. **Storage Management**
   - Configure retention
   - Monitor disk usage
   - Consider long-term storage

4. **Query Optimization**
   - Use efficient PromQL queries
   - Avoid expensive aggregations
   - Cache frequently used queries

---

## Troubleshooting

### Integration Issues

**Issue:** Metrics not appearing in Grafana
- **Solution**: Verify Prometheus datasource configuration, check query syntax

**Issue:** Targets down
- **Solution**: Check network connectivity, verify backend is running

**Issue:** Scrape errors
- **Solution**: Check backend `/metrics` endpoint, verify format

---

## Next Steps

- Review [Configuration Documentation](./CONFIGURATION.md) for config details
- Check [Docker Setup](./DOCKER.md) for deployment

