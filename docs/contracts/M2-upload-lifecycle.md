# M2 项目与上传生命周期契约

状态：M2.1 规划确认基线。具体字段可在实现前细化，但状态含义、数据所有权和幂等边界不得被页面私自改变。

模块归属、任务范围与允许目录同时受 `docs/contracts/MODULE_RESPONSIBILITY_MATRIX.md` 约束。本契约中的 `asr_video`、`screen_video` 只是素材角色，不表示上传模块拥有 ASR 或 OCR 处理能力。

## 数据所有权

| 数据 | 权威来源 | 说明 |
| --- | --- | --- |
| 项目、素材、上传会话、清理任务 | PostgreSQL | 后端唯一业务状态源 |
| 文件字节、分片和最终对象 | 对象存储 | 数据库只保存对象键、大小、校验值和元数据 |
| 当前选择文件、未提交筛选、暂停开关 | 浏览器 | 可使用 IndexedDB 保存恢复提示，但不决定服务端完成状态 |
| 到期清理和孤儿核对 | 后端 Worker | 同一代码库的独立运行入口，可重试且无内存状态依赖 |

M2 不要求外部消息队列。若定时扫描足以满足 10 人以内的负载，先使用数据库任务状态和有界 Worker；未来确有扩缩容证据时再接队列。

## 项目状态

项目使用两个相互独立的状态字段。

### `workflow_status`

- `draft`：项目已创建，尚无完成校验的素材。
- `uploading`：至少存在进行中的上传会话。
- `verifying`：文件已提交完成，后端正在校验。
- `ready`：当前必需素材均已校验，可供后续模块使用。
- `blocked`：存在需要用户处理的素材问题；必须提供原因。

状态由后端按最新已确认清单和服务端上传事实确定，前端不得按进度百分比猜测。归约优先级是 `blocked` → `verifying` → `uploading` → `ready` → `draft`：必需绑定存在选错文件、指纹不符、失败/过期后需重新选择、清单版本变化等可操作问题时为 `blocked`；没有阻断但有完成或校验中的会话时为 `verifying`；没有前两者但有活动上传会话时为 `uploading`；最新清单所有必需角色和所有已明确选择的可选角色均绑定已校验 Asset 时为 `ready`；其余为 `draft`。`screen_video` 明确留空不阻断 `ready`。

### `lifecycle_status`

- `active`：正常可用。
- `recycled`：已进入回收站，保存 `recycle_expires_at`，业务处理入口禁用。
- `purging`：后台正在删除对象与相关元数据引用，不允许恢复。
- `purged`：清理完成，只保留最小审计墓碑；普通列表不再返回。

禁止把 `recycled` 填入 `workflow_status`，也禁止仅靠对象是否存在推断项目生命周期。

## 上传会话状态

- `created`：服务端已建立会话，尚无确认分片。
- `uploading`：至少一个分片已确认，仍可申请缺失分片授权。
- `completing`：正在向对象存储提交分片清单；重复完成使用同一幂等结果。
- `verifying`：对象已形成，正在校验大小、校验值和元数据。
- `completed`：验证通过并已绑定唯一素材记录。
- `failed`：可恢复或需重建会话，必须返回稳定错误码与用户操作建议。
- `aborted`：用户或后端明确取消，不得继续完成。
- `expired`：超过会话有效期；后端拒绝新授权，并安排未完成分片清理。

“暂停”不是服务端状态。暂停只表示当前浏览器不再发起新分片，服务端会话仍是 `created` 或 `uploading`，直到继续、取消或过期。

## 核心实体最小字段

### Project

`id`、`name`、`workflow_status`、`lifecycle_status`、`recycle_expires_at`、`version`、`created_at`、`updated_at`、`created_by`、`updated_by`。

M2 没有账号系统时，操作者字段允许保存受控环境中的匿名会话标识或 `system`，但字段不得删除。

### Asset

`id`、`project_id`、`object_key`、`original_filename`、`media_kind`、`size_bytes`、`checksum_algorithm`、`checksum_value`、`verified_at`、`created_at`。

### UploadSession

`id`、`project_id`、`object_key`、`status`、`size_bytes`、`part_size_bytes`、`storage_upload_id`、`file_fingerprint`、`idempotency_key`、`expires_at`、`error_code`、`error_detail`、`version`、时间字段。

浏览器文件指纹只用于防止用户续传时选错文件，不能替代服务端对象校验。

### UploadBatchProjection

用户可以一次选择多个素材文件或一个素材文件夹，但 M2 不新增拥有独立生命周期的“批次”实体。前端按项目与最新清单版本把多个 `UploadSession` 组成只读批次投影：每个唯一物理文件一个会话、独立状态、独立错误和独立恢复；同集 `asr_video` 与 `screen_video` 共享同一 MP4 时只建立一个会话并携带两个绑定目标。

