# UI-SYSTEM-01 Rev 2 · ControlShell 设计验收

状态：`review`
Owner：UI 设计对话
Reviewer：规划对话
权威输入：`docs/contracts/SYSTEM_CONTROL_CENTER.md`、责任矩阵的系统控制台边界、`INT-11 / INT-12 / INT-14`、`PRODUCT.md`、`DESIGN.md` 5.11
唯一原型：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\ui-system-01-control-shell\index.html`

## 1. 结论与范围

本轮已把用户确认的“日间控制舱”方向收敛为同一套独立管理员 `ControlShell`：系统总览、五个完整详情方向和四个补充一级入口均在一个可操作原型中贯通。视觉只保留冷灰白画布、深石墨蓝侧栏/系统运行带与 `#4458D8` 主动作；没有 B/C、主题切换、员工 `AppShell`、营销大屏或管理员配置墙。

本轮是设计交接，不代表生产功能已实现。未修改生产 frontend/backend、迁移或共享 contracts，未连接真实 API、密钥、云资源、购买、部署或付费能力。

## 2. 全局信息架构与页面职责

| 一级页面 | 本轮形态 | 未来真实数据源 | 允许操作 | 非目标 |
| --- | --- | --- | --- | --- |
| 系统总览 | 完整 | PostgreSQL Job/Attempt/Usage/active 版本；Worker/队列/存储监控摘要 | 刷新、搜索、进详情 | 直接改配置、裸服务器命令、展示 Secret |
| 引擎与 API | 完整 | EngineDeployment、Adapter Registry、SecretReference 状态、测试 Attempt | 登记、停用、连接/样本测试、进版本详情 | 明文密钥、测试自动发布、员工任意选厂商 |
| 路由与调度 | 完整 | RouteVersion、PoolLimitVersion、active 指针、排队/领取事实 | 建草稿、测试、影响检查、发布、回滚 | 终止运行请求、未知自动重试、跨池复用限额 |
| 服务器与运行环境 | 完整 | Worker lease/heartbeat、监控摘要、PostgreSQL/对象存储/备份健康 | 安全暂停/恢复新任务、看健康、外部监控深链 | SSH、任意命令、删除/购买服务器、防火墙 |
| 日志与质量 | 完整 | Attempt/Usage、供应商请求标识、最终对账和质量摘要 | 搜索、筛选、详情、脱敏导出、领域恢复 | 原始视频、完整字幕/提示词/热词、员工用量复制 |
| 变更与审计 | 完整高风险链 | ConfigVersion、测试 Attempt、ImpactCheck、PublishCommand、active 指针、AuditEvent | 草稿、测试、影响检查、确认发布、查询未知、回滚 | 覆盖 active、浏览器判成功、删除失败版本 |
| 策略与学习 | 一致骨架 | INT-14 人工事件、规则/提示词版本、评测报告 | 草稿、离线评测、小流量测试、批准、发布、回滚 | 单事件上线、跨项目正文、未授权训练 |
| 预算与限额 | 一致骨架 | Usage/Attempt、预算版本、供应商配额回执、active 指针 | 创建版本、影响检查、定时生效、硬阻断确认、回滚 | 费用未知记零、提醒冒充硬上限、前端本地限额 |
| 密钥与安全 | 一致骨架 | SecretReference 元数据、连接测试、Access audience 摘要、审计 | 绑定引用、连接测试、轮换提示、访问状态 | 明文密钥、人的邮箱会话、两站 audience 混用 |

上表是跨角色设计交接矩阵，只在 DESIGN/验收材料中逐页记录“未来真实数据源 / 允许操作 / 非目标”，生产页面和最终预览均不可见；当前导航唯一使用 `aria-current="page"`。`INT-11`、`INT-12`、`INT-14` 分别映射配置到 Worker、Attempt/Usage/运行环境到控制台、人工事件到策略学习，浏览器不新增状态所有者。

## 3. 系统总览结构

