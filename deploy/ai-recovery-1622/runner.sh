#!/bin/bash
set -Eeuo pipefail
umask 077

input_fail() {
  echo "input_gate=failed code=$1"
  exit 64
}

inbound="${1-}"
[ "$EUID" -eq 0 ] || input_fail 'ROOT_REQUIRED'
[ "$inbound" = '/var/tmp/qimao-ai-recovery-1622-inbound' ] \
  || input_fail 'INBOUND_PATH_INVALID'
lock_file='/run/lock/qimao-ai-recovery-1622.lock'
exec 9>"$lock_file" || input_fail 'LOCK_OPEN_FAILED'
flock -n 9 || input_fail 'LOCK_ALREADY_HELD'

runner_source="$inbound/runner.sh"
helper_source="$inbound/recovery.mjs"
checksums_source="$inbound/SHA256SUMS"
[ -d "$inbound" ] && [ ! -L "$inbound" ] \
  || input_fail 'INBOUND_DIRECTORY_INVALID'
[ "$(stat -c '%U:%G:%a' "$inbound")" = 'qimao-deploy:qimao-deploy:700' ] \
  || input_fail 'INBOUND_DIRECTORY_IDENTITY_INVALID'
chown --no-dereference root:root "$inbound"
chmod 0700 "$inbound"
[ "$(stat -c '%U:%G:%a' "$inbound")" = 'root:root:700' ] \
  || input_fail 'INBOUND_ROOT_TAKEOVER_FAILED'

old_release='/opt/qimao-terms-cloud/releases/ai-recovery-1607-r1'
new_release='/opt/qimao-terms-cloud/releases/ai-recovery-1607-r2'
stage='/opt/qimao-terms-cloud/releases/.ai-recovery-1607-r2-stage-1622'
current='/opt/qimao-terms-cloud/current'
current_next='/opt/qimao-terms-cloud/current.ai-recovery-1622.next'
runtime='/run/qimao-ai-recovery-1622'
helper_dir="$runtime/helpers"
state_dir="$runtime/state"
prior_state='/run/qimao-ai-recovery-1614/state/preflight-state.json'
state_path="$state_dir/recovery-state.json"
preflight_dir="$state_dir/preflight"
payload="$state_dir/retry-payload.json"
retry_response="$runtime/retry.response.json"
curl_config="$runtime/retry.curl.conf"
env_file='/etc/qimao-terms-cloud/local-ocr-frame-extractor-05b.env'
env_tmp='/etc/qimao-terms-cloud/.local-ocr-frame-extractor-05b.env.ai-recovery-1622.tmp'
backend_unit='qimao-backend.service'
asr_unit='qimao-worker@asr.worker.entry.js.service'
screen_unit='qimao-worker@screen-text.worker.entry.js.service'
openvino_unit='qimao-local-ocr-openvino.service'
extractor_rel='backend/dist/sidecars/local-ocr/frame-extractor.js'
old_extractor_path="$old_release/$extractor_rel"
new_extractor_path="$new_release/$extractor_rel"
old_extractor_line="QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN=$old_extractor_path"
new_extractor_line="QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN=$new_extractor_path"
retry_key='ai-recovery-1622-screen-text-retry-v1'

[ "$(find "$inbound" -mindepth 1 -maxdepth 1 | wc -l)" = '3' ] \
  || input_fail 'INBOUND_ENTRY_COUNT_INVALID'
[ "$(find "$inbound" -mindepth 1 -maxdepth 1 -type f | wc -l)" = '3' ] \
  || input_fail 'INBOUND_REGULAR_FILE_COUNT_INVALID'
[ -f "$runner_source" ] && [ ! -L "$runner_source" ] \
  && [ "$(stat -c '%U:%G:%h' "$runner_source")" = 'qimao-deploy:qimao-deploy:1' ] \
  || input_fail 'RUNNER_IDENTITY_INVALID'
for file in "$helper_source" "$checksums_source"; do
  [ -f "$file" ] && [ ! -L "$file" ] \
    && [ "$(stat -c '%U:%G:%h' "$file")" = 'qimao-deploy:qimao-deploy:1' ] \
    || input_fail 'HELPER_IDENTITY_INVALID'
