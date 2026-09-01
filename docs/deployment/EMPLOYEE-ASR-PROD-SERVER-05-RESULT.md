# EMPLOYEE-ASR-PROD-SERVER-05

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## evidence

- 本片已读取仓库根 `AGENTS.md`、`docs/WORKFLOW.md`、`docs/status/CURRENT.md` 及 03C/03F/079/04 既有结果。当前 `CURRENT.md` 自报同步版本为 `v4-1522`；本片未改 current/release/static 或业务源码。
- 只读生产入口：`GET http://127.0.0.1:3001/health` 为 `200 application/json`；未携带合法 Cloudflare Access 身份访问同一 loopback 的 `/api/system-control/overview?environment=development&window=24h` 为 `403 application/json`。源码与已部署合同均要求 system-control 使用服务端 Cloudflare Access JWT；未使用测试 header、Basic Auth、员工身份或直接 SQL 写入。
- 当前 canonical ASR unit `qimao-worker@asr.worker.entry.js.service`：`loaded/inactive/dead/disabled`，`MainPID=0`、`NRestarts=0`、`ExecMainStatus=0`；`EnvironmentFiles` 仅为 `/etc/qimao-terms-cloud/backend.env`，无 drop-in，`ExecStart=/usr/bin/node /opt/qimao-terms-cloud/current/backend/dist/workers/asr.worker.entry.js`。
- backend 当前仍加载既有 backend/object-storage/provider/OCR 环境文件；没有加载 `tencent-asr.env`。精确 root-only 文件元数据：
  - `backend.env`: `root:qimao 0640`，776 bytes，SHA-256 `05d21ec3dc196c1ce96243fca447fbb65e5a6047eb5ae3844065c52186ceac6f`；
  - `object-storage.env`: `root:qimao 0640`，421 bytes，SHA-256 `773b8362b39af2e3d71c5f88571210b0689397c5b825f820ea88f21f863b6259`；含 `QIMAO_S3_PROVIDER`, `QIMAO_S3_ACCESS_KEY_ID`, `QIMAO_S3_SECRET_ACCESS_KEY` 等键，未输出值；
  - `provider.env`: `root:root 0600`，241 bytes，SHA-256 `78407be9dc87c9564f50b6b18088710d42651e471d00e5416f4116a99663e40b`；
  - `tencent-asr.env`: absent；三份现有 env 中未发现 `QIMAO_TENCENT_ASR_*` 键。
- ASR engine/version 只读事实：deployment `33ff4677-8ece-475a-beeb-ee750f550661`、version `585c969e-ce61-4fff-ac1f-86416c650064`，`enabled`，`provider=tencent_cloud`、`adapter=tencent_cloud_recorded_v1`、`model=16k_zh`、`region_hint=ap-shanghai`、secret reference `unbound`；billing 为 `metered/CNY/8.750000/minute/300`，即既有 `1.75` CNY/hour 合同。ASR SecretReference、version、status event 数均为 0；按当前已确认代码，optional `secretReferenceVersionId` 不单独阻断直接 Tencent env runtime。
- 历史 ASR route 已逐行核对：
  - v1 `ac4018b7-d895-4382-a2e6-5b663f6f05fb` 已 `retired`，目标绑定指定 585 version，容量为 `maxConcurrentJobs=1 / perProjectMax=1 / queueLimit=1`；
  - v2 `4400b795-c3c9-4a7a-ac80-935e22ce6c0a` 已 `retired`，目标绑定另一 version `c80c7e3e-39f7-4c45-8710-0d8574f53ea1`，容量为 `1/1/10`；
  - 当前 `asr_api` active target=0、ASR routing pointer=0。故任务要求的 585 version 与预期 `1/1/10` 没有现存历史匹配，不能猜测或复制另一 version 的容量。
- 历史 budget policy `b6031a67-253d-450b-a0aa-4cf3581f6b44`、`0d398764-e148-4a5c-9af3-641630db9b0b` 均已 `retired`；各有一条 `asr_api/CNY/month` 规则，现存 warning/hard 为 `8.750000/17.500000`，当前 effective budget pointer=0。目标 `warning=9/hard=10` 尚未创建。
- OCR 保持基线：active `ocr_self_hosted_worker` route 为 `7bd41c8c-18b0-46f3-83ec-17fdb0729b6f`，screen-text Worker 与 OpenVINO 均 `active/running`、`NRestarts=0`。canonical backend、term extraction、secret validation、connection test 四 unit 均 `active/running`、`NRestarts=0`、`ExecMainStatus=0`；health=200。

## external_counts

```yaml
deepseek: 0
tencent: 0
cos: 0
business_api_writes: 0
system_control_writes: 0
daemon_reload: 0
unit_restart_or_start: 0
```

## rollback

未发生 env、drop-in、daemon-reload、unit 启停、route 或 budget 写入，无需回滚；生产 current/static/DB/control-plane/OCR 未改变。

## remaining_gap

首个确定阻塞为 `SYSTEM_CONTROL_ACCESS_REQUIRED`：生产 loopback system-control API 对无 Cloudflare Access JWT 的请求返回 403，而本片范围没有可使用的合法管理员身份；禁止使用测试身份、员工身份或直接 DB 写入绕过该门。

即使补齐合法管理员身份，仍需先由规划确认 `ROUTE_CAPACITY_VERSION_MISMATCH`：指定 585 version 的历史 route 是 `1/1/1`，`1/1/10` 只出现在另一 version，不得猜用。随后才可按既有 create→test→impact→approve→publish 状态机创建唯一 route/budget，并安装 root-only ASR env/drop-in。

## next_owner

`PLANNER`：提供既有合法 Cloudflare Access system-control 执行身份，并裁决 585 version 的容量合同；通过后由 `SERVER` 继续一次配置与控制面状态机。

## residual

`0`：本片未创建临时文件、env、drop-in、unit、route、budget、SecretReference 或外部任务；未调用 Provider/COS/业务 API。工作树既有脏差量保持不变，本片只新增本结果文档。

