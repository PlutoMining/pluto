# Pluto Development Makefile
# Common commands for managing the development environment

SHELL := /bin/bash
COMPOSE_FILE = docker-compose.dev.local.yml
.PHONY: help setup start stop up down logs build rebuild clean restart status shell

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "Pluto Development Environment - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Examples:"
	@echo "  make setup              # Run initial setup"
	@echo "  make start              # Start all services"
	@echo "  make logs SERVICE=backend  # View logs for a specific service"
	@echo "  make shell SERVICE=backend # Open shell in a service container"

setup: ## Run initial setup script
	@echo "Running setup script..."
	@./scripts/setup.sh

start: up ## Start all services (alias for 'up')
up: ## Start all services
	@echo "Starting all services..."
	@docker compose -f $(COMPOSE_FILE) up
	@echo "Services started. Use 'make logs' to view logs or 'make status' to check status."

stop: down ## Stop all services (alias for 'down')
down: ## Stop all services
	@echo "Stopping all services..."
	@docker compose -f $(COMPOSE_FILE) down
	@echo "Services stopped."

logs: ## View logs (use SERVICE=<name> for specific service)
	@if [ -z "$(SERVICE)" ]; then \
		docker compose -f $(COMPOSE_FILE) logs -f; \
	else \
		docker compose -f $(COMPOSE_FILE) logs -f $(SERVICE); \
	fi

build: ## Build all Docker images
	@echo "Building Docker images..."
	@docker compose -f $(COMPOSE_FILE) build
	@echo "Build complete."

rebuild: ## Rebuild all Docker images without cache
	@echo "Rebuilding Docker images (no cache)..."
	@docker compose -f $(COMPOSE_FILE) build --no-cache
	@echo "Rebuild complete."

clean: ## Remove volumes and data directories (WARNING: destructive)
	@echo "WARNING: This will remove all volumes and data directories!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "Stopping services..."; \
		docker compose -f $(COMPOSE_FILE) down -v; \
		echo "Removing data directories..."; \
		rm -rf data/prometheus/* data/grafana/* data/leveldb/*; \
		echo "Clean complete."; \
	else \
		echo "Clean cancelled."; \
	fi

restart: ## Restart all services
	@echo "Restarting all services..."
	@docker compose -f $(COMPOSE_FILE) stop
	@docker compose -f $(COMPOSE_FILE) up
	@echo "Restart complete."

status: ps ## Show service status (alias for 'ps')
ps: ## Show service status
	@docker compose -f $(COMPOSE_FILE) ps

shell: ## Open shell in a service container (requires SERVICE=<name>)
	@if [ -z "$(SERVICE)" ]; then \
		echo "Error: SERVICE parameter required"; \
		echo "Usage: make shell SERVICE=<service-name>"; \
		echo "Available services: backend, frontend, discovery, mock, prometheus, grafana"; \
		exit 1; \
	fi
	@docker compose -f $(COMPOSE_FILE) exec $(SERVICE) /bin/sh

# Additional useful commands
pull: ## Pull latest images
	@echo "Pulling latest images..."
	@docker compose -f $(COMPOSE_FILE) pull
	@echo "Pull complete."

top: ## Show running processes
	@docker compose -f $(COMPOSE_FILE) top

config: ## Validate and view docker compose configuration
	@docker compose -f $(COMPOSE_FILE) config

