# SYSTEM-06 服务器与运行日志 UI 验收

状态：UI-SYSTEM-06 Rev 1 规划接管交付  
日期：2026-08-17  
权威设计：`DESIGN.md` 5.15  
职责：系统控制台服务器与运行环境；日志与质量  
衔接：`INT-11/12/13/15/17`

## 1. 交付范围

本轮沿既有 ControlShell 唯一视觉世界完成 `/servers` 与 `/logs` 可操作原型。UI 固定任务因运行环境误判 read-only 在动作前停止，规划在可写工作区接管同一 Rev；没有新开视觉方向，也没有修改生产前后端、迁移或共享契约。

原型：`C:\Users\ComradeGu\.codex\visualizations\2026\08\12\019ff4f8-4a77-7870-8edf-6350490b316c\ui-system-06-runtime-observability\index.html`

## 2. 统一流程

1. `/servers` 先判断运行面摘要，再从运行资源表打开详情。
2. 详情区分领域数据库事实与受控遥测；未知、未配置不补零。
3. 从资源详情进入 `/logs`，以 requestId、领域状态与不可变版本定位一次执行。
4. 日志详情展示时间线、人民币金额/待对账和脱敏原因，再深链引擎、路由、预算或领域任务。
5. 所有写控制继续由既有权威页面拥有；本切片没有第二个暂停开关或自动修复。

## 3. `/servers` 验收矩阵

| 场景 | 预期 |
| --- | --- |
| normal | 深色运行面、5 类资源、健康/新鲜度/版本和详情可读 |
| loading | 保留页面结构并显示明确加载状态，不展示匿名成功值 |
| empty | 说明未发现资源，不创建默认服务器 |
| telemetry not configured | 领域事实仍可读，遥测字段明确未配置/未知 |
| PostgreSQL error | 真实 requestId、最近成功事实保留、唯一“重新读取运行资源” |
| again failed / recovered | 再次失败仍唯一恢复；成功聚焦 H1 |
| detail | 打开聚焦详情标题；关闭回原行；只有只读深链 |

## 4. `/logs` 验收矩阵

| 场景 | 预期 |
| --- | --- |
| normal | 跨领域表格、服务端查询身份、稳定分页、CNY 主显示 |
| loading / empty | 明确加载与筛选空状态，无示例事实冒充生产 |
| error / stale | 真实 requestId、唯一原查询重读、恢复聚焦 H1 |
| detail | 状态/阶段/资源/requestId/耗时/用量/CNY/诊断/时间线齐全 |
| privacy | DOM 无 Secret、对象键、连接串、SQL、完整字幕/热词/提示词或原始载荷 |
| deep link | 只进入唯一控制所有者，不在日志页执行重试、暂停或配置修改 |

## 5. 视觉与响应式

- 沿用冷灰白画布、深石墨蓝侧栏与运行带、`#4458D8` 主动作、8px 节奏和紧凑数据表。
- 1440 保持完整侧栏；1024 收起侧栏 72px，覆盖展开不改变正文宽度。
- 1024 运行摘要两列/三列重排，诊断说明下置；资源表和 1180px 日志表只在各自 `.table-wrap` 内横滚。
- 根页面 `scrollWidth === clientWidth`，控制台 `error/warn=0/0`。

## 6. 键盘与焦点

- 页面恢复后 H1 可编程聚焦。
- 资源/日志详情打开后聚焦抽屉标题；关闭按钮、遮罩或 Escape 关闭后返回原行触发点。
- 详情存在时 Tab/Shift+Tab 保持抽屉语境；后台媒体或刷新反馈不得抢焦点。
- error→再次失败聚焦唯一恢复按钮或错误摘要；error→success 聚焦 H1。

## 7. 冻结与非目标

- 冻结：两页信息架构、读状态、深链、CNY 主显示、1440/1024 和唯一数据源边界。
- 非目标：真实 Agent/Grafana/Coolify/Portainer、SSH/终端、购买/部署/重启/扩缩容、日志文件导出、真实供应商/网络/Secret/付费调用。
- 原型数据、场景切换器和顶层示例标识禁止进入生产。

## 8. 交付验证

本轮新鲜证据：

