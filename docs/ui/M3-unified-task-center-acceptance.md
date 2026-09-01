# M3 统一任务中心 UI 设计与验收

状态：`UI-M3-08 Rev1` 已形成，交规划对话审核；本文与匿名原型不代表生产 React、共享契约或后端 API 已完成。

handoffToken：`FIFO254-UI-M3-08-R1-V4.681`

权威输入：`docs/contracts/M3-unified-task-center.md`、`DESIGN.md` 5.6、`MODULE_RESPONSIBILITY_MATRIX`“统一任务中心”、`MODULE_INTEGRATION_CONTRACTS` INT-09。

可操作原型：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\ui-m3-08-unified-task-center\index.html`

## 1. 单一方向与真实边界

- 唯一方向是既有员工 AppShell 的成熟 Operate 工作台：冷灰侧栏、白色工作面、靛蓝单强调、紧凑数据表、同页详情抽屉和受保护确认 Modal。没有卡片墙、看板、趋势图、主题切换或第二套视觉外壳。
- `/tasks` 是“作业”分组唯一全局任务入口；正式接入时移除独立“中文识别任务”导航与 `/asr-dispatches` 页面，不设计兼容页、长期重定向或第二入口。
- 页面只是六类领域事实的员工安全投影，不创建通用任务、Attempt、Worker、租约或状态映射。原型数据、短号、requestId、命令号和数量均为匿名示例，不得复制成生产常量或冒充已完成 API。
- 上传会话继续属于“上传任务”；字幕、术语候选、OCR 候选和人工编辑继续属于项目工作台；供应商、模型、Secret、费用、提示词、对象键、内部地址和管理员 ControlShell 不进入本页。

## 2. 信息架构与首屏

页面从上到下固定为：

1. AppShell 顶栏“任务中心”和员工服务状态；
2. “需处理 / 运行中 / 排队 / 失败或待对账”四项服务端真实摘要；
3. 服务端查询工具条：项目名或任务短号搜索、任务类型、状态、项目、排序和显式查询；
4. 七列紧凑任务表：任务、项目、状态、进度、最近结果、更新时间、操作；
5. 真实总数、范围与稳定分页；
6. 点击任务后在同页右侧打开详情抽屉，不跳到第二个全局详情页。

四项摘要是查询捷径，不自己保存统计状态。点击后形成新的服务端查询身份；搜索、类型、状态、项目、排序或分页变化清除旧 `selectedTask`、详情、恢复和动作意图，迟到详情响应不能重开抽屉或覆盖新任务。

## 3. 六类任务与唯一下一步

| `taskType` | 员工名称 | 列表身份 | 详情 / 动作 |
| --- | --- | --- | --- |
| `asr_dispatch` | 多项目中文识别 | Dispatch 一行；其已引用 Batch 不重复 | 显示多项目子结果；允许时取消未终结项目；失败集进入项目中文识别 |
| `asr_batch` | 单项目中文识别 | 仅未被 Dispatch 引用的 Batch | 允许时取消；失败集与需对账进入项目中文识别 |
| `screen_text_batch` | 画面字识别 | Batch 一行 | 允许时取消；候选处理和失败集重试进入画面字工作台 |
| `term_extraction` | 术语提取 | Run 一行 | 原 Run 只读；失败时进入术语工作台显式新建提取，不显示“重试原任务” |
| `pre_review_preparation` | 前置审改准备 | Prepare Job 一行 | 失败时进入同一 Session 的前置审改“重新准备” |
| `delivery_generation` | 交付生成 | Delivery Job 一行 | 失败时确认恢复同一 `deliveryId`；成功进入产品详情 |

项目工作台返回按钮只说明规范返回位置，不能在统一中心复制失败集选择、字幕编辑、术语裁决或 OCR 编辑表单。

## 4. 状态与进度表达

| 规范状态 | 员工文案 | 非颜色编码 | 进度 / 下一步 |
| --- | --- | --- | --- |
| `queued` | 排队中 | 靛蓝空心圆 | `0 / total` 或真实阶段“等待运行资源” |
| `running` | 运行中 | 靛蓝圆点 | 真实完成数 / 总数，或阶段文字 |
| `waiting_review` | 待人工处理 | 琥珀方形 | 机器执行已结束；进入所属工作台 |
| `completed` | 已完成 | 绿色圆点 | 完成事实；查看详情或产品 |
| `failed` | 失败 | 红色圆点 | 原因、requestId 和领域合法恢复 |
| `cancel_requested` | 取消请求中 | 灰色圆点 | 已完成结果保留，等待未终结执行终态 |
| `cancelled` | 已取消 | 灰色圆点 | 只读历史；不提供恢复为运行中 |
| `reconciliation_required` | 需对账 | 红色菱形 | 结果或用量未知，普通重试暂停 |
| `stale` | 来源已变化 | 琥珀方形 | 旧事实只读；从新来源进入所属工作台 |
| `unknown` | 结果未知 | 红色菱形 | 只查询同一稳定身份，不推断成功或失败 |

每行同时显示规范中文与 `nativeStatus` 的员工安全说明。前端不再维护状态映射。进度只允许：

- 服务端 `completedCount / totalCount`，附真实阶段；
- `null` 显示“进度未知”，附真实阶段。

禁止以等待时长、轮询次数、列表长度、动画或浏览器计时生成百分比和预计完成时间。

## 5. 详情抽屉与有界历史

- 抽屉约 `650px`，顶部固定任务类型、名称、短号、项目范围、创建时间与“关闭详情”；稳定打开后初始焦点在关闭动作。
- 正文先展示短号、项目范围、当前规范/原状态、最近更新，再展示真实进度或“进度未知”、最近安全原因与 requestId。
- 历史最新优先且最多 5 条；每条只显示员工可理解阶段、摘要与真实时间，不显示表名、租约 owner、供应商载荷或完整事件正文。
- ASR Dispatch 追加项目子结果表；示例明确写出“这些子结果不在统一任务列表重复计数”。子表宽度不足时只在抽屉内部横滚。
- 详情 loading/error/refreshing 时锁定详情内写动作；读取失败只读取同一 `taskType + resourceId`。再次失败仍只有一个原查询动作，成功聚焦抽屉标题。
- 抽屉非 pending 时支持关闭按钮、`Escape` 和遮罩关闭，并恢复原任务名称或“查看详情”触发点；后台刷新不抢活动焦点。

## 6. 领域动作、pending、unknown 与冲突

| 场景 | 必须显示 | 焦点 / 锁定 | 禁止 |
| --- | --- | --- | --- |
| 打开取消/恢复确认 | 任务短号、当前事实、影响范围、稳定命令短号 | 初始聚焦“安全返回”；Tab/Shift+Tab 双向闭环 | 默认聚焦危险确认 |
| 提交 pending | “请求已发送 1 次”与稳定身份 | Modal 容器聚焦；全部按钮、Escape、遮罩和重复提交锁定 | 关闭后丢失未知意图 |
| 确定失败 | 原 Modal、原因、requestId 和同一意图 | 聚焦唯一错误或安全返回 | 自动创建新命令 |
| unknown / retryable | 同一命令短号、POST/GET 计数、requestId | 聚焦“查询本次…结果”；查询中继续锁定 | 自动或按钮重发 POST |
| unknown 再次失败 | 同一命令、`POST=1 / GET=1` | 同一查询按钮重新可达 | 生成第二身份 |
| unknown 成功 | Modal 关闭，刷新同一任务权威事实 | 抽屉标题聚焦；抽屉不重开/切换身份 | 以本地结果直接写状态 |
| 确定冲突 | Modal 关闭、旧命令已清、权威事实已刷新 | 唯一 ErrorBlock 聚焦；下一显式动作使用新身份 | 保留旧 body/key 或自动重试 |

本原型真实操作 `CNC-73F2` 演示取消 unknown：创建 POST 始终 1 次，同命令人工 GET 首次失败、再次成功。`RCV-81M4` 演示确定冲突：旧命令清除、ErrorBlock 聚焦，下一动作变为“按当前事实重新发起恢复”。这些短号仅是匿名交互证据，不是 API 字段约束。

## 7. 读取状态矩阵

| ID | 场景 | 事实保护 | 唯一恢复 / 成功焦点 |
| --- | --- | --- | --- |
| LIST-LOAD | 初始 loading | 保留表格工作面几何，`aria-busy=true` | 无写动作 |
| LIST-EMPTY | 服务端空结果 | 显示当前筛选没有结果，不表现为失败 | 清除筛选；不提供上传或新建任务 |
| LIST-ERROR | 初始失败 | 不显示空表；显示真实 requestId | 重新读取任务列表；成功聚焦页面标题 |
| LIST-STALE | 刷新失败且有旧事实 | 6 行旧结果保留、全部写入口锁定 | 恰好一个“重新读取当前查询” |
| LIST-STALE-2 | 再次失败 | 旧事实和锁定继续保留、新 requestId | 同一动作仍唯一 |
| LIST-RECOVER | 原查询恢复成功 | 清 stale，更新服务端事实 | “任务中心”标题聚焦 |
| DETAIL-LOAD | 详情 loading | 不显示旧任务详情 | 当前抽屉身份保持，写动作锁定 |
| DETAIL-ERROR | 详情失败 | 显示同一短号和 requestId | 重新读取此任务 |
| DETAIL-ERROR-2 | 再次失败 | 不切换身份、不关闭抽屉 | 同一动作仍唯一 |
| DETAIL-RECOVER | 详情恢复 | 清错误并显示同一任务 | 抽屉标题聚焦 |

任何查询身份变化都先失效当前异步 token；迟到列表或详情响应只能被丢弃，不能恢复旧选择、抽屉、恢复块或写入口。

## 8. 视觉、响应式与可访问性

| 视口 | AppShell | 主区与滚动 |
| --- | --- | --- |
| `1440×900` | 展开 `204px` | 根 `1440/1440`；任务表容器/表格 `1170/1170`，当前示例无需横滚 |
| `1024×768` 收起 | `72px` | 根 `1024/1024`；正文起点 `72px`；任务表容器/表格 `902/1050`，只容器横滚 |
| `1024×768` 覆盖展开 | 覆盖宽 `216px` | 正文起点仍 `72px`，不挤压正文；根 `1024/1024`，遮罩存在 |

- 四项摘要在 1440 为单行，在 1024 为 2×2；仍保持真实数字、短标签和说明，不变成英雄指标卡。
- 长短号、状态、时间和进度使用等宽数字特性；表格行约 66px，状态不只靠颜色，根页面无横向溢出。
- 表格容器、Dispatch 子结果表分别拥有自己的横向滚动与可访问名称；页面和抽屉不截断内部弹层。
- 所有操作具备 `:focus-visible`；Drawer/Modal 的 `Tab / Shift+Tab` 双向闭环、`Escape`、遮罩、pending 锁定、失败与成功落点均由真实 Chrome 验证。

## 9. 原型、证据与 Impeccable 有界审查

原型根目录：

`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\ui-m3-08-unified-task-center`

文件：`index.html`、`styles.css`、`app.js`。右下“原型场景”仅供验收；`?clean=1` 隐藏控制器。

| 证据 | 证明范围 |
| --- | --- |
| `evidence/01-tasks-1440.png` | 204px AppShell、四项摘要、五项服务端查询、六类任务同屏、紧凑表和无旧 ASR 全局入口 |
| `evidence/02-task-detail-1440.png` | 650px 详情抽屉、真实/未知进度、requestId、有界历史和领域恢复动作 |
| `evidence/03-cancel-unknown-1440.png` | Drawer 上层 Modal、unknown 同命令只读恢复、POST=1/GET=0 和安全焦点 |
| `evidence/04-conflict-focus-1440.png` | 确定冲突关闭 Modal、清旧命令、聚焦 ErrorBlock、下一动作新意图 |
| `evidence/05-tasks-1024-collapsed.png` | 72px 收起、根无横溢、表格自身横滚 |
| `evidence/06-tasks-1024-overlay.png` | 216px 覆盖展开不挤压正文、根无横溢 |
| `evidence/fifo254-results.json` | 38 项 DOM、焦点、状态、身份、响应式和控制台断言原始结果 |

真实系统 Chrome 新鲜结果：`38/38` 全部断言通过；application `console.error/warn=0/0`，`pageerror=0`。1440 根/侧栏/表格为 `1440/1440、204、1170/1170`；1024 收起为 `1024/1024、72、902/1050`；覆盖展开为 `216px` 且正文起点仍 `72px`。

Impeccable 采用 Operate / established-world 精确扩展：保留成熟 AppShell 与数据表语法，删除卡片墙、英雄指标、装饰动效和重复全局入口；审查重点是扫读密度、状态可辨、错误恢复、焦点、内部滚动和 1024 结构。静态 detector 仅运行一次并返回 `[]`。独立 finish review 首轮 `FIX` 指出摘要语义、覆盖侧栏与 toast 焦点三组集中缺口；同一批修正并覆盖同名证据后，Verdict Pass 为 `SHIP`，`P0/P1/P2/P3=0/0/0/0`，所有 finding 均为 resolved。真实 Chrome 证据为交互与运行时最终裁决。

## 10. 正式前端交接与停止边界

- 生产建议目录仍为 `frontend/src/features/tasks/`，路由固定 `/tasks`；正式前端只消费规划通过的共享任务契约和领域命令，不复制原型数据、状态映射或命令短号。
- 接入 `/tasks` 的同一生产变更必须删除独立“中文识别任务”导航、旧 `/asr-dispatches` 页面路径及旧入口测试；ASR 项目工作台和项目中心派发入口保留，完成/恢复链接改到 `/tasks`。
- 首次正式交审需提供服务端筛选/分页、六类真实领域身份、Dispatch 子项不重复、逐请求项目隔离、unknown/冲突、1440/1024、焦点与控制台证据。
- 本轮只修改 DESIGN 5.6、本文、CURRENT/开发日志和仓库外匿名原型/证据；生产 frontend/system-frontend/backend/contracts/migrations 修改0。
- 未接真实供应商、模型、AI、Secret、网络、费用、云资源；未启动 FRONT/BACK/TEST，未提交、推送或部署。UI 不自行标记 done 或解锁下一任务，只交规划审核。

## 11. FIFO260 FRONT-M3-08B Rev2 正式 UI 终验

handoffToken：`FIFO260-FRONT-M3-08B-R2-V4.699`

### 11.1 运行边界与原始结果

- 正式环境为 production React（Vite 192 modules）+ 正式 Fastify routes + 从零全部迁移的独立 PostgreSQL `qimao_fifo260_*` + 项目既有零网络 fake；浏览器为 Playwright 1.62.1 驱动系统 Chrome。未接真实网络、AI、供应商、Secret、费用或云资源。
- 唯一矩阵原始结果保留为 `27/38`，不得改写成产品通过。原始文件：`fifo260-results.json`；人工/源码对账：`fifo260-adjudication.json`；截图 `01`–`05` 位于同一证据目录。
- 原始 11 项失败中，固定详情记录时序与 1024 收起过渡采样经原始 requestFacts、截图和正式 CSS 对账为通过；5 项因 harness 定位器或故障形态未进入产品断言，保持 `unadjudicated`，不冒充通过或产品失败。最终产品裁决：通过30、失败3、未裁决5；P0/P1/P2/P3=`0/3/0/0`。

证据根：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo260-m3-08b-ui-evidence`

