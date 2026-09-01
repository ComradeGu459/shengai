# ASR-ROUTE-IMPACT-BACK-DIAG-1542

```yaml
artifact_written: true
outcome: diagnosed
requires_user: false
```

## 结论

当前 `capacity_below_active_tasks` 不是 SQL 查询漏项，而是影响检查把“全部未完成任务数”直接当成并发容量比较值。它把 `queued`、`leased`、`running`、`cancel_requested` 都计入 `activeTaskCount`；本批次的 `49 queued` 因此得到 `activeTaskCount=49`。v4 的 `maxConcurrentJobs=8` 满足 `8 < 49`，于是产生硬阻断。

这与旧的“容量低于活动任务即阻断”安全意图一致，但与当前执行合同中三项容量的语义不一致：`maxConcurrentJobs` 是活动 Attempt 并发，`perProjectMax` 是同项目/同目标活动 Attempt 并发，`queueLimit` 才是 queued Job 等待上限。队列数量大于并发数本身不是扩容到 8 的安全问题；v4 的 `queueLimit=300` 已覆盖本批 49 个 queued Job。

## 现有实现事实

实现位置：`backend/src/modules/system-control/system-control.routing.service.ts` 的 `impactCheck`。

```sql
SELECT COUNT(*)::text AS count
FROM asr_jobs
WHERE status IN ('queued','leased','running','cancel_requested')
```

- `completed`、`failed`、`reconciliation_required` 不计入该查询。
- `reconciliation_required` 另行统计并单独形成硬阻断。
- `capacityBlocked` 对候选策略的每个 target 判断 `target.maxConcurrentJobs < activeTaskCount`。
- 当前 impact-check 不使用 `perProjectMax` 或 `queueLimit` 判断容量阻断。
- `capacityDifferences` 只比较 `maxConcurrentJobs`，不会报告另外两项差异。

ASR Worker 的 claim 语义在 `backend/src/modules/asr/asr-worker.repository.ts`：

- `maxConcurrentJobs`：按当前 `routingTargetId` 统计 `leased/running` Attempt。
- `perProjectMax`：按项目且按当前 `routingTargetId` 统计 `leased/running` Attempt。
- `queueLimit`：按下一目标解析到该 `routingTargetId` 的 queued Job 统计。

## 是否属于契约错误

判断为实现层安全策略过严，不是统计 SQL 错误，也不是路由状态机故障。

历史控制面文档允许“容量低于活动任务”作为硬阻断；但当前有序执行合同已明确将并发、项目并发和等待队列分开，且 Worker claim 已按该语义执行。共享 contract 只暴露 `activeTaskCount`，没有规定它必须包含 queued，也没有规定 queued 必须与 `maxConcurrentJobs` 比较。

因此，当前代码保留了旧安全判断，却阻止了合法的“并发扩容、队列继续排空”场景：`49 queued` 不应单独阻止 `maxConcurrentJobs=8`。

## 无需改代码的合法路径

存在，但不是绕过硬阻断：

1. 保持 active route v3=`1/1/10`，让健康 ASR Worker 按既有 `queueLimit=10` 逐批排空当前 queued Job。
2. 等 `asr_jobs` 中 `queued/leased/running/cancel_requested` 总数降至 `<=8`，并确认 `reconciliation_required=0`、候选版本连接测试仍为 succeeded。
3. 对现有 v4 重新执行同一状态链的 impact-check → approve → publish；不得直接改状态或复用旧 impact 快照。

另一个形式上可行但不符合本次目标的路径，是新建 `maxConcurrentJobs>=49` 的候选版本；不建议用它替代 `8/6/300` 扩容意图。

## 若规划后续修复，唯一最小位置与语义

只改 `backend/src/modules/system-control/system-control.routing.service.ts` 的 `impactCheck`：

- 保留 `activeTaskCount` 作为报告字段，或将其明确收敛为 in-flight count；不得再用包含 queued 的总数直接比较 `maxConcurrentJobs`。
- 用只统计 `leased/running/cancel_requested` 的 in-flight 查询作为并发安全比较值；queued 仅由 `queueLimit` 的执行 claim 语义处理。
- `perProjectMax` 与 `queueLimit` 不应被错误地当成全局 `activeTaskCount` 比较值。

必须回归：

- `49 queued + 0 in-flight` 与候选 `8/6/300`：无 `capacity_below_active_tasks`。
- `8` 个 in-flight 与候选 `8`：不阻断；`9` 个 in-flight 与候选 `8`：阻断降容。
- queued 超过 `queueLimit` 的执行 claim 仍按最早顺序排空，不改变 Worker 语义。
- `reconciliation_required`、连接测试失败、无 primary 的既有硬阻断不退化。
- ASR/OCR/terms 阶段隔离，以及旧 ASR/OCR 三池投影兼容。

本片未实施上述修复。

## 证据与残留

- `docs/status/CURRENT.md` v4-1538：真实 batch 为 `1 completed + 1 failed + 49 queued`；active route v3=`1/1/10`；v4=`8/6/300` 的 impact-check 返回 `49` 与 `capacity_below_active_tasks`。
- `backend/src/modules/system-control/system-control.routing.service.ts`：上述 active 查询和 `maxConcurrentJobs < activeTaskCount` 判定。
- `docs/milestones/SYSTEM-ordered-execution-routing.md`：三项容量按目标分别约束并发 Attempt、项目并发 Attempt、queued Job。
- 本片只新增本诊断文档；未改业务代码、合同、数据库、服务器、route、budget、Worker 或 Provider。

remaining_gap: 当前 impact-check 仍会阻断 queued backlog 大于 maxConcurrentJobs 的扩容候选；若不等待队列降至 8 以下，无法通过现有批准链发布 v4。

next_owner: PLANNER / SYSTEM-CONTROL

residual: 真实 batch、active route v3、未批准 v4 均保持原状；未调用 Provider/COS、未读 Secret、未部署。
