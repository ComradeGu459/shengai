# M3 统一任务中心契约

状态：用户已授权规划统筹完成至真实厂商接入前。本文件冻结员工站统一任务中心的产品边界、唯一数据源、跨领域投影和实施顺序；UI、后端、前端与测试必须共同遵守。

## 1. 目标与唯一入口

统一任务中心是员工 `AppShell` 中“作业”分组的唯一全局运行入口，正式路由为 `/tasks`。它用于跨项目观察和恢复真正的后台执行事实，不是第二个项目工作台，也不是管理员 ControlShell。

首版覆盖：

1. ASR 多项目 Dispatch；
2. 不属于 Dispatch 的单项目 ASR Batch；
3. 画面字 OCR Batch；
4. 术语提取 Run；
5. 前置审改准备 Job；
6. 交付生成 Job。

独立“中文识别任务”全局导航与 `/asr-dispatches` 页面在正式前端接入本中心时删除，不保留第二套员工入口、兼容页或长期重定向。ASR 项目工作台和项目中心多剧发起入口继续存在；其全局恢复详情进入 `/tasks`。

上传会话继续只属于“上传任务”，管理员策略优化、连接测试、预算、Secret 与服务器任务继续只属于 ControlShell，均不进入员工任务中心。

## 2. 唯一状态源与禁止项

任务中心不创建通用 `tasks`、`task_attempts` 或复制状态表。PostgreSQL 各领域现有记录仍是唯一权威：

- ASR：`asr_dispatch_groups`、未被 Dispatch 引用的 `asr_batches`、其 Job/Attempt/Usage；
- 画面字：`screen_text_batches`、Job/Attempt/Usage；
- 术语：`term_extraction_runs`；
- 前置审改：`pre_edit_prepare_jobs` 与所属 Session；
- 交付：`delivery_products`、`delivery_jobs`、`delivery_attempts`。

`backend/src/modules/tasks/` 只实现有界只读投影与权限边界，不拥有 Worker、租约、队列、重试策略或业务状态。消息队列只负责唤醒，浏览器缓存只负责展示。

禁止：

- 为统一页面复制领域状态或新增第二套命令记录；
- 用假百分比、浏览器计时或前端推算补齐未知进度；
- 从任务中心编辑字幕、术语候选、OCR 候选或交付文件；
- 暴露供应商、模型私参、Secret、对象键、提示词全文、内部地址或原始载荷；
- 把上传、管理员任务或人工工作台混入本页。

## 3. 规范任务身份

任务身份固定为 `taskType + resourceId`，不再生成一枚脱离领域记录的通用 UUID。`taskType` 首版枚举：

- `asr_dispatch`
- `asr_batch`
- `screen_text_batch`
- `term_extraction`
- `pre_review_preparation`
- `delivery_generation`

Dispatch 已引用的 ASR Batch 只作为 Dispatch 详情中的项目子项，不再重复成为列表行；未被任何 Dispatch 引用的 ASR Batch 才单独进入列表。每条记录必须返回稳定 `projectId/projectName` 或多项目摘要、领域资源 ID、创建/更新时间和可恢复详情身份。

## 4. 统一状态与原始状态

列表使用以下员工可理解的规范状态，同时保留 `nativeStatus` 供详情忠实解释：

- `queued`：排队或等待 Worker；
- `running`：已租用或执行中；
- `waiting_review`：机器执行已结束，等待人工工作台处理；
- `completed`：执行成功或交付 ready；
- `failed`：明确失败；
- `cancel_requested`：取消已受理但尚未终结；
- `cancelled`：已取消；
- `reconciliation_required`：外部结果未知，必须先对账；
- `stale`：来源变化，只读；
- `unknown`：当前无法确认结果，但不得补写失败或成功。

同一原始状态到规范状态的映射由后端单一实现并写入共享契约测试；前端不得再次维护一套映射。任务中心的状态不会反写领域表。

## 5. 列表、搜索与分页

`GET /api/tasks` 必须由 PostgreSQL 侧完成有界聚合，支持：

- `search`：项目名、员工可见任务短号；
- `taskType`；
- `status`；
- `projectId`；
- `sortBy=updatedAt|createdAt|attentionPriority`；
- `sortDirection=asc|desc`；
- `limit/offset` 与真实 `total`。

排序必须有稳定 `taskType/resourceId` tie-break；分页之间不得重复或漏项。不能在 Node 中读取全历史再筛选、排序或分页。默认按需处理优先、更新时间倒序。

## 6. 列表投影

每条 `TaskSummary` 至少包含：

- `taskType/resourceId`；
- 员工可见短号和任务名称；
- 项目或多项目摘要；
- `status/nativeStatus`；
- 真实进度：仅允许 `completedCount/totalCount`、明确阶段文字或 `null`；
- 最近失败的安全错误码、员工可理解原因和 `requestId`，无事实时为 `null`；
- `createdAt/updatedAt`；
- `availableActions`；
- 所属工作台的规范返回位置。

费用、供应商、模型、部署、并发、租约 owner 与内部 Worker 标识不进入员工响应。人民币成本继续只在有权威 CNY 事实且产品另行要求时展示；本中心首版不显示费用。

## 7. 详情与历史

`GET /api/tasks/:taskType/:resourceId` 返回统一外壳与领域安全详情：

- 当前规范状态、原始状态和状态说明；
- 项目/范围/集数或多项目子项；
- 有界 Attempt/阶段历史，最新优先且保留真实时间；
- 失败原因、requestId、是否可重试/需对账；
- 来源版本的员工摘要；
- 允许动作和返回工作台入口。

