# Makefile for cron-backend

# Variables
NODE_ENV ?= development
DIST_DIR = dist
SRC_DIR = src
TEST_DIR = test
BUN := bun

# Default target
.DEFAULT_GOAL := help

# Help command
.PHONY: help
help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Installation
.PHONY: install
install: ## Install dependencies
	$(BUN) install

.PHONY: install-prod
install-prod: ## Install production dependencies only
	$(BUN) install --production

# Development
.PHONY: dev
dev: ## Start development server with watch mode
	$(BUN) run start:dev

.PHONY: debug
debug: ## Start development server in debug mode
	$(BUN) run start:debug

# Build
.PHONY: build
build: ## Build the application
	$(BUN) run build

.PHONY: clean
clean: ## Clean build artifacts
	rm -rf $(DIST_DIR)
	rm -rf node_modules

# Production
.PHONY: start
start: ## Start the application
	$(BUN) start

.PHONY: start-prod
start-prod: ## Start the application in production mode
	$(BUN) run start:prod

# Testing
.PHONY: test
test: ## Run tests
	$(BUN) test

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	$(BUN) run test:watch

.PHONY: test-cov
test-cov: ## Run tests with coverage
	$(BUN) run test:cov

.PHONY: test-e2e
test-e2e: ## Run end-to-end tests
	$(BUN) run test:e2e

.PHONY: test-debug
test-debug: ## Run tests in debug mode
	$(BUN) run test:debug

# Code Quality
.PHONY: lint
lint: ## Run linter
	$(BUN) run lint

.PHONY: format
format: ## Format code with prettier
	$(BUN) run format

.PHONY: check
check: lint test ## Run linter and tests

# Docker commands (if you use Docker)
.PHONY: docker-build
docker-build: ## Build Docker image
	docker build -t cron-backend:latest .

.PHONY: docker-run
docker-run: ## Run Docker container
	docker run -p 3000:3000 --env-file .env cron-backend:latest

# Database commands (if applicable)
.PHONY: db-migrate
db-migrate: ## Run database migrations
	@echo "Add your migration command here"

.PHONY: db-seed
db-seed: ## Seed the database
	@echo "Add your seed command here"

# Deployment
.PHONY: deploy
deploy: build test ## Build and deploy the application
	@echo "Add your deployment commands here"

# Full setup
.PHONY: setup
setup: install build ## Install dependencies and build

# Development setup
.PHONY: setup-dev
setup-dev: clean install ## Clean install for development