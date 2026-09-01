# 模块衔接与版本失效契约

状态：规划权威基线 v1  
适用范围：项目中心、素材与上传、术语、ASR、画面字、前置审改、字幕验收、交付产品库、任务中心、回收生命周期、系统控制台和两站生产接入。

## 1. 本文件解决什么

`MODULE_RESPONSIBILITY_MATRIX.md` 规定每个模块内部负责什么；本文件规定相邻模块之间交付什么、何时可以消费、来源变化如何失效以及如何验收。任何新功能不得只证明“自己的页面能打开”或“自己的接口能返回”，还必须证明它与直接上游和下游的衔接没有建立第二套状态。

模块衔接只通过 PostgreSQL 中的不可变身份、版本、摘要和正式 API 完成，不通过聊天记忆、前端缓存、文件名猜测或复制数据完成。上游变化不得静默覆盖下游结果；下游必须保留旧版本只读证据，并显式进入 `stale`、`outdated`、`blocked` 或重新创建流程。

## 2. 每个模块任务必备的“衔接卡”

规划在任务进入 UI/后端/前端实现前，必须为它填写以下字段。已有合同可直接引用章节，不重复抄全文。

| 字段 | 必填内容 |
| --- | --- |
| 衔接 ID | 稳定编号，例如 `INT-06` |
| 用户路径 | 用户从哪个模块的什么动作进入下一个模块 |
| 上游权威产物 | 表/实体、不可变 ID、版本或摘要、必须满足的状态 |
| 下游消费方式 | 正式读取 API、创建命令和冻结到下游的字段 |
| 状态所有者 | 哪个模块拥有业务状态；浏览器和队列不得成为所有者 |
| 失效规则 | 上游内容、版本、素材或项目生命周期变化时，下游如何只读、阻塞或重建 |
| 幂等与未知结果 | 命令身份、允许重放条件、未知结果恢复入口、禁止重复付费/重复发布边界 |
| 命令恢复读取 | 稳定资源 ID、稳定命令 ID、`Idempotency-Key`、规范化请求摘要，以及刷新/重启后按同一身份 GET 的正式入口 |
| UI 衔接 | 入口、门禁、返回路径、来源版本和失败原因如何显示 |
| 旧路径清理 | 本切片必须删除的旧契约、路由、服务/仓储、前端调用、默认选择、fallback 和旧测试 |
| 迁移初始数据 | 空库迁移后的业务行预期；默认应为零，确需 bootstrap 时必须另有授权、回滚和删除验收 |
| 测试隔离 | 精确隔离数据库/事务命名空间、数据库时间基准、清理对象和可重复运行策略 |
| 公共 UI 原语 | 复用的 dialog/drawer/async recovery/table/media 组件，以及 1440/1024 几何与焦点合同 |
| 验收证据 | 至少一个跨边界正常流、一个失效/阻塞流、一个刷新恢复流 |
| 明确非目标 | 本次不属于哪一个相邻模块，避免功能吸纳 |

任一字段缺失时，依赖该边界的生产任务保持 `blocked`。UI 示例数据不能代替上游产物；后端表存在也不能代替下游可发现的读取契约。

## 3. 当前主链衔接表

