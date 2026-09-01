# SYSTEM-07C 全链纵向集成验收报告

## 任务与权限

- 任务：`TEST-SYSTEM-07C Rev1` / FIFO250
- handoffToken：`FIFO250-TEST-SYSTEM-07C-R1-V4.669`
- repo_root：`C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`
- permission_profile：`workspace-write/:workspace`
- ordinary_writes：`direct`
- 本轮生产 `frontend`、`system-frontend`、`backend`、`packages/contracts`、迁移与 DESIGN 修改：`0`

## 环境与边界

使用正式 Fastify、system-frontend production build、从零创建的隔离 PostgreSQL 与零网络 strategy runtime Worker；测试服务使用本轮临时端口 32250/32251，浏览器使用系统 Chrome + Playwright。只建立匿名夹具项目与策略事实，不接真实 AI、供应商、Secret、网络、付费或云资源，不触碰共享 PostgreSQL 55432 与员工业务数据。

首次在受限执行器运行既有 TypeScript harness 时，首个可观察失败为 `uv_os_get_passwd returned ENOMEM (not enough memory)`，发生在数据库/服务启动前，无业务副作用。按边界将完全相同的 `node node_modules/tsx/dist/cli.mjs tests/integration/fifo250-system-07c-harness.ts` 放入获准的正常 Windows 用户上下文后成功完成；未使用 tsc 编译、纯 Node dist、loader/shim、fallback 或第二工具链。

## 纵向矩阵结果

正式 harness 共记录 35 项检查，全部 `ok=true`：

1. 空库业务 bootstrap 为 0；匿名、employee 及缺 capability 逐请求 403，精确 `strategy:read` 主体 200。
2. `system_baseline` 预览严格包含 `pre_review_local_rule_pack_v1` 七字段；导入 201、同身份重放 200 且命令唯一；受保护 baseline 更新/删除均稳定拒绝。
3. 无 active 时前置审改新会话稳定 409，session 副作用为 0；active 建立后新旧会话分别固定对应的 baseline/custom `strategyVersionId`，旧会话事实不被新版本改写。策略 runtime 专项同时覆盖零网络 Worker 成功、固定 snapshot 与 bound-version 读取。
4. impact 创建、Worker 完成、人工 approval、首次 publish、第二版本 publish 与唯一 active pointer 均成立；retired 版本 publish 稳定冲突且旧 active 保持不变。
5. rollback unknown 返回 503、`retryable=true` 与稳定 `releaseCommandId`；恢复只对同一命令 GET，成功后唯一 active 恢复，无第二 POST。相同身份不同 body 返回确定冲突并保持零第二状态。
6. 历史服务端分页返回正确 total/items；异步身份、幂等键、requestId 与确定冲突均按同一身份约束。
7. 正式 system-frontend 在 1440×900 与 1024×768：根 `scrollWidth/clientWidth` 分别为 `1440/1440`、`1024/1024`；宽表在容器内滚动（1024 下 `1040/876`）；比较数值 token 均 `nowrap`；Drawer 初焦点为 `strategy-runtime-drawer-title`，rollback 恢复按钮可达；应用 `console.error/warn=0/0`。

专项回归：策略后端/前端 4 文件、34 项测试全通过；backend build、system-frontend typecheck、Vite production build（42 modules）、`check:repo` 与 `git diff --check` 通过。

## 完整关闭门结果

本切片唯一完整 `pnpm check` 已真实运行至结束，未跳过或重试：`40` 个测试文件、`377` 项中 `38` 个文件/`375` 项通过，`2` 项既有测试套件差量失败：

- `QA-SYSTEM-07C-CHECK-001`（非产品）：`tests/backend/pre-review.test.ts` 的 `afterAll` 在全量并发环境 10 秒 hook 超时；该文件已在本轮隔离专项中独立 7/7 通过。
- `QA-SYSTEM-07C-CHECK-002`（非产品）：`ScreenTextWorkspace` stale 用例在全量运行中因候选异步夹具尚未呈现而找不到 checkbox；随后单文件新鲜复跑 14/14 通过，符合既有套件瞬时污染/时序差量，不归因本切片产品链。

因此本切片产品矩阵缺陷计数为 `P0/P1/P2/P3=0/0/0/0`，但完整关闭门保留上述 2 项测试差量，交规划统一决定是否纳入后续测试夹具清理；没有生成生产返工包。

## 清理与证据

- 隔离数据库 `qimao_fifo250_30136_94183d61` 已精确 DROP；早期受限启动残留隔离库亦已精确清理。
- 32250/32251 无监听；本轮 Fastify/static 服务、Worker、Playwright Chrome 均已停止/关闭；临时 harness 已删除。
- 共享 PostgreSQL 55432 保持原状态，原始素材未访问/修改。
- 脱敏证据：`C:\Users\ComradeGu\Documents\七猫兼职\qa-evidence-fifo250\summary.json` 与 `fifo250-system-07c-1024-history.png`。仓库未写入真实台词、视频帧、业务名称或文件字节。

结论：SYSTEM-07C 纵向产品矩阵通过，等待规划复核上述完整门差量后关闭；本角色不直接通知 UI、前端或后端。

## Rev2 测试健康关闭门（FIFO253）

- handoffToken：`FIFO253-TEST-SYSTEM-07C-R2-V4.677`
- 唯一新鲜完整命令：`pnpm check`，退出码 `0`；未重试、未跳过、未并行启动浏览器或额外数据库任务。
- `check:repo`、四工作区 lint/typecheck 全部通过；PostgreSQL 55432 保持原运行态，迁移阶段输出 `No migrations to run!`。
- Vitest：`40 files / 377 tests` 全部通过；`QA-SYSTEM-07C-CHECK-001` 与 `QA-SYSTEM-07C-CHECK-002` 均未再出现。
- 四工作区构建全部通过：`packages/contracts` typecheck build、`backend` build、`frontend` Vite `189 modules`、`system-frontend` Vite `42 modules`。frontend 仅保留既有 chunk size warning，不影响退出码。
- 只读清理核对：`qimao_prereview_*` 与 `qimao_fifo253_*` 数据库残留均为 `[]`；未发现本轮 pnpm/vitest/node 孤儿进程；共享 PostgreSQL 55432 仍由既有本地运行时提供。

Rev2 结论：测试健康两项差量已由测试专用最小修改关闭，未改变生产代码/API/状态机/视觉；结合 Rev1 产品矩阵冻结证据，SYSTEM-07C 产品缺陷仍为 `P0/P1/P2/P3=0/0/0/0`，FIFO253 可交规划关闭。
