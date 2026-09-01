# SYSTEM-09 有序执行路由与安全兜底 UI 验收

状态：UI-SYSTEM-09 Rev 2 已交规划审核  
任务：`UI-SYSTEM-09 Rev 2 / FIFO290`  
handoffToken：`FIFO290-UI-SYSTEM-09-R2-V4.779`  
Reviewer：规划对话

## 1. 结论

在既有唯一管理员 `ControlShell` 内冻结 `/engines`、`/routing`、`/changes`、`/logs` 的有序执行目标交互。视觉继续沿用 SYSTEM-03 的“日间控制舱”，没有新建第二外壳、供应商卡片市场、员工入口或生产实现。

原型采用真实可操作 DOM，覆盖有序目标新增/删除/上移/下移、容量输入、操作员停用确认、草稿进入影响检查、发布 pending/unknown 同身份查询、执行记录链、读取状态、确定冲突、1440/1024 侧栏和焦点闭环。FIFO288 Playwright/系统 Chrome 原始验证为 `50/50`，但规划独立审核判定其中“人工处理被建模为第4个 RoutingTarget”构成唯一 P1；Rev2 已把人工处理移为真实目标耗尽后的独立业务出口，FIFO288 其余49项冻结。

本交付只证明 UI 结构、状态和交互成立，不代表 BACK-SYSTEM-09A、共享契约、迁移、真实 FunASR/PaddleOCR、云厂商、Secret、网络、付费、服务器或生产前端完成。

## 2. 权威路径

