# Pluto Development Makefile
# Common commands for managing the development environment

SHELL := /bin/bash
COMPOSE_FILE = docker-compose.dev.local.yml
.PHONY: help setup start stop up down logs build rebuild clean restart status shell lint-apps test-apps lint-app test-app lint-pyasic-bridge test-pyasic-bridge setup-pyasic-bridge up-stable down-stable logs-stable up-beta down-beta logs-beta

APPS ?= backend discovery frontend mock

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "Pluto Development Environment - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "For more information, run 'make <command> --help'"

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
	@docker compose -f $(COMPOSE_FILE) build --no-cache
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
		rm -rf data/prometheus/* data/prometheus-*/* data/leveldb/* data/leveldb-*/*; \
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
		echo "Available services: backend, frontend, discovery, mock, prometheus"; \
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

lint-apps: ## Run ESLint for all apps (override APP=<name> or APPS="a b")
	@if [ -n "$(APP)" ]; then \
		$(MAKE) lint-app APP=$(APP); \
	else \
		for app in $(APPS); do \
			$(MAKE) lint-app APP=$$app || exit 1; \
		done; \
	fi

lint-app:
	@if [ -z "$(APP)" ]; then \
		echo "Error: APP parameter required"; \
		exit 1; \
	fi
	@if [ ! -d "$(APP)" ]; then \
		echo "Error: directory '$(APP)' not found"; \
		exit 1; \
	fi
	@if [ "$(APP)" = "pyasic-bridge" ]; then \
		$(MAKE) lint-pyasic-bridge; \
	else \
		echo "→ Linting $(APP)..."; \
		cd $(APP) && npm run lint; \
	fi

test-apps: ## Run tests for all apps (override APP=<name> or APPS="a b")
	@if [ -n "$(APP)" ]; then \
		$(MAKE) test-app APP=$(APP); \
	else \
		for app in $(APPS); do \
			$(MAKE) test-app APP=$$app || exit 1; \
		done; \
	fi

test-apps-parallel: ## Run tests in parallel for all apps
	@pids=(); \
	failed=0; \
	for app in $(APPS); do \
		echo "→ Testing $$app (parallel)..."; \
		( cd $$app && npm run test ) & pids+=("$$!"); \
	done; \
	for pid in "$$\{pids[@]\}"; do \
		wait $$pid || failed=1; \
	done; \
	exit $$failed

test-app:
	@if [ -z "$(APP)" ]; then \
		echo "Error: APP parameter required"; \
		exit 1; \
	fi
	@if [ ! -d "$(APP)" ]; then \
		echo "Error: directory '$(APP)' not found"; \
		exit 1; \
	fi
	@if [ "$(APP)" = "pyasic-bridge" ]; then \
		$(MAKE) test-pyasic-bridge; \
	else \
		echo "→ Testing $(APP)..."; \
		cd $(APP) && npm run test; \
	fi

setup-pyasic-bridge: ## Set up pyasic-bridge virtual environment
	@echo "→ Setting up pyasic-bridge virtual environment..."
	@cd pyasic-bridge && \
		if [ ! -d "venv" ]; then \
			echo "Creating virtual environment..."; \
			python3 -m venv venv; \
		fi && \
		echo "Installing dependencies..." && \
		. venv/bin/activate && \
		pip install --upgrade pip && \
		pip install -r requirements.txt && \
		echo "✓ Virtual environment ready. Activate with: source pyasic-bridge/venv/bin/activate"

lint-pyasic-bridge: ## Lint and fix pyasic-bridge Python code
	@echo "→ Linting and fixing pyasic-bridge..."
	@cd pyasic-bridge && \
		if [ -d "venv" ]; then \
			. venv/bin/activate && ruff check --fix app tests; \
		elif command -v ruff > /dev/null 2>&1; then \
			ruff check --fix app tests; \
		else \
			echo "Warning: ruff not found. Run 'make setup-pyasic-bridge' or install with: pip install ruff"; \
			echo "Skipping linting..."; \
		fi

test-pyasic-bridge: ## Run tests for pyasic-bridge
	@echo "→ Testing pyasic-bridge..."
	@cd pyasic-bridge && \
		if [ -d "venv" ]; then \
			. venv/bin/activate && pytest --cov=app --cov-report=term-missing -v tests/; \
		elif command -v pytest > /dev/null 2>&1; then \
			pytest --cov=app --cov-report=term-missing -v tests/; \
		else \
			echo "Error: pytest not found. Run 'make setup-pyasic-bridge' or install dependencies with: pip install -r requirements.txt"; \
			exit 1; \
		fi

# Production-like local testing (stable release)
up-stable: ## Start stable release services locally (docker-compose.release.local.yml)
	@echo "Starting stable release services..."
	@docker compose -f docker-compose.release.local.yml up

down-stable: ## Stop stable release services
	@echo "Stopping stable release services..."
	@docker compose -f docker-compose.release.local.yml down

logs-stable: ## View logs for stable release services (use SERVICE=<name> for specific service)
	@if [ -z "$(SERVICE)" ]; then \
		docker compose -f docker-compose.release.local.yml logs -f; \
	else \
		docker compose -f docker-compose.release.local.yml logs -f $(SERVICE); \
	fi

# Production-like local testing (beta release)
up-beta: ## Start beta release services locally (docker-compose.next.local.yml)
	@echo "Starting beta release services..."
	@docker compose -f docker-compose.next.local.yml up

down-beta: ## Stop beta release services
	@echo "Stopping beta release services..."
	@docker compose -f docker-compose.next.local.yml down

logs-beta: ## View logs for beta release services (use SERVICE=<name> for specific service)
	@if [ -z "$(SERVICE)" ]; then \
		docker compose -f docker-compose.next.local.yml logs -f; \
	else \
		docker compose -f docker-compose.next.local.yml logs -f $(SERVICE); \
	fi
