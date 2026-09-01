# SYSTEM-07 策略与学习中心 UI 验收

状态：UI-SYSTEM-07 / FRONT-SYSTEM-07A / TEST-SYSTEM-07A 已关闭
日期：2026-08-18
权威输入：`SYSTEM-policy-learning.md`、`SYSTEM_CONTROL_CENTER.md` §5/§7–9、DESIGN 5.11/5.16、职责矩阵与 `INT-11/14/15/17`

## 1. 设计结论

`/strategy` 继续使用唯一 ControlShell 的冷灰白主画布、深石墨蓝侧栏与 `#4458D8` 主要动作。页面不是聊天智能体，也不是夸张 AI 大屏；它是一张高密度策略工作台，先让管理员看清当前纳管范围和事件证据，再创建不可变草稿。

Wave A 正式开放总览、本地规则、AI 筛选、提示词模板、热词与风险词、操作日志。学习候选、评测与发布保留可发现但禁用的后续标签，并说明“学习结果不会自动上线”。

## 2. 页面与状态矩阵

| 区域 | 正常 | 空 | 失败/恢复 | Wave A 写入 |
| --- | --- | --- | --- | --- |
| 总览 | 五类资产状态、近 24h 安全事件、最近草稿 | 尚未纳管/暂无事件 | 旧事实 stale、requestId、唯一重读、恢复聚焦 H1 | 登记策略资产 |
| 资产列表 | 服务端搜索、类型/模块筛选、排序、分页 | 当前条件无资产 | 保留旧表并锁写；再次失败仍唯一重读 | 查看详情、创建下一不可变草稿 |
| 资产详情 | 身份、版本时间线、结构化摘要、digest、审计深链 | 无历史版本时仅显示初始说明 | 抽屉内错误和原查询重读 | 新版本成功后聚焦新版本标题 |
| 操作日志 | 模块/项目/集轨/动作/版本/时间/摘要/证据数 | 当前条件无事件 | 旧事实 stale，恢复后回标题 | 只读，无编辑/删除/导出原文 |
| AI/词库 | 未接入、关闭/复核/抽样等草稿语义 | 尚未纳管 | 与资产列表相同 | 只创建草稿，不调用模型/发布 |
| 候选/评测 | 后续波次说明 | 不显示假空表或假数量 | 无 API 请求 | 无可执行动作 |

## 3. 信息和隐私门

- 生产页面不得出现完整 `before_state/after_state`、字幕正文、音视频、完整提示词/热词、对象键、Secret、供应商载荷、SQL/连接串或模型隐藏推理。
- 安全事件详情必须明确“只作为证据，不会自动成为规则”，并显示撤销/恢复关系。
- 风险词只表达提示/人工复核，不表达自动删除或交付阻断。
- AI 未授权时显示“尚未接入”，不伪造模型、供应商、准确率、费用或请求进度。
- 全部费用主口径为 CNY；Wave A 没有付费操作。

## 4. 异步与焦点合同

- 初始页面读取：loading → normal/empty/error；已有事实刷新失败保留 stale，写入口全锁。
- 新建资产/版本使用稳定资源 ID 与幂等键。网络未知只查询同一身份；确定失败保留输入并刷新权威事实后由管理员新提交。
- Modal 初始聚焦安全返回；正反向 Tab 闭环；pending 时 dialog 获焦并锁定 Escape/遮罩/重复提交；失败聚焦错误摘要，成功聚焦资产/版本标题。
- 抽屉打开聚焦标题，Escape/关闭回原行；筛选身份变化清除失效抽屉，迟到响应不覆盖新查询。

## 5. 视觉与响应式合同

- 1440：侧栏 216px；五类纳管摘要单行；资产/事件双栏；页内标签单行。
- 1024：侧栏 72px，展开为覆盖层且主区不挤压；摘要两列、内容单栏；表格最小 1080px，仅 `.table-wrap` 横滚。
- 根页面无横向溢出；抽屉 460px/不超过主区 52%；Modal 最大 620px。
- 状态不能只靠颜色；弱文字达到 4.5:1；焦点环沿用统一靛蓝；无渐变文字、玻璃拟态、霓虹或聊天气泡。

## 6. 原型与证据

规划接管原型：`C:\Users\ComradeGu\.codex\visualizations\2026\08\12\019ff4f8-4a77-7870-8edf-6350490b316c\ui-system-07-strategy\index.html`

原型中的“设计预览”、匿名项目短 ID、状态切换器和示例草稿只用于设计验收，不进入生产。正式证据在浏览器矩阵完成后追加，生产前端与后端在本 UI 任务中修改为 0。

## 7. 冻结边界

- 不重开 ControlShell 视觉方向，不新增 B/C 主题或运行时皮肤。
- 不实现正式 React、API、迁移、真实 AI、Secret、网络、付费、训练、active、发布或回滚。
- 不修改员工 AppShell，不把管理员策略或跨项目事件暴露给员工身份。
- Wave B/C 必须重新完成 v4.8 启动预检，不能从本原型自动推导生产权限或状态机。

## 8. Rev1 真实浏览器验收（规划接管）

规划在可写环境接管同一 `UI-SYSTEM-07 Rev1`，没有另开任务或扩大 Wave A。验证对象为仓库外可操作原型与本节证据，不是生产 React。

- 1440×900：根页面 `1440/1440`，侧栏 `216px`，主区 `1224px`；五类摘要单行、资产/事件双栏成立。
- 1024×768：根页面 `1024/1024`；侧栏收起 `72px`，主区 `x=72 / width=952`；覆盖展开后侧栏 `216px`，主区位置和宽度不变。资产表 `.table-wrap=914px / table=1080px`，横向滚动只发生在表格容器内。
- 新建资产 Modal 初始焦点为“安全返回”；Tab/Shift+Tab 始终留在弹窗，提交中按钮禁用且 dialog 持有焦点，成功后聚焦页面标题并通过 `role=status` 播报“生产规则没有改变”。
- 事件详情抽屉打开后标题获焦；Escape 关闭并恢复原“查看证据”触发点。安全投影只显示事件身份、模块、关系、字段/证据数量和摘要 digest。
- 首次读取失败显示稳定原因、`requestId` 和唯一“重新读取策略事实”；恢复后聚焦 H1。页面控制台 `error/warn=0/0`。
- 首轮 1024 验证发现 `.sidebar` 固定定位后主区误落入第一网格列，导致主区被压至 `72px`；已在原型中一次性固定 `.shell-stage{grid-column:2}`，复验上述两态通过。该问题未进入生产前端。

