# AI-RECOVERY-SERVER-PREP-1614-R5 结果

## outcome

`artifact_written`

仅在本地最小修改 `deploy/ai-recovery-1614/runner.sh`、同步 `SHA256SUMS` 与 loader 内嵌 runner 身份，并新增本结果文档。未执行网络、服务器、SSH/SCP、root、API、Provider 或数据库动作。

## R5 事务边界

- runner 新增 `post_started=0` 与 `external_commit_possible=0`。
- `external_commit_possible=1`、`post_started=1` 紧邻设置在 curl POST 调用前；`post_started=1` 是外部提交可能已经发生的不可逆边界。
- 从该边界开始，ERR、EXIT、INT、TERM、transport error、HTTP 异常、瞬时 `commit-state=not_committed` 或 `unknown` 均进入 `commit_state=possible` 安全收口：禁止切回 1552/旧 extractor、禁止删除 1607、禁止重发，并停止 Screen Text Worker、保留 runtime 中的对账 state。
- 只有 `post_started=0` 且 pre-submit/commit-state 稳定证明未提交时，才允许既有 pre-commit 回滚。
- 明确查询到唯一命令与 51 queued 投影时设置 `committed=1`，输出 `commit_state=proven`；正常 route/monitor 路径保持不变。
- 终态不再把保守的 rollback 禁止标志写成已证实 committed：失败输出区分 `commit_state=proven` 与 `commit_state=possible`。

## 哈希闭包

- `SHA256SUMS` 已同步当前 runner，preflight/retry 哈希未变化。
- loader 中 runner 固定 bytes/SHA 及 `SHA256SUMS` 固定 SHA 已同步；其余身份门不变。

## local verification

- `post_started=1` 紧邻 curl 调用，且 rollback 的 possible/proven 分支顺序通过限定静态检查。
- runner/preflight/retry 与 `SHA256SUMS` 哈希闭包通过；loader 内嵌 bytes/SHA 与当前文件一致。
- R5 涉及文件 CR=0、BOM=0、尾随空白=0，限定 diff-check通过。

## residual

- 外部动作：0。
- route/monitor、retry/preflight、业务源码与 `docs/status/CURRENT.md` 修改：0。
