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

    # Update docker-compose files with the correct image and SHA
    sed -i -E "s|(plutomining/pluto/pluto-$service):[^[:space:]]+|\1:${new_version}@${image_sha}|g" umbrel-apps/pluto-next/docker-compose.yml
    sed -i -E "s|(plutomining/pluto/pluto-$service):[^[:space:]]+|\1:${new_version}@${image_sha}|g" docker-compose.next.local.yml

    sed -i -E "s|(plutomining/pluto/pluto-$service):[^[:space:]]+|\1:${new_version}@${image_sha}|g" umbrel-apps/pluto/docker-compose.yml
    sed -i -E "s|(plutomining/pluto/pluto-$service):[^[:space:]]+|\1:${new_version}@${image_sha}|g" docker-compose.release.local.yml

#    sed -i -E "s/plutomining\/pluto\/pluto-$service(\:[^\s]+(@sha256:[a-f0-9]+))/plutomining\/pluto\/pluto-$service:${new_version}@${image_sha}/g" umbrel-apps/pluto/docker-compose.yml
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
    grep '"version":' $service/package.json | sed -E 's/.*"([0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z]+(\.[0-9]+)?)?)".*/\1/'
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

    # Prova a ottenere l'SHA dell'immagine localmente
    sha=$(docker buildx imagetools inspect $image --format "{{json .Manifest}}" | jq -r .digest)

    # Restituisce l'SHA dell'immagine
    echo "$sha"
}

# main

main() {
    DOCKER_REGISTRY=registry.gitlab.com/plutomining/pluto

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
        echo "Enter your Docker personal access token:"
        read -s DOCKER_ACCESS_TOKEN

        # Perform Docker login
        echo "$DOCKER_ACCESS_TOKEN" | docker login $DOCKER_REGISTRY
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
        eval "current_${service}_version=$current_version"

        echo "Current version for $service is $current_version. Enter the new version (press Enter to keep $current_version):"
        read new_version

        if [ -z "$new_version" ]; then
            new_version=$current_version
        fi

        eval "${service}_version=$new_version"
    done

    # Update the files with the new versions and install dependencies
    for service in backend discovery frontend grafana prometheus; do
        eval new_version=\$${service}_version
        eval current_version=\$current_${service}_version

        if [ "$new_version" != "$current_version" ]; then

            # Update the version in the service's package.json
            sed -i -E "s/\"version\": \"[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z]+(\.[0-9]+)?)?\"/\"version\": \"${new_version}\"/" $service/package.json

            # Run npm install in the service to update lockfile
            echo "Running npm install in $service..."
            (cd $service && npm install)

            echo "Building Docker image for $service with context $(pwd) and Dockerfile $service/Dockerfile..."

            # Build the Docker image with the specified version tags
            docker buildx build --platform linux/amd64,linux/arm64 \
                -t ${DOCKER_REGISTRY}/pluto-$service:latest \
                -t ${DOCKER_REGISTRY}/pluto-$service:"$new_version" \
                -f $service/Dockerfile . --push

            # Get the updated SHA after build
            image_sha=$(get_image_sha "${DOCKER_REGISTRY}/pluto-$service:${new_version}")
        else
            echo "Skipping Docker build for $service as the version has not changed."
            # Get the existing SHA of the current image
            image_sha=$(get_image_sha "${DOCKER_REGISTRY}/pluto-$service:${new_version}")
        fi

        # Update files with the SHA for the service
        update_version $service "$new_version" "$image_sha"
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