#!/bin/bash
set -Eeuo pipefail
umask 077

input_fail() {
  echo "terminal=blocked code=$1"
  exit 64
}

inbound="${1-}"
[ "$EUID" -eq 0 ] || input_fail 'ROOT_REQUIRED'
[ "$inbound" = '/var/tmp/qimao-screen-text-partial-release-1714-inbound' ] \
  || input_fail 'INBOUND_PATH_INVALID'

archive_name='screen-text-partial-release-20260901-r1.tar.gz'
archive_source="$inbound/$archive_name"
runner_source="$inbound/runner.sh"
helper_source="$inbound/db-migration-gate.mjs"
checksums_source="$inbound/SHA256SUMS"
[ -d "$inbound" ] && [ ! -L "$inbound" ] || input_fail 'INBOUND_DIRECTORY_INVALID'
[ "$(stat -c '%U:%G:%a' "$inbound")" = 'qimao-deploy:qimao-deploy:700' ] \
  || input_fail 'INBOUND_DIRECTORY_IDENTITY_INVALID'
[ "$(find "$inbound" -mindepth 1 -maxdepth 1 -type f | wc -l)" = '4' ] \
  || input_fail 'INBOUND_FILE_COUNT_INVALID'
[ "$(find "$inbound" -mindepth 1 -maxdepth 1 ! -type f | wc -l)" = '0' ] \
  || input_fail 'INBOUND_NONFILE_INVALID'
for file in "$archive_source" "$runner_source" "$helper_source" "$checksums_source"; do
  [ -f "$file" ] && [ ! -L "$file" ] || input_fail 'INBOUND_FILE_INVALID'
  [ "$(stat -c '%U:%G:%h' "$file")" = 'qimao-deploy:qimao-deploy:1' ] \
    || input_fail 'INBOUND_FILE_IDENTITY_INVALID'
done

lock_file='/run/lock/qimao-screen-text-partial-release-1714.lock'
exec 9>"$lock_file"
flock -n 9 || input_fail 'LOCK_ALREADY_HELD'

old_release='/opt/qimao-terms-cloud/releases/ocr-media-error-20260831-r1'
new_release='/opt/qimao-terms-cloud/releases/screen-text-partial-release-20260901-r1'
release_stage='/opt/qimao-terms-cloud/releases/.screen-text-partial-release-20260901-r1-stage-1714'
current='/opt/qimao-terms-cloud/current'
current_next='/opt/qimao-terms-cloud/current.screen-text-partial-release-1714.next'
old_static='/srv/qimao-terms-cloud/frontend-asr-srt-compare-20260831-r2'
new_static='/srv/qimao-terms-cloud/frontend-screen-text-partial-release-20260901-r1'
static_stage='/srv/qimao-terms-cloud/.frontend-screen-text-partial-release-20260901-r1-stage-1714'
static_link='/srv/qimao-terms-cloud/frontend'
static_next='/srv/qimao-terms-cloud/frontend.screen-text-partial-release-1714.next'
runtime='/run/qimao-screen-text-partial-release-1714'
unpack="$runtime/unpack"
archive_list="$runtime/archive.list"
api_headers="$runtime/api.headers"
api_body="$runtime/api.body"
backend_unit='qimao-backend.service'
asr_unit='qimao-worker@asr.worker.entry.js.service'
screen_unit='qimao-worker@screen-text.worker.entry.js.service'
ocr_unit='qimao-local-ocr-openvino.service'

failure_code='UNEXPECTED_FAILURE'
runtime_created=0
release_stage_created=0
static_stage_created=0
release_created=0
static_created=0
backend_switched=0
static_switched=0
backend_restart_attempted=0
migration_attempted=0
migration_succeeded=0
schema_retained='none'

safe_remove() {
  case "$1" in
    "$runtime"|"$release_stage"|"$new_release"|"$static_stage"|"$new_static")
      rm -rf --one-file-system -- "$1" ;;
    *)
      echo 'cleanup_refused=unsafe_path'
      return 1 ;;
  esac
}

cleanup_inbound() {
  [ -e "$inbound" ] || return 0
  chmod 0700 "$inbound"
  rm -f -- "$archive_source" "$runner_source" "$checksums_source"
  rm -f -- "$helper_source"
  rmdir -- "$inbound"
}