1. 顶栏：内部测试环境、整体状态、刷新与最近刷新、自动刷新、待发布变化、全局搜索、告警、管理员身份。
2. 深色系统运行带：ASR API、OCR API、OCR 自建 Worker、交付生成四池；逐池包含状态、排队、运行、吞吐/占用、今日错误、预算/用量、配置版本和是否接收新任务。
3. 运行指标：今日处理、已处理、当前运行、失败、需对账、今日调用费用、本月预算、存储使用。
4. 趋势：任务吞吐、队列积压、ASR/OCR 调用费用三类事实。1440 三图并列；1024 单主图加三个指标切换。
5. 异常队列：按严重度/时间/影响排序；每行一个蓝色主动作，查看详情降为次动作。
6. 待发布配置：只展示差异、风险/影响和下一安全动作；完整阶段进入变更详情。
7. 最近审计：展示发布/回滚、操作者、时间、版本和结果，不允许覆盖历史。

原型的匿名值只用于布局/状态验收，由顶栏唯一“示例数据 · 仅用于 UI 结构与状态验收，生产禁止使用”标识统一覆盖；页面其他模块不重复标记。生产禁止把这些数字、曲线、状态或 requestId 写成常量。

## 4. 状态与恢复矩阵

| 场景 | 可见事实 | 唯一恢复 / 限制 | 浏览器结果 |
| --- | --- | --- | --- |
| normal | 四池正常、指标/趋势/异常/配置/审计可读 | 刷新或进详情 | 通过 |
| loading | 运行带、指标、表格保持几何的 39 个骨架位 | 禁止伪造完成数据 | 通过 |
| empty | “当前没有待处理异常”与后续进入规则 | 无虚假异常 | 通过 |
| error | 监控摘要失败原因、`ctrl-7F2A…E91C` | 唯一“重新读取” | 通过，动作数 1 |
| unknown | PostgreSQL 事实可用，Worker 摘要缺失 | 不按 0 计算；进诊断 | 通过 |
| stale | 最后成功读取时间、数据已过期 | 唯一“重新读取”；不得暂停/发布 | 通过，动作数 1 |
| 自动刷新关闭 | 保留最后摘要、开关 `aria-checked=false` | “开启自动刷新”；管理动作前重校验 | 通过 |
| 费用待对账 | 今日调用费用与日志行明确“待对账” | 进入对账，不推算 | 通过 |
| OCR API 未启用 | 中性“未启用”、接收新任务=否 | 进入详情配置 | 通过 |
| 资源池暂停 | OCR Worker“已暂停”、接收新任务=否 | 唯一“恢复接收”；不删除队列/运行事实 | 通过 |
| 发布结果未知 | 保留 Route v1.4.2 当前生效事实与 `pub-3E9A…70D4` | 唯一“查询本次发布结果”；不重发命令 | 通过，焦点落唯一动作 |
| 回滚确认 | 回滚目标、影响范围、旧/新版本与审计语义 | 安全返回/确认回滚；不删除失败版本 | 通过 |

## 5. 高风险发布与焦点门

- 唯一阶段链为：草稿已保存 → 测试 12/12 → 影响检查 6 项目 → 确认发布 → 可回滚 v1.4.2。
- 发布前页面明确：运行中的执行记录保持原版本、需对账执行记录不自动重试、失败/未知时原生效版本保持不变。
- 生成发布确认弹窗稳定 300 ms 后，真实键盘焦点序列为 `安全返回 → Tab 确认发布 → Tab 安全返回 → Shift+Tab 确认发布`；`Escape` 关闭后回原“确认发布”。
- 提交按钮进入“提交中…”并防重复；模拟响应未知后焦点落唯一“查询本次发布结果”。人工查询后未知条消失，当前生效仍为 Route v1.4.2，未创建第二个命令语义。
- 回滚场景初始焦点同样落“安全返回”；`Escape` 关闭并回“原型场景”触发点。遮罩/非提交 Escape 可关闭，提交中禁止关闭。

## 6. 双视口与侧栏证据

| 场景 | 实测 |
| --- | --- |
| 1440×900 展开 | 侧栏 `216px`；根 `scrollWidth=clientWidth`；四资源池同一行；三趋势并列；异常与趋势同层；待发布/审计进入下一行 |
| 1440×900 收起 | 侧栏 `72px`；`aria-expanded=false`；根无横溢 |
| 1024×768 收起 | 侧栏 `72px`；主区 `942px`；四资源池 `2×2`；趋势只显示 1 个主图和 3 个切换；根无横溢 |
| 1024×768 展开 | 侧栏覆盖展开 `216px`、九个标签可见；主区不被挤压；根无横溢 |
| 1024 日志宽表 | 根 `scrollWidth=clientWidth`；`.table-wrap` 为 `overflow-x:auto`，表格宽度仅在容器内形成横滚；表头 `white-space:nowrap`，不逐字折行 |

