# AI-RECOVERY-SERVER-PREP-1614-R1 结果

## outcome

`artifact_written`

已仅在 `deploy/ai-recovery-1614/` 收紧 1614 执行物，并新增本结果文档。本任务未连接服务器，未执行 SSH/SCP，未触发数据库、服务或 Provider 动作。

## artifacts

- `deploy/ai-recovery-1614/runner.sh`
- `deploy/ai-recovery-1614/preflight.mjs`
- `deploy/ai-recovery-1614/retry.mjs`
- `deploy/ai-recovery-1614/SHA256SUMS`

## R1 安全边界

- root、固定 transfer 路径、目录 owner/mode、六个输入文件及附加哈希清单身份门均位于 `ERR` trap 之前；重复执行遇到 live 1607 或本次资源已存在时，在任何变更前退出。
- runner 使用 `created_runtime`、`created_stage`、`created_release`、`switched_env`、`switched_current`、`committed` 标志，只清理或回滚本次创建、切换的资源。
- preflight 只冻结 39 个“current attempt 为旧媒体错误且 external=false”的 job/attempt/episode 精确身份，并保存稳定请求哈希；POST 前再次核对冻结身份及幂等命令数为 0，显式发送这 39 集。
- POST 后只以稳定命令身份和 51 个 job 全部 queued 作为 committed。只有命令数为 0 且冻结身份仍精确时允许回 1552；committed 或 unknown 均禁止重发和回旧 extractor，异常路径只停止 Screen Text Worker、保留 1607/current/env，并逐项验证临时清理。
- Worker 启动前证明 51 个 queued job 的预期优先级均唯一解析到本地 OpenVINO 目标，同优先级 cloud/Tencent 路径为 0。
- 监控只把冻结 39 个 job 产生的 completed attempt 作为进展门，并对命令后的全部新 attempt 拒绝 non-OpenVINO、Tencent、unknown、failed/cancelled 和旧媒体错误码；这些查询全部通过后才输出 `tencent=0`。
- helper 先复制为 root 控制、qimao 只读的 `0550` 文件，并验证复制前后 SHA-256 不变，之后才加载受保护环境。`SHA256SUMS` 固定 runner/preflight/retry，runner 在输入门执行 `sha256sum --strict -c`。

## evidence

- `node --check deploy/ai-recovery-1614/preflight.mjs`：通过。
- `node --check deploy/ai-recovery-1614/retry.mjs`：通过。
- `SHA256SUMS` 三项与当前 runner/preflight/retry 实际 SHA-256：一致。
- 四个 deploy 文件 CR=0、BOM=0、尾随空白=0；逐文件限定 `git diff --no-index --check`：通过。
- deploy 文件集合精确为四项；未发现 `ssh`、`scp`、`sftp` 或 `rsync`。
- trap 顺序检查：输入和哈希身份门先于 `ERR` trap。
- Shell 静态检查：未运行。本机无 `bash`、`sh`、`shellcheck`，常见 Git Bash/MSYS2/Cygwin 路径均不存在；WSL 未安装 Linux 发行版，因此不能将 shell 语法标为已通过。

## residual

- 服务器、数据库、服务、Provider 动作：0。
- 业务源码与 `docs/status/CURRENT.md` 修改：0。
- 执行前仍须在具备 Bash 的审核或目标环境运行 `bash -n deploy/ai-recovery-1614/runner.sh`；该项是当前唯一未完成的静态验证。
