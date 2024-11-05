#!/bin/bash

# Create directories
mkdir -p dist/store/bemind-pluto/data
mkdir -p dist/store/bemind-pluto-dev/data

# Add .gitkeep files
touch dist/store/bemind-pluto/data/.gitkeep
touch dist/store/bemind-pluto-dev/data/.gitkeep

# Copy files
cp docker-compose.yml dist/store/bemind-pluto/
cp docker-compose.yml dist/store/bemind-pluto-dev/
cp umbrel-app.yml dist/store/bemind-pluto/
cp umbrel-app.yml dist/store/bemind-pluto-dev/

# Remove comments using sed
sed -i '' -e '/^[[:space:]]*#/d' -e 's/[[:space:]]*#.*$//' dist/store/bemind-pluto/docker-compose.yml
sed -i '' -e '/^[[:space:]]*#/d' -e 's/[[:space:]]*#.*$//' dist/store/bemind-pluto/umbrel-app.yml
sed -i '' -e '/^[[:space:]]*#/d' -e 's/[[:space:]]*#.*$//' dist/store/bemind-pluto-dev/docker-compose.yml
sed -i '' -e '/^[[:space:]]*#/d' -e 's/[[:space:]]*#.*$//' dist/store/bemind-pluto-dev/umbrel-app.yml

# Specific modifications for bemind-pluto using yq

# Remove the 'mock' service from docker-compose.yml
yq e 'del(.services.mock)' -i dist/store/bemind-pluto/docker-compose.yml

# Remove specific environment variables from 'services.discovery.environment'
yq e '
  .services.discovery.environment |=
    map(select(. != "DETECT_MOCK_DEVICES=true" and . != "MOCK_DISCOVERY_HOST=http://172.17.0.1:7770"))
' -i dist/store/bemind-pluto/docker-compose.yml

# Specific modifications for bemind-pluto-dev using sed

# Update the name in umbrel-app.yml
sed -i '' 's/^name: Pluto$/name: Pluto Dev/' dist/store/bemind-pluto-dev/umbrel-app.yml

# Replace 'bemind-pluto' with 'bemind-pluto-dev' in specific fields

# Update 'id' field
sed -i '' 's/^id: bemind-pluto$/id: bemind-pluto-dev/' dist/store/bemind-pluto-dev/umbrel-app.yml

# Update 'icon' URL
sed -i '' 's|\(icon: .*\)bemind-pluto/|\1bemind-pluto-dev/|' dist/store/bemind-pluto-dev/umbrel-app.yml

# # Update 'repo' URL
# sed -i '' 's|repo: https://gitlab.com/bemindinteractive/pluto$|repo: https://gitlab.com/bemindinteractive/pluto-dev|' dist/store/bemind-pluto-dev/umbrel-app.yml

# # Update 'support' URL
# sed -i '' 's|support: https://gitlab.com/bemindinteractive/pluto/issues$|support: https://gitlab.com/bemindinteractive/pluto-dev/issues|' dist/store/bemind-pluto-dev/umbrel-app.yml

# Update 'gallery' URLs
sed -i '' 's|\(https://bemind-umbrel-app-store.s3.eu-south-1.amazonaws.com/\)bemind-pluto/|\1bemind-pluto-dev/|g' dist/store/bemind-pluto-dev/umbrel-app.yml

echo "Directories dist/store/bemind-pluto and dist/store/bemind-pluto-dev created and configured successfully."

# Or using Perl
perl -i -pe 's/\b(7\d{3})\b/($1 - 100)/ge' dist/store/bemind-pluto-dev/docker-compose.yml
perl -i -pe 's/\b(7\d{3})\b/($1 - 100)/ge' dist/store/bemind-pluto-dev/umbrel-app.yml

echo "Port numbers adjusted by subtracting 100 for 4-digit numbers starting with '7'."

echo "Directories dist/store/bemind-pluto and dist/store/bemind-pluto-dev created and configured successfully."
