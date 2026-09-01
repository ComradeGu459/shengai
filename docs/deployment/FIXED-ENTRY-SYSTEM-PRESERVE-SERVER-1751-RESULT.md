artifact_written: true

# FIXED-ENTRY-SYSTEM-PRESERVE-SERVER-1751

## outcome

```yaml
outcome: artifact_written
slice_outcome: fixed_contract_extended_and_validated
release_id: fixed-entry-system-preserve-server-1751
server_connections: 0
remote_transfers: 0
database_writes: 0
service_restarts: 0
fixed_entry_executions: 0
next_owner: 规划
residual: 0
requires_user: false
```

已在既有 fixed validator/runner 上增加独立的 `systemStatic.mode=preserve` 合同。preserve 要求 canonical `expectedTarget`，规范化 old/next 为同一目标，并严格省略 `previousSystemStaticTarget`、`systemStaticMarkers` 与 `system-static/` 归档根；replace、legacy v1/v2 和员工 static preserve/replace 组合保持兼容。

runner 的管理员站 preserve 路径只执行同一固定 symlink guard：不创建 system stage/new/.next、不切换指针、不置 `system_static_created`/`system_static_switched`，并在 baseline、candidate、switch、rollback、post-switch、final cleanup 逐点复核旧指针。归档闭集按员工/system 两个 mode 精确派生。

## files

| 文件 | 字节数 | SHA256 |
|---|---:|---|
| `deploy/debian/bin/application-release-declaration.mjs` | 26901 | `A3748E2A5A861FAA74C5ADF0DAD0A3DC5B5C65BC1270AA79BA83E749AE2BC3DF` |
| `deploy/debian/bin/qimao-application-release` | 45743 | `D86A8907A8D4E5E9ADD9737158F2A62D4D0FA7937E1F56CA59A112694E6A7911` |

## evidence

- `node --check deploy/debian/bin/application-release-declaration.mjs`：通过。
- validator self-test：`{"outcome":"passed","cases":46,"schemas":["qimao.application-release/v1","qimao.application-release/v2"]}`。
- `D:/Git/bin/bash.exe -n deploy/debian/bin/qimao-application-release`：通过。
- runner self-test（`MSYS=winsymlinks:sys`）：`runner_self_test=passed cases=28 statuses=401,403 employee=replace,preserve system_static=replace,preserve preserve_rollback=guarded`。
- 既有 1736/1721/1725/1726/1744 declaration 均通过 validator；legacy v1/v2 emit 兼容性通过。

本轮只修改上述两个 fixed 文件并写入本结果文档；没有连接 qimao-test-server、上传、安装、发布、迁移、重启或业务源码改动。后续发布候选需由规划任务另行冻结五件套并按新合同执行。
