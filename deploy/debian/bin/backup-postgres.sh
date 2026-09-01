#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL must be supplied by the protected environment}"
backup_root=${QIMAO_BACKUP_ROOT:-/var/backups/qimao-terms-cloud}
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_file="$backup_root/qimao_terms_cloud-$stamp.dump"

umask 077
install -d -m 0750 "$backup_root"
pg_dump --format=custom --no-owner --file "$backup_file" "$DATABASE_URL"
sha256sum "$backup_file" > "$backup_file.sha256"
printf 'backup created: %s\n' "$backup_file"