证据：

- `evidence/strategy-1440-overview.png`
- `evidence/strategy-1024-assets.png`
- `evidence/strategy-1440-event-drawer.png`

静态辅助：`app.js`、`serve.mjs` 的 `node --check` 与授权文档 `git diff --check` 通过。Impeccable detector 按规则只运行一次；因当前环境缺少 `htmlparser2/css-select/css-tree/domutils` 降级为正则模式，返回 `[]`，仅作辅助，不替代上述 DOM、键盘、尺寸与截图证据。

## 9. 正式 React/Fastify/PostgreSQL Wave A 终验

- 正式 `system-frontend` `/strategy` 只消费共享 strategy 契约与 Fastify/PostgreSQL 权威事实；未向员工站暴露管理页面或管理 API，未接真实 AI、Secret、网络、付费、训练、发布或回滚。
- 版本创建必须先选择既有版本作为基线；表单完整继承五类严格 payload。真实 v1→v2→v3 验证确认提示词变量与结构化本地规则不丢失，本地规则最多 500 条，可逐条编辑/新增/删除；普通列表与详情仍只展示轻量摘要，不泄露完整正文。
- 创建成功后聚焦 `已选择 vN` 标题；Modal 初始安全焦点、Tab/Shift+Tab 双向闭环、Escape 与关闭恢复触发点成立。1440 与 1024 根页面均无横向溢出；1024 规则编辑器自适应为两列，窄屏继续单列，复选框未被网格拉伸；控制台 `error/warn=0/0`。
- 新鲜验证：策略前端 `7/7`；管理员前端五文件 `56/56`；`system-frontend` typecheck 与 Vite production build（39 modules）通过；完整 `pnpm check` 退出码 0，37 files / 347 tests、全仓库 lint/typecheck 与四项目构建全部通过。
- 三个精确隔离验收数据库已删除且残留 0，本地 PostgreSQL 55432 已停止。结论 P0/P1/P2/P3=`0/0/0/0`，Wave A 正式关闭；Wave B/C 仍须重新预检并保持人工批准门。

## 10. Wave B Rev1 正式交互冻结

状态：`UI-SYSTEM-07B Rev1 review`；本节是 Wave B 前端的 UI 权威输入，不代表后端 API 已完成。规划预检留下的 Wave B contracts/迁移仍是未验证草案，正式字段和路由以 BACK-SYSTEM-07B 规划审核后的共享契约为准。

主链固定为“创建零网络优化运行 → 候选审查/编辑/驳回/恢复/送评测 → 离线评测结果 → 返回候选”。运行、候选或评测成功都不等于批准，不创建策略版本，不改变 active 指针，也不触及员工站规则。页签冻结为“优化运行 / 学习候选 / 离线评测 / 批准与发布（Wave C 禁用）”。

| 区域 | 正常/空 | 失败与 unknown | 允许写动作 | 成功焦点 |
| --- | --- | --- | --- | --- |
| 优化运行 | 服务端筛选/分页；空态说明尚无运行 | failed 显式新建；unknown 只查询同一运行身份 | 创建零网络运行 | 新运行标题 |
| 学习候选 | 支持/反对/未知、误报提示、修订/决定状态；空态不伪造候选 | stale 锁写；命令 unknown 查同一 candidate/command | 编辑、驳回/恢复、送评测 | 更新后候选标题 |
| 离线评测 | 基线/候选误报、漏报、人工量、耗时、unknown、CNY | failed 不改变候选；unknown 只查询同一评测 | 创建评测、返回候选 | 评测标题/H1 |
| 批准与发布 | Wave C 说明 | 不请求 API | 无 | 无 |

受保护 Modal 均以安全返回为初始焦点，Tab/Shift+Tab 双向闭环；pending 时 dialog 获焦并锁 Escape、遮罩和重复提交。抽屉打开聚焦标题，关闭返回原触发点。首次读取失败显示真实 requestId 与唯一重读；再次失败保持唯一恢复；stale 保留旧事实但锁定全部写入口，恢复成功聚焦 H1。

## 11. Wave B 双视口与视觉门

- `1440×900`：216px 侧栏；标签栏单行自身横滚；运行表只在容器内横滚；候选单列审查；评测四项摘要与五项指标各单行。
- `1024×768`：72px 侧栏，覆盖展开不挤压正文；候选动作换行；评测摘要/指标两列；根页面 `scrollWidth=clientWidth`。
- 所有方向差异有文字/数值，不能只靠颜色；unknown、待对账、部分指标缺失不补 0。状态文案不出现“AI 已学习”“评测通过”“可发布”。
- 原型：`C:\Users\ComradeGu\.codex\visualizations\2026\08\12\019ff4f8-4a77-7870-8edf-6350490b316c\ui-system-07b-strategy-wave-b\index.html`。其中匿名数量、短身份、预览状态切换器和模拟延迟仅用于设计验收，不进入生产。

## 12. Wave B 非目标

- 不接真实 AI、Secret、网络、付费、训练或供应商；不设计自动批准/发布/回滚/小流量。
- 不修改生产前后端、contracts、迁移或员工站；不把两份后端未验证草案写成完成 API。
- 不显示完整事件正文、字幕/音视频、完整提示词/热词、对象键、Secret、供应商载荷或模型隐藏推理。

## 13. Wave B Rev1 原型证据

- 1440 优化运行：根 `1440/1440`、侧栏 `216px`，运行表宽 `1186/1186`；证据 `evidence/strategy-wave-b-1440-runs.png`。
- 1024 候选：根 `1009/1009`、侧栏 `72px`、正文 `x=72 / width=937`；抽屉标题焦点与关闭返回审查按钮成立；证据 `evidence/strategy-wave-b-1024-candidates.png`。
- 1024 离线评测：摘要与指标均两列，根无横溢；证据 `evidence/strategy-wave-b-1024-evaluation.png`。
- 创建运行 Modal 初始焦点为“安全返回”；页面控制台 `error/warn=0/0`。`app.js`/`serve.mjs` node check 与仓库 `git diff --check` 通过（仅既有 CRLF 提示）。Impeccable detector 仅运行一次，依赖缺失降级正则并返回 `[]`，不替代浏览器证据。

## 14. Wave B Rev2 候选可操作微返工证据