证据目录：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\ui-system-01-control-shell\evidence\`

- `control-overview-1440.png`
- `control-overview-1024.png`
- `control-sidebar-expanded-1024.png`
- `control-logs-1024.png`
- `control-change-1440.png`
- `control-publish-dialog-1440.png`
- `control-publish-unknown-1440.png`
- `control-change-1440-rev2.png`
- `control-logs-1024-rev2.png`

控制台页面自身 `error/warn=0/0`。浏览器运行器曾报告其自身 Statsig 外连超时，不来自原型页面，未计作产品控制台日志。

## 7. Impeccable 独立设计审查

- 按技能要求执行一次 detector：`impeccable detect: DEGRADED`，原因是当前环境缺少 `htmlparser2 / css-select / css-tree / domutils`；降级为正则扫描，结果 `[]`。该结果是欠计数，不冒充完整静态审计；本轮没有运行第二次 detector。
- 当前协作协议未授权子代理，因此按 Impeccable 的 `degraded/finish-reviewer.md` 在同一任务内切换到独立 reviewer 视角，仅基于参考图、最终截图、PRODUCT、方向契约、craft floor 与原型文件完成一次收口审查。
- Reviewer 原文：`disposition: ship`；persistence=pass；fidelity 中 ControlShell 拓扑、四池运行带、指标、三趋势、异常、待发布与审计均为 match 或由 1024 明确要求支持的 acceptable adaptation；ceiling=reached；material_fixes=none。
- 完整 reviewer 记录：仓库外 `evidence/impeccable-review.txt`。需保持的核心为“深色系统运行带 + 白色精密事实区 + 单一靛蓝主动作”，生产不得稀释成卡片墙或营销大屏。

## 8. 交接门与停止条件

生产实现只能消费 PostgreSQL、监控摘要或领域命令；不得复制原型匿名值。管理端必须独立于员工 AppShell/Access audience，并遵守：

- `INT-11`：Worker 只读取已发布 active 配置，新建 Job/Attempt 固定版本；
- `INT-12`：控制台只读投影 Attempt/Usage/运行环境事实，费用未知不推算；
- `INT-14`：策略与学习只消费不可变人工事件，发布仍走版本与回滚门。

本文件进入规划审核前不解锁 FRONT/BACK；Reviewer 保持规划对话。规划若确认本设计包，再另行派发正式管理 API 与 React 切片；本 UI 任务不自行标记 done。

## 9. Rev 2 生产表达边界微收口

- Rev 1 的布局、颜色、九个一级入口、五个详情、12 类状态、1440/1024 响应式与高风险发布链全部冻结；Rev 2 只处理可见文案边界，没有重跑完整浏览器矩阵或 detector。
- “未来真实数据源 / 允许操作 / 非目标”继续完整保留在本文件第 2 节和 `DESIGN.md` 5.11，明确为规划、前后端、测试使用的设计交接注释；最终预览已移除全部 `.source-note` 工程说明卡，九个页面可见 DOM 中三类标题命中均为 0。
- 顶层 `active / Attempt / known-not-accepted` 已统一改为“当前生效 / 执行记录 / 明确未受理”；顶栏搜索从“资源、任务、requestId”改为“资源、任务、告警”。requestId 继续保留在错误原因、日志表、发布未知与审计诊断区域，没有删减失败恢复事实。
- 定向浏览器复验：九个一级页面逐页 `sourceNotes=0 / engineering=false / active=false / attempt=false`；1440 高风险详情与 1024 日志页均 `scrollWidth=clientWidth`，1024 表格继续只在 `.table-wrap` 内横滚；页面控制台 `error/warn=0/0`。
- 最小新证据为 `control-change-1440-rev2.png` 与 `control-logs-1024-rev2.png`；其余 Rev 1 证据冻结，不因纯文案微收口重复采集。

## 10. FRONT-SYSTEM-02B Rev 1 正式 React UI 终验（FIFO 160）

### 10.1 环境与结论

- 使用 `system-frontend` 新鲜 Vite production build（20 modules）、正式 Fastify system-control API、后端逐请求可注入 resolver 和精确隔离 PostgreSQL `qimao_fifo160_ui_20260816`；正式前端没有测试 header、bypass 或假 owner。
- 1440 主状态、真实字段、异步恢复、乱序保护、自动刷新、九入口、空/未知/未配置/待对账、员工站隔离和控制台均通过；1024 正式布局与数据库断连韧性发现两个 P1，另有一个 1024 趋势适配 P2。
- 终验结论：`P0=0 / P1=2 / P2=1 / P3=0`，本轮不通过，不修改生产代码；保持 `review / Current actor=规划对话`，由规划归因并定向路由。

### 10.2 完整浏览器矩阵

| 矩阵 | 新鲜正式结果 |
| --- | --- |
| 首次 loading | 通过；深色运行带、四池与指标骨架保持几何，证据 `01-loading-1440.png` |
| 首次稳定失败 / 再次失败 | 通过；真实 Fastify requestId 分别为 `ca32b6ee-…`、`dcf26ccb-…`，均只有一个“重新读取”；重读时错误动作卸载为 loading，不能重复激活 |
| 恢复成功 | 通过；匿名三项目形成四个真实池，恢复后 `H1=系统总览` 获焦；ASR 待对账、OCR API 已知费用、Worker 遥测未知、配置/预算未配置均诚实呈现 |
| 已有事实后刷新失败 | UI 通过；可恢复 SQL 查询错误返回真实 requestId `62a5e83c-…`，保留最后成功的 3 项目/2 集/待对账/3.6 KB 与唯一重读，恢复后标题重新获焦 |
| 自动刷新 | 通过；关闭后 31.2 秒请求数 0；重新打开 switch 本身不隐式发请求；“立即刷新”恰好 1 次 GET |
| 旧/乱序响应 | 通过；旧响应延迟 8000ms 后，新的 PostgreSQL 事实先把处理项目由 3 更新为 4；旧响应释放后仍为 4 |
| 真实四池与事实 | 通过；`asr_api / ocr_api / ocr_self_hosted_worker / delivery_generation` 独立；24h 趋势断点、异常、待发布空、最近审计空、unknown/not_configured/empty/pending cost 不补造 |
| 导航 | 通过；只有“系统总览”存在 `aria-current=page`，八入口 disabled；直接 `/engines` 只显示“页面未启用”，无匿名详情 |
| 1440×900 | 通过；展开 216px、收起 72px，根 `scrollWidth=clientWidth`；冷灰白/深石墨蓝/`#4458D8`、四池运行带与密度达到同状态基线 |
| 1024×768 | **失败**；根无横溢，但 `.shell-stage` 被排入 72px 首列，收起/覆盖展开两态正文均压成逐字换行；见 P1-001 |
| 1024 趋势适配 | **失败**；三个 `chart-panel` 同时纵向渲染，未实现冻结的一个主图 + 吞吐/积压/费用切换；见 P2-003 |
| 两站隔离 | 通过；员工正式 AppShell DOM 不含“系统控制台”或 ControlShell 导航，管理员构建未进入员工导航 |
| 控制台 | 通过；正式系统页 `error/warn=0/0`，员工隔离页 `error/warn=0/0` |
| 键盘 / 焦点 | 恢复成功标题焦点、原生 button/switch、disabled、`aria-current/aria-checked` 通过；本轮浏览器键盘注入通道未移动焦点或激活按钮，因此 Tab/Shift+Tab/Enter/Space 动态项记为证据限制，不冒充通过 |

