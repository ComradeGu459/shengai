# ASR-BACK-063-ERROR-CONTRACT

outcome: artifact_written
evidence:
  - business 子进程 blocked 输出已收敛为严格三字段 `component`、`outcome`、`code`；不再输出 `createRecTaskMaximum`、`speechTextEmitted` 或异常正文。
  - runner 继续只接受这三个字段、`business`/`blocked` 和安全大写阶段码，因而不再把合法 business code 泛化为 `BUSINESS_RUN_FAILED`。
  - Worker 结果分类已进入实际 business 分支：`processed=false` 或 `cancelled` → `ASR_CREATE_NOT_ATTEMPTED`（计数 0）；`reconciliation_required` → `ASR_CREATE_UNKNOWN`（调用后未知、计数不可证明）；`completed` → 唯一已完成外部调用事实（计数 1）。
  - `failed` 的 Worker 返回值没有 providerRequestId/effectClass 权威投影，实际分支保守输出 `ASR_CREATE_ACTUAL_NOT_OBSERVABLE`，不猜测是否已创建外部任务。
  - `businessBlockedSummary` 只接受内部 HarnessError 的安全 code，其他错误统一为 `UNEXPECTED_FAILURE`；消息、TaskId、文本、凭据和 provider 原始载荷均不出现在 stderr JSON。
  - 运行 `node deploy/debian/bin/asr-isolated-synthetic-business.mjs --self-test`：exit 0，13 cases passed（含五种 Worker 结果分类、不可观测计数和安全错误投影）。
  - 运行 `pwsh -NoProfile -File deploy/debian/bin/Invoke-TencentAsrSynthetic.ps1 -SelfTest`：exit 0，runner self-test passed（含 business child stage code passthrough）。
  - 运行 `node --check deploy/debian/bin/asr-isolated-synthetic-business.mjs`：exit 0；使用无效运行参数触发真实 top-level catch，stderr 仅为三字段 blocked JSON，exit 1。
remaining_gap:
  - 仓库当前未物化 Vitest 可执行文件（`pnpm exec vitest ...` 返回 command not found），因此没有额外 harness 专项测试文件可运行；本轮仅执行脚本内置 self-test 与 Node 语法门。
  - 未连接服务器、COS、腾讯 API、数据库或 Secret；未执行下一次 synthetic 重放。
next_owner: PLANNING
files:
  - deploy/debian/bin/Invoke-TencentAsrSynthetic.ps1
  - deploy/debian/bin/asr-isolated-synthetic-business.mjs
  - docs/backend/ASR-BACK-063-ERROR-CONTRACT.md
residual: 0（本轮无外部动作、无临时文件、无数据库/COS/Tencent 状态）
requires_user: false