health_wait() {
  local attempt
  for attempt in $(seq 1 30); do
    if [ "$(curl --silent --show-error --max-time 5 -o /dev/null -w '%{http_code}' \
      http://127.0.0.1:3001/health 2>/dev/null || true)" = '200' ]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

service_state() {
  local unit="$1"
  printf '%s/%s/%s/%s' \
    "$(systemctl show "$unit" -p ActiveState --value)" \
    "$(systemctl show "$unit" -p SubState --value)" \
    "$(systemctl show "$unit" -p NRestarts --value)" \
    "$(systemctl show "$unit" -p ExecMainStatus --value)"
}

service_main_pid() {
  systemctl show "$1" -p MainPID --value
}

restore_link() {
  local link="$1" target="$2" next="$3"
  rm -f -- "$next"
  ln -s "$target" "$next"
  mv -Tf "$next" "$link"
}

rollback() {
  local rc="${1:-1}"
  local cleanup_failed=0
  trap - ERR EXIT INT TERM
  set +e
  if [ "$backend_switched" -eq 1 ]; then
    if [ "$(readlink -f "$current" 2>/dev/null || true)" = "$new_release" ]; then
      restore_link "$current" "$old_release" "$current_next" || cleanup_failed=1
    elif [ "$(readlink -f "$current" 2>/dev/null || true)" != "$old_release" ]; then
      cleanup_failed=1
    fi
  fi
  if [ "$static_switched" -eq 1 ]; then
    if [ "$(readlink -f "$static_link" 2>/dev/null || true)" = "$new_static" ]; then
      restore_link "$static_link" "$old_static" "$static_next" || cleanup_failed=1
    elif [ "$(readlink -f "$static_link" 2>/dev/null || true)" != "$old_static" ]; then
      cleanup_failed=1
    fi
  fi
  rm -f -- "$current_next" "$static_next"
  if [ "$backend_restart_attempted" -eq 1 ]; then
    systemctl restart "$backend_unit" || cleanup_failed=1
    health_wait || cleanup_failed=1
  fi
  if [ "$release_stage_created" -eq 1 ] && [ -e "$release_stage" ]; then
    safe_remove "$release_stage" || cleanup_failed=1
  fi
  if [ "$static_stage_created" -eq 1 ] && [ -e "$static_stage" ]; then
    safe_remove "$static_stage" || cleanup_failed=1
  fi
  if [ "$release_created" -eq 1 ] && [ -e "$new_release" ]; then
    [ "$(readlink -f "$current" 2>/dev/null || true)" = "$old_release" ] \
      && safe_remove "$new_release" || cleanup_failed=1
  fi
  if [ "$static_created" -eq 1 ] && [ -e "$new_static" ]; then
    [ "$(readlink -f "$static_link" 2>/dev/null || true)" = "$old_static" ] \
      && safe_remove "$new_static" || cleanup_failed=1
  fi
  if [ "$runtime_created" -eq 1 ] && [ -e "$runtime" ]; then
    safe_remove "$runtime" || cleanup_failed=1
  fi
  cleanup_inbound || cleanup_failed=1
  if [ "$cleanup_failed" -eq 0 ]; then
    echo "terminal=blocked code=$failure_code rollback=passed cleanup=passed migration:$migration_attempted schema_retained:$schema_retained"
  else
    echo "terminal=blocked code=$failure_code rollback_or_cleanup=failed migration:$migration_attempted schema_retained:$schema_retained"
  fi
  exit "$rc"
}

trap 'rc=$?; failure_code="${failure_code:-UNEXPECTED_FAILURE}"; rollback "$rc"' ERR
trap 'rollback $?' EXIT
trap 'failure_code=SIGNAL_INT; rollback 130' INT
trap 'failure_code=SIGNAL_TERM; rollback 143' TERM

chown --no-dereference root:root "$inbound" "$archive_source" "$runner_source" "$helper_source" "$checksums_source"
chmod 0500 "$inbound" "$runner_source" "$helper_source"
chmod 0400 "$archive_source" "$checksums_source"
[ "$(stat -c '%U:%G:%a' "$inbound")" = 'root:root:500' ]
[ "$(stat -c '%U:%G:%a' "$runner_source")" = 'root:root:500' ]
[ "$(stat -c '%U:%G:%a' "$helper_source")" = 'root:root:500' ]
[ "$(stat -c '%U:%G:%a' "$archive_source")" = 'root:root:400' ]
[ "$(stat -c '%U:%G:%a' "$checksums_source")" = 'root:root:400' ]
(cd "$inbound" && sha256sum --strict -c SHA256SUMS >/dev/null)
/bin/bash -n "$runner_source"
! grep -Eq '(^|[[:space:];])source([[:space:];]|$)|(^|[[:space:];])eval([[:space:];]|$)|(^|[[:space:];])set[[:space:]]+-[+]a([[:space:];]|$)|(^|[[:space:];])set[[:space:]]+-a([[:space:];]|$)' "$runner_source"
/usr/local/bin/node "$helper_source" --self-test >/dev/null
echo 'payload_gate=passed sha:closed bash:passed env_parse:forbidden helper_self_test:passed'

failure_code='BASELINE_GATE_FAILED'
[ "$(readlink -f "$current")" = "$old_release" ]
[ -d "$old_release" ] && [ ! -L "$old_release" ]
[ "$(readlink -f "$static_link")" = "$old_static" ]
[ -d "$old_static" ] && [ ! -L "$old_static" ]
[ ! -e "$new_release" ] && [ ! -e "$new_static" ]
[ ! -e "$release_stage" ] && [ ! -e "$static_stage" ]
[ ! -e "$current_next" ] && [ ! -e "$static_next" ]
backend_active="$(systemctl show "$backend_unit" -p ActiveState --value)"
backend_sub="$(systemctl show "$backend_unit" -p SubState --value)"
backend_restarts="$(systemctl show "$backend_unit" -p NRestarts --value)"
backend_exec_main="$(systemctl show "$backend_unit" -p ExecMainStatus --value)"
[ "$backend_active" = 'active' ]
[ "$backend_sub" = 'running' ]
case "$backend_restarts" in
  ''|*[!0-9]*) false ;;