- DESIGN：`DESIGN.md` 5.19。
- 启动包：`docs/milestones/SYSTEM-ordered-execution-routing.md`。
- 职责矩阵：“系统控制台有序执行路由与安全兜底”。
- 模块衔接：`INT-11/12/15/16/17`。
- 可操作匿名原型：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\ui-system-09-ordered-routing\index.html`。
- 原始验证结果：同目录 `evidence/results.json`。
- Rev2 最小变化结果：同目录 `evidence/rev2/results.json`。
- Rev2 最小变化截图：
  - `evidence/rev2/01-routing-manual-terminal-1440.png`
  - `evidence/rev2/02-changes-manual-terminal-1440.png`
- 截图：
  - `evidence/01-routing-ordered-1440.png`
  - `evidence/02-publish-unknown-1440.png`
  - `evidence/03-attempt-chain-1440.png`
  - `evidence/04-routing-overlay-1024.png`
  - `evidence/05-publish-confirm-1024.png`

匿名部署名、版本、数量、requestId、CNY 和项目身份只用于设计验收，生产禁止作为常量或业务种子。

## 3. 页面信息架构

### 3.1 `/engines`

首屏顺序固定为页面标题/最近读取 → 四项服务端摘要 → 部署紧凑表 → 当前部署详情。表格列为部署、业务能力、执行位置、操作员状态、最新不可变版本、当前使用位置、操作。

- “可用于草稿 / 操作员已停用”是部署的唯一启停投影。
- 当前生效路由引用的部署不提供可执行停用；必须先发布替代路由。
- 未引用部署的停用走高风险 Modal；系统不得自动重新启用。
- 连接检查与发布分离。排队/运行中禁止重复创建；unknown 只查询同测试身份；确定失败修复后创建新身份。
- 零网络检查必须明确标注“零网络”，不得冒充真实云服务已接通。

### 3.2 `/routing`

页面先切换“画面字识别 / 中文语音识别”，再并列展示“当前生效 / 当前草稿”，主体是唯一连续编号目标表。第一列编号和连接线建立明确顺序；行内上移/下移、新增、删除与容量输入可操作。

| 字段 | UI 投影 | 规则 |
| --- | --- | --- |
| 顺序 | 1–8 连续编号、上移/下移 | 同一部署版本不得重复；无并行调用 |
| 目标 | 业务名称 + 不可变版本短身份 | 只选择已登记、连接检查通过、操作员可用的精确版本 |
| 角色 | 首选 / 低价 / 高质量 / 应急 | 只是业务解释，不拥有执行状态 |
| 执行位置 | 本地 / 云服务 | 每行必须引用真实部署版本；员工站不可见 |
| 容量 | 同时 / 单项目 / 队列 | 保存草稿后仍需影响检查与发布 |
| 连接检查 | 通过/失败/未知 | 由服务端事实决定，不由浏览器推算 |

画面字推荐真实目标顺序为本地 → 低价云 → 高质量云；语音推荐真实目标顺序为本地/低成本 → 低价云 → 高质量云。推荐模板不自动保存或发布。

目标表之后固定单列“目标耗尽后的人工处理”：全部已启用真实目标均确定失败后，任务进入对应领域工作台人工处理。人工处理不占目标序号，不引用部署版本，不拥有连接检查或引擎容量，也不参与排序、新增、删除。

目标表下固定展示：

- “安全进入下一目标”：只有明确无外部副作用、下一目标可用且容量/CNY 均准入时才新建下一执行记录。
- “结果未知时立即停止”：已受理、响应丢失、超时或费用待对账时停在当前目标，只查询同一请求，不自动跨服务。

### 3.3 `/changes`

首屏同时展示候选状态、当前生效、完整旧/新真实目标顺序、连接检查、活动任务、需对账任务、CNY 预算和审批历史。当前/候选目标数、连接检查数和顺序差异只统计真实部署目标；人工处理作为“全部目标耗尽后的处理”单列，不进入上述计数。

- 阻断由服务端返回；存在阻断时不显示发布主操作，不提供强制跳过。
- 发布确认展示当前版本 → 目标版本、只影响新任务、旧任务继续固定旧路由、待对账留在原目标。
- 发布/恢复失败或 unknown 均保持旧当前生效；unknown 关闭 Modal 后显示全页唯一同命令查询。
- 恢复是新的发布/恢复命令，只移动唯一指针，不改写历史。

### 3.4 `/logs`

按任务展示“执行记录 1 → 2 → 3”有序链，记录固定目标顺序、部署版本、结果、费用、requestId 与安全前进原因。

- 确定安全失败：说明“已证明未产生外部副作用”。
- 安全前进：说明上一执行明确未发送，下一目标通过容量与预算准入。
- unknown/待对账：后继记录显示“未开始”，只查询当前请求，不创建下一付费执行。
- 本地明确无外部费用才显示 CNY 0；云 unknown 显示“待对账 + 预留金额”。

页面不显示字幕正文、视频帧、Secret、URL/Header、objectKey、完整原始载荷、模型隐藏推理或内部供应商请求原值。

## 4. safe failover 判定

| 服务端事实 | 自动进入下一目标 | UI 表达 |
| --- | --- | --- |
| 本地预检失败、目标停用、连接检查失效、明确未发送 | 是 | 当前执行确定失败；展示安全前进原因 |
| 明确拒绝且可证明未受理 | 是 | 保留原因和调用计数，再显示下一目标预算准入 |
| 401/403、Secret/配置错误 | 否 | 管理员修复后显式新任务/重试，不跨服务 |
| 5xx、断网、超时，且服务端明确外部副作用不可能 | 是 | 明确写“外部未受理”后才前进 |
| 5xx、断网、超时，外部副作用无法证明 | 否 | 结果未知/待对账，唯一同身份查询 |
| 已受理、响应丢失、服务成功但本地未知 | 否 | 停在原目标，后继执行未开始 |
| 质量不达标 | 首版否 | 保存结果，管理员显式发起高质量复核 |

浏览器、日志文案和前端错误映射都不能自行把“不确定”改成“可安全前进”。

## 5. 状态矩阵

### 5.1 读取

| 状态 | 显示 | 写入口与焦点 |
| --- | --- | --- |
| normal | 服务端事实、最近读取时间、当前生效与草稿 | 按权限开放 |
| loading | 表格骨架 | 写入口锁定 |
| empty | 前置动作与唯一入口 | 引导先登记部署/连接检查 |
| 首次 error | 安全原因、真实 requestId、恰好一个原查询重读 | ErrorBlock 获焦 |
| stale | 保留旧表、stale 标识、真实 requestId、唯一重读 | 全部写入口锁定 |
| 再次失败 | 新 requestId，仍只有同一重读 | ErrorBlock 保持焦点 |
| 恢复成功 | 清除 stale/error，刷新服务端事实 | 当前页 H1 获焦 |

查询身份包括页面、业务环节、筛选、排序、分页和选中版本。身份变化必须清除旧详情、恢复块与写意图；迟到响应不得覆盖当前身份。

### 5.2 草稿、启停、发布与恢复

| 状态 | 交互 |
| --- | --- |
| 确认 | 安全初焦点“安全返回”；显示当前 → 目标与影响 |
| pending | `aria-busy=true`；字段、关闭、Escape、遮罩、重复提交锁定；焦点留在 Modal |
| 确定失败 | 清旧意图、刷新权威事实、最上层唯一错误获焦；下一动作使用新身份 |
| unknown | POST 恒 1；Modal 关闭；唯一同命令查询可见、可点击、获焦 |
| 查询再次失败 | 保留同一身份、真实 requestId 与唯一查询 |
| 成功 | 当前生效只在服务端成功后变化；聚焦 H1 |
| 冲突 | 不在遮罩后显示错误，不落 BODY；旧意图清除 |

排序、删除、停用、发布和恢复都复用同一高风险焦点合同。非 pending 时 Escape/遮罩关闭并回原触发点；`Tab / Shift+Tab` 在最上层活动浮层内双向闭环。

## 6. 1440 / 1024

| 视口 | 几何与滚动 |
| --- | --- |
| 1440×900 | ControlShell 侧栏 216px；目标表、影响并列区和执行链保持详细密度；根宽 1440/1440 |
| 1024×768 收起 | 侧栏 72px；正文 `x=72 / width=952`；目标表容器 `918px`、内容 `1080px`，只在自身横滚 |
| 1024×768 展开 | 侧栏 fixed 覆盖至 216px并显示遮罩；正文仍 `x=72 / width=952`，不挤压、不重排；Escape/遮罩关闭并回展开触发点 |

页面根无横向溢出。目标表、日志执行链、审批历史各自拥有横向滚动；浮层不被表格 overflow 裁切。

## 7. 后续复用注释

术语候选与需要 OCR/AI 的图片/PDF 表格识别未来可以复用“有序目标 → 影响检查 → 执行链”骨架，但本任务不提供其生产入口、接口或状态。普通 XLSX/CSV 永远优先使用本地确定性解析，不进入供应商路由。任何模型输出只能形成候选/草稿，不直接改写术语版本、画面字 Release、交付表或原始文件。

该注释只供规划/工程后续读取，不能作为“术语/表格 API 已实现”的证据。

## 8. 新鲜验证与 Impeccable

- `node --check app.js`：通过。
- FIFO288 的 Playwright 1.62.1 + 系统 Chrome 原始结果为 `50/50`；规划复核剔除其中错误的“人工处理作为第4个 RoutingTarget”断言，冻结其余49项。冻结项包括草稿→变更、发布 Modal 初焦/Tab/Shift+Tab、pending 锁、unknown 单一查询与旧当前生效、查询成功 H1、Attempt 1→2→3、unknown 阻止下一目标、CNY 待对账、停用保护、loading/empty/error/stale/唯一重读/恢复焦点、确定冲突、1024 侧栏 72/216 覆盖、正文 952 不变、根宽和表内滚。
- FIFO290 Rev2 使用同一原型、Playwright 1.62.1 与系统 Chrome 完成最小变化矩阵 `24/24`：画面字/语音均仅保留3个真实部署目标；人工终点位于表后且没有目标身份、连接检查或容量；真实目标可上移/下移、增至8、删至1；`/changes` 的顺序与连接检查只计3个真实目标，人工耗尽后处理单列。
- application console error/warn=`0/0`，pageerror=`0`。
- Impeccable detector 按要求只运行一次；由于 `htmlparser2/css-select/css-tree/domutils` 不可用，降级为 regex，结果是 undercount 而非完整 clean bill。降级检测发现 1 项 `transition: width` layout warning，已删除该布局属性动画；修正后使用真实 Chrome 再次完整运行上述 `50/50` 验证，不重复 detector。
- 人工查看 Rev2 两张变化截图：`/routing` 的3个真实目标与表后人工出口层级清楚，`/changes` 的真实目标顺序/连接检查计数与耗尽后处理分离；既有 ControlShell 视觉未重做。FIFO288 的 `01/03/04` 有序表、执行链、1024 覆盖层证据继续冻结。

## 9. 生产实现停止边界

- 允许生产实现只在规划同时验收 UI-SYSTEM-09 与 BACK-SYSTEM-09A 后启动；前端只能消费共享契约和 PostgreSQL 权威事实。
- 旧 `primary/fallback` 新写表单、浏览器默认选择、单 deployment Job 新写、unknown 自动跨服务、浏览器费用/健康推算必须按启动包删除；本 UI 文档不提供兼容路径。
- 本轮生产 `frontend/system-frontend/backend/contracts/migrations` 修改0；员工 AppShell 修改0。
- 未接真实 FunASR、PaddleOCR、云厂商、Secret、网络、付费、服务器、COS 或 Sentry；未提交、推送或部署。

## 10. Rev2 唯一 P1 关闭矩阵

| 变化场景 | Rev2 裁决 | 证据 |
| --- | --- | --- |
| `/routing` 编号目标身份 | 通过：3行均有真实不可变版本短身份；人工处理不在 `tbody`、不占序号 | `routing_has_three_real_targets`、`routing_has_no_manual_target` |
| 真实目标 1–8 操作边界 | 通过：上移/下移成立；可增至8且上限锁定，可删至1且下限锁定；新增行必须先选择部署版本 | `real_target_move_up/down`、`real_target_max_eight/min_one` |
| 人工耗尽后出口 | 通过：目标表后单列；明确不是引擎部署，不做连接检查、不使用引擎容量 | `manual_terminal_is_separate`、`manual_terminal_contract_copy` |
| `/changes` 目标顺序与计数 | 通过：当前→候选只列3个真实目标；连接检查只计3个；人工终点单列 | `changes_real_order_count`、`changes_connection_count_is_real_only`、`changes_exhaustion_fact_is_separate` |
| 浏览器运行健康 | 通过：24/24；application console error/warn=`0/0`，pageerror=`0` | `evidence/rev2/results.json` |

P0/P1/P2/P3=`0/0/0/0`。本节只关闭规划指出的人工终点 P1；FIFO288 其余49项、双视口、Modal、unknown、日志执行链和视觉结论不重跑、不重判。

## 11. FIFO302 FRONT-SYSTEM-09C Rev3 正式 UI 终验

### 11.1 环境与结论

- handoffToken：`FIFO302-FRONT-SYSTEM-09C-R3-UI-R1-V4.818`。
- 唯一正式环境：新鲜 system-frontend production build（45 modules）+ 员工 frontend production build（195 modules）+ 正式 Fastify + 从零执行全部 38 项迁移的精确隔离 PostgreSQL + 零网络 Adapter/connection-test Worker + Playwright 1.62.1/系统 Chrome。
- 原始自动结果：`115` 项，`112` 通过、`3` 失败；人工对账没有改写 `results.json`，另存 `adjudication.json`。console 原失败全部属于受控/预期浏览器网络诊断；同时发现读取恢复断言把 BODY 中的侧栏同名文案误当 H1，已反向校正为产品失败。最终产品裁决仍为 `112/115`，`P0/P1/P2/P3=0/3/0/0`，不建议解锁 TEST。
- 生产 `frontend/system-frontend/backend/contracts/migrations/DESIGN` 修改0；未接真实模型、厂商、Secret、网络、付费或服务器。

### 11.2 通过矩阵

1. 权限与两站隔离：匿名、employee、缺 routing/logs 能力均为真实 403；授权管理员可读；员工 DOM 与 production bundle 无 ControlShell、路由、引擎或压测入口。
2. `/routing`：ASR 1/3/8、ScreenText 本地→云、真实 deploymentVersion、全局连续 priority、角色/逐目标容量、增删移动与人工终点单列成立；1440 侧栏 216、根无横溢。
3. `/changes`：test→impact-check→approve→publish、受控 publish unknown POST=1、仅 GET 同 releaseCommandId、旧 active 保持；正式 rollback 后唯一 active；退役版本再次 publish 真实 409 且旧 active 保持。
4. `/logs`：服务端筛选/排序/分页/真实 total；ASR 与 ScreenText Attempt 1→2；只有持久 `RoutingAdvanceEvent` 的 externalNotAccepted=true 且 externalSideEffectPossible=false 显示安全前进；unknown/unauthorized/cancelled/quality_rejected 均无后继提示；connection-test unknown 与历史 null 诚实。
5. 读取：初始 loading、empty、同查询 503→503→200、旧行与真实 requestId、唯一重读、再次失败错误块焦点、身份切换丢迟到响应、读取零写和无第二状态源成立。
6. Drawer：初焦、Tab/Shift+Tab、Escape、遮罩关闭回原“查看详情”触发点成立；Modal pending 锁与 unknown 恢复入口成立。
7. 1024：收起 `side=72 / content x=72 / width=952`；展开 `side=216` fixed 覆盖且正文几何不变，根无横溢；宽表与执行链只在容器内滚动。
8. 安全：页面/员工 DOM 无 errorDetail、字幕/画面正文、Secret、URL/Header、objectKey、连接串或供应商原始载荷；CNY 主显示、unknown 待对账成立。application 主动 console error/warn=`0/0`、pageerror=`0`；10 条浏览器网络诊断均在 `adjudication.json` 独立归类。

### 11.3 P1 集中归因

| ID | 场景 | 正式产品事实 | 期望 |
| --- | --- | --- | --- |
| P1-001 | `/routing` 新建路由草稿 Modal | Escape 关闭后 `activeElement=BODY` | 回原“新建路由草稿”按钮 |
| P1-002 | `/logs` stale 读取恢复 | 503→503→200 成功后 `activeElement=BODY`；原自动断言因 BODY 含侧栏同名文字而误判 | 清 stale 后聚焦“日志与质量”H1 |
| P1-003 | 1024 覆盖侧栏 | Escape 后仍聚焦“收起侧栏”，覆盖侧栏未关闭 | 收起覆盖层并回展开触发点 |

三项都属于正式焦点所有权/键盘闭环；主数据链、服务端状态、unknown 安全与权限事实不受影响。TEST 保持 blocked，等待规划集中归因与前端修复路由。

### 11.4 证据与清理

- 脱敏证据目录：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo302-system-09-ui-evidence`。
- 原始事实：`results.json`；人工对账：`adjudication.json`；最小截图：`01-routing-asr-8-1440.png`、`02-changes-release-unknown-1440.png`、`03-logs-asr-chain-1440.png`、`04-routing-1024.png`。
- 每轮隔离数据库均在 finally 中终止连接并 DROP；Fastify、两个 preview、测试 Chrome 与唯一临时 harness 均关闭/删除；共享 PostgreSQL 55432 保持原运行态。
- 未运行完整 `pnpm check`，未重复 Impeccable，未提交、推送或部署。

