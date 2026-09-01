#!/bin/bash
set -Eeuo pipefail
umask 077

input_fail() {
  echo "terminal=blocked code=$1"
  exit 64
}

inbound="${1-}"
[ "$EUID" -eq 0 ] || input_fail 'ROOT_REQUIRED'
[ "$inbound" = '/var/tmp/qimao-ocr-sidecar-contract-1694-inbound' ] ||
  input_fail 'INBOUND_PATH_INVALID'

archive_name='ocr-sidecar-contract-20260901-r1.tar.gz'
archive_source="$inbound/$archive_name"
runner_source="$inbound/runner.sh"
checksums_source="$inbound/SHA256SUMS"
[ -d "$inbound" ] && [ ! -L "$inbound" ] || input_fail 'INBOUND_DIRECTORY_INVALID'
[ "$(find "$inbound" -mindepth 1 -maxdepth 1 -type f | wc -l)" = '3' ] ||
  input_fail 'INBOUND_FILE_COUNT_INVALID'
[ "$(find "$inbound" -mindepth 1 -maxdepth 1 ! -type f | wc -l)" = '0' ] ||
  input_fail 'INBOUND_NONFILE_INVALID'
for file in "$archive_source" "$runner_source" "$checksums_source"; do
  [ -f "$file" ] && [ ! -L "$file" ] || input_fail 'INBOUND_FILE_INVALID'
  [ "$(stat -c '%U:%G:%h' "$file")" = 'qimao-deploy:qimao-deploy:1' ] ||
    input_fail 'INBOUND_FILE_IDENTITY_INVALID'
done

lock_file='/run/lock/qimao-ocr-sidecar-contract-1694.lock'
exec 9>"$lock_file"
flock -n 9 || input_fail 'LOCK_ALREADY_HELD'

old_current='/opt/qimao-terms-cloud/releases/ocr-media-error-20260831-r1'
current='/opt/qimao-terms-cloud/current'
old_runtime='/opt/qimao/local-ocr/20260831-local-ocr-geometry-r3'
new_runtime='/opt/qimao/local-ocr/20260901-local-ocr-contract-r1'
runtime_stage='/opt/qimao/local-ocr/.20260901-local-ocr-contract-r1-stage-1694'
old_entry="$old_runtime/node/entry.js"
old_sidecar="$old_runtime/node/sidecar.js"
new_entry="$new_runtime/node/entry.js"
new_sidecar="$new_runtime/node/sidecar.js"
runtime_stage_entry="$runtime_stage/node/entry.js"
runtime_stage_sidecar="$runtime_stage/node/sidecar.js"
old_model_dir="$old_runtime/models/work/openvino"
old_python="$old_runtime/venv/bin/python"
old_runner="$old_runtime/node/paddle_hpi_runner.py"
new_model_dir="$new_runtime/models/work/openvino"
new_python="$new_runtime/venv/bin/python"

run_runtime='/run/qimao-ocr-sidecar-contract-1694'
unpack="$run_runtime/unpack"
archive_list="$run_runtime/archive.list"
env_file='/etc/qimao-terms-cloud/local-ocr-04g-openvino.env'
env_backup="$run_runtime/openvino-env.backup"
env_tmp='/etc/qimao-terms-cloud/.local-ocr-04g-openvino.env.contract-1694.tmp'
env_restore_tmp='/etc/qimao-terms-cloud/.local-ocr-04g-openvino.env.contract-1694.restore.tmp'
unit='qimao-local-ocr-openvino.service'
screen_unit='qimao-worker@screen-text.worker.entry.js.service'
asr_unit='qimao-worker@asr.worker.entry.js.service'
backend_unit='qimao-backend.service'
dropin_dir='/etc/systemd/system/qimao-local-ocr-openvino.service.d'
old_dropin="$dropin_dir/geometry-1628-r3.conf"
new_dropin="$dropin_dir/zz-contract-1694-r1.conf"
new_dropin_tmp="$dropin_dir/.zz-contract-1694-r1.conf.tmp"
dropin_source="$run_runtime/zz-contract-1694-r1.conf"

