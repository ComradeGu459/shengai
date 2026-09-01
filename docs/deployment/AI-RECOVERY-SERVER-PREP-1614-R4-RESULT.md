# AI-RECOVERY-SERVER-PREP-1614-R4 结果

## outcome

`artifact_written`

仅在本地最小修改 `deploy/ai-recovery-1614/loader.sh` 并新增本结果文档。runner、preflight、retry 与其 `SHA256SUMS` 内容均未修改；未执行服务器、SSH/SCP、root、systemd-run、API、Provider 或数据库动作。

## R4 交接修正

- loader 不再通过 `exec` 用 runner 替换自身。
- loader 保持父进程，以 `/bin/bash "$transfer/runner.sh" "$transfer"` 启动同步子进程；子进程继承 loader 的 stdout/stderr，输出直接透传。
- loader 保存并返回 runner 的原始非零退出码。
- INT/TERM 会转发给仍在运行的 runner，等待子进程终止后按 130/143 退出。
- inbound 在启动 runner 前已精确删除；此后 loader 的 EXIT 清理关闭 inbound 分支，只清理 `created_transfer=1` 的固定 transfer，不触碰 release、current、env、runtime、unit 或数据库。
- runner 返回 0 时，loader 要求 transfer 已由 runner 自行清理并为 absent；随后清除 `created_transfer` 标志，解除 EXIT/INT/TERM trap并返回 0。
- runner 在自身 R3 trap 安装前因 input/baseline 门失败时，仍由父 loader 收到非零退出码并清理其原子创建的 transfer。

## 哈希闭包

- runner bytes/SHA 未变化，loader 内嵌固定值仍与当前 runner 一致。
- `SHA256SUMS` 继续只固定 runner/preflight/retry 三项，当前闭包一致；无需改变冻结清单。

## local verification

- loader 中不存在 runner `exec`；父子启动、wait、退出码透传、信号转发、成功 transfer-absent 门与 trap 解除顺序通过限定静态检查。
- loader 内嵌 runner/preflight/retry/SHA256SUMS bytes/SHA 与当前文件一致。
- R4 涉及文件 CR=0、BOM=0、尾随空白=0，限定 diff-check：通过。

## residual

- 外部动作：0。
- runner R3 trap/commit 语义、retry/preflight、业务源码与 `docs/status/CURRENT.md` 修改：0。