done
chown --no-dereference root:root "$runner_source" "$helper_source" "$checksums_source"
chmod 0500 "$runner_source"
chmod 0400 "$helper_source" "$checksums_source"
[ "$(stat -c '%U:%G:%a:%h' "$runner_source")" = 'root:root:500:1' ] \
  || input_fail 'RUNNER_ROOT_TAKEOVER_FAILED'
for file in "$helper_source" "$checksums_source"; do
  [ "$(stat -c '%U:%G:%a:%h' "$file")" = 'root:root:400:1' ] \
    || input_fail 'HELPER_ROOT_TAKEOVER_FAILED'
done
chmod 0500 "$inbound"
[ "$(stat -c '%U:%G:%a' "$inbound")" = 'root:root:500' ] \
  || input_fail 'INBOUND_READ_ONLY_SEAL_FAILED'
[ "$(wc -l < "$checksums_source")" = '2' ] \
  || input_fail 'SHA_LINE_COUNT_INVALID'
[ "$(awk 'NF==2 && length($1)==64 && $1 !~ /[^0-9a-f]/ {print $2}' "$checksums_source" \
  | paste -sd, -)" = 'runner.sh,recovery.mjs' ] \
  || input_fail 'SHA_CONTENT_INVALID'
(cd "$inbound" && sha256sum --strict -c SHA256SUMS >/dev/null) \
  || input_fail 'SHA_CLOSURE_INVALID'
/bin/bash -n "$runner_source" || input_fail 'RUNNER_SYNTAX_INVALID'
/usr/local/bin/node --check "$helper_source" >/dev/null \
  || input_fail 'HELPER_SYNTAX_INVALID'

failure_code='UNEXPECTED_COMMAND_FAILURE'
created_runtime=0
created_stage=0
created_release=0
switched_env=0
switched_current=0
backend_restarted=0
post_started=0
committed=0
recovery_complete=0

safe_remove_tree() {
  case "$1" in
    "$stage"|"$new_release"|"$runtime") rm -rf --one-file-system -- "$1" ;;
    *) echo 'cleanup_refused=unsafe_path'; return 1 ;;
  esac
}

cleanup_inbound() {
  chmod 0700 "$inbound"
  rm -f -- "$runner_source" "$helper_source" "$checksums_source"
  rmdir -- "$inbound"
}

cleanup_sensitive_runtime() {
  rm -f -- "$curl_config" "$retry_response" "$payload"
  [ ! -e "$curl_config" ] && [ ! -e "$retry_response" ] && [ ! -e "$payload" ]
}

