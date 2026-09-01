#!/bin/bash
set -Eeuo pipefail
umask 077

input_fail() {
  echo "input_gate=failed code=$1"
  exit 64
}

inbound="${1-}"
[ "$EUID" -eq 0 ] || input_fail 'ROOT_REQUIRED'
[ "$inbound" = '/var/tmp/qimao-ocr-geometry-1628-inbound' ] \
  || input_fail 'INBOUND_PATH_INVALID'
lock_file='/run/lock/qimao-ocr-geometry-1628.lock'
exec 9>"$lock_file" || input_fail 'LOCK_OPEN_FAILED'
flock -n 9 || input_fail 'LOCK_ALREADY_HELD'

runner_source="$inbound/runner.sh"
payload_source="$inbound/paddle_hpi_runner.py"
preflight_source="$inbound/geometry_preflight.py"
checksums_source="$inbound/SHA256SUMS"
[ -d "$inbound" ] && [ ! -L "$inbound" ] \
  || input_fail 'INBOUND_DIRECTORY_INVALID'
[ "$(stat -c '%U:%G:%a' "$inbound")" = 'qimao-deploy:qimao-deploy:700' ] \
  || input_fail 'INBOUND_DIRECTORY_IDENTITY_INVALID'
chown --no-dereference root:root "$inbound"
chmod 0700 "$inbound"
[ "$(stat -c '%U:%G:%a' "$inbound")" = 'root:root:700' ] \
  || input_fail 'INBOUND_ROOT_TAKEOVER_FAILED'
[ "$(find "$inbound" -mindepth 1 -maxdepth 1 | wc -l)" = '4' ] \
  || input_fail 'INBOUND_ENTRY_COUNT_INVALID'
[ "$(find "$inbound" -mindepth 1 -maxdepth 1 -type f | wc -l)" = '4' ] \
  || input_fail 'INBOUND_REGULAR_FILE_COUNT_INVALID'
for file in "$runner_source" "$payload_source" "$preflight_source" "$checksums_source"; do
  [ -f "$file" ] && [ ! -L "$file" ] \
    && [ "$(stat -c '%U:%G:%h' "$file")" = 'qimao-deploy:qimao-deploy:1' ] \
    || input_fail 'INBOUND_FILE_IDENTITY_INVALID'
done
chown --no-dereference root:root \
  "$runner_source" "$payload_source" "$preflight_source" "$checksums_source"
chmod 0500 "$runner_source"
chmod 0400 "$payload_source" "$preflight_source" "$checksums_source"
[ "$(stat -c '%U:%G:%a:%h' "$runner_source")" = 'root:root:500:1' ] \
  || input_fail 'RUNNER_ROOT_TAKEOVER_FAILED'
for file in "$payload_source" "$preflight_source" "$checksums_source"; do
  [ "$(stat -c '%U:%G:%a:%h' "$file")" = 'root:root:400:1' ] \
    || input_fail 'PAYLOAD_ROOT_TAKEOVER_FAILED'
done
chmod 0500 "$inbound"
[ "$(stat -c '%U:%G:%a' "$inbound")" = 'root:root:500' ] \
  || input_fail 'INBOUND_READ_ONLY_SEAL_FAILED'
[ "$(wc -l < "$checksums_source")" = '3' ] \
  || input_fail 'SHA_LINE_COUNT_INVALID'
[ "$(awk 'NF==2 && length($1)==64 && $1 !~ /[^0-9a-f]/ {print $2}' "$checksums_source" \
  | paste -sd, -)" = 'runner.sh,paddle_hpi_runner.py,geometry_preflight.py' ] \
  || input_fail 'SHA_CONTENT_INVALID'
(cd "$inbound" && sha256sum --strict -c SHA256SUMS >/dev/null) \
  || input_fail 'SHA_CLOSURE_INVALID'
/bin/bash -n "$runner_source" || input_fail 'RUNNER_SYNTAX_INVALID'
[ "$(stat -c '%s' "$payload_source")" = '13728' ] \
  || input_fail 'PAYLOAD_BYTES_INVALID'
[ "$(sha256sum "$payload_source" | cut -d' ' -f1)" = \
  'b97b02ec9c2ff7954f9f3e1761a0111c9537673ad33fd3a5376df7a80d62d071' ] \
  || input_fail 'PAYLOAD_SHA_INVALID'

