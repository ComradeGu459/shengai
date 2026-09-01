# 当前项目活跃快照


最后更新：2026-08-18
同步协议：v4.8
同步版本：`v4-568`

> FIFO220 `BACK-SYSTEM-07B Rev2` 已通过规划独立微审并关闭；FIFO221 `FRONT-SYSTEM-07B Rev1` 当前 `blocked / Current actor=规划对话 / Reviewer=规划对话`，阻塞原因仅为“协作唤醒链路专项审计”。此前 Wave B 生产改动保留，不记业务失败、不增加 Rev。

### FIFO221 协作唤醒链路专项暂停（2026-08-18）

- 已立即停止 FRONT-SYSTEM-07B Rev1 的生产编码、测试扩展、浏览器验证及业务文档修改；不回滚、不清理、不提交、不推送。
- 状态：`FIFO221=blocked`；`FRONT-SYSTEM-07B Rev1=blocked / Current actor=规划对话 / Reviewer=规划对话`。唯一阻塞原因：协作唤醒链路专项审计；这不是业务失败，不增加 Rev。
- 实际已修改文件仍为上一交付记录的 `system-frontend/`、`tests/frontend/system-control-strategy.test.tsx`、`docs/status/CURRENT.md`、`docs/logs/DEVELOPMENT_LOG.md`；暂停消息未改任何生产代码或测试文件。
- 运行态：无尚在运行的开发服务器、测试、构建或浏览器命令；此前 Vite/测试进程已安全停止。当前只完成本状态写回并交规划唤醒。

### FIFO221 FRONT-SYSTEM-07B Rev1 完成差量（2026-08-18）

- 既有独立 `system-frontend` `/strategy` 增量接入 Wave B：优化运行、候选审查/严格编辑/结构化驳回与恢复/送离线评测、评测历史与详情；Wave C 批准/发布保持诚实禁用，不创建第二页或第二状态源。
- 仅消费正式 Strategy OptimizationRun/Candidate/Decision/EvaluationRun API；runId、candidateId、decisionId、evaluationRunId 均预生成并作为唯一恢复身份。未知或 retryable 只 GET 同一身份，确定性冲突清理意图并刷新 PostgreSQL 权威事实；不重发 POST、不猜列表状态。
- 复用 ControlShell 与公共 ErrorBlock/Modal/CommandRecovery：首屏/已有事实刷新失败保留 stale、requestId 与唯一重读；候选决定、优化运行、离线评测 pending/unknown/成功焦点和 Modal 锁定均覆盖；页面查询身份变化会丢弃迟到响应。Wave B 页面保持现有 1440/1024 结构、宽表容器内滚与无横溢。
- 生产改动限于 `system-frontend/`、`tests/frontend/system-control-strategy.test.tsx` 及本状态/日志；未改 backend、迁移、packages/contracts、DESIGN 或员工 frontend，未接真实 AI/Secret/网络/付费/云资源。
- 验证：策略专项与管理员组合回归 `59/59`；`system-frontend` TypeScript 通过；Vite 生产构建 `40 modules` 通过；Impeccable 定向 detector 已按本轮要求单次运行且结果 `[]`；`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 `pnpm check`、完整 UI 浏览器矩阵；等待规划独立复验与 UI/TEST 终验。

### FIFO221 前端领取（2026-08-18）

- permission fingerprint：repo_root=`C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`；workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；`permission_profile=workspace-write/:workspace`；ordinary_writes=direct，不走 `auto_review`。
- `FRONT-SYSTEM-07B Rev1` 已转 `review / Current actor=规划对话 / Reviewer=规划对话`。只增量修改独立 `system-frontend/` 与对应前端专项，复用现有 `/strategy`、ControlShell、公共异步/Modal 原语；Wave C、真实 AI/Secret/网络/付费和员工站规则继续冻结。

### FIFO220 规划微审通过并解锁正式前端（FIFO221，2026-08-18）

- 规划已核对严格 `additionalProperties=false` 的 decision result 契约、逐请求 `strategy:read` 权限、稳定 404 与 `strategy_candidate_decision_events.after_snapshot` 单一不可变数据源；后续同候选决定不会覆盖旧命令结果，GET 不创建事件、命令或第二状态。
- 后端新鲜 FIFO220 专项 `2/2`、Wave A 组合 `7/7` 已通过；规划本轮独立重跑 contracts/backend 双构建均退出码 0。无新增迁移、fallback、兼容旧路径或真实 AI/Secret/网络/付费。
- FIFO220 与 `BACK-SYSTEM-07B Rev2` 关闭。FIFO221 `FRONT-SYSTEM-07B Rev1 ready`：只消费已冻结 UI Rev2 与正式共享契约/Fastify API，在独立 `system-frontend` 的既有 `/strategy` 内实现 Wave B；稳定 runId/candidateId/decisionId/evaluationRunId，未知结果只 GET 同一身份，确定冲突清意图并刷新权威事实。
- `TEST-SYSTEM-07B` 继续 blocked，等待正式前端完成并由 UI 做一次完整 React 同状态终验；Wave C 自动批准/发布、真实 AI/Secret/网络/付费和员工站规则切换继续冻结。

### FIFO219 UI 微返工通过，后端缺少候选命令只读恢复（FIFO220，2026-08-18）

- FIFO219 `UI-SYSTEM-07B Rev2` 规划复审通过并关闭：四个候选稳定身份、严格字段编辑、结构化驳回/唯一恢复、送评测确认、pending 锁定、确定冲突刷新、unknown 同候选/命令语义、成功/失败焦点与三张变化证据一致；P0/P1/P2/P3=`0/0/0/0`。既有视觉、双视口、CNY 与 Wave C 禁用继续冻结。
- BACK-SYSTEM-07B Rev1 的 OptimizationRun 与 EvaluationRun 都有按预生成稳定 ID 的 GET 恢复，但候选决定目前只有 `POST /strategy/candidates/:candidateId/decisions`；没有按 `decisionId` 读取不可变决定结果的共享契约/API。响应在服务端提交后丢失时，正式前端只能重发 POST 或读取候选当前态并猜测，无法证明恢复的是同一命令，违反 UI/INT-15 的 unknown 只读恢复门。
- FIFO218 主体以 `disposition=fix` 结束审核；FIFO220 `BACK-SYSTEM-07B Rev2 ready / Current actor=后端开发对话 / Reviewer=规划对话`。唯一允许修正为新增按 `decisionId` 的只读结果契约/GET，从现有不可变 decision event/after snapshot 恢复精确候选结果并保持逐请求权限、404/零写副作用；补同一候选后续再编辑仍读取原命令快照、未知只 GET/POST 不增加的回归。不得新增迁移、fallback、第二状态源或改 UI/员工规则。
- `FRONT-SYSTEM-07B`、`TEST-SYSTEM-07B` 继续 blocked；后端 Rev2 通过后才解锁正式前端固定对话。

> FIFO218 `BACK-SYSTEM-07B Rev1` 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`；下方早先的 `in_progress/active` 行仅保留交接历史，不改变本活跃快照。UI FIFO219 的并行 `review` 事实保持不变。

### FIFO217 规划交叉审核退回一次性 UI 微返工（FIFO219，2026-08-18）

