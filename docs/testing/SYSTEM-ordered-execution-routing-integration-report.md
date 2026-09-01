# SYSTEM-09 TEST-SYSTEM-09 Rev1 全链集成报告

## 任务与边界

- handoffToken：`FIFO309-TEST-SYSTEM-09-R1-V4.839`
- 权限指纹：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`
- 只允许测试报告、状态/日志和仓库外脱敏证据；生产 `frontend/`、`system-frontend/`、`backend/`、`packages/contracts/`、迁移与 `DESIGN.md` 修改为 0。
- 不接真实供应商、AI、Secret、外部网络、付费、COS、Sentry 或部署；ASR/OCR 仅使用零网络 fake/stub。原始素材未读取。

## 正式环境与隔离

- 使用正式 Fastify `createApp`、employee/system-frontend production build、Playwright 既有运行时与系统 Chrome。
- 使用 `127.0.0.1:55432` 作为本地 PostgreSQL 管理连接；本轮业务只在临时隔离数据库执行，当前迁移文件精确 `37/37`，`schema_migrations=37`，业务 bootstrap（projects、routing policy、engine deployments、ASR/ScreenText jobs）均为 0。
- 纵向 harness 完成后已 DROP 隔离库、停止 3311/3320/3330 临时服务、删除 harness；共享 PostgreSQL 55432 保持运行。脱敏证据：`C:\Users\ComradeGu\Documents\七猫兼职\qa-evidence-fifo309\summary.json`。

## 已完成验证

| 范围 | 新鲜结果 | 说明 |
| --- | ---: | --- |
| 有序 routing 专项 | 7/7 | route target 顺序、角色、权限、发布/恢复与唯一身份覆盖 |
| 本地 OCR sidecar 专项 | 11/11 | 严格请求/响应、真实帧摘要/尺寸/时长、超时/Abort/unknown、fail-closed 并发与零网络 |
| operations 专项 | 8/8 | routeDigest/target/priority/deployment/effect、Attempt 链、AdvanceEvent、历史 null、读取零写 |
| 六文件恢复专项 | 5 files passed，29/31 | `system-control-engine` 两项使用共享默认库，见环境事实 |
| 前端 system-control 专项 | 82/83；聚焦失败项定向复验 1/1 | unknown create 仅 GET 同一身份与恢复焦点；并发文件编排出现一次焦点时序波动，定向复验通过 |
| 正式双站浏览器纵向 | API 与页面通过 | 37/37 隔离迁移；匿名/employee 403，合法 system-control 200；routing/changes/logs 与员工根页在 1440×900、1024×768 根无横溢，console error/warn=0/0、pageerror=0 |
| typecheck/build | 通过 | contracts/backend/frontend/system-frontend typecheck；backend build；employee build 195 modules；system-frontend build 45 modules |
| check:repo/diff-check | 通过 | 仅既有 LOCAL_APP_PARITY CRLF 提示，无新增 diff-check 错误 |

## 保留的环境/夹具事实

1. 旧 `asr.test.ts`、`screen-text.test.ts` 直接写入 `routing_policy_pools` 时不提供当前37项迁移要求的 `max_concurrent_jobs`，在新 schema 下稳定触发 NOT NULL；这是测试夹具未同步，不归因生产产品。
2. 六文件首轮因共享 PostgreSQL 自身 Windows `autovacuum worker ... 0xC0000142` 异常退出，出现 `ECONNREFUSED 127.0.0.1:55432`；清理确认无 postgres 进程的 stale `postmaster.pid` 后按原运行态恢复。恢复后唯一剩余两项来自共享默认库旧 schema 缺少 `routing_advance_events`；未迁移、清理或写入共享默认业务库，按规划安全裁决保留原始事实。
3. 前端六文件合跑有一次未知策略资产恢复焦点落 BODY；同一测试定向复验 `1/1` 通过，归为测试编排时序波动，不登记 QA 产品缺陷。

## P0–P3 与关闭门

- 当前产品矩阵观察：P0=0、P1=0、P2=0、P3=0；未形成 `QA-SYSTEM-09-*` 产品缺陷包。
- 本报告不替代最后完整关闭门。完整 `pnpm check` 必须绑定本轮独立数据库并从零执行当前37迁移，绝不迁移或清理共享默认库；该门结果将在本报告追加。

## 唯一完整 `pnpm check` 关闭门

- 命令：`DATABASE_URL=<本轮隔离 qimao_system09_check_*> pnpm check`；根脚本安全读取 `DATABASE_URL`，`db:setup` 只确认本地实例存在，backend migrate 输出 `No migrations to run!`，未迁移共享默认数据库。
- 退出码：`1`。`check:repo`、四工作区 lint/typecheck 均通过；测试断言 `447 passed`，测试文件 `44 passed`，仅 `tests/backend/pre-review.test.ts` 与 `tests/backend/system-control-operations.test.ts` 的 `afterAll` 精确隔离库清理 hook 各因默认10秒超时而被 Vitest 记为失败。没有产品断言失败、P0/P1/P2/P3 仍为 `0/0/0/0`；不重试、不提高 timeout、不覆盖原始日志。
- 原始完整门日志：`C:\Users\ComradeGu\Documents\七猫兼职\qa-evidence-fifo309\full-pnpm-check.log`；隔离数据库已 DROP 并核对不存在，`qimao_system09_*` 残留为 0，共享 PostgreSQL 55432 保持运行。

## TEST-SYSTEM-09 Rev2｜FIFO311 唯一完整门复验

- handoffToken：`FIFO311-TEST-SYSTEM-09-R2-V4.847`；冻结 Rev1 全部产品、浏览器、专项与 P0–P3=0 证据，不重复业务矩阵。
- 前置 `check:repo` 与 `git diff --check` 通过（仅既有 `LOCAL_APP_PARITY` CRLF 提示）。本轮创建精确隔离数据库 `qimao_system09_r2_20260820153222`，从零执行当前迁移 `37/37`，`schema_migrations=37`、`projects=0`；未迁移、清理或写入共享默认库。
- 本轮唯一完整命令：`DATABASE_URL=postgresql://postgres@127.0.0.1:55432/qimao_system09_r2_20260820153222 pnpm check`。退出码 `0`；`check:repo`、四工作区 lint/typecheck、迁移检查通过；Vitest `46 files passed`、`447 tests passed`；contracts/backend/frontend/system-frontend 构建全部通过（system-frontend 45 modules、employee frontend 195 modules）。未重试、未跳过、未并行。
- 精确清理：隔离数据库 DROP 成功，`qimao_system09_r2_*` 与全部 `qimao_system09_*` 残留均为 0；本轮监听端口、pnpm/vitest 进程均为 0；共享 PostgreSQL 55432 仍运行。原始日志与脱敏证据：`C:\Users\ComradeGu\Documents\七猫兼职\qa-evidence-fifo311\full-pnpm-check.log`、`db-drop.log`、`cleanup-verification.log`、`bootstrap.log`。
- Rev2 关闭门结果：`P0/P1/P2/P3=0/0/0/0`，无 `QA-SYSTEM-09-*`；生产 frontend/system-frontend/backend/contracts/migrations/tests/DESIGN 修改为 0。
