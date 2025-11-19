# Pluto Prometheus Configuration Documentation

## Overview

The Prometheus directory contains configuration files and Dockerfiles for running Prometheus, a time-series database and monitoring system. Prometheus scrapes metrics from the Pluto backend service and stores them for querying and visualization in Grafana.

## Table of Contents

- [Configuration](./CONFIGURATION.md) - Prometheus configuration files
- [Docker Setup](./DOCKER.md) - Docker configuration and deployment
- [Integration](./INTEGRATION.md) - Integration with backend and Grafana

## Quick Start

### Docker

**Production:**
```bash
docker build -f Dockerfile -t pluto-prometheus .
docker run -p 9090:9090 pluto-prometheus
```

**Development:**
```bash
docker build -f Dockerfile.development -t pluto-prometheus-dev .
docker run -p 9090:9090 pluto-prometheus-dev
```

**Next Environment:**
```bash
docker build -f Dockerfile.next -t pluto-prometheus-next .
docker run -p 9090:9090 pluto-prometheus-next
```

## Key Features

1. **Metrics Scraping**
   - Scrapes metrics from backend service
   - 5-second scrape interval
   - Automatic target discovery

2. **Time-Series Storage**
   - Stores metrics with timestamps
   - Queryable via PromQL
   - Retention policies

3. **Service Discovery**
   - Static configuration
   - Targets backend service

## Configuration Files

- **prometheus.yml** - Development configuration
- **prometheus.release.yml** - Production/release configuration
- **prometheus.next.yml** - Next environment configuration

## Integration

- **Backend Service**: Scrapes metrics from `/metrics` endpoint
- **Grafana**: Provides data source for dashboards
- **Port**: 9090 (default Prometheus port)

## Next Steps

- Read the [Configuration Documentation](./CONFIGURATION.md) for detailed configuration
- Check the [Docker Setup](./DOCKER.md) for deployment
- Review the [Integration Guide](./INTEGRATION.md) for service integration

