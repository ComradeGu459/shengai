#!/bin/bash
set -Eeuo pipefail
umask 077

inbound="${1-}"
transfer="${2-}"
runtime_directory='/run/qimao-ai-recovery-1616-loader'
expected_transfer="$runtime_directory/transfer"

if [ "$inbound" != '/var/tmp/qimao-ai-recovery-1616-inbound' ] \
  || [ "$transfer" != "$expected_transfer" ]; then
  echo 'loader_input_gate=failed code=PATH_ARGUMENT_INVALID'
  exit 64
fi

if [ "$EUID" -ne 0 ]; then
  echo 'loader_input_gate=failed code=ROOT_REQUIRED'
  exit 64
fi
if [ "${RUNTIME_DIRECTORY-}" != "$runtime_directory" ]; then
  echo 'loader_input_gate=failed code=RUNTIME_DIRECTORY_ENV_INVALID'
  exit 64
fi
if [ ! -d "$runtime_directory" ] || [ -L "$runtime_directory" ] \
  || [ "$(stat -c '%U:%G:%a' "$runtime_directory")" != 'root:root:700' ]; then
  echo 'loader_input_gate=failed code=RUNTIME_DIRECTORY_IDENTITY_INVALID'
  exit 64
fi
if [ "$(find "$runtime_directory" -mindepth 1 -maxdepth 1 | wc -l)" != '0' ]; then
  echo 'loader_input_gate=failed code=RUNTIME_DIRECTORY_NOT_EMPTY'
  exit 64
fi

archive="$inbound/ai-recovery-1607-r1.tar.gz"
manifest="$inbound/ai-recovery-1607-r1.manifest.json"
audit="$inbound/ai-recovery-1607-r1.sha256.audit"
runner_source="$inbound/runner.sh"
preflight_source="$inbound/preflight.mjs"
retry_source="$inbound/retry.mjs"
checksums_source="$inbound/SHA256SUMS"

if [ ! -d "$inbound" ] || [ -L "$inbound" ] \
  || [ "$(stat -c '%U:%G:%a' "$inbound")" != 'qimao-deploy:qimao-deploy:700' ] \
  || [ "$(find "$inbound" -mindepth 1 -maxdepth 1 | wc -l)" != '7' ] \
  || [ "$(find "$inbound" -mindepth 1 -maxdepth 1 -type f | wc -l)" != '7' ]; then
  echo 'loader_input_gate=failed code=INBOUND_DIRECTORY_IDENTITY_INVALID'
  exit 64
fi
for file in "$archive" "$manifest" "$audit" "$runner_source" \
  "$preflight_source" "$retry_source" "$checksums_source"; do
  if [ ! -f "$file" ] || [ -L "$file" ] \
    || [ "$(stat -c '%U:%G:%a' "$file")" != 'qimao-deploy:qimao-deploy:600' ]; then
    echo 'loader_input_gate=failed code=INBOUND_FILE_IDENTITY_INVALID'
    exit 64
  fi
done

if [ "$(stat -c '%s' "$archive")" != '10270355' ] \
  || [ "$(stat -c '%s' "$manifest")" != '2130' ] \
  || [ "$(stat -c '%s' "$audit")" != '1164' ] \
  || [ "$(stat -c '%s' "$runner_source")" != '18198' ] \
  || [ "$(stat -c '%s' "$preflight_source")" != '6582' ] \
  || [ "$(stat -c '%s' "$retry_source")" != '12445' ] \
  || [ "$(stat -c '%s' "$checksums_source")" != '232' ]; then
  echo 'loader_input_gate=failed code=INBOUND_BYTES_INVALID'
  exit 64
