# OCR-PRODUCTION-ONCE-1709 结果

- `artifact_written`: `true`
- `outcome`: `passed`
- `business_outcome`: `review_pending`
- `target`: `103.36.63.67`
- `next_owner`: `规划 / 审核工作台`
- `requires_user`: `false`

## 执行边界与前置快照

本卡只执行一次与 canonical screen-text unit 同构的 PrivateTmp transient `qimao-screen-text-once-1709`，未启动常驻 Worker，未 retry/cancel，未进行第二次 claim；未修改 route、budget、Secret 或 provider 配置。

- `current`：`/opt/qimao-terms-cloud/releases/ocr-media-error-20260831-r1`。
- 执行前批次 `c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25`：`43 queued + 2 review_pending + 5 failed + 1 reconciliation_required`，总计 51；revision=`4`，attempts=`102`。
- 唯一候选为 episode 13，job=`038e6442-f2bf-4d78-a7f9-22d0c2a27da6`；旧异常 episode 7/9/10/11/12 的 job、current attempt、状态、attempt number 与 error code 均只读记录，未操作。
- 执行前服务：OpenVINO `active/running/0/0` PID=`842128`；backend `active/running/0/0` PID=`831090`；ASR `active/running/0/0` PID=`694703`；常驻 screen `inactive/dead/0/0` PID=`0`。

Transient 复制 canonical unit 的 `User/Group=qimao:qimao`、`WorkingDirectory=/opt/qimao-terms-cloud/current`、四份既有 EnvironmentFile、`PrivateTmp=yes`、`ProtectSystem=strict`、`ProtectHome=yes`、`ReadWritePaths=/var/log/qimao-terms-cloud`、`NoNewPrivileges=yes`、`UMask=0027`，执行当前 entry 的 `--once`。

## 安全 stdout 与唯一终态

transient 返回码为 `0`，安全 stdout 仅为：

```json
{"processed":true,"projectId":"af8425c4-65cf-427a-94f2-e3e53ec83baa","batchId":"c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25","jobId":"038e6442-f2bf-4d78-a7f9-22d0c2a27da6","episodeNumber":13,"outcome":"completed"}
```

这是本轮唯一处理的 job；得到确定性 `completed` 后立即停止，没有重发或消费下一条队列。

- 新 current attempt=`752aaaf7-71d5-4640-aa16-d0d3d3d97db0`，attempt number=`3`，status=`completed`。
- `provider_request_id=local-ocr-sidecar:752aaaf7-71d5-4640-aa16-d0d3d3d97db0`、`receipt=submitted`、`effect_class=completed`、`retryable=false`、`external_side_effect_possible=false`。
- job 终态为 `review_pending`，`video_duration_ms=66880`。
- job/attempt stats：`probedFrameCount=67`、`ocrFrameCount=67`、`deduplicatedFrameCount=0`、`candidateCount=5`、`processingDurationMs=0`。
- candidates=`5`，evidence=`5`，全部为 `pending`；未出现 approved/edited/rejected。
- usage 为 OpenVINO 本地计费：`billingUnit=local_frame`、`billingQuantity=0`、`estimatedAmount=0.000000`、`finalAmount=0.000000`、`reconciliationStatus=final`。

## 批次差异与不变性

执行后批次为 `42 queued + 3 review_pending + 5 failed + 1 reconciliation_required`，总计仍为 51，revision 仍为 `4`；`running=0`、`cancelled=0`，attempts=`103`。前后差异恰为一个 queued episode 13 job 转为 review_pending、增加一个 attempt 及其 5 个候选/证据；episode 7/9/10/11/12 的身份与终态完全不变。

## 服务、健康与清理

- OpenVINO：`active/running/0/0`，PID=`842128`（未漂移）。
- backend：`active/running/0/0`，PID=`831090`（未漂移）。
- ASR：`active/running/0/0`，PID=`694703`（未漂移）。
- 常驻 screen：`inactive/dead/0/0`，PID=`0`（未启动）。
- loopback health：backend `GET /health=200`；sidecar `GET /ocr=405`。
- `qimao-screen-text-once-1709.service` 已 `--collect`，`LoadState=not-found`；`/run/qimao-screen-text-once-1709`、`/run/qimao-ocr-worker-once-1709`、`/var/tmp/qimao-ocr-worker-once-1709-inbound` 与 transient unit 文件均 absent，精确残留=`0`。

`goal_gap`：业务结果已成功进入 `review_pending`，尚未进行人工审核确认；本卡不执行审核写入或后续队列消费。
