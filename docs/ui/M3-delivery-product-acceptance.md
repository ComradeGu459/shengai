# M3 S7 交付确认与产品库 UI-M3-07 Rev 2 规划复验稿

状态：规划定向退审四项微返工已完成，等待规划复验

任务：`UI-M3-07 Rev 2`

Reviewer：规划对话

权威业务：`docs/contracts/M3-delivery-product-workflow.md`

模块衔接：`docs/contracts/MODULE_INTEGRATION_CONTRACTS.md` 的 `INT-08`

权威设计：`DESIGN.md` 2.1、2.2、5.8、5.9

可操作原型：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\ui-m3-07-delivery-product\index.html`

## 0. 单一方向与边界

- 本轮只有一个成熟内部工作台方向：既有 AppShell、冷灰画布、白色工作面、`#4458D8` 靛蓝强调、紧凑表格和边界分区。没有 B/C、主题切换、密度设置、营销首屏或管理员配置墙。
- 原型贯通“完整确认 → 受保护确认 → `preparing` → 未知/失败恢复 → 成功转场 → 产品详情 → 全局产品库”。右上页面切换器和状态演示按钮只为用户验收，不进入生产。
- 原型中的“样例短剧”、8 集、数量、`deliveryId` 和 `requestId` 均为匿名示例。正式前端必须消费共享契约和真实 API，不能复制示例事实。
- S5 只提供 `ready_to_release` 验收会话、来源与返回路径；S7 拥有交付产品、清单、Attempt 和状态。项目二级导航不复制产品库。

### Rev 2 定向微返工

- 焦点：确认弹窗不再依赖浏览器默认顺序，只按当前动作索引显式前进/后退；“安全返回”与“确认生成”四个 `Tab / Shift+Tab` 映射均真实复验。
- 信息架构：确认、`preparing`、未知、失败、成功、产品库和详情统一高亮全局“交付产品库”，当前项均有 `aria-current="page"`。项目面包屑和“返回继续修改”保留为来源/返回路径。
- 员工文案：统一“确认来源版本和文件清单”“当前已确认来源”“确认验收内容与来源”“生成后文件不可修改；需修改请创建修订”，隐藏 freeze、AcceptanceRelease 和通过签名。
- 匿名身份：产品库 5 行使用 `dlv_7A8C / dlv_4F2K / dlv_9D5M / dlv_2B6R / dlv_8H3Q` 五个稳定且不同的短 ID。
- Rev 1 已通过的整体产品流、空轨、失败恢复、成功转场、详情、双视口和表格内滚保持冻结。本轮未重跑完整矩阵，只复验规划指定场景并覆盖对应同名证据。

## 1. 页面结构

### 1.1 完整交付确认页

路由：`/projects/:projectId/deliveries/confirm?sessionId=...`

1. 唯一标题“核对并生成交付产品”与“可生成”状态。
2. 项目上下文条：项目、验收修订、通过集数、负责人、返回继续修改。
3. 产品身份与备注：服务端产品名预览、负责人事实、可编辑备注、通过/阻断集数。
4. 来源版本：S3/S4 Release、验收会话修订、视频清单、术语/模板及有效状态。
5. 三类摘要：台词 SRT、画面字 SRT、术语 XLSX。
6. 逐集配对表：每集同时出现台词与画面字文件；空画面字明确为“空轨文件 / 0 条 · UTF-8 BOM”。
7. 粘性底部操作条：次操作“返回继续修改”，唯一主操作“生成交付产品”。

### 1.2 全局产品库

路由：`/deliveries`

- 位于全局侧栏，与项目中心、任务中心同级。工具条提供服务端搜索、状态筛选、创建/更新时间排序和查询。
- 表格列固定为产品名称、项目、版本、状态、文件摘要、负责人、备注摘要、创建时间、更新时间和操作；行级主操作只有“查看详情”。
- 稳定分页显示总数与当前范围。1024 时只有表格容器内部横向滚动，根页面不横溢。

### 1.3 产品详情

路由：`/deliveries/:deliveryId`

