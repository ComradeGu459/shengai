# LOCAL-OCR-SERVER-05G-R3 结果

```yaml
outcome: rolled_back
slice_outcome: blocked_candidate_start
requires_user: false
next_owner: PLANNING
registration_post: 0
connection_test_post: 0
files:
  - docs/deployment/LOCAL-OCR-SERVER-05G-R3-RESULT.md
residual: candidate_and_temp=0; backend_nrestarts=11
```

## 归档布局与硬门

- 复用同一归档，未重建/改代码：
  - archive SHA-256：`277a4778e0cef6fff279977ac36c435fa36f713c6b0f7fc6773bfce3f930b58e`
  - manifest SHA-256：`2b5c68ec3b7eefb60be23ebb9da7fbb99b1a66e0903536bc9af65693bb6ccd5a`
- 先解到 `/opt/qimao-terms-cloud/releases/.stage-local-ocr-05g-r3-20260828010403`，逐项 `payload/...` hash 校验通过；随后将 `payload/` 本身原子提升为 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-05g-r3-backend-r3`，未形成 `release/payload/...`。
- `<release>/backend/dist/server.js`、engine-registry、connection-test entry 均存在；stage 与提升后文件权限按既有 root:qimao 最小权限设置。

## 首错、自动回滚与最终状态

- 候选切换后 backend 未能稳定启动，统一脚本在启动/健康身份门前失败并触发 `Restart=on-failure` 重启循环；systemd 只读证据为 `NRestarts=11`、多次 `exit-code`，未保留可安全归因的 Node 原始正文。
- `registration_post=0`、`connection_test_post=0`；未创建 deployment/version/testRun，也未访问 COS、真实素材或业务 DB。
- 已恢复 current 至 `/opt/qimao-terms-cloud/releases/20260827-local-ocr-05d-backend-r1`，health=200、未认证 API=401；upload-completion、screen-text、OpenVINO active，ONNX inactive/disabled、3101 无监听；connection-test inactive/disabled。
- 候选 release、stage、远端归档、R3 drop-in 与临时文件均已精确清理；静态、Nginx、COS、数据库及既有配置未改动。

## 运行身份门

```yaml
candidate_mainpid: not_run
candidate_proc_cwd: not_run
current_engine_registry_sha: not_run
production_screen_text_registry_resolve: not_run
```

## 差口

- `remaining_gap`: 归档布局修正已生效，但候选 backend 仍在启动阶段失败；允许的日志仅证明 systemd exit-code/restart loop，无法安全区分依赖、环境或运行时错误。不得在本切片继续重试。
- `rollback_ready=true`；旧 R3 release 保留。当前唯一异常是旧 backend 的累计 `NRestarts=11`（服务 active 且 health=200），应由规划决定下一步只读根因审计或新的受控发布任务。
