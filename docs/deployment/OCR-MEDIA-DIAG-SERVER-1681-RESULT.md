# OCR-MEDIA-DIAG-SERVER-1681 结果

- `outcome`: `passed`
- `artifact_written`: 2026-08-31
- `target`: `103.36.63.67`
- `next_owner`: 规划/后端（关联历史失败与本次成功读取，勿据此猜测根因）

## 范围与身份

仅在当前 `/opt/qimao-terms-cloud/current` release 中调用既有
`createScreenTextWorkerMediaSourceFromEnv` → `remoteMediaSource.read` 链路。未调用
Worker/`runOnce`，未启动常驻 unit，未写 DB/COS/route/budget，也未调用 ASR、DeepSeek、Tencent API 或 OpenVINO。

只读 DB 取得 episode 9 job `09214351-e243-47c3-8857-833d5cf7a74a` 的同一批次 Asset；Asset 身份、`sha256` 格式、视频类型和大小门通过（`contentType=video/mp4`、`sizeBytes=115254590`）。未输出 objectKey、URL、checksum、Secret 或媒体内容。

因前几次 SSH 输出通道未回传，为取得完整脱敏证据，同一只读链路共执行 4 次；每次均是同一 current、同一 Asset、同一函数链路，均未产生控制面写入。最后一次完整输出如下事实。

## 阶段证据

阶段顺序及结果：

1. `createGetUrl`：`passed`，返回地址协议为 `https:`；未暴露地址。
2. URL 校验：通过；随后进入抽帧器，未触发 `SOURCE_URL_INVALID`。
3. `spawn`：`frame-extractor.js` 启动，参数数量 18；进程退出码 `0`、无 signal。
4. 下载/探测/抽帧：抽帧器返回成功，`frameCount=88`、`videoDurationMs=87640`、`pixelCount=119675072`。
5. manifest/geometry：有界读取和几何校验通过；没有 `OUTPUT_INVALID`、`FRAME_OUTPUT_INVALID` 或 `FRAME_LIMIT_EXCEEDED`。
6. `remote_media_read`：`passed`，返回 `video/mp4`、`sizeBytes=115254590`、88 帧。

因此本次 `first_error_stage=none`，没有可报告的稳定首错。当前 extractor 没有独立的“下载 checksum 校验”结果接口（`extractorChecksumStage=not_exposed_by_current_extractor`）；本次也未观察到其失败。

## 状态不变与清理

诊断前后 DB 快照完全相同：批次为 `46 queued + 2 review_pending + 2 failed + 1 reconciliation_required`，总计 51；episode 7 仍为 `reconciliation_required`、current attempt `871fa4bb-cb8f-4146-abfa-54c13e882ae6`；episode 9 仍为 `failed`、current attempt `5a556e41-d5da-4bb2-a469-d5b9f7ed030c`、attempt 数 3。`stateUnchanged=true`。

- 常驻 screen worker：`inactive/dead`、`MainPID=0`。
- backend：`active/running` PID `827940`；ASR：`active/running` PID `694703`；OpenVINO：`active/running` PID `802334`，均未因本诊断改变。
- transient `qimao-media-diag-1681.service`：已回收、`LoadState=not-found`；`/run/qimao-media-diag-1681`、`/tmp/qimao-media-diag-1681` 及专用 frame 临时子项均 absent（`temp_children=0`）。

## 剩余缺口

历史 episode 9 attempt 3 曾以 `SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE` 失败，但本次同一 Asset 的签名 GET、URL 校验、spawn、抽帧及 manifest/geometry 全部成功，故无法复现该失败，也不能安全指定唯一根因。后续应由规划/后端基于同一时间窗的存储/抽帧日志继续关联；不得因此自动重跑 Worker 或修改任务状态。
