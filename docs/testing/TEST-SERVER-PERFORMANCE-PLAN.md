# 测试服务器容量与故障测试计划

状态：测试资产冻结，默认零网络 fake；本阶段不购买、不部署、不接真实供应商、Secret、付费 API、COS、Sentry 或云资源。

## 1. 目的与边界

本计划为专用测试服务器准备可复现的容量、长稳和故障注入资产。运行对象只能是本机 fake 或明确 allowlist 的专用测试服务器；不得指向公网、生产域名、员工业务入口或真实供应商。测试数据是代码内匿名小夹具，所有费用固定为 `CNY 0.00`。

服务器部署、容量监控、压测、峰值、长稳、故障注入、报告和停止控制只属于管理员 `system-frontend/ControlShell`。员工 `frontend/AppShell` 不新增入口、按钮、状态、脚本、路由或测试文案。若未来需要页面，只能复用管理员 `/servers`、`/logs` 或另经 UI 设计批准的管理员测试容量入口，不建立员工页面或第二状态源。

## 2. 资产与依赖

| 路径 | 用途 | 依赖 |
| --- | --- | --- |
| `tests/performance/performance-types.ts` | 场景、操作、故障、指标和报告类型 | Node 类型 |
| `tests/performance/performance-fake-server.ts` | 本机 loopback 内存 HTTP fake、A/B 隔离、幂等和故障状态 | Node `http`/`crypto` |
| `tests/performance/performance-harness.ts` | 场景调度、分操作计量、资源采样、白名单和脱敏输出 | Node `fetch`/`perf_hooks`/`os` |
| `tests/performance/README.md` | 用法、目标契约和安全限制 | 无 |

不新增 npm/pnpm 依赖，不读取真实原始素材，不启动员工前端。专用服务器若要被测，需自行提供测试专用 `/api/perf/*` 契约；脚本不把生产业务 API 当作兼容目标，也不通过代理剥离权限、幂等或项目字段。

## 3. 统一请求与数据事实

每个写请求都携带匿名 `projectId`、稳定 `resourceId`、稳定 `Idempotency-Key` 和固定小 body。fake 持有唯一操作记录、项目归属、队列状态和计数器；不创建 PostgreSQL 业务状态，不接对象存储。`upload` 仅发送代码内短字符串字节，不发送视频、音频、字幕、术语或任何用户资料。

- `read`：只读查询，按项目范围返回。
- `write`：业务写入模拟，重复同键同参返回 replay；同键异参/资源身份冲突返回 409。
- `upload`：小型匿名字节计量，不代表真实媒体吞吐或对象存储性能。
- `task`：创建排队任务，交由 `worker` 消费；Dispatch、ASR/OCR 等真实领域状态不被 fake 冒充。
- `worker`：一次消费一个任务，记录队列、运行和完成计数。
- `GET /api/perf/operations/:resourceId?projectId=...`：只用于 unknown/超时后的同一身份恢复，禁止扫描列表、换 ID 或自动重发 POST。

每阶段分别输出上述五类操作的 count、错误率、p50/p95/p99/max、请求/响应字节、错误码、requestId、资源身份和恢复 GET 数；禁止用单一刷新 RPS 代替容量结论。

## 4. 场景矩阵

| 场景 | 设置 | 验收重点 |
| --- | --- | --- |
| 部署烟雾 | `/health`、`/metrics`、五类操作各一次 | 服务可达、返回 requestId、CNY=0、匿名数据可回收 |
| 单用户基准 | 并发 1，默认 20 次，可用 `--iterations` 调整 | 记录每操作基线和资源采样，不承诺 SLA |
| 阶梯 | 并发 1/5/10/20，各阶段独立批次 | p50/p95/p99、错误率、队列、PG/Worker 指标与重复写 |
| 短峰值 | 5–20 并发短批次 | 峰值期间读、写、上传、任务、Worker 分开计量；根页面指标不冒充容量 |
| 长稳 | `--duration 1h` 至 `4h`，小批次循环 | 内存/句柄增长、队列积压、错误率漂移、重复事实、A/B 污染；中途失败保留首个根因 |
| 数据库短断 | fake `database_disconnect` | 稳定 503/requestId/retryable；恢复后同一读取可用；未知只 GET |
| Worker 退出 | fake `worker_exit` | 队列保持、无第二任务；恢复后仅消费既有任务 |
| 429/5xx | fake `rate_limit`/`server_error` | 不自动新增付费/写 POST；记录 retryable 和人工恢复路径 |
| 超时/响应丢失 | fake `timeout`/`response_lost` | unknown/reconciliation 只 GET 同资源身份，POST 计数恒为 1 |