### 11.2 A–H 场景结果

| 组 | 结果 | 正式事实 |
| --- | --- | --- |
| A | 通过 | 六类真实 PostgreSQL 任务、Dispatch 顶层去重、真实 `nativeStatus/status`、2 条可见子结果、匿名/缺能力/控制台主体 403、项目可见隔离均成立；四摘要与同范围服务端 total 一致。 |
| B | 部分通过 | 分页外 `taskType/resourceId` 固定详情 GET=`200`，截图显示同身份详情与1条有界历史；项目/排序组合和 UI 下一页因非精确标签定位器提前结束，保持未裁决。 |
| C | 部分通过 | loading、empty、查询身份切换、迟到响应丢弃与空闲不轮询成立；初始失败/stale/再次失败/恢复的故障 hook 未命中，保持未裁决。 |
| D | 不通过 | pending 锁、409 后下一显式动作新 `Idempotency-Key` 成立；取消 transport unknown 的连接重置被 Chrome 网络层以同 key 重传，Delivery 文案定位器未命中，二者未裁决；确定409焦点存在 P1。 |
| E | 不通过 | Modal 安全初焦及 Tab/Shift+Tab 圈闭成立；Drawer 标题上 `Shift+Tab` 泄漏到底层排序选择器，之后 Escape 不再关闭抽屉，触发点恢复链中断。 |
| F | 不通过 | 1440 根无横溢、表格容器边界成立；1024 收起72与表内滚成立；展开为204px网格并把正文起点移到204px，未实现216px覆盖/正文仍72px。 |
| G | 通过 | AppShell 只高亮“任务中心”；活跃源码/test 的 `/asr-dispatches`、`AsrDispatches` 命中0，旧路径落回项目中心；员工 DOM 无 ControlShell/管理员 API。 |
| H | 通过 | application console error/warn=`0/0`、pageerror=`0`；两条浏览器 console 网络诊断仅对应受控409。隔离库已 DROP，31660/32660无监听，测试 Chrome/harness已清理，共享 PostgreSQL 55432 保持原运行态。 |

