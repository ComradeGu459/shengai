# TENCENT-ASR-SERVER-04L 结果

```yaml
artifact_written: true
outcome: blocked
task: TENCENT-ASR-SERVER-04L
current: v4-1301
lease: 1
role: SERVER
server: 103.36.63.67
source: E:\七猫兼职\02_项目\05_妈妈是神在人间的分神\原始素材\视频\24.mp4
source_bytes: 56060105
source_modified: false
required_mp4_sha256: e2d34f3c511db14acdeb4dd6ac411a32377a386709bd8842010f8239b2f49a4b
requires_user: true
next_owner: PLANNING
```

## 结果

本轮在本机媒体硬门 blocked。指定源文件只读大小为 `56,060,105` bytes；按 04K 固定配方截取 5–20 秒、清除 metadata/chapters、生成 H.264 + AAC 低码率 MP4。ffprobe 证明派生文件合法，但其 bytes/SHA 不符合本卡冻结值：

- 实际：`437,785` bytes，SHA256 `0d0caeb5bbb7b76b338f688e3bf6629d0ed22cbc39ebd07c67976baec86bf01a`。
- 要求：`439,529` bytes，SHA256 `e2d34f3c511db14acdeb4dd6ac411a32377a386709bd8842010f8239b2f49a4b`。
- ffprobe：15.000000 秒，540×960，恰有一条 `h264/video` 与一条 `aac/audio`，AAC 16 kHz 单声道。

按 04L 停止条件未调参、未重生、未换素材、未安装软件，也未执行远端或外部动作。不输出语音正文。

## 未执行项目

未上传派生片段或候选 archive，未运行 bootstrap/harness；隔离 DB、release/env、loopback、manifest/upload verify、terms、engine/route/budget、batch/dispatch、COS、Tencent `CreateRecTask`/TaskId、ASR job/cues/usage/log/budget 均为 0。生产 DB/current/控制面/公网路由无写入。

## 清理与残留

- 本机派生 MP4 临时目录已删除，最终 `local_media_residual=False`。
- 未创建远端临时根，无远端 harness/release/env/media/temp、隔离 DB、COS 对象或 Tencent TaskId 可清理。
- 源文件未修改或移动，大小复核仍为 `56,060,105` bytes。
- 本轮仅新增本结果文档，未修改业务源码、candidate、declaration、probe 或 lock。

## remaining_gap / requires_user

`remaining_gap`: 04K 冻结派生 MP4 的 bytes/SHA 无法由本轮固定配方复现。`Owner=PLANNING`。在规划重新确认冻结载荷或给出明确可验收决策前，不得继续调参、重生、换素材、上传或产生第二外部事实。

`requires_user: true`。
