#!/bin/bash
set -Eeuo pipefail
umask 077

inbound="${1-}"
[ "$EUID" -eq 0 ] || { echo 'terminal=blocked code=ROOT_REQUIRED'; exit 64; }
[ "$inbound" = '/var/tmp/qimao-ocr-diagnose-1635-inbound' ] \
  || { echo 'terminal=blocked code=INBOUND_PATH_INVALID'; exit 64; }

lock='/run/lock/qimao-ocr-diagnose-1635.lock'
exec 9>"$lock"
flock -n 9 || { echo 'terminal=blocked code=LOCK_ALREADY_HELD'; exit 64; }

runtime='/run/qimao-ocr-diagnose-1635'
request="$runtime/request.json"
result="$runtime/result.txt"
release='/opt/qimao-terms-cloud/releases/ai-recovery-1607-r3'
isolated_unit='qimao-ocr-diagnose-1635-sidecar.service'
isolated_port='3199'
screen_unit='qimao-worker@screen-text.worker.entry.js.service'
openvino_unit='qimao-local-ocr-openvino.service'
isolated_started=0

cleanup() {
  local rc=$?
  trap - EXIT INT TERM
  set +e
  if [ "$isolated_started" -eq 1 ]; then
    systemctl stop "$isolated_unit" >/dev/null 2>&1 || true
    systemctl reset-failed "$isolated_unit" >/dev/null 2>&1 || true
  fi
  [ ! -e "$runtime" ] || rm -rf --one-file-system -- "$runtime"
  if [ -e "$inbound" ]; then
    chmod 0700 "$inbound"
    rm -f -- "$inbound/runner.sh" "$inbound/prepare_request.mjs" \
      "$inbound/diagnostic_runner.py" "$inbound/SHA256SUMS"
    rmdir -- "$inbound"
  fi
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

[ -d "$inbound" ] && [ ! -L "$inbound" ]
[ "$(stat -c '%U:%G:%a' "$inbound")" = 'qimao-deploy:qimao-deploy:700' ]
[ "$(find "$inbound" -mindepth 1 -maxdepth 1 -type f | wc -l)" = '4' ]
for name in runner.sh prepare_request.mjs diagnostic_runner.py SHA256SUMS; do
  [ -f "$inbound/$name" ] && [ ! -L "$inbound/$name" ]
  [ "$(stat -c '%U:%G:%h' "$inbound/$name")" = 'qimao-deploy:qimao-deploy:1' ]
done
chown -R root:root "$inbound"
chmod 0500 "$inbound" "$inbound/runner.sh"
chmod 0400 "$inbound/prepare_request.mjs" "$inbound/diagnostic_runner.py" "$inbound/SHA256SUMS"
[ "$(wc -l < "$inbound/SHA256SUMS")" = '3' ]
(cd "$inbound" && sha256sum --strict -c SHA256SUMS >/dev/null)
/bin/bash -n "$inbound/runner.sh"
/usr/local/bin/node --check "$inbound/prepare_request.mjs" >/dev/null
/usr/bin/python3 -c 'import ast,pathlib,sys; ast.parse(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))' \
  "$inbound/diagnostic_runner.py"
echo 'payload_gate=passed sha:closed syntax:passed'

[ "$(readlink -f /opt/qimao-terms-cloud/current)" = "$release" ]
[ "$(systemctl is-active "$screen_unit" 2>/dev/null || true)" = 'inactive' ]
[ "$(systemctl show "$screen_unit" -p NRestarts --value)" = '0' ]
[ "$(systemctl show "$openvino_unit" -p ActiveState --value)" = 'active' ]
[ "$(systemctl show "$openvino_unit" -p SubState --value)" = 'running' ]
[ "$(systemctl show "$openvino_unit" -p NRestarts --value)" = '0' ]
[ ! -e "$runtime" ]
echo 'baseline=passed screen:inactive openvino:active restarts:0 database_write:0 queue_action:0'

install -d -o qimao -g qimao -m 0700 "$runtime"
install -d -o qimao -g qimao -m 0700 "$runtime/tmp"
install -o root -g qimao -m 0440 "$inbound/prepare_request.mjs" "$runtime/prepare_request.mjs"
install -o root -g qima -m 0440 "$inbound/diagnostic_runner.py" "$runtime/diagnostic_runner.py"

systemd-run --quiet --wait --pipe --collect \
  --unit=qimao-ocr-diagnose-1635-prepare \
  --property=User=qimao --property=Group=qimao \
  --property="WorkingDirectory=$release" \
  --property=EnvironmentFile=/etc/qimao-terms-cloud/backend.env \
  --property=EnvironmentFile=/etc/qimao-terms-cloud/object-storage.env \
  --property=EnvironmentFile=/etc/qimao-terms-cloud/screen-text-local-ocr-05d.env \
  --property=EnvironmentFile=/etc/qimao-terms-cloud/local-ocr-frame-extractor-05b.env \
  --setenv="RELEASE_ROOT=$release" --setenv="REQUEST_PATH=$request" \
  --setenv="TMPDIR=$runtime/tmp" \
  /usr/local/bin/node "$runtime/prepare_request.mjs"

[ -f "$request" ] && [ ! -L "$request" ]
[ "$(stat -c '%U:%G:%a' "$request")" = 'qimao:qimao:600' ]
chown qima:qima "$runtime"
chown qima:qima "$request"
chmod 0400 "$request"

systemd-run --quiet --wait --pipe --collect \
  --unit=qimao-ocr-diagnose-1635-engine \
  --property=User=qima --property=Group=qima \
  --property="WorkingDirectory=$runtime" \
  --property=EnvironmentFile=/etc/qimao-terms-cloud/local-ocr-04g-openvino.env \
  --setenv="DIAGNOSTIC_SCRIPT=$runtime/diagnostic_runner.py" \
  --setenv="REQUEST_PATH=$request" \
  /bin/sh -eu -c 'exec "$QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE" "$DIAGNOSTIC_SCRIPT" --request "$REQUEST_PATH"' \
  | tee "$result"

grep -Eq '^diagnostic=(passed|failed) ' "$result"

! ss -H -ltn "sport = :$isolated_port" | grep -q .
isolated_started=1
systemd-run --quiet --collect --unit="${isolated_unit%.service}" \
  --property=User=qima --property=Group=qima \
  --property="WorkingDirectory=/opt/qimao/local-ocr/20260831-local-ocr-geometry-r3/node" \
  --property=EnvironmentFile=/etc/qimao-terms-cloud/local-ocr-04g-openvino.env \
  --setenv="QIMAO_LOCAL_OCR_SIDECAR_HOST=127.0.0.1" \
  /usr/bin/env QIMAO_LOCAL_OCR_SIDECAR_PORT="$isolated_port" \
  /usr/local/bin/node /opt/qimao/local-ocr/20260831-local-ocr-geometry-r3/node/entry.js
for attempt in $(seq 1 50); do
  ss -H -ltn "sport = :$isolated_port" | grep -q . && break
  sleep 0.1
done
ss -H -ltn "sport = :$isolated_port" | grep -q .
statuses=''
for sequence in 1 2 3; do
  status="$(curl --silent --show-error --max-time 90 --output /dev/null \
    --write-out '%{http_code}' --request POST \
    --header 'content-type: application/json' --data-binary "@$request" \
    "http://127.0.0.1:$isolated_port/ocr")"
  [ "$status" = '200' ]
  statuses="${statuses}${statuses:+,}${status}"
done
echo "isolated_http_sequence=passed requests:3 statuses:$statuses concurrency:serial"
systemctl stop "$isolated_unit"
isolated_started=0
[ ! -e "/run/systemd/transient/$isolated_unit" ] || systemctl reset-failed "$isolated_unit" >/dev/null 2>&1 || true

[ "$(systemctl is-active "$screen_unit" 2>/dev/null || true)" = 'inactive' ]
[ "$(systemctl show "$openvino_unit" -p ActiveState --value)" = 'active' ]
[ "$(systemctl show "$openvino_unit" -p NRestarts --value)" = '0' ]
echo 'terminal=passed mode:offline_diagnostic database_write:0 queue_action:0 worker_start:0 cos_write:0'
