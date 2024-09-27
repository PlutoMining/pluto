#!/bin/sh

# Imposta permessi di scrittura per Grafana sulla directory /var/lib/grafana
echo "Setting permissions for Grafana data directory..."
chmod -R 777 /grafana

# Stampa i permessi per confermare
ls -ld /grafana

echo "Grafana permissions set successfully!"

# Rimuove tutti i file e cartelle (inclusi quelli nascosti) sotto /grafana
echo "Removing contents of /grafana..."

# Rimuove tutti i file e cartelle sotto la directory /grafana
rm -rf /grafana/* /grafana/.* 2>/dev/null || true

echo "Contents of /grafana removed successfully!"
