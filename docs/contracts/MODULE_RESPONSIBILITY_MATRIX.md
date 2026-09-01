# 模块职责与任务范围矩阵

状态：规划权威基线。适用于 UI、前端、后端和验收任务；如与聊天记忆或旧视觉稿冲突，以用户最新明确要求和本文件为准。

本文件规定模块内部职责；相邻模块的上游产物、下游消费、版本失效、恢复和跨边界验收统一见 `docs/contracts/MODULE_INTEGRATION_CONTRACTS.md`。新任务必须同时指向本矩阵的一行和至少一个 `INT-*` 衔接卡，不能只做孤立页面或孤立接口。

## 1. 不可混用的四个概念

1. **素材角色**：公司字幕、中文识别视频、画面字视频。它们只说明一个物理文件将来供什么业务使用，不表示识别或审改已经开始。
2. **上传任务**：把已确认清单中的一个或多个物理文件可靠传到对象存储，并提供暂停、续传、校验、失败恢复和取消未完成上传。
3. **任务中心**：后续统一观察和控制 ASR、OCR、AI、导出等异步执行记录；它不负责上传原始素材，也不替代各业务模块的人工工作台。
4. **项目工作台**：在一部剧的上下文中完成术语确认、识别结果查看、前置审改、字幕验收和交付。项目工作台的流程导航不得出现在全局“上传任务”页面。

上传页中的“素材分类”只允许按素材角色、集数、文件类型和上传状态分类。不得把“术语、中文识别、画面字、前置审改、字幕验收、交付”当成上传页一级标签。

## 2. 产品职责矩阵

