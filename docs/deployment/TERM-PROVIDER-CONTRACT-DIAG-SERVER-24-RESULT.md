# TERM-PROVIDER-CONTRACT-DIAG-SERVER-24

- `artifact_written: yes`
- `blocked: no`
- `outcome: diagnosed`
- `requires_user: false`

## 范围与变更

本轮为只读核对。未写入数据库、配置或远端文件，未调用 DeepSeek、COS 或 Tencent，未重跑 E2E。唯一持久化产物是本结果文档。

## 当前 active terms route

数据库只读投影显示当前为 development/terms 的唯一 active route：

| 字段 | 事实 |
|---|---|
| routing version | `8e76ffde-83f6-4cad-b8ff-0f2bf620f38d`，version `1`，latest status=`active` |
| target | `56d6f40f-608e-4c2a-9628-32599779d984`，priority `1`，role=`preferred` |
| engine deployment | `c7960837-8dab-40e4-b40d-e833c10508c3`，execution=`cloud_api`，provider=`deepseek`，adapter=`terms_api` |
| engine version | `d149bfec-e95f-4a57-8aea-40655a458053`，version `1`，model=`deepseek-v4-flash`，language=`zh-CN` |
| preset | `deepseek-v4-flash` |
| endpoint | host=`api.deepseek.com`，path=`/chat/completions` |
| Secret binding | SecretReference 绑定存在；未读取或输出 Secret、引用值或载荷 |

## runtime prompt 与分类顺序

active version 的 `runtime_config` 只有 preset、endpoint、prompt、categoryOrder 四类合同字段。prompt 非敏感文本为：

```text
你是影视字幕术语抽取器。只返回 JSON 对象，不要 Markdown、解释或代码围栏。
JSON 顶层只能有 candidates 和可选 diagnostics；candidates 必须是数组。
每个 candidate 必须包含 type、name、aliases、gender、note、confidence、evidenceCueIds。
没有可靠证据的候选不要输出。evidenceCueIds 必须引用输入中真实存在的 cue id。
```

- prompt 长度：225 个 Unicode 字符，UTF-8 为 393 字节。
- prompt SHA-256：`4d5cd92de8e770865735d4a22e30febadfbb02f96f52318c222b20748476c33d`。
- 含 JSON 字样：是；同时明确写出顶层字段和 candidate 字段。
- 含“完整目标 JSON 示例”：否；文本没有完整的 `{...}` 目标输出示例。
- categoryOrder 八类且顺序固定为：`人名` → `地名` → `特定物品` → `朝代` → `组织名` → `等级` → `物种/种族名` → `特殊概念/事件`。

## current release 请求形态

服务器 `/opt/qimao-terms-cloud/current` 的实际 adapter 请求体为：

- `model`
- `messages`：system prompt 加 user 的 cues JSON
- `response_format: { type: 'json_object' }`

请求体没有 `thinking`，也没有 `max_tokens`。因此当前行为没有显式关闭 thinking；DeepSeek Chat Completions 文档说明 thinking 默认启用，非 thinking 需显式使用 `thinking: { type: 'disabled' }`。当前请求也没有为 JSON 输出设置生成上限。

## 与 DeepSeek 官方 JSON Output 合同的差量

- 已满足：`response_format` 使用 `json_object`。
- 已满足：prompt 含 JSON 指令字样。
- 缺失：官方 JSON Output 指南要求提供期望 JSON 格式示例；当前 prompt 只有字段文字，没有完整目标 JSON 示例。
- 缺失：官方指南建议设置合理的 `max_tokens`，避免 JSON 被截断；当前请求未设置。
- 额外运行确定性差量：当前请求未显式设置 `thinking` 为 disabled，而官方 Chat Completions 文档记录默认 thinking 为 enabled。

参考：[DeepSeek JSON Output](https://api-docs.deepseek.com/guides/json_mode/)、[Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/)、[Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/)。

## SERVER-23 error_detail 可恢复性

只读查询确认 SERVER-23 的 run `818d6036-9617-4453-91a5-63d42dfcfa8c`、attempt `bd7f7ae7-64f0-4878-933b-e8a8390fcdc3` 及该 run 的 attempts 当前均为 `0` 行。现行清理逻辑删除 `term_extraction_runs`，attempt 通过外键级联删除；因此原始 `error_detail` 已不可恢复。当前仍可确认的历史安全证据只有此前落盘的错误码 `TERM_PROVIDER_PROTOCOL_INVALID`，不能据此还原 Provider 原始响应正文。

## 唯一最小建议

由 BACK 在同一 current adapter contract 修正中一次性补齐：显式发送 `thinking: { type: 'disabled' }`、设置固定且有界的 `max_tokens`，并在现有 prompt 中加入一个完整的目标 JSON 示例；SERVER 不实施该修复，也不追加 fallback。

## remaining_gap / next_owner / residual

- `remaining_gap`：尚未证明修正后的 DeepSeek 响应能通过现行候选协议校验；本轮不做付费验证。
- `next_owner`：BACK，按上述单一合同修正并补对应 adapter 测试；之后再由 SERVER 重新安排受控 E2E。
- `residual`：canonical route、engine/version、SecretReference、生产配置、systemd unit 和源码均未修改；无临时文件或外部调用残留。