old_release='/opt/qimao-terms-cloud/releases/ai-recovery-1607-r2'
new_release='/opt/qimao-terms-cloud/releases/ai-recovery-1607-r3'
release_stage='/opt/qimao-terms-cloud/releases/.ai-recovery-1607-r3-stage-1628'
current='/opt/qimao-terms-cloud/current'
current_next='/opt/qimao-terms-cloud/current.ocr-geometry-1628.next'
old_runtime='/opt/qimao/local-ocr/20260827-local-ocr-04g-r1'
new_runtime='/opt/qimao/local-ocr/20260831-local-ocr-geometry-r3'
runtime_stage='/opt/qimao/local-ocr/.20260831-local-ocr-geometry-r3-stage-1628'
old_runner="$old_runtime/node/paddle_hpi_runner.py"
new_runner="$new_runtime/node/paddle_hpi_runner.py"
old_model_dir="$old_runtime/models/work/openvino"
new_model_dir="$new_runtime/models/work/openvino"
old_python="$old_runtime/venv/bin/python"
new_python="$new_runtime/venv/bin/python"
old_entry="$old_runtime/node/entry.js"
new_entry="$new_runtime/node/entry.js"
extractor_rel='backend/dist/sidecars/local-ocr/frame-extractor.js'
run_runtime='/run/qimao-ocr-geometry-1628'
helper_dir="$run_runtime/helpers"
env_file='/etc/qimao-terms-cloud/local-ocr-04g-openvino.env'
env_tmp='/etc/qimao-terms-cloud/.local-ocr-04g-openvino.env.geometry-1628.tmp'
unit='qimao-local-ocr-openvino.service'
screen_unit='qimao-worker@screen-text.worker.entry.js.service'
fragment='/etc/systemd/system/qimao-local-ocr-openvino.service'
dropin_dir='/etc/systemd/system/qimao-local-ocr-openvino.service.d'
dropin_file="$dropin_dir/geometry-1628-r3.conf"
dropin_install_tmp="$dropin_dir/.geometry-1628-r3.conf.tmp"
dropin_source="$run_runtime/geometry-1628-r3.conf"

failure_code='UNEXPECTED_COMMAND_FAILURE'
created_run_runtime=0
created_release_stage=0
created_runtime_stage=0
created_release=0
created_dedicated_runtime=0
created_dropin_dir=0
switched_current=0
switched_env=0
installed_dropin=0
sidecar_restart_attempted=0

safe_remove_tree() {
  case "$1" in
    "$release_stage"|"$runtime_stage"|"$new_release"|"$new_runtime"|"$run_runtime")
      rm -rf --one-file-system -- "$1"
      ;;
    *) echo 'cleanup_refused=unsafe_path'; return 1 ;;
  esac
}

cleanup_inbound() {
  chmod 0700 "$inbound"
  rm -f -- "$runner_source" "$payload_source" "$preflight_source" "$checksums_source"
  rmdir -- "$inbound"
}

sidecar_ready() {
  local attempt status
  for attempt in $(seq 1 45); do
    status="$(curl --silent --show-error --output /dev/null \
      --write-out '%{http_code}' http://127.0.0.1:3100/ocr 2>/dev/null || true)"
    if [ "$status" = '405' ]; then return 0; fi
    sleep 1
  done
  return 1
}

restore_baseline() {
  local cleanup_failed=0
  rm -f -- "$current_next" "$env_tmp" "$dropin_install_tmp"
  if [ "$switched_current" -eq 1 ]; then
    ln -s "$old_release" "$current_next" || cleanup_failed=1
    mv -Tf "$current_next" "$current" || cleanup_failed=1
  fi
  if [ "$switched_env" -eq 1 ]; then
    cp --archive --reflink=auto -- "$run_runtime/openvino-env.backup" "$env_tmp" \
      || cleanup_failed=1
    mv -Tf "$env_tmp" "$env_file" || cleanup_failed=1
    cmp -s "$run_runtime/openvino-env.backup" "$env_file" || cleanup_failed=1
  fi
  if [ "$installed_dropin" -eq 1 ]; then
    rm -f -- "$dropin_file" || cleanup_failed=1
  fi
  if [ "$created_dropin_dir" -eq 1 ] && [ -d "$dropin_dir" ]; then
    rmdir -- "$dropin_dir" || cleanup_failed=1
  fi
  if [ "$switched_current" -eq 1 ] || [ "$switched_env" -eq 1 ] \
    || [ "$installed_dropin" -eq 1 ] || [ "$sidecar_restart_attempted" -eq 1 ]; then
    systemctl daemon-reload || cleanup_failed=1
    systemctl restart "$unit" || cleanup_failed=1
    sidecar_ready || cleanup_failed=1
  fi
  [ "$(readlink -f "$current" 2>/dev/null)" = "$old_release" ] || cleanup_failed=1
  [ "$(systemctl show "$unit" -p WorkingDirectory --value)" = "$old_runtime/node" ] \
    || cleanup_failed=1
  [ "$(systemctl show "$unit" -p DropInPaths --value)" = '' ] || cleanup_failed=1
  return "$cleanup_failed"
}