- 四行候选分别绑定稳定身份 `候选-C061/C060/C059/C058`；抽屉逐行显示自己的类别、证据计数、修订、状态和严格字段。待审查/已编辑候选提供编辑、结构化驳回、送评测；已驳回候选只提供恢复；待送评测提供明确确认动作。
- 严格字段编辑真实更新对应候选标题/领域字段、修订 `2→3` 与状态；结构化驳回包含原因枚举和短备注，成功后该行变为“已驳回 / 查看并恢复”，抽屉唯一动作是“恢复候选”；恢复成功回到“待审查”。送评测确认显示候选身份、固定 digest、只读回归集和“不代表批准或发布”。
- 四类 Modal 初始焦点均为“安全返回”；连续正向/反向 Tab 均保持在 Modal 内；pending 时 dialog 为 `aria-busy=true` 且安全返回/主操作同时锁定。Escape 返回当前候选抽屉标题；成功返回对应候选标题。
- 编辑命令模拟 unknown 时错误摘要获得焦点，保留 `候选-C060 + 同一命令身份`、真实形态 requestId 和唯一“查询同一命令”；查询后只更新同一候选。送评测确定冲突清除意图，唯一“重新读取候选”返回 `候选-C059` 标题且状态不变。
- 新增证据：`evidence/strategy-wave-b-rev2-1440-reject.png`、`evidence/strategy-wave-b-rev2-1440-evaluate-confirm.png`、`evidence/strategy-wave-b-rev2-1024-evaluate-focus.png`。1024 根 `1009/1009`，控制台 `error/warn=0/0`。这些都是匿名可操作设计原型证据，不代表 BACK API 已实现。

## 15. FRONT-SYSTEM-07B Rev3 正式 UI 终验（environment_blocked）

handoffToken：`FIFO225-FRONT-SYSTEM-07B-R3-V4.574`。本轮生产代码修改为 0；未重复运行 Impeccable，未运行完整 `pnpm check`。

- 新鲜自动验证通过：`system-frontend` Vite production build **40 modules**；策略前端与后端优化专项合并 **2 files / 15 tests 全通过**。专项覆盖 FIFO223/224 的详情身份清除、写锁、历史 unknown、候选决定 unknown、evaluation unknown、create unknown 首次 GET 失败/再次成功，以及权限默认拒绝、CNY、真实 requestId、正式事件到候选和评测的服务端链。
- 正式运行态已使用 `backend/dist`、Fastify、`system-frontend/dist` 与精确隔离库 `qimao_fifo225_ui_20260818` 从零应用 **34 migrations**；API `32130`、生产静态站 `32131` 成功监听，零网络 worker 与正式安全事件夹具已就绪。没有使用第二套业务实现，也没有修改共享库或既有服务。
- 环境阻断发生在页面打开前：内置 Browser 插件初始化拒绝其自身 `browser-service.mjs`，错误为 `Trusted RPC dependency must resolve within a configured trusted code path`。因此本轮没有产生可接受的当前运行截图，也不能核验真实 1440/1024、键盘焦点、console `0/0` 和端到端主链；自动专项不能替代这些 UI 门。
- 结论：`environment_blocked`，产品缺陷计数暂记 P0/P1/P2/P3=`0/0/0/0`，但正式 UI 终验**不通过且不关闭**。规划应在 Browser 可信路径恢复后重派同范围终验；不得据此解锁 TEST 或宣称 Wave B 完成。
- 清理：32130/32131 已释放；隔离库已强制精确删除并查询残留 `0`；临时 harness、loader 与编译副本已删除。共享 PostgreSQL 55432 的既有运行状态保持不变。

## 16. FIFO227 本地 Playwright / 系统 Chrome 替代终验（environment_blocked）

handoffToken：`FIFO227-FRONT-SYSTEM-07B-R3-V4.587`。用户授权避开故障中的 Codex Browser/Chrome 扩展服务，改用本机既有 Playwright 与系统 Chrome；验收标准、业务实现和安全边界不变。

- 能力预检通过：现有 Playwright 可解析，系统 Chrome 位于 `C:\Program Files\Google\Chrome\Application\chrome.exe`；未新增依赖、修改全局配置或引入第三套工具链。
- 新鲜 production build 通过：`system-frontend` 40 modules，backend TypeScript build 通过。策略前端专项 13/13 通过；合并后端专项时数据库 `beforeAll/afterAll` 各在 10 秒门超时，因此结果为 1 file passed、1 file failed，13 passed / 2 skipped，不能写成 15/15。
- 唯一允许的直接运行命令 `node node_modules/tsx/dist/cli.mjs .tmp/fifo227-harness.ts` 在创建数据库、端口或页面前失败，首因原样为 `uv_os_get_passwd returned ENOMEM (not enough memory)`。继续使用编译 shim、loader 或另一种 harness 将违反本轮“不得 loader/fallback/第三套工具链”，故立即停止。
- 正式 UI 主链、双视口、焦点与 console 本轮均未运行，不能沿用 FIFO225 旧证据或自动测试冒充通过。结论仍为 `environment_blocked`，产品 P0/P1/P2/P3 暂记 `0/0/0/0`，但正式 UI 终验不通过、不关闭、不解锁 TEST。
- 清理核对：`qimao_fifo227_ui_20260818` 与 `qimao_strategy_opt_%` 残留数据库均为 0；32140/32141 无监听；两份临时脚本已删除，没有启动浏览器进程。共享 PostgreSQL 55432 未停止或改写。

## 17. FIFO228 正常 Windows 用户上下文恢复探针（environment_blocked）

- handoffToken=`FIFO228-FRONT-SYSTEM-07B-R3-V4.591`。同一正常 Windows 用户上下文下 `pnpm exec tsx --version` 新鲜成功：tsx 4.23.12 / Node 24.19.0，FIFO227 的 `uv_os_get_passwd ENOMEM` 已消失。
- 但同一上下文启动同一个 TypeScript harness 两次均持续无输出，且在中止前未创建 `qimao_fifo228_ui_20260818`、未监听 32150/32151、未进入 Fastify/Worker/Chrome。两次之间仅做一次只读版本健康检查，没有更换 harness、增加 loader/shim/fallback 或第三工具链。
- 因运行态未越过第一个可观察副作用，完整 UI 矩阵仍未执行；产品 P0/P1/P2/P3 暂记 0/0/0/0，但正式终验继续 `environment_blocked`、不通过、不关闭、不解锁 TEST。
- 清理：两次挂起进程均已中止；目标库残留 0，32150/32151 无监听；临时 TypeScript harness 与 Playwright 脚本删除，无测试 Chrome 启动。共享 PostgreSQL 55432 未停止或改写。