故障控制只在本地 fake 直接可用；专用服务器必须通过管理员测试入口显式开放等价控制。员工站不得看到或触发这些控制。

## 5. 资源与数据库指标

每个阶段开始和结束采集 Node 进程 CPU 百分比（以进程 CPU 时间/墙钟/CPU 核数计算）、RSS、heap、进程文件读写。swap、网卡流量、宿主磁盘 I/O 若没有受控服务器采集接口保持 `null`；禁止用 `0` 伪造“无使用”。

测试服务器 `/metrics` 应同时返回：

- PostgreSQL 活跃连接、锁等待/锁数、慢查询计数；
- Worker active、队列深度、完成/失败任务；
- 重复写尝试、实际存储事实数、第二任务、跨项目访问违规；重复写尝试可包含预期 replay/409，必须用事实数核对没有第二事实；
- 必要的 requestId、时间戳和数据新鲜度。

指标必须能按阶段和操作类型归属；只读 API、业务写入、文件上传、任务创建、Worker 消费不得合并为一个 RPS。若 PG/系统指标缺失，报告中写 `unknown/not_configured` 及缺失来源，不把应用响应时间推导成数据库健康。

## 6. 停止门与恢复规则

任一阶段立即停止并保留首个可观察请求、requestId、资源身份和原始脱敏响应：

1. 跨项目读取成功、权限越权或敏感信息泄露；
2. 重复任务/重复写/第二状态源，或同一身份出现第二个 POST；
3. 费用非 `CNY 0.00`、出现真实供应商/Secret/外部网络/云资源调用；
4. 数据库/Worker 故障导致事实丢失、队列负数或恢复后重复消费；
5. 任何脚本试图绕过 `--allow-target`、访问公网/生产或把控制暴露到员工站；
6. 长稳阶段出现无法解释的持续错误、内存单调增长、连接/锁泄漏或宿主资源耗尽。

unknown、超时和响应丢失只能用同一 `resourceId` 的 GET 恢复；不得自动重发 POST、换 ID、扫描列表猜测或把 pending 当成功。确定 409 清除旧意图，下一次显式动作才可使用新 ID/body/key。停止后关闭本轮 fake/HTTP 连接，删除本轮临时进程/目录；不得清理共享 PostgreSQL、员工数据或其他任务服务。

## 7. 运行命令与证据

先做不产生副作用的本地校验：

```powershell
node node_modules/tsx/dist/cli.mjs tests/performance/performance-harness.ts --dry-run --scenario smoke
node node_modules/tsx/dist/cli.mjs tests/performance/performance-harness.ts --dry-run --scenario step --duration 30s
```

本地 fake：

```powershell
node node_modules/tsx/dist/cli.mjs tests/performance/performance-harness.ts --scenario smoke --json
node node_modules/tsx/dist/cli.mjs tests/performance/performance-harness.ts --scenario step --iterations 100 --json
node node_modules/tsx/dist/cli.mjs tests/performance/performance-harness.ts --scenario faults --timeout 100ms --json
node node_modules/tsx/dist/cli.mjs tests/performance/performance-harness.ts --scenario soak --duration 1h --concurrency 5 --json
```

专用服务器必须显式 allowlist：

```powershell
node node_modules/tsx/dist/cli.mjs tests/performance/performance-harness.ts `
  --target http://10.0.0.25:3900 `
  --allow-target http://10.0.0.25:3900 `
  --scenario step --json
```

报告应保存于仓库外脱敏目录，至少包含场景、阶段、操作分类、p50/p95/p99、资源与 PG 指标、requestId/资源身份、错误首因、恢复 GET 和清理事实。禁止保存请求/响应 body、用户资料、原始日志、Cookie/Auth、Secret、objectKey、连接串或屏幕录像。若需要页面证据，仅由管理员 system-frontend `/servers`、`/logs` 或已批准管理员测试容量入口产生；本资产不自动截图。

## 8. 当前限制与交付判断

本资产是零网络 fake/stub 和可白名单化的测试服务器客户端，不是生产容量承诺、真实厂商识别准确率、真实对象存储吞吐或真实 PostgreSQL 规模结论。只有在用户另行授权专用服务器、管理员监控、数据留存和脱敏规则后，才可以执行非 fake 目标；仍不得接入真实供应商、Secret、付费 API、COS、Sentry 或云资源。
