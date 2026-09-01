# UI-SYSTEM-04 Rev 1 · 预算、限额与付费调用安全门验收

## 1. 结论与范围

`/budgets` 已在唯一、冻结的管理员 `ControlShell` 中形成完整可操作设计：正常账本、不可变策略草稿、历史回放、影响检查、批准、发布未知只读恢复与回滚贯通；`1440×900` 和 `1024×768` 均无页面根横向溢出。方向继续使用冷灰白画布、深石墨蓝侧栏和 `#4458D8` 主动作；没有第二视觉方案、员工 `AppShell`、真实付费资源、真实 Secret 或生产代码改动。

唯一原型：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\ui-system-01-control-shell\index.html`。

## 2. 页面信息结构

1. 页头：环境、整体状态、刷新、新鲜度、搜索、告警和唯一当前导航 `aria-current="page"`。
2. 付费调用安全门：当前生效版本、CNY/USD 今日占用和待对账记录数，不跨币种汇总。
3. 日/月账本：ASR API、OCR API × CNY、USD 分行；两周期各列已结算、预留、待对账和占用合计。
4. 当前阈值：逐池逐币种展示日/月提醒与硬阻断；提醒和阻断使用文字、标签、原因共同表达。
5. 策略版本链：不可变草稿、固定快照回放、影响检查、批准、发布/回滚；侧栏只给摘要和安全下一步。
6. 抽屉/对话框：不可变版本历史、草稿编辑、高风险发布和回滚；宽内容只在自身容器内横滚。

## 3. 权威事实与员工可见边界

| 主题 | 设计冻结事实 | 禁止前端自行推算 |
| --- | --- | --- |
| 金额 | 服务端精确十进制；日/月、已结算/预留/待对账分列 | 浮点重算、未知补零、跨币种换算或汇总 |
| 时间 | 环境、数据库时间窗口和新鲜度均来自服务端 | 浏览器本地日期决定日/月归属 |
| 门控 | warning 继续新请求；hard block 只阻断新的付费请求 | 因提醒停用资源池，或终止运行中请求 |
| 未知费用 | 预留继续占用并进入待对账 | 自动释放、自动备用、自动重试付费调用 |
| 版本 | PostgreSQL 不可变版本与唯一 active 指针 | 草稿/批准即生效，失败或未知时切 active |
| 并发/队列 | 仅链接 `/routing` | 在预算页复制三项容量输入或状态 |

原型匿名金额、状态和身份由全局唯一“示例数据”标识约束；正式生产禁止硬编码。`requestId` 只在错误、未知、审计/诊断区显示。

## 4. 设计状态矩阵

| 状态 | 事实与唯一下一步 | 验收 |
| --- | --- | --- |
| loading | 保留页框与表头骨架，不显示匿名金额 | 通过 |
| empty | 明确暂无账本事实；不等同无 active | 通过 |
| error / 再次失败 | 真实原因和 `requestId`，恰好一个“重新读取”；再次失败仍唯一且获焦 | 通过 |
| stale | 保留最近成功账本，标出刷新失败和唯一重读；恢复后清除 stale、聚焦 H1 | 通过 |
| 无 active | 新付费请求阻断；唯一“新建预算策略草稿” | 通过 |
| 缺币种 | 对应行金额为 `—`、明确阻断；不借用其他币种规则 | 通过 |
| warning | 命中提醒但允许继续，预留和待对账仍可见 | 通过 |
| hard block | 只阻断新请求，不终止运行中请求，不清预留/待对账 | 通过 |
| reconciliation | 费用结果未知继续占用，显示待对账记录 | 通过 |
| 草稿失败/未知/冲突 | 分别为修正后保存、查询同一 `budgetPolicyVersionId`、刷新权威版本；活动对话框内只有一个恢复动作 | 通过 |
| 回放中/失败 | 只显示真实阶段，不伪造百分比；失败唯一重新读取并运行 | 通过 |
| 影响阻断 | 列出缺币种、阈值关系或版本冲突，唯一返回修正草稿 | 通过 |
| approved | 仍显示旧 active；唯一“确认发布” | 通过 |
| 发布失败 | 原因/`requestId` 保留，旧 active 不变，唯一重新提交本次发布 | 通过 |
| 发布 unknown | 只 GET 同一 `releaseCommandId=budget-release-ui-04-009`；旧 active 不变 | 通过 |
| 发布成功 | 成功标题获焦后才切换新 active | 通过 |
| 回滚 | 新命令指向历史已批准版本；走同一确认/未知/成功与审计链 | 通过 |

## 5. 高风险链与焦点

- 发布确认明确对照旧/新阈值、7 条在途预留、14 条新增提醒、3 条将阻断的新请求，以及运行中请求不终止。失败或未知时 v2.4.1 继续生效，成功后才显示 v2.5.0。
- 对话框打开后“安全返回”初始获焦；真实 `Tab` 到确认、再 `Tab` 回安全，`Shift+Tab` 反向闭环。非提交中 `Escape` 关闭并回原触发点。
- 提交中 `aria-busy=true`，两个动作锁定，Tab 不逃出，Escape/遮罩/重复提交无效。失败/未知聚焦唯一恢复动作；成功聚焦明确标题。
- 草稿失败稳定后活动焦点为“修正后保存”，冲突稳定后为“刷新当前版本”；两态活动对话框内均只有一个主恢复动作。

## 6. 双视口 DOM 与截图证据

| 场景 | 真实测量 | 结论 |
| --- | --- | --- |
| 1440 正常 | root `1430/1430`；侧栏 `216px`；main `1214px`；账本容器 `1176/1480`，阈值容器 `821/980`，均 `overflow-x:auto` | 根无横溢，详细密度成立 |
| 1024 收起 | root `1014/1014`；侧栏 `72px`；main `x=72 / width=942`；账本 `912/1480`，阈值 `912/980` | 根无横溢，字段不删 |
| 1024 展开 | 侧栏覆盖 `216px`；main 仍 `x=72 / width=942`；root 不变 | 覆盖不挤主区 |
| 1024 版本抽屉 | 抽屉约 `430px`；内部表 `390/520` 自身横滚；标题获焦 | 根宽不变 |
| 1024 草稿 | 对话框 `760×489`；内部表 `720/900` 自身横滚；初始焦点安全返回 | 可读、可键盘操作 |

证据目录：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\ui-system-01-control-shell\evidence\ui-system-04-rev1\`。

- `01-budgets-normal-1440.png`：展开侧栏、账本、阈值和版本链。
- `02-budget-draft-1440.png`：完整四币种草稿编辑。
- `03-budget-publish-confirm-1440.png`：新旧阈值、在途占用与新阻断确认。
- `04-budgets-normal-1024.png`：72px 侧栏和容器内横滚。
- `05-budgets-sidebar-expanded-1024.png`：216px 覆盖不挤主区。
- `06-budget-version-drawer-1024.png`：版本抽屉与内部宽表。
- `07-budget-draft-1024.png`：窄视口受保护草稿对话框。

## 7. 浏览器与 Impeccable

- 本轮完整设计浏览器矩阵已覆盖正常、loading、empty、error/再次失败/恢复、stale、无 active、缺币种、warning、hard block、待对账、草稿/回放/影响/批准/发布/回滚及双视口；页面 console `error/warn=0/0`。
- `node --check app.js` 通过。Impeccable detector 仅运行一次；因 `htmlparser2 / css-select / css-tree / domutils` 缺失降级为 regex，结果不是完整 clean bill。唯一 warning 为既有 `styles.css:216 .integration-banner` 的 4px 中性“尚未接入”风险带，非预算切片新增，也不在预算页重复，人工接受且未为评分改动冻结视觉。
- 独立完成审查首次结论为 `material-fixes`：视觉/双视口通过，但指出无 active、缺币种、stale/error、回滚目标、流程阶段和失败输入保留存在互相矛盾的投影。按 Impeccable 一次集中修正规则已全部关闭：无 active 的阈值/抽屉统一为“历史已批准 / 未生效”且禁止回滚；缺币种抽屉的 USD 快照为 `—`；stale/error 只读并禁用写入口，error 不再展示未确认缓存金额；回滚抽屉/确认/成功统一 `v2.3.0`；显式阶段映射保留失败前完成事实；失败草稿保留输入、错误字段和表格位置，资源池/币种两列固定。
- 差量浏览器复验：上述六组状态均通过，草稿失败值 `2500.00` 保留、活动焦点为“修正后保存”，两列 `position=sticky`；修正后 console 继续 `error/warn=0/0`。按技能规则不运行第二次 detector 或第二次完成审查。生产代码、contracts、迁移均未修改。

## 8. P0–P3 与停止边界

当前设计矩阵结论：`P0=0 / P1=0 / P2=0 / P3=0`。匿名数据、成功状态、固定数值和场景切换只用于原型验收，不构成后端事实或生产常量。未接真实供应商、Secret、网络、付费、云资源，未启动 FRONT/BACK，未提交、推送或部署。

## 9. 八项差量包

1. 任务/版本：`UI-SYSTEM-04 Rev 1`，FIFO 186；完成唯一 `/budgets` 设计矩阵，交规划 review。
2. 输入冻结：SYSTEM-budget-guardrails、SYSTEM_CONTROL_CENTER §4/7/8/9、职责矩阵预算行、INT-11/12/13/15、DESIGN 5.11/5.12 与既有 ControlShell。
3. 产物：DESIGN 5.13、本验收文档、同一仓库外原型和上述七张最小截图。
4. 允许文件：仅 DESIGN、docs/ui、本地原型/证据、CURRENT/开发日志；生产目录修改 0。
5. 冻结/非目标：冻结 ControlShell 视觉和公共交互；不复制 `/routing`，不接真实供应商/Secret/网络/付费/云资源，不建立第二状态源或 fallback。
6. 定向验证：一次完整浏览器矩阵、双视口 DOM 测量、焦点/键盘、console、`node --check`、一次降级 detector 和一次独立审查。
7. 接收/停止：先写回 review，再只通知规划；不通知或解锁 FRONT/BACK/测试，不自行标记 done。
8. 职责/衔接：独立管理员 ControlShell；INT-11（active→Worker）、INT-12（Usage/Attempt→控制台）、INT-13（权限隔离）、INT-15（原子预留/数据库时间/未知保留）。

## 10. FIFO191 · FRONT-SYSTEM-04B Rev 2 正式 UI 终验

### 10.1 结论

本轮使用新鲜 `system-frontend` production build（Vite 27 modules）、正式 Fastify system-control 路由与精确隔离 PostgreSQL `qimao_fifo191_ui_20260817`（30 migrations）完成 SYSTEM-04 唯一完整正式浏览器矩阵。矩阵没有在首个缺陷停止；最终结论为 **不通过，P0=0 / P1=2 / P2=2 / P3=0**，转规划集中返工裁决。生产 `system-frontend/frontend/backend/contracts/migrations/DESIGN` 修改 0，未运行完整 `pnpm check`，未重复 Impeccable。

### 10.2 新鲜通过项

- 唯一 ControlShell、唯一 `/budgets` 一级导航及唯一 `aria-current="page"` 成立；员工站源码与现有 dist 对 ControlShell、预算管理入口和 `/api/system-control` 引用均为 0。
- 服务端精确金额字符串、CNY/USD 日/月窗口、已结算/预留/待对账、warning、无 active、缺规则、服务端分页/筛选/total 均由正式 API/PostgreSQL 投影；浏览器没有补零、换汇或跨币种汇总。历史回放、用量、审计和真实 `reservationId` 详情可重新发现。
- loading、empty、首次 error、再次失败、stale 保留、恢复成功完整通过；读取失败始终只有一个重读，失败/再次失败聚焦 ErrorBlock，恢复聚焦 H1。
- 草稿确定失败在活动 Modal 内安全聚焦；草稿响应未知为 POST=1、同一预生成 `policyId` GET=1。直接回放成功后立即进入 testing、出现“运行影响检查”且禁止重复回放；历史 PostgreSQL unknown 仅 GET 同一 `testRunId` 两次，POST=0。
- FIFO190 两项变化通过真实链复核：impact unknown 第一次 GET 仍为 testing 时保留唯一查询和“命令尚未形成”提示，第二次达到 impact_checked 才完成；approve 同理从 impact_checked 到 approved。发布 unknown 保留旧 active，且只 GET 同一 `releaseCommandId` 后才切换。
- 草稿、发布、回滚 pending 时活动 dialog 获焦，`aria-busy=true`，`Tab/Shift+Tab` 不逃出，Escape/遮罩/重复提交锁定；确定失败聚焦 dialog 内 ErrorBlock，非 pending Escape/取消回原触发点。页面 console `error/warn=0/0`。
- 权限新鲜结果：anonymous/employee/缺 capability 读取均 403，budget read 为 200；read-only 创建为 403、budget write 创建为 201；write-only rollback 为 403、publish capability 已越过权限门并进入资源校验。

### 10.3 双视口实测

| 场景 | DOM 实测 | 结论 |
| --- | --- | --- |
| 1440 正常 | root `1425/1425`（Windows 纵向滚动条槽）；主账本 `1133/1133`；次宽表容器 `625/980` | 根无横溢，宽内容只在容器内滚 |
| 1024 收起 | root `1009/1009`；侧栏 `72px`；main `x=72 / width=937`；账本容器 `861/1049` | 剩余主区完整使用，列不逐字折行 |
| 1024 展开 | 侧栏 `216px`；main 仍 `x=72 / width=937`；root `1009/1009` | 覆盖不挤主区 |
| 1024 发布弹窗 | dialog `x=164.5 / width=680 / client=scroll=680` | 弹窗自身与页面根均无横溢 |

### 10.4 集中返工包

1. **P1｜历史回滚真实不可达。** 正式页面对 `retired` v2 显示“回滚至此版本”；正式 Fastify 对同一目标稳定返回 409 `SYSTEM_CONTROL_BUDGET_INVALID_TRANSITION / 只有已批准预算策略可以发布`，未创建 release command，随后同 `releaseCommandId` GET 只能返回“预算发布命令不存在”。旧 active 正确保留，但 UI Rev1 冻结的回滚成功链无法完成。需统一合同允许的 approved/retired 历史目标与后端 release 状态门，不能靠前端隐藏错误或重发命令。
2. **P1｜高风险发布缺失关键影响事实且摘要误导。** v28 详情已明确 `runtimeBlockedScopes=ocr_api:USD:day/month`、新阈值 `warning=1 / hard=2`、1 条在途待对账；发布弹窗却不显示旧/新阈值，不列“将阻断的新请求/范围”，并显示“0 项硬阻断”。这不满足必须在确认前展示阈值差异、在途占用与新请求阻断的安全门。弹窗应消费已有 impact scopes/runtimeBlockedScopes，不在浏览器重算。
3. **P2｜生产可见工程措辞。** 顶层可见 `PostgreSQL`、`billing`、`active`、`actor`，无 active 防御态还直出 `no_active_policy / missing_currency_rule:*`。`requestId` 在错误/审计区保留正确；其余实现名应翻译为“当前生效、执行身份、缺少币种规则”等业务称谓，工程数据源说明只留设计/验收文档。
4. **P2｜回滚 unknown 恢复文案误称发布。** 同一 `releaseCommandId` 的唯一恢复行为正确，但按钮显示“查询本次预算发布结果”；回滚上下文应显示“查询本次预算回滚结果”。

### 10.5 证据与清理

脱敏证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\front-system-04b-rev2-ui-qa\results.json`，截图目录为其 `screenshots/`。隔离库已 DROP 并核验不存在；31911/31912/55432 均无监听；临时 harness 与编译运行副本已删除，只保留结果 JSON 和五张最小截图；浏览器标签已关闭且临时视口已复位。

