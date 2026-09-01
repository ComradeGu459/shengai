# EMPLOYEE-ASR-PROD-SERVER-06-R1

## artifact

```yaml
artifact_written: true
outcome: passed
requires_user: false
```

## evidence

- 复用 06 的同一配置内容，仅把 backend restart 后的 health 门改为每秒一次、最多 30 秒。前 3 次为 `000|curl_exit=7`，第 4 次为 `200|application/json; charset=utf-8|curl_exit=0`，随后才进入 registry probe。
- root-only Tencent env 已按 object-storage.env 同一 CAM 凭据生成，未输出值；最终文件为 `root:qimao 0640`、282 bytes，且包含六个固定键：`QIMAO_TENCENT_ASR_ENABLED`、`QIMAO_TENCENT_ASR_REGION`、`QIMAO_TENCENT_ASR_SECRET_ID`、`QIMAO_TENCENT_ASR_SECRET_KEY`、`QIMAO_TENCENT_ASR_OBJECT_URL_TTL_SECONDS`、`QIMAO_TENCENT_ASR_PRICE_CNY_PER_HOUR`。
- backend drop-in 最终为 `root:root 0644`、65 bytes，并追加 `/etc/qimao-terms-cloud/tencent-asr.env`；ASR drop-in 最终为 `root:root 0644`、329 bytes，明确加载 backend.env、object-storage.env、tencent-asr.env，并使用 `/usr/local/bin/node --preserve-symlinks-main /opt/qimao-terms-cloud/current/backend/dist/workers/asr.worker.entry.js`。
- 零网络 registry probe 成功：返回 `provider=tencent_cloud`、`adapter=tencent_cloud_recorded_v1`、`model=16k_zh`；探针 transport 调用数为 0。SDK factory 的一次构造仅用于装配验证，不是 Tencent 网络调用。
- 最终只读 unit/health 门：backend `active/running`、`NRestarts=0`、`ExecMainStatus=0`；ASR `active/running`、`enabled`、`NRestarts=0`、`ExecMainStatus=0`；health=`200 application/json; charset=utf-8`。ASR MainPID 为 `675224`，backend MainPID 为 `675164`。
- 生产 current 仍为 `/opt/qimao-terms-cloud/releases/term-budget-capability-20260830-r1`；规范 static 仍为 `/srv/qimao-terms-cloud/system-frontend-term-budget-capability-20260830-r1`；只读控制面核对 `asr` route pointer=0、development budget pointer=0，未发布 route/budget。既有 OCR 与其他 canonical unit 未改动。
- 本轮配置脚本在成功输出、临时 backup 目录 `rmdir` 和全部验收门之后，尾部 `exit 0` 因 SSH stdin 的 CR 字节被 bash 解析为数值错误；这没有触发 trap、回滚或产生运行时残留。该尾部编排异常不改变已达成的 runtime 门，本片不再重放。

## external_counts

```yaml
deepseek: 0
tencent_api: 0
cos: 0
business_api_writes: 0
system_control_writes: 0
database_writes: 0
registry_network_calls: 0
backend_restart: 1
daemon_reload: 1
asr_enable: 1
asr_start: 1
rollback: 0
```

## rollback

未触发回滚。06-R1 的配置与 Worker 状态保留为目标状态；唯一临时 backup 已在成功路径删除。未修改生产 current/static、数据库、route、budget、SecretReference、代码或静态页。

## remaining_gap

按任务边界，生产 `asr_api` route 与 effective budget 仍未创建/发布，当前保持 pointer=0；本片只完成运行时接线，不自行进入控制面发布。

尾部 shell exit 的 CR 解析异常属于已完成成功门后的执行包装瑕疵；不得把它归因于 Tencent registry、ASR Worker 或业务代码，也不得在本片追加第三次尝试。

## next_owner

`PLANNER`：审核本片 runtime 接线通过，并派发独立的生产 ASR route/budget 控制面切片；后续继续复用现有 env/Worker，不新增 fallback。

## residual

`0`：目标 env/drop-in 保留且为正式接线物，临时 backup 无残留；ASR Worker 已 enabled/running。Provider、COS、DeepSeek、Tencent API 和业务写入均为 0。

