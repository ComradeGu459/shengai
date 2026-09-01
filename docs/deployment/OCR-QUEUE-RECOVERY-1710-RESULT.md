# OCR-QUEUE-RECOVERY-1710 结果

- `artifact_written`: `true`
- `outcome`: `passed`
- `target`: `103.36.63.67`
- `next_owner`: `规划 / 审核工作台`
- `files`: `docs/deployment/OCR-QUEUE-RECOVERY-1710-RESULT.md`
- `requires_user`: `false`

## 前置只读证据

批次 `c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25` 的前置快照与 1709 收口一致：`42 queued + 3 review_pending + 5 failed + 1 reconciliation_required`，总计 51，revision=`4`，attempts=`103`。OpenVINO=`active/running/0/0` PID=`842128`，backend=`active/running/0/0` PID=`831090`，ASR=`active/running/0/0` PID=`694703`，常驻 screen=`inactive/dead/0/0` PID=`0`；backend health=`200`、sidecar health=`405`。

旧异常 episode 7/9/10/11/12 未操作；未执行 retry/cancel、未启动第二个 Worker。

## 受控恢复

在用户明确授权后，仅启动既有 canonical `qimao-worker@screen-text.worker.entry.js.service` 一次，处理当前 42 个 queued。监控每约 10 个成功终态输出聚合里程碑；未 retry/cancel、未重建批次、未修改代码/route/budget/Secret/provider。

守卫条件为首个新 failed/unknown/reconciliation、任一四 unit 或 health 漂移即停止；最终 queued=`0` 且 running=`0` 后停止 Worker。全程未命中异常守卫。

## 最终批次与业务结果

- 执行后批次 `c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25`：`0 queued + 45 review_pending + 5 failed + 1 reconciliation_required`，总计 51，revision=`4`，attempts=`145`（103→145，恰增加 42）。
- 相对 1709 的 42 个 queued 均形成确定性成功终态并进入 `review_pending`；新 failed=`0`、新 unknown=`0`、新 reconciliation=`0`，`running=0`、`cancelled=0`。
- 42 个新 completed attempts 的聚合统计：`probedFrameCount=3287`、`ocrFrameCount=3287`、`deduplicatedFrameCount=0`、`candidateCount=1386`、`processingDurationMs=0`。
- 候选/证据聚合：`candidates=1386`、`evidence=1386`，其中 41 个 job 产生候选，全部 `pending`；approved/edited/rejected 均为 0。
- usage 聚合为 OpenVINO 本地计费：`billingQuantity=0`、`finalAmount=0.000000`、`reconciliationStatus=final`。
- 新 attempts 时间窗为 `2026-09-01 02:49:17.852141+08` 至 `03:32:42.675+08`；唯一执行窗口内没有第二个 Worker claim。

## 残留

Worker 停止后：OpenVINO=`active/running/0/0` PID=`842128`，backend=`active/running/0/0` PID=`831090`，ASR=`active/running/0/0` PID=`694703`，常驻 screen=`inactive/dead/0/0` PID=`0`；backend health=`200`、sidecar health=`405`。canonical Worker 已停止，`LoadState=loaded`、`ActiveState=inactive`；无 transient 或专用临时路径残留，精确残留=`0`。

`goal_gap`：42 个任务已完成 OCR 并进入 `review_pending`，尚未进行人工审核确认；后续仅由审核工作台处理，不自动重跑或继续消费队列。