## 11. FIFO194 · FRONT-SYSTEM-04B Rev 3 变化场景 UI 微终验

### 11.1 结论与运行边界

本轮使用新鲜 `system-frontend` Vite production build（27 modules）、正式 Fastify system-control 路由与精确隔离 PostgreSQL `qimao_fifo194_ui_20260817`（30 migrations）只复验 FIFO191 的四组变化场景；结论为 **通过，P0=0 / P1=0 / P2=0 / P3=0**。FIFO191 其余完整矩阵、1440/1024 主体、权限/两站隔离、金额/分页/loading/empty/stale 证据全部冻结，未重复 Impeccable、未运行完整 `pnpm check`，生产 `frontend/system-frontend/backend/contracts/migrations/DESIGN` 修改 0。

### 11.2 历史回滚与唯一命令身份

- 初始权威状态为 v1=`retired`、v2=`active`、v3=`impact_checked`。页面批准 v3 时，服务端影响快照含 `runtimeBlockedScopes=ocr_api:USD:day/month`、`configurationHardBlocks=[]`；“批准策略”没有被运行阻断误锁，成功后状态为 `approved` 且活动焦点落到 H1。
- 页面从 v2 回滚至历史 v1：POST 在服务端成功后由隔离传输层模拟响应未知，页面保留真实 `requestId=0d5cf8a5-f9a6-44d2-8884-240b1f8eda80`，且恰好一个“查询本次预算回滚结果”获焦。恢复只 GET 同一 `releaseCommandId=1014eb38-3fbe-4e3e-828c-efd334c73d2d`，最终唯一 active 指针切至 v1、H1 获焦；页面路径统计为 rollback POST `1`、release GET `1`。
- 同 key/同命令重放返回 200 与 `x-idempotent-replay=true`，回滚命令/审计仍各 `1` 条。当前 active v1 no-op rollback 与 retired v2 publish 均稳定返回 409 `SYSTEM_CONTROL_BUDGET_INVALID_TRANSITION`，对应命令副作用均为 `0`。

