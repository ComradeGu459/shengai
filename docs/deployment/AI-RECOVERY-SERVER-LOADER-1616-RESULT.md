# AI-RECOVERY-SERVER-LOADER-1616 结果

## outcome

`artifact_written`

已在 `deploy/ai-recovery-1614/` 新增唯一 `loader.sh`。本任务仅修改本地文件，未执行服务器、SSH/SCP、root、systemd-run、部署、API、Provider 或数据库动作。

## artifact

- `deploy/ai-recovery-1614/loader.sh`

`deploy/ai-recovery-1614/SHA256SUMS` 保持只冻结 `runner.sh`、`preflight.mjs`、`retry.mjs` 三项，未加入 loader。

## loader 合同

- 固定参数：`inbound=/var/tmp/qimao-ai-recovery-1616-inbound`、`transfer=/var/tmp/qimao-ai-recovery-1614-transfer`；要求 root。
- inbound 必须为 `qimao-deploy:qimao-deploy:700`，目录内精确七个 regular file，文件均为 `qimao-deploy:qimao-deploy:600`。
- 对候选三件套复核固定 bytes/SHA-256；对 runner/preflight/retry/SHA256SUMS 复核固定 SHA-256，并执行 frozen `SHA256SUMS`。
- transfer 必须 absent；loader 仅由 root 新建为 `root:root:700`，runner 安装为 `0700`，其余六项安装为 `0600`。
- 复制后先运行 `/bin/bash -n` 检查 transfer runner，再复核七文件集合、owner/mode、bytes、固定 SHA-256 与 frozen `SHA256SUMS`。
- 完成所有门后精确删除 inbound 并验证 absent，随后 `exec /bin/bash "$transfer/runner.sh" "$transfer"`。
- exec 前任何失败只删除本任务已创建的固定 transfer 和固定 inbound；loader 不包含 release、current、env、unit、数据库或 Provider 操作。

## local verification

- 本机无 `bash`、`sh` 或 `shellcheck`，且 WSL 无 Linux 发行版，因此未运行本地 Bash 语法检查。
- 主通道必须在 root systemd-run 前，先以非 root 对即将通过 stdin 提交的同一 loader 内容运行 `bash -n`；随后 loader 自身还会对复制后的 runner 执行 root 侧 `/bin/bash -n`。
- 本地限定 diff-check、CR/BOM 与尾随空白检查：通过。

## residual

- 外部动作：0。
- 现有 runner/preflight/retry 逻辑与 `docs/status/CURRENT.md` 修改：0。
