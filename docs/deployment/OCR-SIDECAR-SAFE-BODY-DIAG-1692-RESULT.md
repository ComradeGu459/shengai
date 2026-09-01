# OCR-SIDECAR-SAFE-BODY-DIAG-1692 结果

- `outcome`: `passed`（唯一有效 POST 完成并取得严格安全响应）
- `sidecar_outcome`: `rejected`
- `target`: `103.36.63.67`
- `next_owner`: 规划/后端
- `requires_user`: `false`

## 请求边界

- 固定 episode 12：job `e49c697c-7595-4d6a-a069-f1dfc8d98afb`、attempt `7b952d47-a8dc-46cf-a26b-980925d3a034`、同一 Asset。
- 复用 1691 已验证的 WireRequest；canonical `PrivateTmp` transient，未经过 Worker/Adapter，未 claim 队列。
- 首次 transient 仅在 harness 解析门终止，未读取媒体、未发出 HTTP；修正后实际向既有 loopback endpoint 发送 POST **一次**，未重发、未保存响应。
- 未输出帧、识别文本/框、URL、objectKey、checksum 或 Secret。

## 安全响应

- endpoint 为受控 loopback；请求体 UTF-8 字节数 `5,822,910`，低于 48,000,000 上限。
- HTTP `400`，`content-type=application/json`，`cache-control=no-store`，耗时 `134ms`。
- 响应严格错误体形状通过：顶层仅 `error`，内部仅 `code,message`；安全码为 `LOCAL_OCR_REQUEST_INVALID`。
- 错误响应不回显 `attemptId/requestId/modelVersion`，故 `request_identity=not_applicable`；请求本身使用固定 attempt `7b952d47-a8dc-46cf-a26b-980925d3a034` 与对应 `local-ocr-sidecar:` identity。
- 未得到 `MODEL_MISMATCH`、`ENGINE_REJECTED`、超时或 unknown；本次唯一可证实的 sidecar 拒绝原因为 `REQUEST_INVALID`。

## 客户端前置验证

- signer、HTTPS URL 校验、抽帧均通过：`frameCount=74`、`totalRawFrameBytes=4,360,649`、`maxFrameBytes=100,627`、`pixelCount=119,730,816`、`videoDurationMs=73,960`。
- WireRequest 顶层/media 固定键、协议版本、frame 索引/时间/类型/几何、model digest 均通过；raw-frame 32MB 与 body 48MB 阈值均未超限。
- 因此 `LOCAL_OCR_REQUEST_INVALID` 不能归因于 1691 所检验的 body 大小或 raw-frame 32MB/48MB 缝隙；更具体的 sidecar parser 谓词仍需后端/sidecar 对照现行部署版本确定，不能猜测。

## 不变性与清理

- DB 前后只读快照完全一致：批次仍为 `43 queued + 2 review_pending + 5 failed + 1 reconciliation_required`；episode 7/9/10/11/12 的 job、current attempt、状态和 attempt 数未变。
- backend PID `831090`、ASR PID `694703`、OpenVINO PID `802334` 均 `active/running`、`NRestarts=0`；常驻 screen `inactive/dead`、`MainPID=0`。
- health/projects/asr=`200/200/200`；无体 GET sidecar=`405 LOCAL_OCR_REQUEST_INVALID`（独立健康探针）。
- `qimao-sidecar-safe-body-diag-1692.service` `LoadState=not-found`；专用 `/run` 目录与宿主 `/tmp/qimao-screen-text-*` 均无本卡残留。
- 未改代码、unit、DB、COS、route、budget 或 Secret；未调用 ASR/DeepSeek。

## 剩余缺口

`remaining_gap`：同一合法 WireRequest 在现行 sidecar 返回 `LOCAL_OCR_REQUEST_INVALID`，具体 parser 失败字段尚未由安全接口暴露。需要规划/后端对照 sidecar 实际运行版本与 client wire 合同后另行授权；不得自动重跑或现场补丁。

