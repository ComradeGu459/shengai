# TENCENT-ASR-SERVER-05F-SYNTHETIC

```yaml
outcome: blocked
artifact_written: true
task: TENCENT-ASR-SERVER-05F-SYNTHETIC
current: v4-1309
lease: 1
role: SERVER
server: 103.36.63.67
first_cause: PROVIDER_TARGET_INVALID
cos_upload_count: 0
create_rec_task_count: 0
task_id: null
next_owner: PLANNING
requires_user: true
```

## 唯一首因

唯一正式 bootstrap 稳定门失败为 `PROVIDER_TARGET_INVALID`。调用方传入了临时 `--env-dir /tmp/qimao-asr-05f-r1/env`，但未显式传入相同目录下的 `--provider-target /tmp/qimao-asr-05f-r1/env/provider.env`；05E bootstrap 在 ownership、provider 安装、database.env 生成和 createdb 之前拒绝执行。

本轮没有重试 prepare、没有修改脚本、没有更换参数/素材/候选，也没有进入 peer/business 门。此前一次复制 env 目录的调用端命令漏用 sudo，随后对同一目录使用正确 sudo 边界校正成功；它早于正式 bootstrap，未产生 DB、COS、Tencent 或业务事实。

## 载荷与传输证据

- 只读源文件：`E:\七猫兼职\02_项目\05_妈妈是神在人间的分神\原始素材\视频\24.mp4`；本轮未修改、移动或读取其他素材。
- 派生媒体只生成一次：15 秒、MP4、H.264+AAC、视频 `540x960`、音频 `16000 Hz` 单声道；`1,012,623` bytes，SHA-256=`22c95c0c7b3674183c67cdf268baef901a91a1d387e01acd6d8bab7e2bec38eb`。
- 冻结 archive：`8,898,107` bytes，SHA-256=`e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30`；未重建。
- 远端 archive SHA 与冻结值相同；远端 media SHA 与本次本地值相同。
- 两个正式 `.mjs` 远端 `node --check` 均 exit `0`，远端 `--self-test` 均 exit `0`。
- provider 值仅在本地内存中从 `D:\ChromeCoreDownloads\SecretKey.csv` 派生，经 SSH 标准输入写入远端 qimao-deploy 临时文件；远端临时文件为 `qimao-deploy:qimao-deploy:0600`，值未回显，未在本地落盘。

## DB、业务与外部事实

| 门/事实 | 结果 |
|---|---|
| bootstrap ownership/provider/database.env | 未执行；被 `PROVIDER_TARGET_INVALID` 拦截 |
| isolated createdb | 未执行/未证明创建 |
| database peer | 未执行；无 current_database/current_user 事实 |
| `--drop-db` | 已对精确 `qimao_asr_05a_20260828_05f_01` 执行，返回 `database_dropped` |
| business harness / migrate / loopback / Workers | 均未启动 |
| project/manifest/upload verify/terms/route/budget/batch/dispatch | 均未执行 |
| COS 上传 | `0` 次；无对象可删或 Head=404 |
| Tencent CreateRecTask | `0` 次；无 TaskId、无 Describe |
| ASR job/cue/usage/log/operation/budget 业务事实 | 均未产生 |

因此 TaskId 同一性为 `N/A`，外部创建次数为 `0`，不存在 unknown 结果或第二次创建。

## 生产不变与清理

- 远端固定 root `/tmp/qimao-asr-05f-r1` 已由 bootstrap cleanup 删除并复核不存在。
- 生产 `/etc/qimao-terms-cloud/provider.env` 保持 absent。
- 生产 backend.env：`root:qimao`、`0640`、`776` bytes，SHA-256=`05d21ec3dc196c1ce96243fca447fbb65e5a6047eb5ae3844065c52186ceac6f`。
- 生产 object-storage.env：`root:qimao`、`0640`、`421` bytes，SHA-256=`773b8362b39af2e3d71c5f88571210b0689397c5b825f820ea88f21f863b6259`。
- production current 只读仍为 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`。
- `qimao-worker@asr.worker.entry.js.service` 只读状态仍为 `inactive`；本轮未启动或重启生产服务。
- 隔离 DB drop 已完成；无 loopback/Worker 需要停止，无 COS 对象需要删除。
- 本地派生媒体临时目录已删除；源文件仍为原路径且大小 `56,060,105` bytes。
- residual=`0`：远端 root、远端 provider 临时文件、本地派生媒体均已清理。

## Remaining gap / next owner

唯一剩余缺口是调用编排未把 provider target 显式绑定到临时 env-dir，导致正式 bootstrap 在最早参数门阻断。下一轮若继续，需由 `PLANNING` 重新确认参数/lease 后再运行；本轮不请求自动重试，不重复 prepare，不创建第二外部事实。

