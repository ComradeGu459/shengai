#!/bin/bash
set -Eeuo pipefail
umask 077

input_fail() {
  echo "input_gate=failed code=$1"
  exit 64
}

transfer="${1-}"
[ "$EUID" -eq 0 ] || input_fail 'ROOT_REQUIRED'
[ "$transfer" = '/run/qimao-ai-recovery-1616-loader/transfer' ] \
  || input_fail 'TRANSFER_PATH_INVALID'
[ -d "$transfer" ] && [ ! -L "$transfer" ] \
  || input_fail 'TRANSFER_DIRECTORY_INVALID'
[ "$(stat -c '%U:%G:%a' "$transfer")" = 'root:root:700' ] \
  || input_fail 'TRANSFER_DIRECTORY_IDENTITY_INVALID'

archive="$transfer/ai-recovery-1607-r1.tar.gz"
manifest="$transfer/ai-recovery-1607-r1.manifest.json"
audit="$transfer/ai-recovery-1607-r1.sha256.audit"
runner_source="$transfer/runner.sh"
preflight_source="$transfer/preflight.mjs"
retry_source="$transfer/retry.mjs"
checksums_source="$transfer/SHA256SUMS"
old_release='/opt/qimao-terms-cloud/releases/ai-hotfix-1552'
new_release='/opt/qimao-terms-cloud/releases/ai-recovery-1607-r1'
stage='/opt/qimao-terms-cloud/releases/.ai-recovery-1607-r1-stage-1614'
runtime='/run/qimao-ai-recovery-1614'
helper_dir="$runtime/helpers"
state_dir="$runtime/state"
current='/opt/qimao-terms-cloud/current'
current_next='/opt/qimao-terms-cloud/current.ai-recovery-1614.next'
env_file='/etc/qimao-terms-cloud/local-ocr-frame-extractor-05b.env'
env_tmp='/etc/qimao-terms-cloud/.local-ocr-frame-extractor-05b.env.ai-recovery-1614.tmp'
backend_unit='qimao-backend.service'
asr_unit='qimao-worker@asr.worker.entry.js.service'
screen_unit='qimao-worker@screen-text.worker.entry.js.service'
openvino_unit='qimao-local-ocr-openvino.service'
batch_id='c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25'
retry_key='ai-recovery-1607-screen-text-retry'
old_extractor='QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN=/opt/qimao/local-ocr/20260827-local-ocr-05b-r1/frame-extractor.js'
new_extractor="QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN=$new_release/backend/dist/sidecars/local-ocr/frame-extractor.js"

[ "$(find "$transfer" -mindepth 1 -maxdepth 1 | wc -l)" = '7' ] \
  || input_fail 'TRANSFER_ENTRY_COUNT_INVALID'
[ "$(find "$transfer" -mindepth 1 -maxdepth 1 -type f | wc -l)" = '7' ] \
  || input_fail 'TRANSFER_REGULAR_FILE_COUNT_INVALID'
for file in "$archive" "$manifest" "$audit" "$preflight_source" \
  "$retry_source" "$checksums_source"; do
  [ -f "$file" ] && [ ! -L "$file" ] \
    || input_fail 'SIX_FILE_IDENTITY_INVALID'
  [ "$(stat -c '%U:%G:%a' "$file")" = 'root:root:600' ] \
    || input_fail 'SIX_FILE_OWNER_MODE_INVALID'
done
[ -f "$runner_source" ] && [ ! -L "$runner_source" ] \
  || input_fail 'RUNNER_IDENTITY_INVALID'
[ "$(stat -c '%U:%G:%a' "$runner_source")" = 'root:root:700' ] \
  || input_fail 'RUNNER_OWNER_MODE_INVALID'

[ "$(stat -c '%s' "$archive")" = '10270355' ] \
  || input_fail 'ARCHIVE_SIZE_INVALID'
[ "$(stat -c '%s' "$manifest")" = '2130' ] \
  || input_fail 'MANIFEST_SIZE_INVALID'
[ "$(stat -c '%s' "$audit")" = '1164' ] \
  || input_fail 'AUDIT_SIZE_INVALID'
