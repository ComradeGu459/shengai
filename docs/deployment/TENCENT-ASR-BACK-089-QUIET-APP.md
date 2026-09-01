# TENCENT-ASR-BACK-089-QUIET-APP

outcome: artifact_written
evidence:
  - synthetic business harness 保持 production 环境完成 ASR Registry 装配，仅在 createApp() 构造期间临时切换 NODE_ENV=test，并以 finally 恢复原值。
  - self-test 覆盖 createApp 成功与抛错两条路径：调用期间为 test，返回/抛错后均恢复 production。
  - 未修改 release app.js、Provider、Worker、数据库、COS 或 runner 解析逻辑。
validation:
  - node --check deploy/debian/bin/asr-isolated-synthetic-business.mjs：通过。
  - node deploy/debian/bin/asr-isolated-synthetic-business.mjs --self-test：通过（26 cases）。
  - Invoke-TencentAsrSynthetic.ps1 -SelfTest：通过。
  - 允许文件限定 git diff --check：通过。
remaining_gap: 未连接服务器、COS、腾讯 API、数据库或 Secret；未部署。
next_owner: PLANNING
