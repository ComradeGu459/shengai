# TERM-CURRENT-BASELINE-RESTORE-SERVER-63

- artifact_written: true
- outcome: blocked
- evidence:
  - task: `TERM-CURRENT-BASELINE-RESTORE-SERVER-63`
  - local_node: `v24.19.0`
  - frozen_input_archive: `9471776 bytes / 020437197f6fef783fa04a1789ba727cf293a152d140b38630122a9677c3b925`
  - frozen_input_manifest: `3000555 bytes / 61372755bb1ac1a6bbe22aaf57ea98bd0a5afba78f44c4ff3b508dc615ec6f07`
  - frozen_input_audit: `1190 bytes / 0f03a1de65ed6b93ae11a05c6abe95d60c8d2de4ea9e3830ef0c706663d5bcff`
  - manifest_checker: `passed; schema/candidateId/archive bytes+SHA/files uniqueness and safe relative paths/summary passed; archive members=15024; listed files=12350`
  - manifest_checker_sha: `4518 bytes / 0aa038f4443088296d02bdad0ff163712d62dca30201aedd1e74d9de434de533`
  - restore_runner_sha: `8765 bytes / 08452e0ec4ad6a8a90bb3330242a0655e24226e4104ea01efd91c2e7520ef69f`
  - local_syntax: `manifest-check.mjs node --check=0; restore-runner.sh Git Bash --noprofile --norc -n=0`
  - local_text: `manifest-check.mjs CR=0; restore-runner.sh CR=0; forbidden jq/node -e/require/WindowsPowerShell/Invoke-Expression/static=/opt path scan=0`
  - transfer_setup: `attempted once via qimao-test-server; fixed path=/var/tmp/qimao-term-current-baseline-restore-63-transfer`
  - first_failure: `ssh: connect to host 103.36.63.67 port 22: Permission denied`
  - remote_effects: `authenticated remote command=0; transfer directory creation=0; SCP=0; transient=0; archive extraction=0; release rename=0; current/static mutation=0; unit restart=0; DeepSeek/COS/Tencent/business API=0`
  - prior_readonly_baseline: `SERVER-62 recorded current as a dangling symlink to /opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1 with target absent, static target /srv/qimao-terms-cloud/system-frontend-term-provider-usage-20260830-r1, health=200, and all four units active/running/NRestarts=0/ExecMainStatus=0; no new SERVER-63 Step0 read was possible after SSH authentication failure`
  - local_cleanup: `the exact SERVER-63 temporary runner/checker directory was removed after evidence capture`
- remaining_gap: `the fixed transfer path could not be created because the configured qimao-test-server SSH authentication was rejected; the release target remains unrestored and SERVER-63 did not reach the remote Step0 or root staging gates`
- next_owner: `PLANNER to schedule the same frozen restore path; SERVER-64 SSH probe passed`
- residual: `no authenticated SERVER-63 transfer/stage/status/transient residue is known; production current/static/env/Secret/DB/route/units were not changed by SERVER-63; prior missing immutable release target remains`
- requires_user: false

## SERVER-64 SSH只读探针

- artifact_written: true
- outcome: passed
- command: `ssh.exe -F deploy/ssh/qimao-test-server.conf qimao-test-server id -un`
- connection_count: `1`
- process_launch_exit: `0; process started`
- ssh_process_exit: `0`
- tcp_connect_exit: `0; classification=connected`
- ssh_auth_exit: `0; classification=authenticated`
- stdout_exact: `qimao-deploy`
- stderr_safe_class: `none`
- remote_effects: `read-only id -un only; mkdir/install/touch/rm/SCP/sudo/transient/restore/restart/DB/Secret/Provider/COS/Tencent/business API=0`
- evidence_boundary: `one existing SSH process was used; no separate TCP/auth process or diagnostic command was launched`
- remaining_gap: `SERVER-63 restore was not replayed; the immutable release target remains unrestored`
- next_owner: `PLANNER`
- residual: `no SERVER-64 transfer/status/stage/transient residue; SERVER-63 prior residual state is unchanged`
- requires_user: false
