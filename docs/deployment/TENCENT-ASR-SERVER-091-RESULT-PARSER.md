# TENCENT-ASR-SERVER-091-RESULT-PARSER

## outcome

artifact_written。仅修改 runner 的 business stdout 解析；未执行 SSH、服务器、COS、Tencent 或 DB 动作。

## evidence

- 先按模式计算 `expectedBusinessOutcome`，再逐行解析 business stdout。
- 仅接受唯一一条对象且 `component=business`、`outcome=expectedBusinessOutcome`；前置无关 JSON 行可忽略。
- 缺失、重复、非对象、business 错误 outcome 或非法 JSON 均返回 `BUSINESS_OUTPUT_INVALID`；bootstrap 解析保持原行为。
- SelfTest 覆盖单条、前置额外 JSON 行、缺失、重复、错误 outcome、非对象，以及 `completed` 期望值。
- PowerShell AST 解析通过；runner SelfTest `outcome=passed`，23 个既有 case 全部通过；限定 `git diff --check` 通过。

## files

- `deploy/debian/bin/Invoke-TencentAsrSynthetic.ps1`
- `docs/deployment/TENCENT-ASR-SERVER-091-RESULT-PARSER.md`

## residual

无远端或外部动作；未读取或输出 Secret、媒体正文、对象键或业务结果值。

## remaining_gap

无。本轮未执行 synthetic，需由规划决定后续调用。

## next_owner

PLANNING

## requires_user

false