fi
if [ "$(sha256sum "$archive" | cut -d' ' -f1)" != \
  'b2f5bbc158eb0ce51e4238556043182d34b80fa7b15d023e91401e3547bf0c9b' ] \
  || [ "$(sha256sum "$manifest" | cut -d' ' -f1)" != \
  'fde9291ef0de981c6e65e0ef0e020c572119ca6e04225950e6cce50488337e38' ] \
  || [ "$(sha256sum "$audit" | cut -d' ' -f1)" != \
  '8517f6f442b29ab8ea994c807d0e1888e9f6f2216df75ee2a7d7a1f0f87e98fc' ] \
  || [ "$(sha256sum "$runner_source" | cut -d' ' -f1)" != \
  'b48390073bf4dc8a5117b7fb69491861fd3bd51a914aa63ba029193d33bc7a96' ] \
  || [ "$(sha256sum "$preflight_source" | cut -d' ' -f1)" != \
  '0001ed941c76311de3192f455553413e53a7a753cb8ad343d2f53913a6f937c9' ] \
  || [ "$(sha256sum "$retry_source" | cut -d' ' -f1)" != \
  'de97eb5725070be4159da828aa7f03cb155fb738704d45e4a8a7e6821cd9ba4e' ] \
  || [ "$(sha256sum "$checksums_source" | cut -d' ' -f1)" != \
  '39d3e94d15273eee907f4e5e6f554894fa82dd13d9e82b5c0d28c15f60bc3dd7' ]; then
  echo 'loader_input_gate=failed code=INBOUND_SHA_INVALID'
  exit 64
fi
(cd "$inbound" && sha256sum --strict -c SHA256SUMS >/dev/null) || {
  echo 'loader_input_gate=failed code=INBOUND_SHA_CLOSURE_INVALID'
  exit 64
}

if [ -e "$transfer" ] || [ -L "$transfer" ]; then
  echo 'loader_input_gate=failed code=TRANSFER_ALREADY_EXISTS'
  exit 64
fi
mkdir --mode=0700 -- "$transfer"
chown root:root "$transfer"
chmod 0700 "$transfer"
install -o root -g root -m 0600 "$archive" "$transfer/ai-recovery-1607-r1.tar.gz"
install -o root -g root -m 0600 "$manifest" "$transfer/ai-recovery-1607-r1.manifest.json"
install -o root -g root -m 0600 "$audit" "$transfer/ai-recovery-1607-r1.sha256.audit"
install -o root -g root -m 0700 "$runner_source" "$transfer/runner.sh"
install -o root -g root -m 0600 "$preflight_source" "$transfer/preflight.mjs"
install -o root -g root -m 0600 "$retry_source" "$transfer/retry.mjs"
install -o root -g root -m 0600 "$checksums_source" "$transfer/SHA256SUMS"

/bin/bash -n "$transfer/runner.sh"
if [ "$(stat -c '%U:%G:%a' "$runtime_directory")" != 'root:root:700' ] \
  || [ "$(find "$runtime_directory" -mindepth 1 -maxdepth 1 | wc -l)" != '1' ] \
  || [ ! -d "$transfer" ] || [ -L "$transfer" ] \
  || [ "$(stat -c '%U:%G:%a' "$transfer")" != 'root:root:700' ] \
  || [ "$(find "$transfer" -mindepth 1 -maxdepth 1 | wc -l)" != '7' ] \
  || [ "$(find "$transfer" -mindepth 1 -maxdepth 1 -type f | wc -l)" != '7' ]; then
  echo 'loader_post_copy_gate=failed code=TRANSFER_DIRECTORY_IDENTITY_INVALID'
  exit 64
fi
for file in ai-recovery-1607-r1.tar.gz ai-recovery-1607-r1.manifest.json \
  ai-recovery-1607-r1.sha256.audit preflight.mjs retry.mjs SHA256SUMS; do
  if [ ! -f "$transfer/$file" ] || [ -L "$transfer/$file" ] \
    || [ "$(stat -c '%U:%G:%a' "$transfer/$file")" != 'root:root:600' ]; then
    echo 'loader_post_copy_gate=failed code=TRANSFER_FILE_IDENTITY_INVALID'
    exit 64
  fi
