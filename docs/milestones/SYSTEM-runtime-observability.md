# SYSTEM-06 服务器、Worker 与运行日志纵向切片

状态：用户已确认推荐范围；规划启动包 v1  
日期：2026-08-17  
职责：系统控制台服务器与运行环境；日志与质量  
衔接：`INT-11`、`INT-12`、`INT-13`、`INT-15`、`INT-17`

## 1. 目标与成功标准

管理员需要从系统总览继续下钻，回答四类问题：哪个环境或执行池异常、哪些任务正在排队或运行、一次请求实际经过了哪个版本与 Worker、故障是否已经恢复。首切片只建立可验证的只读诊断链，不新建第二套运行控制状态。

成功标准：

1. `/servers` 能按环境查看应用、Worker、数据库和对象存储摘要；CPU/GPU/内存/磁盘等没有权威遥测时明确显示“未接入”或“未知”。
2. `/logs` 能从 PostgreSQL 领域事实发现 ASR、OCR、交付及控制面运行记录，并按 requestId、项目、能力、状态和时间服务端检索。
3. 任一日志可追溯到任务、Attempt、引擎部署版本、路由版本、人民币用量/待对账和脱敏错误；不返回正文、热词全文、对象键、Secret 或供应商原始载荷。
4. 所有调控继续使用既有 `/engines`、`/routing`、`/budgets` 和领域取消/重试命令；本切片不创建“另一个暂停开关”。
5. 正式 React、Fastify、精确隔离 PostgreSQL、1440/1024 和两站权限隔离通过纵向验收。

## 2. 页面、入口与下游路径

### `/servers` 服务器与运行环境

- 从系统总览资源池、异常项或左侧导航进入。
- 环境摘要：本地开发、内部测试、未来生产；不存在的环境显示未配置，不伪造服务器。
- 资源分层：环境 → 应用/Worker/数据库/对象存储。每项显示稳定资源 ID、类型、健康、数据新鲜度和权威来源状态。
- PostgreSQL 可直接投影各资源池排队、运行、失败、需对账、当前 lease owner 摘要、最近吞吐和固定配置版本。
- CPU、GPU、显存、内存、磁盘、数据库连接、存储容量和备份只从可注入 `RuntimeTelemetryProvider` 读取；Provider 未配置、超时或部分缺失时逐字段为 unknown，不回退静态常量。
- 操作只提供“查看运行日志”和跳转现有引擎、路由、预算页面；不提供 SSH、Web Terminal、任意命令、购买、扩缩容、删除、数据库恢复或对象清理。

### `/logs` 日志与质量

- 从总览异常、服务器资源详情、任务详情或左侧导航进入；URL 查询参数保留 requestId、项目、能力、状态和时间范围。
- 表格支持服务端搜索、筛选、排序和稳定分页；默认按有效更新时间降序、稳定 ID 降序。
- 详情显示领域、项目/任务/Job/Attempt 身份、requestId、供应商请求标识、引擎/路由/预算/换算版本、开始/完成时间、耗时、状态、质量摘要、人民币金额、原币审计摘要与待对账状态。
- 错误只显示稳定业务码、脱敏原因、retryable/需对账事实和恢复跳转；不把通用 500 当业务原因，也不回显 SQL、连接串或原始供应商载荷。
- 首版允许浏览和脱敏导出预览，不实现文件导出命令；真正导出另立任务并增加审计/保留策略。

## 3. 唯一数据所有者

| 数据 | 权威所有者 | SYSTEM-06 行为 |
| --- | --- | --- |
| Job/Attempt/Usage/请求标识/版本绑定 | 各领域 PostgreSQL 表 | 只读 `UNION ALL` 投影；不复制成第二张运行日志表 |
| 队列深度、运行中、租约、需对账 | 各领域 Job/Attempt 状态 | 服务端有界聚合；浏览器不得推算 |
| 路由、引擎、预算、换算版本 | 现有 system-control PostgreSQL 事实 | 日志只读展示稳定 ID，并深链现有页面 |
| CPU/GPU/内存/磁盘/备份 | `RuntimeTelemetryProvider` 摘要 | Provider 可注入；缺失为 unknown，不写业务数据库 |
| 服务器和 Worker 显示身份 | Provider 返回的稳定、受控资源目录 | 不接受浏览器自报资源；默认空目录/未配置 |

首切片不新增业务 bootstrap 行。若运行目录需要持久配置，必须由后续独立配置版本任务创建；当前迁移只允许必要索引或只读投影支持，不创建虚构服务器或 active 资源。

