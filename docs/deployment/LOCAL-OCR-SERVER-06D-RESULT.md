# LOCAL-OCR-SERVER-06D 结果

- outcome: rolled_back
- candidate: `20260828-local-ocr-06d-r1`
- base/current after rollback: `20260828-local-ocr-05g-r4-composite`
- manifest SHA-256: `74cf8d2ea8cbee60781631e60a43ea21b9b3fd47293b7d0c22d5847e7a61dc9f`
- overlay archive SHA-256: `37B6578ADCA16361440A9B5A628685B460F281513F0D2C45427A79FDC7DDEB40`

## 实际动作

- 从健康 05G-R4 克隆唯一 candidate，仅覆盖 06C 的 contracts `screen-text` 四个编译产物与迁移 `1754976026000_expand_screen_text_batch_model.cjs`。
- 迁移成功应用，`screen_text_batches.model` 变为 `varchar(160)`；随后原子切换 backend，未改静态、route、Worker 配置或 COS 配置。
- 生成并上传一次 synthetic 视频对象；以一次 `ScreenTextWriteRepository.create` 创建 batch/job（`replay=false`）。
- Worker 首次 claim 时在 attempt 快照写入阶段触发 `22001`，进入自动重启；立即停止循环、恢复 backend current、删除 candidate，并清理本轮身份。

## 身份与业务计数

- projectId：`9b8ce871-3bf9-4bdb-bd10-b81cb7a6bb80`
- manifestId：`5fbf597d-3255-49dc-991a-e54c2e358f7a`
- assetId：`47a30f20-0192-458b-bdba-4e1e24a8a2f0`
- termDraftId：`bede27ac-dde9-46d0-af97-fbfcb2d9275c`
- termVersionId：`37387729-70f2-4cdd-b42b-023e9b5dfac0`
- batchId：`3d47c8b7-1aad-4838-a9ae-9d555f787dda`
- jobId：`806a2db8-fcaf-4465-8eb7-401c01147790`
- candidates/evidence：未生成（Worker 在 attempt 建立阶段失败）。

清理前精确计数：project=1、manifest=1、manifest binding=1、asset binding=1、asset=1、batch=1、job=1、attempt=0、candidate=0；COS 对象 Head=true。清理后上述所有数据库计数均为 0；同一对象身份 `deleteObject=deleted`，随后 Head=false。

## 根因证据

- production descriptor 的 model identity 固定为 `PP-OCRv6-Small@sha256:<64hex>`，长度 86。
- 迁移后只读 schema：`screen_text_batches.model` 最大 160；`screen_text_attempts.model` 仍最大 80。
- screen-text Worker 专用 error log 首错为 PostgreSQL `22001`（`value too long for type character varying(80)`），堆栈落在 `screen-text.worker.repository` attempt transaction；因此不是 COS、抽帧、OCR、路由或模型故障。

## 运行与回滚验收

- 回滚后 current 指向 05G-R4；candidate release 不存在。
- backend、upload-completion Worker、screen-text Worker、OpenVINO 均 active，`NRestarts=0`；health=200。
- 迁移 1754976026000 保留为已应用的向前 schema 状态；未执行 down。
- 未创建 route、未访问真实素材、未改真实用户项目、未新增 COS 命名空间事实。
- helper、ffmpeg 合成视频、本地 overlay/staging、远端脚本/overlay/候选目录均已删除。

## 交接

- remaining_gap: BACK 需将 `screen_text_attempts.model`（及同一 descriptor 快照的对应持久化列）与共享合同统一到至少 160，并补 Worker attempt INSERT/完整 repository→Worker 回归；SERVER 不再追加局部补丁。
- next_owner: BACK
- files: `docs/deployment/LOCAL-OCR-SERVER-06D-RESULT.md`
- residual: 0（仅保留已应用迁移与既有 05G-R4 运行状态；无 06D fixture）。
- requires_user: false
