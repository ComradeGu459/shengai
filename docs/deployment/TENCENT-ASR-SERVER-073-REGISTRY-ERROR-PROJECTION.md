# TENCENT-ASR-SERVER-073-REGISTRY-ERROR-PROJECTION

```yaml
artifact_written: true
outcome: completed
scope: business_harness_and_deployment_result_only
source_error_name: TencentAsrConfigurationError
allowed_codes:
  - CONFIG_INVALID
  - CONFIG_INCOMPLETE
  - DISABLED_IN_PRODUCTION
  - SDK_UNAVAILABLE
projected_prefix: TENCENT_ASR_
fallback_code: UNEXPECTED_ASR_REGISTRY
message_stack_env_path_value_output: false
external_actions: 0
network_actions: 0
residual: none
next_owner: PLANNING
requires_user: false
```

## evidence

- `ASR_REGISTRY` 仅对白名单错误类、类名和四个稳定 code 同时匹配时投影为 `TENCENT_ASR_<CODE>`。
- 其他错误 name、未授权 code、普通对象和非配置异常均不投影，继续由现有 `runStage('ASR_REGISTRY', ...)` 映射为 `UNEXPECTED_ASR_REGISTRY`；registry 参数与正常返回行为未改变。
- 投影只创建最小 `HarnessError`，不输出或保存 message、stack、env、path 或 value；既有 `HarnessError` 原码保留逻辑不变。
- self-test 覆盖四个合法 code、伪造 name、伪造 code、普通对象拒绝，以及投影结果不泄漏错误正文。
- `node --check deploy/debian/bin/asr-isolated-synthetic-business.mjs`：exit `0`。
- `node deploy/debian/bin/asr-isolated-synthetic-business.mjs --self-test`：exit `0`，`outcome=passed`，包含 `asr_registry_error_projection`。
- 本轮未修改 backend、runner、archive，未连接服务器，未执行 Secret、媒体、DB、COS 或 Tencent 动作。

## files / residual

- 修改：`deploy/debian/bin/asr-isolated-synthetic-business.mjs`。
- 新增：`docs/deployment/TENCENT-ASR-SERVER-073-REGISTRY-ERROR-PROJECTION.md`。
- 限定结果标记、敏感字段检查和 `git diff --check` 通过；无临时残留。

`next_owner=PLANNING`；`requires_user=false`。
