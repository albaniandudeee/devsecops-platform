#!/usr/bin/env bash

set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-docker-postgres-1}"
DATABASE="${POSTGRES_DB:-devsecops_platform}"
USER="${POSTGRES_USER:-devsecops_app}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/${DATABASE}_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "Creating PostgreSQL backup..."
echo "Database: $DATABASE"
echo "Output:   $BACKUP_FILE"

docker exec "$CONTAINER" \
  pg_dump \
  -U "$USER" \
  -d "$DATABASE" \
  -Fc \
  > "$BACKUP_FILE"

test -s "$BACKUP_FILE"

echo "Backup completed successfully:"
ls -lh "$BACKUP_FILE"
