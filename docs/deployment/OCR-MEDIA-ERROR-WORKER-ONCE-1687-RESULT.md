# OCR-MEDIA-ERROR-WORKER-ONCE-1687 结果

- `outcome`: `passed`（受控执行完成；业务终态为确定性失败并按停止门收口）
- `target`: `103.36.63.67`
- `next_owner`: 规划/后端（处理 `SCREEN_TEXT_MEDIA_UNKNOWN`，不得自动重跑）
- `requires_user`: `false`（本卡无待用户确认的清理项）

## 执行边界

- 执行前 `current=/opt/qimao-terms-cloud/releases/ocr-media-error-20260831-r1`。
- 常驻 `qimao-worker@screen-text.worker.entry.js.service` 执行前为 `inactive/dead`、`MainPID=0`、`NRestarts=0`，未启动常驻 Worker。
- 批次 `c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25` 执行前为 `45 queued + 2 review_pending + 3 failed + 1 reconciliation_required`，总计 51；未 retry/cancel 任何旧失败项。
- 仅调用一次 `systemd-run --wait --pipe --collect` transient oneshot `qimao-screen-text-once-1687`，以 `qimao:qimao`、当前 entry `--once`、既有四份 EnvironmentFile、`TimeoutStartSec=300s` 执行。未启动常驻 unit，未进行第二次 claim。

安全 stdout：

```json
{"processed":true,"projectId":"af8425c4-65cf-427a-94f2-e3e53ec83baa","batchId":"c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25","jobId":"f9083f56-f99e-43cd-b0e8-1bcf485875c4","episodeNumber":11,"outcome":"failed"}
```

transient 返回码为 0；得到首个确定性业务终态后立即停止。

## 唯一新 attempt 与终态

唯一处理的是 episode 11：

- job：`f9083f56-f99e-43cd-b0e8-1bcf485875c4`，最终 `failed`，current attempt=`4fd5de8e-b05e-40b6-ace6-2017bbf87ddf`。
- 新 attempt：第 3 次，`created_at=2026-08-31 23:58:51.113248+08`，`completed_at=2026-08-31 23:58:51.212+08`；执行窗口内仅新增该 attempt。
- `error_code=SCREEN_TEXT_MEDIA_UNKNOWN`
- `receipt=simulated`，`effect_class=external_not_accepted`
- `provider_request_id=NULL`，`retryable=false`，`external_side_effect_possible=false`
- stats：`ocrFrameCount=0`、`probedFrameCount=0`、`candidateCount=0`、`deduplicatedFrameCount=0`、`processingDurationMs=0`
- `usage=NULL`；episode 11 `candidates=0`、`withEvidence=0`，无证据对象写入。
- 安全错误详情：媒体准备阶段失败，未调用 OCR Adapter。按 `UNKNOWN` 停止门未重试。

批次执行后为 `44 queued + 2 review_pending + 4 failed + 1 reconciliation_required`，总计 51，revision=`4`；`running/completed/cancelled=0`。前后差异恰为一个 queued job 与一个新 attempt。episode 7、9、10 的 job/current attempt/终态/attempt 数未改变。

## 运行态与健康

- backend：`active/running`，PID `831090`，`NRestarts=0`，`ExecMainStatus=0`。
- ASR：`active/running`，PID `694703`，`NRestarts=0`，`ExecMainStatus=0`。
- 常驻 screen-text：`inactive/dead`，`MainPID=0`，`NRestarts=0`，`ExecMainStatus=0`。
- OpenVINO：`active/running`，PID `802334`，`NRestarts=0`，`ExecMainStatus=0`。
- `GET http://127.0.0.1:3001/health`=`200`，`status=ok`、`database=connected`。
- `/projects/1`=`200`、`/projects/1/asr`=`200`；无请求体访问 sidecar `/ocr`=`405 LOCAL_OCR_REQUEST_INVALID`（预期合同响应）。

## 清理与剩余缺口

- `qimao-screen-text-once-1687.service`：`LoadState=not-found`（已 `--collect` 回收）。
- `/run/qimao-screen-text-once-1687`、`/run/qimao-ocr-worker-once-1687`、`/var/tmp/qimao-ocr-worker-once-1687-inbound` 均 absent。
- 本卡专用临时 health/sidecar 响应文件已显式删除并复核为 absent；无残留需继续清理。
- `remaining_gap`：episode 11 在媒体准备阶段确定性返回 `SCREEN_TEXT_MEDIA_UNKNOWN`，未进入 OpenVINO/OCR；需规划/后端基于媒体权威身份继续诊断。不得自动重跑或消费下一条队列。