## 18. FIFO230 PostgreSQL 恢复后矩阵复核（未闭合）

- handoffToken=`FIFO230-FRONT-SYSTEM-07B-R3-V4.598`。共享 PostgreSQL 55432 恢复后，新鲜运行策略前端与后端优化专项，结果 2 files / 15 tests 全通过（hookTimeout 30s）；FIFO227 的后端 hook 超时与 FIFO228 的数据库前置阻断均不再复现。
- 15/15 覆盖服务端正式链、权限默认拒绝、CNY/requestId，以及前端 loading/error/stale、身份切换、历史/创建/decision/evaluation unknown 与写锁回归；但本轮没有新增真实系统 Chrome 主链、1440/1024、焦点和 console 证据，故不能替代完整 UI 终验。
- 结论：产品 P0/P1/P2/P3 暂记 0/0/0/0；正式 UI 终验仍未闭合、不通过、不关闭，不解锁 TEST。生产代码修改0，共享 PostgreSQL 55432 保持 running。

## 19. UI-SYSTEM-07C Rev1 Wave C 正式设计验收

主链冻结为：未纳管 → 预览并确认导入受保护系统基线 → 对该基线直接执行固定快照零网络影子影响验证 → 人工批准该基线 → 首次发布 → 历史比较 → 人工恢复。基于基线创建自定义草稿为并列可选动作，不得强制复制同内容草稿。生产文案只称“发布/恢复命令”；失败/unknown 保持原当前生效版本，unknown 只查询同一命令短 ID。

验收硬门：系统基线永久显示“系统初始基线 / 受保护 / 不可删除”；历史版本、载荷、内容摘要、确认人和发布/回滚事件不可改写。恢复确认必须逐字段显示当前→目标，并明确“只影响新会话；历史不改写”。无当前生效版本时阻断新会话；首次发布前未绑定版本的未完成旧会话硬阻断。

严格载荷只包含 350ms、0.750000、28 和四类布尔开关；安全不变量只读。页面不得出现任意正则、脚本、公式、代码编辑器、AI/网络/Secret/付费/流量灰度。1440/1024、宽表容器滚动、公共 Modal/Drawer/ErrorBlock、全套异步与焦点合同按 DESIGN 5.17 验收。

### 19.1 页面与状态验收矩阵

| 场景 | 必须看见 | 必须可操作 | 必须不可操作 |
| --- | --- | --- | --- |
| 未纳管 | 无当前生效版本、新会话阻断、基线未导入 | 预览基线、确认导入 | 影子验证、批准、发布、恢复 |
| 基线已导入 | 来源：系统初始基线、受保护、不可删除、七字段与不变量 | 直接创建固定快照影子影响验证；并列创建自定义草稿 | 修改/删除/复制基线、未经影子影响验证/批准直接发布 |
| 草稿/验证 | 固定版本与快照身份、内容摘要、零网络说明 | 创建并读取同一影子影响验证 | 浏览器推算、自动批准或发布 |
| 已批准 | 当前生效版本 → 待发布版本、未完成旧会话 | 独立发布确认 | 修改已批准版本、绕过门禁 |
| 发布 unknown | 原当前生效版本、发布/恢复命令短 ID、requestId | 查询同一发布/恢复命令 | 重发发布或执行其他写动作 |
| 历史恢复 | 当前 → 目标、两个内容摘要、只影响新会话、历史不改写 | 创建恢复动作的发布/恢复命令；查询同一命令短 ID | 第二恢复命令/端点、覆盖历史、恢复未通过相同安全门的基线或未批准版本、自动回滚 |

### 19.2 严格字段与历史验收

- 可编辑项必须恰好为 `alignmentNearbyGapMs`、`alignmentSimilarityThreshold`、`maxCharacters` 和句末标点/markup/括号/多人半角短横线四类开关；比较、历史和恢复确认使用同一字段序列。
- `alignmentSimilarityThreshold` 在输入、详情、比较和历史中均保留六位小数；四类开关同时显示文字“开/关”，不能只靠颜色或 Switch 位置。
- `one_to_one`、ASR 质量、阻断格式、术语冲突只读且无解锁路径。任意 JSON、正则、脚本、公式、代码编辑器均判 P1。
- 每条历史必须有版本/来源、状态、结构化摘要、内容摘要、确认人、发布时间和发布/恢复事件；系统初始基线不得出现编辑、归档、删除或复制为新基线入口。
- 设计/工程交接权限必须精确为既有 `system-control:strategy:read/write`、`system-control:strategy:evaluate` 与 Wave C 新增 `system-control:strategy:approve/release`；生产页面不得显示 capability 字符串。
- 设计/工程交接继续使用 `origin=system_baseline`、`impactRunId`、`releaseCommandId + action=publish|rollback` 和同一 release-command GET；这些准确身份只属于跨角色注释，生产页面分别显示“来源：系统初始基线”“影子影响验证”“发布/恢复命令”和稳定短 ID。

### 19.3 异步、焦点与双视口验收

- 每个列表/详情覆盖 loading、empty、首次 error、再次失败、恢复成功和 stale；requestId 来自服务端。stale、详情 loading/error/refreshing、mutation pending 时全部写入口锁定。
- Modal 初始焦点为安全返回，Tab/Shift+Tab 闭环；pending 时 dialog 获焦且 Escape、遮罩、关闭按钮和重复提交锁定。失败聚焦错误摘要，unknown 聚焦同命令恢复标题，成功聚焦新版本或新的当前生效版本标题。
- Drawer 打开聚焦标题，Escape/关闭后返回原触发点。查询身份变化清除旧详情、选择和恢复块；迟到响应不得覆盖新版本/命令身份或重新开启写入口。
- `1440×900` 侧栏 216px；`1024×768` 默认 72px，覆盖展开不挤正文。标签和宽表只在自身容器横滚，根页面 `scrollWidth === clientWidth`。

### 19.4 交付边界

- 本节是 UI 设计冻结，不代表 BACK API、migration 或正式 frontend 已完成；后续实现必须消费 BACK-SYSTEM-07C 正式共享契约。
- Wave B 页面和历史保持可用，Wave C 只开放前置审改本地规则包。生产代码、员工站、真实 AI/网络/Secret/付费/云资源、百分比灰度均不在本轮。

