# SYSTEM-09 · 统一有序执行路由与安全兜底

状态：方案已由用户确认；UI-SYSTEM-09、全部 BACK-SYSTEM-09 与 FRONT-SYSTEM-09C 已关闭；正式 production UI 终验执行中，TEST-SYSTEM-09 保持 blocked。

## 1. 目标

把 SYSTEM-03 仅有两个槽位的“主部署/备用部署”升级为服务端权威的有序执行目标链，并贯通：

`管理员启停部署 → 路由目标排序 → 影响检查/批准/发布 → 新任务固定路由版本 → Attempt 按顺序选择实际部署 → 安全失败才进入下一目标 → 运行/费用/审计回流`

第一批关闭 ASR 与画面字 OCR；第二批复用同一骨架接术语提取和需要 OCR/AI 的表格识别。普通 XLSX/CSV 解析继续使用本地确定性代码，不进入供应商路由。

成功标准：

1. 每个能力可配置 1–8 个有序目标，不再限制为两个平级槽位；相同部署版本不得重复出现。
2. 目标只能引用已登记、已通过连接检查且操作员状态为“可用”的不可变部署版本。
3. OCR 允许本地部署与云 API 出现在同一条执行链中；推荐顺序为本地 OCR → 低价 API → 高质量 API，全部真实目标耗尽后再转人工处理。
4. ASR 推荐顺序为本地/低成本实现 → 低价 API → 高质量 API，全部真实目标耗尽后再转人工处理；真实厂商仍须另过 Secret、网络、样本和人民币预算授权门。
5. 只有能证明“外部未受理、无付费副作用”的确定失败才自动进入下一目标；unknown / reconciliation_required 永远停在原目标并只查询同一供应商请求身份。
6. 每次实际调用单独形成 Attempt，固定 routingVersionId、routingTargetId、deploymentVersionId、providerRequestId、预算版本、报价/预留与 CNY 结果；旧 Attempt 和旧任务不因路由换版改写。
7. 员工站不出现供应商、优先级、启停、费用策略或故障注入入口；员工只看业务状态和安全错误。全部配置、审计与停止控制仅在管理员 ControlShell。
8. 术语候选、OCR 候选和表格识别结果都只能进入草稿/人工审核，不得因自动兜底直接覆盖不可变术语版本、画面字 Release 或原始表格。

## 2. 唯一数据模型

### 2.1 路由版本与有序目标

- `RoutingPolicyVersion` 继续按 `environment + workflowStage` 不可变版本化，并由唯一 active 指针决定新任务使用哪个版本。
- 新增 `RoutingTarget` 作为路由版本的有序子项，至少包含：
  - `routingTargetId`
  - `routingVersionId`
  - `priority`（从 1 连续递增）
  - `deploymentVersionId`
  - `role`：`preferred / standard / emergency`
  - `maxConcurrentJobs / perProjectMax / queueLimit`
- `priority` 的命名空间是同一个 `RoutingPolicyVersion / workflowStage`，不是旧资源池。`screen_text` 的 `ocr_self_hosted_worker` 与 `ocr_api` 必须合并为一条全局连续序列，例如本地目标 1、低价云目标 2、高质量云目标 3；`poolId / executionKind` 只描述每个目标的运行与计费类型，不能各自从 1 重新编号或在读取时临时拼接。
- `asr` 版本只允许 ASR 目标参与其序列，`screen_text` 版本只允许两类 OCR 目标参与其序列；非本工作流目标必须为空。数据库唯一约束、服务端校验、routeDigest、初始选择、下一目标选择和历史读取必须使用同一顺序。
- 部署的 `enabled / disabled` 仍由 EngineDeployment 唯一拥有；RoutingTarget 不复制第二个启停状态。系统绝不自动重新启用被操作员停用的部署。
- 每个 RoutingTarget 必须引用真实 EngineDeploymentVersion；人工处理不是引擎部署，不拥有 deploymentVersionId、连接检查或引擎容量，也不得注册伪 `manual` Adapter。目标全部耗尽后由领域任务进入现有失败/需人工处理出口并返回对应工作台。
- 目标顺序、容量和引用版本只能通过新草稿、影响检查、批准、发布生效；不能直接改 active 版本。
- 三项逐目标容量不是展示字段：创建/排队与 Worker claim 必须按当前 `routingTargetId` 执行队列、全局并发和项目并发限制；`maxConcurrentJobs` 统计该目标的活动 Attempt，`perProjectMax` 统计该项目在该目标的活动 Attempt，`queueLimit` 统计下一执行目标解析为该目标的 queued Job。其它目标的排队或活动事实不得占用本目标额度；进入下一目标前重新按下一 `routingTargetId` 做同一组准入。不得继续使用整条 routingVersion、整个项目或进程级静态调度值替代逐目标容量。
- 旧 `primaryDeploymentVersionId / fallbackDeploymentVersionId` 共享写契约、数据库写列、前端表单、服务端选择分支和只验证旧行为的测试，在 SYSTEM-09 关闭切片中必须删除。迁移只负责把现有历史顺序确定地转换为目标行，不保留新写兼容路径：`screen_text` 的旧数据按 `ocr_self_hosted_worker primary → fallback → ocr_api primary → fallback` 转成全局连续 priority；转换完成后只能 priority=1 为 `preferred`，其余旧目标为 `standard`，不得因为来自另一旧 pool 的 primary 再产生第二个 `preferred`。必须用带旧主备数据的迁移回归证明新服务可直接读取转换结果。

