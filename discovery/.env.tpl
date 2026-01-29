# Discovery Service Environment Variables
# Copy this file to .env.local and customize as needed

# Server port
PORT=7775

# Enable mock device detection
DETECT_MOCK_DEVICES=true

# Mock discovery service URL (if DETECT_MOCK_DEVICES is true)
# Discovery runs in host network mode, so use localhost to reach services
# Mock service is exposed on host port 7770
MOCK_DISCOVERY_HOST=http://localhost:7770

# Hostname to use for mock device IPs
# For Docker: use host.docker.internal so backend containers can reach mock devices
# For local: use localhost (default)
# Leave empty to auto-detect from MOCK_DISCOVERY_HOST
MOCK_DEVICE_HOST=host.docker.internal

# ARP scan tuning
# Defaults are chosen to be robust on LANs where some devices respond slowly.
# - ARP_SCAN_RETRY: how many times to retry unanswered hosts
# - ARP_SCAN_TIMEOUT_MS: per-host timeout in milliseconds
# - ARP_SCAN_IGNORE_DUPS: ignore duplicate replies
# - ARP_SCAN_INTERFACES: optional comma-separated list of interfaces to scan (auto-detect when unset)
ARP_SCAN_RETRY=3
ARP_SCAN_TIMEOUT_MS=2000
ARP_SCAN_IGNORE_DUPS=true
# ARP_SCAN_INTERFACES=enp1s0