## 12. FIFO304 FRONT-SYSTEM-09C Rev4 UI 三场景微复验

### 12.1 环境与结论

- handoffToken：`FIFO304-FRONT-SYSTEM-09C-R4-UI-R1-V4.824`。
- 新鲜 system-frontend production build 为 `45 modules transformed`；正式 Fastify 连接从零执行全部 38 项迁移的精确隔离 PostgreSQL，连接检查由零网络 Worker 处理为 `succeeded`，页面由项目既有 Playwright 1.62.1 + 系统 Chrome 裁决。
- 最终原始矩阵 `29 项 / 26 通过 / 3 失败`，结论 `P0/P1/P2/P3=0/3/0/0`。FIFO302 其余 112 项、业务主链与既有截图保持冻结；本轮不建议解锁 TEST。
- 首次运行在 pending 控件文案定位处停止，离线对照正式 DOM 后只调整同一 harness 的定位与等待；没有新增产品路径。最终原始结果完整覆盖 A–D，未把编排失败计作产品失败。

### 12.2 通过事实

1. `/routing`：Modal 初焦为关闭按钮；Escape、取消均卸载并回原“新建路由草稿”；创建 pending 时 `data-locked=true`，Escape 与遮罩均不能关闭，正式 201 后回原触发点。
2. `/logs`：同一完整查询严格 503→503→pending→200；两次 503 均保留旧行、真实 `fifo304-stale-1/2` requestId 与唯一重读，第二次 ErrorBlock 持焦；200 稳定后聚焦“日志与质量”H1。
3. `/logs` 焦点身份：普通顶栏刷新后搜索框保持焦点；切换 `status=failed` 后旧查询迟到响应不抢新身份焦点。
4. 1024：收起 `sidebar=72 / workspace x=72 / width=952`，展开 `sidebar=216` 且正文几何不变、根无横溢；焦点在侧栏内或 BODY 时 Escape 都关闭覆盖侧栏并回“展开侧栏”。
5. 更高层 Modal/Drawer 打开时，第一次 Escape 只关闭最上层且侧栏保持展开；第二次 Escape 才关闭侧栏并回触发点。
6. application 主动 console error/warn=`0/0`、pageerror=`0`；两条受控 503 浏览器网络诊断均与同一 operations GET 和对应 requestId 匹配，未混入应用错误。

