# UI-SYSTEM-03 Rev 1–2 · 引擎/API 与安全配置发布设计验收

状态：`review`  
Owner：UI 设计对话  
Reviewer：规划对话  
权威输入：`docs/milestones/SYSTEM-engine-control-plane.md`、`docs/contracts/SYSTEM_CONTROL_CENTER.md`、职责矩阵“系统控制台引擎/API 与安全配置发布”、`INT-11 / INT-12 / INT-13`、`PRODUCT.md`、`DESIGN.md` 5.11–5.12  
唯一原型：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\ui-system-01-control-shell\index.html`  
唯一证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\ui-system-01-control-shell\evidence\ui-system-03-rev1\`

## 1. 结论与范围

UI-SYSTEM-03 Rev 1 已在同一独立管理员 `ControlShell` 中冻结 `/engines`、`/routing`和 `/changes` 三个正式页面的信息结构、全状态、高风险交互和 `1440×900 / 1024×768` 响应式。唯一方向仍为“日间控制舱”：冷灰白画布、深石墨蓝侧栏与单一 `#4458D8` 主动作。没有 B/C、主题切换、第二套控制壳或员工 `AppShell` 混入。

设计原型验收结论为 `P0=0 / P1=0 / P2=0 / P3=0`，Reviewer 最终 `disposition=ship`。这一结论只说明原型已达到交接门，不代表真实供应商、Secret、网络、付费、Cloudflare、管理 API 或生产页面已实现。本 UI 任务对生产代码的修改数为 **0**；未修改 frontend/backend、共享 contracts、迁移、测试或部署。

## 2. 页面结构与生产不可见交接矩阵

| 页面 | 页面结构 | 未来真实数据源 | 允许操作 | 非目标 |
| --- | --- | --- | --- | --- |
| `/engines` | 页面工具栏与能力筛选 → 服务端部署表 → 不可变版本详情/抽屉 → 最近连接测试 | PostgreSQL `EngineDeployment`/不可变版本、Adapter Registry 能力快照、Secret 引用元数据、持久化测试执行记录 | 服务端读取和能力筛选、查看不可变版本、绑定已存 Secret 引用、发起已登记零网络测试、查询同一测试 | 真实供应商/SDK/网络/付费，明文 Secret，任意 URL/Header/脚本，测试自动发布 |
| `/routing` | 业务环节分组 → ASR API/OCR API/OCR 自建 Worker 分池 → 当前生效与草稿并列 → 主备/三项容量差异 | PostgreSQL 不可变路由/容量版本、唯一当前生效指针、部署状态、排队/领取事实 | 按业务环节查看当前生效/草稿，编辑主备与同时处理/单项目/等待队列上限，保存草稿，进入影响检查 | 预算、费率/速率、服务器/Worker 扩缩容，终止运行任务，未知/需对账自动备用或重试 |
| `/changes` | 状态链/差异 → 测试 → 影响检查 → 确认发布 → 未知/失败恢复、成功、回滚和审计 | PostgreSQL 配置版本、测试执行记录、影响检查、幂等发布/回滚命令、当前生效指针、只追加审计事件 | 测试、影响检查、批准、确认发布、查询同一未知发布、指向历史已批准版本回滚、查看审计 | 浏览器判成功/持有当前生效，失败/未知改指针，删除失败版本/审计，改写历史任务 |

上表是规划、前后端和测试的工程交接注释，在生产 UI 和最终预览中必须完全不可见。页面只呈现管理员当前任务、服务端事实和唯一下一动作，不把“未来数据源”、“非目标”或字段映射做成页面卡片、页尾说明或帮助文案。

## 3. 三页冻结结构

### 3.1 `/engines`

- 一张服务端表格承载部署身份、能力、执行方式、当前角色、版本、凭据引用状态与最近测试；筛选只用中文能力投影。
- 版本详情只读，展示模型/语言摘要、能力快照、Secret 引用脱敏摘要与最近测试；不回显 Secret 或实现字段。
- 连接测试是单独流程，成功只能写“零网络测试通过”；真实供应商或付费网络未授权时统一显示“尚未接入”。

### 3.2 `/routing`

- 页面按“中文语音识别”和“画面字识别”分组，再拆为 ASR API、OCR API、OCR 自建 Worker 三个独立资源池。
- 每池保留主部署、备用部署和“无部署”空位；ASR 备用位是冻结结构，不因当前无数据而删除。
- 只显示“同时处理上限 / 单项目同时处理上限 / 等待队列上限”。“当前生效”和“草稿”并列对比，保存草稿不改变当前生效。

### 3.3 `/changes`

- 顶层状态链固定为“草稿 → 测试中 → 影响已检查 → 已批准 → 当前生效 / 已退役”，与 `draft → testing → impact_checked → approved → active / retired` 一一对应，但不在管理员顶层以实现名代替中文。
- 影响检查阻断时，唯一下一步是“返回修正草稿”；确认、提交中、失败、未知、成功和回滚各有独立视觉与交互语义。
- 发布失败/未知时旧当前生效版本不变；未知只查询同一发布身份。成功只影响之后的新任务，新 Job/Attempt 固定部署/路由版本，历史任务不改写。回滚追加新审计，不删除失败版本或旧事件。

## 4. 完整状态与恢复矩阵