ASR Dispatch 详情完整承接现有多项目子结果、部分接受、取消和未知创建恢复；统一中心接入后，旧全局页面不再保留。详情加载、失败、再次失败和恢复只读取同一 `taskType/resourceId`。

## 8. 运行控制与恢复

任务中心不新增通用写状态机。允许动作只调用领域既有命令：

- ASR Dispatch/Batch、画面字 Batch：明确允许时取消；
- ASR/画面字失败子集：进入对应工作台，以领域既有范围确认和重试命令执行；
- 前置审改准备失败：进入同一 Session 的既有“重新准备”；
- 交付生成失败：调用同一 `deliveryId` 的既有 recover；
- 术语提取失败：进入术语工作台，由用户创建新的提取 Run；没有虚构的原 Run 重试。

前端为一次写动作冻结领域 body、稳定 ID 和 `Idempotency-Key`。网络未知或 `retryable=true` 后只读取同一领域资源/命令身份，不自动重发 POST；确定性冲突清除旧意图、刷新权威任务事实，下一次显式动作使用新身份。任务中心详情 GET 自身不得产生写副作用。

## 9. 页面结构与交互

正式方向为成熟紧凑的数据表，不使用卡片墙：

1. 页首摘要只显示“需处理、运行中、排队、失败/待对账”四组真实数量；
2. 工具条提供服务端搜索、任务类型、状态、项目和排序；
3. 主表列为任务、项目、状态、进度、最近结果、更新时间、操作；
4. 点击任务打开同页详情抽屉，复杂人工处理跳回所属项目工作台；
5. 已完成历史可筛选查阅，不默认占据首屏注意力。

1440 使用展开侧栏；1024 默认收起为 72px，覆盖展开不得挤压正文。宽表只在自身容器横滚，根页面无横溢。加载、空数据、失败、stale、再次失败、恢复成功、提交中和真实长文本均必须验收。

Modal/Drawer 采用安全初始焦点、Tab/Shift+Tab 双向闭环、Escape/遮罩回触发点；提交中锁关闭和重复提交；失败聚焦唯一恢复，成功聚焦页面或抽屉标题。后台任务更新不得抢活动 Modal/Drawer 焦点。

## 10. 权限与项目隔离

首版沿员工业务 API 权限域。列表和详情必须逐请求校验员工身份及项目可见性；多项目 Dispatch 只返回调用者有权看到的项目事实，不能通过总数、搜索或错误详情泄露其他项目。未知 `taskType/resourceId`、无权访问和跨项目资源统一使用安全 404/403 边界，不返回内部表名、对象键或正文。

管理员 ControlShell 继续使用独立 audience 与 system-control API；员工 bundle、路由和导航不得包含管理员入口。

## 11. API 与实现边界

新增共享文件建议为 `packages/contracts/src/tasks.ts`，新增后端目录为 `backend/src/modules/tasks/`，新增前端目录为 `frontend/src/features/tasks/`。首版不需要迁移；若实现发现必须新增持久状态，后端必须停止并退回规划，不得自行创建通用任务表。

既有领域 API、Job/Attempt 表和 Worker 状态机保持权威。后端可以用有界 `UNION ALL`/CTE 投影列表和按类型分派详情查询，但不能把全历史载入内存。所有 SQL 必须参数化并有稳定分页；读取前后领域命令、Job、Attempt 和人工事件计数不变。

## 12. 任务拆分

- `PLAN-M3-08`：本文、DESIGN、职责矩阵、INT-09 与里程碑；完成后关闭。
- `UI-M3-08 Rev1`：在既有 AppShell 冻结 `/tasks` 列表、详情、动作确认、状态/焦点/双视口；不得改生产代码或伪造生产 API。
- `BACK-M3-08A Rev1`：共享只读契约和有界 PostgreSQL 聚合；复用领域命令，不新建通用任务表/Worker/迁移。
- `FRONT-M3-08B Rev1`：等待 UI 与后端分别通过规划审核后，实现正式 React，删除独立中文识别任务入口和旧 `/asr-dispatches` 页面路径。
- `TEST-M3-08 Rev1`：正式 React + Fastify + 精确隔离 PostgreSQL 全链，最后运行唯一完整 `pnpm check`。

UI 与后端在本文冻结后可并行；前端不得在共享契约或核心 UI 未通过前猜字段，测试不得在正式前端前冒充产品完成。

## 13. 关闭门

M3-08 关闭至少证明：

1. 六类任务在一张真实服务端分页表中可发现，Dispatch 子批次不重复计数；
2. 项目 A/B 来回切换、搜索、筛选、排序和分页无串数据；
3. 排队、运行、待人工、完成、失败、取消中、已取消、需对账、stale 与 unknown 映射忠实；
4. 取消、失败恢复和工作台跳转只使用领域既有命令/身份，未知结果不重复 POST；
5. 刷新或重启后从 PostgreSQL 恢复同一任务与历史；
6. `/asr-dispatches` 与独立导航已删除，ASR 全局恢复只存在于 `/tasks`；
7. 上传任务、管理员任务、人工字幕/术语/OCR 编辑均未混入；
8. 1440/1024、键盘焦点、loading/empty/error/stale/再次失败/恢复成功、控制台门通过；
9. 读取 API 零写副作用，完整 `pnpm check` 通过，无临时数据库/服务/浏览器进程残留。
