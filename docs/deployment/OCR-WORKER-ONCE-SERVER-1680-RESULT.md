# OCR-WORKER-ONCE-SERVER-1680 结果

- `outcome`: `passed`
- `artifact_written`: 2026-08-31
- `target`: `103.36.63.67`
- `next_owner`: 规划任务（处理输入媒体不可用；不得自动重跑本卡）

## 执行范围

生产 current 保持为 `/opt/qimao-terms-cloud/releases/ocr-worker-once-20260831-r1`。执行前只读核对通过：

- 常驻 `qimao-worker@screen-text.worker.entry.js.service` 为 `inactive/dead`、`MainPID=0`；未使用 `systemctl start`。
- 当前模板使用 qimao 身份及现有 `EnvironmentFile`：`/etc/qimao-terms-cloud/backend.env`，以及对象存储、local OCR 和 frame-extractor drop-in；未读取或输出 Secret。
- 批次 `c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25`（project `af8425c4-65cf-427a-94f2-e3e53ec83baa`）执行前为 `47 queued + 2 review_pending + 1 failed + 1 reconciliation_required`，总计 51 条。
- 第 7 集仍为 job `ecadb66e-c4c3-4756-82c1-3103fa044011`、current attempt `871fa4bb-cb8f-4146-abfa-54c13e882ae6`、`reconciliation_required`；未对其执行任何操作。

## 唯一一次执行

仅执行一次 systemd transient oneshot（`Type=oneshot`、`User/Group=qimao`、四个既有 EnvironmentFile、`TimeoutStartSec=300s`），命令为当前 entry 的 `--once`；没有启动常驻 unit、没有 retry/cancel、没有手改 DB/route/budget，也没有调用 ASR、DeepSeek 或 Tencent API。

安全 stdout（原样）：

```json
{"processed":true,"projectId":"af8425c4-65cf-427a-94f2-e3e53ec83baa","batchId":"c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25","jobId":"09214351-e243-47c3-8857-833d5cf7a74a","episodeNumber":9,"outcome":"failed"}
```

transient unit `qimao-screen-text-once-1680.service` 在执行后为 `LoadState=not-found`（`--collect` 已回收）；本次受限执行退出 0。按照“单次终态”合同，`processed=true` 且得到确定性 `failed` 终态后停止，未重跑。

## 唯一作业与终态

唯一处理的是 episode 9：

- job：`09214351-e243-47c3-8857-833d5cf7a74a`，最终 `failed`，current attempt=`5a556e41-d5da-4bb2-a469-d5b9f7ed030c`。
- 新 attempt：第 3 次，`created_at=2026-08-31T23:16:13.700868+08:00`，`completed_at=2026-08-31T23:16:13.803+08:00`；批次中该执行窗口只发现这一条新 attempt。
- 不可变路由身份：`self_hosted_worker/openvino/screen_text_openvino_ppocrv6_small/PP-OCRv6-Small@sha256:860f0a4b8354a510fe0f739c3f0e7f758cf59dd78edd529c7c2fbf48c5c28ca8/zh-CN/loopback_http`。
- 结果：`receipt=simulated`、`effect_class=external_not_accepted`、`provider_request_id=NULL`、`error_code=SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE`、`retryable=false`、`external_side_effect_possible=false`。`error_detail` 为“服务端无法从权威对象身份取得并校验受控抽帧输入。”
- stats：`ocrFrameCount=0`、`probedFrameCount=0`、`candidateCount=0`、`deduplicatedFrameCount=0`、`processingDurationMs=0`；usage 为 `NULL`。
- episode 9 candidates=`0`、withEvidence=`0`、evidenceItems=`0`，因此没有 COS 证据对象写入。

执行后批次为 `reconciliation_required`、revision `4`，51 条变为：`46 queued + 2 review_pending + 2 failed + 1 reconciliation_required`，`running/completed/cancelled=0`。执行前后差异恰为一个 queued job 和一个新 attempt；其余 46 个 queued 未触碰。第 7 集身份与终态保持不变：job/attempt 仍为上列 ID，`reconciliation_required`、`LOCAL_OCR_UNKNOWN`、`receipt=unknown`、`effect_class=external_unknown`、`provider_request_id=local-ocr-sidecar:871fa4bb-cb8f-4146-abfa-54c13e882ae6`。

## 运行态与清理

- backend：`active/running`，PID `827940`，`NRestarts=0`；ASR worker：`active/running`，PID `694703`；OpenVINO：`active/running`，PID `802334`。
- 常驻 screen worker：`inactive/dead`、`MainPID=0`；未因本卡启动。`GET http://127.0.0.1:3001/health`=`200`；未认证 `/api/projects` 和 `/api/asr/health` 均为预期 `401 EMPLOYEE_AUTH_REQUIRED`；OpenVINO `GET http://127.0.0.1:3100/ocr`=`405 LOCAL_OCR_REQUEST_INVALID`。
- 专用 inbound、runtime 和 transient 残留均 absent；没有回滚动作需要执行，因为本卡只运行 transient `--once`，未改 current、env、route 或常驻服务。

## 剩余缺口

`remaining_gap`: episode 9 的受控抽帧输入仍无法从权威对象身份取得，因而以确定性、不可重试的 `SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE` 失败；46 条 queued 保持原状，第 7 集仍需既有 reconciliation 流程。后续须由规划/后端先解决媒体输入或对账事实，再另行授权；本卡不得自动重跑。