| 页面/场景 | 可见事实 | 唯一下一动作或限制 | 验收 |
| --- | --- | --- | --- |
| 全局 loading | 表格、并列详情和状态链保持几何 | 不把未知列表表现为空 | 通过 |
| 全局 error | 保留服务端原因；`requestId` 只在诊断区 | 唯一“重新读取” | 通过 |
| 全局 stale / 只读 | 保留最后成功事实、过期时间或历史原因 | 不允许绑定、测试、编辑、发布或回滚；重新读取或返回当前可写版本 | 通过 |
| `/engines` 无部署 | 明确空状态，不伪造供应商卡 | 仅进入受控登记/规划入口 | 通过 |
| `/engines` 凭据未绑定 | 中性“凭据未绑定”和脱敏引用状态 | 只能绑定服务器已存在引用；无明文输入 | 通过 |
| `/engines` 执行组件未注册 | 明确“执行组件未注册” | 禁止测试/发布；不允许临时脚本或代码注入 | 通过 |
| 真实供应商未授权 | 统一“尚未接入” | 无假成功、网络测试或付费动作 | 通过 |
| 测试 queued | “排队中”、稳定 `testRunId` | 不重复创建；读取同一测试 | 通过 |
| 测试 running | “运行中”、开始时间和被测版本 | 禁止重复命令 | 通过 |
| 测试 failed | 脱敏失败原因和诊断身份 | 修正引用/部署后再明确创建新测试，不自动重试 | 通过 |
| 测试 unknown | 保留同一 `testRunId`、被测版本和旧事实 | 唯一“查询本次测试结果”；不重发 | 通过 |
| 测试 succeeded | 只显示“零网络测试通过” | 不自动发布，不声称供应商已接入 | 通过 |
| `/routing` ASR / screen_text | 两业务环节、三资源池；主/备/无部署空位完整 | 仅编辑草稿；OCR API 与自建 Worker 不共用容量 | 通过 |
| `/routing` 当前生效 / 草稿 | 主备、三项容量与差异并列 | 保存草稿不改变当前生效 | 通过 |
| `/changes` draft | “草稿”与不可变版本身份 | 进入测试 | 通过 |
| `/changes` testing | “测试中”与本版执行记录 | 不发布、不并行重发 | 通过 |
| `/changes` impact_checked | “影响已检查”、活动/需对账任务和容量差异 | 无阻断才可进入批准 | 通过 |
| `/changes` approved | “已批准”、当前生效与候选版本 | 可打开受保护发布确认 | 通过 |
| `/changes` active / retired | “当前生效 / 已退役”和审计历史 | 已退役版本只读；只能通过新回滚发布再指向 | 通过 |
| 影响阻断 | 阻断项与原因是硬门禁，不是普通警告 | 唯一“返回修正草稿”并获焦 | 通过 |
| 发布确认 | 发布身份、候选/旧当前生效、影响和审计语义 | 安全返回/确认发布双向焦点闭环 | 通过 |
| 发布提交中 | 对话框 `aria-busy=true`，活动区为受保护对话框 | 安全返回/确认都锁定；`Tab` 不逃出，`Escape` 不关闭 | 通过 |
| 发布 failed | 保留失败原因、发布身份、诊断身份；旧当前生效不变 | 唯一“重新提交本次发布”；沿同一发布身份且只由人工触发，不自动重发 | 通过 |
| 发布 unknown | 保留 `release-ui-03-018`和旧当前生效“开发基线 v1.0.0” | 唯一“查询本次发布结果”；只查同一发布 | 通过；`queryCount=1` |
| 发布 succeeded | 未知条消失，新当前生效与审计可读 | 成功标题获焦；新任务固定新版本，历史任务不改 | 通过 |
| 回滚确认/成功 | 回滚目标是历史已批准版本，完成后追加新审计 | 与发布同样受保护；不删除失败版本/历史事件 | 通过 |

## 5. 键盘、焦点与高风险锁定

- 发布对话框真实焦点序列为：`安全返回 → Tab 确认发布 → Tab 安全返回 → Shift+Tab 确认发布`。非提交中按 `Escape` 关闭并返回原“确认发布”触发点。
- 回滚对话框同样以“安全返回”为初始焦点，`Tab / Shift+Tab` 双向闭环；`Escape` 关闭后返原回滚触发点。
- 提交中安全返回和确认均 `disabled`，对话框 `aria-busy=true`，当前活动区保持为 `protectedModal`；没有空 focusables 窗口，`Tab` 留在 dialog，`Escape` 不关闭。
- 发布结果未知后，唯一“查询本次发布结果”获得焦点；影响阻断后唯一“返回修正草稿”获得焦点；成功后发布成功标题获得焦点。
- 失败/未知同时只出现一个与当前状态匹配的恢复动作；恢复不创建第二发布，不改变旧当前生效。

## 6. `1440 / 1024` DOM 测量与截图

| 场景 | 实测结果 |
| --- | --- |
| `1440×900` | 页面根无横向溢出；侧栏 `216px`；引擎/路由使用详细表格，变更详情使用并列事实 |
| `1024×768` 收起 | `innerWidth=1024`，页面根 `scrollWidth=clientWidth=1024`，侧栏 `72px`，主区 `x=72 / width=952` |
| `1024×768` 覆盖展开 | 侧栏 `216px`，主区仍为 `x=72 / width=952`，展开只覆盖、不挤压 |
| `1024` 引擎/路由宽表 | 表格宽 `1080px`，包裹容器 `922px`且 `overflow-x:auto`；页面根仍无横溢 |
| `1024` 版本抽屉 | 抽屉 `x=594 / width=430`，底层表格上下文保留 |
| 验收场景入口 | 与页面生产动作 `overlap=false`，不遮挡或冒充正式按钮 |

截图清单：

- `01-engines-1440.png`
- `02-routing-1440.png`
- `03-changes-1440.png`
- `04-publish-dialog-1440.png`
- `05-publish-unknown-1440.png`
- `06-publish-success-1440.png`
- `07-engine-test-unknown-1440.png`
- `08-engines-drawer-1024.png`
- `09-routing-screen-text-1024.png`
- `10-impact-blocked-1024.png`

原型页面自身浏览器控制台 `error/warn=0/0`。

## 7. 真实供应商与 Secret 安全边界

- 本轮只允许已注册的 `deterministic_fake / zero_network_stub / self_hosted_worker_stub` 等零网络 probe。真实厂商、SDK、网络、样本、密钥与付费均未授权，页面统一写“尚未接入”。
- Secret 不明文输入、粘贴、回显、复制或下载；只显示服务器已存在引用的脱敏摘要和可用状态。不返回引用原文、环境变量、令牌、连接串或供应商私参。
- 不提供任意 URL、Header、脚本、请求体或服务器命令；Adapter Registry 是唯一可执行组件白名单，数据库配置不能成为 SSRF/RCE 入口。
- 管理员顶层不显示 `configDigest / adapterKey / active / Attempt` 等实现名；`requestId` 只出现在诊断区、错误/未知恢复和审计详情。
- 连接测试成功不代表生产发布；发布失败/未知不改变旧当前生效；新任务固定新版本，历史任务永不因配置换版而被改写或自动重试。

