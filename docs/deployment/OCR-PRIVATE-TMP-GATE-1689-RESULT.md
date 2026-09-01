# OCR-PRIVATE-TMP-GATE-1689 结果

- `outcome`: `passed`
- `target`: `103.36.63.67`
- `next_owner`: 规划/后端
- `requires_user`: `false`

## canonical screen-text unit 只读事实

`qimao-worker@screen-text.worker.entry.js.service` 的有效属性为：

- `User=qimao`、`Group=qimao`
- `PrivateTmp=yes`
- `ProtectSystem=strict`、`ProtectHome=yes`
- `ReadWritePaths=/var/log/qimao-terms-cloud`
- `WorkingDirectory=/opt/qimao-terms-cloud/current`
- EnvironmentFile：`backend.env`、`object-storage.env`、`screen-text-local-ocr-05d.env`、`local-ocr-frame-extractor-05b.env`
- 当前 `inactive/dead`、`MainPID=0`、`NRestarts=0`；未启动常驻 Worker

## 唯一同构 transient 验证

仅启动一次 `qimao-private-tmp-gate-1689`，复制上述 User/Group、PrivateTmp、ProtectSystem、ProtectHome、ReadWritePaths、WorkingDirectory 与四份 EnvironmentFile；命令不导入业务代码、不读取素材或 Secret，仅在 PrivateTmp 内执行：

```text
mktemp -d /tmp/qimao-private-tmp-1689.XXXXXX
test -d <private-dir>
rmdir <private-dir>
test ! -e <private-dir>
```

结果：`tmp_gate=passed`，transient 返回码 `0`。这证明 qimao 在正式 Worker 同构的 PrivateTmp 沙箱内可创建并删除临时目录；1688 的 `EACCES` 来自未启用 PrivateTmp 的诊断 transient 环境，而非产品媒体链本身。

## 不变性与清理

- DB 批次前后均为 `44 queued + 2 review_pending + 4 failed + 1 reconciliation_required`；episode 7/9/10/11 的 job、current attempt、状态及 attempt 数完全一致。
- 四 unit 前后快照完全一致：backend PID `831090`、ASR PID `694703`、screen `MainPID=0/inactive/dead`、OpenVINO PID `802334`；各 unit `NRestarts=0`，运行中的 unit 仍 `active/running`。
- health=`200`；未调用 OCR sidecar、ASR、DeepSeek、Provider 或任何业务代码。
- `qimao-private-tmp-gate-1689.service` 已 `--collect`，`LoadState=not-found`；`/run/qimao-private-tmp-gate-1689` 与宿主 `/tmp/qimao-private-tmp-1689.*` 均不存在。
- 未改 unit、代码、DB、COS、route 或 budget；无残留需要补清。

## 剩余缺口

`remaining_gap`：1688 失败可归因于诊断 transient 缺少 `PrivateTmp=yes`；本卡未修改现有服务，后续若重跑媒体诊断须使用同构 PrivateTmp 沙箱并另行授权。不得现场补丁或启动 Worker。

