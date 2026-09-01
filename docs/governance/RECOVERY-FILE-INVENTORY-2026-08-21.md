# 恢复文件统一清单｜2026-08-21

状态：五角色只读分类完成，规划已完成第一轮冲突裁决；员工素材静态 canary 已作为测试服务器例外发布，当前业务执行租约为 0。

适用协议：`WORKFLOW v6.2`；权限代际：`authority_generation=4`；初始分类输入快照：`CURRENT v4-900`；最新收口：`CURRENT v4-915`。

本清单是保留与复验顺序，不是可直接合并、发布或部署的补丁清单。任何类别都不授权删除、回退、提交、部署或服务器写入。

## 1. 分类裁决规则

同一文件只归一类，发生重叠时按以下顺序裁决：

1. 含素材文件夹、上传恢复或暂停/继续在途逻辑的完整文件，优先归 C；
2. 同时承载多个阶段、无法安全拆分或缺少源码 SHA/manifest 的文件归 D；
3. 仅承载服务器 v4896 已运行能力的文件归 B；
4. 有 v4-849 验收或冻结证据、且未被 B/C/D 覆盖的文件归 A；
5. 仅明显无业务含义的孤立残留归 E。

目录前缀只覆盖下列明确列出的文件；未明确列出或证据冲突的当前脏文件默认归 D。A、B 均是“应保留”，不是“当前工作树已重新验收”。

## 2. A｜v4-849 / SYSTEM-09 可信验收基线

### 证据锚点

