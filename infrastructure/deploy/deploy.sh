#!/usr/bin/env bash

set -euo pipefail

COMPOSE_FILE="infrastructure/docker/compose.production.yml"

: "${API_IMAGE:?API_IMAGE is required}"
: "${MIGRATION_IMAGE:?MIGRATION_IMAGE is required}"
: "${DATABASE_NAME:?DATABASE_NAME is required}"
: "${DATABASE_USER:?DATABASE_USER is required}"
: "${DATABASE_PASSWORD:?DATABASE_PASSWORD is required}"
: "${DATABASE_PORT:?DATABASE_PORT is required}"
: "${GRAFANA_ADMIN_PASSWORD:?GRAFANA_ADMIN_PASSWORD is required}"

echo "==> Pulling application images"

docker pull "$API_IMAGE"
docker pull "$MIGRATION_IMAGE"

echo "==> Starting database and Redis"

docker compose \
  -f "$COMPOSE_FILE" \
  up -d postgres redis

echo "==> Waiting for dependencies"

docker compose \
  -f "$COMPOSE_FILE" \
  up \
  --wait \
  postgres redis

echo "==> Running database migrations"

docker compose \
  -f "$COMPOSE_FILE" \
  run --rm migrate

echo "==> Starting application services"

docker compose \
  -f "$COMPOSE_FILE" \
  up -d api worker prometheus grafana nginx

echo "==> Waiting for API"

for i in {1..30}; do
    if curl -fsS http://localhost:8080/health/ready >/dev/null; then
        echo "Deployment successful."
        exit 0
    fi

    sleep 2
done

echo "ERROR: API did not become ready."

docker compose \
  -f "$COMPOSE_FILE" \
  ps

exit 1
