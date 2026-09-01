#!/bin/sh
set -eu

health_url=${QIMAO_HEALTH_URL:-http://127.0.0.1:3001/health}
body_file=$(mktemp)
cleanup() {
    rm -f "$body_file"
}
trap cleanup EXIT HUP INT TERM

status=$(curl --silent --show-error --max-time 5 --output "$body_file" --write-out '%{http_code}' "$health_url")
if [ "$status" != "200" ]; then
    printf 'health check failed: HTTP %s\n' "$status" >&2
    exit 1
fi

if ! grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' "$body_file"; then
    printf 'health check failed: response is not an ok backend health payload\n' >&2
    exit 1
fi

printf 'qimao backend healthy: %s\n' "$health_url"
