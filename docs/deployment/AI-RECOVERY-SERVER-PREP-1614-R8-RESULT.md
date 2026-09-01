# AI-RECOVERY-SERVER-PREP-1614-R8 结果

## outcome

`artifact_written`

仅在本地修正 runner 的 preflight 临时目录，同步 `SHA256SUMS` 与 loader 内嵌 runner 身份，并新增本结果文档。未执行服务器、网络、API、Provider 或数据库动作。

## R8 阻断修正

- 不再通过 qimao 在 `/tmp` 创建 preflight 目录，也未新增 `/var/tmp` 路径。
- 复用 runner 已创建的 `$state_dir`；该目录在使用前已固定为 `qimao:qimao:0700`。
- preflight 目录现在由 qimao 执行 `mktemp -d "$state_dir/preflight.XXXXXX"` 创建。
- `safe_remove_tree` 仅新增精确的 `"$state_dir"/preflight.*` 白名单模式；stage、new release、runtime 等既有清理边界保持不变。
- R5 事务边界、R6 RuntimeDirectory、R7 canonical extractor、业务 helper、retry/preflight、route/monitor 均未修改。

## 哈希闭包

- `SHA256SUMS` 已同步当前 runner；preflight/retry 哈希未变化。
- loader 中 runner 固定 bytes/SHA 及 `SHA256SUMS` 固定 SHA 已同步。

## local verification

- runner 唯一实际 `mktemp -d` 目标为 `$state_dir/preflight.XXXXXX`，其前置 state_dir owner/mode 安装门存在。
- 未新增 `/var/tmp` preflight 路径；新增清理白名单精确匹配 `$state_dir/preflight.*`。
- R5/R6/R7 关键边界仍存在。
- 哈希闭包、loader 内嵌 bytes/SHA、CR=0、BOM=0、尾随空白与限定 diff-check：通过。

## residual

- 外部动作：0。
- 业务/retry/preflight/route/monitor、业务源码与 `docs/status/CURRENT.md` 修改：0。
