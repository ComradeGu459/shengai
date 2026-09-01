#!/bin/bash
set -Eeuo pipefail
umask 077

input_fail() {
  echo "terminal=blocked code=$1"
  exit 64
}

inbound="${1-}"
[ "$EUID" -eq 0 ] || input_fail 'ROOT_REQUIRED'
[ "$inbound" = '/var/tmp/qimao-ocr-worker-once-1675-inbound' ] \
  || input_fail 'INBOUND_PATH_INVALID'

archive_name='ocr-worker-once-20260831-r1.tar.gz'
archive_source="$inbound/$archive_name"
runner_source="$inbound/runner.sh"
checksums_source="$inbound/SHA256SUMS"
[ -d "$inbound" ] && [ ! -L "$inbound" ] || input_fail 'INBOUND_DIRECTORY_INVALID'
[ "$(stat -c '%U:%G:%a' "$inbound")" = 'qimao-deploy:qimao-deploy:700' ] \
  || input_fail 'INBOUND_DIRECTORY_IDENTITY_INVALID'
[ "$(find "$inbound" -mindepth 1 -maxdepth 1 -type f | wc -l)" = '3' ] \
  || input_fail 'INBOUND_FILE_COUNT_INVALID'
[ "$(find "$inbound" -mindepth 1 -maxdepth 1 ! -type f | wc -l)" = '0' ] \
  || input_fail 'INBOUND_NONFILE_INVALID'
for file in "$archive_source" "$runner_source" "$checksums_source"; do
  [ -f "$file" ] && [ ! -L "$file" ] || input_fail 'INBOUND_FILE_INVALID'
  [ "$(stat -c '%U:%G:%h' "$file")" = 'qimao-deploy:qimao-deploy:1' ] \
    || input_fail 'INBOUND_FILE_IDENTITY_INVALID'
done

lock_file='/run/lock/qimao-ocr-worker-once-1675.lock'
exec 9>"$lock_file"
flock -n 9 || input_fail 'LOCK_ALREADY_HELD'

old_release='/opt/qimao-terms-cloud/releases/ocr-timeout-20260831-r1'
new_release='/opt/qimao-terms-cloud/releases/ocr-worker-once-20260831-r1'
release_stage='/opt/qimao-terms-cloud/releases/.ocr-worker-once-20260831-r1-stage-1675'
current='/opt/qimao-terms-cloud/current'
current_next='/opt/qimao-terms-cloud/current.ocr-worker-once-1675.next'
static_link='/srv/qimao-terms-cloud/frontend'
old_static='/srv/qimao-terms-cloud/frontend-asr-srt-compare-20260831-r2'
runtime='/run/qimao-ocr-worker-once-1675'
unpack="$runtime/unpack"
archive_list="$runtime/archive.list"
sidecar_body="$runtime/sidecar.body"
backend_unit='qimao-backend.service'
asr_unit='qimao-worker@asr.worker.entry.js.service'
screen_unit='qimao-worker@screen-text.worker.entry.js.service'
openvino_unit='qimao-local-ocr-openvino.service'
backend_env='/etc/qimao-terms-cloud/screen-text-local-ocr-05d.env'
sidecar_env='/etc/qimao-terms-cloud/local-ocr-04g-openvino.env'

failure_code='UNEXPECTED_FAILURE'
runtime_created=0
release_stage_created=0
release_created=0
current_switched=0
backend_restart_attempted=0

safe_remove() {
  case "$1" in
    "$runtime"|"$release_stage"|"$new_release")
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
  rmdir -- "$inbound"
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

env_value() {
  local file="$1" key="$2"
  awk -F= -v key="$key" '
    index($0, key "=") == 1 { value=substr($0, length(key) + 2); count += 1 }
    END { if (count != 1) exit 42; print value }
  ' "$file"
}

env_sig() {
  stat -c '%u:%g:%a:%s:%Y:%X' "$1"
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

sidecar_contract() {
  local response status content_type
  response="$(curl --silent --show-error --max-time 5 \
    -o "$sidecar_body" -w $'%{http_code}\n%{content_type}' \
    http://127.0.0.1:3100/ocr 2>/dev/null || true)"
  status="${response%%$'\n'*}"
  content_type="${response#*$'\n'}"
  [ "$status" = '405' ]
  case "$content_type" in
    application/json*) ;;
    *) false ;;
  esac
  grep -Fq -- 'LOCAL_OCR_REQUEST_INVALID' "$sidecar_body"
}

