# OCR-SIDECAR-VERSION-AUDIT-1693 结果

- `outcome`: `passed`
- `version_drift`: `true`
- `target`: `103.36.63.67`
- `next_owner`: 规划/后端
- `requires_user`: `true`（若要更新 sidecar runtime，需另行授权）

## 活动 runtime 与 systemd

- Fragment：`/etc/systemd/system/qimao-local-ocr-openvino.service`
- DropIn：`/etc/systemd/system/qimao-local-ocr-openvino.service.d/geometry-1628-r3.conf`
- Effective `ExecStart=/usr/local/bin/node /opt/qimao/local-ocr/20260831-local-ocr-geometry-r3/node/entry.js`
- Effective `WorkingDirectory=/opt/qimao/local-ocr/20260831-local-ocr-geometry-r3/node`
- PID `802334` 的 exe=`/opt/node-v24.19.0-linux-x64/bin/node`、cwd 为上述 geometry-r3 node 目录；sidecar 保持 active/running、`NRestarts=0`。

## 文件比对

| 文件 | 活动 runtime | current | 结论 |
|---|---|---|---|
| `entry.js` | 1139 bytes，SHA-256 `28853cc19392fa7fef149f48c8002089f33c9772f0bb91e5b8090d60bc13e200` | 1139 bytes，同 SHA | 相同 |
| `sidecar.js` | 28940 bytes，SHA-256 `99ee3eb60a220b5c41ed7f1a50a2020c50d9511ce37f5e2198ee475c5967c3ed` | 29118 bytes，SHA-256 `a45a73beb385a4bdc0bd271b4a82c4c07b544319739a5e34b46beb25f5623e99` | 漂移 |

活动 runtime 的 `sidecar.js` 与 current 不是同一版本；`entry.js` 本身无漂移。

## 唯一已证实合同差量

协议常量、video/frame 类型集合以及 48MB body、7.5MB 单帧、32MB 总帧、600 帧、120MP 阈值在两份 sidecar 中一致。parser 唯一 wire 合同差量为 `videoDurationMs`：

- 活动 parser 的 `media` exact keys 为 `inputKind, contentType, sizeBytes, checksumAlgorithm, checksumValue, maxFrameCount, maxPixels`，**缺少 `videoDurationMs`**；它也不校验/回传该字段，并对 `capturedAtMs` 使用固定 86,400,000 上限。
- current parser 的 exact keys 包含 `videoDurationMs`，先校验其 1–86,400,000 范围，再用该值约束帧时间并回传到 normalized media。

因此 1692 构造的合法 current WireRequest（含 `videoDurationMs`）在活动 parser 的 exact-key 门被确定性拒绝为 `HTTP 400 LOCAL_OCR_REQUEST_INVALID`；不是模型 mismatch、body/raw-frame 阈值或 engine reject。未再次调用 sidecar。

## 可复用发布/回滚事实

- 可复用既有 runtime 发布模板：`deploy/ocr-geometry-1628/runner.sh`（geometry-1628 已验证的 root-only runtime/DropIn 流程）。
- 精确回滚目标：`/opt/qimao/local-ocr/20260827-local-ocr-04g-r1`。
- 本卡仅审计，未发布、未改 DropIn、未 daemon-reload、未重启或回滚。

## 状态与残留

- DB 批次仍为 `43 queued + 2 review_pending + 5 failed + 1 reconciliation_required`；episode 12 job/current attempt 仍为 `e49c697c-7595-4d6a-a069-f1dfc8d98afb` / `7b952d47-a8dc-46cf-a26b-980925d3a034`，未新增 attempt。
- backend PID `831090`、ASR PID `694703`、OpenVINO PID `802334` 均 active/running；常驻 screen `inactive/dead`、MainPID=0；健康 projects/asr=`200/200/200`。
- `qimao-sidecar-safe-body-diag-1692.service` 已 `LoadState=not-found`；专用 runtime 与 `/tmp/qimao-screen-text-*` 均无残留。
- 未调用 Worker/Provider，未修改代码、unit、DB、COS、route 或 budget。

## 剩余缺口

`remaining_gap`：活动 sidecar runtime 落后于 current 的 `videoDurationMs` wire 合同。需要规划/后端决定按既有 geometry-1628 模板发布兼容 runtime，或明确回滚；SERVER 不在本卡现场修改或重启。