finish_failure() {
  local rc="${1:-1}" cleanup_failed=0
  local rollback_mode='not_needed'
  trap - ERR EXIT INT TERM
  set +e
  if [ "$switched_current" -eq 1 ] || [ "$switched_env" -eq 1 ] \
    || [ "$installed_dropin" -eq 1 ] || [ "$sidecar_restart_attempted" -eq 1 ]; then
    rollback_mode='r2+04g-r1'
    restore_baseline || cleanup_failed=1
  fi
  [ "$(systemctl is-active "$screen_unit" 2>/dev/null || true)" = 'inactive' ] \
    || cleanup_failed=1
  if [ "$created_release_stage" -eq 1 ] && [ -e "$release_stage" ]; then
    safe_remove_tree "$release_stage" || cleanup_failed=1
  fi
  if [ "$created_runtime_stage" -eq 1 ] && [ -e "$runtime_stage" ]; then
    safe_remove_tree "$runtime_stage" || cleanup_failed=1
  fi
  if [ "$created_release" -eq 1 ] && [ -e "$new_release" ]; then
    safe_remove_tree "$new_release" || cleanup_failed=1
  fi
  if [ "$created_dedicated_runtime" -eq 1 ] && [ -e "$new_runtime" ]; then
    safe_remove_tree "$new_runtime" || cleanup_failed=1
  fi
  cleanup_inbound || cleanup_failed=1
  if [ "$created_run_runtime" -eq 1 ] && [ -e "$run_runtime" ]; then
    safe_remove_tree "$run_runtime" || cleanup_failed=1
  fi
  if [ "$cleanup_failed" -eq 0 ]; then
    echo "terminal=blocked code=$failure_code rollback=$rollback_mode cleanup=passed remote_post:0 db_write:0"
  else
    echo "terminal=blocked code=$failure_code rollback_or_cleanup=failed remote_post:0 db_write:0"
  fi
  exit "$rc"
}

trap 'finish_failure $?' ERR
trap 'finish_failure $?' EXIT
trap "failure_code='SIGNAL_INT'; finish_failure 130" INT
trap "failure_code='SIGNAL_TERM'; finish_failure 143" TERM

echo 'runner_started=1 inbound=root_sealed sha_closure=passed'

failure_code='BASELINE_IDENTITY_FAILED'
[ "$(readlink -f "$current")" = "$old_release" ]
[ -d "$old_release" ] && [ -d "$old_runtime" ]
[ -d '/opt/qimao-terms-cloud/releases/ai-recovery-1607-r1' ]
[ "$(stat -c '%U:%G:%a' "$old_runner")" = 'root:root:644' ]
[ "$(stat -c '%s' "$old_runner")" = '13299' ]
[ "$(sha256sum "$old_runner" | cut -d' ' -f1)" = \
  'b2a2c008a30c0c276f7f7f9ba2a533caf097a9d64c08512acab511bc9516e108' ]
[ "$(stat -c '%U:%G:%a' "$old_release/$extractor_rel")" = 'qimao:qimao:750' ]
[ "$(sha256sum "$fragment" | cut -d' ' -f1)" = \
  '2abe32e0b05988ddbb619cedb10e60d044e357e264f961abf81891c514b9de38' ]
[ "$(stat -c '%s' "$fragment")" = '818' ]
[ "$(sha256sum "$env_file" | cut -d' ' -f1)" = \
  '08c3578a100eac83f38043d14eb86bb84abdef559170c71e2d6d40f72adb9c09' ]
[ "$(stat -c '%s' "$env_file")" = '798' ]
grep -Fqx 'QIMAO_LOCAL_OCR_SIDECAR_BACKEND=openvino' "$env_file"
grep -Fqx "QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR=$old_model_dir" "$env_file"
grep -Fqx "QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE=$old_python" "$env_file"
grep -Fqx "QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT=$old_runner" "$env_file"
grep -Fqx 'QIMAO_LOCAL_OCR_SIDECAR_STARTUP_TIMEOUT_MS=300000' "$env_file"
grep -Fqx 'QIMAO_LOCAL_OCR_SIDECAR_TIMEOUT_MS=60000' "$env_file"
[ "$(awk -F= -v old="$old_runtime" \
  'index(substr($0,index($0,"=")+1),old)>0 {print $1}' "$env_file" \
  | LC_ALL=C sort | paste -sd, -)" = \
  'PATH,QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR,QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE,QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT' ]