rollback() {
  local rc="${1:-1}"
  local cleanup_failed=0
  trap - ERR EXIT INT TERM
  set +e

  rm -f -- "$current_next"

  if [ "$current_switched" -eq 1 ]; then
    if [ "$(readlink -f "$current" 2>/dev/null || true)" = "$new_release" ]; then
      ln -s "$old_release" "$current_next" || cleanup_failed=1
      mv -Tf "$current_next" "$current" || cleanup_failed=1
    elif [ "$(readlink -f "$current" 2>/dev/null || true)" != "$old_release" ]; then
      cleanup_failed=1
    fi
  fi

  if [ "$backend_restart_attempted" -eq 1 ] || [ "$current_switched" -eq 1 ]; then
    systemctl restart "$backend_unit" || cleanup_failed=1
    health_wait || cleanup_failed=1
  fi

  if [ -n "${old_backend_state:-}" ]; then
    [ "$(readlink -f "$current" 2>/dev/null || true)" = "$old_release" ] || cleanup_failed=1
    [ "$(service_state "$backend_unit" | cut -d/ -f1-2)" = 'active/running' ] || cleanup_failed=1
    [ "$(systemctl show "$backend_unit" -p ExecMainStatus --value)" = '0' ] || cleanup_failed=1
  fi
  if [ -n "${old_asr_state:-}" ]; then
    [ "$(service_state "$asr_unit")" = "$old_asr_state" ] || cleanup_failed=1
    [ "$(service_main_pid "$asr_unit")" = "${old_asr_pid:-}" ] || cleanup_failed=1
  fi
  if [ -n "${old_screen_state:-}" ]; then
    [ "$(service_state "$screen_unit")" = "$old_screen_state" ] || cleanup_failed=1
  fi
  if [ -n "${old_openvino_state:-}" ]; then
    [ "$(service_state "$openvino_unit")" = "$old_openvino_state" ] || cleanup_failed=1
    [ "$(service_main_pid "$openvino_unit")" = "${old_openvino_pid:-}" ] || cleanup_failed=1
  fi
  if [ -n "${old_backend_env_sig:-}" ] && [ -f "$backend_env" ]; then
    [ "$(env_sig "$backend_env")" = "$old_backend_env_sig" ] || cleanup_failed=1
  fi
  if [ -n "${old_sidecar_env_sig:-}" ] && [ -f "$sidecar_env" ]; then
    [ "$(env_sig "$sidecar_env")" = "$old_sidecar_env_sig" ] || cleanup_failed=1
  fi

  if [ "$release_stage_created" -eq 1 ] && [ -e "$release_stage" ]; then
    safe_remove "$release_stage" || cleanup_failed=1
  fi
  if [ "$release_created" -eq 1 ] && [ -e "$new_release" ]; then
    [ "$(readlink -f "$current" 2>/dev/null || true)" = "$old_release" ] \
      && safe_remove "$new_release" || cleanup_failed=1
  fi
  cleanup_inbound || cleanup_failed=1
  if [ "$runtime_created" -eq 1 ] && [ -e "$runtime" ]; then
    safe_remove "$runtime" || cleanup_failed=1
  fi
  [ ! -e "$current_next" ] || cleanup_failed=1
  if [ "$cleanup_failed" -eq 0 ]; then
    echo "terminal=blocked code=$failure_code rollback=passed cleanup=passed"
  else
    echo "terminal=blocked code=$failure_code rollback_or_cleanup=failed"
  fi
  exit "$rc"
}

trap 'rc=$?; failure_code="${failure_code:-UNEXPECTED_FAILURE}"; rollback "$rc"' ERR
trap 'rollback $?' EXIT
trap 'failure_code=SIGNAL_INT; rollback 130' INT
trap 'failure_code=SIGNAL_TERM; rollback 143' TERM

chown --no-dereference root:root "$inbound" "$archive_source" "$runner_source" "$checksums_source"
chmod 0500 "$inbound" "$runner_source"
chmod 0400 "$archive_source" "$checksums_source"
[ "$(stat -c '%U:%G:%a' "$inbound")" = 'root:root:500' ]
[ "$(stat -c '%U:%G:%a' "$runner_source")" = 'root:root:500' ]
[ "$(stat -c '%U:%G:%a' "$archive_source")" = 'root:root:400' ]
[ "$(stat -c '%U:%G:%a' "$checksums_source")" = 'root:root:400' ]
(cd "$inbound" && sha256sum --strict -c SHA256SUMS >/dev/null)
/bin/bash -n "$runner_source"
echo 'payload_gate=passed sha:closed bash:passed'

