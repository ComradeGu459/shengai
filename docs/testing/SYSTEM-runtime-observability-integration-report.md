# SYSTEM-06 运行可观测性纵向集成报告

日期：2026-08-18  
任务：TEST-SYSTEM-06 Rev 1 / FIFO210  
结论：通过，P0/P1/P2/P3=`0/0/0/0`

## 1. 验收边界

本轮验证独立管理员站 `/servers`、`/logs` 与正式 Fastify/PostgreSQL 只读链。真实 Agent、外部网络、Secret、付费调用、云资源、运行写控制和部署不在范围。固定测试任务因 `read-only` 在动作前退出，规划在同一 Rev、可写工作区接管；没有修改业务状态机或伪造外部服务。

## 2. 权限与两站隔离

- runtime/operations 后端专项覆盖匿名、错误 audience、缺少 capability 的默认拒绝，以及合法 system-control 主体读取。
- 员工站 `frontend/src` 与入口静态扫描 `ControlShell`、`/api/system-control`、runtime/operations 正式路径命中 0。
- 员工站 production build 189 modules，管理员站 production build 36 modules；两个站点保持独立入口和导航世界。

## 3. 数据与恢复

- 后端 runtime/operations 两文件 11/11：受控资源目录、`unknown/not_configured`、数据库时间 24h 吞吐、active routing/deployment 配置、稳定分页和零写副作用通过。
- ASR、ScreenText、Delivery、system-control 均按持久 Attempt 独立读取；历史 requestId、版本、状态与错误不被当前 Job/产品覆盖。
- 费用主显示为服务端 CNY；原币只作审计。`pending/unknown/reconciliation_required` 不补零，需对账优先级成立。
- 正式 UI 变化场景覆盖 `/servers` 双请求失败的唯一恢复所有者，以及 `/logs` 受控 `503→503→200`：真实 requestId、旧表保留、再次失败错误焦点、成功 H1 焦点通过。
- 正式浏览器 1440/1024 根无横溢，宽表只在自身容器横滚；详情抽屉焦点闭环、Escape 回触发点和 console `error/warn=0/0` 通过。浏览器证据引用 `docs/ui/SYSTEM-runtime-observability-acceptance.md` §9。

## 4. 新鲜验证

- `tests/backend/system-control-runtime.test.ts` + `system-control-operations.test.ts`：2 files / 11 tests 全通过。
- `tests/frontend/system-control.test.tsx` + `system-control-runtime.test.tsx`：2 files / 12 tests 全通过。
- contracts build、backend build、frontend build、system-frontend typecheck/build 全通过。
- 唯一完整 `pnpm check`：35 files / 335 tests，全 workspace lint、typecheck、test、build 退出码 0。

首次完整门在 `tsx` CLI 的 Windows `os.userInfo()` 上触发 `uv_os_get_passwd ENOMEM`，尚未进入测试。已删除迁移命令对该 CLI 的依赖，统一改为正式 TypeScript 构建后运行 `dist/database/migrate.js`；随后原样 `pnpm check` 全通过。没有保留 shim、fallback 或第二迁移路径。

## 5. 清理

- 正式 UI 隔离数据库 `qimao_ui_system06_7908` 已精确删除并验证计数 0。
- 32060/32061 验收服务、浏览器标签、视口和临时 harness/loader/shim 已清理。
- 完整质量门结束后，本地 PostgreSQL `127.0.0.1:55432` 已停止。
- 未接触原始素材，未提交、推送或部署。