failure_code='UNEXPECTED_FAILURE'
runtime_stage_created=0
runtime_created=0
env_switched=0
dropin_installed=0
sidecar_restart_attempted=0
created_dropin_dir=0

safe_remove() {
  case "$1" in
    "$run_runtime"|"$runtime_stage"|"$new_runtime")
      rm -rf --one-file-system -- "$1" ;;
    *)
      echo 'cleanup_refused=unsafe_path'
      return 1 ;;
  esac
}

cleanup_inbound() {
  [ -d "$inbound" ] || return 0
  chmod 0700 "$inbound"
  rm -f -- "$archive_source" "$runner_source" "$checksums_source"
  rmdir -- "$inbound"
}

service_state() {
  local target="$1"
  printf '%s/%s/%s/%s' \
    "$(systemctl show "$target" -p ActiveState --value)" \
    "$(systemctl show "$target" -p SubState --value)" \
    "$(systemctl show "$target" -p NRestarts --value)" \
    "$(systemctl show "$target" -p ExecMainStatus --value)"
}

sidecar_ready() {
  local attempt status content_type
  for attempt in $(seq 1 45); do
    status="$(curl --silent --show-error --max-time 5 \
      -o "$run_runtime/readiness.body" \
      -D "$run_runtime/readiness.headers" \
      -w '%{http_code}' http://127.0.0.1:3100/ocr 2>/dev/null || true)"
    content_type="$(sed -n 's/^[Cc]ontent-[Tt]ype:[[:space:]]*//p' \
      "$run_runtime/readiness.headers" 2>/dev/null | tail -n 1 | tr -d '\r')"
    if [ "$status" = '405' ] && [[ "$content_type" == application/json* ]]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

restore_baseline() {
  local cleanup_failed=0
  set +e
  rm -f -- "$new_dropin_tmp" "$env_restore_tmp"
  if [ "$dropin_installed" -eq 1 ]; then
    rm -f -- "$new_dropin" || cleanup_failed=1
  fi
  if [ "$created_dropin_dir" -eq 1 ] && [ -d "$dropin_dir" ]; then
    rmdir -- "$dropin_dir" || cleanup_failed=1
  fi
  if [ "$env_switched" -eq 1 ]; then
    cp --archive --reflink=auto -- "$env_backup" "$env_restore_tmp" || cleanup_failed=1
    mv -Tf "$env_restore_tmp" "$env_file" || cleanup_failed=1
    cmp -s "$env_backup" "$env_file" || cleanup_failed=1
  fi
  if [ "$env_switched" -eq 1 ] || [ "$dropin_installed" -eq 1 ] ||
    [ "$sidecar_restart_attempted" -eq 1 ]; then
    systemctl daemon-reload || cleanup_failed=1
    systemctl restart "$unit" || cleanup_failed=1
    sidecar_ready || cleanup_failed=1
  fi
  [ "$(readlink -f "$current" 2>/dev/null || true)" = "$old_current" ] ||
    cleanup_failed=1
  [ "$(systemctl show "$unit" -p User --value)" = 'qima' ] || cleanup_failed=1
  [ "$(systemctl show "$unit" -p Group --value)" = 'qima' ] || cleanup_failed=1
  [ "$(systemctl show "$unit" -p WorkingDirectory --value)" = "$old_runtime/node" ] ||
    cleanup_failed=1
  systemctl show "$unit" -p ExecStart --value |
    grep -Fq "/usr/local/bin/node $old_runtime/node/entry.js" || cleanup_failed=1
  systemctl show "$unit" -p DropInPaths --value |
    grep -Fq "$old_dropin" || cleanup_failed=1
  [ ! -e "$new_dropin" ] || cleanup_failed=1
  [ "$(stat -c '%U:%G:%a' "$env_file" 2>/dev/null || true)" = 'root:qimao:640' ] ||
    cleanup_failed=1
  [ -n "${baseline_env_sha:-}" ] || cleanup_failed=1
  [ -n "${baseline_env_bytes:-}" ] || cleanup_failed=1
  [ "$(sha256sum "$env_file" 2>/dev/null | cut -d' ' -f1 || true)" = "${baseline_env_sha:-}" ] ||
    cleanup_failed=1
  [ "$(stat -c '%s' "$env_file" 2>/dev/null || true)" = "${baseline_env_bytes:-}" ] ||
    cleanup_failed=1
  [ "$(sha256sum "$env_backup" 2>/dev/null | cut -d' ' -f1 || true)" = "${baseline_env_sha:-}" ] ||
    cleanup_failed=1
  [ "$(stat -c '%s' "$env_backup" 2>/dev/null || true)" = "${baseline_env_bytes:-}" ] ||
    cleanup_failed=1
  [ "$(service_state "$unit" 2>/dev/null || true)" = 'active/running/0/0' ] ||
    cleanup_failed=1
  return "$cleanup_failed"
}

rollback() {
  local rc="${1:-1}" cleanup_failed=0 rollback_mode='not_needed'
  trap - ERR EXIT INT TERM
  set +e
  if [ "$env_switched" -eq 1 ] || [ "$dropin_installed" -eq 1 ] ||
    [ "$sidecar_restart_attempted" -eq 1 ]; then
    rollback_mode='geometry-r3+original-env'
    restore_baseline || cleanup_failed=1
  fi
  [ "$(service_state "$screen_unit" 2>/dev/null || true)" = 'inactive/dead/0/0' ] ||
    cleanup_failed=1
  [ "$(service_state "$asr_unit" 2>/dev/null || true)" = 'active/running/0/0' ] ||
    cleanup_failed=1
  [ "$(service_state "$backend_unit" 2>/dev/null || true)" = 'active/running/0/0' ] ||
    cleanup_failed=1
  [ "$(readlink -f "$current" 2>/dev/null || true)" = "$old_current" ] ||
    cleanup_failed=1
  if [ "$runtime_stage_created" -eq 1 ] && [ -e "$runtime_stage" ]; then
    safe_remove "$runtime_stage" || cleanup_failed=1
  fi
  if [ "$runtime_created" -eq 1 ] && [ -e "$new_runtime" ]; then
    safe_remove "$new_runtime" || cleanup_failed=1
  fi
  cleanup_inbound || cleanup_failed=1
  if [ -e "$run_runtime" ]; then
    safe_remove "$run_runtime" || cleanup_failed=1
  fi
  if [ "$cleanup_failed" -eq 0 ]; then
    echo "terminal=blocked code=$failure_code rollback=$rollback_mode cleanup=passed remote_post:0 db_write:0"
  else
    echo "terminal=blocked code=$failure_code rollback_or_cleanup=failed remote_post:0 db_write:0"
  fi
  exit "$rc"
}

trap 'rc=$?; rollback "$rc"' ERR
trap 'rollback $?' EXIT
trap "failure_code='SIGNAL_INT'; rollback 130" INT
trap "failure_code='SIGNAL_TERM'; rollback 143" TERM

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
[ "$(readlink -f "$current" 2>/dev/null || true)" = "$old_current" ]
[ -d "$old_runtime" ] && [ ! -L "$old_runtime" ]
[ -f "$old_entry" ] && [ ! -L "$old_entry" ]
[ -f "$old_sidecar" ] && [ ! -L "$old_sidecar" ]
[ "$(sha256sum "$old_entry" | cut -d' ' -f1)" = '28853cc19392fa7fef149f48c8002089f33c9772f0bb91e5b8090d60bc13e200' ]
[ "$(sha256sum "$old_sidecar" | cut -d' ' -f1)" = '99ee3eb60a220b5c41ed7f1a50a2020c50d9511ce37f5e2198ee475c5967c3ed' ]
[ "$(stat -c '%U:%G:%a' "$env_file")" = 'root:qimao:640' ]
for key in \
  QIMAO_LOCAL_OCR_SIDECAR_BACKEND \
  QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST \
  QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR \
  QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE \
  QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT \
  QIMAO_LOCAL_OCR_SIDECAR_STARTUP_TIMEOUT_MS \
  QIMAO_LOCAL_OCR_SIDECAR_TIMEOUT_MS; do
  grep -Fq "$key=" "$env_file" || input_fail 'ENV_KEY_MISSING'
done
[ "$(awk -F= -v old="$old_runtime" 'index(substr($0,index($0,"=")+1),old)>0 {print $1}' "$env_file" | LC_ALL=C sort | paste -sd, -)" = 'PATH,QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR,QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE,QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT' ]
baseline_env_sha="$(sha256sum "$env_file" | cut -d' ' -f1)"
baseline_env_bytes="$(stat -c '%s' "$env_file")"
[ -n "$baseline_env_sha" ]
[ -n "$baseline_env_bytes" ]
[ "$(systemctl show "$unit" -p User --value)" = 'qima' ]
[ "$(systemctl show "$unit" -p Group --value)" = 'qima' ]
[ "$(systemctl show "$unit" -p WorkingDirectory --value)" = "$old_runtime/node" ]
[ "$(systemctl show "$unit" -p EnvironmentFiles --value)" = "$env_file (ignore_errors=no)" ]
systemctl show "$unit" -p DropInPaths --value | grep -Fq "$old_dropin"
[ "$(stat -c '%U:%G:%a' "$old_dropin")" = 'root:root:644' ]
grep -Fqx "WorkingDirectory=$old_runtime/node" "$old_dropin"
grep -Fqx "ExecStart=/usr/local/bin/node $old_runtime/node/entry.js" "$old_dropin"
grep -Fqx "ReadOnlyPaths=$old_runtime" "$old_dropin"
[ "$(systemctl show "$unit" -p PrivateTmp --value)" = 'yes' ]
[ "$(systemctl show "$unit" -p ProtectSystem --value)" = 'strict' ]
[ "$(systemctl show "$unit" -p ProtectHome --value)" = 'yes' ]
[ "$(systemctl show "$unit" -p NoNewPrivileges --value)" = 'yes' ]
[ "$(service_state "$unit")" = 'active/running/0/0' ]
[ "$(service_state "$screen_unit")" = 'inactive/dead/0/0' ]
[ "$(service_state "$asr_unit")" = 'active/running/0/0' ]
[ "$(service_state "$backend_unit")" = 'active/running/0/0' ]
[ ! -e "$new_runtime" ] && [ ! -e "$runtime_stage" ]
[ ! -e "$run_runtime" ] && [ ! -e "$env_tmp" ] && [ ! -e "$env_restore_tmp" ]
[ ! -e "$new_dropin" ] && [ ! -e "$new_dropin_tmp" ]
old_screen_state="$(service_state "$screen_unit")"
old_asr_state="$(service_state "$asr_unit")"
old_backend_state="$(service_state "$backend_unit")"
old_asr_pid="$(systemctl show "$asr_unit" -p MainPID --value)"
old_backend_pid="$(systemctl show "$backend_unit" -p MainPID --value)"
echo 'baseline=passed current:geometry-r3 sidecar:geometry-r3 screen:stopped env:root-qimao-0640'

failure_code='ARCHIVE_GATE_FAILED'
install -d -o root -g root -m 0700 "$run_runtime" "$unpack"
tar -tzf "$archive_source" > "$archive_list"
[ "$(wc -l < "$archive_list")" = '4' ]
for member in runtime/ runtime/node/ runtime/node/entry.js runtime/node/sidecar.js; do
  [ "$(grep -Fxc "$member" "$archive_list")" = '1' ]
done
awk '$0 ~ /^\/|(^|\/)\.\.($|\/)/ { exit 1 }' "$archive_list"
tar -xzf "$archive_source" -C "$unpack"
[ "$(find "$unpack" -type f | wc -l)" = '2' ]
[ "$(find "$unpack" -mindepth 1 ! -type f ! -type d | wc -l)" = '0' ]
[ -f "$unpack/runtime/node/entry.js" ] && [ ! -L "$unpack/runtime/node/entry.js" ]
[ -f "$unpack/runtime/node/sidecar.js" ] && [ ! -L "$unpack/runtime/node/sidecar.js" ]
[ "$(stat -c '%s' "$unpack/runtime/node/entry.js")" = '1139' ]
[ "$(stat -c '%s' "$unpack/runtime/node/sidecar.js")" = '29118' ]
[ "$(sha256sum "$unpack/runtime/node/entry.js" | cut -d' ' -f1)" = '28853cc19392fa7fef149f48c8002089f33c9772f0bb91e5b8090d60bc13e200' ]
[ "$(sha256sum "$unpack/runtime/node/sidecar.js" | cut -d' ' -f1)" = 'a45a73beb385a4bdc0bd271b4a82c4c07b544319739a5e34b46beb25f5623e99' ]
echo 'archive_gate=passed members:4 files:2 unsafe:0'

failure_code='RUNTIME_STAGE_FAILED'
runtime_stage_created=1
cp --archive --reflink=auto -- "$old_runtime" "$runtime_stage"
(cd "$old_runtime" && find . -printf '%P\t%y\t%m\t%U\t%G\t%s\t%l\n' | LC_ALL=C sort) > "$run_runtime/geometry-r3.manifest"
(cd "$runtime_stage" && find . -printf '%P\t%y\t%m\t%U\t%G\t%s\t%l\n' | LC_ALL=C sort) > "$run_runtime/contract-r1.before.manifest"
cmp -s "$run_runtime/geometry-r3.manifest" "$run_runtime/contract-r1.before.manifest"
cp --reflink=auto -- "$unpack/runtime/node/entry.js" "$runtime_stage_entry"
cp --reflink=auto -- "$unpack/runtime/node/sidecar.js" "$runtime_stage_sidecar"
chown --reference="$old_entry" "$runtime_stage_entry"
chown --reference="$old_sidecar" "$runtime_stage_sidecar"
chmod --reference="$old_entry" "$runtime_stage_entry"
chmod --reference="$old_sidecar" "$runtime_stage_sidecar"
[ "$(stat -c '%U:%G:%a' "$runtime_stage_entry")" = "$(stat -c '%U:%G:%a' "$old_entry")" ]
[ "$(stat -c '%U:%G:%a' "$runtime_stage_sidecar")" = "$(stat -c '%U:%G:%a' "$old_sidecar")" ]
[ "$(sha256sum "$runtime_stage_entry" | cut -d' ' -f1)" = '28853cc19392fa7fef149f48c8002089f33c9772f0bb91e5b8090d60bc13e200' ]
[ "$(sha256sum "$runtime_stage_sidecar" | cut -d' ' -f1)" = 'a45a73beb385a4bdc0bd271b4a82c4c07b544319739a5e34b46beb25f5623e99' ]
(cd "$runtime_stage" && find . -type f ! -path './node/entry.js' ! -path './node/sidecar.js' -printf '%P\t%y\t%m\t%U\t%G\t%s\t%l\n' | LC_ALL=C sort) > "$run_runtime/contract-r1.noncandidate"
(cd "$old_runtime" && find . -type f ! -path './node/entry.js' ! -path './node/sidecar.js' -printf '%P\t%y\t%m\t%U\t%G\t%s\t%l\n' | LC_ALL=C sort) > "$run_runtime/geometry-r3.noncandidate"
cmp -s "$run_runtime/contract-r1.noncandidate" "$run_runtime/geometry-r3.noncandidate"
/usr/local/bin/node --check "$runtime_stage_entry" >/dev/null
/usr/local/bin/node --check "$runtime_stage_sidecar" >/dev/null

failure_code='IMPORT_CONTRACT_GATE_FAILED'
runuser -u qima -- env CANDIDATE_SIDECAR="$runtime_stage_sidecar" MODEL_DIR="$old_model_dir" RUNNER_EXECUTABLE="$old_python" RUNNER_SCRIPT="$old_runner" /usr/local/bin/node --input-type=module -e '
const { createLocalOcrSidecarServer, LOCAL_OCR_PROTOCOL, modelVersionFor } = await import(process.env.CANDIDATE_SIDECAR);
const digest = "0".repeat(64);
const fakeEngine = { async start() {}, async recognize(input) { if (input.media.videoDurationMs !== 1234) throw new Error("duration_contract"); return { boxes: [] }; }, async close() {} };
const sidecar = createLocalOcrSidecarServer({ config: { backend: "openvino", host: "127.0.0.1", port: 0, modelDir: process.env.MODEL_DIR, modelDigest: digest, runnerExecutable: process.env.RUNNER_EXECUTABLE, runnerScript: process.env.RUNNER_SCRIPT, startupTimeoutMs: 1000, timeoutMs: 1000 }, engine: fakeEngine });
const address = await sidecar.start();
try {
  const response = await fetch("http://127.0.0.1:" + address.port + "/ocr", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ protocolVersion: LOCAL_OCR_PROTOCOL, attemptId: "11111111-1111-4111-8111-111111111111", requestId: "contract-1694", modelVersion: modelVersionFor(digest), language: "zh-CN", media: { inputKind: "server_extracted_frames", contentType: "video/mp4", sizeBytes: 1, checksumAlgorithm: "sha256", checksumValue: "1".repeat(64), videoDurationMs: 1234, maxFrameCount: 1, maxPixels: 1 }, frames: [{ frameIndex: 0, capturedAtMs: 1234, width: 1, height: 1, contentType: "image/png", bytesBase64: "AA==" }] }) });
  const result = await response.json();
  if (response.status !== 200 || result.protocolVersion !== LOCAL_OCR_PROTOCOL || result.frameCount !== 1 || !Array.isArray(result.boxes)) process.exit(1);
} finally { await sidecar.stop(); }
'
echo 'candidate_gate=passed node_check:2 qimao_import:1 parser_videoDurationMs:1'

