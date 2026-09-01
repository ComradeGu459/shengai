# LOCAL-OCR-SERVER-05G-AUDIT2

```yaml
outcome: blocked_archive_not_self_contained
requires_user: false
next_owner: PLANNING
residual: 0
```

## R3 bounded journal 首错

- 查询窗口：`2026-08-28 01:30:00`–`01:35:00 Asia/Shanghai`，仅查询 `qimao-backend.service`。
- 首条 Node/systemd 稳定错误：`2026-08-28T01:33:02.517257+08:00`，`unit=init.scope`、`pid=1`，`qimao-backend.service: Main process exited, code=exited, status=1/FAILURE`。
- 随后重复出现 `Failed with result 'exit-code'`；bounded journal 未保存 Node exception、模块名或 stack，故 `node_error_detail=unavailable`。未扩大窗口、未重启、未 reset counter。

## 当前可运行 R3 runtime（只读）

- `current`：`/opt/qimao-terms-cloud/releases/20260827-local-ocr-05d-backend-r1`。
- backend unit：`User=qimao`、`Group=qimao`、`Restart=on-failure`、`ExecStart=/usr/local/bin/node --preserve-symlinks-main /opt/qimao-terms-cloud/current/backend/dist/server.js`；EnvironmentFile basenames 为 `backend.env`、`object-storage.env`、`screen-text-local-ocr-05d.env`、`local-ocr-frame-extractor-05b.env`；drop-in 为 `05d-local-ocr.conf`。
- 当前进程 cwd 解析到上述旧 release；`backend/dist/server.js` 存在。当前 health=200、未认证 API=401；`NRestarts=11`（保留原值，未清零）。
- 当前 release 存在 `package.json`、`backend/package.json`、`packages/contracts/package.json`；`current/node_modules` 与 `current/backend/node_modules` 均为 root:qimao 0750 目录（分别有 4、9 个直接子项）。
- 三份关键 env 均为 root:qimao 0640，且 `qimao` 可读；本轮未读取值。

## 同一 05G archive 闭包对比

- archive：`C:\Users\ComradeGu\Documents\七猫兼职\local-ocr-05g-r1-20260828010403.tar.gz`，SHA-256=`277a4778e0cef6fff279977ac36c435fa36f713c6b0f7fc6773bfce3f930b58e`；manifest SHA=`2b5c68ec3b7eefb60be23ebb9da7fbb99b1a66e0903536bc9af65693bb6ccd5a`。
- tar 清单 `node_modules` 条目数为 0；package metadata 仅有 `payload/package.json`、`payload/pnpm-lock.yaml`、`payload/pnpm-workspace.yaml`。
- tar 清单没有 `payload/backend/package.json` 或 `payload/packages/contracts/package.json`；虽有 `payload/backend/dist/server.js`，但没有随包提供当前 release 运行所依赖的 node_modules/完整 package metadata。
- 结论：`archive_self_contained=false`。当前可运行 release 的依赖目录和额外 package metadata 是服务器外置闭包，不在该 archive 内；R3 候选按 archive 直接提升后无法保证 Node 依赖解析。

## 裁决

```yaml
direct_cause: archive_runtime_closure_missing
candidate_runtime_loaded: unknown
server_write: none
```

证据链是：archive 缺失 node_modules/后端与 contracts package metadata → R3 候选启动后首个稳定事实为 backend Main process exit 1 → systemd `Restart=on-failure` 造成 `NRestarts=11`。由于 bounded journal 没有 Node 原始异常，不能进一步声称具体缺失包名。

## remaining_gap / next step

- `remaining_gap`：后续 immutable release 必须自包含可复现的 backend runtime closure（或显式、版本化且与 archive 绑定的外置依赖快照），并在切换前以同一服务身份做纯离线模块解析；当前 archive 不满足该门。
- 唯一 `next_owner=PLANNING`：先裁决新的闭包/归档契约，再另立发布任务；本审计不猜补丁、不重放。
- 本轮服务器无写入，候选/临时无残留，旧服务与历史 release 保留。