[ "$(sha256sum "$archive" | cut -d' ' -f1)" = \
  'b2f5bbc158eb0ce51e4238556043182d34b80fa7b15d023e91401e3547bf0c9b' ] \
  || input_fail 'ARCHIVE_SHA_INVALID'
[ "$(sha256sum "$manifest" | cut -d' ' -f1)" = \
  'fde9291ef0de981c6e65e0ef0e020c572119ca6e04225950e6cce50488337e38' ] \
  || input_fail 'MANIFEST_SHA_INVALID'
[ "$(sha256sum "$audit" | cut -d' ' -f1)" = \
  '8517f6f442b29ab8ea994c807d0e1888e9f6f2216df75ee2a7d7a1f0f87e98fc' ] \
  || input_fail 'AUDIT_SHA_INVALID'
[ "$(wc -l < "$checksums_source")" = '3' ] \
  || input_fail 'HELPER_SHA_LINE_COUNT_INVALID'
[ "$(awk 'NF==2 && length($1)==64 && $1 !~ /[^0-9a-f]/ {print $2}' "$checksums_source" \
  | paste -sd, -)" = 'runner.sh,preflight.mjs,retry.mjs' ] \
  || input_fail 'HELPER_SHA_CONTENT_INVALID'
(cd "$transfer" && sha256sum --strict -c SHA256SUMS >/dev/null) \
  || input_fail 'HELPER_SHA_CHECK_FAILED'

[ "$(readlink -f "$current")" = "$old_release" ] \
  || input_fail 'CURRENT_BASELINE_INVALID'
[ -d "$old_release" ] || input_fail 'ROLLBACK_RELEASE_MISSING'
[ ! -e "$new_release" ] && [ ! -e "$stage" ] && [ ! -e "$runtime" ] \
  || input_fail 'RUN_RESOURCE_ALREADY_EXISTS'
[ ! -e "$current_next" ] && [ ! -e "$env_tmp" ] \
  || input_fail 'ATOMIC_TEMP_ALREADY_EXISTS'
grep -Fqx "$old_extractor" "$env_file" \
  || input_fail 'EXTRACTOR_BASELINE_INVALID'
[ "$(systemctl is-active "$backend_unit")" = 'active' ] \
  || input_fail 'BACKEND_BASELINE_INVALID'
[ "$(systemctl is-active "$asr_unit")" = 'active' ] \
  || input_fail 'ASR_BASELINE_INVALID'
[ "$(systemctl is-active "$screen_unit" 2>/dev/null || true)" = 'inactive' ] \
  || input_fail 'SCREEN_BASELINE_INVALID'
[ "$(systemctl is-active "$openvino_unit")" = 'active' ] \
  || input_fail 'OPENVINO_BASELINE_INVALID'

failure_code='UNEXPECTED_COMMAND_FAILURE'
created_runtime=0
created_stage=0
created_release=0
switched_env=0
switched_current=0
committed=0
post_started=0
external_commit_possible=0
preflight_dir=''
curl_config="$runtime/retry.curl.conf"
retry_response="$runtime/retry.response.json"
payload="$state_dir/retry-payload.json"
state_path="$state_dir/preflight-state.json"

safe_remove_tree() {
  case "$1" in
    "$stage"|"$new_release"|"$runtime"|"$state_dir"/preflight.*|/tmp/qimao-ai-recovery-1614-preflight.*) ;;
    *) echo 'cleanup_refused=unsafe_path'; return 1 ;;
  esac
  if [ -e "$1" ]; then rm -rf -- "$1"; fi
  [ ! -e "$1" ]
}

cleanup_transfer() {
  if [ ! -e "$transfer" ]; then return 0; fi
  rm -f -- "$archive" "$manifest" "$audit" "$runner_source" \
    "$preflight_source" "$retry_source" "$checksums_source"
  [ "$(find "$transfer" -mindepth 1 -maxdepth 1 | wc -l)" = '0' ] || return 1
  rmdir -- "$transfer"
  [ ! -e "$transfer" ]
}