### 10.3 缺陷差量

1. `QA-FRONT-SYSTEM-02B-001`（P1 / 前端）：`@media (max-width:1180px)` 下侧栏固定定位后，主区仍落在 72px 网格首列。1024 收起实测 `sidebar=72 / shell-stage=72`，覆盖展开实测 `sidebar=216 / shell-stage=72`；要求主区占满剩余宽度且展开只覆盖。
2. `QA-FRONT-SYSTEM-02B-002`（P1 / 后端）：隔离库连接被 force disconnect 时，`pg.Pool` 发出未接管的 idle client `error`（PostgreSQL `57P01`），Fastify 进程退出；前端只能显示无 requestId 的网络失败。可恢复 SQL 查询错误时 Fastify 500/requestId/stale 链通过，说明缺口位于数据库断连进程韧性，不是 UI stale 投影。
3. `QA-FRONT-SYSTEM-02B-003`（P2 / 前端）：1024 DOM 同时保留三个纵向趋势图；应按冻结设计切为一个主图和三个指标切换，不删三类事实。

### 10.4 有意差异与冻结项

- 原型匿名曲线、预算、配置版本、主机指标、对象容量、owner 身份不进入生产；正式截图的数据稀疏与 `unknown/not_configured/empty` 是权威 API 差异，不是视觉缺陷。
- Rev 2 的颜色、九入口、系统运行带、1440 信息层级、生产不可见工程注释与只读首切片继续冻结；本轮不测试或伪造发布、暂停、回滚。
- Impeccable 已在本切片前端执行一次，本轮没有重复；完整 `pnpm check` 留规划关闭门。

