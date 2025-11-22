#!/bin/bash

# Copyright (C) 2024 Alberto Gangarossa.
# Pluto is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License
# as published by the Free Software Foundation, version 3.
# See <https://www.gnu.org/licenses/>.

# Function to update the version in the specified files
update_version() {
    local service=$1
    local new_version=$2
    local image_sha=$3
    local registry=$4

    # Validate inputs
    if [ -z "$service" ] || [ -z "$new_version" ] || [ -z "$image_sha" ] || [ -z "$registry" ]; then
        echo "Error: update_version called with invalid parameters" >&2
        return 1
    fi

    # Update docker-compose files with the correct image and SHA
    # Match old GitLab format (registry.gitlab.com/plutomining/pluto/pluto-SERVICE)
    # Match old GitHub format (ghcr.io/plutomining/pluto/pluto-SERVICE) - for migration
    # Match new GitHub registry format (ghcr.io/plutomining/pluto-SERVICE) - current format
    # Also match broken references with partial @ or @sha256:
    # Replace with the new GitHub registry format
    local new_image="${registry}/pluto-$service:${new_version}@sha256:${image_sha}"
    
    # Update each file: replace all old formats with the new format
    for file in umbrel-apps/pluto-next/docker-compose.yml docker-compose.next.local.yml umbrel-apps/pluto/docker-compose.yml docker-compose.release.local.yml; do
        if [ ! -f "$file" ]; then
            echo "Warning: File $file not found, skipping..." >&2
            continue
        fi
        
        # Replace GitLab registry format
        sed -i -E "s|registry\.gitlab\.com/plutomining/pluto/pluto-$service:[^[:space:]]+|${new_image}|g" "$file"
        # Replace old GitHub registry format (ghcr.io/plutomining/pluto/pluto-SERVICE)
        sed -i -E "s|ghcr\.io/plutomining/pluto/pluto-$service:[^[:space:]]+|${new_image}|g" "$file"
        # Replace new GitHub registry format (ghcr.io/plutomining/pluto-SERVICE) - including broken references with @ or @sha256:
        sed -i -E "s|ghcr\.io/plutomining/pluto-$service:${new_version}(@sha256:[^[:space:]]*)?(@[^[:space:]]*)?|${new_image}|g" "$file"
    done
}

# Function to update the version in umbrel-app.yml
update_umbrel_version() {
    local new_version=$1

    sed -i -E "s/version: \".*\"/version: \"${new_version}\"/g" umbrel-apps/pluto-next/umbrel-app.yml
    sed -i -E "s/Version .*/Version ${new_version}/g" umbrel-apps/pluto-next/umbrel-app.yml

    sed -i -E "s/version: \".*\"/version: \"${new_version}\"/g" umbrel-apps/pluto/umbrel-app.yml
    sed -i -E "s/Version .*/Version ${new_version}/g" umbrel-apps/pluto/umbrel-app.yml

#    sed -i -E "s/version: \".*\"/version: \"${new_version}\"/g" umbrel-apps/pluto/umbrel-app.yml
#    sed -i -E "s/Version .*/Version ${new_version}/g" umbrel-apps/plutoumbrel-app.yml
}

# Function to get the current version from the correct umbrel app file
get_current_app_version() {
    grep 'version:' umbrel-apps/pluto/umbrel-app.yml | sed -E 's/version: "(.*)"/\1/'
}

# Function to get the current version from the package.json file
get_current_version() {
    local service=$1
    # Extract version number, handling both "1.1" and "1.1.0" formats, with optional pre-release suffix
    grep '"version":' $service/package.json | sed -E 's/.*"version":\s*"([0-9]+\.[0-9]+(\.[0-9]+)?(-[a-zA-Z]+(\.[0-9]+)?)?)".*/\1/'
}

# Function to check the current Git branch
check_git_branch() {
    local branch=$(git rev-parse --abbrev-ref HEAD)
    if [ "$branch" != "main" ]; then
        echo "Error: you must be on the 'main' branch to release."
        exit 1
    fi
}

# Function to get the SHA of a Docker image
get_image_sha() {
    local image=$1
    local sha
    local manifest_json

    # Try to get the image manifest
    if ! manifest_json=$(docker buildx imagetools inspect "$image" --format "{{json .Manifest}}" 2>&1); then
        echo "Error: Failed to inspect image $image" >&2
        echo "$manifest_json" >&2
        return 1
    fi

    # Extract the digest from the manifest
    sha=$(echo "$manifest_json" | jq -r '.digest // empty')
    
    if [ -z "$sha" ] || [ "$sha" = "null" ]; then
        echo "Error: Could not extract SHA256 digest from image $image" >&2
        return 1
    fi

    # Return just the SHA256 part (without "sha256:" prefix)
    echo "${sha#sha256:}"
}

# main

