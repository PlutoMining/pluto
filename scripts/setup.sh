#!/bin/bash

# Copyright (C) 2024 Alberto Gangarossa.
# Pluto is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License
# as published by the Free Software Foundation, version 3.
# See <https://www.gnu.org/licenses/>.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Pluto Development Environment Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi
print_status "Docker is installed"

if ! command -v docker compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "docker compose is not installed. Please install docker compose first."
    exit 1
fi
print_status "docker compose is available"

echo ""

# Create data directories with specific ownership
echo -e "${BLUE}Creating data directories...${NC}"

# Function to create and set ownership for a directory
setup_directory() {
    local dir_path="$1"
    local uid="$2"
    local gid="${3:-$uid}"
    local description="$4"

    if [ ! -d "$dir_path" ]; then
        mkdir -p "$dir_path"
        print_status "Created $description directory"
    else
        print_status "$description directory already exists"
    fi

    if [ "$EUID" -eq 0 ] || sudo -n true 2>/dev/null; then
        sudo chown -R "$uid:$gid" "$dir_path" 2>/dev/null || print_warning "Could not set ownership for $description (may need sudo)"
        print_status "Set ownership of $description to $uid:$gid"
    else
        print_warning "Skipping ownership change for $description (requires sudo)"
    fi
}

# Function to setup Grafana directory with dashboards subdirectory
setup_grafana_directory() {
    local dir_path="$1"
    local description="$2"

    setup_directory "$dir_path" 472 472 "$description"

    local dashboards_path="$dir_path/dashboards"
    if [ ! -d "$dashboards_path" ]; then
        if [ "$EUID" -eq 0 ] || sudo -n true 2>/dev/null; then
            sudo mkdir -p "$dashboards_path" 2>/dev/null || print_warning "Could not create $description/dashboards (may need sudo)"
            # Backend needs to write dashboard files, so set ownership to backend user (1000)
            sudo chown -R 1000:1000 "$dashboards_path" 2>/dev/null || print_warning "Could not set ownership for $description/dashboards (may need sudo)"
            print_status "Created $description/dashboards directory with ownership 1000:1000"
        else
            mkdir -p "$dashboards_path" 2>/dev/null || print_warning "Could not create $description/dashboards (may need sudo)"
            print_status "Created $description/dashboards directory"
        fi
    else
        print_status "$description/dashboards directory already exists"
        # Ensure ownership is correct even if directory already exists
        if [ "$EUID" -eq 0 ] || sudo -n true 2>/dev/null; then
            sudo chown -R 1000:1000 "$dashboards_path" 2>/dev/null || print_warning "Could not set ownership for $description/dashboards (may need sudo)"
            print_status "Set ownership of $description/dashboards to 1000:1000 (for backend writes)"
        fi
    fi
}

# Setup directories for dev environment (no suffix)
setup_directory "$PROJECT_ROOT/data/prometheus" 65534 65534 "data/prometheus"
setup_grafana_directory "$PROJECT_ROOT/data/grafana" "data/grafana"
setup_directory "$PROJECT_ROOT/data/leveldb" 1000 1000 "data/leveldb"

# Setup directories for next environment (-next suffix)
setup_directory "$PROJECT_ROOT/data/prometheus-next" 65534 65534 "data/prometheus-next"
setup_grafana_directory "$PROJECT_ROOT/data/grafana-next" "data/grafana-next"
setup_directory "$PROJECT_ROOT/data/leveldb-next" 1000 1000 "data/leveldb-next"

# Setup directories for release environment (-release suffix)
setup_directory "$PROJECT_ROOT/data/prometheus-release" 65534 65534 "data/prometheus-release"
setup_grafana_directory "$PROJECT_ROOT/data/grafana-release" "data/grafana-release"
setup_directory "$PROJECT_ROOT/data/leveldb-release" 1000 1000 "data/leveldb-release"

echo ""

# Create .env.tpl files if they don't exist
echo -e "${BLUE}Checking environment template files...${NC}"

create_env_template() {
    local service_dir="$1"
    local template_file="$service_dir/.env.tpl"
    
    if [ ! -f "$template_file" ]; then
        print_warning ".env.tpl not found in $service_dir - will be created from template"
        return 1
    fi
    return 0
}

# Check if templates exist, create them if needed (will be done in next step)
print_status "Environment templates will be created if missing"

echo ""

# Copy .env.tpl to .env.local if .env.local doesn't exist
echo -e "${BLUE}Setting up environment files...${NC}"

setup_env_file() {
    local service_dir="$1"
    local env_file="$service_dir/.env.local"
    local template_file="$service_dir/.env.tpl"
    
    if [ ! -f "$env_file" ]; then
        if [ -f "$template_file" ]; then
            cp "$template_file" "$env_file"
            print_status "Created $env_file from template"
        else
            print_warning "$template_file not found, skipping $env_file creation"
        fi
    else
        print_status "$env_file already exists"
    fi
}

setup_env_file "$PROJECT_ROOT/backend"
setup_env_file "$PROJECT_ROOT/discovery"
setup_env_file "$PROJECT_ROOT/frontend"
setup_env_file "$PROJECT_ROOT/mock"

echo ""

# Verify required files exist
echo -e "${BLUE}Verifying required files...${NC}"

if [ ! -f "$PROJECT_ROOT/umbrel-apps/pluto-next/umbrel-app.yml" ]; then
    print_error "Required file not found: umbrel-apps/pluto-next/umbrel-app.yml"
    exit 1
fi
print_status "umbrel-apps/pluto-next/umbrel-app.yml exists"

if [ ! -f "$PROJECT_ROOT/prometheus/prometheus.yml" ]; then
    print_error "Required file not found: prometheus/prometheus.yml"
    exit 1
fi
print_status "prometheus/prometheus.yml exists"

if [ ! -f "$PROJECT_ROOT/grafana/grafana.ini" ]; then
    print_error "Required file not found: grafana/grafana.ini"
    exit 1
fi
print_status "grafana/grafana.ini exists"

echo ""

# Set executable permissions on entrypoint scripts
echo -e "${BLUE}Setting permissions on entrypoint scripts...${NC}"

ENTRYPOINT_SCRIPTS=(
    "backend/docker-entrypoint.sh"
    "discovery/docker-entrypoint.sh"
    "frontend/docker-entrypoint.sh"
    "mock/docker-entrypoint.sh"
)

for script in "${ENTRYPOINT_SCRIPTS[@]}"; do
    script_path="$PROJECT_ROOT/$script"
    if [ -f "$script_path" ]; then
        chmod +x "$script_path"
        print_status "Set executable permission on $script"
    else
        print_warning "$script not found (may not be needed)"
    fi
done

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Review and customize .env.local files in each service directory if needed"
echo "  2. Run 'make build' to build Docker images"
echo "  3. Run 'make start' to start all services"
echo ""
echo "For more information, run 'make help'"