[ "$(systemctl show "$unit" -p User --value)" = 'qima' ]
[ "$(systemctl show "$unit" -p Group --value)" = 'qima' ]
[ "$(systemctl show "$unit" -p WorkingDirectory --value)" = "$old_runtime/node" ]
[ "$(systemctl show "$unit" -p EnvironmentFiles --value)" = \
  "$env_file (ignore_errors=no)" ]
[ "$(systemctl show "$unit" -p DropInPaths --value)" = '' ]
[ "$(systemctl show "$unit" -p ActiveState --value)" = 'active' ]
[ "$(systemctl show "$unit" -p SubState --value)" = 'running' ]
[ "$(systemctl show "$unit" -p NRestarts --value)" = '0' ]
[ "$(systemctl is-active "$screen_unit" 2>/dev/null || true)" = 'inactive' ]
[ ! -e "$new_release" ] && [ ! -e "$release_stage" ]
[ ! -e "$new_runtime" ] && [ ! -e "$runtime_stage" ]
[ ! -e "$run_runtime" ] && [ ! -e "$dropin_file" ]
[ ! -e "$current_next" ] && [ ! -e "$env_tmp" ] && [ ! -e "$dropin_install_tmp" ]
echo 'baseline=passed current:r2 extractor:0750 sidecar:active screen:stopped timeout_ms:60000 runner:dedicated_04g_r1'

failure_code='RUN_RUNTIME_PREPARE_FAILED'
created_run_runtime=1
install -d -o root -g qima -m 0750 "$run_runtime"
install -d -o root -g qima -m 0750 "$helper_dir"
install -o root -g qima -m 0550 "$preflight_source" "$helper_dir/geometry_preflight.py"
cp --archive --reflink=auto -- "$env_file" "$run_runtime/openvino-env.backup"

failure_code='R3_RELEASE_COPY_FAILED'
created_release_stage=1
cp --archive --reflink=auto -- "$old_release" "$release_stage"
(cd "$old_release" && find . -printf '%P\t%y\t%m\t%U\t%G\t%s\t%l\n' | LC_ALL=C sort) \
  > "$run_runtime/r2-release.manifest"
(cd "$release_stage" && find . -printf '%P\t%y\t%m\t%U\t%G\t%s\t%l\n' | LC_ALL=C sort) \
  > "$run_runtime/r3-release.manifest"
cmp -s "$run_runtime/r2-release.manifest" "$run_runtime/r3-release.manifest"
(cd "$old_release" && find . -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum) \
  > "$run_runtime/r2-release.sha256"
(cd "$release_stage" && find . -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum) \
  > "$run_runtime/r3-release.sha256"
cmp -s "$run_runtime/r2-release.sha256" "$run_runtime/r3-release.sha256"
[ "$(stat -c '%U:%G:%a' "$release_stage/$extractor_rel")" = 'qimao:qimao:750' ]

failure_code='R3_RUNTIME_COPY_FAILED'
created_runtime_stage=1
cp --archive --reflink=auto -- "$old_runtime" "$runtime_stage"
(cd "$old_runtime" && find . -printf '%P\t%y\t%m\t%U\t%G\t%s\t%l\n' | LC_ALL=C sort) \
  > "$run_runtime/04g-r1.manifest"
(cd "$runtime_stage" && find . -printf '%P\t%y\t%m\t%U\t%G\t%s\t%l\n' | LC_ALL=C sort) \
  > "$run_runtime/geometry-r3.before.manifest"
cmp -s "$run_runtime/04g-r1.manifest" "$run_runtime/geometry-r3.before.manifest"

failure_code='PYTHON_RUNNER_REPLACE_FAILED'
dd if="$payload_source" of="$runtime_stage/node/paddle_hpi_runner.py" \
  bs=1M conv=fsync status=none
