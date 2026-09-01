# TENCENT-ASR-SERVER-071-STORAGE-STAGE-SPLIT

```yaml
artifact_written: true
outcome: completed
scope: business_harness_and_deployment_result_only
external_actions: 0
network_actions: 0
storage_stages:
  - STORAGE_CONFIG
  - STORAGE_CLIENT
  - ASR_REGISTRY
behavior_change: stage_localization_only
parameters_env_merge_instances_preserved: true
harness_error_code_preserved: true
unknown_error_mapping: UNEXPECTED_<STAGE>
residual: none
next_owner: PLANNING
requires_user: false
```

## evidence

- 现有 `STORAGE_REGISTRY` 代码已原样拆为三个 `runStage`：先执行 `createProductionS3ConfigFromEnv`，再用同一配置创建 `ProductionS3CompatibleUploadStorage`，最后把同一 storage 作为 `objectUrlSigner` 传给 `createAsrWorkerRegistryFromEnv`。
- 未改变参数、env 合并顺序、storage/asrRegistry 对象实例关系、错误正文或 `HarnessError` 原码保留逻辑；未知异常继续只映射为当前阶段的 `UNEXPECTED_<STAGE>`。
- self-test 新增 `storage_stage_split`，逐一验证 `STORAGE_CONFIG`、`STORAGE_CLIENT`、`ASR_REGISTRY` 的未知异常稳定码；既有 HarnessError 原码和安全错误投影回归仍通过。
- `node --check deploy/debian/bin/asr-isolated-synthetic-business.mjs`：exit `0`。
- `node deploy/debian/bin/asr-isolated-synthetic-business.mjs --self-test`：exit `0`，`outcome=passed`，包含 `storage_stage_split`。
- 本轮未连接服务器，未执行 runner、archive、DB、COS、Tencent 或其他外部动作。

## files / residual

- 修改：`deploy/debian/bin/asr-isolated-synthetic-business.mjs`。
- 新增：`docs/deployment/TENCENT-ASR-SERVER-071-STORAGE-STAGE-SPLIT.md`。
- `git diff --check` 与限定结果标记检查通过；无本轮生成的临时残留。

`next_owner=PLANNING`；`requires_user=false`。
