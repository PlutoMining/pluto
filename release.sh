#!/bin/bash

# Function to update the version in the specified files
update_version() {
    local service=$1
    local new_version=$2

    # Update the version in the service's package.json
    sed -i '' -E "s/\"version\": \"[0-9]+\.[0-9]+\.[0-9]+\"/\"version\": \"${new_version}\"/" $service/package.json

    # Run npm install in the service to update lockfile
    echo "Running npm install in $service..."
    (cd $service && npm install)

    # Update the version in docker-compose.yml for the service
    sed -i '' -E "s/whirmill\/pluto-$service:[0-9]+\.[0-9]+\.[0-9]+/whirmill\/pluto-$service:${new_version}/g" docker-compose.yml
    # Update the version in docker-compose.release.local.yml for the service
    sed -i '' -E "s/whirmill\/pluto-$service:[0-9]+\.[0-9]+\.[0-9]+/whirmill\/pluto-$service:${new_version}/g" docker-compose.release.local.yml
}

# Function to update the version in umbrel-app.yml
update_umbrel_version() {
    local new_version=$1
    # Update the version in umbrel-app.yml
    sed -i '' -E "s/version: \".*\"/version: \"${new_version}\"/g" umbrel-app.yml
    sed -i '' -E "s/Version .*/Version ${new_version}/g" umbrel-app.yml
}

# Function to get the current version from the package.json file
get_current_version() {
    local service=$1
    grep '"version":' $service/package.json | sed -E 's/.*"([0-9]+\.[0-9]+\.[0-9]+)".*/\1/'
}

# Function to check the current Git branch
check_git_branch() {
    local branch=$(git rev-parse --abbrev-ref HEAD)
    if [ "$branch" != "main" ]; then
        echo "Error: you must be on the 'main' branch to release."
        exit 1
    fi
}

# Flag to skip Docker login
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

# Check the current Git branch
# check_git_branch

# Only perform Docker login if the skip login flag is not set
if [ "$SKIP_LOGIN" = false ]; then
    # Request Docker username and personal access token
    echo "Enter your Docker username:"
    read DOCKER_USERNAME
    echo "Enter your Docker personal access token:"
    read -s DOCKER_ACCESS_TOKEN

    # Perform Docker login
    echo "$DOCKER_ACCESS_TOKEN" | docker login --username "$DOCKER_USERNAME" --password-stdin
else
    echo "Skipping Docker login..."
fi

# Prompt for the new version of the app (umbrel-app.yml)
current_app_version=$(grep 'version:' umbrel-app.yml | sed -E 's/version: "(.*)"/\1/')
echo "Current app version is $current_app_version. Enter the new app version (press Enter to keep $current_app_version):"
read new_app_version

# If user presses enter, keep the current version
if [ -z "$new_app_version" ]; then
    new_app_version=$current_app_version
fi

# Update the version in umbrel-app.yml
update_umbrel_version "$new_app_version"

# Get and set versions for each service
for service in backend discovery mock frontend grafana prometheus init; do
    current_version=$(get_current_version $service)
    # Store the current version in a variable specific to the service
    eval "current_${service}_version=$current_version"

    echo "Current version for $service is $current_version. Enter the new version (press Enter to keep $current_version):"
    read new_version

    # If user presses enter, keep the current version
    if [ -z "$new_version" ]; then
        new_version=$current_version
    fi

    # Store the new version for each service in a variable
    eval "${service}_version=$new_version"
done

# Update the files with the new versions and install dependencies
for service in backend discovery mock frontend grafana prometheus init; do
    eval new_version=\$${service}_version
    eval current_version=\$current_${service}_version

    # Check if the new version is different from the current one
    if [ "$new_version" != "$current_version" ]; then
        echo "Updating $service from version $current_version to $new_version..."
        update_version $service "$new_version"
    else
        echo "Skipping $service as the version has not changed."
    fi
done

# Enable Docker Buildx for multi-architecture builds
if docker buildx inspect multi-arch-builder >/dev/null 2>&1; then
    echo "Using existing multi-arch-builder instance..."
    docker buildx use multi-arch-builder
else
    echo "Creating new multi-arch-builder instance..."
    docker buildx create --use --name multi-arch-builder
fi

# Example build arguments for the 'frontend' service
FRONTEND_BUILD_ARGS="--build-arg NEXT_PUBLIC_WS_ROOT=ws://umbrel.local:7776 --build-arg GF_HOST=http://grafana:3000 --build-arg BACKEND_DESTINATION_HOST=http://backend:7776"

# Build Docker images only if the version has changed
for service in backend discovery mock frontend grafana prometheus init; do
    eval new_version=\$${service}_version
    eval current_version=\$current_${service}_version

    # Check if the new version is different from the current one
    if [ "$new_version" != "$current_version" ]; then
        echo "Building Docker image for $service with context $(pwd) and Dockerfile $service/Dockerfile..."

        # Check if service is frontend to pass specific build args
        if [ "$service" == "frontend" ]; then
            docker buildx build --platform linux/amd64,linux/arm64 \
                -t whirmill/pluto-$service:latest \
                -t whirmill/pluto-$service:"$new_version" \
                -f $service/Dockerfile . --push $FRONTEND_BUILD_ARGS
        else
            docker buildx build --platform linux/amd64,linux/arm64 \
                -t whirmill/pluto-$service:latest \
                -t whirmill/pluto-$service:"$new_version" \
                -f $service/Dockerfile . --push
        fi
    else
        echo "Skipping Docker build for $service as the version has not changed."
    fi
done

# Stage all changes
echo "Staging changes..."
git add -A .

# Commit the changes with a message
echo "Committing changes..."
# Commit the changes with a detailed message for each service
echo "Committing changes..."
git commit -m "Bump versions:
- App version: ${new_app_version}
- Backend version: ${backend_version}
- Discovery version: ${discovery_version}
- Mock version: ${mock_version}
- Frontend version: ${frontend_version}"

# Push the Git changes
echo "Pushing changes to the repository..."
git push

echo "Process completed successfully!"
