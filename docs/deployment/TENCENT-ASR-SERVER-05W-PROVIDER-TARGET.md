# TENCENT-ASR-SERVER-05W-PROVIDER-TARGET

```yaml
artifact_written: true
outcome: passed
scope: strict-local-only
network_actions: 0
external_writes: 0
execute_invoked: false
next_owner: PLANNING
requires_user: false
residual: 0
```

## evidence

05V 已由精确 child code 锁定 provider readability 失败；本轮只修复 `installProvider` 的返回数据流：从仅返回 `stat/sha256` 改为返回完整 `{target, stat, sha256}`。没有修改 `deriveProviderTarget`、权限命令、身份、owner/mode、readability 检查顺序或 runner。

纯函数/自测覆盖：

- target 精确等于同一 `envDir/provider.env` 派生结果。
- readability 的 `PROVIDER_ENV` entry 与 prepared result 复用同一 target。
- 返回字段完整性防回归：`target`、`stat`、`sha256` 均存在。
- 错误 target 被 `PROVIDER_TARGET_MISMATCH` 拒绝。
- 既有 identity、ownership、database URL、readability code、cleanup 门保持通过。

## validation

- bootstrap `node --check`：exit 0；`--self-test`：`outcome=passed`，包含 `provider_target_return`、`provider_target_data_flow`、`provider_target_mismatch_rejected`。
- business `node --check + --self-test`：passed，文件未修改。
- runner PowerShell AST、Preflight、全 mock：passed；Preflight `network_actions=0`、`external_writes=0`，未调用 Execute。
- target 数据流静态断言：passed；禁敏扫描、限定 `git diff --check`、作用域尾随空白检查：passed。
- 本轮无 SSH/scp/ffmpeg/sudo、Secret、媒体、DB、COS、Tencent 动作。

## residual / remaining_gap

`residual=0`。真实远端 provider readability 与 synthetic 仍待后续获授权 SERVER 轮次验证；`next_owner=PLANNING`，`requires_user=false`。
