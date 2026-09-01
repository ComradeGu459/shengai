#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
    printf 'provisioning must run as root\n' >&2
    exit 1
fi

environment_dir=/etc/qimao-terms-cloud
environment_file=$environment_dir/backend.env
database_name=qimao_terms_cloud
database_role=qimao_backend

if [ -e "$environment_file" ]; then
    printf 'refusing to replace existing environment file: %s\n' "$environment_file" >&2
    exit 1
fi

if runuser -u postgres -- psql --no-psqlrc --tuples-only --no-align --command="SELECT 1 FROM pg_roles WHERE rolname = '$database_role'" | grep -qx 1; then
    printf 'refusing to replace existing database role: %s\n' "$database_role" >&2
    exit 1
fi

if runuser -u postgres -- psql --no-psqlrc --tuples-only --no-align --command="SELECT 1 FROM pg_database WHERE datname = '$database_name'" | grep -qx 1; then
    printf 'refusing to replace existing database: %s\n' "$database_name" >&2
    exit 1
fi

umask 077
database_password=$(openssl rand -hex 32)

export QIMAO_DATABASE_PASSWORD=$database_password
runuser --preserve-environment -u postgres -- \
    psql --no-psqlrc --set=ON_ERROR_STOP=1 <<'SQL'
\getenv qimao_database_password QIMAO_DATABASE_PASSWORD
CREATE ROLE qimao_backend LOGIN PASSWORD :'qimao_database_password';
CREATE DATABASE qimao_terms_cloud OWNER qimao_backend ENCODING 'UTF8';
SQL

install -d -o root -g qimao -m 0750 "$environment_dir"
environment_temp=$(mktemp "$environment_dir/.backend.env.XXXXXX")
cleanup() {
    rm -f "$environment_temp"
}
trap cleanup EXIT HUP INT TERM

{
    printf 'NODE_ENV=production\n'
    printf 'PORT=3001\n'
    printf 'DATABASE_URL=postgresql://qimao_backend:%s@127.0.0.1:5432/qimao_terms_cloud\n' "$database_password"
} > "$environment_temp"

chown root:qimao "$environment_temp"
chmod 0640 "$environment_temp"
mv "$environment_temp" "$environment_file"
trap - EXIT HUP INT TERM
unset database_password QIMAO_DATABASE_PASSWORD

printf 'created isolated PostgreSQL role, database and protected environment file\n'
