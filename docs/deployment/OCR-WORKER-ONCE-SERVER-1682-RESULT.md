# OCR-WORKER-ONCE-SERVER-1682 结果

- `outcome`: `passed`
- `artifact_written`: 2026-08-31
- `target`: `103.36.63.67`
- `next_owner`: 规划/后端（关联媒体读取间歇差异；本卡不再重跑）

## 执行前置

- current=`/opt/qimao-terms-cloud/releases/ocr-worker-once-20260831-r1`。
- 常驻 `qimao-worker@screen-text.worker.entry.js.service` 为 `inactive/dead`、`MainPID=0`；未执行 `systemctl start`。
- 批次 `c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25`（project `af8425c4-65cf-427a-94f2-e3e53ec83baa`）为 `46 queued + 2 review_pending + 2 failed + 1 reconciliation_required`，总计 51。
- episode 7：job `ecadb66e-c4c3-4756-82c1-3103fa044011`、current attempt `871fa4bb-cb8f-4146-abfa-54c13e882ae6`、`reconciliation_required`。
- episode 9：job `09214351-e243-47c3-8857-833d5cf7a74a`、current attempt `5a556e41-d5da-4bb2-a469-d5b9f7ed030c`、`failed`、attempt 数 3。

## 唯一一次执行

仅运行一次当前 entry 的受控 systemd transient `--once`（qimao 身份、既有四个 EnvironmentFile、`TimeoutStartSec=300s`）；未启动常驻 Worker，未 retry/cancel，未改代码、route、budget、Secret 或手写 DB。

安全 stdout（原样）：

```json
{"processed":true,"projectId":"af8425c4-65cf-427a-94f2-e3e53ec83baa","batchId":"c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25","jobId":"8ce0f5f9-1cdb-4029-b6e4-11ae49f7ae4e","episodeNumber":10,"outcome":"failed"}
```

transient unit `qimao-screen-text-once-1682.service` 执行退出 0，随后 `--collect` 回收；收到确定性终态后立即停止，未再次 claim。

## 唯一新 attempt 与终态

唯一处理的是 episode 10：

- job：`8ce0f5f9-1cdb-4029-b6e4-11ae49f7ae4e`，最终 `failed`，current attempt=`a4871404-3777-4dc4-873b-bdbeaa48a20e`。
- 新 attempt：第 3 次，`created_at=2026-08-31T23:33:53.165238+08:00`，`completed_at=2026-08-31T23:33:53.261+08:00`。执行后窗口内仅发现该一条新 attempt。
- 路由身份：`self_hosted_worker/openvino/screen_text_openvino_ppocrv6_small/loopback_http`，model 为已登记 PP-OCRv6-Small 版本。
- 终态：`receipt=simulated`、`effect_class=external_not_accepted`、`provider_request_id=NULL`、`error_code=SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE`、`retryable=false`、`external_side_effect_possible=false`；错误详情为“服务端无法从权威对象身份取得并校验受控抽帧输入。”
- stats 全 0（OCR/probe/candidate/deduplicated/duration），usage=`NULL`；episode 10 candidates=`0`、withEvidence=`0`，无证据对象写入。

批次由执行前的 `46 queued + 2 review_pending + 2 failed + 1 reconciliation_required` 变为 `45 queued + 2 review_pending + 3 failed + 1 reconciliation_required`，`running/completed/cancelled=0`。差异恰为一个 queued job 和一个新 attempt；episode 7、episode 9 及其 current attempt/attempt 数完全不变。

## 运行态与清理

- backend：`active/running` PID `827940`；ASR worker：`active/running` PID `694703`；OpenVINO：`active/running` PID `802334`；均未因本卡改变。
- 常驻 screen worker 仍 `inactive/dead`、`MainPID=0`；`GET http://127.0.0.1:3001/health`=`200`，OpenVINO `GET http://127.0.0.1:3100/ocr`=`405 LOCAL_OCR_REQUEST_INVALID`。
- `/run/qimao-screen-text-once-1682`、`/run/qimao-ocr-worker-once-1682`、`/var/tmp/qimao-ocr-worker-once-1682-inbound` 均 absent；无 transient 或临时文件残留。
- 未调用 ASR、DeepSeek、Tencent API；除 Worker 为本次唯一 attempt/job 更新外，无额外 DB/COS/route/budget 写入。

## 剩余缺口

`remaining_gap`: 本次 Worker 再次在媒体取得阶段以 `SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE` 确定性失败；但 1681 对同一 Asset 的独立媒体链路曾完整成功，说明当前存在尚未关联的间歇差异，不能猜测根因。后续应由规划/后端结合同一时间窗的存储与抽帧日志处理；本卡不得自动重跑或消费下一条队列。