### 19.5 FIFO233 Rev2 定向原型证据

同一既有仓库外原型 `ui-system-07b-strategy-wave-b` 已在原 ControlShell/Wave B 视觉方向内增加 Wave C 可操作状态，没有新建第二外壳。匿名预览只模拟 UI 状态，不代表后端事实或正式 API 已完成。

| 证据 | 覆盖 |
| --- | --- |
| `strategy-wave-c-rev2-1440-baseline-first-publish.png` | 1440 系统基线详情、受保护/不可删除、影子影响验证与批准已完成、首次发布确认、unknown 同一发布/恢复命令查询 |
| `strategy-wave-c-rev2-1440-history-rollback.png` | 1440 当前→目标逐字段比较、已过安全门基线、`action=rollback` 恢复确认、历史不改写 |
| `strategy-wave-c-rev2-1024-baseline.png` | 1024 同页、72px 收起侧栏、基线字段和状态链，根无横溢 |
| `strategy-wave-c-rev2-1024-history-scroll.png` | 1024 历史宽表仅自身容器横滚，根宽不变 |

- 本地系统 Chrome 有界 DOM 复核：1440 基线影子影响验证→人工批准→首次发布、unknown 唯一查询、历史比较→恢复确认均可真实操作；生产文案只显示“发布/恢复命令”和稳定短 ID。
- 焦点复核：Modal 安全初焦、Tab/Shift+Tab 留在 dialog、非 pending Escape 关闭并回原触发点、pending Escape 不关闭、unknown 聚焦恢复块、成功聚焦新的当前生效版本标题均通过。
- 双视口与 console：1024 根 `1024/1024`，历史表容器 `1180/914`；console error/warn=`0/0`。`node --check app.js/serve.mjs` 通过。
- Impeccable detector 唯一运行进入 degraded regex 模式，因为宿主缺少 `htmlparser2/css-select/css-tree/domutils`；输出 `[]` 仅代表 regex 未发现项，不冒充完整解析器无缺陷。视觉、DOM、焦点和响应式由上述系统 Chrome 有界复核补足。

### 19.6 FIFO234 Rev3 员工可见中文微收口证据

本轮只把同一原型和用户可见验收文案中的六类工程词收口为“当前生效、影子影响验证、未完成旧会话、来源、内容摘要、发布/恢复命令”，未改变 Rev2 已冻结的状态、API 身份、交互链、布局或视觉方向。跨角色工程注释仍保留准确英文身份；requestId、版本/运行/命令稳定短 ID 继续可见。

| 证据 | 覆盖 |
| --- | --- |
| `strategy-wave-c-rev3-1440-chinese-copy.png` | 1440 系统基线详情、影子影响验证/批准完成、首次发布确认、当前生效与未完成旧会话中文投影 |
| `strategy-wave-c-rev3-1024-chinese-copy.png` | 1024 历史页的来源、内容摘要、当前生效中文投影，以及宽表仅自身容器横滚 |

- 本地系统 Chrome 有界 DOM 检查确认用户可见文本未出现本轮六类原始工程词；稳定 requestId 与短 ID 保留。该检查只覆盖本次变化，不重复 Rev2 完整矩阵。
- 1024 根宽为 `1024/1024`，历史表容器为 `1180/914`；console error/warn=`0/0`。
- `node --check app.js/serve.mjs` 与本轮临时复核脚本均通过；临时脚本在取证后删除，端口 `43219` 无监听。
- Impeccable detector 本轮唯一运行进入 degraded regex 模式，因为宿主缺少 `htmlparser2/css-select/css-tree/domutils`；输出 `[]` 只作为有界补充，不替代真实 DOM、双视口和控制台检查。

## 20. FIFO242 FRONT-SYSTEM-07C Rev2 正式 UI 终验

handoffToken：`FIFO242-FRONT-SYSTEM-07C-R2-V4.639`。结论：**不通过，保持 review，不解锁 TEST**。本任务生产 `system-frontend/frontend/backend/contracts/migrations/DESIGN` 修改为 0；完整正式矩阵最终运行 `harnessError=null`，但发现 P0/P1/P2/P3=`0/10/2/0`。

### 20.1 八项差量包

