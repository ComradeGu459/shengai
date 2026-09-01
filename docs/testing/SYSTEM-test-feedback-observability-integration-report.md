# SYSTEM-08 INT-18 独立纵向集成验收报告

## 任务与权限

- `handoffToken=FIFO282-TEST-SYSTEM-08-R1-V4.769`
- `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`
- `permission_profile=workspace-write/:workspace`，`ordinary_writes=direct`
- 原始素材、真实 COS/Sentry、真实供应商/网络/Secret/付费/云资源均未接入；生产 frontend/backend/system-frontend、contracts、迁移和 DESIGN 修改数为 0。

## 执行路径

使用正式 employee frontend production build（195 modules）、system-frontend production build（45 modules）、正式 Fastify、从零全部 37 项迁移的精确隔离 PostgreSQL、`InMemoryFeedbackScreenshotStorageFake`、Playwright 1.62.1 与系统 Chrome。测试 fixture 仅使用两个匿名项目、脱敏反馈文本和固定 1×1 PNG 字节。

专项与关闭门：

- `tests/backend/system-control-feedback.test.ts`：1 file / 6 tests passed。
- `tests/frontend/system-control-feedback.test.tsx`：1 file / 15 tests passed。
- contracts/backend/frontend/system-frontend typecheck 与 backend build、两站 Vite production build 通过；`check:repo` 与 `git diff --check` 通过（仅既有 `LOCAL_APP_PARITY.md` CRLF 警告）。
- 正式纵向 harness 最终 45/45 checks passed；事实计数为 `feedback_reports=9`、`feedback_events=14`、`feedback_screenshot_attachments=1`。外部脱敏证据：`C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qa-evidence-fifo282\\summary.json` 与四张双视口 PNG。

## 矩阵结果

1. 权限与双站隔离：匿名、缺 `feedback:create`、缺 `system-control:feedback:read/write`、员工读管理 API、项目 B 读取项目 A 均稳定拒绝；合法 employee/manager 请求按能力通过。员工源码/build 无 `ControlShell`、管理反馈 API、Sentry/COS/session recording；system-frontend 只呈现控制台反馈，不呈现员工工作台。
2. 员工反馈：六类 kind 均可创建；描述、安全上下文由请求 schema 与服务端投影约束；无截图提交只产生一个 create POST 和 detail GET，零附件写入。显式截图仅在隐私确认后走授权→真实 PNG bytes→完成链，≤5MB/content type/digest/size 均由服务端核对。
3. 隐私与字节闭环：完成后管理员读取的 bytes 与 SHA-256 digest 与固定 PNG 完全一致；响应、详情、数据库投影不含 objectKey、Secret、Cookie/Auth、敏感 URL 或原始对象身份。
4. 幂等与恢复边界：create、attachment authorization、upload、complete、event 的同键重放、同键异参、重复身份与跨项目访问均稳定 200/409/404；状态未知只读取固定身份，未自动重发写命令。`FeedbackReport`/`FeedbackEvent` 为 PostgreSQL 唯一状态源，storage fake 只保存截图字节。
5. 管理闭环：服务端 project/search/sort/limit/offset 分页与真实 total、空页 total、详情、事件读取及 `confirmed→fixing→retest→closed→reopened` 只追加历史均通过；读取无额外写事实。
6. 双视口与焦点：employee/system 1440×900、1024×768 根 `scrollWidth===innerWidth`；反馈 Modal、详情 Drawer 打开后 Escape 均回原触发点；应用 `console.error/warn=0/0`、`pageerror=0`。FIFO281 已冻结的同查询 `503→503→pending→200`、stale/唯一重读/requestId/第二次失败焦点证据继续作为本轮既有事实引用，未重复强制断连共享数据库。
7. 静态边界：未发现测试清单、强制步骤、自动截图、会话录像、真实 Sentry/COS、外部网络/付费/云资源路径；截图仅由用户显式选择并确认后上传。

## 关闭门与清理

本切片唯一一次新鲜完整 `pnpm check` 原始结果：`44 files / 418 tests` 全部通过；`check:repo`、lint、typecheck、测试、contracts/backend/frontend/system-frontend 构建均为 exit 0。frontend build 仅有既有大 chunk 非阻断提示。

隔离库、Fastify、两站静态服务、测试 Chrome 和临时 harness 已精确关闭/删除；只读核对 `qimao_fifo282_*` 数据库为 `[]`，32782/32783/32784 无监听；共享 PostgreSQL 55432 保持运行。原始生产数据未触碰。

## 质量结论

`P0=0 / P1=0 / P2=0 / P3=0`，未形成 `QA-SYSTEM-08-*` 返工包。本报告只交规划复核，不直接通知 UI、FRONT 或 BACK。
