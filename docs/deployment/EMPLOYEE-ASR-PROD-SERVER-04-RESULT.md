# EMPLOYEE-ASR-PROD-SERVER-04 结果

## artifact_written

`true`

## outcome

`blocked`

## evidence

- 观察日期：`2026-08-30`，Asia/Shanghai。本轮仅执行只读 SSH、root-only 文件元数据/脱敏变量检查、PostgreSQL 只读投影、systemd 只读查询和 loopback health GET。
- current 仍为 `/opt/qimao-terms-cloud/releases/term-budget-capability-20260830-r1`；本轮未修改 current/static、生产数据或控制面。
- canonical ASR unit `qimao-worker@asr.worker.entry.js.service` 的实际 `EnvironmentFiles` 只有 `/etc/qimao-terms-cloud/backend.env`；`User= qimao`、`Group= qimao`，`ExecStart` 指向 `/opt/qimao-terms-cloud/current/backend/dist/workers/asr.worker.entry.js`。没有加载 object-storage.env 或 provider.env。
- 编译运行时定义的六个 Tencent 配置名为：`QIMAO_TENCENT_ASR_ENABLED`、`QIMAO_TENCENT_ASR_REGION`、`QIMAO_TENCENT_ASR_SECRET_ID`、`QIMAO_TENCENT_ASR_SECRET_KEY`、`QIMAO_TENCENT_ASR_OBJECT_URL_TTL_SECONDS`、`QIMAO_TENCENT_ASR_PRICE_CNY_PER_HOUR`。在已核对的三个 root-only env 中均未发现这些键；SecretId/SecretKey 非空测试均为 `absent`，未输出任何值。
- root-only env 元数据（只报存在性、owner/mode/bytes/digest）：
  - `/etc/qimao-terms-cloud/backend.env`：存在，`root:qimao`、`0640`、776 bytes，SHA-256=`05d21ec3dc196c1ce96243fca447fbb65e5a6047eb5ae3844065c52186ceac6f`；
  - `/etc/qimao-terms-cloud/object-storage.env`：存在，`root:qimao`、`0640`、421 bytes，SHA-256=`773b8362b39af2e3d71c5f88571210b0689397c5b825f820ea88f21f863b6259`；
  - `/etc/qimao-terms-cloud/provider.env`：存在，`root:root`、`0600`、241 bytes，SHA-256=`78407be9dc87c9564f50b6b18088710d42651e471d00e5416f4116a99663e40b`。
- 数据库真实 ASR engine/version 历史有两套，均为 `provider=tencent_cloud`、`adapter=tencent_cloud_recorded_v1`、deployment=`enabled`、`model=16k_zh`、`language=zh-CN`、`region_hint=ap-shanghai`，且两套 version 的 `secret_reference=unbound`：
  - deployment `33ff4677-8ece-475a-beeb-ee750f550661` / version `585c969e-ce61-4fff-ac1f-86416c650064`；
  - deployment `e78b0a67-9a11-47cc-9e95-ae094d25f1b2` / version `c80c7e3e-39f7-4c45-8710-0d8574f53ea1`。
