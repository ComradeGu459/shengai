# SYSTEM-03 · 引擎/API 与安全配置发布纵向切片

状态：SYSTEM-03 已关闭；本地零网络控制平面、正式管理页面与独立集成验收通过。真实供应商、明文密钥、付费调用、Cloudflare、云资源或部署仍须另行授权。

## 1. 目标与成功标准

本切片把现有代码内 Adapter Registry 与开发默认描述符接入 PostgreSQL 控制平面，并贯通：

`引擎部署版本 → 连接测试 → 路由/并发草稿 → 影响检查 → 安全发布/回滚 → 新任务固定生效版本`

成功必须同时满足：

1. ASR 云 API、OCR 云 API、OCR 自建 Worker 分别登记为稳定引擎部署；业务任务只引用部署/版本身份，不接触厂商 SDK 或浏览器配置。
2. 每次保存形成不可变配置版本；浏览器不是状态源，进程重启后可从 PostgreSQL 恢复版本、测试、发布、当前生效指针和审计。
3. 连接测试与生产发布分离。首版连接测试只运行已登记的零网络 probe，不接受任意 URL、脚本、请求头或明文 Secret，也不产生付费请求。
4. 主部署、备用部署、并发与队列参数按 `asr / screen_text` 业务环节分别版本化；OCR API 与 OCR 自建 Worker 不共享容量参数。
5. 发布失败或结果未知时旧 active 指针保持不变；回滚创建新的可审计发布，不删除失败版本。
6. 新建 Job/Attempt 固定实际部署版本与路由版本；运行中、已完成和需对账任务不被改写、不自动重试。

## 2. 唯一数据解释

### 2.1 引擎部署与版本

- `EngineDeployment` 是稳定身份：`deploymentId / capability / executionKind / displayName / provider / adapterKey`。
- `EngineDeploymentVersion` 是不可变配置：模型、语言、区域/端点提示、Adapter 能力快照、Secret 引用摘要和 `configDigest`；不保存 Secret 值。
- 首版 capability 只允许 `asr / screen_text`；现有术语 AI、快速筛选和未来本地 ASR 不借本切片提前进入生产路由。
- `adapterKey` 只能来自后端启动时已注册的 ASR/ScreenText Adapter Registry；数据库不能登记任意可执行代码。
- Secret 只保存可解析的引用标识和脱敏摘要。管理 API 不返回引用原文、环境变量值、令牌、连接串或供应商私参。

### 2.2 连接测试

- 连接测试使用稳定 `testRunId`、幂等命令和持久状态：`queued / running / succeeded / failed / unknown`。
- Wave A 只允许 `deterministic_fake / zero_network_stub / self_hosted_worker_stub` 的注册 probe；真实网络测试必须等用户批准具体供应商、Secret 引用、预算与样本。
- 测试结果只保存延迟、能力、脱敏原因、requestId、开始/完成时间和被测版本；成功不能自动发布。
- 网络或结果未知只 GET 同一 `testRunId`；不得自动再发测试命令。

### 2.3 路由、容量和发布

- `RoutingPolicyVersion` 按 `environment + workflowStage` 固定主部署版本、可选备用部署版本、超时、有限重试规则和资源池容量。
- 首版容量只包含各池 `maxConcurrentJobs / perProjectMax / queueLimit`；预算、速率计费阈值和服务器扩缩容另立任务。
- 自动备用只适用于明确未受理、无付费副作用且契约标为可安全降级的失败；`unknown / reconciliation_required` 不自动切换或重试。
- 发布链固定为 `draft → testing → impact_checked → approved → active / retired`。影响检查至少返回受影响业务环节、现有活动任务、需对账任务、未通过连接测试和容量变化。
- `ActiveControlPlanePointer` 每个环境/业务环节只有一个；发布事务成功后才切换。回滚指向历史已批准版本并追加审计事件。

### 2.4 Bootstrap 与旧路径清理

- 数据库迁移只建立表、约束和历史字段，不创建任何 EngineDeployment、RoutingPolicyVersion、active 指针或系统 bootstrap 审计业务行；从零数据库迁移后的这些业务表必须为空。
- development 也必须由管理员通过正式管理 API 显式登记零网络部署、创建版本、完成连接测试、建立路由并发布 active；未发布 active 时 ASR/OCR 新任务稳定阻断，禁止代码、迁移或浏览器静默补默认值。
- Wave B 接管新任务创建后，ASR/OCR 不再从浏览器、散落常量或“没有 active 时临时取默认”决定实际部署；不得长期保留第二选择路径、legacy/compat 或双写。
- 已持久化 Job/Attempt 继续按自身保存的 adapter/config 描述执行，不做历史数据改写。

## 3. 页面与交互

沿用已确认的独立 `ControlShell`，不新增第二套管理壳：

1. `/engines`：服务端列表、能力/状态筛选、版本详情、Secret 引用摘要、最近连接测试；新建版本与停用必须明确影响范围。
2. `/routing`：ASR、OCR API、OCR 自建 Worker 分池显示主备、容量和当前 active；草稿编辑不直接生效。
3. `/changes`：草稿、测试、影响检查、确认发布、结果未知只读恢复、发布成功、失败和回滚审计。

1440 保持详细表格/并列事实；1024 使用可收起侧栏、详情抽屉和表格容器内横滚，不删字段、不把配置做成卡片墙。高风险确认必须有安全初始焦点、正反向焦点闭环、提交中锁定、失败/未知唯一恢复和关闭后触发点恢复。

## 4. 切片与依赖

### UI-SYSTEM-03