health_wait() {
  local attempt
  for attempt in $(seq 1 30); do
    if [ "$(curl -sS -o /dev/null -w '%{http_code}' \
      "http://127.0.0.1:${PORT:-3001}/health" 2>/dev/null || true)" = '200' ]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

print_unit_state() {
  local label="$1" unit="$2"
  printf '%s=%s/%s/NRestarts:%s\n' "$label" \
    "$(systemctl show "$unit" -p ActiveState --value)" \
    "$(systemctl show "$unit" -p SubState --value)" \
    "$(systemctl show "$unit" -p NRestarts --value)"
}

finish_failure() {
  local rc="${1:-1}"
  local cleanup_failed=0
  trap - ERR EXIT INT TERM
  set +e
  systemctl stop "$screen_unit" >/dev/null 2>&1
  cleanup_sensitive_runtime || cleanup_failed=1
  rm -f -- "$current_next" "$env_tmp"

  if [ "$post_started" -eq 1 ]; then
    cleanup_inbound || cleanup_failed=1
    health_wait || cleanup_failed=1
    echo 'postcommit_residual=r1,r2,current:r2,extractor_env:r2,runtime:retained,state:retained,screen:stopped,inbound:absent,lock:retained'
    if [ "$cleanup_failed" -eq 0 ]; then
      echo "terminal=blocked code=$failure_code commit_state=$([ "$committed" -eq 1 ] && echo proven || echo unknown) rollback=forbidden"
    else
      echo "terminal=blocked code=$failure_code cleanup=failed rollback=forbidden"
    fi
    exit "$rc"
  fi

  if [ "$switched_current" -eq 1 ]; then
    if [ "$(readlink -f "$current" 2>/dev/null)" = "$new_release" ]; then
      ln -s "$old_release" "$current_next" || cleanup_failed=1
      mv -Tf "$current_next" "$current" || cleanup_failed=1
    else
      cleanup_failed=1
    fi
  fi
  if [ "$switched_env" -eq 1 ]; then
    if [ -f "$runtime/extractor-env.backup" ]; then
      cp --archive --reflink=auto -- "$runtime/extractor-env.backup" "$env_tmp" \
        || cleanup_failed=1
      mv -Tf "$env_tmp" "$env_file" || cleanup_failed=1
      cmp -s "$runtime/extractor-env.backup" "$env_file" || cleanup_failed=1
      [ "$(stat -c '%u:%g:%a' "$runtime/extractor-env.backup" 2>/dev/null)" = \
        "$(stat -c '%u:%g:%a' "$env_file" 2>/dev/null)" ] || cleanup_failed=1
    else
      cleanup_failed=1
    fi
  fi
  if [ "$backend_restarted" -eq 1 ] || [ "$switched_current" -eq 1 ] \
    || [ "$switched_env" -eq 1 ]; then
    systemctl restart "$backend_unit" || cleanup_failed=1
    health_wait || cleanup_failed=1
  fi
  if [ "$created_stage" -eq 1 ] && [ -e "$stage" ]; then
    safe_remove_tree "$stage" || cleanup_failed=1
  fi
  if [ "$created_release" -eq 1 ] && [ -e "$new_release" ]; then
    [ "$(readlink -f "$current" 2>/dev/null)" = "$old_release" ] \
      && safe_remove_tree "$new_release" || cleanup_failed=1
  fi
  if [ "$created_runtime" -eq 1 ] && [ -e "$runtime" ]; then
    safe_remove_tree "$runtime" || cleanup_failed=1
  fi
  cleanup_inbound || cleanup_failed=1
  [ "$(readlink -f "$current" 2>/dev/null)" = "$old_release" ] || cleanup_failed=1
  grep -Fqx "$old_extractor_line" "$env_file" || cleanup_failed=1
  [ ! -e "$stage" ] && [ ! -e "$new_release" ] && [ ! -e "$runtime" ] \
    && [ ! -e "$inbound" ] || cleanup_failed=1
  if [ "$cleanup_failed" -eq 0 ]; then
    echo "terminal=blocked code=$failure_code rollback=r1 cleanup=passed post_started=0"
  else
    echo "terminal=blocked code=$failure_code rollback_or_cleanup=failed post_started=0"
  fi
  exit "$rc"
}

trap 'finish_failure $?' ERR
trap 'finish_failure $?' EXIT
trap "failure_code='SIGNAL_INT'; finish_failure 130" INT
trap "failure_code='SIGNAL_TERM'; finish_failure 143" TERM

echo 'runner_started=1 input_identity=passed sha_closure=passed'

failure_code='MODE_FACT_GATE_FAILED'
[ "$(readlink -f "$current")" = "$old_release" ]
[ -d "$old_release" ] && [ ! -L "$old_release" ]
[ -f "$old_extractor_path" ] && [ ! -L "$old_extractor_path" ]
[ "$(stat -c '%U:%G:%a' "$old_extractor_path")" = 'qimao:qimao:644' ]
runuser -u qimao -- test -r "$old_extractor_path"
if runuser -u qimao -- test -x "$old_extractor_path"; then false; fi
grep -Fqx "$old_extractor_line" "$env_file"
[ "$(systemctl is-active "$backend_unit")" = 'active' ]
[ "$(systemctl is-active "$asr_unit")" = 'active' ]
[ "$(systemctl is-active "$screen_unit" 2>/dev/null || true)" = 'inactive' ]
[ "$(systemctl is-active "$openvino_unit")" = 'active' ]
[ -f "$prior_state" ] && [ ! -L "$prior_state" ]
[ ! -e "$new_release" ] && [ ! -e "$stage" ] && [ ! -e "$runtime" ]
[ ! -e "$current_next" ] && [ ! -e "$env_tmp" ]
echo 'mode_fact=r1_regular:qimao:qimao:0644 qimao_read:true qimao_exec:false'

failure_code='RUNTIME_PREPARE_FAILED'
created_runtime=1
install -d -o root -g qimao -m 0750 "$runtime"
install -d -o root -g qimao -m 0750 "$helper_dir"
install -d -o qimao -g qimao -m 0700 "$state_dir"
install -o root -g qimao -m 0550 "$helper_source" "$helper_dir/recovery.mjs"
cp --archive --reflink=auto -- "$env_file" "$runtime/extractor-env.backup"
[ "$(stat -c '%u:%g:%a' "$runtime/extractor-env.backup")" = \
  "$(stat -c '%u:%g:%a' "$env_file")" ]
[ "$(sha256sum "$runtime/extractor-env.backup" | cut -d' ' -f1)" = \
  "$(sha256sum "$env_file" | cut -d' ' -f1)" ]
[ "$(sha256sum "$helper_source" | cut -d' ' -f1)" = \
  "$(sha256sum "$helper_dir/recovery.mjs" | cut -d' ' -f1)" ]

failure_code='R2_COPY_FAILED'
created_stage=1
cp -a --reflink=auto -- "$old_release" "$stage"
[ -d "$stage" ] && [ ! -L "$stage" ]
old_file_list="$runtime/r1.entries"
new_file_list="$runtime/r2.entries"
old_hashes="$runtime/r1.files.sha256"
new_hashes="$runtime/r2.files.sha256"
(cd "$old_release" && find . -printf '%P\t%y\t%m\t%U\t%G\t%l\n' | LC_ALL=C sort) > "$old_file_list"
(cd "$stage" && find . -printf '%P\t%y\t%m\t%U\t%G\t%l\n' | LC_ALL=C sort) > "$new_file_list"
cmp -s "$old_file_list" "$new_file_list"
(cd "$old_release" && find . -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum) > "$old_hashes"
(cd "$stage" && find . -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum) > "$new_hashes"
cmp -s "$old_hashes" "$new_hashes"

failure_code='R2_MODE_FIX_FAILED'
chmod 0750 "$stage/$extractor_rel"
[ "$(stat -c '%U:%G:%a' "$stage/$extractor_rel")" = 'qimao:qimao:750' ]
runuser -u qimao -- test -r "$stage/$extractor_rel"
runuser -u qimao -- test -x "$stage/$extractor_rel"
(cd "$stage" && find . -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum) > "$new_hashes"
cmp -s "$old_hashes" "$new_hashes"
mode_diff_count=0
while IFS= read -r -d '' rel; do
  rel="${rel#./}"
  old_meta="$(stat -c '%F:%U:%G:%a' "$old_release/$rel")"
  new_meta="$(stat -c '%F:%U:%G:%a' "$stage/$rel")"
  if [ "$rel" = "$extractor_rel" ]; then
    [ "$old_meta" = 'regular file:qimao:qimao:644' ]
    [ "$new_meta" = 'regular file:qimao:qimao:750' ]
    mode_diff_count=$((mode_diff_count + 1))
  else
    [ "$old_meta" = "$new_meta" ]
  fi
done < <(cd "$old_release" && find . -mindepth 1 -print0)
[ "$mode_diff_count" = '1' ]
rm -f -- "$old_file_list" "$new_file_list" "$old_hashes" "$new_hashes"

failure_code='R2_INSTALL_FAILED'
created_release=1
mv -- "$stage" "$new_release"
created_stage=0
[ -d "$new_release" ] && [ ! -L "$new_release" ]
[ "$(stat -c '%U:%G:%a' "$new_extractor_path")" = 'qimao:qimao:750' ]
runuser -u qimao -- test -x "$new_extractor_path"
echo 'r2_integrity=passed file_bytes_sha:unchanged metadata_diff_count:1 extractor_mode:0750'

failure_code='DIRECT_EXTRACTOR_PREFLIGHT_FAILED'
runuser -u qimao -- mkdir -m 0700 "$preflight_dir"
runuser -u qimao -- env \
  ACTION='prepare-state' \
  RELEASE_ROOT="$new_release" \
  EXTRACTOR_PATH="$new_extractor_path" \
  RETRY_KEY="$retry_key" \
  PRIOR_STATE_PATH="$prior_state" \
  STATE_PATH="$state_path" \
  PREFLIGHT_DIR="$preflight_dir" \
  /usr/local/bin/node "$helper_dir/recovery.mjs"
rm -rf --one-file-system -- "$preflight_dir"
[ ! -e "$preflight_dir" ]

failure_code='EXTRACTOR_ENV_SWITCH_FAILED'
cp --archive --reflink=auto -- "$env_file" "$env_tmp"
awk -v replacement="$new_extractor_line" '
  BEGIN { count=0 }
  /^QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN=/ { print replacement; count += 1; next }
  { print }
  END { if (count != 1) exit 42 }
' "$env_file" > "$env_tmp"
[ "$(stat -c '%u:%g:%a' "$env_tmp")" = \
  "$(stat -c '%u:%g:%a' "$runtime/extractor-env.backup")" ]
switched_env=1
mv -Tf "$env_tmp" "$env_file"
grep -Fqx "$new_extractor_line" "$env_file"
[ "$(stat -c '%u:%g:%a' "$env_file")" = \
  "$(stat -c '%u:%g:%a' "$runtime/extractor-env.backup")" ]

failure_code='CURRENT_SWITCH_FAILED'
ln -s "$new_release" "$current_next"
switched_current=1
mv -Tf "$current_next" "$current"
[ "$(readlink -f "$current")" = "$new_release" ]

failure_code='BACKEND_HEALTH_FAILED'
backend_restarted=1
systemctl restart "$backend_unit"
health_wait
[ "$(systemctl is-active "$asr_unit")" = 'active' ]
[ "$(systemctl is-active "$openvino_unit")" = 'active' ]
[ "$(systemctl is-active "$screen_unit" 2>/dev/null || true)" = 'inactive' ]
echo 'live_prepost=current:r2 backend_health:200 asr:active openvino:active screen:inactive'

failure_code='PRE_SUBMIT_IDENTITY_FAILED'
runuser -u qimao -- env \
  ACTION='pre-submit' \
  RELEASE_ROOT="$new_release" \
  STATE_PATH="$state_path" \
  PAYLOAD_PATH="$payload" \
  /usr/local/bin/node "$helper_dir/recovery.mjs"
project_id="$(runuser -u qimao -- env \
  ACTION='project-id' STATE_PATH="$state_path" \
  /usr/local/bin/node "$helper_dir/recovery.mjs")"

failure_code='RETRY_SESSION_FAILED'
session_token="$(runuser -u qimao -- env \
  ACTION='session' RELEASE_ROOT="$new_release" \
  /usr/local/bin/node "$helper_dir/recovery.mjs")"
batch_id="$(/usr/local/bin/node -e \
  "const s=JSON.parse(require('fs').readFileSync(process.argv[1]));process.stdout.write(s.batchId)" \
  "$state_path")"
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

failure_code='SCREEN_TEXT_RETRY_UNCERTAIN'
post_started=1
set +e
retry_status="$(curl --silent --show-error --config "$curl_config" \
  --output "$retry_response" --write-out '%{http_code}')"
curl_rc=$?
rm -f -- "$curl_config"
commit_state="$(runuser -u qimao -- env \
  ACTION='commit-state' RELEASE_ROOT="$new_release" STATE_PATH="$state_path" \
  /usr/local/bin/node "$helper_dir/recovery.mjs" 2>/dev/null)"
commit_state_rc=$?
set -e
[ "$commit_state_rc" -eq 0 ] || commit_state='unknown'
if [ "$commit_state" = 'committed' ]; then
  committed=1
  echo "retry_commit=proven command_unique:1 curl_exit:$curl_rc http_status:${retry_status:-none}"
else
  failure_code='SCREEN_TEXT_RETRY_COMMIT_UNKNOWN'
  false
fi

failure_code='BATCH_PROJECTION_OR_ROUTE_FAILED'
runuser -u qimao -- env \
  ACTION='projection' RELEASE_ROOT="$new_release" STATE_PATH="$state_path" \
  /usr/local/bin/node "$helper_dir/recovery.mjs"

failure_code='SCREEN_WORKER_START_FAILED'
systemctl start "$screen_unit"
for attempt in $(seq 1 15); do
  [ "$(systemctl is-active "$screen_unit" 2>/dev/null || true)" = 'active' ] && break
  sleep 1
done
[ "$(systemctl is-active "$screen_unit")" = 'active' ]
[ "$(systemctl is-active "$openvino_unit")" = 'active' ]
echo 'worker_gate=screen:active openvino:active'

failure_code='WORKER_PROGRESS_FAILED'
monitor_output="$(runuser -u qimao -- env \
  ACTION='monitor' RELEASE_ROOT="$new_release" STATE_PATH="$state_path" \
  /usr/local/bin/node "$helper_dir/recovery.mjs")"
printf '%s\n' "$monitor_output"

failure_code='FINAL_PROJECTION_FAILED'
final_output="$(runuser -u qimao -- env \
  ACTION='final' RELEASE_ROOT="$new_release" STATE_PATH="$state_path" \
  /usr/local/bin/node "$helper_dir/recovery.mjs")"
printf '%s\n' "$final_output"
if printf '%s\n' "$final_output" | grep -Fqx 'recovery_final=complete'; then
  recovery_complete=1
elif printf '%s\n' "$final_output" \
  | grep -Fqx 'recovery_final=continuation_required'; then
  recovery_complete=0
else
  false
fi

failure_code='FINAL_HEALTH_FAILED'
[ "$(readlink -f "$current")" = "$new_release" ]
grep -Fqx "$new_extractor_line" "$env_file"
[ "$(stat -c '%U:%G:%a' "$new_extractor_path")" = 'qimao:qimao:750' ]
runuser -u qimao -- test -x "$new_extractor_path"
health_wait
for unit in "$backend_unit" "$asr_unit" "$screen_unit" "$openvino_unit"; do
  [ "$(systemctl show "$unit" -p ActiveState --value)" = 'active' ]
  [ "$(systemctl show "$unit" -p SubState --value)" = 'running' ]
  [ "$(systemctl show "$unit" -p NRestarts --value)" = '0' ]
done
print_unit_state backend "$backend_unit"
print_unit_state asr "$asr_unit"
print_unit_state screen "$screen_unit"
print_unit_state openvino "$openvino_unit"

failure_code='FINAL_RESIDUAL_FAILED'
cleanup_sensitive_runtime
cleanup_inbound
[ ! -e "$stage" ] && [ ! -e "$current_next" ] && [ ! -e "$env_tmp" ]
[ ! -e "$inbound" ] && [ -d "$old_release" ] && [ -d "$new_release" ]
[ -d "$runtime" ] && [ -f "$state_path" ] && [ -f "$helper_dir/recovery.mjs" ]
trap - ERR EXIT INT TERM
echo 'postcommit_residual=r1,r2,current:r2,extractor_env:r2,runtime:retained,state:retained,helper:retained,screen:active,inbound:absent,stage:absent,temp:absent,secrets:absent,lock:retained'
if [ "$recovery_complete" -eq 1 ]; then
  echo 'terminal=passed recovery:51/51 commit_state=proven current:r2 health:200 backend:active asr:active screen:active openvino:active tencent:0 unknown:0 new_failed:0 new_old_media:0'
else
  echo 'terminal=mode_fix_validated continuation_required=1 commit_state=proven current:r2 health:200 backend:active asr:active screen:active openvino:active tencent:0 unknown:0 new_failed:0 new_old_media:0'
fi