| ID | 上游 → 下游 | 上游权威产物与就绪条件 | 下游冻结/消费 | 失效与恢复 | 当前合同 / 状态 |
| --- | --- | --- | --- | --- | --- |
| `INT-01` | 项目中心 → 概览与素材 | `projectId`，项目必须为 `active` | 项目路由只携带 `projectId`；素材模块读取该项目最新清单 | `recycled/purging` 时全部业务写锁，返回项目中心或回收站恢复 | `M2-upload-lifecycle.md`；已实现 |
| `INT-02` | 素材清单 → 上传任务 | 已确认 `MaterialManifest` 的版本、每集角色和唯一物理文件身份 | 上传按唯一物理文件建会话；同一 MP4 的 ASR/画面字双角色共享一个 Asset | 清单换版不篡改旧上传；新清单只补缺失物理文件并重新绑定 | `MODULE_RESPONSIBILITY_MATRIX.md` §4；已实现 |
| `INT-03` | 上传/Asset → 术语 | 最新已确认公司 SRT Asset 全部 ready，内容摘要稳定 | 术语草稿和提取运行固定公司 SRT 集合摘要 | 公司 SRT 变化使旧草稿/候选来源过期；旧术语版本保持不可变可查 | `M3-terms-workflow.md`；已实现 |
| `INT-04` | 术语 + 视频素材 → ASR | 不可变 `TermVersion`；目标集 `asr_video` Asset 已校验 | ASR 批次固定 `termVersionId`、热词投影摘要、素材身份和适配器配置摘要 | 术语或素材换版不改旧结果；新批次显式重跑，旧结果标记过期/只读 | `M3-asr-batch.md`、`M3-asr-bulk-dispatch.md`；已实现零网络闭环 |
| `INT-05` | 公司 SRT + ASR + 术语 + 视频 → 前置审改 | 公司 SRT 集合、不可变 ASR Result、`TermVersion`、每集可用视频 Asset | 审改会话固定所有来源身份，生成唯一采纳稿和不可变 `PreEditRelease` | 任一来源变化使会话/发布失效或有限审改；人工决定不被新建议覆盖 | `M3-pre-edit-workbench.md`；已实现 |
| `INT-06` | 术语 + 画面字视频 → 画面字 | 不可变 `TermVersion`；目标集 `screen_video` Asset 已校验 | OCR 批次固定术语/素材/抽帧配置，发布不可变 `ScreenTextRelease` | 术语、视频或来源换版使旧草稿只读；从新来源创建新批次 | `M3-screen-text-workflow.md`；已实现零网络闭环 |
| `INT-07` | 前置审改 + 画面字 + 视频 → 字幕验收 | 必选不可变 `PreEditRelease`；可选 `ScreenTextRelease`；每集冻结可播放视频 Asset | 验收会话固定 S3/S4 来源和视频选择，工作副本保存轻量编辑、问题、通过签名与整剧交付就绪事实 | 来源变化进入 `stale`；历史只读但证据可查；从明确新来源创建新会话 | `M3-subtitle-acceptance-workbench.md`、`M3-subtitle-acceptance-parity-audit.md`；S5 不直接创建交付产品 |
| `INT-08` | 字幕验收 + 术语 → 交付确认与产品库 | 当前 `ready_to_release` 验收会话、对应不可变术语/模板版本、稳定 `deliveryId` | 一次幂等命令原子固定 `AcceptanceRelease + DeliveryProduct + DeliveryManifest`，随后生成每集台词/画面字 SRT 与术语 XLSX；空画面字仍生成空 SRT | 未知结果只按同一 `deliveryId` 读取；生成失败恢复同一产品；上游变化不覆盖旧交付；内容修改必须新建 V2；外部总库另立命令 | `M3-delivery-product-workflow.md` 已确认；UI 先冻结完整确认页、全局产品库和详情，再解锁后端/前端 |
| `INT-09` | ASR/OCR/术语/审改准备/交付 → 统一任务中心 | 各领域现有 Dispatch/Batch/Run/Job/Attempt 与 `taskType + resourceId`；Dispatch 已含子批次时不重复列子项 | `/tasks` 只读聚合并调用领域已有取消/恢复命令；复杂重试返回对应工作台 | 不建通用任务表；队列不拥有状态；刷新从 PostgreSQL 恢复；unknown 只读同一身份；不反写人工工作台 | `M3-unified-task-center.md` 已冻结；UI 与后端可并行，前端等待双审通过 |
| `INT-10` | 项目生命周期 → 全部业务模块 | `active/recycled/purging` 与清理 Job 状态 | 所有写命令在事务内重验项目生命周期；员工页显示同一门禁原因 | 恢复项目后重新读取；清理中/已清理不得靠前端缓存继续写 | `M2-upload-lifecycle.md` 回收章节；横切规则已实现，后续模块持续回归 |
| `INT-11` | 系统控制台配置 → ASR/OCR/AI Worker | 不可变引擎部署、有序路由目标、并发、预算、规则/提示词版本及唯一 `active` 指针 | 新任务创建时固定 routingVersion/routeDigest；每个 Attempt 固定实际 target/deployment，Worker 只按服务端顺序与安全失败事实前进，不读取浏览器设置 | 配置换版只影响新任务；历史 Attempt 保留旧版本；未知发布保持旧指针，供应商 unknown 保持原目标并只查询同 providerRequestId | `SYSTEM-engine-control-plane.md` 保留 SYSTEM-03 历史；`SYSTEM-ordered-execution-routing.md` 负责把新写主备/单部署选择升级为有序目标链；预算/Secret/真实供应商分别受 INT-15/16 和授权门约束 |
| `INT-12` | ASR/OCR/导出 Attempt 与运行环境 → 系统控制台 | 领域 Job/Attempt/Usage、请求标识、对账状态、队列/Worker/存储健康摘要 | 控制台只读聚合，按项目/供应商/模型/日期查询；控制动作仍调用领域命令 | 指标缺失显示未知/待对账，不推算为零；控制台刷新从 PostgreSQL/监控摘要恢复 | `SYSTEM-control-shell-runtime.md` 已关闭四池总览；`SYSTEM-runtime-observability.md` 负责服务器/Worker 详情、受控遥测 Provider 与统一运行日志，不新增第二控制状态 |
| `INT-13` | 外部身份入口 → 员工站/控制台/API 权限域 | 两个 Cloudflare Access Application、不同 audience、稳定身份和有效 JWT | 员工站只访问业务 API；控制台只允许所有者身份访问管理 API；Worker 使用独立服务凭据 | audience/issuer/签名/过期任一不符即拒绝；隐藏 URL 或同源部署不能绕过授权 | SYSTEM-02 已完成逐请求默认拒绝和两站本地集成验证；真实 Cloudflare JWT/部署仍未实现 |
| `INT-14` | 人工编辑事件 → 管理员策略与学习中心 | 不可变事件、来源摘要、系统建议、人工决定、规则/模型版本和证据索引 | Wave A 只读安全投影与不可变草稿；Wave B 按固定快照生成候选/评测；Wave C 人工批准、发布和回滚 | 不复制完整正文事件表；单条事件不得直接上线；失败不改 active；回滚恢复上一版本且保留审计 | `SYSTEM-policy-learning.md`；Wave A/B 已关闭，Wave C 首模块“前置审改严格结构化本地规则”启动包待用户确认，未解锁生产实现 |
| `INT-15` | 预算策略 + 引擎报价 → 付费 Attempt/Usage | active `BudgetPolicyVersion`、部署版本的付费分类、调用前中立上限报价、现有结算与预留 | 新付费 Attempt 在任何外部副作用前固定预算版本并持久预留；完成后按最终 Usage 结算 | 提醒只告警；硬线阻断新预留但不杀运行中请求；unknown/需对账保留占用且不补零；换版只影响新 Attempt | `SYSTEM-budget-guardrails.md`；SYSTEM-04 只用零网络 cloud stub 关闭安全门，真实付费另行授权 |
| `INT-16` | 服务器 Secret Provider → 引擎部署版本 | 服务端发现候选、稳定 `SecretReference`、不可变 `SecretReferenceVersion`、脱敏摘要、验证状态与内部 Provider 句柄 | 管理员只能选择服务端已发现且匹配的引用版本；EngineDeploymentVersion 固定引用版本身份，Worker 在内部解析，不向浏览器/日志暴露值或句柄 | Provider 不可用/unknown 不自动换绑；轮换不改历史；撤销受 active 路由与非终态任务保护；缺 Secret 与预算阻断分别处理 | `SYSTEM-secret-security-readiness.md`；SYSTEM-05 先用零网络 Provider 关闭安全引用链，真实 Secret/网络另行授权 |
| `INT-17` | 厂商原币种报价 + 换算快照 → CNY 预算与费用 | 不可变原币种报价、服务端 `CostConversionSnapshot`、精确十进制汇率和有效期 | 新付费 Attempt 在外部副作用前固定换算快照，将上限报价归一为 CNY 后预留；最终 Usage 同时保留原币种审计和 CNY 账本金额 | 缺失/过期/unknown 快照稳定阻断且不补零；换算版本只影响新 Attempt；浏览器不计算汇率 | `SYSTEM-cny-cost-normalization.md`；零网络 CNY 纵向链已关闭，真实汇率网络另行授权 |
| `INT-18` | 员工站/控制台页面与运行错误 → 测试反馈与错误观测中心 | 已验证主体/audience、surface、routeTemplate、buildVersion、项目/任务稳定身份、脱敏 requestId/性能摘要；截图必须由用户显式确认 | PostgreSQL 固定 FeedbackReport 与只追加 FeedbackEvent；管理员 `/feedback` 查询/流转；对象存储只保存已确认附件；未来 Sentry 只按同一 requestId 关联 | 项目回收、日志轮转或反馈关闭不得删除反馈/事件历史；unknown 只 GET 同一反馈/事件；Sentry/日志失败不伪装反馈丢失或改状态 | `SYSTEM-test-feedback-observability.md`；不建测试清单/会话录像/第二日志库，真实 COS/Sentry/部署另行授权 |