1. **正式运行面**：新鲜 `system-frontend` production build 为 42 modules；员工 `frontend` production build 为 189 modules（保留既有大 chunk warning）。矩阵使用正式 Fastify routes、从零全部迁移的独立 PostgreSQL、正式 production 静态产物、系统 Chrome 与零网络 strategy runtime Worker；未用前端假数据冒充成功。
2. **权限与双站隔离**：匿名、employee、缺 read/write/evaluate/approve/release 均逐请求 403；reader/owner GET 为 200。员工站可见文本、bundle 均无 ControlShell、策略管理入口或 `/api/system-control/strategy`。
3. **主链事实**：无当前生效、基线预览/导入、严格七字段草稿、queued→running→503→success、批准、首次发布、第二版本发布、历史比较均形成真实服务端事实。受保护基线由数据库实际拒绝 UPDATE/DELETE；最终唯一当前生效指针、基线历史和 3 条发布/恢复事件均保留。由于 P1，首次发布需整页刷新，UI rollback 被 `runtime-target` 500 锁死；仅用同一正式 release route 留下服务端 rollback 事实，不能写成 UI 主链通过。
4. **稳定身份与 unknown**：impact 正常 201 queued 后 POST 恒为 1；人工 GET 同一身份可见 running、503、再次成功。impact unknown 只 GET 同一稳定身份；发布 unknown 保留同一发布/恢复命令且 POST=1。确定冲突没有清除旧意图，列为 P1。
5. **FIFO239 复核**：创建 106 个历史版本后，分页外目标仍通过固定 `GET .../versions/:strategyVersionId` 打开，未发生资产/版本扫描。stale 旧事实保留/锁写和再次失败后唯一重读恢复两项真实断言失败；版本身份切换/迟到响应本轮没有形成独立浏览器证据，仅有 FIFO241 自动测试，按正式矩阵缺口列 P1。
6. **焦点与写锁**：基线预览 Drawer、导入 Modal 的安全初焦、Tab/Shift+Tab、pending 重复提交/关闭/Escape 锁定，以及非 pending Escape 回触发点通过。导入与影子成功焦点停在 `BODY`；历史比较 Drawer 关闭后被基线自动选择 effect 立即重开并形成焦点陷阱，均列 P1。
7. **视觉与中文文案**：1440 根宽 `1440/1440`、侧栏 216；1024 根宽 `1024/1024`、收起侧栏 72、覆盖展开 216，Wave C 宽表 `1040/860` 仅容器横滚。比较 Drawer 的数字/单位发生逐字符断行；1024 覆盖展开采样正文宽 `898→952`，未满足严格“不挤正文”断言。页面仍出现英文 `active`，且 Wave C 已实现受控发布却声明“生产生效均未启用”。
8. **Impeccable、证据与清理**：按 Impeccable audit 路径读取 DESIGN 上下文并完成一次有界人工审查；本轮未运行 detector，不存在把 parser 降级结果冒充正式裁决。真实 Chrome/DOM 为最终裁决。证据位于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo242-system-07c-ui-evidence`。独立库 `qima_fifo242_23908_c0349155` 已删除且同前缀残留 0；31242/31243/32242 无监听；临时 harness 已删除；共享 PostgreSQL 55432 未停止或改写。

### 20.2 缺陷分级

| 级别 | ID | 结论 |
| --- | --- | --- |
| P1 | `QA-SYSTEM-07C-FOCUS-01` | 基线导入、影子恢复和发布成功使用的标题 ref 未接入真实 DOM，焦点落 `BODY`。 |
| P1 | `QA-SYSTEM-07C-CACHE-01` | 基线批准 201 后仍优先使用导入缓存中的 `draft` 版本，首次发布持续禁用，必须整页刷新。 |
| P1 | `QA-SYSTEM-07C-CONFLICT-01` | 确定性发布冲突后 Modal、稳定命令意图和可提交按钮继续保留，可再次 POST。 |
| P1 | `QA-SYSTEM-07C-DRAWER-01` | 历史 Drawer 关闭后立即自动选择基线并重开，Escape/关闭不能结束交互或恢复触发点，并拦截后方页面。 |
| P1 | `QA-SYSTEM-07C-TARGET-01` | 第二次发布返回 201 后正式 runtime-target GET 稳定 500，`readBlocked` 锁死 UI 恢复入口；失败含真实 requestId。 |
| P1 | `QA-SYSTEM-07C-STALE-01` | stale 保留旧事实并锁写、再次失败后唯一重读恢复两项浏览器断言均未成立。 |
| P1 | `QA-SYSTEM-07C-COVERAGE-01` | 查询身份切换与迟到响应没有形成本轮独立真实浏览器证据，不能用 FIFO241 自动测试替代正式 UI 门。 |
| P1 | `QA-SYSTEM-07C-COPY-02` | 用户可见页面仍出现 `active`，并在已具备受控发布链时声明“生产生效均未启用”。 |
| P1 | `QA-SYSTEM-07C-VISUAL-01` | 1440/1024 比较 Drawer 内数值和单位逐字符断行，目标/当前字段难以核对。 |
| P1 | `QA-SYSTEM-07C-CONSOLE-01` | 完整故障矩阵 console error/warn=`10/0`，未满足 `0/0` 硬门；错误来自受控 403/409/500/503 资源响应。 |
| P2 | `QA-SYSTEM-07C-COPY-01` | 已有当前生效版本时，发布 Modal 标题仍为“确认首次发布”。 |
| P2 | `QA-SYSTEM-07C-RESPONSIVE-01` | 1024 覆盖展开时正文宽采样由 898 变为 952，严格“不挤正文”断言失败；根宽和表内滚动仍通过。 |

### 20.3 脱敏证据

| 文件 | 内容 |
| --- | --- |
| `fifo242-results.json` | 57 项真实断言：44 通过、13 失败；118 条脱敏请求事实；`harnessError=null`；权限、数据库、几何、console 与清理摘要。 |
| `fifo242-wave-c-1440-history.png` | 1440×900、216px 侧栏、106 项历史、比较 Drawer 与当前/目标字段；同时暴露 Drawer 可读性缺陷。 |
| `fifo242-wave-c-1024-history-overlay.png` | 1024×768、72/216 侧栏覆盖、根无横溢、宽表容器滚动与比较 Drawer；同时暴露逐字符断行。 |

本轮不自行修改生产代码、不通知 FRONT/BACK/TEST、不标记 done。由规划统一决定集中返工范围与后续变化场景复验。

## 21. FIFO245 FRONT-SYSTEM-07C Rev3 UI 变化场景复验

handoffToken：`FIFO245-FRONT-SYSTEM-07C-R3-V4.651`。结论：**不通过，保持 review，不解锁 TEST**。本轮 production `system-frontend/frontend/backend/contracts/migrations/DESIGN` 修改 0；FIFO242 其余通过证据冻结。最终正式变化场景运行 12 组中 7 组形成有效通过证据、5 组因历史页沿用既有选择自动打开比较 Drawer 后与 harness 的点击顺序冲突而未形成裁决；未裁决项不冒充产品失败或通过。真实双视口截图同时复现 1 项独立 P1，足以阻止关闭。

### 21.1 八项差量包

1. **正式运行面**：新鲜 system-frontend production build `42 modules`；正式 Fastify routes、从零全部 34 个迁移的精确隔离 PostgreSQL、零网络 strategy runtime Worker、项目既有 Playwright 与系统 Chrome 均真实运行。受限身份启动 tsx 固定复现 `uv_os_get_passwd → ENOMEM`，按既有授权仅在正常 Windows 用户上下文启动同一 harness；没有 loader/shim/fallback、第二脚本或第三工具链。
2. **真实主链已通过部分**：基线预览→导入 POST unknown→只 GET 同 baselineImportId 恢复并聚焦标题；基线固定快照→批准→首次发布→target 200；严格七字段自定义版本→固定快照→批准→第二次发布→同一 target 200，数据库 `active_count=1`。POST 计数为 baseline import/impact/approval/release=`1/2/2/2`，没有自动重发 unknown POST。
3. **身份、中文和焦点**：真实延迟自定义 version GET 返回后，当前基线身份与 `350 ms` 严格字段未被覆盖；Wave C 用户可见 DOM 的 raw `active` 与“生产生效未启用”均为 0；已有当前生效时发布 Modal 标题为“确认发布策略版本”。导入、影子、批准和两次发布的身份匹配成功焦点均落“前置审改本地规则”。
4. **未裁决场景**：进入历史页时既有 selectedVersion 直接打开比较 Drawer，遮挡 harness 原定的“点击基线比较”入口；因此本轮浏览器没有形成正式 rollback→target、Drawer 显式关闭/Escape、确定性 impact/approval/release 4xx、分页清理及六读取面完整失败→再次失败→成功链的有效裁决。FIFO243 后端 rollback 事实与 FIFO244 单元/组件证据继续保留，但不能替代本轮真实 UI 结论。
5. **P1 `QA-SYSTEM-07C-VISUAL-02`**：1440 与 1024 真实截图中，比较 Drawer 两列严格字段的 `420 ms`、`350 ms`、`0.800000`、`0.750000` 等数值仍逐字符纵向断行；`.strategy-runtime-fields dd { word-break: keep-all }` 没有在当前双列宽度下形成可读数字 token。正文恢复门可读，但“当前→目标”核心差异无法快速核对。
6. **响应式通过部分**：1440 侧栏 `216px`；1024 收起/覆盖展开为 `72/216px`，正文几何不变，根页面无横溢；历史宽表为 `scrollWidth/clientWidth=1040/914`，只在表容器内横滚。视觉 P1 与根/表滚动通过事实并存。
7. **控制台门**：应用主动 `console.error/warn=0/0`、未捕获异常 `0`；5 条受控 503 的 Chrome `Failed to load resource` 均与预期请求身份、状态一一匹配，未伪造 200、未吞错。最终运行未完成到计划中的 409 分支，故不把它写成已通过。
8. **证据与清理**：证据目录为 `C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo245-system-07c-ui-evidence`，包含最终 raw JSON 与 1440/1024 截图。所有 `qima_fifo245_*` 隔离库残留 0，31245/32245 无监听，测试 Chrome 与临时 harness 已清理；共享 PostgreSQL 55432 保持运行。本轮未运行完整 `pnpm check`、未提交/推送/部署。

### 21.2 分级与停止结论

| 级别 | 数量 | 结论 |
| --- | ---: | --- |
| P0 | 0 | 无数据/安全事故。 |
| P1 | 1 | `QA-SYSTEM-07C-VISUAL-02`：比较 Drawer 数值 token 逐字符纵向断行，1440/1024 均可复现。 |
| P2 | 0 | 本轮无独立 P2。 |
| P3 | 0 | 本轮无独立 P3。 |

规划需先决定最小前端视觉返工，并在同一历史 Drawer 操作顺序下补齐 5 组未裁决变化场景；UI 不自行标记 done 或通知 FRONT/BACK/TEST。

## 22. FIFO247 FRONT-SYSTEM-07C Rev4 UI 变化场景微终验

handoffToken：`FIFO247-FRONT-SYSTEM-07C-R4-V4.658`。结论：**不通过，保持 review，不解锁 TEST**。本轮 production `system-frontend/frontend/backend/contracts/migrations/DESIGN` 修改 0；FIFO242/245 其余通过矩阵继续冻结。最终单一 harness 将六组变化场景拆为 8 个可独立裁决检查，结果 `4 passed / 4 failed`；四个失败归并为两项 P1，P0/P1/P2/P3=`0/2/0/0`。

### 22.1 八项差量包

1. **正式运行面**：新鲜 system-frontend production build `42 modules`；正式 Fastify routes、从零全部 34 个迁移的精确隔离 PostgreSQL、正式 production React 静态产物、零网络 strategy runtime Worker、项目既有 Playwright 与系统 Chrome 均真实运行。最终权威证据来自同一个外部 TypeScript harness；编排层修正只涉及 async 入口、场景身份隔离和断言取值，没有 loader/shim/fallback、第二启动路径或生产代码修改。
2. **双视口与视觉关闭**：1440×900 与 1024×768 均保留当前→目标双栏；`420 ms / 350 ms / 0.800000 / 0.750000` 四个 token 的真实 computed `white-space=nowrap` 且单行，根 `scrollWidth-clientWidth=0`。FIFO245 的 `QA-SYSTEM-07C-VISUAL-02` 已关闭；1024 宽表仍只在自身容器滚动。
3. **history 身份门关闭**：从 versions、impact、approval 已有选择进入 history 均不自动打开 Drawer、也不自动读取旧版本详情；本页显式“比较”才唯一读取固定 version。关闭与 Escape 均结束交互并回原比较按钮；延迟 version 响应在切换阶段后不会重开 Drawer。
4. **正式 rollback 服务端事实成立但 UI 不通过**：系统 Chrome 从历史比较发起 rollback；受控 POST 503 发生在正式服务端已完成命令之后，随后键盘触发唯一 GET 同 `releaseCommandId`，POST/GET=`1/1`。target GET 200、数据库唯一当前生效 `1`、release/event 均为 `3`，旧版本内容摘要不改写；但 unknown 恢复按钮位于仍打开的比较 Drawer 后方，鼠标命中被 Drawer 内容拦截，列 P1。
5. **确定性 4xx 状态链部分成立**：impact、approval、release 各连续执行两次受控 409；每次都关闭活动 Modal、清旧意图并刷新权威事实，第二次显式动作均生成新的 `impactRunId / approvalId / releaseCommandId`，没有恢复块或旧身份复用。但三类动作在刷新结束后均把焦点从安全错误块移到 Wave C 标题，违反“确定失败聚焦唯一安全错误目标”，合并列一项 P1。
6. **分页与迟到响应通过**：新增 23 个正式服务端不可变版本后切页会清 Drawer、详情、恢复与 actionError；分页外退役自定义版本仍只由固定 `GET .../versions/:strategyVersionId` 打开，没有资产/版本扫描。第一页延迟 version 响应在切页后不覆盖第二页身份或重开 Drawer。
7. **六读取面通过**：target、baseline、history、version、impact、approval 均真实执行 `503 → 唯一原查询重读 503 → 唯一原查询重读 200`；旧事实保留、真实 requestId 可见、写入口锁定、再次失败仍唯一，成功清 stale 并聚焦“前置审改本地规则”标题。每个读取面两个受控 503 与请求身份一一匹配。
8. **控制台、证据与清理**：应用主动 console error/warn=`0/0`、pageerror=`0`；浏览器 19 条网络诊断恰好对应 `1×503 rollback unknown + 6×409 deterministic conflict + 12×503 read failure`，没有伪 200 或吞错。最终隔离库 `qima_fifo247_35976_*` 已删除且 `qima_fifo247_%` 残留 `0`；31247/32247 无监听，测试 Chrome 已关闭，共享 PostgreSQL 55432 保持 running。本轮未运行完整 `pnpm check`、未提交/推送/部署。

### 22.2 缺陷分级

| 级别 | ID | 结论 |
| --- | --- | --- |
| P1 | `QA-SYSTEM-07C-RECOVERY-OCCLUSION-01` | 历史 Drawer 内发起 rollback 后若 POST 结果 unknown，恢复块渲染在 Drawer 后方；按钮虽然被程序聚焦且可用键盘 Enter 查询同一命令，但鼠标命中被 Drawer 内容拦截，普通指针用户无法执行唯一恢复动作。 |
| P1 | `QA-SYSTEM-07C-CONFLICT-FOCUS-02` | impact/approval/release 确定性 409 均正确清 Modal/旧意图、刷新事实并为下一动作生成新身份，但 `readRecoveryFocus` 在刷新成功后把焦点从错误块夺到 Wave C 标题；三类失败均复现。 |
| P0/P2/P3 | — | 本轮未发现独立 P0、P2 或 P3。 |

### 22.3 脱敏证据

证据目录：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo247-system-07c-ui-evidence`。

