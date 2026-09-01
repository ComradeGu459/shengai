# TENCENT-ASR-SERVER-04J 结果

```yaml
artifact_written: true
outcome: blocked
task: TENCENT-ASR-SERVER-04J
current: v4-1297
lease: 1
role: SERVER
server: 103.36.63.67
privacy: original_project_media_not_read
candidate_archive_sha256: e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30
requires_user: true
next_owner: PLANNING
```

## 结果

本轮 blocked。按规划选择仅使用匿名句子和本机 Windows SAPI；未读取 `E:\七猫兼职\02\_项目\05_妈妈是神在人间的分神` 原始素材。SAPI 在 `SelectVoice` 阶段返回：`No voice installed on the system or none available with the current security setting.`

根据 04J 停止条件，未安装软件、未换真实素材、未继续第三种生成方式，也未连接测试服务器。

## 本机门证据

- 已确认既有 ffmpeg/ffprobe 为 `D:\ChromeCoreDownloads\ffmpeg-8.0.1-essentials_build` 下的 8.0.1 构建。
- 文件化 PowerShell 生成脚本通过 Windows PowerShell 解析检查。
- 首次输出目录 `C:\tmp\qimao-asr-04j-local-20260828-r1` 因 ACL 拒绝创建；改用仓库父目录下的明确临时目录后，SAPI `SelectVoice` 成为唯一首因。
- WAV 未成功生成；ffmpeg、ffprobe 未到达，因此没有合法 MP4、video+audio/时长/codec、bytes 或 SHA256 证据。

## 未执行项目

以下均未发生：

- MP4 上传、manifest/upload verify、terms extraction/release。
- 隔离 DB/migrate、loopback app、`UploadCompletionWorker`、`AsrWorker`。
- COS 对象、Tencent `CreateRecTask`/TaskId Describe。
- engine/route/budget/batch/dispatch、ASR job/cues/usage/log/budget 事实。
- 生产 DB、current、控制面和公网路由写入。

## 清理与残留

- 本机临时媒体目录已按已解析的明确路径删除，最终 `local_media_residual=False`。
- 本地临时生成脚本已删除。
- 未上传任何文件，因此无远端 release/env/harness/media/temp、隔离 DB、COS 对象或 Tencent TaskId 需要清理。
- 本轮新增文件仅为本结果文档；未修改业务源码、candidate、declaration、probe 或 lock。

## remaining_gap / requires_user

`remaining_gap`: 当前 Windows 安全设置下没有可调用的中文 SAPI voice，无法产生匿名中文 WAV。`Owner=PLANNING`。后续必须先提供可用的既有中文 SAPI voice 或作出新的明确环境决策；在此之前不得安装软件、读取原始素材、重建 candidate、上传或创建 Tencent 任务。

`requires_user: true`。