### 2.2 任务、尝试与兜底事件

- 新 Job 固定 `routingVersionId + routeDigest`，不再把 Job 上的单一 deploymentVersion 当作整条任务唯一执行真相。
- 每个 Attempt 固定实际使用的 `routingTargetId + targetPriority + deploymentVersionId`；进入下一目标必须新建下一 Attempt，并追加 `RoutingAdvanceEvent`。
- `RoutingAdvanceEvent` 只追加，至少记录前后 Attempt、稳定原因码、是否可证明外部未受理、requestId 和时间；它不拥有 Job/Attempt 状态。
- 历史旧 Job 的单部署字段只按只读合同展示，不参与新任务选择、active 判断或新 Attempt 创建。
- 路由发布只影响新 Job；运行中 Job 使用创建时固定的 routingVersion/routeDigest，路由换版不得改变其剩余目标顺序。

### 2.3 安全失败分类

服务端 Adapter 必须返回结构化事实，浏览器和 Worker 不靠错误文案猜测：

自动前进只能由明确的结构化 `external_not_accepted` 分类触发；`externalSideEffectPossible=false` 是必要但非充分条件。`unauthorized`、`external_unknown`、`quality_rejected` 与 `cancelled` 均不得进入下一目标，不能仅凭错误字符串或布尔值推断。

| 分类 | 是否自动进入下一目标 | 处理 |
| --- | --- | --- |
| 本地预检失败、目标停用、连接检查失效、明确未发送 | 是 | 当前 Attempt 确定失败，按顺序选择下一可用目标 |
| 供应商明确拒绝且可证明未受理（含安全分类后的限流） | 是 | 保留原因与调用计数，再做下一目标预算准入 |
| 401/403、Secret/配置错误 | 否 | 确定失败并告警；管理员修复后显式新任务/重试，不偷偷切换 |
| 5xx、断网、超时 | 仅当 Adapter 明确 `externalSideEffectPossible=false` | 不能证明时一律进入需对账 |
| 已受理、响应丢失、provider success/local unknown | 否 | `reconciliation_required`；只 GET 同 providerRequestId，不创建下一付费 Attempt |
| 质量不达标 | 首版不自动 | 保存结果后由管理员显式发起高质量复核，重新过预算门 |

任何自动前进都必须同时满足：目标仍可用、队列/并发允许、预算 admission 通过、累计 CNY 未触发硬线。pending/unknown 金额不记 0，也不释放已有预留。

## 3. 能力接入

### 3.1 ASR

- 新建 Batch/Job 时固定 active 路由版本及完整目标摘要；Worker 每个 Attempt 解析对应部署版本和服务器端 Secret。
- 本地 FunASR、低价云 ASR、高质量云 ASR都以注册 Adapter/EngineDeployment 进入同一目标链，不能建立第二个 ASR create/worker 路径。
- 热词只来自已批准不可变 `termVersionId` 的安全投影；目标切换不得更换术语版本或素材。
- providerRequestId 未确定前禁止自动创建下一付费 Attempt。

### 3.2 画面字 OCR

- 本地 OCR 是正式 `screen_text + self_hosted_worker` 部署，不是浏览器脚本或隐藏常量；生产建议以独立 Worker/内网 sidecar 运行，首选 PaddleOCR 3.x。
- 推荐顺序：本地 PaddleOCR → 低价 OCR API → 高质量 OCR API → 人工处理。第一轮可用零网络本地 stub 与 API stub 验证状态机，真实模型安装和云网络另过部署授权门。
- 本地 OCR 失败若确定未产生外部副作用可进入云 API；云 API unknown 不得再切另一云厂商。全部已启用目标均确定失败时任务转人工处理，但“人工处理”不占目标序号。
- 抽帧、去重、术语版本、候选人工编辑和 Release 继续由现有 screen-text 模块拥有，路由模块只决定 Attempt 的实际执行目标。

