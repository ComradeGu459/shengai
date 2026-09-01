# TENCENT-ASR-SERVER-03O-AUDIT

## outcome

`blocked`

本审计仅复盘 03O 上一回合已有命令与输出；未连接服务器、未重建或读取 archive、未读取 Secret/WAV，未执行外部动作。artifact 已写入。

## evidence

### 03O 组合命令结构

上一回合的 Linux 加载命令结构为：

1. `set -e`。
2. 创建 root-only 临时 payload 目录。
3. 用一次 `sudo tar -xzf ... -C ... --no-same-owner --no-same-permissions` 解包。
4. 用一次 `/usr/local/bin/node -e` 执行异步组合 import：按固定数组顺序导入
   `modules/storage/s3-compatible-storage.js`、`modules/asr/tencent-asr-runtime.js`、
   `workers/asr.worker.entry.js`、`app.js`、`server.js`，全部完成后输出 `entries=5/5`。
5. Node 组合脚本的 Promise rejection handler 只输出安全的 `entry_error=<code|name|unknown>` 并 `process.exit(1)`。
6. 最后执行 worker entry 可读性 `test`，成功才输出 `load_gate=passed`。

### 退出传播与捕获事实

- `set -e` 会在解包、组合 Node import、可读性 `test` 或其他简单命令的首个非零状态处停止；不会执行后续命令。
- SSH 返回远端 shell 的非零状态；本轮工具记录到 `exit_code=1`。
- 该次工具返回的统一 `output` 为空，且没有另存可区分的 stdout/stderr 字段；因此既没有 `entries=5/5`，也没有 `entry_error=...` 或 tar 错误正文。
- 没有 `entry_error` 不能证明五个 import 已开始或已逐项完成：失败可能发生在 tar extract、Node 启动/解析、某个 import，或后续可读性 `test`。
- 因组合命令没有为每个门建立独立输出文件/退出记录，现有证据只能裁决为“五入口 5/5 未证明”，不能猜测唯一子步骤。

## frozen_next_script

下一次若获授权，只允许按以下单向门执行，不改变 archive、不重建 bundle、不切换路线：

1. 先核对唯一 archive SHA；archive 结构审计必须得到 symlink `476`、hardlink `905`、坏目标 `0`（同时保留坏名称/坏 symlink/坏 hardlink 均为 `0` 的记录）。
2. 单独执行 tar extract 门。stdout、stderr、exit 分别捕获；extract 非零立即停止，不 install、不 daemon-reload、不启动 unit。
3. 仅 extract 成功后，按以下五个入口逐项启动五个独立的 `/usr/local/bin/node` import 命令，每项分别记录 `entry`、`exit`、stdout、stderr：
   - `modules/storage/s3-compatible-storage.js`
   - `modules/asr/tencent-asr-runtime.js`
   - `workers/asr.worker.entry.js`
   - `app.js`
   - `server.js`
4. 任一入口非零、stdout/stderr 不可捕获或结果不完整即停止，不组合吞错，不进入 install；只有五项均为 exit `0` 才允许安装一个 immutable candidate。
5. 安装后仅写 canonical ASR 实例 `override.conf`，执行 daemon-reload；启动前只读硬断言 DropInPaths 精确包含该文件，且 effective ExecStart 精确为 `/usr/local/bin/node /opt/qimao-terms-cloud/current/backend/dist/workers/asr.worker.entry.js`。任一断言失败即回滚并停止，不启动 unit。
6. 只有 parser 断言通过，且 ASR active、NRestarts=0、稳定窗通过并且 backend/既有 Worker 健康，才允许下载 WAV；随后才允许唯一 synthetic 的 WAV/COS/Tencent/API/DB 业务门。任一前置失败均禁止后续外部动作。

## remaining_gap

03O 原组合命令没有建立 extract 与五入口的独立 stdout/stderr/exit 证据；当前无法区分解包失败、Node 启动失败、具体入口 import 失败或末尾 `test` 失败。

## next_owner

规划负责决定是否发放一次新的逐门加载审计 lease；SERVER 不自行重跑 03O 或进入部署/provider 阶段。

## files

- `docs/deployment/TENCENT-ASR-SERVER-03O-AUDIT.md`

## residual

- 本轮未执行服务器连接、archive 重建、Secret/WAV 读取或任何外部动作。
- 继承 03O blocked-clean 状态：current=06K，未安装 candidate，未写 override，未启动 ASR，未进入 WAV/COS/Tencent/API/DB。

## requires_user

无需补充凭据；如需继续，需规划明确一次“独立 extract + 五个独立 import 捕获”的新任务卡。当前 03O 仍为 blocked。