## 8. Impeccable 审查记录

- 本切片的 Impeccable setup 仅执行一次，继续消费同一 `PRODUCT.md / DESIGN.md / ControlShell` 方向，没有重建视觉世界或重复 setup。
- detector 仅执行一次，结果为 `DEGRADED`：环境缺少 `htmlparser2 / css-select / css-tree / domutils`，因此降级扫描。报告唯一命中为 integration banner 的 `4px side-tab warning`；人工复核确认它是全系统唯一“尚未接入”风险标记，不是装饰侧栏或第二品牌强调，因而人工接受。本轮没有执行第二次 detector。
- Finish Reviewer 提出的 material fixes 为：恢复 ASR 备用空位、把影响问题收紧为真正阻断语义、消除提交中的空 focusables 窗口、修正对比度。这四项已在最终原型与证据中修正；Reviewer 随后给出 `disposition=ship`。
- 设计原型终验严重度为 `P0=0 / P1=0 / P2=0 / P3=0`。这不替代未来正式 React、API、PostgreSQL、权限与新任务版本固定的产品终验。

## 9. 职责映射、交接门与停止边界

- 职责矩阵唯一对应行：“系统控制台引擎/API 与安全配置发布”。
- `INT-11`：新任务创建时固定唯一当前生效的引擎部署、路由和容量版本；Worker 不读取浏览器设置，换版不改写历史 Attempt。
- `INT-12`：连接测试、Job/Attempt/Usage 和运行摘要只读投影到控制台；缺失事实显示未知，不由浏览器补零或推算。
- `INT-13`：员工站、系统控制台和 Worker 使用不同权限域；当前只冻结默认拒绝与两站隔离边界，真实 Cloudflare Access/JWT 和部署仍未实现。
- 本文档包完成后先更新 `CURRENT` 与开发日志，再保持 `review / Current actor=规划对话 / Reviewer=规划对话` 并只交规划审核；不自行解锁 BACK Wave B、FRONT 或 TEST，不触发真实网络、付费、密钥、购买、部署、提交或推送。

## 10. 八项差量包

1. 任务：`UI-SYSTEM-03 Rev 1`；在同一日间 `ControlShell` 冻结引擎/API、路由与安全发布设计，状态保持 `review`。
2. 新增事实：三页结构、零网络连接测试、三池主备/容量、不可变发布链、新旧任务版本隔离、全状态与受保护焦点已冻结。
3. 精确输入/证据：本文档顶部所列权威输入、唯一 `ui-system-01-control-shell/index.html` 原型和 `evidence/ui-system-03-rev1/` 十张截图。
4. 允许文件：`DESIGN.md` 5.12、本验收包、既有仓库外 ControlShell 原型及最小证据、`CURRENT` 与开发日志；生产 `system-frontend / frontend / backend`、contracts、迁移零修改。
5. 冻结/非目标：冻结 5.11 ControlShell 、日间控制舱和三页交互；不建 B/C，不接真实供应商、网络、明文 Secret、付费、预算、速率、服务器扩缩容、Cloudflare 或部署。
6. 验证：设计原型 `P0-P3=0`；`1440/1024` 根无横溢、宽表容器内滚动、抽屉、两类高风险焦点闭环、提交中锁定、未知同一发布恢复与控制台 `error/warn=0/0` 均有证据。
7. 接收/停止：本轮在权威文档持久化和自检后立即停止；只交规划审核，不执行生产实现、正式浏览器终验、真实网络或全量 `pnpm check`。
8. 职责/衔接：职责矩阵“系统控制台引擎/API 与安全配置发布”；核心为 `INT-11`，运行结果进入 `INT-12`，权限继续受 `INT-13`，规划确认前所有后继任务保持原门状态。

## 11. 规划页面/API/状态交叉审查（Rev 1 退审）

视觉方向、ControlShell 一致性、1440/1024、宽表内滚、发布/回滚焦点链和未知发布只读恢复可以冻结；规划独立查看三张主页面、1024 抽屉、原型 DOM/事件和本切片契约后，结论为 `P0=0 / P1=4 / P2=1 / P3=0`，暂不进入生产前端。

1. **P1｜部署表混入路由槽位和角色**：`/engines` 把“主部署/备用部署/无部署”当作 EngineDeployment 自身字段，并用一个带 ID 的伪部署表达“无部署”；实际主备/空位属于 Wave B RoutingPolicy，EngineDeployment 只拥有 capability、executionKind、enabled/disabled 与不可变版本。部署页可以只读投影“当前使用位置”，但必须明确来源为当前生效路由；无路由时显示“尚未分配”，不能造一条部署记录。
2. **P1｜登记部署/新版本/Secret 生命周期没有可交付交互**：当前“登记部署”无可操作流程，抽屉也没有版本历史与创建新版本。Rev 2 必须给出登记部署+v1、创建新版本的同壳表单和完整状态；服务端派生 provider/model/language/capabilities 不能由浏览器伪造。Secret 只从服务器已有别名中选择，明确“不使用 / 继承 / 替换 / 清除”；没有 Secret 管理数据源时显示“尚未启用，前往密钥与安全”，不允许输入明文或假引用。
3. **P1｜路由草稿仍是只读结果页**：当前“新建路由草稿”和容量/主备行没有真实编辑、保存、失败或版本冲突交互。Rev 2 必须给出选择精确 deploymentVersion、主备空位、三项容量、保存不可变草稿、确定失败/未知恢复和返回影响检查的实际路径；当前生效版本保持只读，保存草稿不得改 active pointer。
4. **P1｜连接测试历史与新旧测试身份不清**：抽屉只显示一条最近测试，刷新后无法发现历史；failed 的“重新运行”容易被理解为重放同一 testRunId。Rev 2 应展示有界最近测试列表/分页或“查看全部”，unknown 只查询同一 testRunId，failed 修正后只能“创建新的零网络测试”并生成新 ID，queued/running 不重复创建。
5. **P2｜超出当前契约的无效动作**：“导出脱敏清单”没有 SYSTEM-03 合同/API/验收来源，且当前只是无事件按钮。删除该主操作或明确后置，禁止前端为原型按钮新增无计划接口。