esac
[ "$backend_exec_main" = '0' ]
[ "$(service_state "$asr_unit")" = 'active/running/0/0' ]
[ "$(service_state "$screen_unit")" = 'inactive/dead/0/0' ]
[ "$(service_state "$ocr_unit")" = 'active/running/0/0' ]
health_wait
[ "$(curl --silent --show-error --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/ 2>/dev/null || true)" = '200' ]
[ "$(curl --silent --show-error --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/projects/1/asr 2>/dev/null || true)" = '200' ]
old_backend_state="$(service_state "$backend_unit")"
[ "$old_backend_state" = "$backend_active/$backend_sub/$backend_restarts/$backend_exec_main" ]
old_backend_pid="$(service_main_pid "$backend_unit")"
[ "$old_backend_pid" -gt 1 ]
old_asr_state="$(service_state "$asr_unit")"
old_screen_state="$(service_state "$screen_unit")"
old_ocr_state="$(service_state "$ocr_unit")"
echo "baseline=passed backend:$old_backend_state asr:$old_asr_state screen:$old_screen_state ocr:$old_ocr_state health:200 employee:200/200"

failure_code='ARCHIVE_GATE_FAILED'
runtime_created=1
install -d -o root -g root -m 0700 "$runtime" "$unpack"
tar -tzf "$archive_source" > "$archive_list"
awk 'index($0, "backend/") == 1 || index($0, "static/") == 1 || $0 == "backend" || $0 == "static" { next } { exit 1 }' "$archive_list"
awk '$0 ~ /^\// || $0 ~ /(^|\/)\.\.($|\/)/ { exit 1 }' "$archive_list"
tar -xzf "$archive_source" -C "$unpack"
[ -d "$unpack/backend" ] && [ ! -L "$unpack/backend" ]
[ -d "$unpack/static" ] && [ ! -L "$unpack/static" ]

failure_code='RELEASE_STAGE_FAILED'
release_stage_created=1
install -d -o root -g qimao -m 0750 "$release_stage"
install -d -o root -g qimao -m 0750 "$release_stage/backend"
cp -a --reflink=auto "$unpack/backend/." "$release_stage/backend/"
chown -R --no-dereference root:qimao "$release_stage"
find "$release_stage" -type d -exec chmod 0750 {} +
find "$release_stage" -type f -exec chmod 0640 {} +