- 规划已核对 DESIGN 5.16.6–5.16.9、UI 验收 §10–13、三张双视口证据、同壳原型源码及当前 Wave B 契约/迁移草案。信息架构、Wave C 禁用边界、CNY/unknown 诚实投影、1440/1024 布局与已取证的抽屉/运行 Modal 焦点冻结通过。
- 唯一 P1 为候选主链的“可操作交付”与原型事实不一致：四行候选均打开固定 `候选-C061`；抽屉中的“驳回候选 / 编辑建议 / 送入离线评测”没有事件接线；已驳回候选没有可执行恢复入口；因此严格字段编辑、结构化驳回、恢复和送评测确认/焦点/unknown 尚未形成可验证交互，三张证据也未覆盖这些状态。
- FIFO217 以 `disposition=fix` 关闭审核；FIFO219 `UI-SYSTEM-07B Rev2 review / Current actor=规划对话 / Reviewer=规划对话`。四行稳定候选身份、严格字段编辑、结构化驳回、恢复、送评测确认、pending/焦点、unknown 同命令与确定冲突重读均已形成可操作原型并补证据；生产代码修改 0，等待规划复审。
- FIFO218 `BACK-SYSTEM-07B Rev1` 继续由后端固定对话独立执行，UI 微返工不得覆盖其 contracts/迁移/后端文件。`FRONT-SYSTEM-07B` 与 `TEST-SYSTEM-07B` 继续 blocked，等待 UI Rev2 与 BACK 双依赖通过。

### SYSTEM-07 Wave B 恢复固定对话协作（FIFO217/218，2026-08-18）

- 用户指出规划长期单跑不符合既定协作方式；裁决正确。此前由规划接管仅用于绕开固定任务 `read-only`，今后恢复“规划冻结边界 → UI/后端固定对话并行 → 规划交叉审核 → 前端 → UI/测试”的主流程。
- FIFO217 `UI-SYSTEM-07B Rev1 review / Current actor=规划对话 / Reviewer=规划`：DESIGN 5.16.6–5.16.9、UI 验收与同壳 Wave B 原型已冻结；覆盖零网络运行、候选审查/编辑/驳回/送评测、离线评测、失败/unknown、双视口与焦点。两份后端文件仍是未验证草案，UI 未冒充完成 API；生产代码修改 0。
- FIFO218 `BACK-SYSTEM-07B Rev1 review / Current actor=规划对话 / Reviewer=规划对话`：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，workspace root 含 `C:\Users\ComradeGu\Documents\七猫兼职`，`permission_profile=workspace-write/:workspace`，普通仓库写入直连且不走 `auto_review`。已在既有草案上收口唯一 PostgreSQL OptimizationRun/候选/不可变决定事件/EvaluationRun、零网络可停止有界 Worker、逐请求 `strategy:evaluate`、稳定资源 ID + Idempotency-Key/异键冲突与 unknown 只读恢复；撤销/恢复事件被排除，不返回完整事件正文。隔离空库 33 迁移（含 1754976019000）通过且业务行=0；FIFO218 专项 2/2、Wave A strategy 5/5、组合 7/7；contracts/backend build、check:repo、git diff-check 通过。真实失败仅为首次本地启动残留 PID/日志权限执行器问题，已确认无服务后受控清理运行态并验证；本地 PostgreSQL 已停止。`FRONT-SYSTEM-07B` 与 `TEST-SYSTEM-07B` 继续 blocked，Wave C/自动批准发布不在本轮。
- `FRONT-SYSTEM-07B` 与 `TEST-SYSTEM-07B` 继续 blocked，等待 UI/BACK 双依赖通过；真实 AI、Secret、网络、付费、自动批准/发布和员工站规则切换继续冻结。

### SYSTEM-07 Wave A 正式全链关闭（FIFO215/216，2026-08-18）

- `FRONT-SYSTEM-07A Rev1` 已由规划在唯一可写工作区完成：独立管理站 `/strategy` 正式消费 PostgreSQL/Fastify 权威资产、不可变版本与安全事件；创建下一版本必须先选基线，并完整继承提示词、术语、风险词、AI 筛选与最多 500 条结构化本地规则，不存在空白重建或第二状态源。
- 正式浏览器链通过：真实 v1→v2→v3；普通列表/详情不泄露完整策略正文，显式创建表单才读取完整 payload；成功后聚焦新版本标题。1440/1024 根无横溢，1024 本地规则表单两列自适应、Modal 正反向焦点闭环，控制台 `error/warn=0/0`。
- 独立关闭门通过：策略前端 `7/7`、管理员前端五文件 `56/56`、完整 `pnpm check` 退出码 0（37 files / 347 tests，仓库检查、lint、typecheck、全部测试与四项目构建通过）。现有员工前端大 chunk 仅为既有非阻断提示。
- 三个精确隔离验收库已删除且残留 0；项目 PostgreSQL 55432 已停止。FIFO215、FIFO216、`FRONT-SYSTEM-07A`、`TEST-SYSTEM-07A` 关闭，SYSTEM-07 Wave A 正式 done。
- 下一切片为 Wave B：零网络优化运行、候选版本与离线评测；仍不得自动发布、调用真实 AI/Secret/网络/付费或改变员工站生产规则，启动前重新完成 v4.8 数据/权限/状态预检。

### FIFO215 固定前端 permission_blocked，规划接管同一 Rev（2026-08-18）

- 前端固定任务已收到 FIFO215，但权限指纹为 `read-only`；按 v4.8 动作前零修改退出，未写领取状态、未改文件、未运行测试或触发 auto_review。
- 规划在当前 `workspace-write/:workspace` 环境接管同一 `FRONT-SYSTEM-07A Rev1`，状态 `in_progress / Current actor=规划对话`；不增加 Rev、不创建第二实现。
- 范围仍限 `system-frontend/`、对应前端专项与 CURRENT/开发日志；沿用 DESIGN 5.16、正式 strategy 契约和既有 Impeccable 方向，不触碰 backend/contracts/迁移/员工 frontend/Wave B/C。

### SYSTEM-07 Wave A 双依赖关闭并解锁正式前端（FIFO215，2026-08-18）

- `UI-SYSTEM-07 Rev1` 已由规划在可写环境接管并关闭：DESIGN 5.16、UI 验收、同壳原型、1440/1024、Modal/抽屉焦点、失败恢复与控制台 0/0 均通过；Impeccable detector 仅运行一次并如实记录依赖缺失降级。
- `BACK-SYSTEM-07A Rev2` 已通过规划独立复验：四领域正式写命令进入安全事件投影，业务差量排除机械 `id/revision`，权威证据计数、subtitle cue-id 单轨/多轨及撤销恢复成立；规划新鲜复跑 strategy 5/5、contracts/backend build 通过。
- FIFO212、FIFO213、FIFO214 关闭；FIFO215 `FRONT-SYSTEM-07A Rev1` 解锁，范围仅 `system-frontend/`、对应前端测试与状态/日志。Wave B/C、真实 AI/Secret/网络/付费/训练/发布仍 blocked。

### FIFO214 BACK-SYSTEM-07A Rev2 安全事件投影返工（2026-08-18）