### 3.3 术语与数据表

- 术语表本身仍由 PostgreSQL 不可变 `TermVersion` 拥有；有序路由只用于“候选提取”，顺序建议为本地规则/模型 → 低价 AI → 高质量 AI → 人工补录。
- 任一模型输出都只产生 `TermCandidate`，必须经人工裁决后才能形成新 TermVersion；不得自动改写已发布术语。
- CSV/XLSX 结构读取、字段校验和导出永远优先使用本地确定性解析，不进入路由。
- 图片/PDF 表格或需要语义识别的表格可使用 `document_table` 能力，顺序为本地表格 OCR → 低价云识别 → 高质量云识别 → 人工校对；结果只能进入草稿。
- 术语/表格 Wave 只在 ASR/OCR 有序路由关闭后复用共同原语，不提前把现有术语和交付状态机重写成通用任务表。

## 4. 管理端页面

沿用唯一 ControlShell，不新增员工入口：

1. `/engines`：登记部署/版本、连接检查、操作员启用/停用；显示能力、本地/云、成本层级、健康事实和当前使用位置。停用被 active 目标引用的部署继续稳定阻断，先发布替代路由。
2. `/routing`：按能力显示有编号的真实部署目标表；支持新增、删除、上移、下移、选择不可变部署版本、容量编辑和只读安全切换规则。表后单独显示“目标耗尽后转人工处理”，不得把人工处理做成编号目标、连接检查或引擎容量，也不得使用多个看似平级的开关卡片。
3. `/changes`：展示旧/新顺序、容量、成本层级、连接检查、预算和活动任务影响；人工批准后发布，unknown 只 GET 同 releaseCommandId，失败保持旧 active。
4. `/logs`：按 Job 展示 Attempt 1→2→3 的执行链、目标、原因、providerRequestId、requestId、CNY/待对账；原始供应商载荷、Secret、URL/Header、objectKey 不可见。
5. `/overview`、`/budgets`、`/servers`：继续只读投影实际目标的运行/费用/资源事实；本地 OCR 资源使用与云 OCR 费用不得混算。

1440 保持详细表格；1024 侧栏 72 收起/216 覆盖且正文不挤，宽表只在自身容器横滚。排序、删除、发布、停用属于高风险链，必须有安全初焦点、双向焦点圈、pending 锁、失败/unknown 唯一恢复和回焦。

## 5. 分波任务

### UI-SYSTEM-09

只修改 `DESIGN.md`、`docs/ui/` 和仓库外原型/证据，冻结 `/engines /routing /changes /logs` 的有序目标、启停、影响、执行链和双视口；不修改生产前后端、契约或迁移，不冒充真实 FunASR/PaddleOCR/云厂商已接入。

### BACK-SYSTEM-09A · ASR/OCR 后端纵向

一次性交付共享契约、增量迁移、RoutingTarget/routeDigest/影响检查/发布历史与读取 API，并把 ASR 与 screen-text 的新 Job/Attempt 接到固定有序目标；实现结构化失败分类、安全前进、unknown 对账停止、逐 Attempt 预算 admission/settlement 和 RoutingAdvanceEvent。确定迁移旧主备顺序，删除旧主备共享写契约、服务端写路径、`loadActive()` 单部署选择及 Job 单部署的新写依赖；不得用双写或临时兼容分支保持两套权威。空库迁移后不得创建部署、路由、目标或 active 业务行。先以本地/云零网络 Adapter 覆盖全部状态，不下载模型、不接付费 API。

### BACK-SYSTEM-09B · 本地 OCR 运行边界

依赖 09A 关闭后，接入服务器端本地 OCR sidecar/Worker 边界、媒体帧读取、受控超时/资源限制和真实 connection probe；首选 PaddleOCR 3.x。模型下载、Docker/系统依赖安装、GPU 与远程部署均需另行授权；未获授权时只交零网络协议适配与可测 fake，不冒充真实识别完成。协议 schema 必须在 transport 调用前后做运行时完整校验，不得只依赖 TypeScript 类型或字段名比对；deadline、Abort 与 maxConcurrent 必须由 Adapter 边界强制拥有，transport 即使忽略信号或永久不返回也不能挂死 Worker。超时返回后仍未真正结束的底层 invoke 必须继续占用并发槽并 fail-closed 拒绝新调用，直到该 invoke 真正 settle；不得仅释放等待者计数后让第二次 transport 调用绕过上限。媒体输入必须诚实区分“完整视频字节由 sidecar 解码”和“服务端已解码帧”，禁止把整段视频字节伪装成一张固定尺寸帧；帧宽变化后的 left/center/right/full 必须按真实帧相对几何计算，持久 videoDurationMs 必须来自 frame extractor 的权威媒体时长，而不是用最后抽样时间或固定最小值猜测；零网络 fake 的证据尺寸/时间也必须与实际字节和结构化结果一致。

