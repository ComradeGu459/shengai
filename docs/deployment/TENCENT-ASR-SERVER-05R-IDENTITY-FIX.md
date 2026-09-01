# TENCENT-ASR-SERVER-05R-IDENTITY-FIX

```yaml
artifact_written: true
outcome: passed
scope: strict-local-only
network_actions: 0
external_writes: 0
current: v4-1323
role: SERVER
next_owner: PLANNING
requires_user: false
```

## outcome / 唯一首因

本轮完成本地身份统一修正。05Q 已由 child code `QIMAO_READABILITY_FAILED` 证明 bootstrap readability 门实际落在用户/组命名漂移；本轮不连接服务器、不读取 Secret 或媒体、不运行 DB/COS/Tencent，不执行 Execute。

bootstrap 的 SSH/bootstrap 角色继续是既定 `qimao-deploy`；业务及其主组单向固定为 `qimao:qimao`。没有创建、兼容 `qima` 用户组，也没有双身份 fallback。

## files

- `deploy/debian/bin/asr-isolated-synthetic-bootstrap.mjs`
- `deploy/debian/bin/asr-isolated-synthetic-business.mjs`
- `deploy/debian/bin/Invoke-TencentAsrSynthetic.ps1`
- `docs/deployment/TENCENT-ASR-SERVER-05L-SINGLE-ENTRY.md`
- `docs/deployment/TENCENT-ASR-SERVER-05R-IDENTITY-FIX.md`

## evidence

- bootstrap canonical business identity 为 `user=qimao, group=qimao`；provider、database.env 目标组为 `qimao`；readability 使用 `sudo -n -u qimao -g qimao`；createdb owner 为 `qimao`。
- business 运行前分别校验 `id -un=qimao`、`id -gn=qimao`；database peer 只接受 `current_user=qimao` 与目标隔离库名。
- runner provider 临时文件为 `qimao-deploy:qimao`；business 使用 `sudo -n -u qimao -g qimao`；plan/self-test 对 provider/env/业务组有明确 qimao 断言。
- 05U 前置设计保持身份合同不变：readability 七项仍由 `qimao:qimao` 检查，后续只细化稳定失败 code，不改变权限行为。
- 05W provider evidence 仅补回既有派生 target 字段，仍使用相同 `envDir/provider.env`、qimao 组和检查顺序。
- `node --check`：bootstrap exit 0；business exit 0。
- 两个 `.mjs --self-test`：均 `component=* / outcome=passed`。
- runner PowerShell AST：passed；Preflight：`outcome=passed`、`network_actions=0`、`external_writes=0`；embedded full mock：passed。
- 精确业务裸 `qima` 扫描：0；权威 `qimao` 断言：passed；限定 `git diff --check`：passed。

## residual / remaining_gap

本轮无远端或外部动作，`residual=0`。真实服务器 synthetic 尚未重跑；下一次 SERVER 轮次仍须按既定 single-entry 流程重新 Preflight 并在获授权时执行唯一 Execute，验证远端实际账户组与 qimao 可读性。

`next_owner=PLANNING`，`requires_user=false`。
