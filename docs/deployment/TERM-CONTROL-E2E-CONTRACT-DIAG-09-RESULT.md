# TERM-CONTROL-E2E-CONTRACT-DIAG-09 结果

## outcome

`diagnosed`

## evidence

### 实际请求（由 E2E-08 已执行脚本上下文复原）

请求为：`POST /api/system-control/secrets`。

body 的实际字段集合为：

| 字段 | 实际值/来源 | 实际类型 |
| --- | --- | --- |
| `commandId` | `stableUuid(runId, 'terms-secret-command')` | UUID 字符串 |
| `secretReferenceId` | `stableUuid(runId, 'terms-secret-reference')` | UUID 字符串 |
| `secretReferenceVersionId` | `stableUuid(runId, 'terms-secret-reference-version')` | UUID 字符串 |
| `candidateId` | discovery 首个匹配项原值；本轮冻结 provider candidate 为 `terms-deepseek-primary` | 有界 provider candidate 字符串，非 UUID |
| `displayName` | `DeepSeek 主力` | 非空字符串 |

没有额外 body 字段，也没有遗漏 schema 的四个必填字段。请求头为标准 `Accept: application/json`、`Content-Type: application/json`，以及 `Idempotency-Key: term-control-e2e-08-r1:terms-secret`；未添加认证头，因为 loopback app 使用显式注入 principal resolver。

### 逐字段合同对账

- `SystemControlCreateSecretReferenceBodySchema` 只允许 `commandId`、`secretReferenceId`、`secretReferenceVersionId`、`candidateId` 和可选 `displayName`，并设置 `additionalProperties: false`。四个 UUID 字段及 `displayName` 均匹配。
- 唯一不匹配是 `candidateId`：合同要求 `format: uuid`，实际 provider candidate 是 `terms-deepseek-primary`。因此该字段类型不符；不是缺字段或多余字段。
- discovery candidate 合同同样把 `candidateId` 声明为 UUID；而 provider 配置解析合同允许以字母数字、点、下划线、冒号、连字符组成的稳定候选标识。这证明是公共合同与 provider 身份格式的不一致。
- 管理员 `securityPage` 以同样的五字段调用 `createSecretReference`，`secretApi` 统一发送标准 Accept/Content-Type/Idempotency-Key；所以前端调用形状没有另外的字段错误。前端仅把 discovery 返回的 `candidate.candidateId` 原样提交，无法修正该类型冲突。
- backend `system-control-secret` 测试使用 UUID candidate，创建 body 仅四个必填字段；其额外字段伪造用例返回 400，支持 `additionalProperties: false` 门。本轮 harness 的 `displayName` 是 schema 允许的可选字段，不构成差异。

### HTTP/Fastify 证据

- E2E-08 唯一正式执行输出的精确 child code 为 `SECRET_CREATE_API_REQUEST_VALIDATION_FAILED`。
- harness 将收到的响应错误码按 `<label>_API_<error.code>` 投影；因此底层响应 code 精确为 `REQUEST_VALIDATION_FAILED`。
- backend 全局 Fastify error handler 对 validation error 返回 HTTP 400 与 `REQUEST_VALIDATION_FAILED`；Secret create route 的 body schema 正是 `SystemControlCreateSecretReferenceBodySchema`。Fastify schema 校验发生在进入 `createReference` handler 前，故没有 SecretReference 创建事实。
- service/provider 的反向证据：`resolveCandidate` 接收普通 string，provider parser 明确接受 `terms-deepseek-primary` 这类有界候选标识，并未要求 UUID；阻断来自公共 request schema，而非 provider resolve、数据库或 Secret 值。

### 外部与残留事实

- 本片只读仓库与上一回合上下文；没有 SSH、服务器、Provider、COS、Tencent、数据库或业务写入。
- E2E-08 已确认 DeepSeek provider POST、COS PUT、Tencent CreateRecTask/DescribeTaskStatus 均为 `0`；临时远端 root/upload staging 与本机临时目录均已 absent。
- 本结果未回放失败请求，也未修改业务代码或合同。

## unique_cause

`candidateId` 的公共 Fastify/TypeBox 合同错误地限定为 UUID，而现行 provider 的稳定 candidate 身份是合法的有界 opaque string；该类型冲突在 SecretReference create 的 Fastify body validation 阶段触发 `REQUEST_VALIDATION_FAILED`。

## unique_correction

将 `candidateId` 统一定义为共享的有界 provider candidate 标识类型，并同时用于 discovery、SecretReference create 和 rotate 的公开合同；保留 command/reference/version IDs 为 UUID，保留 provider 的字符集、长度和安全候选校验。之后只需让前端继续原样提交 discovery candidate，不在 harness 或 API 层增加转换/fallback。

## remaining_gap

`candidateId` 合同修正尚未实施；在规划审核并形成新的本地验证后，不得重放 E2E-08 或发送第二次 Secret create 请求。

## next_owner

`PLANNING`

## residual

`0`：本片无外部动作、无临时文件、无服务器状态变化。

## requires_user

`false`