### FRONT-SYSTEM-09C

依赖 UI 与 BACK 09A 规划验收，只在 `system-frontend` 实现正式管理页面；员工 `frontend` 仅在后端已有安全业务投影时显示普通失败/处理中/需对账，不显示供应商和路由配置。unknown 命令只查询同一稳定身份。

### BACK-SYSTEM-09C-OPS · 管理员执行链只读投影

复用既有 `/api/system-control/operations` 唯一读取面，从 PostgreSQL 现有 Job、Attempt、RoutingTarget 与只追加 RoutingAdvanceEvent 投影 `routeDigest / routingTargetId / targetPriority / deploymentVersionId / effectClass` 及安全前进链。列表保持服务端筛选/排序/分页，详情返回按真实 Attempt 顺序的安全字段；读取不得产生写副作用，不新增第二状态源、日志解析、浏览器拼接或原始供应商载荷。若现有持久字段不足，必须先回规划说明，未经审核不得新增迁移。

### BACK/FRONT-SYSTEM-09D · 术语与表格复用

在 ASR/OCR 关闭后，接入 `term_extraction` 与 `document_table` 候选生成；不修改 TermVersion、交付 XLSX 或原始文件所有权，不让模型输出直接发布。

### TEST-SYSTEM-09

使用从零隔离 PostgreSQL 和零网络 Adapter 验证 1/3/8 目标、顺序、启停、并发、预算、A/B 项目隔离、safe failover、unknown 停止、路由换版、旧任务固定、日志/费用/审计、两站隔离、1440/1024，并在最终关闭门运行一次完整 `pnpm check`。

## 6. 启动包

- **入口/下游**：管理员 `/engines → /routing → /changes`；运行结果回 `/logs /overview /budgets /servers`；员工业务入口仍是现有 ASR、画面字、术语和任务中心。
- **API 身份**：路由/目标资源与发布命令继续使用客户端预生成稳定 UUID、`Idempotency-Key` 和 canonical request hash；unknown 只 GET 同一命令/Attempt/providerRequestId。
- **唯一状态源**：PostgreSQL 路由版本、目标、active 指针、Job/Attempt、预算和事件；浏览器、进程内健康缓存和日志都不能移动业务状态。
- **旧路径清单**：`primary/fallback` 写契约和 UI、`COALESCE(primary, worker)` 选择、Job 单 deployment 新写、默认 Registry 选择、unknown 自动下一厂商、员工供应商开关、浏览器成本/健康推算均须为零。
- **隔离测试**：所有后端专项使用从零临时数据库并精确 DROP；不读取/清理共享默认库。零网络 Adapter 的调用计数必须可断言。
- **权限**：沿用 system-control audience 和 engines/routing read/write/test/release；员工 audience 对所有配置 API 为 403。
- **费用**：全部主金额 CNY；本地无外部费用明确为 CNY 0，云 pending/unknown 保留预留且显示“待对账”。

## 7. 非目标与停止门

- 本切片不购买服务器、不安装 PaddleOCR/FunASR、不接真实供应商、Secret、网络、COS、Sentry、付费或生产部署。
- 不做隐藏的自动启用/禁用；操作员停用状态不会被系统自动改写。首版自动化仅是“在安全失败时进入下一个已启用目标”。
- 不因供应商更便宜就并行调用多个目标；首版严格串行，避免重复费用和结果竞态。
- 不用前端文案、日志或第二数据库代替 Attempt/对账状态。
- 如真实厂商协议需要 webhook/回调幂等、新对账收据或无法证明外部副作用，停止执行并回规划新增明确持久契约。
- 任一 Secret/URL/Header/objectKey/字幕正文/视频帧泄露、跨项目读取、unknown 自动付费重发、重复 Attempt/Usage、CNY 硬线越界，立即停止。

## 8. 职责与衔接

- 职责矩阵：`系统控制台有序执行路由与安全兜底`。
- 核心衔接：`INT-11`；运行与费用回流 `INT-12/15`；权限 `INT-13`；Secret `INT-16`；CNY `INT-17`。
- SYSTEM-03 的不可变部署/发布历史继续有效；SYSTEM-09 只替换“两个固定主备槽位及单部署执行”的新写路径，不删除历史版本和审计。