failure_code='BASELINE_GATE_FAILED'
[ "$(readlink -f "$current")" = "$old_release" ]
[ -d "$old_release" ] && [ ! -L "$old_release" ]
[ "$(readlink -f "$static_link")" = "$old_static" ]
[ ! -e "$new_release" ] && [ ! -e "$release_stage" ] && [ ! -e "$current_next" ]
old_backend_state="$(service_state "$backend_unit")"
old_asr_state="$(service_state "$asr_unit")"
old_screen_state="$(service_state "$screen_unit")"
old_openvino_state="$(service_state "$openvino_unit")"
old_asr_pid="$(service_main_pid "$asr_unit")"
old_openvino_pid="$(service_main_pid "$openvino_unit")"
[ "${old_backend_state%%/*}" = 'active' ]
[ "$(systemctl show "$backend_unit" -p SubState --value)" = 'running' ]
[ "$(systemctl show "$backend_unit" -p ExecMainStatus --value)" = '0' ]
[ "$old_asr_state" = 'active/running/0/0' ]
[ "$old_screen_state" = 'inactive/dead/0/0' ]
[ "${old_openvino_state%%/*}" = 'active' ]
[ "$(systemctl show "$openvino_unit" -p SubState --value)" = 'running' ]
[ "$(systemctl show "$openvino_unit" -p ExecMainStatus --value)" = '0' ]
[ "$(env_value "$backend_env" 'QIMAO_LOCAL_OCR_OPENVINO_TIMEOUT_MS')" = '60000' ]
[ "$(env_value "$sidecar_env" 'QIMAO_LOCAL_OCR_SIDECAR_TIMEOUT_MS')" = '60000' ]
old_backend_env_sig="$(env_sig "$backend_env")"
old_sidecar_env_sig="$(env_sig "$sidecar_env")"
health_wait
[ "$(curl --silent --show-error --max-time 5 -o /dev/null -w '%{http_code}' \
  http://127.0.0.1:8080/projects/1 2>/dev/null || true)" = '200' ]
[ "$(curl --silent --show-error --max-time 5 -o /dev/null -w '%{http_code}' \
  http://127.0.0.1:8080/projects/1/asr 2>/dev/null || true)" = '200' ]
echo "baseline=passed current:ocr-timeout-20260831-r1 backend:$old_backend_state asr:$old_asr_state screen:$old_screen_state openvino:$old_openvino_state timeouts:60000/60000"

failure_code='ARCHIVE_GATE_FAILED'
runtime_created=1
install -d -o root -g root -m 0700 "$runtime" "$unpack"
tar -tzf "$archive_source" > "$archive_list"
awk 'index($0, "backend/") == 1 || $0 == "backend" { next } { exit 1 }' "$archive_list"
awk '$0 ~ /^\// || $0 ~ /(^|\/)\.\.($|\/)/ { exit 1 }' "$archive_list"
tar -xzf "$archive_source" -C "$unpack"
[ -d "$unpack/backend" ] && [ ! -L "$unpack/backend" ]

failure_code='RELEASE_STAGE_FAILED'
release_stage_created=1
install -d -o root -g qimao -m 0750 "$release_stage"
install -d -o root -g qimao -m 0750 "$release_stage/backend"
cp -a --reflink=auto "$unpack/backend/." "$release_stage/backend/"
chown -R --no-dereference root:qimao "$release_stage"
find "$release_stage" -type d -exec chmod 0750 {} +
find "$release_stage" -type f -exec chmod 0640 {} +

failure_code='CANDIDATE_CONTENT_GATE_FAILED'
for entry in \
  "$release_stage/backend/dist/server.js" \
  "$release_stage/backend/dist/workers/asr.worker.entry.js" \
  "$release_stage/backend/dist/workers/screen-text.worker.entry.js" \
  "$release_stage/backend/dist/workers/pre-review.worker.entry.js" \
  "$release_stage/backend/dist/workers/term-extraction.worker.entry.js" \
  "$release_stage/backend/dist/sidecars/local-ocr/entry.js"; do
  [ -f "$entry" ] && [ ! -L "$entry" ]
  /usr/local/bin/node --check "$entry" >/dev/null
  runuser -u qimao -- test -r "$entry"
done
echo 'candidate_gate=passed backend_entries:5 sidecar_entry:1'

