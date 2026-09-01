# TENCENT-ASR-BACK-04H 只读可行性结果

## outcome

`artifact_written`（只读审计报告）；本切片 `slice_outcome=blocked`。未修改业务代码、数据库、控制面、Provider、服务器或公网路由。

## evidence

- `backend/src/config.ts` 的 `getDatabaseUrl()` 允许由显式 `DATABASE_URL` 指向一次性隔离库；`backend/src/database/pool.ts` 的 `createPool(connectionString)` 可向 app 与 Worker 注入同一连接；`backend/src/database/migrate.ts` 使用现有 migrations 目录。现有 `tests/backend/system-control-routing.test.ts` 等夹具已证明：管理员连接 `/postgres` 创建随机库、运行迁移、测试结束 `pg_terminate_backend` + `DROP DATABASE` 并核对不存在。
- `backend/src/app.ts` 的 `createApp` 支持注入 `database`、`employeePrincipalResolver`、`systemControlPrincipalResolver`；将 `accessRequired=false` 仅用于 loopback 隔离进程、保留 employee session 校验并注入测试主体，即可不依赖 Cloudflare Access。生产 `startServer()` 仍使用真实 Access/员工认证，不会采用该主体。
- 现有业务入口可按以下顺序建立权威事实：`POST /api/projects` → `POST /api/projects/:projectId/material-manifests/confirm`（company_srt + asr_video）→ 每个绑定 `POST /api/projects/:projectId/uploads`（multipart/COS）→ authorize part → 浏览器/受控 PUT → confirm part → `POST /api/uploads/:uploadId/complete`（202/verifying）→ 注入同一隔离 pool/storage 的 `UploadCompletionWorker` → `GET /api/uploads/:uploadId`。完成后再按现有入口创建 terms extraction/release、ASR batch/dispatch。
- 控制面入口均已有幂等命令：engine deployment/version、connection-test、development routing 的 test/impact-check/approve/publish、budget policy 的 test/impact-check/approve/publish；连接测试只做 registry/config 探针，不调用 Tencent API。业务 ASR 前置由 `asr-command.repository.ts` 校验 active project、manifest、termVersion、development route、已验证 asr_video Asset。
- Worker 均提供显式数据库注入：`runUploadCompletionWorker`、`runAsrWorker`、`runSystemControlConnectionTestWorker`；`ProjectCleanupWorker`/其导出运行函数可注入同一 S3 storage。生产独立 entry 默认从环境创建 pool；本地 synthetic 应直接调用这些导出入口，避免误连默认库。`server.ts` 的生产 S3 实例同时供上传与交付读取。
- ASR 的 unknown 语义已固定：CreateRecTask 最多一次；超时/无 TaskId 进入 `reconciliation_required`，后续只按同一 provider task 身份查询，不盲目再次 Create。Tencent TaskId 仅接受可无损转 SDK number 的正十进制字符串。

## api_chain

SERVER 可在一次隔离 loopback 进程执行：

1. 从本地 Postgres admin 连接创建随机隔离数据库，运行现有迁移；以该 URL 创建 pool。
2. 用 `createApp({database: pool, accessRequired: false, employeeSessionRequired: true, employeePrincipalResolver, systemControlPrincipalResolver, storage, deliveryStorage, asrRegistry})`，仅监听 `127.0.0.1` 随机端口。所有请求带稳定 UUID `Idempotency-Key`；重放只 GET 同一 command，不重复 POST。
3. 依次调用项目、manifest、上传分片、异步 complete/worker、terms、engine/route/budget、ASR batch/dispatch。候选 SHA、对象存储配置、固定媒体输入在整个链路保持不变；COS 只使用服务端配置的私有 bucket 和已知身份，浏览器只获得短时签名。
4. 成功门：UploadSession=`completed`、唯一 Asset/binding、ASR job 仅一次 CreateRecTask，随后同一 TaskId 查询至完成；usage 金额按真实音频时长×配置时薪，operation/command 可由稳定 ID GET 恢复。
5. 未知门：Create/Complete/Head 或 Worker 崩溃后只允许同一 session/object/provider 身份 GET/Head 对账；不得新建 multipart、第二 Asset 或第二次 CreateRecTask。

