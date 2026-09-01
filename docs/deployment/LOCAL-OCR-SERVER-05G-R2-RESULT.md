# LOCAL-OCR-SERVER-05G-R2 结果

```yaml
outcome: rolled_back
slice_outcome: blocked_candidate_start_layout
requires_user: false
next_owner: PLANNING
registration_post: 0
connection_test_post: 0
files:
  - docs/deployment/LOCAL-OCR-SERVER-05G-R2-RESULT.md
residual: 0
```

## 输入与预检

- 复用归档：`C:\Users\ComradeGu\Documents\七猫兼职\local-ocr-05g-r1-20260828010403.tar.gz`
- archive SHA-256：`277a4778e0cef6fff279977ac36c435fa36f713c6b0f7fc6773bfce3f930b58e`
- manifest SHA-256：`2b5c68ec3b7eefb60be23ebb9da7fbb99b1a66e0903536bc9af65693bb6ccd5a`
- payload=346；逐项 manifest hash 校验通过；engine-registry 期望 SHA=`95785dcd739721d50272ae6dcbb761f821d16584ab8c59e60f059da88d367e7b`。
- root-only screen-text env 的 owner/mode 与 `qimao` 读取门通过；旧 R3 backend、上传 Worker、screen-text Worker、OpenVINO active，ONNX inactive/disabled。

## 首错与回滚

- 尝试 release：`/opt/qimao-terms-cloud/releases/20260828-local-ocr-05g-r2-backend-r2`。
- 归档直接解包后实际目录为 `release/payload/backend/dist/...`；既有 `qimao-backend.service` 的 ExecStart 仍要求 `current/backend/dist/server.js`。因此候选 backend 重启在 systemd 进程阶段失败（exit-code），未形成候选 MainPID/cwd/registry resolve 证据。
- 按同一 root 脚本自动恢复 current 至 `/opt/qimao-terms-cloud/releases/20260827-local-ocr-05d-backend-r1`，未发登记或 connection-test POST。
- 最终核验：backend active、health=200、未认证 API=401、`NRestarts=0`；upload-completion/screen-text/OpenVINO active；ONNX inactive/disabled、3101 无监听；connection-test inactive/disabled。
- 候选 release、远端归档、drop-in 与临时文件残留均为 0；静态、Worker（既有）、Nginx、COS、PostgreSQL、业务 route/数据未改动。

## 运行身份门状态

```yaml
backend_mainpid_candidate: not_run
candidate_proc_cwd: not_run
current_engine_registry_sha: not_run
production_screen_text_registry_resolve: not_run
registration_post: 0
connection_test_post: 0
```

## 差口

- `remaining_gap`: 同一归档下一次装配必须把 `payload/` 内容映射到 release 根（使 `current/backend/dist/...` 与既有 unit 一致），并在任何控制面写入前重新通过 MainPID/cwd、engine-registry SHA 与 `screen_text/self_hosted_worker/screen_text_openvino_ppocrv6_small` resolve 门。本切片不重试。
- `rollback_ready=true`；本地归档/staging 与旧 R3 release 保留作审计和恢复输入。