- 已保持 `workspace-write/:workspace`、普通仓库编辑不走 auto_review；FIFO213 主体先前已写回 review，本轮转 `in_progress / Current actor=后端开发对话`。
- 仅收口四领域正式事件写入回归、changedFields 有意义投影、各域有界 evidenceCount 与 acceptance 轨道确定性；五类草稿、迁移、权限/幂等 API 冻结，不启动 Wave B/C。

### FIFO214 BACK-SYSTEM-07A Rev2 完成回写（2026-08-18）

- 当前状态：`review / Current actor=规划对话 / Reviewer=规划`；FIFO214 Rev2 本轮已完成，Wave B/C 继续冻结。
- 四域正式写命令回归已落盘并通过：terms、pre_review、screen_text、subtitle_acceptance 均从权威 repository/service 产生事件；changedFields 为业务字段差量，screen_text 明确排除 id/revision，evidenceCount 读取权威证据。
- acceptance 使用 cue-id 差量投影确定单轨/多轨 track 与实际变化 cue 数，覆盖 edit/undo/redo；StrategyArtifact 的 purpose/applicableModules/module filter/latestVersionSummary 与版本列表轻量摘要保留。
- 新鲜 strategy 专项 5/5、contracts/backend typecheck、backend build、check:repo、git diff --check 通过；隔离库执行 33 迁移后本地 PostgreSQL 已停止，Wave B/C 未启动。

### FIFO213 BACK-SYSTEM-07A Rev1 Wave A 完成回写（2026-08-18）

- permission_ok 已确认：workspace root 含 `C:\Users\ComradeGu\Documents\七猫兼职`，仓库为 `workspace-write/:workspace`，普通仓库编辑不走 auto_review；未调用 Superpowers。
- Wave A 已实现并转 `review / Current actor=规划对话`：新增五类严格 StrategyArtifact/不可变 draft version 契约、空库无业务 bootstrap 的增量迁移、稳定 artifact/version 身份与 Idempotency-Key/规范化 request hash、同键重放与稳定冲突、四领域事件 UNION ALL 安全投影及逐请求 strategy read/write 权限/API。
- 未实现 Wave B/C 的 publish、rollback、AI 调用/优化运行；未改生产前端、DESIGN、员工领域写状态机，未接真实 AI/Secret/网络/付费/云资源。
- 新鲜验证：隔离临时 PostgreSQL 从零执行 33 迁移；`tests/backend/system-control-strategy.test.ts` 3/3；contracts/backend typecheck 通过；backend build 通过；`check:repo` 通过；`git diff --check` 通过。专项完成后本地 PostgreSQL 已停止。
- 期间一次夹具错误（`term_candidate_type` 使用不存在的显示字面值）已按数据库枚举事实修正并复跑通过；非产品失败。并行 `UI-SYSTEM-07` 事实保留，不改写其状态。

### FIFO212 固定 UI 权限阻塞，规划接管同一 Rev（2026-08-18）

- UI 固定任务已收到正式派发并进入新 turn，但权限指纹为 `read-only`，动作前零修改退出；未写 in_progress、未改 DESIGN/docs/ui/原型/生产代码，未运行 Impeccable/浏览器/测试。
- 规划在当前 `workspace-write` 环境接管同一 `UI-SYSTEM-07 Rev1`，状态 `in_progress / Current actor=规划对话`；不创建第二实现、不重开视觉方向。
- 后端 FIFO213 已送达并处于 inProgress 权限检查；UI 与后端文件边界仍保持不重叠。

### SYSTEM-07 Wave A 正式启动（FIFO212/213，2026-08-18）

- 用户已确认推荐三波顺序；FIFO211 与 `PLAN-SYSTEM-07 Rev1` 关闭。Wave A 先交付安全人工事件目录与五类不可变策略草稿版本，不改变员工站现有规则。
- FIFO212：`UI-SYSTEM-07 Rev1 ready / Current actor=UI 设计对话`；只冻结 `/strategy` 全模块信息架构、Wave A 正式状态及 Wave B/C 诚实后置边界。
- FIFO213：`BACK-SYSTEM-07A Rev1 ready / Current actor=后端开发对话`；只实现事件安全投影、策略资产/版本、权限、幂等、迁移与后端回归。
- UI 与后端文件不重叠，可并行；`FRONT-SYSTEM-07A`、`TEST-SYSTEM-07A` 及 Wave B/C 继续 blocked。固定任务若 read-only，规划在当前 workspace-write 环境接管同一 Rev，不创建第二实现。

### PLAN-SYSTEM-07 推荐稿进入用户评审（FIFO211，2026-08-18）

- 已新增 `docs/milestones/SYSTEM-policy-learning.md`，把管理员“策略与学习”收敛为一个模块三波关闭：Wave A 安全人工事件目录与五类不可变策略版本；Wave B 零网络优化运行、候选和离线评测；Wave C 才逐模块人工批准生效与回滚。
- 推荐先关闭 Wave A，原因是它不改变现有员工主链，也不把未准备好的管理配置冒充生产 active；真正切换时必须在同一任务删除对应硬编码/default/fallback，不长期保留新旧双轨。
- 跨项目列表不返回完整字幕、before/after 原文、音视频、对象键、Secret、提示词全文或供应商载荷；单条事件和 AI 输出不得自动上线。所有预算与主金额统一 CNY。
- 当前为 `review / Current actor=规划对话 / Reviewer=用户`。用户确认推荐顺序前不唤醒 UI/后端/前端/测试；真实 AI、Secret、网络、付费、训练和云资源仍是独立授权门。

### SYSTEM-06 全链关闭（FIFO210，2026-08-18）

- 固定测试任务再次因 read-only 在动作前零改动退出；规划在同一 `TEST-SYSTEM-06 Rev1`、可写工作区接管。独立后端 runtime/operations 2 files / 11 tests、管理前端运行页/壳层 2 files / 12 tests、两站源码隔离及四项目构建均通过，P0/P1/P2/P3=`0/0/0/0`。
- 本切片唯一完整 `pnpm check` 最终退出码 0：35 files / 335 tests，仓库检查、lint、typecheck、全部测试与四项目构建通过。首次入口被 Windows `tsx` 的 `uv_os_get_passwd ENOMEM` 宿主错误阻断，已删除迁移命令对 `tsx` CLI 的依赖，统一为正式 TypeScript build 后执行 `dist/database/migrate.js`；无 shim/fallback/第二迁移路径。
- 隔离数据库、32060/32061、浏览器、临时 harness/loader/shim 已精确清理；本地 PostgreSQL 55432 已停止。FIFO210 与 TEST-SYSTEM-06 关闭，SYSTEM-06 正式 done。
- 下一业务切片为管理员“策略与学习”：本地规则、AI 可选筛选、提示词/热词/风险词版本、人工事件形成候选、离线评测与人工批准；学习结果不得自动发布生产规则。真实供应商/Secret/网络/付费/云部署仍需用户单独授权。

### FIFO209 正式 UI 终验关闭，解锁独立测试（2026-08-18）

