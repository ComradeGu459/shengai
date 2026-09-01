# OCR-RECOVERY-SERVER-1673 结果

- `outcome`: `blocked`
- `target`: `103.36.63.67`
- `next_owner`: 规划任务裁决后续证据或恢复方案
- `scope`: 仅生产只读 DB、journal、current 与四个 unit；未执行任何写入、Worker 启动、retry/cancel、Provider 调用或部署。

## 当前 OCR 批次

批次 `c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25`（project `af8425c4-65cf-427a-94f2-e3e53ec83baa`）为 `reconciliation_required`、revision `4`，共 51 条：`47 queued + 2 review_pending + 1 failed + 1 reconciliation_required`，`running/completed/cancelled=0`。

## 第 7 集稳定身份

- job：`ecadb66e-c4c3-4756-82c1-3103fa044011`，episode `7`，current_attempt=`871fa4bb-cb8f-4146-abfa-54c13e882ae6`，job/attempt 均 `reconciliation_required`。
- attempt：第 `3` 次，`self_hosted_worker/openvino/screen_text_openvino_ppocrv6_small/loopback_http`，provider_request_id=`local-ocr-sidecar:871fa4bb-cb8f-4146-abfa-54c13e882ae6`。
- 结果字段：`receipt=unknown`、`effect_class=external_unknown`、`error_code=LOCAL_OCR_UNKNOWN`、`retryable=false`、`external_side_effect_possible=true`；`budget_reservation_id=null`。
- `error_detail`：`本地 OCR endpoint 返回未知结果，必须对账。`；stats 为 0 帧/0 candidate，episode7 candidates=0；usage billingQuantity/finalAmount 均 0，reconciliationStatus=`pending`。
- 历史 attempt 1/2 均为同一 job 的 `SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE`、无 provider_request_id、无外部副作用；未发现第 7 集的另一条 current identity。

## 超时证据判定

未发现严格 `HTTP 504 + LOCAL_OCR_ENGINE_TIMEOUT` 证据。指定 Attempt 时间窗口的 backend/OpenVINO journal 无匹配条目；OpenVINO journal 仅见启动 listening 记录。backend 文件日志只显示同批次 retry API 请求 `200`，没有该 AttemptId、504 或 `LOCAL_OCR_ENGINE_TIMEOUT`。因此 `LOCAL_OCR_UNKNOWN` 不能依据现有证据安全收敛为可重试的确定性引擎超时。

## 当前运行状态

- current=`/opt/qimao-terms-cloud/releases/ocr-timeout-20260831-r1`；员工 static=`/srv/qimao-terms-cloud/frontend-asr-srt-compare-20260831-r2`。
- backend `active/running/0/0` PID `825784`；ASR `active/running/0/0` PID `694703`；screen `inactive/dead/0/0` PID `0`；OpenVINO `active/running/0/0` PID `802334`。
- timeout 配置为 backend/sidecar `60000ms`；health、projects、asr HTTP=`200/200/200`。
- sidecar `GET /ocr` 返回 `405 application/json; charset=utf-8`，错误码 `LOCAL_OCR_REQUEST_INVALID`。

## 剩余缺口

`remaining_gap`: 缺少严格 `504 + LOCAL_OCR_ENGINE_TIMEOUT` 与同一 Attempt 的可验证 sidecar 记录；不能把未知状态改写为确定性超时，也不能重发或启动 Worker。第 7 集及剩余队列保持原状。

