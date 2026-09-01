# M3-08 统一任务中心 INT-09 全链集成验收报告

## 任务与权限

- 任务：`TEST-M3-08 Rev1` / FIFO265
- handoffToken：`FIFO265-TEST-M3-08-R1-V4.714`
- repo_root：`C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`
- permission_profile：`workspace-write/:workspace`
- ordinary_writes：`direct`
- 本轮生产 frontend/backend/contracts/migrations/DESIGN 修改：`0`

## 正式环境与边界

本轮使用正式 Fastify、员工 frontend production build、从零创建并执行全部迁移的隔离 PostgreSQL、零网络测试事实、系统 Chrome 与既有 Playwright 1.62.1。API/静态服务端口为 32665/32666；仅使用匿名夹具项目 A/B 与六类任务事实，不接真实厂商、AI、网络、Secret、付费或云资源。

## 新鲜专项与纵向矩阵

### 专项

- `tests/backend/tasks.test.ts` + `tests/frontend/tasks.test.tsx`：`2 files / 16 tests` 全通过（backend 7、frontend 9）。
- contracts/backend typecheck、backend build、员工 frontend typecheck、员工 frontend Vite production build `192 modules` 全通过。

### 正式 Fastify + production frontend + Chrome harness

一次成功运行记录 `16/16`：

1. 匿名、`system-control` 主体均 403；合法 employee `tasks:read` 200；项目 A 作用域不能读取项目 B 任务。
2. 六类顶层任务均被发现：`asr_dispatch`、独立 `asr_batch`、`screen_text_batch`、`term_extraction`、`pre_review_preparation`、`delivery_generation`；Dispatch 引用的 batch 未重复计数，详情返回完整子结果。
3. 摘要、search/type/status/project、稳定排序与分页均来自服务端真实 total；分页外详情按固定 `taskType/resourceId` 读取；读取前后领域计数一致，零写副作用。
4. 响应不包含 `objectKey`、供应商、Secret、提示词或原始载荷；任务详情保留员工安全状态、nativeStatus、项目范围、历史与返回工作台身份。
5. 员工正式 bundle/source 静态扫描：旧 `/asr-dispatches`、`AsrDispatches` 命中 `0`；`ControlShell`、`system-control` 管理 API 命中 `0`。
6. 系统 Chrome 双视口：1440 根 `1440/1440`、任务表容器 `1170/1170`；1024 收起根 `1024/1024`、workspace `x=72,width=952`；展开侧栏 `216px` 覆盖、遮罩存在且 workspace 仍 `x=72,width=952`；Drawer 标题初焦、Escape 回原“查看详情”触发点成立。
7. 页面无空闲轮询（本次任务请求总数 15，加载稳定后无新增轮询）；application `console.error/warn=0/0`。

取消/恢复领域命令的 unknown、确定 409、同身份 GET 恢复、下一次新 body/key 与 Delivery 同 deliveryId 证据由新鲜 frontend tasks 专项及已冻结的 FIFO264 正式 Chrome 证据共同覆盖；本轮不在任务中心创建第二命令或状态源。

## 唯一完整关闭门

矩阵完成后只运行一次完整 `pnpm check`：

- 退出码：`0`
- Vitest：`41 files / 389 tests` 全通过
- `check:repo`、四工作区 lint/typecheck 全通过
- 四工作区 build 全通过：contracts/backend；员工 frontend `192 modules`；system-frontend `42 modules`
- PostgreSQL setup 输出 `No migrations to run!`，共享 55432 保持既有运行态

## 清理与证据

- 本轮隔离库 `qimao_fifo265_11908_ac30bd91` 已精确 DROP；`qimao_fifo265_*`、`qimao_tasks_*` 残留查询均为 `[]`。
- 32665/32666 无监听；Fastify、静态服务、Chrome、Playwright 与临时 harness 已停止/删除；无本轮 pnpm/vitest 孤儿进程。
- 脱敏证据：`C:\Users\ComradeGu\Documents\七猫兼职\qa-evidence-fifo265\summary.json`、`fifo265-tasks-1024.png`。证据只含匿名任务/布局数据，不含真实台词、视频帧、业务名称或文件字节。
- 共享 PostgreSQL 55432 未停止、未重启、未写入业务数据。

## 结论

M3-08 统一任务中心 INT-09 纵向集成矩阵通过，产品缺陷计数 `P0/P1/P2/P3=0/0/0/0`，无 `QA-M3-08-*` 返工包；报告、状态和日志已交规划复核关闭。