- 固定 UI 任务 read-only 后由规划在同一 Rev 接管；production build + Fastify + 精确隔离 PostgreSQL 完整矩阵结论 P0/P1/P2/P3=`0/0/0/0`。1440/1024、详情焦点、CNY/待对账、脱敏、表格内滚和 console `0/0` 通过。
- 唯一集中修正为页面级读取/焦点所有权：`/servers` 两项读取失败只保留一个错误摘要/恢复入口；`/logs` 真实 `503→503→200` 再次失败保持唯一恢复和错误焦点，成功聚焦 H1。定向 6/6、system-frontend typecheck、Vite 36 modules 通过。
- 管理前端四文件组合为 48/49；唯一失败是既有 Secret unknown 恢复的组合运行焦点时序断言，随后同文件独立新跑 4/4，通过且生产代码未受影响。该测试隔离问题留完整关闭门裁决，不冒充 49/49。
- FIFO209 关闭，`FRONT-SYSTEM-06C Rev1` 转 done；FIFO210 `TEST-SYSTEM-06 Rev1` ready，执行独立权限、两站隔离、运行/日志与故障恢复纵向集成后再运行唯一完整 `pnpm check`。

### FIFO209 UI 固定任务 permission_blocked，规划接管终验（2026-08-18）

- UI 固定任务已收到 FIFO209，但权限为 `read-only`，在任何动作前停止；生产代码、docs/ui、CURRENT/日志、测试与浏览器矩阵修改/执行均为 0，不消耗正式终验轮次。
- 规划在当前 `workspace-write` 环境接管同一 Rev1 正式 UI 终验，先做运行时焦点/刷新/金额所有权预检，再启动 production build + Fastify + 精确隔离 PostgreSQL 完整矩阵；不创建第二实现、不调用 Superpowers。

### FIFO208 FRONT-SYSTEM-06C Rev1 规划接管交付（2026-08-18）

- 固定前端任务 read-only 后，规划在同一 Rev、唯一可写工作区完成正式 `/servers` 与 `/logs`；只消费共享 runtime/operations 契约和 Fastify API，不修改 backend/contracts/migrations/DESIGN/员工站。
- 资源页覆盖受控目录、健康/遥测/租约/24h 吞吐/当前配置与只读深链；日志页覆盖历史 Attempt、服务端筛选排序分页、requestId、CNY 主金额/待对账、不可变版本、质量与脱敏错误。两页共用只读抽屉和既有错误原语，无运行写控制、匿名样例、fallback 或第二状态源。
- 新鲜验证：SYSTEM-06 + 既有管理员前端 4 files / 48 tests；system-frontend typecheck、Vite build 35 modules、check:repo、diff-check 通过；Impeccable 定向 detector=`[]`。
- FIFO208 关闭；FIFO209 进入 `ready / UI 正式 React 终验 / Current actor=UI 设计对话`。完整 pnpm check 与 PostgreSQL 停止仍留 UI/TEST 后唯一关闭门。

### SYSTEM-06 前端解锁（2026-08-18）

- FIFO207 与 `BACK-SYSTEM-06B Rev2` 已经规划独立复验关闭：operations 专项 6/6、backend build、diff-check 通过。
- FIFO208：前端固定任务 `permission_blocked`（read-only）且零文件修改；规划在当前 `workspace-write` 工作区接管同一 Rev1，状态 `in_progress / Current actor=规划对话`。

### FIFO207 BACK-SYSTEM-06B Rev2 领取回写（2026-08-18）

- `permission_ok`：workspace root 含 `C:\Users\ComradeGu\Documents\七猫兼职`；仓库为 `workspace-write/:workspace`；普通仓库编辑不走 `auto_review`。
- 状态：`in_progress`，Current actor=后端开发对话。仅修正 operations 历史 Attempt 的自身 request/status/error 与对账优先级；不改契约、迁移、领域写状态机或前端。

### FIFO207 BACK-SYSTEM-06B Rev2 规划微返工（2026-08-18）

- FIFO206 Rev1 已完成历史 Attempt 主体，但规划微审发现同源两项残余：Delivery 历史失败仍错误读取产品当前状态/requestId；ASR/ScreenText 的 `reconciliation_required` 可能被 Usage/Reservation 的 final/pending 覆盖。
- FIFO207：`ready / BACK-SYSTEM-06B Rev2 / Current actor=后端开发对话`；微返工只允许修改 operations service 与专项测试，保持 API/契约/迁移/UI/其他领域冻结。

### SYSTEM-06 当前写回

- FIFO203：UI 固定任务因 read-only 在动作前停止；规划在同一 Rev、可写工作区接管并完成 `/servers`、`/logs` 设计/原型/双视口/焦点与失败恢复，P0/P1/P2/P3=`0/0/0/0`，状态 `closed / UI-SYSTEM-06 done`。
- FIFO204：`closed`；规划已完成 Rev1 独立审核并形成同源数据契约退审包。
- FIFO205：`closed / BACK-SYSTEM-06A Rev2 done`；规划独立复验 runtime `5/5`、contracts/backend build、check:repo 与 diff-check 通过，受控资源目录、active routing/deployment 只读配置和 24h 数据库时间聚合正式冻结。
- FIFO206：`closed`；Rev1 主体通过，规划同源微审并合并残余为 FIFO207。
- FIFO207：`closed / BACK-SYSTEM-06B Rev2 done`；历史 Attempt、请求、错误、版本、费用和需对账投影已关闭。
- FIFO208：`closed / FRONT-SYSTEM-06C Rev1 review`；规划接管实现和独立定向审核通过。
- FIFO209：`closed / FRONT-SYSTEM-06C Rev1 正式 UI 终验`；规划接管完整矩阵通过。
- FIFO210：`closed / TEST-SYSTEM-06 Rev1`；独立纵向集成与完整 35 files / 335 tests 质量门通过。
最近写入角色：规划对话（SYSTEM-06 正式全链关闭）

历史入口：

- v4.4 至 v4-295：`docs/status/archive/CURRENT-v4.4-through-v4.295.md`
- 实施与验证过程：`docs/logs/DEVELOPMENT_LOG.md`
- 模块职责：`docs/contracts/MODULE_RESPONSIBILITY_MATRIX.md`
- 模块衔接：`docs/contracts/MODULE_INTEGRATION_CONTRACTS.md`

本文件只保存当前阶段、未关闭队列、活跃任务和精确输入。

## 1. 当前阶段

当前主线：员工站 S1–S7、真实素材冒烟、代码健康拆分与管理员站首个真实运行总览纵向切片均已关闭。
产品状态：SYSTEM-05 密钥与安全引用已通过正式 React/Fastify、零网络 Provider、31 迁移隔离竞态和完整质量门；`/security`、不可变引用版本、验证、引擎绑定、轮换撤销、两站隔离及 1440/1024 已关闭，P0/P1/P2/P3=`0/0/0/0`。
当前动作：SYSTEM-07 Wave A 已全链关闭；下一切片为 Wave B 零网络候选与离线评测，不提前接真实供应商或自动发布学习结果。
下一授权门：真实 Secret、外部网络、付费调用、云资源与部署仍需用户单独授权；本地零网络正式前端与测试可自动续接。

### 1.1 完整产品三轨进度