health_wait() {
  local port_value="${PORT:-3001}"
  local attempt
  for attempt in $(seq 1 30); do
    if [ "$(curl -sS -o /dev/null -w '%{http_code}' \
      "http://127.0.0.1:${port_value}/health" 2>/dev/null || true)" = '200' ]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

rollback() {
  trap - ERR EXIT INT TERM
  local rc="$1"
  local cleanup_failed=0
  local commit_resolution='none'
  set +e
  rm -f -- "$curl_config"
  [ ! -e "$curl_config" ] || cleanup_failed=1
  systemctl stop "$screen_unit" || cleanup_failed=1
  [ "$(systemctl is-active "$screen_unit" 2>/dev/null || true)" = 'inactive' ] \
    || cleanup_failed=1
  rm -f -- "$current_next" "$env_tmp"
  [ ! -e "$current_next" ] && [ ! -e "$env_tmp" ] || cleanup_failed=1

  if [ "$post_started" -eq 1 ] && [ "$committed" -eq 0 ]; then
    external_commit_possible=1
  fi

  if [ "$committed" -eq 0 ] \
    && { [ "$switched_current" -eq 1 ] || [ "$switched_env" -eq 1 ]; } \
    && [ -f "$state_path" ] && [ -f "$helper_dir/retry.mjs" ]; then
    observed_commit_state="$(runuser -u qimao -- env \
      ACTION='commit-state' \
      RELEASE_ROOT="$new_release" \
      STATE_PATH="$state_path" \
      /usr/local/bin/node "$helper_dir/retry.mjs" 2>/dev/null)"
    observed_commit_rc=$?
    if [ "$observed_commit_rc" -eq 0 ] \
      && [ "$observed_commit_state" = 'committed' ]; then
      committed=1
      external_commit_possible=0
    elif [ "$observed_commit_rc" -ne 0 ] \
      || [ "$observed_commit_state" != 'not_committed' ]; then
      external_commit_possible=1
    fi
  fi

  if [ "$committed" -eq 1 ] || [ "$external_commit_possible" -eq 1 ]; then
    if [ "$committed" -eq 1 ]; then
      commit_resolution='proven'
    else
      commit_resolution='possible'
    fi
    rm -f -- "$payload" "$retry_response"
    [ ! -e "$payload" ] && [ ! -e "$retry_response" ] || cleanup_failed=1
    cleanup_transfer || cleanup_failed=1
    [ "$(readlink -f "$current" 2>/dev/null)" = "$new_release" ] \
      || cleanup_failed=1
    grep -Fqx "$new_extractor" "$env_file" || cleanup_failed=1
    [ -d "$new_release" ] || cleanup_failed=1
    health_wait || cleanup_failed=1
    [ "$(systemctl is-active "$asr_unit" 2>/dev/null || true)" = 'active' ] \
      || cleanup_failed=1
    [ "$(systemctl is-active "$openvino_unit" 2>/dev/null || true)" = 'active' ] \
      || cleanup_failed=1
    if [ "$cleanup_failed" -eq 0 ]; then
      echo 'cleanup_verification=passed mode=post_commit runtime=retained'
    else
      echo 'cleanup_verification=failed mode=post_commit runtime=retained'
    fi
    echo "terminal=failed code=$failure_code commit_state=$commit_resolution rollback=forbidden"
    exit "$rc"
  fi

  if [ "$switched_current" -eq 1 ]; then
    if [ "$(readlink -f "$current" 2>/dev/null)" = "$new_release" ]; then
      ln -s "$old_release" "$current_next" || cleanup_failed=1
      mv -Tf "$current_next" "$current" || cleanup_failed=1
    else
      cleanup_failed=1
    fi
    [ "$(readlink -f "$current" 2>/dev/null)" = "$old_release" ] \
      || cleanup_failed=1
  fi
  if [ "$switched_env" -eq 1 ]; then
    if [ -f "$runtime/extractor-env.backup" ]; then
      cp -p "$runtime/extractor-env.backup" "$env_tmp" || cleanup_failed=1
      mv -Tf "$env_tmp" "$env_file" || cleanup_failed=1
      cmp -s "$runtime/extractor-env.backup" "$env_file" || cleanup_failed=1
    else
      cleanup_failed=1
    fi
  fi
  if [ "$switched_current" -eq 1 ] || [ "$switched_env" -eq 1 ]; then
    systemctl restart "$backend_unit" || cleanup_failed=1
    health_wait || cleanup_failed=1
  fi
  if [ "$created_release" -eq 1 ]; then
    if [ "$(readlink -f "$current" 2>/dev/null)" = "$old_release" ]; then
      safe_remove_tree "$new_release" || cleanup_failed=1
    else
      cleanup_failed=1
    fi
  fi
  if [ "$created_stage" -eq 1 ]; then
    safe_remove_tree "$stage" || cleanup_failed=1
  fi
  if [ -n "$preflight_dir" ]; then
    safe_remove_tree "$preflight_dir" || cleanup_failed=1
  fi
  cleanup_transfer || cleanup_failed=1
  if [ "$created_runtime" -eq 1 ]; then
    safe_remove_tree "$runtime" || cleanup_failed=1
  fi
  [ "$(readlink -f "$current" 2>/dev/null)" = "$old_release" ] \
    || cleanup_failed=1
  grep -Fqx "$old_extractor" "$env_file" || cleanup_failed=1
  [ ! -e "$stage" ] && [ ! -e "$new_release" ] \
    && [ ! -e "$runtime" ] && [ ! -e "$transfer" ] || cleanup_failed=1
  if [ "$cleanup_failed" -eq 0 ]; then
    echo 'cleanup_verification=passed mode=pre_commit'
  else
    echo 'cleanup_verification=failed mode=pre_commit'
  fi
  echo "terminal=failed code=$failure_code committed=0 rollback=1552"
  exit "$rc"
}

trap 'rollback $?' ERR
trap 'rollback $?' EXIT
trap "failure_code='SIGNAL_INT'; rollback 130" INT
trap "failure_code='SIGNAL_TERM'; rollback 143" TERM
echo 'runner_started=1 input_identity=passed six_files=passed'

failure_code='RUNTIME_PREPARE_FAILED'
created_runtime=1
install -d -o root -g qimao -m 0750 "$runtime"
install -d -o root -g qimao -m 0750 "$helper_dir"
install -d -o qimao -g qimao -m 0700 "$state_dir"
install -o root -g root -m 0600 "$env_file" "$runtime/extractor-env.backup"
install -o root -g qimao -m 0550 "$preflight_source" "$helper_dir/preflight.mjs"
install -o root -g qimao -m 0550 "$retry_source" "$helper_dir/retry.mjs"
[ "$(stat -c '%U:%G:%a' "$helper_dir/preflight.mjs")" = 'root:qimao:550' ]
[ "$(stat -c '%U:%G:%a' "$helper_dir/retry.mjs")" = 'root:qimao:550' ]
[ "$(sha256sum "$preflight_source" | cut -d' ' -f1)" = \
  "$(sha256sum "$helper_dir/preflight.mjs" | cut -d' ' -f1)" ]
[ "$(sha256sum "$retry_source" | cut -d' ' -f1)" = \
  "$(sha256sum "$helper_dir/retry.mjs" | cut -d' ' -f1)" ]

failure_code='ARCHIVE_EXTRACT_FAILED'
created_stage=1
install -d -o qimao -g qimao -m 0750 "$stage"
tar -xzf "$archive" -C "$stage" --no-same-owner
chown -R qimao:qimao "$stage"
/usr/local/bin/node --check "$stage/backend/dist/sidecars/local-ocr/frame-extractor.js" >/dev/null
/usr/local/bin/node --check \
  "$stage/backend/dist/modules/screen-text/screen-text.write.repository.js" >/dev/null
/usr/local/bin/node --check "$helper_dir/preflight.mjs" >/dev/null
/usr/local/bin/node --check "$helper_dir/retry.mjs" >/dev/null
preflight_dir="$(runuser -u qimao -- \
  mktemp -d "$state_dir/preflight.XXXXXX")"

failure_code='SECRET_ENV_LOAD_FAILED'
required_inherited_env=(
  DATABASE_URL
  QIMAO_EMPLOYEE_SESSION_REQUIRED
  QIMAO_EMPLOYEE_AUTH_USERNAME
  QIMAO_EMPLOYEE_PASSWORD_VERIFIER
  QIMAO_EMPLOYEE_SESSION_SECRET
  QIMAO_EMPLOYEE_ORIGIN
  QIMAO_S3_PROVIDER
  QIMAO_S3_REGION
  QIMAO_S3_BUCKET
  QIMAO_S3_ACCESS_KEY_ID
  QIMAO_S3_SECRET_ACCESS_KEY
  QIMAO_S3_PRESIGN_TTL_SECONDS
  QIMAO_S3_UPLOAD_MODE
  QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST
  QIMAO_LOCAL_OCR_OPENVINO_ENABLED
  QIMAO_LOCAL_OCR_OPENVINO_ENDPOINT
  QIMAO_LOCAL_OCR_OPENVINO_TIMEOUT_MS
  QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN
  QIMAO_SCREEN_TEXT_FFPROBE_BIN
  QIMAO_SCREEN_TEXT_FFMPEG_BIN
)
for inherited_name in "${required_inherited_env[@]}"; do
  if [[ ! -v "$inherited_name" ]] || [ -z "${!inherited_name}" ]; then
    echo "inherited_env=invalid name=$inherited_name"
    false
  fi
done
if [[ "$QIMAO_EMPLOYEE_PASSWORD_VERIFIER" != *'$N='* ]] \
  || [[ "$QIMAO_EMPLOYEE_PASSWORD_VERIFIER" != *'$r='* ]] \
  || [[ "$QIMAO_EMPLOYEE_PASSWORD_VERIFIER" != *'$p='* ]]; then
  echo 'inherited_env=invalid name=QIMAO_EMPLOYEE_PASSWORD_VERIFIER_LITERAL_MARKERS'
  false
fi
export QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN=\
"$stage/backend/dist/sidecars/local-ocr/frame-extractor.js"
echo 'inherited_env=validated source=systemd_environment_files literal_dollar_markers=preserved'

failure_code='CANDIDATE_PREFLIGHT_FAILED'
runuser -u qimao -- env \
  STAGE_ROOT="$stage" \
  BATCH_ID="$batch_id" \
  RETRY_KEY="$retry_key" \
  PREFLIGHT_DIR="$preflight_dir" \
  STATE_PATH="$state_path" \
  /usr/local/bin/node "$helper_dir/preflight.mjs"
safe_remove_tree "$preflight_dir"
preflight_dir=''

failure_code='RELEASE_INSTALL_FAILED'
created_release=1
mv "$stage" "$new_release"
created_stage=0

failure_code='EXTRACTOR_ENV_SWITCH_FAILED'
awk -v replacement="$new_extractor" '
  BEGIN { count=0 }
  /^QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN=/ { print replacement; count += 1; next }
  { print }
  END { if (count != 1) exit 42 }
' "$env_file" > "$env_tmp"
chown --reference="$env_file" "$env_tmp"
chmod --reference="$env_file" "$env_tmp"
switched_env=1
mv -Tf "$env_tmp" "$env_file"
grep -Fqx "$new_extractor" "$env_file"

failure_code='CURRENT_SWITCH_FAILED'
ln -s "$new_release" "$current_next"
switched_current=1
mv -Tf "$current_next" "$current"
[ "$(readlink -f "$current")" = "$new_release" ]

failure_code='BACKEND_HEALTH_FAILED'
systemctl restart "$backend_unit"
health_wait
[ "$(systemctl is-active "$asr_unit")" = 'active' ]
[ "$(systemctl is-active "$openvino_unit")" = 'active' ]
echo 'live_markers=current:ai-recovery-1607-r1 backend_health:200 asr:active openvino:active'

failure_code='PRE_SUBMIT_IDENTITY_FAILED'
runuser -u qimao -- env \
  ACTION='pre-submit' \
  RELEASE_ROOT="$new_release" \
  STATE_PATH="$state_path" \
  PAYLOAD_PATH="$payload" \
  /usr/local/bin/node "$helper_dir/retry.mjs"
project_id="$(runuser -u qimao -- env \
  ACTION='project-id' \
  STATE_PATH="$state_path" \
  /usr/local/bin/node "$helper_dir/retry.mjs")"

failure_code='RETRY_SESSION_FAILED'
session_token="$(runuser -u qimao -- env \
  ACTION='session' \
  RELEASE_ROOT="$new_release" \
  /usr/local/bin/node "$helper_dir/retry.mjs")"
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
unset session_token
chmod 0600 "$curl_config"

failure_code='SCREEN_TEXT_RETRY_UNCERTAIN'
set +e
external_commit_possible=1
post_started=1
retry_status="$(curl --silent --show-error --config "$curl_config" \
  --output "$retry_response" --write-out '%{http_code}')"
curl_rc=$?
rm -f -- "$curl_config"
if [ -e "$curl_config" ]; then curl_rc=125; fi
commit_state="$(runuser -u qimao -- env \
  ACTION='commit-state' \
  RELEASE_ROOT="$new_release" \
  STATE_PATH="$state_path" \
  /usr/local/bin/node "$helper_dir/retry.mjs" 2>/dev/null)"
commit_state_rc=$?
set -e
if [ "$commit_state_rc" -ne 0 ]; then commit_state='unknown'; fi
case "$commit_state" in
  committed)
    committed=1
    external_commit_possible=0
    echo "retry_commit=proven curl_exit=$curl_rc http_status=${retry_status:-none}"
    ;;
  not_committed)
    failure_code='SCREEN_TEXT_RETRY_COMMIT_POSSIBLE_NOT_VISIBLE'
    false
    ;;
  *)
    failure_code='SCREEN_TEXT_RETRY_COMMIT_POSSIBLE_UNKNOWN'
    false
    ;;
