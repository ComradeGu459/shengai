# TENCENT-ASR-BACK-106-ACCEPTED-FAILURE-CODE

outcome: artifact_written
evidence:
  - persisted fact 分类保持 unknown/reconciliation 最高优先；即使存在 providerRequestId，只要有 unknown 证据仍返回 external_unknown。
  - 同一 attempt 存在 providerRequestId、status=failed 且 errorCode 为安全大写码时，投影为 `accepted_failed`、该稳定码与 externalCreateCount=1。
  - 缺失或非法 errorCode 不会伪造 accepted_failed；TaskId/detail/text/object key 不进入输出。
validation:
  - business harness `node --check`：通过。
  - business `--self-test`：通过（含 accepted_failed、unknown 优先及非法码回归）。
  - runner `-SelfTest`：通过。
  - 限定 `git diff --check`：通过。
remaining_gap: 未访问服务器、COS、腾讯 API、数据库、Secret 或媒体。
next_owner: PLANNING
