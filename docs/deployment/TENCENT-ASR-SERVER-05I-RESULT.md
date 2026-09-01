# TENCENT-ASR-SERVER-05I-SYNTHETIC

```yaml
artifact_written: true
outcome: blocked
slice_outcome: blocked
task: TENCENT-ASR-SERVER-05I-SYNTHETIC
current: v4-1312
lease: 1
role: SERVER
server: 103.36.63.67
root: /tmp/qimao-asr-05i-r1
env_dir: /tmp/qimao-asr-05i-r1/env
database: qimao_asr_05a_20260828_05i_01
run_id: asr-05i-20260828-r1
first_cause: SSH_PUBLICKEY_AUTH_FAILED
archive_sha256: e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30
media_bytes: 623252
media_sha256: fba25f5066f6f35ccdf05d9cbf1df5fa046781ada3d54a752cb1d8718aa2eb0a
remote_upload_count: 0
cos_upload_count: 0
create_rec_task_count: 0
task_id: null
next_owner: PLANNING
requires_user: true
```

## 唯一首因

本轮先完成本地冻结媒体门后，仅执行一次远端只读身份确认：

```text
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15 qimao-deploy@103.36.63.67 id -un
qimao-deploy@103.36.63.67: Permission denied (publickey).
```

按 05I 停止条件未换 SSH 身份、未猜测或更换 key、未上传或解包、未运行第二次 prepare/run，也未产生任何远端外部事实。首因为 `SSH_PUBLICKEY_AUTH_FAILED`，不是 bootstrap、business、数据库或 Tencent 门。

## 本地媒体与候选证据

- 仅读取指定源 `E:\七猫兼职\02_项目\05_妈妈是神在人间的分神\原始素材\视频\24.mp4`；源大小 `56,060,105` bytes，失败后仍为该大小且最后写入时间未变。
- 只生成一次 5–20 秒派生媒体：15.000000 秒，H.264 `540x960` video + AAC `16000 Hz` 单声道 audio；`623,252` bytes，SHA-256=`fba25f5066f6f35ccdf05d9cbf1df5fa046781ada3d54a752cb1d8718aa2eb0a`。未输出语音正文，未与历史派生 SHA 比较。
- 04B archive 已核对 `8,898,107` bytes，SHA-256=`e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30`；未重建。
- 本地媒体目录严格使用 `C:\Users\ComradeGu\Documents\七猫兼职\qimao-asr-05i-media-r1`，失败后已精确删除并复核不存在；未使用 `C:\tmp`、第二本地路径或仓库内目录。

## DB、业务与外部事实

| 门/事实 | 结果 |
|---|---|
| 远端 archive/media/harness 上传与 SHA 对账 | 未执行；上传 `0` 次 |
| 远端解包、env 装配、provider、bootstrap prepare | 未执行 |
| database peer (`current_database` / `current_user`) | 未执行；identity=`null` |
| qima business、migrate、loopback、Workers | 未执行 |
| project/manifest/upload verify/terms/route/budget/batch/dispatch | 未执行 |
| COS 上传 | `0` 次；无对象身份 |
| Tencent `CreateRecTask` | `0` 次；无 TaskId、无 Describe |
| ASR job/cue/usage/log/operation/budget | 均未产生 |
| 生产 DB/current/控制面/公网路由 | 未触碰 |

Secret 内容未读取；provider.env 未派生、未安装、未输出或落盘。

## 清理与残留

- 本地派生媒体及冻结目录：已精确删除，残留 `0`。
- 远端 root/release/env/provider/隔离 DB/loopback/Worker/harness/COS：本轮未创建，无需远端清理。
- 源文件未修改、移动或删除；未读取其他素材。
- business、业务源码、candidate、既有正式 harness 和生产配置未修改；本轮仅写入本结果文档。

## remaining_gap / next owner

`remaining_gap`：当前执行环境无法用已配置的 `qimao-deploy` 公钥建立 SSH 会话，因而无法开始 05I 远端闭环。下一 Owner=`PLANNING`；恢复条件是用户提供或修复同一授权 SSH 身份后重新裁决，不在本轮自动重试。`requires_user=true`。