### 11.3 三项集中 P1

1. `UI-M3-08B-001`：Drawer 初始焦点在标题时，`Shift+Tab` 未被现有首尾焦点算法接管，焦点进入底层“排序”；Escape 因事件不再经过 Drawer 而失效。需让标题这个程序化初焦也进入双向圈闭，并保持关闭回原触发点。
2. `UI-M3-08B-002`：画面字取消命令真实409后 Modal 已关闭、权威事实已刷新，但详情变化触发的标题聚焦覆盖了 ErrorBlock 焦点；需冻结确定冲突的唯一焦点所有权，下一动作新身份事实保留。
3. `UI-M3-08B-003`：1024 的展开按钮当前把 AppShell 网格从72改为204，直接挤压正文；需按冻结方向改为216px覆盖侧栏+遮罩，workspace 起点保持72、根仍1024/1024。

TEST 不解锁。生产 frontend/system-frontend/backend/contracts/migrations/DESIGN 本 UI 验收修改0；后续由规划集中归因和路由，UI 不直接通知 FRONT/BACK/TEST。

## 12. FIFO262 FRONT-M3-08B Rev3 UI变化场景复验

handoffToken：`FIFO262-FRONT-M3-08B-R3-V4.705`

### 12.1 环境、范围与裁决

- 使用本轮新鲜 production React（Vite `192 modules`）+ 正式 Fastify routes + 从零全部迁移的精确隔离 PostgreSQL `qimao_fifo262_*` + Playwright 1.62.1/系统 Chrome，网络仅限本机；未接真实 AI、供应商、Secret、费用或云资源。
- 只复验 FIFO262 A–H 变化场景；FIFO260 其余30项冻结，未重复 Impeccable、未运行完整 `pnpm check`。最终产品裁决为通过14、失败3、未裁决0；P0/P1/P2/P3=`0/3/0/0`，TEST 不解锁。
- 原始结果、人工对账、请求事实、故障 hook 命中、清理记录及5张最小截图位于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo262-m3-08b-ui-evidence`。`fifo262-results.json` 不被人工改写，最终裁决见 `fifo262-adjudication.json`。

### 12.2 A–H 变化结果

| 组 | 结果 | 正式事实 |
| --- | --- | --- |
| A | 通过 | Drawer 标题初焦后 `Tab→关闭详情`、`Shift+Tab→取消任务`，首末双向循环成立；Escape 关闭并回原“查看详情”。 |
| B | 通过 | 画面字确定性409两次均关闭 Modal，权威 list/detail GET 完成后唯一 ErrorBlock 保持焦点；两次显式动作 `Idempotency-Key` 不同。固定详情503重读成功后标题聚焦成立。 |
| C | 不通过 | 1024 收起为 `sidebar=72/workspaceX=72/workspaceWidth=952`；展开虽有216侧栏和遮罩，但 workspace 变为 `x=0/width=72`，正文消失。侧栏焦点闭环、Escape/遮罩回触发点与1440 `204px`/无遮罩成立。 |
| D | 通过 | 精确“项目”“排序”控件产生 `projectId + sortBy=updatedAt + sortDirection=desc + limit=20`；下一页产生 `offset=20`，真实总数26、第二页6行。 |
| E | 部分通过 | 同查询初始503→唯一重读503→唯一重读200，真实 requestId 与3次主列表 GET成立；stale 保留20行、唯一重读成功清除成立。成功后 `activeElement=BODY`，未落标题/列表安全目标，判P1。 |
| F | 通过 | 受控 HTTP 503 retryable cancel：POST同 ASR 身份恒为1；人工 GET 同 `asr_batch + resourceId` 首次503、再次200，随后仅有一次权威刷新200，无重复POST。 |
| G | 通过 | 生产文案“恢复本次交付”命中；同 deliveryId POST=1，unknown 后只 GET 同任务，`delivery_products` 前后均为1。 |
| H | 不通过 | Drawer 遮罩确实关闭，但焦点落 BODY，未恢复原“查看详情”触发点；与同 Drawer Escape 已通过形成确定差量。 |

### 12.3 集中 P1 与停止边界

1. `UI-M3-08B-R3-001`：Drawer 遮罩关闭路径未保持 Escape 路径已成立的触发点恢复，关闭后焦点为 BODY。
2. `UI-M3-08B-R3-002`：tasks 窄屏展开时两个 fixed 兄弟退出网格流，workspace 被自动放入第一列；需保持 workspace 固定在第二列，展开前后仍为 `x=72/width=952`。
3. `UI-M3-08B-R3-003`：列表初始错误恢复成功后错误按钮消失，焦点随之落 BODY；需将成功焦点交给任务中心标题或明确列表安全目标。

原始 F 被 harness 的“最后两个 GET”断言误报：真实序列为初始200、人工503、人工200、权威刷新200，故按 requestFacts 裁决通过。原始 E 成功焦点条件误把 BODY 文本命中当安全焦点，按 activeElement 原始事实改判失败。两处对账均保留在 `fifo262-adjudication.json`，没有修改原始结果。

本轮隔离库已 DROP，31662/32662无监听，测试 Chrome已关闭，临时 harness完成后删除；共享 PostgreSQL 55432保持 running。生产 frontend/system-frontend/backend/contracts/migrations/DESIGN 修改0，未提交、推送或部署；UI 只交规划，不通知 FRONT/BACK/TEST，不自行 done。

## 13. FIFO264 FRONT-M3-08B Rev4 UI三场景微复验

handoffToken：`FIFO264-FRONT-M3-08B-R4-V4.711`

### 13.1 运行边界与结论

- 使用本轮新鲜 production React（Vite `192 modules`）+ 正式 Fastify routes + 从零全部迁移的精确隔离 PostgreSQL `qimao_fifo264_*` + Playwright 1.62.1/系统 Chrome，只复验三项变化场景；FIFO262/FIFO260 其他通过项冻结。
- 正式结果 `9/9`，P0/P1/P2/P3=`0/0/0/0`。application console error/warn=`0/0`、pageerror=`0`；两条浏览器网络诊断仅对应精确命中的受控503。
- 原始 JSON、清理记录及4张最小截图位于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo264-m3-08b-ui-evidence`。