Impeccable 规划侧 detector 按规则只运行一次；因解析依赖缺失为 regex 降级，复现 `styles.css:216` 的 4px “尚未接入”风险带 warning。该项是唯一、功能性且与既有 ControlShell 一致，维持人工接受，不列新增缺陷。Rev 2 只补上述功能等价交互和数据所有权，不重做视觉、布局或已通过键盘矩阵；完成后再与 BACK-SYSTEM-03A Rev 2/Wave B 契约交叉映射。

## 12. UI-SYSTEM-03 Rev 2 功能等价集中收口

### 12.1 结论与冻结边界

Rev 2 已在同一仓库外 ControlShell 原型中关闭 §11 的 `P1=4 / P2=1`，变化场景复验结论为 `P0=0 / P1=0 / P2=0 / P3=0`。Rev 1 已通过的视觉世界、1440/1024 响应式、宽表内滚、发布/回滚焦点、发布未知恢复和十张证据继续冻结；没有重做视觉矩阵，没有运行第二次 Impeccable detector，也没有修改生产 `frontend / system-frontend / backend`、迁移或 contracts。

### 12.2 数据所有权与可交付路径

| 范围 | Rev 2 正式结论 | 禁止前端推算或伪造 |
| --- | --- | --- |
| `/engines` 部署列表 | 只列真实 `EngineDeployment`；`enabled / disabled` 显示为“可用于草稿 / 已停用”。当前使用位置只是当前生效路由的只读投影；没有事实时显示“尚未分配” | 不把主部署、备用部署、无部署当作部署自身角色；不为无部署创建带 ID 的记录 |
| 登记部署 | 同壳受保护表单覆盖能力、执行方式、名称、Registry 可选执行组件、模型/语言、受控 region/endpointReference；稳定 deploymentId/versionId 隐藏随命令提交 | provider/能力快照由 Registry 派生；不允许任意 URL/Header/脚本、Secret 或引用 ID 输入 |
| 不可变版本 | 版本抽屉可发现版本历史、最近测试与“创建新版本”；旧版本只读 | 不就地修改版本，不由浏览器生成供应商/能力事实 |
| Secret | 四种语义为“不需要 / 继承上一版本 / 替换为服务器已有别名 / 明确清除”；当前数据源未启用时禁用“替换”并提供“前往密钥与安全” | 不输入、复制、回显明文；不使用任意 `referenceId` 文本框或匿名假引用 |
| `/routing` | 主备和无部署槽位只属于路由；编辑态按 asr/screen_text 与三资源池选择精确 enabled deploymentVersion，并校验三项容量 | 不创建伪部署；不加入预算、速率、扩缩容、停止运行任务或真实供应商 |
| 草稿保存 | 客户端预生成稳定 draftId；保存不可变草稿，不移动当前生效指针。未知只查同一身份，成员/版本冲突刷新服务端选项，成功进入影响检查 | 不因响应未知重发草稿，不用浏览器本地状态改写当前生效 |
| 连接测试 | 服务端状态筛选、完成时间倒序、每页 20 条，刷新后从 PostgreSQL 重新发现；queued/running 禁止重复创建，unknown 查询同一 testRunId，failed 修正后创建新 testRunId | 不把 failed 写成“重跑同一次”；零网络通过不代表真实供应商或发布成功 |
| 无合同动作 | “导出脱敏清单”已删除；三张主页面的可用主按钮均绑定真实原型路径 | 不为原型外观按钮新增 SYSTEM-03 之外 API |

规划交叉映射补充：登记部署表单中的“模型 / 语言”只能作为选中 Registry 执行组件后的只读派生预览，正式前端不得提交、编辑或覆盖这两个字段；生产创建请求只包含共享 `SystemControlCreateEngineDeploymentBody` 允许的稳定身份、能力、执行方式、显示名、adapterKey、受控 endpoint/region 与可选 Secret 引用。该补充不改变 Rev 2 截图布局，但属于正式前端硬边界。

### 12.3 状态、身份和焦点复验

- 登记部署与创建版本覆盖提交中锁定、确定失败、响应未知、版本冲突和成功。提交中 `aria-busy=true`，表单与两个底部动作锁定；未知只显示“查询本次结果”，登记身份保持 `dep-ui-03-091 / ver-ui-03-116`；成功标题获得焦点。
- 创建版本的 Secret 四态真实 DOM 为：不需要可选、继承上一版本默认选中、替换为服务器已有别名禁用、明确清除可选；抽屉提供“前往密钥与安全”，没有任意 URL/Header/Secret/referenceId 输入。
- 版本冲突稳定后焦点落在唯一“刷新可选项”，隐藏身份保持部署 `asr-cloud-a` 与版本 `ver-ui-03-116`。
- 路由保存未知保持同一 `route-draft-ui-03-027`；冲突稳定后焦点落在唯一“刷新可选版本”；保存成功标题获得焦点并只提供“留在路由页 / 进入影响检查”。全过程当前生效仍为开发基线 `v1.0.0`。
- 测试失败仅有一个“创建新的零网络测试”；原 `test-ui-03-041` 创建后变为新 `test-ui-03-042`。queued/running 的创建动作禁用；unknown 只保留“查询本次测试结果”。
- 登记部署、创建版本、路由草稿的受保护表单均以“安全返回”为初始焦点；真实 `Tab / Shift+Tab` 在可用表单控件和动作间闭环，非提交中 `Escape` 回原触发点。Rev 1 发布/回滚焦点证据不重跑。

### 12.4 双视口变化场景与证据

真实浏览器在 `1024×768` 下复核版本/测试抽屉：侧栏 `72px`，右侧抽屉 `430px`（`x=594`），页面根 `clientWidth=scrollWidth=1024`；部署表固定 `1080px`，其父 `.table-wrap` 为 `clientWidth=922 / scrollWidth=1080 / overflow-x:auto`。路由保存成功对话框位于剩余工作面内，根宽同样不横溢。1440 登记、版本、测试历史与路由编辑只复验变化场景，未重跑 Rev 1 矩阵。