esac

failure_code='BATCH_PROJECTION_OR_ROUTE_FAILED'
runuser -u qimao -- env \
  ACTION='projection' \
  RELEASE_ROOT="$new_release" \
  STATE_PATH="$state_path" \
  /usr/local/bin/node "$helper_dir/retry.mjs"

failure_code='SCREEN_WORKER_FIRST_GATE_FAILED'
systemctl start "$screen_unit"
for attempt in $(seq 1 15); do
  if [ "$(systemctl is-active "$screen_unit" 2>/dev/null || true)" = 'active' ]; then
    break
  fi
  sleep 1
done
[ "$(systemctl is-active "$screen_unit")" = 'active' ]
[ "$(systemctl is-active "$openvino_unit")" = 'active' ]
echo 'worker_first_gate=screen:active openvino:active'

failure_code='WORKER_PROGRESS_FAILED'
runuser -u qimao -- env \
  ACTION='monitor' \
  RELEASE_ROOT="$new_release" \
  STATE_PATH="$state_path" \
  /usr/local/bin/node "$helper_dir/retry.mjs"

failure_code='FINAL_HEALTH_FAILED'
[ "$(readlink -f "$current")" = "$new_release" ]
grep -Fqx "$new_extractor" "$env_file"
health_wait
for unit in "$backend_unit" "$asr_unit" "$screen_unit" "$openvino_unit"; do
  [ "$(systemctl show "$unit" -p ActiveState --value)" = 'active' ]
  [ "$(systemctl show "$unit" -p SubState --value)" = 'running' ]
  [ "$(systemctl show "$unit" -p NRestarts --value)" = '0' ]
done

failure_code='FINAL_CLEANUP_FAILED'
rm -f -- "$payload" "$retry_response"
[ ! -e "$payload" ] && [ ! -e "$retry_response" ]
cleanup_transfer
safe_remove_tree "$runtime"
[ ! -e "$transfer" ] && [ ! -e "$runtime" ]
trap - ERR EXIT INT TERM
echo 'cleanup_verification=passed mode=committed_success'
echo 'terminal=passed commit_state=proven current=ai-recovery-1607-r1 health=200 backend=active asr=active screen=active openvino=active tencent=0 unknown=0 residual=0'
