# TENCENT-ASR-BACK-085-BUDGET-CODE

outcome: artifact_written
evidence:
  - 预算 create/test/impact/approve/publish 均使用固定 gate label：`CREATE`、`TEST`、`IMPACT`、`APPROVE`、`PUBLISH`，并映射为对应 `BUDGET_<SUBSTAGE>_*` 阶段。
  - 非预期状态仅在响应 `error.code` 通过既有安全大写码规则且组合码仍在长度边界内时投影为 `BUDGET_<SUBSTAGE>_API_<ERROR_CODE>`；否则保留 `<SUBSTAGE>_API_GATE_FAILED`。
  - 投影错误不携带路径、ID、响应体、message、Secret；预算 payload、状态机、重试与 Provider 未改变。
  - `node --check deploy/debian/bin/asr-isolated-synthetic-business.mjs`：exit 0。
  - `node deploy/debian/bin/asr-isolated-synthetic-business.mjs --self-test`：exit 0，25 cases passed（含预算错误投影与原 contract_sweep）。
  - `pwsh -NoProfile -File deploy/debian/bin/Invoke-TencentAsrSynthetic.ps1 -SelfTest`：exit 0。
  - 目标文件限定 `git diff --check`：exit 0。
remaining_gap: 未连接服务器、COS、腾讯 API、数据库或 Secret；未执行远端 synthetic。
next_owner: PLANNING