## 4. 版本与失效传播

| 上游变化 | 不允许的行为 | 下游必须发生的行为 |
| --- | --- | --- |
| 公司 SRT 内容或集合摘要变化 | 原地改写术语草稿、ASR 或前置审改结果 | 新建来源版本；旧草稿/结果保留证据并标记过期或失效 |
| `TermVersion` 变化 | 宣称历史 ASR/OCR 已使用新热词 | 历史批次继续绑定旧版本；按受影响集或整剧显式重跑 |
| 视频 Asset/素材清单变化 | 用同文件名猜测仍是同一素材 | 重新校验 Asset/摘要/集数绑定；依赖会话进入 stale/blocked |
| `PreEditRelease` 或 `ScreenTextRelease` 变化 | 在已有验收工作副本中静默替换来源 | 创建新验收会话；旧会话只读并保留工作副本与问题记录 |
| `AcceptanceRelease` 变化 | 覆盖已经归档或已下载的交付物 | 新建交付版本/产品记录；旧交付保持不可变可追踪 |
| 项目进入回收或清理 | 仅在页面禁用按钮但后端仍写入 | 每个领域写命令事务内拒绝；恢复后重新读取权威事实 |

## 5. 开发前衔接预检

规划解锁一个新纵向切片前，必须完成一次“模块衔接预检”，并把结果放入任务差量包：