批次总进度、待处理数和失败数只能从后端会话事实汇总。批量取消或继续是对选中会话逐项执行既有动作，不得用一个浏览器批次状态覆盖单文件服务端状态；单文件失败不得阻塞其他会话继续推进。

### UploadPart

`upload_session_id`、`part_number`、`size_bytes`、`etag`、`checksum_value`、`confirmed_at`。分片号在同一会话内唯一。

### MaterialManifest

`id`、`project_id`、`version`、`root_name`、`confirmed_at`、`created_by`。同一项目版本单调递增；最新已确认版本是项目素材角色绑定的唯一权威来源，浏览器扫描与人工调整在确认前只属于草稿。

### MaterialManifestBinding

`manifest_id`、`episode_number`、`role`、`relative_path`、`file_name`、`size_bytes`、`last_modified_ms`、`fingerprint`、`media_type`。`episode_number` 只允许 1–100 的整数；每版清单内同一集同一角色唯一。`company_srt` 与 `asr_video` 每集必需，`screen_video` 可明确留空。同一物理 MP4 只允许在同一集的 `asr_video` 与 `screen_video` 两个角色间共享；这种共享只上传、校验一次并绑定同一个 Asset。公司 SRT、跨集复用或其他跨类型重复占用仍禁止。

相对路径必须位于本次确认的 `root_name` 下，不得是绝对路径、包含空段、`.` 或 `..`，且末段必须与 `file_name` 一致。浏览器指纹只由相对路径、大小和修改时间组成，用于本切片的本地选择一致性，不代表服务端已经取得或校验文件字节。

### MaterialAssetBinding

`manifest_id`、`episode_number`、`role`、`asset_id`、`source_fingerprint`、`bound_at`。每个清单版本、集数和角色至多一个绑定；绑定必须指向同项目且已经完成服务端校验的 Asset。新清单版本必须重新计算当前绑定；文件身份一致时可以复用项目内既有已校验 Asset，不要求重复上传。同集 `asr_video` 与 `screen_video` 可以指向同一 Asset，除此之外不得用一个 Asset 满足多个清单槽位。

### MaterialManifestCommand

`project_id`、`idempotency_key`、`request_hash`、`manifest_id`、时间字段。同一项目同一幂等键的语义等价确认请求重放首次结果；同键异请求返回稳定冲突。请求摘要使用规范化字段和确定性对象键顺序，不受 JSON 属性顺序影响。

### CleanupJob

`id`、`project_id`、`status`、`attempt_count`、`lease_expires_at`、`next_attempt_at`、`last_error`、`created_at`、`completed_at`。

## HTTP API 草案

所有命令接口接收 `Idempotency-Key`；所有响应包含稳定请求标识。版本冲突返回明确的冲突错误，不允许最后写入静默覆盖。

| 方法与路径 | 作用 |
| --- | --- |
| `POST /api/projects` | 创建项目 |
| `GET /api/projects` | 按生命周期、状态和搜索词查询项目 |
| `GET /api/projects/{projectId}` | 返回项目与素材摘要 |
| `GET /api/projects/{projectId}/material-manifest` | 返回项目与最新已确认素材清单；尚未确认时 `manifest` 为 `null` |
| `POST /api/projects/{projectId}/material-manifests/confirm` | 以 `expectedVersion` 和 `Idempotency-Key` 显式确认新的元数据清单版本；不接收文件字节 |
| `POST /api/projects/{projectId}/uploads` | 创建上传会话并返回分片策略 |
| `GET /api/uploads/{uploadId}` | 返回服务端已确认分片与会话状态 |
| `POST /api/uploads/{uploadId}/parts/authorize` | 为指定缺失分片签发可续期短时授权；不要求幂等键 |
| `POST /api/uploads/{uploadId}/parts/confirm` | 使用 `Idempotency-Key` 记录对象存储确认信息；不得接收文件字节 |
| `POST /api/uploads/{uploadId}/complete` | 先持久化完成意图，再幂等合并、核对对象并落账 |
| `POST /api/uploads/{uploadId}/abort` | 先把会话置为取消终态，再可重试清理未完成分片 |
| `POST /api/projects/{projectId}/recycle` | 移入回收站并设置到期时间 |
| `POST /api/projects/{projectId}/restore` | 在到期且未进入清理前恢复 |

永久清理由内部 Worker 触发，不提供普通页面可直接调用的立即物理删除接口。

## 错误结构

```json
{
  "error": {
    "code": "UPLOAD_SESSION_EXPIRED",
    "message": "上传会话已过期，请重新创建上传任务。",
    "retryable": false,
    "action": "restart_upload",
    "requestId": "anonymous-example"
  }
}
```

稳定错误码至少区分：授权过期、会话过期、文件指纹不符、分片缺失、对象不存在、大小不符、校验失败、版本冲突、项目已回收、项目正在清理和临时存储故障。

