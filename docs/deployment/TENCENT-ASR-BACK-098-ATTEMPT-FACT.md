# TENCENT-ASR-BACK-098-ATTEMPT-FACT

outcome: artifact_written
evidence:
  - business harness 在 AsrWorker 返回 failed、reconciliation_required 或抛错时，于隔离 DB 清理前按同一 project/batch GET 权威详情。
  - 仅使用 attempt/job/budget reservation 的布尔/状态事实分类为 pre-execution、accepted 或 external_unknown；unknown 证据优先于 providerRequestId。
  - pre-execution 终态仅投影既有安全大写 errorCode；不输出 TaskId、正文、对象键、Secret。
  - accepted 仅由持久 providerRequestId 存在证明；未知结果只保留同身份对账并硬停，绝不自动重发。
validation:
  - `node --check deploy/debian/bin/asr-isolated-synthetic-business.mjs`：通过。
  - `node deploy/debian/bin/asr-isolated-synthetic-business.mjs --self-test`：通过（含持久事实分类回归）。
  - `Invoke-TencentAsrSynthetic.ps1 -SelfTest`：通过。
  - 允许文件限定 `git diff --check`：通过。
remaining_gap: 未连接服务器、COS、腾讯 API、数据库或 Secret；未执行真实业务 synthetic。
next_owner: PLANNING