### 12.3 P1 集中归因

| ID | 场景 | 正式产品事实 | 期望 |
| --- | --- | --- | --- |
| P1-001 | `/routing` 遮罩关闭 | 真实鼠标点击遮罩后 Modal 已卸载，但 `activeElement=BODY`；Escape/取消回焦正常 | 遮罩关闭也必须精确回原“新建路由草稿”按钮 |
| P1-002 | `/logs` 第三次恢复 pending | 点击唯一重读后请求保持 pending 时，ErrorBlock/唯一重读整体卸载，`activeElement=BODY`；因此无法呈现锁定中的恢复入口 | pending 期间保留 ErrorBlock 与唯一重读并禁用，H1 不得提前获焦；200 后再清 stale 并聚焦 H1 |
| P1-003 | 1024 覆盖侧栏遮罩 | 展开几何正确且有侧栏阴影，但 DOM/视觉均无正文遮罩层 | 216px 覆盖侧栏必须配套遮罩，正文保持不挤压；上层 Modal/Drawer 仍优先 |

### 12.4 证据与清理

- 脱敏证据目录：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo304-system-09-ui-evidence`。
- 原始事实：`results.json`；最小截图：`01-routing-pending-1440.png`、`02-logs-recovery-pending-1440.png`、`03-logs-recovery-success-1440.png`、`04-sidebar-overlay-1024.png`。截图已逐张人工核对：日志 pending 图中恢复块确已消失；1024 图中仅有侧栏阴影、没有正文遮罩。
- 隔离数据库在 finally 中终止连接并 DROP；Fastify 3001、preview 3010、测试 Chrome 与临时进程均关闭；共享 PostgreSQL 55432 保持原运行态。
- 生产 frontend/system-frontend/backend/contracts/migrations/DESIGN 修改0；未运行完整 `pnpm check`，未重复 Impeccable，未提交、推送或部署。

## 13. FIFO306 FRONT-SYSTEM-09C Rev5 UI 最后三场景微复验

### 13.1 环境与结论

- handoffToken：`FIFO306-FRONT-SYSTEM-09C-R5-UI-R1-V4.830`。
- 唯一正式环境：新鲜 system-frontend production build（45 modules）+ 正式 Fastify + 从零执行全部 38 项迁移的精确隔离 PostgreSQL + 零网络连接检查 Worker + 项目既有 Playwright 1.62.1/系统 Chrome。
- 最终原始矩阵 `23 项 / 22 通过 / 1 失败`，结论 `P0/P1/P2/P3=0/1/0/0`。FIFO304 已通过 26 项与 FIFO302 其余 112 项继续冻结；本轮不建议解锁 TEST。
- 生产 `frontend/system-frontend/backend/contracts/migrations/DESIGN` 修改0；未接真实模型、厂商、Secret、网络、付费或服务器。

### 13.2 A、C、D 通过事实

1. `/routing`：真实鼠标聚焦“新建路由草稿”后打开 Modal；遮罩原生 `mousedown` 命中即卸载目标，因此浏览器不会再向已卸载遮罩派发 `click`，最终 `activeElement` 精确回原按钮。pending 时遮罩可见且 `data-locked=true`，不关闭。
2. 1024 ControlShell：展开后真实 `.sidebar-overlay` 可见且 workspace 命中点可 hit-test；`sidebar=216`、`workspace x=72,width=952`，正文不挤压、根无横溢。真实鼠标点击遮罩关闭并回 aria-label=`展开侧栏` 的触发按钮。
3. 高层所有权：Modal 与 Drawer 均位于侧栏遮罩之上，真实操作不被遮罩截获，关闭高层后侧栏仍保持原状态；1440 不渲染侧栏遮罩。
4. application 主动 console error/warn=`0/0`、pageerror=`0`。两条受控 operations GET 503 分别对应 `fifo306-stale-1`、`fifo306-stale-2`，已与浏览器网络诊断分开记录。

### 13.3 B 唯一 P1

| ID | 正式产品事实 | 通过部分 | 未满足期望 |
| --- | --- | --- | --- |
| P1-001 | 同一完整 `/logs` query 已有 stale 后严格 `503→503→pending→200` | 两次失败均保留 stale 行、真实 requestId 与唯一重读；第二次 ErrorBlock 持焦；第三次 pending 全程仍保留旧 ErrorBlock、`fifo306-stale-2`、唯一禁用“读取中…”；真实200稳定后清错误并聚焦“日志与质量”H1；普通刷新及查询身份切换不继承旧意图 | 第三次点击后按钮变为 disabled，pending 期间 `activeElement=BODY`。需让当前最上层恢复投影继续持有安全焦点，且不得提前聚焦 H1 |

该缺陷只影响读取恢复 pending 的焦点所有权；错误事实、请求身份、写锁、成功提交时机与查询身份隔离均未失真。TEST 保持 blocked，交规划集中归因。

### 13.4 证据与清理

- 脱敏证据目录：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo306-system-09-ui-evidence`。
- 原始事实：`results.json`；最小截图：`01-routing-backdrop-closed-1440.png`、`02-logs-recovery-pending-1440.png`、`03-logs-recovery-success-1440.png`、`04-sidebar-overlay-1024.png`。截图已逐张人工核对；pending 焦点落 BODY 的裁决来自同轮浏览器 `activeElement` 原始事实，不以静态截图代替。
- 隔离数据库已在 finally 中终止连接并 DROP；Fastify 3001、preview 3010、测试 Chrome 与临时 harness 均关闭/删除；共享 PostgreSQL 55432 保持原运行态。
- 未运行完整 `pnpm check`，未重复 Impeccable，未提交、推送或部署。