### 10.5 证据与清理

仓库外证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\front-system-02b-ui-qa\`

- `fifo160-results.json`
- `01-loading-1440.png`、`02-initial-error-1440.png`、`03-recovered-normal-1440.png`
- `04-stale-after-refresh-error-1440.png`、`05-collapsed-1440.png`
- `06-overview-1024-collapsed.png`、`07-overview-1024-expanded.png`
- `08-empty-1440.png`、`09-employee-appshell-isolation-1440.png`

清理完成：浏览器标签已关闭并重置视口；端口 `31600/31601/31602` 无监听；隔离库已精确 DROP 并验证同名数据库计数为 0；临时 harness、seed 与 Node preload 已删除。共享默认库、其他任务服务和生产文件未改。

### 10.6 八项差量包

1. 任务：`FRONT-SYSTEM-02B Rev 1 / FIFO 160`；正式 UI 终验结论为退回规划。
2. 新增事实：1440、异步、真实字段、两站隔离通过；新增 P1×2、P2×1。
3. 精确输入/证据：本节、上述仓库外目录及 `fifo160-results.json`。
4. 允许文件：本轮只写本验收文档、CURRENT/日志和仓库外证据；生产代码零修改。
5. 冻结/非目标：UI-SYSTEM-01 Rev 2 与只读首切片冻结；不接真实 JWT/网络/密钥/付费，不测试写命令。
6. 定向验证建议：前端仅复验 1024 收起/覆盖展开与趋势切换；后端仅复验同一 app 在 PostgreSQL 连接中断/恢复后的进程存活、稳定错误和后续成功。
7. 接收/停止：只交规划；UI 停止，不直接通知前端或后端，不运行完整 `pnpm check`。
8. 职责/衔接：系统控制台运行总览；`INT-12 / INT-13`，后继 `INT-11` 不提前启动。

## 11. FRONT-SYSTEM-02B Rev 2 / BACK-SYSTEM-02C 三场景微复验（FIFO 164）

### 11.1 环境与结论

- 使用新鲜 `system-frontend` Vite production build（20 modules）、正式 Fastify system-control API、逐请求注入式控制台验收主体与精确隔离 PostgreSQL `qimao_fifo164_ui_20260816`；正式前端仍未携带测试 owner header。
- 本轮只复验 FIFO 164 的 A/B/C 三个变化场景。结论为 `P0=0 / P1=0 / P2=0 / P3=0`，三个原失败场景均通过；FIFO 160 其余完整矩阵继续冻结。
- Windows Chromium 在 1024 视口为根纵向滚动条保留 15px，因此 `innerWidth=1024` 时根布局宽为 `1009`。正文不变量是 `shell-stage = root clientWidth - 72 = 937`；等价于任务所述 `1024 - 72 = 952` 再扣除真实滚动条沟槽 15px，不是主区再次丢失 15px。

### 11.2 A：1024 收起与覆盖展开

| 状态 | 新鲜 DOM 尺寸与结果 |
| --- | --- |
| 收起 | `viewport=1024×768`；`sidebar=72`；`shell-stage x=72 / width=937`；`page-stage width=937`；`trend-panel clientWidth=899`；根 `scrollWidth=clientWidth=1009`；标题 `word-break=normal / white-space=normal`，正文不逐字换行 |
| 覆盖展开 | `sidebar=216`；`shell-stage x=72 / width=937` 与收起态完全相同；`expandedOverlaysStage=true`；根仍 `1009=1009`，展开只覆盖、不挤主区 |

截图：`01-1024-collapsed.png`、`02-1024-expanded-overlay.png`。总览首切片没有宽表，本轮按任务记录趋势容器尺寸；不存在以根横溢掩盖布局的行为。

### 11.3 B：1024 单主图切换与 1440 三图

- 1024 DOM 恰好挂载一张 `[data-testid=trend-chart]`，桌面三图节点为 0；默认标题/图像标签为“任务吞吐 · 集 / 小时（趋势）”。
- 真实点击“积压”“费用”后，标题/图像标签分别变为“队列积压 · 集（趋势）”“调用费用 · 服务端金额（趋势）”；三个原生 `role=tab` 同步具备 `aria-selected` 和 `aria-pressed`，任一时刻恰好一个为 `true`。
- 关闭自动刷新并把 harness 计数归零后，依次点击吞吐、积压、费用，overview GET 增量为 **0**；三图均继续消费初次 overview 的原始 `trends` 字段，不为切换复制请求或补造数据。
- 1440×900 最小复核为 `data-layout=desktop`、compact 容器不挂载、三张趋势图均可见，标题依次为吞吐/积压/费用；根 `scrollWidth=clientWidth=1425`（同样扣除 15px 根滚动条沟槽）。

截图：`03-1024-trend-cost.png`、`04-1440-three-trends.png`。

### 11.4 C：真实 57P01、稳定失败与同一 app 恢复

1. 同一 Fastify app 先对 overview 返回 200，requestId=`dec7abff-7c17-4706-9062-45bc69fb72d9`。
2. 实际终止本轮隔离库的 10 个 idle client；可注入观察器收到 10 个仅含 `{kind: idle_client_error, code: 57P01}` 的事件。API 进程 PID 始终为 `2804`，`127.0.0.1:31611` 继续 LISTENING，随后 `/health` 返回 200 / requestId=`a5de02e6-79f5-4e28-816d-bad2d501a9aa`。
3. 临时把隔离库 `asr_jobs` 重命名以制造真实请求内查询失败；页面保留最后成功总览并显示“数据已过期”、唯一“重新读取”和真实 requestId=`8894f90f-e6ca-48c8-9349-c7de48875b71`。恢复原表名后，点击该唯一动作；同一 PID、同一路由再次成功，stale 清除，`H1=系统总览` 获焦。
4. 为截图再次制造同一错误，requestId=`d688e33d-3d96-4a6e-a620-1dec587176fa`；恢复后页面再次成功。浏览器捕获的页面 console `error/warn=0/0`，没有 render-phase 导航或未处理前端异常。

截图：`05-stale-500-requestid.png`、`06-recovered-same-app.png`。

### 11.5 证据、清理与冻结

仓库外证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\front-system-02b-rev2-ui-qa\`

- 结构化结果：`fifo164-results.json`
- 最小截图：上述 6 张 PNG
- 清理完成：浏览器视口已 reset、标签已关闭；`31610/31611` 无 LISTENING；隔离库已精确 DROP 且同名计数为 0；临时 harness/seed/preload 已删除；`asr_jobs` 在 DROP 前确认恢复，临时重命名表不存在。
- 未修改生产 `system-frontend`、员工 `frontend`、`backend`、迁移、contracts 或 DESIGN；未重复 Impeccable、未运行完整矩阵或完整 `pnpm check`，未提交、推送、部署或接入真实 JWT/网络/密钥/付费。
- FIFO 160 的 loading/empty/异步乱序/四池/九入口/两站隔离/1440 完整矩阵继续引用 §10 与原证据，不在本轮重跑。

## 12. SYSTEM-03 三页正式 ControlShell 回归（FIFO 179）

- `system-frontend` production build 25 modules 与正式 Fastify/隔离 PostgreSQL 下，1440 引擎、详情、变更三页保持冻结的冷灰白/深石墨蓝/`#4458D8`、顶部运行带与紧凑事实密度；没有员工 AppShell 混入或匿名示例。
- 1024 收起为 `sidebar=72 / main x=72 / width=937`，覆盖展开为 `sidebar=216` 且 main 尺寸不变；根 `1009=1009` 无横溢，980px 部署表只在 899px 自身容器横滚，字段不删。空库路由页同样无根横溢。
- 全链仅当前导航有一个 `aria-current=page`，正式页面 console `error/warn=0/0`。ControlShell 视觉/响应式回归通过；SYSTEM-03 业务恢复链的四项 P1 详见 `SYSTEM-engine-control-acceptance.md` §13，不归因为壳层视觉回归。
- 最小同状态证据与结构化结果位于仓库外 `front-system-03c-rev3-ui-qa/`。本轮没有重复 Impeccable、没有修改生产代码或 DESIGN。

