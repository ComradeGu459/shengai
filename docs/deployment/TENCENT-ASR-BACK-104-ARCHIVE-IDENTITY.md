# TENCENT-ASR-BACK-104-ARCHIVE-IDENTITY

outcome: artifact_written
evidence:
  - 默认旧 archive path 自动绑定冻结 SHA `e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30`。
  - 显式其他 ArchivePath 必须提供 64 位小写 expected SHA；实际 SHA 严格相等，否则 fail-closed。
  - Preflight/Execute 计划同时携带 archive path、expected SHA 与 actual SHA。
validation:
  - PowerShell 解析/AST 检查：通过。
  - `Invoke-TencentAsrSynthetic.ps1 -SelfTest`：通过，覆盖默认、新包、缺失、错误及格式错误场景。
  - 允许文件限定 `git diff --check`：通过。
remaining_gap: 未访问服务器、COS、腾讯 API、Secret 或媒体；未执行外部动作。
next_owner: PLANNING
