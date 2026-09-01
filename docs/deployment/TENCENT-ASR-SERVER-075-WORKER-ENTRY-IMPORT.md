# TENCENT-ASR-SERVER-075-WORKER-ENTRY-IMPORT

```yaml
artifact_written: true
outcome: completed
scope: business_harness_and_deployment_result_only
worker_core_module: backend/dist/workers/asr.worker.js
worker_entry_module: backend/dist/workers/asr.worker.entry.js
registry_factory_source: worker_entry_module
asr_worker_source: worker_core_module
registry_parameters_changed: false
worker_behavior_changed: false
external_actions: 0
network_actions: 0
archive_worker_entries: core_and_entry_present
residual: none
next_owner: PLANNING
requires_user: false
```

## evidence

- 模块导入现在同时加载 `workers/asr.worker.js` 与 `workers/asr.worker.entry.js`；前者继续提供 `AsrWorker` 和 `asrWorkerConfig`，后者唯一提供 `createAsrWorkerRegistryFromEnv`。
- registry 仍使用原有 `env` 与同一 storage signer 参数；没有复制 registry 实现，也没有改变 stage、fallback 或 Worker 行为。
- self-test 新增 `worker_entry_import_contract`，静态断言 core/entry 路径；既有 storage stage、registry 错误投影、HarnessError 原码和安全输出回归仍通过。
- 冻结 04B archive 只读目录核对通过：`backend/dist/workers/asr.worker.js` 与 `backend/dist/workers/asr.worker.entry.js` 均存在。
- `node --check deploy/debian/bin/asr-isolated-synthetic-business.mjs`：exit `0`。
- `node deploy/debian/bin/asr-isolated-synthetic-business.mjs --self-test`：exit `0`，`outcome=passed`，包含 `worker_entry_import_contract`。
- 本轮未连接服务器，未执行 runner、Secret、媒体、DB、COS、Tencent 或其他外部动作。

## files / residual

- 修改：`deploy/debian/bin/asr-isolated-synthetic-business.mjs`。
- 新增：`docs/deployment/TENCENT-ASR-SERVER-075-WORKER-ENTRY-IMPORT.md`。
- 限定静态检查、敏感字段检查和 `git diff --check` 通过；无临时残留。

`next_owner=PLANNING`；`requires_user=false`。
