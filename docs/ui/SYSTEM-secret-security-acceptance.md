# SYSTEM-05 密钥与安全引用 UI 验收

状态：UI-SYSTEM-05 Rev 1 正式设计冻结；因固定 UI 任务持续 `read-only`，由规划对话在当前 `workspace-write` 环境沿原中间态完成，不建立第二视觉方向或第二实现。

## 1. 权威输入

- `DESIGN.md` 5.11–5.14
- `docs/milestones/SYSTEM-secret-security-readiness.md`
- `docs/contracts/MODULE_RESPONSIBILITY_MATRIX.md` 的“系统控制台密钥与安全引用”
- `docs/contracts/MODULE_INTEGRATION_CONTRACTS.md` 的 `INT-11/13/15/16`
- `packages/contracts/src/system-control-secret.ts`
- 仓库外唯一原型：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\ui-system-01-control-shell\index.html`

## 2. 冻结方向

继续使用唯一 ControlShell“日间控制舱”：冷灰白工作面、深石墨蓝侧栏与安全就绪带、`#4458D8` 主动作、高密度表格、非颜色单一编码。`/security` 是管理员入口，不进入员工 AppShell。

页面不管理 Secret 值，只管理服务器候选摘要、稳定安全引用、不可变版本、零网络验证、使用位置、轮换、撤销和审计。任何状态都不提供明文输入、回显、复制、下载、任意引用 ID、URL、Header 或脚本。

## 3. 信息结构

1. 页头：标题、职责说明、发现服务器候选、登记引用。
2. 安全接入就绪带：安全存储发现、员工站 Access、控制台 Access、真实供应商连接。
3. 状态区：读取失败/stale/Provider unknown、撤销阻断/失败/unknown/成功。
4. 安全引用主表：服务端搜索、筛选、排序、分页。
5. 服务器候选表：脱敏摘要、适用范围、登记或轮换入口。
6. 详情抽屉：不可变版本、使用位置、验证历史、审计、轮换和撤销。
7. 受保护工作流：登记、轮换、撤销确认及失败恢复。

## 4. 状态矩阵

| 区域 | 必须覆盖 | 唯一恢复/下一步 |
| --- | --- | --- |
| 主读取 | loading、empty、error、再次失败、恢复、stale、Provider unknown、Access 未配置 | 重新读取；恢复后聚焦 H1 |
| 验证 | queued、running、failed、unknown、succeeded | queued/running 刷新同一记录；unknown 查询同一 `validationRunId`；failed 显式新建验证 |
| 登记 | 初始、submitting、确定失败、unknown、success | 失败刷新候选；unknown 查询同一登记命令；成功标题获焦 |
| 轮换 | 初始、submitting、确定失败、unknown、success | 失败刷新候选；unknown 查询同一轮换命令；成功不自动换绑 |
| 撤销 | 使用中阻断、确认、submitting、确定失败、unknown、success | 阻断查看使用位置；失败重新读取；unknown 查询同一撤销命令 |
| 只读保护 | stale、Provider unknown、读取失败、已撤销 | 全部写入口锁定，仍可核对已有事实 |

## 5. 异步与焦点门

- 登记/轮换确定失败保留输入、显示原因和 `requestId`，唯一恢复为“刷新候选”。
- 撤销确定失败明确“本次撤销未生效、引用仍保持原状态”，唯一恢复为“重新读取安全引用”。
- unknown 不重新提交写命令，只查询同一命令/运行身份。
- 登记、轮换与撤销弹窗打开后焦点进入安全项；`Tab / Shift+Tab` 双向闭环；非提交中 Escape/关闭返回原触发点。
- 提交中锁定关闭、Escape、遮罩、重复提交和焦点逃逸；失败/unknown 聚焦唯一恢复，成功聚焦成功标题。
- 详情抽屉关闭后返回原表格触发点；验证状态变化仍保持抽屉语境。

## 6. 跨模块衔接

- 只有零网络验证成功、未撤销且环境/能力/来源匹配的不可变引用版本，才能进入 `/engines` 的“替换为服务器已有别名”。
- 轮换只新增引用版本；必须再创建新的引擎部署版本并经过连接测试、路由影响检查和发布，才影响新任务。
- 已运行和历史 Attempt 固定原引擎与引用版本，不自动改写。
- Secret 可用不绕过预算安全门；真实供应商网络、付费调用和部署仍需用户单独授权。

## 7. 响应式门

- 1440×900：216px 展开侧栏、四列就绪带、完整引用表。
- 1024×768：72px 默认侧栏；216px 覆盖展开时主工作面尺寸不变。
- 引用表 1180px、候选表 1060px，只在自身 `.table-wrap` 横滚；页面根无横向溢出。
- 详情抽屉约 440–470px；工作流在剩余主工作面内完整可操作。

## 8. 非目标

- 不接真实 Secret、Vault、Cloudflare、供应商 SDK/网络、付费 API、云资源或部署。
- 不实现账号、邮箱成员、裸 SSH、服务器删除、防火墙、提示词/热词/风险词学习或服务器遥测。
- 不把匿名原型数据、场景切换器或成功状态写入生产常量。

## 9. 最终证据

证据目录：原型目录下 `evidence/ui-system-05-rev1/`。

- `1440-security-normal.png`：正常首屏与完整主表。
- `1024-security-normal-collapsed.png`：1024 收起侧栏。
- `1024-security-normal-expanded.png`：1024 覆盖展开不挤主区。
- `1024-security-register.png`：登记工作流。
- `1024-security-detail.png`：详情、使用位置、验证与审计。
- `1024-security-revoke-confirm.png`：撤销高风险确认。
- `1440-security-register-error.png`：登记确定失败与唯一刷新候选。
- `1440-security-rotate-error.png`：轮换确定失败与唯一刷新候选。
- `1440-security-revoke-failed.png`：撤销确定失败与唯一重新读取。

