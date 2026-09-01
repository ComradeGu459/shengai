# LOCAL-OCR-SERVER-06B 结果

- outcome: blocked
- 最后成功门：已精确删除 06A 空项目；当前 backend、upload-completion Worker、screen-text Worker、OpenVINO 与现有 active route 均保持健康。
- 直接阻塞：唯一 synthetic seed 在调用生产 `ScreenTextWriteRepository.create` 时返回 PostgreSQL `22001`（字符串超出 `varchar` 长度）。未重发 create、未创建第二个项目或 batch/job。

## 身份与行为

- 06A 空项目：`6ba2e19b-4935-470f-be63-39bfc60e8134`；删除前 project=1、manifest/session/asset/batch 均为 0（另有 1 条级联 project command），精确事务删除成功。
- 本轮唯一 synthetic projectId：`49d8eef6-1869-4a83-9725-69aba619ac17`。
- manifestId：`5c59fbdd-5ab6-4649-84ca-666f6635a9d8`。
- assetId：`4dd363b3-a9e3-41c4-8f2d-a9bd4a94933a`。
- termDraftId：`3ae31492-958b-4667-b01c-deb4e102257a`。
- termVersionId：`baef8bac-184a-4058-84a6-5d879a9cbca0`。
- batchId/jobId：未生成（repository create 在批次 INSERT 前失败）。
- candidates：not_run（batch/job 未创建，现有 Worker 未领取本轮任务）。
- evidence/COS Head/Get：not_run；仅对 seed 视频对象执行过一次 putObject，失败后同一身份 Head=false，未进入 OCR evidence 写入。
- COS：执行过且仅执行一次 synthetic `putObject`；对象身份为本轮 project 派生的私有临时身份，报告不记录 object key。失败清理随后按同一身份 `deleteObject`，并以同一身份 Head 确认不存在。
- 数据库 seed：project/manifest/binding/verified asset/confirmed term draft+version 已写入后因 create 失败回滚清除；无业务项目或真实素材动作。

## 证据

- 生产 descriptor 由当前 release registry 解析，`model` 前缀 `PP-OCRv6-Small@sha256:` 长度 22，加 64 位 digest 后总长 86。
- 只读 PostgreSQL `information_schema`：`screen_text_batches.model`=`varchar(80)`；同表 adapter=80、deployment=80、input_version/output_version=40。
- 因此 `ScreenTextWriteRepository.create` 的 batch INSERT 触发稳定 `22001`；这是当前 schema/descriptor 长度契约不一致，不是 COS、路由或 Worker 故障。
- 远端服务基线：backend、upload-completion Worker、screen-text Worker、OpenVINO 均 active，`NRestarts=0`；health=200，未认证 API=401；active route 仍指向既有 OpenVINO self-hosted worker。

## 清理与残留

- 失败 seed 的精确数据库对账：projects=0、manifests=0、manifest_bindings=0、asset_bindings=0、assets=0、screen_text_batches=0、screen_text_jobs=0、screen_text_commands=0。
- 同一派生 COS 对象 Head=false（不存在）。未扫描桶、未访问其他项目或对象。
- helper、合成视频及远端临时 helper 均已删除；本轮无 release/unit/env/route 改动。
- residual: 0（仅保留既有服务/路由/历史 release；无 06B synthetic fixture 可供 TEST 读回）。
- rollback: 不需要服务回滚；外部状态已恢复到任务前基线。

## 交接

- remaining_gap: BACK 需最小修复 `screen_text_batches.model`/相关快照列长度契约（或缩短 descriptor 持久化表示）并补一次 repository INSERT 回归；SERVER 不改业务代码/迁移。
- next_owner: BACK
- requires_user: false
- files: `docs/deployment/LOCAL-OCR-SERVER-06B-RESULT.md`
