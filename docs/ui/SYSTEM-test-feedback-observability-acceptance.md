# SYSTEM-08 测试反馈与错误观测 UI 验收

状态：UI-SYSTEM-08 Rev1 已交规划审核  
权威输入：`DESIGN.md` 5.18、`docs/contracts/SYSTEM-test-feedback-observability.md`、职责矩阵“测试反馈与错误观测”、`INT-18`

## 1. 权威原型与边界

- 同壳可操作原型：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\ui-system-08-feedback-observability\index.html`
- 原型中的匿名短身份、时间、数量和故障开关只用于设计验收，不是生产 API、数据库初始值或后台完成声明。
- 允许路径仅 DESIGN、本文件、CURRENT/开发日志与仓库外原型/证据；生产 `frontend/system-frontend/backend/packages/contracts/migrations` 修改0。
- 明确排除测试任务清单、强制步骤、会话录像、自动截图、员工管理列表、第二日志库、真实 COS/Sentry/网络/Secret/付费/云资源。

## 2. 两站信息架构

| 表面 | 唯一入口 | 主体 | 不得出现 |
| --- | --- | --- | --- |
| 员工 AppShell | 顶栏/沉浸工具栏末端低强调“反馈问题” | 六类问题、一个描述、安全上下文、显式截图 | 浮动遮挡、红点催促、任务清单、管理状态 |
| 管理员 ControlShell | “追踪与安全 / 反馈问题”，`/feedback` | 服务端摘要、查询分页、详情、附件、只追加流转 | 员工业务编辑、原始日志、对象键、Sentry 工程词 |

业务 Modal/Drawer 打开时反馈入口位于背景层且不可操作；反馈不叠在主业务浮层上。视频/时间轴场景入口不得遮挡播放、时间轴、字幕正文、保存或提交动作。

## 3. 员工创建矩阵

1. 打开 Modal 后初焦点为“安全返回”；六类中文类型均可键盘选择，描述为唯一必填正文。
2. 安全上下文只读列出 surface/routeTemplate/buildVersion/browser/viewport/timezone/稳定项目与任务短身份/安全 requestId/性能摘要的中文投影，禁止正文、输入、字幕、视频帧、文件名、对象键、Cookie、Secret、提示词、完整查询和请求体。
3. 截图默认不上传；“选择一张截图”后仅本地预览，必须再勾选风险确认。取消选择立即移除预览与确认状态。
4. pending 锁定关闭、Escape、遮罩、重复提交和背景入口；失败聚焦错误摘要；unknown 只查询同一反馈身份且 POST 恒为1；成功聚焦低打扰成功状态并可关闭回入口。
5. 确定性冲突清旧意图、关闭 Modal、刷新权威事实并聚焦错误摘要；下一次显式创建使用新身份。

## 4. 管理员列表与详情

- 四摘要“待确认/处理中/待复测/最近关闭”来自服务端同范围 total；未知不补0。
- 搜索、页面区域、类型、状态、项目、时间、排序、limit/offset 均为服务端查询身份。改变身份时清旧详情/恢复/写意图，迟到响应丢弃。
- 数据表最小宽度1080px，只在容器内横滚；根页面始终无横溢。分页稳定，行“查看详情”使用固定 feedback GET。
- Drawer 展示描述、安全上下文、诊断 requestId、稳定任务身份、用户确认截图与有界只追加历史；不显示 objectKey、存储地址、原始日志或请求体。
- 状态链：新反馈→已确认→修复中→待复测→已关闭；关闭保留全部历史。已关闭仅提供“重新打开”，追加事件后回新反馈。

## 5. 状态与异步恢复

| 状态 | 保留事实 | 唯一动作 | 写入口 |
| --- | --- | --- | --- |
| 初始 loading | 无 | 无 | 锁定 |
| empty | 当前查询为空 | 调整筛选 | 锁定 |
| 初始 error | 无 | 重新读取原查询 | 锁定 |
| stale/刷新失败 | 最近成功快照 | 重新读取原查询 | 锁定 |
| 再次失败 | 与前态一致 | 同一唯一重读 | 锁定 |
| 读取恢复成功 | 新权威事实 | 正常动作 | 解锁 |
| mutation pending | 当前权威事实 | 无 | 全部锁定 |
| 命令 unknown | 当前权威事实+稳定身份 | 查询本次结果 | 其他写锁定 |
| 确定冲突 | 刷新后的权威事实 | 下一次显式新动作 | 旧意图清除 |

## 6. 焦点与键盘

- Drawer 初焦点标题，Modal 初焦点“安全返回”；Tab/Shift+Tab 首末闭环，非 pending Escape/遮罩关闭并回原触发点。
- pending 时关闭按钮、Escape、遮罩和重复提交均无效，`aria-busy=true`。
- 读取再次失败聚焦唯一 ErrorBlock；读取成功聚焦页面 H1。unknown 聚焦恢复块标题；命令成功聚焦新的状态标题，不落 toast。
- 查询身份变化、关闭 Drawer、分页和迟到响应不得让旧焦点意图重开浮层。

## 7. 视口与隐私门

- 1440×900：员工204侧栏、管理员216侧栏；入口低强调，密集表格和浮层层级清晰。
- 1024×768：默认72侧栏；展开216 fixed覆盖、workspace几何不变、遮罩可见、焦点圈和回触发点成立。
- 根 `scrollWidth===clientWidth`；宽表只在自身容器滚动。状态不只靠颜色。应用主动 console.error/warn=0/0，pageerror=0。
- 用户可见 DOM 不出现 capability、objectKey、Sentry、原始日志、请求体、Secret、提示词或供应商载荷。

## 8. 前端交接停止边界

正式前端必须复用现有 AppShell/ControlShell、公共 Modal/Drawer/ErrorBlock/CommandRecovery/DataTable 和统一焦点 helper；不得按原型复制第二套状态源或硬编码匿名值。前端只消费 BACK-SYSTEM-08A 经规划审核后的共享契约；契约未完成前，UI 设计不得冒充 API 已可用。FRONT/TEST 均由规划后续解锁，本 UI 任务不直接通知。

## 9. Rev1 有界验证结果

- 仓库外同壳原型完成员工/管理员两站切换、六类创建、截图二次确认、创建 unknown 同身份查询、管理员列表/Drawer/关闭后重新打开、事件 unknown、读取 loading/empty/error/stale/恢复和侧栏覆盖场景；原型操作均由真实 DOM 事件驱动，不用静态文案冒充。
- 系统 Chrome + Playwright 最终批检 `22/22`：员工1440根无横溢/204侧栏/97×34低强调入口、Modal安全初焦、截图二次确认、unknown唯一查询与成功焦点；管理员1440根无横溢/216侧栏/表格边界、Drawer/状态Modal初焦、关闭后仅重新打开；1024为72收起、216覆盖且workspace保持 `x=72,width=952`、遮罩与关闭回焦成立。
- 应用主动 console error/warn=`0/0`，pageerror=`0`。截图与原始结果位于原型 `evidence/`：`01-employee-create-1440.png`、`02-employee-unknown-1440.png`、`03-admin-list-1440.png`、`04-admin-closed-detail-1440.png`、`05-admin-reopen-unknown-1440.png`、`06-admin-overlay-1024.png`、`results.json`。
- `node --check app.js` 与 `node --check verify.mjs` 通过。Impeccable detector 按要求只在最终界面完成后运行一次，退出码0、findings=`[]`；环境缺少 `htmlparser2/css-select/css-tree/domutils`，因此降级为正则检测，不能作为计算样式/对比度的清洁证明，最终裁决以人工截图与真实浏览器几何/焦点证据为准。
- 生产 frontend/system-frontend/backend/contracts/migrations 修改0；原型未连接真实 API、COS、Sentry、网络、Secret、付费或云资源，不宣称 BACK-SYSTEM-08A 已完成。

## 10. FIFO273 FRONT-SYSTEM-08B Rev4 正式 UI 终验

- 环境与范围：新鲜构建员工 frontend（195 modules）与 system-frontend（45 modules），以正式 Fastify routes、从零全部迁移的隔离 PostgreSQL、`InMemoryFeedbackScreenshotStorageFake`、项目既有 Playwright 和系统 Chrome 完成唯一完整矩阵；未用前端假数据，未接真实网络/COS/Secret/付费。原始结果 85 项中 73 项直接通过、12 项原始断言未通过；人工按受控网络与动画采样对账后为通过75、产品失败9、未裁决1。
- 已通过主事实：员工六类中文问题、必填描述、安全上下文白名单与项目/任务归属；截图默认不上传、显式选择/本地预览/隐私确认、create→authorize→binary content→complete→GET 的68-byte PNG/digest/size/type一致；四阶段 unknown 均保持原写恒1、同 feedback/attachment 只读恢复，服务端未 uploaded 后仅由显式“继续上传已确认截图”推进。部分完成与纯创建失败文案分流、pending锁、新身份、匿名/employee/项目隔离、管理员分页/固定详情、只追加事件、closed→reopened、历史与截图保留均成立。
- `P0/P1/P2/P3=0/6/0/0`。六组 P1：①员工 Modal 遮罩关闭未回原“反馈问题”，首次 create 409 的相邻 ErrorBlock 又被回入口焦点覆盖；②管理员四摘要请求覆盖当前 status，未保持 search/surface/kind/status/project/from/to/sort/sortDirection 完整同范围；③管理员截图 metadata 调用了不存在的 system-control 路径并真实404，导致“查看大图”不可用；④事件 POST unknown 后恢复块位于仍开启 Drawer 的下层，真实鼠标不可达且未获安全焦点；⑤事件确定409虽清 Modal/旧意图并刷新，唯一 ErrorBlock 两次均未获焦而落 BODY；⑥事件分页后 Drawer 焦点落 BODY，Escape 不关闭，遮罩虽关闭但不回原“查看详情”。
- 未裁决1项：列表 stale 故障 hook 只命中一次目标主 GET，没有完成“初始失败→唯一重读再次失败→成功”的完整产品断言；不得冒充通过或产品失败。1024 首帧在220ms侧栏动画中提前采样为 `x=76.453,width=947.547`，动画稳定后为 `x=72,width=952`、sidebar=216 fixed覆盖、根无横溢，结合截图/样式人工裁为通过；1440 sidebar=216、员工1024既有204规则、1080px表容器内滚均通过。
- 控制台：`pageerror=0`；18条 console error 均为浏览器对受控403/404/409/503的原生 `Failed to load resource` 诊断，和原始请求身份逐条对应，未发现应用主动 `console.error/warn`。其中管理员附件 metadata 的404已作为上述 P1 记录，未以伪200或吞错消除。
- 证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo273-system-08-ui-evidence\fifo273-results.json` 及 `employee-1440-success.png`、`employee-1024-modal.png`、`admin-1440-drawer.png`、`admin-1024-overlay.png`。隔离数据库已 DROP，48200–48220 无任务监听，临时 harness/失败中间件已删除，共享 PostgreSQL 55432 保持运行；生产 frontend/system-frontend/backend/contracts/migrations/DESIGN 修改0。结论为不通过，任务交规划集中归因，TEST继续 blocked。

