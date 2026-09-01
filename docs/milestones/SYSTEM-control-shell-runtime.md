# SYSTEM-02 · ControlShell 真实运行总览纵向切片

状态：`done`（SYSTEM-02 前后端、正式 UI 与独立 TEST-SYSTEM-02 均已关闭）；不包含部署、真实 Cloudflare、付费 API、云资源或生产密钥。

## 1. 目标与成功标准

首个管理员站实现切片不是配置大而全，也不是把原型匿名数字搬进 React。目标是先贯通一条可重复验证的真实读取链：

`ASR / 画面字 / 交付 PostgreSQL 事实 → 独立管理 API 权限域 → ControlShell 系统总览`

成功必须同时满足：

1. 管理 API 从既有 PostgreSQL Job、Attempt、Usage、Delivery Attempt 与业务 Asset 元数据聚合真实运行事实。
2. 四个资源池固定为 `asr_api / ocr_api / ocr_self_hosted_worker / delivery_generation`，各池独立汇总，不能复用一个总并发或把 OCR API 与自建 Worker 混为一池。
3. 没有权威来源的预算、存储容量、服务器指标、当前生效配置和待发布配置明确返回 `not_configured / unknown / unavailable`，不由后端或浏览器填匿名默认值。
4. `/api/system-control/*` 使用独立授权边界；无控制台身份、员工身份或错误 audience 均拒绝。首切片只建立可注入、默认拒绝的本地可测边界，真实 Cloudflare JWT 验证留生产接入切片。
5. 正式前端只消费共享契约与管理 API，在独立 ControlShell 入口呈现真实 loading/empty/error/unknown/未启用状态；员工 AppShell 不出现控制台导航。

## 2. 唯一数据解释

### 2.1 四资源池

| 资源池 | 权威事实 | 首切片允许展示 |
| --- | --- | --- |
| ASR API | `asr_batches/jobs/attempts/usage` 及批次绑定的 provider/adapter/model/config digest | 排队、运行、终态、失败、需对账、最近吞吐、已记录用量；管理配置尚未接管时显示“未纳管” |
| OCR API | `screen_text_batches/jobs/attempts` 中 `execution_kind=cloud_api` 及持久 Usage | API 排队/运行/失败/需对账、提交帧与计费事实；未知费用不记零 |
| OCR 自建 Worker | `screen_text_*` 中 `execution_kind=self_hosted_worker` | 本地排队/运行/失败与已持久资源使用；没有主机遥测时 GPU/CPU 明确 unknown |
| 交付生成 | `delivery_products/jobs/attempts/events` | preparing/ready/generation_failed、运行/等待、最近吞吐和失败原因；不冒充外部上传状态 |

`deterministic_fake`、零网络 stub 和真实 provider 必须按持久化身份原样分组。总览可以显示“模拟/测试”，不能把 fake 记作真实云费用或生产部署健康。

### 2.2 总览指标

- 今日处理项目数：窗口内存在终态执行事实的去重项目数。
- 已处理集数：窗口内成功形成终态结果的集级 Job 数；复用结果不得重复计费或重复计数。
- 当前运行、排队、失败、需对账：来自各领域持久状态的只读汇总，状态映射必须在后端集中完成。
- 今日费用：只汇总已持久且已知的货币与金额；不同币种分组返回，不做前端汇率换算；存在 pending/unknown 时同时返回待对账数量。
- 存储：首切片可以返回业务 Asset 已知字节；对象存储总容量、剩余空间和实际桶用量没有适配器事实时为 unknown，不能把 Asset 字节冒充桶占用率。
- 趋势：最近 24 小时使用服务端固定时区窗口和稳定小时桶；缺失小时返回无事实标识，不补造曲线。

### 2.3 异常与诊断

异常摘要只读取最近失败、需对账或租约异常事实，返回领域、项目/任务稳定身份、时间、脱敏原因、requestId 和允许的员工详情深链。不得返回 objectKey、Secret、完整字幕、热词、提示词或供应商原始载荷。

## 3. 管理 API 与权限边界

首个共享读取契约为：

- `GET /api/system-control/overview?environment=development&window=24h`

响应至少包含 `generatedAt / freshness / overallStatus / resourcePools / metrics / trends / anomalies / pendingConfiguration / recentAudit`。`pendingConfiguration` 与 `recentAudit` 在配置生命周期尚未实现时返回明确空/未启用状态，不从业务事件拼出伪管理审计。

授权边界：

- 后端接收经验证的控制台主体投影，至少包含稳定 subject、audience 和 `system-control:read` 能力。
- 主体投影必须按每个 HTTP 请求解析并授权；应用实例级配置只能注入解析器或验证器，不能把某一个 owner 主体挂在整个 Fastify 实例上。
- 默认没有主体时拒绝，不允许因本地开发、同源请求或隐藏 URL 自动放行。
- 测试可注入确定性控制台主体；生产 Cloudflare JWT 签名、issuer、audience 和过期验证属于 `INT-13` 后继，不在本切片伪造外部认证。
- 管理 API 不复用员工项目路由，也不返回员工无权读取的跨项目正文。