| 环节 / 用户目标 | 模块归属 | 当前或计划任务 ID | UI 只显示什么 | 明确非目标 |
| --- | --- | --- | --- | --- |
| 创建、搜索并打开一部剧 | 全局项目中心 | `DEV-M2-01`（完成） | 项目名称、后端状态、时间、搜索和创建 | 上传文件、运行识别、编辑字幕 |
| 识别本地目录并确认每集三类素材角色 | 项目工作台 / 概览与素材 | `UI-M2-02`、`DEV-M2-02`（完成） | 公司 SRT、中文识别视频、画面字视频的按集配对、冲突和留空 | 读取/上传文件字节、运行 ASR/OCR、生成术语 |
| 一次选择并可靠上传多个素材文件 | 全局上传任务 | `UI-M2-03`、`FRONT-M2-04B`；后端基础为 `DEV-M2-03`、`BACK-M2-04A` | 素材分类、上传状态筛选、多选/文件夹选择、紧凑物理文件列表、批量选择、排序、进度、恢复和取消未完成上传 | 术语、ASR/OCR 执行、审改、验收、交付、已完成 Asset 删除 |
| 查看和控制异步处理执行 | 全局任务中心（后续） | 未创建；M2 非目标 | 任务类型、项目、运行状态、排队/进度、失败原因、重试/取消和历史 | 素材上传、术语人工审核、字幕正文编辑 |
| 从公司台词提取并确认项目术语 | 项目工作台 / 术语 | `PLAN-M3-01`（已确认）；`UI-M3-01`、`BACK-M3-01A`、`BACK-M3-01C`、`FRONT-M3-01B` | 候选、证据、别称、人工裁决、全部采用、不可变版本、公司级导出模板和 XLSX 导出 | 上传原始素材、直接修改 ASR/OCR 结果、普通员工查看跨项目学习库 |
| 以已确认术语约束中文语音识别 | 项目工作台 / 中文识别；项目中心批量发起；全局任务中心只读汇总 | `PLAN-M3-02`、`PLAN-M3-02B`（已确认）；`UI-M3-02`、`BACK-M3-02A` 及 S2.1 后继任务 | 双门禁、热词预览/发送证据、整剧/选中集/单集、多项目批量发起、每集状态、不可变结果、质量/用量、取消、需对账和只重试失败集 | 选择上传会话代替项目、在上传页直接运行识别、自动覆盖人工采纳稿、字幕正文编辑、供应商密钥管理、当前接真实付费 API |
| 以已确认术语约束画面字识别 | 项目工作台 / 画面字；执行记录进入任务中心（后续） | `PLAN-M3-04`（已确认）；`UI-M3-04`、`BACK-M3-04A`、后继 `FRONT-M3-04B` | 双门禁、整剧/选中集/单集、逐集状态、截图/视频证据、候选文字、分类/位置、初始时间、人工保留/排除/修改/新增、明确空集和不可变画面字 SRT | 在上传页运行 OCR、员工选择供应商/密钥/并发/费用、最终字幕验收 |
| 对公司稿、ASR 与术语证据做大范围修正 | 项目工作台 / 前置审改 | `PLAN-M3-03`（已确认）；`UI-M3-03`、`BACK-M3-03A`、后继 `FRONT-M3-03B` | 双源对照、整剧/选中集/单条文本基准、唯一采纳稿、人工决定/撤销、格式门禁、逐集导航、直接 MP4 时间定位和待验收 SRT 修订 | 画面字 OCR、完整风险词库、时间轴编辑、最终验收冻结、重新上传素材、360p/1080p 转码 |
| 结合视频做最终看片和轻量时间轴修改 | 项目工作台 / 视频字幕验收 | `PLAN-M3-05`、`UI-M3-05`、`BACK-M3-05A`、`BACK-M3-05C`、`FRONT-M3-05B` | 项目/会话上下文、历史只读、视频与多轨时间轴、台词/画面字轻量编辑、问题、同步预检、逐集/整剧通过、局部返工和交付就绪事实 | 重跑 ASR/OCR、重做术语或前置审改、大批量文本重写、直接生成/下载交付产品和外部提交 |
| 确认、生成、搜索和下载正式交付物 | 完整交付确认页 + 全局交付产品库 | `PLAN-M3-07`（已确认）；后继 `UI-M3-07`、`BACK-M3-07A`、`FRONT-M3-07B` | 完整确认、后台不可变验收快照、每集台词/画面字 SRT、术语 XLSX、产品列表/详情、负责人、备注、创建/更新时间、下载和恢复 | 上传原始素材、在交付库编辑识别结果、自动上传甲方总库、首版管理员批准 |
| 延迟删除与恢复项目/资产 | 全局回收站 | `BACK-M2-06` 与对应未来前端任务 | 回收时间、到期时间、恢复、清理中和失败原因 | 在上传列表直接永久删除 Asset |
| 从人工修改形成受控优化候选并管理规则版本 | 系统控制台 / 策略与学习 | `PLAN-SYSTEM-07`（已确认）；`UI-SYSTEM-07`、`BACK-SYSTEM-07A` 已解锁，`FRONT-SYSTEM-07A`、`TEST-SYSTEM-07A` 依赖后置 | 普通员工不显示；管理员只看安全事件投影、不可变规则版本、聚合候选、评测、批准与发布审计 | 暴露跨项目完整字幕、单事件直接上线、自动发布公司规则、保存训练音视频、未授权真实 AI/微调 |
| 查看跨项目运行、用量、异常和数据新鲜度 | 系统控制台 / 运行总览与诊断 | `PLAN-SYSTEM-02`、`BACK-SYSTEM-02A`、后继 `FRONT-SYSTEM-02B`、`TEST-SYSTEM-02` | 四资源池、真实指标/趋势、异常、费用待对账、未纳管配置和数据新鲜度 | 员工业务编辑、明文密钥、浏览器推算、伪监控曲线、首切片修改配置或服务器 |
| 下钻服务器、Worker、队列与存储运行事实 | 系统控制台 / 服务器与运行环境 | `PLAN-SYSTEM-06`；后继 `UI-SYSTEM-06`、`BACK-SYSTEM-06A`、`FRONT-SYSTEM-06C`、`TEST-SYSTEM-06` | 环境/资源分层、领域队列/在途/租约/吞吐、受控遥测摘要、数据新鲜度、未知/未接入和现有控制页面深链 | SSH、任意命令、云资源购买、扩缩容、主机重启、第二套并发/暂停状态、伪造 CPU/GPU/容量 |
| 在专用测试机部署准备、验证容量并复现用户问题 | 系统控制台 / 测试服务器与问题记录 | `TEST-SERVER-OPS-01`；生产缺陷按规划另派 `BACK-*`、`FRONT-*`、`UI-*`、`TEST-*` | 管理员只看测试机健康、容量、压测/长稳/故障注入状态、脱敏报告和稳定 `TEST-SRV-*` 问题身份；用户可用自然语言提交现象 | 员工站入口、购买或擅自部署、生产状态写入、真实付费调用、把问题台账当业务状态源、在同任务直接修生产代码 |
| 按请求标识追踪运行、质量和人民币用量 | 系统控制台 / 日志与质量 | `PLAN-SYSTEM-06`；后继 `UI-SYSTEM-06`、`BACK-SYSTEM-06B`、`FRONT-SYSTEM-06C`、`TEST-SYSTEM-06` | ASR/OCR/交付/控制面运行记录的服务端检索、分页、详情、版本链、脱敏错误、质量摘要、CNY/待对账和恢复跳转 | 原始视频、完整字幕/提示词/热词、Secret、对象键、供应商原始载荷、首版文件导出 |
| 在接入付费 API 前配置预算并阻止超额新调用 | 系统控制台 / 预算与限额 | `PLAN-SYSTEM-04`、`UI-SYSTEM-04`、`BACK-SYSTEM-04A/C`、`FRONT-SYSTEM-04B`、`TEST-SYSTEM-04`（基线已关闭）；后继 `SYSTEM-04CNY` | 日/月提醒与硬阻断、人民币预留/已结算/待对账、不可变版本、影响检查、发布与回滚；原币种仅作管理员审计 | 充值支付、财务总账、复制路由并发/队列、浏览器换算或伪造报价、真实付费调用 |

