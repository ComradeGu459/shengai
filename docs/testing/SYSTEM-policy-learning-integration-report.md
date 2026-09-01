# SYSTEM-07B Wave B 全链集成验收报告

## 任务与边界

- 任务：TEST-SYSTEM-07B Rev1 / FIFO231
- handoffToken：`FIFO231-TEST-SYSTEM-07B-R1-V4.601`
- 验收角色：全链测试与质量验收对话
- 范围：正式 Fastify、正式 `system-frontend/dist`、精确隔离 PostgreSQL、零网络策略 Worker、系统 Chrome；不接真实 AI/Secret/网络/付费/云资源。
- 生产代码改动：0。临时 harness 仅用于本轮，已删除；共享 PostgreSQL `127.0.0.1:55432` 保持运行。
- 数据：仅使用匿名 A/B 项目、脱敏策略事件与固定零网络夹具；无真实台词、视频帧、Secret 或业务名称进入仓库。

## 环境与执行

- 隔离数据库从零执行 34 个 migration；数据库名为随机匿名 `qimao_fifo231_strategy_<pid>_<nonce>`，测试结束由 harness `finally` 精确 DROP。
- API 端口 `32160`、静态/代理端口 `32161`；结束后无监听者。
- 浏览器：`C:\Program Files\Google\Chrome\Application\chrome.exe`，Playwright 既有运行时，headless，1440×900 与 1024×768。
- 首次受限上下文执行同一命令 `node node_modules/tsx/dist/cli.mjs tests/integration/fifo231-system-07b-harness.ts` 原样失败：`uv_os_get_passwd returned ENOMEM (not enough memory)`，未越过数据库/服务副作用。按规划边界在正常 Windows 用户上下文以同一命令、同一 harness、同一共享 PostgreSQL 重跑，最终通过。

## 结果摘要

| 门 | 结果 | 证据 |
| --- | --- | --- |
| 逐请求权限 | 通过 | anonymous/employee/missing capability=403；reader=200；write-only 读取=403；reader 创建=403；owner 创建=202（A/B） |
| A/B 隔离 | 通过 | 两项目各自 run 与 candidate 的 `projectId/runId` 归属保持一致，无串项目 |
| 零网络 Worker | 通过 | A/B 优化运行均由受控 Worker 完成；未建立外部连接 |
| 幂等/冲突 | 通过 | 相同幂等键相同请求重放保持单一事实；同键不同请求稳定 409 |
| unknown 恢复 | 通过 | 过期租约得到 `unknown`；同一 runId 只 GET，POST 计数=1 |
| 候选审查链 | 通过 | Chrome 首视口完成编辑→结构化驳回→恢复→送入离线评测；离线评测以固定身份创建并由 Worker 完成 |
| Wave C | 通过 | “批准与发布” tab disabled；`?tab=release` 显示“Wave C 尚未启用” |
| 员工站隔离 | 通过 | `frontend/src/App.tsx` 与 `frontend/src/modules.ts` 中管理入口/策略 API 匹配数=0；system-frontend build 40 modules |
| 错误恢复 | 通过 | 受控 GET 返回 503、`requestId=fifo231-read-failure`、`retryable=true`；唯一重读后恢复 |
| 质量等级 | 通过 | P0=0，P1=0，P2=0，P3=0；无 QA-SYSTEM-07B-* |

## 正式页面测量

- 1440×900：根 `scrollWidth=1440`、`clientWidth=1440`；策略表容器 `scrollWidth=1148`、`clientWidth=1148`；console error/warn=0/0。
- 1024×768：根 `scrollWidth=1024`、`clientWidth=1024`；策略表容器 `scrollWidth=1040`、`clientWidth=876`，溢出限定在容器内；console error/warn=0/0。
- 两视口均验证新建运行弹窗初始焦点为关闭控件、Escape 关闭并回到触发入口；加载/空态/失败/重读、候选详情和评测列表均从正式 API 读取。

## 验证命令

- `node node_modules/vitest/vitest.mjs run tests/backend/system-control-strategy.test.ts tests/backend/system-control-strategy-optimization.test.ts tests/frontend/system-control-strategy.test.tsx --reporter=verbose`：3 files / 20 tests passed。
- `node node_modules/typescript/bin/tsc -p backend/tsconfig.build.json`：通过。
- `node node_modules/typescript/bin/tsc -p system-frontend/tsconfig.json --noEmit`：通过。
- `node node_modules/vite/bin/vite.js build`（system-frontend）：通过，40 modules。
- `node node_modules/tsx/dist/cli.mjs tests/integration/fifo231-system-07b-harness.ts`（正常 Windows 用户上下文）：通过，输出 `ok=true`；临时 harness 已精确删除。

## 清理与交接

- 隔离数据库已 DROP；临时 API/静态端口无监听；测试 Chrome、Fastify、静态代理均已关闭；临时 harness 已删除。
- 共享 PostgreSQL 55432 未重启、未停止、未写入业务库；无真实素材触碰。
- 本报告、CURRENT 与开发日志先写回；随后只向规划固定任务交接，按 INT-14 与职责矩阵“系统控制台策略与学习”行执行。
