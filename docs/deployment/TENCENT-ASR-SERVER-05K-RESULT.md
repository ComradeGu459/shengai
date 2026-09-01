# TENCENT-ASR-SERVER-05K-SYNTHETIC

```yaml
artifact_written: true
outcome: blocked
slice_outcome: rolled_back
task: TENCENT-ASR-SERVER-05K-SYNTHETIC
current: v4-1314
lease: 1
role: SERVER
server: 103.36.63.67
root: /tmp/qimao-asr-05k-r1
database: qimao_asr_05a_20260828_05k_01
run_id: asr-05k-20260828-r1
first_cause: LOCAL_SSH_KEY_PATH_TYPO
archive_sha256: e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30
media_bytes: 624327
media_sha256: c9ef575b54a605c979ba592beab39f086b238c9ea145fab1cf236d42aaaf673b
remote_upload_count: 4
cos_upload_count: 0
create_rec_task_count: 0
task_id: null
next_owner: PLANNING
requires_user: false
```

## 唯一首因

本轮本地媒体门仅生成一次并通过。传输阶段使用固定 SSH key 成功创建远端临时根、上传 archive、两个正式 `.mjs` 和派生媒体，并完成 archive/media SHA 对账。随后解包命令误写 key 文件名为 `qima_test_server_20260820_ed25519`，实际固定文件名为 `qimao_test_server_20260820_ed25519`，SSH 在本地即返回 key 不存在和 `Permission denied (publickey)`。

按 05K 停止条件未用正确 key 重放解包、未第二次 prepare/run、未现场修正，也未进入业务或外部链。该失败归因于本地 SSH 编排命令，不归因于服务器、候选或业务代码。

## 输入、候选与传输证据

- 只读指定源 `E:\七猫兼职\02_项目\05_妈妈是神在人间的分神\原始素材\视频\24.mp4`；源大小 `56,060,105` bytes，失败后大小与最后写入时间未变，未读取其他素材。
- 媒体只派生一次：15.000000 秒，H.264 `540x960` video + AAC `16000 Hz` 单声道 audio；`624,327` bytes，SHA-256=`c9ef575b54a605c979ba592beab39f086b238c9ea145fab1cf236d42aaaf673b`。未输出语音正文，未与历史派生 SHA 比较。
- 04B archive：`8,898,107` bytes，SHA-256=`e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30`，未重建。
- 远端 archive 与媒体 SHA 均已核对一致；远端收到 4 个文件：1 个 archive、2 个正式 harness、1 个派生媒体。
- 未读取 SecretKey.csv 内容，未派生或传输 provider.env。

## DB、业务与外部事实

| 门/事实 | 结果 |
|---|---|
| 解包/release/正式 bootstrap prepare | 未执行；解包命令在本地 SSH 参数门失败 |
| env/provider/database.env/createdb | 未执行 |
| database peer (`current_database` / `current_user`) | 未执行；identity=`null` |
| qimao business、migrate、loopback、Workers | 未执行 |
| project/manifest/upload verify/terms/route/budget/batch/dispatch | 未执行 |
| COS 上传 | `0` 次；无对象身份 |
| Tencent `CreateRecTask` | `0` 次；无 TaskId、无 Describe |
| ASR job/cue/usage/log/operation/budget | 均未产生 |
| 生产 DB/current/控制面/公网路由 | 未触碰 |

## 回滚、生产不变与残留

- 已用正确固定 SSH 身份执行已上传 bootstrap cleanup，返回 `temp_root_removed`；随后只读确认 `/tmp/qimao-asr-05k-r1` 不存在，远端固定 root 残留 `0`。
- 本地固定媒体目录 `C:\Users\ComradeGu\Documents\七猫兼职\qimao-asr-05k-media-r1` 已精确删除，残留 `0`；未使用 `C:\tmp`、第二本地路径或仓库目录。
- 未创建隔离 DB、COS 对象、provider、env、release 或 Worker 进程，无额外资源需要清理。
- 生产 DB/current/控制面/公网路由未写入；业务源码、candidate、正式 harness 和生产配置未修改。

## remaining_gap / next owner

`remaining_gap`：解包尚未开始，05K 隔离业务闭环未执行；唯一首因为本地 SSH key 路径拼写错误。下一 Owner=`PLANNING`；本轮不重放解包、不重传、不重建、不重复 prepare/run/CreateRecTask。`requires_user=false`。