- 两套版本的不可变 billing/capability 快照一致：`billingClass=metered`、`currency=CNY`、`maximumAmount=8.750000`、`billingUnit=minute`、`maximumQuantity=300`；Hotword 能力 `supported=true`、`maxEntries=100`、`maxCharacters=2000`。这是数据库快照事实，不代表当前已可执行，因为 Secret、route 和 effective budget 均未绑定。
- ASR SecretReference 历史只读计数：`system_secret_references(capability=asr)=0`、`system_secret_reference_versions(capability=asr)=0`、available events=`0`；按当前 API 合同，`secretReferenceVersionId` optional，`secret_reference=unbound` 本身不是独立阻塞条件；此处仅作为“没有控制面 SecretReference 历史”的事实记录。
- ASR route 只读事实：当前 `active_control_plane_pointers + routing_policy_targets(pool_id=asr_api)` 返回 `0`；历史 routing versions 为 `ac4018b7-d895-4382-a2e6-5b663f6f05fb` version `1` 与 `4400b795-c3c9-4a7a-ac80-935e22ce6c0a` version `2`，各 1 个 target，最新 route status 均为 `retired`。因此没有 approved/active 的唯一 `asr_api` target，也没有可核对的当前容量限制。
- budget 只读事实：`active_budget_policy_pointers(environment=development)=0`；两套 policy version `b6031a67-253d-450b-a0aa-4cf3581f6b44` version `1`、`0d398764-e148-4a5c-9af3-641630db9b0b` version `2` 的最新状态均为 `retired`，各有 1 条 rule。历史 `active` 状态事件存在，但没有 effective pointer，不能作为当前额度依据；ASR CNY day/month effective budget 不成立。
- OCR 基线仍健康：`ocr_self_hosted_worker` 唯一 active target 为 routing version `7bd41c8c-18b0-46f3-83ec-17fdb0729b6f`、target `1a9eb5ee-3402-4c9b-a81b-1dd8ad7c88bc`、priority `1`、role `preferred`、capacity=`max_concurrent_jobs 1 / per_project_max 1 / queue_limit 20`、provider=`openvino`、adapter=`screen_text_openvino_ppocrv6_small`、version=`1`、status=`active`。
- OCR runtime：`qimao-worker@screen-text.worker.entry.js.service`=`active/running`、MainPID=`345793`、NRestarts=`0`、ExecMainStatus=`0`；`qimao-local-ocr-openvino.service`=`active/running`、MainPID=`318206`、NRestarts=`0`、ExecMainStatus=`0`。
- canonical 四 unit 未改变：backend `664656`、term extraction `664658`、secret validation `664715`、connection test `664657`，均 `active/running`、NRestarts=`0`、ExecMainStatus=`0`。backend `GET http://127.0.0.1:3001/health` 为 HTTP=`200`、`application/json; charset=utf-8`。
- 唯一停止结论：`TENCENT_ASR_CONFIG_INCOMPLETE`。首因是 canonical ASR unit 未加载 Tencent 配置：实际 EnvironmentFile 只有 `backend.env`，六个 `QIMAO_TENCENT_ASR_*` 键在已核对 env 中均缺失；同时 `asr_api` active route 与 effective budget pointer 均缺失。`secret_reference=unbound` 未被单独判为 ASR 必阻塞；但当前也没有直接 env/registry 可解析的真实 Tencent runtime 装配，因此不满足“已有完整事实可直接复用”的条件，禁止进入第一次控制面写入。

## external_counts

- DeepSeek=`0`；Tencent Create/Describe/连接测试 Provider 调用=`0`；COS=`0`；业务批次/API 写入=`0`。
- systemd start/stop/restart=`0`；数据库写入/迁移=`0`；route/budget/Secret/env/config 写入=`0`；current/static 发布=`0`。

## rollback

- 无需回滚：本轮在第一次写入前停止，未创建/恢复 route、budget pointer、SecretReference，未启动 ASR Worker，未改变 OCR、terms、current/static 或四个 canonical unit。

## residual

- 生产服务与配置保持原状；没有本轮 transfer、staging、临时 unit 或临时文件，残留=`0`。
- 未读取或输出 Secret 值、环境值、原始 Provider 响应、对象键或业务载荷。

## remaining_gap

- 需要先由控制面/部署 Owner 让 canonical ASR unit 通过既有 root-only EnvironmentFile 或等价已审核 registry/prepare 解析出真实 Tencent runtime（不要求机械新增 SecretReference），并补齐 approved `asr_api` route target 及含 `asr_api` 的 effective CNY day/month budget pointer；本片不直接 UPDATE/DELETE，不猜 payload，不创建第二控制面。

## next_owner

`PLANNER` / `SYSTEM-CONTROL OWNER`

## requires_user

`false`
