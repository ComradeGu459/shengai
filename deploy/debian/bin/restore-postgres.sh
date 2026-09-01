#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL must be supplied by the protected environment}"
if [ "$#" -ne 2 ] || [ "$2" != "--confirm" ]; then
    printf 'usage: %s /absolute/path/to/backup.dump --confirm\n' "$0" >&2
    exit 2
fi

backup_file=$1
if [ ! -f "$backup_file" ]; then
    printf 'backup file does not exist: %s\n' "$backup_file" >&2
    exit 1
fi

# 这是有意的破坏性恢复动作，只接受显式 --confirm；本脚本不会自动运行。
pg_restore --exit-on-error --clean --if-exists --no-owner --dbname "$DATABASE_URL" "$backup_file"
printf 'restore completed: %s\n' "$backup_file"
