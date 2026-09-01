# TENCENT-ASR-BACK-087-BUDGET-CAPABILITY

outcome: artifact_written
evidence:
  - `SYSTEM_CAPABILITIES` 仅保留权威 `budget:read`、`budget:write`、`budget:publish`，删除 `system-control:budget:*` 别名。
  - business self-test 精确断言三项权威 capability 存在且错误别名不存在，并保留原 contract_sweep。
  - `node --check deploy/debian/bin/asr-isolated-synthetic-business.mjs`：exit 0。
  - `node deploy/debian/bin/asr-isolated-synthetic-business.mjs --self-test`：exit 0，26 cases passed。
  - `pwsh -NoProfile -File deploy/debian/bin/Invoke-TencentAsrSynthetic.ps1 -SelfTest`：exit 0。
  - 目标文件限定 `git diff --check`：exit 0。
remaining_gap: 未连接服务器、COS、腾讯 API、数据库或 Secret。
next_owner: PLANNING