## 14. FIFO308 FRONT-SYSTEM-09C Rev6 UI 单项 production 微复验

### 14.1 正式结果

- handoffToken：`FIFO308-FRONT-SYSTEM-09C-R6-UI-R1-V4.836`。
- 新鲜 system-frontend production build（45 modules）+ 正式 Fastify + 从零执行仓库当前全部迁移的精确隔离 PostgreSQL + 零网络连接检查 Worker + Playwright 1.62.1/系统 Chrome。
- 用户指定的单项请求/焦点矩阵 `10/10` 通过，产品裁决 `P0/P1/P2/P3=0/0/0/0`。FIFO306其余22项、FIFO304 26项和FIFO302 112项保持冻结。

### 14.2 请求与焦点事实

1. 正式 `/logs` 初始同一完整 query 返回1条 PostgreSQL事实；第一次受控503后保留 stale，第二次503后唯一 ErrorBlock 聚焦并显示真实 `fifo308-stale-2`。
2. 第三次显式“重新读取”前，真实按钮先成为 `activeElement`；鼠标点击后请求保持 pending。
3. pending 全程是同一个 DOM ErrorBlock（稳定标记未丢失），旧 requestId、stale 行和唯一 disabled“读取中…”均存在；`activeElement` 精确为该 `DIV[role=alert]`，不是 BODY、按钮或 H1。
4. resolve 正式200后，ErrorBlock 才卸载；`activeElement` 随后精确变为 `H1`“日志与质量”，服务端行保持。
5. application 主动 console error/warn=`0/0`、pageerror=`0`；两条浏览器503诊断分别与同一 operations GET 和 `fifo308-stale-1/2` 匹配，单独登记。

