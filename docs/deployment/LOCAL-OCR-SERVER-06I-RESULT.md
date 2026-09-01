# LOCAL-OCR-SERVER-06I 结果

- outcome: blocked
- artifact_written: true
- role: SERVER
- lease: 0
- next_owner: BACK/PLANNING
- requires_user: true（需规划确认 descriptor 持久化/configDigest 一致性后再安排业务动作）

## evidence

### active route

- routingVersionId: 7bd41c8c-18b0-46f3-83ec-17fdb0729b6f
- routingTargetId: 1a9eb5ee-3402-4c9b-a81b-1dd8ad7c88bc
- pool: ocr_self_hosted_worker
- priority: 1
- deploymentId: 998dea43-3257-4a0b-9a05-765598cbfdd8
- deploymentVersionId: e0ac8bc6-feea-4d12-836d-17e7e82dfcda
- deployment version: 1
- capability/executionKind: screen_text / self_hosted_worker
- provider: openvino
- adapter: screen_text_openvino_ppocrv6_small
- model: PP-OCRv6-Small@sha256:860f0a4b8354a510fe0f739c3f0e7f758cf59dd78edd529c7c2fbf48c5c28ca8
- language: zh-CN
- deployment: loopback_http
- capabilities: supportsRegions=true, supportsConfidence=true, supportsLanguageHints=true, maxFramesPerEpisode=600
- configDigest: 0ffcf19d4a9d390d8a4f0a0ce94d78b47542d0595bfb65b6c7500ab427bf07ac
- billingSnapshot: billingClass=unmetered_local, currency=CNY, billingUnit=local_frame, maximumAmount=0.000000, maximumQuantity=0

control-plane capabilities snapshot 实际键集合为：
adapterKey、adapterKind、capabilities、capability、deployment、descriptorDigest、executionKind、language、model、provider。
其中没有持久化 inputVersion 或 outputVersion；本次比较中的 savedDescriptor 因此对应为 null。

### offline production OpenVINO registry

- EnvironmentFile: 使用现行 screen-text Worker 的 backend.env、local-ocr-04g-onnx.env、local-ocr-04g-openvino.env、screen-text-local-ocr-05d.env
- production registry: created successfully
- sidecar transport: replaced by a throw-only guard；未调用
- provider/adapter/model/language/deployment: openvino / screen_text_openvino_ppocrv6_small / PP-OCRv6-Small@sha256:860f0a4b8354a510fe0f739c3f0e7f758cf59dd78edd529c7c2fbf48c5c28ca8 / zh-CN / loopback_http
- inputVersion: screen-text-local-ocr-input-v1
- outputVersion: screen-text-local-ocr-output-v1
- capabilities: supportsRegions=true, supportsConfidence=true, supportsLanguageHints=true, maxFramesPerEpisode=600
- configDigest: 8efd489fcdc4386a659fab8229b0a183b55a8e5409e4deb5428788dd444f7af4
- billing: billingClass=unmetered_local, currency=CNY, billingUnit=local_frame, maximumAmount=0.000000, maximumQuantity=0

### stable comparison and execution

- stableHash(savedDescriptor): ae42097aef8c149849f3413afcb49d59c906ab0df820bc32cdc8084dc60d8ebf
- stableHash(registryDescriptor): 0a0941e711807d1b7e4145089cda98f2e8e271b52c1fb1f28807acb62a762896
- registry.resolve(savedDescriptor): failed
- resolve error: 画面字适配器未登记或能力快照不匹配：screen_text_openvino_ppocrv6_small
- actual failure stage: registry.resolve

字段级 mismatch keys：

| key | saved/control-plane | offline registry |
|---|---|---|
| inputVersion | null | screen-text-local-ocr-input-v1 |
| outputVersion | null | screen-text-local-ocr-output-v1 |
| configDigest | 0ffcf19d4a9d390d8a4f0a0ce94d78b47542d0595bfb65b6c7500ab427bf07ac | 8efd489fcdc4386a659fab8229b0a183b55a8e5409e4deb5428788dd444f7af4 |

- billingSnapshotMatches(savedBilling, registryBilling): true
- stableBudgetDigest(savedBilling): c95da136a4a25ad1fde4059bbdc40d45cdd9bd4a88b77f2d1e290c90037db314
- stableBudgetDigest(registryBilling): c95da136a4a25ad1fde4059bbdc40d45cdd9bd4a88b77f2d1e290c90037db314
- billing mismatch keys: none

Worker 代码顺序是先 registry.resolve(savedDescriptor)，再 billingSnapshotMatches；因此本轮实际阻塞发生在 resolve，计费比较虽单独执行并通过，但生产 Worker 不会走到该分支。

## remaining gap

需要由 BACK/PLANNING 确认 control-plane version 的 configDigest 是否应与 adapter descriptor.configDigest 分离保存，以及 input/output version 的权威持久化来源。当前 active version 的控制面 snapshot 无法构成与生产 registry 完全相等的 savedDescriptor。

## files

- written: docs/deployment/LOCAL-OCR-SERVER-06I-RESULT.md
- temporary local read-only comparison script: created for execution and removed
- business code changed: none
- business database writes: none

## residual

- 未停止或重启服务。
- 未调用 sidecar、COS、网络推理或 connection test。
- 未创建 fixture，未修改 budget、route、version、Provider、CORS 或业务库。

## requires_user

是：请先由 BACK/PLANNING 处理 descriptor/configDigest/input-output 的一致性方案，再下发新的任务卡；SERVER 不自行修改业务实现或重跑业务流程。