## 11. FIFO277 FRONT-SYSTEM-08B Rev5 UI变化场景复验

- 环境与冻结：新鲜 production 员工 frontend（195 modules）和 system-frontend（45 modules）、正式 Fastify、从零全部迁移的隔离 PostgreSQL、`InMemoryFeedbackScreenshotStorageFake`、Playwright 1.62.1 与系统 Chrome。仅复验 FIFO273 六组原P1和唯一stale未裁决项；FIFO273其余75项冻结，生产代码修改0。
- 结果：计划34项，实际裁决27项（21通过/6失败），7项未裁决；`P0/P1/P2/P3=0/2/0/0`，结论不通过。B服务端摘要同范围6项、C附件详情2项、D事件unknown4项、E事件确定409三项全部通过；原写次数、稳定身份GET、迟到身份丢弃、Drawer内恢复/错误焦点与下一显式新身份成立。
- P1-001 员工焦点所有权：普通取消与Escape均回原“反馈问题”，两轮create确定409通知独占焦点且下一显式创建使用新feedbackId/body/Idempotency-Key，已创建无截图通知焦点也成立；但普通遮罩关闭后Modal虽已关闭，`activeElement` 落BODY而非原入口。
- P1-002 管理员事件分页/Drawer：真实鼠标按下“下一页”“上一页”时均未让按钮获焦而落BODY；两次分页加载完成后Drawer标题均未接管焦点；Escape未关闭Drawer也未回原“查看详情”。仍活动的Drawer随后拦截底层详情按钮，正式harness在该依赖步骤超时。按唯一harness停止门未强制穿透、未第四次运行，因此F遮罩关闭回焦、G列表同查询503→503→200及本轮末端console/pageerror聚合保持未裁决，不能沿用 FIFO273 console 事实冒充本轮结果。
- 证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo277-system-08-ui-evidence\fifo277-adjudication.json`、`01-employee-notice-focus.png`、`02-admin-explicit-image.png`、`03-admin-event-recovery.png` 与原始 `fifo277-harness-error.txt`。隔离库已DROP，任务Fastify/静态端口/测试Chrome由finally关闭，共享PostgreSQL 55432保持运行；临时harness已删除。未运行完整pnpm check、未重复Impeccable、未提交推送部署；TEST继续blocked，交规划集中归因。

## 12. FIFO279 FRONT-SYSTEM-08B Rev6 UI三组微终验

- 环境与范围：新鲜production员工frontend（195 modules）和system-frontend（45 modules）、正式Fastify、从零全部迁移隔离PostgreSQL、`InMemoryFeedbackScreenshotStorageFake`、Playwright 1.62.1与系统Chrome，仅复验A/F/G和本轮console；B–E与FIFO273其余75项冻结，生产代码修改0。
- 结果：原始20项16通过/4失败；人工对账两项harness口径后，产品裁决18通过/2失败，`P0/P1/P2/P3=0/1/0/0`，结论不通过。A的初焦实际为活动Modal内 `aria-label=安全返回` 按钮；G首次503真实保留20行、requestId和唯一重读，未显示harness额外要求的未冻结字面句不构成产品缺陷。
- A员工遮罩5/5通过：真实鼠标点击入口后安全返回初焦；遮罩mousedown即关闭，mouseup/click结束后焦点仍在原“反馈问题”；普通态无相邻通知抢焦，取消与Escape均回同一入口。
- F管理员Drawer 8/8通过：下一页/上一页真实鼠标序列均先出现按钮焦点，loading和新页完成后为 `H2#runtime-drawer-title`；主动把焦点置BODY后，Tab回Drawer焦点圈，Escape关闭并回原“查看详情”；真实遮罩关闭回同一触发点。上层事件Modal打开时Escape只关闭上层，Drawer保留；上层关闭后Drawer重新拥有BODY的Tab/Escape。
- G列表stale存在一组P1：完全相同的 `search=FIFO279 stale target&status=new&sort=attention&sortDirection=desc&limit=20&offset=0` 依次返回503、503、200；两次失败均保留20行、真实 `fifo279-stale-1/2` 与唯一重读，第三次成功清stale并聚焦“反馈问题”H1。但第二次503后activeElement为H1而非唯一ErrorBlock；随后主动聚焦搜索框并触发普通顶栏刷新200，焦点仍被旧恢复意图抢到H1。源码对账推断错误重读和普通刷新共用始终设置 `focusAfterRetry=true` 的 `refresh()` 是同根所有权问题，最终归因由规划裁决。
- 控制台：application console error/warn=0/0、pageerror=0；两条受控503与同一GET及requestId精确匹配。另一个403是feedback-only主体访问范围外ControlShell overview的浏览器原生网络诊断，不是应用主动console。
- 证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo279-system-08-ui-evidence\fifo279-results.json`、`fifo279-adjudication.json`、`fifo279-cleanup.json` 与4张最小截图。cleanup确认两站静态服务、Fastify、Chrome关闭且隔离库DROP；`qimao_fifo279_*=0`，共享PostgreSQL 55432保持running，临时harness已删除。未运行完整pnpm check、未重复Impeccable、未提交推送部署；TEST继续blocked，只交规划。

## 13. FIFO281 FRONT-SYSTEM-08B Rev7 UI G场景微终验

- 环境与范围：新鲜 production 员工 frontend（195 modules）和 system-frontend（45 modules）、正式 Fastify、从零全部迁移隔离 PostgreSQL、`InMemoryFeedbackScreenshotStorageFake`、Playwright 1.62.1 与系统 Chrome。仅复验 G 列表读取恢复/查询身份与本轮 console；FIFO279 A/F/console 主体、FIFO277 B–E、FIFO273 其余75项和既有布局全部冻结，生产代码修改0。
- 正式结果 `12/12`，`P0/P1/P2/P3=0/0/0/0`。同一完整查询先成功保留20行，随后严格 `503→503→pending→200`：两次失败均保留20行、真实新 requestId 与唯一重读；第二次失败唯一 ErrorBlock 为 activeElement；第三次重读 pending 时顶栏读取与恢复入口锁定且 H1 未提前获焦，真实200完成后才清 stale 并聚焦“反馈问题”H1。
- 普通顶栏“重新读取”前主动聚焦搜索框，成功后仍由搜索框持焦，没有继承旧错误恢复意图。错误重读 pending 时分别切换 `offset=20` 与另一 search 查询，旧响应迟到均未改变新身份焦点；返回原页/原查询后旧意图也未复活。
- 请求事实：本轮受控主列表请求13次，与编排预期完全一致；四个受控503均为同一完整 reports GET，并与 `fifo281-matrix-1/2`、`fifo281-offset-1`、`fifo281-search-1` 精确对应。错误重读没有触发 detail/events、写请求、自动轮询、额外重试或第二查询源。
- 控制台：application console error/warn=`0/0`，pageerror=`0`。浏览器原生四条503网络诊断逐一匹配受控 requestId/GET；另有一条 feedback-only 测试主体访问范围外 overview 的预期403，不计为策略应用主动错误。
- 证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo281-system-08-ui-evidence\fifo281-results.json`、`fifo281-cleanup.json`、`01-g-final-recovered.png`；首次 harness 等待谓词编码口径失败原样保存在 `fifo281-fatal.json`，未覆盖正式结果。cleanup确认两站静态服务、Fastify、Chrome关闭且隔离库 DROP；`qimao_fifo281_*=0`，共享 PostgreSQL 55432 保持 running。未运行完整 `pnpm check`、未重复 Impeccable、未提交推送部署；通过结论只交规划决定后续 TEST 门。