| 文件 | 内容 |
| --- | --- |
| `fifo247-results.json` | 最终 8 项裁决、182 条脱敏请求事实、19 条预期非 2xx 身份、数据库与 console 摘要。 |
| `fifo247-wave-c-1440-compare.png` | 1440 当前→目标双栏与四个完整数值 token。 |
| `fifo247-wave-c-1024-compare.png` | 1024 收起侧栏、双栏比较、根无横溢与历史表内滚动。 |
| `fifo247-wave-c-rollback-unknown.png` | rollback unknown 恢复块位于比较 Drawer 后方、唯一恢复按钮被遮挡的真实界面。 |

本轮不自行修改生产代码、不通知 FRONT/BACK/TEST、不标记 done。由规划统一归因并决定最小前端返工。

## 23. FIFO249 FRONT-SYSTEM-07C Rev5 定向 UI 微终验

handoffToken：`FIFO249-FRONT-SYSTEM-07C-R5-V4.665`。结论：**FIFO247 两项原失败已关闭，A–D 产品裁决全部通过，P0/P1/P2/P3=`0/0/0/0`**。任务保持 review 并交规划决定是否解锁 TEST；UI 不自行 done 或通知 FRONT/BACK/TEST。生产 `system-frontend/frontend/backend/contracts/migrations/DESIGN` 修改 0。

