# TENCENT-ASR-SERVER-079-CONTRACT-SWEEP

## outcome

artifact_written；本轮本地离线合同修正完成。仅修改 business harness 与本结果文档；未执行服务器、Secret、媒体、DB、COS、Tencent、runner 或 backend 动作。

## evidence

文件化目标：`deploy/debian/bin/asr-isolated-synthetic-business.mjs`。

1. 上传创建请求由 `createUploadSessionBody` 固定带 `checksumAlgorithm: 'sha256'`。对应契约 `CreateUploadBodySchema` 的必填字面量为 `sha256`；self-test 已断言精确值。
2. 两次上传完成后，`TERMS` 阶段先 GET `/api/projects/:projectId/terms`，只从 `source.sourceSrtSetDigest` 读取真实集合 digest；同一 digest 同时传给 extraction 与 release。无效或缺失 digest 稳定阻断为 `TERMS_WORKSPACE_DIGEST_MISSING`，不回退到单文件 SHA。
3. 模块导入改为加载 `modules/screen-text/screen-text.adapter-registry.js`。connection-test 通过 `createConnectionTestRegistries` 复用同一 `asrRegistry`，并调用 default screen-text registry；不再导入或调用 production local-OCR connection entry factory。
4. `BATCH_DISPATCH` 只 POST `/api/asr/dispatch-groups`。从 `results` 中唯一 `acceptanceStatus='accepted'` 的 result 读取 `batchId`，并核对其 `eligibility.termVersionId` 等于已发布 `termVersionId`；缺失或不一致分别稳定阻断为 `ASR_DISPATCH_BATCH_MISSING` / `ASR_DISPATCH_TERM_VERSION_MISMATCH`。已删除 direct batch create 调用。
5. 预算 rule 仅调整为 `warningLimit='9'`、`hardLimit='10'`；`1.75*5=8.75` 小于 warning，且 warning 严格小于 hard。路由、价格和其余请求字段未变。

## validation

- `node --check deploy/debian/bin/asr-isolated-synthetic-business.mjs`：通过。
- `node deploy/debian/bin/asr-isolated-synthetic-business.mjs --self-test`：通过；输出 `component=business`、`outcome=passed`，包含五个新增 `contract_sweep_*` case。
- schema 对账（只读）：上传 schema 的 checksum 算法、terms workspace 的 `source` 投影、dispatch result 的 `acceptanceStatus/batchId/eligibility` 与 harness 读取路径一致。
- 静态对账：无 `createSystemControlConnectionTestRegistriesFromEnv`、无 `system-control.connection-test.worker.entry.js`、无 direct batch POST、旧预算阈值不存在；存在唯一 checksum 声明、workspace GET、accepted batch 与 9/10 阈值。
- `git diff --check`（含未跟踪 harness 的 no-index 检查）：无输出。

## residual

无本轮生成的临时文件；network actions=0，external writes=0，Tencent writes=0。未进行真实 peer/服务器运行验收。

## remaining_gap

本轮只完成离线 harness 合同修正；真实隔离 synthetic、COS/Tencent 创建与清理仍需后续获授权的单独运行任务验证。

## next_owner

PLANNING

## requires_user

false
