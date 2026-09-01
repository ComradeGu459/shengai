# TENCENT-ASR-SERVER-04K 结果

```yaml
artifact_written: true
outcome: blocked
task: TENCENT-ASR-SERVER-04K
current: v4-1300
lease: 1
role: SERVER
server: 103.36.63.67
source: E:\七猫兼职\02_项目\05_妈妈是神在人间的分神\原始素材\视频\24.mp4
source_bytes: 56060105
source_modified: false
candidate_archive_sha256: e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30
requires_user: true
next_owner: PLANNING
```

## 结果

本轮 blocked。仅读取指定 `24.mp4`，未读取其他素材，未修改或移动源文件。派生 5–20 秒片段的本机媒体门通过，但远端文件化 harness 在临时 provider.env 安装后的统计阶段直接读取 root:qimao 0640 文件，返回 `EACCES`；按 04K 停止条件不修补、不重试、不产生第二外部事实。

## 媒体证据

- 源文件只读大小：`56,060,105` bytes。
- 本机使用既有 ffmpeg 8.0.1，派生 MP4 时只映射 video+audio，截取 15 秒、清除 metadata/chapters、H.264 + AAC、540×960、AAC 16 kHz 单声道。
- ffprobe：`15.000000` 秒，恰有一条 `h264/video` 和一条 `aac/audio`，无原片 data stream。
- 派生 MP4：`439,529` bytes，SHA256 `e2d34f3c511db14acdeb4dd6ac411a32377a386709bd8842010f8239b2f49a4b`。
- 隔离 terms 夹具 SRT：`112` bytes，SHA256 `4b5927b14d512012f3057b1b5c4c47ff8b6740ae59feac1f607c04214fce4ebd`；不在证据或日志中输出语音正文。

## 远端门与未执行项目

- 远端已核对派生 MP4/SRT 与候选 archive SHA；harness 通过 `/usr/local/bin/node --check`。
- provider.env 安装阶段唯一首因：`EACCES: permission denied, open '/tmp/qimao-asr-04k-r1/provider.env'`。原因是 harness 的统计函数在 root:qimao 0640 文件上执行直接读取；按用户停止条件未做第三次 harness 修补。
- 未进入 archive 解包后的业务链：隔离 DB/migrate、loopback app、manifest/upload verify、terms、engine/route/budget、batch/dispatch、`UploadCompletionWorker`、`AsrWorker` 均未执行。
- COS 无对象，Tencent `CreateRecTask`/TaskId Describe 为 0，ASR job/cues/usage/log/budget 事实为 0；生产 DB/current/控制面/公网路由无写入。

## 清理与残留

- 远端固定临时根 `/tmp/qimao-asr-04k-r1` 已由文件化 cleanup 删除，随后只读确认不存在；其中 archive、harness、provider.env、派生媒体和 staging 均已清理。
- 本机派生媒体目录已删除，`local_media_residual=False`；本地临时 harness 已删除。
- 生产 `/etc/qimao-terms-cloud/provider.env` 只读确认仍不存在；无 COS 对象、隔离 DB 或 Tencent TaskId 需要清理。
- 源文件大小复核仍为 `56,060,105` bytes。本轮仅新增本结果文档，未修改业务源码、candidate、declaration、probe 或 lock。

## remaining_gap / requires_user

`remaining_gap`: 文件化 harness 的 provider.env 统计必须通过受控 metadata/hash 方式读取 root-only 文件，而不是直接读取内容。`Owner=PLANNING`。本轮已按停止条件结束，后续是否允许修正 harness 需由规划重新裁决；不得在本卡自动重试或产生第二 Tencent 事实。

`requires_user: true`。