failure_code='STATIC_STAGE_FAILED'
static_stage_created=1
install -d -o root -g root -m 0755 "$static_stage"
cp -a --reflink=auto "$unpack/static/." "$static_stage/"
chown -R --no-dereference root:root "$static_stage"
find "$static_stage" -type d -exec chmod 0755 {} +
find "$static_stage" -type f -exec chmod 0644 {} +

failure_code='CANDIDATE_CONTENT_GATE_FAILED'
for entry in \
  "$release_stage/backend/dist/server.js" \
  "$release_stage/backend/dist/workers/asr.worker.entry.js" \
  "$release_stage/backend/dist/workers/screen-text.worker.entry.js" \
  "$release_stage/backend/dist/workers/pre-review.worker.entry.js" \
  "$release_stage/backend/dist/workers/term-extraction.worker.entry.js"; do
  [ -f "$entry" ] && [ ! -L "$entry" ]
  /usr/local/bin/node --check "$entry" >/dev/null
  runuser -u qimao -- test -r "$entry"
done
[ -f "$static_stage/index.html" ] && [ ! -L "$static_stage/index.html" ]
[ "$(find "$static_stage/assets" -type f | wc -l)" -ge 1 ]
grep -R -F -q -- '确认部分发布' "$static_stage/assets"
grep -R -F -q -- '排除集' "$static_stage/assets"
echo 'candidate_gate=passed backend_entries:5 static:index+assets+partial-release-markers'

failure_code='CANDIDATE_IMPORT_GATE_FAILED'
(
  cd "$release_stage/backend"
  runuser -u qimao -- /usr/local/bin/node --input-type=module -e "
    await import('@tus/server');
    await import('./dist/modules/storage/s3-compatible-storage.js');
    await import('./dist/modules/asr/tencent-asr-runtime.js');
    await import('./dist/workers/asr.worker.entry.js');
    await import('./dist/app.js');
    await import('./dist/server.js');
  "
)
echo 'candidate_import_gate=passed tus:server storage asr-runtime asr-worker app server'

failure_code='MIGRATION_PREFLIGHT_FAILED'
migration_helper_stage="$release_stage/.db-migration-gate.mjs"
install -o root -g qimao -m 0640 "$helper_source" "$migration_helper_stage"
systemd-run --quiet --wait --pipe --collect \
  --unit=qimao-screen-text-partial-release-1714-db-preflight \
  --property=Type=oneshot \
  --property=User=qimao \
  --property=Group=qimao \
  --property=WorkingDirectory="$release_stage/backend" \
  --property=EnvironmentFile=/etc/qimao-terms-cloud/backend.env \
  --property=PrivateTmp=yes \
  --property=ProtectSystem=strict \
  --property=ProtectHome=yes \
  --property=NoNewPrivileges=yes \
  --property=UMask=0027 \
  --property=TimeoutStartSec=60s \
  /usr/local/bin/node "$migration_helper_stage" --before --migration-dir "$release_stage/backend/migrations"
echo 'migration_preflight=passed previous=1754976033000 expected_pending=1754976034000'

failure_code='CURRENT_SWITCH_FAILED'
mv -T "$release_stage" "$new_release"
release_stage_created=0
release_created=1
ln -s "$new_release" "$current_next"
mv -Tf "$current_next" "$current"
backend_switched=1

failure_code='MIGRATION_FAILED'
migration_attempted=1
systemd-run --quiet --wait --pipe --collect \
  --unit=qimao-screen-text-partial-release-1714-migrate \
  --property=Type=oneshot \
  --property=User=qimao \
  --property=Group=qimao \
  --property=WorkingDirectory="$new_release/backend" \
  --property=EnvironmentFile=/etc/qimao-terms-cloud/backend.env \
  --property=PrivateTmp=yes \
  --property=ProtectSystem=strict \
  --property=ProtectHome=yes \
  --property=NoNewPrivileges=yes \
  --property=UMask=0027 \
  --property=TimeoutStartSec=300s \
  /usr/local/bin/node "$new_release/backend/dist/database/migrate.js"
