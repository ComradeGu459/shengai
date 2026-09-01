# TENCENT-ASR-SERVER-03R-PROBE

## outcome

`passed`

最小 Node ESM/symlink 行为探针已完成；未导入项目代码，未触碰服务、candidate、Secret、WAV、provider、DB、COS 或 control-plane。

## evidence

- 仅创建最小 ESM 文件、`real` 目录和相对 `current -> real` symlink；ESM 只计算 `import.meta.url === pathToFileURL(process.argv[1]).href` 并输出 Node 版本。
- `/usr/local/bin/node current/entry.mjs`：exit=`0`，`direct=false`，Node=`v24.19.0`。
- `/usr/local/bin/node --preserve-symlinks-main current/entry.mjs`：exit=`0`，`direct=true`，Node=`v24.19.0`。
- 探针目录已精确删除，最终验证 `absent`；未留下 helper。

## direct_cause

`direct_run_guard_rejects_default_symlink_main`：03P 使用默认 Node 通过 `/opt/qimao-terms-cloud/current/...` 启动，而 `current` 是 symlink。探针证明默认模式下 `import.meta.url` 与 `pathToFileURL(process.argv[1]).href` 不相等，故 direct-run guard 为 false；同一路径加 `--preserve-symlinks-main` 后为 true。结合 03P `start=0`、稳定检查 inactive、NRestarts=0，足以解释 Worker clean exit/inactive：入口未进入 standalone 运行分支。该结论来自独立物理探针，不是猜测。

## minimal_fix

部署侧最小复验/修复路径是让该 ASR 实例的 ExecStart 使用 `/usr/local/bin/node --preserve-symlinks-main /opt/qimao-terms-cloud/current/backend/dist/workers/asr.worker.entry.js`，并在启动前只读断言 DropInPaths 与 effective ExecStart；启动后必须 active、NRestarts=0 且通过稳定窗，否则立即回滚，不进入 WAV/COS/Tencent/API/DB。

## remaining_gap

本轮只证明 Node direct-run guard 与 symlink 的因果关系，未重放 03P，也未验证带 preserve flag 的真实 Worker、provider 或业务闭环。

## next_owner

规划负责决定是否发放一次仅含 preserve-symlinks-main 的 ASR unit 复验 lease；SERVER 不自行重放。

## files

- `docs/deployment/TENCENT-ASR-SERVER-03R-PROBE.md`

## residual

- `/tmp/qimao-asr-entry-probe-03r` 已删除并验证不存在。
- 未修改项目代码、systemd unit、candidate、env 或任何业务/外部状态。

## requires_user

无需补充凭据；如继续，需规划授权一次带 `--preserve-symlinks-main` 的 ASR-only 复验。