### 13.2 三项变化事实

| 场景 | 结果 | 正式事实 |
| --- | --- | --- |
| Drawer遮罩 | 通过 | 真实鼠标点击遮罩触发 `mousedown` 后 Drawer 关闭，`activeElement` 精确回原“查看详情”按钮；标题初焦、`Tab→关闭详情`、`Shift+Tab→取消任务`、Escape关闭回触发点抽查均成立。 |
| 1024覆盖侧栏 | 通过 | 收起 `sidebar=72/workspace x=72,width=952`；展开 `sidebar=216` fixed覆盖且有遮罩，workspace仍为 `x=72,width=952`、正文可见；收起/展开根横溢均为0，关闭后焦点回“展开侧栏”。1440沿用冻结证据，未重跑。 |
| 列表读取恢复 | 通过 | 既有20行同一查询精确经历主GET `503→503→200`，requestId依次为 `fifo264-list-1/2`；两次失败均保留20行与唯一重读，再次失败 ErrorBlock 持焦，成功 `activeElement=H1“统一任务中心”`。随后普通顶栏重读200保持原搜索框焦点，未错误复用恢复意图。 |

证据：`01-drawer-open-1440.png`、`02-tasks-1024-overlay.png`、`03-list-second-error-1440.png`、`04-list-recovered-1440.png`、`fifo264-results.json`、`fifo264-cleanup.json`。

本轮隔离库已 DROP，31664/32664无监听，测试 Chrome与临时 harness已清理；共享 PostgreSQL 55432保持 running。生产 frontend/system-frontend/backend/contracts/migrations/DESIGN 修改0；未重复 Impeccable、未运行完整 `pnpm check`、未提交/推送/部署。UI 只交规划决定是否解锁 TEST，不直接通知 FRONT/BACK/TEST。
