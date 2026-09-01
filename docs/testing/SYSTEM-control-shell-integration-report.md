# TEST-SYSTEM-02 Rev 1 独立集成验收报告

日期：2026-08-16　
任务：FIFO 165 / `TEST-SYSTEM-02 Rev 1`

## 结论

本轮在精确隔离 PostgreSQL、正式 Fastify 与正式 `system-frontend` production build 上完成纵向集成验收。P0/P1/P2/P3 均为 0，未形成 QA-SYSTEM-02 缺陷包；四资源池、权限边界、24 小时聚合、费用语义、A/B 匿名事实隔离、两站边界、刷新失败/恢复和 1440/1024 基本页面集成均通过。

本轮未接真实 JWT、外部网络、供应商、密钥、付费、云资源或部署；Bearer/cookie 主体只在本地测试 resolver 中映射为匿名测试身份，不使用测试 header 自动放行。既有 FIFO 160/164 的完整 UI、键盘、乱序、31.2 秒自动刷新与 57P01 进程韧性矩阵按冻结证据引用，未重复执行。

## 环境与边界

- 隔离数据库：`qimao_test_system_02_20260816`，迁移后仅写入两个匿名项目 A/B 及四类有界事实；不连接共享默认业务库。
- 正式服务端口：Fastify `31620`、system-frontend 静态 build `31621`；两端均为本轮临时进程。
- 生产代码、迁移、`packages/contracts`、DESIGN、员工站源码均未修改；员工站只做静态隔离扫描。
- 证据只包含匿名 UUID、计数、状态、金额与布局指标，不包含字幕正文、视频帧、objectKey、Secret、连接串或文件字节。

## 集成矩阵

### 权限与入口

同一正式 Fastify 逐请求验证：匿名 `403`、employee audience `403`、缺少 `system-control:read` `403`；`system-control` audience + read capability `200`。未使用全局 owner、隐藏 URL、本地来源或测试 header。

### 四资源池与聚合语义

- 资源池 ID 精确为 `asr_api`、`ocr_api`、`ocr_self_hosted_worker`、`delivery_generation`。
- throughput、queueDepth、cost 均为 24 个 UTC 小时桶，桶间隔 3,600,000 ms；默认窗口请求同样 `200`。
- A/B 均有 ASR 对账中、OCR API 已完成、OCR 自建 Worker 排队、交付生成 ready/preparing 等当前事实；配置与审计状态为 `not_configured`，不补零。
- 异常返回上限 50 条并按发生时间稳定降序；48 小时旧终态不进入当前窗口。请求 ID 为稳定不透明值，响应不含项目名、热词、提示词、字幕正文、私有路径或 Secret。
- 费用按币种精确聚合：CNY `estimatedAmount=finalAmount=0.300000`；USD `estimatedAmount=2.560000`、`pendingCount=2`、`finalAmount=null`，未把 pending/unknown 当成 0。

### 两站与身份/数据隔离

管理响应只投影允许的聚合、匿名 UUID 和不透明 requestId；A/B 的敏感正文和原始身份未泄露。员工站 `frontend/src/App.tsx` 与 `frontend/src/modules.ts` 中 `ControlShell`、`system-control`、管理员入口扫描命中为 0。

### 刷新失败与恢复

仅对隔离库执行可恢复的表重命名故障注入。真实 HTTP GET 返回 `500`，响应含 `INTERNAL_ERROR`、`requestId`、`retryable=true`、`action=retry`；页面出现 stale/“数据已过期”和唯一“重新读取”。恢复表名后点击唯一重读，同一 app 再次返回 `200`，stale 清除，页面回到“系统总览”。未重复 FIFO 164 的强制断连矩阵。

### 页面基本集成

- 1440×900：根 `scrollWidth=clientWidth=1425`（15px 为滚动条沟槽），侧栏 216px，三张趋势图。
- 1024×768：根 `scrollWidth=clientWidth=1009`，收起侧栏 72px，单主图与 3 个趋势 tab；吞吐→积压→费用切换均保持单图且无额外 GET。
- 1024 展开覆盖：侧栏 216px，主区宽 937px，根布局仍 1009/1009，无横向溢出或主区挤压。

## 新鲜验证与清理

- system-frontend Vite production build：20 modules，退出码 0。
- 既有后端 system-control 专项：5/5 通过（本轮未重复完整 `pnpm check`）。
- 任务服务已停止；`31620/31621` 无监听（仅残留正常 TIME_WAIT）。
- 隔离数据库已精确 `DROP DATABASE ... WITH (FORCE)`，复查同名数据库计数为 0；临时 harness/shim 已删除。共享 PostgreSQL 实例保持原状态，未停止或改写共享默认库。

仓库外脱敏证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a0065d-ce1c-7f11-94d8-56b91f062cf8\system-control-02-integration\system-test-results.json`、`page-integration-results.json`。
