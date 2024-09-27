#!/bin/sh

# Imposta permessi di scrittura per LevelDB sulla directory /leveldb
echo "Setting permissions for LevelDB data directory..."
chmod -R 777 /leveldb

# Stampa i permessi per confermare
ls -ld /leveldb

echo "LevelDB permissions set successfully!"