| 轨道 | 权重 | 当前完成 | 当前事实 |
| --- | ---: | ---: | --- |
| 员工生产网站 | 60 | 约 55 | 当前轨道约 92%；S1–S7 员工主链及真实素材冒烟已关闭，剩余统一任务中心与生产细节收口 |
| 管理员系统控制台 | 20 | 约 19 | 管理员轨约 94%；ControlShell、权限地基、运行总览、引擎/路由、预算、密钥、人民币成本、服务器/Worker、统一日志及策略 Wave A 均已关闭；候选评测与批准生效仍待完成 |
| 两站对接与真实生产化 | 20 | 约 6 | `INT-11/12/13` 的本地零网络配置生效、运行聚合与默认拒绝边界已验证；真实 Cloudflare、供应商、对象存储和部署仍未实现 |
| **完整产品** | **100** | **约 80** | 员工主链、真实素材冒烟及管理端运行、配置、安全、日志与策略版本库均已关闭；策略候选评测、真实供应商/Secret、云资源和安全部署仍是主要剩余范围 |

S5/S7 关闭后，S6 与管理员控制台地基可在目录和契约不重叠时受控并行；不得用管理员规划稿冒充已实现功能。

## 2. 固定任务

| 角色 | 固定任务 ID | 当前状态 |
| --- | --- | --- |
| 规划对话 | `019ff4f8-4a77-7870-8edf-6350490b316c` | 当前总线 |
| UI 设计对话 | `01a012fb-e9f3-7801-a660-b22518eeea0c` | FIFO219 `UI-SYSTEM-07B Rev2` 已通过规划复审并关闭，等待正式前端后的 UI 终验 |
| 后端开发对话 | `01a00445-1878-7072-bfd3-f44de3504a3f` | FIFO220 `BACK-SYSTEM-07B Rev2` 已通过规划微审并关闭 |
| 前端开发对话 | `01a00445-1c71-72d3-9171-33ad2c36e941` | FIFO221 `FRONT-SYSTEM-07B Rev1` in_progress，Wave B 正式实现 |
| 全链测试与质量验收对话 | `01a0065d-ce1c-7f11-94d8-56b91f062cf8` | `TEST-SYSTEM-07B` blocked，等待正式前端与 UI 终验通过 |

## 3. 规划接力队列

| FIFO | 任务 | 来源 | 状态 | 当前动作 |
| ---: | --- | --- | --- | --- |
| 221 | `FRONT-SYSTEM-07B` Rev 1 正式优化候选与离线评测页面 | 规划 → 前端 | `active` | 已完成权限握手并进入 in_progress；消费冻结 UI/正式 API，实现稳定身份、unknown 只读恢复、双视口与焦点；不进入 Wave C |
| 220 | `BACK-SYSTEM-07B` Rev 2 候选决定 unknown 只读恢复 | 规划 → 后端 | `closed` | 规划静态交叉审核与双构建通过；不可变 decisionId GET 关闭唯一缺口 |
| 219 | `UI-SYSTEM-07B` Rev 2 候选主链可操作微返工 | UI → 规划 | `closed` | 规划复审 P0/P1/P2/P3=0；正式视觉与交互冻结 |
| 218 | `BACK-SYSTEM-07B` Rev 1 零网络优化、候选与离线评测 | 后端 → 规划 | `closed` | 主体通过；唯一 unknown 只读恢复缺口转 FIFO220 |
| 217 | `UI-SYSTEM-07B` Rev 1 候选与评测交互设计 | UI → 规划 | `closed` | 规划交叉审核 disposition=fix；同源唯一 P1 转 FIFO219 |
| 216 | `TEST-SYSTEM-07A` Rev 1 正式纵向集成与关闭门 | 测试 → 规划接管 | `closed` | 正式浏览器、37 files / 347 tests 完整质量门、隔离库清理与 PostgreSQL 停止通过 |
| 215 | `FRONT-SYSTEM-07A` Rev 1 正式策略与学习 Wave A 页面 | 前端 → 规划接管 | `closed` | 正式 `/strategy`、不可变基线继承、双视口/焦点与前端 56/56 通过 |
| 214 | `BACK-SYSTEM-07A` Rev 2 安全事件与页面契约集中返工 | 规划 → 后端 | `closed` | 四域正式写链、业务差量/权威证据、cue-id 轨道、purpose/module/轻量版本列表通过；规划复验 5/5 + 双构建 |
| 213 | `BACK-SYSTEM-07A` Rev 1 事件安全投影与不可变策略版本库 | 规划 → 后端 | `closed` | 主体完成；同源审计项由 FIFO214 一次性关闭 |
| 212 | `UI-SYSTEM-07` Rev 1 策略与学习中心 Wave A 设计 | UI → 规划接管 | `closed` | DESIGN 5.16、验收、原型、双视口、焦点与恢复通过 |
| 210 | `TEST-SYSTEM-06` Rev 1 独立运行可观测性纵向集成 | 规划 → 测试/规划接管 | `closed` | 11/11 + 12/12、两站隔离、UI 矩阵与完整 35 files / 335 tests 通过 |
| 211 | `PLAN-SYSTEM-07` Rev 1 策略与学习中心三波边界 | 规划 → 用户 | `closed` | 用户已确认推荐三波顺序；Wave A 解锁 |
| 209 | `FRONT-SYSTEM-06C` Rev 1 正式 React 同状态 UI 终验 | UI → 规划接管 | `closed` | production/Fastify/隔离库完整矩阵 P0/P1/P2/P3=0；页面级恢复所有权已收口 |
| 208 | `FRONT-SYSTEM-06C` Rev 1 正式运行环境与统一日志页面 | 规划接管 | `closed` | 正式双页、48/48、typecheck/build、Impeccable [] 与 diff-check 通过 |
| 207 | `BACK-SYSTEM-06B` Rev 2 历史 Attempt 事实微返工 | 规划 → 后端 | `closed` | 规划新鲜复验专项 6/6、backend build、diff-check 通过 |
| 206 | `BACK-SYSTEM-06B` Rev 1 跨领域运行记录列表与详情 | 规划 → 后端 | `closed` | 主体与历史 Attempt 独立投影已通过；同源残余合并 FIFO207 |
| 205 | `BACK-SYSTEM-06A` Rev 2 运行资源权威投影定向返工 | 规划 → 后端 | `closed` | Provider 受控目录、当前配置与最近吞吐已通过规划复验 |
| 204 | `BACK-SYSTEM-06A` Rev 1 运行资源与受控遥测只读 API | 规划 → 后端 | `closed` | 专项通过但独立审核发现三项同源数据契约缺口，合并进入 FIFO205 |
| 203 | `UI-SYSTEM-06` Rev 1 `/servers` 与 `/logs` 正式交互设计 | UI → 规划接管 | `closed` | DESIGN 5.15、验收文档、同壳原型、1440/1024、失败恢复与 CNY 横切通过 |
| 202 | `PLAN-SYSTEM-06` Rev 1 服务器/Worker 运行详情与日志追踪切片 | 规划 → 用户 | `closed` | 用户确认推荐范围；启动包、职责矩阵与 `INT-12` 已同步，开发依赖门已建立 |
| 201 | `BACK-SYSTEM-04D` Rev 1 人民币换算快照与 CNY-only 预算账本 | 规划 → 后端 | `closed` | 后端、管理员正式页面、双视口与完整 32 files / 318 tests 已通过；本地 PostgreSQL 已停止 |

