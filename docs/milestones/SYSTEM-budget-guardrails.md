# SYSTEM-04 · 预算、限额与付费调用安全门纵向切片

状态：规划已按用户 2026-08-17 的本地全权续接授权冻结；只允许零网络、零真实付费实现与验收。真实供应商、Secret、外部网络、云资源、部署和付费样本继续保留单独授权门。

## 1. 目标与成功标准

本切片在 SYSTEM-03 已关闭的引擎版本与路由版本之后，增加付费能力接入前的唯一预算安全门：

`不可变预算策略 → 历史用量回放/影响检查 → 发布或回滚 → 新付费 Attempt 固定策略 → 调用前预留 → 最终结算/待对账占用`

成功必须同时满足：

1. SYSTEM-04 已按环境、付费资源池和原始币种建立日/月提醒线与硬阻断线；用户后续确认全站统一人民币，生产切换规则以 `SYSTEM-cny-cost-normalization.md` 为准：新预算只使用 CNY，外币先由后端权威快照换算。
2. 预算策略采用不可变版本和唯一 active 指针；发布失败或结果未知时旧 active 不移动，回滚只追加历史和审计。
3. 只有 `asr_api / ocr_api` 的付费能力进入首版预算门。OCR 自建 Worker 与交付生成明确标记为本地/未纳入外部调用预算，不复制路由模块的并发和队列配置。
4. 付费能力在任何外部副作用前必须提供上限报价并创建持久预留；无 active 策略、无匹配币种规则、额度不足或报价不完整时稳定阻断，Job/Attempt 不得进入供应商调用。
5. 成功或已知最终失败按最终 Usage 结算；调用前取消释放预留；`unknown / reconciliation_required` 保留预留并计入占用，不能显示或结算为零。
6. 新 Attempt 固定 `budgetPolicyVersionId / reservationId / quoteDigest`；策略换版只影响新 Attempt，不改写历史用量、请求或对账状态。
7. 全链只用已登记的零网络 cloud stub 证明预留、结算、硬阻断与待对账；不得触发真实网络、SDK、Secret 或费用。

## 2. 唯一数据解释

### 2.1 策略、规则与当前生效指针

- `BudgetPolicyVersion` 是不可变配置版本，稳定身份为客户端预生成 `budgetPolicyVersionId`。
- 一个版本按 `environment + resourcePool + currency + period(day|month)` 保存规则；同一作用域只能有一条提醒线和一条硬阻断线，且 `warningLimit < hardLimit`。
- 金额使用非负定标十进制字符串；数据库使用 `numeric`，共享契约与 API 不以 JavaScript `number` 作为金额权威。
- `ActiveBudgetPolicyPointer` 每个环境恰好指向一个已批准版本；空库迁移后策略、指针、预留和发布命令业务行均为 0。
- 并发、单项目容量和队列上限继续只属于 SYSTEM-03 `RoutingPolicyVersion`。预算页只读链接这些事实，不复制或覆盖。

### 2.2 调用前预留与调用后结算

- 付费 Adapter 在调用前形成中立 `BudgetQuote`：`currency / maximumAmount / billingUnit / maximumQuantity / quoteDigest`；浏览器不能提交或修改报价。
- `BudgetReservation` 绑定稳定 `reservationId / attemptId / projectId / resourcePool / deploymentVersionId / budgetPolicyVersionId / quoteDigest`。
- admission 事务按当前日/月规则计算 `final settled + active reserved`；提醒线只形成 warning，硬阻断线拒绝新的预留。降低预算不取消已经受理或运行中的请求。
- 最终金额高于原预留时如实记为 overrun 并阻断后续新调用，不回滚已经发生的供应商副作用。
- `unknown / reconciliation_required` 始终保持 reservation；只有后续对账命令得到已知最终金额后才能 settle/release。管理员不能用页面按钮把未知费用直接改成 0。
- 明确 `billingClass=unmetered_local` 的 deterministic fake、自建 Worker 和本地交付不创建外部预算预留；这不是“费用为 0”的推算，而是已登记执行类型的契约事实。

### 2.3 版本生命周期与命令身份

- 预算版本生命周期为 `draft → testing → impact_checked → approved → active / retired`。
- 历史回放只读取既有 Attempt/Usage/Reservation，不制造费用；影响检查至少返回当前消耗、待对账占用、将被硬阻断的资源池/币种和缺少规则的付费部署。
- 创建版本、测试、影响检查、批准、发布和回滚均使用“稳定资源 ID + 稳定命令 ID + Idempotency-Key + 规范化请求摘要”。
- 发布/回滚网络未知只 GET 同一 `budgetReleaseCommandId`；不得再次 POST、扫描列表猜 active 或先在浏览器切换指针。

## 3. 正式 API 与权限边界

首版只允许 SYSTEM-04 管理权限域，继续默认拒绝：

- `budget:read`：读取策略、active、历史用量/预留摘要和审计。
- `budget:write`：创建不可变草稿、运行零网络回放、影响检查和批准。
- `budget:publish`：发布、未知恢复与回滚。

正式接口族：

- `GET/POST /api/system-control/budget-policies`
- `GET /api/system-control/budget-policies/:budgetPolicyVersionId`
- `POST /api/system-control/budget-policies/:budgetPolicyVersionId/tests`
- `POST /api/system-control/budget-policies/:budgetPolicyVersionId/impact-check`
- `POST /api/system-control/budget-policies/:budgetPolicyVersionId/approve`
- `POST /api/system-control/budget-policies/:budgetPolicyVersionId/publish`
- `POST /api/system-control/budget-policies/:budgetPolicyVersionId/rollback`
- `GET /api/system-control/budget-release-commands/:budgetReleaseCommandId`
- `GET /api/system-control/budget-usage`
- `GET /api/system-control/budget-audit-events`

