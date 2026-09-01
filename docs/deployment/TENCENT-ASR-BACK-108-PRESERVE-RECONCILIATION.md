# TENCENT-ASR-BACK-108-PRESERVE-RECONCILIATION

outcome: artifact_written
evidence:
  - business 在 `ASR_TASK_ACCEPTED`/`ASR_CREATE_UNKNOWN` 时保留同一 batch、COS source、隔离 DB/root，仅清理本地派生媒体；accepted_failed/terminal/completed 仍走原精确清理。
  - runner 识别上述稳定码后跳过远端 database/root cleanup，输出 reconciliation preservation 与 runId；不输出 TaskId、对象键、Secret 或文本。
  - R1 修正 business finally 按 reconciliationPreserved 条件跳过 cancel batch/dispatch 与 COS 删除；self-test 输出新增 `reconciliation_preserved`、`reconciliation_terminal_cleanup` 两个 case，并覆盖两类清理。
  - runner catch fallback 始终包含 reconciliation preservation 字段，避免 StrictMode 二次异常遮蔽首因。
validation:
  - business Node `--check`、`--self-test`：通过。
  - PowerShell runner `-SelfTest`：通过。
  - 限定 `git diff --check`：通过。
remaining_gap: 未连接服务器、COS、腾讯 API、数据库或 Secret；未自动重发外部命令。
next_owner: PLANNING