## 13. FRONT-SYSTEM-03C Rev 4 ControlShell 变化场景回归（FIFO 181）

- FIFO 179 的 ControlShell 视觉、1440/1024、侧栏覆盖、宽表容器内滚、单一 `aria-current` 与两站隔离继续冻结；本轮没有重跑完整响应式矩阵，也没有修改壳层、样式或 DESIGN。
- 正式 production build + Fastify + 精确隔离 PostgreSQL 下，部署状态 pending Modal 继续保持冻结壳层：焦点在可编程 dialog，Tab/Shift+Tab 不逃逸，Escape/遮罩/重复提交受阻，成功与非 pending 关闭均回明确安全目标。
- 正式页面最终 console `error/warn=0/0`。ControlShell 壳层回归本身通过；业务页面仍有 `P1=3`：引擎读取失败落 BODY、连接测试 unknown 恢复被抽屉/顶栏遮挡、路由草稿失败焦点逃到遮罩后与 unknown 成功落 BODY。完整事实见 `SYSTEM-engine-control-acceptance.md` §14。
- 仓库外最小证据位于 `front-system-03c-rev4-ui-qa/`，包括 pending、发布 unknown、抽屉遮挡、读取 stale 与路由草稿遮罩后错误五张截图及 `fifo181-results.json`；本轮未重复 Impeccable、完整 `pnpm check` 或 FIFO 179 其余 49 项。