1. 指向 `MODULE_RESPONSIBILITY_MATRIX.md` 的模块行和本文件的一个或多个 `INT-*`。
2. 列出上游真实 ID/版本/摘要、下游将冻结的字段和唯一状态所有者。
3. 对照共享契约，确认 UI 每个状态都有正式字段或明确为未来状态，并指定复用的公共 dialog/drawer/async recovery/table/media 原语和 1440/1024 几何合同。
4. 写清正常、失效、刷新恢复和未知结果四条状态转换；不存在的状态说明原因。异步写命令必须采用稳定资源 ID + 稳定命令 ID + `Idempotency-Key` + 规范化请求摘要，未知只 GET 同一身份。
5. 列出本切片必须删除的旧契约、旧路由、旧调用、default/static/bootstrap/nullable-version fallback 和旧测试；历史只读例外必须有产品依据。
6. 写明空库迁移后的业务行预期、隔离数据库/事务命名空间、一次数据库时间基准和精确清理范围。
7. 指定一个跨模块集成回归，证明下游读到的是上游正式产物而非测试常量或前端推算；另覆盖同键重放、异参冲突和刷新/重启恢复。
8. 指定返回路径和下一模块门禁，避免页面成为孤岛。

预检发现缺口时，先补最小规划/后端/UI 输入，再解锁生产前端；不得在前端实现中临时复制状态或静默删入口。

## 6. 关闭门

模块内部测试通过不等于纵向切片完成。规划关闭切片时至少核对：

- 上游不可变产物可以从正式 API 被下游发现和选择；
- 下游保存了来源 ID/版本/摘要，刷新后仍能恢复；
- 上游变化会触发合同规定的 stale/outdated/blocked，而不是覆盖；
- 返回上游、进入下游和失败恢复路径均可发现；
- 完整浏览器矩阵在该切片只运行一次，返工只复验变化场景；
- 一个跨模块正常流和一个失效流已形成可重复证据。
- 所有写命令符合统一身份协议；未知结果仅按同一资源/命令读取，失败或未知不移动旧 active；刷新和进程重启均可恢复。
- 被替代的旧写契约、路由、前端调用和旧测试静态扫描为零；新写路径不存在 default/static/bootstrap/nullable-version fallback 或第二状态源。
- 从空库执行全部迁移后业务初始行符合衔接卡预期，新写记录持久化必需来源/路由/部署/模板/发布版本 ID；测试使用隔离数据库和单一数据库时间基准，结束残留为零。
- 重复交互使用已登记的公共 UI 原语；1440/1024 根页面无横向溢出，宽表只在自身容器内滚动，异步错误/未知/成功焦点闭环形成证据。
- 正式 `TEST-*` 报告已经证明所测链路使用上游真实 ID/版本/摘要，全部缺陷均经规划归因，临时数据库、对象和服务已按精确清单清理。

未满足上述任一项时，只能关闭模块内部任务，不能宣称整条业务链已经打通。
