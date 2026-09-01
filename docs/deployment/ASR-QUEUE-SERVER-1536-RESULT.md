# ASR-QUEUE-SERVER-1536

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## evidence

- 目标项目：`af8425c4-65cf-427a-94f2-e3e53ec83baa`。
- 最新 batch：`e6edf993-15ab-4302-a535-4ae382b7c9b3`，batch status=`queued`，created/updated=`2026-08-30 21:53:44.729895+08`；provider=`tencent_cloud`，adapter=`tencent_cloud_recorded_v1`，model=`16k_zh`。
- job 计数：total=`51`、queued=`51`、running=`0`、completed=`0`、failed=`0`；最早 queued job created_at=`2026-08-30 21:53:44.729895+08`。
- attempt 计数：total=`0`，leased/running/completed/failed/reconciliation_required 均为 `0`。首个 job status=`queued`，current attempt 为空，官方 TaskId 写入事实=`false`。
- canonical ASR Worker `qimao-worker@asr.worker.entry.js.service`：`ActiveState=active`、`SubState=running`、`MainPID=675224`、`NRestarts=0`、`ExecMainStatus=0`；health=`200 application/json; charset=utf-8`。
- 近 6 小时该 Worker journal 的 warning/error/failed/timeout/exception 筛选计数为 `0`，没有可归因的 Worker 崩溃或腾讯错误证据。
- active ASR route：routing version=`df527ca0-8fa9-4edd-abde-48cb355c6775`，target=`5ab81d77-1cb7-4b2a-92f8-83cdf8795899`，deployment version=`c80c7e3e-39f7-4c45-8710-0d8574f53ea1`，provider/adapter=`tencent_cloud/tencent_cloud_recorded_v1`，model=`16k_zh`；容量为 `maxConcurrentJobs=1`、`perProjectMax=1`、`queueLimit=10`。
- 当前源码 `backend/src/modules/asr/asr-worker.repository.ts` 的 queued claim 条件要求：同一 routing target 的 active attempts 小于 `max_concurrent_jobs`，同一 target 的 queued job 数 `<= queue_limit`，且同一项目 active attempts 小于 `per_project_max`。本批次 target queued 数为 `51`，route `queueLimit=10`，故该条件对整批为假，Worker 即使健康也无法领取首个 job；这与 0 attempt 的数据库事实一致。

## root_cause

唯一首因：`QUEUE_LIMIT_CLAIM_DEADLOCK`。这是已入队批次规模 `51` 与当前 route claim 门 `queueLimit=10` 的确定性编排死锁，不是 Worker 未运行，也不是 Tencent/COS 错误。

## minimal_fix

只通过既有 system-control routing 状态机发布一个保持 provider/adapter/model 与并发配置不变、但 `queueLimit >= 51` 的唯一 active ASR route replacement，使现有批次获得可领取窗口；本片不执行该外部写动作、不重试批次、不调用 Tencent/COS。

## remaining_gap

该 batch 尚未开始处理，尚无 provider TaskId、usage 或 ASR result。解除 route claim 门后仍需由规划/控制面 Owner 决定是否按既有状态机配置变更并只读观察该 batch。

## next_owner

`PLANNER` / `SYSTEM-CONTROL`：审核并按既有 routing 状态机处理 `queueLimit` 与现存 51-job batch 的兼容性；不要在本片直接 UPDATE/DELETE 或新建批次。

## residual

无本片创建的资源或写入；目标 batch、生产 route、DB、Worker、环境与外部服务均未修改。现存 batch 仍为 `queued`，51 个 jobs 仍 queued，0 attempts。

