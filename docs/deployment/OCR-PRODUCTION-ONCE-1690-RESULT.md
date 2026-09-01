# OCR-PRODUCTION-ONCE-1690 结果

- `outcome`: `passed`（同构生产 `--once` 完成并按首个终态收口）
- `business_outcome`: `failed`
- `target`: `103.36.63.67`
- `next_owner`: 规划/后端
- `requires_user`: `false`

## 执行边界与前置

- current：`/opt/qimao-terms-cloud/releases/ocr-media-error-20260831-r1`。
- 常驻 `qimao-worker@screen-text.worker.entry.js.service` 保持 `inactive/dead`、`MainPID=0`、`NRestarts=0`；未启动常驻 Worker。
- 执行前批次 `c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25` 为 `44 queued + 2 review_pending + 4 failed + 1 reconciliation_required`，101 个 attempts；episode 7/9/10/11 旧异常身份未操作。
- 仅执行一次与 canonical unit 同构的 transient `qimao-screen-text-once-1690`：`User/Group=qimao`、`WorkingDirectory=/opt/qimao-terms-cloud/current`、四份既有 EnvironmentFile、`PrivateTmp=yes`、`ProtectSystem=strict`、`ProtectHome=yes`、`ReadWritePaths=/var/log/qimao-terms-cloud`、`NoNewPrivileges=yes`、`UMask=0027`，当前 entry 加 `--once`。未 retry/cancel、未执行第二次 claim。

安全 stdout：

```json
{"processed":true,"projectId":"af8425c4-65cf-427a-94f2-e3e53ec83baa","batchId":"c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25","jobId":"e49c697c-7595-4d6a-a069-f1dfc8d98afb","episodeNumber":12,"outcome":"failed"}
```

## 唯一新 attempt 与终态

唯一处理的是 episode 12：

- job：`e49c697c-7595-4d6a-a069-f1dfc8d98afb`；新 current attempt：`7b952d47-a8dc-46cf-a26b-980925d3a034`，第 3 次。
- 时间：`created_at=2026-09-01 00:12:08.111818+08`，`completed_at=2026-09-01 00:12:27.395+08`。
- 路由身份：`self_hosted_worker/openvino/screen_text_openvino_ppocrv6_small/PP-OCRv6-Small@sha256:860f0a4b8354a510fe0f739c3f0e7f758cf59dd78edd529c7c2fbf48c5c28ca8/zh-CN/loopback_http`。
- OpenVINO request identity：`local-ocr-sidecar:7b952d47-a8dc-46cf-a26b-980925d3a034`。
- 终态：`failed`、`error_code=LOCAL_OCR_REJECTED`、`receipt=unsupported`、`effect_class=external_not_accepted`、`retryable=false`、`external_side_effect_possible=false`。
- stats 全 0：`ocrFrameCount=0`、`probedFrameCount=0`、`candidateCount=0`、`deduplicatedFrameCount=0`、`processingDurationMs=0`；`video_duration_ms` 未生成。
- usage 为 OpenVINO 本地计费最终 0：`billingUnit=local_frame`、`billingQuantity=0`、`finalAmountCny=0.000000`、`reconciliationStatus=final`。
- episode 12 候选/证据计数为 `0/0`，未写入 COS 证据对象。

该失败属于明确拒绝，不是 submitted 成功；按“任何失败立即停止”门未重试。

## 批次、服务与清理

- 执行后批次为 `43 queued + 2 review_pending + 5 failed + 1 reconciliation_required`，总计 51，revision=`4`；101→102 attempts，差异恰为一个 queued job 与一个新 attempt。episode 7/9/10/11 的 job、current attempt、状态和 attempt 数不变。
- backend：`active/running` PID `831090`；ASR：`active/running` PID `694703`；OpenVINO：`active/running` PID `802334`；常驻 screen：`inactive/dead`、`MainPID=0`；四 unit `NRestarts=0`，PID/状态未变。
- health=`200`，projects/1=`200`，projects/1/asr=`200`；无请求体 sidecar `/ocr`=`405 LOCAL_OCR_REQUEST_INVALID`。
- `qimao-screen-text-once-1690.service` 已 `--collect`、`LoadState=not-found`；`/run/qimao-screen-text-once-1690`、`/run/qimao-ocr-worker-once-1690`、`/var/tmp/qimao-ocr-worker-once-1690-inbound` 均 absent。
- 未改代码、unit、route、budget、Secret；未调用 ASR/DeepSeek，未发生可接受的外部 Provider 副作用。

## 剩余缺口

`remaining_gap`：episode 12 已进入 OpenVINO loopback 请求阶段，但因本地 OCR 合同拒绝而以 `LOCAL_OCR_REJECTED` 结束，未形成真实 submitted/review_pending 结果。需规划/后端检查 sidecar 请求合同；禁止自动重跑或消费下一条队列。

