# SYSTEM-LIVE-SERVER-02R｜runtime snapshot 部署资产

本资产只定义管理员控制台的四资源只读快照，不执行线上安装、启用、重启、数据库写入或腾讯 COS 请求。快照缺失或失效时，真实 provider 返回空目录/`unknown`，不得用静态常量冒充实时指标。

## 唯一契约

快照必须与 `backend/src/modules/system-control/system-control.runtime.snapshot-provider.ts` 的解析器一致，并由 `packages/contracts/src/system-control-runtime.ts` 定义类型：

- 顶层只允许 `schemaVersion`、`environment`、`observedAt`、`expiresAt`、`resources`；`schemaVersion=1`、`environment=development`。
- resource 只允许 `runtimeResourceId`、`environment`、`kind`、`displayName`、`identity`、`routingScope`、`telemetry`。
- `identity` 只允许 `capability`、`executionKind`、`provider`、`adapterKey`、`model`；基础设施资源的 `capability`/`model` 为 `null`，`routingScope` 为 `null`。
- `telemetry` 只允许 `status`、`observedAt`、`reasonCode`、`cpuPercent`、`gpuPercent`、`memoryBytes`、`storageBytes`、`databaseConnections`、`processCount`。不可观测字段保持 `null`，状态只用 `fresh`、`partial`、`unknown`。

## 资源身份与权威来源

| runtimeResourceId | kind | identity.provider / adapterKey | 权威来源 |
| --- | --- | --- | --- |
| `runtime:backend-api` | `application` | `qimao` / `qimao-backend.service` | backend systemd、loopback health/API |
| `runtime:upload-completion-worker` | `worker` | `qimao` / `qimao-upload-completion-worker.service` | Worker systemd |
| `runtime:postgresql:15-main` | `database` | `postgresql` / `postgresql@15-main.service` | PostgreSQL systemd、`pg_isready`、`pg_stat_database` |
| `runtime:tencent-cos:milaidi-upload-1310313248` | `storage` | `tencent-cos` / `browser_direct` | root-only object-storage env；本轮不做供应商请求 |

ID 不包含 PID、IP、临时 release 或请求身份；环境沿用契约的 `development` 枚举。

## 采集、失效与权限

- collector：`deploy/debian/bin/qimao-runtime-snapshot-collector.py`
- 输出：`/var/lib/qimao-terms-cloud/runtime/telemetry.json`
- systemd timer 每 30 秒采集；`expiresAt=observedAt+90s`
- root collector 在同一目录生成临时文件，写入并 `fsync` 后原子 `rename`；目录 `root:qimao 0750`、文件 `root:qimao 0640`
- backend unit 必须声明 `QIMAO_SYSTEM_CONTROL_RUNTIME_SNAPSHOT_PATH`，值为上述绝对路径
- COS 仅核对既有非 Secret 配置是否为 `s3/tencent-cos/ap-nanjing/milaidi-upload-1310313248/https://cos.ap-nanjing.myqcloud.com/browser_direct/600`；不输出配置值以外的敏感字段，不发 COS 请求
- systemd、PG 与 loopback API 仅用于安全遥测；日志正文、连接串、Secret、对象键和供应商载荷永不进入快照
- 缺文件、路径非普通文件、JSON/合同非法、查询失败或超过 `expiresAt` 时由真实 provider 返回 `unknown`/`null`；GPU、COS 实时健康/容量/延迟/配额/CORS/ACL、PG 复制延迟保持 unknown

## 真实 Node provider 端到端校验

`deploy/debian/bin/qimao-runtime-snapshot-provider-e2e.mjs` 先调用 collector 的 `--fixture-out` 生成唯一临时 fixture，再设置 `QIMAO_SYSTEM_CONTROL_RUNTIME_SNAPSHOT_PATH`，加载已编译的真实 `FileRuntimeTelemetryProvider`，断言四个稳定 ID、descriptor identity 和 telemetry 映射；结束时删除 fixture。它不连接服务器、COS 或数据库。

```sh
node deploy/debian/bin/qimao-runtime-snapshot-provider-e2e.mjs
```

## 最小权限安装校验（仅说明，不执行）

```sh
install -d -o root -g qimao -m 0750 /var/lib/qimao-terms-cloud/runtime
install -d -o root -g root -m 0755 /usr/local/lib/qimao-terms-cloud
install -o root -g root -m 0750 bin/qimao-runtime-snapshot-collector.py /usr/local/lib/qimao-terms-cloud/qimao-runtime-snapshot-collector.py
install -o root -g root -m 0644 systemd/qimao-runtime-snapshot.service /etc/systemd/system/qimao-runtime-snapshot.service
install -o root -g root -m 0644 systemd/qimao-runtime-snapshot.timer /etc/systemd/system/qimao-runtime-snapshot.timer
python3 -m py_compile /usr/local/lib/qimao-terms-cloud/qimao-runtime-snapshot-collector.py
systemd-analyze verify /etc/systemd/system/qimao-runtime-snapshot.service /etc/systemd/system/qimao-runtime-snapshot.timer
python3 /usr/local/lib/qimao-terms-cloud/qimao-runtime-snapshot-collector.py --validate /var/lib/qimao-terms-cloud/runtime/telemetry.json
```

失效恢复只重读同一快照；不得扫描历史文件、重放业务请求或调用 COS。任意实时 Provider/云资源写控制另立授权任务。
