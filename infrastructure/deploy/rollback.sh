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

echo "==> Rolling back to:"
echo "    API:       $API_IMAGE"
echo "    Migration: $MIGRATION_IMAGE"

echo "==> Pulling rollback images"

docker pull "$API_IMAGE"
docker pull "$MIGRATION_IMAGE"

echo "==> Starting dependencies"

docker compose \
  -f "$COMPOSE_FILE" \
  up -d postgres redis

docker compose \
  -f "$COMPOSE_FILE" \
  up \
  --wait \
  postgres redis

echo "==> Applying migrations"

docker compose \
  -f "$COMPOSE_FILE" \
  run --rm migrate

echo "==> Starting rollback version"

docker compose \
  -f "$COMPOSE_FILE" \
  up -d api worker prometheus grafana nginx

echo "==> Verifying rollback"

for i in {1..30}; do
    if curl -fsS http://localhost:8080/health/ready >/dev/null; then
        echo "Rollback successful."
        exit 0
    fi

    sleep 2
done

echo "ERROR: rollback version did not become ready."

docker compose \
  -f "$COMPOSE_FILE" \
  ps

exit 1