failure_code='RUNTIME_INSTALL_FAILED'
runtime_created=1
mv -T "$runtime_stage" "$new_runtime"
runtime_stage_created=0
[ -d "$new_runtime" ] && [ -f "$new_entry" ] && [ -f "$new_sidecar" ]

failure_code='ENV_CONCURRENT_CHANGE'
[ "$(sha256sum "$env_file" | cut -d' ' -f1)" = "$baseline_env_sha" ]
[ "$(stat -c '%s' "$env_file")" = "$baseline_env_bytes" ]
cp --archive --reflink=auto -- "$env_file" "$env_backup"
[ "$(sha256sum "$env_backup" | cut -d' ' -f1)" = "$baseline_env_sha" ]
[ "$(stat -c '%s' "$env_backup")" = "$baseline_env_bytes" ]
cmp -s "$env_backup" "$env_file"
failure_code='ENV_SWITCH_FAILED'
cp --archive --reflink=auto -- "$env_file" "$env_tmp"
sed -i "s#${old_runtime}#${new_runtime}#g" "$env_tmp"
chown --reference="$env_file" "$env_tmp"
chmod --reference="$env_file" "$env_tmp"
[ "$(stat -c '%U:%G:%a' "$env_tmp")" = 'root:qimao:640' ]
[ "$(awk -F= -v old="$old_runtime" 'index(substr($0,index($0,"=")+1),old)>0 {count++} END {print count+0}' "$env_tmp")" = '0' ]
[ "$(awk -F= -v new="$new_runtime" 'index(substr($0,index($0,"=")+1),new)>0 {print $1}' "$env_tmp" | LC_ALL=C sort | paste -sd, -)" = 'PATH,QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR,QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE,QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT' ]
[ "$(sha256sum "$env_file" | cut -d' ' -f1)" = "$baseline_env_sha" ]
[ "$(stat -c '%s' "$env_file")" = "$baseline_env_bytes" ]
cmp -s "$env_backup" "$env_file"
env_switched=1
mv -Tf "$env_tmp" "$env_file"

