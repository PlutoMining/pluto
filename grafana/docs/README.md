# Pluto Grafana Configuration Documentation

## Overview

The Grafana directory contains configuration files and Dockerfiles for running Grafana, a visualization and analytics platform. Grafana connects to Prometheus to visualize device metrics and provides dashboards for monitoring Bitcoin mining devices.

## Table of Contents

- [Configuration](./CONFIGURATION.md) - Grafana configuration files
- [Docker Setup](./DOCKER.md) - Docker configuration and deployment
- [Dashboards](./DASHBOARDS.md) - Dashboard templates and provisioning
- [Integration](./INTEGRATION.md) - Integration with Prometheus and backend

## Quick Start

### Docker

**Production:**
```bash
docker build -f Dockerfile -t pluto-grafana .
docker run -p 3001:3000 pluto-grafana
```

**Development:**
```bash
docker build -f Dockerfile.development -t pluto-grafana-dev .
docker run -p 3001:3000 pluto-grafana-dev
```

**Next Environment:**
```bash
docker build -f Dockerfile.next -t pluto-grafana-next .
docker run -p 3001:3000 pluto-grafana-next
```

## Key Features

1. **Dashboard Visualization**
   - Device-specific dashboards
   - Overview dashboard
   - Real-time metrics display
   - Historical data visualization

2. **Data Source Integration**
   - Prometheus datasource
   - Automatic provisioning
   - Default datasource configuration

3. **Authentication**
   - Proxy authentication
   - Web authentication header
   - Auto sign-up enabled

4. **Dashboard Provisioning**
   - Automatic dashboard loading
   - Template-based dashboards
   - File-based provisioning

## Configuration Files

- **grafana.ini** - Development configuration
- **grafana.next.ini** - Next environment configuration
- **datasource.yaml** - Development datasource
- **datasource.release.yaml** - Production datasource
- **datasource.next.yaml** - Next environment datasource
- **dashboard.yaml** - Dashboard provisioning configuration

## Dashboard Templates

- **bitaxe_dashboard_template.json** - Individual device dashboard template
- **bitaxe_overview_dashboard_template.json** - Overview dashboard template

## Integration

- **Prometheus**: Data source for metrics
- **Backend**: Creates and publishes dashboards
- **Frontend**: Embeds dashboards in iframes
- **Port**: 3000 (internal), exposed as 3001 or 7777/7677

## Next Steps

- Read the [Configuration Documentation](./CONFIGURATION.md) for detailed configuration
- Check the [Docker Setup](./DOCKER.md) for deployment
- Review the [Dashboards Documentation](./DASHBOARDS.md) for dashboard details
- Understand the [Integration Guide](./INTEGRATION.md) for service integration