`DEV-M2-03` 已落地的上传协议稳定错误码包括：`UPLOAD_FILE_TYPE_INVALID`、`UPLOAD_FILE_SIZE_INVALID`、`FILE_FINGERPRINT_MISMATCH`、`UPLOAD_SESSION_EXPIRED`、`UPLOAD_PART_INVALID`、`UPLOAD_PART_ALREADY_CONFIRMED`、`UPLOAD_PART_SIZE_MISMATCH`、`UPLOAD_PART_STORAGE_MISMATCH`、`UPLOAD_PART_CONFIRM_CONFLICT`、`UPLOAD_PARTS_MISSING`、`STORAGE_OBJECT_NOT_FOUND`、`UPLOAD_SIZE_MISMATCH`、`UPLOAD_CHECKSUM_MISMATCH`、`UPLOAD_VERSION_CONFLICT`、`UPLOAD_STATE_INVALID`、`STORAGE_TEMPORARY_FAILURE`、`PROJECT_NOT_ACTIVE` 和 `IDEMPOTENCY_KEY_REUSED`。错误响应必须同时给出是否可重试及下一动作；缺失分片错误附带有序 `missingPartNumbers`。

素材清单接口使用以下稳定边界：非法根目录、绝对/越界/错根相对路径、路径末段与文件名不一致、角色缺失、重复角色、重复占用、类型或指纹不匹配返回 `400 MATERIAL_MANIFEST_INVALID`；`expectedVersion` 不是最新版本返回 `409 MATERIAL_MANIFEST_VERSION_CONFLICT` 并要求重新读取最新清单；同一幂等键用于语义不同的确认请求返回 `409 IDEMPOTENCY_KEY_REUSED`。不存在的项目返回 `404 PROJECT_NOT_FOUND`，非 `active` 项目返回 `409 PROJECT_NOT_ACTIVE`。

## 并发、恢复与安全边界

- 每文件并行分片数、全浏览器并行分片数、会话有效期、分片大小和项目配额统一配置。
- 多文件选择不等于无限同时上传。前端调度器必须同时遵守每文件分片并行和全浏览器并行上限，在上限内公平推进多个会话；队列等待只属于浏览器调度显示，不新增服务端上传状态。
- 分片确认、完成、取消、回收、恢复和清理命令必须幂等；同键同请求稳定重放，同键异请求返回 `IDEMPOTENCY_KEY_REUSED`。短时分片授权可续期且不改变 PostgreSQL 业务状态，因此不强制使用幂等键。
- 分片确认必须在数据库锁内重读项目和会话；项目非 `active` 或会话处于完成中、终态、过期状态时拒绝写入，迟到确认不得把状态改回 `uploading`。
- 完成命令在调用对象存储前保存命令占位。若对象已经合并但最终数据库事务未完成，同一完成意图先核对对象，再补建唯一素材并转为 `completed`。
- 取消命令在数据库锁内先取得终态，再执行可重复的存储清理；完成和取消的并发结果由锁内先行命令唯一决定。
- 项目非 `active` 后拒绝新授权、分片确认和完成且不产生新的业务落账；取消清理仍可重复执行。
- 服务端生成不可猜测对象键；原文件名只作为经过清理的展示元数据。
- 短时授权限定对象键、操作、分片和有效期；浏览器不持有长期云密钥。
- 文件扩展名、媒体类型探测、大小与业务允许类型均需校验，不能只相信浏览器 `Content-Type`。
- M2 默认不接受压缩包；若以后需要压缩包，必须另做解压上限、路径穿越和压缩炸弹防护。
- 对象存储配置未完成分片自动终止规则；后端另做数据库会话与对象存储孤儿核对。

## 删除与恢复顺序

1. 回收操作以项目为单位修改 PostgreSQL 生命周期、记录 48 小时到期时间，并在并发边界内把全部未完成上传会话置为不可复活的终止状态；不立即删除已经完成并校验的对象。
2. 未完成上传的测试分片使用现有 Storage fake 可重复清理；清理失败不得把项目回收命令回滚为可继续上传，也必须留下可重试事实。
3. 恢复操作采用版本条件更新；`purging` 后禁止恢复。恢复时保留已完成 Asset、最新清单及其绑定，但不得复活回收时已经终止的上传会话；缺失素材需要员工重新选择原文件并新建上传任务。
4. 到期 Worker 以租约领取任务，把状态改为 `purging`。
5. 对象删除可重复执行；对象已经不存在视为可继续，但必须记录核对结果。
6. 所有对象处理完成后写入最小审计墓碑并标记 `purged`。
7. 任一步骤失败时保留 `purging` 和失败原因，由有界重试或人工处理继续，禁止伪装成功。

本切片只实现手动项目回收后的 48 小时恢复窗口。长期“正式交付后原始素材保留 48 小时，再进入 7 天可恢复期”属于交付产品库生命周期，不得混入本任务。