运行总览每 5–10 秒刷新，读取实现必须在 PostgreSQL 侧按 24 小时窗口、当前非终态任务和有界异常集合聚合；不得在每次请求中把全部历史 Job/Attempt/Usage 读入 Node.js。费用继续使用 PostgreSQL `numeric` 或等价精确十进制路径，不能先转 JavaScript `Number` 再累计。

## 4. 切片与依赖

### BACK-SYSTEM-02A

实现共享只读契约、独立授权边界和 PostgreSQL 总览聚合。允许修改 `packages/contracts/src/system-control.ts` 与导出、`backend/src/modules/system-control/`、必要的 `backend/src/app.ts`/server 注入、`tests/backend/system-control.test.ts`。原则上不新增迁移；若现有表无法表达已持久事实，应先以 unknown 返回，不借本切片提前实现配置发布表。

最低验收：四资源池隔离、小时桶、费用/需对账、无数据/未知、异常脱敏、同一服务实例内逐请求默认拒绝/员工 audience 拒绝/控制台 read 主体通过、数据库侧有界 24 小时聚合、精确十进制费用、分页/时区边界和读取零写副作用。专项、直接依赖、contracts/backend 构建、check:repo 与 diff-check 通过。

### FRONT-SYSTEM-02B

依赖 BACK-SYSTEM-02A 规划验收后解锁。建立独立 ControlShell 构建/入口和系统总览，只消费真实 API；严格复现 `UI-SYSTEM-01 Rev 2` 的同状态、同视口层级。无配置、无服务器遥测或无预算时显示未纳管/未知/未启用，不隐藏区块、不填原型数值。

- 管理员站使用独立 `system-frontend/` Vite/React 工作区包、独立 `index.html`、路由、构建输出和本地开发端口；不得把 ControlShell 注册进员工 `frontend/src/App.tsx`、`modules.ts` 或 `AppShell`。允许为新包登记修改 `pnpm-workspace.yaml`、`pnpm-lock.yaml` 和必要根命令，但不复制员工页面或建立第二套业务状态。
- 本切片只让“系统总览”成为可操作生产页。九个一级导航保持确认的信息架构，其余八项以不可激活的“未启用”状态保留，不创建匿名详情页、假配置或空写命令；后继纵向切片逐项解锁。
- 总览必须映射 `GET /api/system-control/overview` 的真实字段，覆盖首次 loading、empty、稳定 error + requestId + 唯一重读、重读中、再次失败、恢复成功、unknown/not_configured、费用待对账、自动刷新关闭和最后成功摘要 stale。自动刷新只重复 GET；失败保留最后成功数据并标记过期，不制造第二状态源。
- 正式代码不得添加本地 owner header、隐藏 URL 或同源放行。浏览器验收可以在仓库外/测试夹具中使用后端已支持的注入式请求主体解析器，但生产管理站只发普通同源请求，真实 Access 身份仍由后继部署层提供。
- 顶部身份、预算、配置版本、服务器遥测和对象存储容量没有权威字段时使用中性“访问层已验证 / 未纳管 / 未配置 / 未知”，不得硬编码 owner 邮箱、版本、金额、百分比或原型曲线。异常详情只展示契约允许的脱敏身份与 requestId；没有权威员工站深链时不得猜 URL。
- 允许目录：新增 `system-frontend/`、对应 `tests/frontend/system-control*.test.tsx`、必要 `pnpm-workspace.yaml`/`pnpm-lock.yaml`/根脚本、README 运行说明及状态/日志。禁止修改生产 `frontend/src/`、backend、迁移、共享契约、DESIGN 或 UI 验收语义。

### TEST-SYSTEM-02

依赖前端 UI 终验后解锁。使用隔离 PostgreSQL 建立四类匿名事实，验证员工身份无法访问管理 API、控制台身份可读取、A/B 项目隔离不泄露正文、刷新恢复、24 小时趋势、费用待对账和 1440/1024 正式页面。

## 5. 明确非目标

- 不创建或发布引擎/路由/并发/预算配置，不暂停 Worker，不执行回滚。
- 不接真实 Cloudflare、域名、Tunnel、服务器、对象存储监控或厂商密钥。
- 不接真实 ASR/OCR，不产生付费请求，不购买或部署云资源。
- 不把员工业务事件复制成第二套控制台状态，不建立分析库、微服务、消息总线或第二数据库。
- 不实现策略学习、预算修改、密钥轮换、外部总库和服务器裸命令。

## 6. 衔接与关闭门

- 职责矩阵：`系统控制台 / 运行总览与诊断` 行。
- `INT-12`：Attempt/Usage/运行环境到控制台的只读聚合。
- `INT-13`：两站权限域；本切片只完成本地可测的默认拒绝边界，真实 Access JWT 留生产接入。
- 后继 `INT-11`：配置发布与 Worker 新任务绑定；只有本切片总览关闭后才能进入，不能与只读总览混写。
