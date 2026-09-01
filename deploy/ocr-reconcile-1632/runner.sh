#!/bin/bash
set -Eeuo pipefail
umask 077

input_fail() {
  echo "input_gate=failed code=$1"
  exit 64
}

inbound="${1-}"
[ "$EUID" -eq 0 ] || input_fail 'ROOT_REQUIRED'
[ "$inbound" = '/var/tmp/qimao-ocr-reconcile-1632-inbound' ] \
  || input_fail 'INBOUND_PATH_INVALID'
lock_file='/run/lock/qimao-ocr-reconcile-1632.lock'
exec 9>"$lock_file" || input_fail 'LOCK_OPEN_FAILED'
flock -n 9 || input_fail 'LOCK_ALREADY_HELD'

runner_source="$inbound/runner.sh"
helper_source="$inbound/reconcile_retry.mjs"
checksums_source="$inbound/SHA256SUMS"
[ -d "$inbound" ] && [ ! -L "$inbound" ] \
  || input_fail 'INBOUND_DIRECTORY_INVALID'
[ "$(stat -c '%U:%G:%a' "$inbound")" = 'qimao-deploy:qimao-deploy:700' ] \
  || input_fail 'INBOUND_DIRECTORY_IDENTITY_INVALID'
[ "$(find "$inbound" -mindepth 1 -maxdepth 1 | wc -l)" = '3' ] \
  || input_fail 'INBOUND_ENTRY_COUNT_INVALID'
[ "$(find "$inbound" -mindepth 1 -maxdepth 1 -type f | wc -l)" = '3' ] \
  || input_fail 'INBOUND_REGULAR_FILE_COUNT_INVALID'
for file in "$runner_source" "$helper_source" "$checksums_source"; do
  [ -f "$file" ] && [ ! -L "$file" ] \
    && [ "$(stat -c '%U:%G:%h' "$file")" = 'qimao-deploy:qimao-deploy:1' ] \
    || input_fail 'INBOUND_FILE_IDENTITY_INVALID'
done
chown --no-dereference root:root "$inbound" \
  "$runner_source" "$helper_source" "$checksums_source"
chmod 0700 "$inbound"
chmod 0500 "$runner_source"
chmod 0400 "$helper_source" "$checksums_source"
[ "$(stat -c '%U:%G:%a' "$inbound")" = 'root:root:700' ] \
  || input_fail 'INBOUND_ROOT_TAKEOVER_FAILED'
[ "$(stat -c '%U:%G:%a:%h' "$runner_source")" = 'root:root:500:1' ] \
  || input_fail 'RUNNER_ROOT_TAKEOVER_FAILED'
for file in "$helper_source" "$checksums_source"; do
  [ "$(stat -c '%U:%G:%a:%h' "$file")" = 'root:root:400:1' ] \
    || input_fail 'PAYLOAD_ROOT_TAKEOVER_FAILED'
done
chmod 0500 "$inbound"
[ "$(stat -c '%U:%G:%a' "$inbound")" = 'root:root:500' ] \
  || input_fail 'INBOUND_READ_ONLY_SEAL_FAILED'
[ "$(wc -l < "$checksums_source")" = '2' ] \
  || input_fail 'SHA_LINE_COUNT_INVALID'
[ "$(awk 'NF==2 && length($1)==64 && $1 !~ /[^0-9a-f]/ {print $2}' \
  "$checksums_source" | paste -sd, -)" = 'runner.sh,reconcile_retry.mjs' ] \
  || input_fail 'SHA_CONTENT_INVALID'
(cd "$inbound" && sha256sum --strict -c SHA256SUMS >/dev/null) \
  || input_fail 'SHA_CLOSURE_INVALID'
/bin/bash -n "$runner_source" || input_fail 'RUNNER_SYNTAX_INVALID'
/usr/local/bin/node --check "$helper_source" >/dev/null \
  || input_fail 'HELPER_SYNTAX_INVALID'

current='/opt/qimao-terms-cloud/current'
release='/opt/qimao-terms-cloud/releases/ai-recovery-1607-r3'
backend_unit='qimao-backend.service'
openvino_unit='qimao-local-ocr-openvino.service'
screen_unit='qimao-worker@screen-text.worker.entry.js.service'
runtime='/run/qimao-ocr-reconcile-1632'
helper="$runtime/reconcile_retry.mjs"
work_dir="$runtime/work"
payload="$work_dir/retry.json"
curl_config="$work_dir/retry.curl"
retry_response="$work_dir/retry.response"
monitor_log="$work_dir/monitor.log"
retry_key='ocr-retry-1632-geometry-r3-v1'