## 4. 正式读取 API

后端任务负责在共享契约中最终命名；语义固定如下：

- `GET /api/system-control/runtime/overview?environment=...`
- `GET /api/system-control/runtime/resources?environment=&kind=&health=&search=&sort=&limit=&offset=`
- `GET /api/system-control/runtime/resources/:runtimeResourceId`
- `GET /api/system-control/operations?environment=&domain=&projectId=&status=&search=&from=&to=&sort=&limit=&offset=`
- `GET /api/system-control/operations/:operationId`

运行读取要求 `system-control` audience 加 `system-control:runtime:read`；日志读取要求 `system-control:logs:read`。匿名、员工 audience 或缺能力主体均为 403。同一 Fastify 实例必须支持逐请求身份隔离。

列表均返回真实 `total`，空 offset 页仍保留筛选后总数。非法筛选、日期、排序和分页稳定 400。未知资源稳定 404。PostgreSQL 查询失败返回带 requestId 的可重试 500；页面保留最近成功事实并标 stale，唯一恢复只重读原查询。

## 5. 失效、恢复和状态语义

- Provider 未配置：HTTP 200，telemetry status=`not_configured`；PostgreSQL 领域运行事实仍可读取。
- Provider 暂时失败：HTTP 200，telemetry status=`unknown`、带观测时间和脱敏原因码；不能把旧指标冒充当前值。
- PostgreSQL 失败：正式 500/requestId/retryable；页面保留最近成功事实并显示 stale。
- 查询身份变化：搜索、筛选、环境、排序、分页变化后清除失效选择和旧详情；迟到响应不得覆盖新身份。
- 自动刷新：仅重读当前查询；关闭自动刷新后不产生后台请求。恢复成功聚焦页面标题或当前详情标题。
- 历史 Job/Attempt 的版本身份不可改；配置换版只影响新任务，日志详情不得用当前版本覆盖历史版本。

## 6. 切片任务与文件所有权

1. `UI-SYSTEM-06 Rev1`：同时冻结 `/servers` 与 `/logs` 的信息架构、状态、1440/1024 和交互；只改 `DESIGN.md`、`docs/ui/` 和仓库外原型/证据。
2. `BACK-SYSTEM-06A Rev1`：运行资源/遥测 Provider/运行汇总只读契约与 API；允许改 `packages/contracts/src/system-control*.ts`、`backend/src/modules/system-control/`、必要 app/server 注入、必要迁移和后端测试。
3. `BACK-SYSTEM-06B Rev1`：在 A 关闭后补统一运行记录列表/详情；复用同一权限和查询原语，不与 A 并行修改 system-control 文件。
4. `FRONT-SYSTEM-06C Rev1`：等待 UI 与 A/B 均通过后实现两个正式页面；只改 `system-frontend/` 和对应前端测试。
5. `TEST-SYSTEM-06 Rev1`：正式 React + Fastify + 精确隔离 PostgreSQL + 受控遥测 Provider 完整纵向验收。

UI 与 BACK-SYSTEM-06A 文件不重叠，可受控并行；其余严格串行。任何角色不得恢复未启用导航的静态示例数据。

## 7. 验收矩阵

- 权限：匿名、员工、缺能力、runtime-only、logs-only 和 owner 交错请求。
- 运行：未配置、空、正常、部分未知、Provider 失败、PostgreSQL 失败、再次失败和恢复。
- 日志：四领域、搜索、组合筛选、三种排序、跨分页、空页真实 total、详情与深链。
- 安全：返回和前端 DOM 中无 Secret、对象键、完整字幕/热词/提示词、连接串、SQL 或供应商原始载荷。
- 一致性：相同 Attempt 在领域 API、总览、服务器详情和日志详情的状态、版本、requestId、CNY/待对账事实一致。
- 浏览器：1440/1024 根无横溢，宽表只在容器内横滚；loading/empty/error/stale/unknown/再次失败/恢复、焦点与自动刷新均通过。
- 关闭门：定向测试、两站构建、`check:repo`、`git diff --check`、空库迁移和唯一一次完整 `pnpm check`。

## 8. 非目标与授权门

- 不接真实服务器 Agent、Grafana、Coolify、Portainer、云厂商、SSH 或 Web Terminal。
- 不购买、部署、扩缩容、重启主机、修改防火墙、恢复数据库、删除对象或执行任意命令。
- 不修改员工业务状态，不新建任务中心，不把员工取消/重试复制到控制台。
- 不接真实供应商、Secret、汇率网络或付费调用；这些仍需单独授权。