main() {
    # GitHub Container Registry (ghcr.io)
    # Format: ghcr.io/OWNER/IMAGE_NAME
    DOCKER_REGISTRY=ghcr.io/plutomining

    # Default values for flags
    SKIP_LOGIN=false

    # Parse command line arguments
    for arg in "$@"; do
        case $arg in
        --skip-login)
            SKIP_LOGIN=true
            shift # Remove --skip-login from processing
            ;;
        esac
    done

    # Only perform Docker login if the skip login flag is not set
    if [ "$SKIP_LOGIN" = false ]; then
        echo "Logging in to GitHub Container Registry (ghcr.io)..."
        echo "Enter your GitHub username:"
        read GITHUB_USERNAME
        echo "Enter your GitHub Personal Access Token (PAT) with 'write:packages' scope:"
        echo "Create one at: https://github.com/settings/tokens"
        read -s GITHUB_TOKEN
        
        echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin
        
        if [ $? -ne 0 ]; then
            echo "Error: Docker login failed. Please check your credentials."
            exit 1
        fi
    else
        echo "Skipping Docker login..."
    fi

    # Prompt for the new version of the app (umbrel-app.yml stable or next)
    current_app_version=$(get_current_app_version)
    echo "Current app version is $current_app_version. Enter the new app version (press Enter to keep $current_app_version):"
    read new_app_version

    # If user presses enter, keep the current version
    if [ -z "$new_app_version" ]; then
        new_app_version=$current_app_version
    fi

    # Update the version in umbrel-app.yml
    update_umbrel_version "$new_app_version"

    # Get and set versions for each service
    for service in backend discovery frontend grafana prometheus; do
        current_version=$(get_current_version $service)
        # Properly quote the version to prevent command execution issues
        eval "current_${service}_version=\"$current_version\""

        echo "Current version for $service is $current_version. Enter the new version (press Enter to keep $current_version):"
        read new_version

        if [ -z "$new_version" ]; then
            new_version=$current_version
        fi

        # Properly quote the version to prevent command execution issues
        eval "${service}_version=\"$new_version\""
    done

    # Update the files with the new versions and install dependencies
    for service in backend discovery frontend grafana prometheus; do
        eval new_version=\$${service}_version
        eval current_version=\$current_${service}_version

        if [ "$new_version" != "$current_version" ]; then

            # Save the current package.json version in case we need to restore it
            local package_json_backup="${service}/package.json.backup"
            cp "$service/package.json" "$package_json_backup"

            # Update the version in the service's package.json
            # Handle both "1.1" and "1.1.0" formats, with optional pre-release suffix
            if ! sed -i -E "s/\"version\": \"[0-9]+\.[0-9]+(\.[0-9]+)?(-[a-zA-Z]+(\.[0-9]+)?)?\"/\"version\": \"${new_version}\"/" $service/package.json; then
                echo "Error: Failed to update version in $service/package.json" >&2
                rm -f "$package_json_backup"
                exit 1
            fi

            # Run npm install in the service to update lockfile
            echo "Running npm install in $service..."
            if ! (cd $service && npm install); then
                echo "Error: Failed to run npm install in $service" >&2
                echo "Restoring package.json to previous version..." >&2
                mv "$package_json_backup" "$service/package.json"
                exit 1
            fi

            echo "Building Docker image for $service with context $(pwd) and Dockerfile $service/Dockerfile..."

            # Build and push both version and latest tags in a single command to avoid race conditions
            if ! docker buildx build --platform linux/amd64,linux/arm64 \
                -t ${DOCKER_REGISTRY}/pluto-$service:"$new_version" \
                -t ${DOCKER_REGISTRY}/pluto-$service:latest \
                -f $service/Dockerfile . --push; then
                echo "Error: Failed to build and push image for $service" >&2
                echo "Restoring package.json to previous version ${current_version}..." >&2
                mv "$package_json_backup" "$service/package.json"
                exit 1
            fi

            # Wait a moment for the registry to update
            echo "Waiting for registry to update..."
            sleep 2

            # Get the updated SHA after build
            if ! image_sha=$(get_image_sha "${DOCKER_REGISTRY}/pluto-$service:${new_version}"); then
                echo "Error: Failed to retrieve SHA256 for newly built image ${DOCKER_REGISTRY}/pluto-$service:${new_version}" >&2
                echo "Restoring package.json to previous version ${current_version}..." >&2
                mv "$package_json_backup" "$service/package.json"
                exit 1
            fi

            # Build succeeded, remove the backup
            rm -f "$package_json_backup"
        else
            echo "Skipping Docker build for $service as the version has not changed."
            # Get the existing SHA of the current image
            if ! image_sha=$(get_image_sha "${DOCKER_REGISTRY}/pluto-$service:${new_version}"); then
                echo "Error: Failed to retrieve SHA256 for existing image ${DOCKER_REGISTRY}/pluto-$service:${new_version}" >&2
                echo "The image may not exist in the registry. Please build it first or check the version." >&2
                exit 1
            fi
        fi

        # Validate that we have a valid SHA before updating files
        if [ -z "$image_sha" ] || [ ${#image_sha} -ne 64 ]; then
            echo "Error: Invalid SHA256 digest retrieved for $service: '$image_sha'" >&2
            exit 1
        fi

        echo "Retrieved SHA256 for $service: $image_sha"

        # Update files with the SHA for the service
        if ! update_version $service "$new_version" "$image_sha" "$DOCKER_REGISTRY"; then
            echo "Error: Failed to update version in docker-compose files for $service" >&2
            exit 1
        fi
    done

    # Stage all changes
    echo "Staging changes..."
    git add -A .

    # Commit the changes with a message
    echo "Committing changes..."
    git commit -m "Bump versions:
    - App version: ${new_app_version}
    - Backend version: ${backend_version}
    - Discovery version: ${discovery_version}
    - Frontend version: ${frontend_version}
    - Grafana version: ${grafana_version}
    - Prometheus version: ${prometheus_version}"

    # Push the Git changes
    echo "Pushing changes to the repository..."
    git push

    echo "Process completed successfully!"

}

main