## 3. 实现、数据所有权与验收矩阵

表中的“后续建议目录”只有在对应任务进入 `ready` 后才获得写入授权；目录名称本身不代表功能已经获批。

| 模块 | 前端允许实现 | 后端允许实现 | 权威数据源 | 允许修改目录 | 依赖与最低验收 |
| --- | --- | --- | --- | --- | --- |
| 项目中心 | 列表、创建、搜索、读取后端状态 | 项目命令、查询、幂等与生命周期 | PostgreSQL `projects`；浏览器只持未提交表单 | `frontend/src/features/projects/`、`backend/src/modules/projects/`、`packages/contracts/src/projects.ts`、对应测试 | 已完成；刷新后状态一致，创建重试不重复 |
| 概览与素材 | 本地元数据扫描、配对草稿、显式确认 | 版本化清单、校验和读取 | PostgreSQL 最新已确认 `MaterialManifest`；本地选择仅是草稿 | `frontend/src/features/materials/`、`backend/src/modules/materials/`、`packages/contracts/src/materials.ts`、对应测试 | 已完成；三类角色、冲突、留空、版本冲突和刷新恢复可验收 |
| 上传任务 | 对多个物理文件建立独立会话并受全局并发上限调度；列表、筛选、暂停、重选、续传和恢复 | 每物理文件一个上传会话、分片协议、服务端校验、Asset 绑定和项目状态归约 | PostgreSQL 持有会话/分片/绑定/状态；对象存储持有字节；浏览器持有当前 `File` 和本机暂停 | 当前 UI：`DESIGN.md`、`docs/ui/`、仓库外原型；未来前端：`frontend/src/features/uploads/`、必要路由/模块注册、`tests/frontend/`；后端已限于 `backend/src/modules/uploads/`、`project-workflow.ts`、上传契约和测试 | `UI-M2-03` 用户验收后才解锁 `FRONT-M2-04B`；一批可选多个文件，单文件失败不阻塞其他文件，刷新只续缺失分片，完成必须来自后端 Asset 事实 |
| 统一任务中心 | `/tasks` 跨项目列表、筛选、真实进度、详情、领域动作恢复和历史；替代独立中文识别任务全局入口 | 只读聚合现有领域记录并复用领域命令；不拥有 Worker/租约/重试策略 | PostgreSQL 各领域 Dispatch/Batch/Run/Job/Attempt；无通用任务表，队列和浏览器均非状态源 | `frontend/src/features/tasks/`、`backend/src/modules/tasks/`、`packages/contracts/src/tasks.ts`、对应测试；移除旧 `/asr-dispatches` 页面入口 | `M3-unified-task-center.md`、INT-09；UI/BACK 可并行，FRONT 等待双审；上传与管理员任务严格隔离 |
| 术语 | 候选审核、全部采用、版本确认、模板管理和导出 | 候选、人工状态、不可变版本、证据、提取运行、公司级不可变模板版本和导出 | PostgreSQL 草稿、人工事件、术语版本与导出模板版本；模型输出和浏览器表格都不是权威 | `frontend/src/features/terms/`、`backend/src/modules/terms/`、`packages/contracts/src/terms.ts`、必要的 SRT Asset 只读边界及对应测试 | `docs/contracts/M3-terms-workflow.md` 已确认；UI、术语后端和模板后端分别通过规划审核后才解锁前端；模板首版只改五字段表头/顺序，不改变术语数据；S1 不吸纳 ASR/OCR/视频播放器/任务中心 |
| 中文识别 | 项目内双门禁/批次/逐集详情；项目中心多选；全局 Dispatch 汇总；热词证据和员工用量 | 批次/逐集/尝试/不可变结果、DispatchGroup、数据库租约 Worker、公平调度、确定性 fake、热词回执、Usage、幂等和恢复 | PostgreSQL Dispatch/批次/任务/尝试/结果/热词摘要/用量；消息队列与浏览器都不是业务状态源 | UI：`DESIGN.md`、`docs/ui/`、仓库外原型；后端：`backend/src/modules/asr/`、`backend/src/workers/`、`packages/contracts/src/asr.ts`、必要迁移与测试；前端：`frontend/src/features/asr/`、项目中心/任务中心受控入口和对应测试 | `M3-asr-batch.md` 与 `M3-asr-bulk-dispatch.md` 已确认；Wave A 先解锁单剧前端，Wave B 再接多剧。上传任务不运行 ASR；真实供应商、密钥和付费另行授权 |
| 画面字 | 项目内范围发起、逐集状态、候选/截图/视频证据、筛选排序、批量裁决、文字/时间/分类/位置编辑、明确空集和版本下载 | OCR 批次/Job/Attempt、租约 Worker、Adapter Registry、抽帧/去重证据、候选/不可变原始事实、人工事件、草稿、不可变 Release/SRT 和固定术语投影 | PostgreSQL 批次/作业/尝试/候选/事件/草稿/版本；对象存储保存视频与派生截图；浏览器只持未提交表单 | UI：`DESIGN.md`、`docs/ui/`、仓库外原型；后端：`backend/src/modules/screen-text/`、`backend/src/workers/`、必要迁移、`packages/contracts/src/screen-text.ts` 与后端测试；前端：`frontend/src/features/screen-text/`、受控路由/模块注册与前端测试 | `M3-screen-text-workflow.md` 已确认；UI 与零网络后端可受控并行，前端等待 UI 用户验收和后端规划验收。术语版本与 `screen_video` Asset 双门禁；真实 API/密钥/付费和管理员控制另行授权 |
| 前置审改 | 双源对照、基准覆盖、人工裁决/撤销、逐集导航、格式问题与 MP4 证据定位 | 固定来源会话、确定性对齐、决定事件、并发控制、完成门禁、不可变待验收修订和确定性 SRT | PostgreSQL 会话/对齐/决定事件/release；公司稿、ASR 原文和视频 Asset 只读 | UI：`DESIGN.md`、`docs/ui/`、仓库外原型；后端：`backend/src/modules/pre-review/`、`backend/src/workers/`、必要迁移、`packages/contracts/src/pre-review.ts` 与后端测试；前端：`frontend/src/features/pre-review/`、受控路由/模块注册与前端测试 | `M3-pre-edit-workbench.md` 已确认；UI 与后端分别通过规划审核后才解锁前端。唯一采纳稿可追溯，人工决定不被批量覆盖，发布不覆盖原始来源；OCR、完整时间轴和最终验收不进入本任务 |
| 视频字幕验收 | 项目上下文/会话恢复、历史只读、视频/时间轴、双轨轻量编辑、问题、同步预检、验收、返工和交付就绪 | 固定 S3/S4 来源的验收会话、工作副本 Cue/问题/不可变事件、通过签名、返工与 ready_to_release | PostgreSQL 会话/集/Cue/问题/事件/返工/通过签名；`PreEditRelease`、可选 `ScreenTextRelease` 和视频 Asset 只读冻结；浏览器只持未提交表单/选择 | `frontend/src/features/subtitle-acceptance/`、`backend/src/modules/subtitle-acceptance/`、`packages/contracts/src/subtitle-acceptance.ts`、对应前后端测试 | `M3-subtitle-acceptance-workbench.md` 与 `INT-07` 已确认。S5 只交接交付就绪事实；后台 AcceptanceRelease 由 S7 单一生成事务固定，不在工作台另做“冻结”步骤 |
| 交付确认与产品库 | 独立完整确认页、生成成功转场、全局列表和详情 | 当前验收会话 + 术语版本生成不可变 AcceptanceRelease、DeliveryProduct、Manifest 和正式文件；元数据可更新，文件不可更新 | PostgreSQL 产品/来源/清单/Attempt/状态为唯一权威；对象存储保存不可变字节；浏览器只持确认表单 | `frontend/src/features/deliveries/`、`backend/src/modules/deliveries/`、`packages/contracts/src/deliveries.ts`、必要迁移与测试；模块注册增加全局 `deliveries` | `M3-delivery-product-workflow.md` 与 `INT-08` 已确认；每集双 SRT，空画面字生成合法空文件；外部总库、管理员批准与真实云资源另立任务 |
| 回收站 | 后续恢复入口和清理状态 | 生命周期命令、租约 Worker、审计和孤儿核对 | PostgreSQL 生命周期/清理任务 + 对象存储核对结果 | 后续 `frontend/src/features/recycle/`、`backend/src/modules/recycle/`、对应契约/迁移/测试 | 48 小时内可恢复；失败不得伪装已删除 |
| 系统控制台运行总览 | 独立 ControlShell 总览、状态、趋势、异常和诊断跳转；不复用员工 AppShell | 管理 API 独立授权边界；只读聚合 ASR/OCR/Delivery Job、Attempt、Usage 与已知运行摘要 | PostgreSQL 领域 Job/Attempt/Usage/Delivery/Asset 事实；未来监控适配器；浏览器不拥有健康或费用状态 | `UI-SYSTEM-01`、`BACK-SYSTEM-02A`、`FRONT-SYSTEM-02B`、`BACK-SYSTEM-02C`、`TEST-SYSTEM-02`；正式目录为 `system-frontend/`、`backend/src/modules/system-control/`、`packages/contracts/src/system-control.ts` | `SYSTEM-control-shell-runtime.md`、`INT-12/13` 已关闭本地纵向链；真实 Cloudflare、服务器遥测和控制写命令后置 |
| 系统控制台服务器与运行环境 | `/servers` 环境/资源清单、详情、运行池事实、遥测状态与现有配置页面深链 | 只读运行投影、可注入 `RuntimeTelemetryProvider`、逐请求 runtime 权限；不拥有 Worker 调控状态 | PostgreSQL 领域 Job/Attempt/lease 与 system-control 版本事实；遥测 Provider 拥有 CPU/GPU/内存/磁盘/备份摘要 | `UI-SYSTEM-06`、`BACK-SYSTEM-06A`、`FRONT-SYSTEM-06C`、`TEST-SYSTEM-06`；`system-frontend/` 与 system-control 契约/模块的允许切片 | `SYSTEM-runtime-observability.md`、`INT-11/12/13`；无 Provider 时明确 unknown/not_configured，真实 Agent/云写操作后置 |
| 系统控制台日志与质量 | `/logs` 服务端搜索筛选排序分页、运行详情、版本/费用/质量/错误追踪和深链 | 跨领域有界只读投影；逐请求 logs 权限；不复制领域状态或普通日志全文 | ASR/OCR/Delivery/control-plane Job/Attempt/Usage/命令事实；原始内容仍归各领域与对象存储 | `UI-SYSTEM-06`、`BACK-SYSTEM-06B`、`FRONT-SYSTEM-06C`、`TEST-SYSTEM-06`；共享契约与 system-control 只读模块 | `SYSTEM-runtime-observability.md`、`INT-12/13/15/17`；首版不做日志文件导出、诊断正文或第二日志数据库 |
| 系统控制台引擎/API 与安全配置发布 | `/engines` 部署/版本/连接测试、`/routing` 主备与分池容量、`/changes` 影响检查/发布/回滚；不复用员工 AppShell | 已注册 Adapter 的部署版本、零网络测试运行、路由/容量版本、active 指针、幂等发布/回滚与审计；新任务固定版本 | PostgreSQL 配置/命令/审计是唯一权威；后端 Adapter Registry 限制可执行实现；浏览器不持有 Secret、active 或测试结论 | `UI-SYSTEM-03`、`BACK-SYSTEM-03A/B`、`FRONT-SYSTEM-03C`、`TEST-SYSTEM-03`；`system-frontend/`、`backend/src/modules/system-control/`、`packages/contracts/src/system-control.ts` 与必要增量迁移/测试 | `SYSTEM-engine-control-plane.md`、`INT-11/12/13`；真实供应商/网络/密钥/付费、预算、学习、服务器和部署均后置 |
| 系统控制台有序执行路由与安全兜底 | `/routing` 有序目标、容量和安全前进规则，`/engines` 操作员启停，`/changes` 发布/恢复，`/logs` Attempt 链；员工站无配置入口 | 不可变 RoutingTarget、固定 routeDigest、逐目标 Attempt、只追加 RoutingAdvanceEvent、安全失败分类、unknown 对账停止与逐 Attempt 预算 | PostgreSQL 路由版本/目标/active/Job/Attempt/预算/事件为唯一权威；Adapter 只报告结构化副作用事实，浏览器不选择下一厂商 | `UI-SYSTEM-09`、`BACK-SYSTEM-09A/B`、`FRONT-SYSTEM-09C`、后继术语/表格 Wave、`TEST-SYSTEM-09`；替换 SYSTEM-03 的新写主备/单部署选择路径 | `SYSTEM-ordered-execution-routing.md`、`INT-11/12/13/15/16/17`；真实 FunASR/PaddleOCR/云厂商、Secret、网络、模型安装、付费与部署仍走授权门 |
| 系统控制台预算、限额与付费调用安全门 | `/budgets` 策略摘要、精确用量/预留/待对账、版本详情、影响检查、发布和回滚；全部主金额统一 CNY，并发/队列只链接 `/routing` | 不可变预算版本/active、原币种报价 + 固定换算快照、CNY 预留/结算、未知占用、硬阻断、幂等命令和审计；ASR/OCR 零网络 cloud stub 进入相同 admission | PostgreSQL 策略/指针/换算快照/预留/结算/命令/审计与领域 Attempt/Usage；原币种和 CNY 金额均用 numeric/十进制字符串，浏览器不拥有汇率、额度或阻断结论 | 基线 `UI-SYSTEM-04`、`BACK-SYSTEM-04A/C`、`FRONT-SYSTEM-04B`、`TEST-SYSTEM-04` 已关闭；后继 `BACK-SYSTEM-04D`、`FRONT-SYSTEM-04E`、`TEST-SYSTEM-04CNY` 在 SYSTEM-05 后串行 | `SYSTEM-budget-guardrails.md`、`SYSTEM-cny-cost-normalization.md`、`INT-11/12/13/15/17`；真实供应商、Secret、网络、付费、真实汇率、发票和云部署均后置 |
| 系统控制台密钥与安全引用 | `/security` 服务端发现引用、状态/版本/使用位置、验证历史、轮换/撤销保护与 Access 就绪摘要；员工站无入口 | 稳定 SecretReference、不可变版本、零网络验证 Job/Attempt、幂等命令、只追加审计；引擎版本只绑定已发现引用版本 | Secret 值/内部句柄属于部署环境 Provider；PostgreSQL 只存身份、摘要、状态和关系；浏览器不接触 Secret 值或任意引用 | `PLAN-SYSTEM-05`、`UI-SYSTEM-05`、`BACK-SYSTEM-05A`、后继 `FRONT-SYSTEM-05B`、`TEST-SYSTEM-05`；沿用 ControlShell、管理权限域和引擎控制平面 | `SYSTEM-secret-security-readiness.md`、`INT-11/13/15/16`；真实 Vault/Cloudflare/供应商网络/付费/部署仍需单独授权 |
| 测试反馈与错误观测 | 两站低干扰“反馈问题”入口；控制台 `/feedback` 列表、详情、不可变流转历史与重新打开 | 稳定反馈/事件身份、显式截图附件、逐请求权限、脱敏上下文、requestId 关联与未来外部观测适配 | PostgreSQL FeedbackReport/Event 是反馈权威；对象存储保存用户确认的截图；领域日志/Sentry只作诊断来源，不拥有反馈状态 | `PLAN-SYSTEM-08`、`UI-SYSTEM-08`、`BACK-SYSTEM-08A`、后继 `FRONT-SYSTEM-08B`、`TEST-SYSTEM-08`；员工 `frontend/` 与管理员 `system-frontend/` 共同消费单一反馈契约 | `SYSTEM-test-feedback-observability.md`、`INT-18`；不做测试清单/会话录像/自动截图，真实 COS/Sentry/部署另行授权 |
| 跨模块全链测试与质量门 | 不新增员工功能；按正式页面验证端到端流程 | 不新增业务状态；只通过正式 API/Worker/PostgreSQL 读取和驱动已冻结能力 | 正式 PostgreSQL/对象存储抽象为业务权威，隔离测试数据与证据报告只用于验收 | `tests/integration/`、`tests/e2e/`、`docs/testing/`、任务允许的状态/日志和仓库外证据；禁止直接改生产前后端、迁移、契约或 DESIGN | 独立 `TEST-*` 任务；原始素材只读、精确隔离与清理；缺陷只交规划归因，返工后回到原测试任务定向复验；测试通过不自行关闭切片 |