- `docs/testing/M3-unified-task-center-integration-report.md`
- `docs/testing/SYSTEM-*-integration-report.md`
- `C:\Users\ComradeGu\Documents\七猫兼职\qa-evidence-fifo250\`
- `C:\Users\ComradeGu\Documents\七猫兼职\qa-evidence-fifo265\`
- `C:\Users\ComradeGu\Documents\七猫兼职\qa-evidence-fifo282\`
- `C:\Users\ComradeGu\Documents\七猫兼职\qa-evidence-fifo311\`

### 当前文件保留集

- `backend/migrations/17549760*.cjs`（当前 37 项；包含尚未提交但已被 v4-849 全迁移门覆盖的迁移）
- `backend/src/modules/{asr,deliveries,feedback,materials,pre-review,projects,screen-text,subtitle-acceptance,system-control,tasks,terms}/**`，但凡下文 B/C/D 精确列出的文件除外
- v4-849 对应且未被 B/C/D 覆盖的 `backend/src/workers/**`
- `packages/contracts/src/{asr,deliveries,materials,pre-review,projects,screen-text,subtitle-acceptance,system-control*,tasks,terms,recycle}.ts`
- `system-frontend/**`
- `frontend/src/features/{deliveries,feedback,subtitle-acceptance,tasks}/**`
- `frontend/src/modules.ts`
- `tests/backend/{material-assets,materials,recycle,terms}.test.ts`
- `tests/frontend/{AsrWorkspace,ProjectMaterials,RecycleBin,TermsWorkspace}.test.tsx`
- `tests/frontend/system-control-*.test.tsx`
- `tests/{README.md,setup.ts,repository/skeleton.test.ts}`
- `DESIGN.md` 与 `docs/ui/**`，但 `docs/ui/M2-material-pairing-acceptance.md` 除外

注意：v4-849 没有对应 Git 提交和逐文件 SHA。A 是最后完整验收的逻辑基线；重新形成可提交基线前仍需逐批新鲜复验。

## 3. B｜服务器 v4896 运行保留集

### 后端与合同

- `backend/src/modules/access/**`
- `backend/src/modules/employee-auth/**`
- `backend/src/modules/storage/filesystem-storage.ts`
- `backend/src/modules/uploads/upload-storage.ts`
- `packages/contracts/src/employee-auth.ts`
- `tests/backend/{cloudflare-access,employee-auth,filesystem-storage}.test.ts`

### 员工前端

- `frontend/src/features/employee-auth/**`
- `frontend/src/platform/employeeApi.ts`
- `frontend/src/platform/randomUuid.ts`
- `frontend/src/main.tsx`
- `frontend/src/features/asr/model.ts`
- `frontend/src/features/materials/ProjectMaterials.tsx`
- `frontend/src/features/pre-review/{PreReviewWorkspace.tsx,model.ts}`
- `frontend/src/features/projects/{ProjectCenter.tsx,api.ts}`
- `frontend/src/features/recycle/RecycleBin.tsx`
- `frontend/src/features/screen-text/ScreenTextWorkspace.tsx`
- `frontend/src/features/terms/{TermsPanels.tsx,TermsWorkspace.tsx}`
- `tests/frontend/{employeeSession.test.tsx,randomUuid.test.ts,ProjectCenter.test.tsx}`

### 服务器运行资产与事实

- `deploy/debian/htpdate/**`
- `deploy/debian/nginx/{qimao-loopback.conf,qimao-public-test.conf,qimao-proxy-headers.conf}`
- `deploy/debian/postgresql/qimao-test.conf`
- `deploy/debian/systemd/qimao-backend.service`
- `docs/deployment/TEST-SERVER-COLLABORATION.md`
- `docs/testing/TEST-SERVER-ISSUES.md`

保留事实：服务器 release `20260821-employee-session-v4896` 继续运行；Worker 与真实 ASR/OCR 未启动。B 缺少服务器 release 的完整源码 manifest/SHA，因此只能作为运行保留层，不可单独重建发布包。

## 4. C｜素材文件夹与上传恢复隔离集

- `backend/src/modules/uploads/upload.repository.ts`
- `packages/contracts/src/uploads.ts`
- `frontend/src/features/uploads/{file-selection.ts,UploadQueue.module.css,api.ts,model.ts,sha256.ts,UploadQueue.tsx}`
- `tests/frontend/material-folder-flow.test.tsx`
- `tests/frontend/UploadQueue.test.tsx`
- `docs/ui/M2-material-pairing-acceptance.md`
- `docs/testing/{S6-end-to-end-acceptance.md,S6-end-to-end-report.md,S6-real-material-smoke-acceptance.md,S6-real-material-smoke-report.md}`
- `C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a0065d-ce1c-7f11-94d8-56b91f062cf8\s6-*`

C 整体保留但不得部署。已知至少包含跨项目 P0、命令身份丢失、错误终态继续、暂停收口与重复执行等风险；UI 文档仅冻结交互，BACK 精确合同尚未完成。

## 5. D｜待证明或多阶段混合集

### 共享接线与构建配置

- `backend/src/{app.ts,server.ts,types/fastify.d.ts}`
- `backend/package.json`
- `packages/contracts/{package.json,tsconfig.build.json}`
- `packages/contracts/src/index.ts`
- 根 `package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`
- `backend/src/modules/uploads/upload.routes.ts`
- `tests/backend/uploads.test.ts`
- `frontend/{index.html,package.json}`
- `frontend/src/{App.tsx,components/AppShell.tsx,components/AppShell.module.css}`
- `frontend/src/features/asr-dispatch/AsrProjectDispatch.tsx`

### 当前改动但历史报告不能证明现状的测试

- `tests/backend/{asr-dispatch-rev2,asr,pre-review,projects,screen-text,subtitle-acceptance}.test.ts`
- `tests/frontend/{AsrDispatches,PreReviewWorkspace,ScreenTextWorkspace}.test.tsx`
- 当前新增且没有与本工作树 commit/SHA 绑定的 `tests/backend/{deliveries,screen-text-local-ocr-sidecar,system-control-*,tasks}.test.ts`
- 当前新增且没有与本工作树 commit/SHA 绑定的 `tests/frontend/{deliveries,feedback,subtitle-acceptance,tasks}.test.*`
- `tests/performance/**`
- `C:\Users\ComradeGu\Documents\七猫兼职\qa-evidence-fifo309\`

### 尚未被现网证明的部署与运维资产

- `deploy/debian/{bin/**,env/backend.env.example,logrotate/qimao-terms-cloud,nginx/qimao-backend.conf,nginx/qimao-sites.conf,systemd/qimao-worker@.service}`
- `docs/deployment/{BACKEND-LINUX-RUNTIME.md,FRONTEND-STATIC-DELIVERY.md,TEST-SERVER-HANDOFF-CHECKLIST.md,TEST-SERVER-ONE-DAY-RUNBOOK.md,TEST-SERVER-PREPARATION-CHECKLIST.md,archive/**}`
- `docs/testing/{TEST-SERVER-CAPACITY-ACCEPTANCE.md,TEST-SERVER-PERFORMANCE-PLAN.md}`

`tests/backend/upload-command-recovery.test.ts` 当前不存在；相关断言混入 `tests/backend/uploads.test.ts`。不得按旧租约名称假定交付文件已经形成。

## 6. E｜明显临时残留候选

- 仓库根 `c.end())`
- 仓库根 `{console.error(e)`

两者当前均为 0 字节，只登记为候选。本轮不删除，也不将其纳入任何提交。

## 7. 关键冲突裁决

1. `UploadQueue.tsx` 同时有 v4896 UUID 适配和素材文件夹在途逻辑，整文件归 C。后续仅其通过 20/20 定向回归、frontend typecheck/build 的构建产物获得测试服务器静态 canary 例外；源码分类仍为 C，不因此成为可提交基线或全局解锁。
2. `upload.routes.ts`、`uploads.test.ts` 同时承载 filesystem 运行能力与在途恢复逻辑，归 D；后续必须先拆 provenance，再决定保留片段。
3. `App.tsx`、`AppShell*` 同时承载 v4-849 壳层与 v4896 session/logout，归 D；不得从 A 或 B 任一侧整文件覆盖。
4. SYSTEM-09 报告证明当时 46 files / 447 tests 全绿，但其中多个当前测试文件已修改；历史报告不能证明当前工作树。
5. S6 报告只证明当时素材快照；当前 C/D 代码未重跑，不能据此宣称问题关闭。
6. UI 正式验收文档与原型目录必须按叶级证据保留；原型不等于生产实现。
7. CURRENT、服务器看板、问题台账和证据路径含内部运行信息，不得原样推送到公开 GitHub。

## 8. 推荐恢复基线与顺序

推荐的新逻辑基线为：`A + B`，但不是立即提交的物理文件集合。

恢复顺序固定为：

1. 保持服务器 v4896 不动；
2. 保留 A 的验收事实和 B 的运行事实；
3. C 原样隔离，禁止部署；
4. 先审 D 中共享接线文件的 provenance，再分批签发 BACK/FRONT/TEST 精确租约；
5. 每一批都以新鲜测试和构建形成可提交证据；
6. E 继续保留，待用户另行确认是否清理；
7. 在用户确认恢复路线前，五个 G3 角色继续 registered/idle，execution lease=0。

## 9. 下一用户决策门

用户只需确认是否采用以下路线：以 `v4-849 验收事实 + v4896 运行保留层` 为恢复基线，保留 C 供后续修复，先从 D 的共享接线与发布 provenance 审计开始，不执行回退、删除或服务器变更。

## 10. Provenance 审计结果

用户已确认上述路线。BACK、FRONT、SERVER 随后完成两轮严格只读取证，结论如下。

### 10.1 BACK 共享接线

- 可定位为 A 的差量：`pnpm-workspace.yaml` 的 system-frontend 工作区、相应锁文件片段，以及 `backend/src/app.ts` 中 Delivery/System-control 注册片段。
- 可定位为 B 的差量：`backend/src/app.ts` 中员工 session/access 开关。
- 可定位为 C 的差量：`upload.routes.ts` 的稳定 command GET，以及 `uploads.test.ts` 的同身份恢复/跨项目隔离断言。
- `app.ts`、`server.ts`、`fastify.d.ts`、`upload.routes.ts`、`uploads.test.ts`、`contracts/src/index.ts` 均为不可并行整文件处理的混合文件。
- contracts runtime/build 配置晚于 v4-849，且缺少发布 manifest 绑定，继续标为 Unknown；不得因服务器能启动就反推全部源码来源。

### 10.2 FRONT 共享壳层

- `UploadQueue.tsx`、`UploadQueue.module.css`、`UploadQueue.test.tsx` 继续整文件归 C。
- `App.tsx`、`AppShell.tsx`、`AppShell.module.css`、`AsrProjectDispatch.tsx` 混合 A 壳层与 B session/logout/UUID，继续标为 Unknown。
- `frontend/index.html` 的 favicon 与 `frontend/package.json` 的构建接线没有 A/B/C 证据锚点，继续标为 Unknown。
- 在 C 获准修复前，不得用当前 `UploadQueue.tsx` 重建或覆盖 v4896 员工静态站。

### 10.3 SERVER v4896 只读快照

- `/opt/qimao-terms-cloud/current` 精确解析到 `/opt/qimao-terms-cloud/releases/20260821-employee-session-v4896`；目录为 `qimao:qimao 0750`。
- v4896 release 有 10,304 个普通文件；`frontend-v4896` 与 `system-frontend-v4880` 各 4 个普通文件。
- 远端没有 `SHA256SUMS`、常见 checksum 文件或 manifest JSON，无法建立不可变发布清单。
- 本轮只读快照摘要：`backend/dist` 387 文件聚合 `22532061…5f64951e`；`frontend-v4896` 聚合 `c337db2a…07ed51757`；`system-frontend-v4880` 聚合 `b766723b…c7724a53`。
- 这些摘要只证明远端当前快照，不是签名发布清单，也不能反推本地源码；本轮未读 env、Secret、日志、数据库或认证材料，服务器写入 0。

## 11. 规划裁决

1. 不从服务器复制源码、dist 或静态文件回本地，也不把远端快照当 Git 基线。
2. 不再尝试构造一个虚假的“v4-849 commit”或“v4896 source commit”。
3. 当前工作树原样保留；恢复方式改为按依赖顺序对小批物理文件做新鲜复验和来源确认。
4. 第一批只验证构建/runtime 共享接线和 A+B 最小链，不触碰 C，也不启动功能修复。
5. TEST 先只读设计最小批次、命令、通过门和失败分流；规划审核后再决定是否签发测试执行租约。

## 12. TEST 设计裁决与当前工作树诊断门

TEST 的只读 import 闭包审计得出：

- `cloudflare-access.test.ts`、`employee-auth.test.ts` 会直接加载 `app.ts/server.ts`，并经应用注册链加载上传模块与 C/D。
- `filesystem-storage.test.ts` 不进入素材文件夹逻辑，但会加载 `modules/uploads/upload-storage.ts`。
- 员工与 system-control 前端测试均需要 jsdom；部分共享 D 样式/合同类型入口不可完全排除。
- 在“零数据库、零网络、零浏览器、零 uploads、零 C/D”的严格条件下，可安全执行的现有测试集合为 empty。

规划拒绝 TEST R1 提议的临时源码 projection、平行 tsconfig 和业务 stub，因为它们会复制源码或掩盖真实依赖。下一门改为：

1. 不再宣称能够单独从当前物理工作树证明 A+B；
2. 由 TEST 对当前完整工作树执行一次隔离数据库 `pnpm check`，只建立“当前工作树健康度”证据；
3. 该完整门会覆盖 C/D，即使全绿也不解除 C 的隔离或部署禁令；
4. 若失败，只保留首个真实根因和完整原始日志，不重试、不放宽 timeout、不修改测试；
5. 数据库、进程和临时产物必须精确清理，默认共享库和服务器保持不动。

## 13. 当前完整工作树诊断结果

`TEST-RECOVERY-BASELINE-01 Rev2` 已按上述门仅运行一次：

- `git diff --check`、`check:repo`、四工作区 lint/typecheck 通过；
- 隔离 PostgreSQL 从零完成 37/37 迁移；除迁移定义的模板种子外业务行均为 0；
- `pnpm check` 在测试阶段退出 1：48/52 test files、487/493 tests 通过；最终 build 因前序失败未执行；
- 首个失败为 `system-control-operations.test.ts` afterAll hook 超时；另有 `uploads.test.ts` 字节类型断言和 C 的 5 项前端失败；
- 未重跑、未放宽 timeout、未 skip；隔离库精确 DROP，前缀残留 0。

本结果证明失败已收敛到 BACK 健康度与 FRONT/C 两条线，但不改变来源分类：C 继续隔离，D 仍需按叶级修复和复验，服务器 v4896 保持不动。

## 14. 2026-08-26 当前候选与脏工作树精确路径基线

本节是小范围协作复位的只读快照，取代“仅凭侧栏摘要或笼统 260 项判断当前版本”的做法；不改变前述历史 A–E 分类。

- Git 基线：`45179303982d6c13838668eba0ec0c6519003006`；分支：`codex/governance-recovery-v6.1`。
- 当前线上 immutable candidate：`20260826-upload-cos-browser-direct-r2-front02-server16`。
- R2 archive SHA-256：`8945163300ad455f2abe167a3485adb72c29cea7ca125d855cd0cc13c5188a25`；manifest SHA-256：`b8f5611a6fa179602c2f0dff6b8728b7da5c1d14ce171c2b739cd4674b8f60e2`。只有该 manifest/release 身份定义已部署候选；当前脏工作树不能反向冒充该候选。
- Git 默认折叠口径为 260 个状态项；展开所有未跟踪目录后是 427 条精确叶级路径：modified=113、deleted=3、untracked=311。外部审计的“260 项”是目录折叠口径，不是物理文件总数。
- 归一化叶级清单 SHA-256：`16e30d4568de648e7dc7f0a1c315874f5b7839cf705f7dda6c7b9d894bd6b631`。
- 路径责任计数：PLANNING=24；BACK=180；FRONT=125；UI=14；TEST=26；SERVER=41；SHARED=13；UNASSIGNED=4。Owner 表示后续审核/修复责任，不证明由该角色创建，也不证明已经验收或进入 deployed candidate。
- 新任务必须同时声明 immutable candidate 身份与本清单中的精确 allowed_paths；未列路径不得因同目录而自动纳入。

### PLANNING（24）

- ` M` `AGENTS.md`
- ` M` `docs/architecture.md`
- ` M` `docs/governance/RECOVERY-AUDIT-2026-08-21.md`
- `??` `docs/governance/RECOVERY-FILE-INVENTORY-2026-08-21.md`
- `??` `docs/logs/archive/DEVELOPMENT_LOG-through-v4.898-2026-08-21.md`
- ` M` `docs/logs/DEVELOPMENT_LOG.md`
- ` M` `docs/milestones/M3-internal-workbench-sprint.md`
- `??` `docs/milestones/P3-real-asr-pilot-readiness.md`
- `??` `docs/milestones/PRODUCT_ROADMAP.md`
- `??` `docs/milestones/SYSTEM-budget-guardrails.md`
- `??` `docs/milestones/SYSTEM-cny-cost-normalization.md`
- `??` `docs/milestones/SYSTEM-control-shell-runtime.md`
- `??` `docs/milestones/SYSTEM-engine-control-plane.md`
- `??` `docs/milestones/SYSTEM-ordered-execution-routing.md`
- `??` `docs/milestones/SYSTEM-policy-learning.md`
- `??` `docs/milestones/SYSTEM-runtime-observability.md`
- `??` `docs/milestones/SYSTEM-secret-security-readiness.md`
- `??` `docs/status/archive/CURRENT-v4.296-through-v4.568.md`
- `??` `docs/status/archive/CURRENT-v4.4-through-v4.295.md`
- `??` `docs/status/archive/CURRENT-v4.569-through-v4.896.md`
- `??` `docs/status/archive/CURRENT-v4.897-governance-reset.md`
- ` M` `docs/status/CURRENT.md`
- ` M` `docs/WORKFLOW.md`
- ` M` `PRODUCT.md`

### BACK（180）

- `??` `backend/migrations/1754976011000_create_delivery_products.cjs`
- `??` `backend/migrations/1754976011001_add_delivery_async_storage.cjs`
- `??` `backend/migrations/1754976011002_fix_delivery_object_key_constraint.cjs`
- `??` `backend/migrations/1754976012000_create_system_engine_control_plane.cjs`
- `??` `backend/migrations/1754976013000_create_system_routing_control_plane.cjs`
- `??` `backend/migrations/1754976014000_add_stable_system_control_command_key.cjs`
- `??` `backend/migrations/1754976015000_create_system_budget_guardrails.cjs`
- `??` `backend/migrations/1754976016000_create_system_secret_security.cjs`
- `??` `backend/migrations/1754976017000_create_system_cost_conversion.cjs`
- `??` `backend/migrations/1754976018000_create_system_strategy_learning.cjs`
- `??` `backend/migrations/1754976019000_create_system_strategy_optimization.cjs`
- `??` `backend/migrations/1754976020000_create_system_strategy_runtime_control.cjs`
- `??` `backend/migrations/1754976021000_create_system_feedback_observability.cjs`
- `??` `backend/migrations/1754976022000_create_ordered_execution_routing.cjs`
- `??` `backend/migrations/1754976023000_allow_pending_upload_checksum.cjs`
- `??` `backend/migrations/1754976024000_add_upload_transport_kind.cjs`
- `??` `backend/migrations/1754976025000_create_upload_completion_jobs.cjs`
- ` M` `backend/package.json`
- ` M` `backend/src/app.ts`
- ` M` `backend/src/config.ts`
- ` M` `backend/src/database/pool.ts`
- ` M` `backend/src/development.ts`
- `??` `backend/src/modules/access/cloudflare-access.ts`
- ` M` `backend/src/modules/asr/asr-adapter-registry.ts`
- ` M` `backend/src/modules/asr/asr-adapter.ts`
- ` M` `backend/src/modules/asr/asr-command.repository.ts`
- ` M` `backend/src/modules/asr/asr-errors.ts`
- ` M` `backend/src/modules/asr/asr-read.repository.ts`
- ` M` `backend/src/modules/asr/asr-worker.repository.ts`
- ` M` `backend/src/modules/asr/asr.routes.ts`
- `??` `backend/src/modules/deliveries/deliveries.domain.ts`
- `??` `backend/src/modules/deliveries/deliveries.errors.ts`
- `??` `backend/src/modules/deliveries/deliveries.repository.ts`
- `??` `backend/src/modules/deliveries/deliveries.routes.ts`
- `??` `backend/src/modules/deliveries/deliveries.service.ts`
- `??` `backend/src/modules/deliveries/delivery-storage.ts`
- `??` `backend/src/modules/deliveries/in-memory-delivery-storage.fake.ts`
- `??` `backend/src/modules/employee-auth/employee-auth.routes.ts`
- `??` `backend/src/modules/employee-auth/employee-auth.ts`
- `??` `backend/src/modules/feedback/feedback-storage.ts`
- `??` `backend/src/modules/feedback/feedback.auth.ts`
- `??` `backend/src/modules/feedback/feedback.errors.ts`
- `??` `backend/src/modules/feedback/feedback.routes.ts`
- `??` `backend/src/modules/feedback/feedback.service.ts`
- `??` `backend/src/modules/feedback/in-memory-feedback-screenshot-storage.fake.ts`
- ` M` `backend/src/modules/pre-review/pre-review.domain.ts`
- ` M` `backend/src/modules/pre-review/pre-review.errors.ts`
- ` M` `backend/src/modules/pre-review/pre-review.read.repository.ts`
- ` M` `backend/src/modules/pre-review/pre-review.source.ts`
- ` M` `backend/src/modules/pre-review/pre-review.worker.repository.ts`
- ` M` `backend/src/modules/pre-review/pre-review.write.repository.ts`
- ` M` `backend/src/modules/projects/project-lifecycle.repository.ts`
- ` M` `backend/src/modules/projects/project-lifecycle.routes.ts`
- ` M` `backend/src/modules/projects/project-lifecycle.service.ts`
- ` M` `backend/src/modules/projects/project.routes.ts`
- ` M` `backend/src/modules/screen-text/screen-text.adapter-registry.ts`
- ` M` `backend/src/modules/screen-text/screen-text.adapter.ts`
- ` M` `backend/src/modules/screen-text/screen-text.errors.ts`
- `??` `backend/src/modules/screen-text/screen-text.local-ocr-sidecar.ts`
- ` M` `backend/src/modules/screen-text/screen-text.read.repository.ts`
- ` M` `backend/src/modules/screen-text/screen-text.routes.ts`
- ` M` `backend/src/modules/screen-text/screen-text.worker.repository.ts`
- ` M` `backend/src/modules/screen-text/screen-text.write.repository.ts`
- `??` `backend/src/modules/storage/filesystem-storage.ts`
- `??` `backend/src/modules/storage/s3-compatible-storage.ts`
- ` M` `backend/src/modules/subtitle-acceptance/subtitle-acceptance.errors.ts`
- ` M` `backend/src/modules/subtitle-acceptance/subtitle-acceptance.read.repository.ts`
- ` M` `backend/src/modules/subtitle-acceptance/subtitle-acceptance.routes.ts`
- ` M` `backend/src/modules/subtitle-acceptance/subtitle-acceptance.service.ts`
- ` M` `backend/src/modules/subtitle-acceptance/subtitle-acceptance.write.repository.ts`
- `??` `backend/src/modules/system-control/system-control.auth.ts`
- `??` `backend/src/modules/system-control/system-control.budget.errors.ts`
- `??` `backend/src/modules/system-control/system-control.budget.service.ts`
- `??` `backend/src/modules/system-control/system-control.connection-test.worker.ts`
- `??` `backend/src/modules/system-control/system-control.cost.service.ts`
- `??` `backend/src/modules/system-control/system-control.engine-registry.ts`
- `??` `backend/src/modules/system-control/system-control.engine.errors.ts`
- `??` `backend/src/modules/system-control/system-control.engine.service.ts`
- `??` `backend/src/modules/system-control/system-control.operations.service.ts`
- `??` `backend/src/modules/system-control/system-control.repository.ts`
- `??` `backend/src/modules/system-control/system-control.routes.ts`
- `??` `backend/src/modules/system-control/system-control.routing.errors.ts`
- `??` `backend/src/modules/system-control/system-control.routing.service.ts`
- `??` `backend/src/modules/system-control/system-control.runtime.service.ts`
- `??` `backend/src/modules/system-control/system-control.secret-provider.ts`
- `??` `backend/src/modules/system-control/system-control.secret-validation.worker.ts`
- `??` `backend/src/modules/system-control/system-control.secret.service.ts`
- `??` `backend/src/modules/system-control/system-control.strategy-optimization.service.ts`
- `??` `backend/src/modules/system-control/system-control.strategy-runtime.service.ts`
- `??` `backend/src/modules/system-control/system-control.strategy.service.ts`
- `??` `backend/src/modules/tasks/tasks.auth.ts`
- `??` `backend/src/modules/tasks/tasks.errors.ts`
- `??` `backend/src/modules/tasks/tasks.repository.ts`
- `??` `backend/src/modules/tasks/tasks.routes.ts`
- ` M` `backend/src/modules/uploads/in-memory-storage.fake.ts`
- `??` `backend/src/modules/uploads/tus/tus-business.routes.ts`
- `??` `backend/src/modules/uploads/tus/tus-fastify.ts`
- `??` `backend/src/modules/uploads/upload-completion.repository.ts`
- ` M` `backend/src/modules/uploads/upload-storage.ts`
- ` M` `backend/src/modules/uploads/upload.repository.ts`
- ` M` `backend/src/modules/uploads/upload.routes.ts`
- ` M` `backend/src/server.ts`
- `??` `backend/src/tools/ros-browser-probe.ts`
- ` M` `backend/src/types/fastify.d.ts`
- ` M` `backend/src/workers/asr.worker.ts`
- `??` `backend/src/workers/delivery.worker.entry.ts`
- `??` `backend/src/workers/delivery.worker.ts`
- `??` `backend/src/workers/project-cleanup.worker.entry.ts`
- ` M` `backend/src/workers/project-cleanup.worker.ts`
- ` M` `backend/src/workers/screen-text.worker.entry.ts`
- ` M` `backend/src/workers/screen-text.worker.ts`
- `??` `backend/src/workers/system-control.connection-test.worker.entry.ts`
- `??` `backend/src/workers/system-control.secret-validation.worker.entry.ts`
- `??` `backend/src/workers/system-control.strategy-runtime.worker.entry.ts`
- `??` `backend/src/workers/system-control.strategy-runtime.worker.ts`
- `??` `backend/src/workers/system-control.strategy.worker.entry.ts`
- `??` `backend/src/workers/system-control.strategy.worker.ts`
- `??` `backend/src/workers/upload-completion.worker.entry.ts`
- `??` `backend/src/workers/upload-completion.worker.ts`
- ` M` `packages/contracts/package.json`
- ` M` `packages/contracts/src/asr.ts`
- `??` `packages/contracts/src/deliveries.ts`
- `??` `packages/contracts/src/employee-auth.ts`
- ` M` `packages/contracts/src/index.ts`
- ` M` `packages/contracts/src/pre-review.ts`
- ` M` `packages/contracts/src/projects.ts`
- ` M` `packages/contracts/src/recycle.ts`
- ` M` `packages/contracts/src/screen-text.ts`
- ` M` `packages/contracts/src/subtitle-acceptance.ts`
- `??` `packages/contracts/src/system-control-budget.ts`
- `??` `packages/contracts/src/system-control-cost.ts`
- `??` `packages/contracts/src/system-control-feedback.ts`
- `??` `packages/contracts/src/system-control-operations.ts`
- `??` `packages/contracts/src/system-control-runtime.ts`
- `??` `packages/contracts/src/system-control-secret.ts`
- `??` `packages/contracts/src/system-control-strategy-runtime.ts`
- `??` `packages/contracts/src/system-control-strategy.ts`
- `??` `packages/contracts/src/system-control.ts`
- `??` `packages/contracts/src/tasks.ts`
- ` M` `packages/contracts/src/uploads.ts`
- `??` `packages/contracts/tsconfig.build.json`
- ` M` `tests/backend/asr-dispatch-rev2.test.ts`
- ` M` `tests/backend/asr.test.ts`
- `??` `tests/backend/cloudflare-access.test.ts`
- `??` `tests/backend/deliveries.test.ts`
- `??` `tests/backend/employee-auth.test.ts`
- `??` `tests/backend/filesystem-storage.test.ts`
- ` M` `tests/backend/pre-review.test.ts`
- ` M` `tests/backend/projects.test.ts`
- ` M` `tests/backend/recycle.test.ts`
- `??` `tests/backend/ros-browser-probe.test.ts`
- `??` `tests/backend/screen-text-local-ocr-sidecar.test.ts`
- ` M` `tests/backend/screen-text.test.ts`
- ` M` `tests/backend/subtitle-acceptance.test.ts`
- `??` `tests/backend/system-control-budget.test.ts`
- `??` `tests/backend/system-control-engine.test.ts`
- `??` `tests/backend/system-control-feedback.test.ts`
- `??` `tests/backend/system-control-operations.test.ts`
- `??` `tests/backend/system-control-routing-migration.test.ts`
- `??` `tests/backend/system-control-routing.test.ts`
- `??` `tests/backend/system-control-runtime.test.ts`
- `??` `tests/backend/system-control-secret.test.ts`
- `??` `tests/backend/system-control-strategy-optimization.test.ts`
- `??` `tests/backend/system-control-strategy-runtime.test.ts`
- `??` `tests/backend/system-control-strategy.test.ts`
- `??` `tests/backend/system-control.test.ts`
- `??` `tests/backend/tasks.test.ts`
- `??` `tests/backend/upload-async-complete.test.ts`
- `??` `tests/backend/upload-create-manifest.test.ts`
- `??` `tests/backend/upload-direct-capability.test.ts`
- `??` `tests/backend/upload-direct-ingress.test.ts`
- `??` `tests/backend/upload-object-storage.server.test.ts`
- `??` `tests/backend/upload-object-storage.test.ts`
- `??` `tests/backend/upload-relay-employee-session.test.ts`
- `??` `tests/backend/upload-transport-replacement.test.ts`
- `??` `tests/backend/upload-tus-business.test.ts`
- `??` `tests/backend/upload-tus-finalize.test.ts`
- `??` `tests/backend/upload-tus-spike.test.ts`
- ` M` `tests/backend/uploads.test.ts`
- ` M` `tools/local-postgres.mjs`

### FRONT（125）

- ` M` `frontend/index.html`
- ` M` `frontend/package.json`
- ` M` `frontend/src/App.tsx`
- ` M` `frontend/src/components/AppShell.module.css`
- ` M` `frontend/src/components/AppShell.tsx`
- ` D` `frontend/src/features/asr-dispatch/AsrDispatches.tsx`
- ` M` `frontend/src/features/asr-dispatch/AsrProjectDispatch.tsx`
- ` M` `frontend/src/features/asr/model.ts`
- `??` `frontend/src/features/deliveries/api.ts`
- `??` `frontend/src/features/deliveries/Deliveries.module.css`
- `??` `frontend/src/features/deliveries/DeliveryConfirmPage.tsx`
- `??` `frontend/src/features/deliveries/DeliveryDetailPage.tsx`
- `??` `frontend/src/features/deliveries/DeliveryLibraryPage.tsx`
- `??` `frontend/src/features/deliveries/model.ts`
- `??` `frontend/src/features/deliveries/shared.tsx`
- `??` `frontend/src/features/employee-auth/EmployeeSessionGate.tsx`
- `??` `frontend/src/features/feedback/api.ts`
- `??` `frontend/src/features/feedback/Feedback.module.css`
- `??` `frontend/src/features/feedback/FeedbackModal.tsx`
- ` M` `frontend/src/features/materials/ProjectMaterials.tsx`
- ` M` `frontend/src/features/materials/scan.ts`
- ` M` `frontend/src/features/pre-review/model.ts`
- ` M` `frontend/src/features/pre-review/PreReviewWorkspace.tsx`
- ` M` `frontend/src/features/projects/api.ts`
- ` M` `frontend/src/features/projects/ProjectCenter.tsx`
- ` M` `frontend/src/features/recycle/api.ts`
- ` M` `frontend/src/features/recycle/RecycleBin.module.css`
- ` M` `frontend/src/features/recycle/RecycleBin.tsx`
- ` M` `frontend/src/features/screen-text/ScreenTextWorkspace.tsx`
- `??` `frontend/src/features/subtitle-acceptance/AcceptanceDialogs.module.css`
- `??` `frontend/src/features/subtitle-acceptance/AcceptanceDialogs.tsx`
- `??` `frontend/src/features/subtitle-acceptance/AcceptanceEditorPanel.module.css`
- `??` `frontend/src/features/subtitle-acceptance/AcceptanceEditorPanel.tsx`
- `??` `frontend/src/features/subtitle-acceptance/AcceptanceEpisodeQueue.tsx`
- `??` `frontend/src/features/subtitle-acceptance/AcceptanceMediaTimeline.module.css`
- `??` `frontend/src/features/subtitle-acceptance/AcceptanceMediaTimeline.tsx`
- `??` `frontend/src/features/subtitle-acceptance/AcceptanceWorkspaceChrome.tsx`
- `??` `frontend/src/features/subtitle-acceptance/api.ts`
- `??` `frontend/src/features/subtitle-acceptance/model.ts`
- `??` `frontend/src/features/subtitle-acceptance/SubtitleAcceptanceWorkspace.module.css`
- `??` `frontend/src/features/subtitle-acceptance/SubtitleAcceptanceWorkspace.tsx`
- `??` `frontend/src/features/subtitle-acceptance/useAcceptanceCueActions.ts`
- `??` `frontend/src/features/subtitle-acceptance/useAcceptanceIssueActions.ts`
- `??` `frontend/src/features/subtitle-acceptance/useAcceptanceMediaActions.ts`
- `??` `frontend/src/features/subtitle-acceptance/useAcceptancePreflightActions.ts`
- `??` `frontend/src/features/subtitle-acceptance/useAcceptanceQueries.ts`
- `??` `frontend/src/features/subtitle-acceptance/workspaceSupport.ts`
- `??` `frontend/src/features/tasks/api.ts`
- `??` `frontend/src/features/tasks/model.ts`
- `??` `frontend/src/features/tasks/Tasks.module.css`
- `??` `frontend/src/features/tasks/TasksPage.tsx`
- ` M` `frontend/src/features/terms/TermsPanels.tsx`
- ` M` `frontend/src/features/terms/TermsWorkspace.tsx`
- ` M` `frontend/src/features/uploads/api.ts`
- `??` `frontend/src/features/uploads/file-selection.ts`
- ` M` `frontend/src/features/uploads/model.ts`
- ` D` `frontend/src/features/uploads/sha256.ts`
- ` M` `frontend/src/features/uploads/upload-engine.ts`
- ` M` `frontend/src/features/uploads/UploadQueue.module.css`
- ` M` `frontend/src/features/uploads/UploadQueue.tsx`
- ` M` `frontend/src/main.tsx`
- ` M` `frontend/src/modules.ts`
- `??` `frontend/src/platform/employeeApi.ts`
- `??` `frontend/src/platform/randomUuid.ts`
- `??` `system-frontend/index.html`
- `??` `system-frontend/package.json`
- `??` `system-frontend/README.md`
- `??` `system-frontend/src/api.ts`
- `??` `system-frontend/src/App.tsx`
- `??` `system-frontend/src/budgetApi.ts`
- `??` `system-frontend/src/budgetsPage.tsx`
- `??` `system-frontend/src/changesPage.tsx`
- `??` `system-frontend/src/controlPrimitives.tsx`
- `??` `system-frontend/src/controlRefresh.tsx`
- `??` `system-frontend/src/ControlShell.tsx`
- `??` `system-frontend/src/enginesPage.tsx`
- `??` `system-frontend/src/feedback.css`
- `??` `system-frontend/src/feedbackApi.ts`
- `??` `system-frontend/src/feedbackPage.tsx`
- `??` `system-frontend/src/logsPage.tsx`
- `??` `system-frontend/src/main.tsx`
- `??` `system-frontend/src/model.ts`
- `??` `system-frontend/src/responsive.css`
- `??` `system-frontend/src/routingPage.tsx`
- `??` `system-frontend/src/runtime.css`
- `??` `system-frontend/src/runtimeApi.ts`
- `??` `system-frontend/src/runtimeCommon.tsx`
- `??` `system-frontend/src/secretApi.ts`
- `??` `system-frontend/src/security.css`
- `??` `system-frontend/src/securityPage.tsx`
- `??` `system-frontend/src/serversPage.tsx`
- `??` `system-frontend/src/strategy.css`
- `??` `system-frontend/src/strategyApi.ts`
- `??` `system-frontend/src/strategyPage.tsx`
- `??` `system-frontend/src/strategyRuntimeApi.ts`
- `??` `system-frontend/src/strategyWaveB.tsx`
- `??` `system-frontend/src/strategyWaveC.tsx`
- `??` `system-frontend/src/styles.css`
- `??` `system-frontend/src/systemApi.ts`
- `??` `system-frontend/tsconfig.json`
- `??` `system-frontend/vite.config.ts`
- ` D` `tests/frontend/AsrDispatches.test.tsx`
- `??` `tests/frontend/deliveries.test.tsx`
- `??` `tests/frontend/employeeSession.test.tsx`
- `??` `tests/frontend/feedback.test.tsx`
- `??` `tests/frontend/material-folder-flow.test.tsx`
- ` M` `tests/frontend/PreReviewWorkspace.test.tsx`
- ` M` `tests/frontend/ProjectCenter.test.tsx`
- ` M` `tests/frontend/ProjectMaterials.test.tsx`
- `??` `tests/frontend/randomUuid.test.ts`
- ` M` `tests/frontend/RecycleBin.test.tsx`
- ` M` `tests/frontend/ScreenTextWorkspace.test.tsx`
- `??` `tests/frontend/subtitle-acceptance.test.tsx`
- `??` `tests/frontend/system-control-feedback.test.tsx`
- `??` `tests/frontend/system-control-plane.test.tsx`
- `??` `tests/frontend/system-control-runtime.test.tsx`
- `??` `tests/frontend/system-control-secret.test.tsx`
- `??` `tests/frontend/system-control-strategy-wave-c.test.tsx`
- `??` `tests/frontend/system-control-strategy.test.tsx`
- `??` `tests/frontend/system-control.test.tsx`
- `??` `tests/frontend/tasks.test.tsx`
- `??` `tests/frontend/upload-object-storage.test.ts`
- `??` `tests/frontend/upload-transport-replacement.test.tsx`
- `??` `tests/frontend/upload-tus.test.ts`
- ` M` `tests/frontend/UploadQueue.test.tsx`

### UI（14）

- ` M` `DESIGN.md`
- ` M` `docs/ui/M2-material-pairing-acceptance.md`
- ` M` `docs/ui/M2-recycle-bin-acceptance.md`
- `??` `docs/ui/M3-delivery-product-acceptance.md`
- `??` `docs/ui/M3-subtitle-acceptance.md`
- `??` `docs/ui/M3-unified-task-center-acceptance.md`
- `??` `docs/ui/SYSTEM-budget-guardrails-acceptance.md`
- `??` `docs/ui/SYSTEM-control-shell-acceptance.md`
- `??` `docs/ui/SYSTEM-engine-control-acceptance.md`
- `??` `docs/ui/SYSTEM-ordered-execution-routing-acceptance.md`
- `??` `docs/ui/SYSTEM-policy-learning-acceptance.md`
- `??` `docs/ui/SYSTEM-runtime-observability-acceptance.md`
- `??` `docs/ui/SYSTEM-secret-security-acceptance.md`
- `??` `docs/ui/SYSTEM-test-feedback-observability-acceptance.md`

### TEST（26）

- `??` `docs/testing/M2-material-recycle-integration-report.md`
- `??` `docs/testing/M3-unified-task-center-integration-report.md`
- `??` `docs/testing/RECOVERY-BASELINE-REPORT.md`
- `??` `docs/testing/RECOVERY-FINAL-VERIFICATION.md`
- `??` `docs/testing/RECOVERY-REPAIR-VERIFICATION.md`
- `??` `docs/testing/S6-end-to-end-acceptance.md`
- `??` `docs/testing/S6-end-to-end-report.md`
- `??` `docs/testing/S6-real-material-smoke-acceptance.md`
- `??` `docs/testing/S6-real-material-smoke-report.md`
- `??` `docs/testing/SYSTEM-budget-guardrails-integration-report.md`
- `??` `docs/testing/SYSTEM-cny-cost-normalization-integration-report.md`
- `??` `docs/testing/SYSTEM-control-shell-integration-report.md`
- `??` `docs/testing/SYSTEM-engine-control-integration-report.md`
- `??` `docs/testing/SYSTEM-ordered-execution-routing-integration-report.md`
- `??` `docs/testing/SYSTEM-policy-learning-07c-integration-report.md`
- `??` `docs/testing/SYSTEM-policy-learning-integration-report.md`
- `??` `docs/testing/SYSTEM-runtime-observability-integration-report.md`
- `??` `docs/testing/SYSTEM-secret-security-integration-report.md`
- `??` `docs/testing/SYSTEM-test-feedback-observability-integration-report.md`
- `??` `docs/testing/TEST-SERVER-CAPACITY-ACCEPTANCE.md`
- `??` `docs/testing/TEST-SERVER-ISSUES.md`
- `??` `docs/testing/TEST-SERVER-PERFORMANCE-PLAN.md`
- `??` `tests/performance/performance-fake-server.ts`
- `??` `tests/performance/performance-harness.ts`
- `??` `tests/performance/performance-types.ts`
- `??` `tests/performance/README.md`

### SERVER（41）

- `??` `deploy/debian/bin/backup-postgres.sh`
- `??` `deploy/debian/bin/healthcheck.sh`
- `??` `deploy/debian/bin/provision-test-database.sh`
- `??` `deploy/debian/bin/qimao-ros-compat-probe.mjs`
- `??` `deploy/debian/bin/qimao-ros-server-relay-probe.mjs`
- `??` `deploy/debian/bin/qimao-upload-direct-acme-reload`
- `??` `deploy/debian/bin/qimao-write-object-storage-env`
- `??` `deploy/debian/bin/restore-postgres.sh`
- `??` `deploy/debian/bin/validate-upload-direct-assets.mjs`
- `??` `deploy/debian/env/backend.env.example`
- `??` `deploy/debian/htpdate/htpdate.trial-only`
- `??` `deploy/debian/htpdate/qimao-htpdate-trial`
- `??` `deploy/debian/htpdate/qimao-htpdate-trial.service`
- `??` `deploy/debian/htpdate/qimao-htpdate-trial.timer`
- `??` `deploy/debian/htpdate/time-source.mode`
- `??` `deploy/debian/logrotate/qimao-terms-cloud`
- `??` `deploy/debian/nginx/qimao-backend.conf`
- `??` `deploy/debian/nginx/qimao-loopback.conf`
- `??` `deploy/debian/nginx/qimao-proxy-headers.conf`
- `??` `deploy/debian/nginx/qimao-public-test.conf`
- `??` `deploy/debian/nginx/qimao-sites.conf`
- `??` `deploy/debian/nginx/qimao-upload-direct-log.conf`
- `??` `deploy/debian/nginx/qimao-upload-direct.conf`
- `??` `deploy/debian/nginx/qimao-upload-relay-direct-log.conf`
- `??` `deploy/debian/nginx/qimao-upload-relay-direct.conf`
- `??` `deploy/debian/postgresql/qimao-test.conf`
- `??` `deploy/debian/systemd/qimao-backend.service`
- `??` `deploy/debian/systemd/qimao-project-cleanup-worker.service`
- `??` `deploy/debian/systemd/qimao-upload-completion-worker.service`
- `??` `deploy/debian/systemd/qimao-upload-direct-acme-renew.service`
- `??` `deploy/debian/systemd/qimao-upload-direct-acme-renew.timer`
- `??` `deploy/debian/systemd/qimao-worker@.service`
- `??` `docs/deployment/archive/TEST-SERVER-COLLABORATION-v5.0-20260821.md`
- `??` `docs/deployment/BACKEND-LINUX-RUNTIME.md`
- `??` `docs/deployment/FRONTEND-STATIC-DELIVERY.md`
- `??` `docs/deployment/TEST-SERVER-COLLABORATION.md`
- `??` `docs/deployment/TEST-SERVER-HANDOFF-CHECKLIST.md`
- `??` `docs/deployment/TEST-SERVER-ONE-DAY-RUNBOOK.md`
- `??` `docs/deployment/TEST-SERVER-PREPARATION-CHECKLIST.md`
- `??` `docs/deployment/UPLOAD-COS-RELEASE-CANDIDATE.md`
- `??` `docs/deployment/UPLOAD-DIRECT-INGRESS-01.md`

### SHARED（13）

- ` M` `docs/contracts/LOCAL_APP_PARITY.md`
- ` M` `docs/contracts/M2-upload-lifecycle.md`
- `??` `docs/contracts/M3-delivery-product-workflow.md`
- `??` `docs/contracts/M3-subtitle-acceptance-parity-audit.md`
- ` M` `docs/contracts/M3-subtitle-acceptance-workbench.md`
- `??` `docs/contracts/M3-unified-task-center.md`
- `??` `docs/contracts/MODULE_INTEGRATION_CONTRACTS.md`
- ` M` `docs/contracts/MODULE_RESPONSIBILITY_MATRIX.md`
- ` M` `docs/contracts/SYSTEM_CONTROL_CENTER.md`
- `??` `docs/contracts/SYSTEM-test-feedback-observability.md`
- ` M` `package.json`
- ` M` `pnpm-lock.yaml`
- ` M` `pnpm-workspace.yaml`

### UNASSIGNED（4）

- `??` `{console.error(e)`
- `??` `{process.stderr.write(e.name+'`
- `??` `c.end())`
- `??` `p.end())`