在既有 ControlShell 原型和 `DESIGN.md` 5.11 上冻结 `/engines / routing / changes` 的正式状态矩阵、1440/1024 和高风险交互。必须覆盖无部署、未绑定 Secret、测试排队/失败/未知/成功、草稿、影响阻断、发布未知、发布成功、回滚、stale/只读；不得把原型匿名数据或工程注释带进生产页面。

### BACK-SYSTEM-03A · Wave A

交付共享契约、必要增量迁移、部署/不可变版本/连接测试/审计的 PostgreSQL 权威后端，以及只允许注册零网络 probe 的测试 Worker/入口。管理 API 继续使用 SYSTEM-02 逐请求权限边界，并新增明确的 read/write/test capabilities；不实现路由 active 指针或影响员工任务。

### BACK-SYSTEM-03B · Wave B

依赖 UI 与 Wave A 规划验收。交付路由/容量不可变版本、影响检查、发布/未知恢复/回滚、active 指针和审计；将 ASR/OCR 新任务创建接到唯一 active 策略，固定部署/路由版本，并端到端删除新任务的旧默认选择路径。

### FRONT-SYSTEM-03C

依赖 UI 与后端两波验收。只消费共享契约与正式管理 API，实现三个页面和完整异步/键盘/双视口矩阵；不保存明文 Secret、不本地推算 active、影响或测试结论。

### TEST-SYSTEM-03

正式 UI 终验后使用隔离 PostgreSQL 验证逐请求权限、版本不可变、零网络测试、发布/未知/回滚、进程重启恢复、新旧任务版本隔离、员工站无管理入口和 1440/1024 正式页面。测试不修改生产代码。

## 4.1 FRONT-SYSTEM-03C 垂直切片启动包

- **用户入口与路径**：独立管理员 `ControlShell` 的 `/engines`、`/routing`、`/changes`；详情、抽屉和确认完成后仍回到同一控制台，不进入员工 `AppShell`。
- **上游就绪事实**：Wave A 的 `EngineDeployment / EngineDeploymentVersion / ConnectionTestRun` 与 Wave B 的 `RoutingPolicyVersion / ActiveControlPlanePointer / RoutingCommand` 均由 PostgreSQL 唯一持有；UI Rev 2、BACK Wave A/B 已通过规划验收。
- **精确接口**：只消费 `/api/system-control/engines*`、`/engine-connection-tests*`、`/engine-status-commands/:statusCommandId`、`/routing*`、`/routing-commands/:commandId` 与 `/routing-audit-events`；逐请求 capability 以服务端 403 为准，前端不得把隐藏按钮当权限边界。
- **异步命令身份**：部署、版本、连接测试、部署启停和路由草稿使用客户端预生成稳定资源/命令 ID 与 `Idempotency-Key`；发布/回滚使用预生成 `releaseCommandId`。网络未知只 GET 同一 `testRunId`、`statusCommandId` 或 `releaseCommandId`，不得重复 POST、扫描列表猜结果或在本地切 active。
- **写入与恢复**：确定性冲突清除当前意图并刷新服务端事实；pending 锁定重复提交和离开；失败显示脱敏原因、真实 `requestId` 与唯一恢复动作；发布失败或未知时继续展示旧 active。
- **需要保持为零的旧路径**：迁移业务 bootstrap、无 active 默认选择、浏览器本地 active/影响结论、匿名原型数据、兼容 API、第二状态源、Secret/内部引用回显、员工站管理入口。
- **UI 与公共原语**：唯一方向为 `DESIGN.md` 5.12 与 `docs/ui/SYSTEM-engine-control-acceptance.md` §12；复用现有 `ControlShell`、表格容器、状态标签、抽屉、确认框和异步错误/恢复模式。1440 保持详细并列，1024 侧栏覆盖展开且宽表只在自身容器横滚。
- **允许目录**：`system-frontend/`、对应前端测试、`docs/contracts/LOCAL_APP_PARITY.md` 的必要证据行，以及交接状态/日志；不得修改 backend、迁移、共享 contracts 或 DESIGN。
- **隔离与验收**：前端定向测试不写共享数据库；正式 UI/全链验收必须使用精确隔离 PostgreSQL。覆盖 loading/empty/error/stale/403、无部署、测试五态、路由全状态、影响阻断、发布未知/成功/回滚、键盘焦点、1440/1024 和两站隔离。
- **非目标**：真实供应商/网络/SDK/Secret/付费、预算、服务器扩缩容、规则/提示词学习、Cloudflare JWT、提交、推送和部署。

## 5. 明确非目标与授权门

- 不接真实 ASR/OCR/AI 网络、SDK、密钥或付费请求；不购买、部署或创建云资源。
- 不保存或回显明文 Secret；不提供任意 URL、任意 Header、脚本或服务器命令测试，避免 SSRF/RCE。
- 不做预算/费用硬阻断、日志明细、策略学习、提示词/热词/风险词发布、服务器遥测、Worker 扩缩容或 Cloudflare JWT。
- 不允许员工页面选择供应商、模型、主备、并发或配置版本。
- 真实供应商接入必须另行确认厂商、Secret 管理方式、预算、样本范围和付费授权。

## 6. 验收与关闭门

- 职责矩阵：`系统控制台引擎/API 与安全配置发布`。
- 核心衔接：`INT-11`；权限继续受 `INT-13`，运行结果继续进入 `INT-12`。
- 每波只做一次完整专项/构建；正式前端只做一次完整浏览器矩阵，微返工只复验变化场景。
- 最终关闭门运行一次完整 `pnpm check`；不得以设计稿、Adapter 接口存在或 fake 成功冒充真实供应商已接入。
