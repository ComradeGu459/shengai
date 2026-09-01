# TENCENT-ASR-BACK-093-QUIET-MIGRATION

outcome: artifact_written
evidence:
  - 仅在导入 release `database/migrate.js` 期间临时替换 `console.log`/`console.info`，并在成功或异常后 finally 恢复。
  - `console.warn`/`console.error` 未被静默；迁移异常与稳定阶段码保持原语义。
  - self-test 覆盖成功与抛错路径，验证四个 console 方法均恢复。
validation:
  - `node --check deploy/debian/bin/asr-isolated-synthetic-business.mjs`：通过。
  - `node deploy/debian/bin/asr-isolated-synthetic-business.mjs --self-test`：通过。
  - `Invoke-TencentAsrSynthetic.ps1 -SelfTest`：通过。
  - 允许文件限定 `git diff --check`：通过。
remaining_gap: 未连接服务器、数据库、COS、腾讯 API 或 Secret，未部署。
next_owner: PLANNING
