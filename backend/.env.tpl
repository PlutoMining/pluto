# Backend Service Environment Variables
# Copy this file to .env.local and customize as needed

# Server port (default: 3000)
PORT=7776

# Automatically start listening to devices on startup
AUTO_LISTEN=true

# Discovery service URL
# Discovery runs in host network mode, so use host.docker.internal for Docker
# For Docker: use host.docker.internal (e.g., http://host.docker.internal:7775)
# For local: use localhost (e.g., http://localhost:7775)
DISCOVERY_SERVICE_HOST=http://host.docker.internal:7775

# Grafana host URL
# For Docker: use service name (e.g., http://grafana:3000)
# For local: use localhost (e.g., http://localhost:3001)
GF_HOST=http://grafana:3000

# Delete Grafana dashboards and metrics when device is removed
DELETE_DATA_ON_DEVICE_REMOVE=false
