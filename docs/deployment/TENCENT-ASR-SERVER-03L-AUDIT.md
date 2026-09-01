# TENCENT-ASR-SERVER-03L-AUDIT

## outcome

`artifact_written`

本次仅修复交付 artifact；不执行服务器连接、命令、重启、部署或其他外部动作。以下事实来自上一回合已取得的内部审计结果，不是本回合新鲜探测。

## evidence

- 上一回合已读取同一 `qimao-worker@asr.worker.entry.js.service` 的持久 journal/历史状态：可读条目 `132`，历史退出事件 `16`。
- unit fragment 为 `/etc/systemd/system/qimao-worker@.service`；ExecStart 使用 `current/backend/dist/workers/asr.worker.entry.js`，不是固定 release 路径。
- 首次历史退出为 `code=exited`、`status=203`、`signal=EXEC`，稳定错误码为 `203/EXEC`。
- 上一回合已只读确认服务器 `/usr/bin/node` absent、`/usr/local/bin/node` 可执行，Worker 入口文件可读。
- 因此应用进程未启动；没有证据支持 DATABASE_URL、数据库连接、Tencent 配置、S3 signer 或模块解析为首因。原始日志未复制或写入本文件。
- 上一回合已确认 06K backend、screen-text Worker、upload-completion Worker 均 active，均 `NRestarts=0`；backend health 为 `status=ok`、`database=connected`；ASR unit inactive/disabled。

## direct_cause

`direct-main`：unit 的 `/usr/bin/node` 直接执行路径不存在，systemd 在进程启动前返回 `203/EXEC`。

## minimal_fix

仅提出、未实施：在新的正式 lease 下，将 ASR Worker direct-main 调整为服务器现有的 `/usr/local/bin/node`，再单独执行 daemon-reload 与健康门。不得把本 artifact 修复视为已实施部署。

## remaining_gap

未取得应用层配置、S3 signer 或模块解析的运行时证据；这些门需在 direct-main 修复后另行授权验证。真实 WAV、COS、CreateRecTask、业务 synthetic 与计费闭环未执行。

## next_owner

`PLANNER → SERVER`：审核 direct-main 最小修复并签发新的正式 lease。

## files

- `docs/deployment/TENCENT-ASR-SERVER-03L-AUDIT.md`

## residual

- 本次没有服务器写入、外部动作或新的运行时残留。
- 本文件是对上一回合既有事实的补交 artifact；未读取 Secret/env 值，未触碰业务素材、control plane、COS 或 Tencent。

## requires_user

`yes`：需要规划确认 direct-main 修复并另行签发执行任务；本回合不得据此自行修改 unit 或重放 provider/业务命令。
