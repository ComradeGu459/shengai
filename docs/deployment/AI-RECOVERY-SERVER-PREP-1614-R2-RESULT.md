# AI-RECOVERY-SERVER-PREP-1614-R2 结果

## outcome

`artifact_written`

仅修改 `deploy/ai-recovery-1614/retry.mjs`、同步 `deploy/ai-recovery-1614/SHA256SUMS`，并新增本结果文档。未执行服务器、SSH/SCP、root、部署、API、Provider 或数据库动作。

## R2 修正

`requireLocalRoutes` 现在针对原 batch 的全部 51 个 queued job：

- 按代码现有语义计算每个 job 的 `expected_priority`。
- 要求该优先级恰有一个 target，且唯一 target 为本地 OpenVINO `screen_text_openvino_ppocrv6_small`。
- 显式拒绝 expected priority 上的 cloud/Tencent target。
- 对同一 job 的 `routing_version_id` 检查全部 `priority > expected_priority` target，并要求数量为 0。

因此 Worker 启动门不再只证明当前 expected target，而是同时证明不存在可继续推进的后续 fallback。R1 的 39 个冻结身份、commit/unknown 边界、安全停止、helper 哈希和禁止盲重发合同保持不变。

## evidence

- `node --check deploy/ai-recovery-1614/retry.mjs`：通过。
- `SHA256SUMS` 已更新 retry helper，并与当前 runner/preflight/retry 实际 SHA-256 一致。
- 限定 diff-check：通过。

## residual

- 外部动作：0。
- 业务源码与 `docs/status/CURRENT.md` 修改：0。
