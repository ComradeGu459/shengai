# TENCENT-ASR-BACK-04G 控制面 synthetic 链冻结

## outcome

`artifact_written`。本轮只读核对完成；未修改业务代码、数据库或外部 Provider。现有 API 可以描述并执行一条有稳定身份的临时链，但按当前生产事实不能做到“全部创建后再由 API 清零”。

## evidence

- 生产 `/api/system-control/*` 先经过 Cloudflare Access 主体解析；`CURRENT` 记录无 Access JWT 时为 403。测试中的 `x-system-control-test-identity` 仅是 fixture，不能替代生产 JWT。
- 引擎部署：`POST /api/system-control/engines`，`system-control:engines:write`；最小 ASR Tencent body 为 `{deploymentId,versionId,capability:"asr",executionKind:"cloud_api",displayName,adapterKey:"tencent_cloud_recorded_v1"}`。provider/model/billing 由已注册 descriptor 派生，不由请求体指定。版本变更使用 `POST /api/system-control/engines/:deploymentId/versions`，body 至少含 `{versionId,secret:{action:"inherit"}}`。
- 连接测试：`POST /api/system-control/engine-connection-tests`，body `{testRunId,deploymentVersionId}`，同一 `testRunId`/幂等键恢复；结果用 `GET /api/system-control/engine-connection-tests/:testRunId` 读取。当前 04F 证据为 Worker 5/5、`NRestarts=0`。
- 路由：`POST /api/system-control/routing`，body 必须含 `routingVersionId,environment,workflowStage:"asr",pools`；`pools` 固定三项 `asr_api/ocr_api/ocr_self_hosted_worker`，Tencent 版本放入 `asr_api.targets`（`routingTargetId,deploymentVersionId,priority,role,maxConcurrentJobs,perProjectMax,queueLimit`）。顺序为 create → `/:id/test` → `/:id/impact-check` → `/:id/approve` → `/:id/publish`（publish body `{releaseCommandId}`）；每步使用独立 `Idempotency-Key`，GET `/routing-commands/:commandId` 恢复。
- 预算：`POST /api/system-control/budget-policies`，body `{budgetPolicyVersionId,environment,rules}`；每条 rule 为 `{resourcePool:"asr_api",currency:"CNY",period:"day"|"month",warningLimit,hardLimit}`，金额为十进制字符串且必须与生产显式正价配置一致。顺序为 create → `/:id/tests`（`{commandId,budgetTestRunId}`）→ `/:id/impact-check`（`{commandId}`）→ `/:id/approve`（`{commandId}`）→ `/:id/publish`（`{budgetReleaseCommandId}`）；用预算 release command GET 恢复。
- 业务前置不是控制面可伪造字段：先由员工主体创建 active project（`POST /api/projects`，body `{name}`），确认 material manifest（`POST /api/projects/:projectId/material-manifests/confirm`，需 `expectedVersion,rootName,bindings`，至少 `company_srt` 与 `asr_video`），再通过 `POST /api/projects/:projectId/uploads` → authorize/part/confirm → `POST /api/uploads/:uploadId/complete`（当前返回 202/verifying，随后 Worker 完成）取得 verified `asr_video` Asset；terms 还需 `POST /api/projects/:projectId/terms/extractions`、候选决策及 `POST /api/projects/:projectId/terms/releases` 才有 `termVersionId`。
- ASR 业务入口：`POST /api/projects/:projectId/asr/batches`，body `{scope:{kind:"single",episodeNumber}|{kind:"all"}|{kind:"selected",episodeNumbers},termVersionId,forceNewRecognition?}`；随后可用 `POST /api/asr/dispatch-groups`，body `{dispatchGroupId,projectIds:[projectId],allowPartial?}`。这些入口要求 active routing、预算、term version 及 verified `asr_video`，同样使用 Idempotency-Key 和 GET 事实恢复。
- 稳定身份：调用方生成 UUID（deployment/version/routing/budget/testRun/release/dispatch 等），每个写命令携带唯一 `Idempotency-Key`；同键同参数重放同事实，同键异参数 409。未知结果只 GET 同一 command/id，不盲目重 POST。

## remaining_gap

当前生产 `active ASR route/budget` 均无、`term_versions=0`，且无 Access JWT；因此无法在不改变服务器认证的情况下完成上述控制面调用。系统控制面没有删除引擎版本、路由历史/审计或预算历史的 API，只有 rollback/disable/cancel；故无法通过现有 API 把全局临时记录清零。另有 verified manifest/Asset/term version 业务前置，不能用控制面 payload 绕过。

## next_owner

`PLANNING`：安排带隔离命名空间或隔离数据库的 synthetic 运行租约，并裁决不可变控制面历史的保留/清理策略；若“零记录”是硬要求，需要单独批准的测试命名空间/保留策略（本轮不实现）。`SERVER`：提供有效 Cloudflare Access system-control 主体、生产 registry/route/budget 配置及 Worker 运行输入。`BACK` 仅在获批新的控制面清理/隔离合同后接续实现。

## files

- 只新增本报告：`docs/deployment/TENCENT-ASR-BACK-04G-RESULT.md`。
- 只读依据：`backend/src/modules/system-control/system-control.routes.ts`、`backend/src/modules/system-control/system-control.engine.service.ts`、`backend/src/modules/system-control/system-control.routing.service.ts`、`packages/contracts/src/system-control.ts`、`tests/backend/system-control-engine.test.ts`、`tests/backend/system-control-routing.test.ts`、`backend/src/modules/asr/asr-command.repository.ts`、`backend/src/modules/asr/asr.routes.ts`、`backend/src/modules/terms/term.routes.ts`、`backend/src/modules/materials/material.routes.ts`、`backend/src/modules/uploads/upload.routes.ts`。

## residual

未运行测试、迁移、数据库、服务器、浏览器或 Provider 命令；未读取或写入 Secret；未写入业务数据。当前工作树其他既有脏差量未触碰。

## requires_user

需要用户/规划确认是否提供隔离 synthetic 数据库与 Access JWT，以及是否接受控制面不可变历史保留；在确认前不能声称“临时创建并清零”。

## can_all_temp_create_and_clear

`false`（创建受 Access JWT、生产 route/budget、manifest/Asset/term 前置约束；清理受无 DELETE/历史不可变约束）。

## cleanup_recovery_order

停止/取消 dispatch 与 batch并 GET确认 → routing rollback 到已知安全版本（或保持 draft 不发布）→ budget rollback 到已知安全版本 → disable deployment（无 active route 引用后）→ 对每个 command 使用原 Idempotency-Key/稳定 ID 做 GET 对账。不要发布伪造的零预算策略，不要盲重试未知写入；项目/上传/术语事实的 abandon/recycle 属独立业务租约，不在本轮执行。