| 证据 | 内容 |
| --- | --- |
| `evidence/ui-system-03-rev2/01-register-deployment-1440.png` | 1440 登记部署受保护表单、受控 Registry/region/endpoint 字段 |
| `evidence/ui-system-03-rev2/02-new-version-secret-modes-1440.png` | 1440 新版本与 Secret 四态，其中替换因数据源未启用而禁用 |
| `evidence/ui-system-03-rev2/03-version-and-test-history-1440.png` | 1440 不可变版本历史、有界测试历史与新旧测试身份 |
| `evidence/ui-system-03-rev2/04-routing-draft-editor-1440.png` | 1440 精确部署版本、无部署备用位和三项容量编辑 |
| `evidence/ui-system-03-rev2/05-routing-save-success-dialog-1024.png` | 1024 同一草稿保存成功与进入影响检查 |
| `evidence/ui-system-03-rev2/06-version-test-history-drawer-1024.png` | 1024 版本/测试抽屉、1080px 表格仅容器内滚 |

证据根目录：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\ui-system-01-control-shell\`。

### 12.5 验证与八项差量包

1. 任务/版本：`UI-SYSTEM-03 Rev 2`；只关闭 FIFO 169 功能等价与数据所有权退审项，状态转 `review`。
2. 新增事实：真实部署登记、不可变版本/Secret 四态、服务端可发现测试历史、精确版本路由草稿与同身份恢复均已进入唯一原型。
3. 精确输入/证据：`DESIGN.md` 5.12、本节、唯一仓库外原型及上列六张变化证据；Rev 1 十张证据冻结。
4. 允许文件：`DESIGN.md`、本验收文档、CURRENT/开发日志、既有仓库外原型与证据；生产代码、迁移和 contracts 修改为 0。
5. 冻结/非目标：视觉、布局、双视口基线、发布/回滚链不变；不接真实供应商、网络、密钥、付费、预算、速率、扩缩容或部署，不解锁 Wave B。
6. 定向验证：`node --check`、授权文档 `git diff --check`、真实浏览器焦点/身份/根宽/表格内滚/控制台；Impeccable detector 按派发要求不重复。
7. 接收/停止：完成包只交规划固定任务，Reviewer=规划对话；不通知或启动前端、后端 Wave B、测试。
8. 职责/衔接：职责矩阵“系统控制台引擎/API 与安全配置发布”；部署/版本属 Wave A，路由/发布属 Wave B；`INT-11` 只在发布后把当前生效配置提供给新任务，当前页面不得提前改写 active 指针。

## 13. FRONT-SYSTEM-03C Rev 3 正式完整 UI 终验（FIFO 179）

### 13.1 环境、边界与结论

- 使用新鲜 `system-frontend` Vite production build（Vite 8.2.1，25 modules）、正式 Fastify system-control routes、服务端逐请求身份 resolver 和本轮精确隔离 PostgreSQL。主 UI 库为 `qimao_fifo179_ui_20260817`，空态库为 `qimao_fifo179_empty_20260817`，版本固定专项库为 `qimao_fifo179_jobs_20260817`；均从零执行 29 个迁移。
- 正式浏览器矩阵覆盖 `1440×900 / 1024×768`、三页真实读写、权限、分页、未知恢复、进程重启、空库与 ASR/OCR 新旧 Job 版本固定；只使用零网络 adapter/probe。正式前端没有测试身份 header、owner bypass 或匿名样例，员工站没有管理 API/导航入口。
- 结论：`P0=0 / P1=4 / P2=0 / P3=0`，本次正式 UI 终验**不通过**。视觉、数据所有权、真实分页、发布/回滚持久化、双视口和版本固定主体通过；四项 P1 均集中在失败/未知/提交中的恢复动作与焦点所有权。生产代码本轮修改为 0，只交规划归因。

### 13.2 完整矩阵结果

| 范围 | 新鲜正式结果 |
| --- | --- |
| 权限与两站隔离 | 匿名、employee audience 均被 system-control API 403；read/write/test/publish/rollback 单能力只可访问自身路由，邻接能力拒绝；owner 全链可用。`system-frontend/src` 测试身份 header 命中 0，员工 `frontend/src` 管理 API/ControlShell 导航命中 0。 |
| `/engines` 读取 | 服务端搜索“华东 ASR”返回 `1/1`；部署分页第 2 页 `21–23/23`，版本第 2 页 `21–22/22`，测试第 2 页 `21–21/21`。空库明确“暂无引擎部署”，无 bootstrap/匿名部署。首次失败、再次失败与恢复均返回真实 requestId，但恢复动作/焦点见 P1-02。 |
| 登记部署与版本 | 登记部署真实创建后列表可见；新版本 v2 创建后抽屉可见，重启 Fastify 后仍从 PostgreSQL 恢复。Secret 显示继承、明确清除、替换不可用三种当前有效语义；没有任意 referenceId/明文输入，密钥与安全去向禁用且诚实说明未启用。 |
| 连接测试 | queued/running/unknown 均阻止重复创建；failed 再次创建产生新的 testRunId；真实零网络 Worker 将新测试推进 succeeded，重启后仍可发现。unknown 缺同 testRunId 查询动作，见 P1-03。 |
| 部署状态 | 未引用部署 enabled/disabled 稳定命令成功并在重启后恢复；active 路由引用停用返回稳定 409、原因与 requestId，状态不变；unknown 初始保留同 statusCommandId。失败/unknown 后焦点见 P1-01。 |
| `/routing` | asr/screen_text 当前生效独立读取，历史 status 筛选、翻页和空历史不影响 current 投影；精确空库显示“暂无 active 路由 / 服务端没有默认 active”。三池主备/无部署与 9 个容量输入完整；部署→版本分步分页，第 21/22 个版本可达，选中 versionId 返回第 1 页仍保留“已选择，当前页外”。 |
| 路由状态链 | draft/testing/impact_checked/approved/active/retired 可读；`no_primary_deployment` 为硬阻断，批准禁用。草稿 unknown 初始只查询同 routingVersionId；查询 404 后恢复入口与焦点见 P1-01。 |
| `/changes` 与审计 | 路由真实 total 10；审计真实 total 31，第二页 9 条，publish action 筛选 total 3；actor/result/requestId/time 均为服务端脱敏事实。active 无自身回滚，approved/retired 可作为目标。 |
| 发布/回滚 | 发布 v3 成功后 current pointer 切换且 H1 获焦；回滚 v2 成功后 pointer 恢复且 H1 获焦；失败/unknown 期间旧 active 不变。Fastify PID `17364→33928` 重启后 v2 active、v3 retired、回滚审计与部署/版本/测试均从 PostgreSQL 恢复。发布 unknown 恢复入口见 P1-01。 |
| 新旧 Job 版本固定 | 在独立从零库用正式 `SystemControlRoutingService.publish`、`AsrCommandRepository.create`、`ScreenTextWriteRepository.create` 创建发布前/后的 ASR 与 OCR Job。四组记录分别固定不同 `routingVersionId / deploymentVersionId`；发布 v2 后旧 Job 保持 v1，新 Job 固定 v2，结果 `pass=true`。routing 专项另为 1 文件 5/5。 |
| 键盘与提交中 | 登记、版本、发布/回滚弹窗安全初焦与非 pending 的 Shift+Tab/关闭回触发点成立；中文和空格输入不抢焦点。状态命令提交中 `aria-busy=true / data-locked=true` 且三个按钮全部 disabled，但焦点落 BODY，见 P1-04。 |
| 响应式 | 1024 Chromium 根滚动条沟槽后 `clientWidth=1009`；收起侧栏 72、主区 `x=72 / width=937`，展开 216 只覆盖且主区不变；根 `scrollWidth=clientWidth=1009`。部署表 `980px` 仅在自身 `899px` 容器横滚，6 列完整。1440 三页达到冻结 ControlShell 密度。 |
| 控制台与诚实边界 | 正式页面 console `error/warn=0/0`；无真实供应商、SDK、Secret、付费、外网、云资源、默认 active、fallback 或第二状态源。浏览器运行器自身 Statsig 外连超时不来自产品页面，未计入产品 console。 |

### 13.3 集中缺陷包

1. `QA-FRONT-SYSTEM-03C-179-01`（P1）：高风险命令确定失败/unknown 后没有稳定的唯一安全焦点。部署状态 409 后反馈 DIV 抢焦，重开弹窗焦点仍在外层且 Escape 不关闭；部署状态查询 404 后焦点落 BODY；路由草稿查询 404 后焦点回“新建路由草稿”且页面同时存在通用重读与同身份查询；发布 unknown 初始焦点落通用“重新读取”，不是同 releaseCommandId 的“查询本次命令结果”。
2. `QA-FRONT-SYSTEM-03C-179-02`（P1）：引擎列表已有成功事实后的 refresh 503 没有显示 stale/error/requestId；首屏连续失败同时出现工具栏与错误块两个“重新读取”；恢复成功后焦点落 BODY。需要保留最后成功事实、唯一恢复动作并在成功后把焦点落页面标题或明确安全目标。
3. `QA-FRONT-SYSTEM-03C-179-03`（P1）：连接测试 `unknown` 行可见且禁止重复创建，但没有同 `testRunId` 的唯一“查询本次测试结果”，只有通用历史刷新；不满足统一异步命令身份的只读恢复门。
4. `QA-FRONT-SYSTEM-03C-179-04`（P1）：部署状态真实提交中虽正确锁定 dialog 与全部按钮，原确认按钮 disabled 后焦点却落 BODY，活动焦点逃出受保护弹窗；必须在 pending 期间保留可编程 dialog/安全焦点，Tab、Escape、遮罩与重复提交均由同一锁管理。

### 13.4 证据、清理与八项差量包

仓库外脱敏证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\front-system-03c-rev3-ui-qa\`

- 结构化结果：`fifo179-results.json`、`fifo179-version-stickiness.json`。
- 截图：`01-engines-1440.png`、`02-engine-detail-1440.png`、`03-changes-1440.png`、`04-engines-1024-collapsed.png`、`05-engines-1024-expanded.png`、`06-routing-empty-1024.png`。

1. 任务：`FRONT-SYSTEM-03C Rev 3 / FIFO 179`；SYSTEM-03 本切片唯一完整正式 UI 终验，结论为退回规划。
2. 新增事实：权限、两站隔离、真实三页、分页、零网络测试、发布/回滚、空库、双视口、重启恢复和新旧 Job 版本固定通过；新增 P1×4。
3. 精确输入/证据：本文 §13、上述仓库外 JSON/截图、正式 build/Fastify/三套精确隔离 PostgreSQL。
4. 允许文件：本轮只写两份 `docs/ui`、CURRENT/开发日志和仓库外脱敏证据；生产 `frontend/system-frontend/backend/contracts/migrations/DESIGN` 修改 0。
5. 冻结/非目标：UI Rev 2 视觉与数据所有权继续冻结；不接真实网络/供应商/Secret/付费/云资源，不运行完整 `pnpm check`，不提交推送部署。
6. 验证：Vite 25 modules build、routing 专项 5/5、正式浏览器矩阵、版本固定 `pass=true`、console 0/0；未重复 Impeccable。
7. 接收/停止：矩阵完整跑完后一次性提交四项 P1；只交规划，不直接通知前后端或解锁 `TEST-SYSTEM-03`。
8. 职责/衔接：独立管理员 ControlShell；`INT-11/12/13`。四项 P1 关闭前，SYSTEM-03 不进入最终集成验收关闭门。

## 14. FRONT-SYSTEM-03C Rev 4 变化场景微终验（FIFO 181）

### 14.1 环境、范围与结论

- 使用新鲜 `system-frontend` production build（Vite 8.2.1，25 modules）、正式 Fastify system-control routes、后端逐请求 resolver 注入的控制台身份，以及精确隔离 PostgreSQL `qimao_fifo181_ui_20260817`（从零执行 29 个迁移）。正式前端没有测试 header、页面脚本服务端结果伪造或第二状态源。
- 本轮只复验 FIFO 179 的 A–D 变化场景；权限、两站隔离、分页、三池、1440/1024、进程恢复和版本固定等其余 49 项继续引用 §13 并冻结。未重复 Impeccable，未运行完整 `pnpm check`。
- 结论：`P0=0 / P1=3 / P2=0 / P3=0`，微终验**不通过**。稳定命令身份、PostgreSQL 历史 unknown、部署状态 pending 锁与发布/回滚恢复主体通过；仍有三个真实焦点/遮挡 P1。生产 `frontend/system-frontend/backend/contracts/migrations/DESIGN` 修改为 0。

### 14.2 A–D 变化场景结果

| 场景 | 新鲜正式结果 |
| --- | --- |
| A `/engines` 读取 | 已有 5 行事实的刷新 503 保留旧表、显示 stale、真实 requestId 与恰好一个“重新读取”；再次失败仍唯一，成功后 stale 清除并聚焦 H1。首屏失败→再次失败→成功同样无重复入口。但两类失败稳定后活动焦点均为 `BODY`，见 P1-01。截图复验 requestId=`72174f4f-1a56-40c5-b9ba-9928ff28b7d6`。 |
| B PostgreSQL 历史 unknown | 直接从数据库发现 `testRunId=34444444-4444-4444-8444-444444444444 / status=unknown`；首次同 ID GET 失败后保留真实 requestId、同 ID 与唯一动作并聚焦，数据库推进 succeeded 后第二次同 ID GET 刷新历史；创建 POST=`0`。该子场景通过。 |
| B 本次 create unknown | 正式创建只发送一次 POST，并持有稳定 `testRunId=5d73cf10-6ce9-4cd5-81d7-a73cd2312253`。但唯一“查询本次测试结果”位于主页面右侧，被仍打开的版本抽屉遮挡；抽屉关闭按钮又被更高层顶栏覆盖，语义点击、真实键盘和坐标点击均不可达，故 GET=`0`，见 P1-02。 |
| C 部署状态 | active 引用停用确定失败返回正式 409、状态不变且无稳定查询；unknown 只用同 `statusCommandId` GET，GET 首次 503 后保留同 ID/requestId/唯一焦点动作，第二次成功，写 POST 不重复。通过。 |
| C 路由草稿 | 主备同版本由正式后端返回 422/requestId；确定失败清意图并刷新权威，但错误 alert 获焦时位于 modal 遮罩后方、焦点逃出 dialog。unknown 为 POST=`1`、同 `routingVersionId` 唯一 GET，未并列通用重试；GET 成功后焦点落 `BODY`。见 P1-03。 |
| C 发布/回滚 | 发布 unknown 使用 `releaseCommandId=81bba7ed-e4b5-49d0-b9ac-0830d211f9d4`，POST/GET 各 1，requestId 分别为 `058448a4-9466-4e49-b263-70ad8ca53163` / `d577a216-e750-4f1b-b9cb-2ee7e65dd5e4`；回滚 unknown 使用 `releaseCommandId=5eb68d35-596c-4bce-9035-37ff4f03a6d2`，POST/GET 各 1，requestId 分别为 `140bc1b2-6bd0-4572-a75e-d5d90df5a8af` / `277a406d-44fd-4513-8720-bff009f6cbb0`。确定失败均保留旧 active；unknown 唯一动作聚焦，成功才切 pointer 且 H1 聚焦。通过。 |
| D 部署状态 Modal | 真实 delay 下 `aria-busy=true / data-locked=true`，焦点在可编程 dialog；Tab/Shift+Tab 不逃逸，Escape/遮罩/重复提交受阻，按钮锁定。unknown/GET 失败后唯一恢复获焦；成功后焦点回状态触发按钮。非 pending Escape 关闭并回原触发点。通过。 |
| 共同门 | 正式页面 console `error/warn=0/0`；两份 system-control 前端专项新鲜 `2 files / 26 tests` 通过；只使用零网络 adapter/probe，未接真实供应商、Secret、付费、网络或云资源。 |

### 14.3 集中缺陷包

1. `QA-FRONT-SYSTEM-03C-181-01`（P1）：读取错误块已拥有 stale、真实 requestId 与唯一恢复，但首屏失败和已有事实刷新失败稳定后均未获得安全焦点，活动焦点落 `BODY`；恢复成功 H1 聚焦已通过。
2. `QA-FRONT-SYSTEM-03C-181-02`（P1）：本次连接测试 create POST unknown 后，同 `testRunId` 的唯一查询动作被版本抽屉遮挡，同时抽屉关闭按钮被顶栏覆盖，导致恢复动作在真实 UI 中不可达。不能以 POST=`1` 代替完整只读恢复通过。
3. `QA-FRONT-SYSTEM-03C-181-03`（P1）：路由草稿确定失败把焦点移到 modal 遮罩后的页面 alert，违反 dialog 焦点所有权；unknown 查询成功后又落 `BODY`，缺明确安全目标。确定失败/unknown 的稳定身份与 POST 防重复本身已通过。

### 14.4 证据、清理与八项差量包

仓库外脱敏证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\front-system-03c-rev4-ui-qa\`

- 结构化结果：`fifo181-results.json`。
- 截图：`01-status-pending-1440.png`、`02-publish-unknown-1440.png`、`03-create-test-unknown-occluded-1440.png`、`04-engines-stale-1440.jpg`、`05-routing-draft-error-1440.jpg`。

1. 任务：`FRONT-SYSTEM-03C Rev 4 / FIFO 181`；只做 FIFO 179 四组变化场景微终验，结论退回规划。
2. 新增事实：历史 unknown、部署状态、发布/回滚和 pending Modal 通过；新增 P1×3，均为读取/抽屉/路由草稿的焦点与可达性。
3. 精确输入/证据：本文 §14、ControlShell 验收 §13、上述 JSON/截图、正式 build/Fastify/隔离 PostgreSQL。
4. 允许文件：只写两份 `docs/ui`、CURRENT/开发日志和仓库外证据；生产代码与 DESIGN 修改 0。
5. 冻结/非目标：FIFO 179 其余矩阵、UI Rev 2 视觉与业务状态冻结；不接真实资源，不重复完整矩阵、Impeccable 或完整 `pnpm check`。
6. 定向验证：Vite 25 modules、system-control 前端专项 26/26、A–D 正式浏览器变化场景、console 0/0。
7. 接收/停止：一次性把三个 P1 交规划；不通知前端/后端/测试，不自行 done 或解锁 `TEST-SYSTEM-03`。
8. 职责/衔接：独立管理员 ControlShell，`INT-11/12/13`；后继修正应继续复用公共读取/Modal/命令恢复原语，禁止页面级 fallback 或第二状态源。

## 15. FRONT-SYSTEM-03C Rev 5 三项变化场景微复验（FIFO 183）

### 15.1 环境、范围与结论

- 使用本轮新鲜 `system-frontend` production build（Vite 8.2.1，25 modules）、正式 Fastify system-control routes、后端逐请求 resolver 注入的控制台验收身份，以及从零执行 29 个迁移的精确隔离 PostgreSQL `qimao_fifo183_ui_20260817`。
- 本轮只复验 §14 的三个原 P1；FIFO 179 其余 49 项、UI Rev 2 视觉、后端/契约/业务状态继续冻结。未重复 Impeccable、完整矩阵、两份 28/28 专项或完整 `pnpm check`，生产 `frontend/system-frontend/backend/contracts/migrations/DESIGN` 修改为 0。
- 结论：`P0=0 / P1=0 / P2=0 / P3=0`，三个原失败场景均通过；页面 console `error/warn=0/0`。

### 15.2 三项变化场景结果

| 场景 | 新鲜正式结果 |
| --- | --- |
| A 引擎首屏失败 | 首次与再次 503 的真实 requestId 分别为 `b66ba86a-8555-4294-ab8f-07ab25e94e7f`、`03d9a4c3-900d-41d1-a301-d220f257bb78`；稳定后活动焦点均在唯一 ErrorBlock，页面恰好一个“重新读取”；恢复后错误消失并聚焦 `H1=引擎与 API`。 |
| A 已有事实刷新失败 | 两行旧事实保留并显示“上一次服务端事实已保留，当前读取失败”；首次/再次真实 requestId 为 `6c708b10-a00c-4e5f-b76f-407df68b0500` / `01f36de9-ca67-4452-9df8-9671cc0e58b1`。两次均只有一个恢复动作且 ErrorBlock 获焦；成功后 stale 清除、两行事实继续存在并聚焦 H1。 |
| B 本次 create POST unknown | `testRunId=ded18877-2255-4990-bd53-e417f6329003`，POST=`1`、同 ID GET=`1`。唯一“查询本次测试结果”位于 `aria-label=引擎详情` 抽屉内，是自动聚焦的原生 button；真实几何为 `left=1295.61 / right=1397 / top=575.47 / bottom=633.16`，中心 hit-test 命中按钮，根宽 `1440=1440`。requestId=`fb4083c7-c970-48cb-a2e4-1974acc53892`。 |
| B PostgreSQL 历史 unknown | 直接发现 `testRunId=34444444-4444-4444-8444-444444444444 / status=unknown`；行内恰好一个查询动作，同 ID GET=`1`、创建 POST=`0`，服务端推进 succeeded 后历史刷新为成功且恢复入口消失，没有第二入口。 |
| C 路由确定性失败 | 正式后端拒绝主备同版本，requestId=`4f632290-2bb0-4811-a6f3-0ae387cb8117`。活动 Modal 内错误=`1`、遮罩后错误=`0`，焦点为 dialog 内 alert；关闭后 dialog/alert 均为 0，焦点回“新建路由草稿”。 |
| C 路由 unknown | `routingVersionId=ac4540c0-f987-4c07-9f42-c71aa82f5486`，写 POST=`1`；第一次同 ID GET 受控失败并显示真实 requestId=`92306de4-2fb5-4874-9829-629a34999cde`，唯一查询动作获焦且不落 BODY；第二次同 ID GET 成功，累计 GET=`2`、POST 未增加，恢复入口消失并聚焦 `H1=路由与调度`。 |
| 层级与共同门 | 实测 `topbar=35 / drawer=45 / modal backdrop=60`，保持 `modal > drawer > topbar`；六张截图均经本轮保存与人工查看，页面 console `error/warn=0/0`。 |

### 15.3 证据、清理与八项差量包

仓库外脱敏证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\front-system-03c-rev5-ui-qa\`

- 结构化结果：`fifo183-results.json`。
- 截图：`01-engines-initial-repeat-error-1440.png`、`02-engines-stale-repeat-error-1440.png`、`03-create-test-unknown-drawer-1440.png`、`04-history-unknown-row-1440.png`、`05-routing-deterministic-modal-error-1440.png`、`06-routing-unknown-get-failed-1440.png`。
- 清理：浏览器标签为 0、临时视口已 reset；`31831/31832` 无 LISTENING；隔离库已精确 DROP 且同名查询为 `false`；临时 harness/seed/inspect/shim 文件已删除。共享默认库和其他任务服务未动。

1. 任务：`FRONT-SYSTEM-03C Rev 5 / FIFO 183`；只复验 FIFO 181 三个原失败场景，结论转规划复核。
2. 新增事实：读取失败安全焦点、create unknown 抽屉内可达恢复、路由 Modal 错误所有权与 unknown 成功 H1 落点均已关闭原 P1。
3. 精确输入/证据：本文 §15、ControlShell 验收 §14、上述 JSON/六张截图、正式 build/Fastify/隔离 PostgreSQL。
4. 允许文件：只写两份 `docs/ui`、CURRENT/开发日志和仓库外证据；生产代码与 DESIGN 修改 0。
5. 冻结/非目标：FIFO 179 其余 49 项、UI Rev 2 视觉、后端/契约/业务状态继续冻结；不接真实资源，不重跑完整矩阵。
6. 定向验证：Vite production build 25 modules、A–C 正式浏览器变化场景、z-index 与 console 0/0；规划此前专项 28/28 不在本轮重复。
7. 接收/停止：先写回权威状态，再只交规划；不通知前端/后端/测试，不自行 done 或解锁 `TEST-SYSTEM-03`。
8. 职责/衔接：独立管理员 ControlShell，继续遵守 `INT-11/12/13` 的单一状态源、稳定命令身份和两站权限隔离。
