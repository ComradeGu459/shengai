# TENCENT-ASR-BACK-083-FINGERPRINT

outcome: artifact_written
evidence:
  - business harness 清单 fingerprint 统一由 `relativePath|sizeBytes|lastModifiedMs` 生成，SRT 与 MP4 均使用该值。
  - `createUpload` 已显式分离 `fileFingerprint`（清单元数据）与 `checksumValue`（实际 SHA-256）；authorize 仅发送前者，create/confirm 使用后者。
  - self-test 保留全部 contract_sweep，并新增 SRT/MP4 指纹合法性及身份不混用断言。
  - `node --check deploy/debian/bin/asr-isolated-synthetic-business.mjs`：exit 0。
  - `node deploy/debian/bin/asr-isolated-synthetic-business.mjs --self-test`：exit 0，全部 24 cases passed。
  - `pwsh -NoProfile -File deploy/debian/bin/Invoke-TencentAsrSynthetic.ps1 -SelfTest`：exit 0。
  - 目标文件限定 `git diff --check`：exit 0。
remaining_gap: 未连接服务器、COS、腾讯 API、数据库或 Secret；未执行远端 synthetic。
next_owner: PLANNING