最终验证必须记录：两视口根宽、宽表容器横滚、三项确定失败动作数、撤销弹窗焦点闭环、控制台 error/warn、`node --check`、Impeccable detector 与 `git diff --check`。原型证据只证明 UI 结构和状态，不证明真实 Provider、Secret 或供应商已接入。

## 10. Rev 1 最终验收记录

- 规划在当前 `workspace-write` 环境复用原 UI 中间态完成收口；没有创建第二套视觉方向。原六张正常态、详情、登记和撤销确认截图继续冻结引用。
- 1440×900 三项确定失败均成立：登记和轮换各只有“刷新候选”恢复动作且获得焦点；撤销明确显示“本次撤销未生效”、真实形态 `requestId` 与唯一“重新读取安全引用”。新增证据因原 UI 任务仓库外目录只读，保存于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\12\019ff4f8-4a77-7870-8edf-6350490b316c\ui-system-05-planning-takeover\`。
- 1024×768 收起侧栏为 72px，主工作面 `x=72 / width=942`；216px 覆盖展开后主工作面尺寸和偏移不变。根页面 `scrollWidth=clientWidth=1014`，10px 为 Windows Chromium 纵向滚动槽。引用表容器 `912/1180`，仅 `.table-wrap` 横滚。
- 撤销确认打开后初始焦点“安全返回”，正向序列“安全返回→确认撤销→安全返回”，反向“安全返回→确认撤销”，Escape 关闭并回到“原型场景”触发点；活动 `aria-modal=true` 内焦点闭环成立。
- 最终页面控制台 `error/warn=0/0`。Impeccable detector 按规则只运行一次；因缺 `htmlparser2/css-select/css-tree/domutils` 降级为 regex，唯一提示为既有 `/engines` 的 `.integration-banner` 4px 左侧身份线，不在 `/security` 本轮新增界面，冻结为非物质项且不冒充完整检测。
- 原型 `app.js` / `serve.mjs` 的 `node --check` 与授权文档 `git diff --check` 均新鲜通过；正式前端专项仍由后续关闭门记录。本节只关闭 UI 设计与交互证据，不代表真实 Secret、外部供应商或付费网络已接入。

## 11. 正式 React 实现预审记录

- 正式 `system-frontend` 已新增 `/security`，直接消费 `packages/contracts/src/system-control-secret.ts` 与既有 Fastify 路由；实现安全就绪摘要、服务端候选、引用搜索/筛选/排序/分页、详情、不可变版本、验证历史、使用位置、审计、登记/轮换/撤销和 unknown 同身份恢复。浏览器没有 Secret 明文、任意引用 ID 输入、第二状态源、旧兼容路径或自动重提写命令。
- `/engines` 的新版本弹窗已改为读取服务端同能力、同提供方且状态可绑定的引用版本，只提交 `secretReferenceVersionId`；没有恢复旧 `referenceId` 文本框。轮换候选同样同时校验能力和提供方，最终仍由后端事务权威拒绝不匹配身份。
- 正式前端专项与既有控制面回归新鲜通过：`system-control.test.tsx + system-control-plane.test.tsx + system-control-secret.test.tsx` 共 **43/43**；后端 Secret 专项在启动项目自带 PostgreSQL 后 **6/6**。`system-frontend` 类型检查、Vite 生产构建（30 modules）和 `check:repo` 通过。首次后端专项仅因 55432 未启动得到 `ECONNREFUSED`，数据库启动后原命令全绿，不记产品缺陷。
- 真实浏览器使用正式 React/Vite build 及同源受控 HTTP 事实做前端预审：1440 根 `1440/1440`、侧栏/正文 `216/1224`；1024 根 `1009/1009`、收起侧栏 72、正文 `x=72 / width=937`，覆盖展开侧栏 216 后正文尺寸不变；候选宽表 `861/1060`，仅自身容器横滚。
- 登记确定失败保留同一弹窗、真实形态 `requestId=browser-secret-422`，唯一“刷新候选”获焦且仍在 dialog；初始焦点“关闭”，`Shift+Tab` 到确认动作，Escape 关闭后回“登记引用”。正式预审截图位于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\12\019ff4f8-4a77-7870-8edf-6350490b316c\ui-system-05-formal\`。
- 本节是正式前端预审，不替代后续精确隔离 PostgreSQL + 正式 Fastify 的独立纵向验收；同源 HTTP 受控失败只用于验证前端状态与焦点，不冒充真实 Provider、真实 Secret 或外部网络。浏览器验收后视口、标签、Vite 与受控 HTTP 服务均已清理。

## 12. SYSTEM-05 关闭记录

- 正式 Fastify 已补齐端口级联调：security、references、discovery、overview 读取均为 200；零网络 Provider 受控拒绝登记稳定返回 422、真实 Fastify requestId，唯一恢复仍在活动弹窗内获焦。该事实不冒充真实 Secret 或供应商网络。
- 最终 `pnpm check` 新鲜通过：四工作区 lint/typecheck、32 个测试文件 **313/313**、全部构建通过；管理站 build 为 30 modules。撤销竞态专项从零执行 31 个迁移并清理隔离库。
- P0/P1/P2/P3=`0/0/0/0`，正式报告见 `docs/testing/SYSTEM-secret-security-integration-report.md`。SYSTEM-05 的 UI、后端、正式前端和测试关闭，后继只按已冻结顺序进入 CNY 成本归一；真实 Secret、网络、付费、云资源与部署仍未授权。