[ "$(stat -c '%U:%G:%a' "$runtime_stage/node/paddle_hpi_runner.py")" = 'root:root:644' ]
[ "$(stat -c '%s' "$runtime_stage/node/paddle_hpi_runner.py")" = '13728' ]
[ "$(sha256sum "$runtime_stage/node/paddle_hpi_runner.py" | cut -d' ' -f1)" = \
  'b97b02ec9c2ff7954f9f3e1761a0111c9537673ad33fd3a5376df7a80d62d071' ]
(cd "$old_runtime" && find . -type f ! -path './node/paddle_hpi_runner.py' \
  -printf '%P\t%s\n' | LC_ALL=C sort) > "$run_runtime/04g-r1.nonrunner"
(cd "$runtime_stage" && find . -type f ! -path './node/paddle_hpi_runner.py' \
  -printf '%P\t%s\n' | LC_ALL=C sort) > "$run_runtime/geometry-r3.nonrunner"
cmp -s "$run_runtime/04g-r1.nonrunner" "$run_runtime/geometry-r3.nonrunner"

failure_code='R3_INSTALL_FAILED'
created_release=1
mv -- "$release_stage" "$new_release"
created_release_stage=0
created_dedicated_runtime=1
mv -- "$runtime_stage" "$new_runtime"
created_runtime_stage=0
[ "$(stat -c '%U:%G:%a' "$new_runner")" = 'root:root:644' ]
[ "$(stat -c '%U:%G:%a' "$new_release/$extractor_rel")" = 'qimao:qimao:750' ]
[ -x "$new_python" ] && [ -f "$new_entry" ] && [ -d "$new_model_dir" ]
(cd "$new_runtime" && find . -printf '%P\t%y\t%m\t%U\t%G\t%s\t%l\n' | LC_ALL=C sort) \
  > "$run_runtime/geometry-r3.preflight-before.manifest"

failure_code='PYTHON_PREFLIGHT_FAILED'
runuser -u qima -- env PYTHONDONTWRITEBYTECODE=1 "$new_python" -c \
  'import pathlib,sys; p=pathlib.Path(sys.argv[1]); compile(p.read_text(encoding="utf-8"),str(p),"exec")' \
  "$new_runner"
runuser -u qima -- env PYTHONDONTWRITEBYTECODE=1 \
  "$new_python" "$helper_dir/geometry_preflight.py" "$new_runner"
/usr/local/bin/node --check "$new_entry" >/dev/null
(cd "$new_runtime" && find . -printf '%P\t%y\t%m\t%U\t%G\t%s\t%l\n' | LC_ALL=C sort) \
  > "$run_runtime/geometry-r3.preflight-after.manifest"
cmp -s "$run_runtime/geometry-r3.preflight-before.manifest" \
  "$run_runtime/geometry-r3.preflight-after.manifest"
echo 'candidate_preflight=passed python_syntax:1 geometry_boundaries:3 model_copy:unchanged extractor:0750'

failure_code='SWITCH_ARTIFACT_PREPARE_FAILED'
cp --archive --reflink=auto -- "$env_file" "$env_tmp"
awk -v old="$old_runtime" -v new="$new_runtime" -v model="$new_model_dir" \
  -v python="$new_python" -v runner="$new_runner" '
  BEGIN { path_count=0; path_replacements=0; model_count=0; python_count=0; runner_count=0 }
  /^PATH=/ {
    path_replacements += gsub(old,new); print; path_count += 1; next
  }
  /^QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR=/ {
    print "QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR=" model; model_count += 1; next
  }
  /^QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE=/ {
    print "QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE=" python; python_count += 1; next
  }
  /^QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT=/ {
    print "QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT=" runner; runner_count += 1; next
  }
  { print }
  END {
    if (path_count != 1 || path_replacements < 1 || model_count != 1 ||
      python_count != 1 || runner_count != 1) exit 42
  }
' "$env_file" > "$env_tmp"
[ "$(stat -c '%u:%g:%a' "$env_tmp")" = \
  "$(stat -c '%u:%g:%a' "$run_runtime/openvino-env.backup")" ]
grep -Fqx 'QIMAO_LOCAL_OCR_SIDECAR_TIMEOUT_MS=60000' "$env_tmp"
grep -Fqx 'QIMAO_LOCAL_OCR_SIDECAR_STARTUP_TIMEOUT_MS=300000' "$env_tmp"
[ "$(awk -F= -v old="$old_runtime" \
  'index(substr($0,index($0,"=")+1),old)>0 {count++} END {print count+0}' \
  "$env_tmp")" = '0' ]