failure_code='UNEXPECTED_COMMAND_FAILURE'
created_runtime=0
reconcile_committed=0
abort_normalized=0
post_started=0
retry_committed=0
worker_started=0

safe_remove_runtime() {
  [ "$1" = "$runtime" ] || return 1
  rm -rf --one-file-system -- "$runtime"
}

cleanup_inbound() {
  [ ! -e "$inbound" ] && return 0
  chmod 0700 "$inbound"
  rm -f -- "$runner_source" "$helper_source" "$checksums_source"
  rmdir -- "$inbound"
}

finish_failure() {
  local rc="${1:-1}" cleanup_failed=0
  trap - ERR EXIT INT TERM
  set +e
  if [ "$worker_started" -eq 1 ]; then
    systemctl stop "$screen_unit" || cleanup_failed=1
  fi
  cleanup_inbound || cleanup_failed=1
  if [ "$created_runtime" -eq 1 ] && [ -e "$runtime" ]; then
    safe_remove_runtime "$runtime" || cleanup_failed=1
  fi
  if [ "$cleanup_failed" -eq 0 ]; then
    echo "terminal=blocked code=$failure_code reconcile:$reconcile_committed abort_normalized:$abort_normalized post_started:$post_started retry_committed:$retry_committed worker_stopped:$worker_started cleanup:passed"
  else
    echo "terminal=blocked code=$failure_code reconcile:$reconcile_committed abort_normalized:$abort_normalized post_started:$post_started retry_committed:$retry_committed cleanup:failed"
  fi
  exit "$rc"
}

trap 'finish_failure $?' ERR
trap 'finish_failure $?' EXIT
trap "failure_code='SIGNAL_INT'; finish_failure 130" INT
trap "failure_code='SIGNAL_TERM'; finish_failure 143" TERM

echo 'runner_started=1 inbound=root_sealed sha_closure=passed'

failure_code='BASELINE_IDENTITY_FAILED'
[ "$(readlink -f "$current")" = "$release" ]
[ "$(systemctl show "$backend_unit" -p ActiveState --value)" = 'active' ]
[ "$(systemctl show "$backend_unit" -p SubState --value)" = 'running' ]
[ "$(systemctl show "$backend_unit" -p NRestarts --value)" = '0' ]
[ "$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
  "http://127.0.0.1:${PORT:-3001}/health")" = '200' ]
[ "$(systemctl show "$openvino_unit" -p ActiveState --value)" = 'active' ]
[ "$(systemctl show "$openvino_unit" -p SubState --value)" = 'running' ]
[ "$(systemctl show "$openvino_unit" -p NRestarts --value)" = '0' ]
systemctl show "$openvino_unit" -p WorkingDirectory --value \
  | grep -Fqx '/opt/qimao/local-ocr/20260831-local-ocr-geometry-r3/node'
systemctl show "$openvino_unit" -p ExecStart --value \
  | grep -Fq '/opt/qimao/local-ocr/20260831-local-ocr-geometry-r3/node/entry.js'
[ "$(systemctl is-active "$screen_unit" 2>/dev/null || true)" = 'inactive' ]
[ "$(systemctl show "$screen_unit" -p NRestarts --value)" = '0' ]
[ -n "${DATABASE_URL:-}" ]
[ -n "${QIMAO_EMPLOYEE_ORIGIN:-}" ]
[ ! -e "$runtime" ]
echo 'baseline=passed current:r3 backend:active health:200 openvino:active screen:inactive worker_restarts:0'

failure_code='RUNTIME_PREPARE_FAILED'
created_runtime=1
install -d -o root -g qimao -m 0750 "$runtime"
install -o root -g qimao -m 0550 "$helper_source" "$helper"
install -d -o qimao -g qimao -m 0700 "$work_dir"
runuser -u qimao -- /usr/local/bin/node --check "$helper" >/dev/null

failure_code='READ_ONLY_AUDIT_FAILED'
runuser -u qimao -- env ACTION='audit' RELEASE_ROOT="$release" \
  /usr/local/bin/node "$helper"

failure_code='LOCAL_UNKNOWN_RECONCILE_FAILED'
runuser -u qimao -- env ACTION='reconcile' RELEASE_ROOT="$release" \
  /usr/local/bin/node "$helper"
reconcile_committed=1

failure_code='LOCAL_ABORT_NORMALIZE_FAILED'
runuser -u qimao -- env ACTION='normalize-abort' RELEASE_ROOT="$release" \
  /usr/local/bin/node "$helper"
