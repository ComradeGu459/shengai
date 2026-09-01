# LOCAL-OCR-SERVER-06O-R1

## outcome

`blocked`

## evidence

- 关联范围：06M 的精确时间窗 2026-08-28 05:45–05:52（Asia/Shanghai），同一 project/batch 的两个 batch detail 500；本轮未重放 GET。
- 从既有 `/var/log/qimao-terms-cloud/backend.log` 只读取得两个 detail 请求的白名单 requestId，并以该白名单查询 `journalctl -u qimao-backend.service`；未输出 requestId。
- journald 查询命令成功（exit 0），精确窗口返回 `journalEventCount=0`；因此没有同 requestId 可关联的 `screen-text request failed` 记录。
- 结合 06O 已确认的 `backend.log` 与 `backend.error.log`：两条请求记录存在，但同 requestId 的 `msg = "screen-text request failed"` 为 0，当前三条保留链均未提供结构化错误。
- `error_type`: unavailable。
- `error_message`: unavailable。
- `first_project_stack_frame`: unavailable。
- `postgres_code`: unavailable；`postgres_column`: unavailable；`postgres_constraint`: unavailable。
- 结论仅限当前保留源：该错误链未持久化到 backend 文件日志或 `qimao-backend.service` journald，不能据此猜测根因。源码 `backend/src/modules/screen-text/screen-text.routes.ts:78` 仅是错误日志发出位置，不是已证实的根因位置。

## remaining_gap

唯一缺证：两个 detail 500 对应 requestId 的结构化 `screen-text request failed` 事件未在文件日志或 journald 保留源中出现，因此无法确定 error type/message、首个项目栈帧或 PostgreSQL 字段。

## next_owner

BACK/运维在规划授权后执行一次受控只读 GET，最小条件如下：

1. 先在 backend.log、backend.error.log 与 journald 上建立短时、受保护的时间窗捕获；不保存响应正文、Cookie、Secret、对象键。
2. 使用现有已授权员工会话，只请求一次精确 batch detail GET；禁止并发、刷新、重试或其他业务请求。
3. 以该次请求产生的 requestId 做白名单关联，立即停止捕获，只回传本报告允许的 error type/message、首个项目栈帧与 PostgreSQL code/column/constraint。

SERVER 不执行该 GET，不改变代码、DB、COS、route、budget、服务状态或 fixture。

## files

- `docs/deployment/LOCAL-OCR-SERVER-06O-R1-RESULT.md`
- `docs/deployment/LOCAL-OCR-SERVER-06O-AUDIT-RESULT.md`
- `/var/log/qimao-terms-cloud/backend.log`（只读）
- `/var/log/qimao-terms-cloud/backend.error.log`（只读）
- `journalctl -u qimao-backend.service`（只读，精确窗口）
- `backend/src/modules/screen-text/screen-text.routes.ts:78`（日志发出位置）

## residual

- 未修改代码、DB、COS、route、budget 或配置；未调用业务 API/OCR/COS；未重启服务；未清理 06K fixture。
- 本轮仅创建并使用临时只读解析脚本；远端与本地临时脚本均已精确移除。

## requires_user

`true`：需要规划授权后由 BACK/运维完成上述一次受控只读 GET 与日志捕获；在补证前不得声称已确定根因。