- 左侧主栏为三类文件树与历史事件，右侧为项目、来源版本、负责人、备注、创建/更新时间、requestId 和 deliveryId。
- 台词字幕、画面字字幕、术语表分别成组；每个文件和每类文件均可单独下载，顶层提供“下载全部”。ZIP 只作为传输方式，不是第四类产品事实。
- 内容只读。“创建修订”返回验收流程并创建新工作副本，旧产品与文件保持不可变。

## 2. 状态与恢复矩阵

| ID | 场景 | 必须显示 | 唯一动作 / 禁止 | 等级 |
| --- | --- | --- | --- | --- |
| CONFIRM-01 | 进入确认 | 产品名、负责人、备注、来源、通过/阻断、三类摘要和逐集双 SRT | 生成交付产品；不得编辑正文 | P1 |
| CONFIRM-02 | 生成确认对话框 | 版本不可变、双 SRT、空轨说明 | 初始聚焦安全返回；确认中防重复 | P1 |
| FILE-01 | 某集无画面字 | 同名画面字 SRT、UTF-8 BOM、“空轨文件 / 0 条” | 不得隐藏、禁用或表现为漏文件 | P0 |
| FILE-02 | 整剧无画面字 | 每集仍有画面字 SRT，全部标空轨 | 不得把画面字目录省略 | P0 |
| GEN-01 | `preparing` | 已知产品名、同一 deliveryId、服务端真实阶段 | 不显示百分比、预计时间或取消任务 | P1 |
| GEN-02 | 网络未知 | 连接中断说明、同一 deliveryId | 只“查询本次生成结果”，不重发创建 | P0 |
| GEN-03 | `generation_failed` | 具体原因、requestId、同一 deliveryId、确认内容保留 | 只“恢复本次生成”；来源失效时返回验收 | P0 |
| GEN-04 | `ready` 成功 | 产品名、三类完成事实 | “立即进入产品详情” + 可取消短倒计时 | P1 |
| GEN-05 | 自动转场 | 倒计时可读且可取消 | 初始成功标题获焦；倒计时不得抢焦点 | P1 |
| LIST-01 | loading | 保持表格工作面几何的骨架 | 无写动作 | P1 |
| LIST-02 | empty | 无匹配原因与筛选语境 | 清除筛选 | P2 |
| LIST-03 | error | 请求失败、requestId、查询条件保留 | 唯一“重新读取产品列表” | P1 |
| LIST-04 | 稳定列表 | `preparing / ready / generation_failed / recycled` | 行主操作只“查看详情” | P1 |
| DETAIL-01 | `ready` 详情 | 三类文件树、空轨、下载、来源、元数据、requestId、历史事件 | 内容只读 | P1 |
| DETAIL-02 | `recycled` | 回收状态与不可下载原因 | 恢复生命周期另立命令；不伪装 ready | P1 |

## 3. 键盘与焦点门

- 生成确认对话框打开并稳定 300ms 后，`activeElement=安全返回`。真实键盘实测：安全返回 `Tab→确认生成`、确认生成 `Tab→安全返回`、确认生成 `Shift+Tab→安全返回`、安全返回 `Shift+Tab→确认生成`；非提交 `Escape` 关闭并返回“生成交付产品”。
- 生成失败只保留一个恢复动作；恢复中禁用重复点击，再次失败焦点回该恢复按钮，成功进入成功标题语境。
- 成功状态初始焦点为 `#successTitle`；倒计时只更新文本，不改变当前活动元素。取消自动进入后保留“立即进入产品详情”。
- 页面、表格、筛选、分页、文件下载和创建修订均有可见 `:focus-visible`。程序化主内容焦点不显示浏览器默认黑框。

## 4. 视觉与响应式

| 视口 | AppShell | 布局与滚动 |
| --- | --- | --- |
| `1440×900` | 展开 `204px` | 确认/详情居中最大约 `1160px`；产品库主区约 `1236px`；根 `scrollWidth=clientWidth` |
| `1024×768` | 收起 `72px` | 产品库主区 `952px`；确认/详情有纵向滚动时根约 `1014/1014`，产品库根 `1024/1024`；无根横溢 |