## 4. 活跃任务板

| ID | Rev | Owner | Current actor | Reviewer | Status | Goal | Boundary / Next |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `PLAN-SYSTEM-06` | 1 | 规划对话 | — | 用户 | `done` | 冻结服务器/Worker/队列/存储运行详情与日志追踪 | `SYSTEM-runtime-observability.md`、职责矩阵与 `INT-11/12/13/15/17` 已同步 |
| `PLAN-SYSTEM-07` | 1 | 规划对话 | — | 用户 | `done` | 冻结策略与学习中心、人工事件安全投影、版本/候选/评测/发布边界 | 用户已确认；Wave A 解锁 |
| `UI-SYSTEM-07` | 1 | UI 设计对话 | — | 规划对话 | `done` | 冻结 `/strategy` Wave A 正式页面与完整模块后置边界 | 规划接管完成；DESIGN/UI验收/原型/双视口/焦点和恢复均通过 |
| `BACK-SYSTEM-07A` | 2 | 后端开发对话 | — | 规划对话 | `done` | 建立人工事件安全投影与五类不可变策略草稿版本 | 四域正式写链、业务差量、权威证据、轻量列表和权限幂等已通过规划独立复验 |
| `FRONT-SYSTEM-07A` | 1 | 前端开发对话 | — | 规划对话 | `done` | 实现正式 `/strategy` Wave A | 正式页面、版本基线完整继承、56/56 与浏览器矩阵通过 |
| `TEST-SYSTEM-07A` | 1 | 全链测试与质量验收对话 | — | 规划对话 | `done` | 独立验证事件投影、策略版本、权限与两站隔离 | 规划接管关闭；完整 37 files / 347 tests、四构建和清理通过 |
| `UI-SYSTEM-07B` | 2 | UI 设计对话 | — | 规划对话 | `done` | 冻结优化运行、候选与离线评测正式交互 | 候选身份/四类动作/恢复/unknown/冲突/焦点与最小证据已通过规划复审 |
| `BACK-SYSTEM-07B` | 2 | 后端开发对话 | — | 规划对话 | `done` | 建立零网络优化/候选/评测权威后端 | decisionId 不可变结果 GET、权限/404/零写副作用与双构建通过规划微审 |
| `FRONT-SYSTEM-07B` | 1 | 前端开发对话 | 前端开发对话 | UI 设计对话 | `in_progress` | 实现正式候选与评测页面 | UI/BACK 双依赖已关闭；已完成 permission_ok，正在既有 `/strategy` 增量实现 Wave B |
| `TEST-SYSTEM-07B` | 1 | 全链测试与质量验收对话 | — | 规划对话 | `blocked` | 独立验证 Wave B 权限、运行恢复、候选与评测 | 等正式前端/UI 通过 |
| `UI-SYSTEM-06` | 1 | UI 设计对话 | — | 规划对话 | `done` | 冻结 `/servers` 与 `/logs` 正式信息架构、状态和双视口 | 规划接管同一 Rev 完成；不显示工程注释、伪遥测或运行写控制 |
| `BACK-SYSTEM-06A` | 2 | 后端开发对话 | — | 规划对话 | `done` | 建立运行资源、领域运行汇总与受控遥测 Provider 只读链 | 受控目录、active 配置、24h 吞吐、权限、unknown/not_configured 与零写副作用已通过规划复验 |
| `BACK-SYSTEM-06B` | 2 | 后端开发对话 | — | 规划对话 | `done` | 建立跨领域运行记录列表与详情 | PostgreSQL 单一投影、历史 Attempt、CNY/原币审计、权限/分页/脱敏已通过规划复验 |
| `FRONT-SYSTEM-06C` | 1 | 前端开发对话 | — | 规划对话 | `done` | 实现正式 `/servers` 与 `/logs` 页面 | FIFO209 正式同状态终验通过；不重开设计 |
| `TEST-SYSTEM-06` | 1 | 全链测试与质量验收对话 | — | 规划对话 | `done` | 独立验证运行详情、日志追踪、权限与两站隔离 | 固定任务只读后规划接管；报告、完整质量门与清理均通过 |
| `FRONT-M3-05B` | 3 | 前端开发对话 | — | 规划对话 | `done` | 方案 A 正式 React 字幕验收工作台 | S5 正式前端已关闭；随 S7 正式页面统一做最终同状态 UI 终验 |
| `PLAN-M3-07` | 1 | 规划对话 | — | 用户 | `done` | 冻结 S5→S7 一站式交付与空画面字规则 | 权威合同 `M3-delivery-product-workflow.md`、`INT-08` 与职责矩阵已同步 |
| `UI-M3-07` | 2 | UI 设计对话 | — | 用户 | `done` | 完整交付确认、生成转场、产品详情与全局产品库 | 用户已确认；生产实现必须保持同状态、同视口一致性 |
| `BACK-M3-07A` | 3 | 后端开发对话 | — | 规划对话 | `done` | S7 交付产品权威后端 | 开发入口共享 Storage/Worker、异步生成、恢复、不可变文件与列表详情均通过规划审核 |
| `FRONT-M3-07B` | 3 | 前端开发对话 | — | 规划对话 | `done` | S7 正式 React 确认页、生成转场、产品库与详情 | FIFO 143 六场景与完整 `pnpm check` 关闭门通过；S7 正式关闭 |
| `BACK-M3-05D` | 1 | 后端开发对话 | — | 规划对话 | `done` | S5 局部返工合法请求真实 500 根因修复 | 自定义 enum[] 响应投影与短理由可分类错误均已关闭；迁移/契约/S7 未改 |
| `TEST-S6-01` | 1 | 全链测试与质量验收对话 | — | 规划对话 | `done` | 首批 1、14、26 集的 S6 单剧全链测试 | 逐套件隔离后端 109/109、前端 114/114、静态检查与双视口证据通过；P0/P1/P2=0，数据库、端口和临时输出已精确清理 |
| `TEST-S6-02` | 3 | 全链测试与质量验收对话 | — | 规划对话 | `done` | 定向复验真实素材冒烟发现的两项 P1 | 两项 QA、真实素材冒烟、流畅性、A/B 隔离和交付下载全部通过；隔离库/服务/临时对象已清理 |
| `BACK-S6-02A` | 1 | 后端开发对话 | — | 规划对话 | `done` | 清除 S5 旧发布写路径并修复项目列表线格式分页契约 | 旧写契约/路由/service/repository 已删除；S7 唯一写入与真实查询字符串回归通过 |
| `FRONT-S6-02B` | 1 | 前端开发对话 | — | 规划对话 | `done` | 删除 S5 独立发布的前端死 API/测试分支 | 旧前端死路径已归零；保留 Release 历史 GET 与“前往交付确认”唯一入口；专项/类型/构建通过 |
| `FRONT-S6-03A` | 1 | 前端开发对话 | — | 规划对话 | `done` | 无行为拆分字幕验收巨型 TSX/CSS | 规划独立核对职责与状态所有者，并新鲜复验字幕 18/18、全部前端 114/114、typecheck/build/diff-check；无旧路径、第二状态源或有意行为/视觉差异 |
| `UI-SYSTEM-01` | 2 | UI 设计对话 | — | 用户 | `done` | 用户确认 ControlShell 最终方向 | 用户已确认；最终预览、九入口、状态、响应式与生产表达边界正式冻结 |
| `PLAN-SYSTEM-02` | 1 | 规划对话 | — | 用户 | `done` | 冻结真实运行总览纵向切片 | `SYSTEM-control-shell-runtime.md`、职责矩阵及 `INT-12/13` 已同步；先后端、再前端、后测试 |
| `BACK-SYSTEM-02A` | 2 | 后端开发对话 | — | 规划对话 | `done` | 建立独立管理 API 权限域与四资源池真实总览 | 逐请求默认拒绝权限、有界 24h SQL 聚合、精确费用、四池/脱敏/未知语义均通过；真实 Access JWT 与外部资源后置 |
| `FRONT-SYSTEM-02B` | 2 | 前端开发对话 | — | 规划对话 | `done` | 修正正式 ControlShell 1024 主区与趋势适配 | FIFO 164 三场景与完整 `pnpm check` 26 文件 245 项通过；两站构建全部通过 |
| `BACK-SYSTEM-02C` | 1 | 后端开发对话 | — | 规划对话 | `done` | 修正 PostgreSQL 后台断连导致 Fastify 退出 | 规划新鲜复验专项 5/5：中央 pool 安全接管，真实断连时稳定 500/requestId，恢复后同一 app 200；未改聚合、权限、Worker 或迁移 |
| `TEST-SYSTEM-02` | 1 | 全链测试与质量验收对话 | — | 规划对话 | `done` | 验证管理权限域、真实总览与两站隔离 | 报告/证据与规划侧 11/11 回归通过；P0/P1/P2/P3=0，SYSTEM-02 正式关闭 |
| `PLAN-SYSTEM-03` | 1 | 规划对话 | — | 用户 | `done` | 冻结引擎/API 与安全配置发布纵向切片 | 用户已确认一项里程碑两波交付；合同、职责、INT-11、依赖与授权门已同步 |
| `UI-SYSTEM-03` | 2 | UI 设计对话 | — | 规划对话 | `done` | 冻结引擎/API、路由与安全发布正式交互 | 唯一 ControlShell 方向、功能等价、双视口和高风险交互已通过规划验收 |
| `BACK-SYSTEM-03A` | 4 | 后端开发对话 | — | 规划对话 | `done` | Wave A 部署、不可变版本、Secret 引用与连接测试 | 服务端 Secret resolver、有界版本历史、零网络测试 Worker 与运行总览时间事实已关闭 |
| `BACK-SYSTEM-03B` | 2 | 后端开发对话 | — | 规划对话 | `done` | Wave B 唯一 active、命令恢复与新任务版本隔离 | 规划独立复验通过；迁移零业务 bootstrap、无 active 阻断、全局命令身份、发布回滚与新任务固定版本均成立 |
| `BACK-SYSTEM-03D` | 2 | 后端开发对话 | — | 规划对话 | `done` | 补齐部署启停保护、路由审计读取与稳定命令并发身份闭环 | FIFO 176 已通过隔离微审；后端 SYSTEM-03 进入冻结等待前端/集成验收 |
| `FRONT-SYSTEM-03C` | 5 | 前端开发对话 | — | 规划对话 | `done` | 正式三个管理页面功能等价与可靠异步闭环 | FIFO 179 完整矩阵与 FIFO 183 三项微复验均通过；生产前端冻结，等待全链测试 |
| `TEST-SYSTEM-03` | 1 | 全链测试与质量验收对话 | — | 规划对话 | `done` | 独立验证版本、连接测试、发布回滚与新旧任务隔离 | FIFO 184 报告和证据已通过规划核对，P0/P1/P2/P3=0；生产链冻结 |
| `BACK-SYSTEM-03E` | 1 | 后端开发对话 | — | 规划对话 | `done` | 让旧 Dispatch 回归显式建立 SYSTEM-03 后置 active 路由事实 | FIFO 185 与完整关闭门通过；只改测试夹具，无生产代码、契约、迁移或路由语义变化 |
| `PLAN-SYSTEM-04` | 1 | 规划对话 | — | 规划对话（用户本轮全权续接授权） | `done` | 冻结预算、限额与付费调用安全门 | `SYSTEM-budget-guardrails.md`、职责矩阵与 `INT-15` 已同步；不包含真实付费/API/Secret/云资源 |
| `UI-SYSTEM-04` | 1 | UI 设计对话 | — | 规划对话 | `done` | 冻结 `/budgets` 正式状态、双视口与高风险发布交互 | DESIGN 5.13、验收、同壳原型和证据通过规划审核；P0/P1/P2/P3=0，生产代码/contracts/迁移修改 0 |
| `BACK-SYSTEM-04A` | 2 | 后端开发对话 | — | 规划对话 | `done` | 修正预算专项与既有后端专项的顺序无关隔离 | FIFO188 已由规划双顺序独立复验关闭；预算专项使用临时库，不再污染共享默认库 |
| `BACK-SYSTEM-04C` | 1 | 后端开发对话 | — | 规划对话 | `done` | 统一历史预算回滚的状态机与真实成功链 | 规划独立复验预算专项 10/10、构建与差量通过；不增加兼容路径、fallback 或第二状态源 |
| `FRONT-SYSTEM-04B` | 3 | 前端开发对话 | — | 规划对话 | `done` | 发布确认安全事实与生产措辞集中收口 | FIFO194 正式变化场景终验 P0/P1/P2/P3=`0/0/0/0`；生产前端冻结 |
| `TEST-SYSTEM-04` | 1 | 全链测试与质量验收对话 | — | 规划对话 | `done` | 独立验证预算安全门与两站隔离 | FIFO195 报告/脱敏 evidence、隔离清理与完整关闭门均通过；SYSTEM-04 正式关闭 |
| `PLAN-SYSTEM-05` | 1 | 规划对话 | — | 规划对话（用户全权续接授权） | `done` | 冻结密钥与安全引用及真实供应商接入准备 | `SYSTEM-secret-security-readiness.md`、职责矩阵与 `INT-16` 已同步；不含真实 Secret/网络/付费/部署 |
| `UI-SYSTEM-05` | 1 | UI 设计对话 | — | 规划对话 | `done` | 冻结 `/security` 正式状态、双视口与高风险交互 | 规划接管同一中间态完成；1440/1024、三项确定失败、撤销焦点闭环与 console 0/0 通过 |
| `BACK-SYSTEM-05A` | 2 | 后端开发对话 | — | 规划对话 | `done` | 建立 Secret 引用版本、零网络验证、轮换/撤销保护与正式前端读取闭环 | FIFO198 已关闭；未验证不可绑定、服务端正式读取、命令恢复、90 天提示和撤销竞态均通过独立复验 |
| `FRONT-SYSTEM-05B` | 1 | 前端开发对话 | — | 规划对话 | `done` | 在独立 `system-frontend` 实现 `/security` 正式页面 | 正式 Fastify/React、前端 43/43、完整 313/313、双视口与失败恢复均通过；SYSTEM-05 已关闭 |
| `TEST-SYSTEM-05` | 1 | 全链测试与质量验收对话 | — | 规划对话 | `done` | 独立验证 Secret 引用、引擎绑定、权限和两站隔离 | 固定任务 read-only 后由规划同范围接管；报告、正式 HTTP、隔离竞态、完整质量门和清理事实均通过 |
| `PLAN-SYSTEM-04CNY` | 1 | 规划对话 | — | 用户 | `done` | 冻结全站人民币成本归一与原币种审计边界 | `SYSTEM-cny-cost-normalization.md`、职责矩阵与 `INT-17` 已同步；真实汇率网络另行授权 |
| `BACK-SYSTEM-04D` | 1 | 后端开发对话 | — | 规划对话 | `done` | 外币报价权威换算为 CNY 并进入唯一预算账本 | 新策略仅 CNY；CNY 原生无汇率依赖，外币固定不可变快照；原币只保留审计 |
| `FRONT-SYSTEM-04E` | 1 | 前端开发对话 | — | 规划对话 | `done` | 管理员费用、预算、趋势与报表统一人民币主显示 | 正式页面只创建/汇总 CNY 规则；1440/1024、表格与弹窗无横溢，浏览器不换算 |
| `TEST-SYSTEM-04CNY` | 1 | 全链测试与质量验收对话 | — | 规划对话 | `done` | 独立验证 CNY 归一、过期阻断、未知不补零和两站隔离 | 规划接管完成 32 files / 318 tests、双视口与受控错误态；真实汇率/付费不在范围 |

