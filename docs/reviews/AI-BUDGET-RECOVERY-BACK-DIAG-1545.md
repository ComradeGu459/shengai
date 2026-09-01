# AI-BUDGET-RECOVERY-BACK-DIAG-1545

```yaml
artifact_written: true
outcome: diagnosed
requires_user: false
```

## 结论

当前没有一个既有入口能精确表达“只重试 `provider_request_id IS NULL` 且 `external_side_effect_possible = false` 的 failed job”。现有服务端重试资格是当前 Attempt 的 `retryable=true`，不是上述两个持久字段的组合；前端按钮也只按 `job.status='failed'` 判断。

因此，本批次不能通过现有重试入口安全恢复 episode2–51：正常状态链中它们当前 Attempt 是 `BUDGET_HARD_LIMIT`，`rejectBeforeExecution` 固定写入 `retryable=false`。episode2 早先的 `ASR_LEASE_EXPIRED` 虽无外部身份，但不是当前 Attempt；episode1 已 completed，不会进入失败重试集合。

## 现有 API、服务与 UI

- 员工入口：`POST /api/projects/:projectId/asr/batches/:batchId/retries`，定义于 `backend/src/modules/asr/asr.routes.ts`。
- Body 合同：`{ episodeNumbers?: number[] }`，定义于 `packages/contracts/src/asr.ts` 的 `RetryAsrBatchBodySchema`；省略时表示全部服务端判定为 eligible 的失败集。
- 服务方法：`AsrService.retry()` 仅做生产开关检查，然后调用 `AsrCommandRepository.retry()`。
- 核心资格 SQL：

  ```sql
  SELECT ...
  FROM asr_jobs job
  JOIN asr_attempts attempt ON attempt.id = job.current_attempt_id
  WHERE job.batch_id = $1
    AND job.status = 'failed'
    AND attempt.retryable
  ```

- `AsrCommandRepository.retry()` 对显式 episode 子集使用全量校验：只要一个 episode 不在 eligible 集合，整个请求返回 `ASR_RETRY_SCOPE_INVALID`，不会创建新 retry batch。
- UI `frontend/src/features/asr/AsrWorkspace.tsx` 用所有 `job.status === 'failed'` 的 episode 组成按钮请求，未读取 `attempt.providerRequestId`、`attempt.externalSideEffectPossible` 或 `attempt.retryable`。

## 当前批次的实际结果

| 集合 | 当前事实 | 现有重试结果 |
| --- | --- | --- |
| episode1 | completed，已有 provider request id | 跳过，不进入 retry eligible |
| episode2 | 先有 `ASR_LEASE_EXPIRED`，后有 `BUDGET_HARD_LIMIT`；均无 provider request id | 正常 current attempt 为后者，`retryable=false`，被排除 |
| episode3–51 | 各有一次 `BUDGET_HARD_LIMIT`，无 provider request id | `retryable=false`，被排除 |

所以对当前事实，`POST .../retries` 空 body 会得到无 eligible scope；显式提交 episode2–51 会因至少一个不在 eligible 集合而整体拒绝。不存在只靠现有 API 创建该安全子集 retry batch 的路径。

## 是否复用原 batch 快照

对真正 eligible 的现有重试，服务端不会复用原 batch 行，而是创建新的 `asr_batches`，设置 `retry_of_batch_id` 指向原 batch，并复制：

- 原 batch 的 `term_version_id`、manifest/version；
- provider、adapter、model、language、config digest；
- hotword 摘要与投影版本；
- 每个失败 job 的 asset/checksum、`routing_version_id` 与 `route_digest`；
- failed job 的 `current_result_id`（若存在）。

它会设置 `force_new_recognition=true`，新 job 状态为 queued。episode1 因为不是 failed，不会复制；因此已完成集不会被重跑。重试沿用原 batch 的术语和 route snapshot，不漂移到当前 active route。

直接调用普通 `POST /api/projects/:projectId/asr/batches` 虽可表达 episode scope，但会创建普通新 batch、重新取当前 route snapshot，不能满足本批次“复用原快照且只恢复安全失败 job”的要求，也不应作为恢复替代。

## 幂等合同

- Header：`Idempotency-Key`，长度 8–200。
- 服务端在 `asr_retry_commands` 以 `(project_id, idempotency_key)` 保存 request hash、source batch 与 retry batch。
- 同一 key + 同一 `batchId/episodeNumbers` 重放返回同一 retry batch（HTTP 200）。
- 同一 key + 不同 episode scope 返回 `ASR_IDEMPOTENCY_KEY_REUSED`（HTTP 409）。
- 结果未知时必须继续使用同一 key 和同一 body；换 key 不能作为恢复动作。
- 当前没有公开的 `GET /asr_retry_commands/:id` 查询 endpoint；已知 retry batch 身份后可 GET 该 batch detail。

## 唯一最小缺口

在不改变 batch/attempt 状态机、不新建第二路由的前提下，唯一缺口是让既有 retry command 的服务端 eligible 查询显式要求：

```sql
job.status = 'failed'
AND attempt.provider_request_id IS NULL
AND attempt.external_side_effect_possible = FALSE
AND attempt.retryable = TRUE
```

并让 UI 的失败集投影只提交该服务端确认集合；同时必须保留原 batch 的 termVersion、route snapshot、asset/checksum 复制与当前幂等命令合同。是否将 `BUDGET_HARD_LIMIT` 标记为可重试需要单独的业务裁决；本片不擅自改变该状态语义。

## 证据与残留

- `backend/src/modules/asr/asr-command.repository.ts`：`retry()` 的 current attempt + `retryable` 查询及新 retry batch 快照复制。
- `backend/src/modules/asr/asr-worker.repository.ts`：`rejectBeforeExecution()` 对预算拒绝写入 `retryable=false`；租约过期且无外部身份的失败路径才写入 `retryable=true`。
- `frontend/src/features/asr/AsrWorkspace.tsx`：按钮按所有 failed job 组装 episodeNumbers。
- `packages/contracts/src/asr.ts`：重试 body 只有可选 `episodeNumbers`。
- 本片只新增本诊断文档；未调用 retry API，未修改 batch/job/attempt、数据库、服务器或前端。

remaining_gap: 当前安全失败谓词没有独立 API 合同；现有 `retryable` 既不能保证 provider 身份为空，也不能覆盖当前批次的 BUDGET_HARD_LIMIT 失败项。

next_owner: PLANNER / BACK

residual: 真实批次保持 `1 completed + 50 failed` 及既有 Attempt 历史；未重试、未新建 batch、未调用 Provider/COS、未读 Secret、未部署。