migration_succeeded=1
schema_retained='1754976034000_add_partial_screen_text_release'
[ "$(service_main_pid "$backend_unit")" = "$old_backend_pid" ]
[ "$(service_state "$backend_unit")" = "$old_backend_state" ]

failure_code='MIGRATION_VERIFY_FAILED'
systemd-run --quiet --wait --pipe --collect \
  --unit=qimao-screen-text-partial-release-1714-db-verify \
  --property=Type=oneshot \
  --property=User=qimao \
  --property=Group=qimao \
  --property=WorkingDirectory="$new_release/backend" \
  --property=EnvironmentFile=/etc/qimao-terms-cloud/backend.env \
  --property=PrivateTmp=yes \
  --property=ProtectSystem=strict \
  --property=ProtectHome=yes \
  --property=NoNewPrivileges=yes \
  --property=UMask=0027 \
  --property=TimeoutStartSec=60s \
  /usr/local/bin/node "$new_release/.db-migration-gate.mjs" --after --migration-dir "$new_release/backend/migrations"
echo 'migration=passed schema=1754976034000_add_partial_screen_text_release'

failure_code='STATIC_SWITCH_FAILED'
mv -T "$static_stage" "$new_static"
static_stage_created=0
static_created=1
ln -s "$new_static" "$static_next"
mv -Tf "$static_next" "$static_link"
static_switched=1
[ "$(readlink -f "$current")" = "$new_release" ]
[ "$(readlink -f "$static_link")" = "$new_static" ]

failure_code='BACKEND_RESTART_OR_HEALTH_FAILED'
backend_restart_attempted=1
systemctl restart "$backend_unit"
health_wait

failure_code='POST_SWITCH_GATE_FAILED'
candidate_backend_state="$(service_state "$backend_unit")"
candidate_backend_pid="$(service_main_pid "$backend_unit")"
[ "$candidate_backend_state" = 'active/running/0/0' ]
[ "$candidate_backend_pid" -gt 1 ]
[ "$(service_state "$asr_unit")" = "$old_asr_state" ]
[ "$(service_state "$screen_unit")" = "$old_screen_state" ]
[ "$(service_state "$ocr_unit")" = "$old_ocr_state" ]
sleep 5
[ "$(service_main_pid "$backend_unit")" = "$candidate_backend_pid" ]
[ "$(service_state "$backend_unit")" = "$candidate_backend_state" ]
[ "$(service_state "$asr_unit")" = "$old_asr_state" ]
[ "$(service_state "$screen_unit")" = "$old_screen_state" ]
[ "$(service_state "$ocr_unit")" = "$old_ocr_state" ]
api_result="$(curl --silent --show-error --max-time 10 \
  -D "$api_headers" -o "$api_body" -w $'%{http_code}\n%{content_type}' \
  -H 'accept: application/json' \
  http://127.0.0.1:3001/api/projects/00000000-0000-0000-0000-000000000000/screen-text/releases)"
api_status="${api_result%%$'\n'*}"
api_content_type="${api_result#*$'\n'}"
[ "$api_status" = '401' ]
case "$api_content_type" in
  application/json*) ;;
  *) false ;;
esac
! grep -qi -- '<html' "$api_body"
[ "$(curl --silent --show-error --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/ 2>/dev/null || true)" = '200' ]
[ "$(curl --silent --show-error --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/projects/1/asr 2>/dev/null || true)" = '200' ]
echo "post_switch=passed health:200 unauth_screen_text_release:401/json/nonhtml employee:200/200 backend:$candidate_backend_state/stable_pid_5s asr:$old_asr_state screen:$old_screen_state ocr:$old_ocr_state"

failure_code='FINAL_CLEANUP_FAILED'
cleanup_inbound
safe_remove "$runtime"
[ ! -e "$inbound" ] && [ ! -e "$runtime" ]
[ ! -e "$current_next" ] && [ ! -e "$static_next" ] && [ ! -e "$release_stage" ] && [ ! -e "$static_stage" ]
trap - ERR EXIT INT TERM
echo "terminal=passed candidate:$new_release static:$new_static backend_restart:1 db_write:1 migration:1 schema_applied:1754976034000_add_partial_screen_text_release cos_write:0 route_write:0 budget_write:0 provider_calls:0 asr_restart:0 ocr_restart:0 screen_start:0"
exit 0