- `node --check app.js/serve.mjs` 通过。
- Impeccable detector 依要求仅运行一次；因缺少 HTML 解析模块降级 regex，唯一命中为继承旧 ControlShell 的 4px 单侧边线，已改为 3px 内嵌标识线。降级结果是欠计数，不作为单独通过依据。
- 1440 `/servers`：根 `1440/1440`，正文 `x=216 / width=1224`，资源表 `934/960` 仅自身内滚，5 条资源，页面可见写控制 0。
- 1024 `/servers`：Chromium 纵向滚动槽后根 `1014/1014`；收起侧栏 72px、正文 `x=72 / width=942`；覆盖展开侧栏 216px 后正文尺寸不变；资源表 `912/960` 仅自身内滚。
- 1024 `/logs`：根 `1024/1024`，侧栏 72px、正文 952px，表格 `922/1180` 仅自身内滚；5 项摘要保持一行，4 条执行记录可达。
- 资源/执行详情打开后标题获焦；正向 Tab 从末操作回关闭按钮，反向 Shift+Tab 从关闭按钮回末操作；Escape 关闭后焦点返回原行。
- 执行记录 503 形态：真实 requestId、唯一重读；第一次重读再次失败仍唯一，第二次成功清除 stale/error 并聚焦 H1。
- 新原型全壳扫描与预算页真实 DOM 均为 `USD=false / ¥=false`，人民币主显示使用 `CNY`；页面 console `error/warn=0/0`。
- 截图：仓库外 `evidence/servers-1440.png`、`servers-1024-expanded.png`、`logs-1440.png`、`logs-1024.png`。

内联降级 Finish Reviewer 最终结论为 `ship`：既有 ControlShell 世界、双页阅读顺序、密度、字体、材料和只读诊断承诺一致；无缺失/矛盾的签名元素，无新增 material fix。正式前端仍必须等待 BACK-SYSTEM-06A/B 契约关闭，不得复制原型匿名数据。

## 9. 正式 React + Fastify UI 终验（FIFO209）

固定 UI 任务因运行环境为 `read-only` 在动作前停止，规划在同一 Rev、可写工作区接管正式终验；权限故障不计产品失败，也没有降低验收矩阵。输入为 system-frontend production build（36 modules）、正式 Fastify、精确隔离 PostgreSQL（32 migrations）和受控零网络运行目录/遥测 Provider。

结论：P0/P1/P2/P3=`0/0/0/0`。

- `/servers` 1440 根 `1440/1440`，侧栏/正文 `216/1224`；1024 Chromium 纵向槽后根 `1009/1009`，侧栏 72px、正文约 937px，覆盖展开 216px 不改变正文位置或宽度。资源表分别只在自身 `897/960`、`862/960` 容器内滚。
- `/logs` 1024 根 `1024/1024`，侧栏/正文 `72/952`，覆盖展开后正文保持；日志表 `877/1180` 只在自身容器内滚。正式三条执行事实覆盖已完成、需对账和结果未知；CNY 主金额、原币审计、requestId、不可变版本和脱敏错误均来自服务端。
- 运行资源详情和日志详情打开聚焦标题，Shift+Tab 从标题进入末项，Escape 返回原行触发点；DOM 不含对象键、Secret、连接串、SQL、完整正文或供应商原始载荷。
- 集中修正页面级读取所有权：运行摘要与资源列表同时失败时只呈现一个错误摘要和一个“重新读取”，错误摘要获焦；日志真实 `503 → 503 → 200` 保留旧表格、唯一恢复入口与真实 requestId，再次失败仍聚焦错误摘要，成功聚焦 H1。
- 自动刷新关闭后的零后台请求由可控时钟 DOM 回归证明；应用内浏览器隔离执行上下文不暴露 `window.fetch`/Performance API，未冒充浏览器请求计数。页面视觉、关闭提示及手动刷新另由正式浏览器通过。
- 页面 console `error/warn=0/0`；Impeccable detector 按本切片规则只运行一次并为 `[]`，未在微返工后重复运行。

仓库外最小证据：`system06-formal-ui/servers-1440.png`、`servers-1024.png`、`logs-1024-expanded.png`、`logs-error-focus.png`。其余正式矩阵证据在同目录；匿名夹具、受控 503 和本地 Provider 不进入生产常量。
