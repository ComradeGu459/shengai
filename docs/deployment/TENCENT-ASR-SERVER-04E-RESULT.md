# TENCENT-ASR-SERVER-04E

## outcome

`blocked`

## artifact_status

`artifact_written`

## execution

- CURRENT：`v4-1289`；formal lease：`1`。
- 复用冻结 archive SHA-256=`e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30`，本地与远端核验大小均为 `8898107` bytes；本轮仅为安装重传一次 archive，未重建 candidate，未重跑 DB、编译或 import probe。
- 复用 04D 已通过的 Linux 11-gate / 五入口证据；本轮未重复执行 probe。
- 本轮远端 archive staging=`/tmp/qimao-asr-04e-r1/candidate.tar.gz`；安装 release=`/opt/qimao-terms-cloud/releases/20260828-tencent-asr-04e-r1`，安装后文件树为 `root:qimao`、目录/文件权限 `0550`。

## gates

- archive 上传次数：`1`；远端 SHA-256 与冻结 SHA 匹配。
- provider.env：按用户态 `umask 077` 临时文件 → `sudo -n install -d -o root -g qimao -m 0750` → `sudo -n install -o root -g qimao -m 0640` 安装；未执行 `chown`。安装后仅记录 `owner=root:qimao`、`mode=0640`、`bytes=282`、SHA-256=`8f61cfce69981f879bac1b49a749af9b0aecd76666f1268120abfce6c841893f`，未回显 secret 值。
- canonical drop-in 已安装并通过 systemd verify/effective 门：`/etc/systemd/system/qimao-worker@asr.worker.entry.js.service.d/override.conf`，`root:root`、`0644`、`347` bytes，SHA-256=`cce1aae9493830860328268ecb6d1c78c68e1f4cf77f45cae4905ce050c0fc99`。
- effective ExecStart 为 `/usr/local/bin/node --preserve-symlinks-main /opt/qimao-terms-cloud/current/backend/dist/workers/asr.worker.entry.js`；User/Group=`qima/qima`；三个 EnvironmentFile 均为 canonical 路径。
- Worker 健康门：`failed`。切换到 04E release 后启动 `qimao-worker@asr.worker.entry.js.service`，最终状态为 `LoadState=loaded`、`ActiveState=activating`、`SubState=auto-restart`、`NRestarts=18`、`ExecMainPID=0`，未满足 active/running 且 `NRestarts=0`。

## business_side_effects

- 固定官方 WAV GET：`0`；COS Put/Head/signed GET/独立 GET：`0`。
- Tencent `CreateRecTask`：`0`；`DescribeTaskStatus`：`0`；TaskId：`0`。
- 生产业务 API、DB、route/budget、业务 job/attempt/candidate/log、预算 reservation/actual：`0`。

## rollback_and_residual

- Worker 门失败后立即停止服务并恢复 `current`：`/opt/qimao-terms-cloud/current` → `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`。
- 回滚核验：`qimao-worker@asr.worker.entry.js.service` 为 `loaded/inactive/dead`，`NRestarts=0`，`Result=success`。
- 本轮 release、`/tmp/qimao-asr-04e-r1`、`/etc/qimao-terms-cloud/provider.env`、canonical drop-in 及 provider/drop-in 临时文件均已精确清理并核验 `absent`。
- 本地冻结 candidate、archive、现有 declaration 与业务源码保留且未修改；未 reset、checkout、clean、stash、提交或推送。

## remaining_gap

Worker 在安装后的 active 健康门持续 auto-restart，未达到 `NRestarts=0`。按失败即回滚规则，本轮未下载 WAV、未访问 COS、未调用 Tencent `CreateRecTask`，也未重复任何外部创建；未采集额外日志以避免越过失败后的停止边界。

## next_owner

`规划`：审阅本轮 Worker auto-restart 的既有运行事实后，再决定是否签发新的单次部署 lease；本轮不重放 04E。