内部 admission/settlement 只由领域 Job/Worker 调用，不提供给员工浏览器，也不接受浏览器伪造报价、最终金额、供应商请求或对账结论。

## 4. 页面与交互

沿用唯一 ControlShell，新增 `/budgets`，不新增第二套管理壳或卡片墙：

1. 顶部显示环境、active 策略版本、数据新鲜度、待对账金额与下一重置时间。
2. 资源池摘要同时显示日/月已结算、预留、剩余、提醒/阻断状态；不同币种分行，未知费用单独显示待对账。
3. 策略版本区提供服务端搜索、状态筛选、稳定分页、版本详情、历史回放、影响检查、批准、发布和回滚。
4. 高风险发布必须展示新旧阈值、当前在途预留、将阻断的新请求与旧 active 保持规则。
5. 1440 保持详细表格与并列摘要；1024 使用现有侧栏覆盖、详情抽屉和表格容器内横滚，不删字段。
6. 加载、空、失败、stale、再次失败、未知、发布中、发布成功、无 active、缺币种规则、提醒、硬阻断和待对账均须有真实字段与焦点恢复。

## 5. 切片与依赖

### UI-SYSTEM-04

在 `DESIGN.md` 5.11/5.12 与既有 ControlShell 上冻结 `/budgets` 的信息结构、完整状态矩阵、1440/1024、高风险发布和待对账语义。只修改 DESIGN、`docs/ui/` 和仓库外原型/证据，不使用匿名数字冒充生产事实。

### BACK-SYSTEM-04A

交付共享契约、必要增量迁移、不可变策略/active/命令/审计/预留/结算 PostgreSQL 权威，以及 ASR/OCR 零网络 cloud stub 的调用前 admission 与调用后 settlement。不得恢复 SYSTEM-03 bootstrap/default/fallback，不接真实网络或 Secret。

### FRONT-SYSTEM-04B

依赖 UI 与后端均通过规划审核。只消费正式管理 API 实现 `/budgets`；浏览器不计算权威金额、不创建报价、不本地决定 active 或硬阻断。

### TEST-SYSTEM-04

正式 UI 终验后，以精确隔离 PostgreSQL 验证逐请求权限、空库零业务行、精确小数、多币种、日/月窗口、提醒/硬阻断、预留/结算/待对账、发布未知/回滚、策略换版只影响新 Attempt、两站隔离与 1440/1024。

## 6. v4.8 切片启动包

- **入口与下游**：管理员 `/budgets` → active `BudgetPolicyVersion` → ASR/OCR 付费 Attempt admission → Usage/Reservation 回流总览；返回 `/routing` 查看容量、返回 `/engines` 查看部署。
- **正式数据所有者**：PostgreSQL 拥有策略、指针、命令、预留、结算和审计；领域 Attempt/Usage 拥有调用事实；浏览器只持未提交草稿。
- **稳定身份**：`budgetPolicyVersionId / budgetTestRunId / budgetReleaseCommandId / reservationId` 均预生成并进入幂等摘要；unknown 只读同一身份。
- **旧路径清单**：不得存在代码默认预算、浏览器硬阻断、JavaScript 浮点金额累加、unknown=0、预算与路由容量双写、无 active 时放行付费调用、自动重发发布命令或业务 bootstrap。
- **迁移预期**：空库从零迁移后 budget policy/pointer/command/reservation/audit 业务行均为 0；测试显式创建全部前置事实。
- **隔离测试**：使用精确隔离数据库、一次数据库时间基准、零网络 stub 和精确清理；不使用共享默认库、sleep、墙钟竞态或外部服务。
- **UI 公共原语**：复用 ControlShell、服务端宽表、详情抽屉、确认 Modal、ErrorBlock、异步唯一恢复和 1440/1024 响应式；不得再写第二套焦点陷阱。
- **跨模块验收**：同一 active 路由下，发布预算 V1 后新 Attempt 固定 V1；发布 V2 后旧 Attempt/Reservation 不改、新 Attempt 固定 V2；硬阻断零供应商调用，unknown 保留预留并在对账后精确结算。

## 7. 明确非目标与授权门

- 不接真实 ASR/OCR/AI 网络、SDK、Secret 或付费请求；不购买、部署、推送或创建云资源。
- SYSTEM-04 原切片不做汇率换算；后续人民币归一只增加受控换算快照和 CNY 预算账本，仍不做发票、支付、充值、财务审批或会计总账。
- 不复制 SYSTEM-03 的并发、队列、主备路由；不实现服务器扩缩容。
- 不实现密钥管理 UI、策略学习、提示词/热词/风险词发布、真实 Cloudflare JWT 或统一任务中心。
- SYSTEM-04 关闭后仍不能自动进入真实 API；还须用户明确选择供应商、Secret 管理方式、付费上限与获准样本。

## 8. 关闭门

- 职责矩阵：`系统控制台预算、限额与付费调用安全门`。
- 核心衔接：`INT-15`；配置版本继续属于 `INT-11`，用量回流继续属于 `INT-12`，权限继续属于 `INT-13`。
- UI 与后端可在文件不重叠时受控并行；正式前端等待两者通过规划审核；测试等待正式 UI 终验。
- 本切片只运行一次完整浏览器矩阵和一次最终 `pnpm check`；微返工只复验变化场景。
- 不得以预算页面存在、零网络 stub 金额或接口预留冒充真实供应商、真实费用或生产部署已经完成。
