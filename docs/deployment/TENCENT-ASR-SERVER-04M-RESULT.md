# TENCENT-ASR-SERVER-04M 结果

```yaml
artifact_written: true
outcome: blocked
task: TENCENT-ASR-SERVER-04M
current: v4-1301
lease: 1
role: SERVER
server: 103.36.63.67
source: E:\七猫兼职\02_项目\05_妈妈是神在人间的分神\原始素材\视频\24.mp4
source_bytes: 56060105
source_modified: false
media_bytes: 438888
media_sha256: 5df706698aeca5bdefc79b4570a32a73e5e3c4eebdbf1c6ed581996f031f8b3c
requires_user: true
next_owner: PLANNING
```

## 结果

本轮在远端 harness 首门 blocked。按 04K 固定配方对指定 `24.mp4` 只读截取 5–20 秒，派生片段本机媒体门通过；远端 bootstrap 语法检查通过，但 business harness 暂存文件名为 `.mjs.stage`，执行 `node --check` 时返回 `ERR_UNKNOWN_FILE_EXTENSION`。按 04M 停止条件未修补、不改名、不重试、不产生第二外部事实。

## 媒体证据

- 只读取指定源文件，源大小为 `56,060,105` bytes；未读取其他素材、未修改或移动源文件。
- 派生文件为 15.000000 秒、540×960、`h264/video` + `aac/audio`，AAC 16 kHz 单声道；已清除 metadata/chapters，未上传整集。
- 本轮当次派生 MP4：`438,888` bytes，SHA256 `5df706698aeca5bdefc79b4570a32a73e5e3c4eebdbf1c6ed581996f031f8b3c`。本轮未与历史派生 SHA 比较。

## 远端门与未执行项目

- 已上传同一当次派生 MP4，并核对远端文件 SHA 等于 `5df706698aeca5bdefc79b4570a32a73e5e3c4eebdbf1c6ed581996f031f8b3c`；同时上传的 candidate archive/harness 仅为执行所需技术文件，未上传整集源文件。
- bootstrap `/usr/local/bin/node --check` 通过；business harness 的 `.mjs.stage` 检查失败，唯一首因为 `ERR_UNKNOWN_FILE_EXTENSION`。
- provider.env 未安装，隔离 DB 未创建，业务 harness 未以 qimao 身份运行；manifest/upload verify、terms、engine/route/budget、batch/dispatch、COS、Tencent `CreateRecTask`/TaskId、ASR job/cues/usage/log/budget 均为 0。
- 生产 DB/current/控制面/公网路由无写入；生产 `/etc/qimao-terms-cloud/provider.env` 只读确认仍 absent。

## 清理与残留

- bootstrap 精确清理返回 `residual:false`，固定远端临时根 `/tmp/qimao-asr-04m-r1` 随后只读确认不存在。
- 本机派生媒体目录已删除，`local_media_residual=False`；本地 bootstrap/business harness 已删除。
- 无隔离 DB、COS 对象或 Tencent TaskId 需要清理。
- 源文件大小复核仍为 `56,060,105` bytes。本轮仅新增本结果文档，未修改业务源码、candidate、declaration、probe 或 lock。

## remaining_gap / requires_user

`remaining_gap`: 远端业务 harness 的文件化语法门未通过，原因是暂存扩展名 `.mjs.stage` 不被 Node `--check` 接受。`Owner=PLANNING`。后续是否允许修正暂存命名并重新获得一次执行授权需由规划裁决；本卡不自动重试、不更换身份/素材、不安装软件。

`requires_user: true`。