## 4. 多素材上传的唯一数据解释

- 用户一次多选文件或选择文件夹后，前端按“唯一物理文件”建立多条上传会话并在集中并发上限内并行推进。这里的“批次”只是按项目与清单版本形成的展示投影，不新增第二套业务状态。
- 每个物理文件仍由一个后端 `UploadSession` 独立持有状态、已确认分片、错误和恢复动作。批次总进度由这些后端事实只读汇总，不能反向修改单文件状态。
- 同一集的中文识别视频和画面字视频若引用同一 MP4，只建立一个会话、上传一次并绑定同一 Asset；页面显示两个素材角色标签，但不复制队列行。
- 批量操作只展开为对选中会话逐项执行的现有命令。局部失败必须逐项回显，不得使用一个“批次成功/失败”覆盖真实单文件结果。

## 5. 本次跨角色边界审查结论

- **UI**：Rev 9 把项目工作台流程标签放入上传页，属于范围越界；三版视觉稿作废，按本矩阵重做。
- **前端**：当前没有正式上传页。`frontend/src/modules.ts` 中术语、中文识别和画面字仅为 `planned` 项目模块，未注册路由且未由 AppShell 展示；它们不是上传页实现。本次无需修改生产前端。
- **后端**：当前生产模块只有项目、素材清单和上传。`asr_video`、`screen_video` 只是素材角色与 Asset 绑定目标，没有 ASR/OCR 执行接口、供应商调用或任务中心。本次无需返工已验收后端。
- **前端下一任务**：`FRONT-M2-04B` 继续阻塞，只能在修正版 `UI-M2-03` 经用户验收后实现本矩阵“上传任务”一行，不得顺带注册或实现任何后续业务模块。

## 6. 任务门禁

任何新任务进入 `ready` 前必须指向本矩阵的一行和 `MODULE_INTEGRATION_CONTRACTS.md` 的至少一个 `INT-*`，并在任务差量包写清 UI 内容、允许目录、数据权威、上游产物、下游冻结字段、失效规则、非目标和验收。若一个任务同时命中两行且两部分可独立失败，必须拆成两个任务；展示一个未来入口不构成实现该模块的授权。

## 7. S4 画面字边界审查结论

- **上传**只提供已经绑定的 `screen_video` Asset；同一 MP4 与 ASR 共享时仍只上传一次，不在上传页发起 OCR。
- **术语**只提供不可变 `TermVersion` 和可验证的引擎提示投影，不在画面字页面修改术语。
- **画面字**拥有 OCR 批次、候选、证据、人工决定、时间修正和画面字 Release；它不拥有台词审改或最终验收状态。
- **前置审改**继续只处理公司 SRT 与 ASR。画面字 Release 与待验收台词 Release 在后续字幕验收阶段合并，不回开 S3 页面承载 OCR。
- **员工页与管理员页**分离：员工只发起范围、处理候选和查看业务用量；供应商、模型、密钥、并发、费用和抽帧策略只留未来系统控制台。