1024 定向几何：

- 确认页身份双列约 `466 / 382px`，来源单列约 `872px`，三类摘要约 `290 / 290 / 290px`。
- 详情主/侧栏约 `589 / 303px`，详情网格 `906 / 906px`。
- 产品库表格容器/表格约 `914 / 1040px`，横向滚动只在表格容器；主区 `952 / 952px`，根 `1024 / 1024px`。
- SVG 导航使用统一线宽；数字、时间、ID 使用等宽数字特性；滚动条、焦点环和状态色均来自工作台令牌。

## 5. 最终证据

证据目录：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\ui-m3-07-delivery-product`

| 证据 | 文件 |
| --- | --- |
| Rev 2 复验：1440 完整确认 | `delivery-confirm-1440.png` |
| Rev 2 复验：1440 受保护确认弹窗 | `delivery-confirm-dialog-1440.png` |
| 1440 生成中 / 未知 / 失败 / 成功 | `delivery-preparing-1440.png`、`delivery-unknown-1440.png`、`delivery-failure-1440.png`、`delivery-success-1440.png` |
| 1440 产品详情 / 产品库 / 列表失败 | `delivery-detail-1440.png`、`delivery-library-1440.png`、`delivery-library-error-1440.png` |
| 1024 完整确认 / 产品详情 / 产品库 | `delivery-confirm-1024.png`、`delivery-detail-1024.png`、`delivery-library-1024.png` |

Rev 2 定向复验覆盖并刷新：`delivery-confirm-1440.png`、`delivery-confirm-dialog-1440.png`、`delivery-success-1440.png`、`delivery-library-1440.png`、`delivery-library-1024.png`。其他 7 个截图文件及 Rev 1 已通过的 12 张证据结论保持冻结，不借微返工扩大矩阵。

Rev 2 新鲜浏览器证据：运行日志 `warn/error = 0`；1440 产品库根宽 `1440/1440`，1024 产品库根宽 `1024/1024`、主区 `952/952`、表格容器/表格 `914/1040`。七种 S7 页面语境的 `.nav-item.active` 与 `[aria-current="page"]` 均且只为“交付产品库”；五个匿名短 ID 数量/去重数为 `5/5`。确认弹窗稳定 300ms 后的正反向闭环和 Escape 返回由真实键盘取得。

Impeccable 检测只执行一次；由于 HTML 解析模块不可用，工具降级为正则并提示一个侧边强调线问题，已改为顶部错误边界。固定对话协议不使用隐藏子代理，因此按 Impeccable 的 degraded finish-reviewer 在同线程完成独立收口：首轮 `disposition: fix` 只指出 Unicode 导航与未令牌化滚动条；两项修正并覆盖同名截图后，最终 `disposition: ship`。

## 6. 正式前端交接路径

- 生产路由：`/projects/:projectId/deliveries/confirm?sessionId=...`、`/deliveries`、`/deliveries/:deliveryId`。
- 建议模块目录：`frontend/src/features/deliveries/`；全局模块注册只增加一个 `deliveries`，不得在项目二级导航注册第二个产品库。
- 唯一权威输入：`M3-delivery-product-workflow.md`、`INT-08`、共享 `deliveries` 契约（待后端任务形成）、`DESIGN.md` 5.9、本文件与上述最终原型/截图。共享契约未形成前，前端保持 blocked，不得复制示例枚举或本地状态机。
- 正式 React 首次交审必须提供同状态、同视口截图；真实产品数量、来源、请求结果允许不同，但页面结构、主操作、状态专属恢复、空轨表达、焦点和根滚动必须同构。
- 不得把原型页面切换器、状态演示按钮、匿名产品名/ID、B/C、运行时主题、管理员配置、外部总库上传或真实下载字节带入生产。

## 7. 本轮停止边界

本轮只修改 `DESIGN.md`、本验收文档、CURRENT/开发日志和仓库外匿名原型/定向证据。未修改或启动生产 frontend/backend、迁移、测试或 `packages/contracts`，未接真实云资源、API、密钥、付费，未提交、推送或部署。FRONT-M3-05B 保持 blocked；规划复验前不解锁或通知前后端。

## 8. FIFO 139 正式 React 终验（2026-08-15）

### 8.1 正式全链与通过事实

- 完整确认页由隔离 PostgreSQL 返回产品名、负责人、备注、来源修订、`2/2` 通过、三类摘要及逐集双 SRT；两集无画面字仍各有 `3 bytes`、字节头 `EF BB BF` 的合法空 SRT，并显示“空轨文件 / 0 条 · UTF-8 BOM”。
- 创建响应经受控代理丢失后，页面只显示同一 `deliveryId=555adbff-7d34-46bd-a050-85afe68e51bd` 的“查询本次生成结果”；查询进入真实 `preparing`，无虚构百分比或取消。Worker 两次受控对象存储失败均在同一产品保留原因/requestId；最终同一 ID 生成 `ready`，成功标题获焦、三类完成事实和可取消倒计时可见。
- 详情展示台词/画面字/术语三组共 5 个文件、单个下载、下载全部、空轨、负责人/备注、来源、创建/更新时间、中文历史事件与 requestId；员工 DOM 未出现 `AcceptanceRelease` 或 raw event kind。空轨文件真实下载返回 `200` 与 3 字节 BOM。
- 产品库真实显示 `preparing / ready / generation_failed / recycled` 四状态（主链完成后 preparing 样本被 Worker 消费为 ready），服务端搜索、状态筛选、创建/更新时间排序、受控 loading/empty/error/唯一重读和 `limit=2` 的稳定分页均通过；两页 ID 无重复。确认、状态、详情与产品库均且只为全局“交付产品库”设置 `aria-current="page"`。
- 精确视口：1440 确认/成功/详情与产品库根宽均等于 clientWidth，AppShell `204px`；1024 产品库/详情根约 `1014/1014`、AppShell `72px`。回收产品无下载，负责人、备注和保存按钮原生禁用。

### 8.2 P0–P3 结论

| 等级 | ID | 新鲜结果 |
| --- | --- | --- |
| P1 | `FOCUS-LOOP` | 生成确认弹窗稳定后聚焦“安全返回”，但真实 `Tab` 连续两次仍停留原处；`Shift+Tab` 才到“确认生成”。Escape 返回触发点通过，正向焦点闭环失败。 |
| P1 | `RECOVERY-REPEAT` | recover 响应未知后仅 GET 同一 ID 通过；若 Worker 再次明确 `generation_failed`，页面仍保留 query-only 状态，不能在不刷新时再次恢复同一产品。 |
| P1 | `FAILURE-FOCUS` | 直达 `generation_failed` 详情时 `activeElement=BODY`，未落到失败标题或唯一“恢复本次生成”。 |
| P1 | `SUCCESS-CONSOLE` | 倒计时自动进入详情时 React 报 `Cannot update BrowserRouter while rendering DeliveryDetailPage`；本轮最终控制台为 `error/warn=1/0`，不满足 `0/0`。 |
| P1 | `TABLE-1024` | 1024 产品库根无横溢，但表格容器/表格同为 `834/834`，没有设计要求的内部横滚；项目名、备注和“查看详情”逐字折行，成熟紧凑表不可扫读。 |
| P2 | `IMPECCABLE-DEGRADED` | Impeccable 静态 detector 本轮只运行一次并返回 `[]`；它不覆盖运行时焦点、异步恢复、控制台和窄屏可扫读，因此降级为静态反模式筛查，最终判定以真实浏览器矩阵为准。 |

合并 S5 局部返工 P1 后，本轮总计 `P0=0 / P1=6 / P2=1 / P3=0`，终验 disposition=`fix`。已完整执行矩阵，没有在首个 P1 停止；规划应只派发上述同源微返工，既有通过项冻结。

### 8.3 Impeccable 五维复核

| 维度 | 评分 | 说明 |
| --- | ---: | --- |
| 视觉层级 | 8/10 | 标题、上下文、主操作和状态区清楚；成功/失败不只靠颜色。 |
| 信息架构 | 8/10 | 确认→同 ID 异步→详情→全局库完整，且全链唯一导航归属正确。 |
| 排版与密度 | 7/10 | 1440 成熟紧凑；1024 产品库列宽折行破坏扫读。 |
| 一致性 | 8/10 | AppShell、令牌、文件树、状态与恢复文案一致。 |
| 完成度/可访问性 | 5/10 | 焦点闭环、失败焦点、再次恢复和成功倒计时控制台仍有阻断。 |

### 8.4 新鲜证据与清理

证据根：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9`

