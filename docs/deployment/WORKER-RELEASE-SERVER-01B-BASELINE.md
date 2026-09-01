# WORKER-RELEASE-SERVER-01B

outcome: artifact_written

## evidence

主机连接使用既有受保护 SSH key、配置用户名 `qimao-deploy` 和 `103.36.63.67`；未使用 `milaidi.online`，未读取私钥内容。远端只执行只读命令，未构建、传包、安装、改 systemd/env、重启、启动 ASR、读取 Secret/WAV 或调用 Provider/COS/API/DB/控制面。

### Node

- `/usr/local/bin/node --version`：exit=0，`v24.19.0`。
- `/usr/bin/node`：不存在。
- 因此 01A 声明的 Node 精确路径在主机上成立，但不能据此推断任何 unit 已使用该路径。

### current/release/manifest

- `current` 是 root-owned symlink，目标文本为 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`。
- `current` 元数据：`lrwxrwxrwx root:root`，bytes=57。
- `releases` 目录存在，元数据为 `drwxr-x--- qima:qimao`；`qimao-deploy` 实际身份为 `uid=1000(qimao-deploy) gid=1000(qimao-deploy)`，附加组为 `qimao-deploy,users`。
- 通过已验证的 `sudo -n` root 只读通道，current 目标实际存在：`drwxr-x--- root:qimao`，bytes=4096，mtime=`2026-08-28 05:35:28 +0800`。此前非 root 观察到的 `exists=0` 是目录不可见，不是目标不存在。
- current 目标 release 为 `20260828-local-ocr-06k-r1`；其 `manifest.json` 元数据为 bytes=74410、`-rw-r----- root:qimao`、mtime=`2026-08-27 12:59:35 +0800`，SHA-256=`4e97c1fcfa1f242de58bef5e8c000ab11170838867a5d5a00216139d9783b702`。
- 同一 release 的 `.qimao-06k-manifest.tsv` 元数据为 bytes=1147、`-rw-r----- root:qimao`、mtime=`2026-08-28 05:24:45 +0800`，SHA-256=`38ac554f66d1b59ee442825399aac0febdf305252924c7adfda6cf20ddfb19ea`。

### ASR unit/drop-in/effective ExecStart

只读 `systemctl show/cat qimao-worker@asr.worker.entry.js.service` 得到：

- `LoadState=loaded`、`ActiveState=inactive`、`SubState=dead`、`UnitFileState=disabled`。
- `Result=success`、`ExecMainCode=0`、`ExecMainStatus=0`、`NRestarts=0`。
- `User=qima`、`Group=qima`、模板 `FragmentPath=/etc/systemd/system/qimao-worker@.service`。
- `DropInPaths` 为空；未发现 canonical instance drop-in。
- effective `ExecStart` 为 `/usr/bin/node /opt/qimao-terms-cloud/current/backend/dist/workers/asr.worker.entry.js`，没有 `/usr/local/bin/node`，没有 `--preserve-symlinks-main`。
- 实际 `EnvironmentFiles` 只有 `/etc/qimao-terms-cloud/backend.env`；未发现 object-storage/provider 两项声明。

因此 01A 的 canonical drop-in、preserve flag 和完整三文件 EnvironmentFile fixture 均未由主机事实成立；ASR 仍保持 inactive/disabled，未尝试修复或启动。

### 01A 五入口哈希

通过 root 只读通道核对 current release 的五个声明入口：

- `backend/dist/modules/storage/s3-compatible-storage.js`：exists=1，bytes=37276，SHA-256=`8ca7f689df8111a209b1e100880b1f7ea0c006c3750dcfd31c1684de82614a13`。
- `backend/dist/modules/asr/tencent-asr-runtime.js`：exists=1，bytes=9599，SHA-256=`99b241358ba18e2b987589abbbd9bce5542f76cf9bd1ea06f553f035e1784cf7`。
- `backend/dist/workers/asr.worker.entry.js`：exists=1，bytes=3099，SHA-256=`11b7b89d72c40ca5290e97df047b9e74ecb3d45f48a95046c9b7e159de332d44`。
- `backend/dist/app.js`：exists=1，bytes=14371，SHA-256=`4552a85b50c6005dda0334fa52d146331529da7d2c3bf3d94ffa20a0afeeab94`。
- `backend/dist/server.js`：exists=1，bytes=8766，SHA-256=`8177a7c5c4b9993b3db938211ed09edc8518e0622050b0360e12d9879fe9bb51`。

### EnvironmentFile 元数据

- unit 声明的实际路径只有 `/etc/qimao-terms-cloud/backend.env`。
- root 只读元数据：`backend.env` exists=1，bytes=776，`-rw-r----- root:qimao`，mtime=`2026-08-26 13:28:15 +0800`；`object-storage.env` exists=1，bytes=421，`-rw-r----- root:qimao`，mtime=`2026-08-26 20:23:16 +0800`；`provider.env` exists=0。
- `sudo -n -u qima test -r` 对 backend.env、object-storage.env、provider.env 分别返回 exit=1；未读取任何文件值。故服务用户 `qima` 的直接可读性均未通过，且 provider.env 缺失。
- 前轮非 root 的 `backend.env exists=0` 仅是 release/env 观察权限不足导致的不可见；root 复核已证明 backend.env 和 object-storage.env 实际存在。没有把该结果扩大为权限修复。

### 相关服务

- `qimao-backend.service`：loaded、active/running、`NRestarts=0`、`Result=success`。
- `qimao-worker@screen-text.worker.entry.js.service`：loaded、active/running、`NRestarts=0`、`Result=success`。
- `qimao-upload-completion-worker.service`：loaded、active/running、`NRestarts=0`、`Result=success`。
- `qimao-worker@upload-completion.worker.entry.js.service`：loaded、inactive/dead、disabled、`NRestarts=0`、`Result=success`；当前 upload-completion 实际运行单元为上一个名称。
- `qimao-worker@asr.worker.entry.js.service`：loaded、inactive/dead、disabled、`NRestarts=0`、`Result=success`。

## 01A 差异裁决

- 成立：主机存在 `/usr/local/bin/node v24.19.0`；ASR canonical instance 名称可被 systemd 识别；服务身份是 `qima:qima`；current target、06K manifest 和 01A 五入口均已取得 root 只读身份与 SHA；backend、screen-text 和实际 upload-completion 服务健康且 `NRestarts=0`。
- 失效：ASR drop-in 未装载，`DropInPaths` 为空；effective ExecStart 仍为 `/usr/bin/node`；preserve flag 缺失；object-storage/provider EnvironmentFile 声明缺失；provider.env 不存在；服务用户对三份候选 env 的 `test -r` 均失败。
- 01A 的本地 18 门 self-test 不能替代上述主机事实；本轮没有把本地通过写成主机通过。

## remaining_gap

主机基线已冻结；若后续要让 ASR 按 01A 运行，仍需规划决定是否补齐 canonical drop-in、preserve flag、provider.env 声明及 qima 对 env 的可读性。该决定不属于本轮，且不得通过现场修改目录权限、sudoers、unit、env 或 release 规避基线差异。

## next_owner

规划审核本冻结基线，决定是否另发 ASR 发布任务；不重跑已通过的 Node、systemd 和相关服务门。

## files

- `docs/deployment/WORKER-RELEASE-SERVER-01B-BASELINE.md`

## residual

- 远端零写入：无 release、unit、drop-in、env、服务、数据库、COS、Provider 或控制面变化。
- 本地无临时凭据、WAV 或传输文件；原有脏工作树保持不变。
- 结果文档是本轮唯一仓库写入。

## requires_user

false：本轮只读基线所需的既有 sudo 通道已验证并完成；后续是否修复运行配置需由规划另行派发，仍不得输出 Secret。
