# 零网络性能测试资产

本目录只包含测试服务器使用的 fake/stub 资产，不是员工功能，也不向 `frontend/AppShell` 增加入口、按钮、状态、脚本或测试文案。容量、故障、峰值、长稳和停止控制只属于管理员 `system-frontend/ControlShell` 的既有 `/servers`、`/logs` 或后续经设计批准的管理员测试容量入口。

## 默认安全运行

```powershell
node node_modules/tsx/dist/cli.mjs tests/performance/performance-harness.ts --dry-run --scenario step
node node_modules/tsx/dist/cli.mjs tests/performance/performance-harness.ts --scenario smoke
node node_modules/tsx/dist/cli.mjs tests/performance/performance-harness.ts --scenario faults --timeout 100ms
```

默认 `--target fake` 只在本机启动一次临时内存 HTTP fake，使用匿名 `perf-a/perf-b` 小夹具，成本固定为 `CNY 0.00`。`--dry-run` 不启动服务、数据库、浏览器或网络。

## 专用测试服务器

HTTP 目标必须同时提供完全相同的 `--target` 与 `--allow-target`，并只实现测试专用的以下契约：

- `GET /health`、`GET /metrics`；
- `GET /api/perf/read?projectId=...`；
- `POST /api/perf/write|upload|task|worker`；
- `GET /api/perf/operations/:resourceId?projectId=...`，只用于未知结果的同身份读取恢复。

示例：

```powershell
node node_modules/tsx/dist/cli.mjs tests/performance/performance-harness.ts `
  --target http://10.0.0.25:3900 `
  --allow-target http://10.0.0.25:3900 `
  --scenario step --json
```

脚本不会自动允许公网、生产域名、员工业务入口或真实供应商 API；禁止通过代理、改 Host 或删掉 allowlist 绕过。故障控制只在本地 fake 可用；专用服务器若要注入故障，必须由管理员测试入口显式提供等价受控能力，不能暴露给员工站。

## 场景

| 场景 | 默认行为 |
| --- | --- |
| `smoke` | 部署 `/health`、幂等、A/B 隔离、unknown 同身份 GET 恢复和五类操作各一次 |
| `baseline` | 单用户顺序基准；`--iterations` 控制请求数 |
| `step` | 固定阶梯 1/5/10/20 并发，每阶段分别统计 |
| `spike` | 短时峰值，最多 20 并发；不把刷新 RPS 当系统容量 |
| `soak` | `--duration 1h` 至 `4h`，按小批次持续采样 |
| `faults` | fake 的数据库短断、Worker 退出、429、5xx、超时、响应丢失；未知结果只 GET，不重发 POST |

每个阶段独立计量 `read`、`write`、`upload`、`task`、`worker`，输出各自 count、错误率、p50/p95/p99/max、字节量、requestId、资源 ID 和恢复 GET 计数。任务写入带稳定资源 ID、Idempotency-Key 和匿名项目；同键同参重放不增事实，同键异参/资源身份冲突为 409，跨项目读取为 404。

## 指标与限制

- 进程 CPU、RSS、heap、进程文件读写来自 Node 原生采样；swap、网卡和真实磁盘 I/O 不能从 Node 单进程可靠推导，缺失为 `null`。
- `/metrics` 可提供队列深度、Worker、PG 连接、PG 锁、慢查询、完成/失败任务、重复写尝试、实际存储事实数和跨项目违规计数；缺失或不可读不得推算为 0。重复写尝试包含 smoke 的预期 replay/409，是否产生第二事实以 `storedFacts` 核对。
- 结果不含真实素材、字幕、术语、供应商载荷、Secret、对象键、Cookie、连接串或业务名称；所有费用恒为 `0.00 CNY`，不能代表真实供应商价格、网络延迟或生产 SLA。
- 本资产不启动员工前端，不向员工 AppShell 暴露压测控制。真实管理员页面证据只能引用 `/servers`、`/logs` 或未来经 UI 设计批准的管理员测试容量入口。
