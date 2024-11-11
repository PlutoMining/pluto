#!/bin/bash

DOCKER_REGISTRY=https://registry.gitlab.com/plutomining/pluto

# Function to update the version in the specified files
update_version() {
    local service=$1
    local new_version=$2

    # Update the version in the service's package.json
    sed -i '' -E "s/\"version\": \"[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z]+(\.[0-9]+)?)?\"/\"version\": \"${new_version}\"/" $service/package.json

    # Run npm install in the service to update lockfile
    echo "Running npm install in $service..."
    (cd $service && npm install)

    # Determine which files to update based on pre-release status
    if [ "$IS_PRERELEASE" = true ]; then
        # Update only next files
        sed -i '' -E "s/plutomining\/pluto\/pluto-$service:[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z]+(\.[0-9]+)?)?/plutomining\/pluto\/pluto-$service:${new_version}/g" app-stores/umbrelOS/community/plutomining-pluto-next/docker-compose.yml
        sed -i '' -E "s/plutomining\/pluto\/pluto-$service:[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z]+(\.[0-9]+)?)?/plutomining\/pluto\/pluto-$service:${new_version}/g" docker-compose.next.local.yml
    else
        # Update the main files
        sed -i '' -E "s/plutomining\/pluto\/pluto-$service:[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z]+(\.[0-9]+)?)?/plutomining\/pluto\/pluto-$service:${new_version}/g" app-stores/umbrelOS/official/pluto/docker-compose.yml
        sed -i '' -E "s/plutomining\/pluto\/pluto-$service:[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z]+(\.[0-9]+)?)?/plutomining\/pluto\/pluto-$service:${new_version}/g" app-stores/umbrelOS/community/plutomining-pluto/docker-compose.yml
        sed -i '' -E "s/plutomining\/pluto\/pluto-$service:[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z]+(\.[0-9]+)?)?/plutomining\/pluto\/pluto-$service:${new_version}/g" docker-compose.release.local.yml
    fi
}

# Function to update the version in umbrel-app.yml
update_umbrel_version() {
    local new_version=$1

    if [ "$IS_PRERELEASE" = true ]; then
        sed -i '' -E "s/version: \".*\"/version: \"${new_version}\"/g" app-stores/umbrelOS/community/plutomining-pluto-next/umbrel-app.yml
        sed -i '' -E "s/Version .*/Version ${new_version}/g" app-stores/umbrelOS/community/plutomining-pluto-next/umbrel-app.yml
    else
        sed -i '' -E "s/version: \".*\"/version: \"${new_version}\"/g" app-stores/umbrelOS/official/pluto/umbrel-app.yml
        sed -i '' -E "s/Version .*/Version ${new_version}/g" app-stores/umbrelOS/official/pluto/umbrel-app.yml

        sed -i '' -E "s/version: \".*\"/version: \"${new_version}\"/g" app-stores/umbrelOS/community/plutomining-pluto/umbrel-app.yml
        sed -i '' -E "s/Version .*/Version ${new_version}/g" app-stores/umbrelOS/community/plutomining-pluto/umbrel-app.yml
    fi
}

# Function to get the current version from the correct umbrel app file
get_current_app_version() {
    if [ "$IS_PRERELEASE" = true ]; then
        grep 'version:' app-stores/umbrelOS/community/plutomining-pluto-next/umbrel-app.yml | sed -E 's/version: "(.*)"/\1/'
    else
        grep 'version:' app-stores/umbrelOS/community/plutomining-pluto/umbrel-app.yml | sed -E 's/version: "(.*)"/\1/'
    fi
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

# Default values for flags
SKIP_LOGIN=false
IS_PRERELEASE=false

# Parse command line arguments
for arg in "$@"; do
    case $arg in
    --skip-login)
        SKIP_LOGIN=true
        shift # Remove --skip-login from processing
        ;;
    --pre-release)
        IS_PRERELEASE=true
        shift # Remove --pre-release from processing
        ;;
    esac
done

# Prompt to check if this is a pre-release if not set by flag
if [ "$IS_PRERELEASE" = false ]; then
    echo "Is this a pre-release? (y/n)"
    read is_prerelease_input
    if [ "$is_prerelease_input" == "y" ]; then
        IS_PRERELEASE=true
    fi
fi

# Update the FRONTEND_BUILD_ARGS and Dockerfile selection based on the release type
if [ "$IS_PRERELEASE" = true ]; then
    echo "Pre-release selected: scaling ports down by 100."
    FRONTEND_BUILD_ARGS="--build-arg NEXT_PUBLIC_WS_ROOT=ws://umbrel.local:7676"
else
    FRONTEND_BUILD_ARGS="--build-arg NEXT_PUBLIC_WS_ROOT=ws://umbrel.local:7776"
fi

# Only perform Docker login if the skip login flag is not set
if [ "$SKIP_LOGIN" = false ]; then
    # Request Docker username and personal access token
    # echo "Enter your Docker username:"
    # read DOCKER_USERNAME
    echo "Enter your Docker personal access token:"
    read -s DOCKER_ACCESS_TOKEN

    # Perform Docker login
    echo "$DOCKER_ACCESS_TOKEN" | docker login $DOCKER_REGISTRY # --password-stdin
    # echo "$DOCKER_ACCESS_TOKEN" | docker login --username "$DOCKER_USERNAME" --password-stdin
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
for service in backend discovery mock frontend; do
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
for service in backend discovery mock frontend; do
    eval new_version=\$${service}_version
    eval current_version=\$current_${service}_version

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

# Build Docker images only if the version has changed
for service in backend discovery mock frontend; do
    eval new_version=\$${service}_version
    eval current_version=\$current_${service}_version

    if [ "$new_version" != "$current_version" ]; then
        echo "Building Docker image for $service with context $(pwd) and Dockerfile $service/Dockerfile..."

        # Choose Dockerfile based on service and release type
        DOCKERFILE_PATH="$service/Dockerfile"
        if [ "$IS_PRERELEASE" = true ] && ([[ "$service" == "grafana" ]] || [[ "$service" == "prometheus" ]]); then
            DOCKERFILE_PATH="$service/Dockerfile.next"
        fi

        # Check if service is frontend to pass specific build args
        if [ "$service" == "frontend" ]; then
            docker buildx build --platform linux/amd64,linux/arm64 \
                -t ${DOCKER_REGISTRY}/pluto-$service:latest \
                -t ${DOCKER_REGISTRY}/pluto-$service:"$new_version" \
                -f $DOCKERFILE_PATH . --push $FRONTEND_BUILD_ARGS
        else
            docker buildx build --platform linux/amd64,linux/arm64 \
                -t ${DOCKER_REGISTRY}/pluto-$service:latest \
                -t ${DOCKER_REGISTRY}/pluto-$service:"$new_version" \
                -f $DOCKERFILE_PATH . --push
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
