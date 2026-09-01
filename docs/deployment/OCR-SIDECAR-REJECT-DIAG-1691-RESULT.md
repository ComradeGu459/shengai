# OCR-SIDECAR-REJECT-DIAG-1691 结果

- `outcome`: `passed`（只读 signer+抽帧与合同计量完成）
- `contract_gap`: `false`
- `target`: `103.36.63.67`
- `next_owner`: 规划/后端
- `requires_user`: `false`

## 范围与身份

- 固定 episode 12：job `e49c697c-7595-4d6a-a069-f1dfc8d98afb`、attempt `7b952d47-a8dc-46cf-a26b-980925d3a034`、asset `c8d93803-1d0c-4bfb-909b-3a7438d650d9`。
- 使用 current `/opt/qimao-terms-cloud/current` 与 canonical PrivateTmp 沙箱；仅调用一次既有 signer+抽帧链。
- 未调用 `LocalOcrLoopbackTransport`/sidecar/OpenVINO/ASR/DeepSeek，未运行 Worker，未 claim 队列；未输出 objectKey、URL、checksum、Secret 或帧内容。

## 媒体与 WireRequest 计量

- 媒体：`contentType=video/mp4`、`sizeBytes=95767566`。
- `frameCount=74`、`totalRawFrameBytes=4360649`、`maxFrameBytes=100627`。
- `pixelCount=119730816`、`videoDurationMs=73960`。
- 按现有 `LocalOcrLoopbackTransport` 的 WireRequest JSON（帧字节 Base64、UTF-8）序列化：`requestBodyBytes=5822910`。
- 阈值：`raw_total > 32,000,000=false`、`request_body > 48,000,000=false`、`request_body <= 48,000,000=true`；因此 `contract_gap=false`。

## 协议与合法性

- 顶层固定字段 exact：`true`。
- `media` 固定字段 exact：`true`；`protocolVersion=screen_text_local_ocr_v1`。
- attempt UUID、request identity、`modelVersion`/SHA-256 digest 一致、语言 `zh-CN`：均 `true`。
- 媒体 shape、帧索引唯一性/范围、时间边界、帧类型与几何边界：均通过。
- `first_failed_predicate=none`；不存在由 32MB raw-frame 或 48MB body 阈值触发的失败谓词。

## 不变性与清理

- DB 前后只读快照完全一致：批次仍为 `43 queued + 2 review_pending + 5 failed + 1 reconciliation_required`；所有 job/current attempt/状态/attempt 数未变。
- backend PID `831090`、ASR PID `694703`、OpenVINO PID `802334` 均保持 `active/running`、`NRestarts=0`；常驻 screen 保持 `inactive/dead`、`MainPID=0`。
- health/projects/asr=`200/200/200`，无体 sidecar `/ocr`=`405 LOCAL_OCR_REQUEST_INVALID`（本卡未请求 sidecar）。
- `qimao-sidecar-reject-diag-1691.service` 已 collect、`LoadState=not-found`；运行目录与 `/tmp/qimao-screen-text-*` 均无本卡残留。

## 剩余缺口

`remaining_gap`：episode 12 的 `LOCAL_OCR_REJECTED` 不能归因于 32MB raw-frame/48MB body 缝隙；本次输入与 WireRequest 合同计量均在阈值内。仍需规划/后端检查 sidecar 对该请求返回 4xx 的具体合同拒绝原因；不得自动重跑或现场补丁。