### 11.3 发布安全事实与生产措辞

- 发布弹窗直接消费正式 API：日/月两行均展示旧/新提醒阈值 `5→1`、旧/新硬阻断阈值 `12→2`；同时展示在途预留 `1`、待对账 `1`、提醒 `2`、两个“将阻断的新请求范围”和两个运行提醒范围。配置硬阻断为空时没有误写“0 项硬阻断”，运行阻断仍完整可见。
- 可见文本扫描 `PostgreSQL / billing / active / actor / no_active_policy / missing_currency_rule` 命中 `0`；唯一当前导航仍为“预算与限额”。`requestId` 继续只出现在错误、回放/审计等诊断区域，本轮正常页实测可见 `2` 处诊断标签。

### 11.4 焦点、键盘与控制台

| 场景 | 新鲜真实键盘证据 | 结论 |
| --- | --- | --- |
| 发布弹窗 | 初始“关闭”；`Shift+Tab→确认发布`，`Tab→关闭`；Escape 关闭并回“确认发布”触发点 | 双向闭环通过 |
| 回滚弹窗 | 初始“关闭”；`Shift+Tab→确认回滚`，`Tab→关闭`；Escape 关闭并回“回滚至此版本” | 双向闭环通过 |
| 回滚 pending | 活动焦点为 dialog，`aria-busy=true / data-locked=true`，3 个按钮禁用；Tab/Shift+Tab 均留在 dialog，Escape 与遮罩无效 | 提交锁通过 |
| unknown / success | 唯一恢复动作获焦；同 ID GET 后 H1 获焦且不落 BODY | 恢复落点通过 |

正式页面 console `error/warn=0/0`。浏览器内未注入页面脚本伪造服务端结果；所有策略、影响、命令、审计与 active 指针均来自本轮隔离 PostgreSQL/Fastify。

### 11.5 证据与清理

脱敏结果：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\front-system-04b-rev3-ui-qa\results.json`；最小截图为 `screenshots/01-publish-safety-facts-1440.png` 与 `screenshots/02-rollback-success-1440.png`。隔离库已精确 DROP 并核验不存在；31941/31942 已关闭；临时 harness、loader 与 contracts runtime 已删除；浏览器标签关闭、临时视口复位。共享本地 PostgreSQL `55432` 已再次查询确认仍运行，留给后续 `TEST-SYSTEM-04`。