## 14. FRONT-SYSTEM-03C Rev 5 ControlShell 三项变化场景回归（FIFO 183）

- FIFO 179 的 ControlShell 视觉、双视口、侧栏覆盖、容器内横滚、单一 `aria-current` 与两站隔离继续冻结；本轮只在 1440 正式页面复验三个原失败场景，没有重跑完整视觉/响应式矩阵或修改壳层样式。
- 层级新鲜实测为 `topbar z-index=35 / 引擎详情抽屉=45 / Modal backdrop=60`，顺序保持 `Modal > 抽屉 > 顶栏`；连接测试 unknown 的唯一同 ID 查询在抽屉内完整可见、焦点可达且 hit-test 命中。
- 路由确定性失败的唯一错误只存在于活动 Modal 内并持有焦点，遮罩后错误为 0；关闭后状态清理。引擎两类读取失败聚焦 ErrorBlock，恢复与路由 unknown 成功均聚焦页面 H1，不落 BODY。
- 页面 console `error/warn=0/0`；壳层回归与三个业务变化场景均通过，`P0/P1/P2/P3=0/0/0/0`。证据位于仓库外 `front-system-03c-rev5-ui-qa/`；生产代码、DESIGN、Impeccable、完整矩阵和完整 `pnpm check` 均未触碰。

## 15. ADMIN-SUMMARY-UI-1740 首页第一屏设计冻结

### 15.1 结论与范围

- 首页从“资源池与技术状态大盘”收敛为单一管理摘要：一个总状态、一句解释、唯一下一步、一行处理量、最多 3 条当前原因。继续使用既有 `ControlShell`、`/api/system-control/overview` 和详情路由；不新增页面、控制面、组件体系、fake 数据或浏览器常量。
- 原第 3、4、6 节是历史设计/验收证据；本节与 `DESIGN.md` 5.11.2 是首页后续实现和验收的现行口径。趋势、四资源池、配置版本、费用、服务端窗口、requestId 与技术身份仍可在现有引擎、路由、服务器、预算、日志和审计页读取，功能不删除。