### 14.3 环境输入差异

- 原始 `results.json` 为 `12项/11通过/1失败`；唯一失败是 harness 按派发文字断言 `schema_migrations=38`。
- 本轮重新枚举仓库权威 `backend/migrations/*.cjs`，实际共37个；node-pg-migrate从零完整执行37/37，隔离库表也诚实记录37。本轮没有跳过、失败或回退迁移。
- 该差异归类为“派发环境计数与当前仓库事实不一致”，不冒充产品失败，也不把原始结果改写成通过。独立 `adjudication.json` 保留产品10/10与环境差异，交规划统一校正后决定 TEST。

### 14.4 证据与清理

- 脱敏证据目录：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo308-system-09-ui-evidence`。
- 原始结果：`results.json`；人工对账：`adjudication.json`；截图：`01-logs-recovery-pending-alert-focus-1440.png`、`02-logs-recovery-success-h1-focus-1440.png`。两图均已在本轮逐张打开核对。
- 隔离数据库已 DROP且残留0；3001/3010无监听；测试 Chrome/profile、preview、Fastify与临时 harness均已关闭/删除；共享 PostgreSQL 55432保持running。
- 生产 frontend/system-frontend/backend/contracts/migrations/DESIGN 修改0；未运行完整矩阵、完整 `pnpm check` 或 Impeccable，未提交、推送或部署。
