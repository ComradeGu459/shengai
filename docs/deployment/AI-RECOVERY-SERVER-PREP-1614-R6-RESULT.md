# AI-RECOVERY-SERVER-PREP-1614-R6 结果

## outcome

`artifact_written`

仅在本地重构 `deploy/ai-recovery-1614/loader.sh` 与 runner 的固定 transfer 路径，同步 `SHA256SUMS`，并新增本结果文档。未执行服务器、SSH/SCP、root、systemd-run、API、Provider 或数据库动作。

## R6 生命周期契约

- systemd transient service 是 loader/transfer 临时目录的唯一清理所有者。
- 受管父目录固定为 `/run/qimao-ai-recovery-1616-loader`，transfer 固定为 `/run/qimao-ai-recovery-1616-loader/transfer`。
- loader 要求 `RUNTIME_DIRECTORY` 精确等于受管父目录，并验证父目录为 `root:root:700`、非符号链接且初始为空。
- loader 完整验证 inbound 七文件后，仅在受管父目录内创建、安装和复核 transfer；loader 不安装 EXIT/ERR/INT/TERM trap，不保存子 PID，也不自行删除 transfer 或 RuntimeDirectory。
- loader 精确删除 inbound 后，恢复为单进程 `exec /bin/bash "$transfer/runner.sh" "$transfer"`。
- runner 仅接受新的受管 transfer 路径。runner 在自身 trap 安装前的 input/baseline 早退残留由 systemd 在 unit 结束时自动删除；进入写阶段后仍由既有 ERR/EXIT/INT/TERM 与 R5 `post_started` 语义负责业务回滚或安全停止。
- 未使用 PrivateTmp；retry/preflight/route/monitor 未修改。

## 冻结 systemd-run 参数

主通道只能使用已经审核且通过非 root `bash -n` 的同一 loader 内容作为 stdin，并使用以下参数集合；不得添加 `PrivateTmp` 或 `RuntimeDirectoryPreserve=yes`：

```text
sudo -n systemd-run
  --unit=qimao-ai-recovery-1616-loader
  --collect
  --wait
  --pipe
  --service-type=exec
  --property=User=root
  --property=Group=root
  --property=RuntimeDirectory=qimao-ai-recovery-1616-loader
  --property=RuntimeDirectoryMode=0700
  --property=RuntimeDirectoryPreserve=no
  /bin/bash -s --
  /var/tmp/qimao-ai-recovery-1616-inbound
  /run/qimao-ai-recovery-1616-loader/transfer
```

上述内容表示一个命令及其参数，loader 文件内容通过该命令的 stdin 提供。

## 哈希闭包

- `SHA256SUMS` 已同步仅接受新 transfer 路径的 runner；preflight/retry 哈希未变化。
- loader 已固定当前 runner/preflight/retry/SHA256SUMS 的 bytes 与 SHA，并在复制前后复核。

## local verification

- loader 无父子 PID、信号转发、created-transfer cleanup 或 loader trap；存在精确 `RUNTIME_DIRECTORY` 门和最终单进程 runner `exec`。
- runner 仅接受 `/run/qimao-ai-recovery-1616-loader/transfer`，既有 R3/R5 traps 与 commit 边界保持存在。
- 哈希闭包、loader 内嵌 bytes/SHA、CR=0、BOM=0、尾随空白与限定 diff-check：通过。

## residual

- 外部动作：0。
- retry/preflight/route/monitor、业务源码与 `docs/status/CURRENT.md` 修改：0。