[ "$(awk -F= -v new="$new_runtime" \
  'index(substr($0,index($0,"=")+1),new)>0 {print $1}' "$env_tmp" \
  | LC_ALL=C sort | paste -sd, -)" = \
  'PATH,QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR,QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE,QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT' ]
{
  printf '[Service]\n'
  printf 'WorkingDirectory=%s/node\n' "$new_runtime"
  printf 'ExecStart=\n'
  printf 'ExecStart=/usr/local/bin/node %s/node/entry.js\n' "$new_runtime"
  printf 'ReadOnlyPaths=%s\n' "$new_runtime"
} > "$dropin_source"
chmod 0644 "$dropin_source"
/usr/bin/systemd-analyze verify "$fragment"

failure_code='ATOMIC_SWITCH_FAILED'
ln -s "$new_release" "$current_next"
switched_current=1
mv -Tf "$current_next" "$current"
switched_env=1
mv -Tf "$env_tmp" "$env_file"
if [ ! -d "$dropin_dir" ]; then
  created_dropin_dir=1
  install -d -o root -g root -m 0755 "$dropin_dir"
fi
install -o root -g root -m 0644 "$dropin_source" "$dropin_install_tmp"
installed_dropin=1
mv -Tf "$dropin_install_tmp" "$dropin_file"
systemctl daemon-reload
[ "$(readlink -f "$current")" = "$new_release" ]
[ "$(systemctl show "$unit" -p WorkingDirectory --value)" = "$new_runtime/node" ]
systemctl show "$unit" -p ExecStart --value | grep -Fq "$new_entry"
systemctl show "$unit" -p ReadOnlyPaths --value | grep -Fq "$new_runtime"
[ "$(systemctl show "$unit" -p EnvironmentFiles --value)" = \
  "$env_file (ignore_errors=no)" ]
systemctl show "$unit" -p DropInPaths --value | grep -Fq "$dropin_file"
[ "$(systemctl is-active "$screen_unit" 2>/dev/null || true)" = 'inactive' ]

failure_code='SIDECAR_RESTART_FAILED'
sidecar_restart_attempted=1
systemctl restart "$unit"
sidecar_ready
[ "$(systemctl show "$unit" -p ActiveState --value)" = 'active' ]
[ "$(systemctl show "$unit" -p SubState --value)" = 'running' ]
[ "$(systemctl show "$unit" -p NRestarts --value)" = '0' ]
pid="$(systemctl show "$unit" -p MainPID --value)"
[ "$pid" -gt 1 ] && [ -r "/proc/$pid/environ" ]
tr '\0' '\n' < "/proc/$pid/environ" | grep -Fqx \
  "QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT=$new_runner"
tr '\0' '\n' < "/proc/$pid/environ" | grep -Fqx \
  "QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE=$new_python"
tr '\0' '\n' < "/proc/$pid/environ" | grep -Fqx \
  "QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR=$new_model_dir"
tr '\0' '\n' < "/proc/$pid/environ" | grep -Fqx \
  'QIMAO_LOCAL_OCR_SIDECAR_TIMEOUT_MS=60000'
effective_path="$(tr '\0' '\n' < "/proc/$pid/environ" | sed -n 's/^PATH=//p' | head -n 1)"
[[ "$effective_path" == *"$new_runtime"* ]]
[[ "$effective_path" != *"$old_runtime"* ]]
[ "$(systemctl is-active "$screen_unit" 2>/dev/null || true)" = 'inactive' ]

failure_code='FINAL_RESIDUAL_FAILED'
cleanup_inbound
safe_remove_tree "$run_runtime"
[ ! -e "$inbound" ] && [ ! -e "$run_runtime" ]
[ ! -e "$release_stage" ] && [ ! -e "$runtime_stage" ]
[ ! -e "$current_next" ] && [ ! -e "$env_tmp" ] && [ ! -e "$dropin_install_tmp" ]
[ -d '/opt/qimao-terms-cloud/releases/ai-recovery-1607-r1' ]
[ -d "$old_release" ] && [ -d "$new_release" ]
[ -d "$old_runtime" ] && [ -d "$new_runtime" ]
trap - ERR EXIT INT TERM
echo 'residual=r1,r2,r3,current:r3,04g-r1,geometry-r3,env:r3,dropin:r3,sidecar:active,screen:stopped,inbound:absent,stage:absent,temp:absent,lock:retained'
echo 'terminal=passed deployment:geometry-r3 python_runner_only:1 timeout_ms:60000 sidecar:active screen:stopped post:0 db_write:0 route_write:0 provider_call:0 asr_action:0'