done
if [ ! -f "$transfer/runner.sh" ] || [ -L "$transfer/runner.sh" ] \
  || [ "$(stat -c '%U:%G:%a' "$transfer/runner.sh")" != 'root:root:700' ]; then
  echo 'loader_post_copy_gate=failed code=TRANSFER_RUNNER_IDENTITY_INVALID'
  exit 64
fi
if [ "$(stat -c '%s' "$transfer/ai-recovery-1607-r1.tar.gz")" != '10270355' ] \
  || [ "$(stat -c '%s' "$transfer/ai-recovery-1607-r1.manifest.json")" != '2130' ] \
  || [ "$(stat -c '%s' "$transfer/ai-recovery-1607-r1.sha256.audit")" != '1164' ] \
  || [ "$(stat -c '%s' "$transfer/runner.sh")" != '18198' ] \
  || [ "$(stat -c '%s' "$transfer/preflight.mjs")" != '6582' ] \
  || [ "$(stat -c '%s' "$transfer/retry.mjs")" != '12445' ] \
  || [ "$(stat -c '%s' "$transfer/SHA256SUMS")" != '232' ]; then
  echo 'loader_post_copy_gate=failed code=TRANSFER_BYTES_INVALID'
  exit 64
fi
if [ "$(sha256sum "$transfer/ai-recovery-1607-r1.tar.gz" | cut -d' ' -f1)" != \
  'b2f5bbc158eb0ce51e4238556043182d34b80fa7b15d023e91401e3547bf0c9b' ] \
  || [ "$(sha256sum "$transfer/ai-recovery-1607-r1.manifest.json" | cut -d' ' -f1)" != \
  'fde9291ef0de981c6e65e0ef0e020c572119ca6e04225950e6cce50488337e38' ] \
  || [ "$(sha256sum "$transfer/ai-recovery-1607-r1.sha256.audit" | cut -d' ' -f1)" != \
  '8517f6f442b29ab8ea994c807d0e1888e9f6f2216df75ee2a7d7a1f0f87e98fc' ] \
  || [ "$(sha256sum "$transfer/runner.sh" | cut -d' ' -f1)" != \
  'b48390073bf4dc8a5117b7fb69491861fd3bd51a914aa63ba029193d33bc7a96' ] \
  || [ "$(sha256sum "$transfer/preflight.mjs" | cut -d' ' -f1)" != \
  '0001ed941c76311de3192f455553413e53a7a753cb8ad343d2f53913a6f937c9' ] \
  || [ "$(sha256sum "$transfer/retry.mjs" | cut -d' ' -f1)" != \
  'de97eb5725070be4159da828aa7f03cb155fb738704d45e4a8a7e6821cd9ba4e' ] \
  || [ "$(sha256sum "$transfer/SHA256SUMS" | cut -d' ' -f1)" != \
  '39d3e94d15273eee907f4e5e6f554894fa82dd13d9e82b5c0d28c15f60bc3dd7' ]; then
  echo 'loader_post_copy_gate=failed code=TRANSFER_SHA_INVALID'
  exit 64
fi
(cd "$transfer" && sha256sum --strict -c SHA256SUMS >/dev/null) || {
  echo 'loader_post_copy_gate=failed code=TRANSFER_SHA_CLOSURE_INVALID'
  exit 64
}

rm -f -- "$archive" "$manifest" "$audit" "$runner_source" \
  "$preflight_source" "$retry_source" "$checksums_source"
rmdir -- "$inbound"
if [ -e "$inbound" ] || [ -L "$inbound" ]; then
  echo 'loader_handoff=failed code=INBOUND_CLEANUP_FAILED'
  exit 64
fi

echo 'loader_handoff=verified runtime_directory=managed inbound=absent transfer=ready'
exec /bin/bash "$transfer/runner.sh" "$transfer"