- 完整矩阵：`fifo139-results.json`。
- 1440：`fifo139-s7-confirm-1440.png`、`fifo139-s7-success-1440.png`、`fifo139-s7-detail-1440.png`、`fifo139-s7-library-1440.png`。
- 1024：`fifo139-s7-library-1024.png`、`fifo139-s7-detail-1024.png`。
- 精确清理已完成：隔离库计数 `1→0`，43110–43113 监听 `0`，合成 MP4、编译覆盖、临时 loader/配置/脚本均删除；共享默认库存在计数仍为 `1`。只保留上述最小截图与 JSON。

## 9. FIFO 143 Rev 3 六场景微终验（2026-08-16）

本节只复验 FIFO 139 在 S7 侧失败的五个变化场景，并与 S5 合法返工组成规划指定的六场景微终验；§8 其余 49 项、完整浏览器矩阵与 Impeccable 保持冻结。

| 场景 | 正式 React + Fastify + 隔离 PostgreSQL 新鲜结果 |
| --- | --- |
| 生成确认焦点 | 稳定后真实序列“安全返回 → `Tab` 确认生成 → `Tab` 安全返回 → `Shift+Tab` 确认生成 → `Escape` 生成交付产品”；正反向闭环、触发点恢复通过，未重复激活生成命令。 |
| 未知后再次失败 | 同一 `deliveryId=8fb94652-7186-4e8b-89fc-16638c68819f` 恢复响应未知后，Worker 再次写入 `generation_failed`；人工查询重新出现且只出现一个“恢复本次生成”，焦点落在该动作。再次恢复仍为同一 ID，创建 POST 总数为 1。 |
| 直达失败焦点 | DOM 稳定后 `activeElement=BUTTON / 恢复本次生成`，不是 BODY；唯一恢复动作、失败原因和 requestId 均保留。 |
| 成功倒计时 | `deliveryId=91bcf9ec-2617-4831-a119-040cb96bd07b` 的成功标题初始获焦、取消动作可用；5 秒后自动进入同一 ID 详情，控制台 `error/warn=0/0`，未再出现 render-phase navigate。 |
| 1024 产品库 | 精确 `1024×768`、AppShell 72px；根 `clientWidth/scrollWidth=1024/1024`。`.tableWrap client/scroll=844/1196`、`overflow-x:auto`；表格 `min-width=1080px`、单元格 `white-space:nowrap`，横滚只在容器且列不逐字折行。 |

S7 差量结论：`P0=0 / P1=0`，FIFO 139 的五个 S7 P1 均关闭。联合 S5 的六场景结果为 `6/6`；P2 `IMPECCABLE-DEGRADED` 只是冻结的工具边界，本轮未重跑或改写。证据根为 `C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9`，最小证据为 `fifo143-results.json`、`fifo143-success.png`、`fifo143-library-1024.png`、`fifo143-s5-rework.png`。

隔离库 `qimao_ui_fifo143_01a00445` 已精确删除并确认残留 0；43120/43123 与临时运行目录已清理，默认库仍存在且共享 3001/43113 服务保持运行。UI 未修改生产 frontend/backend、迁移、contracts 或 DESIGN，未运行完整 `pnpm check`、完整矩阵或 Impeccable。
