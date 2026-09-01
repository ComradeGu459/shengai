# TEST-SYSTEM-03 Rev 1 独立纵向集成验收报告

## 结论

本轮在精确隔离 PostgreSQL `qimao_test_system_03_20260817`、正式 Fastify system-control routes 和正式 `system-frontend` build 上完成验收。P0/P1/P2/P3 均为 0，未创建 QA-SYSTEM-03 返工包；生产代码、迁移、contracts、DESIGN 均未修改。

原始库、共享默认库、员工业务数据和外部资源均未触碰。全部适配器为零网络 deterministic/stub，仅验证流程与状态机，不代表供应商识别准确率。

## 执行与基线

- 从空业务库执行 29 个迁移，全部成功；迁移前 engine/routing/active pointer 业务计数为 0。
- `tests/backend/system-control-engine.test.ts` 与 `tests/backend/system-control-routing.test.ts`：2 files、11/11 passed。
- `tests/backend/asr.test.ts` 与 `tests/backend/screen-text.test.ts`：2 files、27/27 passed，31.22s。
- `pnpm --filter @qimao-terms-cloud/system-frontend run build`：Vite 25 modules transformed，exit 0。
- 规划关闭门所需完整 `pnpm check` 本轮未重复运行。

## 验收矩阵摘要

### 权限与站点隔离

正式 Fastify 通过 `Authorization: Bearer <token>` 解析同一 app 的主体；不接受自造 capability header。匿名、employee audience、system-control 无 capability 逐请求返回 403；精确 read capability 对 engines/connection-tests 返回 200、对 routing 返回 403，routing-read 对 routing 返回 200、对 engines 返回 403，owner 返回 200。专项测试同时覆盖 engines write/test、routing write/publish/rollback 的逐请求拒绝与允许矩阵。

员工 `frontend/src` 未发现 `ControlShell`、`/api/system-control` 或管理入口符号；仅保留普通员工页的提示文案，不出现管理 API/入口。

### 引擎、不可变版本与 Secret

创建 deployment/version、provider/model/capability 伪造、未知 Secret reference、resolver unavailable、Secret inherit/replace/clear、版本分页和 immutable trigger 均通过。响应、command/audit 脱敏投影不含内部 reference、连接信息或原始 Secret；浏览器传入的伪造能力不会覆盖 Registry 快照。启停命令使用稳定 `statusCommandId`，幂等重放不产生第二状态；active 路由引用时停用被事务前硬阻断。

### 零网络连接测试与恢复

`queued → running → succeeded/failed/unknown`、同 `testRunId` GET、同幂等键重放、不同键冲突均通过。受控 probe 明确验证 failed；过期 lease 原子结算 unknown，Attempt 只终结一次且不重复 POST；重建 app 后同一 command/test 可只读恢复。连接测试不访问真实网络。

### 路由、影响检查、发布/回滚与并发

三池（`asr_api`、`ocr_api`、`ocr_self_hosted_worker`）策略草稿、testing、impact-check、approve、publish、rollback、active 唯一指针和审计事件均通过。无 primary 或 failed/unknown connection test 时产生稳定 hard block，approve/publish 被拒且业务任务计数为 0。稳定 `routingVersionId`、`releaseCommandId`、幂等键和同身份并发冲突均验证一成功一冲突、无第二 active/第二状态；命令 GET 可恢复。发布响应被视为未知时只 GET 同 command 身份，不重复 POST。

### 任务版本绑定与旧路径关闭门

ASR 与 ScreenText 正式创建路径专项通过：发布前任务固定旧 routing/deployment version，发布后新任务固定新版本，旧记录不被改写；移除 active pointer 时创建稳定返回 `ASR_ROUTING_NOT_ACTIVE` / `SCREEN_TEXT_ROUTING_NOT_ACTIVE`，且 batches/jobs/attempts 计数保持不变。专项静态门确认旧 `adapterDescriptor`、可选 routing fallback、`active?.routingVersionId`、`active?.deploymentVersionId` 调用路径为 0；不使用默认 Registry/bootstrap 旁路。

### 管理页面基本纵向集成

正式 build 由本地静态服务提供，API 请求经正式 Fastify，使用匿名测试身份 cookie。页面 `/engines`、`/routing`、`/changes` 均可读取并显示服务端事实，overview HTTP 200，4 resource pools、24 UTC 小时桶，响应不含 `secret`/`objectKey`/`connectionstring`。

| 视口 | 页面 | 根横溢出 | 额外指标 | console error/warn |
|---|---|---:|---|---:|
| 1440×900 | engines / routing / changes | 0 | 页面标题与服务端状态均出现 | 0/0 |
| 1024×768 | engines / routing / changes | 0 | engines 的 `.cp-table-wrap` `overflow-x:auto`，`scrollWidth=980`、`clientWidth=899`；窄屏可横向查看宽表 | 0/0 |

FIFO 179 完整 UI 矩阵及 FIFO 183 焦点微复验继续冻结引用；本轮仅做上述正式页面/API 基本集成确认。

## 清理与证据

- 服务端口 31920/31921 已停止；临时 server、shim、脚本和日志已删除。
- 隔离数据库已 `DROP DATABASE ... WITH (FORCE)`，随后 `pg_database` 查询计数为 0；共享默认 PostgreSQL 保持运行且未写入。
- 本轮未读取、导入或复制任何原始素材；未生成含台词、帧、业务名或文件字节的仓库/截图证据。
- 脱敏证据仅保留本报告及本轮状态/日志写回，不包含 Secret、路径、正文或 objectKey。

## 问题结论

未发现 P0 数据破坏、重复状态/重复任务、安全泄露、权限越界或可归因于产品的 P1/P2/P3 缺陷；不创建 QA-SYSTEM-03-* 返工编号。
