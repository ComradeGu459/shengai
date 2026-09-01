# LOCAL-OCR-SERVER-06K 结果

- outcome: passed
- task: LOCAL-OCR-SERVER-06K
- current_sync: CURRENT v4-1212
- formal_lease: 1
- role: SERVER
- executed_at: 2026-08-28（Asia/Shanghai）

## evidence

### 前置与 candidate

- 只读 preflight 通过：current 为 20260828-local-ocr-05g-r4-composite；qimao-backend.service、qimao-worker@screen-text.worker.entry.js.service、qimao-upload-completion-worker.service 均 active，NRestarts=0；backend health 返回 status=ok、database=connected。
- 只读 schema 核对通过：1754976026000_expand_screen_text_batch_model、1754976027000_expand_screen_text_attempt_model 均已登记；screen_text_batches.model 与 screen_text_attempts.model 均为 varchar(160)。本轮没有运行 migration。
- active route 未创建或修改，仍为既有 development/screen_text、ocr_self_hosted_worker priority 1、provider=openvino、adapter=screen_text_openvino_ppocrv6_small、model=PP-OCRv6-Small@sha256:860f0a4b8354a510fe0f739c3f0e7f758cf59dd78edd529c7c2fbf48c5c28ca8、language=zh-CN、deployment=loopback_http、execution=self_hosted_worker；deploymentVersionId=e0ac8bc6-feea-4d12-836d-17e7e82dfcda、version=1、routingVersionId=7bd41c8c-18b0-46f3-83ec-17fdb0729b6f、routingTargetId=1a9eb5ee-3402-4c9b-a81b-1dd8ad7c88bc。查询未输出 endpoint、Secret 或 object key。
- candidate=20260828-local-ocr-06k-r1，从 05G-R4 精确复制后仅覆盖当前构建的 contracts screen-text dist、06J Worker repository dist 及两条已登记 migration 文件；保留 05G-R4 原目录作为精确回滚。
- archive：19439 bytes，SHA256=8743f3c075ee2723bdde8af33c605ffd2d81042e4d9b49bda2d82c58868175f。
- manifest SHA256=38ac554f66d1b59ee442825399aac0febdf305252924c7adfda6cf20ddfb19ea；远端逐项哈希一致：
  - packages/contracts/dist/screen-text.js：20464，483219c8a358533cfd55acb264f0c42918192267f0c3a484a181798ba56b682a
  - packages/contracts/dist/screen-text.d.ts：77215，488f690d9f9e94e10409db9cf69926a7153a141c94daa11a9d3f7aca5a9ce497
  - packages/contracts/dist/screen-text.js.map：24731，d1b33538f6df5362aaa633cc5aad78dee7ecb2ba65ddc244298ebbb10cbf5c10
  - packages/contracts/dist/screen-text.d.ts.map：4781，ef3f25ac4705cb49897d0bbc9bef312c1e048791def9ff737bf10e10523b1cb6
  - backend/dist/modules/screen-text/screen-text.worker.repository.js：23304，94e3aa4da7b508687b1df3c4911bacdcd3d55f8b8413c103009785d37174583b
  - backend/dist/modules/screen-text/screen-text.worker.repository.js.map：11386，5f1d6ea931030b6ade10aa7edab1e2a9881c2bc270b2c7ca0fa418f3a6de8d75
  - backend/migrations/1754976026000_expand_screen_text_batch_model.cjs：535，ea0c18ff9cbb0c9d3559d43753dc0081399a733b4895c2a79b2650afc92a46eb
  - backend/migrations/1754976027000_expand_screen_text_attempt_model.cjs：539，3a121105616df018f0fcf25b60536955dccd2f4881166fa94661887b6f16365d

### 切换与运行

- current 原子切换到 06K 后，只重启 qimao-worker@screen-text.worker.entry.js.service；Worker MainPID=345793，cwd 为 candidate；backend 与 upload-completion-worker 未重启。
- 切换后 health 通过；post-check 时三服务仍 active，NRestarts=0，current 仍为 20260828-local-ocr-06k-r1，health/database 仍为 ok/connected。
- route post-check 仍为上述既有 OpenVINO route/version，未发生 Provider、route、budget、CORS 或 migration 变化。

