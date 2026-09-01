# TENCENT-ASR-BACK-081-STAGE-CODE

outcome: artifact_written
evidence:
  - `runStage()` 现在仅对 `requestJson` 产生的 `API_GATE_FAILED` 做阶段投影，例如 `TERMS_API_GATE_FAILED`；其他 HarnessError 原码保持不变。
  - 投影只输出稳定阶段码，不携带 URL、ID、HTTP 正文、Secret 或异常消息。
  - self-test 覆盖 `TERMS_API_GATE_FAILED` 映射、未知异常阶段码和原有 contract_sweep。
  - `node --check deploy/debian/bin/asr-isolated-synthetic-business.mjs`：exit 0。
  - `node deploy/debian/bin/asr-isolated-synthetic-business.mjs --self-test`：exit 0，全部 24 cases passed。
  - `pwsh -NoProfile -File deploy/debian/bin/Invoke-TencentAsrSynthetic.ps1 -SelfTest`：exit 0。
  - `git diff --check`（目标文件）：exit 0。
remaining_gap: 未连接服务器、COS、腾讯 API、数据库或 Secret；未执行远端 synthetic。
next_owner: PLANNING
