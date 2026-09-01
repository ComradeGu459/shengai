# OCR-MEDIA-UNKNOWN-DIAG-1688 结果

- `outcome`: `passed`（只读诊断 harness 完成并取得稳定首阶段证据）
- `diagnostic_outcome`: `failed`（媒体准备阶段首因）
- `target`: `103.36.63.67`
- `next_owner`: 规划/后端
- `requires_user`: `false`

## 范围与身份

- 使用 current `/opt/qimao-terms-cloud/current`、`qimao` 身份及现有四份 EnvironmentFile。
- 固定读取 batch `c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25` 的 episode 11：job `f9083f56-f99e-43cd-b0e8-1bcf485875c4`、current attempt `4fd5de8e-b05e-40b6-ace6-2017bbf87ddf`、asset `e732f252-990b-490b-bd25-abc18d01d780`。
- 媒体安全身份：`contentType=video/mp4`、`sizeBytes=152375338`。未输出 objectKey、URL、checksum、Secret 或原始消息。
- 首次 transient 仅在 harness 文件可读性门前终止，未进入媒体链；修正临时目录权限后仅执行一次有效诊断链，未运行 Worker、未 claim 队列。

## 阶段证据

| 阶段 | 结果 |
|---|---|
| storage `createGetUrl` | passed |
| HTTPS URL 校验 | passed |
| temp-dir 创建 | failed，安全错误 `SCREEN_TEXT_MEDIA_EACCES` |
| spawn/extract | not observed（未启动 frame-extractor） |
| manifest/cleanup | not reached（无临时目录可清理） |

唯一首阶段为 `temp_dir`，`error_class=Error`、`error_code=SCREEN_TEXT_MEDIA_EACCES`。因此未调用 frame-extractor、OpenVINO/OCR sidecar、ASR 或 DeepSeek，也没有媒体下载、抽帧、manifest 或 COS 证据写入。

## DB 与服务不变

- harness 内只读快照前后一致：批次仍为 `44 queued + 2 review_pending + 4 failed + 1 reconciliation_required`，总计 51；episode 7/9/10/11 的 job、current attempt、状态和 attempt 数均未变；候选/证据计数未变（episode 11 为 `0/0`）。
- backend：`active/running` PID `831090`、`NRestarts=0`；ASR：`active/running` PID `694703`、`NRestarts=0`。
- 常驻 screen-text：`inactive/dead`、`MainPID=0`、`NRestarts=0`；OpenVINO：`active/running` PID `802334`、`NRestarts=0`。
- health=`200`，projects/1=`200`，projects/1/asr=`200`，无请求体 sidecar `/ocr`=`405 LOCAL_OCR_REQUEST_INVALID`。

## 清理与剩余缺口

- `qimao-media-unknown-diag-1688.service` 已 collect；`/run/qimao-media-unknown-diag-1688`、`/run/qimao-screen-text-once-1687` 均 absent。
- `/tmp/qimao-screen-text-*` 临时目录计数为 0；本卡未产生可归属的抽帧临时目录。
- `remaining_gap`：qimao 在默认临时目录创建阶段收到 `EACCES`，需后端/规划检查当前 temp 根的权限或 systemd 沙箱事实；禁止现场补丁、修改服务或自动重跑 Worker。