### 唯一匿名 synthetic 与链路

- 唯一保留 fixture：projectId=ffbf5034-8fb5-4749-8c6d-d43c8b9caee8、batchId=62e1018f-1e01-4763-9aef-3cb26ad990e6、jobId=d91a0117-b32f-4102-9718-411b6c956a45、attemptId=4d81949c-7818-4ed5-a605-929fccc655b0。
- DB post-check 唯一性：created_by=server-06k-synthetic 的 project count=1；attempt log row=1。
- 终态：batch=review_pending、job=review_pending、attempt=completed；candidate count=4。
- Worker→抽帧→OCR→candidate/log 通过：probedFrameCount=4、ocrFrameCount=4、deduplicatedFrameCount=0、candidateCount=4。
- 源合成 MP4 使用 ffmpeg 生成，非真实用户素材；既有私有腾讯 COS 源对象 Put/Head/独立短时 Get 均通过，content-type=video/mp4、size=4124、SHA256=2ed6dd9a26d031aabea96f25dcf2f89deaab66fff90b6f83d704c6cc3c169930。
- Worker 产生 4 个私有 PNG evidence；每个均完成 Put 后持久 Head、独立 Get、image/png、size>0、SHA 一致：
  - candidate row 50be01f3-2af2-4ab9-96b6-7f9fc4a8be2b：6264，57fb2c6b4a065c70fb30e8ceaea4a02f3a55e53feb77d17b359c5bd22f6eb00b
  - candidate row 7af3e712-88b3-4349-86f4-c8e8edee2c41：6264，57fb2c6b4a065c70fb30e8ceaea4a02f3a55e53feb77d17b359c5bd22f6eb00b
  - candidate row 9f28471e-fa46-4bbb-8d71-2fff5fcded6d：6259，c04f93d53cdffcd1fb487658ceef6437a615c6d3624e6bda6d2339c1cbc75feb
  - candidate row a3f95ab6-e2f4-4f29-acef-286d5866f180：6208，10bb19b3febca55ee968dd7e864caeb7d91fd850dd3dc88362e2f4ea5c09a979
- attempt descriptor 身份通过：capabilities_snapshot.descriptorDigest=8efd489fcdc4386a659fab8229b0a183b55a8e5409e4deb5428788dd444f7af4，attempt config_digest 相同，且与离线 production OpenVINO registry descriptor 相同；provider/adapter/model/language/deployment 字段均一致。该 digest 来自 snapshot，不是 control-plane v.config_digest。

## remaining_gap

- 无阻断 gap。唯一 synthetic fixture 按任务要求保留给 TEST；TEST 完成验收后应按其 fixture 清理流程移除项目及其私有对象。
- 未运行正式 migration，未新增 Provider/route/budget/CORS，未使用真实用户素材。

## next_owner

- TEST：使用唯一 fixture project/batch/attempt 做后续验收。
- TEST 完成后由 SERVER 按明确授权清理该 fixture；在此之前保持 candidate 与服务当前健康。

## files

- docs/deployment/LOCAL-OCR-SERVER-06K-RESULT.md
- candidate manifest：20260828-local-ocr-06k-r1-manifest.txt
- candidate archive：20260828-local-ocr-06k-r1.tar.gz
- candidate release：/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1
- exact rollback release：/opt/qimao-terms-cloud/releases/20260828-local-ocr-05g-r4-composite

## residual

- 远端 current 保持 06K；05G-R4 rollback 目录未改动。
- 仅保留上述一个 synthetic business fixture 及其源 MP4/PNG evidence；所有临时 runner、SQL、上传 archive/manifest 将在本报告写入后删除。
- 本地保留用户原有脏工作树，仅新增本结果文件；不提交、不推送、不部署。

## requires_user

- false