## 5. PLAN-M3-07 冻结结论

1. `/projects/:projectId/subtitle-acceptance` 只负责双轨看片修改、问题、通过、返工和整剧交付就绪；预检成功后的唯一下一步为“前往交付确认”。
2. `/projects/:projectId/deliveries/confirm?sessionId=...` 是独立完整页面，核对产品名、负责人、备注、来源版本、通过/阻断集数和三类文件摘要；不编辑正文。
3. 一次幂等命令以稳定 `deliveryId` 原子固定 `AcceptanceRelease + DeliveryProduct + DeliveryManifest`，再生成对象；网络未知只 GET 同一产品。
4. 每集固定生成台词 SRT 与画面字 SRT；没有画面字时生成 UTF-8 BOM 合法空 SRT，并标记“空轨文件 / 0 条”；全剧另生成一个绑定版本的术语 XLSX。
5. 生成成功页提供“立即进入产品详情”和可取消的短倒计时自动进入；成功标题获得焦点，倒计时不抢键盘焦点。
6. `/deliveries` 是全局独立产品库，与项目中心/任务中心同级。服务端搜索、状态筛选、创建/更新时间排序和稳定分页；行主操作只“查看详情”。
7. `/deliveries/:deliveryId` 展示三类文件树、下载、来源版本、负责人、备注、创建/更新时间、requestId 和历史事件。文件不可编辑；内容修改须创建 V2。
8. 首版不自动上传甲方总库、不加管理员批准、不接真实云资源；管理员控制台后续读取用量/配置与外部上传状态，但不替代员工产品库。