## worker_isolation

所有 app、UploadCompletionWorker、AsrWorker、控制面 connection-test Worker、cleanup Worker 必须共享显式隔离 `DATABASE_URL`/pool 和同一 Production S3 storage 实例。禁止调用无参数 `createPool()`、默认业务库或生产 `startServer()`。Worker lease 使用稳定且进程唯一的 workerId；进程重启后从隔离库重新 claim。连接测试的 registry 使用同一 candidate descriptor，但 providerCalls 必须为 0。

## cleanup_recovery

- 先停止 dispatch/ASR batch（使用既有 cancel 命令并 GET 同一 command），再撤销 development routing，最后禁用 engine；budget 仅在存在旧 release 时按既有 rollback，不能伪造零预算。
- 对未完成上传，按已知 `uploadSessionId/storageUploadId/objectKey/part` 调用现有 abort/delete；cleanup 只查同一身份，禁止 `ListMultipartUploads` 扫描。对已完成对象由 `ProjectCleanupWorker` 删除已知 objectKey，并以 Head 明确 NotFound 验证；未知结果进入对账，不重复写命令。
- Tencent 外部任务不可删除；若 Create 结果 unknown，必须先按同一 providerRequestId/TaskId 对账并记录最终事实，不能把“删库成功”当作外部零副作用。
- 最后终止隔离连接、精确 `DROP DATABASE`，核对数据库不存在；删除临时 release/env/unit 文件、临时目录和固定媒体。生产 DB、控制面、公网路由、生产 COS 之外的事实保持零变化。

## can_all_temp_create_and_clear

`false`（针对本卡冻结的 WAV 输入）。现有合同只支持 `UploadMediaKind='srt'|'video'`；上传路由对 video 只接受 `.mp4`、固定 `video/mp4` 与 `video.mp4` object suffix；material manifest 的 `asr_video` 也要求 `mediaType='video'` 且扩展名 `.mp4`。因此 WAV 无法通过既有业务 API 合法创建 UploadSession/Asset；将 WAV 改名或伪装成 MP4、或直接 SQL seed，均不满足“按现有入口、零业务代码修改”的硬门。

使用受支持的合成 MP4（内容仍由 SERVER 在隔离环境生成）时，上述 app/Worker/COS 链路具备零代码执行路径；本报告未运行该链路，也未调用 Tencent/COS。

## remaining_gap

唯一产品缺口是冻结媒体输入与既有上传合同不相容（WAV vs MP4-only）。另有运行注意：现有 `project-cleanup.worker.entry.ts` 独立入口默认构造 filesystem storage；COS synthetic 必须在 harness 中调用可注入的 cleanup Worker，而不能直接使用该默认 entry。该注意不要求本片改代码。

## next_owner

`PLANNING`：裁决将固定 WAV 改为受支持的隔离 MP4，或另签一个明确的 audio/WAV 合同切片（含必要迁移/测试）。`SERVER`：在裁决后提供候选 SHA、完整 server-only object-storage/provider env、loopback 主体夹具及一次性隔离主机；不得把生产 DATABASE_URL、Access/Cookie、Secret 或公网路由带入 harness。

## files

- 仅新增：`docs/deployment/TENCENT-ASR-BACK-04H-RESULT.md`
- 只读证据：`backend/src/config.ts`、`backend/src/database/pool.ts`、`backend/src/database/migrate.ts`、`backend/src/app.ts`、`backend/src/server.ts`、上传/素材/ASR/Worker 源码及现有 backend 测试夹具。

## residual

本轮未运行测试、迁移、PostgreSQL、Worker、COS 或 Tencent API；未启动服务器；未读取或写入 Secret；未产生临时库、对象、release、env、unit 或进程残留。工作树其他既有脏改动原样保留。

## requires_user

`true`：需要规划确认 WAV→MP4 或新 audio 合同；在确认前不得进行 business synthetic，也不得触碰生产事实。
