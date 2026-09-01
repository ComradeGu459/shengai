# TENCENT-ASR-SERVER-04D

## outcome

`blocked`

## artifact_status

`artifact_written`

## execution

- CURRENT：`v4-1288`；formal lease：`1`。
- 仅使用冻结 archive SHA-256=`e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30`，本地大小=`8898107` bytes；未重建 candidate。
- 远端只上传一次 archive、`worker-entry-import-probe.mjs` 与 `worker-release.declaration.json`；probe/declaration 在 staging 中保持 `deploy/debian/bin/` 与其相邻上级 `deploy/debian/` 布局。
- 远端 staging=`/tmp/qimao-asr-04d-r1`；archive SHA 核对匹配，probe 文件命令为 `/usr/local/bin/node /tmp/qimao-asr-04d-r1/deploy/debian/bin/worker-entry-import-probe.mjs --root /tmp/qimao-asr-04d-r1/stage`。

## gates

- Linux 文件化 probe：`exit=0`，最终 `{"result":"passed","gates":11}`。
- `probe-argv-identity` 为 `probe-self`；storage、asr-runtime、asr-worker、app、server 五入口均先通过 `regular-file`，再输出 `loaded`；stderr 为空。
- systemd verify/effective：`not_run`。阻断发生在 provider.env 安装门之前，未写 drop-in、未 daemon-reload、未启动 Worker。
- provider.env 派生仅在本地内存读取指定 CSV 的一行 `SecretId/SecretKey`；远端安装返回：`chown: changing ownership of '/tmp/qimao-provider-env-04d-r1': Operation not permitted`。安装命令在写入正式 `/etc/qimao-terms-cloud/provider.env` 前停止。

## business_side_effects

- immutable release/current 切换：`0`。
- provider.env 正式安装：`0`；canonical drop-in：`0`；Worker start：`0`。
- 固定官方 WAV GET：`0`；COS Put/Head/signed GET/独立 GET：`0`。
- Tencent `CreateRecTask`：`0`；`DescribeTaskStatus`：`0`；TaskId：`0`。
- 生产业务 API、DB、route/budget、业务 job/attempt/candidate/log、预算 reservation/actual：`0`。

## rollback_and_residual

- 已精确删除 `/tmp/qimao-asr-04d-r1` 与 `/tmp/qimao-provider-env-04d-r1`。
- 回滚核验：current=`/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`；`qimao-worker@asr.worker.entry.js.service` 为 `loaded/inactive/dead`，`NRestarts=0`。
- 本轮 release `/opt/qimao-terms-cloud/releases/20260828-tencent-asr-04d-r1`、`/etc/qimao-terms-cloud/provider.env`、`/etc/systemd/system/qimao-worker@asr.worker.entry.js.service.d/override.conf`、staging 与 provider 临时文件均 `absent`。
- 本地冻结 candidate 目录与 archive 保留且未修改；未 reset、checkout、clean、stash、提交或推送。

## remaining_gap

provider.env root-only 安装门因远端对 staging 临时文件执行 `chown` 返回 `Operation not permitted` 而失败；因此未进入 systemd verify/effective、Worker active 健康窗及一次 WAV→COS→CreateRecTask→同 TaskId Describe 业务闭环。本轮按失败即停止规则不换写入路线、不重试、不重复外部创建。

## next_owner

`规划`：审阅远端 root-only provider.env 安装权限事实后，再决定是否签发新的单次部署 lease；本轮不重放 04D。