精确输入：

- `docs/contracts/M3-delivery-product-workflow.md`
- `docs/contracts/MODULE_INTEGRATION_CONTRACTS.md` 的 `INT-08`
- `docs/contracts/MODULE_RESPONSIBILITY_MATRIX.md` 的 S5/S7 行
- `DESIGN.md` 2.1、2.2、5.8、5.9
- `docs/milestones/M3-internal-workbench-sprint.md`
- `docs/milestones/PRODUCT_ROADMAP.md`

## 6. FRONT-M3-05B 关闭结论

1. 方案 A 三栏、双轨新增/编辑/剪贴、问题、返工、同步预检、历史只读和唯一“前往交付确认”入口均已进入正式 React；S5 不再提供员工可见发布、冻结或下载。
2. 9:16 `contain` 播放、上下双安全区、成熟播放器控件和诚实 `±40 ms` 已落地；会话/剧集/Asset 变化清媒体，字幕 revision 变化保留当前播放，旧授权响应按 token/媒体/revision 拒绝。
3. 模态内输入、按钮、焦点闭环正常；遮罩后编辑与媒体快捷键零副作用。规划新鲜复验字幕专项 18/18、typecheck、Vite build、Impeccable detector `[]` 和 diff-check 通过。
4. 既有 1440/1024 浏览器证据和 S7 联合终验均通过；完整 `pnpm check` 为 24 文件 233 项，S5/S7 已正式关闭。
5. `FRONT-S6-03A Rev 1` 已完成无行为 cleanup：原 `SubtitleAcceptanceWorkspace.tsx` 1633 行（领取时）拆为 762 行控制器与多个职责文件；原 967 行 CSS 拆为 shell 487、媒体 272、编辑 181、弹窗 123 行，所有手写生产 TS/TSX/CSS 文件均 ≤800 行。状态、副作用和服务端权威仍由原工作台控制器持有；无有意 DOM、ARIA、testid、焦点、快捷键、API/query key、视觉比例或响应式差异。

## 7. ControlShell 已确认基线

1. 唯一方向为冷灰白主画布、深石墨蓝侧栏与系统运行带、`#4458D8` 主要动作；科技感来自实时状态与精确数据，不使用霓虹/玻璃拟态/营销大屏。
2. 系统总览必须保留顶部环境/刷新/待发布变化/搜索/告警，四资源池运行带，运行指标、三类趋势、异常队列、待发布配置和最近审计；允许响应式改排，不允许删功能。
3. 四个首版资源池为 ASR API、OCR API、OCR 自建 Worker、交付生成；视频转码启用后作为独立资源池。
4. 每个数值、状态和操作都必须有真实权威来源；无数据时显示加载/空/失败/未知/未启用，不把匿名示例带入生产。
5. UI 除总览外必须统一给出引擎/API、路由调度、日志用量、服务器/Worker、高风险配置发布五个详情方向；正式前端通过同状态、同视口一致性门。

## 8. 授权与停止边界

已长期授权：项目内本地编辑、状态/日志写回、非破坏性测试、规划审核、固定任务自动唤醒与送达确认。
仍需单独授权：购买、真实付费 API、云资源、服务器、部署、Git 提交/推送、对外发送、破坏性操作和真实业务数据导入。
基础设施错误必须分流为 `provider_blocked`、`approval_route_blocked`、`executor_blocked` 或 `permission_blocked`，不得记成业务失败。

## 9. v4.8 写回规则

- CURRENT 只替换当前事实，目标不超过 160 行；过程只写开发日志。
- 跨角色交接只发规划总线指定接收者；测试与返工角色之间也必须经规划回流。先写状态/日志，再主动唤醒并确认送达与运行态。
- 固定角色唤醒只认 Codex 固定任务消息产生的新 turn/明确回执；内部子代理活动、共享文件变化和工具调用成功不算送达证据。
- 每个纵向切片只做一次完整浏览器矩阵；微返工只复验变化场景，冻结既有通过证据。
