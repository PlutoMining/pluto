#!/bin/sh

# Imposta permessi di scrittura per Prometheus sulla directory /prometheus
echo "Setting permissions for Prometheus data directory..."
chmod -R 777 /prometheus

# Stampa i permessi per confermare
ls -ld /prometheus

echo "Prometheus permissions set successfully!"
