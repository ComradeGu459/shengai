# LOCAL-OCR-SERVER-06O-AUDIT

## outcome

`blocked`

## evidence

- 关联范围：06M 记录的 2026-08-28 05:45–05:52（Asia/Shanghai）员工页 screen-text 访问；目标为同一 project/batch 的两个 batch detail HTTP 500。未重放 API，未访问 DB/COS，未重启服务，未修改或清理 06K fixture。
- 只读解析 `/var/log/qimao-terms-cloud/backend.log` 与 `/var/log/qimao-terms-cloud/backend.error.log`：两个 detail 请求均能关联到各自的两条 backend 记录；同 requestId 的 `msg = "screen-text request failed"` 匹配数为 0；两份日志内该结构化消息总数为 0。
- `error_type`: unavailable（没有同 requestId 的结构化错误记录）。
- `error_message`: unavailable（没有同 requestId 的结构化错误记录）。
- `first_project_stack_frame`: unavailable（没有同 requestId 的结构化错误记录）。
- `postgres_code`: unavailable；`postgres_column`: unavailable；`postgres_constraint`: unavailable。
- 当前源码 `backend/src/modules/screen-text/screen-text.routes.ts:78` 仅确认了该错误的日志发出位置；在缺少错误记录时，不能据此推断实际根因字段或数据库原因。

## remaining_gap

唯一缺证：两个 batch detail 500 对应 requestId 的 `screen-text request failed` 结构化 backend error 未出现在当前 `backend.log` 或 `backend.error.log` 中，故无法确定 error type/message、首个项目栈帧或 PostgreSQL 字段，也无法锁定唯一根因。

## next_owner

BACK/运维：从受保护的同时间窗日志保留源（如未轮转的 journald/systemd 日志或集中式日志）补齐两个 requestId 对应的单条结构化 `screen-text request failed` 记录；补证后再由 BACK 锁定生产根因字段。当前 SERVER 不执行重放或服务变更。

## files

- `docs/deployment/LOCAL-OCR-SERVER-06O-AUDIT-RESULT.md`
- `docs/deployment/LOCAL-OCR-SERVER-06M-RESULT.md`
- `/var/log/qimao-terms-cloud/backend.log`（只读）
- `/var/log/qimao-terms-cloud/backend.error.log`（只读）
- `backend/src/modules/screen-text/screen-text.routes.ts:78`（仅日志发出位置）

## residual

- 未修改业务代码、DB、COS、route、budget 或配置；未调用业务 API/OCR/COS；未重启服务；未清理 06K fixture。
- 本轮仅使用临时只读解析脚本；脚本及其远端临时副本将在回执前精确移除，不触及任何业务数据。

## requires_user

`true`：需要具备日志保留源访问权限的 BACK/运维补齐上述唯一缺证；在此之前不得声称已确定根因。