failure_code='DROPIN_INSTALL_FAILED'
[ ! -e "$new_dropin" ]
[ ! -e "$new_dropin_tmp" ]
{
  printf '[Service]\n'
  printf 'WorkingDirectory=%s/node\n' "$new_runtime"
  printf 'ExecStart=\n'
  printf 'ExecStart=/usr/local/bin/node %s/node/entry.js\n' "$new_runtime"
  printf 'ReadOnlyPaths=%s\n' "$new_runtime"
} > "$dropin_source"
if [ ! -d "$dropin_dir" ]; then
  created_dropin_dir=1
  install -d -o root -g root -m 0755 "$dropin_dir"
fi
install -o root -g root -m 0644 "$dropin_source" "$new_dropin_tmp"
dropin_installed=1
mv -Tf "$new_dropin_tmp" "$new_dropin"
systemd-analyze verify "$unit"
systemctl daemon-reload
[ "$(readlink -f "$current" 2>/dev/null || true)" = "$old_current" ]
[ "$(systemctl show "$unit" -p User --value)" = 'qima' ]
[ "$(systemctl show "$unit" -p Group --value)" = 'qima' ]
[ "$(systemctl show "$unit" -p WorkingDirectory --value)" = "$new_runtime/node" ]
systemctl show "$unit" -p ExecStart --value | grep -Fq "/usr/local/bin/node $new_runtime/node/entry.js"
systemctl show "$unit" -p DropInPaths --value | grep -Fq "$old_dropin"
systemctl show "$unit" -p DropInPaths --value | grep -Fq "$new_dropin"
[ "$(systemctl show "$unit" -p EnvironmentFiles --value)" = "$env_file (ignore_errors=no)" ]
[ "$(stat -c '%U:%G:%a' "$new_dropin")" = 'root:root:644' ]