### 15.2 单一状态与文案验收

| 输入事实 | 必须显示 | 禁止表达 |
| --- | --- | --- |
| `overallStatus=healthy` | “系统运行正常” / “当前处理链路可用，没有需要管理员介入的系统问题” / “无需处理” | 因 Worker 空闲、可选池未配置或遥测未知改成失败 |
| `overallStatus=degraded` | “有事项需要处理” / 一句当前可行动说明 / “处理当前问题” | 用历史错误数、技术状态名或资源池数量解释 |
| `overallStatus=failed` | “当前处理受阻” / 至少一项当前故障原因 / “处理当前问题” | 只给红色“失败”而无原因与下一步 |
| `overallStatus=empty` | “当前没有处理任务” / “等待新任务” | 把空闲 Worker 或零任务显示为故障 |
| `overallStatus=unknown` 或首次读取失败 | “状态暂时无法确认” / “重新读取” | 以 0、正常或失败代替未知 |
| `overallStatus=not_configured` | “关键能力尚未接入” / “查看接入详情” | 把非必需能力或详情页配置缺失扩大为全局失败 |
| 已有事实后刷新失败 | 保留旧摘要并标“数据已过期”，唯一“重新读取” | 继续把旧摘要标成当前事实或开放其他主动作 |

状态由服务端 `overallStatus` 唯一决定，前端只做上表文案映射。`failed/degraded` 必须与服务端返回的当前可行动原因一致；字段矛盾时显示“状态暂时无法确认”，不按池状态或数字在浏览器重算。

### 15.3 真实反例关闭门

1. 45 个 `review_pending` 必须归为待人工处理，不得计入 `runningCount`，也不得使总状态变为失败；没有专用 overview 字段时，首页不猜该数量，任务详情继续保留完整事实。
2. 22 个已经结束的 `localPolicyBlocked`、50 条历史过期租约及过去 24 小时内已终止失败只属于日志/趋势，不进入当前原因，也不得把 `overallStatus` 变成 `failed/degraded`。
3. 没有任务的空闲 Worker、可选资源池 `not_configured`、遥测 `unknown`、费用 `pending/unknown` 均保留诚实详情，但不能单独判定当前系统故障；未知值不显示 0。
4. `failed` 只在当前处理链路确实受阻且至少存在一条当前原因时成立；`degraded` 只表示当前仍可继续但需要处理。原因列表最多 3 条，文案只用“当前任务处理失败 / 处理结果需要确认 / 当前任务等待恢复”等业务中文。

### 15.4 第一屏结构与渐进披露

1. 页面标题与最近读取时间。
2. 单一总状态容器：总状态、一句解释、唯一下一步；`role=status`，状态不能只靠颜色。
3. 一行摘要：“最近 24 小时处理 N 个项目 / M 集 · 正在处理 R · 等待系统处理 Q”。fresh/empty 显示服务端数值，unknown/stale 全部显示“未知”，不得补零；不得用最多 50 条的 `anomalies` 数组长度冒充全量。
4. 最多 3 条当前需处理原因；无原因显示“当前没有需要管理员处理的问题”。首页不显示 reasonCode、requestId、资源池内部名、provider/adapter/model/deployment。
5. 技术明细只从既有 ControlShell 一级入口访问：引擎/路由/变更、服务器、预算、日志。首页不再渲染四池运行带、三趋势、配置版本和技术身份，不新建“摘要详情”页面。

### 15.5 后续实现验收

- 正常、空闲、当前降级、当前阻断、首次读取失败、stale、unknown、not_configured 八类状态逐一核对；每态只能有一个总状态、一个解释和一个下一步。
- 使用三个真实反例夹具验证计数和总状态，不以源码字符串断言代替行为：45 个待人工审核、22 个历史策略阻断、50 条历史过期租约。
- `1440×900` 与 `1024×768` 第一屏完整显示总状态、处理量和至少首条当前原因；根页面无横向溢出，恢复成功聚焦 H1，读取失败/过期的唯一“重新读取”可获得焦点。
- 本 UI 切片只冻结设计与验收，不修改 overview 合同、生产前后端、测试数据或服务器；精确服务端当前性筛选与前端实现分别由 BACK、FRONT 后续按现有合同完成。
