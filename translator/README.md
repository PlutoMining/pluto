# SV2 Translator Proxy (tProxy)

The SV2 Translator Proxy bridges Stratum V1 miners to Stratum V2 pools, enabling SV1 devices to mine on SV2 pools without firmware updates.

## Configuration

The translator configuration is managed by Pluto's backend service. When a device is configured with SV2 protocol version, Pluto automatically:

1. Generates translator configuration based on the device's SV2 pool settings
2. Routes the device to connect to the translator (as SV1)
3. Translator forwards connections to the target SV2 pool

## Default Ports

- **SV1 Upstream (Miners)**: `34254`
- **SV2 Downstream (Pool)**: Configured per device/preset

## Configuration File

The translator uses a TOML configuration file located at `translator/config/tproxy-config.toml`. This file is dynamically updated by the backend service when devices are configured with SV2 settings.

## Docker Service

The translator runs as a Docker service in `docker-compose.dev.local.yml`. It:
- Exposes port `34254` for SV1 miner connections
- Mounts configuration from `translator/config/`
- Stores runtime data in `data/translator/`

## Health Checks

The translator includes a health check that verifies the upstream port is listening. The service will restart automatically if health checks fail.

## Next Steps

- JDC (Job Declarator Client) integration for improved efficiency and decentralization