failure_code='CANDIDATE_IMPORT_GATE_FAILED'
(
  cd "$release_stage/backend"
  runuser -u qimao -- /usr/local/bin/node --input-type=module -e "
    await import('@tus/server');
    await import('./dist/modules/storage/s3-compatible-storage.js');
    await import('./dist/modules/asr/tencent-asr-runtime.js');
    await import('./dist/workers/asr.worker.entry.js');
    const workerEntry = await import('./dist/workers/screen-text.worker.entry.js');
    await import('./dist/app.js');
    await import('./dist/server.js');
    await import('./dist/sidecars/local-ocr/sidecar.js');
    const { localOcrTimeoutsFor } = await import('./dist/modules/screen-text/local-ocr-runtime.js');
    const timeouts = localOcrTimeoutsFor(60000);
    if (timeouts.httpTimeoutMs !== 61000 || timeouts.adapterTimeoutMs !== 62000) process.exit(1);
    if (workerEntry.parseScreenTextWorkerMode([]) !== 'continuous'
      || workerEntry.parseScreenTextWorkerMode(['--once']) !== 'once') process.exit(1);
    let rejected = false;
    try { workerEntry.parseScreenTextWorkerMode(['--once', 'extra']); } catch { rejected = true; }
    if (!rejected) process.exit(1);
  "
)
echo 'candidate_import_gate=passed qimao:imports+timeouts(60000/61000/62000)+worker_mode(continuous/once/reject-extra)'

failure_code='RELEASE_INSTALL_FAILED'
release_created=1
mv -T "$release_stage" "$new_release"
release_stage_created=0

failure_code='ATOMIC_SWITCH_FAILED'
ln -s "$new_release" "$current_next"
mv -Tf "$current_next" "$current"
current_switched=1
[ "$(readlink -f "$current")" = "$new_release" ]

failure_code='BACKEND_RESTART_FAILED'
backend_restart_attempted=1
systemctl restart "$backend_unit"
health_wait
candidate_backend_state="$(service_state "$backend_unit")"
candidate_backend_pid="$(service_main_pid "$backend_unit")"
[ "$candidate_backend_state" = 'active/running/0/0' ]
[ "$candidate_backend_pid" -gt 1 ]
sidecar_contract

failure_code='POST_SWITCH_GATE_FAILED'
[ "$(service_state "$asr_unit")" = "$old_asr_state" ]
[ "$(service_main_pid "$asr_unit")" = "$old_asr_pid" ]
[ "$(service_state "$screen_unit")" = "$old_screen_state" ]
[ "$(service_state "$openvino_unit")" = "$old_openvino_state" ]
[ "$(service_main_pid "$openvino_unit")" = "$old_openvino_pid" ]
[ "$(readlink -f "$static_link")" = "$old_static" ]
[ "$(env_sig "$backend_env")" = "$old_backend_env_sig" ]
[ "$(env_sig "$sidecar_env")" = "$old_sidecar_env_sig" ]
[ "$(curl --silent --show-error --max-time 5 -o /dev/null -w '%{http_code}' \
  http://127.0.0.1:8080/projects/1 2>/dev/null || true)" = '200' ]
[ "$(curl --silent --show-error --max-time 5 -o /dev/null -w '%{http_code}' \
  http://127.0.0.1:8080/projects/1/asr 2>/dev/null || true)" = '200' ]
sleep 5
[ "$(service_main_pid "$backend_unit")" = "$candidate_backend_pid" ]
[ "$(service_state "$backend_unit")" = "$candidate_backend_state" ]
[ "$(service_main_pid "$openvino_unit")" = "$old_openvino_pid" ]
[ "$(service_state "$openvino_unit")" = "$old_openvino_state" ]
[ "$(service_state "$asr_unit")" = "$old_asr_state" ]
[ "$(service_main_pid "$asr_unit")" = "$old_asr_pid" ]
[ "$(service_state "$screen_unit")" = "$old_screen_state" ]
health_wait
sidecar_contract
echo "post_switch=passed backend:$candidate_backend_state/stable_pid_5s openvino:unchanged screen:$old_screen_state asr:$old_asr_state HTTP:200/200"

failure_code='FINAL_CLEANUP_FAILED'
cleanup_inbound
rm -f -- "$current_next"
[ ! -e "$inbound" ]
[ ! -e "$release_stage" ] && [ ! -e "$current_next" ]
[ -d "$new_release" ] && [ "$(readlink -f "$current")" = "$new_release" ]
[ "$(env_sig "$backend_env")" = "$old_backend_env_sig" ]
[ "$(env_sig "$sidecar_env")" = "$old_sidecar_env_sig" ]
safe_remove "$runtime"
trap - ERR EXIT INT TERM
echo "terminal=passed current:$new_release backend_restart:1 openvino_restart:0 timeouts:60000/61000/62000 worker_mode:once+continuous asr_restart:0 screen_start:0 db_write:0 cos_write:0 route_write:0 budget_write:0 provider_calls:0"
exit 0