abort_normalized=1

failure_code='PRE_SUBMIT_IDENTITY_FAILED'
runuser -u qimao -- env ACTION='pre-submit' RELEASE_ROOT="$release" \
  PAYLOAD_PATH="$payload" /usr/local/bin/node "$helper"

failure_code='RETRY_SESSION_FAILED'
session_token="$(runuser -u qimao -- env ACTION='session' RELEASE_ROOT="$release" \
  /usr/local/bin/node "$helper")"
project_id="$(runuser -u qimao -- env ACTION='project-id' \
  /usr/local/bin/node "$helper")"
batch_id="$(runuser -u qimao -- env ACTION='batch-id' \
  /usr/local/bin/node "$helper")"
{
  printf 'url = "http://127.0.0.1:%s/api/projects/%s/screen-text/batches/%s/retries"\n' \
    "${PORT:-3001}" "$project_id" "$batch_id"
  printf 'request = "POST"\n'
  printf 'header = "Content-Type: application/json"\n'
  printf 'header = "Origin: %s"\n' "$QIMAO_EMPLOYEE_ORIGIN"
  printf 'header = "Idempotency-Key: %s"\n' "$retry_key"
  printf 'header = "Cookie: __Host-qimao_employee_session=%s"\n' "$session_token"
  printf 'data-binary = "@%s"\n' "$payload"
} > "$curl_config"
unset session_token project_id batch_id
chmod 0600 "$curl_config"

failure_code='SCREEN_TEXT_RETRY_COMMIT_UNKNOWN'
post_started=1
set +e
retry_status="$(curl --silent --show-error --config "$curl_config" \
  --output "$retry_response" --write-out '%{http_code}')"
curl_rc=$?
rm -f -- "$curl_config"
commit_state="$(runuser -u qimao -- env ACTION='commit-state' RELEASE_ROOT="$release" \
  /usr/local/bin/node "$helper" 2>/dev/null)"
commit_state_rc=$?
set -e
[ "$commit_state_rc" -eq 0 ] || commit_state='unknown'
[ "$commit_state" = 'committed' ]
retry_committed=1
echo "retry_commit=proven command_unique:1 curl_exit:$curl_rc http_status:${retry_status:-none} episodes:1,2,5,6"

failure_code='RETRY_PROJECTION_FAILED'
runuser -u qimao -- env ACTION='projection' RELEASE_ROOT="$release" \
  /usr/local/bin/node "$helper"

failure_code='SCREEN_WORKER_START_FAILED'
worker_started=1
systemctl start "$screen_unit"
for attempt in $(seq 1 20); do
  [ "$(systemctl is-active "$screen_unit" 2>/dev/null || true)" = 'active' ] && break
  sleep 1
done
[ "$(systemctl show "$screen_unit" -p ActiveState --value)" = 'active' ]
[ "$(systemctl show "$screen_unit" -p SubState --value)" = 'running' ]
[ "$(systemctl show "$screen_unit" -p NRestarts --value)" = '0' ]
[ "$(systemctl show "$openvino_unit" -p ActiveState --value)" = 'active' ]
echo 'worker_gate=screen:active openvino:active restarts:0'

failure_code='OCR_QUEUE_MONITOR_FAILED'
runuser -u qimao -- env ACTION='monitor' RELEASE_ROOT="$release" \
  /usr/local/bin/node "$helper" | tee "$monitor_log"
grep -Eq '^monitor_terminal=(complete|continuation_required) ' "$monitor_log"

failure_code='FINAL_RUNTIME_GATE_FAILED'
[ "$(readlink -f "$current")" = "$release" ]
[ "$(systemctl show "$openvino_unit" -p ActiveState --value)" = 'active' ]
[ "$(systemctl show "$openvino_unit" -p NRestarts --value)" = '0' ]
[ "$(systemctl show "$screen_unit" -p ActiveState --value)" = 'active' ]
[ "$(systemctl show "$screen_unit" -p NRestarts --value)" = '0' ]

cleanup_inbound
safe_remove_runtime "$runtime"
[ ! -e "$inbound" ] && [ ! -e "$runtime" ]
created_runtime=0
trap - ERR EXIT INT TERM
if grep -Fq 'monitor_terminal=complete' "$monitor_log"; then
  echo 'terminal=passed queue:complete reconcile:committed retry:committed worker:active provider:openvino asr_action:0 route_write:0 cos_write:0'
else
  echo 'terminal=passed queue:processing reconcile:committed retry:committed worker:active provider:openvino asr_action:0 route_write:0 cos_write:0'
fi