failure_code='SIDECAR_RESTART_FAILED'
sidecar_restart_attempted=1
systemctl restart "$unit"
sidecar_ready
[ "$(service_state "$unit")" = 'active/running/0/0' ]
candidate_pid="$(systemctl show "$unit" -p MainPID --value)"
[ "$candidate_pid" -gt 1 ]
[ "$(service_state "$asr_unit")" = "$old_asr_state" ]
[ "$(systemctl show "$asr_unit" -p MainPID --value)" = "$old_asr_pid" ]
[ "$(service_state "$screen_unit")" = "$old_screen_state" ]
[ "$(service_state "$backend_unit")" = "$old_backend_state" ]
[ "$(systemctl show "$backend_unit" -p MainPID --value)" = "$old_backend_pid" ]
tr '\0' '\n' < "/proc/$candidate_pid/environ" | grep -Fqx "QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR=$new_model_dir"
tr '\0' '\n' < "/proc/$candidate_pid/environ" | grep -Fqx "QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE=$new_python"
tr '\0' '\n' < "/proc/$candidate_pid/environ" | grep -Fqx "QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT=$new_runtime/node/paddle_hpi_runner.py"
effective_path="$(tr '\0' '\n' < "/proc/$candidate_pid/environ" | sed -n 's/^PATH=//p' | head -n 1)"
[[ "$effective_path" == *"$new_runtime"* ]]
[[ "$effective_path" != *"$old_runtime"* ]]
[ "$(readlink -f "$current" 2>/dev/null || true)" = "$old_current" ]
[ "$(service_state "$screen_unit")" = 'inactive/dead/0/0' ]
echo "post_switch=passed sidecar:$candidate_pid active/running/0/0 readiness:405 backend_pid:$old_backend_pid asr_pid:$old_asr_pid screen:stopped current:unchanged"

failure_code='FINAL_CLEANUP_FAILED'
cleanup_inbound
safe_remove "$run_runtime"
[ ! -e "$inbound" ] && [ ! -e "$run_runtime" ]
[ ! -e "$runtime_stage" ] && [ ! -e "$env_tmp" ] && [ ! -e "$env_restore_tmp" ]
[ ! -e "$new_dropin_tmp" ]
[ -d "$new_runtime" ] && [ "$(readlink -f "$current" 2>/dev/null || true)" = "$old_current" ]
[ "$(service_state "$screen_unit")" = 'inactive/dead/0/0' ]
trap - ERR EXIT INT TERM
echo 'residual=geometry-r3,contract-r1,env:contract,dropin:geometry+contract,sidecar:active,screen:stopped,inbound:absent,stage:absent,temp:absent,current:unchanged'
echo 'terminal=passed deployment:sidecar-contract-r1 runtime_files:2 sidecar_restart:1 backend_restart:0 asr_restart:0 screen_start:0 db_write:0 route_write:0 provider_call:0'
exit 0
