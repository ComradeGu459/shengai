# M2 项目与上传生命周期契约

状态：M2.0 基线。具体字段可在实现前细化，但状态含义、数据所有权和幂等边界不得被页面私自改变。

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

### UploadPart

`upload_session_id`、`part_number`、`size_bytes`、`etag`、`checksum_value`、`confirmed_at`。分片号在同一会话内唯一。

### CleanupJob

`id`、`project_id`、`status`、`attempt_count`、`lease_expires_at`、`next_attempt_at`、`last_error`、`created_at`、`completed_at`。

## HTTP API 草案

所有命令接口接收 `Idempotency-Key`；所有响应包含稳定请求标识。版本冲突返回明确的冲突错误，不允许最后写入静默覆盖。

| 方法与路径 | 作用 |
| --- | --- |
| `POST /api/projects` | 创建项目 |
| `GET /api/projects` | 按生命周期、状态和搜索词查询项目 |
| `GET /api/projects/{projectId}` | 返回项目与素材摘要 |
| `POST /api/projects/{projectId}/uploads` | 创建上传会话并返回分片策略 |
| `GET /api/uploads/{uploadId}` | 返回服务端已确认分片与会话状态 |
| `POST /api/uploads/{uploadId}/parts/authorize` | 为指定缺失分片签发短时授权 |
| `POST /api/uploads/{uploadId}/parts/confirm` | 记录对象存储确认信息；不得接收文件字节 |
| `POST /api/uploads/{uploadId}/complete` | 幂等合并并进入校验 |
| `POST /api/uploads/{uploadId}/abort` | 取消会话并安排分片清理 |
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

## 并发、恢复与安全边界

- 每文件并行分片数、全浏览器并行分片数、会话有效期、分片大小和项目配额统一配置。
- 完成、取消、回收、恢复和清理命令必须幂等。
- 服务端生成不可猜测对象键；原文件名只作为经过清理的展示元数据。
- 短时授权限定对象键、操作、分片和有效期；浏览器不持有长期云密钥。
- 文件扩展名、媒体类型探测、大小与业务允许类型均需校验，不能只相信浏览器 `Content-Type`。
- M2 默认不接受压缩包；若以后需要压缩包，必须另做解压上限、路径穿越和压缩炸弹防护。
- 对象存储配置未完成分片自动终止规则；后端另做数据库会话与对象存储孤儿核对。

## 删除与恢复顺序

1. 回收操作只修改 PostgreSQL 生命周期并记录到期时间，不立即删除对象。
2. 恢复操作采用版本条件更新；`purging` 后禁止恢复。
3. 到期 Worker 以租约领取任务，把状态改为 `purging`。
4. 对象删除可重复执行；对象已经不存在视为可继续，但必须记录核对结果。
5. 所有对象处理完成后写入最小审计墓碑并标记 `purged`。
6. 任一步骤失败时保留 `purging` 和失败原因，由有界重试或人工处理继续，禁止伪装成功。