### 23.1 变化场景裁决

1. **正式运行面**：新鲜 system-frontend production build `42 modules`；正式 Fastify routes、从零全部 35 个迁移的精确隔离 PostgreSQL、production React 静态产物、零网络 strategy runtime Worker、项目既有 Playwright 与系统 Chrome 均真实运行。受限身份 tsx 仍在业务代码前命中既知 `uv_os_get_passwd ENOMEM`，同一 harness 按既定边界仅切换正常 Windows 用户上下文；无 loader/shim/fallback 或第二路径。
2. **rollback unknown 已关闭**：从历史显式比较创建 rollback 后，正式服务端先完成命令、代理返回受控 503。比较 Drawer 关闭；全页唯一“查询本次策略恢复结果”可见、真实鼠标 hit-test 可达并获得焦点。创建 POST=`1`；人工查询仅对同一 `releaseCommandId` 执行 `GET 503 → GET 503 → GET 200`，每次失败后唯一入口仍可达，成功回 versions/current、Wave C 标题聚焦且 Drawer 不重开。
3. **rollback 身份切换与迟到响应已关闭**：第二个独立 rollback unknown 使用新 `releaseCommandId` 且 POST=`1`；同 ID GET 延迟期间切换到 versions 会清旧恢复身份，迟到 200 不覆盖当前阶段、不重建恢复入口或重开 Drawer。
4. **三类确定性 409 已关闭**：impact、approval、release 各连续两次受控 409；每次 Modal/旧意图清除、权威读取刷新，唯一 ErrorBlock 在刷新稳定后仍为 `activeElement`。下一次显式动作的稳定 ID、规范 body 与 `Idempotency-Key` 均为新值；impact 由自动断言直接通过，approval/release 由原始请求 body 与 key 交叉核对通过。
5. **读取恢复无回归**：target 真实 `GET 503 →` 唯一原查询重读 `GET 200`；错误块保留真实 requestId，成功后 Wave C 标题聚焦。
6. **公共文案无回归**：rollback 唯一显示“查询本次策略恢复结果”；普通 publish unknown 仍显示公共默认“查询本次发布/恢复命令”，POST=`1`，未误用 rollback 专用文案。FIFO248 已通过的其他 `CommandRecovery` 默认文案回归继续冻结。
7. **控制台门**：application console error/warn=`0/0`、pageerror=`0`；12 条策略 runtime 受控非 2xx 与 method/path/status 逐一匹配。ControlShell overview 不计入策略错误；本轮合法 `system-control:read` 主体下 overview 为 200。
8. **原始 harness 对账**：原始 JSON 显示 `5 passed / 3 failed`，但三个末尾汇总断言都把 `impactRunId` 优先写入通用 `id` 字段：A1 因此未匹配到实际 release GET；approval/release 因此误报新命令 ID 未变化。原始 `requestFacts/body/Idempotency-Key` 明确证明 A1 为同 releaseCommandId 的三次 GET，approvalId/releaseCommandId 与 key 各有两个不同值；保留原始 JSON，不改写证据，并另存 `fifo249-adjudication.json` 记录人工裁决。

### 23.2 证据与清理

证据目录：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo249-system-07c-ui-evidence`。

| 文件 | 内容 |
| --- | --- |
| `fifo249-results.json` | 原始第三轮请求、命令 body/key、受控非 2xx、console 与 5/8 汇总；保留三项汇总字段误判。 |
| `fifo249-adjudication.json` | 基于原始 trace 的 8 项最终产品裁决与三项误判对账。 |
| `fifo249-rollback-unknown-reachable.png` | Drawer 已关闭、rollback 唯一恢复入口可见且可达。 |
| `fifo249-publish-default-copy.png` | 普通 publish unknown 仍使用公共默认恢复文案。 |

本轮隔离库前缀 `qima_fifo249_%` 残留 `0`，31249/32249 无监听，Playwright `browser.close()` 已执行；进程命令行只读核对受 Windows 权限拒绝，未据此误杀任何共享 Chrome。临时 harness 已删除，共享 PostgreSQL 55432 保持 running。未运行完整 `pnpm check`、未重复 Impeccable、未提交/推送/部署。
