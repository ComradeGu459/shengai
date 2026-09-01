# 开发日志

## 2026-08-21｜治理恢复冻结与协作协议 v6.1

- 用户明确暂停项目推进，先拨乱反正项目对话、权限和写作文档。本轮停止全部内部 FRONT/TEST/审计子代理，活动业务 execution lease 收敛为0；未继续修改业务代码、测试、服务器或部署。
- 取证确认 `main` 最后提交为 `e16c5eb`（2026-08-15），当前工作区有216个脏条目；已跟踪差量约100 files / 9011 insertions / 2136 deletions，且存在大量未跟踪 SYSTEM、登录、部署和测试资产。因此禁止直接 `git reset --hard`、`checkout --` 或 `clean`。
- 恢复边界冻结为三层：`v4-849 / SYSTEM-09` 是最后完整测试基线；服务器 release `20260821-employee-session-v4896` 是当前运行基线并保持不动；素材文件夹在途实现尚未部署且含跨项目 P0 与至少四项 P1，整体转 `quarantined`。
- `AGENTS.md` 与 `docs/WORKFLOW.md` 更新为 v6.1：只允许规划/UI/BACK/FRONT/TEST/SERVER 六个用户可见固定任务参与；只读任务直接阻塞，禁止隐藏子代理、内部 successor、临时线程或 worktree 代写业务代码、测试和领域文档。
- `CURRENT` 更新至 v4-898/governance_recovery_freeze；v4-897 已原样归档并完成 SHA-256 对账。新增 `docs/governance/RECOVERY-AUDIT-2026-08-21.md`，记录取证、可信基线和后续恢复决策；服务器看板与问题台账同步冻结。

## 2026-08-21｜协作协议 v6.0 与活跃文档收口

- 用户在切换 Codex 账号/模型后要求重新整理协作协议和写作文档；本轮未修改用户已手动固定的模型或推理强度，只重新定义权限探针、执行租约、接力和文档所有权。
- `AGENTS.md` 已收敛为项目执行约定；`docs/WORKFLOW.md` 已重写为唯一 v6.0 状态机，删除 v4/v5 兼容层、隐式后台调度和“写了文档就算已派发”的歧义。
- `docs/status/CURRENT.md` 已收敛为 v4-897 活跃快照；旧 202,893 字节全文已原样归档到 `docs/status/archive/CURRENT-v4.569-through-v4.896.md`，源与归档 SHA-256 均为 `F6EEFB24D536CB6F1673A39CE5F6CCA8FFDAB080AB4D643AF3B27009966D06D0`。
- `docs/deployment/TEST-SERVER-COLLABORATION.md` 已重建为短版实时看板，清除了“Basic 仍启用”与“站内 14 天会话已替代 Basic”等互相冲突的历史描述；旧页已原样归档，归档前后 SHA-256 均为 `73657AFB5BE7B8631FD5E926C74D0D82F2F9D118C6F108D753765F9CAD91597E`。
- v6 规则已重新广播到 BACK/FRONT/UI/TEST/SERVER 五个可见 successor；首次派发发现五个任务均被系统归档，已恢复后重新发送并取得新 turn。五个任务的新鲜探针仍为 `read-only`，因此只作 observer；“账号切换”与“工作区写权限”不再混为一谈，当前写入仍由根任务下持有精确 lease 的内部 FRONT/TEST 执行者完成。
- 唯一接力仍为 `FRONT artifact_written → 规划收件 → TEST 独立验收 → SERVER 不可变 release`；BACK/UI 产物保持，当前不重复业务实现、不提前部署、不上传真实素材。

## 2026-08-21｜WORKFLOW-RELAY-V5.0 权限与接力总线落地

- `handoffToken=WORKFLOW-RELAY-V5.0-V4.895`，`authority_generation=2`；文档书记租约为 `workspace-write/:workspace + ordinary_writes=direct`，范围仅限协作协议、CURRENT、开发日志与测试服务器协作看板，未修改生产代码、测试或 DESIGN。
- 审计确认 `AGENTS.md` 与 `docs/WORKFLOW.md` 已具备 v5.0 的 permission lease、固定只读 observer、同角色 writable successor、三阶段交付、路径独占与重启续接规则，本轮不重复重写已成立内容。
- `CURRENT.md` 已从同步协议 v4.10 提升到 v5.0，并首次登记素材文件夹切片的当前接力快照：FRONT writable successor 正在收尾，BACK 为 `artifact_written`，UI docs successor 已完成，TEST writable successor 等待 FRONT 冻结；固定 FRONT/UI/TEST 只读任务明确转 observer，避免把 UI 中的闲置显示误判为无人执行。
- 接力顺序冻结为 `FRONT artifact_written → 规划收件 → TEST 独立验收 → 规划关闭/服务器新 release`；权限、账号、模型或宿主重启只重新探针并从 lease 停点续接，不重新创建业务 Rev 或重复写命令。
- `git diff --check -- AGENTS.md docs/WORKFLOW.md docs/status/CURRENT.md docs/logs/DEVELOPMENT_LOG.md docs/deployment/TEST-SERVER-COLLABORATION.md` 新鲜退出 0；未提交、推送或部署。

## 2026-08-21｜BACK-MATERIAL-FOLDER-01 领取并进入 in_progress

- permission_ok：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`；普通仓库编辑直接执行，不走 auto_review。
- 已重读当前契约、上传仓储/路由与同步看板；本轮复用既有 UploadSession、upload_commands 和 material manifest 唯一状态源，暂停为客户端停止发片，继续使用同一 uploadId 补缺失 parts，过期/aborted 不恢复。
- 当前唯一实现目标：为 create_upload 的 Idempotency-Key 提供按稳定 commandId 的只读 GET 恢复，不新增迁移、任务表或第二状态源；目录映射/102 文件有界字段继续按既有合同收口。

## 2026-08-21｜BACK-MATERIAL-FOLDER-01 完成并转 review

- 共享契约新增 `UploadCreateCommandParamsSchema` 与严格 `UploadCreateCommandResultSchema`。正式路由为 `GET /api/projects/:projectId/uploads/commands/:commandId`，`commandId` 与创建 POST 的 `Idempotency-Key` 同源；读取结果为 `{ commandId, projectId, status: "succeeded", session }`，只从 `upload_commands(command_kind=create_upload)` 联结同项目 `upload_sessions` 投影。
- 同键同请求/同一事实重放、同键异参409仍由原有 create 事务和 request hash 负责；跨项目与未知 commandId均404且不泄露上传身份；GET仅读，命令计数前后不变。既有 MaterialManifest 字段/角色校验与 UploadSession 分片补缺失语义足够支撑目录选择、102文件有界队列、暂停继续，未新增迁移或第二状态源。
- 新增回归覆盖 create 命令 GET 恢复、跨项目隔离、未知404零写，以及同一 uploadId 暂停后补缺失分片/已确认 part 不变。contracts build、backend typecheck/build、check:repo、git diff-check 均退出0；uploads 专项真实首因是共享 PostgreSQL `127.0.0.1:55432 ECONNREFUSED`（beforeEach 清理阶段），因此未计为产品通过，留规划/测试复验。

## 2026-08-21｜FIFO338 后端实现收口并转 review

- 固定后端任务在宿主重启后变为 `read-only / permission_blocked`；规划仅对其已开始的员工会话后端做一次有界应急收口，没有接管后续前端或服务器职责。
- 新增严格 employee login/session/logout 契约；密码只保存版本化 scrypt verifier，会话由至少32字节 Secret 以 HMAC-SHA256签名，Cookie固定14天并使用 `__Host-`、HttpOnly、Secure、SameSite=Lax、Path=/。所有员工写请求与登录要求精确 Origin。
- 员工 principal 固定 `tasks:read`、`feedback:create`、`projectAccess=all`；项目创建/回收审计使用登录 subject。旧 `QIMAO_EMPLOYEE_TRUSTED_PROXY_AUTH`、`QIMAO_EMPLOYEE_TEST_USERNAME` 与受信头 resolver 已从后端、测试、环境示例和员工 Nginx 模板删除；管理员 Cloudflare Access 不变。
- 新鲜验证：`employee-auth.test.ts + cloudflare-access.test.ts` 11/11；backend typecheck/build、contracts build、`check:repo`、授权路径 `git diff --check` 均通过。前端登录页与服务器部署仍未完成，未连接服务器、未写真实密码/verifier/Secret、未提交推送。

## 2026-08-21｜FIFO338 BACK-EMPLOYEE-SESSION-01 Rev1 领取并进入实现

- `handoffToken=FIFO338-BACK-EMPLOYEE-SESSION-01-R1-V4.890`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 员工认证目标收敛为唯一服务器端 scrypt verifier + HMAC-SHA256 14 天 `__Host-` HttpOnly Cookie 会话；删除旧 Nginx Basic/loopback 受信头生产解析路径，管理员 Cloudflare Access 保持独立。本轮不改迁移、前端、DESIGN、真实服务器或外部服务。

## 2026-08-21｜FIFO336 Rev2 同源认证路径收口完成并转 review

- 在已通过 Rev2 基础上物理删除 Cloudflare employee audience/邮箱配置与 verifier 分支，避免员工受信反代与旧 JWT 形成第二身份路径；员工唯一身份来源保持 loopback Nginx 覆盖头，测试用户名固定为环境占位配置（当前回归为 `admin`）。
- 新鲜回归：`cloudflare-access.test.ts` 9/9；contracts/backend typecheck/build、`pnpm run check:repo`、`git diff --check` 均通过。未连接 Cloudflare/服务器/数据库、未运行完整 `pnpm check`、未提交或部署。

## 2026-08-21｜FIFO336 BACK-CLOUDFLARE-ACCESS-01 Rev2 完成并转 review

- 产品边界：Cloudflare Access 仅保护管理员 `/api/system-control/**`，只接受 control AUD/JWKS/issuer/管理员邮箱白名单；员工 API 不再使用 Cloudflare employee AUD 或全局 JWT 门。
- 实现方向：新增 loopback 受信反代员工 resolver，只有 socket 来源为 loopback 且 `X-Qimao-Employee-User` 精确等于 `QIMAO_EMPLOYEE_TEST_USERNAME` 才映射 employee principal（`tasks:read`、`feedback:create`、`projectAccess=all`）；不读取普通 Basic Auth，管理员 JWT 不可替代员工头。Nginx 模板先清空客户端同名头，再由员工 API location 注入占位用户名。
- 接线：`backend/src/app.ts` 的 Access onRequest 仅保护 `/api/system-control/**`；非管理员 API 由同一复合 principal resolver 读取受信员工 resolver。`backend/src/server.ts` 从环境 fail-closed 创建 employee trusted-proxy resolver；Cloudflare employee audience 配置与员工 verifier 分支已删除。Nginx shared header 片段清空客户端同名头，员工站 API location 注入占位用户名，管理员 location 不注入。
- 回归：`tests/backend/cloudflare-access.test.ts` 新鲜 `1 file / 9 tests` 通过，覆盖管理员缺 JWT/错 AUD/错邮箱、员工公开项目列表/创建、受信 loopback 头真实任务200、管理员 JWT 不可替代员工头、员工头访问 system-control 403、loopback/用户名/Basic/Cloudflare 伪造拒绝、生产配置缺用户名 fail-closed。
- 验证：contracts/backend typecheck/build、`pnpm run check:repo`、`git diff --check` 均退出0。状态写回 CURRENT v4-889，转 `review / Current actor=规划对话 / Reviewer=规划对话`。未连接真实 Cloudflare/服务器/数据库、未运行完整 `pnpm check`、未提交/部署。

## 2026-08-20｜FIFO335 BACK-CLOUDFLARE-ACCESS-01 Rev1 完成并转 review

- 实现：新增 `backend/src/modules/access/cloudflare-access.ts`，只用 Node 内置 crypto 验证 RS256/JWK；固定使用 `${issuer}/cdn-cgi/access/certs`，成功 JWKS 有界缓存，网络失败不使用旧缓存。验证 issuer、employee/control audience、exp/nbf、subject/email、服务端邮箱白名单和 RSA 签名；拒绝错误 token 时只返回安全身份失败，不记录 token、邮箱或 JWKS 载荷。
- 接线：`backend/src/app.ts` 增加显式 `QIMAO_ACCESS_REQUIRED` API 全局 onRequest 门，/health 例外，system-control 路径只接受 control audience，其余 API 只接受 employee audience；同一 verified principal 写入 request 并供现有 system-control resolver 使用。`backend/src/server.ts` 从环境创建 resolver/readiness，production 禁止注入旁路 principal；`SystemControlPrincipal` 增加服务端项目范围投影，反馈项目访问支持白名单测试所有者的 `projectAccess=all`。部署 env/docs 只含占位配置。
- 回归：`tests/backend/cloudflare-access.test.ts` 新鲜 `1 file / 6 tests` 通过，覆盖双 audience、伪 header、issuer/exp/nbf/邮箱/签名拒绝、JWKS 缓存/网络失败、同 app API 隔离、/health 例外和 production 缺配置 fail-closed。
- 验证：contracts typecheck/build、backend typecheck/build、`pnpm run check:repo`、`git diff --check` 均退出0。未运行完整 `pnpm check`；未连接真实 Cloudflare/JWKS、未启动或修改 PostgreSQL、未部署/提交/推送。状态写回 CURRENT v4-887，转 `review / Current actor=规划对话 / Reviewer=规划对话`。

## 2026-08-20｜FIFO335 BACK-CLOUDFLARE-ACCESS-01 Rev1 领取

- `handoffToken=FIFO335-BACK-CLOUDFLARE-ACCESS-01-R1-V4.885`；权限指纹：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。状态已差量写回 CURRENT v4-886，任务进入 `active / in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。
- 范围冻结为单一 Cloudflare Access JWT/JWKS 身份验证与 employee/control audience 隔离、生产配置硬门及 readiness；本地 RSA/JWK fake 只用于回归，不连接真实 Cloudflare 网络/账户，不改前端、共享业务契约、迁移或 DESIGN。

## 2026-08-20｜FRONT-PUBLIC-WEB-01 Rev1 完成并转 review

- 生产实现：新增 `frontend/src/platform/randomUuid.ts`，由 `frontend/src/main.tsx` 在应用渲染前安装安全 fallback；原生 `crypto.randomUUID` 保持不覆盖，缺失时仅使用 `crypto.getRandomValues` 设置 RFC4122 v4 version/variant 位，能力不可用时抛出明确错误。若浏览器 Crypto 对象不可扩展，所有员工端调用仍经同一 `createUuid` helper，不依赖不可安全定义的全局属性。
- 统一替换员工 frontend 全部 UUID/幂等键入口（ASR、项目、上传、回收、预审、术语、素材、任务、交付、画面字、字幕验收、反馈）；删除时间戳/`Math.random` fallback，未改任何请求 body、稳定意图或异步状态机。
- 回归：新增 `tests/frontend/randomUuid.test.ts` 覆盖原生保留、纯 HTTP 缺失原生 UUID、getRandomValues 不可用；`ProjectCenter.test.tsx` 覆盖项目创建 POST 恰好一次及合法 v4 幂等键。
- 验证：UUID/项目中心定向 `12/12`；员工 frontend 全量选择范围 `20 files / 229 tests passed`；`frontend` typecheck 通过；Vite production build `196 modules transformed` 通过；`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。任务状态 `review / Current actor=规划对话 / Reviewer=规划对话`，未部署、未提交、未推送。

## 2026-08-20｜FRONT-PUBLIC-WEB-01 Rev1 领取

- 权限指纹：repo_root=`C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、permission_profile=`workspace-write/:workspace`、ordinary_writes=`direct`；状态已写回 CURRENT v4-884，任务进入 `active / in_progress`。
- 真实首因是纯 HTTP 员工项目中心调用 `crypto.randomUUID` 不存在，幂等键未生成而 POST 未发出。本轮先完整盘点 frontend/src 中所有直接调用，建立单一应用启动级 RFC4122 v4 fallback；不改变请求 body、稳定意图、幂等/unknown/冲突状态机，不改管理员站、后端或服务器。

## 2026-08-20｜用户收敛为两站服务器烟雾目标

- 当前唯一目标改为在测试服务器运行员工站、管理员站和Fastify，让用户通过SSH隧道从本机浏览器打开测试。
- 服务器入口保持回环3001/8080/8081，公网仍仅SSH22；域名/TLS、压测、故障注入、真实ASR/OCR、COS/Sentry和生产级验收全部后置。
- 服务器任务已收到最短路径指令；两站打开后必须列出实际可用功能和因测试身份/外部服务未接而不可用的功能，不伪造成功。

## 2026-08-20｜TEST-SRV-010归因并收敛专属存储StateDirectory

- FIFO333 新 release、SHA、frozen install、根 build 与 contracts import 通过，随后按门停止于既有 `/var/lib/qimao-terms-cloud=root:root 0755`；未改权限、未启动服务。
- 规划确认该父目录曾承载 root-only 时间试验状态，拒绝递归 chown/chmod。部署资产改为 `StateDirectory=qimao-terms-cloud/storage`、`QIMAO_STORAGE_ROOT=/var/lib/qimao-terms-cloud/storage`，ReadWritePaths只开放专属子目录；父目录和历史证据保持不动。
- TEST-SRV-010进入fixing。下一门为服务器父目录/符号链接只读核验、`systemd-analyze verify` 与专属子目录创建差量；通过后才恢复production真链。

## 2026-08-20｜FIFO332规划复验通过并恢复FIFO333服务器执行

- 规划新鲜运行 filesystem 专项 `5/5`、backend production build 与 `git diff --check`，均退出0；FIFO332 的中间 symlink、并发 authorize 与 Delivery 独立命名空间修正通过代码/测试门。
- 派发 `FIFO333-TEST-SERVER-DEPLOY-01-R4-V4.881`：新不可变 release、敏感扫描/SHA/frozen install/root build、临时隔离库与临时存储根的 production 同源上传/交付跨实例真链；通过后才启动正式回环 Fastify 与两站 Nginx 烟雾。
- 协作看板已从“安全暂停”更新为“服务器执行中”；公网、续费、真实供应商/Secret/COS/Sentry/付费、Worker和压测继续冻结。

## 2026-08-20｜补齐测试服务器协作看板与交互入口

- 新增 `docs/deployment/TEST-SERVER-COLLABORATION.md`，把当前阶段、服务器事实、协作任务状态、用户自然语言反馈方式、活跃问题与下一门集中到单页；不再要求用户学习找 Bug 或填写强制测试步骤。
- 修正 `TEST-SERVER-HANDOFF-CHECKLIST.md`、`TEST-SERVER-ONE-DAY-RUNBOOK.md` 与准备模板的过时状态；主机/SSH/时间基线/回环PG/37项迁移/构建已完成，Fastify、两站和压测尚未通过。
- `TEST-SRV-20260820-009` 在 FIFO331/332 产品修正完成后进入 `retest`，只有新 release 在服务器完成 production 启动与上传/交付跨实例复验后才关闭。CURRENT 更新至 v4-880；服务器保持安全暂停、不开放公网、不续费。

## 2026-08-20｜FIFO332完成并转规划复核

- `handoffToken=FIFO332-BACK-DEPLOY-STORAGE-01-R2-V4.879`；namespace 创建改为受信 root 逐级 lstat/非符号链接校验后再 mkdir，Upload 与 Delivery 的中间命名空间 symlink 均拒绝，不覆盖既有路径。
- `authorizePart` 复用 storageUploadId 单资源锁；DeliveryStorage 独立校验/创建 deliveries 命名空间，移除间接 uploads 创建与未使用 store。abort/delete/head/read/part read 均继续验证摘要派生路径的受根普通文件边界。
- 新鲜 filesystem 专项 `1 file / 5 tests` 通过，覆盖中间 symlink、双 part 并发授权、Linux 权限条件、实例重建、并发 complete、过期/异身份/缺失分片与 Delivery 恢复；backend typecheck/build、`check:repo`、`git diff --check` 通过。
- PostgreSQL 仍为项目数据目录 PID 11716 占用但无响应；依规划要求未杀进程、未删数据、未改默认库。DB-backed production Fastify/uploads/deliveries 链不冒充通过，留测试服务器新 release 实验；未连接服务器、未改迁移/前端、未接 COS/网络/Secret/付费。

## 2026-08-20｜FIFO331领取并进入本地磁盘存储实现

- `handoffToken=FIFO331-BACK-DEPLOY-STORAGE-01-R1-V4.877` 已收到；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 当前只在既有 UploadStorage/DeliveryStorage 边界内建立正式本地文件实现，保留数据库上传会话为业务事实；不新增迁移、前端、真实对象存储、Secret、网络或付费依赖。

## 2026-08-20｜FIFO331完成并转规划复核

- 新增 `backend/src/modules/storage/filesystem-storage.ts`，以 `QIMAO_STORAGE_ROOT` 为唯一服务器端根；拒绝缺失/相对/符号链接/非目录/不可写根，上传与交付使用摘要命名路径，目录0750、文件0640，分片与对象均为磁盘事实。
- `DirectUploadStorage` 能力接口取代 `instanceof InMemoryStorageFake`；同源 `application/octet-stream` parser 与 binary PUT 仅在存储声明该能力时注册，production `startServer()` 在 `listen` 前创建并注入 filesystem Upload/DeliveryStorage，`createApp()` 的未注入生产硬门仍保留。
- `deploy/debian/env/backend.env.example`、`qimao-backend.service`（StateDirectory/ReadWritePaths）和 `BACKEND-LINUX-RUNTIME.md` 已同步本地盘布局与单机试用边界；无迁移、无新依赖、无前端/DESIGN/真实服务改动。
- 新鲜验证：filesystem 专项 `1 file / 4 tests` 通过；backend typecheck/build、`node --check backend/dist/server.js`、production storage gate、`check:repo`、`git diff --check` 通过。真实 uploads/deliveries PostgreSQL 专项未能启动：项目数据目录的 PID 11716 占用55432但 `pg_isready`/`psql`无响应，`pnpm db:start` 首个错误为 `pg_ctl ... postgres.log: Permission denied`；未删除进程、数据、迁移或默认业务事实，故该项诚实留给规划/环境恢复后复验。
- 任务状态已写回 CURRENT v4-878：`BACK-DEPLOY-STORAGE-01=review / Current actor=规划对话`；FIFO330 服务器任务仍 blocked，不启动公网、Access、Secret、provider 或部署。

## 2026-08-20｜FIFO330新发布通过并停在真实存储门，派发FIFO331

- FIFO330 创建不可变release `20260820-contracts-runtime-v4875`，331个文件；本地/服务器归档SHA256均为 `39CF2B2623074C59CF4C33F776A6C6A17E301AB6103EF653DD611C0882FCA624`，旧release未改。服务器frozen install、根build、contracts普通Node导入均通过。
- production使用受保护环境和普通Node已越过contracts错误，下一首个原始错误为“生产环境尚未配置真实对象存储适配器”；Fastify退出且未监听3001。依条件门未更新current、未启动Nginx/Worker，也未做两站烟雾。PG仍仅回环、37/37空库，时间轮失败计数0，公网仅22。
- 规划裁决一天小样本采用服务器本地磁盘持久存储，不购买COS、不使用内存fake。实现必须完整覆盖UploadStorage与DeliveryStorage、跨进程multipart、同源production二进制分片PUT、原子发布、路径穿越/符号链接防护和production环境注入，不能只在服务器临时写文件类。
- 已派发 `FIFO331-BACK-DEPLOY-STORAGE-01-R1-V4.877`；Access、Secret和真实provider不混入本轮。服务器任务暂停且无需用户操作，不开放公网、不续费。

## 2026-08-20｜FIFO329规划复核通过并恢复FIFO330服务器部署

- 规划逐项核对contracts package/tsconfig与根、后端、两站构建脚本；新鲜执行contracts build、普通Node动态import `ProjectSchema`、backend build、git diff-check均退出0，`packages/contracts/dist`生成84个运行时/声明/映射文件。
- 确认唯一生产解析为Node import/default/main→dist，TypeScript types→src；生成dist不入Git，所有运行/构建入口显式先构建contracts。FIFO329转done，原ERR_MODULE_NOT_FOUND产品首因关闭。
- 派发 `FIFO330-TEST-SERVER-DEPLOY-01-R3-V4.876`：旧release保持不可变，从当前授权源码生成新release与清单/敏感扫描/SHA，服务器重新frozen install/root build，再以既有回环DB环境运行普通Node production硬门。
- 只有Fastify真实监听127.0.0.1:3001且health通过，才进入两站127.0.0.1:8080/8081 Nginx烟雾；下一Storage/Access/provider等readiness首因必须停并交规划，不得development/fake绕过。不开放公网、不续费、不接真实厂商或付费。

## 2026-08-20｜FIFO329 BACK-DEPLOY-RUNTIME-01 Rev1 完成并交规划

- 原样令牌 `FIFO329-BACK-DEPLOY-RUNTIME-01-R1-V4.874`；CURRENT 差量更新至 v4-875，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`。
- 建立唯一 contracts ESM 运行时产物：`packages/contracts/tsconfig.build.json` 输出 `dist/*.js`、声明和 sourcemap；`packages/contracts/package.json` 的 `types` 条件仍服务 TypeScript 源码解析，Node `import/default` 与 `main` 指向 `dist/index.js`。生成 dist 受 `.gitignore` 忽略，不写入源码控制。
- backend、frontend、system-frontend 与根 `dev/build/test` 脚本均显式经过 contracts build；部署文档明确 release 必须整体携带 `packages/contracts/dist`，不得只复制 `backend/dist`。未改业务 API、状态机、迁移、DESIGN、服务器配置或包管理器。
- 新鲜证据：删除旧 contracts/dist 后根 `pnpm run build` 成功（contracts/backend/两站）；contracts typecheck/build、backend typecheck/build、frontend system-control `7/7`、backend OCR sidecar `11/11`、`check:repo`、`git diff --check` 通过；普通 Node 动态 import workspace package 并读取 `ProjectSchema` 成功。
- `NODE_ENV=production node backend/dist/server.js` 已越过 contracts `ERR_MODULE_NOT_FOUND`，下一真实首因是既有 `生产环境必须配置 DATABASE_URL` readiness 门；未注入 fake、未吞错、未连接真实服务。服务器 PG 仅回环，Fastify/Nginx/Worker 未启动。

## 2026-08-20｜FIFO328部署推进至contracts运行时首因并派发FIFO329

- FIFO328 已完成Debian/SSH/资源/仅22公网/Rev5最新时间轮预检；创建与正式unit一致的qimao运行账户并保留legacy qima。PostgreSQL仅监听127.0.0.1:5432，服务器随机测试凭据只写root:qimao 0640环境文件且未回显；正式37/37迁移完成，关键业务表均为0行。
- 固定release依赖安装和contracts/backend/frontend/system-frontend构建成功；Corepack缓存权限与release缺根tsconfig两项部署资产问题已最小修复并留证。
- production普通Node启动首个原始错误为 contracts runtime `ERR_MODULE_NOT_FOUND`：backend/dist仍导入workspace包，但contracts exports指向TypeScript源码，build仅noEmit且没有可运行JS。Fastify未监听3001，尚未进入Storage/Access/provider硬门。
- 规划禁止在服务器复制JS、临时修改exports、改用tsx/development或注入fake，已派发 `FIFO329-BACK-DEPLOY-RUNTIME-01-R1-V4.874` 补正式ESM产物、普通Node解析与干净构建顺序。服务器任务暂停，PG保持仅回环，Fastify/Nginx/Worker保持停止，公网不变且当前无需用户操作。

## 2026-08-20｜FIFO327时间门通过并转FIFO328回环部署

- 原样接收 `handoffToken=FIFO327-TEST-SERVER-OPS-01-R5-V4.872`。Rev5固定阿里云、QQ、百度三源；手动轮和timer连续两轮均3/3成功，spread/median/maxabs保持原门值通过，每轮一次平滑校正成功，失败计数0，timer两轮间隔约5分17秒且无重叠。
- 该证据仅证明一天试用的国内HTTP时间基线；不等同生产可信时间。FIFO325/Rev4六源失败与回滚历史不改写，当前不续费、不购买资源。
- 规划依据用户既有部署授权派发 `FIFO328-TEST-SERVER-DEPLOY-01-R2-V4.873`：只做loopback测试部署。顺序固定为安全/时间预检、PostgreSQL仅回环与安全测试凭据、当前37/37迁移及业务零行、固定release依赖/构建、production Fastify真实硬门；仅硬门通过后才安装两站静态产物与127.0.0.1:8080/8081 Nginx并做烟雾。
- 禁止development/mock/fallback绕过Storage/Access/provider硬门；不开放80/443/3001/5432公网，不改DNS/TLS/防火墙，不接真实厂商、Secret、COS、Sentry或付费。任一新时间轮或阶段首因失败即停止交规划；通过后也先由规划和用户决定是否续费及如何开始网站试用。

## 2026-08-20｜FIFO326 全新国内三源一天试用正式开启

- 用户明确接受仅国内 HTTP Date 来源作为一天试用的临时时间基线，并明确当前不续费。该决定登记为独立 Rev5；FIFO325/Rev4 的六源失败、未校时与安全回滚事实保持关闭，不在旧门上删除国际源或改写结果。
- Rev5 固定且仅允许 `www.aliyun.com`、`www.qq.com`、`www.baidu.com`；每轮各查询一次并要求3/3成功，不允许重试、换源、增加第四源或修改参数。原门值保持 spread≤2秒、|median|≤2秒、最大校正需求≤60秒。
- 唯一运行门为手动成功1轮，再由同一systemd timer连续成功2轮，间隔5±1分钟且无重叠；每轮仅在查询门通过后执行同三源一次平滑校正。任一失败立即停用trial、恢复timesyncd，不自动追加Rev6。
- 三轮通过仅交规划复核并解锁loopback部署评估；不得自行启动PostgreSQL/Nginx/Fastify/Worker、创建DB/env/迁移、开放端口、续费或购买资源。试用到期时间仍为硬停止点。

## 2026-08-20｜FIFO325 Rev4时间共识门失败并最终关闭试用部署

- 原样接收 `handoffToken=FIFO325-TEST-SERVER-OPS-01-R4-V4.869`。Rev4采用systemd原生Logs/State/Runtime目录管理，脚本不再mkdir/chown/rm目录根；两资产SHA一致，服务器静态门通过。
- 手动唯一轮固定六源各查询一次：Debian `-2.125000`、Cloudflare `0`、Microsoft `0.250000`、Aliyun/QQ/Baidu各 `0.125000`；median0.125000、spread2.375000、maxabs2.125000。
- spread超过事先冻结的≤2秒，故门失败；未执行 `htpdate -a` 校时，失败计数1，未进入timer两轮。任务已停止trial/timer并恢复timesyncd active+enabled，`NTP=yes / NTPSynchronized=no`。
- 规划禁止在看到结果后排除Debian、重试、换源或放宽阈值；依“任一失败即停、无Rev5”正式关闭Rev4。PG/Nginx/Fastify/Worker、DB/env/迁移从未启动或创建，端口未开放、不续费、不购买资源。
- 最终结论为该雨云一天试用在当前时间共识门下未通过部署前置；TEST-SERVER-OPS-01转blocked，等待用户未来另选支持正常NTP的供应商，或显式开启一项全新产品/风险决策。

## 2026-08-20｜FIFO324 用户新裁决后启用全新Rev4时间门

- 用户明确希望继续部署，先证明服务器可用再决定是否续费，当前不购买资源。Rev3保持关闭与完整回滚事实，不在旧方案继续叠补丁。
- 规划依据Debian bookworm `systemd.exec(5)`重新冻结Rev4：由systemd `LogsDirectory/StateDirectory/RuntimeDirectory` 自动创建并绑定root-only专属目录，脚本只消费对应环境变量，不再mkdir/chown/rm目录根；service删除ReadWritePaths，不碰共享业务日志根。仍只使用Debian官方htpdate、固定六源、既有门值与一次平滑校正。
- 唯一验收为手动成功1轮，再由同一timer连续成功2轮，间隔5±1分钟且无重叠；任一失败立即停用trial、恢复timesyncd并永久停止本方案，不再Rev5。
- 三轮通过后只交规划，PG/Nginx/Fastify/Worker、DB/env/迁移继续冻结；`2026-08-21 11:04`仍是硬停止点。通过仅证明loopback测试时间基线，不等同生产可信时间，不解锁公网、TLS/JWT、真实Secret/厂商API/COS/Sentry或付费。

## 2026-08-20｜FIFO323 雨云一天试用安全回滚完成

- 原样接收 `handoffToken=FIFO323-TEST-SERVER-OPS-01-R3-V4.866`。依最终裁决只执行安全回滚，未删除Rev3资产、目录或root-only审计，不续费、不购买资源。
- `qimao-htpdate-trial.timer` 已inactive+disabled，trial service inactive+dead/Result=success；原htpdate配置由已核验普通root-owned备份原样恢复，两份SHA256均为 `841d7be93400ad8b7f4d4ede7d1f22a1865d79e0a4a41a7df1d94d91b9a9090a`。包daemon为loaded+inactive+disabled。
- `systemd-timesyncd` 已active+enabled，`NTP=yes / NTPSynchronized=no`，诚实保留供应商屏蔽UDP/123事实；未手工校时或以HTTP Date继续绕过。
- PostgreSQL/Nginx保持inactive+masked-runtime，Fastify/Worker、DB/角色/env/迁移均未创建或启动；最终只监听SSH 22，80/443/3001/5432无监听，DNS/TLS/防火墙未改。
- 最终结论：本雨云一天试用在当前可信时间门下未通过部署前置，不再追加Rev3修补。TEST-SERVER-OPS-01转blocked等待用户另选供应商或明确开启全新方案；FIFO317–323统一收口关闭。

## 2026-08-20｜FIFO322 Rev3命中最终停止门并转安全回滚

- 原样接收 `handoffToken=FIFO322-TEST-SERVER-OPS-01-R3-V4.865`。专属日志目录、状态目录、两资产SHA、服务器静态门和旧daemon状态均通过，但timer首个真实触发仍在任何HTTP查询/校时前失败。
- 新鲜首因为 `ProtectSystem`命名空间内脚本对专属日志路径执行 `mkdir -p` 时，共享父目录只读并返回Permission denied；service exit1/FAILURE，六源query、校时、日志与失败计数均未发生。timer已停止，PG/Nginx/Fastify/Worker/DB继续冻结。
- 依FIFO321已冻结“本修正仍失败即停”，规划不允许第三次script/unit修补或改用StateDirectory/LogsDirectory等新路径；结论固定为该雨云主机在一天试用、零额外费用、当前可信时间门下未通过部署前置。
- 已派发安全回滚：禁用并停止Rev3 timer/service、恢复原htpdate配置但保持包daemon禁用、恢复并启用timesyncd，保留root-only审计与已安装资产/目录；不删除数据，不启动应用/数据库，不开放端口，不购买或续费。回滚状态与端口核对完成后再正式关闭任务。

## 2026-08-20｜FIFO321 拒绝修改共享日志根并隔离时间任务子目录

- 原样接收 `FIFO321-TEST-SERVER-OPS-01-R3-V4.864`。只读核验确认 `/var/log/qimao-terms-cloud` 是非符号链接真实目录，当前 `qima:qima 0750`；状态父/子目录缺失，未chown/chmod、未创建目录、未重启timer。
- 规划核对部署文档与后端/Worker systemd单元：共享日志根必须供业务账户写入，直接改为root:adm会破坏后续Fastify/Worker，因此明确拒绝修改共享根所有权、权限或内容。
- 批准Rev3唯一最小资产修正：脚本日志目录改为 `/var/log/qimao-terms-cloud/time-trial`，service `ReadWritePaths`同步指向该专属子目录；创建专属日志子目录root:adm0750、状态父目录root:root0755、状态子目录root:root0700。仅更新/重传script与service两项并重做SHA、`bash -n`、`systemd-analyze verify`。
- 本修正若仍失败即停，不再追加修正；timer两轮通过前应用/数据库继续冻结。后续应用启动前另设账户命名门：服务器现有 `qima` 与仓库unit `User=qimao` 必须一致，但本轮不得顺手改账户或业务unit。

## 2026-08-20｜FIFO320 226/NAMESPACE首因与目录前置单点裁决

- 原样接收 `handoffToken=FIFO320-TEST-SERVER-OPS-01-R3-V4.863`。正确公钥路径恢复后，主机指纹、`whoami=qimao-deploy`、`sudo -n` 成立；三资产上传SHA256一致，root-owned安装、服务器 `bash -n` 与 `systemd-analyze verify` 均通过。
- timer首轮在任何HTTP查询/校时前以 `ExecMainStatus=226/NAMESPACE` 失败；journal首因为 `ReadWritePaths` 目标 `/var/lib/qimao-terms-cloud/time-trial` 不存在。timer已停止，Rev3 service保持failed，应用/数据库未启动。
- 规划核对本地资产确认：systemd在ExecStart前建立命名空间，脚本内的mkdir尚未执行，因此目录必须由部署步骤预创建。批准仅创建 `/var/log/qimao-terms-cloud` root:adm 0750、`/var/lib/qimao-terms-cloud` root:root 0755、`/var/lib/qimao-terms-cloud/time-trial` root:root 0700；不改script/unit/timer逻辑，不新增路径、重试或客户端。
- 精确路径/非符号链接/权限、服务器静态门和旧daemon状态复核通过后，只可reset-failed本Rev3 service并启动既有timer；首轮成功后再观察第二轮 `5±1` 分钟且无重叠。任一失败或周期不符立即停止并交规划，不追加修复；PG/Nginx/Fastify/Worker/DB仍冻结。

## 2026-08-20｜FIFO319 SSH密钥可见性根因为路径拼写并恢复

- 原样接收 `handoffToken=FIFO319-TEST-SERVER-OPS-01-R3-V4.862`。最后一次SSH命令使用的私钥名为 `qima_test_server_20260820_ed25519`，真实既有文件为 `qimao_test_server_20260820_ed25519`，少一个字母 `o`；对应 `.pub` 同样存在。
- 规划仅通过受控外部执行核对文件存在、名称、长度和创建/修改时间，未读取、复制、显示或移动私钥，也未枚举其他密钥。真实文件时间与本日bootstrap记录一致。
- 正确路径已交回服务器任务；只允许执行一次既定BatchMode+StrictHostKeyChecking只读SSH核验，确认登记主机指纹、`whoami=qimao-deploy` 与 `sudo -n` 后，才恢复三资产上传/SHA/服务器静态验证与timer连续两轮。失败即停，不新增密钥或第三通道。

## 2026-08-20｜FIFO318 内置浏览器恢复并收敛唯一SSH上传通道

- 原样接收 `handoffToken=FIFO318-TEST-SERVER-OPS-01-R3-V4.861`。用户已在Codex内置浏览器登录雨云，详情页DOM和VNC root提示符可读；旧daemon inactive+masked-runtime门继续成立。
- 三项Rev3资产仍只存在仓库，尚未上传/安装/启用；最近一次SSH/scp因外部执行环境间歇不可见专用私钥而未连接成功，未复制、显示或降级SSH。
- 规划只允许既有 `qimao-deploy` 公钥由OpenSSH直接消费，精确ssh/scp可使用受控外部执行；私钥路径仅作 `-i` 参数，不得读取/复制/显示/移动或写临时目录。禁止VNC大段粘贴/base64、临时HTTP下载、密码登录或降低SSH策略。
- 同一安全上下文仍无法看见密钥即转 `blocked_on_ssh_key_visibility`，不新增第三通道；成功后才按既定顺序做上传、SHA256、服务器静态验证与连续两轮timer观察，应用/数据库继续冻结。

## 2026-08-20｜FIFO317 旧daemon截图门通过并恢复Rev3安全上传

- 原样接收 `handoffToken=FIFO317-TEST-SERVER-OPS-01-R3-V4.860`。用户VNC截图确认 `htpdate LoadState=masked / ActiveState=inactive / SubState=dead / UnitFileState=masked-runtime`，Rev3首个安全门通过。
- 本地仅新增 `deploy/debian/htpdate/qimao-htpdate-trial`、`.service`、`.timer`，尚未上传或启用；PostgreSQL仍inactive+masked-runtime、15/main down，DB/角色/env/迁移/端口无变化。
- 规划恢复服务器任务并要求优先复用此前已验证的 `qimao-deploy` 专用公钥SSH；不得复制/显示私钥、降低SSH策略或改走VNC大段粘贴/base64/cron/第二客户端。恢复后先核对主机指纹、用户、sudo，再对三资产做临时上传/SHA256、root-owned安装、服务器 `bash -n` 与 `systemd-analyze verify`。
- 静态门通过后才允许启用timer并观察至少连续两轮 `5±1` 分钟；两轮通过前PG/Nginx/Fastify/Worker与数据库继续冻结，任一步失败即停并交规划。

## 2026-08-20｜FIFO316 截图确认旧htpdate仍active并派发唯一停止动作

- 原样接收 `handoffToken=FIFO316-TEST-SERVER-OPS-01-R3-V4.859`。用户截图确认旧 `htpdate=active/enabled`、`systemd-timesyncd=inactive/enabled`，此前 stop/runtime mask 未生效；Rev3先决门明确未通过。
- 规划已向服务器任务派发唯一可逆恢复动作：仅在用户可见root VNC中执行一次 `systemctl stop htpdate.service && systemctl mask --runtime htpdate.service`，同一行立即只读输出LoadState/ActiveState/SubState/UnitFileState与结束标记。
- 任一报错或未得到 `ActiveState=inactive / UnitFileState=masked-runtime` 即停止；证据成立前不创建Rev3 script/unit/timer/state，不启动PG/Nginx/Fastify/Worker，不生成DB/env/迁移或开放端口。

## 2026-08-20｜FIFO315 只读状态命令已提交但输出仍不可读

- 原样接收 `handoffToken=FIFO315-TEST-SERVER-OPS-01-R3-V4.858`。Edge重启后雨云详情DOM恢复可读，VNC Terminal input已激活；任务只提交一次对 `htpdate`、`systemd-timesyncd` ActiveState/UnitFileState和结束标记的只读查询。
- 提交后终端文本和截图再次超时，未重复输入；旧 `htpdate` 仍严格记为 `verification_pending`。
- Rev3资产写入0，PG/Nginx/Fastify/Worker、DB/env/迁移/端口无变化。恢复输入只需用户截取当前VNC终端画面回传，无需再次运行命令。

## 2026-08-20｜FIFO314 用户重开VNC后读取通道仍阻塞

- 原样接收 `handoffToken=FIFO314-TEST-SERVER-OPS-01-R3-V4.857`。用户已重新打开雨云 VNC；Edge扩展和内置浏览器对详情页/iframe DOM、截图仍连续超时，专用公钥执行上下文也无法访问用户 `.ssh` 私钥。
- 归因收敛为浏览器/执行通道不可读，不再要求用户重复刷新页面；旧 `htpdate` 状态仍只能记 `verification_pending`。
- Rev3 script/unit/timer/state 写入0，未重复stop/mask，PG/Nginx/Fastify/Worker及DB/env/迁移/端口无变化。恢复路径改为用户在可见root VNC执行一条只读 `systemctl show` 并回传无敏感截图，或等待安全公钥路径恢复。

## 2026-08-20｜FIFO313 Rev3先决门因VNC读取超时暂停

- 原样接收 `handoffToken=FIFO313-TEST-SERVER-OPS-01-R3-V4.856`。任务只执行旧 `htpdate` daemon 停止状态的只读确认门；尝试关闭卡住的临时页、重新打开雨云详情/VNC并切回原标签后，DOM、截图与控制台画面仍连续超时。
- 当前执行上下文无法读取用户 `.ssh` 中的专用私钥，未复制、显示或绕过私钥保护；因此上轮 stop/mask 结果只能保持 `verification_pending`，不能宣称 inactive+masked。
- 严格按规划先决门停止：Rev3 script/unit/timer/state 写入0，未重复 stop/mask，PG/Nginx/Fastify/Worker、DB/env/迁移/端口均无变化。任务转 `blocked / Current actor=用户`。
- 恢复输入只需用户刷新或重新打开雨云 VNC，使既有root shell画面可读；恢复后的第一条动作仅允许执行 `systemctl show/is-active` 只读核验，通过后才继续单一htpdate oneshot+timer。

## 2026-08-20｜FIFO312 HTP Rev2归因与Rev3单一定时路径裁决

- 原样接收 `handoffToken=FIFO312-TEST-SERVER-OPS-01-R2-V4.855`。Rev2固定六源 query-only 全部RC=0，offset `0–0.125s`、散布0.125s、控制端交叉偏差约0.576s、最大校正需求0.125s，来源一致性门通过。
- Debian `htpdate` 常驻模式每次校正后固定休眠30分钟并再叠加300秒，实际约35分钟一轮，无法满足已冻结的5分钟持续核验；这不是来源、DNS或配置拼写失败。旧常驻进程的停止结果仍须先完成只读确认，PG/Nginx/Fastify继续禁止启动。
- 规划选择方案A：只复用同一 `htpdate`，以root-owned systemd oneshot+timer每5分钟执行固定六源查询、一次平滑校正与审计；不引入cron、第二客户端或第七来源。连续两轮失败必须停止测试栈；只有旧daemon确认inactive/masked、unit/script验证通过并观察连续两轮 `5±1` 分钟真实成功后，才恢复loopback部署。
- `2026-08-21 11:04` 仍为硬停止点。到期前禁用并清理本任务拥有的timer/service/script/state，保留审计，恢复原htpdate配置与timesyncd；不续费、不购买资源，不解锁公网、真实Secret/厂商API/COS/Sentry或付费调用。

## 2026-08-20｜HTP-TRIAL Rev2 固定来源池唯一复测

- Rev1 全程 query-only：Debian offset 0.125s、Cloudflare 0.250s 成功，kernel.org 无合适同步响应/RC=1；控制端与远端末次 UTC 约差0.6秒。未带 `-s/-a`、未改时钟、未启动 daemon/PG/Nginx/Fastify。
- 规划不把2/3冒充通过，也不把单个 HTTP 端点不适合直接等同整机不可用。唯一 Rev2 在运行前冻结 Debian、Cloudflare、Microsoft、Aliyun、QQ、Baidu 六源，每源只查询一次；结果后不得增源、重试或改参数。
- 通过必须至少3个独立操作方成功，同时含国内与国际来源，成功源散布≤2秒、与本机UTC偏差≤2秒、校正需求≤60秒。任一总体门失败即最终回滚 HTP、恢复 timesyncd，并关闭为该供应商一天试用不适合本项目可信时间门；不得再 Rev3。

## 2026-08-20｜TEST-SERVER-DEPLOY-01 批准有界 HTP 试用时间基线

- 雨云客服确认机房因 NTP 攻击长期屏蔽 NTP 流量，多个地址 UDP/123 超时是供应商长期网络策略，不是临时故障、DNS、续期或用户配置问题。
- 为完成一天、零费用、仅验证可用性的目标，规划批准 Debian 12 官方 `htpdate` 作为 `trial_only_http_consensus`：至少3个独立 HTTP Date 来源成功，源间散布≤2秒、与本机UTC偏差≤2秒、校正需求≤60秒；仅允许平滑校正并每5分钟持续核对，连续两轮不满足立即停止应用。
- 该时间基线不等同可信生产同步，不得标为 `NTPSynchronized=yes`，不得解锁公网、TLS/JWT/Access、真实 Secret、厂商 API、COS/Sentry、付费调用或生产发布。到期前停应用、数据库与 HTP，并恢复原 timesyncd 配置；不续费、不购买资源。
- 服务器固定任务已恢复执行；通过时间门后只继续 PostgreSQL 回环、37/37迁移/业务零行、两站 loopback Nginx 和 production Fastify 硬门验证，仍禁止 development/mock/fallback。

## 2026-08-20｜TEST-SERVER-DEPLOY-01 收敛为一天试用验证

- 用户明确该服务器只用于先试用一天，当前不续期、不购买资源、不产生续期费用；规划已删除“续期”恢复前置。
- 唯一恢复门为雨云工单修复 UDP/123 出站/回包路径，并由现有 `systemd-timesyncd` 新鲜复验 `NTPSynchronized=yes / Packet count>0` 及状态/偏差合理。
- `2026-08-21 11:04` 为硬停止点。若修复来不及，结论固定为供应商网络门导致试用期内无法完成验证；不使用手工校时、HTTP Date、第二 NTP 客户端、换源、购买或续费绕过。

## 2026-08-20｜TEST-SERVER-DEPLOY-01 因可信时间同步门暂停

- Debian 12、SSH/公钥/sudo 加固和主机资源预检通过；已安装 Nginx 1.22.1、PostgreSQL 15.18、Node 24.19.0、pnpm 11.21.0 等最小运行时，并准备/解压 SYSTEM-09 v4-851 发布快照。
- PostgreSQL、Nginx、Fastify 均未启动；数据库角色、数据库、运行环境文件、迁移和业务数据均未创建，公网仍仅22可达。发布快照与 runtime masks 保留，未形成半运行业务状态。
- 唯一阻塞为 `systemd-timesyncd` active、DNS正常，但多个公网 NTP 地址连续 UDP/123 reply timeout，`NTPSynchronized=no / Packet count=0`。规划禁止手工校时、HTTP Date、换源、第二客户端或其他旁路。
- `TEST-SRV-20260820-005=P1 confirmed`。恢复门仅为雨云工单修复实例/宿主 UDP/123 出站或回包路径；仅在现有 timesyncd 新鲜复验同步成功后，继续 PostgreSQL 回环配置、测试凭据、37/37迁移和应用部署。

## 2026-08-20｜TEST-SERVER-DEPLOY-01 获得用户授权并启动

- 用户明确授权在既有 Debian 12 测试服务器安装基础软件并部署测试环境；现有“测试服务器接入与问题记录”固定任务已成功唤醒并进入执行 turn。
- 执行边界为只读预检、最小 Debian 运行时、loopback/SSH 隧道部署、新测试数据库从零37/37迁移与业务零行、两站/Fastify/health/监听/安全烟雾；常规安装步骤无需重复确认。
- 不自行开放80/443、修改DNS/TLS或接入真实 FunASR/PaddleOCR、云厂商 Secret、COS/Sentry、付费调用。production Storage/Access/provider 若构成硬门，必须保留首因并停止，不以 development/mock/fallback 绕过。

## 2026-08-20｜SYSTEM-09 规划最终关闭

- 规划接收并复核 `handoffToken=FIFO311-TEST-SYSTEM-09-R2-V4.847`：从零当前37/37迁移的精确隔离 PostgreSQL 上，唯一完整 `pnpm check` 退出码0；Vitest `46 files / 447 tests` 与四工作区 lint/typecheck/build 全通过。
- FIFO309 正式 Fastify、两站 production build、零网络有序路由/本地 OCR sidecar、operations、系统 Chrome 双视口及权限矩阵继续冻结为有效证据，最终 `P0/P1/P2/P3=0/0/0/0`，无 `QA-SYSTEM-09-*`。
- 隔离库、端口、浏览器和进程残留均为0；共享 PostgreSQL 55432 未迁移、未清理、未写入。SYSTEM-09 的 UI/BACK/FRONT/TEST 切片统一转 `done`，FIFO308–311 统一转 `closed`。
- 真实 FunASR/PaddleOCR、云厂商、Secret、外部网络、付费及生产发布不计入本次完成事实。测试服务器 SSH 加固里程碑已关闭，基础软件安装与测试环境部署继续等待用户单独授权。

## 2026-08-20｜FIFO311 TEST-SYSTEM-09 Rev2 唯一完整门通过并交规划复核

- 原样令牌 `FIFO311-TEST-SYSTEM-09-R2-V4.847`；CURRENT 差量更新至 v4-849：`FIFO311=review`、`TEST-SYSTEM-09 Rev2=review`、`Current actor=规划对话`。
- 前置 `check:repo` 与 `git diff --check` 通过。创建精确隔离数据库并从零执行当前37/37迁移，`schema_migrations=37`、`projects=0`；共享默认库未迁移、未清理、未写入。
- 按要求仅运行一次 `DATABASE_URL` 绑定隔离库的完整 `pnpm check`，退出码0：Vitest `46 files / 447 tests` 全通过，四工作区 lint/typecheck/build 全通过；未重试、未跳过、未并行。SYSTEM-09 Rev1 的 P0–P3=0 证据冻结，Rev2 未发现 QA-SYSTEM-09。
- 精确 DROP 隔离库并确认 `qimao_system09_*` 残留0；本轮监听端口、pnpm/vitest 进程0；共享 PostgreSQL 55432 保持运行。原始日志/脱敏证据位于 `C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qa-evidence-fifo311\\`；生产 frontend/system-frontend/backend/contracts/migrations/tests/DESIGN 修改0。

## 2026-08-20｜FIFO311 TEST-SYSTEM-09 Rev2 最终唯一完整门领取

- 原样令牌 `FIFO311-TEST-SYSTEM-09-R2-V4.847`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。CURRENT 差量更新至 v4-848：`FIFO311=active`、`TEST-SYSTEM-09 Rev2=in_progress`、`Current actor=全链测试与质量验收对话`。
- 冻结 FIFO309 全部产品/浏览器/专项/P0–P3=0 证据，不重复；本轮仅做 `check:repo`、`git diff-check`、从零37/37迁移的精确隔离数据库、唯一一次完整 `pnpm check`、精确 DROP 与孤儿核对。共享默认库严禁迁移或清理，生产代码/tests/contracts/migrations/frontend/system-frontend/DESIGN 修改0。

## 2026-08-20｜FIFO310 规划复核通过并登记 FIFO311 最终完整门

- 规划审查确认两份测试只改变注入数据库的资源所有权与 afterAll 关闭顺序，无生产/业务断言、timeout、sleep/retry/fallback 变化。
- 规划新鲜运行 `pre-review.test.ts + system-control-operations.test.ts --no-file-parallelism` 为 `2 files / 15 tests` 全通过；`git diff --check` 仅既有 CRLF 提示。
- FIFO310 关闭，登记 `FIFO311-TEST-SYSTEM-09-R2-V4.847`：FIFO309 产品/浏览器矩阵全部冻结，只在一份从零37迁移隔离库上运行本轮唯一完整 `pnpm check`，清理后交规划最终关闭。

## 2026-08-20｜FIFO310 BACK-TEST-HEALTH-02 Rev1 完成并交规划复核

- 原始令牌 `FIFO310-BACK-TEST-HEALTH-02-R1-V4.844`；CURRENT 差量更新至 v4-846，状态 `FIFO310=review / BACK-TEST-HEALTH-02 Rev1=review / Current actor=规划对话 / Reviewer=规划对话`。
- 根因证据：`qa-evidence-fifo309/full-pnpm-check.log` 两项均在 `afterAll` 首行 `await app.close()` 抛出默认10秒 Hook timeout；`backend/src/app.ts` onClose 调用注入数据库 `end()`，因此卡在应用关闭等待外部 pool，未到 admin terminate/DROP。应用测试注入 query/connect 代理且 `end` 不拥有外部 pool，afterAll 由测试独占 `pool.end()`，随后按单一顺序 terminate、DROP、确认不存在、关闭 admin。
- 仅修改 `tests/backend/pre-review.test.ts`、`tests/backend/system-control-operations.test.ts` 的测试隔离清理；无 timeout 放宽、sleep/retry/fallback、第二清理链、生产代码/契约/迁移/前端/DESIGN 改动。清理中的历史临时库 `qimao_prereview_30788_9580375e5c` 已按本任务归属精确 DROP，未触碰共享业务数据。
- 新鲜验证：pre-review `7/7`，operations `8/8`；两文件正序 `15/15`、反序 `15/15`；与 system-control-routing、system-control-strategy-runtime 邻近串行组合 `31/31`；backend typecheck/build、git diff-check 通过；查询 `qimao_prereview_*`/`qimao_operations_*` 残留为 `[]`。未运行完整 `pnpm check`，留 TEST 关闭门。

## 2026-08-20｜FIFO310 BACK-TEST-HEALTH-02 Rev1 资源清理收口进行中

- 原样令牌 `FIFO310-BACK-TEST-HEALTH-02-R1-V4.844`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。CURRENT 已差量写回 `FIFO310=active / BACK-TEST-HEALTH-02 Rev1=in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。
- 原始 `C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qa-evidence-fifo309\\full-pnpm-check.log` 的两个失败均定位在对应 `afterAll` 首个 `await app.close()`；`backend/src/app.ts` 的 onClose 会调用注入数据库的 `end()`，全套顺序下在应用关闭阶段等待外部测试 pool，未进入 terminate/DROP。未放宽 hook timeout、未加 sleep/retry/fallback。

## 2026-08-20｜FIFO309 规划裁决为测试健康返工并登记 FIFO310

- FIFO309 正式产品矩阵与 `447/447` 测试断言通过，P0/P1/P2/P3=`0/0/0/0`；唯一完整 `pnpm check` 未通过的两项均为 `pre-review.test.ts`、`system-control-operations.test.ts` 的 `afterAll` 隔离清理钩子默认10秒超时，因此 SYSTEM-09 暂不关闭。
- 规划只读核对两套件均使用注入外部 PostgreSQL pool 的 Fastify app，并在 afterAll 执行 app关闭、管理连接终止、DROP 与残留确认；登记 `FIFO310-BACK-TEST-HEALTH-02-R1-V4.844`，只允许诊断和修正测试资源所有权/关闭顺序。
- 禁止放宽 timeout、sleep/retry、跳过、第二清理路径或生产代码修改。后端完成专项与相邻组合后交规划，再由 TEST 运行新的唯一完整关闭门。

## 2026-08-20｜FIFO309 TEST-SYSTEM-09 Rev1 全链验收完成并交规划复核

- 原样令牌 `FIFO309-TEST-SYSTEM-09-R1-V4.839`；权限指纹保持 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。CURRENT 差量更新至 v4-843：`FIFO309=review`、`TEST-SYSTEM-09 Rev1=review`、`Current actor=规划对话`。
- 正式 Fastify、员工/system-frontend production build、从零当前37项迁移隔离 PostgreSQL、零网络路由/Registry/Worker、本地 OCR sidecar、Playwright/系统 Chrome 双视口矩阵完成；routing 7/7、OCR sidecar 11/11、operations 8/8、纵向权限/两站隔离/路由安全前进/Attempt固定身份/管理员 routing/changes/logs 均通过，P0/P1/P2/P3=`0/0/0/0`，无 `QA-SYSTEM-09-*` 产品缺陷包。
- 末尾按要求仅运行一次、并绑定独立从零37迁移数据库的完整 `pnpm check`：退出码1；`check:repo`、四工作区 lint/typecheck、迁移检查通过，Vitest `44 passed / 2 failed`、`447 passed`，两项失败均为 `tests/backend/pre-review.test.ts` 与 `tests/backend/system-control-operations.test.ts` 的 `afterAll` 隔离清理默认10秒超时，无产品断言失败。未重试、未放宽 timeout、未覆盖原始日志；原始输出位于 `C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qa-evidence-fifo309\\full-pnpm-check.log`。
- 报告：`docs/testing/SYSTEM-ordered-execution-routing-integration-report.md`；脱敏证据：`C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qa-evidence-fifo309\\summary.json`。隔离数据库、临时端口、Worker、测试 Chrome、harness 均已精确清理，`qimao_system09_*` 残留为0，共享 PostgreSQL 55432 未迁移/未清理并保持原运行态；生产 frontend/system-frontend/backend/contracts/migrations/DESIGN 修改0。

## 2026-08-20｜FIFO309 TEST-SYSTEM-09 Rev1 恢复执行

- 用户明确恢复同一令牌；权限重新确认：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- CURRENT 已差量更新至 v4-842：`FIFO309=active`、`TEST-SYSTEM-09 Rev1=in_progress`、`Current actor=全链测试与质量验收对话`、`Reviewer=规划对话`。
- routing 7/7、OCR sidecar 11/11、operations 8/8、`check:repo` 与 `git diff --check` 既有新鲜证据冻结；从暂停时未完成的六文件专项重新开始，不重复上述通过项，不启动完整 `pnpm check`，直到正式矩阵与清理完成后末尾唯一运行一次。

## 2026-08-20｜FIFO309 TEST-SYSTEM-09 Rev1 用户即时暂停

- 用户要求立即暂停；CURRENT 已差量更新至 v4-841：`TEST-SYSTEM-09 Rev1=blocked / Current actor=规划对话`、`FIFO309=paused`，原因“用户即时暂停”，不记业务失败。
- 实际完成：权威文件读取、权限指纹/领取写回、`check:repo`、`git diff --check`；新鲜专项独立结果为 routing `7/7`、local OCR sidecar `11/11`、operations `8/8`。五文件合跑原始输出保留：`3 failed / 2 passed`、`19 failed / 26 passed / 15 skipped`；首因是旧 asr/screen-text 夹具直接插入 routing pool 时未提供当前37项迁移要求的 `max_concurrent_jobs`，operations 合跑 afterAll 超时但独立重跑8/8通过；这些是测试夹具/运行编排事实，不直接归因产品。
- 用户暂停时正在运行的六文件 system-control 专项已安全中止，未运行完整 `pnpm check`，不再启动新测试。精确核对无 `qimao_*` 隔离数据库残留、3000/3010/3001/3011 无监听、无本轮 Node/pnpm/Vitest/Chrome 进程；`127.0.0.1:55432` 仍可连接。生产代码、contracts、迁移、DESIGN、真实素材均未修改。

## 2026-08-20｜FIFO309 TEST-SYSTEM-09 Rev1 领取并进入 in_progress

- 原样接收 `handoffToken=FIFO309-TEST-SYSTEM-09-R1-V4.839`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- CURRENT 已差量更新至 v4-840：`FIFO309=active`、`TEST-SYSTEM-09 Rev1=in_progress`、`Current actor=全链测试与质量验收对话`、`Reviewer=规划对话`。
- 本轮只验收正式有序执行路由、安全前进、本地 OCR sidecar、operations 投影、管理员 routing/changes/logs、权限/两站隔离、双视口与本切片唯一完整 `pnpm check`；以当前 `backend/migrations/*.cjs=37` 为权威。禁止真实供应商、Secret、网络、付费、部署和生产代码修改。

## 2026-08-20｜FIFO308 规划裁决通过并解锁 FIFO309 SYSTEM-09 最终关闭门

- 规划独立计数确认当前 `backend/migrations/*.cjs` 为37个；FIFO308 已从零执行37/37且 `schema_migrations=37`。派发中的“38迁移”是沿用旧快照的输入口径，不是产品、迁移或环境失败。
- FIFO308 产品场景 `10/10`、`P0/P1/P2/P3=0/0/0/0`，pending ErrorBlock 焦点、stale/requestId/唯一读取锁、真实200后H1与 console/pageerror 均成立；生产代码修改0、隔离资源清理完成。
- 登记 `FIFO309-TEST-SYSTEM-09-R1-V4.839` 为最终全链关闭门：统一验证有序执行路由、安全前进、本地OCR sidecar、operations只读投影、管理员 routing/changes/logs、权限与两站隔离，最后运行唯一完整 `pnpm check`。真实供应商、Secret、网络、付费、服务器部署继续冻结。

## 2026-08-20｜FIFO308 FRONT-SYSTEM-09C Rev6 UI 单项 production 微复验完成并交规划

- 原样令牌 `FIFO308-FRONT-SYSTEM-09C-R6-UI-R1-V4.836`；CURRENT 已差量更新至 v4-838，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`。
- 新鲜 system-frontend production build 45 modules；正式 Fastify + 从零执行仓库当前全部迁移的精确隔离 PostgreSQL + 零网络连接检查 Worker + Playwright 1.62.1/系统 Chrome。请求场景 `10/10`、`P0/P1/P2/P3=0/0/0/0`：第三次“重新读取”按钮先真实获焦；pending 时同一 `role=alert` ErrorBlock、`fifo308-stale-2`、stale 行与唯一 disabled“读取中…”保持，activeElement 精确为 ErrorBlock；真实200后错误投影清除并聚焦“日志与质量”H1。
- application console error/warn=`0/0`、pageerror=`0`；两条受控 operations GET 503 与同一完整 query、`fifo308-stale-1/2` 精确对账并单列。两张当前运行截图已人工打开核对，pending/成功画面完整，无空白、裁切或错误页面。
- 原始 `results.json` 保持 `12/11/1`：唯一失败为环境输入计数，不是产品断言。派发要求“38迁移”，但当前仓库正式迁移文件实际37个；node-pg-migrate 已从零执行37/37且隔离库 `schema_migrations=37`。另存 `adjudication.json`，不改写原始结果，交规划校正权威口径后决定是否解锁 TEST。
- 隔离库残留0，3001/3010无监听，测试 Chrome/profile、preview/Fastify与临时 harness已清理，共享 PostgreSQL 55432保持running。生产代码/契约/迁移/DESIGN修改0；未跑完整矩阵、pnpm check或Impeccable，未通知FRONT/BACK/TEST，未提交推送部署。

## 2026-08-20｜FIFO308 FRONT-SYSTEM-09C Rev6 UI 单项 production 微复验领取

- 原样接收 `handoffToken=FIFO308-FRONT-SYSTEM-09C-R6-UI-R1-V4.836`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- CURRENT 已差量更新至 v4-837：FIFO308=`active / in_progress`，FRONT-SYSTEM-09C Rev6 保持 `review / Current actor=UI设计对话 / Reviewer=UI设计对话`。
- 本轮只在新鲜 production system-frontend + 正式 Fastify + 从零38迁移隔离 PostgreSQL + 零网络 Worker + Playwright/系统 Chrome 下复验 `/logs` 同一完整 query 第三次显式“重新读取”进入 pending 后 ErrorBlock `role=alert` 的精确焦点、错误投影/requestId/stale/唯一禁用按钮存活及真实200后H1；仅抽查 console/pageerror 与受控请求。其余全部冻结，生产代码修改0，不运行完整矩阵、pnpm check 或 Impeccable，不通知 FRONT/BACK/TEST。

## 2026-08-20｜FIFO307 通过规划代码门；解锁 FIFO308 单项 UI 微复验

- 规划核对 `focusWhenBusy` 为默认关闭的纯焦点参数，只在 busy false→true 的 layout 阶段聚焦 ErrorBlock 根；logs 仅对当前完整 query 的显式错误恢复启用，其他 ErrorBlock 与普通刷新不受影响。
- 新鲜日志专项 `11/11`、system-frontend typecheck、`git diff --check` 通过；前端管理员组合 `7 files / 98 tests` 与 production build 45 modules 保留。
- 登记 `handoffToken=FIFO308-FRONT-SYSTEM-09C-R6-UI-R1-V4.836`，只在正式 Chrome 复验 pending 禁用瞬间 ErrorBlock 接管与成功 H1；通过后直接路由 TEST-SYSTEM-09。

## 2026-08-20｜FIFO307 FRONT-SYSTEM-09C Rev6 完成并交规划

- 原样令牌 `handoffToken=FIFO307-FRONT-SYSTEM-09C-R6-V4.833`；状态已写回 CURRENT v4-835：`FIFO307=review`、`FRONT-SYSTEM-09C Rev6=review`、Current actor=规划对话、Reviewer=规划对话。权限指纹保持 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 仅新增公共 ErrorBlock 的可选 `focusWhenBusy` 语义，默认关闭；它以 busy false→true 的布局提交为触发条件，不在普通 busy、挂载或其他页面抢焦。`/logs` 仅对同一完整 query 的显式错误重读启用，原生 disabled 后焦点落到同一 ErrorBlock `role=alert`，旧 stale/requestId/唯一按钮保持；真实成功后清投影并聚焦 H1，普通/自动刷新、身份变化与迟到响应不继承。
- 新鲜验证：管理员组合 7 files / 98 tests、日志定向 11/11、system-frontend typecheck、Vite production build 45 modules、`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未跑完整 `pnpm check`、浏览器矩阵或 Impeccable；未改 ControlShell/routing/CSS/API/backend/contracts/migrations/DESIGN/员工站/服务器，未提交/推送/部署。

## 2026-08-20｜FIFO307 FRONT-SYSTEM-09C Rev6 领取

- 原样接收 `handoffToken=FIFO307-FRONT-SYSTEM-09C-R6-V4.833`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。状态已写回 CURRENT v4-834：`FIFO307=active`、`FRONT-SYSTEM-09C Rev6=in_progress`、Current actor=前端开发对话、Reviewer=规划对话。
- 本轮只修 FIFO306 唯一剩余 P1：公共 ErrorBlock 增加默认关闭的 busy→true 布局聚焦参数，仅 `/logs` 当前完整 query 的显式错误重读 pending 启用；普通 busy、其他页面、初始挂载、成功 H1、身份变化与其他业务冻结。

## 2026-08-20｜FIFO306 收敛为唯一原生 disabled 焦点；登记 FIFO307

- FIFO306 production 微复验 `23项/22通过/1失败`。routing 真实遮罩/pending、logs 错误投影/requestId/唯一禁用按钮/成功 H1、1024 真实侧栏遮罩/几何/层级与 console 均通过。
- 唯一失败已定位为浏览器原生行为：第三次重读后按钮切为 `disabled` 会自动失焦到 BODY，即使 ErrorBlock DOM 与错误事实仍稳定存在。它不涉及 API、读取身份、业务状态或布局。
- 登记 `handoffToken=FIFO307-FRONT-SYSTEM-09C-R6-V4.833`：只为 ErrorBlock 增加可选 pending 安全焦点请求，并仅由 logs 当前 query 的错误重读使用；补单项回归后交规划，不改其他业务或运行完整矩阵。

## 2026-08-20｜FIFO306 FRONT-SYSTEM-09C Rev5 UI 最后三场景微复验完成并交规划

- 原样令牌 `FIFO306-FRONT-SYSTEM-09C-R5-UI-R1-V4.830`；CURRENT 已差量更新至 v4-832，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`。
- 新鲜 system-frontend production build 45 modules；正式 Fastify + 从零全部38迁移精确隔离 PostgreSQL + 零网络连接检查 Worker + Playwright 1.62.1/系统 Chrome 最终原始矩阵 `23项/22通过/1失败`，`P0/P1/P2/P3=0/1/0/0`。
- A 通过：真实鼠标 mousedown 命中遮罩即卸载 Modal，最终焦点精确回“新建路由草稿”；pending 遮罩不关闭。C 通过：1024 真实 `sidebar-overlay` 可见且 hit-test 可达，sidebar=216、workspace x=72/width=952、根无横溢，鼠标关闭回展开触发点，高层 Modal/Drawer 不被截获；1440 无遮罩。D 通过：application console error/warn=0/0、pageerror=0，受控两条503单列。
- 唯一 P1 位于 B：同一完整 query 的 503→503→pending→200 中，第三次点击后旧 ErrorBlock、旧 `fifo306-stale-2` requestId、唯一禁用“读取中…”与 stale 行全程保留，但按钮 disabled 后 `activeElement=BODY`；真实200稳定后错误清除并聚焦“日志与质量”H1，普通刷新/身份切换不继承旧恢复意图。
- 证据位于仓库外 `fifo306-system-09-ui-evidence/results.json` 与四张最小截图。隔离库已 DROP，3001/3010、测试 Chrome 与临时 harness 已关闭/删除，共享 PostgreSQL 55432 保持 running；生产代码/契约/迁移/DESIGN 修改0，未跑完整 pnpm check、未重复 Impeccable，TEST继续 blocked。

## 2026-08-20｜FIFO306 FRONT-SYSTEM-09C Rev5 UI 最后三场景微复验领取

- 原样接收 `handoffToken=FIFO306-FRONT-SYSTEM-09C-R5-UI-R1-V4.830`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- CURRENT 已差量更新至 v4-831：FIFO306=`active / in_progress`，FRONT-SYSTEM-09C Rev5 保持 `review / Current actor=UI设计对话 / Reviewer=UI设计对话`。
- 本轮只在正式 production system-frontend + Fastify + 从零38迁移隔离 PostgreSQL + 零网络 Worker + Playwright/系统 Chrome 下复验 routing Modal 真实鼠标遮罩回焦、logs 503→503→pending→200 错误投影/焦点、1024真实侧栏遮罩命中与层级及 console；不重跑 FIFO304 已通过26项或 FIFO302其余112项，不改生产代码，不运行完整 pnpm check/Impeccable，不通知 FRONT/BACK/TEST。

## 2026-08-20｜FIFO305 通过规划代码门；解锁 FIFO306 UI 最后三场景微复验

- 规划核对确认公共 Modal 只在 backdrop 自身命中且未锁时 `preventDefault/stopPropagation` 后关闭；logs 的 `recoveryError` 仅保存当前完整 query 的错误展示事实，普通/自动刷新与身份变化都会清除；1024 `sidebar-overlay` 是真实 DOM，位于 sidebar 下、workspace 上，并复用唯一 closeMobileOverlay 回焦。
- 新鲜标准三专项 `53/53`、system-frontend typecheck、`git diff --check` 通过；前端交付的管理员组合 `7 files / 98 tests` 与 production build 45 modules 保留。
- 登记 `handoffToken=FIFO306-FRONT-SYSTEM-09C-R5-UI-R1-V4.830`，只复验真实鼠标 Modal 遮罩、logs 恢复 pending ErrorBlock 存活/焦点、1024 侧栏真实遮罩命中与层级；其他通过项冻结，不解锁 TEST。

## 2026-08-20｜FIFO305 FRONT-SYSTEM-09C Rev5 完成并交规划

- 原样令牌 `handoffToken=FIFO305-FRONT-SYSTEM-09C-R5-V4.827`；权限指纹保持 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。状态已写回 CURRENT v4-829：`FIFO305=review`、`FRONT-SYSTEM-09C Rev5=review`、Current actor=规划对话、Reviewer=规划对话。
- 仅完成三项 FIFO304 P1：公共 Modal backdrop 真实 mousedown 命中先 `preventDefault + stopPropagation` 再唯一关闭，避免后续 mouseup/click 把触发点回焦覆盖成 BODY；`/logs` 为同一完整查询身份保留显式错误重读的只读错误投影，503→503→pending 期间保留 stale/requestId/唯一 ErrorBlock 且按钮锁定，真实成功后才聚焦“日志与质量”，普通/自动刷新和查询身份变化不继承；1024 ControlShell 仅在 compact+mobileExpanded 渲染真实侧栏遮罩，鼠标/Escape 关闭并回“展开侧栏”，高层 aria-modal 保持所有权。
- 回归已覆盖 routing Modal 真实 mouseDown/mouseUp/click、logs 503→503→pending→200 与 requestId/按钮锁/焦点、1024 BODY Escape/遮罩鼠标序列和回焦。新鲜管理员组合 `7 files / 98 tests`、system-frontend typecheck、Vite production build `45 modules`、`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未跑完整 `pnpm check`、Impeccable、完整浏览器矩阵；未改 backend/contracts/migrations/DESIGN/员工站/服务器，未提交/推送/部署。

## 2026-08-20｜FIFO305 FRONT-SYSTEM-09C Rev5 领取

- 原样接收 `handoffToken=FIFO305-FRONT-SYSTEM-09C-R5-V4.827`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 状态已写回 CURRENT v4-828：`FIFO305=active`、`FRONT-SYSTEM-09C Rev5=in_progress`、Current actor=前端开发对话、Reviewer=规划对话。
- 本轮仅修公共 Modal 遮罩真实鼠标默认事件、logs 同 query 恢复 pending 期间错误投影与唯一重读、1024 ControlShell 真实遮罩 DOM；不改 routing 业务/API/backend/contracts/migrations/DESIGN/员工站/服务器。

## 2026-08-20｜FIFO304 集中归因；登记 FIFO305 最后一次前端所有权收口

- UI 正式微复验最终 `29项/26通过/3失败`，P0/P1/P2/P3=`0/3/0/0`。Escape/取消回焦、日志两次失败与成功焦点、普通刷新/迟到身份、1024 Escape/回焦/几何和高层 Modal/Drawer 所有权均通过；失败只剩真实鼠标遮罩关闭后回 BODY、logs 恢复 pending 时 ErrorBlock 整体卸载、侧栏没有真实遮罩 DOM。
- 规划状态时序审查确认三个根因均在前端现有焦点/覆盖层所有权：Modal backdrop 缺 `preventDefault/stopPropagation`，后续鼠标默认事件覆盖卸载回焦；`useAsyncRead.reload` 会先清 error，页面没有保留恢复期间的错误投影；ControlShell 只有 sidebar shadow，没有独立 backdrop 元素。
- 登记 `handoffToken=FIFO305-FRONT-SYSTEM-09C-R5-V4.827`，只允许修改公共 Modal 遮罩命中、logs 同查询恢复 pending 投影、ControlShell 真实覆盖遮罩及对应管理员专项/CSS。不得改 API、业务状态、backend/contracts/migrations/DESIGN/员工站/服务器；完成后只做同三场景 UI 复验，不再扩展矩阵。

## 2026-08-20｜FIFO304 FRONT-SYSTEM-09C Rev4 UI 三场景微复验完成并交规划

- 原样令牌 `FIFO304-FRONT-SYSTEM-09C-R4-UI-R1-V4.824`；CURRENT 已差量更新至 v4-826，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`。
- 新鲜 system-frontend production build 45 modules；正式 Fastify + 从零全部38迁移精确隔离 PostgreSQL + 零网络连接检查 Worker + Playwright 1.62.1/系统 Chrome 最终原始矩阵 `29/26/3`，`P0/P1/P2/P3=0/3/0/0`。
- 三项 P1：routing 真实鼠标遮罩关闭后 Modal 卸载但焦点落 BODY；logs 第三次错误重读 pending 时 ErrorBlock/唯一重读卸载且焦点落 BODY；1024 覆盖侧栏几何正确但无正文遮罩。Escape/取消回焦、pending 锁、503→503→200 requestId/再次失败/成功 H1、普通刷新与迟到身份、侧栏 BODY/上层浮层 Escape、根无横溢与 console/pageerror 均通过。
- 原始证据与四张最小截图位于仓库外 `fifo304-system-09-ui-evidence`。隔离数据库已 DROP，3001/3010、测试 Chrome 与 harness 进程已关闭，共享 PostgreSQL 55432 保持运行；生产代码/契约/迁移/DESIGN 修改0，未跑完整 pnpm check、未重复 Impeccable、未提交推送部署，TEST继续blocked。

## 2026-08-20｜FIFO304 FRONT-SYSTEM-09C Rev4 UI 三场景微复验领取

- 原样接收 `handoffToken=FIFO304-FRONT-SYSTEM-09C-R4-UI-R1-V4.824`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- CURRENT 已差量更新至 v4-825：FIFO304=`active / in_progress`，FRONT-SYSTEM-09C Rev4 保持 `review / Current actor=UI设计对话 / Reviewer=UI设计对话`。
- 本轮只在正式 production system-frontend + Fastify + 从零38迁移隔离 PostgreSQL + 零网络 Adapter/Worker + Playwright/系统 Chrome 下复验 routing Modal 三种关闭回焦/pending锁、logs 503→503→pending→200焦点身份、1024覆盖侧栏 Escape/上层浮层所有权及 console/最小几何；FIFO302其余112项冻结。生产 frontend/system-frontend/backend/contracts/migrations/DESIGN 修改0，不运行完整矩阵/完整pnpm check/Impeccable，不通知 FRONT/BACK/TEST。

## 2026-08-20｜FIFO303 通过规划代码门；解锁 FIFO304 UI 三场景微复验

- 规划核对三处实现：routing 使用显式稳定触发按钮交给 Modal 卸载回焦；logs 以完整 query 保存恢复身份、只在同一 reload 真成功且数据提交后的 layout 阶段聚焦 H1；1024 覆盖侧栏仅在没有更高 `aria-modal=true` 时捕获 Escape、关闭并回侧栏触发点。
- 新鲜标准运行三专项 `53/53`、管理员 `7 files / 98 tests`、system-frontend typecheck、`git diff --check` 通过。额外串行 `--no-file-parallelism` 诊断曾出现两个 FIFO302 范围外既有焦点断言波动，标准运行立即全绿；该事实保留给 TEST 最终关闭门，不据此扩大当前微返工。
- 登记 `handoffToken=FIFO304-FRONT-SYSTEM-09C-R4-UI-R1-V4.824`：只由 UI 在 production React + Fastify + 从零隔离 PostgreSQL + 系统 Chrome 下复验三项变化场景，FIFO302 其余112项冻结；不运行完整矩阵、不解锁 TEST。

## 2026-08-20｜FIFO303 FRONT-SYSTEM-09C Rev4 完成并交规划

- 原样令牌 `handoffToken=FIFO303-FRONT-SYSTEM-09C-R4-V4.821`；状态已写回 CURRENT v4-823：`FIFO303=review`、`FRONT-SYSTEM-09C Rev4=review`、Current actor=规划对话、Reviewer=规划对话。
- 生产改动仅为 `system-frontend/src/routingPage.tsx`、`system-frontend/src/logsPage.tsx`、`system-frontend/src/ControlShell.tsx`：routing 显式保存新建按钮触发点并通过 Modal `onUnmountFocus` 回焦；logs 以完整 query 身份保存错误恢复意图，重读成功回调在提交后的布局阶段聚焦 H1，普通/自动刷新与身份变化清理该意图；1024 覆盖侧栏在无更高 `aria-modal=true` 层时捕获 Escape、关闭并回焦侧栏触发按钮。
- 回归改动仅为 `tests/frontend/system-control-plane.test.tsx`、`tests/frontend/system-control-runtime.test.tsx`、`tests/frontend/system-control.test.tsx`：覆盖 Modal Escape/遮罩/取消回焦、logs 503→503→pending→200 未提前抢焦与真实成功后聚焦、1024 BODY Escape 回焦。
- 新鲜验证：定向三专项 `53/53`；管理员 `system-control*.test.tsx` `7 files / 98 tests`；system-frontend typecheck；正式 workspace Vite build `45 modules`；`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 `pnpm check`、未重复 Impeccable、未改 backend/contracts/migrations/DESIGN/员工站/服务器，未提交/推送/部署。

## 2026-08-20｜FIFO303 FRONT-SYSTEM-09C Rev4 领取

- 原样接收 `handoffToken=FIFO303-FRONT-SYSTEM-09C-R4-V4.821`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 状态已写回 CURRENT v4-822：`FIFO303=active`、`FRONT-SYSTEM-09C Rev4=in_progress`、Current actor=前端开发对话、Reviewer=规划对话。
- 本轮仅处理 routing 新建草稿 Modal 回原触发点、logs 同查询 503→503→200 恢复焦点身份、1024 ControlShell 覆盖侧栏 Escape/回焦；不改 backend/contracts/migrations/DESIGN/员工站/服务器。

## 2026-08-20｜FIFO302 集中归因；解锁 FIFO303 三项前端微返工

- 规划把正式 UI 终验的 3 项 P1 归并为同一前端焦点/覆盖层所有权收口，不退回后端、契约、迁移或视觉设计：路由 Modal 关闭回精确触发点；日志同查询读取恢复再次失败聚焦 ErrorBlock、真实成功渲染后聚焦 H1，且普通刷新/身份切换不抢焦；1024 覆盖侧栏 Escape 关闭并回展开触发点。
- 登记 `handoffToken=FIFO303-FRONT-SYSTEM-09C-R4-V4.821`，状态 `ready / Current actor=前端开发对话 / Reviewer=规划对话`。允许修改 `system-frontend` 对应页面、ControlShell、必要公共焦点原语和专项测试；backend/contracts/migrations/DESIGN/员工站/服务器冻结。
- FIFO302 其余112项、正式 routing/changes/logs 业务事实、Attempt/Advance 安全链、1440/1024既有通过几何全部冻结；返工只做定向测试、管理员组合、typecheck/build/diff-check，完整 `pnpm check` 留 TEST，完成后只路由 UI 三场景微复验。

## 2026-08-20｜FIFO302 FRONT-SYSTEM-09C Rev3 正式 UI 终验完成并交规划

- 原样令牌 `FIFO302-FRONT-SYSTEM-09C-R3-UI-R1-V4.818`；状态写回 CURRENT v4-820 为 `review / Current actor=规划对话 / Reviewer=规划对话`。
- 新鲜 system-frontend production build 45 modules、员工 frontend production build 195 modules通过；唯一正式环境为 Fastify + 从零全部38迁移精确隔离 PostgreSQL + 零网络 Adapter/connection-test Worker + Playwright 1.62.1/系统 Chrome。原始矩阵115项、112通过、3失败；结果与截图位于仓库外 `fifo302-system-09-ui-evidence`。
- 人工对账保留原始结果：console原失败的10条均为受控/预期浏览器网络诊断，application主动 error/warn=0/0、pageerror=0；同时纠正 `read-recovery-focus` 对 BODY 同名文字的假阳性。最终 P0/P1/P2/P3=`0/3/0/0`：路由草稿 Modal Escape 回 BODY、日志 stale 恢复成功回 BODY、1024 覆盖侧栏 Escape 未收起且未回展开触发点。
- 其余权限/两站隔离、ASR 1/3/8、ScreenText 本地→云、全局目标顺序/容量、发布 unknown 同 releaseCommandId、rollback/409 保旧 active、ASR/ScreenText Attempt 1→2 安全前进、四类停止、读取 stale/迟到身份、Drawer 焦点、双视口几何与安全脱敏通过。
- 隔离数据库已 DROP，3000/3001/3010 服务、测试 Chrome 和临时 harness 已关闭/删除，共享 PostgreSQL 55432 保持原运行态。生产 frontend/system-frontend/backend/contracts/migrations/DESIGN 修改0；未跑完整 pnpm check、未重复 Impeccable、未提交推送部署；TEST保持blocked。

## 2026-08-20｜FIFO302 FRONT-SYSTEM-09C Rev3 正式 UI 终验领取

- 原样接收 `handoffToken=FIFO302-FRONT-SYSTEM-09C-R3-UI-R1-V4.818`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 已完整重读 AGENTS、WORKFLOW v4.10、CURRENT v4-818、DESIGN 5.19、SYSTEM-ordered-execution-routing、UI验收、正式 routing/operations 契约与 FIFO289–301 生产差量/测试。CURRENT 差量更新至 v4-819，FIFO302=`active / in_progress`，FRONT-SYSTEM-09C Rev3 保持 `review / Current actor=UI设计对话 / Reviewer=UI设计对话`。
- 本轮只做正式 production React + Fastify + 从零隔离 PostgreSQL + 零网络 Adapter/Worker + Playwright/系统 Chrome 完整 UI 矩阵与脱敏证据；不改 production frontend/system-frontend/backend/contracts/migrations/DESIGN，不接真实模型/厂商/Secret/网络/付费/服务器，不运行完整 pnpm check、不重复 Impeccable。

## 2026-08-20｜FIFO301 独立关闭；解锁 FIFO302 正式 UI 终验

- 规划新鲜复跑管理员 `7 files / 95 tests`、system-frontend typecheck 与正式 workspace Vite build `45 modules`，全部通过。首次错误地从仓库根直接调用 Vite 导致找不到 index.html，改用正式 workspace build 入口即通过，属于命令口径而非产品失败。
- 代码对账确认列表/详情只消费 operations 权威事实；Advance 提示必须匹配服务端 event、相邻 Attempt 且 externalNotAccepted=true/externalSideEffectPossible=false，unknown/unauthorized/cancelled/quality_rejected 不显示前进。connection-test unknown 显示可能存在外部副作用且仅查同一记录。
- `FRONT-SYSTEM-09C Rev3=done`；登记 `handoffToken=FIFO302-FRONT-SYSTEM-09C-R3-UI-R1-V4.818`，由 UI 在 production React+Fastify+从零隔离 PostgreSQL 下终验 routing/changes/logs、双视口与焦点。TEST 继续 blocked。

## 2026-08-20｜FIFO300 独立关闭；解锁 FIFO301 管理员日志接入

- 规划新鲜复跑 operations `1 file / 8 tests`，contracts/backend TypeScript 均退出 0；连接检查 unknown 的 Attempt 链现为 externalNotAccepted=false、externalSideEffectPossible=true，queued 保持未开始，读取前后权威事实不变。
- `BACK-SYSTEM-09C-OPS Rev2=done`；正式 operations 已具备 ASR/ScreenText routeDigest、RoutingTarget/priority、deploymentVersion、effectClass、有序 Attempt 链和只追加 AdvanceEvent 安全投影。
- 登记 `handoffToken=FIFO301-FRONT-SYSTEM-09C-R3-V4.815`：仅由 system-frontend `/logs` 消费正式投影并形成管理员可读执行链；不改员工站、后端、契约、迁移或服务器。UI/TEST 继续 blocked。

## 2026-08-20｜FIFO301 FRONT-SYSTEM-09C Rev3 完成并交规划

- 原样令牌：`FIFO301-FRONT-SYSTEM-09C-R3-V4.815`；权限指纹保持 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。状态已写回 CURRENT v4-817：FIFO301 与 FRONT-SYSTEM-09C Rev3 转 `review / Current actor=规划对话 / Reviewer=规划对话`。
- `/logs` 继续只读消费正式 `/api/system-control/operations`：服务端 search/domain/status/project/from/to/sort/limit/offset 与真实 total；列表新增 routeDigest、目标序号、部署版本短身份、中文安全效果和历史 null 诚实投影。
- 详情新增服务端 Attempt 1→2→3 链、费用/待对账、安全错误、RoutingAdvanceEvent；仅对 externalNotAccepted 且无 externalSideEffectPossible 的相邻记录提示“明确未受理后进入下一目标”。unknown、reconciliation、unauthorized、cancelled、quality_rejected 不误报已前进；system_control connection-test unknown 明确说明可能产生外部副作用且只查询同一记录。
- 回归覆盖 ASR/ScreenText 两段链、unknown 停止、连接 unknown、历史 null、筛选/分页、stale 唯一重读恢复与 Drawer 只读焦点。新鲜管理员组合 7 files/95 tests、system-frontend typecheck、Vite production build 45 modules、git diff-check 全部通过；未运行完整 pnpm check/完整浏览器矩阵，未改 backend/contracts/迁移/DESIGN/员工站，未提交推送部署。

## 2026-08-20｜FIFO301 FRONT-SYSTEM-09C Rev3 领取

- 原样接收 `handoffToken=FIFO301-FRONT-SYSTEM-09C-R3-V4.815`；permission fingerprint：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。状态已写回 CURRENT v4-816：FIFO301 active、`FRONT-SYSTEM-09C Rev3=in_progress`、Current actor=前端开发对话、Reviewer=规划对话。
- 本轮仅消费 FIFO300 已关闭的正式 `/api/system-control/operations` 列表/详情投影：routeDigest、routingTargetId、targetPriority、deploymentVersionId、effectClass、Attempt 链与 RoutingAdvanceEvent；保留历史 null 的诚实显示、unknown/待对账停止和只读查询边界。
- 允许范围为 `system-frontend/`、对应管理员前端专项、CURRENT/开发日志；不改 backend、contracts、迁移、DESIGN、员工站、服务器或真实外部服务。

## 2026-08-20｜FIFO300 BACK-SYSTEM-09C-OPS Rev2 完成并交规划

- 规划新鲜复跑 operations+routing `2 files / 14 tests`、contracts/backend TypeScript 全部通过；ASR/ScreenText 的 route/target/effect/Attempt/Advance 只读投影主体成立。
- 微审发现 connection_test_attempts 的 `status=unknown` 当前被映射成 `externalNotAccepted=true / externalSideEffectPossible=false`，恰与安全语义相反。管理员日志不能把未知结果当成明确未受理。
- `handoffToken=FIFO300-BACK-SYSTEM-09C-OPS-R2-V4.812` 已按权限指纹完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。system_control connection-test Attempt 链现在把 unknown 保守投影为 `externalNotAccepted=false / externalSideEffectPossible=true`；completed/failed 无可靠未受理事实时不猜 true，queued 不宣称外部副作用。
- 新鲜隔离 operations 专项 `1 file / 8 tests` 全绿，覆盖真实 connection_test_attempt unknown 详情、读取前后 runs/attempts/commands/audit 零变化，并保留 ASR/ScreenText Advance 链；contracts/backend typecheck+build、`check:repo`、`git diff --check` 通过。未改 contracts、迁移、routes、09A/09B、前端或服务器，完整 `pnpm check` 留 TEST。

## 2026-08-20｜TEST-SRV-004 指纹核准，阻塞收敛为面板凭据不同步

- 用户移除旧 known_hosts 后重新连接，重装主机 ED25519 精确指纹为 `SHA256:xMAhJ68ebTILI2tgehbSeTjQKJ9Czrfq66W4xzTMZ40`，与雨云客服截图一致；TCP/22 和 sshd 可达。
- 两个受控密码认证会话仍失败，已按停止门停止猜测；此前 `xMAN/TILl2` 等易混字符人工转录错误已明确纠正，不再作为主机事实。
- `TEST-SRV-20260820-004` 保持 fixing。下一步只让客服核对其成功测试所用密码是否来自当前面板及测试后是否改动，必要时同步面板凭据；不收密码、不安装、不部署。SYSTEM-09 FIFO299 继续独立执行。

## 2026-08-20｜FIFO299 BACK-SYSTEM-09C-OPS Rev1 完成并交规划

- 原样令牌：`FIFO299-BACK-SYSTEM-09C-OPS-R1-V4.808`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`；任务已转 `review / Current actor=规划对话 / Reviewer=规划对话`。
- 共享 operations 契约与 PostgreSQL 安全投影补齐 ASR/ScreenText 新 Attempt 的 routeDigest、routingTargetId、targetPriority、deploymentVersionId、effectClass；详情按持久 attempt_number/identity 返回同 Job 有序 Attempt 链，并投影 routing_advance_events 的前后 Attempt、target priority、稳定分类、requestId、createdAt、externalNotAccepted/externalSideEffectPossible。错误正文、供应商载荷、Secret、URL/Header、objectKey 与字幕/画面正文仍不出现在响应。
- 回归：精确隔离 PostgreSQL operations `1 file / 7 tests` 全绿（含 ASR 与 ScreenText 本地→云安全前进链、Attempt/Event 关系、旧 null 兼容、Delivery 历史链、对账优先、分页/空页、权限/脱敏/零写副作用）；邻近 routing `7/7` 通过；contracts/backend build、`check:repo`、迁移 node-check、`git diff --check` 通过。ASR/ScreenText 组合命令使用旧默认 schema，首个真实错误为 `routing_policy_pools.max_concurrent_jobs` NOT NULL，确认是默认库未完成 ordered-routing 迁移的环境失败，未修改默认库/迁移；完整 `pnpm check` 留 TEST。并行 UI/FRONT/TEST 与服务器事实保持不变。

## 2026-08-20｜FIFO298 独立关闭；解锁 FIFO299 operations 只读投影

- 规划独立复跑 `tests/backend/screen-text-local-ocr-sidecar.test.ts` 与 `tests/backend/system-control-routing.test.ts`，结果 `2 files / 18 tests`；contracts/backend TypeScript 均退出 0，`git diff --check` 无新增问题。
- 代码与回归确认底层 invoke 未 settle 时持续占用 Adapter 槽位，timeout/Abort 只结束等待者，真实 settle 才释放；640/1920/3840 相对位置与 extractor 权威 `videoDurationMs` 也成立。`BACK-SYSTEM-09B Rev3=done`。
- 登记 `handoffToken=FIFO299-BACK-SYSTEM-09C-OPS-R1-V4.808`：只在正式 operations 契约/后端读取投影补齐 routeDigest、routingTargetId、targetPriority、deploymentVersionId、effectClass 和只追加 RoutingAdvanceEvent 安全链，供管理员 `/logs` 消费；不新增迁移或写状态。FRONT/UI/TEST 继续 blocked，服务器线独立并行。

## 2026-08-20｜FIFO298 BACK-SYSTEM-09B Rev3 完成并交规划

- 原样令牌：`FIFO298-BACK-SYSTEM-09B-R3-V4.805`；任务由 `active / in_progress` 转为 `review / Current actor=规划对话 / Reviewer=规划对话`。
- Adapter 并发槽位改为绑定底层 invoke 的真实 settle：timeout/Abort 只结束等待者，never-resolve/忽略 Abort 持续占槽并 fail-closed；迟到 resolve/reject 仅释放槽位，不覆盖首个 outcome，timer/listener/rejection 均收口。
- position 改为按对应真实帧宽度的相对几何计算，不再使用 640/213/426 固定阈值；frame extractor 现在返回并校验正数有界 `videoDurationMs`，帧 capturedAtMs 不得越界，Worker/adapter 完成 outcome 原样传递该时长。
- 新鲜验证：sidecar `11/11`；sidecar+routing `2 files / 18 tests`；contracts/backend build、`node tools/verify-repository.mjs`、静态边界扫描、`git diff --check` 全部通过。无迁移、无默认库清理、无真实模型/网络/Secret/付费/服务器动作，完整 `pnpm check` 留 TEST。

## 2026-08-20｜FIFO297 关闭；FIFO296 转 FIFO298 最后运行边界

- FIFO297：规划新鲜复跑 system-control-plane 34/34、管理员组合 7 files / 91 tests 全绿；代码核对确认删除跨池目标保留原全局 priority，提交前角色顺序校验，部署/版本分页离开当前服务端可见页时清除旧选择。FRONT-SYSTEM-09C Rev2 关闭，`/logs` 仍等正式后端投影。
- FIFO296：规划新鲜复跑 sidecar+routing 2 files / 15 tests、contracts/backend typecheck 全绿；严格 schema、server_extracted_frames、UploadStorage+extractor 与 unknown 防候选落库主体成立。
- 微审仍发现两项同根 P1：Adapter 超时/Abort 返回后立即释放 active，而失控底层 invoke 未 settle，下一次调用可绕过真实 maxConcurrent；候选位置仍按固定 640px 阈值，videoDurationMs 仍由最后抽样时间/固定 1000ms 推算。登记 `FIFO298-BACK-SYSTEM-09B-R3-V4.805`，只做 fail-closed 底层占槽、真实帧相对几何与 extractor 权威时长。CURRENT 更新 v4-805；09C operations 与 TEST 继续 blocked，服务器线并行。


## 2026-08-20｜FIFO296 BACK-SYSTEM-09B Rev2 完成并交规划

- 原样令牌：`FIFO296-BACK-SYSTEM-09B-R2-V4.801`；任务由 `active / in_progress` 转 `review / Current actor=规划对话 / Reviewer=规划对话`，保留并行 FIFO297/UI、服务器及 TEST 事实。
- 运行协议闭环：`screen_text_local_ocr_v1` 的 TypeBox request/response 在 transport 前后使用 `Value.Check`（注册 UUID format）及服务端跨字段校验；严格检查嵌套额外字段、类型/范围、置信度、坐标几何、帧/时间/语言/文本。非法 request 在外部副作用前 external_not_accepted，非法 response 为 external_unknown/reconciliation，未产生 candidates/evidence。
- 媒体语义改为唯一 `server_extracted_frames`：Worker 只从既有 UploadStorage/Asset 读取并核对源视频 size/checksum/content type，再调用注入式 `ScreenTextLocalOcrFrameExtractor`；帧 bytes、contentType、宽高、capturedAtMs 来自 extractor，evidence 使用真实帧 bytes/摘要/尺寸/时间，不再伪造整段 MP4 为固定帧。缺少 storage/extractor 或事实不完整时稳定阻断；Standalone 继续诚实不可用。
- Adapter 自有 bounded race：内部 active 计数、AbortController、deadline timer、Abort listener 与迟到 promise 收口独立于 transport 是否合作；maxConcurrent、never-resolve、忽略 Abort、late resolve 均不会挂起或覆盖结果，timeout/未知保持 reconciliation，不自动前进。
- 新鲜验证：`tests/backend/screen-text-local-ocr-sidecar.test.ts` + `tests/backend/system-control-routing.test.ts` `2 files / 15 tests` 全绿（含 Worker+UploadStorage A/B 媒体事实、schema/恶意响应、never-resolve/迟到 transport）；backend/contracts tsc、`node tools/verify-repository.mjs`、`git diff --check` 全通过。无新增迁移、无默认库清理、无真实外部动作；完整 `pnpm check` 留 TEST。

## 2026-08-20｜FIFO297 FRONT-SYSTEM-09C Rev2 完成并交规划

- 原样令牌：`FIFO297-FRONT-SYSTEM-09C-R2-V4.802`；任务由 `active / in_progress` 转 `review / Current actor=规划对话 / Reviewer=规划对话`。权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 生产仅改 `system-frontend/src/routingPage.tsx`：画面字跨 `ocr_api` 与 `ocr_self_hosted_worker` 的目标以单一全局 priority 排序和连续重编号，删除/新增/上移/下移后的 UI 顺序与提交 body 一致；保存前保持首项 preferred、中间 standard、末项 standard/emergency 的服务端约束。部署/版本分页切换后，当前页不再包含已选真实部署/版本时由权威可见事实清理选择，提交被诚实阻止，不伪造详情或第二缓存。
- 回归改动仅在 `tests/frontend/system-control-plane.test.tsx`：新增跨池删除/顺序/body/角色回归，并补分页离开当前版本页后的等待与无 POST 断言。`/logs` 缺失 routeDigest、routingTargetId、targetPriority、RoutingAdvanceEvent、effectClass，仍等待后端唯一投影，本轮未添加假字段。
- 新鲜验证：system-control-plane `34/34`；管理员 `system-control*.test.tsx` `7 files / 91 tests`；system-frontend typecheck；Vite production build `45 modules`；`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 pnpm check、未改 backend/contracts/migrations/DESIGN/员工站，未提交/推送/部署。

## 2026-08-20｜FIFO295 独立复验后转 FIFO297 有序编辑微返工

- 规划新鲜复跑管理员 `system-control*` 7 files / 90 tests 全绿，system-frontend typecheck 与 Vite production build 45 modules 通过；确认 `/routing`、`/changes` 已使用正式 `targets[]`，人工终点未混入目标，发布/恢复继续使用稳定 `releaseCommandId`，`/logs` 未伪造缺失字段。
- 代码微审发现两项 P1：`removeTarget` 删除后按 pool 数组次序重编号，会在画面字本地/云跨池目标中静默改变原全局顺序；部署/版本分页切换会让已选版本从 UI 可见事实中消失而 draft 仍可提交。登记 `FIFO297-FRONT-SYSTEM-09C-R2-V4.802`，只修顺序保持、稳定选择可见性/诚实清理及创建 body 回归。
- `/logs` 的 routeDigest、routingTargetId、targetPriority、RoutingAdvanceEvent、effectClass 仍由后继 `BACK-SYSTEM-09C-OPS` 提供唯一服务端投影，不并入 FIFO297。CURRENT 更新至 v4-802；FIFO296 后端 sidecar 微返工与服务器 SSH 加固继续并行。

## 2026-08-20｜FIFO294 微审未通过，转 FIFO296；FIFO295 部分完成待后端日志投影

- 规划新鲜复跑 screen-text-local-ocr-sidecar + system-control-routing 为 2 files / 12 tests 全绿，并逐段核对共享协议、sidecar Adapter、ScreenTextWorker、Registry 与入口接线。
- Rev1 仍有三项P1边界：TypeBox严格 schema 未实际参与运行时 request/response 校验；Adapter未拥有 deadline/maxConcurrent，失控 transport 可忽略参数；Worker 将完整视频 bytes 同时冒充固定 640×360 已解码帧。登记 `FIFO296-BACK-SYSTEM-09B-R2-V4.801`，只修三项并补恶意/失控transport、真实UploadStorage读取/阻断集成回归，不接真实模型、服务器或网络。
- FIFO295 前端 7 files / 90 tests、typecheck/build 已交 review；routing/changes 进入规划独立复核。正式 operations 契约/后端GET缺 routeDigest、routingTargetId、targetPriority、RoutingAdvanceEvent、effectClass，前端未伪造，按冲突机制登记 `BACK-SYSTEM-09C-OPS Rev1` 为 FIFO296 后继，再由 FRONT-SYSTEM-09C Rev2 接入。
- CURRENT 更新至 v4-801；UI/TEST继续blocked，服务器SSH加固任务保持并行。

## 2026-08-20｜FIFO295 FRONT-SYSTEM-09C Rev1 完成并交规划

- 原样令牌：`FIFO295-FRONT-SYSTEM-09C-R1-V4.796`；任务由 `active / in_progress` 转 `review / Current actor=规划对话 / Reviewer=规划对话`。权限指纹保持 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- `system-frontend/src/routingPage.tsx` 现按服务端 RoutingTarget 1–8 形成草稿：全局连续 priority、真实部署版本分页、preferred/standard/emergency、逐目标容量、上移/下移/删除；人工处理是目标耗尽后的独立领域出口，不进入目标表。`system-frontend/src/changesPage.tsx` 展示真实目标顺序/容量/影响、服务端审计与发布/回滚稳定命令恢复；未新增员工配置入口。
- 新鲜验证：管理员 `system-control*.test.tsx` 为 `7 files / 90 tests` 全绿（含 system-control-plane 33/33）、system-frontend TypeScript 通过、Vite production build `45 modules` 通过、`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 `pnpm check`，未接真实供应商/Secret/网络/付费/部署，未提交/推送/部署。
- 诚实边界：当前正式 `system-control-operations` 契约与后端 operations GET 未提供 `routeDigest`、`routingTargetId`、`targetPriority`、`RoutingAdvanceEvent`、`effectClass`；`logsPage.tsx` 未伪造这些字段。需规划按冲突机制决定后续契约/后端窗口，不能在前端补第二状态源。

## 2026-08-20｜FIFO294 BACK-SYSTEM-09B Rev1 完成并交规划

- 原样令牌：`FIFO294-BACK-SYSTEM-09B-R1-V4.796`；任务已由 `active / in_progress` 转 `review / Current actor=规划对话 / Reviewer=规划对话`，并行 FRONT-SYSTEM-09C、TEST 事实保留。
- 共享 `screen_text_local_ocr_v1` 契约与 `ScreenTextLocalOcrSidecarAdapter` 已接入现有 ScreenText Registry→EngineDeploymentVersion→RoutingTarget→Worker 唯一链；受控零网络 fake 只登记协议级 `sidecar-protocol-only-v1`，不伪装 PaddleOCR/模型 ready。
- Worker 通过注入式既有 UploadStorage 按 Asset objectKey 在服务端校验 size/checksum/content type 后读取字节；无字节能力、摘要/大小/帧/像素超限在外部副作用前稳定失败。请求仅含受控媒体元数据、帧、稳定 attempt/request 身份及进程内字节，不传 objectKey、内部路径、URL、header、Secret；响应只映射结构化框、置信度、语言、版本和安全候选。
- transport 覆盖 Abort/deadline、输入/并发上限、进程退出、确定未受理、401/403、timeout/unknown；`external_not_accepted + externalSideEffectPossible=false` 才可交给 09A 安全前进，unknown 不自动前进。本地 fake 使用 `unmetered_local/CNY/0.000000`，无真实网络、模型、Python、Docker、服务器或付费动作。
- 新鲜验证：`tests/backend/screen-text-local-ocr-sidecar.test.ts` + `tests/backend/system-control-routing.test.ts` 为 `2 files / 12 tests` 全绿；backend/contracts TypeScript、`node tools/verify-repository.mjs`、`git diff --check` 全通过。无新增迁移；routing 专项临时库自清理，sidecar 专项无数据库写入，默认业务库未清理；完整 `pnpm check` 留 TEST 关闭门。

## 2026-08-20｜测试服务器纯 Debian 12 初始化关闭，SSH 加固继续

- 客服测试截图确认重装后的新系统可由 serial VNC 与外部 OpenSSH 使用当前 root 凭据成功进入 shell，Debian 登录横幅正常，SSH 主机指纹已更新；`TEST-SRV-20260820-002 retest→closed`，此前登录失败属于重装前旧系统/旧凭据边界。
- `TEST-SRV-20260820-004` 保持 fixing：root 密码入口恢复不等于安全加固完成。下一步只允许用户在本机交互式输入密码后写入既有专用公钥，再验证非 root 第二会话并关闭密码/root远程登录；密码不进入聊天、截图、仓库或日志，加固前不安装、不部署。
- CURRENT 更新至 v4-798；BACK-SYSTEM-09B 与 FRONT-SYSTEM-09C 均保持并行 in_progress，不受服务器线影响。

## 2026-08-20｜FIFO295 FRONT-SYSTEM-09C Rev1 领取

- 原样接收 `handoffToken=FIFO295-FRONT-SYSTEM-09C-R1-V4.796`；权限指纹：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- CURRENT 已差量保留 v4-797，FIFO295 转 `active / FRONT-SYSTEM-09C in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。
- 本轮仅在独立 `system-frontend` 收口正式 RoutingTarget 1–8、draft→impact→approve→publish/rollback、引擎启停/当前使用、运行日志与 1440/1024 既有 ControlShell；人工终点不作为目标，员工站不增加配置入口。

## 2026-08-20｜FIFO294 BACK-SYSTEM-09B Rev1 领取

- 原样接收 `handoffToken=FIFO294-BACK-SYSTEM-09B-R1-V4.796`；权限指纹：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- CURRENT 差量更新至 v4-797，FIFO294 转 `active / BACK-SYSTEM-09B in_progress / Current actor=后端开发对话 / Reviewer=规划对话`，保留 FIFO293 done、并行 FRONT-SYSTEM-09C 与 TEST blocked 事实。
- 本轮只沿现有 ScreenText Registry→EngineDeploymentVersion→RoutingTarget→Worker 唯一链增加零网络 local OCR sidecar 协议适配、服务端 UploadStorage/Asset 字节读取、受控 fake transport、deadline/Abort/输入资源上限/进程退出及 09A effectClass 映射；不新增迁移、任务/路由/状态源，不接模型、系统依赖、服务器、真实网络/Secret/付费/部署。

## 2026-08-20｜FIFO293 规划关闭，解锁 BACK09B / FRONT09C

- 规划逐段核对 1754976022000、ASR/ScreenText Worker repository 与新增回归，确认旧 screen_text 主备按本地 primary→fallback→云 primary→fallback 转为全局 1..4 且唯一 preferred；queueLimit 与 perProjectMax 均按解析后的 routingTargetId 计数。
- 第一次直接对共享默认库跑组合命令时，因该库仍是旧 schema，出现 routing_policy_pools 非空旧列与缺 routing_advance_events，结果为 3 failed / 2 passed；未把环境失败伪报产品失败或通过。随后创建精确隔离库，从零执行全部38项迁移，串行复跑 migration/routing/ASR/Dispatch/ScreenText 为 5 files / 50 tests 全绿；finally DROP 后数据库残留=0，默认库未清理。
- CURRENT 更新至 v4-796，`BACK-SYSTEM-09A Rev3=done`、FIFO293=closed；并行登记 FIFO294 BACK-SYSTEM-09B Rev1 与 FIFO295 FRONT-SYSTEM-09C Rev1。09B 只做零网络本地 OCR 协议/fake，不下载模型、不安装系统依赖、不远程部署；09C 只做管理员 ControlShell 正式实现，员工站无配置入口；TEST 保持 blocked。
- 并行服务器事实保留：TEST-SRV-004 按雨云客服建议进入 fixing，仅允许重装纯 Debian 12；重装后重新核对系统、防火墙、SSH host key 和登录边界。

## 2026-08-20｜FIFO293 BACK-SYSTEM-09A Rev3 完成并交规划

- `handoffToken=FIFO293-BACK-SYSTEM-09A-R3-V4.792`；CURRENT v4-795 已差量写回，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，保留并行服务器与 UI 事实。
- 1754976022000 旧主备迁移回归确认 screen_text 本地 primary→fallback→云 primary→fallback 为全局 priority 1..4，只有首项 `preferred`，其余 `standard`；旧列删除，正式 RoutingService 可直接读取新序列；空库无业务 bootstrap。
- 逐目标容量根因已修正：ASR/ScreenText `queueLimit` 仅统计下一目标解析到该 `routingTargetId` 的 queued Job，`perProjectMax` 仅统计同项目、同目标的活动 Attempt；其它目标占用不污染本目标，下一目标重新准入。
- 新鲜证据：迁移 1/1、routing 7/7、ASR 15/15、ScreenText 19/19、ASR Dispatch 8/8；contracts/backend tsc、`check:repo`、迁移 `node --check`、`git diff --check` 通过。临时隔离库均已 DROP，PostgreSQL 55432 保持运行；未接真实供应商/Secret/网络/付费/部署，完整 `pnpm check` 留 TEST 关闭门。

## 2026-08-20｜TEST-SRV-004 收敛为雨云凭据初始化阻塞

- 本机原生 OpenSSH 已到达 TCP/22 并由用户确认主机 ED25519 fingerprint；平台自动生成的新 root 密码连续两次 `Permission denied`，第三次提示后按停止门中止。结合 serial VNC 的 `Login incorrect`，公网、防火墙、sshd 不可达和单一 VNC 剪贴板问题已排除。
- 当前只剩雨云 Debian 12 镜像 root 凭据未初始化、账户锁定或密码重置未写入 guest 等厂商侧边界；服务器端零写入，应用未安装/部署。停止继续重置、重装或猜测，下一步仅由用户提交雨云工单，密码不进入聊天、截图、仓库或日志。
- CURRENT 更新至 v4-794；TEST-SERVER-OPS-01 保持 blocked / Current actor=用户。FIFO293 后端返工继续独立运行，不受服务器阻塞影响。

## 2026-08-20｜FIFO293 BACK-SYSTEM-09A Rev3 领取

- 原样接收 `handoffToken=FIFO293-BACK-SYSTEM-09A-R3-V4.792`；权限指纹：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- CURRENT 差量更新至 v4-793，FIFO293 转 `active / BACK-SYSTEM-09A in_progress / Current actor=后端开发对话 / Reviewer=规划对话`，保留并行 UI done 与 FRONT/TEST blocked。
- 本轮只修旧主备迁移的全局本地→云顺序/唯一 preferred，以及 ASR/ScreenText 逐 RoutingTarget 的 queueLimit/perProjectMax 计数与隔离回归；不改 effectClass、unknown、安全前进、UI、员工站、真实供应商/Secret/网络/付费/部署。

## 2026-08-20｜FIFO291 规划微审未通过，集中转 FIFO293

- 规划新鲜复跑 `tests/backend/system-control-routing.test.ts` 为 `1 file / 7 tests` 全绿，并逐段核对 1754976022000、ASR/ScreenText queued claim 与 SYSTEM-09 启动包；确认 effectClass、unknown 停止和全局 priority 已成立，但现有测试缺少带旧数据迁移与多目标混合容量两条边界。
- P1-1：迁移保留每个旧 pool primary 的 `preferred`，screen_text 同时存在本地/云旧主备时会形成多个 preferred；同时当前排序先放所有 primary，未落实本地 primary→fallback 后再进入云目标。Rev3 必须从旧数据生成全局连续 priority，只有首目标 preferred，其余旧目标 standard，并证明新服务可直接读取。
- P1-2：ASR/ScreenText 的 maxConcurrentJobs 已按 routingTargetId 统计，但 queueLimit 仍按整个 routingVersion 的 queued Job、perProjectMax 仍按项目跨目标活动 Job 统计。Rev3 必须让其它目标的队列/活动事实不占本目标额度，并补两目标不同容量的 ASR/ScreenText 隔离回归。
- CURRENT 更新至 v4-792，登记 `handoffToken=FIFO293-BACK-SYSTEM-09A-R3-V4.792`；仅后端做定向返工，UI、effectClass、unknown、安全前进、真实供应商/Secret/网络/付费/部署与服务器接入任务全部冻结，FRONT/TEST 继续 blocked。

## 2026-08-20｜FIFO291 BACK-SYSTEM-09A Rev2 完成并交规划

- `handoffToken=FIFO291-BACK-SYSTEM-09A-R2-V4.785`；CURRENT 差量更新至 v4-791，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，保留 UI done 与 FRONT/TEST blocked。
- 四项根因已集中收口：同一 routingVersion/workflowStage 内 priority 全局唯一且 1..N 连续，screen_text 的 self-hosted/cloud OCR 统一顺序；新 role 仅 preferred/standard/emergency；ASR/ScreenText AdapterOutcome 与 Attempt 持久化结构化 effectClass，只有 external_not_accepted 且无外部副作用才前进；每个 RoutingTarget 的 maxConcurrentJobs/perProjectMax/queueLimit 参与创建后 queued、claim 及下一目标准入，容量不足保持排队。
- 一次性迁移 1754976022000 只读取旧 primary/fallback 列完成确定性转换后删除旧列，新 schema/API/测试不再使用旧 role；人工处理不注册为 RoutingTarget。新增/保留零网络 ASR/ScreenText 本地→云、unknown/401 停止、全局 1/3/8 拒绝、容量和 routeDigest/旧任务隔离回归。
- 新鲜验证：routing 7/7、ASR 14/14、ASR Dispatch 8/8、ScreenText 18/18；隔离从零迁移部署/策略/目标/active/advance 均为0且已 DROP；contracts/backend build、check:repo、migration node-check、git diff-check 通过。修复了 screen_text 显式重试中 queued Job 携已完成 Attempt 被误判为过期 running 的单一路径；未接真实供应商/Secret/网络/付费/部署，完整 pnpm check 留 TEST 关闭门。

## 2026-08-20｜TEST-SRV-20260820-003 关闭，转 SSH 加固独立门

- 用户已启用白名单，唯一规则临时允许全球来源 TCP/22；经用户明确授权，仅执行无凭据 TCP 握手，结果 22=true、80/3001/5432=false。未登录、未发送凭据、未写服务器，原“除SSH外公网端口未收敛”P1按窄范围关闭。
- 规划不把全球可达 SSH + 初始 root/密码边界视为可部署状态，已要求测试服务器任务另建 P1 SSH bootstrap hardening：优先使用雨云网页控制台/VNC创建非root部署用户、写入用户公钥，验证新会话后再关闭密码登录与root远程登录；保留控制台恢复路径，避免锁出。加固完成前禁止安装或部署应用。
- CURRENT 更新至 v4-790；SYSTEM-09 后端并行不受影响。

## 2026-08-20｜TEST-SRV-20260820-003 规划归因：公网入口未收敛

- 用户截图确认纯 Debian 12 测试主机未绑定安全组，当前为黑名单模式且规则为空；依据管理页说明，未命中丢弃规则的端口默认开放。该事实定为连接/部署前 P1，不属于应用故障。
- 安全顺序冻结为：先新增并核对 `TCP/22 + 用户确认的管理员出口 IPv4/32 + 允许`，再切换白名单，避免先切模式造成 SSH 锁出；80/443 仅在访问路径批准后单独开放，3000/3001/3010/5432 不得公开。未执行外部扫描、未增删/保存规则、未连接或部署。
- CURRENT 更新至 v4-789；测试服务器任务继续等待用户在其独立窗口完成安全组界面确认。SYSTEM-09 后端任务不受影响。

## 2026-08-20｜TEST-SRV-20260820-002 规划归因：等待纯 Debian 重装授权

- 测试服务器任务依据用户提供的雨云管理页截图确认：新主机仍创建中，约 4 vCPU / 8 GB / 100+ GB，当前预装“宝塔面板 10.0 [Debian 12/LNMP]”。这与已冻结的纯 Debian 12、单一 Nginx、PostgreSQL、Fastify/systemd 方案冲突，若继续使用会形成面板/LNMP与项目部署资产双重配置所有者。
- 本项定为 P3 初始化操作指引而非产品/服务器故障。未连接主机、未执行安装、未改 DNS/TLS/防火墙、未写 Secret，无清理动作。重装会清空主机，必须等服务器创建完成、确认没有需要保留的数据，并由用户明确授权后才可执行。
- CURRENT 更新至 v4-788；`TEST-SERVER-OPS-01` 继续 `blocked / Current actor=用户`，SYSTEM-09 后端返工不受影响。

## 2026-08-20｜FIFO292 规划复核通过，测试服务器任务转等待用户

- 规划核对 `TEST-SERVER-HANDOFF-CHECKLIST.md`、准备清单、`TEST-SERVER-ISSUES.md` 与 performance harness：测试机到手前/后输入和顺序清楚，问题采用追加式 `TEST-SRV-*` 身份，缺失宿主/PG/队列指标保持 `null`，阶段耗时来自真实执行而非传入计划值；未引入员工站入口或第二业务状态源。
- 新鲜运行 performance 三文件 TypeScript 严格校验和授权路径 `git diff --check` 均退出0。tsx dry-run/fake smoke 的本机 `uv_os_get_passwd ENOMEM` 保留为 `TEST-SRV-20260820-001 confirmed`，没有被伪写成服务器或产品失败，也未反复重试。
- 同令牌规划回执已发送到新固定任务并得到 `waiting_for_user` 确认。FIFO292关闭；`TEST-SERVER-OPS-01` 转 `blocked / Current actor=用户`，后续用户可直接在该任务口述问题。CURRENT 更新至 v4-787；SYSTEM-09 后端 FIFO291 继续独立运行。

## 2026-08-20｜FIFO292 测试服务器接入与问题记录任务并行启动

- 用户明确允许测试服务器准备与 SYSTEM-09 有序路由后端返工并行，并要求新建独立对话承接服务器接入、测试和口头问题反馈。已创建任务 `01a01d0c-3f0f-7f73-801e-d3298d631428`，回执仓库为 `workspace-write` 并进入 `inProgress`；SYSTEM-09 的生产业务代码仍由原后端任务独占。
- 协作协议更新至 v4.10：测试服务器任务是五个产品角色之外的专用运维协作任务，只拥有 `deploy/debian/**`、`docs/deployment/**`、`tests/performance/**` 和 `docs/testing/TEST-SERVER-ISSUES.md`。用户可直接口述现象，任务生成 `TEST-SRV-YYYYMMDD-NNN`，规划统一去重/归因/派发，产品 Owner 修复后再由原任务复测；不建立员工站服务器/压测入口。
- 当前尚缺测试机 IP、SSH 用户/端口、Debian 版本、域名/出口 IP、安装许可与停止条件，因此只执行零网络静态预检和文件准备，不连接远程、不购买、不部署、不安装、不接 Secret/真实厂商网络/付费/COS/Sentry。CURRENT 更新至 v4-786，FIFO292=`active`；FIFO291 后端返工并行保持 `active`。

## 2026-08-20｜FIFO291 BACK-SYSTEM-09A Rev2 领取

- 原样接收 `handoffToken=FIFO291-BACK-SYSTEM-09A-R2-V4.785`；权限指纹：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。CURRENT 差量写回 `active / in_progress / Current actor=后端开发对话 / Reviewer=规划对话`，保留 UI 已关闭与 FRONT/TEST blocked。
- 只处理四项同源 P1：RoutingTarget 在单一 routingVersion/workflowStage 全局连续排序、角色统一 preferred/standard/emergency、结构化 effectClass 决定安全前进、逐目标容量参与排队/claim/下一目标准入。无真实供应商/Secret/网络/付费/部署。

## 2026-08-20｜FIFO289 BACK-SYSTEM-09A Rev1 完成并交规划

- `handoffToken=FIFO289-BACK-SYSTEM-09A-R1-V4.774`；状态已写回 `review / Current actor=规划对话 / Reviewer=规划对话`。保留 FIFO290 UI done/review 与 FRONT/TEST blocked。
- 路由写入、读取和新任务链统一使用不可变 `routing_policy_targets` 有序目标、连续 priority、role、逐目标容量、`routeDigest`；旧 primary/fallback 选择旁路已删除。RoutingTarget 只引用真实已登记 EngineDeploymentVersion，人工处理不建伪部署、不做连接检查/容量，`emergency` 仅可作为最后一个真实目标。
- ASR/ScreenText 新 Batch/Job 固定 routingVersionId+routeDigest，Attempt 固定 routingTargetId/priority/deploymentVersionId；仅 externalSideEffectPossible=false 的确定失败可安全前进，unknown/reconciliation 停止并保留对账事实，追加 `routing_advance_events`。
- 新鲜隔离证据：routing `6/6`、ASR `13/13`、ScreenText `16/16`、ASR Dispatch `8/8`；从零全量迁移无业务 bootstrap，空库业务行0并已删除隔离库。backend/contracts build、tsc、`check:repo`、migration `node --check`、`git diff --check`通过；未运行完整 `pnpm check`。
- PostgreSQL 仅按授权删除 stale `postmaster.pid` 后由既有 `pnpm db:start` 恢复，55432/pg_isready 保持 accepting；未清理默认业务数据，未接真实供应商、Secret、网络、付费或部署。

## 2026-08-20｜FIFO290 UI-SYSTEM-09 Rev2 唯一 P1 修正完成

- `DESIGN.md` 5.19 与 UI 验收统一：每个编号 RoutingTarget 必须引用真实 EngineDeploymentVersion；执行位置只属于真实本地/云部署。人工处理改为全部已启用目标均确定失败后的领域工作台出口，不占序号，不拥有连接检查或引擎容量。
- 同一既有 ControlShell 原型已修正 `/routing` 和 `/changes`：画面字/语音均只列3个真实目标，当前/候选目标数与连接检查数只计真实目标；人工终点在目标表/顺序之后单列。真实上移/下移、增至8和删至1的操作边界保留。
- 新鲜 `node --check app.js / verify-rev2.mjs` 通过；Playwright 1.62.1 + 系统 Chrome 最小变化矩阵 `24/24`，application console error/warn=`0/0`、pageerror=0。两张1440最小变化截图和原始 JSON 写入同壳 `evidence/rev2/`；已人工核对层级与计数。
- FIFO288 其余49项、双视口、Modal、unknown、日志执行链与视觉结论冻结；未重复完整 Impeccable/detector/50项矩阵。生产 `frontend/system-frontend/backend/contracts/migrations` 修改0，未接真实模型/供应商/Secret/网络/付费/服务器，未提交推送部署。
- CURRENT 差量更新至 v4-781，保留 FIFO289 BACK 并行事实；UI-SYSTEM-09 Rev2 转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO290=`notification_pending`，只交规划固定任务。
- 同令牌八项差量包已只发送到规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c`；`wait_threads` 确认目标新 turn=`inProgress`。CURRENT 更新至 v4-782，FIFO290=`delivered`；未通知 FRONT/BACK/TEST。

## 2026-08-20｜FIFO290 UI-SYSTEM-09 Rev2 领取

- 原样接收 `handoffToken=FIFO290-UI-SYSTEM-09-R2-V4.779`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- CURRENT 差量更新至 v4-780，保留 FIFO289 BACK 并行事实；UI-SYSTEM-09 Rev2 进入 `active / in_progress / Current actor=UI设计对话 / Reviewer=规划对话`。
- 本轮只修正唯一 P1：编号 RoutingTarget 仅允许真实 EngineDeploymentVersion；人工处理是全部已启用目标均确定失败后的领域工作台出口，不占序号、不做连接检查、不使用引擎容量。FIFO288 其余49项冻结，不重复完整 Impeccable/detector/50项矩阵，生产代码修改0。

## 2026-08-20｜FIFO288 规划 UI 独立复核与人工终点契约校正

- 规划按 Impeccable audit 规则核对 DESIGN 5.19、UI 验收、原型源码、50/50 原始 JSON 与 5 张截图；有序纵表、safe failover、unknown/CNY、发布/停用焦点、执行链、1440/1024 和 console 证据成立。
- 发现唯一 P1：人工处理队列被建模为第4个 RoutingTarget，并拥有部署版本、容量和连接检查；这与每个目标必须引用真实 EngineDeploymentVersion 的启动包冲突，也会诱导后端注册伪 manual Adapter。
- 权威裁决已写回 `SYSTEM-ordered-execution-routing.md` 并即时通知 BACK：有序目标只允许真实本地/云部署；全部已启用目标均确定失败后，领域任务进入现有失败/需人工处理出口。人工不占目标序号、不拥有连接检查/引擎容量、不注册伪部署。
- CURRENT 更新至 v4-779；登记 FIFO290 UI-SYSTEM-09 Rev2 只修上述同源 IA/文案/原型/证据，FIFO288 其余49项冻结。FRONT/TEST继续blocked，真实模型/供应商/网络/付费/部署未执行。

## 2026-08-20｜FIFO289 BACK-SYSTEM-09A Rev1 领取与有序路由收口

- 原样接收 `handoffToken=FIFO289-BACK-SYSTEM-09A-R1-V4.774`；权限指纹：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。CURRENT 按最新并行快照差量更新至 v4-778，保留 FIFO288 UI review 事实，FIFO289 进入 `active / in_progress`。
- 已把路由契约和生产读写链切换为 `routing_policy_targets` 有序目标：RoutingTarget 身份、priority/role/容量、routeDigest、Attempt target identity 及 `routing_advance_events` 结构；ASR/ScreenText 新写入不再读取 primary/fallback 槽位，安全外部未受理失败才排入下一目标，unknown/reconciliation 不跨目标。
- 新增未发布迁移 `1754976022000_create_ordered_execution_routing.cjs`：一次读取旧主/备事实生成目标后删除旧列，空库不插业务 bootstrap；历史 job/attempt 旧部署列仅保留只读兼容，新增写入固定 routeDigest/target。新增 effect_class 与只追加前进事件。
- 新鲜验证：backend/contracts TypeScript `tsc --noEmit`、migration `node --check`、`pnpm check:repo`、`git diff --check` 通过。专项/隔离迁移尚未运行：本地 PostgreSQL 55432 当前无响应且 stale `postmaster.pid` 阻止 `db:start`，未删除锁文件或触碰默认数据库数据；此环境阻塞待规划裁决，不宣称数据库专项通过。

## 2026-08-20｜FIFO288 UI-SYSTEM-09 Rev1 完成并交规划

- 在 `DESIGN.md` 5.19 与 `docs/ui/SYSTEM-ordered-execution-routing-acceptance.md` 冻结唯一 ControlShell 的 `/engines /routing /changes /logs`：1–8 连续编号目标、上移/下移/新增/删除、首选/低价/高质量/应急、操作员启停、容量、连接检查、影响/批准/发布/恢复，以及执行记录 1→2→3。
- safe failover 明确为“服务端证明外部未受理且无付费副作用，下一目标可用并通过容量/CNY 准入”才前进；unknown/待对账只查同一请求身份，旧当前生效保持，不显示“自动重试另一厂商”。术语/表格仅保留未来信息架构注释；普通 XLSX/CSV 不进入路由。
- 新建同壳匿名原型 `C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\ui-system-09-ordered-routing\`。真实 DOM 覆盖 1440/1024、宽表内滚、侧栏 72/216 覆盖不挤正文、Modal 安全初焦/Tab/Shift+Tab/Escape/pending/unknown/冲突与成功焦点。
- 新鲜 `node --check` 通过；Playwright/系统 Chrome `50/50`，application console error/warn=`0/0`、pageerror=0。Impeccable detector 只运行一次，因 `htmlparser2/css-select/css-tree/domutils` 缺失降级为 regex；唯一 finding 为 `transition: width`，已删除并再次用真实 Chrome 完整复验 `50/50`。
- 本轮生产 `frontend/system-frontend/backend/contracts/migrations` 与员工 AppShell 修改0；未接真实 FunASR/PaddleOCR/云厂商/Secret/网络/付费/服务器，未运行完整 `pnpm check`，未提交、推送或部署。任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO288 等待固定任务送达确认。
- 同令牌八项差量包已只发送至规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c`；`wait_threads` 已确认目标出现新 turn 且状态为 `inProgress`。FIFO288 更新为 `delivered`，未通知 FRONT/BACK/TEST。

## 2026-08-20｜FIFO288 UI-SYSTEM-09 Rev1 领取

- 原样接收 `handoffToken=FIFO288-UI-SYSTEM-09-R1-V4.774`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- `UI-SYSTEM-09 Rev1` 已进入 `in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`。本轮只修改 `DESIGN.md`、`docs/ui/`、仓库外同壳匿名原型/证据及状态日志；生产 `frontend/system-frontend/backend/contracts/migrations` 修改0。
- 设计范围固定为唯一管理员 ControlShell 的 `/engines`、`/routing`、`/changes`、`/logs` 有序执行路由；不改员工 AppShell，不接真实模型、Secret、网络、付费或服务器，不调用 Superpowers。

## 2026-08-20｜PLAN-SYSTEM-09 有序执行路由方案确认并并行派发 UI/BACK

- 用户确认把 ASR、OCR、术语候选和需要识别的数据表统一为“按顺序执行、确定安全失败才进入下一目标”的共同骨架；各部署保留管理员启用/停用，禁用目标不会被系统偷偷重启。员工站不出现供应商、路由、压测或服务器控制入口。
- 新增 `docs/milestones/SYSTEM-ordered-execution-routing.md`：冻结 1–8 个不可变 RoutingTarget、Job 固定 routeDigest、Attempt 固定实际部署、只追加 RoutingAdvanceEvent、unknown/reconciliation 不自动跨厂商、逐 Attempt CNY 预算和历史审计。OCR 推荐本地 PaddleOCR→低价 API→高质量 API→人工；ASR 推荐本地/低成本→低价 API→高质量 API→人工。
- 同步 PRODUCT_ROADMAP P3、职责矩阵与 INT-11。普通 XLSX/CSV 保持本地确定性解析；术语/表格模型输出只进候选草稿，不覆盖不可变 TermVersion、Release 或原始文件。
- CURRENT 更新至 v4-774；登记 FIFO288 UI-SYSTEM-09 Rev1 与 FIFO289 BACK-SYSTEM-09A Rev1 并行，前端、执行面、术语/表格 Wave 与全链测试保持 blocked。真实模型安装、供应商、Secret、网络、付费与部署仍未执行。

## 2026-08-19｜PLAN-P3-01 四角色审计完成，进入真实厂商用户确认门

- BACK/FRONT/TEST/UI 四份只读审计均已回流，FIFO283–286关闭。现有不可变部署版本、Secret安全引用、连接测试、路由/批准/发布/恢复、CNY预算、日志、任务历史和两站UI骨架可复用；当前链只对零网络 fake/stub 闭合，不能宣称真实厂商可用。
- 统一确认两个真实调用前P0：一是服务端权威的1–3集受控试跑身份，必须固定精确项目/Asset、预算和最大次数，不移动active、不接员工任务；二是真实provider adapter、私有Secret runtime resolver、受控transport/媒体读取、真实probe及failed/reconciliation错误映射。不得用前端提示、普通发布或第二ASR写链替代。
- 新增 `docs/milestones/P3-real-asr-pilot-readiness.md`，冻结本机隔离优先、`14→1→26`分阶段、建议`¥10/集、¥30总额`、unknown只GET同身份、无自动付费重试、质量/隐私/费用硬停与服务器/COS/Sentry后置门。路线图P3同步该唯一方案。
- CURRENT更新至v4-773；PLAN-P3-01转`review / Current actor=用户`。用户确认供应商/API/区域留存/Secret引用/样本/人民币上限/质量门前，真实网络、Secret、付费、COS、Sentry和服务器均保持NO-GO；本轮未修改生产代码、未运行测试、未启动服务或真实调用。

## 2026-08-19｜SYSTEM-08 正式关闭并启动 P3 真实厂商接入门前审计

- 规划核对 TEST-SYSTEM-08 报告：正式两站+Fastify+从零37迁移隔离PostgreSQL+ScreenshotStorageFake+系统Chrome纵向 `45/45`，唯一完整 `pnpm check` 为 `44 files / 418 tests` 全绿，四工作区 lint/typecheck/build、check:repo、diff-check均通过。
- 隔离库、32782–32784、两站、Fastify、Chrome和临时harness均清理，共享PG55432保持运行；P0–P3=0，无QA返工包。CURRENT更新至v4-772，SYSTEM-08/FIFO282关闭。
- 启动 `PLAN-P3-01`：FIFO283–286 分别由BACK/FRONT/TEST/UI做只读真实ASR接入准备审计，只汇总Adapter/Secret/路由/预算、两站入口、1–3集人民币止损试跑与操作旅程；不改生产代码、不接网络/Secret/付费/云资源，最终统一交用户确认。

## 2026-08-19｜FIFO282 TEST-SYSTEM-08 Rev1 完成并交规划复核

- 正式 employee/system-frontend production build、Fastify、从零37项迁移隔离 PostgreSQL、`InMemoryFeedbackScreenshotStorageFake`、Playwright/系统 Chrome 纵向 harness 最终 `45/45`；权限/双站隔离、六类反馈、隐私确认与真实 PNG digest/size/type、全局幂等、项目 A/B、服务端筛选分页、事件只追加、双视口焦点与 console 通过。
- 结果 `P0/P1/P2/P3=0/0/0/0`，无 `QA-SYSTEM-08-*`；报告 `docs/testing/SYSTEM-test-feedback-observability-integration-report.md`，脱敏证据在仓库外 `qa-evidence-fifo282`。FIFO281 冻结的 `503→503→pending→200` stale/唯一重读/requestId/焦点证据继续引用，未强制断连共享数据库。
- 本切片唯一新鲜完整 `pnpm check`：`44 files / 418 tests`，check:repo、lint、typecheck、四工作区构建全绿；共享 PostgreSQL 55432 仍运行。隔离库 `qimao_fifo282_*=[]`、32782/32783/32784 无监听，服务/Chrome/临时 harness 精确清理。
- CURRENT 更新至 v4-771，TEST-SYSTEM-08 Rev1 与 FIFO282 转 `review / Current actor=规划对话`；仅交规划固定任务，不通知 UI/FRONT/BACK。

## 2026-08-19｜FIFO282 TEST-SYSTEM-08 Rev1 领取并进入 in_progress

- `handoffToken=FIFO282-TEST-SYSTEM-08-R1-V4.769`；权限指纹：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 已写回 CURRENT v4-770：FIFO282=`active`，TEST-SYSTEM-08 Rev1=`in_progress`，Current actor=全链测试与质量验收对话。
- 仅执行 INT-18 正式两站/Fastify/从零隔离 PostgreSQL/ScreenshotStorageFake/系统 Chrome 纵向验收；不改生产代码、不接真实外部服务，完整 `pnpm check` 留本切片唯一关闭门。

## 2026-08-19｜FIFO281 规划证据审计通过并解锁 TEST-SYSTEM-08

- 规划核对原始 `fifo281-results.json`：正式 production 两站、Fastify、从零隔离 PostgreSQL、ScreenshotStorageFake 与系统 Chrome 共 `12/12`；严格同查询 `503→503→pending→200`、第二次错误焦点、pending锁与不提前聚焦、成功H1、普通刷新不抢搜索框、offset/search迟到身份门全部成立。
- 请求事实为主列表13次、受控503四次，detail/events/writes均为0；application console.error/warn=0/0、pageerror=0。清理JSON确认Chrome、两站、Fastify关闭且隔离库DROP，共享PG55432保持运行。
- CURRENT更新至v4-769，FIFO281与FRONT-SYSTEM-08B Rev7正式关闭；登记 `handoffToken=FIFO282-TEST-SYSTEM-08-R1-V4.769`，TEST只执行独立INT-18纵向矩阵与本切片唯一完整 `pnpm check`，不接真实COS/Sentry/网络/付费/云资源。

## 2026-08-19｜FIFO281 FRONT-SYSTEM-08B Rev7 UI G场景微终验完成

- `handoffToken=FIFO281-FRONT-SYSTEM-08B-R7-V4.765`。新鲜 production 员工 frontend 195 modules、system-frontend 45 modules，正式 Fastify、从零全部迁移隔离 PostgreSQL、`InMemoryFeedbackScreenshotStorageFake`、Playwright 1.62.1 与系统 Chrome；唯一 G 矩阵正式结果 `12/12`，`P0/P1/P2/P3=0/0/0/0`。
- 同一完整 reports 查询先保留20行，再严格完成 `503→503→pending→200`：两次 stale 保留、真实 requestId、第二次唯一 ErrorBlock 焦点、pending 写锁/不提前聚焦和成功后 H1 焦点成立；普通顶栏刷新保持搜索框焦点。offset翻页和另一search身份均在旧请求pending时切换，迟到响应不抢焦，返回原查询也不复活旧意图。
- 本轮主列表请求13次与预期一致；四个受控503逐一匹配稳定 requestId，错误重读未触发 detail/events、写请求、自动轮询、额外重试或第二查询源。application console error/warn=0/0、pageerror=0；预期403和受控503仅作为浏览器原生网络诊断登记。
- 证据目录：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo281-system-08-ui-evidence`。隔离库、Fastify、两站静态服务和测试Chrome已关闭，`qimao_fifo281_*=0`，共享PG55432保持running。生产代码修改0；未运行完整pnpm check、未重复Impeccable、未提交推送部署。CURRENT更新至v4-767，FIFO281转review / Current actor=规划对话 / Reviewer=规划对话 / notification_pending，只交规划决定TEST。
- 同令牌八项差量包已只发送规划固定任务；`read_thread/wait_threads` 确认该消息进入规划新的 `inProgress` turn，规划明确开始核对原始结果、请求计数和清理 JSON。CURRENT更新至v4-768，FIFO281=`delivered`；未通知 FRONT/BACK/TEST，UI停止。

## 2026-08-19｜FIFO281 FRONT-SYSTEM-08B Rev7 UI G场景微终验领取

- 原样回显 `handoffToken=FIFO281-FRONT-SYSTEM-08B-R7-V4.765`；权限指纹为 `repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。CURRENT更新至v4-766，FIFO281=`active / in_progress`。
- 仅复用FIFO279正式production两站前端、正式Fastify、从零全部迁移隔离PostgreSQL、`InMemoryFeedbackScreenshotStorageFake`、Playwright 1.62.1/系统Chrome路径，复验G同查询503→503→pending→200、错误/成功焦点、普通刷新、offset/search身份迟到保护、请求面与console。A–F、B–E、FIFO273其余75项和布局冻结；生产代码修改0，不运行完整pnpm check、不重复Impeccable、不提交推送部署。

## 2026-08-19｜FIFO280 规划独立代码门通过并登记 FIFO281 UI 微终验

- 规划逐行复核 `feedbackPage.tsx`：错误重读已由 `reports.reload(afterSuccess)` 的本次请求成功回调拥有 H1 焦点，不再从 `loading/refreshing/error` 观察状态推断；完整 `queryKey`（含 offset）切换会清恢复意图，旧响应不能聚焦新身份或返回旧页后复活。
- 规划新鲜验证：员工+管理员反馈专项 `2 files / 23 tests`、system-frontend typecheck、Vite production build `45 modules`、`git diff --check` 全通过（仅既有 `LOCAL_APP_PARITY.md` CRLF 提示）。未运行完整 `pnpm check`。
- CURRENT 更新至 v4-765，FIFO280 关闭；登记 `handoffToken=FIFO281-FRONT-SYSTEM-08B-R7-V4.765`。UI 只复验 G 的同查询 503→503→pending→200、错误/成功焦点、普通刷新不抢焦、翻页/筛选迟到身份与 console；A–F、B–E及 FIFO273 其余正式矩阵冻结，TEST 继续 blocked。

## 2026-08-19｜FIFO280 Rev7 微审返工完成并再次交规划

- 错误列表重读改为调用 `reports.reload(afterSuccess)`，焦点只由该同一请求真实成功回调归属；移除依据 `loading/refreshing/error` 观察成功的路径，pending 期间 H1 不抢焦、读取按钮锁定，第二次失败仍由唯一 ErrorBlock 持焦。
- 恢复意图清理绑定完整 `queryKey`（含 limit/offset）；错误恢复 pending 时翻页会清旧意图并由新页读取身份接管，旧页迟到成功不覆盖/不聚焦，返回原页也不复活旧意图。查询筛选身份迟到保护保持。
- 新鲜验证：管理员反馈专项 `15/15`；员工+管理员反馈组合 `23/23`；frontend/system-frontend typecheck；两端 Vite production build（195/45 modules）；`git diff --check`通过（仅既有 `docs/contracts/LOCAL_APP_PARITY.md` CRLF 提示）。未跑完整 `pnpm check`、浏览器矩阵或 Impeccable，未改公共 Hook/API/CSS/backend/contracts/migrations/DESIGN，未提交推送部署。
- 实际生产改动仍仅 `system-frontend/src/feedbackPage.tsx`，回归改动仅 `tests/frontend/system-control-feedback.test.tsx`。CURRENT 更新至 v4-764，FIFO280 保持 `review / Current actor=规划对话 / Reviewer=规划对话`。

## 2026-08-19｜FIFO280 FRONT-SYSTEM-08B Rev7 完成并交规划复核

- 错误列表重读与普通顶栏刷新已拆为独立意图：ErrorBlock 重读只递增 reports 查询版本，避免顺带读取详情/events；成功效果要求同一 query identity、非 loading/refreshing/error 后才聚焦“反馈问题”H1，错误再次失败保持 stale 快照、真实新 requestId 与唯一 ErrorBlock 焦点；普通刷新清除恢复意图且不抢搜索框焦点，查询身份切换清理旧意图。
- 新增管理员回归覆盖同一查询 `503→503→200`、stale 20 行、第二次失败 ErrorBlock activeElement、成功 H1、普通刷新搜索框持焦，以及错误恢复中切换身份后迟到响应不聚焦新身份；旧管理员/员工反馈回归保持通过。
- 验证：管理员反馈专项 `14/14`；员工+管理员反馈组合 `22/22`；frontend/system-frontend typecheck；两端 Vite production build（195/45 modules）；`git diff --check`通过（仅既有 `docs/contracts/LOCAL_APP_PARITY.md` CRLF 提示）。未运行完整 `pnpm check`、浏览器矩阵或 Impeccable，未改 backend/contracts/migrations/DESIGN，未提交推送部署。
- 实际生产改动仅 `system-frontend/src/feedbackPage.tsx`；回归改动仅 `tests/frontend/system-control-feedback.test.tsx`。CURRENT 更新至 v4-763，FIFO280 与 FRONT-SYSTEM-08B Rev7 转 `review / Current actor=规划对话 / Reviewer=规划对话`。

## 2026-08-19｜FIFO280 FRONT-SYSTEM-08B Rev7 领取并进入 in_progress

- handoffToken：`FIFO280-FRONT-SYSTEM-08B-R7-V4.761`；权限指纹：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 已写回 CURRENT v4-762，FIFO280=active、FRONT-SYSTEM-08B Rev7=in_progress、Current actor=前端开发对话、Reviewer=规划对话。
- 本轮只修 `system-frontend/src/feedbackPage.tsx` 与对应管理员专项：拆分错误列表重读和普通顶栏刷新焦点意图；错误重读保留 stale/requestId 并在再次失败聚焦唯一 ErrorBlock、成功后聚焦页面标题，普通刷新不创建/消费恢复意图；查询身份切换清除旧意图。冻结 A–F、console、API/CSS/backend/contracts/DESIGN 及其他页面。

## 2026-08-19｜FIFO279 规划集中归因并登记 FRONT-SYSTEM-08B Rev7

- 规划确认 A员工遮罩5/5、F Drawer分页/顶层键盘8/8、console3/3及B–E正式通过并冻结；G仅剩第二次503错误焦点与普通顶栏刷新误抢焦两项同根P1。
- 根因是 `feedbackPage.tsx` 的错误重读与普通刷新共用 `refresh()`：设置 `focusAfterRetry=true` 后，已有 stale data 的 `useAsyncRead` reload 会呈现 `refreshing=true / loading=false / error=null`；当前 effect 未检查 refreshing，因而在请求尚未完成时提前聚焦H1并清掉恢复意图。第二次503出现时 ErrorBlock不再持焦，随后普通刷新也错误使用同一意图。
- CURRENT 更新至 `v4-761`，登记 `handoffToken=FIFO280-FRONT-SYSTEM-08B-R7-V4.761`。只允许拆分错误重读与普通刷新：ErrorBlock重读复用同一 reports 查询，失败保持唯一ErrorBlock焦点、成功H1；普通顶栏刷新不设置或消费恢复焦点。不得增加sleep/retry/fallback/第二查询源，不改API/CSS/后端/契约，TEST继续blocked。

## 2026-08-19｜FIFO279 FRONT-SYSTEM-08B Rev6 UI三组微终验交回

- handoffToken：`FIFO279-FRONT-SYSTEM-08B-R6-V4.757`。新鲜production员工frontend 195 modules、system-frontend 45 modules，正式Fastify、从零全部迁移隔离PostgreSQL、`InMemoryFeedbackScreenshotStorageFake`、Playwright 1.62.1与系统Chrome，仅复验A/F/G和console；B–E及FIFO273其余75项冻结，生产代码修改0。
- 原始20项为16通过/4失败；人工对账确认A初焦实际为活动Modal内 `aria-label=安全返回` 按钮，以及G首次503已保留20行/真实requestId/唯一重读，仅因harness额外要求未冻结字面句而误判。产品裁决18/20，`P0/P1/P2/P3=0/1/0/0`。
- A 5/5：真实鼠标打开初焦、遮罩mousedown关闭并在mouseup后保持原“反馈问题”焦点、无相邻通知抢焦、取消/Escape回触发点均成立。F 8/8：下一页/上一页均先记录真实按钮焦点，loading及新页由Drawer标题接管；BODY Tab/Escape、遮罩回焦、上层事件Modal只关闭自身及关闭后Drawer重新接管均成立。
- G严格同一查询主GET `503→503→200`、两次20行stale、`fifo279-stale-1/2`、唯一重读、第三次成功清stale并聚焦H1成立；仍有同根P1：第二次503后activeElement为H1而非唯一ErrorBlock，随后搜索框持焦时普通顶栏刷新200仍被旧恢复意图拉到H1。源码对账指向 `feedbackPage.tsx` 中错误重读与普通顶栏共用始终设置 `focusAfterRetry=true` 的 `refresh()`，只作为规划归因输入，UI未改生产代码。
- application console error/warn=0/0、pageerror=0；两条受控503与同一GET身份/requestId逐项一致，另一个403为feedback-only主体访问ControlShell overview的既有范围外浏览器网络诊断。证据位于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo279-system-08-ui-evidence`。
- cleanup JSON确认Chrome、两站静态服务、Fastify均关闭，隔离库已DROP；查询 `qimao_fifo279_*=0`，共享PostgreSQL 55432保持running，临时harness已删除。未运行完整pnpm check、未重复Impeccable、未提交推送部署；任务转review，仅交规划，TEST继续blocked。
- 已携同一handoffToken只唤醒规划固定任务并确认新turn；规划明确确认A/F关闭、G仅剩同根P1，并进一步定位恢复意图在请求进入refreshing阶段被过早消费及普通刷新错误继承。CURRENT更新至v4-760，FIFO279=`delivered`；未通知FRONT/BACK/TEST。

## 2026-08-19｜FIFO279 FRONT-SYSTEM-08B Rev6 UI三组微终验领取

- 原样回显 `handoffToken=FIFO279-FRONT-SYSTEM-08B-R6-V4.757`；权限指纹为 `repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。CURRENT更新至v4-758，FIFO279=`active / in_progress`。
- 本轮只复用FIFO277正式 production 两站前端 + Fastify + 从零隔离PostgreSQL + ScreenshotStorageFake + Playwright 1.62.1/系统Chrome路径，复验A/F/G与console；B–E和FIFO273其余75项冻结。生产代码修改0，不运行完整pnpm check、不重复Impeccable、不提交推送部署，TEST继续blocked。

## 2026-08-19｜FIFO278 规划代码门通过并登记 FIFO279 UI 变化复验

- 规划新鲜运行员工/管理员反馈专项 `2 files / 21 tests` 全绿；源码核对确认员工 backdrop 先取消默认 `mousedown` 再走唯一 close，公共 Drawer 使用 document capture + 最上层 modal 判定接管 Escape/Tab，焦点泄漏与上层 Modal 隔离回归齐备。
- production 仅改 `frontend/src/features/feedback/FeedbackModal.tsx` 与 `system-frontend/src/runtimeCommon.tsx`，没有继续往 `feedbackPage` 增加分页状态、没有第二回焦源或后端/契约变化。FIFO278关闭。
- CURRENT 更新至 `v4-757`，登记 `handoffToken=FIFO279-FRONT-SYSTEM-08B-R6-V4.757`。UI 仅复验 A 员工遮罩、F 真实分页/Drawer与上层Modal隔离、G列表 stale `503→503→200`，并完成本轮console聚合；B–E与FIFO273其余75项冻结，TEST继续 blocked。

## 2026-08-19｜FIFO278 FRONT-SYSTEM-08B Rev6 完成并交规划复核

- 员工 FeedbackModal 遮罩 `mousedown` 命中且非 pending 时先取消默认动作并阻止冒泡，再执行现有唯一 close；回归显式聚焦“反馈问题”入口后点击遮罩，关闭并恢复入口焦点。
- 公共 `ReadOnlyDrawer` 改为 document capture + 最上层 `aria-modal=true` 判定：`focusRequest` 后标题同步聚焦；BODY 泄漏时 Tab/Escape 仍由 Drawer 接管；存在上层 Modal 时 Drawer 不抢 Escape/Tab。回归覆盖上一页/下一页、延迟 loading、新页标题、BODY Escape 回焦及上层 Modal 隔离。
- 新鲜员工+管理员反馈专项 `21/21`、frontend/system-frontend typecheck、两端 Vite production build（195/45 modules）、`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。实际生产改动为 `frontend/src/features/feedback/FeedbackModal.tsx`、`system-frontend/src/runtimeCommon.tsx`；回归改动为两份反馈专项。未改 feedbackPage/API/CSS/backend/contracts/migrations/DESIGN，未运行完整 `pnpm check`、未重复 Impeccable、未提交推送部署。FIFO278 转 `review / Current actor=规划对话 / Reviewer=规划对话`。

## 2026-08-19｜FIFO278 FRONT-SYSTEM-08B Rev6 领取并进入 in_progress

- 原样领取 `handoffToken=FIFO278-FRONT-SYSTEM-08B-R6-V4.754`；权限指纹为 `repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 本轮只处理员工 FeedbackModal 遮罩 `mousedown` 的默认动作，以及公共 ReadOnlyDrawer 作为最上层 aria-modal 的焦点/键盘所有权；G stale 保持后续 UI 同批复验。未改 API/CSS/backend/contracts/migrations/DESIGN，未运行完整 `pnpm check`，未提交推送部署。

## 2026-08-19｜FIFO277 规划集中归因并登记 FRONT-SYSTEM-08B Rev6

- 规划接收正式变化矩阵：B摘要同范围、C附件详情、D事件unknown、E事件409通过并冻结；A 员工遮罩回焦和 F 事件分页/Drawer 键盘闭环为两组 P1，G stale 仍未裁决，TEST继续 blocked。
- A 根因已定位：员工 FeedbackModal 的 backdrop `mousedown` 直接关闭，没有先取消默认鼠标动作；React effect 回到原“反馈问题”后，浏览器仍可把焦点改为 BODY。应在确认命中遮罩且非 pending 后先 `preventDefault/stopPropagation`，再走唯一 close，不增加第二回焦路径。
- F 不再允许继续往 `feedbackPage` 添加分页补丁。公共 `ReadOnlyDrawer` 应成为当前最上层 modal 的唯一焦点/键盘所有者：`focusRequest` 需覆盖分页查询阶段 DOM 变更；即使 activeElement 临时泄漏到 BODY，最上层 Drawer 仍处理 Escape/Tab；若其上有图片/事件 Modal，则不得抢占上层事件。CURRENT 更新至 `v4-754`，登记 `handoffToken=FIFO278-FRONT-SYSTEM-08B-R6-V4.754`，只修 A/F 与真实事件序列回归，B–E及其正式证据冻结，G留下一轮UI同批复验。

## 2026-08-19｜FIFO277 FRONT-SYSTEM-08B Rev5 UI变化场景复验交回

- handoffToken：`FIFO277-FRONT-SYSTEM-08B-R5-V4.750`。使用 production 员工 frontend（195 modules）与 system-frontend（45 modules）、正式 Fastify、从零全部迁移的隔离 PostgreSQL、`InMemoryFeedbackScreenshotStorageFake`、项目既有 Playwright 1.62.1 和系统 Chrome；生产代码修改0，FIFO273其余75项冻结。
- 单一正式 harness 计划34项，实际裁决27项：21通过、6失败、7未裁决，`P0/P1/P2/P3=0/2/0/0`。B同范围摘要、C附件详情/binary、D事件unknown同身份恢复与迟到丢弃、E事件409错误焦点/刷新/新身份全部通过。
- P1-001：员工普通遮罩关闭后 Modal 已关闭，但 `activeElement=BODY`，没有回原“反馈问题”；普通取消、Escape、两次create 409相邻通知焦点、新feedbackId/body/key及已创建无截图通知均通过。
- P1-002：管理员事件分页中，真实鼠标按下上一页/下一页均落BODY，分页后Drawer标题未接管；Escape未关闭Drawer/回原“查看详情”。活动Drawer随后正确拦截底层按钮，harness在该依赖步骤超时；按停止门不再第四次运行，因此F遮罩回焦、G列表stale 503→503→200及末端console/pageerror聚合保持未裁决，不冒充产品通过或失败。
- 证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo277-system-08-ui-evidence\fifo277-adjudication.json`、三张最小截图和原始 `fifo277-harness-error.txt`。隔离库已DROP；Fastify/静态服务/测试Chrome由finally关闭；共享PostgreSQL 55432保持运行。未运行完整pnpm check、未重复Impeccable、未提交推送部署；任务转review，只交规划，TEST继续blocked。
- 已携同一handoffToken只唤醒规划固定任务并确认新turn；规划明确收到并按B/C/D/E关闭、A/F焦点P1集中修正、G stale待复验处理。CURRENT更新至v4-753，FIFO277通知态为`delivered`；未通知FRONT/BACK/TEST。

## 2026-08-19｜FIFO277 FRONT-SYSTEM-08B Rev5 UI变化场景复验领取

- 原样回显 `handoffToken=FIFO277-FRONT-SYSTEM-08B-R5-V4.750`；权限指纹为 `repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。CURRENT 更新至 v4-751，FIFO277=`active / in_progress`。
- 本轮只以 production 员工/管理员前端、正式 Fastify、从零隔离 PostgreSQL、`InMemoryFeedbackScreenshotStorageFake`、既有 Playwright/系统 Chrome 复验 FIFO273 六组原P1与列表 stale 唯一未裁决项；其余75项冻结，生产代码修改0，不运行完整 `pnpm check`、不重复 Impeccable，TEST继续 blocked。

## 2026-08-19｜FIFO276 规划代码门通过并登记 FIFO277 UI 变化复验

- 规划核对 `changeEventsPage(nextOffset)` 与回归：上一页/下一页统一先发起 Drawer `focusRequest` 再切事件 offset；测试先 `nextButton.focus()` 并确认 activeElement，再模拟点击，验证 loading、新页和 Escape/触发点回焦，真实鼠标链不再由 JSDOM 假焦点掩盖。
- 规划新鲜运行 `tests/frontend/feedback.test.tsx`、`tests/frontend/system-control-feedback.test.tsx`，结果 `2 files / 19 tests` 全绿；源码核对确认未新增状态源、未改 `ReadOnlyDrawer` 默认行为。FIFO276 关闭。
- CURRENT 更新至 `v4-750`，登记 `handoffToken=FIFO277-FRONT-SYSTEM-08B-R5-V4.750`。UI 只复验 FIFO273 六组原P1与唯一未裁决的列表 stale `503→503→200`；FIFO273 其余75项、权限/隔离/主链/视觉通过证据冻结，生产代码修改0，TEST继续 blocked。

## 2026-08-19｜FIFO276 FRONT-SYSTEM-08B Rev5 完成并交规划复核

- 新增 `changeEventsPage(nextOffset)`，事件历史上一页/下一页统一先递增 `drawerFocusRequest` 再更新 offset，避免真实鼠标先聚焦即将卸载的分页按钮后落到 BODY。
- 回归显式 `nextButton.focus()` 后再点击，使用可控延迟验证 loading 期间 Drawer 标题接管、新页稳定后标题仍聚焦，Escape 关闭并恢复原“查看详情”触发点；反馈员工+管理员专项 `19/19` 通过。
- 实际生产改动仅 `system-frontend/src/feedbackPage.tsx`，测试改动 `tests/frontend/system-control-feedback.test.tsx`。system-frontend typecheck、Vite production build `45 modules`、`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未改 runtimeCommon/backend/contracts/migrations/DESIGN，未运行完整 `pnpm check`、未重复 Impeccable、未提交推送部署。FIFO276 转 `review / Current actor=规划对话 / Reviewer=规划对话`。

## 2026-08-19｜FIFO276 FRONT-SYSTEM-08B Rev5 领取并进入 in_progress

- 原样领取 `handoffToken=FIFO276-FRONT-SYSTEM-08B-R5-V4.747`；权限指纹为 `repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 本轮只修事件历史上一页/下一页的统一 Drawer 焦点请求，并让回归先显式聚焦下一页按钮后验证 loading、新页、Escape 与原查看详情触发点回焦；其他 FIFO275 通过项冻结。

## 2026-08-19｜FIFO275 规划代码门差量与 FIFO276 同 Rev5 微返工登记

- 规划核对确认选中 status 互斥摘要确定0、event POST/unknown GET 成功聚焦活动 Drawer、迟到身份丢弃与公共 `focusRequest` 主体成立；但事件历史分页实现不对称：上一页在切换 offset 前递增 `drawerFocusRequest`，下一页只更新 offset。
- 真实 Chrome 鼠标会先把焦点放到“下一页”，随后按钮因分页 loading 被卸载，若无 Drawer 接管仍可能落 BODY。现有回归使用 `fireEvent.click` 且未先调用 `focus()`，因此焦点一直留在 Drawer 标题，不能证明真实鼠标链。
- CURRENT 更新至 `v4-747`，FIFO275 关闭为审核输入；登记 `handoffToken=FIFO276-FRONT-SYSTEM-08B-R5-V4.747`。只允许统一上一页/下一页分页入口的焦点请求，并让测试显式聚焦下一页按钮后验证 loading、新页、Escape 与原“查看详情”回焦；不改后端、契约、迁移、DESIGN，不运行完整 `pnpm check`，UI/TEST 继续 blocked。

## 2026-08-19｜FIFO275 FRONT-SYSTEM-08B Rev5 完成并交规划复核

- 选中 status 时仅消费同范围列表 `total`：`new/retest/closed` 仅对应摘要显示真实 total，互斥项确定为 `0`；`confirmed/fixing` 统一投影“处理中”，其余摘要为 `0`，不再出现未知/null。
- `ReadOnlyDrawer` 新增可选 `focusRequest` 纯聚焦请求语义；事件 POST 成功、同 `eventId` GET 恢复成功和事件分页切换均在当前 Drawer 内聚焦标题，分页加载中不落 BODY，Escape/关闭恢复原“查看详情”触发点。成功/恢复只在当前 feedback 身份仍匹配时生效，迟到响应被丢弃。
- 实际生产改动为 `system-frontend/src/feedbackPage.tsx`、`system-frontend/src/runtimeCommon.tsx`；回归改动为 `tests/frontend/system-control-feedback.test.tsx`。新鲜员工/管理员反馈专项 `19/19`、frontend/system-frontend typecheck、system-frontend Vite production build `45 modules`、`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 `pnpm check`、未做浏览器矩阵、未重复 Impeccable，未改 backend/迁移/contracts/DESIGN，未提交推送部署。FIFO275 转 `review / Current actor=规划对话 / Reviewer=规划对话`。

## 2026-08-19｜FIFO275 FRONT-SYSTEM-08B Rev5 领取并进入 in_progress

- 原样领取 `handoffToken=FIFO275-FRONT-SYSTEM-08B-R5-V4.744`；权限指纹为 `repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 本轮只处理选中 status 摘要互斥确定0、事件 POST/同 eventId GET 成功后的活动 Drawer 内安全焦点、事件分页查询身份切换后的 Drawer 焦点接管；其他 Rev5 通过项冻结。未改 backend/迁移/contracts/DESIGN，未运行完整 `pnpm check`，未提交推送部署。

## 2026-08-19｜FIFO274 规划代码门未通过并登记同 Rev5 审核差量

- 规划新鲜复跑 `tests/frontend/feedback.test.tsx` 与 `tests/frontend/system-control-feedback.test.tsx`，结果 `2 files / 12 tests` 全绿；代码核对确认员工通知焦点、附件 detail metadata 单一消费、无效管理员 metadata GET 删除、event unknown/error 进入活动 Drawer 等主体成立。
- 仍有三处现有测试未覆盖的同根时序遗漏：status 已限定时 `summary` 其余键保持 null，页面显示“未知”而不是逻辑确定的0；`submitEvent` 与 `recoverEvent` 成功把焦点送到 Drawer 后的页面 H1；事件分页变更 identity 时分页按钮被卸载，未安排 Drawer 标题等安全目标接管，仍可能出现 activeElement=BODY 与 Escape 失效。
- CURRENT 更新至 v4-744，FIFO274 关闭为审核输入；登记 `handoffToken=FIFO275-FRONT-SYSTEM-08B-R5-V4.744`，保持同一 Rev5，只允许补上述三处与最小回归。不得重做已通过实现、不得修改 backend/contracts/migrations/DESIGN，不运行完整 pnpm check；UI/TEST 继续 blocked。

## 2026-08-19｜FIFO274 FRONT-SYSTEM-08B Rev5 完成并交规划复核

- 原样回显 `handoffToken=FIFO274-FRONT-SYSTEM-08B-R5-V4.742`；权限指纹为 `repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。领取后 FIFO274 已从 `active/in_progress` 转 `review`，Current actor=规划对话、Reviewer=规划对话。
- 员工 FeedbackModal 新增单一通知焦点所有者：普通取消/遮罩/Escape 仍回“反馈问题”入口；create 确定失败或已创建无截图通知出现时，Modal 不再抢回入口焦点，由 AppShell 邻近通知持焦。管理员摘要保留完整 search/surface/kind/status/project/from/to/sort/sortDirection 范围，未选状态读取 new/confirmed/fixing/retest/closed 服务端 total，选中状态只消费同范围列表 total 并按“待确认/处理中/待复测/最近关闭”投影。
- 管理员详情直接消费服务端 attachment metadata，删除无效 system-control metadata GET，binary content 读取路径不变。事件 unknown 恢复和确定性409 ErrorBlock 移入当前详情 Drawer，可见/可达并保持同身份 GET、错误焦点与动作锁；恢复按钮、Drawer 标题/关闭和事件分页沿既有公共焦点原语。
- 实际生产文件：`frontend/src/features/feedback/FeedbackModal.tsx`、`system-frontend/src/feedbackPage.tsx`、`system-frontend/src/feedbackApi.ts`；专项回归：`tests/frontend/feedback.test.tsx`、`tests/frontend/system-control-feedback.test.tsx`。新鲜验证：反馈员工/管理员专项 `12/12`，frontend/system-frontend typecheck，通过两端 Vite production build（195/45 modules），`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 `pnpm check`、未重复 Impeccable、未做完整浏览器矩阵；未改 backend/迁移/contracts/DESIGN，未提交推送部署。规划唤醒已发送，等待独立复验。

## 2026-08-19｜FIFO273 规划集中归因并登记 FRONT-SYSTEM-08B Rev5

- 规划核对 DESIGN 5.18、UI §10、共享反馈契约、正式 feedback routes、两站 API/页面与公共 Drawer 后确认六组 P1 全归前端，不需要新增后端路由：管理员详情响应已含附件 contentType/size/privacyConfirmedAt/status，当前 system-frontend 另行请求不存在的管理员 metadata 地址造成真实404，应删除重复读取并消费详情内权威附件。
- 四项摘要按冻结语义保留完整 search/surface/kind/status/project/from/to/sort/sortDirection 范围；status 已限定时使用该状态查询的真实 total 投影唯一相容摘要，confirmed/fixing 合并“处理中”，其余互斥摘要归零，不覆盖 status 再发不同范围查询。员工 Modal/邻近通知必须建立单一回焦所有者；管理员 event unknown/error 必须位于活动 Drawer 可达层内，确定409刷新后保持唯一错误焦点，事件分页不得把焦点落 BODY，Escape/遮罩关闭均回原“查看详情”。
- CURRENT 更新至 v4-742；关闭 FIFO273，登记 `handoffToken=FIFO274-FRONT-SYSTEM-08B-R5-V4.742`，任务置 `ready / Current actor=前端开发对话 / Reviewer=规划对话`。仅允许修改员工/管理员反馈前端、必要公共焦点原语与专项测试；FIFO273 已通过矩阵冻结，stale 503→503→200 留 UI 变化场景补裁决，TEST 继续 blocked，不运行完整 pnpm check、不提交推送部署。

## 2026-08-19｜FIFO273 FRONT-SYSTEM-08B Rev4 正式 UI 终验不通过并交规划

- 新鲜 production 员工 frontend 195 modules、system-frontend 45 modules，配合正式 Fastify、从零全部迁移隔离 PostgreSQL、`InMemoryFeedbackScreenshotStorageFake`、项目既有 Playwright/系统 Chrome 完成唯一完整矩阵。原始85项为73通过/12未通过；人工剔除受控非2xx控制台原生诊断与1024动画中采样偏差后，产品通过75、失败9、未裁决1，`P0/P1/P2/P3=0/6/0/0`。
- 六组P1集中为：员工 Modal 遮罩/首次create 409焦点闭环；管理员四摘要未保持当前status同范围；管理员附件metadata使用不存在的system-control路径导致404/无“查看大图”；事件unknown恢复块被仍开启Drawer遮挡；事件确定409错误块两次未获焦；事件分页后Drawer Escape与遮罩回触发点失效。列表stale 503→503→200因hook只命中首个主GET而保持未裁决。
- 六类员工创建、安全上下文与项目/任务归属、截图四阶段真实bytes/digest、四类unknown写恒1/同身份GET/显式续传、部分完成诚实文案、权限隔离、管理员分页/事件状态链/历史不变、1440/1024稳定几何、根无横溢均有正式证据。应用主动console error/warn=0/0、pageerror=0；18条浏览器资源诊断均与受控403/404/409/503身份对应，附件metadata 404已单列产品P1。
- 证据写入 `C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo273-system-08-ui-evidence`。隔离数据库已DROP，48200–48220无任务监听，临时harness/中间失败产物已删除，共享PostgreSQL 55432保持运行。仅写验收文档/CURRENT/日志与仓库外证据，生产frontend/system-frontend/backend/contracts/migrations/DESIGN修改0；FIFO273转review并只交规划，TEST继续blocked。

## 2026-08-19｜FIFO273 FRONT-SYSTEM-08B Rev4 正式 UI 终验领取

- 原样回显 `handoffToken=FIFO273-FRONT-SYSTEM-08B-R4-V4.739`；权限指纹为 `repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。CURRENT 更新至 v4-740，FIFO273=`active`，FRONT-SYSTEM-08B Rev4 保持 `review / Current actor=UI设计对话 / Reviewer=UI设计对话`。
- 本轮仅以 Reviewer 身份执行唯一 production 员工 frontend + production system-frontend + 正式 Fastify + 从零全部迁移精确隔离 PostgreSQL + InMemoryFeedbackScreenshotStorageFake + 系统 Chrome/既有 Playwright 完整矩阵；不改生产代码，不重复 Impeccable，不运行完整 `pnpm check`，TEST继续 blocked。

## 2026-08-19｜FIFO272 规划独立复验通过并登记正式 UI 终验

- 规划核对 `FeedbackNotice` 联合类型、AppShell 投影与 `FeedbackModal.close/continueUpload`：纯创建失败为“反馈未提交/重新填写反馈”；服务端报告已创建但截图未附上为“反馈已创建/知道了”；续传确定4xx携真实原因/requestId只发一次通知并清 FrozenIntent，不再读取旧 partial 闭包覆盖。
- 规划新鲜运行员工/管理员反馈组合，结果 `2 files / 9 tests`；员工 frontend typecheck 与 Vite production build `195 modules` 通过，仅保留既有大 chunk 非阻断提示。未运行完整 `pnpm check`，留 TEST-SYSTEM-08 唯一关闭门。
- CURRENT 更新至 v4-739，FIFO272 closed；登记 `handoffToken=FIFO273-FRONT-SYSTEM-08B-R4-V4.739`，由 UI 固定任务运行唯一正式员工/管理员两站、Fastify、从零隔离 PostgreSQL、截图 Storage fake 与系统 Chrome 完整矩阵。FRONT 停止修改，TEST 继续 blocked。

## 2026-08-19｜FIFO272 FRONT-SYSTEM-08B Rev4 完成并交规划复核

- `FeedbackNotice` 改为带 kind 的联合通知：create 阶段确定失败显示“反馈未提交”并保留“重新填写反馈”；反馈已创建但截图未附上显示“反馈已创建”，正文仅说明截图未附上，提供低强调“知道了”，不再引导新建或虚构恢复路径。
- 截图续传确定性 4xx 统一走显式关闭/重置路径，清除 FrozenIntent、阶段恢复和旧 partial；只发送一次“反馈已创建，但截图未附上”及真实安全原因/requestId，避免旧闭包覆盖。unknown/显式续传与既有冻结身份行为保持不变。
- 仅修改 `frontend/src/features/feedback/FeedbackModal.tsx`、`frontend/src/components/AppShell.tsx`、`tests/frontend/feedback.test.tsx` 及状态/日志；未改管理员反馈页、backend、迁移、contracts、DESIGN 或视觉主体。新鲜验证员工反馈专项 `7/7`、员工/管理员反馈组合 `9/9`、frontend typecheck、Vite production build 195 modules、`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）；完整 `pnpm check`、Impeccable 重跑和浏览器矩阵留后续关闭门。FIFO272 转 review，已唤醒规划复核，未提交推送部署。

## 2026-08-19｜FIFO272 FRONT-SYSTEM-08B Rev4 领取

- 已完成 v4.9 权限握手：`handoffToken=FIFO272-FRONT-SYSTEM-08B-R4-V4.736`；`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`；普通仓库编辑不走 auto_review。
- FIFO272 已置 `active / in_progress`，Current actor=前端开发对话；本轮仅修复创建失败与已创建无截图的通知分流，以及截图续传确定性冲突的单一关闭/重置路径，不改管理员页、backend、迁移、contracts、DESIGN 或视觉主体。

## 2026-08-19｜FIFO271 规划根因复验并登记 FRONT-SYSTEM-08B Rev4

- 规划新鲜运行员工/管理员反馈专项 `2 files / 7 tests` 全通过，并逐段核对 FrozenIntent、verify/recover/continue、表单写锁与 projectDraft 查询身份；显式续传只在用户动作后复用同一阶段身份，输入草稿不触发请求，Rev3 主体成立。
- 仍有两项同根诚实状态 P1：部分完成关闭通过 `onConflict` 进入 AppShell 后，固定标题/动作仍显示“反馈未提交 / 重新填写反馈”，与已创建 FeedbackReport 矛盾；continueUpload 确定性4xx 先上报真实错误后调用读取旧 partial 闭包的 `close()`，可能由“截图未附上”提示覆盖真实原因/requestId。
- CURRENT 更新至 v4-736，登记 `handoffToken=FIFO272-FRONT-SYSTEM-08B-R4-V4.736`。只允许分离未创建失败与已创建无截图两类通知、确保确定冲突单一安全落点并补最小回归；不改后端/contracts/migrations/DESIGN、视觉主体或外部服务，不重复完整矩阵/Impeccable/pnpm check。

## 2026-08-19｜FIFO271 FRONT-SYSTEM-08B Rev3 完成并交规划复核

- 截图恢复沿单一 FrozenIntent 收口：冻结 `feedbackId/attachmentId`、create/authorize/upload/complete body、各阶段 Idempotency-Key 与截图 bytes；unknown/部分完成只查询同一 feedback/attachment，服务端未确认 `uploaded` 时呈现唯一查询和显式“继续上传已确认截图”，按权威阶段续传原身份，complete GET 确认 uploaded 才显示完整成功。FrozenIntent 存在时表单字段与“提交反馈”全锁，避免生成第二 feedbackId；关闭部分完成只提示“反馈已创建，截图未附上；管理员仍可看到这条反馈”，不承诺重新打开恢复。
- 管理员反馈页拆分 `projectDraft` 与已提交 `projectId`：草稿输入不触发请求，非法提交只显示本地安全错误并聚焦，不改变权威查询；空值/合法 UUID 显式提交后才刷新同范围 list/summary，并清理失效查询身份。
- 仅修改 `frontend/src/features/feedback/FeedbackModal.tsx`、`system-frontend/src/feedbackPage.tsx`、`tests/frontend/feedback.test.tsx`、`tests/frontend/system-control-feedback.test.tsx` 及状态/日志；未改 backend、迁移、contracts、DESIGN、视觉主体或外部服务。新鲜验证反馈专项 `7/7`、全部前端 `19 files / 201 tests`、frontend/system-frontend typecheck、两端 Vite production build、`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）；完整 `pnpm check`、Impeccable 重跑与正式浏览器矩阵留后续关闭门。FIFO271 转 review，唤醒规划复核，未提交推送部署。

## 2026-08-19｜FIFO271 FRONT-SYSTEM-08B Rev3 领取

- 已完成 v4.9 权限握手：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`；普通仓库编辑不走 auto_review。
- FIFO271 已置 `active / in_progress`，Current actor=前端开发对话；本轮仅修复反馈截图分阶段显式续传与管理员项目筛选草稿/提交身份隔离，不改 backend、迁移、contracts、DESIGN 或外部服务。

## 2026-08-19｜FIFO270 规划根因/状态时序审查并登记 FRONT-SYSTEM-08B Rev3

- 规划新鲜复跑 `tests/frontend/feedback.test.tsx` 与 `tests/frontend/system-control-feedback.test.tsx`，现有结果为 `2 files / 3 tests`；截图本地预览、部分完成诚实文案、管理员摘要/详情等 Rev2 基线成立，但测试把附件状态在重复 GET 时直接推进为 uploaded，没有覆盖真实写阶段继续。
- 代码审查确认 `FeedbackModal.verifyResult/recover` 只读取 feedback/attachment：create/authorize/upload/complete 任一响应未知后，若权威附件仍缺失或 authorized，页面只能反复查询并永久停留“截图尚未确认完成”，没有由用户显式继续已冻结 stage/body/key 的入口。修正口径为：查询仍只 GET 同一身份；只有用户点击“继续上传已确认截图”才从服务端已证实的下一阶段继续，复用原 feedbackId/attachmentId/body/key，禁止自动重发、禁止新身份、禁止误报完整成功。
- 同轮发现管理员 `projectId` 受控输入直接进入 query identity，输入未完成 UUID 时会产生必然 400。FIFO271 需拆分 projectDraft 与已提交 projectId，本地校验为空或合法 UUID，非法输入不得发请求并提供唯一安全错误。其余 Rev2 UI、API、摘要、列表/详情、权限与焦点证据冻结；不改 backend/contracts/migrations/DESIGN，不运行完整 `pnpm check`。
- CURRENT 更新至 v4-733，登记 `handoffToken=FIFO271-FRONT-SYSTEM-08B-R3-V4.733`，FRONT ready，UI/TEST 继续 blocked。

## 2026-08-19｜FIFO270 FRONT-SYSTEM-08B Rev2 完成并交规划复核

- 八项差量包：员工截图选择仅本地预览并显示真实像素/大小，URL 切换/取消/卸载及时 revoke；FeedbackReport create 类型与 feedback/attachment 分阶段 GET 恢复成立，未确认上传时保留“反馈已创建，截图尚未确认完成”，仅 uploaded 显示完整成功；上下文投影补齐浏览器/版本、页面模板、版本、视口/时区、项目/任务短身份、requestId/性能未采集，taskType 白名单和确定冲突后的 AppShell 邻近错误焦点成立；管理员摘要复用同一服务端查询范围并按 status total 投影，查询控件、分页、列表页面区域列序、详情附件元数据/显式大图、截图失败 requestId/唯一重读和容器横滚完成。
- 允许生产范围内修改 `frontend/src/features/feedback/`、`system-frontend/src/feedbackApi.ts`、`system-frontend/src/feedbackPage.tsx`、`system-frontend/src/feedback.css` 与反馈专项；未改 backend、迁移、packages/contracts、DESIGN、员工业务状态机或外部服务。代码保持单一 feedback/attachment 权威身份，无 fallback/第二状态源。
- 新鲜验证：反馈员工/管理员专项 `3/3`，全部前端 `19 files / 197 tests`，frontend 与 system-frontend typecheck，两端 Vite production build，`git diff --check` 均通过；Impeccable 按 Rev1 要求不重复，完整 `pnpm check` 与正式 Fastify/PostgreSQL 浏览器矩阵留后续关闭门。FIFO270 转 `review / Current actor=规划对话 / Reviewer=规划对话`，未提交、推送或部署。

## 2026-08-19｜FIFO270 FRONT-SYSTEM-08B Rev2 领取

- 已完成权限握手：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`；FIFO270 active、FRONT-SYSTEM-08B Rev2 in_progress，Current actor=前端开发对话。
- 本轮仅修复截图预览/分阶段未知恢复、员工安全上下文与冲突焦点、管理员同范围摘要查询和列表/详情截图投影四组 P1，不改 backend、迁移、contracts、DESIGN 或外部服务。

## 2026-08-19｜FIFO269 规划复核并登记 FRONT-SYSTEM-08B Rev2

- 规划新鲜复跑员工/管理员反馈专项，结果 `2 files / 2 tests`；两站主体、真实 API 路径、基本 unknown GET、状态链、两端构建和旧导航回归基线成立。
- 与 DESIGN 5.18、UI 验收和正式契约逐项交叉后归并四组 P1：1) 员工截图没有本地预览/像素尺寸，任一截图子命令未知后只要 GET 到 FeedbackReport 就误报包含截图的完整成功；2) 管理员四摘要未使用当前查询同范围，且项目/时间/排序服务端控件缺失；3) 列表/详情未完整投影页面区域和附件大小/确认时间/查看大图；4) 员工安全上下文显示不完整，确定性创建冲突未按冻结规则清旧意图、关闭 Modal、刷新并保留安全错误焦点。
- CURRENT 更新至 v4-731，登记 `handoffToken=FIFO270-FRONT-SYSTEM-08B-R2-V4.731`。Rev2 只修现有 feedback 前端与专项，不改 backend/contracts/migrations/DESIGN，不新增状态源、依赖、测试清单、录像或外部 Sentry/COS；UI/TEST 继续 blocked。

## 2026-08-19｜FIFO269 FRONT-SYSTEM-08B Rev1 完成并交规划复核

- 八项差量包：1) 员工 AppShell 顶栏低干扰“反馈问题”与单一 Modal，六类中文问题、必填描述、安全上下文摘要、截图默认不上传；2) 显式选择截图后校验 PNG/JPEG/WebP 与 5MB、二次隐私确认，预生成 feedbackId/attachmentId/幂等键并按 authorization→binary content→complete；3) 创建/截图未知只查询同一反馈身份，确定错误保留真实错误并允许新意图；4) 独立 ControlShell `/feedback` 导航、服务端 search/surface/kind/status/project/sort/limit/offset 列表与四项真实 total 摘要；5) 详情 Drawer、脱敏上下文、确认截图查看、事件有界分页与 confirmed→fixing→retest→closed/closed→reopened 状态流转；6) 事件 POST 稳定 feedbackEventId+幂等键，unknown 只 GET 同一事件，失败/恢复焦点与写锁成立；7) 复用 AppShell/ControlShell/Modal/Drawer/ErrorBlock，不接外部 COS/Sentry/Secret/网络/付费；8) 1440/1024 视觉沿既有壳，表格只容器横滚，无第二状态源。
- 交付验证：员工与管理员反馈专项 `2 files / 2 tests`、全部前端 `19 files / 196 tests`、frontend 与 system-frontend typecheck、两端 Vite production build、Impeccable detector `[]`、`git diff --check` 通过。完整 `pnpm check` 与正式 Fastify/PostgreSQL 浏览器矩阵留规划/UI 终验；本轮未提交、推送或部署。

## 2026-08-19｜FIFO269 FRONT-SYSTEM-08B Rev1 领取

- 已完成 v4.9 权限握手：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`；普通仓库编辑不走 auto_review。
- FIFO269 已置 `active / in_progress`，Current actor=前端开发对话；本轮实现员工 AppShell“反馈问题”和管理员 ControlShell `/feedback`，严格消费正式反馈 API，不改 backend、迁移、contracts、DESIGN 或外部服务。

## 2026-08-19｜FIFO268 规划独立复验关闭并登记 FRONT-SYSTEM-08B

- 规划逐文件核对 `system-control-feedback` 契约、`1754976021000`、feedback routes/service/auth/storage fake 与后端专项：截图为同源二进制上传并按真实 digest/size/type 完成核验，显式 `privacyConfirmed=true` 与确认时间持久化；employee 缺项目范围即拒绝；create/event/authorization/upload/complete 共用全局命令键锁与跨表身份查询；事件有界分页与最小列表/最新事件摘要成立，无第二业务状态源或外部网络。
- 规划新鲜运行 `tests/backend/system-control-feedback.test.ts`，结果 `1 file / 6 tests`；contracts build、backend build、`pnpm check:repo` 均退出0。未运行完整 `pnpm check`，留 TEST-SYSTEM-08 唯一关闭门。
- CURRENT 更新至 v4-728：FIFO268=`closed`、BACK-SYSTEM-08A Rev2=`done`；登记 `handoffToken=FIFO269-FRONT-SYSTEM-08B-R1-V4.728`，FRONT 只负责正式员工 AppShell 与管理员 ControlShell 接入，UI 为后置 Reviewer，TEST 继续 blocked。

## 2026-08-19｜FIFO268 BACK-SYSTEM-08A Rev2 完成并交规划复核

- 基于 CURRENT v4-726 做差量收口并更新至 v4-727；FIFO268/BACK-SYSTEM-08A Rev2 转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO266 UI done 事实保留，FRONT/TEST 继续 blocked。
- 八项差量包：1) `FeedbackScreenshotAuthorizationBody` 强制 `privacyConfirmed: true`，附件持久化 `privacy_confirmed_at/by`，新增真实 binary PNG/JPEG/WebP 上传与管理员内容读取，InMemory fake 保存/校验/读取 bytes，complete 重新核对实际 digest/size/type；2) employee 项目创建、详情、事件和附件读取在缺失 `projectIds` 时稳定拒绝，任务身份继续做项目归属核对；3) create/event/attachment authorization/upload/complete 使用同一全局 command-key advisory lock 与跨表查询，迁移增加 upload/complete 全局唯一索引，覆盖并发同 key 与同 ID 异 key 冲突；4) 新增管理员事件分页 GET，按 created_at DESC/id DESC 返回真实 total，detail 首屏仍有界；5) 新增 `FeedbackListItem`/latest event 安全摘要，列表不返回 browser/viewport/performance/requestIds，服务端组合搜索覆盖 feedbackId/description/routeTemplate/resourceId/requestIds；6) 迁移约束与附件身份触发器保护隐私确认与摘要，空库不插业务行；7) 保持逐请求 employee/system-control 权限、关闭/重开与状态所有权，内容响应不泄露 objectKey/内部地址/签名；8) 未接真实 COS/Sentry/网络/Secret/付费/部署，未改 frontend/system-frontend/DESIGN/既有领域状态机。
- 新鲜验证：`node node_modules/vitest/vitest.mjs run tests/backend/system-control-feedback.test.ts --no-file-parallelism` 6/6；`node --check backend/migrations/1754976021000_create_system_feedback_observability.cjs`、contracts/backend typecheck、backend build、`node tools/verify-repository.mjs`、`git diff --check` 通过。专项创建的 `qimao_feedback_*` 隔离库已由 afterAll DROP，共享 PostgreSQL 55432 保持且未改默认业务数据；完整 `pnpm check` 留 TEST 最终关闭门。

## 2026-08-19｜FIFO267 规划交叉审查并登记 BACK-SYSTEM-08A Rev2

- 规划新鲜运行 `tests/backend/system-control-feedback.test.ts`，结果 1 file / 4 tests 全通过；同时逐文件审查反馈契约、1754976021000、权限、Storage fake、service/routes 与专项。Rev1 的单一 FeedbackReport/Event、合法状态链、基本权限/筛选/幂等和零外网主体成立。
- 正式前端仍被五组同源合同缺口阻断：截图 fake 只预留元数据、没有真实字节上传与管理员内容读取，且缺显式隐私确认时间；employee 缺 `projectIds` 时项目归属失败开放；event/attachment completion 的幂等键没有跨资源并发锁/唯一所有权；超过100条事件无分页入口；列表直接返回完整 report 且缺最新事件摘要，既过量又无法支撑冻结表格。
- 登记 `handoffToken=FIFO268-BACK-SYSTEM-08A-R2-V4.725`。Rev2 只修改反馈契约/同一未发布迁移/feedback模块/专项，必须补实际 bytes fake 与同源上传/读取路由、`privacyConfirmed=true` 与确认时间、失败关闭、全局稳定幂等并发、事件分页和最小列表投影；不新增第二存储/日志/状态源，不改前端/DESIGN，不接真实 COS/Sentry/网络。FRONT/TEST 继续 blocked。

## 2026-08-19｜FIFO267 BACK-SYSTEM-08A Rev1 完成并交规划复核

- 基于最新 CURRENT v4-723 做差量写回至 v4-724，保留 FIFO266 UI `done/review` 并行事实；BACK-SYSTEM-08A/FIFO267 转 `review / Current actor=规划对话 / Reviewer=规划对话`。
- 八项差量包：1) 新增 `packages/contracts/src/system-control-feedback.ts` 及 index 导出，严格 kind/status/action/context/browser/viewport/performance/attachment/page schemas，additionalProperties=false；2) 新增 `1754976021000_create_system_feedback_observability.cjs`，FeedbackReport 当前状态、FeedbackEvent 只追加保护、截图附件摘要与幂等列，空库不插业务行且不保存 objectKey；3) 新增 feedback service/routes/auth/errors 与注入式 `InMemoryFeedbackScreenshotStorageFake`；4) Fastify app/types 注入单一存储与正式创建/详情/附件授权完成/管理员列表详情/事件/事件稳定GET；5) employee + feedback:create 与 system-control feedback read/write 逐请求校验，surface/subject 服务端派生，项目 A/B 隔离；6) 同键重放、同键异参、同ID异键、状态冲突、关闭重开、unknown 只 GET 稳定身份；7) 服务端 attention/created/updated 筛选排序分页/空页真实 total，事件有界详情，响应不泄露 objectKey/Secret/URL/原始载荷；8) 只用精确隔离 PostgreSQL 与 fake，不接真实 COS/Sentry/网络/Secret/付费/部署。
- 新鲜验证：`node node_modules/vitest/vitest.mjs run tests/backend/system-control-feedback.test.ts --no-file-parallelism` 4/4；contracts/backend typecheck 与 backend build 通过；`node --check backend/migrations/1754976021000_create_system_feedback_observability.cjs`、`node tools/verify-repository.mjs`、`git diff --check` 通过。临时数据库已 DROP，默认 PostgreSQL 55432 未改业务数据；完整 `pnpm check` 留 TEST 关闭门，未通知 UI/FRONT/TEST。

## 2026-08-19｜FIFO266 规划复核关闭 UI-SYSTEM-08

- 规划独立核对 DESIGN 5.18、`docs/ui/SYSTEM-test-feedback-observability-acceptance.md`、仓库外 `results.json` 22/22 与员工创建、管理员列表、1024覆盖三张关键截图：低干扰入口、显式截图二次确认、管理员只追加流转/关闭后重开、unknown/冲突、双视口和焦点证据一致。
- 微审仅校正验收页状态和 DESIGN 5.18.2 截图主体“提交者”，不增加 Rev、不重跑矩阵、不改原型/生产代码。Impeccable detector 降级事实保持透明，浏览器/人工证据为最终裁决。
- CURRENT 更新至 v4-723：FIFO266=`closed`、UI-SYSTEM-08 Rev1=`done`；同步把 FIFO267/BACK 表格与队列校准为真实 `active/in_progress`。FRONT/TEST 继续 blocked，等待后端独立交审。

## 2026-08-19｜FIFO267 BACK-SYSTEM-08A Rev1 领取并进入实现

- 原样回显 `handoffToken=FIFO267-BACK-SYSTEM-08A-R1-V4.717`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 基于最新 CURRENT v4-720 做最小差量写回至 v4-721：FIFO267=`active`、BACK-SYSTEM-08A Rev1=`in_progress`、Current actor=后端开发对话；FIFO266 UI review 事实保留。
- 本轮范围冻结为反馈契约/单一 PostgreSQL FeedbackReport+FeedbackEvent、显式截图授权完成链、逐请求权限、幂等未知恢复、管理员查询与脱敏；不接真实 COS/Sentry/网络/Secret/部署，不改 frontend/system-frontend/DESIGN/既有领域状态机。

## 2026-08-19｜FIFO266 UI-SYSTEM-08 Rev1 设计完成并交规划审核

- 规划微审确认主体设计及22/22证据通过；同 Rev1 只将验收页首状态由“设计执行中”改为“已交规划审核”，并将 DESIGN 5.18.2 截图选择主体由误写的“管理员”精确为“提交者”。未重跑矩阵、未改原型/业务方向；CURRENT 最小更新至 v4-722，并行 FIFO267/BACK 最新事实原样保留。
- 携同一 `handoffToken=FIFO266-UI-SYSTEM-08-R1-V4.717` 的八项差量包已仅发送至规划固定任务；`read_thread` 已确认规划出现新 turn、原样确认令牌并进入独立审核。CURRENT 随后最小更新至 v4-720，FIFO266=`delivered/active`；未通知 BACK/FRONT/TEST。
- 在既有员工 AppShell 与管理员 ControlShell 唯一视觉系统内完成低干扰“反馈问题”设计：员工顶栏/沉浸工具栏中性入口、六类中文问题、单描述、安全上下文、截图显式选择与二次风险确认；管理员 `/feedback` 使用服务端摘要、查询分页、紧凑宽表、详情 Drawer、截图安全摘要和只追加事件历史。`new→confirmed→fixing→retest→closed` 与 reopened、确定冲突、unknown 同身份查询、stale/再次失败/恢复、pending/焦点闭环和1440/1024均冻结。
- 同壳原型与脱敏证据位于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\ui-system-08-feedback-observability`。系统 Chrome/Playwright 最终批检 `22/22`，员工1440侧栏204、管理员1440侧栏216、1024侧栏72→216覆盖且workspace保持 `x=72,width=952`，根无横溢，焦点/unknown/截图确认/重开成立；console error/warn=`0/0`、pageerror=0。
- `node --check app.js`、`node --check verify.mjs` 通过。Impeccable detector 仅在最终界面完成后运行一次，输出 `[]`；因缺少 HTML/CSS 解析模块降级为正则，已明确不以其替代人工截图和真实浏览器证据。生产 frontend/system-frontend/backend/contracts/migrations 修改0，未接真实 API/COS/Sentry/网络/Secret/付费/云资源，也未宣称并行 BACK API 完成。
- CURRENT 更新至 v4-719，UI-SYSTEM-08 Rev1=`review / Current actor=规划对话 / Reviewer=规划对话`，FIFO266=`notification_pending`；只交规划审核，不通知 FRONT/BACK/TEST，不自行 done。

## 2026-08-19｜FIFO266 UI-SYSTEM-08 Rev1 领取与低干扰反馈设计启动

- 原样回显 `handoffToken=FIFO266-UI-SYSTEM-08-R1-V4.717`；权限指纹为 `repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。CURRENT 已最小合并更新至 v4-718，FIFO266=`active`、UI-SYSTEM-08 Rev1=`in_progress`；并行 FIFO267/BACK 事实未改写。
- 本轮只修改 DESIGN、UI 验收、CURRENT/日志与仓库外同壳原型/脱敏证据，冻结员工 AppShell 与管理员 ControlShell 的低干扰“反馈问题”入口、显式截图二次确认、管理员 `/feedback` 只追加流转/重开、异步恢复、焦点及 1440/1024；生产 frontend/system-frontend/backend/contracts/migrations 修改0。

## 2026-08-19｜PLAN-SYSTEM-08 冻结测试反馈与错误观测合同并并行登记 UI/BACK

- 用户确认采用“自由探索 + 低干扰反馈 + 自动脱敏上下文 + 显式截图 + 管理员反馈中心 + 关闭后可重新打开 + 未来 Sentry”的测试期方案，并明确排除测试任务清单。规划新增 `docs/contracts/SYSTEM-test-feedback-observability.md`，同步职责矩阵“测试反馈与错误观测”、`INT-18` 与产品路线图。
- 唯一权威为 PostgreSQL `FeedbackReport/FeedbackEvent`，事件只追加；关闭不删除，重新打开追加事件。对象存储只保存用户二次确认的截图；日志/requestId/Sentry 只作诊断来源，不拥有反馈状态。自动上下文禁止 DOM/输入/字幕/视频/文件名/对象键/Secret/请求正文；session replay、自动截图与真实外部遥测均关闭。
- CURRENT 更新至 v4-717。并行登记 `FIFO266-UI-SYSTEM-08-R1-V4.717` 与 `FIFO267-BACK-SYSTEM-08A-R1-V4.717`；UI/BACK 分别经规划审核后才解锁 FRONT，正式 UI 终验通过后才解锁 TEST。真实 COS、Sentry、域名、部署、账号、网络和付费继续受用户授权门控制。

## 2026-08-19｜FIFO265 规划复核关闭 TEST-M3-08 / 统一任务中心

- 规划独立读取 `docs/testing/M3-unified-task-center-integration-report.md` 与仓库外脱敏 `qa-evidence-fifo265/summary.json`：handoffToken 一致，16 项检查全部 `ok=true`，六类任务/Dispatch 去重、权限/项目隔离、真实 total/分页/深链、读取零写、员工站隔离、1440/1024 覆盖布局、Drawer 焦点、空闲零轮询与 console 0/0 成立。
- 唯一完整 `pnpm check` 退出码0，`41 files/389 tests` 全绿，四工作区构建通过；本轮不重复运行关闭门。规划补核 `git diff --check` 无输出，`pnpm db:status` 确认 PostgreSQL 18.4 / `qimao_terms_cloud` / 55432 正常。
- 隔离库、32665/32666、Chrome/Playwright/harness 已由测试精确清理；生产代码修改0，无真实厂商/网络/Secret/付费/云资源。CURRENT 更新至 v4-716，FIFO265=`closed`、TEST-M3-08 Rev1=`done`，M3-08 正式关闭，P0/P1/P2/P3=`0/0/0/0`。

## 2026-08-19｜FIFO265 TEST-M3-08 Rev1 INT-09 全链验收完成并交规划复核

- 携带 `handoffToken=FIFO265-TEST-M3-08-R1-V4.714` 完成正式 Fastify + 员工 frontend production build + 从零全部迁移隔离 PostgreSQL + 系统 Chrome/Playwright 纵向 harness `16/16`。六类任务/Dispatch 去重、权限与项目 A/B 隔离、服务端摘要/筛选/分页/深链、读取零写、响应脱敏、旧入口扫描、1440/1024 根/表/216覆盖、Drawer/Escape、空闲不轮询、console 0/0 全部成立；产品 `P0/P1/P2/P3=0/0/0/0`。
- 新鲜 backend/frontend tasks 专项 `2 files / 16 tests` 全通过；contracts/backend typecheck/build、员工 frontend typecheck 与 Vite `192 modules` production build通过。随后唯一完整 `pnpm check` 退出码0，41 files / 389 tests全通过；四工作区构建通过（system-frontend 42 modules）。不重试、不跳过、不改生产代码。
- 精确清理：隔离库 `qimao_fifo265_11908_ac30bd91`、32665/32666、Chrome、Playwright 与临时 harness已清理；`qimao_fifo265_*`/`qimao_tasks_*`残留0，无本轮 pnpm/vitest 孤儿进程，共享PostgreSQL 55432保持原运行态。报告写入 `docs/testing/M3-unified-task-center-integration-report.md`，CURRENT更新至v4-715，FIFO265/TEST-M3-08转 review，仅唤醒规划。

## 2026-08-19｜FIFO265 TEST-M3-08 Rev1 领取与 INT-09 纵向验收启动

- 原样回显 `handoffToken=FIFO265-TEST-M3-08-R1-V4.714`；权限指纹：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。CURRENT/本日志已差量写回 FIFO265=`active`、TEST-M3-08 Rev1=`in_progress`、Current actor=全链测试与质量验收对话。
- 本轮冻结为正式 Fastify + 员工 frontend production build + 从零隔离 PostgreSQL + 系统 Chrome/Playwright 的 INT-09 纵向矩阵；不改生产 frontend/backend/contracts/migrations/DESIGN，不接真实厂商/网络/Secret/付费/云资源，不通知 FRONT/BACK/UI。矩阵完成后只运行一次完整 `pnpm check`。

## 2026-08-19｜FIFO264 规划关闭 FRONT/UI并登记 TEST-M3-08

- 规划核对 UI §13、9/9原始结果、activeElement、1024几何、503序列与cleanup：Drawer遮罩回焦、216覆盖不挤正文、列表错误恢复成功H1与普通刷新不抢焦均成立；P0–P3=0。FIFO264与FRONT-M3-08B Rev4关闭。
- 登记 `handoffToken=FIFO265-TEST-M3-08-R1-V4.714`。测试固定对话独立覆盖六类任务、Dispatch去重/子结果、服务端摘要/筛选/排序/分页、跨项目隔离、领域命令unknown/409、深链/焦点/1024、旧入口静态和HTTP边界；使用正式Fastify/production frontend/从零隔离PostgreSQL/系统Chrome。
- TEST在纵向矩阵后只运行一次新鲜完整`pnpm check`，不得重试/跳过；产品失败稳定编号，环境或测试夹具差量独立归类。精确清理隔离库、服务、Chrome与临时harness，共享PG55432保持原运行态。

## 2026-08-19｜FIFO264 FRONT-M3-08B Rev4 UI三场景微复验通过

- 原样携带 `handoffToken=FIFO264-FRONT-M3-08B-R4-V4.711`。本轮新鲜 production React（Vite 192 modules）+ 正式 Fastify + 从零隔离 PostgreSQL + Playwright 1.62.1/系统 Chrome 仅复验三项变化，正式结果9/9，P0/P1/P2/P3=`0/0/0/0`。
- Drawer真实遮罩点击关闭并回原查看详情，标题焦点圈/Escape抽查无回归；1024收起/展开workspace均为 `x=72,width=952`，展开216 fixed覆盖、遮罩、正文可见、根无横溢和回展开触发点成立；同查询主GET `503→503→200`、两次requestId、stale20行、再次失败ErrorBlock持焦、成功H1焦点及普通顶栏重读不抢焦成立。
- application console error/warn=`0/0`、pageerror=`0`；两条网络诊断仅对应受控503。隔离库已DROP，31664/32664无监听，Chrome/harness已清理，共享 PostgreSQL 55432保持 running。CURRENT更新至 `v4-713`，FIFO264=`notification_pending`，FRONT-M3-08B Rev4保持review交规划；生产代码修改0，未运行完整 `pnpm check`、未重复Impeccable，未通知FRONT/BACK/TEST。

## 2026-08-19｜FIFO264 FRONT-M3-08B Rev4 UI三场景微复验领取

- 原样回显 `handoffToken=FIFO264-FRONT-M3-08B-R4-V4.711`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- CURRENT 更新至 `v4-712`，FIFO264=`active`，`FRONT-M3-08B Rev4=review / Current actor=UI设计对话 / Reviewer=UI设计对话`。本轮仅运行三项变化场景，不重复其他矩阵/Impeccable，不改生产代码，不运行完整 `pnpm check`。

## 2026-08-19｜FIFO263 规划复验通过并登记 UI 三场景微复验

- 规划核对遮罩 `mousedown preventDefault` 后回原触发点、tasks workspace `grid-column:2`、绑定 `listQueryKey` 的一次性 `listFocusRecovery`；查询变化清意图、再次失败聚焦错误、成功聚焦H1、普通加载/刷新不抢焦成立，无延迟/fallback/第二状态源。
- 前端交接把构建误写为 system-frontend 42 modules；规划补跑正确 `pnpm --filter @qimao-terms-cloud/frontend run build`，员工frontend 192 modules production build退出0。该验证路径差量已明确，不用错误构建证据关闭任务。
- 登记 `handoffToken=FIFO264-FRONT-M3-08B-R4-V4.711`。UI仅用正式运行复验三项原失败；其余FIFO262 14项和FIFO260 30项冻结。通过后才解锁TEST最终纵向验收与唯一完整pnpm check。

## 2026-08-19｜FIFO263 FRONT-M3-08B Rev4 完成并转 review

- 三项同源所有权根因已收口：任务详情遮罩 mousedown 先阻止浏览器默认焦点，再关闭并回原查看详情触发点；`/tasks` 窄屏 fixed 侧栏保持72px主轨，workspace 显式位于第二列，展开216px仅覆盖并带遮罩；列表错误块的唯一“重新读取任务中心”建立当前查询身份绑定的一次性恢复焦点意图，失败继续聚焦唯一重读，成功聚焦稳定页面标题，普通加载/筛选/顶栏重读不抢焦。
- 仅修改 `frontend/src/features/tasks/TasksPage.tsx`、`frontend/src/components/AppShell.module.css`、`tests/frontend/tasks.test.tsx`。不改后端、契约、领域状态、其他路由或视觉方向。
- 新鲜验证：tasks 专项 `9/9`；全部前端 `17 files / 194 tests`；frontend typecheck；system-frontend Vite production `42 modules`；`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 `pnpm check`、未提交/推送/部署；八项差量包仅交规划。

## 2026-08-19｜FIFO263 FRONT-M3-08B Rev4 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO263-FRONT-M3-08B-R4-V4.708`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。
- 状态已写回 CURRENT `v4-709`：FIFO263=`active`，`FRONT-M3-08B Rev4=in_progress`，Current actor=前端开发对话，Reviewer=规划对话。只收口遮罩 mousedown 回焦、tasks 窄屏 workspace 第二列、列表错误恢复一次性焦点意图；不改业务状态、契约或冻结证据。

## 2026-08-19｜FIFO262 归因完成并登记 FRONT Rev4

- UI变化矩阵已把FIFO260五项未裁决全部落成真实断言并通过：项目/排序/分页、初始error/stale恢复、cancel受控503 unknown、Delivery同ID recover和Drawer遮罩均有requestFacts/DOM证据。无需改后端、契约或领域命令。
- 三项剩余P1属于同一交互所有权层：遮罩 `mousedown` 默认焦点在回焦后覆盖activeElement；sidebar改为fixed后脱离grid，未明确指定workspace第二列；列表错误恢复后错误块/按钮卸载，缺少一次性成功焦点目标。
- 登记 `handoffToken=FIFO263-FRONT-M3-08B-R4-V4.708`。只允许以 `preventDefault+原触发点`、显式grid placement、单一focus recovery intent修复，不增加setTimeout/sleep、第二布局路径、fallback或业务状态。其余FIFO260/262通过证据冻结，TEST继续blocked。

## 2026-08-19｜FIFO262 FRONT-M3-08B Rev3 UI变化场景复验完成

- 原样携带 `handoffToken=FIFO262-FRONT-M3-08B-R3-V4.705`。本轮新鲜 production React（Vite 192 modules）+ 正式 Fastify + 从零隔离 PostgreSQL + Playwright 1.62.1/系统 Chrome 已完整运行 A–H；最终产品裁决通过14、失败3、未裁决0，P0/P1/P2/P3=`0/3/0/0`，FIFO260其余30项未重跑。
- 三项P1：Drawer遮罩关闭后焦点落 BODY；1024覆盖展开时 workspace 从 `x=72,width=952` 变为 `x=0,width=72`、正文消失；列表初始503→503→200恢复成功后焦点落 BODY。Drawer标题双向圈/ Escape、确定409焦点/新key、详情重读、侧栏焦点圈、1440、服务端项目排序分页、stale、cancel unknown、Delivery recover与控制台均通过。
- 原始 F 的最后两次GET断言遗漏成功后的权威刷新而误报，requestFacts 证明 POST=1、人工GET=503→200后仅刷新200，人工裁决通过；原始 E 把 BODY 文本误作安全焦点，按 activeElement 改判失败。原始结果未改写，对账写入 `fifo262-adjudication.json`。
- 隔离库已DROP，31662/32662无监听，测试Chrome已关闭，共享 PostgreSQL 55432保持 running。状态更新至 CURRENT `v4-707`，FIFO262=`notification_pending`，`FRONT-M3-08B Rev3=review / Current actor=规划对话 / Reviewer=规划对话`；生产代码/契约/迁移/DESIGN修改0，TEST继续blocked，仅交规划。

## 2026-08-19｜FIFO262 FRONT-M3-08B Rev3 UI变化场景复验领取

- 原样回显 `handoffToken=FIFO262-FRONT-M3-08B-R3-V4.705`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- CURRENT 更新至 `v4-706`，FIFO262=`active`，`FRONT-M3-08B Rev3=review / Current actor=UI设计对话 / Reviewer=UI设计对话`。本轮只运行 A–H 变化场景，FIFO260 其余30项冻结；不重复 Impeccable，不改生产代码/契约/迁移/DESIGN，不运行完整 `pnpm check`。

## 2026-08-19｜FIFO261 规划复验通过并登记 UI 变化复验

- 规划核对三项实现：`trapDrawer` 显式接管程序化标题初焦；标题聚焦 effect 在 `actionError` 时让位；`/tasks` 在<=1100px固定72px正文轨道、216px fixed侧栏与独立遮罩，其他路由和1440语义不变。没有 sleep、fallback、第二状态源或业务状态改动。
- 规划新鲜运行 tasks 专项，1 file / 9 tests，退出码0。FIFO261关闭。
- 登记 `handoffToken=FIFO262-FRONT-M3-08B-R3-V4.705`。UI只运行变化场景：复验三项原P1，并以精确定位器/可控HTTP响应补裁决FIFO260五项未进入断言的场景；FIFO260其余30项、完整视觉和数据矩阵冻结。完整pnpm check仍留TEST最终关闭门。

## 2026-08-19｜FIFO261 FRONT-M3-08B Rev3 完成并转 review

- 仅修改 `frontend/src/features/tasks/TasksPage.tsx`、`frontend/src/components/AppShell.tsx`、`frontend/src/components/AppShell.module.css`、`tests/frontend/tasks.test.tsx`。任务 Drawer 新增清晰的标题焦点边界：标题 Tab/Shift+Tab 均进入 Drawer 内首/末可操作项，Escape/遮罩关闭仍回原触发点；确定409后的标题聚焦 effect 避让 actionError，刷新后的唯一 ErrorBlock 保持焦点，下一次动作继续生成新幂等键。
- `/tasks` 窄屏只使用72px主轨，展开侧栏为216px fixed 覆盖层+遮罩，遮罩/ Escape / Tab/Shift+Tab闭环并回“展开侧栏”触发点；1440及其他路由维持204px AppShell网格语义。
- 新鲜验证：tasks 专项9/9；全部前端17文件194/194；frontend typecheck；Vite production 192 modules；`git diff --check`通过（仅既有 LOCAL_APP_PARITY CRLF提示）。未跑完整 `pnpm check`、未改 backend/contracts/migrations、未改六类任务状态/摘要/领域命令、未提交/推送/部署。
- FIFO260 的5项 harness 未裁决场景保持原状态，未在本轮伪造产品结论；状态已写回 CURRENT `v4-704`，FIFO261/FRONT-M3-08B Rev3 转 review。

## 2026-08-19｜FIFO260 正式 UI 终验归因并登记 FRONT Rev3

- 规划接收并核对 `docs/ui/M3-unified-task-center-acceptance.md §11`、原始 `27/38` 结果、人工对账 JSON 与截图。最终产品裁决为通过30、失败3、未裁决5，P0/P1/P2/P3=`0/3/0/0`；原始失败未改写，定位器/故障注入未进入产品断言的5项不冒充通过或产品失败。
- 三项真实 P1 同属前端交互所有权：Drawer 标题为程序化初焦但不在 focusable 集合，Shift+Tab 泄漏到底层；确定409刷新 detail 后标题 focus effect 覆盖 ErrorBlock；tasks 在1024虽默认收起，但手动展开仍改变 AppShell grid 为204px，未形成216px覆盖层/遮罩。
- 登记 `handoffToken=FIFO261-FRONT-M3-08B-R3-V4.703`。只允许修改 tasks 焦点逻辑、AppShell tasks路由窄屏覆盖结构/样式及对应回归；不得改变六类数据、领域命令、后端/契约、1440布局、其他路由侧栏语义或UI视觉方向。FIFO260其余通过项冻结；TEST继续 blocked。

## 2026-08-19｜FIFO260 固定任务交接确认

- 携同一 `handoffToken=FIFO260-FRONT-M3-08B-R2-V4.699`，八项差量包已仅发送规划固定任务；发送接口成功，规划新 turn 已出现并明确确认三项真实产品缺口，正在集中归因且不会把 harness 误判路由给代码，送达/运行态确认成立。
- CURRENT 更新至 v4-702；FIFO260=`active`，`FRONT-M3-08B Rev2=review / Current actor=规划对话 / Reviewer=规划对话`。UI停止执行，未通知FRONT/BACK/TEST，TEST继续blocked。

## 2026-08-19｜FIFO260 FRONT-M3-08B Rev2 正式 UI 终验不通过

- 原样携带 `handoffToken=FIFO260-FRONT-M3-08B-R2-V4.699`。使用 production React（Vite 192 modules）+ 正式 Fastify + 从零全部迁移独立 PostgreSQL + Playwright 1.62.1/系统 Chrome 执行唯一正式矩阵；未接真实AI/网络/供应商/Secret/费用/云资源，未重复 Impeccable、未跑完整 `pnpm check`。
- 原始自动结果 `27/38` 保留不改写。固定详情记录时序和1024收起过渡采样经 requestFacts/截图/源码对账为通过；5项因 harness 标签、故障匹配或网络重置形态未进入产品断言，保持未裁决。产品裁决为通过30、失败3、未裁决5，P0/P1/P2/P3=`0/3/0/0`。
- P1集中为三项：Drawer 标题初焦时 Shift+Tab 泄漏到底层并使 Escape/触发点恢复链中断；确定409刷新后唯一 ErrorBlock 焦点被详情标题夺走；1024 展开侧栏实测204px网格、workspaceX=204，未实现冻结的216px覆盖且正文仍x=72。
- 六类真实任务/Dispatch去重和子结果、服务端摘要、项目隔离与权限、分页外固定详情GET、loading/empty、迟到响应丢弃/不轮询、Modal安全初焦/pending锁/下一动作新key、1440、旧入口静态0、console application error/warn=0/0、pageerror=0均有正式通过证据。完整A–H与未裁决项写入 `docs/ui/M3-unified-task-center-acceptance.md` §11。
- 证据根：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo260-m3-08b-ui-evidence`。隔离库已 DROP，31660/32660无监听，测试 Chrome与临时 harness已清理，共享 PostgreSQL 55432保持原运行态。生产代码/契约/迁移/DESIGN修改0；CURRENT更新至v4-701并交规划集中归因，TEST继续blocked。

## 2026-08-19｜FIFO260 FRONT-M3-08B Rev2 正式 UI 终验领取

- 原样回显 `handoffToken=FIFO260-FRONT-M3-08B-R2-V4.699`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- CURRENT 更新至 v4-700，FIFO260=`active`，`FRONT-M3-08B Rev2=review / Current actor=UI设计对话 / Reviewer=UI设计对话`。本轮仅运行唯一一次正式 production React + Fastify + 从零精确隔离 PostgreSQL UI 全矩阵；不重复 Impeccable，不改生产代码/契约/迁移/DESIGN，不运行完整 `pnpm check`，TEST 继续 blocked。

## 2026-08-19｜FIFO259 规划复验通过并登记 FIFO260 正式 UI 终验

- 规划核对 `TasksPage`/tasks API/7项专项，确认列表显式 refresh identity 每次产生同查询新 GET；分页外深链直接使用固定 `taskType/resourceId` 详情 GET；transport rejection 保留冻结写意图并只人工读取同一任务；详情、恢复与迟到响应均使用完整 canonical identity。无轮询、重复 POST、第二数据源、分页扫描或兼容路径。
- 规划新鲜运行 `node node_modules/vitest/vitest.mjs run tests/frontend/tasks.test.tsx --no-file-parallelism`，结果 1 file / 7 tests，退出码0；frontend/tests 旧 `/asr-dispatches` 与 `AsrDispatches` 静态命中0。FIFO259 关闭。
- 登记 `handoffToken=FIFO260-FRONT-M3-08B-R2-V4.699`，交 UI 设计固定对话执行唯一一次 production React + 正式 Fastify + 从零隔离 PostgreSQL 全矩阵：同状态高保真、六类真实任务、服务端摘要/查询/分页、Dispatch子结果、领域命令、深链/unknown/冲突/焦点、1440/1024、两站/项目隔离、控制台与资源清理。TEST 继续 blocked；完整 `pnpm check` 留 UI 通过后的最终关闭门。

## 2026-08-19｜FIFO259 FRONT-M3-08B Rev2 完成并转 review

- 仅修改 `frontend/src/features/tasks/api.ts`、`frontend/src/features/tasks/TasksPage.tsx`、`tests/frontend/tasks.test.tsx`。顶栏与列表错误块通过单一有界 `refreshIdentity` 触发同一列表查询的新 GET；详情错误块使用同一身份的受控重读。
- `taskType/resourceId` 深链不再依赖当前分页，直接读取 `/api/tasks/:taskType/:resourceId`，支持分页外目标的 loading/error/requestId/再次失败/成功标题聚焦；身份变化清除旧详情、恢复和动作意图。
- 任务读取 transport rejection 统一投影为 `TaskApiError(retryable=true)`；领域 cancel/recover 的网络未知只保留原稳定任务身份人工 GET，不重发 POST。所有详情、恢复和迟到响应均比较 canonical `taskType:resourceId`。
- 新鲜验证：tasks 专项 7/7；入口关键组合（Tasks/PreReview/ScreenText/Deliveries）41/41；全部前端 17 文件 192/192；frontend typecheck；Vite production 192 modules；`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）；旧 `/asr-dispatches`/`AsrDispatches` 前端与测试静态命中0。未运行完整 `pnpm check`、未提交/推送/部署。
- 状态已写回 CURRENT `v4-698`，FIFO259/FRONT-M3-08B Rev2 转 review；八项差量包携同一 `handoffToken` 只交规划固定任务，等待独立复验。

## 2026-08-19｜FIFO259 FRONT-M3-08B Rev2 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO259-FRONT-M3-08B-R2-V4.696`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。
- 仅处理四项同根读取/身份缺口：显式有界刷新身份、`taskType/resourceId` 深链固定详情 GET、transport rejection 按 unknown/retryable 保留同身份恢复、完整 canonical 任务身份门；冻结视觉、AppShell/modules/App、backend/contracts/migrations、领域 API 与旧入口删除事实。
- 状态已写回 CURRENT `v4-697`，FIFO259=`active`、`FRONT-M3-08B Rev2=in_progress`；完成后按同一令牌交规划复核。

## 2026-08-19｜FIFO258 规划退审并登记 FRONT-M3-08B Rev2

- 规划逐行核对正式 `TasksPage`、tasks API、专项测试与现有领域 API，确认六类列表、真实摘要、旧入口删除和领域命令复用主体成立，但存在四项同根读取/身份 P1：顶栏与初始错误“重新读取”在 URL 未变化时不会触发 effect；`taskType/resourceId` 深链只搜索当前分页；原生 fetch transport rejection 被当作确定失败；恢复身份只比较 resourceId，未比较完整 `taskType+resourceId`。
- 登记 `handoffToken=FIFO259-FRONT-M3-08B-R2-V4.696`。只允许修改 `frontend/src/features/tasks/` 与 `tests/frontend/tasks.test.tsx`（状态/日志除外），建立显式有界 refresh identity、固定资源详情读取和完整任务身份门，并补真实 503/transport、分页外深链、重复重读与迟到响应回归；不得改 CSS 视觉主体、backend/contracts/AppShell/旧入口决定或领域命令。
- FIFO258 关闭为返工输入；`FRONT-M3-08B Rev2=ready / Current actor=前端开发对话 / Reviewer=规划对话`。UI/TEST 继续 blocked，避免把已知缺口交给浏览器终验重复发现。

## 2026-08-19｜FIFO258 FRONT-M3-08B Rev1 完成并转 review

- 交付唯一员工 `/tasks`：新增 `frontend/src/features/tasks/api.ts`、`model.ts`、`TasksPage.tsx`、`Tasks.module.css`；AppShell/`App.tsx`/`modules.ts` 接入任务中心，四项摘要由六组同范围 status-specific GET 的服务端 `total` 聚合，列表查询使用正式 search/type/status/project/sort/limit/offset，详情按稳定 `taskType/resourceId` 读取。
- 领域动作只按服务端 `availableActions` 呈现：ASR Dispatch/Batch、ScreenText cancel 与 Delivery 同 `deliveryId` recover 均调用既有 API，open_workspace 只导航正式 returnPath；未知/retryable 只保留同资源人工 GET，确定性冲突清理旧意图、刷新权威事实并把错误焦点留在唯一 ErrorBlock。详情 Drawer、确认 Modal、stale/empty/error/loading、焦点闭环、Dispatch 子结果和分页均在生产实现。
- 删除全局 `/asr-dispatches` 路由、导航、`AsrDispatches` 页面与旧测试；`AsrProjectDispatch` 链接改为 `/tasks?taskType=asr_dispatch&resourceId=...`，项目发起能力保留；`PreReviewWorkspace` 测试目的地同步改为任务中心。未改 backend、contracts、migrations、DESIGN、system-frontend。
- 新鲜验证：`tasks.test.tsx` 3/3；入口组合（PreReview/ScreenText/Deliveries/Tasks）4 文件 37/37；全部前端 17 文件 188/188；frontend typecheck；Vite production build 192 modules；Impeccable detector `[]`；`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）；frontend/tests 旧 `/asr-dispatches` 静态命中0。正式浏览器连接因 Browser RPC trusted-path 错误未建立，Fastify 本地烟测因 `uv_os_get_passwd ENOMEM` 未启动，进程均已安全停止；正式 UI 终验由规划安排。
- 八项差量包：状态/日志已写回 `v4-695`；实现/验证、状态与数据所有权、异步恢复与焦点、旧入口清理、响应式表内滚动、测试/构建证据、已知浏览器环境限制、后续规划终验均已交规划固定任务，未通知 UI/TEST/BACK，未提交/推送/部署。

## 2026-08-19｜FIFO258 FRONT-M3-08B Rev1 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO258-FRONT-M3-08B-R1-V4.693`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。
- 已按统一任务中心契约冻结范围：新增员工 `/tasks` 唯一入口，六类服务端任务只读投影与既有领域命令复用；删除全局 `/asr-dispatches` 路由、导航、页面、旧测试和链接，保留项目 ASR 发起/工作台。未改 backend、contracts、migrations、DESIGN、system-frontend。

## 2026-08-19｜FIFO257 规划关闭并解锁 FRONT-M3-08B

- 规划独立核对 Rev3 SQL 与专项，确认 Dispatch 原执行状态、取消中动作、PreReview 返回工作台以及 Dispatch/ASR/ScreenText/Terms/PreReview/Delivery 六类 returnPath 全部对齐正式 React 唯一路由；tasks 后端旧 `/asr-dispatches` 静态命中0。
- 规划新鲜运行 `node node_modules/vitest/vitest.mjs run tests/backend/tasks.test.ts --no-file-parallelism`，结果 1 file / 7 tests，退出码0。FIFO257/BACK-M3-08A Rev3 转 done/closed；UI/BACK 双依赖关闭。
- 登记 `handoffToken=FIFO258-FRONT-M3-08B-R1-V4.693`。前端正式实现 `/tasks`，同一变更删除旧全局中文识别任务页面/导航/路由/测试/链接，不保留 redirect/compat；复杂领域写动作只复用既有 API，TEST 继续 blocked。

## 2026-08-19｜FIFO257 BACK-M3-08A Rev3 完成并转 review

- Dispatch nativeStatus 现按 accepted batch 执行事实返回原状态；无 accepted batch 时才保留受理状态。ASR/ScreenText `cancel_requested` 动作集合为空，PreReview failed 改为 `open_workspace`。
- 六类 returnPath 对齐冻结正式入口：`/tasks?taskType=asr_dispatch&resourceId=...`、项目 ASR/ScreenText/PreReview query 路径、`/deliveries/:deliveryId`；未新增 redirect、旧路径或第二页面。
- 专项新增并通过 nativeStatus、cancel_requested 空动作、PreReview 工作台动作和六类路径回归；tasks `7/7`，backend build、`check:repo`、`git diff --check` 通过；tasks 后端 `/asr-dispatches` 静态扫描为0。中途 PostgreSQL `42803` 分组错误已按真实输出修复并移除诊断代码。

## 2026-08-19｜FIFO257 BACK-M3-08A Rev3 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO257-BACK-M3-08A-R3-V4.690`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 已重读 CURRENT v4-690 与 FIFO256 Rev2 交付事实。本轮只修改 `backend/src/modules/tasks/tasks.repository.ts`、`tests/backend/tasks.test.ts`（必要时 contracts）及 CURRENT/日志：修正 Dispatch 执行 nativeStatus、cancel_requested 动作、PreReview 失败动作和正式 returnPath，不新增页面/迁移/fallback/领域写路径。

## 2026-08-19｜FIFO256 主体通过、交叉路由审查登记 BACK Rev3 微返工

- 规划核对 Rev2 契约/SQL/7项回归，确认 Dispatch 执行状态、20项目可见子结果、独立 ASR 状态、默认注意优先、项目隔离和复杂动作返回工作台的主体修正成立。
- 进一步与正式 `frontend/src/App.tsx` / `modules.ts` 交叉比对，发现投影仍返回不存在的 ASR Batch、ScreenText、PreReview、Delivery 详情路径，Dispatch 也形成契约未冻结的第二详情 path；同时 cancel_requested 重复暴露 cancel、PreReview 失败仍称直接 retry，Dispatch nativeStatus 仍是创建受理状态。这些会让正式前端产生 404 或错误动作，不能下放前端猜测。
- 登记 `handoffToken=FIFO257-BACK-M3-08A-R3-V4.690` 微返工，只允许修改 tasks 投影与专项测试；其余 Rev2 证据冻结，无迁移、无新路由、无第二状态源，FRONT/TEST 继续 blocked。

## 2026-08-19｜FIFO256 BACK-M3-08A Rev2 完成并转 review

- 统一任务中心只读投影已集中收口：Dispatch 不再使用 `asr_dispatch_groups.status` 冒充执行状态，PostgreSQL 直接按调用者可见 accepted 项目的真实 `asr_batches` 派生状态；无 accepted batch 保持 `unknown`，并覆盖取消中、需对账、部分完成等边界。
- ASR 独立 Batch/ScreenText Batch 映射补齐 `cancel_requested`、`reconciliation_required`；失败/需对账不再暴露直接 `retry`，仅返回领域允许的取消或工作台入口。默认列表排序固定为需处理优先、`updatedAt DESC`、`taskType/resourceId` 稳定 tie-break；Dispatch 返回路径统一为 `/tasks/asr_dispatch/:resourceId`。
- 详情契约新增严格 `dispatchResults` 子结果集合（最多20条），服务端返回全部可见 pending/ready/accepted/blocked 项目、项目身份、nullable batchId、真实安全执行状态/时间/错误摘要；泛化 history 仍最多5条，项目隔离与读取零写副作用均保留。
- 专项回归新增运行中/需对账/无 accepted batch、独立 Batch 状态与动作、默认排序分页、20 项子结果及项目隔离。新鲜验证：tasks `7/7` 连续两次；tasks+ASR `2 files / 20 tests`；contracts/backend build、`check:repo`、`git diff --check` 全通过。使用独立 `qimao_tasks_*` 临时库并清理，未运行完整 `pnpm check`、未改迁移/领域写状态/frontend/DESIGN。

## 2026-08-19｜FIFO254 规划关闭、FIFO255 退审并登记 BACK Rev2

- 规划独立核对 UI-M3-08 Rev1 的 DESIGN 5.6、UI 验收、6 张关键截图与 38/38 原始矩阵：唯一 `/tasks`、六类领域任务、紧凑表/详情抽屉、领域动作边界、1440/1024、焦点、unknown/冲突和独立 Impeccable SHIP 均与规划契约一致；FIFO254 关闭，UI 任务转 done。
- 对 BACK-M3-08A Rev1 做共享契约、路由、SQL 投影与专项回归审查，确认五组同源 P1：Dispatch 创建受理状态误作执行状态；ASR Batch 遗漏取消中/需对账映射；默认排序未按需处理优先；Dispatch 可见项目子结果不完整；返回路径仍指向待删除旧页面且动作集合超出领域安全边界。
- 登记 `handoffToken=FIFO256-BACK-M3-08A-R2-V4.687`，只允许后端集中修正上述投影语义并补隔离回归；无迁移、无通用任务表/Worker、无第二状态源，FRONT/TEST 继续 blocked。

## 2026-08-19｜FIFO256 BACK-M3-08A Rev2 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO256-BACK-M3-08A-R2-V4.687`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。
- 已重读 AGENTS、WORKFLOW v4.9、CURRENT v4-687、统一任务中心契约/UI验收、tasks 契约/仓储/路由/专项；FIFO256 进入 `in_progress`。范围冻结为 tasks 共享契约、backend tasks、专项及状态/日志，不新增迁移/通用任务表/Worker，不改领域写状态机、frontend、DESIGN。

## 2026-08-19｜FIFO254 固定任务交接确认

- 携同一 `handoffToken=FIFO254-UI-M3-08-R1-V4.681`，已仅向规划固定任务发送八项差量包；发送接口成功，规划新 turn 已出现并明确正在交叉核对 UI 与后端字段，送达/运行态确认成立。
- CURRENT 更新至 v4-686；FIFO254=`active`，`UI-M3-08 Rev1=review / Current actor=规划对话 / Reviewer=规划对话`。UI 停止执行，未通知 BACK/FRONT/TEST，FRONT/TEST 继续 blocked。

## 2026-08-19｜FIFO254 UI-M3-08 Rev1 完成并转 review

- 原样携带 `handoffToken=FIFO254-UI-M3-08-R1-V4.681`。沿既有员工 AppShell 唯一方向完成 `/tasks` 统一任务中心：四项服务端摘要、搜索/类型/状态/项目/排序/分页、六类领域任务紧凑表、650px 详情抽屉、最多5条历史、真实或 unknown 进度、Dispatch 子结果不重复、领域取消/恢复与复杂重试回工作台均已冻结；正式接入删除独立“中文识别任务”全局入口与 `/asr-dispatches`。
- 完整交互覆盖 loading/empty/初始 error/stale/再次失败/成功、详情同身份恢复、写 pending、取消 unknown `POST=1` 且同命令人工 GET、确定冲突清旧意图/刷新权威事实/下一动作新身份、Drawer/Modal/1024覆盖侧栏 Tab/Shift+Tab/Escape/遮罩/触发点恢复，以及 toast 不抢焦点。
- 仓库外原型与证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\ui-m3-08-unified-task-center`。真实系统 Chrome `38/38`，1440 根/侧栏/表格=`1440/1440、204、1170/1170`；1024 收起=`1024/1024、72、902/1050`，覆盖展开=`216px` 且正文起点仍 `72px`；application console error/warn=`0/0`、pageerror=`0`。
- Impeccable detector 只运行一次并返回 `[]`。独立 finish review 首轮 `FIX` 的摘要语义、覆盖侧栏焦点和 toast 焦点均一次性修正；Verdict Pass=`SHIP`，P0/P1/P2/P3=`0/0/0/0`。`node --check`、授权文档 `git diff --check` 通过。
- 本 UI 任务只修改 DESIGN 5.6、`docs/ui/M3-unified-task-center-acceptance.md`、CURRENT/日志和仓库外匿名原型/证据；生产 frontend/system-frontend/backend/contracts/migrations 修改0，未运行完整 `pnpm check`，未调用 Superpowers，未提交/推送/部署。CURRENT 更新至 v4-685，FIFO254=`notification_pending`，`UI-M3-08 Rev1=review / Current actor=规划对话 / Reviewer=规划对话`；FIFO255/BACK review 保留，FRONT/TEST 不解锁。

## 2026-08-19｜FIFO255 BACK-M3-08A Rev1 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO255-BACK-M3-08A-R1-V4.681`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。
- 已完整重读项目 `AGENTS.md`、`docs/WORKFLOW.md v4.9`、`CURRENT v4-682`、`docs/contracts/M3-unified-task-center.md`、职责矩阵统一任务中心行、`INT-09`、现有领域契约/路由与开发日志顶部。范围冻结为六类既有 PostgreSQL 事实的只读投影；不新增迁移、通用 tasks/task_attempts/Worker/租约/命令状态，不改领域写状态机、生产前端或 DESIGN。
- 实施边界：`packages/contracts/src/tasks.ts` 与导出、`backend/src/modules/tasks/`、必要 app 接线、`tests/backend/tasks.test.ts`、CURRENT/日志；列表/详情均服务端有界查询、员工权限与项目隔离，读取零写副作用。

## 2026-08-19｜FIFO255 BACK-M3-08A Rev1 完成并转 review

- 实现共享任务中心契约与 Fastify 只读入口：`GET /api/tasks`、`GET /api/tasks/:taskType/:resourceId`；首版无迁移、通用任务表、Worker、租约或新命令状态。
- PostgreSQL `UNION ALL/CTE` 直接投影六类既有领域事实，服务端完成搜索、类型/状态/项目筛选、稳定排序、分页与独立真实 total；Dispatch 已引用 Batch 不重复列项，详情子结果按可见项目去重；详情历史按领域身份有界最多5条。
- 员工 audience + `tasks:read` 逐请求校验，支持注入项目可见范围；跨项目/未知资源安全隔离；响应不暴露 provider/model/Secret/objectKey/内部载荷，ASR/ScreenText provider request id 不进入员工历史。
- 新鲜验证：`tests/backend/tasks.test.ts` 两次连续 `3/3`；contracts typecheck、backend build、`check:repo`、`git diff --check` 全通过。首轮详情 SQL 的真实 `Invalid time value` 已由统一历史列别名修复并移除临时诊断；测试每次创建并 DROP 独立 `qimao_tasks_*` 数据库，未改共享 PostgreSQL 业务数据、未运行完整 `pnpm check`。
- 状态转 `review / Current actor=规划对话 / Reviewer=规划对话`，仅交规划复核；FIFO254/UI 并行事实保留，FRONT/TEST 不解锁。

## 2026-08-19｜FIFO254 UI-M3-08 Rev1 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO254-UI-M3-08-R1-V4.681`；权限指纹：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 已重读 AGENTS、WORKFLOW v4.9、CURRENT v4-681、统一任务中心合同、DESIGN 5.6、职责矩阵统一任务中心行、INT-09 与日志顶部，并按 Impeccable Operate 模式进入有界设计执行。CURRENT 更新至 v4-682，FIFO254=`active`，`UI-M3-08 Rev1=in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`。
- 本轮只修改 DESIGN 5.6、`docs/ui/M3-unified-task-center-acceptance.md`、CURRENT/日志和仓库外匿名原型/证据；生产 frontend/system-frontend/backend/contracts/migrations 修改0，不调用 Superpowers，不通知 FRONT/BACK/TEST。

## 2026-08-19｜PLAN-M3-08 统一任务中心合同冻结并并行路由 UI/BACK

- 规划只读核对现有 ASR Dispatch/Batch、ScreenText Batch/Job/Attempt、TermExtractionRun、PreReview PrepareJob、Delivery Job/Attempt 与现有取消/重试/恢复 API，确认统一中心应做 PostgreSQL 有界只读投影，不能再建一套通用任务表、Worker、租约或命令状态。
- 新增 `docs/contracts/M3-unified-task-center.md`，同步 DESIGN 5.6、MODULE_RESPONSIBILITY_MATRIX、INT-09 与里程碑。正式入口固定 `/tasks`；Dispatch 已包含的 ASR Batch 不重复列项；上传和管理员任务隔离；正式前端接入时删除独立“中文识别任务”全局导航与 `/asr-dispatches` 页面路径。
- `PLAN-M3-08` 转 done；登记 FIFO254 `UI-M3-08 Rev1` 与 FIFO255 `BACK-M3-08A Rev1` 并行，FRONT-M3-08B/TEST-M3-08 blocked。UI 只做同壳原型/证据，BACK 只做只读契约/聚合且首版无迁移；两者分别通过规划审核后才解锁正式前端。CURRENT 更新至 v4-681。

## 2026-08-19｜SYSTEM-07C 正式关闭并转统一任务中心规划预检

- 规划独立核对 FIFO253 报告与 CURRENT：唯一新鲜完整 `pnpm check` 退出码 `0`，40 files / 377 tests 全绿；check:repo、四工作区 lint/typecheck/build、frontend 189 modules、system-frontend 42 modules 均通过。QA-SYSTEM-07C-CHECK-001/002 不再出现，`qimao_prereview_*` / `qimao_fifo253_*` 残留为0，无本轮 pnpm/vitest/node 孤儿进程，共享 PostgreSQL 55432 未停止或重启。
- `TEST-SYSTEM-07C Rev2` 与 FIFO253 转 done/closed，SYSTEM-07C 正式关闭。下一阶段按用户持续授权进入员工站统一任务中心：先核对 ASR/OCR/交付等现有领域 Job/Attempt 与取消/恢复命令，冻结 INT-09 和唯一聚合模型；不创建第二套任务真相、不混入上传队列或管理员策略任务。CURRENT 更新至 v4-680。

## 2026-08-19｜FIFO253 TEST-SYSTEM-07C Rev2 完整关闭门通过并交规划关闭

- 原样携带 `handoffToken=FIFO253-TEST-SYSTEM-07C-R2-V4.677`。唯一新鲜完整 `pnpm check` 退出码 `0`：40 files / 377 tests 全部通过；check:repo、四工作区 lint/typecheck 与构建全部通过（contracts/backend、frontend Vite 189 modules、system-frontend Vite 42 modules）。未重试、未跳过、未并行其他任务。
- `QA-SYSTEM-07C-CHECK-001/002` 均未再出现；`qimao_prereview_*` 与 `qimao_fifo253_*` 数据库残留为0，未发现本轮 pnpm/vitest/node 孤儿进程，共享 PostgreSQL 55432 保持原运行态。原报告已追加 Rev2 结果，生产 frontend/system-frontend/backend/contracts/migrations/DESIGN 修改0。
- CURRENT 更新至 v4-679，FIFO253/TEST-SYSTEM-07C 转 `review / Current actor=规划对话`，仅向规划固定任务交接，不通知 FRONT/BACK/UI。

## 2026-08-19｜FIFO253 TEST-SYSTEM-07C Rev2 唤醒与运行态确认

- 规划已向 TEST 固定对话发送 `handoffToken=FIFO253-TEST-SYSTEM-07C-R2-V4.677`；目标新 turn 原样回显同令牌，并回执正确 repo_root、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- `wait_threads` 确认目标 `active/inProgress`。本轮只运行一次新鲜完整 `pnpm check`，不预跑专项、不重复正式 UI 矩阵、不并行其他数据库/浏览器任务；退出码 0 后核对两项 QA 编号与清理，非0则原样交回新根因且不重试。CURRENT 更新至 v4-678，FIFO253=`active`。

## 2026-08-19｜FIFO251/252 规划复验通过并路由 FIFO253 最终完整门

- 规划独立核对两份测试差异。FIFO251 仅删除 `pre-review.test.ts` 独立临时库 afterAll 的冗余 TRUNCATE，并在既有 `app.close → terminate → DROP` 后新增数据库不存在断言与 `admin.end`；未增加 timeout、sleep、retry、fallback 或生产清理路径。FIFO252 仅将 ScreenText 两个已复现竞态的同步 `getBy*` 改为对应 `findBy*`，仍断言真实文案、真实 checkbox 与 disabled 状态，不修改生产 React/API/CSS。
- 角色证据经规划范围复核成立：pre-review 7/7、与 runtime 组合 16/16、零 `qimao_prereview_*` 残留与 backend build；ScreenText 连续两次 14/14、管理员关键组合 7 files/89 tests、frontend typecheck 与 Vite 189 modules build；`git diff --check` 通过。
- FIFO251/252 closed；登记 FIFO253 `FIFO253-TEST-SYSTEM-07C-R2-V4.677`。TEST 仅执行一次新鲜完整 `pnpm check`，核对两项稳定编号不再出现、临时数据库/进程无残留并写回原报告追加结论；不重复产品完整 UI 矩阵，不改生产实现。退出码 0 才关闭 SYSTEM-07C。CURRENT 更新至 v4-677。

## 2026-08-19｜FIFO251 BACK-TEST-HEALTH-01 Rev1 完成并交规划复核

- `handoffToken=FIFO251-BACK-TEST-HEALTH-01-R1-V4.672`；状态已写回 CURRENT v4-676，`BACK-TEST-HEALTH-01=review / Current actor=规划对话`，FIFO252 `FRONT-TEST-HEALTH-01` 的 review 事实保留。
- 真实根因与范围一致：独立临时库在 `afterAll` 中由管理员连接负责终止残留连接并 DROP；此前先对业务表 `TRUNCATE` 是重复清理所有者，可能在全套顺序运行中等待锁并放大 hook 时长。`tests/backend/pre-review.test.ts` 现只保留 `app.close() → admin terminate → DROP → 查询确认数据库不存在 → admin.end()`，`beforeEach` 的每例事实清理不变；未改生产代码、迁移、契约或其他任务文件。
- 新鲜验证：`node node_modules/vitest/vitest.mjs run tests/backend/pre-review.test.ts --no-file-parallelism`=`7/7`；同命令组合 `tests/backend/pre-review.test.ts tests/backend/system-control-strategy-runtime.test.ts --no-file-parallelism`=`2 files / 16 tests`；`node node_modules/typescript/bin/tsc -p backend/tsconfig.build.json` 退出0；`git diff --check` 退出0（仅报告既有 `LOCAL_APP_PARITY.md` CRLF 提示）。查询默认 PostgreSQL 后，`qimao_prereview_*` 临时数据库为 `[]`；未运行完整 `pnpm check`，未触碰共享业务数据、未接外部服务。
- 组合查询还看到若干历史 `qimao_terms_cloud_waveb*`/`qimao_fifo188_a` 数据库，均非本任务创建、未作清理；本任务临时库已精确删除。等待规划唤醒确认，TEST/FRONT/UI 不直接通知。

## 2026-08-19｜FIFO252 FRONT-TEST-HEALTH-01 完成并交规划复验

- 原样沿用 `handoffToken=FIFO252-FRONT-TEST-HEALTH-01-R1-V4.672`。实际改动仅 `tests/frontend/ScreenTextWorkspace.test.tsx`：stale 用例等待候选 checkbox 可达后再断言只读 disabled；规划确认普通选择流程的同步“成员来自当前服务端筛选范围”断言也是同一异步 React 状态竞态，获准在同文件改为 `findByText`，不增加 sleep/retry/fallback、不放宽业务断言、不改生产代码。
- 新鲜验证：ScreenText 单文件连续两次 `14/14`；ScreenText + SYSTEM-07C 管理关键组合 `7 files / 89 tests`；frontend TypeScript 通过；Vite `189 modules` production build 通过；`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 `pnpm check`，未改 backend/contracts/migrations/DESIGN/CSS视觉或生产 frontend/system-frontend，未提交/推送/部署。CURRENT 已差量写回 v4-675，FIFO252/FRONT-TEST-HEALTH-01 转 review，唤醒待发送规划固定任务。

## 2026-08-19｜FIFO251 BACK-TEST-HEALTH-01 Rev1 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO251-BACK-TEST-HEALTH-01-R1-V4.672`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。
- 已重读项目 `AGENTS.md`、`docs/WORKFLOW.md v4.9`、`CURRENT v4-673`、开发日志顶部及 `tests/backend/pre-review.test.ts` 清理实现。本轮只修改该测试文件与状态/日志，FIFO252、生产 backend/contracts/migrations/frontend/DESIGN 冻结。
- 根因待按真实运行日志确认：当前 afterAll 在独立库 DROP 前冗余执行 `TRUNCATE project_commands, projects CASCADE`；目标是验证单一 `app/pool close → admin terminate → DROP → existence check → admin.end` 清理链，不增加 hookTimeout、sleep、retry、fallback 或第二清理路径。

## 2026-08-19｜FIFO252 FRONT-TEST-HEALTH-01 领取

- 原样回显 `handoffToken=FIFO252-FRONT-TEST-HEALTH-01-R1-V4.672`；权限指纹：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。已写回 CURRENT v4-673，FIFO252 active、`FRONT-TEST-HEALTH-01` in_progress。
- 范围严格限定为 `tests/frontend/ScreenTextWorkspace.test.tsx`：仅在“来源 stale 时旧批次保持只读”用例中等待候选 checkbox 可达后再断言 disabled；不改生产 ScreenText、业务行为、CSS、其他测试健康项或完整关闭门。

## 2026-08-19｜FIFO250 规划关闭门审计与测试健康返工路由

- 规划复核正式报告、完整 `pnpm check` 原始失败、两份测试代码与单文件复跑事实。SYSTEM-07C 产品主链 P0/P1/P2/P3=`0/0/0/0` 成立，但完整门退出码为 1，不能以“单文件后来通过”直接宣布切片关闭。
- `QA-SYSTEM-07C-CHECK-001`：`pre-review.test.ts` 使用独立临时数据库，`afterAll` 先执行冗余 `TRUNCATE` 再由 `app.close()` 关闭同一 pool、最后终止连接并 DROP 数据库；全套顺序运行中该 hook 超过 10 秒。FIFO251 由后端固定对话收敛临时库清理所有权，禁止增加 sleep、fallback 或只调大 timeout。
- `QA-SYSTEM-07C-CHECK-002`：ScreenText stale 用例只等待“从新来源新建批次”按钮，随后用同步 `getByRole` 读取候选 checkbox；两个异步查询面没有同一呈现时序保证，形成确定测试竞态。FIFO252 由前端固定对话补对应候选的异步等待，不改生产代码或业务行为。
- FIFO251/252 可并行且目录不重叠；两项均交回后，只由 TEST 固定对话再执行一次完整 `pnpm check`。仅退出码 0 才关闭 SYSTEM-07C；若仍失败，按新鲜原始根因继续路由，不增加兼容路径。CURRENT 更新至 v4-672。

## 2026-08-19｜FIFO250 TEST-SYSTEM-07C 独立纵向验收交规划复核

- 携带 `handoffToken=FIFO250-TEST-SYSTEM-07C-R1-V4.669` 完成正式 Fastify + system-frontend production build + 从零隔离 PostgreSQL + 零网络 strategy Worker + 系统 Chrome 1440/1024 全链矩阵。baseline 预览/导入、严格七字段、固定 snapshot、人工批准、publish/rollback 同命令 GET 恢复、S3 会话版本绑定、权限/两站隔离、历史保护与 UI 关键门全部通过；产品 `P0/P1/P2/P3=0/0/0/0`，生产代码修改0。
- 新鲜专项策略 4 文件/34 项、backend build、system-frontend typecheck、Vite 42 modules、`check:repo`、`git diff --check` 通过。唯一完整 `pnpm check` 真实运行至结束，40 files / 377 tests 中 38 files / 375 tests 通过；保留两个非产品既有套件差量：`QA-SYSTEM-07C-CHECK-001`（pre-review afterAll hook 10 秒超时，隔离专项7/7通过）与 `QA-SYSTEM-07C-CHECK-002`（ScreenText stale 异步夹具缺 checkbox，单文件14/14复跑通过）。不使用 fallback/sleep/跳过，交规划统一决定。
- 精确清理：隔离库与早期残留库 DROP，32250/32251 无监听，Fastify/static/Worker/Playwright Chrome 停止，临时 harness 删除，共享 PostgreSQL 55432 未改动。报告写入 `docs/testing/SYSTEM-policy-learning-07c-integration-report.md`，脱敏证据位于仓库外 `qa-evidence-fifo250`；CURRENT 更新至 v4-671，FIFO250/TEST-SYSTEM-07C 转 `review / Current actor=规划对话`。

## 2026-08-19｜FIFO250 TEST-SYSTEM-07C 正式唤醒与运行态确认

- 状态已先由规划写回 CURRENT v4-669；正式唤醒只发送给全链测试固定对话，携带 `handoffToken=FIFO250-TEST-SYSTEM-07C-R1-V4.669`、完整纵向验收范围和停止边界。
- 目标新 turn 已原样回显同令牌，并回执 `repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`；`wait_threads` 确认目标状态 `active/inProgress`，正在先写回领取状态后执行。CURRENT 更新至 v4-670，FIFO250=`active`。规划不代替测试执行，只监督测试交付、精确清理与关闭门。

## 2026-08-19｜FIFO249 规划原始证据审计通过并路由 FIFO250

- 规划保留 `fifo249-results.json` 原始 `5/8`，不覆盖或美化测试结果；逐项核对 `requestFacts`、原始请求 body、`Idempotency-Key`、`fifo249-adjudication.json` 与两张正式截图。三项原始失败均来自同一 harness 字段优先级错误：通用 `commandId` 错误优先取 `impactRunId`；真实链为同一 rollback `releaseCommandId` 三次 GET=`503/503/200`，两次 approval 分别使用不同 `approvalId` 与 key，两次 release 分别使用不同 `releaseCommandId` 与 key。
- 视觉证据确认 rollback unknown 唯一恢复入口已离开比较 Drawer 遮挡层且鼠标可达；普通 publish unknown 仍使用共享默认文案。结合 UI 已记录的 ErrorBlock 焦点、迟到响应保护、应用 console error/warn=`0/0`，规划裁决产品 `8/8`、P0/P1/P2/P3=`0/0/0/0`。FIFO249 closed，`FRONT-SYSTEM-07C Rev5` done。
- 登记 FIFO250 `FIFO250-TEST-SYSTEM-07C-R1-V4.669`：由全链测试固定对话独立执行 SYSTEM-07C 纵向集成与唯一完整 `pnpm check` 关闭门。范围覆盖严格规则基线/历史/影子影响/批准/发布/恢复、前置审改新旧会话版本绑定、权限和员工站隔离、稳定身份 unknown 恢复、1440/1024 与 console；不接真实 AI/网络/Secret/付费/云资源，不改生产实现。CURRENT 更新至 v4-669。

## 2026-08-19｜FIFO249 规划送达闭环确认

- 规划固定任务新 turn 已原样回显 `handoffToken=FIFO249-FRONT-SYSTEM-07C-R5-V4.665`，确认收到 CURRENT v4-667、docs/ui §23 与原始/人工对账证据，正在独立核对 raw requestFacts、body、Idempotency-Key 和 `5/8 → 8/8` 归因。CURRENT 更新至 v4-668，FIFO249=`active`；FRONT Rev5 保持 `review / Current actor=规划对话 / Reviewer=规划对话`，TEST 暂不解锁。UI 停止执行，未通知 FRONT/BACK/TEST。

## 2026-08-19｜FIFO249 FRONT-SYSTEM-07C Rev5 定向 UI 微终验完成

- 原样携带 `handoffToken=FIFO249-FRONT-SYSTEM-07C-R5-V4.665`。新鲜 system-frontend production build `42 modules`；正式 Fastify、从零全部35迁移隔离 PostgreSQL、production React、零网络 strategy runtime Worker、项目既有 Playwright与系统Chrome完成A–D定向微终验。最终产品裁决全部通过，P0/P1/P2/P3=`0/0/0/0`，生产代码修改0。
- rollback unknown 会关闭比较 Drawer，全页唯一“查询本次策略恢复结果”真实鼠标可达并聚焦；创建POST=1，人工仅GET同一releaseCommandId并完成503→503→200，成功回versions/current、标题聚焦且Drawer不重开。新rollback身份的迟到GET在切阶段后被丢弃。impact/approval/release三类确定409均清Modal/旧意图、刷新事实并保持唯一ErrorBlock焦点，下一显式动作使用新ID/body/key；target 503唯一重读成功标题焦点与普通publish默认恢复文案无回归。
- 原始 harness 汇总5/8，三项失败来自同一记录字段优先级：通用`id`错误优先记录impactRunId，导致A1未匹配release GET并误报approval/release命令ID不变。原始requestFacts/body/key分别证明同releaseCommandId三次GET、两个不同approvalId、两个不同releaseCommandId和各自不同Idempotency-Key；原始JSON保留，`fifo249-adjudication.json`记录人工对账后的8项通过，不将编排误判冒充产品失败。
- application console error/warn=`0/0`、pageerror=`0`；12条策略受控非2xx与身份匹配，overview不计入策略错误。`qima_fifo249_%`残留0，31249/32249无监听，Playwright browser.close已执行，临时harness已删除，共享PostgreSQL 55432保持running。未跑完整pnpm check、未重复Impeccable、未提交/推送/部署。CURRENT更新至v4-667，FIFO249=`notification_pending`，下一步只唤醒规划并确认新turn。

## 2026-08-19｜FIFO249 FRONT-SYSTEM-07C Rev5 定向 UI 微终验领取

- 原样回显 `handoffToken=FIFO249-FRONT-SYSTEM-07C-R5-V4.665`；权限指纹：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 已重读 AGENTS.md、WORKFLOW v4.9、CURRENT v4-665、UI 验收 §22、开发日志顶部及 FIFO248 两个生产差量与专项回归；CURRENT 更新至 v4-666，任务保持 `review / Current actor=UI设计对话 / Reviewer=UI设计对话`，FIFO249=`active`。本轮仅用正式 production React + Fastify + 从零隔离 PostgreSQL + 零网络 strategy runtime Worker + 系统 Chrome复验两项原失败与一条读取恢复抽查；不改生产代码，不重复完整矩阵或 Impeccable，TEST 继续 blocked。

## 2026-08-19｜FIFO248 规划复验通过并路由 FIFO249 UI 微终验

- 规划原样确认 `handoffToken=FIFO248-FRONT-SYSTEM-07C-R5-V4.662` 与前端交回，独立核对 `strategyWaveC.tsx`、`controlPrimitives.tsx` 和回归。rollback unknown 关闭比较 Drawer 后不再以已清空的 selectedVersion 判断响应，而以 recoveryRef 中完整 commandId/action/versionId 作为唯一恢复身份；同命令成功转到 versions、聚焦标题且不重开 Drawer。确定冲突清 Modal/旧意图并刷新事实，但不再设置读取恢复专用标题焦点，唯一 ErrorBlock 保持焦点。共享 actionLabel 为可选纯展示参数，默认行为有回归锁定。
- 规划新鲜运行管理员六文件 `75/75`、system-frontend TypeScript、Vite production build `42 modules` 与 `git diff --check` 全通过。FIFO248 closed；登记 FIFO249 `FIFO249-FRONT-SYSTEM-07C-R5-V4.665`，只由 UI 在正式 production React + Fastify + 从零隔离 PostgreSQL + 零网络 Worker + 系统 Chrome 复验两个原失败变化场景。FIFO247 其余矩阵冻结，TEST 继续 blocked。CURRENT 更新至 v4-665。

## 2026-08-19｜FIFO248 FRONT-SYSTEM-07C Rev5 完成并交规划复验

- 原样沿用 `handoffToken=FIFO248-FRONT-SYSTEM-07C-R5-V4.662`。生产改动：`system-frontend/src/strategyWaveC.tsx` 关闭 rollback unknown 时仍打开的比较 Drawer，保留同一 `releaseCommandId + action=rollback` 恢复身份；恢复入口使用规划要求的“查询本次策略恢复结果”，人工查询只 GET 同一命令，成功后回到版本/当前事实并安全聚焦标题，切换身份时迟到响应被丢弃。确定性 impact/approval/release 4xx 通过同一 `clearConflict` 清理 Modal/旧意图、刷新权威事实并将错误焦点交给唯一 ErrorBlock，下一次显式动作生成新身份。
- 共享 `system-frontend/src/controlPrimitives.tsx` 仅增加 `CommandRecovery` 可选展示文案参数；其他调用方默认“查询本次发布/恢复命令”等原文案、DOM 与焦点行为不变，并由回归锁定默认值。新增/调整 `tests/frontend/system-control-strategy-wave-c.test.tsx` 覆盖 rollback unknown Drawer/同 ID GET/POST=1、三类确定冲突新身份与 ErrorBlock 焦点、读取恢复标题焦点及共享默认文案。
- 新鲜验证：策略 Wave C `13/13`；管理员六文件组合 `75/75`；`node node_modules/typescript/bin/tsc --noEmit -p system-frontend/tsconfig.json` 通过；Vite `42 modules` production build 通过；`git diff --check` 通过。未跑完整 `pnpm check`、完整浏览器矩阵或 Impeccable，未改 backend/contracts/migrations/DESIGN/Wave B/员工站，未提交/推送/部署。状态已写回 CURRENT v4-664，FIFO248/FRONT Rev5 转 review，唤醒待发送规划固定任务。

## 2026-08-19｜FIFO247 规划归因关闭并派发 FIFO248

- 规划已独立核对 `fifo247-results.json`、正式截图与 `strategyWaveC.tsx`。rollback unknown 的唯一恢复块渲染于页面层，而比较 Drawer 为 fixed 高层且继续打开，造成恢复按钮虽可程序聚焦/Enter，却不能被鼠标命中；确定性 4xx 的 `clearConflict` 又错误设置读取恢复专用的 `readRecoveryFocus`，刷新成功后 Wave C 标题夺走唯一 ErrorBlock 焦点。两项均为同一前端焦点/覆盖所有权，无需后端、UI 或 TEST 并行返工。
- FIFO247 已关闭；新建 FIFO248 `FRONT-SYSTEM-07C Rev5`，`handoffToken=FIFO248-FRONT-SYSTEM-07C-R5-V4.662`。范围仅为：rollback unknown 关闭比较 Drawer 但保留同一 releaseCommand 恢复意图，保证唯一查询可见/可点击、POST 恒为 1；确定冲突刷新后保留 ErrorBlock 焦点，读取恢复成功标题焦点不得回归。后端/契约/DESIGN/CSS视觉主体/Wave B 冻结，TEST 继续 blocked。CURRENT 更新至 v4-662。

## 2026-08-19｜FIFO247 规划送达闭环确认

- 规划固定任务新 turn 已原样回显 `handoffToken=FIFO247-FRONT-SYSTEM-07C-R4-V4.658`，确认收到 CURRENT v4-660、docs/ui §22 与正式证据包并正在集中归因；FIFO247 更新为 `active`，FRONT Rev4 保持 `review / Current actor=规划对话`，TEST 不解锁。CURRENT 更新至 v4-661；UI 停止执行，未通知 FRONT/BACK/TEST。

## 2026-08-19｜FIFO247 FRONT-SYSTEM-07C Rev4 UI 变化场景微终验完成

- 原样携带 `handoffToken=FIFO247-FRONT-SYSTEM-07C-R4-V4.658`。最终正式 production React + Fastify + 从零隔离 PostgreSQL + 零网络 strategy runtime Worker + 系统 Chrome 六组变化场景拆为 8 项裁决，`4 passed / 4 failed`；失败归并为 P0/P1/P2/P3=`0/2/0/0`，结论不通过，FRONT Rev4 转 `review / Current actor=规划对话 / Reviewer=规划对话`，TEST 继续 blocked。
- 通过项：1440/1024 比较双栏与四个数值 token 单行；history 中性进入、显式比较、关闭/Escape、迟到响应；历史分页清理、分页外固定 version GET；六读取面 `503→503→200` 的 stale/requestId/锁写/唯一重读/成功标题焦点。正式 rollback 的 POST=1、同 releaseCommandId GET=1、target 200、active=1 与历史摘要不改写也已成立。
- P1：rollback unknown 恢复块在仍打开的比较 Drawer 后方，指针点击被遮挡；impact/approval/release 确定性 409 均清 Modal/旧意图并为第二次动作生成新身份，但刷新结束后 Wave C 标题夺走安全错误焦点。生产代码修改 0。
- 新鲜 system-frontend production build `42 modules`；应用 console error/warn=`0/0`、pageerror=`0`，19 条 Chrome 网络诊断与受控非 2xx 请求身份一一匹配。证据目录 `C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo247-system-07c-ui-evidence`。
- 精确清理：最终隔离库及 `qima_fifo247_%` 前缀残留 0，31247/32247 无监听，测试 Chrome 已关闭；共享 PostgreSQL 55432 保持 running。未运行完整 pnpm check，未提交、推送或部署。CURRENT 更新至 v4-660，FIFO247=`notification_pending`，下一步只向规划固定任务发送同令牌差量包并确认新 turn。

## 2026-08-19｜FIFO247 FRONT-SYSTEM-07C Rev4 UI 变化场景微终验领取

- 原样回显 `handoffToken=FIFO247-FRONT-SYSTEM-07C-R4-V4.658`；权限指纹：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 已增量重读 AGENTS、WORKFLOW v4.9、CURRENT v4-658、DESIGN 5.17、UI 验收 §21、开发日志顶部及 FIFO246 三个改动文件与专项回归；CURRENT 更新至 v4-659，FIFO247=`active`，FRONT Rev4=`in_progress / Current actor=UI 设计对话 / Reviewer=UI 设计对话`。
- 本轮只运行正式环境六组变化场景；FIFO242/245 其余通过矩阵冻结，不重复 Impeccable，不改 production system-frontend/frontend/backend/contracts/migrations/DESIGN。

## 2026-08-19｜FIFO246 规划复验通过并路由 FIFO247 UI 微终验

- 规划原样确认 `handoffToken=FIFO246-FRONT-SYSTEM-07C-R4-V4.655` 与前端新 turn，独立核对 `strategyWaveC.tsx`、`strategy.css` 与专项回归。连续的 versions→impact→approval 只复用同一被选版本；进入/离开 history 和历史分页才清历史局部选择、详情、恢复、错误与触发点，未形成全局无差别清理回归。
- 历史页现在先显示服务端中性列表，只有该页“比较”建立触发点并读取固定 version；关闭/Escape 后清选择且不会被初始化 effect 重开。比较区保留当前→目标双栏，每侧字段单列，行内 `88px/110px` 最小列与 `strategy-runtime-value-token` 保持毫秒/六位小数完整，680px 以下才堆叠。
- 规划新鲜验证：管理员 system-control 六文件 `72/72`；system-frontend TypeScript 通过；Vite production build `42 modules` 通过；`git diff --check` 仅既有 LOCAL_APP_PARITY CRLF 提示。FIFO246 closed，CURRENT 更新至 `v4-658`。
- 新增 `handoffToken=FIFO247-FRONT-SYSTEM-07C-R4-V4.658`：UI 不重跑 FIFO242/245 已通过完整矩阵，只在正式 React+Fastify+从零隔离 PostgreSQL+零网络 Worker+系统 Chrome 中复验双视口比较可读性，以及 rollback、Drawer 关闭/Escape、确定4xx、分页清理、六读取面失败→再次失败→成功五组未裁决场景。TEST 继续 blocked。

## 2026-08-19｜FIFO246 FRONT-SYSTEM-07C Rev4 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO246-FRONT-SYSTEM-07C-R4-V4.655`；权限指纹：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。
- 已重读 AGENTS.md、WORKFLOW v4.9、CURRENT v4-655、DESIGN 5.17、UI 验收 §21、开发日志顶部及 Wave C/对应回归；状态写回 CURRENT v4-656，FIFO246 active、FRONT Rev4 in_progress。
- 本轮范围严格限定为历史标签切换身份门和比较 Drawer 字段 token 可读性；backend/contracts/migrations/DESIGN/Wave B/员工站/业务状态冻结。

## 2026-08-19｜FIFO246 FRONT-SYSTEM-07C Rev4 完成并转 review

- 保留 `versions→impact→approval` 连续工作流的同一 selectedVersion；仅进入/离开 `history`、历史分页时清理 selectedVersion、impact/approval、action/recovery 与旧触发点，历史页先呈现中性服务端列表，显式点击“比较”才读取稳定 version 并打开 Drawer；关闭/Escape 回原触发点，迟到响应不能重开。
- 比较区保留 DESIGN 5.17 要求的当前/目标双栏；每侧字段改为单列，数值列保留最小可读宽度，新增 `strategy-runtime-value-token` 结构语义，`350 ms`、`0.750000` 在 Drawer 中保持完整 token，不依赖隐藏字段、缩小字体或页面横溢。
- 回归新增/调整覆盖 history 中性进入、显式比较、Escape 焦点恢复、分页清理、versions→impact→approval 上下文与比较 token 结构。验证：策略 Wave C `10/10`，管理员六文件组合 `72/72`，system-frontend typecheck，Vite `42 modules` production build，git diff-check 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。
- 实际生产改动：`system-frontend/src/strategyWaveC.tsx`、`system-frontend/src/strategy.css`；回归改动：`tests/frontend/system-control-strategy-wave-c.test.tsx`。未改 backend/contracts/migrations/DESIGN/Wave B/员工站，未跑完整 pnpm check/完整浏览器矩阵/Impeccable，未提交、推送或部署。状态已写回 CURRENT v4-657；FIFO246/FRONT Rev4 转 review，Current actor=规划对话，唤醒待发送。

## 2026-08-18｜FIFO245 规划归因并派发 FIFO246 前端微返工

- 规划已原样回显 `handoffToken=FIFO245-FRONT-SYSTEM-07C-R3-V4.651` 并核对 UI 验收 §21、正式 CSS/TSX 与 DESIGN 5.17。FIFO245 关闭，但任务不通过结论保留，TEST 继续 blocked。
- P1 根因不是数值内容，而是比较 Drawer 中“当前/目标双栏”内继续套用两列 `.strategy-runtime-fields`，每个字段行又固定 `145px + value`，三重横向切分在 590/560px Drawer 中把 `420 ms / 0.750000` 压成逐字符纵排；现有 `word-break:keep-all` 不能解决容器本身无可用宽度。
- 历史页未裁决并非只属于 harness：从其他阶段进入 `history` 时保留全局 `selectedVersionId`，导致未点击本页“比较”就打开 Drawer，违反 DESIGN 5.17“切换标签即清除旧详情、局部选择、草稿意图和恢复块”。该问题与 Drawer 关闭门同源，必须由前端一次清理，而不是让测试绕页面真实行为。
- CURRENT 更新至 `v4-655`；新增 `handoffToken=FIFO246-FRONT-SYSTEM-07C-R4-V4.655`。范围仅 `strategyWaveC.tsx`、`strategy.css` 与必要定向前端回归：进入历史先显示中性列表，显式比较才开 Drawer；切换标签/分页清失效选择与恢复；当前→目标字段 token 在 1440/1024 可读。后端、contracts、迁移、DESIGN、Wave B 与其他通过证据冻结。

## 2026-08-18｜FIFO245 FRONT-SYSTEM-07C Rev3 UI 变化场景复验完成并转 review

- 原样携带 `handoffToken=FIFO245-FRONT-SYSTEM-07C-R3-V4.651`。新鲜 system-frontend production build `42 modules`；正式 Fastify + 从零 34 migrations 隔离 PostgreSQL + 零网络 Worker + 项目既有 Playwright/系统 Chrome 最终运行 12 组，7 组形成有效通过、5 组因历史页沿用选择自动打开 Drawer 后与 harness 点击顺序冲突而未裁决。
- 已通过：基线导入 unknown 只 GET 同 ID、基线首发、自定义第二次发布、target 200/唯一当前生效、真实迟到 version 响应丢弃、中文动态标题、1440/1024 根/侧栏/表滚动、应用 console error/warn 0/0。POST 计数 baseline/impact/approval/release=`1/2/2/2`。
- 唯一产品 P1：`QA-SYSTEM-07C-VISUAL-02`，1440/1024 比较 Drawer 的毫秒和六位小数仍逐字符纵向断行，当前→目标无法快速核对。正式 rollback、Drawer关闭/Escape、三类确定4xx、分页清理和六读取面完整恢复因级联未形成本轮有效裁决；不冒充失败或通过。P0/P1/P2/P3=`0/1/0/0`，TEST 继续 blocked。
- 证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo245-system-07c-ui-evidence`。所有 `qima_fifo245_*` 库残留0，31245/32245无监听，测试 Chrome/临时 harness 已清理，共享 PostgreSQL 55432保持运行。生产代码修改0；未重复 Impeccable、未跑完整 pnpm check、未提交/推送/部署。
- CURRENT 差量更新至 `v4-653`；任务保持 `review`，`Current actor=规划对话`，FIFO245=`notification_pending`。下一步只向规划固定任务发送同令牌八项差量包并确认新 turn，不通知 FRONT/BACK/TEST。
- 规划固定任务随后原样回显 `handoffToken=FIFO245-FRONT-SYSTEM-07C-R3-V4.651`，确认已收到 UI §21 / CURRENT v4-653 的不通过交回并进入集中归因运行态；CURRENT 最小同步至 `v4-654`，FIFO245=`delivered`，未改变 FRONT/BACK/TEST 范围或状态。

## 2026-08-18｜FIFO245 FRONT-SYSTEM-07C Rev3 UI 变化场景复验领取

- 原样回显 `handoffToken=FIFO245-FRONT-SYSTEM-07C-R3-V4.651`；权限指纹：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 已重读 AGENTS、WORKFLOW v4.9、CURRENT v4-651、UI 验收 §20、FIFO242 证据与 FIFO244 生产差量；CURRENT 差量更新至 `v4-652`，FIFO245=`active`，`FRONT-SYSTEM-07C Rev3=review / Current actor=UI 设计对话 / Reviewer=UI 设计对话`。
- 状态已写回、唤醒已收到、workspace-write + in_progress 已确认。本轮只运行正式 production build + Fastify + 从零隔离 PostgreSQL + 零网络 Worker + 系统 Chrome 的变化场景矩阵；不重复 FIFO242 全部 57 项或 Impeccable，生产代码修改 0。

## 2026-08-18｜FIFO244 规划复验通过并路由 UI 变化场景

- 规划原样确认 `handoffToken=FIFO244-FRONT-SYSTEM-07C-R3-V4.643` 与前端固定任务新 turn；核对 `strategyWaveC.tsx`、`strategyPage.tsx`、`strategy.css` 及两份策略回归，确认固定 runtime version GET 为唯一详情来源，删除旧 `knownVersions` 权威缓存，确定冲突清稳定意图，Drawer 显式关闭不再被初始化 effect 重开，读取失败统一由同一 read boundary 提供 stale/requestId/唯一原查询重读与写锁。
- 规划新鲜运行六份管理员 system-control 前端测试为 `6 files / 70 tests`，system-frontend typecheck、Vite production build `42 modules`、`git diff --check` 全通过。未发现 fallback、伪200、吞错、第二状态源或越界修改；FIFO243 的真实 target 500 修复继续作为正式后端事实。
- CURRENT 更新至 `v4-651`，FIFO244 closed；新增 `handoffToken=FIFO245-FRONT-SYSTEM-07C-R3-V4.651`，只路由 UI 复验 FIFO242 原失败变化场景。完整 57 项矩阵和既有通过证据冻结，TEST 继续 blocked，UI 不改生产代码、不重复 Impeccable/完整矩阵。

## 2026-08-18｜FIFO244 FRONT-SYSTEM-07C Rev3 完成并转 review

- 原样沿用 `handoffToken=FIFO244-FRONT-SYSTEM-07C-R3-V4.643`；最新 CURRENT 已读取为 `v4-649`，随后差量写回 `v4-650`。权限指纹：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`；状态已写回，唤醒已收到，workspace-write + in_progress 已确认。
- 八项差量包：①将 `sectionHeading` 绑定真实 Wave C 标题，并让导入、固定快照验证、批准、发布/恢复及读取恢复成功只在身份仍匹配时安全聚焦；②删除 Wave C `knownVersions` 旧缓存权威，版本详情统一读取稳定 runtime version GET，保留服务端当前生效事实；③确定性冲突清理 Modal/稳定恢复意图、刷新权威事实并聚焦唯一错误安全目标，unknown/retryable 仍只 GET 同一身份；④历史比较 Drawer 关闭后不再因基线初始化 effect 重开，分页/身份切换清除失效选择、恢复和操作错误；⑤任一 target/baseline/history/version/impact/approval 读取失败保留旧事实、requestId 与唯一重读，失败期间锁定写动作，恢复后聚焦标题；⑥移除用户可见 `active`/“生产生效未启用”漂移，发布确认按是否已有当前生效版本动态命名，严格字段与比较摘要保持可读；⑦保留后端受控 500 的真实错误边界，不伪造 200/吞错；⑧复用既有 ControlShell/Modal/Drawer/表格内滚动，未改 backend、迁移、contracts、DESIGN、员工站或 Wave B。
- 实际本轮生产/测试改动：`system-frontend/src/strategyWaveC.tsx`、`system-frontend/src/strategyPage.tsx`、`system-frontend/src/strategy.css`、`tests/frontend/system-control-strategy-wave-c.test.tsx`、`tests/frontend/system-control-strategy.test.tsx`；CURRENT/日志差量写回。未修改共享 API、controlPrimitives、后端、迁移、packages/contracts、DESIGN 或员工 frontend。
- 新鲜验证：策略相关管理员前端 `6 files / 70 tests` 全通过（Wave C `21/21`）；system-frontend TypeScript 通过；Vite production build `42 modules` 通过；`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 `pnpm check`、完整浏览器矩阵或 Impeccable；未接真实 AI/网络/Secret/付费/云资源，未提交/推送/部署。
- 已将任务转 `review / Current actor=规划对话`，下一步仅向规划固定任务发送同一令牌八项差量包并确认新 turn；不通知 UI/TEST/BACK。

## 2026-08-18｜FIFO243 规划独立复验通过

- 规划原样确认 `handoffToken=FIFO243-BACK-SYSTEM-07C-R6-V4.643` 与后端固定任务新 turn；代码核对确认唯一根因修复未增加 fallback、第二查询、伪健康或第二状态源。共享响应 schema 只移除 `fast-json-stringify` 会误判合法 `0.8` 的浮点 `multipleOf`；策略写入与 runtime 读取两条正式服务边界仍统一验证数值范围和最多六位十进制精度。
- 规划新鲜运行 `tests/backend/system-control-strategy-runtime.test.ts` 为 `1 file / 9 tests`，contracts build、backend build、`check:repo`、`git diff --check` 全通过。正式回归包含第二次发布→target 200→正式 rollback→target 200、唯一 active 与旧版本 retired/contentDigest 不变；测试临时诊断已删除。
- CURRENT 更新至 `v4-649`，`BACK-SYSTEM-07C Rev6` 与 FIFO243 关闭；FIFO244 前端继续 in_progress，UI/TEST 继续 blocked，待前端交付后再做联合映射审查。

## 2026-08-18｜FIFO243 BACK-SYSTEM-07C Rev6 完成并转 review

- 原样沿用 `handoffToken=FIFO243-BACK-SYSTEM-07C-R6-V4.643`；重启后按 `CURRENT v4-647` 复核暂停中间态，工作区指纹保持 `repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。
- 从零隔离 PostgreSQL 通过正式 HTTP 复现“基线导入→影响检查→批准→首次发布→自定义版本→影响检查→批准→第二次发布→target GET”。真实错误为 Fastify response serializer 在 `#/active` 处拒绝合法自定义 rule pack 的 `alignmentSimilarityThreshold=0.8`，根因是共享 schema `multipleOf=0.000001` 的 JS 浮点精度误判；不是数据库查询失败。
- 最小根因修复：`packages/contracts/src/system-control-strategy.ts` 移除只会误伤响应序列化的 `multipleOf` 元数据；`backend/src/modules/system-control/system-control.strategy.service.ts` 与 `system-control.strategy-runtime.service.ts` 以统一六位十进制精度校验输入和持久规则包。删除测试内 error handler/console 诊断，不引入 fallback、第二查询源或状态源。
- `tests/backend/system-control-strategy-runtime.test.ts` 新增正式回归：第二次发布后 target 200 且自定义版本唯一 active，rollback 后 target 200 且基线 active/自定义 retired，两个版本 contentDigest 保持不变。新鲜专项 `1 file / 9 tests`、contracts/backend typecheck+build、`check:repo`、`git diff --check` 全通过；未新增迁移、未接真实服务、未运行完整 `pnpm check`、未提交/推送/部署。已写回 CURRENT v4-648，FIFO244 in_progress 保留。

## 2026-08-18｜重启后恢复 FIFO243/244 与四角色协作通道

- 用户明确继续。规划先恢复唯一项目 PostgreSQL：`pnpm db:start` 成功，`pnpm db:status` 确认 PostgreSQL 18.4 / `qimao_terms_cloud` / 55432；未创建第二运行时或数据库。
- 按 v4.9 重启门对 UI、后端、前端、测试四个固定任务发送 `COORD-RESTART-20260818C-*` 只读探针；四者都在各自新 turn 原样回执 `restart_wake_ok`，没有修改业务文件，消息通道和接力指纹恢复。
- CURRENT 更新至 `v4-647`：FIFO243/244 沿用原 Rev 与 handoffToken 从暂停中间态续接，分别转 `ready / Current actor=后端开发对话` 与 `ready / Current actor=前端开发对话`。后端当前只留测试内临时诊断、尚未改生产代码；前端保留已落盘半成品。UI/TEST 继续 blocked，等待规划独立复验后再路由。

## 2026-08-18｜用户重启前即时暂停 FIFO243/244

- 用户因电脑明显卡顿要求暂停项目并准备重启。规划已向后端/前端固定任务发送即时停止消息：中止测试、构建、临时 Fastify/Worker/隔离库动作，只清本任务临时资源，保留已落盘源码与测试，不回滚、不删除、不提交、不推送；UI/TEST 不启动。
- CURRENT 更新至 `v4-646`：`BACK-SYSTEM-07C Rev6`、`FRONT-SYSTEM-07C Rev3` 与 FIFO243/244 均转 `blocked / Current actor=规划对话 / Reviewer=用户`；恢复时沿用原 Rev 与 handoffToken，不重写、不重复已完成分析。
- 规划只读进程核对未发现项目 Node/pnpm/Vitest/Vite/tsx 进程；唯一项目 PostgreSQL 主进程 PID 3516 及其子进程已通过 `pnpm db:stop` 在正确 Windows 用户上下文优雅停止。剩余 Node PID 36540/40420 为 Codex 自身 `kernel.js` 与 `trusted-worker.js`，为避免中断当前应用未停止。
- 本次暂停未删除数据库 data、源码、测试或证据，未触碰用户原始素材；电脑重启后先检查工作树、PostgreSQL 状态和固定任务通道，再恢复 FIFO243/244，不直接跳到 UI/TEST。

## 2026-08-18｜FIFO243 BACK-SYSTEM-07C Rev6 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO243-BACK-SYSTEM-07C-R6-V4.643`；`permission_ok`：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。
- CURRENT 已差量更新至 `v4-645`；本轮只处理第二个已批准版本发布后 runtime-target GET 500 的隔离复现、真实根因修复与 rollback 回归，FIFO244/前端/迁移/既有状态机冻结。

## 2026-08-18｜FIFO244 FRONT-SYSTEM-07C Rev3 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO244-FRONT-SYSTEM-07C-R3-V4.643`；权限握手：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。
- 已重读 AGENTS、WORKFLOW v4.9、CURRENT v4-643、UI 验收 §20 与 Wave C/公共原语/专项测试；当前仅处理 FIFO244 前端范围，FIFO243 target 500、backend/contracts/migrations/DESIGN/员工 frontend 冻结。
- CURRENT 已差量更新至 `v4-644`；FIFO244 active、`FRONT-SYSTEM-07C Rev3=in_progress`，状态已写回、唤醒已收到、workspace-write + in_progress 已确认。

## 2026-08-18｜FIFO242 规划集中归因，FIFO243/244 并行返工

- 规划原样确认 `handoffToken=FIFO242-FRONT-SYSTEM-07C-R2-V4.639`，独立读取 UI 验收 §20、57 项断言与脱敏请求证据，并核对正式 `strategyWaveC.tsx`、ControlShell 样式、runtime contract 与后端 release/target 投影；CURRENT 更新至 `v4-643`，FIFO242 closed，TEST 继续 blocked。
- 后端单独归因：第二个已批准版本发布返回 201 后，正式 `GET /api/system-control/strategy/runtime-targets/pre_review` 稳定 500，导致旧事实进入 stale 且 UI 恢复入口被权威读取门锁定。FIFO243 只要求在从零隔离库复现“基线首次发布→自定义版本第二次发布→target GET”并修唯一投影/响应根因；不得加 fallback、第二状态源、伪健康或改前端。
- 前端集中归因：`sectionHeading` 未挂到真实 DOM；`knownVersions` 优先返回导入时 draft 快照；确定冲突只 refresh 不清 Modal/稳定意图；`selectedVersionId` 的基线自动选择 effect 使 Drawer 关闭即重开；全局 readBlocked/stale 恢复、发布标题/工程词、Wave C 顶部文案、比较区断行和 1024 覆盖布局仍需同轮收口。FIFO244 只改 system-frontend 与对应回归，不改后端/迁移/contracts/员工站。
- 规划未把所有 UI 失败机械归给产品代码：`QA-SYSTEM-07C-COVERAGE-01` 是 UI 需要补的真实查询身份切换/迟到响应证据；受控 403/409/500/503 产生的 Chrome `Failed to load resource` 是预期网络诊断，不允许前后端通过伪 200、吞错或隐藏真实失败换取 console 0。后续 UI 门按“应用主动 `console.error/warn=0`、无未捕获异常、预期非 2xx 与断言请求身份匹配”判定。
- FIFO243/244 文件不重叠，可受控并行；二者完成后先由规划独立复验，再只路由 UI 复验变化场景，UI 通过后才解锁 TEST 与 Wave C 唯一完整关闭门。

## 2026-08-18｜FIFO242 FRONT-SYSTEM-07C Rev2 正式 UI 终验完成并交规划

- 原样携带 `handoffToken=FIFO242-FRONT-SYSTEM-07C-R2-V4.639`；CURRENT 最终更新至 v4-642，任务转 `review / Current actor=规划对话 / Reviewer=UI设计对话`。正式规划唤醒已发送，`read_thread` 已确认同令牌形成规划新 turn 且状态 `inProgress`，FIFO242=`delivered`。结论不通过，TEST 继续 blocked，UI 不自行 done。
- 正式矩阵最终 `harnessError=null`：production system-frontend 42 modules、员工 frontend 189 modules；正式 Fastify routes、从零全部迁移独立 PostgreSQL、production 静态产物、系统 Chrome、零网络 Worker。57 项断言 44 通过/13 失败，118 条脱敏请求事实。
- 通过事实包括逐请求权限默认拒绝/精确主体、无当前生效与基线导入、严格七字段、queued→running→503→success、impact/release unknown 同稳定身份且 POST=1、数据库基线不可更新/删除、首次发布、旧会话版本不被改写、正式 route rollback 服务端事实、106 项历史的分页外固定 version GET、禁止资产/版本扫描、1440/1024 根无横溢与表内滚动、员工站隔离。
- 缺陷一次性交回 P0/P1/P2/P3=`0/10/2/0`：P1 为成功焦点丢失、批准后缓存阻断首次发布、确定冲突不清意图、历史 Drawer 关闭即重开/焦点陷阱、第二次发布后 runtime-target 500 锁死 UI 恢复、stale 与迟到响应正式证据不闭合、中文 `active`/矛盾禁用文案、比较 Drawer 逐字符断行、console `10/0`；P2 为已有当前生效仍称“首次发布”、1024 覆盖展开正文宽严格断言失败。
- Impeccable 使用 audit 路径完成一次有界人工审查；未使用 detector/parser 降级结果代替真实浏览器。证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\18\01a012fb-e9f3-7801-a660-b22518eeea0c\fifo242-system-07c-ui-evidence`，详见 UI 验收 §20。
- 精确清理：隔离库 `qima_fifo242_23908_c0349155` 已删除，同前缀数据库残留0；31242/31243/32242 无监听；测试 Chrome 已关闭；临时 harness 已删除。共享 PostgreSQL 55432 保持原运行态。生产 system-frontend/frontend/backend/contracts/migrations/DESIGN 修改0；未运行完整 `pnpm check`，未提交/推送/部署，未通知 FRONT/BACK/TEST。

## 2026-08-18｜FIFO242 FRONT-SYSTEM-07C Rev2 正式 UI 终验领取

- 原样回显 `handoffToken=FIFO242-FRONT-SYSTEM-07C-R2-V4.639`。
- permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write`、`ordinary_writes=direct`。
- 已按 v4.9 重读项目 AGENTS、WORKFLOW、CURRENT v4-639、DESIGN 5.17、UI 验收 §19、strategy runtime contracts、FIFO240/241 生产差量与日志顶部；Impeccable 本轮采用 audit 路径，真实浏览器为最终裁决。
- CURRENT 更新至 v4-640：FIFO242=`active`，`FRONT-SYSTEM-07C Rev2=review / Current actor=UI设计对话 / Reviewer=UI设计对话`。本轮只写 UI 验收、状态/日志和仓库外脱敏证据，不改生产 system-frontend/frontend/backend/contracts/migrations/DESIGN。

## 2026-08-18｜FIFO240/241 规划联合通过，FIFO242 路由正式 UI 终验

- 规划原样确认 `FIFO240-BACK-SYSTEM-07C-R5-V4.634` 与 `FIFO241-FRONT-SYSTEM-07C-R2-V4.634`。代码交叉核对确认前后端共同使用唯一 `GET /api/system-control/strategy/runtime-targets/pre_review/versions/:strategyVersionId`；服务端强制 pre_review/strategy:read/404/零写，前端已删除100×100列表扫描。
- 正常 impact `201 queued`、running、unknown 现在保留同一 `impactRunId` 的唯一人工查询；GET未完成或503保持同一身份与 requestId，查询中防重复，succeeded/failed 才终结；版本/分页切换后迟到响应不能覆盖当前事实。
- 规划新鲜联合验证为 `7 files / 77 tests` 全通过；system-frontend typecheck、Vite production build（42 modules）、contracts build、backend build、`check:repo`、`git diff --check` 全通过。完整 `pnpm check` 继续留 SYSTEM-07C UI+TEST 后单次关闭门。
- CURRENT 更新至 `v4-639`：FIFO240/241 closed；BACK Rev5 done；FRONT Rev2 保持 review 并转 UI 设计对话执行 FIFO242 唯一完整浏览器矩阵。TEST 继续 blocked，UI 通过前不启动。

## 2026-08-18｜FIFO240 BACK-SYSTEM-07C Rev5 完成并转 review

- 原样携带 `handoffToken=FIFO240-BACK-SYSTEM-07C-R5-V4.634`；状态已写回 CURRENT（后续并行差量至 `v4-638`），`BACK-SYSTEM-07C Rev5=review / Current actor=规划对话`，FIFO241 前端 review 事实保留。
- 八项差量包：①新增 `GET /api/system-control/strategy/runtime-targets/pre_review/versions/:strategyVersionId`；②服务端直接按稳定版本 ID 查询 `strategy_artifact_versions`；③强制 `runtime_module=pre_review`，错误模块/不存在统一404；④响应复用既有 `SystemControlStrategyRuntimeVersionSchema`，仅安全 rulePack/status/provenance；⑤逐请求 `system-control` audience + `system-control:strategy:read`；⑥无列表扫描、fallback、别名、第二状态源或迁移；⑦新增分页前100之外版本直接读取、权限/错误边界与零写副作用回归；⑧不改既有发布/影响/批准/回滚状态机与 FIFO241。
- 修改文件：`backend/src/modules/system-control/system-control.strategy-runtime.service.ts`、`backend/src/modules/system-control/system-control.routes.ts`、`tests/backend/system-control-strategy-runtime.test.ts`、CURRENT/日志。
- 新鲜验证：runtime 专项 `1 file / 9 tests` 全通过；contracts TypeScript `exit=0`；backend build typecheck `exit=0`；`check:repo` 通过；`git diff --check` `exit=0`（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 `pnpm check`，未新增迁移、未接外部服务、未提交/推送/部署。

## 2026-08-18｜FIFO241 FRONT-SYSTEM-07C Rev2 完成并转 review

- 原样保留 `handoffToken=FIFO241-FRONT-SYSTEM-07C-R2-V4.634`；权限指纹仍为 `repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`，普通仓库编辑不走 `auto_review`。
- 仅修改 `system-frontend/src/strategyRuntimeApi.ts`、`system-frontend/src/strategyWaveC.tsx` 与 `tests/frontend/system-control-strategy-wave-c.test.tsx`；未改 backend、迁移、packages/contracts、DESIGN、员工 frontend、视觉方向或 Wave B。runtime version 详情改为固定 `GET /api/system-control/strategy/runtime-targets/pre_review/versions/:strategyVersionId`，移除 Wave C 的 100×100 资产/版本扫描。
- 影子验证正常 `201 queued`、`running`、`unknown` 均保留同一 `impactRunId` 的唯一人工查询；查询中锁定写入口/重复查询，未完成继续保留同一恢复，`succeeded/failed` 才形成终态并安全聚焦；切版本或迟到响应不会覆盖当前身份。GET 失败保留真实 requestId 与唯一查询动作，成功不重发 POST。
- 定向回归覆盖 queued→running→succeeded、GET 503→同 ID 再成功、历史分页外版本固定 GET、切版本迟到响应丢弃；策略专项 `19/19`，相关管理员组合 `6 files / 68 tests`，system-frontend typecheck、Vite production build `42 modules`、`git diff --check` 通过。未重复 Impeccable、未运行完整 `pnpm check` 或完整浏览器矩阵，未提交/推送/部署。
- CURRENT 已差量更新至 `v4-637`；FIFO241 active→review、`FRONT-SYSTEM-07C Rev2` in_progress→review、Current actor=规划对话。已向规划固定任务发送同一令牌交付唤醒，等待独立复验。

## 2026-08-18｜FIFO240 BACK-SYSTEM-07C Rev5 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO240-BACK-SYSTEM-07C-R5-V4.634`；`permission_ok`：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。
- CURRENT 已差量更新至 `v4-636`，保留 FIFO241 前端 `in_progress` 事实；本轮仅新增既有 runtime version 的稳定详情 GET 与分页外直接读取回归，不改迁移、contracts、写状态机、前端或 DESIGN。

## 2026-08-18｜FIFO241 FRONT-SYSTEM-07C Rev2 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO241-FRONT-SYSTEM-07C-R2-V4.634`；`permission_ok`：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。
- 已重读 v4.9 约定、CURRENT v4-634、FIFO239 退审事实与当前 Wave C 实现；本轮仅处理正常 impact queued/running/unknown 同身份恢复及固定 runtime version GET，Rev1 其余冻结，后端/迁移/contracts/DESIGN/员工站不改。
- CURRENT 已差量更新至 `v4-635`；FIFO241 active、`FRONT-SYSTEM-07C Rev2=in_progress`，FIFO240 后端并行保持 ready。

## 2026-08-18｜FIFO239 规划退审，FIFO240/241 后端与前端并行收口

- 规划原样确认 `FIFO239-FRONT-SYSTEM-07C-R1-V4.631`。新鲜运行 6 个 system-control 前端文件为 `64/64`，system-frontend typecheck 与 Vite production build（42 modules）通过；这些证据证明当前回归一致，但没有覆盖正常异步主链和分页外历史详情。
- P1-1：`createImpactRun` 正常返回 `201 queued` 后只写本地 `impact`，`selectedImpact = impact ?? historyImpact.data` 会长期优先该 queued 对象；`refreshAll` 不按该 `impactRunId` 重读，页面只有 POST unknown 才进入同身份 recovery。Worker 完成后仍显示排队，且可再次创建新 impact。
- P1-2：历史版本详情没有稳定 runtime version GET，前端改为先拉 `limit=100` 资产、再逐个拉 `limit=100` 版本定位；超过任一分页窗口时历史行可见但详情不可恢复，违反 PostgreSQL 权威与服务端分页，不能用前端扫描兜底。
- CURRENT 更新至 `v4-634`：FIFO239 关闭但不通过；FIFO240 BACK Rev5 与 FIFO241 FRONT Rev2 文件范围不重叠，可受控并行。固定合同为 `GET /api/system-control/strategy/runtime-targets/pre_review/versions/:strategyVersionId` 返回既有 `SystemControlStrategyRuntimeVersion`，逐请求 strategy:read 权限、404稳定且零写；前端删除100×100扫描并补正常 queued/running/unknown 同 `impactRunId` 查询。UI/TEST 继续 blocked。

## 2026-08-18｜FIFO239 FRONT-SYSTEM-07C Rev1 完成并转 review

- 原样保留 `handoffToken=FIFO239-FRONT-SYSTEM-07C-R1-V4.631`；权限指纹：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`，普通仓库编辑不走 `auto_review`。
- 生产实现限定在既有独立 `system-frontend` `/strategy`：新增 `strategyRuntimeApi.ts`、`strategyWaveC.tsx`，增量接入 `strategyPage.tsx`、`strategy.css` 与既有 `controlPrimitives.tsx` 的稳定恢复文案；新增 `tests/frontend/system-control-strategy-wave-c.test.tsx`。未改 backend、迁移、packages/contracts、DESIGN 或员工 frontend。
- 八项差量包：①消费 runtime target、baseline preview/import、impact、approval、release/rollback、history 正式接口；②基线导入与严格七字段 `pre_review_local_rule_pack_v1` 表单均使用预生成稳定身份和 Idempotency-Key；③未知/可重试只 GET 同一 baselineImportId/artifactId/versionId/impactRunId/approvalId/releaseCommandId，不重发 POST；④未纳管、loading/empty/error/stale、唯一重读、pending 锁和恢复焦点均诚实投影；⑤固定快照影响检查按服务端 hardBlocks/状态门禁，批准/发布前不浏览器重算金额或资格；⑥保护 system_baseline 历史、版本比较和 rollback 入口，Wave B 优化/候选/评测保持可用；⑦员工可见文案隐藏 origin、capability、impactRunId、releaseCommandId 等工程身份，费用 UI 不新增；⑧复用 ControlShell、Modal/Drawer/ErrorBlock 与既有响应式规则，未引入第二状态源或兼容路径。
- 代码健康：本轮新增/修改手写文件均 ≤800 行（`strategyWaveC.tsx` 206、`strategyRuntimeApi.ts` 39、`strategyPage.tsx` 228、`controlPrimitives.tsx` 115、Wave C CSS 规则追加在既有样式文件、专项测试 72 行）。
- 新鲜验证：策略专项 `15/15`，相关管理员前端回归 `6 files / 64 tests`，system-frontend TypeScript 通过，Vite production build `42 modules` 通过，Impeccable detector `[]`，`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 `pnpm check`、完整浏览器矩阵或真实 AI/Secret/付费/云资源；未提交、推送、部署。
- CURRENT 已差量更新至 `v4-633`；FIFO239 active→review、`FRONT-SYSTEM-07C Rev1` in_progress→review、Current actor=规划对话。已向规划固定任务发送同一 handoffToken 的交付唤醒，等待送达/运行态确认。

## 2026-08-18｜FIFO239 FRONT-SYSTEM-07C Rev1 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO239-FRONT-SYSTEM-07C-R1-V4.631`；`permission_ok`：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。
- 已按 v4.9 增量重读 AGENTS、WORKFLOW、CURRENT v4-631、DESIGN 5.17、UI 验收 §19、strategy runtime 契约、正式 routes 697–763、职责/INT-11/14/15/17 与日志顶部；确认本轮只消费 BACK-SYSTEM-07C Rev4 已冻结的 runtime API，不修改后端、迁移、contracts、DESIGN 或员工站。
- CURRENT 已更新至 `v4-632`；FIFO239 active、`FRONT-SYSTEM-07C Rev1=in_progress`，当前执行 Wave C 基线导入、严格字段草稿、固定快照影响检查、批准、发布/恢复与历史比较，Wave B 保持可用。

## 2026-08-18｜FIFO238 规划关闭，FIFO239 解锁正式 Wave C 前端

- 规划原样确认 `handoffToken=FIFO238-BACK-SYSTEM-07C-R4-V4.628`。独立代码审查确认：ImpactRun 创建事务冻结候选/当前规则、排序 cue、质量、时长、术语证据与业务身份，`snapshotDigest` 覆盖实际输入且数据库触发器禁止快照正文/身份/摘要更新或删除；Worker 仅消费 `snapshot_input`。
- 租约链通过：claim 为独立短事务，queued 与过期 running 均可发现；接管时旧 Attempt 持久 unknown，新 Attempt 获得 lease；评测在事务外执行，finalize 以 run/attempt/owner/running 的同事务条件完成，迟到旧 Worker 或已成功结果不能覆盖；受控异常可 GET 为 unknown。
- 规划新鲜运行 `system-control-strategy-runtime + pre-review + strategy + optimization` 为 `4 files / 22 tests` 全通过且无 skipped；contracts build、backend build、`check:repo`、migration `node --check`、`git diff --check` 全通过。未运行完整 `pnpm check`，留正式前端、UI 与 TEST 后的 SYSTEM-07C 单次关闭门。
- CURRENT 更新至 `v4-631`：BACK-SYSTEM-07C Rev4=`done`、FIFO238=`closed`；新增 FIFO239 `FRONT-SYSTEM-07C Rev1=ready`。前端只消费正式 runtime 合同实现同一 ControlShell Wave C，UI/TEST 在前端交回前继续 blocked。

## 2026-08-18｜FIFO238 BACK-SYSTEM-07C Rev4 完成并转 review

- 保留 `handoffToken=FIFO238-BACK-SYSTEM-07C-R4-V4.628`；CURRENT 已更新至 `v4-630`，BACK-SYSTEM-07C 转 `review / Current actor=规划对话`，FIFO238=`notification_pending`，FRONT/UI/TEST 继续 blocked。
- P1-1 根因：1754976020000 在 `strategy_runtime_impact_runs` 增加不可变 `snapshot_input` 与快照保护触发器。创建影响检查时在同一事务内持久化排序后的 company/asr cues、质量状态、视频时长、term evidence、project/session/episode/group/item 身份、候选/当前严格规则与 content digest；`snapshotDigest` 覆盖完整规范化输入。Worker 执行阶段不再查询 live pre-edit 表，只消费冻结 JSON。
- P1-2 根因：`claimImpact` 独立短事务处理 queued/过期 running，先把旧 running Attempt 终结为 unknown，再创建新 Attempt 与 30 秒租约并提交；评测在事务外执行，`finalizeImpact` 以 impactRunId+attemptId+lease owner+running 条件短事务写 succeeded/unknown。迟到旧 owner 无法覆盖新 owner 或已成功结果，受控异常的 Run/Attempt 均可 GET 为 unknown。
- 测试隔离：`pre-review.test.ts` 改为每次创建唯一临时 PostgreSQL、从零执行全部迁移、结束精确 DROP；不再读取/修改/清理默认 qimao_terms_cloud。runtime 测试同样使用隔离库，新增实时事实修改后快照不变、过期租约接管、受控异常 unknown 与迟到 finalize 保护回归。
- 新鲜验证：runtime + pre-review 同一组合命令 `2 files / 15 tests` 全通过且无 skipped；strategy + optimization `2 files / 7 tests` 全通过；contracts/backend build、`check:repo`、migration `node --check`、`git diff --check` 通过。曾有一次错误工作目录导致 vitest `MODULE_NOT_FOUND`，属于执行器路径错误，随后已在正确仓库目录重跑通过；无业务失败。
- PostgreSQL 55432 保持运行；所有临时数据库已 DROP，默认数据库未读取、未修改、未清理；未运行完整 `pnpm check`，未接真实 AI/网络/Secret/付费/云资源，未提交/推送/部署。

## 2026-08-18｜FIFO238 BACK-SYSTEM-07C Rev4 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO238-BACK-SYSTEM-07C-R4-V4.628`；`permission_ok`：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。CURRENT 已更新至 `v4-629`，FIFO238 active、BACK-SYSTEM-07C in_progress。
- 已重读 AGENTS、WORKFLOW v4.9、CURRENT v4-628、SYSTEM-policy-learning §10、DESIGN 5.17、Rev3 runtime service/worker/migration/tests。本轮冻结 Rev3 已通过部分，只修真实输入快照、分事务租约/接管/unknown 与精确隔离测试；FRONT/UI/TEST 继续 blocked。

## 2026-08-18｜FIFO237 规划退审，FIFO238 只收口固定快照与租约恢复

- 规划原样确认 `handoffToken=FIFO237-BACK-SYSTEM-07C-R3-V4.625`。代码核对确认 Rev3 已关闭版本级 runtime_status、严格 provenance、release 四项必填证据和正式 HTTP/Worker 正向链；这些通过项冻结，不再返工。
- P1-1 固定快照仍未成立：POST 的 snapshotDigest/coverage 只包含 `itemId/sessionId/episodeId`，没有冻结 cue、质量、术语证据、时长等实际输入；Worker 随后按 ID 重新读取 `pre_edit_items / groups / cues / episodes`，POST 后人工修改或撤销会改变同一 impactRun 的结果。
- P1-2 租约/unknown 仍未成立：`processImpact` 在一个事务中写 running Attempt、执行规则并 finalize；崩溃会把 claim 一并回滚。`listQueuedImpactIds` 只查询 queued，不会发现 lease 过期的 running；异常先 ROLLBACK 后更新刚刚回滚掉的 attemptId，无法证明持久 unknown。
- 新鲜验证：规划运行 runtime/strategy/optimization/pre-review 四文件，3 个策略文件 12 项通过；pre-review beforeAll 因默认本地库仍是旧版同名迁移结构，缺 `strategy_artifact_versions.runtime_status`，7 项全部 skipped，组合命令退出1。后端此前临时隔离库 7/7 证据不等于标准组合门可复现。
- FIFO238 只允许：同一未发布迁移内增加不可变 snapshot input（独立表或不可变 JSON，digest 覆盖实际输入）；claim 事务提交后再执行、finalize 按 owner/attempt 条件写入；claimable 同时发现 queued 与 lease 过期 running；失败/进程中断形成可查询 unknown/新 Attempt 接管且成功保护；测试全部使用精确隔离库，不读取/改造/清理默认业务库。补“POST 后修改实时表结果不变、过期 running 被新 Worker 接管、执行异常持久 unknown、成功不被旧 Worker 覆盖”回归。CURRENT 更新至 v4-628，FRONT/UI/TEST 继续 blocked。

## 2026-08-18｜FIFO237 BACK-SYSTEM-07C Rev3 完成并转 review

- 保留 `handoffToken=FIFO237-BACK-SYSTEM-07C-R3-V4.625` 与 permission fingerprint；CURRENT 已更新至 `v4-627`，任务转 `review / Current actor=规划对话`，FRONT/UI/TEST 继续 blocked。
- 真实 impact 链已改为事务内冻结独立 snapshotId/contentDigest/coverage/sampleRefs 后返回 queued；Worker 以独立 Attempt 取得有界租约，实际读取冻结样本并执行 `alignEpisode`、`effectiveSystemDecision`、`scanFormatIssues`，持久化字段差异、样本/影响/阻断计数与四项不变量；过期租约旧 Attempt 终结 unknown 后接管，失败结果脱敏为 unknown，成功结果受保护。
- 运行状态与 provenance 已落到不可变 `strategy_artifact_versions` 元数据：正文、身份、base/source/evaluation/candidate 摘要不可改，发布事务只推进 runtime_status/runtime_updated_at；system baseline 仍受保护。严格运行自定义版本必须经正式 HTTP 明确 baseVersionId + source，candidate 仍需 evaluationRunId/candidateDigest；运行模块从 artifact 的受控 runtime_module 目录读取，不建立第二正文表。
- release body 的 expectedPreviousStrategyVersionId、impactRunId、approvalId、contentDigest 全部必填并纳入规范化摘要；publish/rollback 在同一事务锁定唯一 active，重新核对 impact/四不变量/approval/内容摘要/旧未绑定可写会话 blocker，rollback 仅允许已批准或历史退役目标；history 现在逐版本返回 provenance、impact/approval 及发布/恢复事件链。
- 新鲜验证：精确隔离 PostgreSQL `system-control-strategy-runtime.test.ts` 5/5（含 queued→Worker 成功、正式基线/自定义版本 HTTP 链、rollback、跨 kind stable ID 并发无 500、历史空页 total）；`system-control-strategy.test.ts` 5/5；`system-control-strategy-optimization.test.ts` 2/2；单独临时隔离库 `pre-review.test.ts` 7/7；backend/contracts typecheck/build、`check:repo`、`node --check 1754976020000_create_system_strategy_runtime_control.cjs`、`git diff --check` 通过。此前默认库运行 pre-review 的 42703 是环境 schema 未重放本轮迁移（`runtime_status` 列缺失），已改用临时隔离库验证，临时库已精确 DROP，默认库未清理或重建。
- 未运行完整 `pnpm check`，未接真实 AI/网络/Secret/付费/云资源，未修改生产前端/DESIGN，未提交/推送/部署；本地 PostgreSQL 55432 保持 running。

## 2026-08-18｜FIFO237 BACK-SYSTEM-07C Rev3 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO237-BACK-SYSTEM-07C-R3-V4.625`；`permission_ok`：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，`permission_profile=workspace-write/:workspace`，`ordinary_writes=direct`（普通编辑不走 auto_review）。CURRENT 已更新至 `v4-626`，任务进入 `in_progress`。
- 已重读 AGENTS.md、WORKFLOW v4.9、CURRENT v4-625、SYSTEM-policy-learning §10、DESIGN 5.17、策略 runtime 契约/迁移/service/worker/tests；本轮只集中修真实固定快照 impact、版本级状态/provenance、发布强门及正式 HTTP/Worker 回归，不解锁 FRONT/UI/TEST。


## 2026-08-18｜FIFO236 规划退审，FIFO237 收口 Wave C 真实运行门

- 规划原样确认 `handoffToken=FIFO236-BACK-SYSTEM-07C-R2-V4.621`，新鲜运行 `system-control-strategy-runtime + pre-review` 为 `2 files / 11 tests` 全通过；通过结论只证明当前测试一致，不代表产品门已成立。
- P1-1 影子验证仍是同步假执行：`createImpact` 只统计未绑定会话、预填四项 pass/unknown 与字段差异，随后同一请求直接调用 `processImpact`；`processImpact` 只把 queued→running→succeeded，没有读取固定样本或执行 `alignEpisode / scanFormatIssues / effectiveSystemDecision`，独立 Worker 没有实际业务工作。
- P1-2 发布证据仍可绕过：共享 body 与 service 把 expected previous、impactRunId、approvalId、contentDigest 都定义为 optional；回归用 SQL 直插 approved artifact、succeeded impact 和 approval 后，发布/恢复又省略全部证据并期待 201。必须改为正式 HTTP+Worker 形成事实，发布/恢复四类身份全部必填并逐项核对。
- P1-3 状态所有者层级错误：`runtime_status` 放在 `strategy_artifacts`，history 也从 artifact 投影，无法正确表达同一 artifact 下多个不可变 version 各自 draft/approved/active/retired，可能让一个版本的批准状态被另一版本继承。运行状态必须属于 version 或只引用 version 的运行元数据。
- P1-4 正式 provenance 未闭合：严格 payload 可经 artifact create 直接创建无 `baseVersionId` 根版本；所谓“自定义严格版本只走正式 HTTP”回归没有证明基于 system baseline/已批准历史，也没有用正式链完成发布/回滚。正向产品回归不得再用 SQL 合成业务成功事实。
- FIFO237 只修上述同根问题：同一未发布迁移内重构；POST impact 只持久 queued 固定快照，租约 Worker/Attempt 实际执行规则并保存结构化结果；发布/恢复必填 expected active + impact + approval + contentDigest；版本级状态与完整历史链；正式基线派生自定义版本；补 blocker 变化、旧/新会话绑定、跨 kind 并发、unknown/接管/成功保护及空库清理。CURRENT 更新至 v4-625，FRONT/TEST 继续 blocked。

## 2026-08-18｜FIFO236 BACK-SYSTEM-07C Rev2 完成收口并转 review

- 原样保留 `handoffToken=FIFO236-BACK-SYSTEM-07C-R2-V4.621`；`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，`permission_profile=workspace-write/:workspace`，`ordinary_writes=direct`。CURRENT 已更新至 `v4-623`，`BACK-SYSTEM-07C Rev2=review / Current actor=规划对话`，FIFO236=`notification_pending`。
- 唯一数据所有者：删除运行正文第二表，`strategy_runtime_*` 只引用不可变 `strategy_artifact_versions`；system_baseline 通过正式 artifact/version 保存并受数据库保护。严格 `pre_review_local_rule_pack_v1` 载荷、范围校验、base/source/evaluation provenance 与版本详情已进入共享契约/HTTP/迁移，generic rules 仍仅作资料、不进入运行读取。
- 固定快照影响验证：ImpactRun 持久化 snapshot/contentDigest/coverage/字段差异/四项不变量与 queued→running→succeeded Attempt，开发 Worker 走同一 PostgreSQL；批准/发布在事务内复核 impact、approval、contentDigest、唯一 active、旧未绑定可写会话 blocker。发布与 rollback 共用稳定 command GET，历史版本保留，失败/冲突不移动旧 active。
- 新鲜验证：`system-control-strategy-runtime.test.ts` 4/4；`system-control-strategy.test.ts` 5/5；`pre-review.test.ts` 7/7；`system-control-strategy-optimization.test.ts` 2/2；contracts/backend typecheck、backend build、`check:repo`、`node --check 1754976020000_create_system_strategy_runtime_control.cjs`、`git diff --check` 全部通过。此前 42P08/22P02 失败属于实现层 PostgreSQL 参数/JSON 序列化错误，已删除临时 debug 并用单一参数化 SQL 修复，不是环境故障。
- 精确隔离迁移从零执行；默认本地 PostgreSQL 55432 保持 running（未删除 data），旧 `strategy_runtime_versions` 已无，impact 表当前业务行 0。未运行完整 `pnpm check`，未接真实 AI/网络/Secret/付费/云资源，未修改生产前端/DESIGN，未提交/推送/部署。


## 2026-08-18｜FIFO236 BACK-SYSTEM-07C Rev2 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO236-BACK-SYSTEM-07C-R2-V4.621`。
- `permission_ok`：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，`permission_profile=workspace-write/:workspace`，`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。
- 已按 v4.9 重读项目 AGENTS、WORKFLOW、CURRENT 最新快照、SYSTEM-policy-learning §10、DESIGN 5.17、UI 验收 §19、策略契约、Wave A/B 迁移与日志顶部；本轮只处理唯一 artifact/version 正文、严格运行载荷、真实固定快照 impact、发布并发与历史读取。
- 状态写回 `CURRENT v4-622`：`BACK-SYSTEM-07C Rev2=in_progress`、FIFO236=`active`；FRONT/TEST 继续 blocked，不改生产前端/DESIGN，不接真实 AI/网络/Secret/付费，不运行完整 `pnpm check`。

## 2026-08-18｜FIFO235 规划退审，FIFO236 集中修正 Wave C 权威链

- 规划原样确认 `FIFO235-BACK-SYSTEM-07C-R1-V4.614`，新鲜运行 `system-control-strategy-runtime + pre-review` 为 `2 files / 10 tests` 全通过；contracts/build/check 交付证据可复现，但当前测试没有覆盖正式产品闭环。
- P1-1 唯一数据所有者冲突：里程碑 10.3 明确规则正文继续由不可变 `strategy_artifact_versions` 拥有，Rev1 却新增 `strategy_runtime_versions.rule_pack` 第二权威正文；必须让运行控制表只引用现有 artifact version，受保护基线也作为正式 artifact/version 保存，不能复制第二份 JSON。
- P1-2 严格载荷与自定义版本缺失：新 schema 没有 `payloadType=pre_review_local_rule_pack_v1`，并把 `350 / 0.75 / 28` 写成 Literal/定值，且没有经正式 artifact/version API 创建自定义草稿；测试用 SQL 直接插入 `custom_draft` 与批准事实，不能作为正式链证据。必须通过既有版本 API 创建有界七字段不可变版本并保留 candidate/evaluation/content 身份。
- P1-3 影子验证名不副实：POST 只统计未绑定旧会话并计算摘要，没有固定输入快照身份、规则执行结果、当前→候选逐字段差异、影响/阻断计数或四项安全不变量，也没有 queued/running 的 Worker/Attempt 状态；不能支撑 UI 或批准安全门。
- P1-4 发布/历史/并发门未闭合：release 未在移动 active 前重新核对新鲜旧会话 blocker；四类命令使用不同 advisory lock 前缀，跨 command kind 复用同一全局 stable ID 仍可能竞态命中唯一约束；history 只返回版本摘要，缺少正式版本详情、批准与发布/恢复事件链。必须补正式 API 与并发/重启/unknown 回归。
- 必补证据：代码基线与导入 v1 的对齐/格式/决定/门禁黄金等价；基线数据库更新/删除拒绝；无 active 创建零副作用；自定义版本只走正式 HTTP；固定快照真实 impact；发布前 blocker 新鲜核对；发布只影响新会话、旧会话字节不变；回滚后新会话固定目标；同 ID 跨 kind 并发稳定 409；隔离空库迁移和清理为0。CURRENT 更新至 v4-621，FIFO236 ready，FRONT/TEST 继续 blocked。

## 2026-08-18｜FIFO235 BACK-SYSTEM-07C Rev1 完成并转 review

- handoffToken 原样保留：`FIFO235-BACK-SYSTEM-07C-R1-V4.614`；状态写回 `CURRENT v4-620`，任务为 `review / Current actor=规划对话 / Reviewer=规划对话`。
- 共享契约新增 `pre_review_local_rule_pack_v1` 严格七字段；运行控制迁移 `1754976020000_create_system_strategy_runtime_control.cjs` 只建结构，隔离空库业务行保持为 0，无 bootstrap。
- 后端新增唯一 Wave C runtime service/routes：baseline preview/import（受保护不可变完整载荷）、impactRun、approval、publish/rollback 共用 releaseCommandId + action 与同一 GET、history 分页；写命令均使用稳定身份、幂等键、请求摘要和事务锁，失败/冲突/未知不移动旧 active。
- 前置审改会话创建在同一事务锁定唯一 active 并固定 strategyVersionId/contentDigest；Worker 与人工 edit/undo/policy 均从绑定版本读取规则包，删除 `PRE_EDIT_ALGORITHM_VERSION` / `PRE_EDIT_FORMAT_POLICY_VERSION` 运行旁路；无 active 稳定 409 且零副作用。
- 新鲜验证：`system-control-strategy-runtime.test.ts` 3/3；`pre-review.test.ts` 7/7；`system-control-strategy.test.ts` 5/5；`system-control-strategy-optimization.test.ts` 2/2；隔离空库完整迁移含新迁移通过；contracts/backend typecheck、backend build、`check:repo`、`git diff --check` 通过。曾尝试的 `node --import tsx backend/src/database/migrate.ts` 因宿主 `uv_os_get_passwd ENOMEM` 失败，改用等价直接 node-pg-migrate runner 成功；该环境故障不影响产品验证。
- 八项差量包已准备唤醒规划；不通知 UI/FRONT/TEST，不运行完整 `pnpm check`，不接真实 AI/网络/Secret/付费/云资源，不提交/推送/部署。

## 2026-08-18｜FIFO234 规划有界复审通过并关闭

- 规划原样确认 `FIFO234-UI-SYSTEM-07C-R3-V4.614`，使用 Impeccable Operate/critique 的有界检查核对 DESIGN 5.17、UI 验收 §19、同一 ControlShell 原型及两张变化证据；没有重复完整矩阵或 detector。
- 用户可见 DOM 中 active/impact/blockers/origin/digest/release-command 六类工程词已归零，稳定 requestId 与版本/运行/命令短 ID 保留；`origin=system_baseline`、`impactRunId`、`releaseCommandId + action=publish|rollback` 只存在于跨角色工程注释，不进入生产文案。
- `strategy-wave-c-rev3-1440-chinese-copy.png` 的首次发布确认与 `strategy-wave-c-rev3-1024-chinese-copy.png` 的历史恢复页面均保持既有视觉/交互；1024 根宽和历史表容器内滚事实成立，无新增 P0/P1/P2/P3。
- CURRENT 更新至 v4-619：UI-SYSTEM-07C Rev3=`done`、FIFO234=`closed`；BACK-SYSTEM-07C Rev1 继续 `in_progress`，FRONT/TEST 仍等待正式契约，不因 UI 关闭提前解锁。

## 2026-08-18｜FIFO234 唤醒送达与规划新 turn 已确认

- 已只向规划固定任务发送携 `FIFO234-UI-SYSTEM-07C-R3-V4.614` 的八项差量包；发送接口成功。
- 规划已原样确认同一 handoffToken，并明确进入新的 Impeccable 有界复审 turn；送达与运行态均已确认。
- CURRENT 更新至 v4-618，FIFO234=`active`；UI 不自行 done，不通知或解锁 BACK/FRONT/TEST。

## 2026-08-18｜FIFO234 UI-SYSTEM-07C Rev3 中文微收口完成并进入 review

- 同一仓库外 `ui-system-07b-strategy-wave-b` 原型与用户可见验收文案已统一显示“当前生效、影子影响验证、未完成旧会话、来源、内容摘要、发布/恢复命令”；稳定 requestId、版本/运行/命令短 ID 保留，工程交接注释仍保留准确 API 身份。
- 仅新增 `strategy-wave-c-rev3-1440-chinese-copy.png` 与 `strategy-wave-c-rev3-1024-chinese-copy.png` 两张最小变化证据；没有重跑 Rev2 完整矩阵，也没有改变业务状态、交互链、布局或视觉方向。
- 本地系统 Chrome 有界检查：用户可见 DOM 六类原始工程词命中 0；1024 根宽 `1024/1024`、历史表容器 `1180/914`，console error/warn=`0/0`；`node --check app.js/serve.mjs` 与临时复核脚本通过，临时脚本已删除，43219 无监听。
- Impeccable detector 本轮唯一运行进入 degraded regex 模式，原因是宿主缺少 `htmlparser2/css-select/css-tree/domutils`；输出 `[]` 未冒充完整解析器无缺陷。生产 system-frontend/frontend/backend/contracts/migrations 修改0。
- CURRENT 更新至 v4-617：`UI-SYSTEM-07C Rev3=review`、FIFO234=`notification_pending`；下一步仅携同一 handoffToken 唤醒规划，未通知 BACK/FRONT/TEST。

## 2026-08-18｜FIFO235 BACK-SYSTEM-07C Rev1 领取并进入 in_progress

- 原样回显 handoffToken：`FIFO235-BACK-SYSTEM-07C-R1-V4.614`。
- permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，`permission_profile=workspace-write/:workspace`，`ordinary_writes=direct`（普通仓库编辑不走 auto_review）。
- 已完整重读项目 AGENTS.md、WORKFLOW v4.9、CURRENT 最新快照、SYSTEM-policy-learning §10、INT-14、DESIGN 5.17、UI 验收 §19 与本日志顶部。
- 本轮范围固定为 SYSTEM-07C Wave C：严格 pre_review_local_rule_pack_v1、受保护不可变 system_baseline、impact/批准/发布/恢复、唯一 active、前置审改会话绑定与旧运行旁路删除；不改生产前端/DESIGN、不接真实服务、不运行完整 pnpm check。

## 2026-08-18｜FIFO234 UI-SYSTEM-07C Rev3 员工可见中文微收口领取

- 原样回显 `FIFO234-UI-SYSTEM-07C-R3-V4.614`；repo_root=`C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，permission_profile=`workspace-write`，ordinary_writes=`direct`。CURRENT 更新至 v4-615，FIFO234=`active`、UI=`in_progress`。
- 本轮只把仓库外同壳原型与用户可见验收文案中的 active/impact/blockers/origin/digest/release-command 替换为准确中文；工程交接注释保留稳定 API 身份，requestId 与诊断短 ID 不删。
- 不改业务状态、API 身份、交互链、布局、视觉方向或 Rev2 已通过矩阵；生产 system-frontend/frontend/backend/contracts/migrations 修改0，不启动 FRONT/TEST。

## 2026-08-18｜FIFO233 规划复审通过，UI 文案与 BACK-SYSTEM-07C 受控并行

- 规划原样确认 `FIFO233-UI-SYSTEM-07C-R2-V4.610` 并核对 DESIGN 5.17、UI 验收 §19.5、同一 ControlShell 原型及四张 1440/1024 证据：基线可直接 impact→批准→首次发布，自定义草稿为并列动作；impactRunId 与单一 releaseCommandId/action 已统一；不存在的旧会话绑定路径已删除；1024 根与宽表容器滚动、Modal/unknown/成功焦点证据成立。四项 P1 关闭。
- Impeccable 视觉复审发现非阻塞 P2：原型生产可见区域仍出现 active、impact、blockers、origin、digest、release-command 等工程词。FIFO234 仅替换为“当前生效、影子影响验证、未完成旧会话、来源、内容摘要、发布/恢复命令”等准确中文，不改布局、状态、API 或业务语义。
- 权限合同统一为 `system-control:strategy:read/write/evaluate/approve/release`；BACK-SYSTEM-07C 同一切换任务删除现有无前缀 `strategy:evaluate` 字符串，不保留兼容别名。
- CURRENT 更新至 v4-614：FIFO233 关闭；UI-SYSTEM-07C Rev3 文案微收口与 BACK-SYSTEM-07C Rev1 文件不重叠，可受控并行；FRONT/TEST 继续 blocked，等待正式契约与最终 UI 证据。

## 2026-08-18｜FIFO233 UI-SYSTEM-07C Rev2 集中定向修正领取

- 原样回显 `FIFO233-UI-SYSTEM-07C-R2-V4.610`；permission_ok=`workspace-write/:workspace`，ordinary writes=direct。CURRENT 更新至 v4-611，FIFO233=`active`、UI-SYSTEM-07C=`in_progress`。
- 本轮只修正基线首发状态链、统一 impact/release 权威身份、删除不存在的旧会话绑定伪路径、补同一 strategy 原型的三类高保真状态，并精确化五项 capability；不重做 ControlShell/Wave B/视觉方向。
- 允许修改 DESIGN 5.17、UI 验收、CURRENT/日志及仓库外既有 strategy 原型/脱敏证据；生产 system-frontend/frontend/backend/contracts/migrations 修改0，BACK/FRONT/TEST 继续 blocked。
- DESIGN/UI 验收已统一：系统基线可直接 impact→人工批准→首发，自定义草稿为并列可选；验证身份仅 `impactRunId`，发布/恢复仅 `releaseCommandId + action=publish|rollback` 与同一 GET；首次发布 blocker 只来自服务端，唯一恢复为先按现有工作流完成旧会话。
- 同一 `ui-system-07b-strategy-wave-b` 原型已补真实 DOM 主链、历史比较/恢复、pending/unknown/冲突/焦点和 1440/1024；四张脱敏证据写入既有 evidence。系统 Chrome 复核根宽 1024/1024、表容器 1180/914、console 0/0，node check 与授权文档 diff-check 通过。
- Impeccable context/Operate/critique/craft-floor 已使用；detector 因宿主缺少 HTML parser 模块进入 degraded regex 模式，结果 `[]`，未冒充完整解析器无缺陷。临时 harness 已删除，43218 无监听。CURRENT 更新至 v4-612，UI=`review`、FIFO233=`notification_pending`。
- 已只向规划固定任务发送携同一 handoffToken 的八项差量包；规划原样确认令牌并进入新 turn，正在复核文档、原型 DOM 与证据。CURRENT 更新至 v4-613，FIFO233=`active`；未通知或解锁 BACK/FRONT/TEST。

## 2026-08-18｜FIFO232 规划退审，FIFO233 合并四项 Wave C 设计缺口

- 规划原样确认 `FIFO232-UI-SYSTEM-07C-R1-V4.606`，使用 Impeccable Operate/critique 框架交叉核对 DESIGN 5.17、UI 验收 §19、SYSTEM-policy-learning §10 与现有 Wave B 契约；历史基线、严格七字段、人工批准、active 不移动、异步写锁和双视口方向正确。
- P1-1：当前状态表要求基线导入后先复制严格字段草稿，导致受保护基线本身从未经过验证/批准/首发，却又能成为恢复目标。修正为系统基线可直接执行 impact、人工批准和首次发布；基于基线新建自定义草稿是并列可选动作，不创建重复基线版本。
- P1-2：规划 API 已统一 `impactRunId` 与单一 `releaseCommandId + action=publish|rollback`，UI 文档却混用 `shadowRunId/restoreCommandId`。必须统一稳定身份，用户文案可称“影子验证/恢复命令”，但不得形成第二套后端命令或恢复端点。
- P1-3：首次发布阻断说明提到“已有受控流程显式绑定旧会话”，当前没有该正式 API。必须删除伪恢复路径，仅展示服务端 blockers，并要求先按现有工作流完成旧会话；页面不提供绕过或临时绑定。
- P1-4：本轮新增完整高风险流程但没有同状态原型/截图，前端无法执行 v4.9 高保真门。FIFO233 只在同一既有 strategy 原型补基线首发、历史比较/恢复及 1024 定向证据，不重做 ControlShell 或 Wave B。
- 同轮收口权限文档：沿用现有 `system-control:strategy:read/write`、`strategy:evaluate`，新增 `strategy:approve/release`；不得写成含混的 read/write/publish 单权限。
- CURRENT 更新至 v4-610：FIFO232 关闭，`UI-SYSTEM-07C Rev2` 以 FIFO233 定向返工；BACK/FRONT/TEST 继续 blocked。

## 2026-08-18｜FIFO232 UI-SYSTEM-07C Rev1 领取并冻结 Wave C 设计

- 原样回显 `FIFO232-UI-SYSTEM-07C-R1-V4.606`；permission_ok=`workspace-write/:workspace`，ordinary writes=direct。CURRENT 更新至 v4-607，FIFO232 active，UI-SYSTEM-07C in_progress。
- 使用 Impeccable 的 Operate/shape/craft-floor 约束，在既有 ControlShell `/strategy` 内冻结基线导入、固定快照影子验证、批准、发布、历史与人工恢复；生产代码修改0。
- 用户新增硬要求已落盘：`origin=system_baseline` 为受保护、不可更新/删除的永久数据库历史；删除的只是硬编码/default/static/nullable-version 运行旁路。恢复创建新命令/审计并只移动唯一 active pointer。
- DESIGN 5.17 与 UI 验收 §19 已补齐严格七字段、只读安全不变量、首次发布旧会话硬门、release/restore unknown 同命令查询、确定冲突、全写锁、焦点闭环及 1440/1024 专属覆盖合同；未创建第二套外壳或规则编辑器。
- Impeccable detector 唯一运行结果 `[]`；`git diff --check` 通过。CURRENT 更新至 v4-608，UI-SYSTEM-07C=`review`、FIFO232=`notification_pending`，等待正式唤醒规划。
- 已只向规划固定任务发送携同一 handoffToken 的八项差量包；规划原样确认令牌并进入新的交叉审核 turn。CURRENT 更新至 v4-609，FIFO232=`active`；未通知 BACK/FRONT/TEST。

## 2026-08-18｜用户确认 SYSTEM-07C，并要求默认基线可历史恢复

- 用户确认 Wave C 推荐方案，并明确默认规则不能随旧运行路径一起删除：需要长期进入历史，出现缺陷时可查询并人工恢复。
- 规划将语义冻结为“保留历史基线、删除运行旁路”：显式导入的 `origin=system_baseline` 版本完整保存结构化载荷、digest、确认人与发布/回滚事件，受保护且不可更新/删除；管理员可选择该基线或任一已批准历史版本创建新的恢复命令。
- 恢复只移动 PostgreSQL 唯一 active pointer，只影响新建会话，历史会话、版本和事件不改写；代码内基线清单仅用于首次导入预览和灾难恢复核对，运行时不得直接兜底读取。
- CURRENT 更新至 v4-606：`PLAN-SYSTEM-07C Rev1` 关闭，`UI-SYSTEM-07C Rev1` 使用 `FIFO232-UI-SYSTEM-07C-R1-V4.606` 解锁。UI 只冻结同一 ControlShell 下的基线导入、影子验证、批准、发布、历史和手动恢复体验；BACK/FRONT/TEST 继续 blocked。

## 2026-08-18｜PLAN-SYSTEM-07C 首模块启动包进入用户评审

- SYSTEM-07B 的正式 Chrome 全链、P0/P1/P2/P3=0、38 files / 355 tests 完整质量门已独立关闭；本轮没有继续修改生产代码或提前唤醒执行角色。
- 规划核对当前前置审改运行规则：350ms 近邻、0.75 相似度、28 字及格式门禁仍由 `pre-review.domain.ts` 代码常量拥有；策略库现有 `local_rule_pack` 是任意 pattern/replacement 草稿结构，不能安全直接执行为生产规则。
- `docs/milestones/SYSTEM-policy-learning.md` 新增 §10 v4.9 启动包：首模块只接 `pre_review`，新增判别明确的 `pre_review_local_rule_pack_v1` 严格载荷；安全门保持只读不变量，不开放任意正则、脚本或浏览器本地规则。
- 冻结建议包含显式基线预览/确认导入、固定快照零网络影子评测、人工批准、唯一 active pointer、发布/回滚稳定命令、unknown 同身份 GET、无 active 零副作用阻断、首次发布前未绑定可写会话硬阻断，以及同任务删除硬编码/default/static/nullable-version 运行回退。
- CURRENT 更新至 v4-605，`PLAN-SYSTEM-07C Rev1` 转 `review / Current actor=用户`。依 AGENTS 用户评审门，当前不解锁 UI/BACK/FRONT/TEST，不接真实 AI/Secret/网络/付费/云资源。

## 2026-08-18｜FIFO231 规划关闭 SYSTEM-07B，完整质量门通过

- 规划原样确认 `FIFO231-TEST-SYSTEM-07B-R1-V4.601` 并独立核对 `docs/testing/SYSTEM-policy-learning-integration-report.md`：正式 Fastify、production `system-frontend/dist`、精确隔离 PostgreSQL 34 migrations、零网络 Worker、系统 Chrome 1440/1024、逐请求权限、A/B 隔离、unknown 恢复、候选/离线评测、Wave C 锁和受控 503 恢复均有新鲜证据；P0/P1/P2/P3=0。
- 清理事实成立：隔离库已 DROP，32160/32161 无监听，临时 harness 已删除，测试 Chrome/Fastify/代理已关闭；共享 PostgreSQL 55432 保持 running，生产代码修改0。
- 规划运行本切片唯一完整 `pnpm check`，退出码0：仓库边界、lint、四工作区 typecheck、数据库 setup/migrate、Vitest 38 files / 355 tests、contracts/backend/system-frontend/frontend 构建全部通过；仅保留既有前端大 chunk 非阻断警告。
- CURRENT 更新至 v4-604：FIFO231、FRONT-SYSTEM-07B、TEST-SYSTEM-07B 正式关闭；管理员策略学习 Wave A/B 闭合。下一步进入已确认 Wave C 顺序的首模块启动预检，未解锁真实 AI/Secret/网络/付费/云资源。

## 2026-08-18｜FIFO231 TEST-SYSTEM-07B Rev1 完成全链验收并转 review

- 同一 `handoffToken=FIFO231-TEST-SYSTEM-07B-R1-V4.601` 下，正常 Windows 用户上下文执行既有 `node node_modules/tsx/dist/cli.mjs tests/integration/fifo231-system-07b-harness.ts`；34 migrations、正式 Fastify、生产 system-frontend build、零网络 Worker、A/B 匿名项目与系统 Chrome 1440/1024 全链通过。
- API 权限：anonymous/employee/missing capability=403，reader=200，write-only 读取=403，owner 创建 A/B=202；幂等冲突稳定409；unknown 只 GET 同 runId，POST 计数1；员工 frontend 管理入口/策略 API 静态匹配0。
- Chrome：1440 根无横溢（1440/1440）、表容器1148/1148；1024 根无横溢（1024/1024）、表容器1040/876（仅容器内滚）；两视口 console error/warn=0/0；候选编辑→驳回→恢复→送评测、Wave C 锁定和 modal/Escape 焦点通过；受控503/requestId/retryable 唯一重读恢复。
- 质量门：P0/P1/P2/P3=0/0/0/0，无 QA-SYSTEM-07B-*。专项 3 files/20 tests、backend build、system-frontend typecheck/build（40 modules）均通过；完整 pnpm check 留规划关闭门。
- 首次受限上下文原样失败 `uv_os_get_passwd returned ENOMEM (not enough memory)`，未越过副作用；按规划边界使用同一命令/同一 harness/同一 PostgreSQL 在正常上下文重跑成功。其间仅修正测试夹具选择器与双视口重复状态，未改生产代码。
- 精确清理：隔离 DB DROP、32160/32161 无监听、Fastify/静态代理/测试 Chrome 关闭、临时 harness 删除；共享 PostgreSQL 55432 保持 running。报告已写入 `docs/testing/SYSTEM-policy-learning-integration-report.md`，CURRENT v4-603 已转 `review / Current actor=规划对话`，FIFO231=`notification_pending`，待正式唤醒规划。

## 2026-08-18｜FIFO231 TEST-SYSTEM-07B Rev1 领取并进入 in_progress

- 原样回显 handoffToken：`FIFO231-TEST-SYSTEM-07B-R1-V4.601`。
- `permission_ok`：repo_root=`C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`；workspace root 含 `C:\Users\ComradeGu\Documents\七猫兼职`；permission_profile=`managed/workspace-write`；ordinary writes=direct，不走 `auto_review`。
- 共享 PostgreSQL `127.0.0.1:55432` 已确认 accepting，按要求不重启、不清空、不改写；本轮仅创建精确隔离数据库、临时端口与测试 Chrome。
- 允许范围冻结为 `docs/testing/SYSTEM-policy-learning-integration-report.md`、必要 `tests/integration/`/`tests/e2e/` harness、CURRENT/本日志和仓库外脱敏证据；生产 `frontend/system-frontend/backend/contracts/migrations/DESIGN` 修改 0，不接真实 AI/Secret/网络/付费/云资源。
- FIFO231 已写为 `active`，`TEST-SYSTEM-07B` 已写为 `in_progress / Current actor=全链测试与质量验收对话`；开始执行 Wave B 正式服务端/Worker/生产构建及系统 Chrome 双视口全链矩阵。

## 2026-08-18｜FIFO230 未闭合审计，真实浏览器矩阵并入 FIFO231 全链测试

- 规划原样确认 `FIFO230-FRONT-SYSTEM-07B-R3-V4.598`：PostgreSQL 恢复后策略前端+后端优化专项 2 files / 15 tests 全绿，FIFO227 hook 超时与 FIFO228 数据库前置阻断均消失；生产代码修改0、共享55432保持running。
- 未闭合原因不是新的环境错误或产品缺陷，而是 UI 固定任务本轮只运行自动矩阵，没有启动其已设计的 TypeScript harness/Playwright/system Chrome 主链，因此没有 1440/1024、焦点和 console 新鲜证据。该交接不能冒充 UI 通过，但继续向同一任务重复派发没有新增收益。
- CURRENT 更新至 v4-601。FIFO231 使用 `FIFO231-TEST-SYSTEM-07B-R1-V4.601` 解锁全链测试固定任务：沿冻结 UI 验收与既有 Playwright/system Chrome 能力，一次完成 production build + Fastify + 精确隔离 PostgreSQL + 零网络 Worker + 真实浏览器完整矩阵；同时承担独立集成关闭证据，不修改生产代码。
- TEST 必须覆盖 Wave B 主链、全部 unknown/冲突/迟到响应/写锁、逐请求权限、两站隔离、CNY/requestId、1440/1024、宽表、Modal/抽屉/恢复块焦点和 console 0/0，并精确清理隔离资源；发现产品缺陷只形成 QA 包交规划，不自行修复。

## 2026-08-18｜FIFO230 FRONT-SYSTEM-07B Rev3 正式 UI 全矩阵领取

- 原样回显 `FIFO230-FRONT-SYSTEM-07B-R3-V4.598`；permission=`workspace-write/:workspace`，ordinary writes=direct。CURRENT 更新至 v4-599，FIFO230 active，任务 in_progress。
- 复用单一 TypeScript harness、既有 Playwright/系统 Chrome；共享 PostgreSQL 55432 保持 running，不先重启，不新增依赖/loader/shim/fallback/第三路径。
- PostgreSQL 前置恢复后，新鲜策略前端+后端优化专项 2 files / 15 tests 全通过（hookTimeout 30s）；历史/创建/decision/evaluation unknown、权限与服务端链均恢复为绿。
- 本轮未形成新的系统 Chrome 主链、1440/1024、焦点与 console 证据，故未把自动矩阵冒充正式 UI 完成。CURRENT 更新至 v4-600，任务 review/规划、FIFO230 notification_pending；生产代码0，共享55432保持running。

## 2026-08-18｜FIFO229 规划微审关闭，FIFO230 恢复 SYSTEM-07B 正式 UI 终验

- 规划独立核对 FIFO229：`tools/local-postgres.mjs` 只把唯一 `logPath` 从含中文仓库 `.local` 移至既有纯 ASCII `postgresStateRoot`，没有第二日志路径、环境变量、fallback、数据目录或数据库身份变化。
- 新鲜独立复验：`node --check tools/local-postgres.mjs` 通过；`pnpm db:status` 通过；`pg_isready 127.0.0.1:55432` 返回 accepting。结合 Owner 的首次/二次幂等 `db:start` 证据，`BACK-ENV-POSTGRES-01 Rev1` 与 FIFO229 关闭，55432 保持 running。
- CURRENT 更新至 v4-598。FIFO230 使用 `FIFO230-FRONT-SYSTEM-07B-R3-V4.598` 路由 UI：复用既有 Playwright + 系统 Chrome 与同一 TypeScript harness，在已恢复的 PostgreSQL 上运行 production build + Fastify + 精确隔离库完整矩阵；不得新增依赖、loader、shim、fallback 或第三工具链，不改生产代码。
- 正式矩阵必须覆盖 Wave B 主链、历史与新建 unknown 的同身份只读恢复、确定冲突、候选/评测异步身份、身份切换迟到响应、逐请求权限与两站隔离、1440/1024、模态/抽屉焦点、pending 写锁、console 0/0 和精确清理。UI 通过前 TEST 继续 blocked。

## 2026-08-18｜FIFO229 BACK-ENV-POSTGRES-01 Rev1 完成并转 review

- `tools/local-postgres.mjs` 唯一修正：`logPath` 从仓库 `.local/postgres.log` 移到既有 ASCII 状态根 `C:\tmp\qimao-terms-cloud-postgres-18.4\postgres.log`；未新增环境变量、fallback、第二日志路径、第二数据库或数据迁移。
- 首次 `pnpm db:start` 的真实失败为已确认项目 runtime 孤儿子进程 `PID 43296` 占用共享内存；ASCII 日志记录 `pre-existing shared memory block is still in use`，精确停止该单一进程后未触碰 data。
- 新鲜验证：`node --check tools/local-postgres.mjs` 通过；原有 `pnpm db:start` 成功；`pnpm db:status` 通过；`pg_isready 127.0.0.1:55432` 返回 accepting；再次 `pnpm db:start` 幂等成功。实际启动日志位于 ASCII state root，仓库 `.local/postgres.log` 未作为启动目标。
- PostgreSQL 55432 按交接要求保持 running；FIFO229 状态转 `review / Current actor=规划对话 / Reviewer=规划对话`，仅交规划，不通知 UI/FRONT/TEST。

## 2026-08-18｜FIFO229 BACK-ENV-POSTGRES-01 Rev1 领取并进入 in_progress

- 原样回显 handoffToken：`FIFO229-BACK-ENV-POSTGRES-01-R1-V4.595`。
- `permission_ok`：repo root=`C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，workspace root 含 `C:\Users\ComradeGu\Documents\七猫兼职`，permission profile=`workspace-write/:workspace`，普通仓库写入直连且不走 `auto_review`。
- 唯一范围：将 `tools/local-postgres.mjs` 的 PostgreSQL 启动日志从含中文仓库 `.local` 移到既有纯 ASCII `C:\tmp\qimao-terms-cloud-postgres-18.4` 状态根；不改 data、不建第二数据库、不新增环境变量/fallback/兼容路径，不运行完整 `pnpm check`。

## 2026-08-18｜FIFO228 根因收敛为 PostgreSQL 非 ASCII 日志路径

- 规划原样确认 `FIFO228-FRONT-SYSTEM-07B-R3-V4.591`：正常用户上下文 `tsx 4.23.12 / Node 24.19.0` 已通过；两次 harness 均未进入首个可观察副作用，UI environment_blocked 与零产品缺陷结论成立。
- 读取已删除 harness 的权威 diff 后确认其第一条副作用是连接 55432 执行 `DROP DATABASE`。新鲜 `pg_isready` 返回 no response；提升视图确认项目本地 PID 36336 占用 55432 但不接受连接，项目 `db:status/db:stop` 均判定未运行。规划在两次安全门后精确停止该单一挂死进程，未删除数据文件或触碰外部数据库。
- 项目原有 `pnpm db:start` 随后稳定失败：`pg_ctl` 无法打开含中文仓库路径 `.local/postgres.log`，路径在原生输出中已乱码；数据与 runtime 虽已按工具注释放到 `C:\tmp\qimao-terms-cloud-postgres-18.4`，但 `logPath` 仍使用仓库 `.local`，形成唯一根因。纯 ASCII 日志路径是现有设计的一致性修正，不是 fallback 或第二数据库。
- CURRENT 更新至 v4-595。FIFO229 使用 `FIFO229-BACK-ENV-POSTGRES-01-R1-V4.595` 路由后端：只修改 `tools/local-postgres.mjs` 的唯一日志路径及必要最小回归/状态日志；验证 node check、db:start/status、pg_isready。UI/TEST 不提前动作。

## 2026-08-18｜FIFO228 FRONT-SYSTEM-07B Rev3 正式 UI 终验恢复领取

- 原样回显 `FIFO228-FRONT-SYSTEM-07B-R3-V4.591`；permission fingerprint=`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`，ordinary writes=direct。CURRENT 更新至 v4-592，FIFO228=`active`，任务=`in_progress`。
- 仅在启动 FIFO227 同一 TypeScript harness 时使用规划已验证、用户已授权的正常 Windows 用户上下文；不改全局配置、依赖、生产代码，不新增 loader/shim/fallback/第三工具链。其余完整矩阵与精确清理要求不变。
- 正常上下文 `pnpm exec tsx --version` 新鲜通过（tsx 4.23.12 / Node 24.19.0），但同一 harness 两次均在首个数据库/端口副作用前持续无输出；两次均中止，未改路径、未 fallback。正式 UI 终验继续 environment_blocked。
- 精确清理核对：目标库残留0、32150/32151无监听、临时 harness/Playwright 脚本删除、无测试 Chrome。CURRENT 更新至 v4-593，FIFO228=`notification_pending`，任务转 review/规划。
- 已只向规划固定任务发送同一令牌八项包；`read_thread` 确认规划 in-progress 新 turn 出现完整 FIFO228 交回。CURRENT 最小递增至 v4-594、FIFO228=`active`；未通知 FRONT/BACK/TEST。

## 2026-08-18｜FIFO227 归因完成，FIFO228 使用正常 Windows 用户上下文

- 规划原样确认 `FIFO227-FRONT-SYSTEM-07B-R3-V4.587`：production build 40 modules、前端策略 13/13 与 Playwright/Chrome 能力成立；正式页面未启动，故 environment_blocked 结论正确，产品 P0/P1/P2/P3 仍无新增事实。
- 进程审计发现 6 个早于本轮、无监听端口的 Volta Node 残留和 2 个当前 Codex runtime Node。按用户既有授权精确停止前 6 个并保留后 2 个；清理后 `pnpm exec tsx --version` 在受限身份仍稳定返回同一 `uv_os_get_passwd ENOMEM`，排除物理内存与 Node 泄漏根因。
- 纯 Node 导入 `backend/dist/server.js` 因工作区 contracts 正式 exports 仍指向 TypeScript 源而不可运行，不能用第二启动路径替代。随后在正常 Windows 用户上下文运行完全相同的 `pnpm exec tsx --version`，新鲜成功返回 `tsx v4.23.12 / node v24.19.0`；根因确认为受限执行身份的 `os.userInfo()`，不是项目代码。
- CURRENT 更新至 v4-591。FIFO228 使用 `FIFO228-FRONT-SYSTEM-07B-R3-V4.591` 重派 UI：只允许现有 tsx harness 的启动命令使用已验证正常用户上下文；不得新增依赖、loader、shim、fallback、第三工具链或改生产代码。完整 UI 矩阵与精确清理要求沿 FIFO227。

## 2026-08-18｜FIFO227 FRONT-SYSTEM-07B Rev3 正式 UI 终验重派领取

- 原样回显 `FIFO227-FRONT-SYSTEM-07B-R3-V4.587`；permission fingerprint=`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`，ordinary writes=direct。CURRENT 更新至 v4-588，FIFO227=`active`，FRONT-SYSTEM-07B Rev3=`in_progress`。
- 能力预检确认本机已有 Playwright runtime，系统 Chrome=`C:\Program Files\Google\Chrome\Application\chrome.exe`；不新增依赖、不改全局配置、不调用故障中的 Codex Browser/Chrome 扩展服务，不自造第三套工具链。
- 本轮仅写 docs/ui 验收、CURRENT/日志与仓库外脱敏证据；生产 frontend/system-frontend/backend/contracts/migrations/DESIGN 修改0。不重复 Impeccable，不运行完整 `pnpm check`。
- 新鲜构建：system-frontend 40 modules、backend build 通过。策略前端 13/13；后端策略专项在 beforeAll/afterAll 10 秒门超时，合并结果 13 passed / 2 skipped，未冒充 15/15。
- 唯一直接 `node node_modules/tsx/dist/cli.mjs` harness 在创建库/端口前失败，原样首因 `uv_os_get_passwd returned ENOMEM (not enough memory)`；按禁止 loader/fallback/第三套工具链的边界停止，正式页面未打开，完整 UI 终验仍 environment_blocked。
- 清理核对：FIFO227 专库及 `qimao_strategy_opt_%` 残留 0，32140/32141 无监听，临时 harness/Playwright 脚本删除，无本轮浏览器进程。CURRENT 更新至 v4-589，任务转 review/规划，FIFO227=`notification_pending`。
- 已只向规划固定任务发送同一令牌八项包；`read_thread` 确认规划 in-progress 新 turn 出现完整 FIFO227 交回。CURRENT 最小递增至 v4-590、FIFO227=`active`；送达/规划新 turn 已确认，未通知 FRONT/BACK/TEST。

## 2026-08-18｜Browser 组件限制后置，FIFO227 改用本地真实浏览器矩阵

- 用户确认“如果不可行按推荐方案继续”。规划随后显式验证 Chrome 扩展通道；它仍在页面选择前返回与内置 Browser 完全相同的 `browser-service.mjs` 可信路径拒绝，证明两个外壳共用同一故障底层，继续切换插件或追加配置没有收益。
- `ENV-BROWSER-01 Rev3` 以诊断完成关闭：该限制属于 Codex Browser 组件，不属于项目、账号、权限、Fastify、PostgreSQL 或协作链。保留已授权的精确配置，不改哈希、不再扩大受信目录、不使用 loader/fallback。
- CURRENT 更新至 v4-587。FIFO227 使用 `FIFO227-FRONT-SYSTEM-07B-R3-V4.587` 路由 UI Reviewer：复用项目既有本地 Playwright/系统 Chrome 能力，运行 production build + Fastify + 精确隔离 PostgreSQL 的完整 Wave B 矩阵；必须覆盖主链、unknown/确定冲突、身份切换/迟到响应、权限/两站隔离、1440/1024、焦点、写锁、console 和精确清理。不得改生产代码、降低矩阵、伪造业务事实或接真实付费资源。

## 2026-08-18｜二次重启探针通过，Browser 组件仍阻断

- 完整重启后，规划先重读 CURRENT 与四个固定任务；四任务均为空闲、上一 turn 已完成。随后发送 `COORD-RESTART-20260818B-UI/BACK/FRONT/TEST` 四路只读探针，UI、后端、前端、测试均回执 `workspace-write`、普通仓库写入可用、send/read/wait 可用，并主动向规划产生新 turn；协作链路恢复正常。
- 在同一全新应用会话中按 Browser 官方 skill 使用绝对插件路径初始化默认浏览器，仍稳定返回 `Trusted RPC dependency must resolve within a configured trusted code path: .../browser-service.mjs`。因此已授权补回的顶层精确 `NODE_REPL_TRUSTED_CODE_PATHS` 并未被当前 Browser 运行层采纳；不是项目代码、固定任务权限、账号协作或旧进程残留导致。
- 按根因停止条件不再叠加第三条配置、不改浏览器哈希、不建立 loader/fallback，也不把未打开页面冒充 UI 终验。CURRENT 更新至 v4-586，`ENV-BROWSER-01 Rev3=blocked / Current actor=用户`；`FRONT-SYSTEM-07B Rev3` 继续 review、`TEST-SYSTEM-07B` 继续 blocked。下一步只在“改用另一正式浏览器验收面”或“等待 Codex Browser 组件修复”之间裁决。

## 2026-08-18｜Browser 精确受信路径已获授权补回

- 用户明确回复“明确授权修改”。规划仅在 `C:\Users\ComradeGu\.codex\config.toml` 的 `[shell_environment_policy.set]` 下补回与 MCP 环境相同的 `NODE_REPL_TRUSTED_CODE_PATHS`，范围严格为 `C:\Users\ComradeGu\.codex` 与当前 runtime `...\2fb562745e6d66f0\bin\node_modules`。
- 校验结果：顶层片段与预期一致；全文件该键恰好 2 处（shell policy 与 MCP env 各一处）；`model_provider=openai`、`model=gpt-5.6-terra` 未变，浏览器客户端哈希和其他配置未改。
- CURRENT 更新至 v4-585；`ENV-BROWSER-01 Rev2` 仍由用户持有重启门。完整重启 Codex 后先运行最小 Browser 初始化；成功后关闭环境任务并重派 UI 正式 Wave B 完整终验。

## 2026-08-18｜重启后四角色探针通过，Browser 配置授权门

- 四固定任务在 Codex 重启后均从 `notLoaded` 被真实消息唤醒并主动回流：`COORD-RESTART-20260818-UI/BACK/FRONT/TEST` 四个 `restart_wake_ok` 全部到达规划新 turn；send/read/wait 可用，协作链路恢复正常。
- 当前规划任务的全新 Browser/Node REPL 进程仍稳定复现 `Trusted RPC dependency must resolve within a configured trusted code path: .../browser-service.mjs`，因此排除旧进程残留与项目运行环境，根因收敛为全局配置的外层受信路径缺项。
- 本机 `config.toml` 的 `[mcp_servers.node_repl.env]` 已有精确 `NODE_REPL_TRUSTED_CODE_PATHS`，但 `[shell_environment_policy.set]` 只剩浏览器客户端哈希；拟最小补回同一条精确路径，不改哈希、不新增目录、不改模型/provider。因该动作属于全局安全设置，未获用户明确授权前保持零修改。
- CURRENT 更新至 v4-584：`ENV-BROWSER-01 Rev2=blocked / Current actor=用户`；FRONT Rev3 review 与 TEST blocked 不变。用户授权后仅修改一行全局配置、完整重启 Codex、先跑最小探针，通过才重派 UI 完整终验。

## 2026-08-18｜Codex 重启后恢复门

- 用户完整重启 Codex 后回复“继续”。规划按 v4.9 先读取 CURRENT 与 UI/后端/前端/测试四个固定任务：四者均为 `notLoaded`，各自最新 turn=`completed`，证明旧执行进程已退出且不存在业务幽灵任务。
- CURRENT 更新至 v4-583，`ENV-BROWSER-01 Rev2=in_progress`。下一步仅执行四角色只读唤醒探针和本规划任务 Browser 最小初始化；探针通过前不启动 Fastify、隔离库、Vite、UI 完整矩阵或 TEST，不修改生产代码，不调用 Superpowers。

## 2026-08-18｜FIFO226 规划关闭与 Codex 应用重启门

- 规划原样确认 `FIFO226-ENV-BROWSER-01-R1-V4.578`。UI 新 turn 只执行一次 Browser 初始化调用，入口即返回 `Transport closed`，未进入插件导入/浏览器选择/documentation，未启动项目环境或修改业务文件；FIFO226 交接闭环成立。
- 结论：精确停止 24 个遗留 `node_repl.exe` 后，当前 Codex 应用会话没有自动重建 MCP transport；需要完整退出并重新打开 Codex，使服务按现有配置重新注册。全局可信路径配置未修改，安全边界未扩大。
- CURRENT 更新至 v4-582：`ENV-BROWSER-01=blocked / Current actor=用户`，FIFO226 closed；`FRONT-SYSTEM-07B Rev3` 保持 review，15/15/build/Fastify/34 migrations 证据保留，TEST 继续 blocked。重启后先跑一次最小 Browser 探针；通过则重派 UI 完整终验，不重复前后端编码。

## 2026-08-18｜FIFO226 ENV-BROWSER-01 Rev1 探针领取

- 原样回显 `FIFO226-ENV-BROWSER-01-R1-V4.578`；permission fingerprint=`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`，ordinary writes=direct。CURRENT 更新至 v4-579，ENV-BROWSER-01=`in_progress`、FIFO226=`active`。
- 本轮只按当前 Browser skill 以绝对路径导入 `26.814.41407/scripts/browser-client.mjs`、取得默认浏览器并完整读取 documentation。不得启动数据库/Fastify/Vite/测试，不改配置、生产代码、docs/ui 或业务结论；失败只记录首因，不尝试 loader/fallback。
- 唯一一次 Browser 初始化在调用入口直接失败，原样首因为 `tool call failed for node_repl/js — Transport closed`；因此未进入绝对路径模块导入、默认浏览器选择或 documentation 读取，也没有创建可清理 tab。严格停止，未重试、未 loader/fallback、未改配置。
- CURRENT 更新至 v4-580：ENV-BROWSER-01=`review / Current actor=规划对话 / Reviewer=规划对话`，FIFO226=`notification_pending`。本轮未启动数据库、Fastify、Vite 或测试；未修改生产代码、docs/ui 或业务结论。
- 已只向规划固定任务发送同一令牌；`read_thread` 确认规划 in-progress 新 turn 收到首因并明确判断当前应用会话不会自动重建 Browser/Node REPL 服务。CURRENT 最小递增至 v4-581、FIFO226=`active`；送达/规划新 turn 已确认，未通知前后端/TEST。

## 2026-08-18｜FIFO225 规划确认与 FIFO226 Browser 干净启动探针

- 规划原样确认 `FIFO225-FRONT-SYSTEM-07B-R3-V4.574`，核对 CURRENT v4-577、UI 验收 §15、15/15、production build、Fastify/零网络 Worker/34 migrations 与精确清理；正式页面没有打开，因此不冒充 UI 终验通过，TEST 继续 blocked。
- 当前规划任务新鲜复现相同 `Trusted RPC dependency must resolve within a configured trusted code path`，证明不是 UI 单任务或产品缺陷。配置已指向 Browser `26.814.41407` 与 runtime `2fb562745e6d66f0`，目标文件存在且非链接；安全设置扩大补丁被策略拒绝后未绕过、未写入。
- 按用户既有进程清理授权，精确停止当前 runtime 下 24 个遗留 `node_repl.exe`，剩余 0；未停止 pnpm、业务 Node、PostgreSQL 或 Codex 主进程，未修改项目/全局配置。当前任务旧 MCP transport 随服务停止关闭，预期由目标新 turn 按现有配置重新启动。
- FIFO226 使用 `FIFO226-ENV-BROWSER-01-R1-V4.578` 仅路由 UI 新 turn 做 Browser 最小初始化探针；不得启动隔离库、Fastify 或项目矩阵，不写生产代码/验收结论。探针成功才重派 FIFO225 完整终验，失败则记录相同首因并等待用户明确授权安全配置变更。

## 2026-08-18｜FIFO225 FRONT-SYSTEM-07B Rev3 正式 UI 终验环境阻断交回

- handoffToken=`FIFO225-FRONT-SYSTEM-07B-R3-V4.574`。新鲜 production build 为 40 modules；策略前端+后端优化专项 2 files / 15 tests 全通过。生产前后端、contracts、迁移与 DESIGN 修改 0；未跑完整 `pnpm check`，未重复 Impeccable。
- 使用 `backend/dist` + 单一临时 harness 成功启动真实 Fastify、生产静态站、零网络 worker 和精确隔离 PostgreSQL；隔离库从零应用 34 migrations。此前 `pnpm exec tsx` 两次仅在启动前遇到宿主 `uv_os_get_passwd ENOMEM`，随后未继续堆叠 tsx fallback。
- 当前首个终止根因是内置 Browser 插件可信路径拒绝其自身 `browser-service.mjs`：页面从未打开，故没有冒充 1440/1024、焦点、console 或完整主链通过。结论 `environment_blocked`；产品 P0/P1/P2/P3 暂为 0/0/0/0，但正式 UI 终验不通过、不关闭、不解锁 TEST。
- 精确清理完成：32130/32131 已释放，`qimao_fifo225_ui_20260818` 强制删除并查询残留 0，临时 harness/loader/编译副本删除；共享 PostgreSQL 55432 既有运行态未改变。CURRENT 更新至 v4-576，FIFO225=`notification_pending`，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`。
- 已只向规划固定任务发送同一 handoffToken；`read_thread` 确认规划最新 in-progress turn 出现完整 FIFO225 交回消息并开始诊断可信路径。CURRENT 最小递增至 v4-577，FIFO225=`active`，送达/规划新 turn 已确认；未通知前端、后端或 TEST。

## 2026-08-18｜FIFO225 FRONT-SYSTEM-07B Rev3 正式 UI 终验领取

- 原样回显 `handoffToken=FIFO225-FRONT-SYSTEM-07B-R3-V4.574`；`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`，repo root=`C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，ordinary writes=direct。CURRENT 已更新为 v4-575，FIFO225=`active`，`FRONT-SYSTEM-07B Rev3 in_progress / Current actor=UI 设计对话 / Reviewer=UI 设计对话`。
- 本轮只对正式 `system-frontend` production build + Fastify + 精确隔离 PostgreSQL 做唯一一次完整 Wave B UI 终验；生产 frontend/system-frontend/backend/contracts/迁移/DESIGN 零修改。只可写 UI 验收、CURRENT/日志与仓库外脱敏证据；不跑完整 `pnpm check`，不重复 Impeccable。
- 矩阵覆盖完整业务主链、服务端事实/查询身份、异步 unknown/确定冲突、写锁/焦点、逐请求权限、两站隔离、1440/1024 与 console；除 P0 数据/安全事故外不在首个缺陷停止。创建的隔离库、端口和临时脚本将精确清理，不触碰共享数据库或其他任务服务。

## 2026-08-18｜FIFO224 规划通过并派发 FIFO225 UI 正式终验

- 规划已原样回显 FIFO224 令牌，核对 Rev3 差量：新建运行 unknown 保留原始选择上下文，POST 后不自动 GET；唯一人工 GET 失败保留同 ID 恢复，成功后才选择新 run、清恢复并由权威详情查询显示结果，身份切换时迟到响应不覆盖。
- 精确回归现断言点击前 runId GET=0、人工查询首次失败仍唯一恢复、再次成功后 requestId/状态归位且恢复按钮消失、POST=1；Rev2 的历史 unknown、evaluation_ready 当前候选、详情失败锁写入口证据保持。
- 规划新鲜运行 `pnpm exec vitest run tests/frontend/system-control-strategy.test.tsx --no-file-parallelism` 为 13/13，`node node_modules/typescript/bin/tsc --noEmit -p system-frontend/tsconfig.json` 退出码 0，相关 `git diff --check` 通过。未发现 fallback、compat、第二状态源、API/CSS/后端越界。
- FIFO225 使用 `FIFO225-FRONT-SYSTEM-07B-R3-V4.574` 路由 UI 设计对话执行本 Wave B 唯一一次正式 React+Fastify+精确隔离 PostgreSQL 完整终验；TEST 继续 blocked，完整 `pnpm check` 留 TEST 通过后的切片关闭门。

## 2026-08-18｜FIFO224 FRONT-SYSTEM-07B Rev3 同根微返工

- 规划已原样回显 FIFO223 令牌并核对 Rev2 两文件：历史 unknown 显式 GET、刷新后 evaluation_ready 当前候选、身份切换/详情失败锁写入口的实现与 13/13、62/62 证据成立。
- 唯一剩余 P1 仍属相同状态所有权根因：新建优化运行 POST unknown 后 `selectedRunId` 没有成为该新 runId；`recoverCommand` 的 `stillCurrent` 要求二者相等，导致人工 GET 即使成功也可能被丢弃，恢复块不清、详情不归位。现有回归只验证 GET 出现和通用标题存在，未验证恢复完成。
- FIFO224 仅允许修改 `system-frontend/src/strategyWaveB.tsx` 与 `tests/frontend/system-control-strategy.test.tsx`：不得在 POST unknown 后自动 GET；唯一人工恢复 GET 同 runId 成功后必须清除恢复、选择并显示该运行的权威详情、安全聚焦。回归须精确断言 POST=1、人工恢复 GET 同 ID、恢复按钮消失、成功状态/requestId 归位；再次失败仍保留唯一恢复。
- 其余 Rev2 代码、API、公共原语、CSS/视觉、后端/contracts/迁移、DESIGN、Wave C 和既有证据冻结；只跑策略专项、typecheck/build、diff-check，完整 `pnpm check` 继续后置。

## 2026-08-18｜FIFO224 FRONT-SYSTEM-07B Rev3 前端领取并进入 in_progress

- 原样回显 handoffToken=`FIFO224-FRONT-SYSTEM-07B-R3-V4.572`；permission fingerprint：repo_root=`C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`permission_profile=workspace-write/:workspace`，ordinary_writes=direct，不走 `auto_review`。
- 状态写回 `CURRENT v4-572`，FIFO224 active、`FRONT-SYSTEM-07B Rev3=in_progress`，Current actor=前端开发对话，Reviewer=规划对话；仅修改 strategyWaveB 与策略专项测试，其他 FIFO223 代码/证据冻结。

## 2026-08-18｜FIFO224 FRONT-SYSTEM-07B Rev3 完成并交规划

- 变化：新建优化运行 POST 返回 unknown 后不设置新 runId，也不自动 GET；恢复块保留唯一人工查询。恢复函数携带原始选择上下文，人工 GET 同 runId 成功后才切换并显示该权威运行详情，刷新详情/列表并安全聚焦；第一次失败保留同 ID/requestId 与唯一动作，再次成功清恢复。若用户已切换到另一运行，旧响应被丢弃。
- 精确路径：仅改 `system-frontend/src/strategyWaveB.tsx`、`tests/frontend/system-control-strategy.test.tsx`、`docs/status/CURRENT.md`、`docs/logs/DEVELOPMENT_LOG.md`；API、controlPrimitives、CSS/视觉、backend、迁移、contracts、DESIGN、Wave C 与 FIFO223 其余证据冻结。
- 回归：增强 create unknown 测试，证明 POST=1、点击前同 runId GET=0、第一次人工 GET 失败仍唯一可重试、第二次同 ID GET 成功后恢复按钮消失、运行状态/requestId/详情归位；历史 unknown、evaluation_ready、候选身份与既有决策回归保留。
- 验证：策略专项 `13/13`；system-frontend TypeScript 通过；Vite production build `40 modules` 通过；`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 `pnpm check`、未重做完整浏览器矩阵、未提交/推送/部署。
- 交接：handoffToken=`FIFO224-FRONT-SYSTEM-07B-R3-V4.572`；CURRENT 已转 `review / Current actor=规划对话`，接力暂记 `notification_pending`；随后只向规划固定任务发送八项差量包并用 `read_thread`/`wait_threads` 确认新 turn，不通知 UI/TEST。

## 2026-08-18｜FIFO223 FRONT-SYSTEM-07B Rev2 规划预审与微返工派发

- 用户恢复业务后，规划按 v4.9 先扫描 CURRENT 与 UI/后端/前端/测试四个固定任务；暂停前的 Wave B 代码、59/59、typecheck/build/Impeccable/diff-check 事实保留，不重复开发。
- 规划交叉读取正式共享契约、Fastify routes 与 `system-frontend/src/strategyWaveB.tsx`，确认三个同源状态所有权 P1：历史 `unknown` 优化运行按钮先 `setRecovery` 再调用读取旧闭包，可能零 GET；刷新后直接读取到 `evaluation_ready` 候选时创建评测只取 `candidateOverride`，可能零提交；切换运行/页码或候选详情加载/失败时可能继续显示并操作旧候选事实。
- FIFO223 使用令牌 `FIFO223-FRONT-SYSTEM-07B-R2-V4.570`，只允许修改 `system-frontend/src/strategyWaveB.tsx` 与 `tests/frontend/system-control-strategy.test.tsx`。要求恢复函数显式接收稳定身份、评测使用当前权威候选、查询身份变化清旧选择/覆盖/意图且详情 loading/error 锁定写入口；不得改 API、后端、迁移、contracts、CSS、视觉、Wave C 或其他已冻结证据。
- 定向门：新增可控回归证明历史 unknown 只 GET 同 runId、刷新后 evaluation_ready 使用当前 candidateId 创建评测、运行/候选身份变化不保留旧写入口；复跑策略专项、system-frontend typecheck/build 与 `git diff --check`。完整 `pnpm check` 留 UI/TEST 通过后的切片关闭门。

## 2026-08-18｜FIFO223 FRONT-SYSTEM-07B Rev2 前端领取并进入 in_progress

- 原样回显 handoffToken=`FIFO223-FRONT-SYSTEM-07B-R2-V4.570`；permission fingerprint：repo_root=`C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`permission_profile=workspace-write/:workspace`，ordinary_writes=direct，不走 `auto_review`。
- 已将 CURRENT 任务置为 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`，FIFO223 接力状态置为 `active`；只修改 strategyWaveB 与对应策略专项测试，冻结 API、公共原语、CSS/视觉、backend、迁移、contracts、DESIGN、Wave C。

## 2026-08-18｜FIFO223 FRONT-SYSTEM-07B Rev2 完成并交规划

- 变化：历史 `status=unknown` 优化运行详情的恢复按钮显式携带同一 runId 查询，避免 setRecovery 后读取旧闭包；成功刷新当前详情/列表，失败保留同一恢复意图与 requestId，始终不 POST。评测创建冻结当前权威 candidateId，刷新后直接读取 `evaluation_ready` 也只提交一次；unknown 只 GET 同一 evaluationRunId。
- 精确路径：生产修改仅 `system-frontend/src/strategyWaveB.tsx`；回归修改仅 `tests/frontend/system-control-strategy.test.tsx`；状态与日志为 `docs/status/CURRENT.md`、`docs/logs/DEVELOPMENT_LOG.md`。
- 允许文件与冻结项：未改 strategyApi、controlPrimitives、CSS/视觉、backend、迁移、packages/contracts、DESIGN、员工 frontend、Wave C；未接真实 AI/Secret/网络/付费，不提交/推送/部署。
- 状态所有权：运行/候选/评测查询身份切换、分页和候选详情 loading/error/refreshing 会清除失效 selectedCandidateId、candidateOverride、evaluationCandidateId、recovery、action；候选列表 stale 或详情不稳定时所有候选写入口锁定。unknown 响应完成前若身份已切换则丢弃，不覆盖新语境。
- 视觉/结构：沿用既有 Wave A/B ControlShell、公共 Modal/CommandRecovery 和 1440/1024 布局，本轮无意视觉差异。
- 验证：策略专项 `13/13`；管理员组合回归 `5 files / 62 tests`；system-frontend TypeScript 通过；Vite production build `40 modules` 通过；`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。按微返工要求未跑完整 `pnpm check`、未重做完整浏览器矩阵、未重复 Impeccable。
- 交接：handoffToken=`FIFO223-FRONT-SYSTEM-07B-R2-V4.570`；CURRENT 已转 `review / Current actor=规划对话`，接力暂记 `notification_pending`，随后只向规划固定任务发送本八项差量包并用 `read_thread`/`wait_threads` 确认新 turn；UI/TEST 不直接通知。

## 2026-08-18｜PLAN-COORD-01 协作链路复审与 v4.9 收口

- 用户要求停止业务并修复固定任务自动接力。规划已向前端发送即时暂停；前端把 FIFO221 写回 blocked 后停止，四个固定执行任务最终均为 idle，无 Vite/Vitest/TypeScript/浏览器业务进程继续运行。
- 最近记录的共性信号：`notification_pending` 71 次、`read-only` 32 次、`permission_blocked` 18 次、规划接管 30 次。核心并非本轮个人账号缺能力，而是旧 API/权限阶段形成“文件写回或角色 final 等于交接”的错误惯性，以及 CURRENT 343 行历史堆积造成当前/历史状态混读。
- 真实链路探针 `COORD-AUDIT-20260818-01` 已分别在 UI、后端、前端、测试固定任务执行；四者均确认 `send_message_to_thread/read_thread/wait_threads` available，均主动向规划固定任务发送 `outbound_wake_ok`，规划当前新 turn 实际收到四条消息，随后各角色任务回到 idle。
- `docs/WORKFLOW.md` 升级为 v4.9；新增唯一 `handoffToken`、`notification_pending/delivered/active/notification_blocked/closed` 状态机、角色 final 不等于唤醒、账号/Provider/wire API/模型通道变化后的四角色探针、规划每 turn 接力扫描和结束前无主 ready 审计。`AGENTS.md` 同步 v4.9 硬门。
- 原 343 行 CURRENT 已以相同 SHA-256 完整复制到 `docs/status/archive/CURRENT-v4.296-through-v4.568.md`；活跃 CURRENT 重建为 v4-569，只保留当前阶段、四角色通道指纹、活跃任务、未关闭 FIFO 和运行门，消除陈旧 `ready/in_progress/review` 互相冲突。
- 本轮不修改生产 frontend/system-frontend/backend/contracts/迁移/DESIGN，不运行产品测试，不提交/推送/部署，不调用 Superpowers。FIFO221 业务代码与 59/59 等既有验证保留但不据此自动关闭；用户确认恢复后从“规划预审→UI 终验→TEST”续接，不重复编码。

## 2026-08-18｜FIFO221 协作唤醒链路专项暂停

- 按规划即时暂停要求，立即停止 FRONT-SYSTEM-07B Rev1 的生产编码、测试扩展、浏览器验证和业务文档修改；不回滚、不清理、不提交、不推送。
- 状态已写回 `CURRENT v4-568`：`FIFO221=blocked`、`FRONT-SYSTEM-07B Rev1=blocked`、`Current actor=规划对话`、`Reviewer=规划对话`；唯一阻塞原因为“协作唤醒链路专项审计”，不增加 Rev、不记业务失败。
- 暂停消息实际新增修改仅为 `docs/status/CURRENT.md` 与本日志；前一交付的生产/测试文件保留不动。此前 Vite、Vitest、TypeScript 进程均已安全停止，当前无运行中的测试、构建、开发服务器或浏览器命令。
- 已完成状态写回并向规划总线唤醒，送达/运行态为 `blocked / 等待协作审计`；不通知 UI/后端/测试，不调用 Superpowers。

## 2026-08-18｜FIFO221 FRONT-SYSTEM-07B Rev1 完成并转 review

- 权限握手保持 `repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`，普通仓库编辑不走 `auto_review`；本轮仅改独立 `system-frontend/`、策略专项及状态/日志。
- 在既有 `/strategy` 接入 Wave B：优化运行（服务端 artifact/version 选择）、候选列表/详情/严格字段编辑/结构化驳回/恢复/送离线评测、离线评测列表/详情；Wave C 批准/发布继续禁用。所有写命令使用预生成稳定身份与 `Idempotency-Key`，未知只 GET 同一 runId/decisionId/evaluationRunId，确定性冲突清意图并刷新权威事实。
- 复用公共异步/模态原语：stale 保留旧事实、真实 requestId、唯一人工恢复；pending 锁定和失败/成功焦点已接入；查询身份变化丢弃迟到响应。未发送真实 AI/Secret/网络/付费请求，未触碰 backend、迁移、packages/contracts、DESIGN、员工 frontend。
- 生产文件：`system-frontend/src/strategyApi.ts`、`strategyPage.tsx`、`strategyWaveB.tsx`、`strategy.css`、`controlPrimitives.tsx`；回归：`tests/frontend/system-control-strategy.test.tsx`。
- 新鲜验证：策略专项及管理员组合回归 `59/59`；`node node_modules/typescript/bin/tsc --noEmit -p system-frontend/tsconfig.json`；Vite `40 modules` production build；Impeccable detector 单次 `[]`；`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 `pnpm check`、完整浏览器矩阵；任务转 `review / Current actor=规划对话`，只交规划总线。

## 2026-08-18｜FIFO221 FRONT-SYSTEM-07B Rev1 领取

- permission fingerprint：repo_root=`C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`；workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；`permission_profile=workspace-write/:workspace`；ordinary_writes=direct，不走 `auto_review`。
- 任务已按 v4.8 写回 `CURRENT v4-566`，FIFO221 active、`FRONT-SYSTEM-07B Rev1=in_progress`，Current actor=前端开发对话，Reviewer=UI 设计对话。
- 本轮范围：既有独立 `system-frontend` `/strategy` Wave B；消费正式 OptimizationRun/Candidate/Decision/EvaluationRun API，稳定身份与 unknown 只读恢复；不实现 Wave C、不改 backend/contracts/迁移/DESIGN/员工站，不接真实 AI/Secret/网络/付费。

## 2026-08-18｜FIFO220 规划微审通过并派发 FIFO221 正式前端

- 规划核对 decision result 严格契约、`strategy:read` 逐请求权限、稳定 404，以及直接读取不可变 `strategy_candidate_decision_events.after_snapshot` 的单一状态源；后续同候选决定不覆盖旧命令结果，读取不产生业务写入。
- 后端新鲜 FIFO220 专项 `2/2`、Wave A 组合 `7/7` 作为实现证据；规划本轮独立重跑 contracts/backend 双构建，均退出码 0。未新增迁移、fallback、兼容旧路径或真实 AI/Secret/网络/付费。
- FIFO220 / `BACK-SYSTEM-07B Rev2` 关闭。FIFO221 / `FRONT-SYSTEM-07B Rev1` 解锁：只在独立 `system-frontend` 既有 `/strategy` 中实现冻结的 Wave B 交互并消费正式 API；run/candidate/decision/evaluation 稳定身份、unknown 只 GET 同一身份、确定冲突刷新权威事实。Wave C 与测试关闭门继续后置。

## 2026-08-18｜FIFO220 BACK-SYSTEM-07B Rev2 完成并转 review

- 已完成严格 `additionalProperties=false` 的 `SystemControlStrategyCandidateDecisionResult` 共享契约，字段包含 `decisionId`、`candidateId`、`action`、`requestId` 与不可变 `afterSnapshot`。
- 新增正式 `GET /api/system-control/strategy/candidate-decisions/:decisionId`，受 `strategy:read` 保护，直接从 `strategy_candidate_decision_events` 读取；未知 ID 稳定 404，后续同候选编辑不覆盖旧决定快照，读取前后 decision/event/command 无额外写入且 POST 次数不增加。
- 新鲜验证：FIFO220 专项 `2/2`，与 Wave A 组合 `7/7`；contracts build、backend build、`check:repo`、`git diff --check` 通过。首次 backend build 的真实失败为既有 `backend/dist` 写入 `EPERM`，授权重跑后通过；不是类型/产品错误。
- 专项隔离迁移 `33/33` 由本轮测试实际复用；无新增迁移、无 fallback/第二状态源、无前端/DESIGN/真实 AI、Secret、网络或付费接入。PostgreSQL 已停止并确认 `no response`。
- `BACK-SYSTEM-07B Rev2` 状态：`review / Current actor=规划对话 / Reviewer=规划对话`；仅通知规划，Wave C 与前端/UI/测试保持冻结。

## 2026-08-18｜FIFO220 BACK-SYSTEM-07B Rev2 领取并进入 in_progress

- `permission_ok`：repo root 为 `C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，workspace root 含 `C:\Users\ComradeGu\Documents\七猫兼职`，权限为 `workspace-write/:workspace`；普通仓库编辑直连，不走 `auto_review`。
- 唯一范围：为候选决定增加严格 additionalProperties=false 的 result 共享契约，GET `/api/system-control/strategy/candidate-decisions/:decisionId` 直接读取现有不可变 decision event/after snapshot；不得新增迁移、fallback、第二状态源、UI/员工规则或 Wave C。FIFO219 UI 与 FIFO218 Rev1 既有事实保持不变。

## 2026-08-18｜FIFO219 规划复审通过，FIFO220 后端只读恢复微返工

- UI Rev2 静态实现、验收 §14 与三张变化证据一致：四个稳定候选身份和编辑/结构化驳回/恢复/送评测均有真实事件接线；状态、修订、pending、unknown/冲突和焦点所有权关闭原唯一 P1。浏览器安全策略阻止规划另开本地 URL，因此未冒充第二轮动态浏览器证据；本轮以 UI 已提交真实浏览器证据、规划源码审查和图片复核裁决，正式 React 后仍由 UI 完整终验。
- UI/BACK 交叉映射发现后端唯一 P1：候选决定写入携带稳定 `decisionId`，但没有按该 ID 读取不可变命令结果的 GET。只读 `GET candidateId` 会返回候选当前态，若之后又有决定则不能证明恢复的是同一未知命令；重放 POST 又违反已冻结 unknown 只读恢复。
- FIFO220 只允许新增 decision result 共享契约、按 `decisionId` 的只读 GET/service 和高价值回归，数据源复用现有不可变 `strategy_candidate_decision_events.after_snapshot`；无迁移、无 fallback/第二状态源，不改 UI/员工规则。FRONT/TEST 保持 blocked。

## 2026-08-18｜FIFO219 UI-SYSTEM-07B Rev2 完成并转 review

- 原型建立唯一候选状态源，四行分别绑定 `候选-C061/C060/C059/C058`，列表、抽屉和命令共享稳定身份/修订/状态；不再把全部行投影为 C061。待审查/已编辑提供严格字段编辑、结构化驳回和送评测；已驳回唯一动作是恢复；待送评测动作与状态一致。
- 四类动作均可真实操作：编辑更新严格字段与修订，驳回要求原因枚举与短备注，恢复保留原审计，送评测确认固定 digest/回归集且不批准不发布。Modal 安全初焦点、正反向 Tab 闭环、Escape 回抽屉标题、pending `aria-busy` 与双按钮锁定、成功回对应候选标题均成立。
- unknown 流程使用同一 `候选-C060 + 命令身份`，错误摘要获焦且唯一“查询同一命令”；确定冲突清除意图并从唯一“重新读取候选”回到 `候选-C059` 标题，状态不被误改。首次真实复验发现 Escape 焦点滞留隐藏安全返回，已集中改为同步回抽屉标题并变化复验通过。
- 新增三张变化证据：`strategy-wave-b-rev2-1440-reject.png`、`strategy-wave-b-rev2-1440-evaluate-confirm.png`、`strategy-wave-b-rev2-1024-evaluate-focus.png`；1024 根 `1009/1009`，控制台 `error/warn=0/0`。node check、`git diff --check` 通过（仅既有 CRLF 提示）；Impeccable detector 本任务仅运行一次，依赖缺失降级正则并返回 `[]`。
- 只修改同一仓库外原型、UI 验收、CURRENT/日志；DESIGN 冻结未改，生产前后端/contracts/迁移修改 0，未宣称 BACK API 完成，Wave C 仍禁用，未调用 Superpowers。CURRENT 已更新为 v4-563，FIFO219 / `UI-SYSTEM-07B Rev2` 转 `review / Current actor=规划对话 / Reviewer=规划对话`。
- 已向规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c` 发送 Rev2 八项差量包；规划新 turn 明确回执“已收到 FIFO219，开始按微返工快车道复审”，状态为 `inProgress`。状态已写回、唤醒已发送、送达/运行态已确认。

## 2026-08-18｜FIFO218 BACK-SYSTEM-07B Rev1 完成并转 review

- 已在 `workspace-write/:workspace` 下完成 FIFO218；保留 `FIFO217 UI-SYSTEM-07B in_progress` 事实。实现集中在既有 Wave B 草案：`packages/contracts/src/system-control-strategy.ts`、`backend/migrations/1754976019000_create_system_strategy_optimization.cjs`、`backend/src/modules/system-control/system-control.strategy-optimization.service.ts`、`backend/src/workers/system-control.strategy.worker.ts` 与 `system-control.strategy.worker.entry.ts`、system-control routes/auth、`tests/backend/system-control-strategy-optimization.test.ts`。
- OptimizationRun 由客户端预生成 `runId`，同一 PostgreSQL 事务锁定稳定身份与幂等键后入队；候选只从现有四域安全事件投影形成，排除 `reverses/restores` 与 undo/redo/revert，保存 `sourceEventRefId`、digest、字段摘要和证据计数，不复制原文。候选决定事件使用客户端 `decisionId`、不可变表触发器和请求摘要；EvaluationRun 使用稳定 `evaluationRunId`，只允许 `strategy:evaluate`，零网络 deterministic proxy 生成指标与 CNY `0.000000`，不写供应商 Usage。
- Worker 仅 claim queued，租约过期由有界 sweep 终结为 `unknown`，不自动重跑；成功/失败在 PostgreSQL 条件更新内终结，`runUntilStopped(AbortSignal)` 可停止。HTTP 提供 OptimizationRun/candidate/decision/EvaluationRun 的正式列表、详情、幂等写与同 ID GET 恢复；匿名、employee、缺 evaluate 能力逐请求拒绝。
- 新鲜验证：精确隔离 PostgreSQL 从零迁移 33/33（1754976019000 通过，业务表零 bootstrap）；FIFO218 专项 `2/2`，Wave A strategy `5/5`，组合 `7/7`；contracts/backend build、`check:repo`、`git diff --check` 通过（仅已有 LOCAL_APP_PARITY.md CRLF 警告）。完整 `pnpm check` 按任务要求留 SYSTEM-07 关闭门。
- 首次启动失败真实错误为 `pg_ctl` 残留 `postmaster.pid` 与仓库日志路径权限，`pg_ctl status` 确认无进程后仅清理本地运行态并在受控权限下完成验证；最终端口 55432 `no response`，PostgreSQL 已停止。任务状态：`BACK-SYSTEM-07B Rev1 review / Current actor=规划对话`。

## 2026-08-18｜FIFO219 UI-SYSTEM-07B Rev2 领取并进入 in_progress

- `permission_ok`：repo root 为 `C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，workspace root 含 `C:\Users\ComradeGu\Documents\七猫兼职`，权限为 `workspace-write/:workspace`；普通仓库编辑与指定仓库外原型路径直接写入，不走 `auto_review`。
- 已核对 `CURRENT.md` v4-561、规划定向退审与 DESIGN 5.16.6–5.16.9/UI 验收冻结事实。CURRENT 已更新为 v4-562，FIFO219 / `UI-SYSTEM-07B Rev2` 为 `in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`；状态已写回、规划唤醒已收到、本固定 UI 任务运行态已确认。
- 本轮只修同一仓库外原型的候选真实身份、严格字段编辑、结构化驳回、恢复、送评测确认，以及安全初焦点、双向焦点闭环、Escape、pending 锁定、确定冲突/unknown 同身份恢复、成功焦点和最小证据；冻结视觉、Wave C、CNY/unknown、1440/1024、既有运行 Modal/抽屉证据。不改生产前后端/contracts/迁移，不宣称 BACK API 完成，不调用 Superpowers。

## 2026-08-18｜FIFO217 规划交叉审核退回 FIFO219 UI 微返工

- 规划按 Impeccable 审计口径核对 DESIGN 5.16.6–5.16.9、UI 验收 §10–13、三张变化证据、原型 `index.html/app.js/styles.css` 及 Wave B contracts/迁移草案快照。信息架构、Wave C 禁用、CNY/unknown 诚实语义、1440/1024 与已取证焦点项冻结通过。
- 唯一 P1：候选列表四行均被 `openWaveDrawer` 投影为固定 `候选-C061`，抽屉“驳回候选 / 编辑建议 / 送入离线评测”按钮无事件接线，已驳回候选无恢复入口；原型和三张证据不能支持“严格字段编辑、驳回恢复、送评测”已完成的声明。
- 不扩大业务范围：FIFO219 Rev2 只补候选真实身份、编辑/驳回/恢复/送评测的可操作交互、焦点/unknown 与最小证据；不重做视觉，不修改生产前后端/contracts/迁移，不冒充 API 完成，不启用 Wave C。BACK FIFO218 继续独立 in_progress，FRONT/TEST 继续 blocked。

## 2026-08-18｜FIFO217 UI-SYSTEM-07B Rev1 完成并转 review

- 在既有 ControlShell `/strategy` 与 Operate 方向内新增 DESIGN 5.16.6–5.16.9，并扩展 UI 验收：Wave B 页签固定为“优化运行 / 学习候选 / 离线评测 / 批准与发布（Wave C 禁用）”；主链只允许零网络运行、候选审查/严格字段编辑/驳回恢复/送评测和离线结果阅读，任何成功都不批准、不发布、不移动 active、不改变员工站规则。
- 服务端状态与恢复冻结：运行/评测 `queued/running/succeeded/failed/unknown` 映射为明确中文；unknown 只查询同一稳定身份，禁止自动重发创建命令；候选决定 unknown 只查询同一 candidate/command；首次失败、再次失败、stale、部分指标未知和 CNY 待对账均有唯一恢复与不补 0 规则。两份后端 Wave B 文件仍标记未验证草案，UI 没有宣称完成 API。
- 仓库外同壳原型位于 `ui-system-07b-strategy-wave-b`。真实浏览器：1440 根 `1440/1440`、侧栏 `216px`；1024 根 `1009/1009`、侧栏 `72px`、正文 `x=72 / width=937`，评测摘要/指标两列。创建运行 Modal 初始焦点为安全返回；候选抽屉打开聚焦标题、关闭回原审查按钮；页面控制台 `error/warn=0/0`。
- 证据为 `strategy-wave-b-1440-runs.png`、`strategy-wave-b-1024-candidates.png`、`strategy-wave-b-1024-evaluation.png`。`app.js`/`serve.mjs` node check 与仓库 `git diff --check` 通过（仅既有 `LOCAL_APP_PARITY.md` CRLF 提示）。Impeccable detector 按规则只运行一次；因缺少 `htmlparser2/css-select/css-tree/domutils` 降级正则并返回 `[]`，只作辅助。生产前后端/contracts/迁移修改 0；未接真实 AI/Secret/网络/付费，未调用 Superpowers。
- CURRENT 已更新为 v4-560；FIFO217 / `UI-SYSTEM-07B Rev1` 转 `review / Current actor=规划对话 / Reviewer=规划`。状态写回完成，下一步仅通知规划固定任务审核，不直接解锁前端或测试。
- 已向规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c` 发送 v4.5 八项差量包；规划新 turn 明确回执“已收到 FIFO217，开始规划交叉审核”，状态为 `inProgress`。状态已写回、唤醒已发送、送达/运行态已确认。

## 2026-08-18｜FIFO218 BACK-SYSTEM-07B Rev1 领取并进入 in_progress

- `permission_ok`：repo root 为 `C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，workspace root 含 `C:\Users\ComradeGu\Documents\七猫兼职`，权限为 `workspace-write/:workspace`；普通仓库编辑直接写入，不走 `auto_review`。
- 已按 v4.8 领取后端固定任务：先审查既有 `packages/contracts/src/system-control-strategy.ts` Wave B 契约草案与 `backend/migrations/1754976019000_create_system_strategy_optimization.cjs` 迁移草案，再在同一实现上完成 OptimizationRun、零网络有界 Worker、候选及不可变决定、EvaluationRun、逐请求 `strategy:evaluate`、稳定幂等/unknown 读取恢复和高价值回归。
- 范围冻结：不新增第二状态源或 fallback/compat/legacy，不接真实 AI/Secret/网络/付费，不做自动批准/发布或员工站规则切换，不改生产前端/DESIGN；完整 `pnpm check` 留切片关闭门。当前状态 `BACK-SYSTEM-07B Rev1 in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。

## 2026-08-18｜FIFO217 UI-SYSTEM-07B Rev1 领取并进入 in_progress

- 已完整重读项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`docs/status/CURRENT.md` v4-558、`docs/milestones/SYSTEM-policy-learning.md`、`DESIGN.md` 5.16、`docs/ui/SYSTEM-policy-learning-acceptance.md` 与本日志顶部。
- `permission_ok`：repo root 为 `C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`；workspace root 含 `C:\Users\ComradeGu\Documents\七猫兼职`；权限为 `workspace-write/:workspace`，普通仓库编辑直接写入且不走 `auto_review`。CURRENT 已更新为 v4-559，FIFO217 / `UI-SYSTEM-07B Rev1` 状态为 `in_progress / Current actor=UI 设计对话`。
- 本轮只冻结同一 ControlShell `/strategy` 内 Wave B 的“零网络优化运行 → 候选审查/编辑/驳回/送评测 → 离线评测结果”正式交互、服务端状态、失败/unknown 恢复、1440/1024 与焦点；只改 DESIGN、`docs/ui/`、CURRENT/日志及仓库外原型/证据。两份后端文件仍是未验证草案，UI 不冒充完成 API；不改生产前后端/contracts/迁移，不接真实 AI/Secret/网络/付费，不设计自动批准/发布或员工站规则切换；未调用 Superpowers。

## 2026-08-18｜SYSTEM-07 Wave B 恢复固定对话协作

- 用户指出规划长期单跑不正常；规划确认此前接管只应作为固定任务 read-only 的应急快车道，不能替代 UI/后端/前端/测试的独立职责。Wave B 恢复固定任务主动唤醒、送达确认和交叉审核。
- 规划预检只落了两份尚未验证的草案：`packages/contracts/src/system-control-strategy.ts` Wave B 契约、`backend/migrations/1754976019000_create_system_strategy_optimization.cjs` 迁移。现转交 BACK-SYSTEM-07B 先审后改，不将草案记为交付事实。
- FIFO217 UI 与 FIFO218 BACK 文件边界不重叠，可并行；FRONT/TEST B 后置。真实 AI、Secret、网络、付费、自动批准/发布与员工站规则切换继续冻结。

## 2026-08-18｜SYSTEM-07 Wave A 正式全链关闭

- 规划接管同一 `FRONT-SYSTEM-07A Rev1` 完成正式 `/strategy`：共享契约/Fastify/PostgreSQL 为唯一状态源，版本创建必须先选基线，五类 payload 完整继承；本地规则支持最多 500 条结构化编辑，空白重建与普通详情泄露完整策略正文路径均不存在。
- 正式浏览器真实 v1→v2→v3，1440/1024 根无横溢，1024 规则编辑器两列自适应，Modal 正反向焦点闭环与成功标题焦点成立，console `error/warn=0/0`。策略前端 7/7、管理员前端五文件 56/56、typecheck、Vite 39 modules 通过。
- 完整 `pnpm check` 最终退出码 0：37 files / 347 tests，仓库检查、lint、typecheck、全部测试与四项目构建通过。首次完整门发现一条既有前端错误焦点断言时序和两个数据库重型测试清理/超时问题；分别改为等待 effect、去除重复 pool.end、把完整 33 迁移竞态测试上限调到 30 秒后，定向复验与完整门均通过，未用产品 fallback 掩盖。
- 三个精确隔离库 `qimao_operations_*`、`qimao_secret_race_*`、`qimao_system07_formal_*` 已删除且残留 0；项目专用 PostgreSQL PID 经 postmaster.pid 核对后停止，`pnpm db:status` 确认未运行。FIFO215/216 与 FRONT/TEST-SYSTEM-07A 关闭，下一切片为 Wave B 零网络候选与离线评测。

## 2026-08-18｜FIFO215 固定前端 permission_blocked，规划接管

- 前端固定任务收到正式派发后回执 `read-only`，按 v4.8 动作前零修改退出；未读取业务文件、未写状态/日志、未运行测试或触发 auto_review。
- 规划在当前 `workspace-write/:workspace` 环境接管同一 `FRONT-SYSTEM-07A Rev1`，不增加 Rev、不创建第二实现；范围仍限 system-frontend、对应前端专项及状态/日志。
- 正式实现继续服从 DESIGN 5.16、UI 验收、strategy 共享契约和既有 ControlShell/Impeccable 方向；不触碰 backend/contracts/迁移/员工 frontend/Wave B/C。

## 2026-08-18｜SYSTEM-07 Wave A 双依赖关闭并派发 FIFO215

- 规划完成 UI-SYSTEM-07 接管验收：DESIGN 5.16、UI 验收、同壳原型、1440/1024、Modal/抽屉焦点、错误恢复与控制台 0/0 通过；Impeccable detector 只运行一次并记录解析依赖缺失的降级事实。
- 规划独立复验 BACK-SYSTEM-07A Rev2：新鲜 strategy 专项 5/5、contracts build、backend build 通过；确认四领域事件来自正式写命令，screen_text 排除机械 id/revision，acceptance 按 cue-id 投影轨道和实际变化数。
- FIFO212/213/214 关闭，FIFO215 `FRONT-SYSTEM-07A Rev1` 解锁；仅实现 system-frontend `/strategy` Wave A 与对应测试，不接真实 AI/Secret/网络/付费/训练，不实现候选评测或发布。

## 2026-08-18｜FIFO214 BACK-SYSTEM-07A Rev2 完成回写

- 四域回归使用正式写命令产生事件：terms `TermCandidateRepository.decide`、pre_review `PreReviewWriteRepository.decide`、screen_text `ScreenTextWriteRepository.decide`、subtitle_acceptance HTTP edit/undo/redo；没有直接伪造事件行。
- EVENTS_CTE 的 terms/pre_review/screen_text changedFields/evidenceCount 读取真实前后差量与权威证据；screen_text 将 after_state.candidate 规范化并白名单 `status/text/startMs/endMs/category/position`，排除 `id/revision`。
- acceptance 通过 cue-id 差量映射新增/删除/修改 cue，单轨返回 dialogue/screen_text，多轨返回 null，evidenceCount 为实际变化 cue 数；专项覆盖 undo/redo、单轨与双轨。
- 保留资产 purpose/applicableModules/module filter/latestVersionSummary 与版本列表安全摘要/详情完整 payload 分离；新鲜 strategy 5/5，contracts/backend typecheck、backend build、check:repo、git diff-check 通过；隔离 33 迁移后 PostgreSQL 已停止。

## 2026-08-18｜FIFO213 BACK-SYSTEM-07A Rev1 Wave A 完成回写

## 2026-08-18｜FIFO214 BACK-SYSTEM-07A Rev2 安全事件投影返工

- 规划退审要求四域均由正式领域 service/repository 写命令形成事件；本轮只改 strategy service/专项测试，补齐差异字段、真实证据计数和 acceptance 轨道确定性，不改领域状态机。

- permission_ok：workspace root 含 `C:\Users\ComradeGu\Documents\七猫兼职`，仓库为 `workspace-write/:workspace`，普通仓库编辑不走 auto_review；未调用 Superpowers。
- Wave A 已实现五类严格 StrategyArtifact payload、artifact/version 客户端稳定 ID、draft version、幂等命令与四领域 UNION ALL 安全事件投影及 strategy read/write API。
- 隔离 PostgreSQL 从零执行 33 迁移；strategy 专项 3/3；contracts/backend typecheck、backend build、check:repo、git diff --check 全通过；专项完成后 PostgreSQL 已停止。
- 曾出现一次测试夹具使用不存在的 `term_candidate_type` 显示值，已改为读取数据库枚举事实并复跑 3/3；非产品失败。

## 2026-08-18｜FIFO212 固定 UI permission_blocked，规划接管

- UI 固定任务正式收到 FIFO212，但权限指纹为 `read-only`；依 v4.8 在动作前零修改退出，未写 CURRENT/日志/in_progress，未改 DESIGN/docs/ui/原型/生产代码，未运行 Impeccable、浏览器或测试。
- 规划在当前 `workspace-write` 环境接管同一 `UI-SYSTEM-07 Rev1`，不增加 Rev、不创建第二实现。范围仍限既有 ControlShell `/strategy`、Wave A 六页签和 Wave B/C 诚实后置边界。
- 本轮使用 Impeccable 的规划/Operate 口径做一次有界设计与审查；只写 DESIGN、docs/ui、CURRENT/日志和规划线程仓库外证据。后端 FIFO213 独立继续权限检查。

## 2026-08-18｜FIFO211 关闭并启动 SYSTEM-07 Wave A

- 用户确认采用 Wave A 证据/版本库 → Wave B 候选/离线评测 → Wave C 逐模块人工批准生效/回滚。`PLAN-SYSTEM-07 Rev1` 与 FIFO211 关闭，里程碑、职责矩阵、`INT-14`、路线图和 CURRENT v4-550 已同步。
- FIFO212 `UI-SYSTEM-07 Rev1` 与 FIFO213 `BACK-SYSTEM-07A Rev1` 文件边界不重叠，现并行 ready。UI 只改 DESIGN/docs/ui/仓库外原型；后端只改 contracts/system-control/必要迁移/测试。
- Wave A 不修改员工站规则、不创建 active 指针、不接真实 AI/Secret/网络/付费/训练/云资源；空库业务行必须为 0。`FRONT-SYSTEM-07A`、`TEST-SYSTEM-07A` 与 Wave B/C 保持 blocked。
- 派发后必须回执 permission 指纹与 in_progress；固定任务若 read-only，立即回流规划在当前 workspace-write 环境接管同一 Rev，不让用户传话、不创建第二实现。

## 2026-08-18｜FIFO211 PLAN-SYSTEM-07 推荐稿进入用户评审

- 新增 `docs/milestones/SYSTEM-policy-learning.md`，把策略与学习拆成同一模块三波关闭：Wave A 安全事件目录与五类不可变策略草稿；Wave B 零网络优化运行、候选与离线评测；Wave C 逐模块人工批准、生效和回滚。一次性横切四个员工模块的方案被否决，避免扩大迁移/回归和形成新旧双轨。
- 现有术语、前置审改、画面字和字幕验收不可变事件继续由各领域表拥有；学习中心只做 `UNION ALL` 安全投影，不复制完整正文日志。跨项目页面不得返回 before/after 原文、完整字幕、音视频、对象键、Secret、完整提示词/热词或供应商载荷。
- Wave A 的正式入口、读写 API、稳定资源 ID/幂等、逐请求权限、错误恢复、空库零业务数据、隔离测试、旧路径删除与公共 UI 原语已写入启动包；现有代码规则在 Wave A/B 仍是唯一生产来源，页面必须显示尚未纳管。Wave C 切换时同任务删除旧 default/static/fallback。
- 已同步职责矩阵、`INT-14`、路线图与 CURRENT v4-549。任务保持 `PLAN-SYSTEM-07 Rev1 review / Reviewer=用户`；按新范围首提案门，本回合不唤醒 UI/后端/前端/测试。全部费用口径为 CNY，真实 AI/网络/Secret/付费/训练/云资源仍需独立授权。

## 2026-08-18｜FIFO210 TEST-SYSTEM-06 与 SYSTEM-06 全链关闭

- 固定测试任务收到 FIFO210 后因 `read-only` 在动作前零修改退出；规划按 v4.8 在当前 `workspace-write` 环境接管同一 Rev。独立新鲜验证：后端 runtime/operations 2 files / 11 tests；管理前端运行页/壳层 2 files / 12 tests；员工站管理壳/API 静态命中 0；contracts/backend/frontend/system-frontend 构建通过。
- 新增 `docs/testing/SYSTEM-runtime-observability-integration-report.md`，结论 P0/P1/P2/P3=`0/0/0/0`。正式 UI §9 的 1440/1024、真实 503 恢复、详情焦点、CNY/待对账、脱敏与 console `0/0` 作为浏览器纵向证据。
- 首次完整 `pnpm check` 在任何测试前被 Windows 当前账号环境的 `tsx` `os.userInfo()` 调用阻断，错误为 `uv_os_get_passwd ENOMEM`。临时预加载无法覆盖 `tsx` 子进程后没有继续叠 shim；`backend/package.json` 删除迁移对 `tsx` CLI 的依赖，统一为 `tsc -p tsconfig.build.json && node dist/database/migrate.js`，不保留双路径。
- 修正后原样 `pnpm check` 退出码 0：35 files / 335 tests，全 workspace repository check、lint、typecheck、test、build 通过；system-frontend 36 modules、员工 frontend 189 modules。现有 frontend 大 chunk 仅为既有非阻断提示。
- 验收数据库 `qimao_ui_system06_7908` 精确删除计数 0；32060/32061、浏览器标签、视口与临时 harness/loader/shim 清理；本地 PostgreSQL 55432 已在提权后的项目专用 `pnpm db:stop` 中正常停止。SYSTEM-06 正式关闭。

## 2026-08-18｜FIFO209 正式 UI 终验关闭并解锁 TEST-SYSTEM-06

- 固定 UI 任务 read-only 后，规划在同一 Rev、可写工作区完成 production system-frontend + Fastify + 精确隔离 PostgreSQL 正式矩阵。结论 P0/P1/P2/P3=`0/0/0/0`；1440/1024 根无横溢、宽表仅容器内滚、详情焦点、CNY/待对账、脱敏和 console `0/0` 均通过。
- 正式矩阵发现并集中关闭同源页面读取所有权：`/servers` 摘要与资源双请求失败不再渲染两个恢复块；两项结束后统一决定错误焦点或成功 H1。`/logs` 连续 `503→503→200` 维持一个恢复入口、旧表格和真实 requestId，再次失败错误摘要获焦，成功 H1 获焦。没有改 API、查询身份、后端状态或视觉方向。
- 新鲜定向验证：runtime 前端 6/6、system-frontend typecheck、Vite production build 36 modules；正式浏览器变化场景通过。四文件组合 48/49 的唯一失败为既有 Secret unknown 焦点时序断言，同文件随即独立 4/4，记录为测试隔离风险而非产品通过数字。
- `docs/ui/SYSTEM-runtime-observability-acceptance.md` 已追加正式终验；仓库外最小新增证据 `system06-formal-ui/logs-error-focus.png`。FIFO209 与正式前端关闭，FIFO210 解锁给独立 TEST-SYSTEM-06；完整 `pnpm check` 仍只在独立测试通过后执行一次。

## 2026-08-18｜FIFO209 固定 UI 权限阻塞，规划接管正式终验

- UI 固定任务收到 FIFO209 后回执 `permission_blocked`：workspace root 正确但当前为 read-only；在任何任务动作前停止，未写 in_progress/CURRENT/日志/docs/ui，未运行 build/Fastify/PostgreSQL/浏览器/Impeccable/测试，未改生产代码。这是权限环境故障，不是产品失败，也未消耗唯一完整 UI 矩阵。
- 规划在当前 `workspace-write` 环境接管同一 Rev1 验收范围。正式浏览器前先处理规划静态预检发现的三个运行时同源风险：全局自动刷新必须驱动当前页面且关闭后零后台请求；抽屉初始标题需纳入正反向焦点循环；日志页不得在浏览器汇总分页金额冒充服务端总额。
- 预检只允许修改 `system-frontend` 与对应前端回归，不改 backend/contracts/migrations/DESIGN/员工站，不重做视觉方向；完成后运行定向门，再进入唯一正式 UI 完整矩阵。

## 2026-08-18｜FIFO208 FRONT-SYSTEM-06C Rev1 规划接管交付并路由 UI

- 固定前端任务 read-only 且零修改后，规划在当前 `workspace-write` 工作区按同一 Rev1 完成独立管理员站 `/servers` 与 `/logs`；没有创建第二实现、重做视觉方向或启用 Superpowers。
- 新增 `runtimeApi.ts`、`runtimeCommon.tsx`、`serversPage.tsx`、`logsPage.tsx`、`runtime.css`，并最小接入 `App/main/ControlShell`。资源页只读消费受控目录、PostgreSQL 运行事实、Telemetry Provider、当前路由/部署配置；日志页逐条消费历史 Attempt、requestId、CNY/待对账、不可变版本、质量和脱敏错误。
- 两页复用既有 `useAsyncRead/ErrorBlock`，只读抽屉统一焦点循环、Escape/遮罩关闭与触发点恢复；筛选身份变化清详情和分页，迟到响应不覆盖新查询；页面无暂停、重试任务、配置写入、匿名样例、浏览器金额换算、fallback 或第二状态源。
- 新增 `tests/frontend/system-control-runtime.test.tsx` 五项高价值回归，并更新既有九入口断言。首轮唯一失败是测试将六个“未知”误定位为单元素，生产代码未变；修正定位器后 SYSTEM-06 + 既有管理员前端 **4 files / 48 tests** 通过。
- 新鲜质量门：system-frontend typecheck；Vite production build **35 modules**；`check:repo`；`git diff --check`；Impeccable 对新增 TSX/CSS 的唯一一次定向 detector=`[]`。完整 `pnpm check` 留正式 UI 与 TEST 后单次执行。
- FIFO208 关闭，FIFO209 解锁给 UI 正式 React+Fastify+精确隔离 PostgreSQL 同状态终验；UI 只写验收/证据/CURRENT/日志，不修改生产代码。

## 2026-08-18｜FIFO208 固定任务 permission_blocked，规划接管同一 Rev1

- 前端固定任务收到正式派发后回执 `permission_blocked`：workspace root 正确但本轮为 read-only；动作前停止，生产文件/状态/测试修改均为 0，未触发 auto_review。这是权限环境故障，不是业务失败。
- 规划在当前 `C:\Users\ComradeGu\Documents\七猫兼职` 的 `workspace-write` 环境接管同一 `FRONT-SYSTEM-06C Rev1`，不创建第二实现、不增加 Rev。范围仍限独立 `system-frontend` 的 `/servers`、`/logs`、对应前端回归与证据。
- 继续使用已冻结 UI-SYSTEM-06 设计和 Impeccable 单次定向检查；不得重做视觉方向、伪造遥测/日志、修改 backend/contracts/migrations/员工 frontend，完整 `pnpm check` 仍留 UI/TEST 后关闭门。

## 2026-08-18｜FIFO207 规划复验关闭并解锁 FIFO208

- 规划新鲜运行 `tests/backend/system-control-operations.test.ts`，结果 **6/6**；backend build 与 `git diff --check` 通过（仅既有 CRLF 提示）。
- Delivery 历史 Attempt 现使用自己的 `request_id/status/error_code`，恢复后旧失败事实不变；ASR/ScreenText 的 `reconciliation_required` 优先于结算 `final/pending`，列表与详情一致。没有新增共享契约、迁移、领域写状态、fallback 或第二日志源。
- `BACK-SYSTEM-06B Rev2` 与 FIFO207 关闭；解锁 FIFO208 `FRONT-SYSTEM-06C Rev1`。正式前端必须消费真实 `/runtime` 与 `/operations`，对照 UI-SYSTEM-06 权威原型实现同壳双页，不能注入匿名样例或浏览器推算。

## 2026-08-18｜FIFO207 BACK-SYSTEM-06B Rev2 完成并转 review

- Delivery operations 记录现在从 `delivery_attempts.request_id`、`status`、`error_code` 读取；产品恢复为 ready 不会覆盖旧 generation_failed Attempt 的请求或脱敏错误，新 recovery Attempt 独立可发现。
- ASR/ScreenText Attempt 为 `reconciliation_required` 时，列表与详情均优先返回该状态；普通 Attempt 继续保留 Usage/Reservation 的 final/pending。
- 新鲜验证：operations 专项 6/6（含 Delivery 失败→恢复两 Attempt、final/pending→reconciliation_required、列表/详情一致）；backend build、`git diff --check` 通过。临时数据库已删除，本地 PostgreSQL 已停止；未改 API、契约、迁移或领域写状态机。

## 2026-08-18｜FIFO207 BACK-SYSTEM-06B Rev2 领取并进入 in_progress

- 已重读 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`docs/status/CURRENT.md` v4-540 与本日志顶部。
- `permission_ok`：workspace root 含 `C:\Users\ComradeGu\Documents\七猫兼职`；仓库为 `workspace-write/:workspace`；普通仓库编辑不走 `auto_review`。已写回 CURRENT v4-541，FIFO207 / `BACK-SYSTEM-06B Rev2` active、Current actor=后端开发对话、状态 in_progress。
- 本轮严格限于 operations service 与专项测试：Delivery Attempt 使用自身不可变 request/status/error；ASR/ScreenText `reconciliation_required` 优先于 Usage/Reservation；不改 API、契约、迁移、领域写状态机、前端或外部服务。

## 2026-08-18｜FIFO207 BACK-SYSTEM-06B Rev2 规划两文件微返工

- 规划核对 Rev1 最终 SQL 后确认历史 ASR/ScreenText Attempt 已独立、旧部署/路由/请求/费用不再被当前 Job 覆盖；权限、分页、CNY 与安全主体证据冻结。
- 同源残余一：Delivery Attempt 行仍以 `delivery_products.status/request_id` 判定错误与请求标识。产品恢复为 ready 后，旧 `generation_failed` Attempt 会丢失自己的错误事实，恢复请求也会被首个产品 requestId 覆盖；应只读使用 `delivery_attempts.status/request_id/error_code`，原因继续脱敏。
- 同源残余二：ASR/ScreenText Attempt 为 `reconciliation_required` 时，列表 `reconciliationStatus` 仍可能优先显示 Usage/Reservation 的 `final/pending`；应由 Attempt 的需对账状态优先投影 `reconciliation_required`，其他情况再保真使用既有结算状态，未知不得补零。
- 采用 v4.8 微返工快车道：只允许修改 `system-control.operations.service.ts` 与 `system-control-operations.test.ts`，新增失败→恢复两次 Delivery Attempt、需对账覆盖和列表/详情一致性回归；不改 API/契约/迁移/UI/领域写状态机，不重跑已冻结完整矩阵。

## 2026-08-18｜FIFO206 BACK-SYSTEM-06B Rev1 完成并转 review

- operations 只读投影使用现有 PostgreSQL 事实 `UNION ALL`：ASR、ScreenText、Delivery、system-control 均按每个持久 Attempt 生成稳定记录；仅在没有 Attempt 的 queued Job/Run 保留 job/run 级记录。
- ASR Dispatch 的 requestId 只从既有 `asr_dispatch_groups` / `asr_dispatch_project_results` 读取；非 Dispatch 且没有请求标识时保持 null，不伪造迁移字段。
- 专项在 seed 完成后取读取前计数，执行列表/详情读取，再取读取后计数，确认项目、Job/Attempt/Usage、Connection test、command/audit 均无写副作用。
- 修正历史 ASR Attempt 的部署/路由身份取值顺序：Attempt 优先、Job 仅在 Attempt 缺失时兜底；回归证明历史版本、请求、费用、错误不会被新 Attempt 覆盖。
- 新鲜验证：operations 4/4；contracts/backend typecheck、backend build、`check:repo`、`git diff --check` 全部通过；32 个迁移从空库通过，无新增迁移。专项临时数据库已删除，本地 PostgreSQL 已停止。

## 2026-08-18｜FIFO206 BACK-SYSTEM-06B Rev1 领取并进入 in_progress

- 已完整复读项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`docs/status/CURRENT.md` v4-537，以及 SYSTEM-06 运行可观测性里程碑、DESIGN 5.15、UI 验收、职责矩阵“系统控制台日志与质量”行和 `INT-11/12/13/15/17`。
- `permission_ok`：workspace root 含 `C:\Users\ComradeGu\Documents\七猫兼职`；仓库为 `workspace-write/:workspace`；普通仓库编辑不走 `auto_review`。已写回 `CURRENT` v4-538，FIFO206 / `BACK-SYSTEM-06B Rev1` active、Current actor=后端开发对话、状态 in_progress。
- 本轮冻结为 PostgreSQL 现有 ASR、ScreenText、Delivery 与 system-control 事实的 `UNION ALL` 只读 operations 列表/详情、逐请求 `system-control:logs:read` 权限、CNY 主金额与原币审计、服务端组合筛选/稳定分页/脱敏；不新增日志表、不改既有写状态机、不接外部服务、不通知前端/UI/测试。

## 2026-08-18｜FIFO205 BACK-SYSTEM-06A Rev2 规划复验通过，解锁 FIFO206

- 规划独立审计共享契约、`SystemControlRuntimeService` 与专项回归，确认资源目录唯一来自受控 `RuntimeTelemetryProvider.listResources`；无 Provider/空目录不伪造资源，静态 `RESOURCE_NAMES/KINDS/ORDER` 路径已删除。
- 当前配置只读复用 active control-plane pointer、routing pool 与 enabled deployment version；disabled/no-active 分别投影 `unknown`/`not_configured` 且拒绝宣称接收新任务。Job/Attempt/lease 与最近 24h throughput 使用同一 PostgreSQL `CURRENT_TIMESTAMP` 聚合，无浏览器推算、业务 bootstrap、fallback 或第二状态源。
- 规划新鲜验证：`tests/backend/system-control-runtime.test.ts` **5/5**；contracts build、backend build、`check:repo`、`git diff --check` 均通过（仅既有 `LOCAL_APP_PARITY.md` CRLF 提示）。沙箱首次启动 PostgreSQL 遇 restricted-token 错误后按本地测试授权启动成功，不属于业务失败。
- FIFO205 与 `BACK-SYSTEM-06A Rev2` 关闭；解锁 FIFO206 `BACK-SYSTEM-06B Rev1`，只实现跨领域运行记录列表/详情的 PostgreSQL 只读投影。正式前端、UI 终验与全链测试继续等待 Wave B。

## 2026-08-18｜FIFO205 BACK-SYSTEM-06A Rev2 完成并转 review

- 在 Rev1 已有链路上删除静态 `RESOURCE_NAMES/RESOURCE_KINDS/RESOURCE_ORDER` 执行面；资源身份、名称、kind 与 routing scope 现在只来自注入的受控 `RuntimeTelemetryProvider.listResources`，无 Provider/空目录返回空资源集与 `not_configured`，不伪造数据库、存储或 Worker。
- PostgreSQL 运行快照改为单一 `CURRENT_TIMESTAMP`：Job/Attempt/Delivery 领域事实、lease 与 24h throughput 在数据库侧有界聚合；配置只读复用唯一 active routing pointer、pool 与 enabled deployment version，disabled/no-active 分别返回 `unknown`/`not_configured` 且 `acceptingNewTasks=false`。
- 真实错误根因为 PostgreSQL UNION 的不同 enum 类型（42846：`asr_job_status`/`screen_text_job_status`/`screen_text_attempt_status`），统一在 SQL 边界转为 text；JSON 聚合时间字段按安全日期解析。未保留 debug handler 或原始错误日志。
- 新鲜验证：runtime 专项 `5/5`（连续复跑保持 `5/5`，最终 SQL 绑定 deployment executionKind 后再次 `5/5`）；contracts/backend typecheck 通过；backend build 通过；`check:repo` 通过；`git diff --check` 通过（仅现有 LOCAL_APP_PARITY CRLF 警告）。无迁移变更。测试临时数据库已删除，本地 PostgreSQL 已停止并确认未运行。
- 任务状态转 `review`，Current actor=规划对话；未启动 `/logs` Wave B，未修改生产前端/DESIGN，未接真实服务/网络/Secret/付费。

## 2026-08-18｜FIFO205 BACK-SYSTEM-06A Rev2 领取与权限握手

- 已完整重读项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`docs/status/CURRENT.md` v4-536、`docs/milestones/SYSTEM-runtime-observability.md`、`DESIGN.md` 5.15、`docs/ui/SYSTEM-runtime-observability-acceptance.md` 与本日志顶部。
- `permission_ok`：workspace root 含 `C:\Users\ComradeGu\Documents\七猫兼职`；仓库为 `workspace-write/:workspace`；普通仓库编辑直接写入，不走 `auto_review`。已写回 FIFO205 active / `BACK-SYSTEM-06A Rev2 in_progress`。
- 本轮范围冻结为后端 Wave A Rev2：受控 RuntimeTelemetryProvider 资源目录、active routing/deployment 的只读配置投影、明确数据库时间窗吞吐；不启动 `/logs` Wave B，不新增迁移，不改前端/DESIGN，不接真实 Agent/Grafana/Coolify/网络/Secret/付费/云资源。

## 2026-08-17｜FIFO205 BACK-SYSTEM-06A Rev2 规划定向退审

- 规划独立复核 Rev1 共享契约、运行服务、正式路由和隔离回归后，确认权限隔离、只读零副作用、Provider 失败 `unknown`、非法分页 400 与资源详情安全字段成立；但专项测试未覆盖三项与启动包/正式 UI 直接冲突的同源事实。
- 资源目录目前由 `RESOURCE_NAMES/RESOURCE_KINDS/RESOURCE_ORDER` 常量创建，而冻结边界要求资源/Worker 显示身份来自受控 `RuntimeTelemetryProvider` 目录；现状会把不存在的执行面固定显示成资源。`configuration` 对全部资源统一返回 `not_configured`，没有读取当前路由/部署版本与是否接收新任务；最近吞吐也未进入契约或 PostgreSQL 有界投影。
- FIFO204 关闭并合并为 FIFO205 同一任务 Rev2。后端只允许调整 runtime 共享契约、Provider/service/route 注入与专项测试：Provider 必须返回受控资源目录并允许默认空目录；四业务池是否存在及显示身份不得由浏览器或静态常量伪造；当前固定配置版本/接收新任务只读复用既有 active 路由/部署事实；最近吞吐使用明确时间窗和数据库时间有界聚合。数据库/对象存储若无受控目录或权威 Provider 必须保持未配置/未知。
- 冻结 Rev1 已通过的逐请求 `runtime:read`、PostgreSQL 错误 500/requestId/retryable、unknown/not_configured、服务端筛选排序分页、零写副作用与安全字段。不得启动 `/logs` Wave B，不得增加运行写命令、业务 bootstrap、第二状态源、legacy/fallback、真实 Agent/网络/Secret/付费/云资源；完整 `pnpm check` 仍留切片关闭门。

## 2026-08-17｜FIFO204 BACK-SYSTEM-06A Rev1 Wave A 完成并转 review

- 在既有 system-control 权限边界下新增运行资源共享契约、`RuntimeTelemetryProvider` 注入边界及三个正式只读入口：`/api/system-control/runtime/overview`、`/runtime/resources`、`/runtime/resources/:runtimeResourceId`；逐请求要求 `system-control:runtime:read`，未配置 Provider 返回 `not_configured`，Provider 失败返回脱敏 `unknown`，数据库错误仍走既有 Fastify 500/requestId/retryable 投影。
- 汇总只读取 PostgreSQL Job/Attempt/lease 与 `pg_stat_database` 事实，服务端筛选、排序、分页并返回真实 total；四个业务资源池、数据库与对象存储的未知/空/未配置语义保持单一来源，不新增迁移、不实现 `/logs` 或运行写控制。
- 精确隔离 PostgreSQL（从零迁移、临时库由专项创建并删除）运行资源专项 `1 file / 4 tests` 全部通过；contracts typecheck、backend build、`check:repo`、`git diff --check` 均通过。首次 build 的沙箱 `EPERM` 仅为既有 `backend/dist` 写权限，使用同一命令的本地权限重跑通过。
- 验证结束已停止本地 PostgreSQL，状态确认“项目本地实例未运行”；未运行完整 `pnpm check`，未接真实 Agent/Grafana/Coolify/网络/Secret/付费/云资源，未改生产前端或 DESIGN。FIFO204 当前交规划复核，UI-SYSTEM-06 并行事实保留。

## 2026-08-17｜FIFO203 UI-SYSTEM-06 Rev1 规划接管关闭

- UI 固定任务运行环境误判为 read-only，按 v4.8 在动作前停止；规划没有新开 Rev，在可写工作区接管同一 `/servers` 与 `/logs` 设计范围。新增 `DESIGN.md` 5.15、`docs/ui/SYSTEM-runtime-observability-acceptance.md` 和仓库外同壳原型 `ui-system-06-runtime-observability`。
- `/servers` 现为只读运行面摘要、资源清单和详情深链；删除早期占位页的“暂停新任务”第二控制路径。`/logs` 统一展示跨领域 Job/Attempt/Usage/事件、requestId、人民币金额/待对账、时间线和唯一控制所有者深链，不保存正文、Secret、对象键、连接串或原始载荷。
- 新鲜浏览器证据：1440 根 `1440/1440`；1024 根 `1014/1014` 或 `1024/1024`，侧栏 72→覆盖216 时正文尺寸不变；资源表 `912/960`、日志表 `922/1180` 仅容器内横滚。详情 Tab/Shift+Tab/Escape 闭环、错误→再次失败→恢复、requestId 与 H1 焦点成立，console `0/0`。
- 新原型全壳已归一 CNY 主显示，真实 DOM `USD=false / ¥=false`。Impeccable detector 按要求仅运行一次并降级 regex；唯一继承单侧粗线已改为内嵌标识线，内联 Finish Reviewer=`ship`。生产 frontend/backend/contracts/迁移修改 0；FIFO204 后端 Wave A 继续。

## 2026-08-17｜FIFO204 BACK-SYSTEM-06A Rev1 领取与权限握手

- 已完整重读 `qimao-terms-cloud/AGENTS.md`、`docs/WORKFLOW.md v4.8`、`docs/status/CURRENT.md v4-534`、`docs/milestones/SYSTEM-runtime-observability.md`、职责矩阵“系统控制台服务器与运行环境”行及 `INT-11/12/13`。
- `permission_ok`：workspace root 含 `C:\Users\ComradeGu\Documents\七猫兼职`；仓库为 `workspace-write/:workspace`；普通仓库编辑直接写入，不走 `auto_review`。已进入 `FIFO204 active / BACK-SYSTEM-06A Rev1 in_progress`。
- 范围冻结为 Wave A：运行资源、领域运行汇总、受控 `RuntimeTelemetryProvider` 共享契约与正式只读 API；不实现 `/logs`、写控制、第二状态源、真实 Agent/Grafana/Coolify/网络/Secret/付费/云资源/部署，不启动本地 PostgreSQL。

## 2026-08-17｜FIFO202 PLAN-SYSTEM-06 Rev1 用户确认与启动包冻结（最新）

- 用户确认“先只读诊断、复用既有调控、不造第二状态源”的推荐方案。新增 `docs/milestones/SYSTEM-runtime-observability.md`，一次性固定 `/servers`、`/logs`、上游入口/下游深链、PostgreSQL 与遥测 Provider 数据所有权、正式读取 API、权限、失效恢复、迁移初始数据、隔离测试和 UI 公共原语。
- 职责矩阵新增“系统控制台服务器与运行环境”“系统控制台日志与质量”两行；`INT-12` 明确 SYSTEM-06 只读下钻并继续调用既有引擎/路由/预算/领域命令，`INT-17` 更新为人民币零网络纵向链已关闭。
- 任务按物理文件和独立失败面拆分：`UI-SYSTEM-06` 与 `BACK-SYSTEM-06A` 可并行；`BACK-SYSTEM-06B` 等 A 后串行；`FRONT-SYSTEM-06C` 等 UI/A/B；`TEST-SYSTEM-06` 最后纵向验收。真实 Agent/Grafana/Coolify/云写操作/SSH/购买/部署均不在范围。
- CURRENT 递增 v4-534；FIFO203/204 已 ready，等待向 UI/后端固定任务正式唤醒并确认权限与运行态。

## 2026-08-17｜FIFO202 PLAN-SYSTEM-06 Rev1 进入用户评审（最新）

- 人民币成本归一关闭后，规划按既有 `SYSTEM_CONTROL_CENTER.md` 与 `INT-12/13` 提出下一切片：服务器、应用、Worker、队列、数据库/对象存储的运行详情，以及按 requestId/项目/能力/状态/时间检索的脱敏日志。
- 推荐首切片只读：Worker 并发和接收能力仍由现有 `/routing` 版本与发布命令拥有，预算阻断仍由 `/budgets` 拥有，引擎启停仍由 `/engines` 拥有；新页面只展示并深链，不新增第二个暂停开关或状态源。
- 运行环境不存在真实遥测时必须显示“未接入/未知”，不得伪造 CPU/GPU/磁盘/备份；本地零网络阶段可使用受控运行摘要 Provider，真实服务器 Agent、Grafana/Coolify、云写 API、SSH、购买、扩缩容和部署均不在首切片。
- 按 v4.8 规划协商门，`PLAN-SYSTEM-06` 保持 review / Current actor=用户；UI、后端、前端和测试均未解锁，等待用户确认该推荐范围。

## 2026-08-17｜规划关闭人民币成本归一纵向切片（最新）

- 规划复核 FIFO201 后发现并关闭四类同源缺口：新预算请求仍可提交外币规则、人民币原生计费错误依赖换算快照、外币引擎覆盖错误要求同币种预算规则、当前总览可能混入历史原币金额；同时修正一处错误乱码和 1024 预算弹窗无必要横滚。没有增加 legacy、fallback、浏览器汇率或第二状态源。
- 共享契约现要求新预算与当前用量为 CNY；后端对 CNY 原生直入，对外币使用不可变快照并写入精确 CNY 事实；当前预算只汇总 CNY，历史原币仅审计。管理员正式页面只创建 ASR/OCR 的人民币日/月规则。
- 新鲜定向验证：预算后端 **15/15**、ASR+ScreenText **29/29**、管理员前端 **33/33**；contracts/backend/system-frontend 类型和构建、`check:repo`、迁移语法与 `git diff --check` 通过。
- 新鲜双视口：1440 根 `1440/1440`；1024 实际客户区 `1009/1009`，侧栏72、预算弹窗 `634/634`，无美元主显示、无弹窗内横滚；console error/warn=`0/0`。
- 完整 `pnpm check` 首次在沙箱服务账户于迁移启动前遇到 `uv_os_get_passwd ENOMEM`；正常 Windows 用户上下文原命令通过：**32 files / 318 tests**，四工作区全部检查与构建成功。报告见 `docs/testing/SYSTEM-cny-cost-normalization-integration-report.md`。
- FIFO201、`BACK-SYSTEM-04D`、`FRONT-SYSTEM-04E` 与 `TEST-SYSTEM-04CNY` 统一关闭；本地 PostgreSQL 已停止。真实汇率、真实 Secret、供应商网络、付费、云资源和部署仍未授权。

## 2026-08-17 FIFO201 BACK-SYSTEM-04D Rev1 完成回执（最新）

- CostConversionSnapshot 与 CNY-only 预算账本已完成；CNY 原生直入、外币 numeric 精确换算并向上取整 6 位，原币/快照/CNY 事实追加保存。
- 新鲜验证：隔离空库 32 迁移（含 1754976017000）、预算 13/13、ASR 13/13、ScreenText 16/16、contracts/backend build、check:repo、diff-check 全通过；默认库本任务 Attempt/Reservation 均 0，PostgreSQL 已停止。
- 任务转 review，Current actor=规划对话，Reviewer=规划对话；未接真实汇率、Secret、供应商或付费服务。

## 2026-08-17｜FIFO201 BACK-SYSTEM-04D Rev1 领取与权限握手

- 已重读 FIFO201 权威输入：`AGENTS.md`、`WORKFLOW.md v4.8`、`CURRENT v4-529`、`SYSTEM-cny-cost-normalization.md`、预算职责行、`INT-15/17` 与日志顶部。
- `permission_ok`：workspace root 含 `C:\Users\ComradeGu\Documents\七猫兼职`；仓库为 `workspace-write/:workspace`；普通仓库编辑直写且不走 `auto_review`。已将 FIFO201 / `BACK-SYSTEM-04D Rev1` 写回 `in_progress`。
- 本轮只实现不可变零网络 CostConversionSnapshot、CNY-only 预算账本、原币种与 CNY 追加事实及外部副作用前的精确换算门；不接真实汇率网络、Secret、供应商、付费、云资源或部署，不改生产前端/DESIGN。

## 2026-08-17｜FIFO201 BACK-SYSTEM-04D Rev1 正式派发

- SYSTEM-05 已完成正式关闭并释放 `system-control` / contracts 文件所有权；CURRENT 递增至 v4-529，`BACK-SYSTEM-04D Rev1` 转 `ready / Current actor=后端开发对话 / Reviewer=规划对话`。
- 权威输入为 `docs/milestones/SYSTEM-cny-cost-normalization.md`、职责矩阵预算行和 `INT-15/17`。先实现不可变零网络换算快照、CNY 原生直入、外币精确十进制换算、6 位向上取整、过期/缺失/unknown 在外部副作用前阻断、原币种+CNY 只追加审计与 CNY-only 新预算规则；换版只影响新 Attempt。
- 必须删除新写路径的多币种预算比较，不增加 legacy/compat/fallback/浏览器换算；不接真实汇率网络、真实 Secret、供应商网络、付费、云资源或部署，不改生产前端/DESIGN。完成后只交规划，不直接通知前端/UI/测试。

## 2026-08-17｜规划接管关闭 FIFO200 / TEST-SYSTEM-05 与 SYSTEM-05

- 固定测试任务本轮为 `read-only`，规划在当前 `workspace-write` 环境接管同一验收范围；没有创建第二实现、降低验收门或调用 Superpowers。正式报告写入 `docs/testing/SYSTEM-secret-security-integration-report.md`。
- 正式 Fastify 端口级联调补齐：security、references、discovery、overview 读取均为 200；零网络 Provider 受控登记失败为 422、带真实 Fastify requestId，唯一恢复保持弹窗焦点。1440/1024、宽表内滚、两站隔离与控制台 0/0 通过。
- 首次完整 `pnpm check` 在沙箱服务账户被 `uv_os_get_passwd ENOMEM` 拦截；正常 Windows 用户上下文恢复。随后唯一失败为隔离撤销测试从零执行 31 个迁移耗时 5.24 秒越过默认 5 秒，测试改为明确 15 秒上限；未改生产代码、未加重试/sleep/fallback。
- 最终完整 `pnpm check` 新鲜通过：仓库规则、四工作区 lint/typecheck、**32 files / 313 tests**、contracts/backend/frontend/system-frontend build 全部成功；Secret 定向 **6/6**。SYSTEM-05 P0/P1/P2/P3=`0/0/0/0`，正式关闭。
- 真实 Secret、Vault、供应商网络、付费、云资源与部署仍未接入。下一切片按既定串行门转 `BACK-SYSTEM-04D`，实现 `INT-17` 人民币成本归一；浏览器不计算汇率，真实汇率网络仍后置。

## 2026-08-17｜FIFO200 TEST-SYSTEM-05 Rev1 正式派发

- 规划已先完成 FIFO199 正式实现、专项/构建与浏览器预审，并把 `CURRENT` 递增为 v4-528；现仅向全链测试固定任务派发独立纵向验收，不通知或重启前端/UI/后端。
- 验收必须使用精确隔离 PostgreSQL、正式 Fastify 与 `system-frontend` production build，覆盖逐请求权限、两站隔离、Provider ready/not_configured/unknown、候选登记、不可变版本、零网络验证、引擎新版本绑定、轮换不自动换绑、撤销保护、unknown 同稳定身份恢复、确定失败/requestId/唯一恢复、1440/1024 与根/表格滚动。
- 禁止接触真实 Secret/Vault/供应商网络/付费/云资源/部署；禁止向员工站暴露 ControlShell 或 system-control API；禁止把受控 Provider/匿名夹具写入生产常量。测试完成后先写回报告/CURRENT/日志，再主动唤醒规划并确认送达；完整 `pnpm check` 留规划关闭门统一运行。

## 2026-08-17｜FIFO199 FRONT-SYSTEM-05B Rev1 规划接管正式实现与预审

- 固定前端任务本轮仍为 `read-only`，规划在当前 `workspace-write` 环境按同一冻结方向完成正式实现，不创建第二套页面、不调用 Superpowers、不混入 CNY 横切。新增 `secretApi.ts`、`securityPage.tsx`、`security.css` 与正式专项；接入 `App/ControlShell`，并让 `/engines` 的新版本只消费服务端列出的同能力、同提供方不可变引用版本。
- `/security` 已覆盖安全就绪摘要、候选、引用服务端搜索/筛选/排序/分页、详情、版本、验证、使用位置、审计、登记/轮换/撤销、确定失败和 unknown 同稳定身份恢复。恢复句柄只保存安全命令类型/稳定 ID/中文标签，结构有界校验；不保存业务事实或 Secret，不接受任意 referenceId。
- 关闭预审发现的三项边界：轮换候选增加 provider 匹配；恢复句柄严格校验 kind/id/label；撤销失败重新读取进入 busy 锁，防重复并保持弹窗焦点。CSS 已从单行草稿整理为职责可读样式，正式 `securityPage.tsx` 约 24KB/183 行、CSS 约 190 行，均未形成 800 行巨型文件。
- 新鲜验证：管理端三份前端专项 **43/43**；`system-frontend` typecheck 通过；Vite production build **30 modules**；`check:repo` 通过。后端 Secret 专项首次因本地 55432 未启动得到六项同源 `ECONNREFUSED`，启动项目自带 PostgreSQL 后原命令 **6/6** 通过，未修改产品代码，不记业务缺陷。
- 正式浏览器预审：1440 根 `1440/1440`、侧栏/正文 `216/1224`；1024 根 `1009/1009`，收起侧栏 72、正文 `x=72 / width=937`，覆盖展开 216 后正文不变，候选表 `861/1060` 只在自身横滚。登记 422 保留 `requestId=browser-secret-422`，唯一“刷新候选”获焦且在 dialog；初始焦点、反向闭环、Escape 回“登记引用”通过。
- 证据位于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\12\019ff4f8-4a77-7870-8edf-6350490b316c\ui-system-05-formal\`。浏览器视口/标签、临时 Vite 和受控同源 HTTP 已清理；正式前端现转 review，下一步只路由 `TEST-SYSTEM-05` 精确隔离纵向验收与完整质量门。真实 Secret/供应商网络/付费/云资源/部署仍未接入。

## 2026-08-17｜规划接管关闭 FIFO196 / UI-SYSTEM-05 Rev1

- UI 固定任务连续两次恢复均为 `read-only`。为避免继续空等，规划在当前 `workspace-write` 环境复用原 `ui-system-01-control-shell` 中间态完成同一设计，不创建第二方向、不修改生产前后端/contracts/迁移，也未调用 Superpowers。
- 补齐登记确定失败、轮换确定失败和撤销确定失败：前两者保留工作流并只提供“刷新候选”；撤销明确未生效、保留旧事实并只提供“重新读取安全引用”。`DESIGN.md` 新增 5.14，新增 `docs/ui/SYSTEM-secret-security-acceptance.md`，与正式 Secret/Engine 契约和 `INT-11/13/15/16` 对齐。
- 新鲜浏览器证据：1440 三失败态根 `1440/1440`；1024 收起侧栏 72、覆盖展开 216，主区均 `x=72 / width=942`，根 `1014/1014`，引用表只在 `912/1180` 容器内横滚。撤销确认焦点“安全返回↔确认撤销”双向闭环，Escape 回原触发点；console error/warn=`0/0`。
- 原 UI 任务证据目录仍只读，新增三张截图改存当前可写规划证据目录 `C:\Users\ComradeGu\.codex\visualizations\2026\08\12\019ff4f8-4a77-7870-8edf-6350490b316c\ui-system-05-planning-takeover\`，验收文档已明确。Impeccable detector 按规则只运行一次并降级 regex；唯一警告是既有 `/engines` 身份线，不属于本轮新增 `/security`。
- 原型 `app.js` / `serve.mjs` 的 `node --check` 与授权文档 `git diff --check` 通过；浏览器视口已复位、验收标签已关闭，本轮临时 Node 服务 PID 39624 已精确停止。
- FIFO196 与 UI-SYSTEM-05 关闭；BACK-SYSTEM-05A 已先关闭，现解锁 `FRONT-SYSTEM-05B`。CNY `INT-17` 继续串行等待 SYSTEM-05，不混入 Secret 页面；真实 Secret/供应商网络/付费/云资源/部署仍未授权。

## 2026-08-17｜规划独立关闭 FIFO198 / BACK-SYSTEM-05A Rev2

- 规划重读最终契约、路由、Secret 服务、验证 Worker 与六项专项回归，确认新建/轮换先 `unknown`、成功验证后才可绑定，`validation_failed/unknown/revoked/rotation_due` 由 PostgreSQL 事件与数据库时间唯一投影；没有浏览器推算、fallback、兼容路径或第二状态源。
- 正式读取闭环已覆盖引用筛选/排序/分页、详情、不可变版本、验证历史、使用位置、审计、三类命令 GET 与撤销影响预检；无效页码稳定 400，不存在引用稳定 404，空页保留真实 total，不再保留占位详情旧路径。隔离竞态证明预检后 active 路由变化时撤销事务重新阻断，跨引用隔离且 command/status/audit 零副作用。
- 规划首次启动数据库在沙箱受限令牌下失败（`pg_ctl error code 87`），随后测试仅因端口未监听而 `ECONNREFUSED`；按基础设施分流改用正常 Windows 用户上下文后启动成功，未修改业务代码。新鲜复验：Secret+Engine **2 files / 12 tests**、预算隔离 **1 file / 10 tests** 通过；contracts build、backend typecheck/build、`check:repo`、`git diff --check` 通过。Secret 竞态用例自身从零执行 31 个迁移并删除隔离库。
- FIFO198 与 `BACK-SYSTEM-05A Rev2` 关闭；真实 Secret、Provider 网络、付费、云资源和部署仍未授权。下一步只恢复同一 FIFO196 UI 固定任务，不创建第二设计实现；正式管理员前端继续等待 UI 通过。

## 2026-08-17 FIFO198 BACK-SYSTEM-05A Rev2 completion

- Secret versions now start as `unknown`; only the zero-network validation Worker can produce `available`. The read projection computes the fixed 90-day `rotation_due` state, and due versions remain bindable. Revoke reasons are trimmed and require at least 8 characters.
- Added bounded server-side reference filtering/sorting/pagination with true totals, version/validation/usage/audit safe reads, GET recovery for create/rotate/revoke commands, and read-only revoke impact preflight. Revoke rechecks active routes and non-terminal attempts in the same transaction.
- Fresh evidence: Secret 6/6, Engine 6/6, isolated Budget migration/suite 10/10; contracts/backend typecheck, backend build, `check:repo`, and `git diff --check` passed. The Secret race test migrated 31 files in a temporary PostgreSQL database, then dropped it and confirmed it was absent.
- One attempted shared `TRUNCATE ... CASCADE` cleanup was rejected by the safety gate and did not land; the race test was completed with a dedicated temporary database instead. No migration, frontend/DESIGN, real Secret/provider/network/paid service, commit, push, or deployment was added.
- Final local PostgreSQL status: stopped (`node tools/local-postgres.mjs status` reports not running).

## 2026-08-17｜FIFO198 BACK-SYSTEM-05A Rev2 permission_ok 与领取

- 已完整重读 `AGENTS.md`、`docs/WORKFLOW.md v4.8`、`CURRENT v4-522`、`SYSTEM-secret-security-readiness.md`、职责矩阵密钥行、`INT-11/13/15/16` 与日志顶部。
- permission fingerprint：`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`；普通仓库编辑直写，不走 `auto_review`。CURRENT 递增至 `v4-523`，FIFO198 / `BACK-SYSTEM-05A Rev2` 已进入 `in_progress`，Current actor=后端开发对话 / Reviewer=规划对话。
- 本轮仅收口已冻结范围内四组 Secret P1：未验证版本不得绑定、正式服务端读取投影、create/rotate/revoke 稳定命令 GET 恢复、90 天轮换提示与撤销理由校验；不重写 FIFO197，不接真实 Secret/Provider/网络/付费/Cloudflare/云资源，不混入 CNY `SYSTEM-04CNY/INT-17`，不启动 UI/前端/测试角色。

## 2026-08-17｜FIFO197 BACK-SYSTEM-05A Rev1 审计与验证完成

- 按最新 `CURRENT v4-520` 复核暂停点第一版：permission fingerprint 保持 `permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`，普通仓库编辑直写，不走 `auto_review`；FIFO196 UI 的 `read-only/permission_blocked` 并行事实未覆盖。
- 关闭唯一真实失败根因：`system-control.secret.service.ts` 撤销保护针对 `screen_text_attempts` 使用了只存在于 job enum 的 `confirmed_empty`，改为该 attempt enum 的 `completed/failed/cancelled` 终态集合；未增加 fallback、重试或第二状态源。补充同稳定 commandId 同幂等键 replay=200 回归，异幂等键仍稳定 409。
- 审计确认旧 `system-control.secret-reference.ts` 路径、旧 resolver/任意 `referenceId` 写入路径已删除；Secret provider→PostgreSQL reference/version→validation worker→engine binding 使用 `secretReferenceVersionId` 单一权威链，响应/审计/日志不回显 Secret 值或内部句柄。CNY `SYSTEM-04CNY/INT-17` 未进入本任务。
- 新鲜验证：Secret 专项 2/2、Engine 专项 6/6（合计 8/8）；contracts 与 backend `tsc --noEmit` 通过；backend 产物构建通过；`check:repo` 通过；`git diff --check` 通过（仅既有 `LOCAL_APP_PARITY.md` CRLF 提示）。隔离临时库从零执行 31 条迁移，Secret/Engine/命令/审计业务表均为 0，数据库已 DROP；默认库专项残留计数为 0。
- 本轮启动的本地 PostgreSQL 已停止（`status` 返回未运行）；未接真实 Secret/Vault/网络/付费/Cloudflare/云资源，未运行完整 `pnpm check`，未提交/推送/部署。FIFO197 转 `review`，Current actor=规划对话。

## 2026-08-17｜FIFO196 恢复握手 permission_blocked

- UI 固定任务完整重读 v4.8 恢复包后回执：workspace root 为 `C:\Users\ComradeGu\Documents\七猫兼职`，但本轮 permission profile 为 `read-only`，不满足 `workspace-write/:workspace`。
- UI 按协议未触发 `auto_review`、未修改 CURRENT/日志/原型/DESIGN/docs/ui，未运行浏览器矩阵或测试，也未把任务误转为 `in_progress`。规划将 FIFO196 / `UI-SYSTEM-05 Rev1` 标记为 `permission_blocked / Current actor=规划对话`；中间态保留，恢复可写后继续同一任务，不新开第二实现、不增加 Rev。
- FIFO197 后端已明确 `permission_ok`，继续独立收口，不因 UI 权限阻塞而停止；正式前端仍等待 UI 与后端双依赖规划验收。同步版本更新为 `v4-520`。

## 2026-08-17｜FIFO197 BACK-SYSTEM-05A Rev1 恢复与 permission_ok

- 已重新读取项目 `AGENTS.md`、`docs/WORKFLOW.md v4.8`、`CURRENT v4-518`、`SYSTEM-secret-security-readiness.md`、`SYSTEM-engine-control-plane.md`、职责矩阵密钥行、`INT-11/13/15/16` 及暂停日志列出的实际修改文件。
- permission fingerprint：`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`；普通仓库编辑直接执行，不走 `auto_review`。`CURRENT` 差量递增至 `v4-519`，FIFO197 已恢复为 `in_progress`，Current actor=后端开发对话 / Reviewer=规划对话；UI FIFO196 并行事实保留。
- 恢复边界：只审计并验证暂停时落盘第一版，不重写；SYSTEM-04 CNY（`SYSTEM-cny-cost-normalization.md` / `INT-17`）保持串行，不混入 Secret 范围；不接真实 Secret/Vault/网络/付费/Cloudflare/云资源，不跑完整 `pnpm check`。

## 2026-08-17｜用户恢复执行与全站人民币口径冻结

- 用户发出“继续”，规划从 `CURRENT v4-517` 安全暂停点恢复；FIFO196 / `UI-SYSTEM-05 Rev1` 与 FIFO197 / `BACK-SYSTEM-05A Rev1` 重新转 `ready`，分别回到 UI、后端固定任务，Rev 不变。恢复包要求复用已落盘中间态，先核对暂停时未完成的失败状态接线与幂等微调，不重写、不把旧证据冒充新鲜通过。
- 用户此前明确“所有费用统一按人民币计算”。新增 `docs/milestones/SYSTEM-cny-cost-normalization.md` 与 `INT-17`，并更新 SYSTEM-04 里程碑/职责矩阵：全站预算、限额、费用趋势和报表统一 CNY 主金额；厂商原币种仅保留不可变管理员审计；外币必须由后端固定换算快照后进入 CNY 预留/结算，浏览器不计算，缺失/过期/unknown 时稳定阻断且不补零。
- CNY 归一拆为 `BACK-SYSTEM-04D → FRONT-SYSTEM-04E → TEST-SYSTEM-04CNY`，因与 SYSTEM-05 重叠修改 `system-control`、contracts 与管理员前端，按唯一文件所有者规则等待 SYSTEM-05 关闭后串行执行；真实汇率服务、Secret、外部网络、付费和部署仍需单独授权。
- 同步修正 CURRENT 固定前端任务 ID 的历史笔误为 `01a00445-1c71-72d3-9171-33ad2c36e941`。同步版本更新为 `v4-518`；本轮未修改生产前后端、迁移、共享代码契约或 DESIGN，未运行测试、未提交推送部署。

## 2026-08-17｜FIFO196 UI-SYSTEM-05 Rev1 用户即时暂停

- 已按用户即时要求停在安全边界：停止原型/文档修改、浏览器验证、测试与后续收口；未回滚、未清理、未提交。任务转 `blocked / Current actor=规划对话 / Reviewer=用户`。
- 本轮仓库内实际修改仅为状态文件 `docs/status/CURRENT.md` 与本日志；`DESIGN.md`、`docs/ui/` 尚未写入，生产 `system-frontend/frontend/backend/contracts/migrations` 修改 0。
- 仓库外同壳原型已修改 `ui-system-01-control-shell/index.html`、`app.js`、`styles.css`，并生成 `evidence/ui-system-05-rev1/` 下 6 张 1440/1024 中间证据。已做到 `/security` 主列表、随引用切换的详情、不可变版本、验证五态、登记/轮换/撤销保护、Access 摘要与双视口；独立审查结论为 `material-fixes`，尚未冻结。
- 集中修正停在中间态：`index.html` 已新增登记失败、轮换失败、撤销失败三个场景选项，但 `app.js` 尚未接入其路由/状态处理；因此这些选项不是可验收完成事实。现有截图和尺寸仅代表暂停前证据，不作为最终通过结论。
- 运行态按“暂停期间不清理”原样保留：本地 `node serve.mjs` 会话 `33476` 仍服务于 `http://127.0.0.1:41761/security`；应用内浏览器 `tab196` 仍打开该本地页，最后视口为 1440×900。当前无测试或验证命令在运行，未再操作浏览器或服务。
- 用户新增方向“所有费用统一按人民币 CNY 计算和展示”仅登记为待规划裁决；暂停期间未实施、未改预算或安全设计。

## 2026-08-17｜FIFO197 BACK-SYSTEM-05A Rev1 按用户指令暂停

- 用户要求立即暂停所有手头工作；FIFO197 / `BACK-SYSTEM-05A Rev1` 已写回 `CURRENT v4-516` 为 `blocked`，Current actor=规划对话，Reviewer=用户。UI FIFO196 `in_progress` 并行事实保留。
- 本轮已实际修改/新增：`packages/contracts/src/system-control.ts`、`packages/contracts/src/system-control-secret.ts`、`packages/contracts/src/index.ts`；`backend/migrations/1754976016000_create_system_secret_security.cjs`；`backend/src/app.ts`、`backend/src/server.ts`、`backend/src/types/fastify.d.ts`；`backend/src/modules/system-control/system-control.auth.ts`、`system-control.engine.errors.ts`、`system-control.engine.service.ts`、`system-control.routes.ts`、`system-control.secret-provider.ts`（替代旧 `system-control.secret-reference.ts`）、`system-control.secret.service.ts`、`system-control.secret-validation.worker.ts`；`backend/src/workers/system-control.secret-validation.worker.entry.ts`；`tests/backend/system-control-engine.test.ts`、`tests/backend/system-control-secret.test.ts`。
- 已到达阶段：契约/增量迁移/Provider 边界/Secret 服务/零网络校验 Worker/路由与引擎绑定第一版已落盘；旧引擎专项曾新鲜通过 `6/6`，contracts/backend 类型检查曾通过，但最后一次幂等身份微调后未再运行类型或测试，不能视为最终通过。
- 本地 PostgreSQL 曾启动并成功执行新增 `1754976016000_create_system_secret_security` 迁移；暂停前已停止，当前无运行中命令、服务或数据库。未回滚、未清理、未提交、未接真实 Secret/Provider/网络/付费。
- 用户新增“所有费用统一按人民币 CNY 计算和展示”仅记录为待规划裁决，本轮暂停期间未实施或修改预算逻辑。

## 2026-08-17｜FIFO196 UI-SYSTEM-05 Rev1 领取与 permission_ok

- 已完整读取项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`CURRENT v4-514`、`SYSTEM-secret-security-readiness.md`、`DESIGN.md` 5.11–5.13、Control Center“密钥与安全”、职责矩阵对应行、`INT-16` 与开发日志顶部。
- permission fingerprint：`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`；业务仓库 `qimao-terms-cloud` 位于可写 workspace root，普通仓库编辑直接执行，不走 `auto_review`。
- `CURRENT` 差量递增至 `v4-515`；FIFO196=`active`，`UI-SYSTEM-05 Rev1`=`in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`。本轮只改 `DESIGN.md`、`docs/ui/`、仓库外同壳原型/证据、CURRENT/日志；不改生产前后端、contracts、迁移，不接真实 Secret/供应商/网络/付费/云资源。

## 2026-08-17｜FIFO197 BACK-SYSTEM-05A Rev1 领取与 permission_ok

- 已完整读取项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`CURRENT v4-513`、`SYSTEM-secret-security-readiness.md`、`SYSTEM-engine-control-plane.md`、职责矩阵密钥行、`INT-11/13/15/16`、现有 Secret resolver/engine service/worker/tests 与日志顶部。
- permission fingerprint：`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`；普通仓库编辑直接执行，不走 `auto_review`。
- `CURRENT` 差量递增至 `v4-514`，FIFO197 / `BACK-SYSTEM-05A Rev1` 已进入 `in_progress`。本轮严格限定 system-control 共享契约、必要迁移、后端模块/Worker 入口、后端专项测试、CURRENT/日志；默认 Provider 空拒绝写入，仅允许注入零网络 fake，不接真实 Secret/Vault/网络/付费/Cloudflare/云资源/部署。

## 2026-08-17｜PLAN-SYSTEM-05 冻结并派发 FIFO196/197

- 在 SYSTEM-04 完整关闭后，规划按用户全权续接授权选择真实供应商前的最短安全依赖：先完成“密钥与安全引用”，不直接接触真实 Secret、网络或付费调用。
- 新增 `docs/milestones/SYSTEM-secret-security-readiness.md`：固定服务器发现候选、稳定 SecretReference/不可变版本、零网络验证、引擎版本绑定、轮换/撤销保护、Access 就绪摘要和 `/security`；禁止浏览器任意引用、明文输入、内部句柄回显、fallback/legacy/第二状态源。
- 新增 `INT-16` 并更新职责矩阵/路线图：Secret 值归部署环境 Provider，PostgreSQL 只持身份、摘要、状态、关系、命令和审计；SYSTEM-03 引擎版本只绑定引用版本身份，SYSTEM-04 预算仍独立先于任何付费副作用。
- CURRENT 增至 v4-513；FIFO196 `UI-SYSTEM-05 Rev1` 与 FIFO197 `BACK-SYSTEM-05A Rev1` 在文档/生产后端目录不重叠前提下并行派发。正式 `FRONT-SYSTEM-05B` 与独立测试继续 blocked，等待双依赖规划验收。

## 2026-08-17｜规划关闭 FIFO195 / TEST-SYSTEM-04 与 SYSTEM-04 完整质量门

- 规划独立核对 `docs/testing/SYSTEM-budget-guardrails-integration-report.md` 与仓库外脱敏 `system-budget-04-integration/summary.json`：精确隔离 PostgreSQL 30 migrations、正式 Fastify/system-frontend、零网络 stub、权限/两站隔离、预算金额/多币种/预留结算/版本隔离/发布回滚、1440/1024 与断连恢复均通过；P0/P1/P2/P3=`0/0/0/0`，无 `QA-SYSTEM-04-*`。
- 首次完整 `pnpm check` 在沙箱服务账户调用 Node 24 `os.userInfo()` 时被 Windows 错误映射为 `uv_os_get_passwd ENOMEM`；物理内存仍有约 2.3GB。改用正常 Windows 用户上下文后环境故障消失，未修改生产代码或增加 fallback。
- 全套测试暴露唯一测试结构问题：`screen-text.test.ts` 将三类 Adapter 完整链塞在同一 5 秒用例中，稳定耗时约 5.5 秒。测试已拆为三个参数化用例，各 Adapter 独立计时与定位；画面字专项新鲜 **16/16** 通过，生产行为零修改。
- 最终完整 `pnpm check` 新鲜通过：仓库规则、四工作区 lint/typecheck、数据库迁移、**30 文件 303/303** 测试、contracts/backend/frontend/system-frontend build 全部成功；员工前端仅保留既有大 chunk 非阻断提示。`git diff --check` 无新增空白错误，仅既有 `LOCAL_APP_PARITY.md` CRLF 提示。
- 已按约定停止项目本地 PostgreSQL并核验“未运行”；未接真实供应商、Secret、网络、付费或云资源，未提交、推送或部署。CURRENT 增至 v4-512，FIFO195 / TEST-SYSTEM-04 / SYSTEM-04 正式关闭；下一规划切片转向 SYSTEM-05 密钥与安全引用及真实供应商接入前置门。

## 2026-08-17｜FIFO195 TEST-SYSTEM-04 Rev1 独立集成验收完成并交规划复核

- 精确隔离 PostgreSQL 从零执行 30 migrations；正式 Fastify/system-frontend production build 与零网络 stub 完成纵向验收。预算专项 `10/10`、ASR `13/13`、画面字 `14/14`、系统控制前端 `39/39`；system-frontend Vite `27 modules`、system-frontend typecheck、backend build 均通过。
- 权限逐请求矩阵通过：anonymous/employee/no-capability 均 403；`budget:read` 仅读、`budget:write`/`budget:publish` 精确隔离；员工 `frontend` 源码与 build 中 `ControlShell`、`/api/system-control`、预算入口命中均为 0。数据库策略版本/唯一 active pointer、精确十进制多币种、warning/hard、pending/unknown/reconciliation、原子预留/结算、V1/V2 快照和发布/回滚未知重读均按冻结矩阵通过。
- 正式 `/budgets` 页面：1440×900 与 1024×768 根/正文横溢出均 0；1024 宽表容器内部 `overflow-x:auto`；预算导航精确 1 个；console error/warn=`0/0`；断连后连接池恢复并刷新仍返回真实服务端事实，响应含 requestId 且不泄露 Secret/objectKey/连接信息。
- 首次 ASR+ScreenText 并行联跑出现 3 个超时/死锁；重建同名隔离库后拆分串行 `14/14 + 13/13` 全部通过，确认是测试夹具并行污染，不归因产品、不生成 QA-SYSTEM-04。
- P0/P1/P2/P3=`0/0/0/0`。隔离库已精确 DROP、31950/31951 与本轮 harness/日志/临时脚本已停止/删除，共享 PostgreSQL 55432 保持运行；原始素材未触碰。报告 `docs/testing/SYSTEM-budget-guardrails-integration-report.md` 与仓库外脱敏 `summary.json` 已写回。
- 状态已写回 CURRENT v4-511：FIFO195=`review`，`TEST-SYSTEM-04 Rev1=review`，Current actor=`规划对话`；只唤醒规划，不通知 UI/前端/后端。

## 2026-08-17｜FIFO195 TEST-SYSTEM-04 Rev1 领取与 permission fingerprint

- 已重读 `qimao-terms-cloud/AGENTS.md`、`docs/WORKFLOW.md` v4.8、`docs/status/CURRENT.md` v4-509、`docs/milestones/SYSTEM-budget-guardrails.md`、`docs/ui/SYSTEM-budget-guardrails-acceptance.md` §10–11、职责矩阵预算行、`MODULE_INTEGRATION_CONTRACTS.md` 的 INT-11/12/13/15 与开发日志顶部。
- permission_ok：workspace root=`C:\Users\ComradeGu\Documents\七猫兼职`；仓库 `qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写；普通仓库写入直接执行，不走 `auto_review`。本轮禁止真实网络/供应商/Secret/付费/云资源/部署/Git，以及生产 `frontend/system-frontend/backend/contracts/migrations/DESIGN` 修改。
- `CURRENT` 差量递增至 v4-510；FIFO195=`active`；`TEST-SYSTEM-04 Rev1`=`in_progress / Current actor=全链测试与质量验收对话 / Reviewer=规划对话`。
- 本轮仅允许写 `docs/testing/SYSTEM-budget-guardrails-integration-report.md`、CURRENT/日志、必要临时 harness（结束删除）与仓库外脱敏 evidence；正式验证使用精确隔离 PostgreSQL 从零 30 migrations、正式 Fastify/system-frontend production build、零网络 adapter/stub；共享 PostgreSQL 55432 保持运行。

## 2026-08-17｜规划关闭 FIFO194 并派发 FIFO195 TEST-SYSTEM-04

- 规划核对 `docs/ui/SYSTEM-budget-guardrails-acceptance.md` §11 与仓库外 `front-system-04b-rev3-ui-qa/results.json`：正式 Vite production build 27 modules、Fastify、隔离 PostgreSQL 30 migrations；结果和截图身份一致，隔离库/端口/harness/浏览器均已精确清理，共享 55432 保持运行。
- 变化场景 `P0/P1/P2/P3=0/0/0/0`：retired 历史策略同一 `releaseCommandId` 回滚成功并成为唯一 active，POST=1/GET=1、幂等重放命令/审计仍各 1；active no-op rollback 与 retired publish 稳定 409 且命令零副作用。
- 发布确认直接显示日/月 old/new warning `5→1`、hard `12→2`、在途 1、待对账 1、两个 runtime blocked scopes；`configurationHardBlocks=[]` 时批准仍可达。工程禁词可见命中 0，rollback unknown 唯一动作正确，发布/回滚双向焦点闭环、pending 锁定、unknown/成功焦点与 console `0/0` 均通过。
- FIFO194 与 `FRONT-SYSTEM-04B Rev3` 关闭；SYSTEM-04 生产代码冻结。FIFO195 只解锁固定测试任务做独立纵向集成验收，不再回到 UI/前后端重复实现；测试通过后由规划运行本切片唯一完整 `pnpm check` 并停止本地 PostgreSQL。

## 2026-08-17（FIFO 194｜FRONT-SYSTEM-04B Rev 3 变化场景 UI 微终验通过）

- 正式运行环境：新鲜 `system-frontend` Vite production build **27 modules** 通过；正式 Fastify system-control 路由连接精确隔离 PostgreSQL `qimao_fifo194_ui_20260817`，**30 migrations**。生产 `frontend/system-frontend/backend/contracts/migrations/DESIGN` 修改 0，未运行完整 `pnpm check`、未重复 Impeccable。
- A 通过：v1 retired → active 真实回滚成功，唯一 active 指针从 v2 切至 v1；未知恢复为 rollback POST=`1`、同 `releaseCommandId` GET=`1`，幂等重放返回 `x-idempotent-replay=true`，命令/审计保持 `1/1`。active no-op rollback 与 retired publish 均稳定 409，命令副作用均为 0。
- B/C 通过：发布弹窗展示服务端日/月旧新提醒 `5→1`、硬阻断 `12→2`、在途 `1`、待对账 `1`、两个 runtime blocked scopes；`configurationHardBlocks=[]` 不误锁批准，也不误称“0 项硬阻断”。可见工程词 `PostgreSQL/billing/active/actor/no_active_policy/missing_currency_rule` 命中 0，错误/审计 `requestId` 保留；rollback unknown 唯一动作精确为“查询本次预算回滚结果”。
- D 通过：发布/回滚弹窗安全初焦、Tab/Shift+Tab、Escape 回触发点成立；pending dialog `aria-busy=true / data-locked=true`，Tab 不逃逸，Escape/遮罩/3 个按钮锁定；unknown 恢复动作与成功 H1 焦点成立。正式页面 console `error/warn=0/0`。
- 结论：`P0=0 / P1=0 / P2=0 / P3=0`。脱敏证据位于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\front-system-04b-rev3-ui-qa\results.json`；验收更新 `docs/ui/SYSTEM-budget-guardrails-acceptance.md` §11。
- 清理：本轮隐式 `pnpm` 遗留进程已按规划给定 PID 与启动时间精确终止；隔离库已 DROP 且核验不存在，31941/31942 已关闭，临时 harness/loader/contracts runtime、浏览器标签与临时视口已清理。共享 PostgreSQL `55432` 已复查仍运行，留给后续 `TEST-SYSTEM-04`。
- 状态写回：FIFO194 转 `review`，Current actor=`规划对话`，Reviewer=`规划对话`；只交规划，不通知前端、后端或测试，不自行解锁。

## 2026-08-17（FIFO 194｜FRONT-SYSTEM-04B Rev 3 变化场景 UI 微终验领取）

- 已按协作协议 v4.8 完成领取：`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`；仓库 `qimao-terms-cloud` 可写，普通仓库编辑直接执行，不走 `auto_review`。
- FIFO 194 已转 `active`，任务保持 Rev 3 / `in_progress`，Current actor 与 Reviewer 均为 UI 设计对话；生产代码冻结。
- 本轮只使用正式 system-frontend production build、Fastify 与精确隔离 PostgreSQL 复验 retired 历史回滚、发布安全事实、员工措辞、rollback unknown 和变化场景焦点；FIFO 191 其余完整矩阵冻结，不重复 Impeccable、不运行完整 `pnpm check`。

## 2026-08-17｜规划关闭 FIFO192/193 并派发 FIFO194 变化场景微终验

- 后端独立复验：本地 PostgreSQL 启动后，预算专项 `tests/backend/system-control-budget.test.ts` **10/10** 通过；`backend/tsconfig.build.json` TypeScript 构建通过；`git diff --check` 无新增空白错误。确认 rollback 仅新增 `retired` 历史已批准版本，publish 继续只接受 `approved`，当前 active 回滚 no-op 稳定 409，命令/审计/指针零副作用。
- 前端独立复验：管理员 `system-control + system-control-plane` 两份专项 **39/39** 通过；system-frontend TypeScript 通过；正确工作目录下 Vite production build **27 modules** 通过；`git diff --check` 无新增空白错误。确认发布弹窗消费服务端 active/target/impact 事实，展示新旧阈值、在途、待对账和运行阻断；`runtimeBlockedScopes` 只展示、不误锁批准；回滚恢复文案与中文生产措辞成立。
- 依赖运行环境：既有本地 `.pnpm` 内容仍完整，规划只恢复缺失 workspace Junction 以运行现有依赖；未联网、未下载、未更新 lockfile。首次前端差量回归暴露测试等待时序后，前端仅修测试定位器并重新通过 39/39；生产 DOM/语义未因此变化。
- FIFO192/193 关闭；FIFO194 只路由 UI 使用正式 production build + Fastify + 精确隔离 PostgreSQL 复验变化场景，不重跑 FIFO191 完整矩阵或 Impeccable，不修改生产代码。通过后再解锁 `TEST-SYSTEM-04`；完整 `pnpm check` 保留最终单次关闭门。

## 2026-08-17｜FRONT-SYSTEM-04B Rev3 FIFO193 完成并交规划复核

- 只修改 `system-frontend/src/budgetsPage.tsx` 与 `tests/frontend/system-control-plane.test.tsx`；未修改 API、backend、迁移、packages/contracts、CSS、ControlShell、员工 frontend 或 DESIGN。
- 发布确认直接读取服务端 active/target 策略规则与 selected.impact，逐范围展示旧/新 warning/hard 阈值、在途预留、待对账、runtimeBlockedScopes、configurationHardBlocks；不在浏览器汇总金额或推算资格。`runtimeBlockedScopes` 仅作为服务端运行阻断事实展示，不参与批准门；批准门仍只由 `impact.hardBlocks` 控制。
- 发布/回滚未知结果保存动作上下文与同一 `releaseCommandId`，分别显示“查询本次预算发布结果”“查询本次预算回滚结果”，只 GET 原命令；工程事实 `PostgreSQL`/`billing`/`active`/`actor`/`no_active_policy`/`missing_currency_rule` 投影为中文业务称谓，错误与审计保留真实 requestId。
- 新增/调整回归覆盖发布事实与阻断范围、runtime 阻断不锁批准、中文工程称谓、回滚未知同 ID 恢复；管理员两份专项 **39/39** 通过，system-frontend TypeScript 通过，Vite 生产构建 **27 modules** 通过，`git diff --check` 通过（仅既有 `LOCAL_APP_PARITY.md` CRLF 提示）。
- 未运行完整 `pnpm check`、未重复 Impeccable/浏览器矩阵，未接真实供应商、Secret、付费、网络或云资源，未提交/推送/部署。`CURRENT` 差量递增至 `v4-505`；FIFO193 / FRONT-SYSTEM-04B Rev3 转 `review / Current actor=规划对话`，只唤醒规划复核。

## 2026-08-17｜FIFO192 BACK-SYSTEM-04C Rev1 完成并交规划复核

- 根因修正：`backend/src/modules/system-control/system-control.budget.service.ts` 的 rollback 目标状态门改为允许 `approved`/`retired`；publish 仍严格只允许 `approved`。唯一 active 目标 rollback 继续稳定返回 `SYSTEM_CONTROL_BUDGET_INVALID_TRANSITION`，事务不写命令、审计或指针。
- 回归：新增 `tests/backend/system-control-budget.test.ts` 的真实 Fastify + 临时隔离 PostgreSQL 场景，覆盖 V2 active→retired V1 rollback 成功、同键同体 replay、同键异参、同命令异键、active no-op、publish retired 及命令/审计/唯一指针零副作用；预算专项直链运行 **10/10** 通过。
- 验证：`node node_modules/typescript/bin/tsc -p backend/tsconfig.build.json` 通过；`git diff --check` 通过。因 pnpm 根 `.bin` 尚未由离线重建生成，未继续运行会触发安装器的 `pnpm` wrapper；未下载/安装依赖、未运行完整 `pnpm check`。
- 隔离与边界：专项创建的临时数据库已在 `afterAll` 精确 DROP 并核验不存在；本地 PostgreSQL 已停止。未修改 contracts、迁移、frontend、system-frontend、DESIGN，未接真实服务/网络/Secret/付费，未提交/推送/部署。`CURRENT` 差量递增至 `v4-504`，FIFO192/BACK-SYSTEM-04C 转 `review / Current actor=规划对话`；FIFO193 并行 `in_progress` 事实保留。

## 2026-08-17｜FRONT-SYSTEM-04B Rev3 FIFO193 permission fingerprint 与领取

- 已重读 `CURRENT v4-501`、开发日志顶部、预算 UI 验收 §10、`SYSTEM-budget-guardrails.md`、预算共享契约与 `budgetsPage.tsx`。
- permission fingerprint：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，`permission_profile=workspace-write`，`ordinary_writes=direct`，普通仓库编辑不走 `auto_review`，写探针通过；受限操作为购买/部署/推送/真实付费 API/云资源/破坏性操作。
- `CURRENT` 差量递增至 `v4-502`；FIFO193=`active`，`FRONT-SYSTEM-04B Rev3`=`in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。范围锁定发布确认服务端安全事实、发布/回滚 unknown 文案分流与生产工程措辞中文化；不改 API、CSS 主体、ControlShell、员工站、backend、contracts、DESIGN。

## 2026-08-17｜FIFO192 BACK-SYSTEM-04C Rev1 领取与 permission_ok

- 已重读项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`CURRENT v4-501`、`SYSTEM-budget-guardrails.md`、预算 UI 验收 §10、现有 budget service/tests 与开发日志顶部。
- permission fingerprint：`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`；普通仓库编辑直接执行、不走 `auto_review`。本轮只允许预算 rollback 状态门与专项回归，publish 仍严格只允许 approved；不改迁移/contracts/frontend/DESIGN，不接真实服务。
- `CURRENT` 将差量递增并把 `BACK-SYSTEM-04C Rev1` 置为 `active / in_progress / Current actor=后端开发对话`；FIFO191、FRONT-SYSTEM-04B 并行事实保持不变。

## 2026-08-17｜规划审核 FIFO191 并并行派发 FIFO192/193

- 规划重读正式 UI 验收 §10、预算里程碑、生产前后端实现与共享契约，接受 FIFO191 完整矩阵主体通过事实；金额、分页、权限、双视口、焦点和未知结果既有证据冻结。
- P1-1 根因位于 `system-control.budget.service.ts`：rollback 与 publish 共用状态断言，只接受 approved/active，漏掉已被后继发布退役、但仍具完整不可变批准历史的 retired 策略。FIFO192 只扩展 rollback 状态门，publish 继续严格只允许 approved，不加 fallback、兼容路由或第二状态源。
- P1-2 与两项 P2 归入一次前端收口：发布确认直接消费 active/target rules 与服务端 impact 的 activeReservationCount、reconciliationRequiredCount、runtimeBlockedScopes/configurationHardBlocks，展示新旧阈值与将阻断范围，不在浏览器重算资格；顶层 PostgreSQL/billing/active/actor/raw no_active/missing_rule 改为中文业务称谓；release unknown 按 publish/rollback 显示对应唯一查询动作。
- `CURRENT` 递增至 v4-501；FIFO192/193 分别登记 `notification_pending` 并行派发固定后端/前端任务。两项完成后只路由 UI 复验变化场景，再解锁 TEST-SYSTEM-04。

## 2026-08-17｜FIFO191 FRONT-SYSTEM-04B Rev2 正式 UI 终验完成并交规划

- 正式环境：新鲜 `system-frontend` production build 27 modules、正式 Fastify system-control 路由、精确隔离 PostgreSQL `qimao_fifo191_ui_20260817` 30 migrations；测试身份仅由仓库外逐请求 resolver/proxy 注入，生产前端未加 header/bypass/fake owner。匿名/employee/缺 capability 读取 403，read 200；read-only 创建 403、write 创建 201；write-only rollback 403、publish capability 越过权限门进入资源校验。员工 frontend 源码/dist 对 ControlShell、预算入口和 system-control API 引用均为 0。
- 完整通过：唯一 `/budgets` aria-current、服务端精确金额/币种/日月窗口/预留/待对账、分页/筛选/total、loading/empty/error/再次失败/stale/恢复、warning/no-active/missing-rule、reservation/审计；草稿确定失败与 unknown；回放 direct success 后出现影响检查且禁止重复；历史 PostgreSQL unknown 同 testRunId GET×2/POST=0；impact/approve unknown 第一次旧状态保留、第二次目标状态才完成；publish unknown 旧 active 保留且同 releaseCommandId 恢复。
- 键盘/响应式：pending dialog 聚焦自身，Tab/Shift+Tab 不逃出，Escape/遮罩/重复提交锁定；确定失败在 dialog 内 ErrorBlock 聚焦，非 pending 关闭回触发点。1440 root `1425/1425`；1024 root `1009/1009`，72px 侧栏、main `x=72/width=937`，216px 覆盖不挤主区；宽表仅容器横滚。console `error/warn=0/0`。
- 集中缺陷 `P0=0 / P1=2 / P2=2 / P3=0`：P1① retired 历史版本在 UI 可选回滚，但正式 Fastify 稳定 409 `SYSTEM_CONTROL_BUDGET_INVALID_TRANSITION / 只有已批准预算策略可以发布`，无 command 可恢复；P1② 详情已有 `runtimeBlockedScopes=ocr_api:USD:day/month` 与新阈值 1/2，发布弹窗却不显示新旧阈值/将阻断请求并误报“0 项硬阻断”。P2① 顶层仍显示 PostgreSQL/billing/active/actor 及 raw no_active/missing_rule；P2② rollback unknown 的唯一动作误写“查询本次预算发布结果”。
- 证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\front-system-04b-rev2-ui-qa\results.json` 与五张最小截图。隔离库已 DROP 并核验 0；31911/31912/55432 无监听；临时 harness/运行副本已删除；浏览器标签关闭、视口复位。
- 边界：只修改预算 UI 验收、CURRENT/开发日志和仓库外脱敏证据；生产 `system-frontend/frontend/backend/contracts/migrations/DESIGN` 修改 0。未运行完整 `pnpm check`、未重复 Impeccable，未接真实供应商/Secret/网络/付费/云资源，未提交/推送/部署。CURRENT 增至 v4-500；FIFO191 与 FRONT-SYSTEM-04B Rev2 转 `review / Current actor=规划对话 / Reviewer=规划对话`，只交规划，不通知前端/后端/测试。

## 2026-08-17｜FIFO191 FRONT-SYSTEM-04B Rev2 正式 UI 终验领取

- 已重读项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`CURRENT v4-498`、开发日志顶部、`SYSTEM-budget-guardrails.md`、`DESIGN.md` 5.13、预算 UI 验收及正式前后端/契约范围；FIFO190 两项变化与其 35/35、production build 27 modules 规划证据已纳入，不以其替代本轮真实浏览器矩阵。
- permission fingerprint：`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`；仓库 `qimao-terms-cloud` 位于可写根，普通仓库编辑直接执行、不走 `auto_review`。真实供应商、Secret、外部网络、付费、云资源、部署、提交/推送及破坏性操作继续禁止。
- `CURRENT` 差量递增至 `v4-499`；FIFO191=`active`，`FRONT-SYSTEM-04B Rev2`=`in_progress / Current actor=UI 设计对话 / Reviewer=UI 设计对话`。
- 本轮只允许更新 `docs/ui/SYSTEM-budget-guardrails-acceptance.md`、CURRENT/开发日志及仓库外脱敏证据；生产 `system-frontend/frontend/backend/contracts/migrations/DESIGN` 修改 0。不运行完整 `pnpm check`、不重复 Impeccable；矩阵必须完整完成后再集中报告 P0–P3。

## 2026-08-17｜规划关闭 FIFO190 并派发 FIFO191 UI 正式终验

- 规划核对 `PendingRecovery.expectedStatus`、回放成功 `refreshFacts` 与草稿测试门禁；新鲜复跑管理员两份专项 **35/35**，system-frontend typecheck、Vite production build **27 modules**、授权差量 `git diff --check` 均通过。
- impact unknown 第一次 GET 仍为 `testing`、approve unknown 第一次 GET 仍为 `impact_checked` 时，恢复意图和唯一查询继续保留；达到 `impact_checked/approved` 后才清理。创建测试成功后策略详情同步进入 `testing` 并展示影响检查入口，不可再次运行测试。
- FIFO190 关闭，生产前端冻结；FIFO191 只路由 UI 做正式 React+Fastify+精确隔离 PostgreSQL 完整终验。后端、迁移、contracts、DESIGN、真实网络/Secret/付费仍不动。

## 2026-08-17｜FRONT-SYSTEM-04B Rev2 FIFO190 完成并交规划复验

- permission fingerprint 保持通过：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，`permission_profile=workspace-write`，`ordinary_writes=direct`，普通仓库编辑不走 `auto_review`；受限操作仍为购买/部署/推送/真实付费 API/云资源/破坏性操作。
- 仅修改 `system-frontend/src/budgetsPage.tsx` 与 `tests/frontend/system-control-plane.test.tsx`。回放 POST 直接成功后统一刷新 overview/policies/detail/tests，服务端推进到 `testing` 后页面立即显示“运行影响检查”并锁定再次回放；未改 API、backend、contracts、CSS、ControlShell、员工站或 DESIGN。
- impact-check / approve unknown 保存各自期望状态（`impact_checked` / `approved`）。恢复 GET 若仍为旧 `testing` / `impact_checked`，保留同一 policy 身份、唯一查询动作、真实状态提示“命令尚未形成……请继续查询”；只有达到期望状态才清理恢复并刷新权威事实，不重发 POST、不生成新 key/commandId。
- 新增回归覆盖：回放成功刷新策略与重复测试门禁；impact-check/approve unknown 旧状态→同 ID 查询→目标状态；既有预算 unknown 回归继续通过。预算两份专项 **35/35**；system-frontend TypeScript 通过；Vite 生产构建 **27 modules** 通过；`git diff --check` 通过（仅既有 `LOCAL_APP_PARITY.md` CRLF 提示）。未重跑 Impeccable、浏览器矩阵或完整 `pnpm check`，未接真实供应商/Secret/付费/云资源，未提交/推送/部署。
- `CURRENT` 差量递增至 `v4-497`；FIFO190 与 `FRONT-SYSTEM-04B Rev2` 转 `review`，Current actor=规划对话；只唤醒规划复验，不直接通知 UI/后端/测试。

## 2026-08-17｜FRONT-SYSTEM-04B Rev2 FIFO190 permission fingerprint 与领取

- 已重读 `CURRENT v4-495`、开发日志顶部及 FIFO190 两项 P1；permission fingerprint：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，`permission_profile=workspace-write`，`ordinary_writes=direct`，普通仓库编辑不走 `auto_review`，写探针通过。受限操作仍为购买/部署/推送/真实付费 API/云资源/破坏性操作。
- `CURRENT` 差量递增至 `v4-496`；FIFO190=`active`，`FRONT-SYSTEM-04B Rev2`=`in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。范围冻结为回放成功刷新策略状态与 impact/approve unknown 期望状态恢复，不改 API/backend/contracts/CSS/视觉/ControlShell/员工站/DESIGN。

## 2026-08-17｜规划审核 FIFO189 并定向派发 FIFO190

- 规划新鲜复跑管理员专项 `system-control + system-control-plane` **32/32**；静态核对确认唯一 ControlShell、服务端金额原样展示、稳定身份与发布 unknown 旧 active 保持主体成立。
- P1-1：`onRunTest` 直接成功后只刷新 test list，未刷新 detail/policies；后端已把策略从 `draft` 推进 `testing`，页面仍保留旧 draft，影响检查入口不出现且可能再次提交回放。
- P1-2：impact-check/approve 网络 unknown 使用 `getBudgetPolicy(policyId)` 恢复，但当前 `PendingRecovery` 未保存期望状态；若 POST 根本未到达，GET 会返回旧 `testing/impact_checked` 策略，现实现仍清除恢复入口并播报成功。
- FIFO190 仅允许修正上述状态刷新与期望状态判定并补可控回归；金额权威、API、视觉、ControlShell、发布/回滚和其他32项证据冻结，不扩大到后端/contracts/UI。

## 2026-08-17｜FRONT-SYSTEM-04B Rev1 FIFO189 完成并交规划 review

- 状态/权限：已重读 v4.8 启动包与预算权威契约；`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`，`permission_profile=workspace-write`，`ordinary_writes=direct`，普通仓库编辑不走 `auto_review`；受限操作仍为购买/部署/推送/真实付费 API/云资源/破坏性操作。`CURRENT` 已差量递增至 `v4-494`，FIFO189/FRONT-SYSTEM-04B Rev1=`review`，Current actor=规划对话。
- 生产实现：仅新增/修改 `system-frontend/src/budgetApi.ts`、`budgetsPage.tsx`、`App.tsx`、`ControlShell.tsx`、`systemApi.ts`、`controlPrimitives.tsx`、`responsive.css`；预算页接入唯一 ControlShell `/budgets` 一级导航，不改员工 frontend、backend、迁移、packages/contracts、DESIGN。
- 权威读取：总览、active/no-active、精确十进制账本、计量覆盖、策略版本/筛选/分页、历史回放、影响检查、用量、审计、reservation 均直接消费现有 API；金额/账期/阈值状态/硬阻断/待对账不由浏览器汇总、换算、补零或推断。
- 写命令与恢复：草稿、回放、影响检查、批准、发布/回滚均预生成稳定版本/测试/命令身份与 `Idempotency-Key`；未知/retryable 只 GET 同一身份，确定性 4xx 保留真实错误并刷新事实，旧 active 在成功前保持；历史 unknown 回放只有行内唯一查询动作，未重发 POST。
- 状态/焦点：复用 `useAsyncRead`、`ErrorBlock`、`Modal`、`CommandRecovery`；首屏/刷新 stale、loading/empty/error/再次失败、未知恢复、受保护发布/回滚、成功标题焦点和提交锁均覆盖；1024 侧栏覆盖、宽表仅容器内横滚，未引入第二状态源/fallback/匿名样例。
- 测试回归：`tests/frontend/system-control-plane.test.tsx` 新增预算金额原样投影、草稿未知单 POST/同 ID GET、历史 unknown 回放失败→成功同 ID GET/POST=0、发布 unknown 保持旧 active/同 release GET；两份专项合计 `32/32` 通过。
- 质量验证：system-frontend TypeScript 通过；Vite 生产构建 `27 modules` 通过；Impeccable detector 单次结果 `[]`；`git diff --check` 通过（仅既有 `LOCAL_APP_PARITY.md` CRLF 提示）。未运行完整 `pnpm check`，未接真实供应商/Secret/付费/网络/云资源，未提交/推送/部署。
- 交接：已将 FIFO189 转 `review`，只唤醒规划复验；UI/后端/测试未被直接通知。代码健康：预算页面组件约 340 行、CSS 约 25 行新增规则，未超过 800 行手写文件门槛；有意差异为无。

## 2026-08-17｜FRONT-SYSTEM-04B Rev1 FIFO189 permission fingerprint 与领取

- 已重读 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`CURRENT v4-492`、开发日志顶部、`SYSTEM-budget-guardrails.md`、预算职责行、`INT-11/12/13/15`、`DESIGN.md` 5.11–5.13、预算 UI 验收、共享预算契约与正式预算路由。
- permission fingerprint：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`；`permission_profile=workspace-write`；`ordinary_writes=direct`；普通仓库编辑不走 `auto_review`；写探针通过。受限操作为购买/部署/推送/真实付费 API/云资源/破坏性操作。
- `CURRENT` 差量递增至 `v4-493`；FIFO189=`active`，`FRONT-SYSTEM-04B Rev1`=`in_progress / Current actor=前端开发对话 / Reviewer=UI 设计对话`。
- 范围锁定：唯一管理员 `ControlShell` 的 `/budgets`；只消费真实预算总览、策略、测试、影响检查、发布/回滚、用量、审计和 reservation API；不改员工 frontend、backend、迁移、packages/contracts、DESIGN，不接真实供应商/Secret/付费/网络/云资源，不提交推送部署。

## 2026-08-17｜规划关闭 FIFO188 并派发 FIFO189 FRONT-SYSTEM-04B Rev1

- 规划独立启动本地 PostgreSQL 后按两个方向新鲜复验：budget **9/9** → ASR **13/13**，ASR **13/13** → budget **9/9**；均为独立命令真实通过，不用排序、重试或放宽超时掩盖。
- 只读残留核对：`qimao_budget_%` 临时数据库=`0`，默认库 `budget worker/fifo188-budget-worker/budget test` 项目=`0`、其 reservation=`0`；`git diff --check` 对预算测试与状态文档无输出。
- 接受测试专用临时数据库作为根因修正：29 迁移后运行，结束关闭 App/Pool 并 DROP；拒绝共享库 TRUNCATE/CASCADE、删除不可变触发器及事务代理改写时间语义。FIFO188 / BACK-SYSTEM-04A Rev2 正式 `done`。
- FIFO189 解锁正式管理员 `/budgets` 前端：唯一数据源为 SYSTEM-04 API/PostgreSQL，前端不得自行计算金额、账期、硬阻断或把匿名数据带入生产；UI 终验和 TEST-SYSTEM-04 保持后继顺序。

## 2026-08-17｜FIFO188 BACK-SYSTEM-04A Rev2 双顺序复验完成

- 规划授权后，对默认库做了一次精确历史夹具清理：仅处理项目名 `budget worker` / `fifo188-budget-worker` / `budget test`；先解除对应 screen-text/ASR Attempt 的预算引用并删除其 reservation，再按 BatchAsset → Job/Attempt → Batch → Asset → Project 顺序删除可变夹具；仅停用同名 `budget worker` deployment。未使用 TRUNCATE/CASCADE，未删除 EngineVersion、审计或 BudgetPolicy。
- 清理后默认库只读核对：上述项目、reservation、screen-text Job/Attempt/Batch/Asset 均为 0；对应 deployment 均 disabled；不可变 EngineVersion=`30`、相关 system-control 审计=`5`、BudgetPolicyVersion=`1` 仅查询保留。
- 新鲜顺序证据（预算套件每次自建 `qimao_budget_*` 临时库、29 迁移、`max=1` Pool，结束 DROP 并核验不存在）：`budget→ASR`：budget **9/9**，ASR **13/13**；`ASR→budget`：ASR **13/13**，budget **9/9**。两次预算临时库 DROP 后均无 `qimao_budget_*` 残留；默认库本任务可变夹具归零。
- `git diff --check` 通过（仅既有 `docs/contracts/LOCAL_APP_PARITY.md` CRLF 提示）。
- 本地 PostgreSQL 已在所有验证与残留核对完成后停止，状态确认未运行。

## 2026-08-17｜FIFO188 BACK-SYSTEM-04A Rev2 临时库隔离复验

- 按规划退回并移除外层事务代理、SAVEPOINT 映射和任何 `CURRENT_TIMESTAMP` 改写；未修改生产 pool/migrate 或共享默认库。
- 预算专项改为测试内动态创建唯一 `qimao_budget_*` 临时库，使用现有 29 个迁移的 `node-pg-migrate runner` 从零初始化；App/Pool 全部指向该库，Pool `max=1`。每例只在临时库清理自有预算表/标记部署，结束先关闭 App/Pool，再由管理连接终止连接、DROP DATABASE，并核验临时库不存在。
- 新鲜运行 budget 专项 **9/9** 通过；重复运行（对应 ASR→budget 顺序的 budget 侧）亦 **9/9** 通过。两次结束后 `qimao_budget_*` 数据库查询均为空，默认库 `fifo188%` 项目与其 reservation 查询均为空。
- 按要求紧接运行默认库 `tests/backend/asr.test.ts`，13/13 仍被既有默认库 `budget_reservations_project_id_fkey` 阻断；真实残留为 3 条旧 `budget worker` reservation（非本轮临时库产生）。本轮未对默认库执行清理，故未宣称双顺序 13/13 已通过，等待规划决定如何处理该既有共享库污染。
- `git diff --check` 通过（仅既有 `docs/contracts/LOCAL_APP_PARITY.md` CRLF 提示）。

## 2026-08-17｜FIFO188 BACK-SYSTEM-04A Rev2 清理边界冲突（暂停）

- 已按 permission fingerprint 进入 `in_progress`，仅修改预算专项测试隔离草稿；生产 backend、contracts、migration、UI 与预算语义未改。
- 已复现并修正两层自有夹具清理顺序：先解除匹配 Attempt 的预算引用，再删除 reservation；先删除 screen-text batch assets/jobs/batches/assets，再删除标记 Project。随后 PostgreSQL 仍在预算策略表定向 `TRUNCATE` 处稳定报 `cannot truncate a table referenced in a foreign key constraint`：`asr_attempts`/`screen_text_attempts` 的表级外键关系即使无匹配行也会阻断 `budget_policy_versions`。
- `CASCADE` 会清理其他模块 Attempt，禁用/删除 FK 或不可变触发器会违反本轮“不得清理共享事实/不得放宽约束”硬门；因此未继续叠加 fallback 或破坏性清理。当前未形成通过证据，等待规划裁决可接受的隔离边界。
- 本地 PostgreSQL 已按要求停止（受控 `node tools/local-postgres.mjs stop` 后状态为未运行）。

## 2026-08-17｜FIFO188 BACK-SYSTEM-04A Rev2 领取与 permission_ok

- permission fingerprint：`permission_ok:C:\\Users\\ComradeGu\\Documents\\七猫兼职:workspace-write/:workspace`；只允许修改预算专项测试隔离/清理及 CURRENT/日志，普通仓库编辑不走 `auto_review`。生产 backend、contracts、migration、UI、预算语义和真实服务均冻结。
- 规划已复现：budget 专项 9/9 后，ASR 专项 13 项全部在 `budget_reservations_project_id_fkey` RESTRICT 失败；本轮目标是精确释放预算专项自身匿名事实并证明两种执行顺序。

## 2026-08-17｜FIFO188 BACK-SYSTEM-04A Rev2 测试隔离微返工

- 规划独立新鲜运行 `system-control-budget.test.ts` 得到 `9/9`；紧接着单独运行 `asr.test.ts` 时，13 项均在 `beforeEach/afterAll DELETE projects` 被 `budget_reservations_project_id_fkey` 的 RESTRICT 拦截。首因是预算专项留下真实 Attempt/Reservation/Project 夹具，证明专项间不满足顺序无关与残留归零；这不是生产预算 admission/settlement 失败。
- 规划不接受以测试顺序、共享默认库残留或重复重跑掩盖。FIFO188 只退回后端测试所有者修正精确清理，并要求新鲜证明 `budget→ASR`、`ASR→budget` 两种顺序均通过、预算相关业务残留为0；生产代码、契约、迁移、UI 与真实服务边界冻结。

## 2026-08-17 — FIFO 187 BACK-SYSTEM-04A Rev 1 完成并交规划 review

- permission fingerprint：`permission_ok:C:\\Users\\ComradeGu\\Documents\\七猫兼职:workspace-write/:workspace`；仓库位于可写 workspace root，普通仓库编辑直接执行、不走 `auto_review`。真实供应商、Secret、外部网络、云资源、部署、Git 推送和付费均未接入。
- 在 `backend/migrations/1754976015000_create_system_budget_guardrails.cjs` 增加不可变预算策略/规则、唯一 active 指针、预留/结算、预算测试运行和审计所需事实；`engine_deployment_versions.billing_snapshot` 保持 NULL 可表达历史未知，严格 `hard_limit > warning_limit`，预算预留持久化 `deployment_version_id`，空库无 bootstrap。
- `packages/contracts/src/system-control-budget.ts` 拆出测试运行、历史分页和服务端 `budget-overview` 契约；`SystemControlBudgetCommandBody` 仅保留 `commandId`，测试命令独立要求 `commandId + budgetTestRunId`。billing capability 改为已登记 Adapter descriptor 的显式快照并纳入 configDigest/Registry 身份，Worker 只消费 PostgreSQL 快照。
- `backend/src/modules/system-control/` 完成精确 numeric admission/settlement、同 Attempt 重放与异报价冲突、无 active/缺币种/NULL 快照阻断、unmetered 真实 Attempt bypass、unknown/reconciliation 保留占用、终态崩溃窗口有界恢复；`budget-overview` 以一次 databaseNow 返回 day/month 真实账本、missing_rule 去重作用域、阈值/剩余/status 与 active/no-active。
- 新鲜专项：`tests/backend/system-control-budget.test.ts` **9/9**（含 hard 超出无第二 reservation 且无 provider Usage）；engine/overview/routing/ASR/Dispatch 等组合中其余 6 文件 **60/60**，`tests/backend/screen-text.test.ts` 单文件 **14/14**（组合运行唯一项因共享数据库竞争超过默认 5s，未提高超时或以此冒充通过）；此前 ASR+ScreenText 独立分组 **27/27**。
- 新鲜质量门：contracts build、backend build、`check:repo`、`git diff --check` 通过（仅既有 `docs/contracts/LOCAL_APP_PARITY.md` CRLF 提示）。本地默认库 `node backend/dist/database/migrate.js` 报 `No migrations to run!`；新建隔离库从 29 个迁移完整执行，预算/引擎/路由业务计数 `0|0|0|0|0|0`，`billing_snapshot` nullable=`YES`，临时库已删除。
- 曾出现但已按根因处理的执行器错误：未设置 `CI=true` 时 pnpm 无 TTY 清理 modules 失败；后端构建一次报 `canonicalDecimal` 的 `noUncheckedIndexedAccess` 类型错误；首次 `pnpm db:stop` 因权限返回 `Operation not permitted`，受控权限重执行后停止成功，`CI=true pnpm db:status` 确认实例未运行。未运行完整 `pnpm check`，留 SYSTEM-04 规划关闭门。
- 写回前重读最新 `CURRENT v4-486`；本轮差量更新至 `v4-487`，保留 UI FIFO 186 `notification_pending/review` 并行事实；FIFO 187 / BACK-SYSTEM-04A Rev 1 转 `review`、Current actor=规划对话。只交规划，不通知或解锁前端/UI/测试。

## 2026-08-17 — FIFO 186 UI-SYSTEM-04 Rev 1 完成并交规划 review

- 在既有唯一 `ControlShell` 中完成 `/budgets`：环境/active/新鲜度，ASR/OCR × CNY/USD 的日/月已结算、预留、待对账与占用账本，提醒/硬阻断、缺 active/缺币种、loading/empty/error/stale/再次失败，以及不可变草稿→历史回放→影响检查→批准→发布/未知同命令查询→回滚全链。并发与队列仅链接 `/routing`，未复制数据所有权。
- 新增 `DESIGN.md` 5.13 与 `docs/ui/SYSTEM-budget-guardrails-acceptance.md`；复用仓库外 `ui-system-01-control-shell`，证据写入 `evidence/ui-system-04-rev1/`。原型可见文案使用“服务端账本事实”，生产不可见矩阵明确精确十进制、数据库时间窗口、资源池/币种键、active 指针、INT-11/12/13/15 与非目标。
- 唯一完整浏览器矩阵通过：1440 root `1430/1430`；1024 root `1014/1014`、main `x=72 / width=942`，216px 侧栏只覆盖不挤；账本/阈值/抽屉/草稿宽表仅自身横滚。读取恢复、高风险焦点闭环、pending 锁定、失败/未知唯一恢复、成功焦点与 console `error/warn=0/0` 均通过。
- Impeccable detector 只运行一次，因缺 parser 降级为 regex；唯一 warning 为既有 `.integration-banner` 中性风险带。独立完成审查首次给出 `material-fixes`，集中修正 no-active/缺币种/error/stale 只读、回滚目标、显式阶段链、草稿失败输入保留和固定上下文列，差量浏览器复验全部通过；未重复 detector 或完整审查。
- 新鲜检查：`node --check` 通过；授权文件 `git diff --check` 通过；P0/P1/P2/P3=`0/0/0/0`。生产 `system-frontend/frontend/backend/contracts/migrations` 修改 0，未运行完整 `pnpm check`，未接真实供应商/Secret/网络/付费/云资源，未提交/推送/部署。
- 写回前重读 `CURRENT v4-485`；同步递增至 `v4-486`，保留 FIFO 187 queue=`in_progress`，并校正固定后端行为 `FIFO 187 BACK-SYSTEM-04A Rev 1 in_progress / permission_ok`。FIFO 186=`notification_pending`，`UI-SYSTEM-04 Rev 1`=`review / Current actor=规划对话 / Reviewer=规划对话`；只唤醒规划，不通知或解锁 FRONT/BACK/测试。

## 2026-08-17 — FIFO 186 UI-SYSTEM-04 Rev 1 permission fingerprint 与领取

- 已重读项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`CURRENT v4-484`、SYSTEM-04 预算里程碑、Control Center 第 4/7/8/9 节、职责矩阵预算行、`INT-11/12/13/15`、`DESIGN.md` 5.11–5.12、两份既有 ControlShell 验收与开发日志顶部。
- permission fingerprint：`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`；仓库 `qimao-terms-cloud` 位于可写根，普通仓库编辑直接执行、不走 `auto_review`。真实付费 API、Secret、外部网络、云资源、部署、Git 推送与破坏性操作继续禁止。
- `CURRENT` 差量递增至 `v4-485`；FIFO 186=`active`，`UI-SYSTEM-04 Rev 1`=`in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`。
- 本轮仅在同一 ControlShell 中冻结 `/budgets` 的精确金额、提醒/硬阻断、策略版本、影响检查、发布未知恢复、回滚与 1440/1024 设计证据；只改 DESIGN/docs/ui/仓库外原型与证据/CURRENT/日志，生产 `system-frontend/frontend/backend/contracts/migrations` 修改 0。

## 2026-08-17 — SYSTEM-04 预算与限额安全门启动包冻结

- 用户明确要求休息期间由规划全权统筹继续；规划将该授权限定为既有项目内本地编辑、零网络实现、测试、审核与固定任务自动交接，不扩展到真实付费 API、Secret、云资源、部署、Git 推送或破坏性操作。
- 下一切片选定 `SYSTEM-04`，原因是 SYSTEM-03 已关闭引擎/路由控制平面，而真实供应商接入前必须先有费用预留、硬阻断和 unknown 待对账占用。新增 `docs/milestones/SYSTEM-budget-guardrails.md`，明确预算只拥有日/月金额与调用预留，SYSTEM-03 路由继续唯一拥有并发/队列，避免两套配置。
- `MODULE_RESPONSIBILITY_MATRIX.md` 新增“系统控制台预算、限额与付费调用安全门”；`MODULE_INTEGRATION_CONTRACTS.md` 新增 `INT-15`；路线图同步先预算安全门、后真实 API 的顺序。空库零业务行、稳定命令身份、旧路径归零、隔离测试、公共 UI 原语和跨模块回归均已写入 v4.8 启动包。
- `CURRENT` 递增至 `v4-483`：`PLAN-SYSTEM-04` done；建立 FIFO 186/187，`UI-SYSTEM-04` 与 `BACK-SYSTEM-04A` 可受控并行；`FRONT-SYSTEM-04B`、`TEST-SYSTEM-04` 保持 blocked。正式前端等待 UI/后端双依赖通过规划审核。

## 2026-08-17 — FIFO 185 与 SYSTEM-03 完整关闭门通过

- 规划审计 `tests/backend/asr-dispatch-rev2.test.ts` 的唯一差量：测试显式使用 `createDefaultAsrAdapterRegistry().defaultDescriptor` 建立 ASR deployment/version、三池 routing、active event/pointer，并在测试边界重新确保/清理；未新增 production bootstrap、Registry 旁路、fallback/compat/legacy 或第二状态源。既有 Worker 轮询 `setTimeout` 非本轮新增。
- 正常宿主环境最终完整 `CI=true pnpm check` 退出码 0：仓库验证、全部 lint/typecheck、数据库迁移、**29/29 测试文件、280/280 测试**、contracts/backend/frontend/system-frontend 四 workspace build 全部通过；员工前端只保留既有大 chunk 非阻断提示。
- 首次受限执行器 `tsx` 的 `uv_os_get_passwd ENOMEM` 与首次关闭门的旧 Dispatch 夹具失败均已明确分流：前者为 executor 环境，后者为测试前置事实；生产 no-active 409、零业务 bootstrap、新旧任务版本隔离与 SYSTEM-03 集成结论未被弱化。
- 按长期停止边界，本轮完整测试启动的项目本地 PostgreSQL 已在正常宿主环境通过 `pnpm db:stop` 停止；未删除数据、未触碰外部服务。
- FIFO 185 closed，`BACK-SYSTEM-03E Rev 1` done；SYSTEM-03 正式关闭。`CURRENT` 差量递增至 `v4-482`，路线图与 `INT-11` 已同步为已关闭。真实供应商、Secret、预算、Cloudflare、云资源和部署仍须用户另行授权。

## 2026-08-17 — FIFO 185 BACK-SYSTEM-03E Rev 1 显式路由夹具完成并交规划 review

- 仅修改 `tests/backend/asr-dispatch-rev2.test.ts`：新增与 `createDefaultAsrAdapterRegistry().defaultDescriptor` 同源的 ASR `EngineDeployment/EngineDeploymentVersion`、三资源池 `RoutingPolicyVersion`、active 状态事件与 `active_control_plane_pointers` 前置夹具；每个测试前重新确保同一 active pointer，测试结束清理本套件路由/控制面事实，避免共享残留和文件顺序依赖。
- 未恢复业务 bootstrap、默认 Registry 旁路、`ASR_ROUTING_NOT_ACTIVE` 门、fallback/compat/legacy 或 sleep；生产 backend/contracts/migrations/frontend/DESIGN 均未改。
- 新鲜验证：`tests/backend/asr-dispatch-rev2.test.ts` 连续两次均 **8/8**；与 `tests/backend/asr.test.ts` 顺序组合 **21/21**；`pnpm --filter @qimao-terms-cloud/backend build` 通过；`git diff --check` 通过（仅既有 `docs/contracts/LOCAL_APP_PARITY.md` CRLF 提示）。
- 未运行完整 `pnpm check`，按 FIFO185 停止边界留规划在夹具修复通过后重跑唯一完整关闭门；`CURRENT` 已差量递增至 `v4-481`，FIFO185 / `BACK-SYSTEM-03E Rev 1` 转 `review / Current actor=规划对话 / Reviewer=规划对话`，只唤醒规划。

## 2026-08-17 — FIFO 185 BACK-SYSTEM-03E Rev 1 permission fingerprint 与领取

- 已完整重读项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`CURRENT v4-479`、开发日志顶部、`tests/backend/asr-dispatch-rev2.test.ts`、`tests/backend/asr.test.ts` 与 `docs/milestones/SYSTEM-engine-control-plane.md` 的 no-bootstrap/no-active 规则。
- permission fingerprint：`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`；仓库 `qimao-terms-cloud` 位于可写工作区，普通仓库编辑直接执行、不走 `auto_review`；真实服务/网络/Secret/付费、生产代码、契约、迁移、前端/DESIGN、提交/推送/部署均不在本轮范围。
- `CURRENT` 已差量递增至 `v4-480`；FIFO 185 / `BACK-SYSTEM-03E Rev 1` 已进入 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。
- 唯一变化计划：在该 Dispatch 测试文件内显式建立与 `createDefaultAsrAdapterRegistry().defaultDescriptor` 一致的 ASR deployment/version、routing pool/status/pointer，并精确清理自身夹具；不恢复业务 bootstrap、默认 Registry 旁路、fallback/compat/legacy 或 sleep。

## 2026-08-17 — FIFO 184 规划核对通过，完整关闭门暴露旧 Dispatch 夹具缺口

- 规划核对 `docs/testing/SYSTEM-engine-control-integration-report.md` 与仓库外 `summary.json`：29 迁移、engine/routing 11/11、ASR/ScreenText 27/27、正式页面/API、权限、两站隔离、1440/1024 与清理事实完整，`P0/P1/P2/P3=0/0/0/0`；FIFO 184 closed，`TEST-SYSTEM-03 Rev 1` done。
- 唯一完整 `pnpm check` 首次在受限执行器的 `tsx` 启动阶段遇已知 `uv_os_get_passwd ENOMEM`；正常宿主环境重跑后迁移成功并进入全量测试，证明不是业务迁移失败。
- 完整门结果：29 个测试文件中 28 个通过；280 项中 274 项通过。唯一 `tests/backend/asr-dispatch-rev2.test.ts` 有 6 项失败，错误均归一为 active ASR 路由不存在：直接 409 `ASR_ROUTING_NOT_ACTIVE`，或 Dispatch 资格由 accepted 变 blocked，后继 Worker 无任务。
- 根因是 SYSTEM-03 正确删除业务 bootstrap/default Registry 后，该旧测试文件仍依赖共享数据库残留 active 路由；它的 `beforeEach` 只清 Dispatch/projects，没有像当前 `asr.test.ts` 一样显式建立测试路由。生产 no-active 409 与零副作用在专项/集成验收均已通过，不得恢复旧业务默认路径。
- 建立 FIFO 185 / `BACK-SYSTEM-03E Rev 1`：只在该测试文件显式建立与 Registry 一致的 active ASR 路由前置事实并保证顺序独立；不改生产 backend/contracts/迁移，不新增 bootstrap、fallback、compat、sleep 或共享残留依赖。先跑该文件，再由规划重跑完整 `pnpm check`。
- `CURRENT` 差量递增至 `v4-479`；FIFO 185 正式唤醒和 permission/in_progress 送达确认待补写。

## 2026-08-17 — FIFO 184 TEST-SYSTEM-03 Rev 1 独立纵向集成验收完成

- 在精确隔离 PostgreSQL `qimao_test_system_03_20260817` 从 29 个迁移开始执行；正式 Fastify system-control routes、零网络 Registry/Worker 与 system-frontend production build 均使用本轮事实。
- 新鲜专项结果：system-control engine/routing 2 files **11/11**；ASR/ScreenText 写路径 2 files **27/27**；system-frontend Vite **25 modules** build 通过；完整 `pnpm check` 留规划关闭门。
- 覆盖逐请求匿名/employee/精确 capability 拒绝与允许、不可变版本和 Secret inherit/replace/clear、连接测试 succeeded/failed/unknown/租约过期恢复、三池路由影响硬阻断/发布/回滚/唯一 active/并发幂等、ASR 与 ScreenText 发布前后 routing/deployment version 绑定、无 active 零任务副作用和旧默认路径静态门。
- 正式 HTTP/页面验收：overview 200，4 pools/24 UTC buckets；1440×900 与 1024×768 的 `/engines`、`/routing`、`/changes` 根横溢出 0，1024 引擎宽表 `overflow-x:auto`（980/899），页面 console error/warn=0/0；员工站无管理 API/ControlShell 入口。
- P0/P1/P2/P3=0，无 QA-SYSTEM-03-*；未修改生产 frontend/system-frontend/backend、迁移、contracts 或 DESIGN。报告写入 `docs/testing/SYSTEM-engine-control-integration-report.md`。
- 清理：服务端口、临时 server/shim/harness、隔离数据库均精确清理；`pg_database` 对隔离库计数 0，共享默认库保持运行；原始素材未读取、未导入、未复制。
- `CURRENT` 差量递增至 `v4-478`；FIFO 184=`review`，`TEST-SYSTEM-03 Rev 1`=`review / Current actor=规划对话`。按协议只交规划，不通知前端/后端/UI。

## 2026-08-17 — FIFO 184 TEST-SYSTEM-03 Rev 1 permission fingerprint 与领取

- 已重读 `qimao-terms-cloud/AGENTS.md`、`docs/WORKFLOW.md` v4.8、`docs/status/CURRENT.md` v4-476、`docs/milestones/SYSTEM-engine-control-plane.md`（TEST-SYSTEM-03 与 §4.1/5/6）、职责矩阵“系统控制台引擎/API 与安全配置发布”、`MODULE_INTEGRATION_CONTRACTS.md` 的 `INT-11/12/13`、`docs/ui/SYSTEM-engine-control-acceptance.md` §15、`docs/ui/SYSTEM-control-shell-acceptance.md` §14 及开发日志顶部。
- permission fingerprint：`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`；仓库 `qimao-terms-cloud` 位于可写工作区，测试/证据路径可写，普通仓库写入直接执行、不走 `auto_review`。受限边界仍为真实供应商/网络/Secret/付费/云资源、提交/推送/部署及破坏性操作。
- `CURRENT` 已差量递增至 `v4-477`；FIFO 184=`active`；`TEST-SYSTEM-03 Rev 1`=`in_progress / Current actor=全链测试与质量验收对话 / Reviewer=规划对话`。
- 本轮只允许 `docs/testing/SYSTEM-engine-control-integration-report.md`、CURRENT/日志、`tests/integration/` 临时测试 harness 与仓库外脱敏证据；正式测试使用精确隔离 PostgreSQL、正式 Fastify/system-control routes 和正式 system-frontend build。禁止修改生产 `frontend/system-frontend/backend`、迁移、`packages/contracts`、DESIGN；不接真实供应商/网络/Secret/付费/云资源。

## 2026-08-17 — FIFO 183 规划关闭并建立 FIFO 184 TEST-SYSTEM-03

- 规划核对 `docs/ui/SYSTEM-engine-control-acceptance.md` §15、ControlShell 验收 §14 与仓库外 `fifo183-results.json`：正式 system-frontend build（25 modules）+ Fastify + 精确隔离 PostgreSQL（29 迁移）下三个原失败场景均通过，`P0/P1/P2/P3=0/0/0/0`。
- 引擎首屏/已有事实 stale 首次与再次失败均聚焦唯一 ErrorBlock，成功聚焦 H1；连接测试 create unknown 保持 POST=1、同 `testRunId` GET=1 且恢复动作在抽屉内真实可达，历史 unknown POST=0；路由确定失败错误只在 Modal 内，unknown 保持 POST=1/同 `routingVersionId` GET=2 并成功回 H1。
- 层级 `modal(60) > drawer(45) > topbar(35)`、console `error/warn=0/0`、隔离库/端口/浏览器/临时 harness 清理均有结构化证据；生产代码修改为 0。FIFO 183 closed，`FRONT-SYSTEM-03C Rev 5` done。
- 建立 FIFO 184 / `TEST-SYSTEM-03 Rev 1`：按里程碑使用精确隔离 PostgreSQL 与正式 Fastify/system-frontend 独立验证逐请求权限、不可变部署/版本/Secret 摘要、零网络连接测试、发布/未知/回滚、进程重启恢复、新旧 ASR/OCR 任务版本隔离、员工站无管理入口和 1440/1024；测试不修改生产代码。
- `CURRENT` 差量递增至 `v4-476`；FIFO 184 正式唤醒和 permission/in_progress 送达确认待补写。完整 `pnpm check` 只在测试通过后由规划运行一次。

## 2026-08-17 — FIFO 183 FRONT-SYSTEM-03C Rev 5 三项变化场景 UI 微复验完成

- 使用本轮新鲜 `system-frontend` production build（Vite 8.2.1，25 modules）、正式 Fastify system-control routes、后端逐请求 resolver 注入的控制台验收身份，以及从零执行 29 个迁移的精确隔离 PostgreSQL `qimao_fifo183_ui_20260817`；只复验 FIFO 181 三个原失败场景，FIFO 179 其余 49 项冻结。
- A 通过：引擎首屏首次/再次失败与已有事实刷新首次/再次失败稳定后均聚焦唯一 ErrorBlock，真实 requestId 与唯一“重新读取”保持；成功恢复聚焦 `H1=引擎与 API`，旧两行事实保留且 stale 清除。
- B 通过：create POST unknown 的唯一同 `testRunId=ded18877-2255-4990-bd53-e417f6329003` 查询位于引擎详情抽屉内、完整可见、原生 button 获焦并通过中心 hit-test；POST=`1`、同 ID GET=`1`。PostgreSQL 直接发现的历史 unknown `34444444-4444-4444-8444-444444444444` 继续行内同 ID GET=`1`、创建 POST=`0`，无第二恢复入口。
- C 通过：路由主备同版本确定失败只在活动 Modal 内呈现一个 alert 并持焦，遮罩后错误为 0，关闭后错误清理且焦点回触发点；unknown 保持 `routingVersionId=ac4540c0-f987-4c07-9f42-c71aa82f5486`，GET 首次失败后唯一查询获焦，第二次成功聚焦路由 H1，写 POST 恒为 1。
- z-index 实测 `topbar=35 / drawer=45 / modal=60`，页面 console `error/warn=0/0`；结论 `P0=0 / P1=0 / P2=0 / P3=0`。生产 `frontend/system-frontend/backend/contracts/migrations/DESIGN` 修改 0，未重复 Impeccable、完整浏览器矩阵、前端专项或完整 `pnpm check`。
- 证据写入 `docs/ui/SYSTEM-engine-control-acceptance.md` §15、`docs/ui/SYSTEM-control-shell-acceptance.md` §14 与仓库外 `front-system-03c-rev5-ui-qa/fifo183-results.json` + 六张截图。浏览器标签/视口、`31831/31832` 服务、临时 harness/seed/inspect/shim 和隔离库已精确清理；隔离库 exists=`false`，共享默认库与其他任务服务未动。
- `CURRENT` 差量递增至 `v4-475`；FIFO 183=`notification_pending`，`FRONT-SYSTEM-03C Rev 5` 转 `review / Current actor=规划对话 / Reviewer=规划对话`。只交规划，不通知前端/后端/测试，不自行 done 或解锁 `TEST-SYSTEM-03`。

## 2026-08-17 — FIFO 183 FRONT-SYSTEM-03C Rev 5 UI 微复验 permission fingerprint 与领取

- 已重读 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`CURRENT v4-473`、开发日志顶部、`docs/ui/SYSTEM-engine-control-acceptance.md` §14 与 `docs/ui/SYSTEM-control-shell-acceptance.md` §13；FIFO 179 其余 49 项和 UI Rev 2 视觉继续冻结。
- permission fingerprint：`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`；仓库 `qimao-terms-cloud` 位于可写根，普通仓库编辑直接执行、不走 `auto_review`。保留授权门为购买、部署、推送、真实付费 API/供应商/Secret/网络/云资源与破坏性操作。
- `CURRENT` 差量递增至 `v4-474`；FIFO 183=`active`，`FRONT-SYSTEM-03C Rev 5`=`in_progress / Current actor=UI 设计对话 / Reviewer=UI 设计对话`。
- 本轮只使用正式 React production build + Fastify + 精确隔离 PostgreSQL 复验 A–C 三个原失败场景并核对 z-index 与 console；生产代码、contracts、迁移和 DESIGN 修改 0，不重复完整矩阵、Impeccable 或完整 `pnpm check`。

## 2026-08-17 — FIFO 182 规划独立微审通过并建立 FIFO 183 UI 三场景复验

- 规划逐项核对 `enginesPage.tsx`、`routingPage.tsx`、公共异步/错误恢复原语、响应式层级和两份专项：引擎读取失败复用公共 `ErrorBlock` 安全焦点；本次连接测试 unknown 的唯一同 `testRunId` 恢复位于详情抽屉，页面无重复入口且抽屉高于顶栏、Modal 高于抽屉；路由草稿错误只在活动 Modal 内呈现并聚焦，unknown 成功回到页面 H1。
- 静态边界审计确认没有新增 `document.querySelector`、第二错误状态、compat/legacy/fallback 写路径或自动重发写命令；历史 unknown 继续行内 GET 且 POST=0，创建 unknown 继续稳定 POST=1。
- 规划新鲜验证：两份 system-control 前端专项 **28/28**；CI 模式 system-frontend TypeScript 通过；Vite production build **25 modules** 通过；`git diff --check` 通过，仅既有 `LOCAL_APP_PARITY.md` CRLF 提示。
- FIFO 182 closed；建立 FIFO 183，只由 UI 复验 `QA-FRONT-SYSTEM-03C-181-01/02/03` 三个原失败场景。FIFO 179 其余完整矩阵继续冻结，不重复 Impeccable、不运行完整 `pnpm check`。
- `CURRENT` 差量递增至 `v4-473`；FIFO 183 正式唤醒与 permission/in_progress 送达确认待补写。

## 2026-08-17 — FRONT-SYSTEM-03C Rev 5 FIFO 182 三项焦点/可达性微返工完成

- 复用公共 `ErrorBlock` 安全焦点：引擎首屏失败与已有事实刷新失败稳定后聚焦错误语境；重复失败仍聚焦同一错误块，成功恢复由既有回调聚焦页面 H1，普通成功/无错后台刷新不抢焦点。
- create test unknown 的唯一 `CommandRecovery` 已移入引擎详情抽屉的连接测试上下文；页面层不再渲染本次测试第二恢复入口。恢复继续只 GET 同一 `testRunId`，历史 PostgreSQL unknown 行仍 POST=0；详情抽屉 z-index 提升到高于顶栏，关闭按钮保持可达，Modal backdrop 同步位于抽屉之上，避免弹窗层级回归。
- 路由草稿确定性失败继续沿用同一 `actionError`，仅在活动 Modal 内呈现并聚焦；遮罩后的页面错误块为 0，关闭 Modal 清理表单错误。未知创建关闭 Modal 后只保留同一 `routingVersionId` 查询，成功聚焦路由 H1。
- 回归新增/调整：引擎首屏与 stale 失败焦点、create unknown 抽屉内唯一恢复、路由确定失败 Modal 错误与 unknown 成功落点；两份 system-control 专项 **28/28** 通过。
- 验证：两份 system-control 专项最终 **28/28**；system-frontend TypeScript 通过；Vite production build **25 modules** 通过；`git diff --check` 通过（仅既有 `LOCAL_APP_PARITY.md` CRLF 提示）。按任务要求未重复 Impeccable、未运行完整 `pnpm check`、未重做完整浏览器矩阵，未修改 backend/迁移/packages/contracts/DESIGN/员工 frontend，未提交/推送/部署。
- `CURRENT` 差量递增至 `v4-472`；FIFO 182、`FRONT-SYSTEM-03C Rev 5` 转 `review / Current actor=规划对话 / Reviewer=规划对话`，只交规划复验。

## 2026-08-17 — FRONT-SYSTEM-03C Rev 5 FIFO 182 permission fingerprint 与领取

- 已重读 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`CURRENT v4-470`、开发日志顶部、`docs/ui/SYSTEM-engine-control-acceptance.md` §14、`docs/ui/SYSTEM-control-shell-acceptance.md` §13、`controlPrimitives.tsx`、`enginesPage.tsx`、`routingPage.tsx`、`responsive.css` 与两份 system-control 前端专项。
- permission fingerprint：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`；`permission_profile=workspace-write`；`ordinary_writes=direct`；`restricted_actions=购买/部署/推送/真实付费API/云资源/破坏性操作`；工作区包含 `C:\Users\ComradeGu\Documents\七猫兼职`，普通仓库编辑不走 `auto_review`。
- `CURRENT` 差量递增至 `v4-471`；FIFO 182 由 `ready` 转 `active`，`FRONT-SYSTEM-03C Rev 5` 进入 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。
- 范围锁定：页面 ErrorBlock 失败安全焦点、create test unknown 详情抽屉内唯一同 `testRunId` 恢复与抽屉层级、routing 草稿 Modal 错误焦点/unknown 成功安全落点；不改 API/body/key/状态机、backend、contracts、迁移、DESIGN、视觉方向或 FIFO 179 其余通过项。


## 2026-08-17 — FIFO 181 规划接收与 FIFO 182 三项同源微返工

- 规划接收正式 build + Fastify + 精确隔离 PostgreSQL 的 FIFO 181 结果：历史 PostgreSQL unknown、部署状态、发布/回滚、稳定 ID 防重复和 pending Modal 均通过；结论 `P0=0 / P1=3 / P2=0 / P3=0`，FIFO 179 其余 49 项继续冻结。
- 代码归因 1：页面级 `engines.error` 使用公共 `ErrorBlock` 时未启用既有 `focusOnMount`，因此首屏/已有事实刷新失败稳定后落 BODY；恢复成功 H1 已通过。修正应复用公共错误块安全焦点，不新增页面 `querySelector`。
- 代码归因 2：create test unknown 的 `CommandRecovery` 渲染在页面层，而连接测试上下文仍位于固定详情抽屉；抽屉 `z-index:20` 又低于顶栏 `z-index:35`，造成恢复动作被抽屉遮挡且关闭按钮被顶栏覆盖。修正应把本次 test 恢复放入抽屉同一上下文并保证抽屉/关闭按钮真实可达，同时避免页面重复恢复入口。
- 代码归因 3：路由草稿确定失败保持 Modal 打开，却把 `actionError` 渲染并聚焦在遮罩后的页面层；unknown 恢复成功也没有明确安全落点。修正应使用同一 `actionError` 在活动 Modal 内呈现/聚焦，关闭时清理；unknown 查询成功聚焦 H1 或明确状态目标，不新增第二错误状态。
- 建立 FIFO 182 / `FRONT-SYSTEM-03C Rev 5`：只允许修改公共原语、engines/routing 必要消费、responsive CSS 与两份前端专项；不改 API/backend/contracts/migrations/DESIGN/员工站/视觉方向，不运行完整 `pnpm check`。完成后规划微审，再由 UI 只复验三项变化。
- `CURRENT` 差量递增至 `v4-470`；FIFO 181 closed，FIFO 182 ready，正式唤醒与送达确认待补写。

## 2026-08-17 — FIFO 181 FRONT-SYSTEM-03C Rev 4 UI 变化场景微终验完成

- 使用新鲜 `system-frontend` production build（Vite 8.2.1，25 modules）、正式 Fastify system-control routes、后端逐请求 resolver 注入控制台身份和精确隔离 PostgreSQL `qimao_fifo181_ui_20260817`（29 个迁移），只复验 FIFO 179 的 A–D 变化场景；其余 49 项冻结。生产 `frontend/system-frontend/backend/contracts/migrations/DESIGN` 修改 0，未重复 Impeccable、未运行完整 `pnpm check`。
- 通过：PostgreSQL 直接发现历史 unknown 后同 `testRunId` GET 失败/成功恢复且 POST=0；部署状态确定失败/unknown；发布与回滚稳定 `releaseCommandId`、POST/GET 各 1；pending Modal 的 dialog 焦点、Tab/Shift+Tab、Escape/遮罩/重复提交锁、成功/非 pending 焦点；页面 console `error/warn=0/0`。两份 system-control 前端专项新鲜 26/26。
- 结论为 `P0=0 / P1=3 / P2=0 / P3=0`：① 引擎首屏/已有事实读取失败后活动焦点仍落 BODY；② 本次连接测试 create unknown 的唯一同 ID 查询被版本抽屉遮挡，抽屉关闭又被顶栏覆盖，POST=1 但真实 GET=0；③ 路由草稿确定失败焦点逃到 modal 遮罩后的 alert，unknown 查询成功后落 BODY。稳定身份、防重复与真实 requestId 主体成立，不以此掩盖可达性失败。
- 证据已写 `docs/ui/SYSTEM-engine-control-acceptance.md` §14、`docs/ui/SYSTEM-control-shell-acceptance.md` §13 和仓库外 `front-system-03c-rev4-ui-qa/fifo181-results.json` + 5 张最小截图。隔离库已精确 DROP 并确认不存在；端口 31811/31812、PID 23812、浏览器标签/视口及临时 harness/seed/preload 均已清理；共享默认库与其他任务服务未动。
- `CURRENT` 差量递增至 `v4-469`；FIFO 181=`notification_pending`，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`。只交规划，不通知前端/后端/测试，不自行 done 或解锁 `TEST-SYSTEM-03`。

## 2026-08-17 — FIFO 181 FRONT-SYSTEM-03C Rev 4 UI 微终验 permission fingerprint 与领取

- 已完整重读 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`CURRENT v4-467`、开发日志顶部、两份 UI 验收指定章节、当前 `system-frontend` 生产代码与两份 system-control 前端专项；FIFO 179 其余通过矩阵保持冻结。
- permission fingerprint：`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`；仓库 `qimao-terms-cloud` 位于可写工作区，普通仓库编辑直接执行、不走 `auto_review`。受限边界继续为真实供应商/网络/Secret/付费/云资源、提交/推送/部署及破坏性操作。
- `CURRENT` 差量递增至 `v4-468`；FIFO 181=`active`，`FRONT-SYSTEM-03C Rev 4`=`in_progress / Current actor=UI 设计对话 / Reviewer=UI 设计对话`。
- 本轮只使用正式 production build + Fastify + 精确隔离 PostgreSQL 复验 A–D 四组变化场景；生产 `frontend/system-frontend/backend/contracts/migrations/DESIGN` 修改 0，不重复 Impeccable、不运行完整 `pnpm check`。

## 2026-08-17 — FIFO 180 规划复验通过并建立 FIFO 181 UI 微终验

- 规划独立核对公共 `useAsyncRead/ErrorBlock/CommandRecovery/Modal` 与三页消费代码，确认已有事实刷新失败保留 stale、真实 requestId 与唯一恢复；稳定命令未知只读同一 ID；pending Modal 接管可编程焦点；三页未新增第二状态源、自动重发写命令或页面级焦点补丁。
- 补充核对从 PostgreSQL 刷新发现的既有 `status=unknown` 连接测试：行内唯一动作只调用 `getTest(testRunId)`；再次失败保留同 ID/requestId/动作与焦点，成功刷新测试历史；两条回归均断言创建 POST=0。
- 新鲜验证：两份 system-control 前端专项 **26/26**；CI 模式 system-frontend TypeScript 通过；Vite production build **25 modules** 通过；`git diff --check` 通过，仅既有 `LOCAL_APP_PARITY.md` CRLF 提示。首次非 CI typecheck/build 仅被 pnpm 非交互依赖清理保护拦截，未安装或修改依赖，不记业务失败。
- FIFO 180 closed；建立 FIFO 181，由 UI 只复验 FIFO 179 的四组变化场景与历史 unknown 行，不重跑完整矩阵、不修改生产代码、不运行完整 `pnpm check`。通过后再解锁 `TEST-SYSTEM-03`。
- `CURRENT` 差量递增至 `v4-467`；正式唤醒、permission 与 in_progress 送达确认在下一条记录补写。

## 2026-08-17 — FRONT-SYSTEM-03C Rev 4 FIFO 180 历史 unknown 测试行收口完成

- `system-frontend/src/enginesPage.tsx` 的测试历史行现消费服务端返回的 `status=unknown` 与真实 `testRunId`：每行提供唯一“查询本次测试结果”，只调用既有 `getTest(testRunId)`，不 POST、不扫描列表猜身份；queued/running 无查询动作并继续阻止新测试，failed 仍由显式新 `testRunId` 创建。
- 历史查询使用现有稳定恢复语义：查询中动作锁定；GET 再次失败保留同一 `testRunId`、真实 `requestId` 和同一动作并聚焦；成功仅刷新当前测试历史并聚焦状态安全目标。此前 create POST unknown 的内存恢复路径保持不变。
- `tests/frontend/system-control-plane.test.tsx` 新增两项独立回归：初始列表直接发现 unknown → 同 ID GET → 成功刷新；同 ID GET 首次 503 → requestId/唯一动作/焦点保留 → 第二次 GET 成功；两条路径 POST 均为 0。两份 system-control 专项共 **26/26** 通过。
- 验证：system-frontend TypeScript 通过；Vite production build **25 modules** 通过；`git diff --check` 与目标文件尾随空白检查通过。不重复 Impeccable、不运行完整 `pnpm check`、不重做完整浏览器矩阵，未修改 backend/迁移/packages/contracts/DESIGN/员工 frontend，未提交/推送/部署。
- `CURRENT` 差量递增至 `v4-466`；FIFO 180、`FRONT-SYSTEM-03C Rev 4` 转 `review / Current actor=规划对话 / Reviewer=规划对话`，只交规划复验。

## 2026-08-17 — FIFO 180 规划复验发现历史 unknown 连接测试恢复盲区

- 规划逐项核对 `controlPrimitives.tsx`、三页消费与新增专项：公共 stale/requestId 唯一恢复、pending dialog 可编程焦点、路由/发布/部署状态稳定身份恢复主体成立；三页旧 `document.querySelector` 焦点争夺已清零，文件均远低于 800 行。
- 唯一剩余 P1：`enginesPage.tsx` 的 `TestRow` 仍只展示状态/结果，不为从 PostgreSQL 列表刷新发现的既有 `status=unknown` 测试提供同 `testRunId` 查询。新增回归只覆盖“本次 create POST 返回 unknown 后的内存 pendingRecovery”，页面刷新/进程重启后该内存意图消失，原 FIFO179-03 仍可复现。
- FIFO180 保持 Rev4，不拆新任务：让 unknown 历史行显示唯一“查询本次测试结果”，点击只调用既有 `getTest(testRunId)`；再次失败保留同一 ID/动作和 requestId，成功刷新服务端测试历史并聚焦明确安全目标；queued/running 不提供该查询，failed 仍创建新 testRunId。禁止新增第二状态源或自动 POST。
- `CURRENT` 递增至 v4-465；FIFO180 退回 ready / Current actor=前端开发对话。前一轮 24/24、typecheck/build/detector/diff-check 作为主体证据保留，补齐后只重跑两份专项、typecheck/build/diff-check，不重复 detector，不送 UI 前留下已知盲区。

## 2026-08-17 — FRONT-SYSTEM-03C Rev 4 FIFO 180 共性异步恢复与焦点收口完成

- 公共原语收口：`system-frontend/src/controlPrimitives.tsx` 的 `useAsyncRead` 在已有服务端事实刷新失败时保留旧数据并投影 stale、真实 `requestId` 与唯一“重新读取”；`ErrorBlock` 支持恢复成功安全聚焦；`CommandRecovery` 统一部署、版本、连接测试、状态、路由与发布命令的稳定身份只读恢复。普通初始成功与后台刷新成功不抢焦点。
- 公共 Modal 收口：pending/locked 提交阶段把焦点接回可编程 dialog，所有控件锁定、Tab/Shift+Tab 不逃逸、Escape/遮罩/重复提交受阻；恢复成功/确定失败按唯一安全目标聚焦，移除三页脆弱的 `document.querySelector` 焦点争抢路径。
- 三页消费：`enginesPage.tsx`、`routingPage.tsx`、`changesPage.tsx` 移除重复通用重读与稳定命令恢复并行入口；确定性错误清 pending 意图并刷新权威事实，未知只 GET 同一部署/版本/`testRunId`/状态命令/路由/`releaseCommandId`。连接测试 unknown 提供唯一“查询本次测试结果”，查询后刷新测试历史；失败继续保留同一身份。
- 回归覆盖：`tests/frontend/system-control-plane.test.tsx` 增加 stale+requestId 唯一恢复、首屏/重复失败唯一动作、同 `testRunId` 连接测试查询、pending 状态 Modal 焦点锁定、成功读取不抢焦点及非 pending 关闭回原触发点；两份 system-control 专项共 **24/24** 通过。
- 验证：system-frontend TypeScript 通过；Vite production build **25 modules** 通过；Impeccable detector 输出 `[]`；`git diff --check` 与目标文件尾随空白检查通过。未运行完整 `pnpm check`、未重做完整浏览器矩阵、未修改 backend/迁移/packages/contracts/DESIGN/员工 frontend，未提交/推送/部署。
- `CURRENT` 差量递增至 `v4-464`；FIFO 180、`FRONT-SYSTEM-03C Rev 4` 转 `review / Current actor=规划对话 / Reviewer=规划对话`，只交规划复验。

## 2026-08-17 — FRONT-SYSTEM-03C Rev 4 FIFO 180 permission fingerprint 与领取

- 已重读 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`CURRENT v4-462`、开发日志顶部、`docs/ui/SYSTEM-engine-control-acceptance.md` §13、`docs/ui/SYSTEM-control-shell-acceptance.md` §12、`controlPrimitives.tsx`、`enginesPage.tsx`、`routingPage.tsx`、`changesPage.tsx` 与两份 system-control 前端专项。
- 精简 permission fingerprint：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`；`permission_profile=workspace-write`；`ordinary_writes=direct`；`restricted_actions=购买/部署/推送/真实付费API/云资源/破坏性操作`；仓库普通编辑不走 `auto_review`。
- `CURRENT` 已差量递增至 `v4-463`；FIFO 180 由 `ready` 转 `active`，`FRONT-SYSTEM-03C Rev 4` 进入 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。
- 范围锁定为公共读取/命令恢复 stale/requestId/唯一恢复与恢复焦点、连接测试同 `testRunId` 查询、公共 Modal pending 可编程 dialog 焦点；不修改 backend、迁移、contracts、DESIGN、员工 frontend、视觉方向、业务状态机，不提交/推送/部署。

## 2026-08-17 — FIFO 179 规划审核与 FIFO 180 共性异步恢复微返工

- 规划重读 FIFO 179 正式验收 §13、ControlShell 回归 §12、正式 `system-frontend` 三页与公共原语。确认权限、两站隔离、真实分页、Secret 诚实语义、零网络连接测试、三池路由、发布/回滚、PostgreSQL 重启恢复、1440/1024 和新旧 Job 版本固定全部冻结；P0=0、P2/P3=0。
- 四项 P1 归并为两个共性根因：`useAsyncRead/ErrorBlock` 没有统一表达“已有成功事实后的 stale + requestId + 唯一恢复 + 恢复成功焦点”，页面又同时渲染通用重读和稳定命令查询；`Modal` 在 pending 时禁用全部按钮后没有接管焦点，活动焦点会落到 BODY。连接测试 unknown 另缺同 `testRunId` 的只读查询入口，属于统一稳定命令恢复原语的缺失消费点。
- 建立 FIFO 180 / `FRONT-SYSTEM-03C Rev 4`：优先扩展 `controlPrimitives.tsx` 的公共读取/命令恢复与 pending dialog 焦点原语，再让 `/engines /routing /changes` 消费；禁止每页新增独立 `querySelector`、第二错误状态、自动重发写命令、fallback 或旧路径。已有数据 refresh 失败必须保留数据并只显示一个含真实 requestId 的恢复动作；unknown 只查同一稳定 ID；确定失败清意图并刷新权威事实；成功聚焦页面标题/明确安全目标。
- 允许修改 `system-frontend/src/controlPrimitives.tsx`、三页必要消费代码和两份现有 system-control 前端专项；不改 API、后端、迁移、contracts、DESIGN、视觉方向或已通过业务状态。定向回归至少覆盖四个原失败场景以及普通初始成功不抢焦点、非 pending 弹窗关闭恢复不回归；不运行完整 `pnpm check`。
- `CURRENT` 递增至 v4-462；FIFO 179 closed，FIFO 180 ready / Current actor=前端开发对话，`TEST-SYSTEM-03` 继续 blocked。

## 2026-08-17 — FIFO 179 FRONT-SYSTEM-03C Rev 3 唯一完整正式 UI 终验完成并交规划

- 使用新鲜 `system-frontend` production build（Vite 8.2.1，25 modules）、正式 Fastify routes、服务端注入的逐请求 system-control principal 与三套精确隔离 PostgreSQL，完整执行权限/两站隔离、`/engines`、`/routing`、`/changes`、高风险异步与键盘、1440/1024、进程重启、空库及新旧 ASR/OCR Job 版本固定矩阵。生产 `frontend/system-frontend/backend/contracts/migrations/DESIGN` 修改 0，未运行完整 `pnpm check`，未重复 Impeccable。
- 通过主体：匿名/employee/缺能力拒绝及精确能力；部署/版本/测试/路由/审计服务端分页；登记部署与 v2、Secret 诚实语义、failed 新 testRunId、queued/running/unknown 防重复；active 引用停用 409；三池容量与第 21/22 个版本可达；硬阻断；发布 v3/回滚 v2、真实 total/脱敏审计、Fastify PID `17364→33928` 后 PostgreSQL 恢复；1024 侧栏 72/216 覆盖不挤、根无横溢、宽表仅容器内滚；正式页面 console `error/warn=0/0`。
- 独立从零库用正式 routing publish、ASR command repository、ScreenText write repository 创建发布前后 Job：旧 ASR/OCR 保持 v1 `routingVersionId/deploymentVersionId`，新 Job 固定 v2，`fifo179-version-stickiness.json pass=true`；routing 专项 5/5。
- 集中缺陷为 `P0=0 / P1=4 / P2=0 / P3=0`：高风险确定失败/unknown 后唯一恢复与焦点不稳定；引擎已有事实 refresh 失败不显示 stale/requestId 且重试不唯一；连接测试 unknown 缺同 testRunId 查询；部署状态提交中焦点落 BODY。完整事实与 requestId/DOM 测量写入 `docs/ui/SYSTEM-engine-control-acceptance.md` §13 和仓库外 `fifo179-results.json`。
- `docs/ui/SYSTEM-control-shell-acceptance.md` §12 记录壳层回归通过；CURRENT 差量递增至 v4-461，FIFO 179=`notification_pending`，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`。只交规划，不直接通知前后端，不解锁 `TEST-SYSTEM-03`。

## 2026-08-17 — FIFO 179 FRONT-SYSTEM-03C Rev 3 正式 UI 终验 permission_ok 与领取

- 已按 v4.8 重读当前任务权威输入；本轮只审查正式 `system-frontend` production build + 正式 Fastify + 精确隔离 PostgreSQL，不修改生产 frontend/system-frontend/backend/contracts/migrations/DESIGN，不运行完整 `pnpm check`。
- permission fingerprint：`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职:workspace-write/:workspace`；仓库写探针通过，普通仓库编辑直接写入、不走 `auto_review`。
- `CURRENT` 递增至 v4-460；FIFO 179=`active`，`FRONT-SYSTEM-03C Rev 3`=`in_progress / Current actor=UI 设计对话 / Reviewer=UI 设计对话`。证据仅写两份 docs/ui、CURRENT/日志和仓库外脱敏目录，完成后只交规划。

## 2026-08-17 — FIFO 178 规划复验通过并建立 FIFO 179 UI 全链终验

- 规划独立核对 Rev 3 代码与回归：`/routing` current pointer 已改为独立 `status=active&limit=1` 查询；历史筛选/分页不再参与 active 判断。连接测试写入前按目标版本服务端读取 queued/running/unknown，任一存在时零 POST；路由选择改为部署页→各部署版本页，不再批量 N+1 或固定截断，已选 versionId 跨页保留。
- Secret 入口只提交共享契约允许的 inherit/clear；“替换为服务器已有别名”与密钥安全入口均诚实禁用，不出现 referenceId/Secret 原文输入。未发现 compat/fallback、浏览器 active 缓存、owner/test header 或第二状态源。
- 规划新鲜运行 `system-control.test.tsx + system-control-plane.test.tsx` 19/19、system-frontend typecheck、Vite build 25 modules、`git diff --check`，全部通过；只有既有 `LOCAL_APP_PARITY.md` CRLF 提示。手写文件均低于 800 行。
- 结论：FIFO 178 closed，`FRONT-SYSTEM-03C Rev 3` 生产代码冻结。建立 FIFO 179，由 UI 使用正式 React build + Fastify + 精确隔离 PostgreSQL 做本切片唯一完整浏览器矩阵；UI 不修改生产代码，不运行完整 `pnpm check`，通过后才解锁 TEST-SYSTEM-03。
- `CURRENT` 递增至 v4-459；FIFO 179 ready / Current actor=UI 设计对话。

## 2026-08-17 — FRONT-SYSTEM-03C Rev 3 FIFO 178 四项定向收口完成并交规划 review

- `/routing` 新增独立 `environment=development&workflowStage=<stage>&status=active&limit=1&offset=0` 只读查询；历史状态筛选、翻页或空页不再推算或覆盖 current pointer，切换 `asr/screen_text` 会重新读取对应 active 事实。
- `/engines` 连接测试提交前按目标 `deploymentVersionId` 分别读取服务端 `queued/running/unknown` 活动测试；任一存在即显示真实状态且不 POST，`failed` 仍由显式动作生成新 `testRunId`。原写命令稳定 body/key/unknown 恢复保持不变。
- `/routing` 新建草稿改为服务端部署页 → 对应部署版本页的分步选择；不再为当前部署页批量读取固定前 20 版本。版本 `total/offset` 可达第 21 条以后，页切换保留已选稳定 `versionId` 与已读取选项事实，不加载全历史或伪造 enabled/能力。
- 新版本 Secret 区明确“继承上一版本”“明确清除”“替换为服务器已有别名（当前不可用）”；以说明诚实表达“不需要密钥”与 clear 的同一服务端语义，提供禁用的“前往密钥与安全（只读）”，不接受 referenceId 或明文 Secret。
- 允许生产文件：`system-frontend/src/routingPage.tsx`、`system-frontend/src/enginesPage.tsx`；专项回归：`tests/frontend/system-control-plane.test.tsx` 新增 active 指针独立性、版本第 21 条可达/稳定选择、未选版本测试防重复与 Secret DOM 语义，原回归均保留。
- 验证：`tests/frontend/system-control.test.tsx` + `tests/frontend/system-control-plane.test.tsx` **19/19**；`system-frontend` TypeScript 通过；Vite production build **25 modules** 通过；Impeccable detector `[]`；`git diff --check` 通过。未运行完整 `pnpm check`，未改 backend/迁移/contracts/DESIGN/员工 frontend，未接真实网络/供应商/Secret/付费，未提交推送部署。
- `CURRENT` 已差量递增至 `v4-458`；FIFO178、`FRONT-SYSTEM-03C Rev3` 转 `review / Current actor=规划对话 / Reviewer=规划对话`，仅唤醒规划审核。

## 2026-08-17 — FRONT-SYSTEM-03C Rev 3 FIFO 178 permission fingerprint 与领取

- 已重读 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`CURRENT v4-456`、开发日志顶部、`SYSTEM-engine-control-plane.md` §4.1、`docs/ui/SYSTEM-engine-control-acceptance.md` §12、共享 `system-control` 契约与当前 system-frontend 三页代码。
- permission fingerprint：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`；`workspace_root_contains_parent=True`；`repo_write_probe=True`；`permission_profile=workspace-write`；`ordinary_writes=direct`；`restricted_actions=购买/部署/推送/真实付费API/云资源/破坏性操作`。普通仓库编辑不走 auto_review。
- `CURRENT` 已差量递增至 `v4-457`；FIFO 178 由 `ready` 转 `active`，`FRONT-SYSTEM-03C Rev 3` 进入 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。
- 范围锁定为四项定向收口：`/routing` 独立读取 environment/workflowStage/status=active 权威指针；目标 deploymentVersionId 的服务端活动测试防重复；路由部署→版本分步分页且保留已选稳定 versionId；新版本 Secret 继承/明确清除/替换不可用与密钥安全只读去向。Rev 2 其余业务、命令 body/key、unknown 恢复、布局视觉与响应式冻结；不修改 backend、迁移、packages/contracts、DESIGN、员工 frontend，不提交/推送/部署。

## 2026-08-17 — FIFO 177 规划审核与 FIFO 178 前端定向退审

- 规划独立重读正式 `system-frontend` 三页、共享 API/Modal、两份前端专项、SYSTEM-03 契约与 UI Rev 2 验收矩阵；确认部署启停稳定命令、routing audit、网络未知只读恢复、确定错误刷新、active 不回滚自身、基础分页与焦点主体成立。
- P1｜`/routing` 的“当前生效”从当前历史查询页 `routes.data.items.find(active)` 推算；状态筛选非 active、翻页或 active 不在当前 20 条时会错误显示“暂无 active 路由”。必须独立读取同一 environment/workflowStage 的 `status=active` 权威查询，历史筛选与翻页不得影响 current pointer 投影。
- P1｜`runTest` 在未选中的版本卡上使用旧 `selectedVersion/tests` 判断重复；用户可未先读取目标版本测试历史就发送新测试，绕过 queued/running/unknown 防重复。必须在创建前读取目标 `deploymentVersionId` 的权威活动测试，存在任一上述状态即不 POST，并给出真实状态反馈；不得扫描浏览器缓存猜测。
- P1｜路由编辑器仅对当前部署页逐个读取 `limit=20&offset=0` 的版本并合并，声明“不会静默截断”但每部署第 21 个及以后版本实际不可达，且形成最多 20 个并行 N+1 请求。需改成明确的服务端部署/版本分步选择或等价有界分页，保持已选 versionId 稳定，翻页不清掉已选值，不一次读取全历史。
- UI 对齐一并收口：新版本 Secret 入口至少明确显示继承、明确清除与“替换为服务器已有别名（当前不可用）”，并提供前往密钥与安全的只读去向；不得接受任意 referenceId/明文 Secret。Rev 2 其余布局、视觉、API、状态机、未知恢复与通过证据冻结。
- `CURRENT` 递增至 v4-456；FIFO 177 closed，建立 FIFO 178 / `FRONT-SYSTEM-03C Rev 3 ready`，只允许修改 `system-frontend` 对应页面/公共原语、两份专项和状态日志。不改 backend、迁移、contracts、DESIGN 或员工站，不运行完整 `pnpm check`，不提交推送部署。

## 2026-08-17 — FRONT-SYSTEM-03C Rev 2 FIFO 177 收口完成，交规划 review

- 已消费正式 `POST /api/system-control/engines/:id/status`、同一 `statusCommandId` 的 GET 恢复及 `GET /api/system-control/routing-audit-events`；部署启停 body 仅含稳定 `statusCommandId/status`，请求带独立 `Idempotency-Key`，网络未知/`retryable=true` 不重发，只查询原身份；确定性 4xx 清意图并刷新服务端部署/版本/测试/路由事实，active primary/fallback 冲突投影“请先切换当前路由”及真实诊断信息。
- `/engines` 增加服务端能力/状态筛选、部署/版本/测试真实 `total/limit/offset` 分页；版本可直接只读选择和查看测试历史，queued/running/unknown 阻止同版本重复测试，failed 显式新建新 `testRunId`。`/routing` 的 workflowStage/status、部署版本选择和草稿恢复继续消费服务端分页；`/changes` 接入真实 audit action/routingVersionId/actor/result/requestId/time 分页，active 当前版本不显示自身回滚，发布/回滚未知只 GET 同一 `releaseCommandId`。
- `/engines` 的筛选、部署页翻页和版本页翻页会清除失效的局部选择，避免抽屉/测试历史继续显示已离开服务端页的旧事实。
- 公共 `Modal` 焦点 effect 仅在打开时建立，受控输入与 pending 切换不抢焦点；提交中锁定焦点循环、Escape/遮罩与重复提交，失败/未知保留唯一同身份查询。API transport rejection 统一归类为 `ControlApiError(status=0,retryable=true)`，不把网络未知误判为确定失败。
- 新增/调整专项回归覆盖：statusCommand body/idempotency 与同 ID GET、受控中文/空格输入焦点、版本测试历史与 queued 防重复、真实 routing audit 事实/分页、active 不回滚自身、发布未知同一 release command。未修改 backend、迁移、packages/contracts、DESIGN 或员工 frontend。
- 验证：`tests/frontend/system-control.test.tsx` + `tests/frontend/system-control-plane.test.tsx` 共 **15/15**；system-frontend typecheck 通过；Vite production build **25 modules** 通过；Impeccable detector 输出 `[]`；`git diff --check` 通过（保留既有 `LOCAL_APP_PARITY.md` CRLF 提示）。未运行完整 `pnpm check`，未接真实供应商/网络/Secret/付费/部署，未提交、推送或部署。
- `CURRENT` 已差量递增至 `v4-455`；FIFO 177 与 `FRONT-SYSTEM-03C Rev 2` 转 `review / Current actor=规划对话 / Reviewer=规划对话`，只唤醒规划固定总线。

## 2026-08-17 — FRONT-SYSTEM-03C Rev 2 FIFO 177 permission fingerprint 与领取

- 已完整重读项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`CURRENT v4-453`、`SYSTEM-engine-control-plane.md` §4.1、`DESIGN.md` 5.12、`docs/ui/SYSTEM-engine-control-acceptance.md` §12、共享 `system-control` 契约、正式 system-control routes 与开发日志顶部。
- permission fingerprint：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`；`permission_profile=workspace-write`；`ordinary_writes=direct`；`restricted_actions=购买/部署/推送/真实付费API/云资源/破坏性操作`；工作区写探针通过。
- `CURRENT` 已差量递增至 `v4-454`；FIFO 177 由 `ready` 转 `active`，`FRONT-SYSTEM-03C Rev 2` 进入 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。
- 本轮范围锁定为既有 `system-frontend/` 三页功能等价/可靠性收口与 `tests/frontend/system-control*.test.tsx`：消费部署状态命令与 routing audit API，修正确定错误/unknown 分流、Modal 焦点、测试历史选择/防重复、服务端筛选分页、active 不可回滚自身；不修改 backend、迁移、contracts、DESIGN、员工 frontend，不接真实网络/供应商/Secret/付费，不提交/推送/部署。

## 2026-08-17 — FIFO 176 规划微审通过并解锁 FIFO 177 前端集中收口

- 规划确认 engine status 与 routing command 使用完全相同的 `routing-command:${stableKey}` advisory lock 域；并发回归真实 `Promise.all`，断言 201/409 各一、业务码 `SYSTEM_CONTROL_ENGINE_STATUS_COMMAND_ID_REUSED`、无 500、状态命令/审计各一条且最终部署状态匹配成功响应。
- 新鲜精确隔离 PostgreSQL 从零迁移后运行 engine 专项 6/6 通过；隔离库 `qimao_plan_fifo176_20260817` 已精确删除，共享 PostgreSQL 保持原运行状态。Rev 1 的 routing/迁移/契约证据按微返工规则冻结，不重复完整矩阵。
- 结论：`BACK-SYSTEM-03D Rev 2` done，SYSTEM-03 后端 Wave A/B/D 全部进入冻结。里程碑 §4.1 已补精确部署状态命令恢复与 routing audit 接口，不再让前端猜测审计或启停事实。
- 建立 FIFO 177 / `FRONT-SYSTEM-03C Rev 2`：复用 Rev 1 三页主体，一次性消费启停/审计 API，并关闭确定错误与 unknown 分流、公共 Modal 焦点、测试历史可选择/排队防重复、服务端筛选分页、active 不可回滚自身等既有缺口。完成后先交规划，不直接送 UI。
- `CURRENT` 递增至 v4-453；FIFO 176 closed，FIFO 177 ready / Current actor=前端开发对话。后端、UI、测试停止等待；不接真实服务，不运行完整 `pnpm check`。

## 2026-08-17 — FIFO 176 BACK-SYSTEM-03D Rev 2 并发身份微收口完成并交规划 review

- `setDeploymentStatus` 在读取/比较 `stable_command_key` 前增加 `pg_advisory_xact_lock(hashtext('routing-command:' + stableKey))`，与 routing command 共用全局稳定命令锁；既有幂等键锁、request hash、业务冲突码保留，未捕获 23505、未增加重试/fallback/第二状态源。
- 专项新增真实 `Promise.all` 并发回归：同一 `statusCommandId`、不同 Idempotency-Key 一条 201、一条 `SYSTEM_CONTROL_ENGINE_STATUS_COMMAND_ID_REUSED` 409；无 500，数据库恰好一条状态命令、一条对应审计，最终部署状态与成功响应一致。
- 新鲜验证：engine 专项连续两次均 6/6；backend build、`git diff --check` 通过。按微返工边界未重复 routing/迁移/空库证据，未运行完整 `pnpm check`，未改 contracts/routes/migrations/routing service/frontend/DESIGN/Worker，未接真实服务，未提交推送部署。
- `CURRENT` 已差量递增至 `v4-452`；FIFO176、`BACK-SYSTEM-03D Rev 2` 转 `review / Current actor=规划对话 / Reviewer=规划对话`，只唤醒规划验收。

## 2026-08-17 — FIFO 176 BACK-SYSTEM-03D Rev 2 permission_ok 与领取

- 已重读 `CURRENT v4-450`、开发日志顶部、项目 `AGENTS.md` 与 `docs/WORKFLOW.md` v4.8；确认本轮只做同一 `statusCommandId` 并发命令身份微收口，Rev1 其余证据冻结。
- permission fingerprint：`permission_ok:C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud:workspace-write`；`ordinary_writes=direct`；普通仓库编辑不走 `auto_review`；受限项为网络、真实服务/密钥/付费、迁移、前端、提交/推送/部署及破坏性操作。
- `CURRENT` 已差量递增至 `v4-451`；FIFO176 active，`BACK-SYSTEM-03D Rev 2` 进入 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。
- 唯一变化：在 `setDeploymentStatus` 查询/比较 `stable_command_key` 前增加与 routing command 同语义的全局事务 advisory lock；保留幂等键锁、规范化摘要和现有稳定业务错误，不捕获 23505、不加重试/fallback/第二状态源。仅允许 engine service、专项测试、CURRENT/日志。

## 2026-08-17 — FIFO 175 规划微审与 FIFO 176 并发命令身份退审

- 规划独立核对共享 schema、启停路由、engine service、routing audit 查询、`1754976014000` 增量迁移和两份专项测试；确认逐请求权限、active primary/fallback 停用保护、只读审计脱敏分页、现有库缺列升级和空库重复应用语义主体成立。
- 新鲜精确隔离 PostgreSQL 从零执行 29/29 迁移，engine/routing 两文件 10/10 通过；隔离库 `qimao_plan_fifo175_20260817` 已精确删除。首次普通 pnpm 迁移被非交互 modules 清理保护拦截，随后 tsx 启动遇宿主 `uv_os_get_passwd ENOMEM`；改用既有编译迁移入口和 Vitest 入口后成功，均未记为业务失败，未触碰共享默认库。
- 唯一 P1：`setDeploymentStatus` 只按 `command_kind + Idempotency-Key` 获取事务 advisory lock，但 `stable_command_key` 是跨 command kind 全局唯一。同一 `statusCommandId` 被不同幂等键并发占用时，两个事务可同时查到不存在并竞争插入，失败方会泄漏 PostgreSQL 23505 到通用 500，而不是稳定的 `SYSTEM_CONTROL_ENGINE_STATUS_COMMAND_ID_REUSED` 409；这会破坏前端未知结果按稳定命令 ID 恢复的边界。
- 建立 FIFO 176 / `BACK-SYSTEM-03D Rev 2` 微返工：在查询命令事实前按全局稳定 `statusCommandId` 串行化，再保留现有幂等键锁；补真实并发回归证明一条成功、一条稳定业务 409、只产生一条命令且无 500。只允许改 engine service、对应专项测试和状态/日志；Rev 1 契约、迁移、API、active 路由保护、审计读取与全部其他证据冻结。
- `CURRENT` 递增至 v4-450；FIFO 175 closed，FIFO 176 ready / Current actor=后端开发对话。`FRONT-SYSTEM-03C` 继续 blocked，不先路由 UI/前端/测试。

## 2026-08-17 — FIFO 175 BACK-SYSTEM-03D Rev 1 完成并交规划 review

- 新增共享 `SystemControlEngineStatusCommandBody/Command` 与 `SystemControlRoutingAuditList` 契约；正式 API 为 `POST /api/system-control/engines/:id/status`、`GET /api/system-control/engine-status-commands/:statusCommandId`、`GET /api/system-control/routing-audit-events`。
- 部署启停命令在单事务内锁定稳定 `statusCommandId`/Idempotency-Key/request hash，支持同键重放、异参/异资源稳定 409、GET 恢复；停用前与发布使用同一 active pointer advisory lock，primary/fallback 引用时在写入前返回 `SYSTEM_CONTROL_ENGINE_DISABLED_ACTIVE_ROUTE`，成功仅更新部署状态并追加脱敏审计。
- routing audit 只读查询限定 `resource_type=routing_policy_version`，支持 `routingVersionId/action/limit/offset`、`created_at DESC,id DESC`、真实 total 与逐请求 `routing:read`；响应只投影 eventId/action/routingVersionId/actorSubject/requestId/result/createdAt，不返回 snapshot、幂等键或 Secret/内部引用。
- 首次专项复现发现当前已应用数据库的 `system_control_commands` 缺失代码与既有 routing 实现依赖的 `stable_command_key`（PostgreSQL 42703）。因此新增幂等、可重复应用的 `1754976014000_add_stable_system_control_command_key.cjs` 增量迁移；不覆写旧迁移，不增加 fallback。当前库迁移后新列存在，从零库同样安全 no-op。
- 新鲜验证：engine 专项 5/5、routing 专项 5/5，组合 2 文件 10/10；contracts build、backend build、`CI=true pnpm run check:repo`、`git diff --check`、三份迁移 `node --check` 通过；精确隔离 PostgreSQL 从零 29/29 迁移，`engine_deployments/routing_policy_versions/active_control_plane_pointers/system_control_commands` 均为 0。未运行完整 `pnpm check`，未接真实供应商/网络/SDK/Secret/付费，未改前端/DESIGN/Worker/路由状态链，未提交推送部署。
- `CURRENT` 已差量递增至 `v4-449`；FIFO175、`BACK-SYSTEM-03D Rev 1` 转 `review / Current actor=规划对话 / Reviewer=规划对话`，只唤醒规划验收。

## 2026-08-16 — FIFO 175 BACK-SYSTEM-03D Rev 1 permission_ok 与领取

- 已完整重读项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`CURRENT v4-447`、`SYSTEM-engine-control-plane.md`、职责矩阵系统控制台行、`INT-11/12/13`、`DESIGN.md` 5.12、`docs/ui/SYSTEM-engine-control-acceptance.md` §12、system-control contracts/routes/services/migrations/tests 与开发日志顶部。
- v4.8 permission fingerprint：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`；`permission_profile=workspace-write`；`ordinary_writes=direct`；本轮普通仓库编辑不走 auto_review；受限操作为真实供应商/网络/SDK/Secret/付费/部署/推送及破坏性操作。
- 已写回 `CURRENT v4-448`，FIFO 175 active；`BACK-SYSTEM-03D Rev 1` 进入 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。
- 范围冻结为部署 enabled/disabled 稳定幂等命令（含 active 路由影响保护与 GET 恢复）及 routing audit 只读筛选分页脱敏 API；不改 Worker、路由状态机、前端/DESIGN，不接真实服务，不新增迁移除非现有结构有证明必要。

## 2026-08-16 — FIFO 174 规划完整审查与 FIFO 175 后端最小解阻

- 新鲜基线通过：`system-control.test.tsx + system-control-plane.test.tsx` 12/12、system-frontend typecheck、Vite build 25 modules、`CI=true pnpm check:repo`、`git diff --check`；三页无匿名部署、浏览器默认 active、员工 owner/test header 或 Secret 明文，正式主体可冻结。
- P1｜后端功能闭环缺口：里程碑要求部署停用明确影响，但生产路由只有部署/版本/测试创建和读取，`disabled` 仅能由测试直接 SQL 修改；需要稳定幂等的 enabled/disabled 命令，停用被 active 路由引用的部署须在写入前稳定阻断，响应/审计不泄露 Secret/内部引用。
- P1｜后端读取缺口：路由状态转移、发布和回滚已写入 `system_control_audit_events`，但没有正式审计列表 API；`/changes` 只能显示“接口未提供”，不满足冻结的回滚审计。需要有界服务端筛选/分页、稳定 `createdAt DESC,id DESC`、真实 total、脱敏事件字段和 routing-read 权限，读取零写副作用。
- P1｜前端异步与高风险动作：`ChangesPage.executeRelease` 对所有错误都建立 unknown pending，确定性 409/422 也会显示查询命令；test/impact/approve 没有同一 routingVersionId 的未知只读恢复；active 版本仍显示“回滚到此版本”。Rev 2 必须只在网络未知或 `retryable=true` 保留恢复意图，确定错误清意图并刷新权威事实，只允许历史已批准/retired 目标回滚。
- P1｜公共 Modal 焦点所有权：effect 依赖调用方每次 render 新建的 `onClose`，受控路由表单每次输入都可能重跑 effect、恢复旧触发点再把焦点重置；busy 切换也可能把焦点丢到 body。Rev 2 需稳定事件引用，打开安全初焦，pending 聚焦可编程 dialog，失败回唯一恢复/安全动作，成功回标题或原触发点。
- P1/P2｜功能等价：现有版本卡不能只读选择，查看测试历史必须先创建测试；queued/running 未阻止重复测试；连接测试未实现服务端状态筛选、20 条分页，部署缺状态筛选，版本/路由/变更固定读取前 100 条。Rev 2 统一补服务端成员语义和分页，不允许前端本地假排序/截断。
- `CURRENT` 更新为 v4-447；建立 FIFO 175 `BACK-SYSTEM-03D Rev 1 ready`，FIFO 174 暂停在规划，不送 UI。后端完成后只安排一次前端集中返工和变化场景差量复验。

## 2026-08-16 — FRONT-SYSTEM-03C Rev 1 FIFO 174 三页实现、验证与交规划审核

- 在既有独立 `system-frontend/` ControlShell 内完成 `/engines`、`/routing`、`/changes` 三页；未注册员工 `frontend/src/App.tsx/modules.ts/AppShell`，未修改 backend、迁移、packages/contracts、DESIGN 或真实资源。
- 新增 `systemApi.ts`：同源 GET/POST、服务端错误/requestId 投影、Idempotency-Key、客户端预生成 `deploymentId/versionId/testRunId/routingVersionId/releaseCommandId`；未知写结果只查询同一稳定 ID，不重发 POST、不扫描列表猜结果；未发送 owner/test header。
- 新增 `controlPrimitives.tsx`：服务端状态徽标、loading/empty/error/stale、唯一重读、模态安全初焦、Tab/Shift+Tab 闭环、Escape/遮罩回触发点、提交中锁定；引擎、路由、变更页分别持有自己的局部状态，ControlShell 仍是唯一壳层状态所有者。
- `/engines` 只消费 EngineDeployment/Version/ConnectionTest 正式 API；模型/语言/能力从 Registry 返回的版本快照只读展示，Secret 仅展示脱敏摘要；空库不生成匿名部署。
- `/routing` 只创建服务端草稿并推进 testing/impact_checked/approved；active 只从服务端列表派生，三池主备与容量无伪部署；无 active 显示“暂无 active 路由”。`/changes` 覆盖状态链、硬阻断、发布/回滚和同一 `releaseCommandId` GET 恢复；当前后端路由未提供独立审计明细接口，页面诚实说明服务端追加审计而不伪造事件。
- 生产浏览器预览证据：1440 收起态 `clientWidth=scrollWidth=1440`；1024 收起态侧栏 `72px`、主区 `952px`，展开态侧栏覆盖为 `216px`、主区仍 `952px`，两态 `scrollWidth=clientWidth=1024`；`/routing`、`/changes` 入口标题可达，控制台 `error/warn=0/0`。预览未启动 Fastify/PostgreSQL，API 层如实显示 `502` 失败块，未注入或伪造业务数据；Fastify/PostgreSQL 同状态终验留 UI/TEST 质量门。
- 定向验证：`tests/frontend/system-control.test.tsx` 与 `tests/frontend/system-control-plane.test.tsx` 共 `12/12`；system-frontend typecheck 通过；Vite production build `25 modules` 通过；`pnpm run check:repo` 通过；`git diff --check` 通过（仅保留既有 `LOCAL_APP_PARITY.md` CRLF 提示）。全量前端套件曾出现一次既有 `ScreenTextWorkspace` stale 用例瞬时失败，单文件复跑通过；未将该非本切片波动作为本轮成功证据。
- 代码健康：`ControlShell.tsx` 321 行，`systemApi.ts` 78 行，`controlPrimitives.tsx` 58 行，`enginesPage.tsx` 50 行，`routingPage.tsx` 37 行，`changesPage.tsx` 25 行，`responsive.css` 117 行；无手写生产文件超过 800 行，无新增 Context/全局 Manager/compat/fallback/第二业务状态源。
- CURRENT 已差量递增至 `v4-446`；FIFO 174 与 `FRONT-SYSTEM-03C Rev 1` 转 `review / Current actor=规划对话`，本轮只向规划固定总线交接，不提交、推送、部署或通知 UI/测试。

## 2026-08-16 — FRONT-SYSTEM-03C Rev 1 FIFO 174 permission fingerprint 与领取

- 已完整重读项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.8、`CURRENT v4-444`、`SYSTEM-engine-control-plane.md`（含 §2.4、§4.1 启动包）、职责矩阵系统控制台行、`MODULE_INTEGRATION_CONTRACTS.md` 的 `INT-11/12/13`、`DESIGN.md` 5.11–5.12、`docs/ui/SYSTEM-engine-control-acceptance.md` §12、`packages/contracts/src/system-control.ts`、正式 system-control routes 与开发日志顶部。
- v4.8 permission fingerprint：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`；`permission_profile=workspace-write`；`ordinary_writes=direct`；`restricted_actions=购买/部署/推送/真实付费API/云资源/破坏性操作`；工作区写探针通过。
- `CURRENT` 已差量递增至 `v4-445`；FIFO 174 转 `active`，`FRONT-SYSTEM-03C Rev 1` 进入 `in_progress / Current actor=前端开发对话 / Reviewer=UI 设计对话`。
- 本轮仅在 `system-frontend/` 与对应前端测试实现 `/engines`、`/routing`、`/changes`；只消费正式 API/PostgreSQL 事实，复用现有 ControlShell 与异步/焦点原语；禁止员工 AppShell、backend、迁移、packages/contracts、DESIGN、真实供应商/网络/SDK/Secret/付费、提交/推送/部署。

## 2026-08-16 — FIFO 173 规划独立验收通过与 FIFO 174 正式前端解锁

- 规划静态核对迁移、共享契约、RoutingService、ASR/OCR 新任务创建与 Worker 固定身份：迁移无业务 bootstrap；无 active 不走默认 Registry；新 Batch/Job/Attempt 固定非空路由/部署版本；publish/rollback 使用全局稳定命令身份、事务锁和 GET 恢复，未发现 P0/P1。
- 新鲜隔离证据：四个独立 PostgreSQL 数据库均从零应用 28 个迁移；空库 `engine_deployments/routing_policy_versions/active_control_plane_pointers/system-bootstrap audit` 均为 0；routing 4/4、ASR 13/13、ScreenText 14/14、engine+overview 9/9 全部通过。四个精确隔离库已删除并验证残留 0；共享 PostgreSQL 因原先已运行而保持不动。
- 新鲜静态门：contracts build、backend build、`CI=true pnpm check:repo`、`git diff --check`、两份迁移 `node --check` 均通过。第一次无 CI 的 `check:repo` 仅触发 pnpm 无 TTY 依赖清理保护，按既有规则复跑通过，不记业务失败。
- 修正 `SYSTEM-engine-control-plane.md` 2.4 的过期 bootstrap 表述，并新增 §4.1 `FRONT-SYSTEM-03C` 垂直切片启动包，明确入口、数据所有者、精确 API、异步命令身份、旧路径归零、UI 原语、允许目录、隔离测试与非目标。
- `CURRENT` 更新为 v4.8 / v4-444；FIFO 173、Wave A/B 与 UI-SYSTEM-03 关闭，建立 FIFO 174 `FRONT-SYSTEM-03C Rev 1 ready`。测试继续 blocked，完整 `pnpm check` 留正式前端、UI 终验和 TEST-SYSTEM-03 后单次运行。

## 2026-08-16 — FIFO 173 BACK-SYSTEM-03B Rev 2 最终差量复验

- 将稳定命令的事务 advisory lock 统一到全局 `stable_command_key`，与全局唯一约束配套，避免 publish/rollback 跨 command kind 并发竞态产生非分类唯一键错误；未增加 fallback、重试或第二状态源。
- 重新运行 backend build 与 routing 专项：`system-control-routing.test.ts` `4/4`；之前记录的隔离 ASR `13/13`、ScreenText `14/14`、engine+overview `9/9`、空库 28/28 迁移、contracts/check:repo/diff-check 证据仍覆盖未变更路径。
- `CURRENT` 递增至 `v4-443`；FIFO 173 继续保持 `review / Current actor=规划对话`，需以本最终差量包复核。

## 2026-08-16 — FIFO 173 BACK-SYSTEM-03B Rev 2 完成并交规划验收

- 已删除未发布路由迁移中的全部业务 bootstrap；从零隔离 PostgreSQL 应用全部 28 个迁移后，`engine_deployments=0`、`routing_policy_versions=0`、`active_control_plane_pointers=0`、`system-bootstrap` 审计事件为 0。`system_control_commands` 增加全局稳定命令身份唯一约束，路由 create/test/impact-check/approve/publish/rollback 均在事务内比较 request hash/稳定身份并保存命令；publish/rollback 提供按 `releaseCommandId` 的 GET 恢复，策略/指针使用事务 advisory lock 与行锁，回滚只追加 active 事实，不覆盖历史。
- ASR `AsrCommandRepository`、ScreenText `ScreenTextWriteRepository` 已强制注入 RoutingService+Registry，并在同一事务连接读取唯一 active 路由；新 Batch/Job/Attempt 的 `routingVersionId/deploymentVersionId` 非空且 Worker 继承固定身份，无 active/失效部署稳定 409、零批次/任务副作用；旧 descriptor、可选 routing 与 nullable-version fallback 静态扫描为 0。既有历史 null 仅保留只读读取兼容，未新增 fallback/默认状态源。
- 独立回归：routing `4/4`（空库阻断、同键重放/异参冲突、连接测试/影响硬阻断、发布未知恢复/回滚/重建 app/静态扫描）；ASR `13/13`；ScreenText `14/14`；system-control engine + overview `9/9`。各组使用隔离 PostgreSQL；补充无 active ASR/OCR 创建零副作用与发布同 key replay。
- 验证通过：contracts build、backend build、`check:repo`、`git diff --check`、两份新增迁移 `node --check`。未运行完整 `pnpm check`，未接真实供应商/网络/SDK/Secret/付费，未修改生产前端/DESIGN，未启动 Wave C。
- `CURRENT` 已递增至 `v4-442`；FIFO 173、`BACK-SYSTEM-03B Rev 2` 转 `review / Current actor=规划对话 / Reviewer=规划对话`，只唤醒规划验收。

## 2026-08-16 — FIFO 173 BACK-SYSTEM-03B Rev 2 permission_ok 与领取

- 已完整重读项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.7、`CURRENT v4-440`、`SYSTEM-engine-control-plane.md`、`MODULE_INTEGRATION_CONTRACTS.md` 的 `INT-11/12/13`、职责矩阵、Wave B 代码/专项与开发日志顶部；确认本轮只做 Wave B 架构退审集中返工，不通知前端/UI/测试。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；仓库 `qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接走工作区写入，不走 `auto_review`。
- `CURRENT` 已递增至 `v4-441`；FIFO 173、`BACK-SYSTEM-03B Rev 2` 进入 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。
- 范围锁定为允许的 system-control/asr/screen-text 契约与实现、未发布迁移、后端专项测试、CURRENT/日志；删除迁移业务 bootstrap、强制新任务 active 路由非空身份、补全写命令幂等恢复/锁与高价值回归；冻结生产前端/DESIGN、真实网络/SDK/Secret/付费、预算/服务器/部署及 Wave C。

## 2026-08-16 — FIFO 172 Wave B 架构退审与 FIFO 173 集中返工

- 规划逐项审查 Wave B 迁移、RoutingService、ASR/OCR 创建/Worker路径、共享契约和专项测试；三池表结构、不可变状态事件、影响快照和 active pointer 基础方向可保留，但尚不满足“唯一 active、无旧路径、未知可恢复”硬门。
- P1：迁移 `1754976013000` 自动插入四个开发部署、两条 active 路由和 active pointer，相当于把旧代码默认改成数据库默认，掩盖无 active 阻断；必须从迁移删除所有 bootstrap 业务行，测试各自显式建立 active fixture。
- P1：ASR `AsrCommandRepository` 与 ScreenText `ScreenTextWriteRepository` 仍把 routingService/registry/旧 descriptor 设计为可选，并使用 `active?.routingVersionId ?? null`、旧 descriptor fallback；必须改为生产写路径强制路由依赖和非空版本身份，无 active/部署失效稳定领域错误，静态旧 fallback 归零。
- P1：test/impact-check/approve 当前只追加事件，不持久化完整幂等命令；响应丢失后同键重试会因状态已前进而冲突。publish/rollback 也缺按稳定 `releaseCommandId` 的独立只读恢复投影。所有状态写命令需先比较 request hash/稳定 command ID、同键重放同结果、异参冲突零副作用，并提供正式前端 unknown 只读恢复入口；失败/unknown 时旧 active 不动。
- P1：routing 专项只有 1 个大用例，未证明无 active 阻断、发布失败旧指针不动、响应未知恢复、同 command ID 异 key、新旧任务精确版本隔离、进程重启恢复和回滚审计。Rev2 需拆成高价值独立用例并覆盖 ASR/OCR 两条真实创建链。
- 影响检查已把 reconciliation_required 计入 hardBlocks，保留并补回归；活动任务只展示，容量低于活动任务时硬阻断。不得新增 fallback、兼容迁移或默认 active。
- `CURRENT` 递增至 v4-440；建立 FIFO173 / BACK-SYSTEM-03B Rev2 ready。FRONT/TEST继续blocked。

## 2026-08-16 — FIFO 172 BACK-SYSTEM-03B Rev 1 Wave B 完成并交规划审核

- 在 Wave B 允许范围内完成 RoutingPolicyVersion/Pool、只追加状态事件与唯一 ActiveControlPlanePointer：三资源池（ASR API、OCR API、OCR 自建 Worker）仅保存主/备部署与 `maxConcurrentJobs/perProjectMax/queueLimit`，草稿不改 active；状态链为 `draft → testing → impact_checked → approved → active/retired`。
- 增加服务端权威影响检查、阻断批准/发布、客户端预生成 `routingVersionId/releaseCommandId`、同键幂等与异参冲突、未知响应按稳定身份读取、历史批准版本回滚和只追加审计；不保存或回显 Secret/内部引用，不接真实网络、厂商、SDK、付费、预算或扩缩容。
- ASR/OCR 新 Job/Attempt 创建路径已删除无 active 时 Registry 默认/散落常量选择：唯一读取 active 路由并固定 `routingVersionId + deploymentVersionId`，Worker Attempt 继承固定版本；既有测试夹具改为显式激活测试路由，生产写入口不再注入默认描述器。
- 新鲜验证：`system-control-routing.test.ts` 1/1；ASR+ScreenText 25/25；contracts/backend build、`check:repo`、`git diff --check` 通过；隔离空 PostgreSQL 从零执行 28/28 迁移通过。未运行完整 `pnpm check`，未通知 UI/前端/测试，Wave B 后续与前端/测试仍 blocked。
- `CURRENT` 递增至 `v4-439`；FIFO 172、`BACK-SYSTEM-03B Rev 1` 转 `review / Current actor=规划对话 / Reviewer=规划对话`，仅交规划审核。

## 2026-08-16 — FIFO 172 BACK-SYSTEM-03B Rev 1 permission_ok 与领取

- 已完整重读项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.7、`CURRENT v4-437`、`SYSTEM-engine-control-plane.md`、`MODULE_INTEGRATION_CONTRACTS.md` 的 `INT-11/12/13`、职责矩阵“系统控制台引擎/API 与安全配置发布”行、`DESIGN.md` 5.12、`docs/ui/SYSTEM-engine-control-acceptance.md` §12 与开发日志顶部；确认 Wave A 已关闭，本轮只实现 Wave B。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；仓库 `qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接走工作区写入，不走 `auto_review`。
- `CURRENT` 递增至 `v4-438`；FIFO 172、`BACK-SYSTEM-03B Rev 1` 进入 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。
- 允许范围锁定为 `packages/contracts` 的 system-control/asr/screen-text 必要字段、必要增量迁移、`backend/src/modules/system-control/`、ASR/OCR 新任务创建路径、后端测试、CURRENT/日志；冻结生产前端/system-frontend/DESIGN、真实供应商/网络/SDK/Secret/付费、预算/速率/扩缩容/服务器、提交/推送/部署、Wave B 之外任务。

## 2026-08-16 — SYSTEM-03 Wave A 关闭与 FIFO 172 Wave B 解锁

- 规划核对 FIFO171 唯一 diff：`seedDelivery` 只用一次数据库 `CURRENT_TIMESTAMP` 显式统一 DeliveryProduct/Job/Attempt 测试夹具时间；生产聚合、contracts、迁移、引擎、Secret 与 Worker均未修改。
- 新鲜关闭门：overview 连续两次 5/5；engine 4/4；backend build、check:repo、git diff --check 通过；结合本规划同一轮已跑 ASR+ScreenText 25/25，Wave A 验证稳定。
- UI Rev2 与后端交叉映射通过：部署只拥有真实 EngineDeployment/不可变版本/连接测试；主备和空位归 Wave B 路由；Secret 数据源未实现时“替换”禁用；模型/语言仅 Registry 派生只读预览，正式前端不得提交或覆盖。
- `UI-SYSTEM-03 Rev2` 与 `BACK-SYSTEM-03A` 标记 done。Wave B 范围严格限定三池主备、`maxConcurrentJobs/perProjectMax/queueLimit`、影响检查、发布/未知/回滚、active 指针、只追加审计和 ASR/OCR 新任务精确版本固定；预算、真实供应商/网络/Secret、服务器扩缩容、策略学习与前端均不进入。
- `CURRENT` 递增至 v4-437；建立 FIFO172 / BACK-SYSTEM-03B Rev1 ready，FRONT/TEST 继续 blocked。

## 2026-08-16 — FIFO 171 BACK-SYSTEM-03A Rev 4 完成并交规划审核

- `seedDelivery` 先用一次 `SELECT CURRENT_TIMESTAMP` 取得明确数据库时间事实，再显式写入 `delivery_products.created_at/updated_at`、`delivery_jobs.created_at/updated_at` 与 `delivery_attempts.created_at/completed_at`；未加入 sleep、fallback、retry，也未改生产聚合、contracts、迁移、引擎/Secret/Worker。
- 首次复现命令在当前运行中偶发未重现（overview 5/5）；修正后按 `CI=true` 连续运行 overview 两次均 5/5，随后 engine 4/4。ASR+ScreenText 25/25 沿用规划本轮既有新鲜证据，因本次只改测试夹具未重复运行。
- `pnpm --filter @qimao-terms-cloud/backend run build` 通过；`check:repo` 首次因非交互 pnpm modules 清理保护拦截，改用 `CI=true` 重跑通过；`git diff --check` 通过。未运行完整 `pnpm check`，Wave B 继续 blocked。
- `CURRENT` 递增至 `v4-436`；FIFO 171、`BACK-SYSTEM-03A Rev 4` 转 `review / Current actor=规划对话 / Reviewer=规划对话`，只交规划审核。

## 2026-08-16 — FIFO 169 UI-SYSTEM-03 Rev 2 规划送达确认

- 八项差量包已只发送至规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c`；`read_thread` 确认进入规划最新 `userMessage`，规划明确回执将按“页面动作—后端契约—数据所有者”做最终交叉映射，当前 turn 为 `inProgress`。
- `CURRENT` 递增至 v4-435；FIFO 169 关闭，`UI-SYSTEM-03 Rev 2` 保持 `review / Current actor=规划对话 / Reviewer=规划对话`。UI 停止等待，未通知或解锁 Wave B、前端或测试；FIFO 171 后端微返工继续按其独立状态执行。

## 2026-08-16 — FIFO 171 BACK-SYSTEM-03A Rev 4 permission_ok 与领取

- 已按派发要求重读 `CURRENT v4-432` 与开发日志顶部；领取时工作区快照已由并行 UI 写至 `v4-435`，本轮完成后递增为 `v4-436`；确认本轮是测试夹具快车道，不增加业务范围。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；仓库 `qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接走工作区写入，不走 `auto_review`。
- FIFO 171、`BACK-SYSTEM-03A Rev 4` 已进入 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。
- 唯一允许改动为 `tests/backend/system-control.test.ts` 的 `seedDelivery` 时间夹具，以及本状态与日志；生产 system-control 聚合、contracts、迁移、引擎/Secret/Worker、Wave B 均冻结。

## 2026-08-16 — FIFO 169 UI-SYSTEM-03 Rev 2 功能等价集中收口完成

- 保留 Rev 1 ControlShell 视觉、1440/1024、宽表内滚、发布/回滚焦点与发布未知恢复；同一仓库外原型只补部署/路由数据所有权、登记部署、不可变版本、Secret 四态、测试历史和路由草稿编辑，没有建立第二套视觉或运行时主题。
- `/engines` 现在只列真实 EngineDeployment，`enabled/disabled` 投影为“可用于草稿/已停用”；主备与无部署槽位归 `/routing`。当前使用位置只读来自当前生效路由，无事实显示“尚未分配”；删除无合同“导出脱敏清单”，三张主页面无未绑定事件的可用主按钮。
- 登记部署/新版本/路由草稿均使用隐藏稳定身份，覆盖提交中锁定、确定失败、网络未知同身份查询、冲突刷新与成功焦点；新版本明确 Secret 不需要/继承/替换已有别名/清除四态，当前 Secret 数据源未启用时禁用替换并提供前往密钥与安全。测试历史支持服务端筛选/分页语义，failed 只创建新 testRunId，queued/running 防重复，unknown 只查同一 testRunId。
- 真实浏览器变化场景复验通过：登记表单真实焦点序列“安全返回→登记部署→安全返回→Escape 回登记部署”；版本/路由冲突焦点分别落唯一刷新动作；无部署行数 0；1024 根宽 `1024=1024`、抽屉 430px、1080px 部署表仅在 922px `.table-wrap` 内滚；1440 根 `clientWidth=scrollWidth=1430`，控制台日志 `[]`。
- 验证：`node --check app.js`、`node --check serve.mjs`、授权文档 `git diff --check` 均为 0；变化场景 `P0/P1/P2/P3=0`。按派发要求未重复 Impeccable detector，Rev 1 十张证据冻结；生产 frontend/system-frontend/backend、迁移和 contracts 修改 0。
- `DESIGN.md` 5.12 与 `docs/ui/SYSTEM-engine-control-acceptance.md` §12 已写入正式交接；新增六张变化证据位于仓库外 `evidence/ui-system-03-rev2/`。`CURRENT` 递增至 v4-433；FIFO 169=`notification_pending`，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，只待规划送达确认，Wave B/前端/测试保持 blocked。

## 2026-08-16 — FIFO 170 规划复验与 FIFO 171 测试夹具微返工

- 代码审核确认 Secret resolver 默认拒绝未经服务端解析的外部引用，已知测试 resolver 返回的规范化内部 ID 才会写入保护列；未知/不可用引用 422 且零副作用，响应/命令/审计均不含内部引用。版本历史已改 `limit/offset/total`、`version DESC,id ASC` 稳定分页和空页真实 total。
- 新鲜验证：engine 4/4、ASR+ScreenText 25/25、contracts/backend build、check:repo、diff-check 通过。旧 overview 专项本轮出现 4/5：delivery_generation 预期 completed=1、实际0；此前同一用例也曾独立 5/5，确认其证据不稳定。
- 根因位于测试夹具而非新引擎代码：delivery ready 夹具只显式写 Attempt.completed_at，DeliveryProduct.updated_at 依赖默认时间；生产 CTE 先按 product.updated_at/attempt.completed_at 进入24h窗口，在共享数据库时间状态下可能排除刚插入的产品。FIFO171 只统一夹具产品与 Attempt 的明确窗口内数据库时间，并连续复跑 overview，不改生产聚合或 Wave A 业务语义。
- 第二次普通 `pnpm exec` 被非交互 modules 清理保护拦截，未记录为业务失败；后继必须使用既有 `CI=true` 环境复验。
- `CURRENT` 递增至 v4-432；建立 FIFO171 / BACK-SYSTEM-03A Rev4 ready。UI FIFO169继续并行，Wave B/前端/测试保持 blocked。

## 2026-08-16 — FIFO 170 BACK-SYSTEM-03A Rev 3 完成并交规划审核

- 在 Wave A 允许目录内补上单一服务端 `SystemControlSecretReferenceResolver` 边界：默认 resolver 拒绝任意浏览器引用；create/replace 只有 resolver 成功返回规范化内部 reference ID 后才进入事务，未知或 resolver 异常稳定返回 422 且不写 deployment/version/command/audit；对外响应、审计、命令快照和错误只保留安全摘要，不回显内部 ID。
- 保留 inherit/clear；保护列仍只保存服务端规范化引用，未新增明文 Secret 表、真实 Secret、网络或管理页面。版本历史新增有界 `limit/offset/total`，按 `version DESC, id ASC` 稳定排序，空页返回真实 total；补充稳定版本读取回归。
- 分组验证如实记录：`system-control-engine.test.ts` 4/4；`system-control.test.ts` 5/5；ASR + ScreenText 2 文件 25/25。contracts/backend build、`check:repo`、`git diff --check` 通过；隔离空 PostgreSQL 从零执行全部 27 个迁移通过。未运行完整 `pnpm check`，未启动 Wave B，未通知 UI/前端/测试。
- `CURRENT` 递增至 `v4-431`；FIFO 170、`BACK-SYSTEM-03A Rev 3` 转 `review / Current actor=规划对话`，只交规划审核。

## 2026-08-16 — FIFO 170 BACK-SYSTEM-03A Rev 3 permission_ok 与领取

- 已完整重读项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.7、`CURRENT v4-429`、`SYSTEM-engine-control-plane.md`、`INT-11`、职责矩阵“系统控制台引擎/API 与安全配置发布”行及开发日志顶部；确认本轮只做 Wave A 定向返工，不启动 Wave B。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；仓库 `qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接走工作区写入，不走 `auto_review`。
- `CURRENT` 已递增至 `v4-430`；FIFO 170、`BACK-SYSTEM-03A Rev 3` 进入 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。
- 允许范围锁定为 `packages/contracts/src/system-control.ts`、必要未发布迁移、`backend/src/modules/system-control/`、必要 app/server/types、引擎专项测试、CURRENT/日志；冻结既有 Wave A 通过事实、UI/前端/DESIGN、Wave B、真实网络/SDK/Secret/付费和完整 `pnpm check`。

## 2026-08-16 — FIFO 168 规划独立审核与 FIFO 170 定向退审

- 规划逐项核对 Wave A 共享契约、未发布迁移、部署/版本/连接测试服务与仓储、租约 Worker、路由和专项测试；稳定预生成 ID、严格 schema、enabled/disabled、连接测试只读恢复、过期 running→unknown 且不重跑、Attempt 原子终结等主体实现可冻结。
- 新鲜复验：`system-control-engine` 单独 4/4；`system-control` 单独 5/5；ASR + ScreenText 25/25；contracts/backend build、`check:repo`、`git diff --check` 通过。四文件同批运行出现 33/34：旧运行总览费用用例期望 CNY `0.300000`、实际 `0.100000`；随后单文件复跑通过，证据表明既有测试文件共享默认数据库并互相清理，而非本轮引擎业务回归。本轮要求诚实分组证据，不扩大为测试框架重写。
- 发现 P1：HTTP body 仍允许浏览器提交任意 `secretReference.referenceId`，而仓库内没有可读取/校验的 Secret 引用权威目录；当前仅把任意字符串保存进保护列，不能证明“引用服务端既有 Secret”。Rev 3 必须通过服务端可注入 resolver 验证并返回规范化内部引用；默认 resolver 不得信任任意输入，未知/不可用引用稳定 422 且零副作用，外部响应/审计/错误不得泄露内部引用或 Secret。
- 发现 P2：部署版本列表当前无分页并读取全部历史。Rev 3 需补稳定 `limit/offset/total` 与确定性排序，避免长期管理端形成无界读取；不增加 Secret 管理页面、真实 Secret、网络或 Wave B 状态。
- `CURRENT` 递增至 v4-429；建立 FIFO 170 / `BACK-SYSTEM-03A Rev 3` ready。UI FIFO 169 继续并行，正式前端、测试与 Wave B 保持 blocked。

## 2026-08-16 — FIFO 168 BACK-SYSTEM-03A Rev 2 完成并交规划审核

- 在 Wave A 允许目录内完成一次集中根因修正：部署与初始版本均使用客户端预生成稳定 ID；新增版本请求哈希包含路径 `deploymentId`；连接测试只接受 `deploymentVersionId`，去除 `versionId` 别名；部署 schema 严格拒绝 provider/model/language/capabilities 伪造输入，Registry 继续是能力快照唯一来源。
- 版本 Secret 改为服务端保护列保存 reference ID，外部只返回 `has/present + digest + 脱敏标签`；版本动作显式支持 `inherit / replace / clear`，并补充稳定版本只读恢复、enabled/disabled 状态和受部署/版本/状态约束的测试历史列表/分页。
- 连接测试 Worker 只领取 `queued`；过期 `running` 由有界事务 sweep 与当前 Attempt 一起终结为 `unknown`，不新建 Attempt、不重跑 probe；成功/失败/unknown 终结按 lease owner 与 running 条件在同一事务内完成；保留并实际执行白名单零网络 probe，失败回归使用显式注入 probe。
- 验证：system-control、system-control-engine、ASR、ScreenText 专项共 4 个文件 34/34 通过；contracts/backend build、`check:repo`、`git diff --check` 通过；隔离空 PostgreSQL 从零执行全部 27 个迁移通过。未运行完整 `pnpm check`，未接 Wave B、真实网络/SDK/Secret/付费或前端。
- `CURRENT` 递增至 `v4-428`；FIFO 168、`BACK-SYSTEM-03A Rev 2` 转 `review / Current actor=规划对话`，仅交规划审核，不通知前端/UI/测试，不解锁 Wave B。

## 2026-08-16 — FIFO 169 UI-SYSTEM-03 Rev 2 permission_ok 与领取

- 已重读项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.7、`CURRENT v4-426`、验收文档 §11、SYSTEM-03 里程碑、`INT-11`、`DESIGN.md` 5.12 与既有同壳原型；确认本轮只补功能等价交互和数据所有权，不依据派发消息替代权威文件。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；仓库 `qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接走工作区写入，不走 `auto_review`。
- `CURRENT` 递增至 `v4-427`；FIFO 169=`active`；`UI-SYSTEM-03 Rev 2`=`in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`。
- 允许范围仅为 `DESIGN.md` 5.12、`docs/ui/SYSTEM-engine-control-acceptance.md`、既有仓库外 ControlShell 原型/变化证据、CURRENT/日志；生产 `frontend/system-frontend/backend`、contracts、迁移保持 0 修改。Rev 1 的视觉、双视口、宽表内滚、发布/回滚焦点、发布 unknown 与十张证据冻结；不重复 Impeccable detector、不启动 Wave B。

## 2026-08-16 — FIFO 166 规划交叉审查与 FIFO 169 UI 集中退审

- 规划独立核对 `/engines / routing / changes` 三张主页面、1024 版本抽屉、原型 DOM/事件、SYSTEM-03 里程碑与 INT-11；视觉、ControlShell 同壳、1440/1024、表格内滚、发布/回滚键盘链和发布 unknown 只读恢复可冻结。
- 发现四项 P1：部署表把 Wave B 主备/空位当 EngineDeployment 自身事实并生成伪“无部署”记录；登记部署/不可变版本/Secret 引用没有真实表单和版本历史；路由页只有结果表没有精确版本主备/容量草稿编辑保存；连接测试只有一条最近记录且 failed“重新运行”没有明确创建新 testRunId。另有一项 P2：“导出脱敏清单”无合同/API 来源且按钮无行为。
- 规划侧 Impeccable detector 只执行一次，因解析依赖缺失降级，复现唯一 4px “尚未接入”风险带 warning；该功能性风险带维持人工接受，不要求重做视觉。
- 形成 `docs/ui/SYSTEM-engine-control-acceptance.md` §11 持久化退审包；建立 `UI-SYSTEM-03 Rev 2 / FIFO 169`，仅补功能等价交互和数据所有权，不重跑或推翻既有视觉/响应式/高风险焦点证据。
- `CURRENT` 递增至 `v4-426`；BACK Rev 2 继续并行，Wave B、正式前端与测试保持 blocked。

## 2026-08-16 — FIFO 166 UI-SYSTEM-03 Rev 1 规划送达确认

- 完成包已只发送至规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c`；`read_thread` 确认消息进入规划最新 `userMessage`，规划回复“UI-SYSTEM-03 已进入规划审核”，该 turn 为 `inProgress`。
- `CURRENT` 递增至 `v4-425`，FIFO 166 关闭；`UI-SYSTEM-03 Rev 1` 保持 `review / Current actor=规划对话 / Reviewer=规划对话`。UI 停止等待，未通知或解锁后端 Wave B、前端或测试。

## 2026-08-16 — FIFO 166 UI-SYSTEM-03 Rev 1 完成并待规划送达确认

- 在既有仓库外 `ui-system-01-control-shell` 同一 ControlShell 内完成 `/engines`、`/routing`、`/changes` 可操作设计；没有建立第二套外壳、B/C 视觉方向或运行时主题。引擎页覆盖服务端列表/筛选/只读版本详情、能力快照、Secret 脱敏引用和零网络连接测试；路由页覆盖 `asr / screen_text` 三池主备、三项容量与当前生效/草稿；变更页覆盖草稿→测试→影响检查→批准→当前生效/已退役、阻断、发布失败/未知同一发布恢复、成功、回滚和审计。
- 真实供应商、SDK、网络、样本、密钥与付费未授权，原型统一显示“尚未接入”；Secret 无明文输入/回显，连接测试与生产发布在视觉和语义上分离，顶层不展示 `configDigest / adapterKey / active / Attempt` 等实现名，稳定 `requestId` 仅保留在诊断区。
- 新增 `DESIGN.md` 5.12 与 `docs/ui/SYSTEM-engine-control-acceptance.md`；仓库外证据目录 `evidence/ui-system-03-rev1/` 保存十张 1440/1024/关键状态截图。实测 1024 根宽 `1024=1024`、侧栏 `72px`、主区 `x=72 / width=952`，覆盖展开后主区不变；引擎/路由宽表 `1080px` 仅在 `922px` 容器内滚动。
- 高风险发布/回滚对话框已用真实键盘复核安全初始焦点、`Tab / Shift+Tab` 双向闭环、`Escape` 回触发点；提交中双按钮锁定且焦点保留在 `aria-busy` 对话框；失败、未知、阻断和成功各只有对应恢复焦点。页面控制台 `error/warn=0/0`。
- Impeccable setup 与 detector 均只运行一次。detector 因缺少 `htmlparser2 / css-select / css-tree / domutils` 降级，唯一命中为全系统唯一“尚未接入”风险带的 `4px side-tab warning`，经人工审查保留；Finish Reviewer 在 ASR 备用空位、影响阻断语义、提交中焦点和对比度修正后给出 `disposition=ship`，最终 `P0/P1/P2/P3=0`。
- 生产 `system-frontend / frontend / backend`、迁移、contracts 修改 0；未运行完整 `pnpm check`，未接真实资源，未提交、推送或部署。隔离预览服务、浏览器标签与临时视口已清理，端口 `41761` 无监听。`CURRENT` 递增至 `v4-424`，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO 166 等待固定规划任务送达确认。

## 2026-08-16 — FIFO 168 BACK-SYSTEM-03A Rev 2 permission_ok 与领取

- 已完整重读项目 `AGENTS.md`、`docs/WORKFLOW.md` v4.7、`CURRENT v4-422`、`SYSTEM-engine-control-plane.md`、`INT-11`、职责矩阵“系统控制台引擎/API 与安全配置发布”行及开发日志顶部；确认本轮只修 Wave A，不启动 Wave B。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；仓库 `qimao-terms-cloud` 位于 `workspace-write` / `:workspace` 可写范围；普通仓库编辑直接走工作区写入，不走 `auto_review`。
- `CURRENT` 已递增至 `v4-423`；FIFO 168、`BACK-SYSTEM-03A Rev 2` 进入 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。
- 允许范围锁定为 `packages/contracts/src/system-control.ts`、`backend/migrations/` 必要未发布增量、`backend/src/modules/system-control/`、连接测试 Worker/entry、`tests/backend/system-control*.test.ts`、CURRENT/日志；继续禁止 active 路由、发布回滚、员工任务接管、真实网络/SDK/Secret/付费、前端/DESIGN、兼容/fallback/双状态源。

## 2026-08-16 — FIFO 167 规划独立复核与 FIFO 168 集中退审

- 规划已重读 SYSTEM-03 里程碑、INT-11、共享契约、迁移、引擎服务/仓储/Worker/Registry 与专项测试；Rev 1 的白名单零网络探针与幂等哈希先行校验可保留，但不足以关闭 Wave A。
- 稳定身份仍有缺口：部署 ID 可省略、版本无客户端预生成 ID，网络未知时无法只读同一资源；版本幂等摘要未纳入路径 deploymentId；连接测试同时接受 deploymentVersionId/versionId 双字段；create deployment 还接受并忽略 provider/model/language/capabilities 伪造字段。
- Secret 仅保存摘要会使未来 Worker 无法解析服务端引用；返工必须只在保护列保存引用 ID，API/审计/日志不回显，并明确 inherit/replace/clear 语义，不能以字段省略静默清空。
- deployment 的 active/disabled 与 Wave B 路由 active 指针语义冲突，Wave A 改为 enabled/disabled；active 只保留给已发布路由版本。
- 过期 running 连接测试当前会新建 Attempt 并重新执行，违反“未知结果只 GET 同一 testRunId、不得自动重发”；须只把过期租约原子终结为 unknown，run/attempt 同事务写回且受 lease owner 约束。
- 当前只能按已知 testRunId 查询，刷新后无法从 PostgreSQL 发现最近测试；须增加按部署/版本的有界稳定列表或 latest 投影。上述问题集中进入 `BACK-SYSTEM-03A Rev 2 / FIFO 168`，禁止用兼容别名、fallback 或第二状态源修补，禁止提前进入 Wave B。
- `CURRENT` 递增至 `v4-422`；UI-SYSTEM-03 继续并行，正式前端和测试保持 blocked。

## 2026-08-16 — FIFO 167 BACK-SYSTEM-03A Rev 1 Wave A 完成并交规划复核

- 已完成共享 `system-control` 引擎控制契约、增量迁移 `1754976012000_create_system_engine_control_plane` 与 PostgreSQL 权威表：稳定部署、不可变版本、幂等命令、连接测试 Run/Attempt 和只追加审计；版本更新/删除由数据库触发器拒绝，Attempt 保留可持久化生命周期状态。
- 已接入现有 ASR/ScreenText Registry 的只读登记描述；部署创建始终由 Registry 派生 provider/model/language/capabilities/configDigest，忽略浏览器伪造 capabilities/provider/model，受控 endpoint/region 校验，Secret 只保存 SHA-256 脱敏摘要，响应不回显引用原文/连接串/私参。
- 已新增逐请求 `system-control:engines:read/write/test` 权限边界与正式列表/详情/版本、幂等创建部署+v1/新版本、预生成 `testRunId` 连接测试读写 API；匿名、employee audience 和缺少显式 capability 均拒绝，读取无写副作用。
- 已新增可停止、有界租约零网络连接测试 Worker/开发入口，覆盖 queued→running→succeeded/failed/unknown、过期租约接管、同 ID GET 恢复；不接真实网络、SDK、密钥、任意 URL/Header/脚本或付费调用，不实现 active 路由、发布回滚或员工任务接管。
- 新鲜验证：`tests/backend/system-control-engine.test.ts`、新增 `tests/backend/system-control-engine.test.ts` 共 7 项系统控制专项通过；ASR/ScreenText 直接依赖组合 25 项通过；contracts build、backend build、`check:repo`、`git diff --check` 通过；精确隔离空库从零迁移（全部 27 个 migration）通过。未运行完整 `pnpm check`，真实 Node/本地 DB 曾受 `uv_os_get_passwd ENOMEM` 影响但已使用直接 runner 完成迁移验证。
- `CURRENT` 递增至 `v4-421`；FIFO 167 转 `review / Current actor=规划对话`。本轮只向规划固定任务交接，不通知前端/UI/测试，不提交/推送/部署。

## 2026-08-16 — FIFO 166 UI-SYSTEM-03 Rev 1 permission_ok 与领取

- 已完整重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.7、`CURRENT v4-419`、`SYSTEM-engine-control-plane.md`、`SYSTEM_CONTROL_CENTER.md` §4/7、职责矩阵“系统控制台引擎/API 与安全配置发布”行、`INT-11/12/13`、`DESIGN.md` 5.11、既有 ControlShell 验收文档与仓库外同壳原型。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT` 递增至 v4-420；FIFO 166=`active`；`UI-SYSTEM-03 Rev 1`=`in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`。
- 本轮仅更新 `DESIGN.md`、新增 `docs/ui/SYSTEM-engine-control-acceptance.md`、复用仓库外 `ui-system-01-control-shell` 原型并产生最小双视口/状态证据；生产 `system-frontend/frontend/backend`、迁移和 contracts 保持 0 修改，不接真实供应商/网络/Secret/付费/云资源，不解锁 Wave B。

## 2026-08-16 — PLAN-SYSTEM-03 用户确认并冻结 Wave A/Wave B

- 用户确认采用一个 SYSTEM-03 里程碑、两波交付：Wave A 为引擎部署/不可变版本/零网络连接测试；Wave B 为主备路由/分池容量/影响检查/发布回滚与新任务固定版本。
- 新增 `docs/milestones/SYSTEM-engine-control-plane.md`，明确稳定部署身份、不可变版本、Secret 引用不回显、连接测试与生产发布分离、active 单指针、未知保持旧版本、development bootstrap v1 与新任务旧默认路径端到端清理。
- 职责矩阵新增“系统控制台引擎/API 与安全配置发布”，`INT-11` 更新为 SYSTEM-03 两波状态；真实供应商/网络/密钥/付费、预算、策略学习、服务器、Cloudflare 和部署继续处于单独授权门。
- `CURRENT` 递增至 v4-419；`PLAN-SYSTEM-03 Rev 1` done，建立 FIFO 166 `UI-SYSTEM-03 Rev 1` 与 FIFO 167 `BACK-SYSTEM-03A Rev 1` 受控并行。BACK Wave B、正式前端和独立测试保持 blocked。
- 下一步由规划分别唤醒 UI/后端并确认 permission_ok + in_progress；两项完成后必须先做页面/API/状态交叉映射，不能直接解锁前端。

## 2026-08-16 — FIFO 165 规划复核通过，SYSTEM-02 正式关闭

- 规划逐项核对 `docs/testing/SYSTEM-control-shell-integration-report.md`、两份仓库外脱敏 JSON 与端口清理事实；权限 403/200、四池、24 UTC 桶、异常上限/顺序、CNY `0.300000`、USD pending `final=null`、A/B 匿名隔离、失败恢复及 1440/1024 指标相互一致。
- 新鲜定向回归：`tests/backend/system-control.test.ts` + `tests/frontend/system-control.test.tsx` 共 2 文件 11/11；system-frontend 生产构建 20 modules；`check:repo` 与授权文档 `git diff --check` 通过。
- 首次无 `CI=true` 的 pnpm 运行被无 TTY 依赖目录清理保护中止，未进入测试且未改依赖；按仓库非交互规则设置 `CI=true` 后同一验证全绿，登记为执行器/包管理器保护而非产品失败。
- `TEST-SYSTEM-02 Rev 1`、FIFO 165 与 SYSTEM-02 正式 done/closed；P0/P1/P2/P3=0，无返工包。`CURRENT` 递增至 v4-418。
- 下一阶段建立 `PLAN-SYSTEM-03 Rev 1` 用户讨论门，只冻结引擎/API、主备路由、配置版本/回滚与高风险授权边界；确认前不派发生产实现。

## 2026-08-16 — FIFO 165 TEST-SYSTEM-02 Rev 1 独立集成验收完成并交规划

- 使用精确隔离 PostgreSQL `qimao_test_system_02_20260816`、正式 Fastify 与正式 `system-frontend` build 建立两个匿名项目及 ASR API、OCR API、OCR 自建 Worker、交付生成四类有界事实；原始/员工业务数据未触碰。
- 权限逐请求矩阵通过：匿名、employee audience、缺 `system-control:read` 均 `403`；system-control audience + read 为 `200`。四资源池、24 个 UTC 小时桶、旧终态窗口隔离、异常上限/稳定顺序、CNY `0.300000` 精确聚合、USD pending 不补零、`not_configured` 语义及 A/B 脱敏隔离均通过；员工站 ControlShell/管理员入口静态命中为 0。
- 1440/1024 基本页面集成通过：根无横溢，1440 三图，1024 单主图与三 tab 切换，展开侧栏覆盖不挤压。隔离库表故障注入产生真实 `500`/requestId/`retryable=true`，页面 stale + 唯一重读；恢复后同一 app `200` 且 stale 清除。FIFO 160/164 完整 UI、键盘、乱序、自动刷新与 57P01 证据冻结未重跑。
- 新鲜验证：system-frontend Vite production build 20 modules 退出码 0；既有 system-control 后端专项 5/5 通过；未运行完整 `pnpm check`。结论 `P0/P1/P2/P3=0`，无 QA-SYSTEM-02 包。
- 已写 `docs/testing/SYSTEM-control-shell-integration-report.md` 与仓库外脱敏 `system-test-results.json`/`page-integration-results.json`；CURRENT 递增至 `v4-417`，FIFO 165=`review`，`TEST-SYSTEM-02 Rev 1`=`review` / Current actor=规划对话。任务服务与端口已停止，隔离数据库计数 0，临时 harness/shim 已删除；共享 PostgreSQL 实例保持原状态。
- 仅向规划固定任务交接；不通知前端、后端或 UI，不改生产代码、迁移、contracts、DESIGN，不接真实 JWT/网络/密钥/付费/云资源，不提交/推送/部署。

## 2026-08-16 — FIFO 165 TEST-SYSTEM-02 Rev 1 permission_ok 与领取

- 已完整重读 `qimao-terms-cloud/AGENTS.md`、`docs/WORKFLOW.md` v4.7、`docs/status/CURRENT.md` v4-415、`docs/milestones/SYSTEM-control-shell-runtime.md`、`docs/ui/SYSTEM-control-shell-acceptance.md`、职责矩阵“系统控制台运行总览”行、`MODULE_INTEGRATION_CONTRACTS.md` 的 `INT-12/INT-13`、开发日志顶部，以及 system-control 共享契约、正式 Fastify/system-frontend 入口和既有专项。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；`docs/testing/`、`tests/integration/` 与仓库外脱敏证据路径可写；普通仓库范围操作不走 `auto_review`。本轮仅创建精确隔离 PostgreSQL、临时脚本/对象和匿名事实，不接共享默认库、员工数据、真实 JWT/网络/密钥/付费/云资源。
- `CURRENT` 已递增至 v4-416；FIFO 165=`active`；`TEST-SYSTEM-02 Rev 1`=`in_progress` / Current actor=全链测试与质量验收对话 / Reviewer=规划对话。FIFO 160/164 完整 UI、键盘、乱序、自动刷新与 57P01 证据冻结，不重复完整 `pnpm check`。
- 允许范围：`docs/testing/SYSTEM-control-shell-integration-report.md`、CURRENT/开发日志、任务允许的 `tests/integration/` 临时 harness 与仓库外脱敏证据；禁止修改生产 `frontend/system-frontend/backend`、迁移、`packages/contracts`、DESIGN 或其他角色文件。

## 2026-08-16 — SYSTEM-02 实现关闭门通过并解锁 FIFO 165

- 规划核对 `docs/ui/SYSTEM-control-shell-acceptance.md` §11、`fifo164-results.json` 与 1024 收起/展开、数据库失败恢复证据；A/B/C 三项均通过，`P0/P1/P2/P3=0`。
- 新鲜完整质量门：`CI=true pnpm check` 退出码 0；26 个测试文件、245 项测试全部通过，contracts、员工 frontend、system-frontend 与 backend 构建全部通过。员工前端仅保留既有大 chunk 非阻断提示。
- 首次受限执行在数据库迁移启动前因 Node `os.userInfo()` 触发 `uv_os_get_passwd ENOMEM`；同一命令在获准的正常宿主环境完整通过，确认属于 `executor_blocked`，不是产品或测试失败。
- `FRONT-SYSTEM-02B Rev 2` 与 `BACK-SYSTEM-02C Rev 1` 关闭；建立 FIFO 165 `TEST-SYSTEM-02 Rev 1`，只做独立两站/权限/聚合集成验收，不改生产代码、不重做完整 UI 矩阵、不重复完整 `pnpm check`。
- `CURRENT` 递增至 `v4-415`；下一步由规划主动唤醒测试固定任务并确认送达/运行态。

## 2026-08-16 — FIFO 164 三场景 UI 微复验全部通过并交规划

- 正式环境：新鲜 system-frontend Vite production build 20 modules、正式 Fastify system-control API、逐请求注入式验收主体与精确隔离 PostgreSQL `qimao_fifo164_ui_20260816`；生产前端未加测试 header 或假 owner。
- A 通过：1024×768 收起时 `sidebar=72 / shell-stage x=72 / width=937`，展开时 `sidebar=216` 且主区尺寸/偏移不变；Windows Chromium 根布局 `1009=1009`，15px 为真实纵向滚动条沟槽，正文不逐字换行。B 通过：1024 恰好一张主图，吞吐/积压/费用的 selected/pressed 与标题正确，关闭自动刷新后三次切换 overview GET 增量 0；1440 仍三图。
- C 通过：同一 PID 2804 先 200；真实终止 10 个 idle client 后观察到 10 个脱敏 `57P01` 事件，进程/路由仍存活；请求内 SQL 失败稳定投影 stale、真实 requestId 与唯一重读，恢复后同一 app 成功且 H1 获焦；页面 console error/warn=`0/0`。
- 结论 `P0=0 / P1=0 / P2=0 / P3=0`。新证据已写入 `docs/ui/SYSTEM-control-shell-acceptance.md` §11 与仓库外 `front-system-02b-rev2-ui-qa/` 的 `fifo164-results.json`、6 张最小截图；FIFO 160 其余矩阵与 Impeccable 证据冻结。
- 清理完成：视口 reset、浏览器标签关闭，`31610/31611` 无监听，隔离库精确 DROP 且计数 0，临时 harness/seed/preload 删除；共享默认库、其他任务服务和生产代码未改。未运行完整 `pnpm check`，未提交/推送/部署或接入真实 JWT/网络/密钥/付费。
- `CURRENT` 递增至 `v4-414`；FIFO 164 closed，`FRONT-SYSTEM-02B Rev 2` 转 `review / Current actor=规划对话 / Reviewer=UI 设计对话`。下一步只通知规划总线并确认送达。

## 2026-08-16 — FIFO 164 三场景 UI 微复验 permission_ok 与领取

- 已完整重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.7、`CURRENT v4-412`、开发日志顶部、`docs/ui/SYSTEM-control-shell-acceptance.md` §10、`system-frontend` 本轮布局/趋势差量、`backend/src/database/pool.ts` 与 system-control 前后端专项。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT` 递增至 `v4-413`；FIFO 164 转 `active`，`FRONT-SYSTEM-02B Rev 2` 进入本轮 UI 微复验 `in_progress / Current actor=UI 设计对话 / Reviewer=UI 设计对话`。
- 本轮只用正式 system-frontend build、Fastify 与精确隔离 PostgreSQL 复验 A/B/C；只允许写 ControlShell UI 验收 §11、CURRENT/日志和仓库外最小证据。FIFO 160 其余矩阵冻结；不改生产代码，不重复 Impeccable，不运行完整 `pnpm check`。

## 2026-08-16 — FRONT Rev 2 / BACK 02C 规划微审通过并派发 FIFO 164

- 规划审计确认前端只在 `system-frontend` 显式将 `.shell-stage` 放入第二网格列；1024 使用单一趋势主图与吞吐/积压/费用三个切换，数据继续直接来自同一次 overview，切换不发请求；1440 三图实现保留。
- 规划审计确认后端只在唯一 `createPool` 接管 idle client `error`，对外观察事件仅 `kind/code` 白名单；observer 异常被隔离，请求内数据库错误不被吞掉，既有 Fastify 处理器继续产生 500/`INTERNAL_ERROR`/requestId/retryable。
- 新鲜验证：前端 system-control 专项 6/6，后端 system-control 专项 5/5；system-frontend typecheck 与 20 modules Vite build、backend TypeScript build、仓库验证、授权差异 `git diff --check` 全部通过。
- 真实后端回归覆盖同一 app 先 200、idle client 实际 `57P01` 被接管、等待查询被终止后稳定 500/requestId、解除阻塞后同一路由再 200；没有 fallback、第二数据库、无限重试、健康假值或日志敏感信息。
- `CURRENT` 递增至 `v4-412`：FIFO 163 关闭，`BACK-SYSTEM-02C Rev 1` done；建立 FIFO 164，由 UI 只复验三个变化场景。FIFO 160 其余完整矩阵与 Impeccable 证据冻结，完整 `pnpm check` 留复验通过后的规划关闭门。

## 2026-08-16 — FIFO 163 交规划送达确认

- 已只向规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c` 发送 BACK-SYSTEM-02C Rev 1 完成包；`read_thread` 确认消息进入规划最新 `userMessage`，规划线程处于 `inProgress`。
- `CURRENT` 已递增至 `v4-411`；FIFO 163 关闭，BACK-SYSTEM-02C Rev 1 保持 `review / Current actor=规划对话`，后端停止修改；未通知前端、UI 或测试。

## 2026-08-16 — BACK-SYSTEM-02C Rev 1 FIFO 162 完成并交规划微审

- 在 `backend/src/database/pool.ts` 的唯一 `createPool` 生命周期接入 `pg.Pool` 后台 `error` listener；仅向日志/可注入 observer 输出固定 `kind` 与经过白名单过滤的错误码，不记录 connectionString、密码、SQL 或业务正文；observer 异常也不会重新形成未处理 EventEmitter error。未改变请求内异常传播、system-control 聚合或状态所有权。
- `tests/backend/system-control.test.ts` 使用真实本地 PostgreSQL 与真实 pool：同一 Fastify app 先返回 200；实际终止 idle client 产生 `57P01` 并由 observer 接管，进程/app 保持存活；锁住 `asr_jobs` 后终止等待查询，overview 返回 Fastify `500 / INTERNAL_ERROR / requestId / retryable=true`；解除锁并恢复连接后同一 app、同一路由再次 200。回归同时核对后台记录字段只有 `kind/code`。
- 新鲜验证：system-control 专项 `5/5`；ASR/画面字/交付直接依赖串行组合 `33/33`；backend build、`pnpm check:repo`、`git diff --check` 通过（后者仅既有 `LOCAL_APP_PARITY.md` CRLF→LF 提示）。首次普通 pnpm build 被非交互模块清理保护拦截，改用 `CI=true` 复用现有依赖成功，未改依赖；未运行完整 `pnpm check`。
- `CURRENT` 已递增至 `v4-410`；FIFO 162 转 `closed`，建立 FIFO 163 交规划审核；`BACK-SYSTEM-02C Rev 1` 转 `review / Current actor=规划对话`，只向规划固定任务发送完成包并确认送达；未通知前端/UI/测试，未改迁移、contracts、Worker、生产前端/DESIGN，未接真实 JWT/网络/密钥/付费，未提交/推送/部署。

## 2026-08-16 — FRONT-SYSTEM-02B Rev 2 FIFO 161 定向收口并交规划复核

- 根因收口：`system-frontend/src/responsive.css` 明确 `.shell-stage` 为 ControlShell 第二网格列并保持 `min-width: 0`；窄屏根网格固定为 `72px minmax(0, 1fr)`，216px 侧栏展开继续使用 fixed 覆盖，不挤压主区；同时取消窄屏对横溢的隐藏掩盖。
- 趋势收口：`TrendPanel` 在紧凑视口只挂载一张主图，默认吞吐；吞吐/积压/费用使用原始 `overview.trends` 三类服务端事实和原生按钮 `aria-selected`/`aria-pressed` 切换，不触发请求、不复制数据；桌面视口继续三图并列。
- DOM 回归新增 1024 主区第二列语义、单主图/三按钮切换且切换请求数不增加、1440 三图并列；未改 API、状态所有权、异步链、真实字段、员工 frontend 或后端。
- 定向验证：`tests/frontend/system-control.test.tsx` **6/6**；system-frontend typecheck 通过；Vite 生产构建 **20 modules** 通过；`git diff --check` 通过（仅既有 `LOCAL_APP_PARITY.md` CRLF→LF 提示）。未重复 Impeccable、未运行完整 `pnpm check`、未重做完整浏览器矩阵。
- `CURRENT` 已差量递增至 `v4-409`；FIFO 161 转 `closed`，`FRONT-SYSTEM-02B Rev 2` 转 `review / Current actor=规划对话`，只交规划微审；后端 FIFO 162 的并行状态保留。

## 2026-08-16 — BACK-SYSTEM-02C Rev 1 FIFO 162 权限握手并领取

- 已完整重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.7、`CURRENT v4-407`、开发日志顶部、`docs/ui/SYSTEM-control-shell-acceptance.md` §10、`docs/milestones/SYSTEM-control-shell-runtime.md`、`backend/src/database/pool.ts`、`app.ts`、system-control 路由与专项；确认只处理 `QA-FRONT-SYSTEM-02B-002`，不重开已冻结的 system-control 聚合/权限语义。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT` 已递增至 `v4-408`；FIFO 162 转 `active`，`BACK-SYSTEM-02C Rev 1` 进入 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。
- 允许范围仅 `backend/src/database/pool.ts`、必要 app/server 类型或生命周期接线、`tests/backend/system-control.test.ts`、CURRENT/日志；禁止迁移、contracts、system-control SQL/权限、Worker/其他业务、生产前端/DESIGN、真实 JWT/网络/密钥/付费、提交推送部署。

## 2026-08-16 — FRONT-SYSTEM-02B Rev 2 FIFO 161 permission_ok 与领取

- 已重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.7、`CURRENT v4-406`、开发日志顶部、`DESIGN.md` 5.11、`docs/ui/SYSTEM-control-shell-acceptance.md` §10、`SYSTEM-control-shell-runtime.md` 与现有 `system-frontend` 实现。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；当前 `qimao-terms-cloud` 位于 `workspace-write/:workspace` 且探针可写；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT` 已差量递增至 `v4-407`；FIFO 161 转 `active`，`FRONT-SYSTEM-02B Rev 2` 进入 `in_progress / Current actor=前端开发对话 / Reviewer=UI 设计对话`。
- 本轮只允许修复 `QA-FRONT-SYSTEM-02B-001/003`：1024 fixed 72px 侧栏下主区网格归属与 216px 覆盖展开、单主图与吞吐/积压/费用切换及 DOM 回归；1440、异步、真实字段、两站隔离和其余终验证据冻结。禁止后端、契约、DESIGN、员工 frontend、API/状态机改动，不重复 Impeccable，不运行完整 `pnpm check`，不提交/推送/部署。

## 2026-08-16 — FIFO 160 规划归因与 FRONT Rev 2 / BACK 02C 双微返工

- 规划复核 `docs/ui/SYSTEM-control-shell-acceptance.md` §10、两张 1024 失败截图与正式代码。`@media (max-width:1180px)` 把侧栏改为 fixed 后，`.shell-stage` 未显式放入第二网格列，真实 1024 收起/覆盖展开均只有 72px；问题属于前端布局根因，不重开 1440 或业务状态证据。
- `TrendPanel` 在窄屏只把三个 `chart-panel` 纵排，未实现冻结的“单主图 + 吞吐/积压/费用三指标切换”；归入同一 `FRONT-SYSTEM-02B Rev 2`，只改 `system-frontend` 样式/趋势展示和对应前端测试。
- `backend/src/database/pool.ts` 当前直接返回无后台 error listener 的 `pg.Pool`。idle client 遇 PostgreSQL `57P01` 时触发未处理 EventEmitter error 并终止 Fastify；规划确认 Fastify 请求错误处理器本身已能为普通查询失败返回稳定 500/requestId，因此后端返工只接管连接池后台错误并证明同一 app 存活、失败可分类、连接恢复后再次成功，不增加 fallback、第二连接池或自动无限重试。
- 两项目录和状态所有权不重叠，按受控并行派发 FIFO 161/162；UI Rev 1 其余 1440、异步、真实字段、两站隔离、console 0/0 证据全部冻结。完成后 UI 只复验三个变化场景，完整 `pnpm check` 仍留规划关闭门。
- `CURRENT` 递增至 `v4-406`；测试继续 blocked，不提前进入 INT-11、真实 JWT、网络、密钥、付费、部署或写命令。

## 2026-08-16 — FRONT-SYSTEM-02B Rev 1 FIFO 160 正式 UI 终验完成并交规划

- 使用新鲜 `system-frontend` Vite production build（20 modules）、正式 Fastify system-control API、逐请求注入式控制台主体与精确隔离 PostgreSQL `qimao_fifo160_ui_20260816` 完成该切片唯一一次完整浏览器矩阵；正式前端没有测试 header、bypass、假 owner 或原型常量。
- 通过项：首次 loading；首次/再次稳定失败的真实 requestId 与唯一重读；真实四池、24h 趋势、异常、待发布空、审计空；unknown/not_configured/empty/费用待对账；恢复标题焦点；成功事实后的 stale/requestId/恢复；自动刷新关闭 31.2 秒零请求、重新开启与立即刷新；8000ms 旧响应不覆盖更新后的 PostgreSQL 事实；1440 展开 216/收起 72 且根无横溢；九入口仅总览 `aria-current=page`、八入口 disabled；员工 AppShell 无 ControlShell；两页控制台 `error/warn=0/0`。
- `QA-FRONT-SYSTEM-02B-001`（P1 / 前端）：1024 下 `.shell-stage` 被压入 72px 首列，收起为 `sidebar=72 / stage=72`，覆盖展开为 `sidebar=216 / stage=72`，正文逐字换行不可用。`QA-FRONT-SYSTEM-02B-003`（P2 / 前端）：1024 同时纵向渲染三张趋势图，未采用冻结的单主图 + 三指标切换。
- `QA-FRONT-SYSTEM-02B-002`（P1 / 后端）：精确隔离库连接被 force disconnect 时，`pg.Pool` 空闲连接 `error`（PostgreSQL `57P01`）未被接管，Fastify 进程退出，前端只能得到无 requestId 的网络失败；改用可恢复 SQL 查询错误后，Fastify 500/requestId/stale/唯一重读/恢复链全部通过，缺口定位为数据库断连进程韧性。
- 浏览器键盘注入通道本轮无法移动 activeElement 或激活原生按钮，Tab/Shift+Tab/Enter/Space 动态项记为证据限制，不冒充通过；恢复标题焦点、原生 button/switch、disabled、`aria-current/aria-checked` 已取得真实 DOM。未重复 Impeccable，未运行完整 `pnpm check`。
- 证据已写入 `docs/ui/SYSTEM-control-shell-acceptance.md` §10 与仓库外 `front-system-02b-ui-qa/fifo160-results.json`、9 张最小截图。清理完成：浏览器标签关闭、视口重置；端口 `31600/31601/31602` 无监听；隔离库精确 DROP 且同名计数 0；临时 harness/seed/preload 删除；共享默认库、其他任务服务和生产代码未改。
- `CURRENT` 递增至 `v4-405`；FIFO 160 关闭，`FRONT-SYSTEM-02B Rev 1` 转 `review / Current actor=规划对话 / Reviewer=UI 设计对话`。UI 只通知规划，不直接通知前端、后端或测试。

## 2026-08-16 — FRONT-SYSTEM-02B Rev 1 FIFO 160 permission_ok 与正式 UI 终验领取

- 已完整重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.7、`CURRENT v4-403`、开发日志顶部、`DESIGN.md` 5.11、`docs/ui/SYSTEM-control-shell-acceptance.md`、`docs/milestones/SYSTEM-control-shell-runtime.md`、`system-frontend/`、`packages/contracts/src/system-control.ts` 与 `backend/src/modules/system-control/`。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT` 递增至 `v4-404`；FIFO 160 转 `active`，`FRONT-SYSTEM-02B Rev 1` 进入 `in_progress / Current actor=UI 设计对话 / Reviewer=UI 设计对话`。
- 本轮只执行正式 `system-frontend` React build + Fastify system-control API + 精确隔离 PostgreSQL 的单次完整浏览器矩阵；仅允许更新 UI 验收、CURRENT/日志及仓库外最小证据，不修改生产 frontend/backend、迁移、共享契约或 DESIGN，不重复 Impeccable，不运行完整 `pnpm check`。

## 2026-08-16 — FRONT-SYSTEM-02B Rev 1 规划审核通过并派发 FIFO 160 UI 终验

- 规划独立核对 `system-frontend/` 为单独 Vite/React 工作区包，未注册或修改员工 `frontend/src/App.tsx`、`modules.ts`、`AppShell`；正式读取仅为同源 `GET /api/system-control/overview?environment=development&window=24h`，请求不携带测试 owner header。
- 页面九个一级入口仅系统总览可用，其余八项明确禁用并显示“未启用”；无权威字段时使用 `unknown`、`not_configured`、暂无事实或未纳管，不复制原型匿名数字、邮箱、预算、配置版本、主机指标、对象容量或 requestId。
- 新鲜验证：`tests/frontend/system-control.test.tsx` 1 文件 4/4；`tsc -p system-frontend/tsconfig.json --noEmit` 通过；system-frontend Vite 生产构建 20 modules 通过；`node tools/verify-repository.mjs` 与授权范围 `git diff --check` 通过。首次 `pnpm exec` 被非交互 node_modules purge 保护拦截，未进入测试、未改依赖；随后直接使用现有本地可执行文件完成同一验证，登记为验证运行器限制而非业务失败。
- 代码审计确认请求乱序以递增令牌丢弃旧响应；首次失败保留真实 requestId 和唯一重读；已有成功摘要时刷新失败保留 stale；自动刷新关闭不再轮询。正式浏览器证据仍缺失，按单切片一次完整矩阵规则交 UI 终验。
- `CURRENT` 递增至 `v4-403`，FIFO 160 置为 ready，`FRONT-SYSTEM-02B Rev 1` 保持 review 并转 Current actor=UI 设计对话；完整 `pnpm check` 留 UI 通过后的关闭门。

## 2026-08-16 — FRONT-SYSTEM-02B Rev 1 FIFO 159 完成并交规划复核

- 独立新增 `system-frontend/` Vite/React 工作区包，入口支持总览路由（`/`、`/overview`、`/system-control/overview`），本地端口 `3010`；未接入员工 `frontend/src/App.tsx/modules.ts/AppShell`。
- `ControlShell` 按 UI-SYSTEM-01 Rev 2 实现冷灰白画布、深石墨蓝侧栏、`#4458D8` 主动作、四资源池运行带、指标、趋势、异常、待发布配置、最近审计和 1440/1024 响应式侧栏；九个一级导航保留，总览激活，其余八项标记未启用且不可进入。
- 生产读取只调用同源 `GET /api/system-control/overview?environment=development&window=24h`，不发送测试 owner header，不复制原型匿名数字、requestId、邮箱、配置版本、预算、主机指标或对象容量；字段无权威事实时诚实呈现 `unknown`、`not_configured`、未纳管或访问层已验证。
- 覆盖首次 loading、empty、稳定 error（真实 `requestId`、唯一重读）、重读中、再次失败、恢复成功标题焦点、unknown、费用待对账、自动刷新关闭及保留最后成功摘要的 stale；自动刷新仅重复 GET，无管理命令、暂停、发布、回滚或前端健康推算。
- 定向验证：`tests/frontend/system-control.test.tsx` **4/4**；system-frontend typecheck 通过；Vite 生产构建 **20 modules** 通过；`pnpm run check:repo` 通过；`git diff --check` 通过（仅既有 `LOCAL_APP_PARITY.md` CRLF→LF 提示）；Impeccable detector **`[]`**（本切片按要求只运行一次）。
- 与 UI 原型的有意差异仅来自权威接口事实：趋势为 API 提供的聚合序列而非原型匿名曲线；待发布配置/审计/遥测/容量无后端字段时显示未配置或未知；其余八个详情导航只显示未启用，不创建假详情；不展示原型示例身份、数字或测试放行信息。
- 正式 React + Fastify/PostgreSQL 浏览器截图矩阵本轮未采集：本地证据 harness 启动 `tsx`/Node 时执行器报 `uv_os_get_passwd returned ENOMEM`，无法建立浏览器服务；未将该限制冒充为通过，交规划后由终验环境补采。未改 backend、迁移、packages/contracts、DESIGN 或员工前端；未提交、推送、部署。
- `CURRENT` 已差量递增至 `v4-402`；FIFO 159 转 `closed`，`FRONT-SYSTEM-02B Rev 1` 转 `review / Current actor=规划对话`，本轮只交规划复核。

## 2026-08-16 — FRONT-SYSTEM-02B Rev 1 FIFO 159 permission_ok 与领取

- 已重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.7、`CURRENT v4-400`、`SYSTEM-control-shell-runtime.md`、`DESIGN.md` 5.11、`docs/ui/SYSTEM-control-shell-acceptance.md`、`packages/contracts/src/system-control.ts`、职责矩阵“系统控制台运行总览”与 `INT-12/13`。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT` 已递增至 `v4-401`；FIFO 159 转 `active`，`FRONT-SYSTEM-02B Rev 1` 进入 `in_progress / Current actor=前端开发对话 / Reviewer=UI 设计对话`。
- 本轮仅实现独立 `system-frontend/` ControlShell 总览与对应测试/接入文件；只读消费 `GET /api/system-control/overview`，不改员工 `frontend/src/App.tsx/modules.ts/AppShell`、backend、迁移、packages/contracts、DESIGN，不接真实 JWT/网络/密钥/付费/部署。

## 2026-08-16 — BACK-SYSTEM-02A Rev 2 规划复验通过并解锁 FRONT-SYSTEM-02B

- 规划代码审计确认应用级 owner 主体已删除，Fastify 实例只持有默认拒绝的 `SystemControlPrincipalResolver`；同一 app 内匿名、employee、缺能力和 owner 请求交错回归，逐请求边界成立。真实 Cloudflare JWT 没有被伪造或提前接入。
- ASR、画面字和交付查询只在 PostgreSQL 侧保留 24 小时窗口、当前非终态任务与最多 50 条异常；旧终态失败不进入当前健康，Node 不再接收全历史 Job/Attempt/Usage，也没有第二 fallback。当前任务仍可跨窗口计入队列，满足实时运行总览语义。
- 费用由 PostgreSQL `numeric SUM` 定标为 6 位字符串，跨资源池使用 BigInt 十进制单位合并；`0.1 + 0.2`、多币种、pending/unknown 和窗口外旧失败回归成立，没有再用 JavaScript `Number` 累计金额。
- 规划新鲜验证：system-control 专项 `4/4`；ASR/画面字/交付直接依赖串行 `33/33`；contracts build、backend build、`pnpm check:repo`、`git diff --check` 均通过，只有既有 `LOCAL_APP_PARITY.md` 换行提示。完整 `pnpm check` 留正式前端与 UI 终验后的切片关闭门。
- `CURRENT` 递增至 `v4-400`：FIFO 158 与 `BACK-SYSTEM-02A Rev 2` 关闭；建立 FIFO 159，`FRONT-SYSTEM-02B Rev 1` 解锁。后端停止等待，测试仍 blocked。

## 2026-08-16 — FIFO 158 交规划送达确认

- 已只向规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c` 发送 BACK-SYSTEM-02A Rev 2 完成包；`read_thread` 确认消息进入规划最新 `userMessage`，规划线程处于 `inProgress`。
- `CURRENT` 已递增至 `v4-399`；FIFO 158 关闭，BACK-SYSTEM-02A Rev 2 保持 `review / Current actor=规划对话`，后端停止修改；未通知前端、UI 或测试。

## 2026-08-16 — BACK-SYSTEM-02A Rev 2 FIFO 157 完成并交规划复验

- 三项 P1 已在既有实现上一次收口：`GET /api/system-control/overview` 改为每个请求调用可注入 `systemControlPrincipalResolver(request)`，默认解析结果为拒绝；专项改为同一 Fastify app 交错验证匿名、employee audience、缺 capability 与 owner read 的隔离。
- ASR、画面字和交付读取改为 PostgreSQL 侧按当前 24 小时窗口、当前非终态与 `LIMIT 50` 异常集合聚合；不再在 Node 读取全历史或保留第二条 fallback 路径，窗口外旧终态失败不再污染当前健康。费用使用 PostgreSQL `numeric SUM`/字符串结果，Node 仅以定标十进制字符串与 `BigInt` 合并；`0.1 + 0.2` 返回 `0.300000`，分币种与 pending/unknown 语义保留。
- 关键文件：`backend/src/modules/system-control/system-control.auth.ts`、`system-control.routes.ts`、`system-control.repository.ts`、`backend/src/app.ts`、`backend/src/server.ts`、`backend/src/types/fastify.d.ts`、`tests/backend/system-control.test.ts`；未改迁移、Worker/业务写状态机、生产前端或 DESIGN。
- 新鲜验证：system-control 专项 `4/4`；直接依赖串行组合 ASR/画面字/交付 `33/33`；contracts build、backend build、`pnpm check:repo` 与 `git diff --check` 通过（仅既有 `LOCAL_APP_PARITY.md` CRLF 警告）。未运行完整 `pnpm check`，未接真实 JWT/网络/密钥/付费，未提交/推送/部署。
- `CURRENT` 已递增至 `v4-398`；FIFO 157 转 `closed`，建立 FIFO 158 交规划审核；`BACK-SYSTEM-02A Rev 2` 转 `review / Current actor=规划对话`，只向规划固定任务发送完成包并确认送达；前端、UI、测试保持 blocked/停止等待。

## 2026-08-16 — BACK-SYSTEM-02A Rev 2 FIFO 157 权限握手并领取

- 已完整重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.7、`CURRENT v4-396`、`docs/milestones/SYSTEM-control-shell-runtime.md` 与开发日志顶部；确认本轮只处理规划集中退审的三项 P1，不重开 Rev 1 已冻结证据。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT` 已递增至 `v4-397`；FIFO 157 转 `active`，`BACK-SYSTEM-02A Rev 2` 进入 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。
- 本轮允许范围：`packages/contracts/src/system-control.ts`（仅必要请求主体契约）、`backend/src/modules/system-control/`、必要 `backend/src/app.ts`/request 类型注入、`tests/backend/system-control.test.ts`、CURRENT/日志；禁止迁移、Worker/业务写状态、前端/DESIGN、真实 JWT/网络/密钥/付费。

## 2026-08-16 — BACK-SYSTEM-02A Rev 1 规划集中退审与 FIFO 157

- 规划新鲜运行系统控制台专项 `3/3`、contracts build、backend build 与 `pnpm check:repo`，均通过；因此本次不是已有功能失效，而是专项尚未覆盖的生产运行地基缺口。
- P1-1（权限所有权）：`systemControlPrincipal` 当前装饰在整个 Fastify app 上，路由读取 `app.systemControlPrincipal`；四个测试通过建立四个 app 证明配置差异，没有证明同一服务内匿名、员工和 owner 请求隔离。Rev 2 必须注入逐请求主体解析器/验证器并默认拒绝，用同一 app 的多请求回归证明边界；真实 Cloudflare JWT 仍后置。
- P1-2（刷新复杂度）：ASR、画面字与交付读取当前每次请求无窗口条件加载全部历史 Job/Attempt，再在 Node.js 生成 24h 指标。ControlShell 计划 5–10 秒刷新，历史增长后会形成无界 IO/内存和旧失败永久污染当前健康。Rev 2 必须改为 PostgreSQL 侧按 24h 窗口、当前非终态任务与有界异常集合聚合；不得保留 Node 全历史 fallback 或第二条并行读取路径。
- P1-3（金额精度）：费用当前通过 `Number(value)` 累计后 `toFixed(6)`，不适合作为预算/费用权威读取。Rev 2 使用 PostgreSQL `numeric SUM` 或等价精确十进制字符串路径，并补 `0.1 + 0.2 = 0.300000`、不同币种与 pending/unknown 不补零回归。
- 其他已通过项冻结：四资源池身份、未知/未配置、异常脱敏、读取零写副作用与既有直接依赖证据不重做。允许范围仍为 system-control 共享契约/后端模块、必要 app/request 类型注入、专项测试及状态日志；不新增迁移，不接真实 JWT/网络/密钥/付费，不改 Worker、业务写状态机、生产前端或 DESIGN。
- `CURRENT` 递增至 `v4-396`：FIFO 156 关闭，建立 FIFO 157；`BACK-SYSTEM-02A Rev 2` 为 `ready / Current actor=后端开发对话`，`FRONT-SYSTEM-02B` 与测试继续 blocked。

## 2026-08-16 — FIFO 156 BACK-SYSTEM-02A Rev 1 规划送达确认

- 已只向规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c` 发送 FIFO 155 完成包；`read_thread` 确认消息进入最新 `userMessage`，规划线程处于 `inProgress`。
- `CURRENT` 已递增至 `v4-395`；FIFO 155 业务切片关闭并登记 FIFO 156 交规划审核；`BACK-SYSTEM-02A Rev 1` 保持 `review / Current actor=规划对话`，后端停止修改；未通知前端、UI 或测试。

## 2026-08-16 — BACK-SYSTEM-02A Rev 1 FIFO 155 实现完成并交规划审核

- 实现共享只读契约 `packages/contracts/src/system-control.ts` 及导出；新增独立 `backend/src/modules/system-control/` 授权与 PostgreSQL 读取聚合，接入 `GET /api/system-control/overview`。默认主体、员工 audience、缺少 `system-control:read` 均拒绝；仅可注入控制台主体可读，未接真实 Cloudflare JWT。
- 四资源池固定为 `asr_api`、`ocr_api`、`ocr_self_hosted_worker`、`delivery_generation`，分别读取既有 ASR/画面字/交付 Job、Attempt、Usage 与 Asset 字节；fake/stub/self-hosted 按持久身份保真，费用按币种汇总，pending/unknown 不补零，配置/预算/服务器遥测/对象存储容量无权威来源时返回 `not_configured/unknown`，异常只返回稳定身份与脱敏原因。
- 新增 `tests/backend/system-control.test.ts` 覆盖默认拒绝、员工/缺能力拒绝、控制台主体、四池隔离与身份、空/未知、UTC 24 小时桶、费用待对账、默认参数、异常脱敏和读取零写副作用；直接依赖回归以单文件串行方式通过 ASR 12/12、画面字 13/13、交付 8/8（合计 33/33）。
- 新鲜验证：系统控制台专项 3/3；直接依赖组合（`--no-file-parallelism`）3 files/33 tests；contracts build、backend build、`pnpm check:repo`、`git diff --check` 通过。未运行完整 `pnpm check`，未新增迁移，未改既有写状态机/Worker、生产前端或 DESIGN，未接真实服务/密钥/网络/付费，未提交/推送/部署。
- `CURRENT` 已递增至 `v4-394`；FIFO 155 与 `BACK-SYSTEM-02A Rev 1` 转 `review / Current actor=规划对话`，下一步只唤醒规划固定任务并确认送达；`FRONT-SYSTEM-02B`、`TEST-SYSTEM-02` 继续 blocked。

## 2026-08-16 — BACK-SYSTEM-02A Rev 1 FIFO 155 权限握手并领取

- 已完整重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.7、`CURRENT v4-392`、`SYSTEM-control-shell-runtime.md`、`SYSTEM_CONTROL_CENTER.md` 1–4/7/9、职责矩阵“系统控制台运行总览”行、`INT-12/13` 与开发日志顶部。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；`qimao-terms-cloud` 处于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- 持久事实核对完成：ASR `asr_batches/jobs/attempts/usage`、画面字 `screen_text_batches/jobs/attempts`（按 `execution_kind` 独立分池、Usage 内嵌 Attempt）、交付 `delivery_products/jobs/attempts/events` 均可只读聚合；预算、存储容量、服务器遥测与配置发布无权威表，按契约返回 `not_configured/unknown`，不新增迁移。
- `CURRENT` 已递增至 `v4-393`；FIFO 155 转 `active`，`BACK-SYSTEM-02A Rev 1` 进入 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。允许范围仅共享 system-control 契约、后端 system-control 模块、必要 app 注入、专项测试及状态/日志；不改既有 Job/Worker 写状态机、前端、DESIGN、迁移或真实外部资源。

## 2026-08-16 — PLAN-SYSTEM-02 用户确认与真实运行总览实现切片

- 用户确认 `UI-SYSTEM-01 Rev 2` 最终方向；ControlShell 设计正式冻结为 done。管理员站不再停留于原型，进入“真实 PostgreSQL 运行事实 → 独立管理 API → 正式 ControlShell”的纵向实现。
- 新增 `docs/milestones/SYSTEM-control-shell-runtime.md`：首切片固定 ASR API、OCR API、OCR 自建 Worker、交付生成四资源池，定义小时趋势、费用/待对账、异常脱敏、数据新鲜度、未纳管/未知表达和默认拒绝的管理读取权限域；真实 Cloudflare JWT、配置发布、Worker 控制、付费 API 和部署均后置。
- `MODULE_RESPONSIBILITY_MATRIX.md` 新增“系统控制台 / 运行总览与诊断”产品与实现两行，任务指向 `INT-12/13`。后端只读聚合先行，正式前端等待共享契约与 API 通过规划审核，全链测试等待 UI 终验；禁止并行建设假仪表盘。
- `CURRENT` 递增至 `v4-392`：`PLAN-SYSTEM-02` 与 `UI-SYSTEM-01` done；建立 FIFO 155 和 ready 的 `BACK-SYSTEM-02A Rev 1`，`FRONT-SYSTEM-02B`、`TEST-SYSTEM-02` 保持 blocked。

## 2026-08-16 — UI-SYSTEM-01 Rev 2 规划微审通过并转用户体验

- 规划按 Impeccable audit 的生产完整性、可访问性、响应式与实现一致性边界，只复核 FIFO 154 两项变化；九个页面可见源中不存在 `.source-note` 或三类工程注释标题，CSS `active` 仅为内部状态类，顶层可见 `Attempt/active/known-not-accepted` 已替换为中文业务称谓。
- 诊断身份没有被过度删除：requestId 继续存在于错误横幅、日志表、发布未知和审计区，顶栏普通搜索只显示资源/任务/告警。两张新证据中 1440 高风险发布页与 1024 日志页层级、可读性和容器内横滚保持 Rev 1 方向。
- 新鲜验证：原型 `app.js` 通过 `node --check`；授权文档 `git diff --check` 无输出；Impeccable detector 因缺少 HTML 解析依赖降级 regex 并返回 `[]`，按欠计数记录，最终判断同时基于源代码、截图与 UI 浏览器证据。
- `CURRENT` 递增至 `v4-391`，FIFO 154 关闭，`UI-SYSTEM-01 Rev 2` 转 `review / Current actor=用户 / Reviewer=用户`。用户确认前不解锁管理 API 或正式 ControlShell 前端。

## 2026-08-16 — UI-SYSTEM-01 Rev 2 FIFO 154 微收口完成并交规划

- 保留 `DESIGN.md` 5.11 与 `docs/ui/SYSTEM-control-shell-acceptance.md` 的逐页“未来真实数据源 / 允许操作 / 非目标”矩阵，并明确它只服务跨角色设计交接、生产不可见；仓库外最终原型已移除所有 `.source-note` 工程说明卡及对应未使用样式。
- 顶层可见 `active / Attempt / known-not-accepted` 改为“当前生效 / 执行记录 / 明确未受理”；顶栏搜索不再暴露 requestId。错误横幅、日志表、发布未知和审计区的失败原因/requestId/身份事实继续保留，没有删减真实恢复与诊断信息。
- 仅复验变化场景：九个一级页面逐页 `sourceNotes=0 / engineering=false / active=false / attempt=false / root=true`；1440 高风险详情与 1024 日志页根无横溢，1024 表格仍只在自身容器横滚；页面控制台 error/warn=0/0。最小新证据为 `control-change-1440-rev2.png`、`control-logs-1024-rev2.png`。
- 未改变布局、颜色、信息架构、状态机、交互、数据契约或截图视口；未重跑 Rev 1 完整浏览器矩阵和 Impeccable detector；未修改生产 frontend/backend、迁移或 contracts，未启动 FRONT/BACK。
- `CURRENT` 递增至 `v4-390`；FIFO 154 与 `UI-SYSTEM-01 Rev 2` 转 `review / Current actor=规划对话 / Reviewer=规划对话`，不自行标记 done，下一步只通知规划。

## 2026-08-16 — UI-SYSTEM-01 Rev 2 FIFO 154 permission_ok 与领取

- 已重读 `CURRENT v4-388`、开发日志顶部、`DESIGN.md` 5.11、`docs/ui/SYSTEM-control-shell-acceptance.md` 与仓库外最终原型；确认 Rev 1 的布局、视觉、信息架构、状态、响应式和高风险链全部冻结，本轮只处理工程注释可见性与顶层实现术语。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`；`qimao-terms-cloud` 与仓库外原型均位于 `workspace-write` 可写根；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT` 递增至 `v4-389`；FIFO 154 转 `active`，`UI-SYSTEM-01 Rev 2` 进入 `in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`。
- 允许修改仅 `DESIGN.md`、ControlShell 验收文档、仓库外原型/最小新证据及 CURRENT/开发日志；不修改生产 frontend/backend、迁移或 contracts，不启动 FRONT/BACK，不重跑完整浏览器矩阵或 Impeccable detector。

## 2026-08-16 — UI-SYSTEM-01 Rev 1 规划审查与 FIFO 154 微收口

- 规划已独立检查 `DESIGN.md` 5.11、ControlShell 验收文档、原型源文件和 1440/1024 证据；布局、视觉层级、九个一级入口、五个详情、12 类状态、响应式与高风险发布链可保留，未发现需要重做的 P0/P1 业务或视觉缺陷。
- 新鲜静态验证：原型 `app.js` 通过 `node --check`，授权文档 `git diff --check` 无输出；Impeccable detector 因本机缺少 HTML 解析依赖降级为 regex 且返回 `[]`，按欠计数处理，结论以源代码、截图和人工审查为准。
- 唯一生产表达边界来自规划原任务措辞歧义：逐页“未来真实数据源 / 允许操作 / 非目标”应写进设计验收材料，不能作为管理员生产页面的可见说明卡；顶层页面还应把 `active`、`Attempt` 等换成“当前生效”“执行记录”，requestId/provider/adapter 等仅在诊断详情保留。
- `SYSTEM_CONTROL_CENTER.md` 3.3 已补上述长期边界；`CURRENT` 递增至 `v4-388`，FIFO 153 关闭并建立 FIFO 154，`UI-SYSTEM-01 Rev 2` 只做无布局、无业务变化的预览/文案微收口。管理 API 与正式前端继续保持未解锁。

## 2026-08-16 — UI-SYSTEM-01 Rev 1 FIFO 153 设计完成并交规划审核

- 在仓库外完成唯一可操作 `ControlShell` 原型 `ui-system-01-control-shell/index.html`：同一套深石墨蓝侧栏、白色顶栏和冷灰工作面贯通系统总览、引擎/API、路由/调度、服务器/运行环境、日志/质量、高风险变更，以及策略/学习、预算/限额、密钥/安全入口；没有 B/C、运行时主题或员工 AppShell。
- 系统总览保留用户参考图的四资源池运行带、8 项运行指标、吞吐/积压/费用三趋势、异常队列、待发布配置和最近审计。1440 将三趋势与异常并列、配置/审计置于下一行；1024 使用单主图加三指标切换。原型只在顶栏出现一次“示例数据”标识，生产禁止复制匿名数值、曲线、状态或 requestId。
- 全状态实测通过：loading 39 个骨架位、empty、error（原因/requestId/唯一重读）、unknown、stale、自动刷新关闭、费用待对账、未启用、资源池暂停/恢复、发布未知/唯一查询、回滚确认。高风险链固定为草稿→测试→影响检查→确认发布→可回滚；发布确认焦点序列真实为安全返回→Tab 确认→Tab 安全返回→Shift+Tab 确认，Escape 回原触发点，未知结果保持旧 active。
- 双视口通过：1440 展开/收起侧栏 `216/72px`，1024 收起/覆盖展开 `72/216px`，四种状态根页面均 `scrollWidth=clientWidth`；1024 日志表只在 `.table-wrap` 内横滚且列不逐字折行。页面控制台 error/warn=0/0；证据见仓库外 `ui-system-01-control-shell/evidence/`。
- Impeccable detector 严格只运行一次；因 `htmlparser2/css-select/css-tree/domutils` 不可用降级为正则，返回 `[]`，按欠计数记录。当前协议不授权子代理，故按技能降级 reviewer 清单在同一任务内独立换位审查，结论原文为 `disposition: ship`、material_fixes=none；完整记录为 `evidence/impeccable-review.txt`。
- `DESIGN.md` 新增 5.11；新增 `docs/ui/SYSTEM-control-shell-acceptance.md`。未修改生产 frontend/backend、迁移或 packages/contracts，未接真实 API/密钥/云资源，未购买、部署、提交或推送。`CURRENT` 递增至 `v4-387`；FIFO 153 与 `UI-SYSTEM-01 Rev 1` 转 `review / Current actor=规划对话 / Reviewer=规划对话`，下一步只通知规划。

## 2026-08-16 — UI-SYSTEM-01 Rev 1 FIFO 153 permission_ok 与领取

- 已重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.7、`CURRENT v4-385`、`SYSTEM_CONTROL_CENTER.md` 3.2/3.3/4/6–9、职责矩阵、`INT-11/12/14`、PRODUCT、DESIGN 全局设计变量，并打开用户确认参考图核对模块、密度和深浅关系。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- CURRENT 差量写为 `v4-386`；FIFO 153 转 `active`，`UI-SYSTEM-01 Rev 1` 进入 `in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`。
- 本轮只修改 `DESIGN.md`、新增 `docs/ui/` ControlShell 验收文档、仓库外可操作原型/截图及 CURRENT/开发日志；禁止修改生产 frontend/backend、迁移、packages/contracts，不接真实 API/密钥/云资源，不购买、部署、提交或推送。
- 使用 Impeccable 4.0.4 的 Operate 模式与既有视觉世界扩展规则，只做一次独立设计审查；用户已固定“日间控制舱”唯一方向，因此不运行 B/C 方向选择或运行时主题设计。

## 2026-08-16 — FIFO 153 ControlShell 视觉与功能基线冻结

- 用户确认所提供的系统控制台总览方向“非常好”，并要求正式产品只能在此基础上提升，不能简化或降低完成度。规划将其冻结为成熟企业控制台“日间控制舱”：冷灰白主画布、深石墨蓝侧栏/系统运行带、`#4458D8` 主要动作，科技感来自真实运行事实而非装饰特效。
- `docs/contracts/SYSTEM_CONTROL_CENTER.md` 新增正式视觉与总览基线：顶部环境/刷新/待发布变化/搜索/告警，ASR API/OCR API/OCR 自建 Worker/交付生成四资源池，运行指标、吞吐/积压/费用趋势、异常队列、待发布配置和最近审计均必须保留；视频转码启用后作为独立资源池。
- 生产门明确为“功能全保留、表达可优化”：1024 允许把三图改为指标切换或上下布局，异常每行只保留一个主动作，完整发布步骤下钻详情；每个数字/状态/版本/费用/操作必须接 PostgreSQL、监控摘要或领域命令，禁止把匿名示例与前端常量带入生产。
- `PRODUCT_ROADMAP.md` 已同步真实素材 S6 关闭与 62/100 完整产品口径；`CURRENT` 递增至 v4-385，建立 `UI-SYSTEM-01 Rev 1` 与 FIFO 153。UI 先交付总览、五个详情方向、状态矩阵及 1440/1024 可操作原型；用户方向验收前不解锁管理 API 或正式前端。

## 2026-08-16 — FIFO 152 关闭通知送达闭环

- 状态已写回：`CURRENT v4-383` 已将 `FRONT-S6-03A Rev 1` 标记 `done`，并记录规划独立验证与下一产品协商门。
- 唤醒已发送：规划只向前端固定任务发送关闭通知，未通知 UI、后端或测试开始统一任务中心/管理员控制台工作。
- 送达/运行态已确认：前端固定任务重读指定权威文件，明确确认任务关闭、本轮未修改文件或领取后续任务，并进入 completed/idle。`CURRENT` 最小递增至 `v4-384`。

## 2026-08-16 — FIFO 152 FRONT-S6-03A Rev 1 规划独立审核通过

- 规划逐项核对拆分后的控制器、五个展示面板、五组动作/查询 Hook 与四份职责 CSS：`SubtitleAcceptanceWorkspace.tsx` 为 762 行，其他手写生产 TS/TSX/CSS 均不超过 800 行；交互状态仍只由原控制器的 `useState` 持有，查询 Hook 只消费 React Query 权威事实，未新增 Context/全局 Manager、compat/fallback、旧组件轨道或第二业务状态源。
- `AcceptanceDialogs`、媒体、编辑与会话头显式参数较多，但各自对应单一页面区域且实现文件为 100–169 行；当前没有把整份工作台搬入新巨型文件或隐藏对象。为单纯减少参数继续引入 Context/Manager 会增加抽象与状态所有权风险，本轮不追加无收益重构。
- 规划新鲜验证：字幕验收专项 `18/18`；全部前端 `11 files / 114 tests`；frontend typecheck 通过；Vite 生产构建 `189 modules` 通过，仅保留既有大 chunk 非阻断提示；`git diff --check` 退出码 0，仅有既有 `LOCAL_APP_PARITY.md` 换行提示。
- 既有 S5/S7 正式浏览器矩阵和真实素材全链证据冻结；本次是无行为结构拆分，不重跑完整 `pnpm check` 或整套浏览器矩阵。`FRONT-S6-03A Rev 1` 关闭，下一步必须先与用户讨论统一任务中心、管理员 `ControlShell` MVP 与两站接口，未确认前不启动实现。

## 2026-08-16 — FRONT-S6-03A Rev 1 FIFO 152 无行为拆分完成并交规划复核

- 完成职责拆分：`SubtitleAcceptanceWorkspace.tsx` 从领取时 1633 行降为 762 行控制器；新增/拆出查询与支持 Hook、会话头部、剧集队列、媒体/时间轴、字幕/问题编辑、预检/删除/轨道/人工问题/返工弹窗及焦点边界。原控制器仍是 React 状态、副作用、幂等恢复和服务端权威事实的唯一所有者，没有新增全局状态、compat/fallback 或第二组件轨道。
- CSS 按职责拆分为 `SubtitleAcceptanceWorkspace.module.css` 487 行、`AcceptanceMediaTimeline.module.css` 272 行、`AcceptanceEditorPanel.module.css` 181 行、`AcceptanceDialogs.module.css` 123 行；所有手写生产 TS/TSX/CSS 文件均 ≤800 行。DOM role/aria/testid、员工文案、API/query key、路由、焦点/快捷键、媒体身份、视觉比例和响应式结果无有意差异。
- 新鲜验证：字幕验收专项 `18/18`；全部前端 `11 files / 114 tests`；frontend typecheck 通过；Vite 生产构建 `189 modules` 通过（仅既有大 chunk 提示）；Impeccable 定向 detector 返回 `[]`；`git diff --check` 退出码 0（仅既有 `LOCAL_APP_PARITY.md` CRLF/LF 提示）。未运行完整 `pnpm check`、未重跑 S6 真实素材或完整 UI 矩阵。
- 领取时已实测 `permission_ok`：工作区根包含 `C:\Users\ComradeGu\Documents\七猫兼职`，仓库位于 workspace-write 可写范围，普通仓库编辑不走 `auto_review`。本轮实际生产改动仅在 `frontend/src/features/subtitle-acceptance/`；测试文件未改。`CURRENT` 已差量递增至 `v4-382`，FIFO 152 / `FRONT-S6-03A Rev 1` 转 `review`，Current actor=规划对话。

## 2026-08-16 — FRONT-S6-03A Rev 1 FIFO 152 permission_ok 与领取

- 已重读 `qimao-terms-cloud/AGENTS.md`、`docs/WORKFLOW.md` v4.7、`docs/status/CURRENT.md` v4-380、S5 字幕验收契约、`DESIGN.md` 5.8、`docs/ui/M3-subtitle-acceptance.md`、字幕专项测试与开发日志顶部。
- `permission_ok`：工作区根包含 `C:\Users\ComradeGu\Documents\七猫兼职`；`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库内编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT.md` 已差量写为 v4-381；FIFO 152 转 `active`，`FRONT-S6-03A Rev 1` 进入 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。
- 仅允许在 `frontend/src/features/subtitle-acceptance/` 内做无行为 TSX/CSS 拆分及必要测试结构回归；冻结 API/query key、路由、共享契约、后端、迁移、DESIGN、文案、DOM/ARIA/testid、焦点/快捷键、幂等恢复、媒体身份、视觉比例和响应式结果。

## 2026-08-16 — FIFO 152 字幕验收无行为代码健康拆分冻结

- 用户确认在 S6 关闭后处理代码健康风险。规划新鲜统计 `SubtitleAcceptanceWorkspace.tsx=1633` 行、`SubtitleAcceptanceWorkspace.module.css=967` 行；当前没有旧发布路径，但控制器、媒体、队列、编辑器、问题、弹窗和焦点逻辑过度集中。
- 建立 `FRONT-S6-03A Rev 1`：只允许在 subtitle-acceptance 前端功能目录、对应前端测试和状态/日志内做无行为拆分；不得修改 API、query key、后端、迁移、共享契约、DESIGN、文案、DOM 语义、视觉比例或产品状态。
- 硬门：拆分后每个手写生产文件不超过 800 行；媒体、剧集队列、字幕/问题编辑、弹窗/焦点和会话头部必须按当前职责形成明确组件/Hook；不得把 1600 行整体搬到另一个文件、建立巨型 props/全局状态、复制服务端状态、增加 compat/fallback 或保留新旧两套组件。
- 验收：字幕验收专项、全部前端测试、frontend typecheck/build、git diff-check；规划核对职责与行数，并只对受影响正式页面做必要烟测，不重跑 S6 真实素材或完整 UI 矩阵。
- `CURRENT` 递增至 `v4-380`，FIFO 152 等待前端固定任务正式唤醒、permission_ok 与 in_progress 回执。

## 2026-08-16 — FIFO 151 S6 关闭通知送达闭环

- 状态已写回：`CURRENT v4-378` 已将 QA-S6-02-001/002、FIFO 147/151 与 `TEST-S6-02 Rev 3` 标记 done/closed。
- 唤醒已发送：规划只向全链测试固定任务发送关闭通知，未通知前端、后端或 UI 开始新动作。
- 送达/运行态已确认：测试固定任务重读 v4-378，明确回执无当前测试任务、不启动新测试、不修改文件并停止等待；任务 turn 正常 completed/idle。
- `CURRENT` 最小递增至 `v4-379`，S6 关闭链路结束。

## 2026-08-16 — FIFO 151 TEST-S6-02 Rev 3 规划复核与 S6 正式关闭

- 规划核对 `S6-real-material-smoke-report.md` 与仓库外 `s6-02-rev3-redacted.json`：旧 S5 POST 稳定 404 且四类持久化计数零变化；S7 同一稳定 deliveryId 最终恰好 1 个 AcceptanceRelease、1 个 DeliveryProduct、1 个生成命令，会话进入 released，重复 GET 不新增记录。
- 项目列表真实 HTTP 默认、1/100 边界、offset 及 `limit=50&offset=0` 均 200；非数字、小数、负数、超限和前导零稳定 400。规划新鲜运行 ProjectCenter 前端专项 `8/8` 与 check:repo 通过；生产旧 create-release 符号扫描为 0。
- 规划完整关闭门首次在沙箱内因 PostgreSQL 受限令牌无法启动而中断，归类 `executor_blocked`；正常宿主环境执行同一 `pnpm check` 全部通过：仓库检查、lint、typecheck、迁移、`24 files / 234 tests`、contracts/backend/frontend 构建均成功。仅保留既有前端大 chunk 非阻断提示。
- 完整检查启动的本地 PostgreSQL 已用项目自带 `pnpm db:stop` 在正常宿主环境安全停止。没有删除默认数据库或用户数据；测试隔离库、端口和临时脚本此前已精确清理，E: 原始六文件在 Rev 3 未访问。
- `QA-S6-02-001/002`、FIFO 147/151 与 `TEST-S6-02 Rev 3` 正式关闭；员工网站进度更新约 55/60，完整产品约 62/100。下一阶段必须先与用户冻结统一任务中心、管理员 ControlShell 和两站接口 MVP，不自动扩大开发范围。
- `CURRENT` 递增至 `v4-378`；等待向测试固定任务发送关闭通知并确认送达。

## 2026-08-16 — FIFO 151 TEST-S6-02 Rev 3 定向复验完成并交规划

- QA-S6-02-001 通过：匿名最小夹具 S5 会话到 `ready_to_release`，preflight 正确；旧 `POST .../subtitle-acceptance/sessions/:sessionId/releases` 返回 `404`，前后 `acceptance_releases=0`、`delivery_products=0`、`acceptance_commands=2`、`delivery_commands=0` 无变化。正式 S7 confirm/create 使用稳定 `deliveryId` 返回 `202`，Worker `ready` 后同一会话 `released`，数据库恰好 1 条 AcceptanceRelease、1 条 DeliveryProduct、1 条生成命令；两次 Release GET/Delivery detail GET 保持同一 ID/ready，不创建第二条。
- QA-S6-02-002 通过：真实 HTTP 默认、`limit=1/100`、`offset=0/1` 与 `limit=50&offset=0` 均 `200` 且分页正确；0、101、负数、非数字、小数、前导零格式均稳定 `400 REQUEST_VALIDATION_FAILED`。正式前端 `listProjects` 的 URLSearchParams 保留 `lifecycleStatus=active&limit=100`，未见代理剥参、删参或 fallback；`offset` 为可选参数并由服务端默认 0。
- 生产源静态门通过：frontend/src、backend/src、packages/contracts/src 中旧 `createAcceptanceRelease`、共享旧 create-release 类型/结果符号与 S5 POST 路径均为 0。自动化定向：后端三文件选定场景 `3/3` 通过（26 项跳过），前端 ProjectCenter `8/8` 通过。
- 清理证据：隔离库 `qimao_test_s6_02_r3_20260816` 已 DROP 并验证数据库计数 0；本地 PostgreSQL 已停止；临时测试脚本与 Node shim 已删除。仓库外脱敏证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a0065d-ce1c-7f11-94d8-56b91f062cf8\s6-02-rev3-redacted.json`。E: 原始六文件本轮未访问、未改动。
- `docs/testing/S6-real-material-smoke-report.md` 已追加 Rev 3 结果；`CURRENT` 已递增至 v4-377，FIFO 151 与 `TEST-S6-02 Rev 3` 转 `review / Current actor=规划对话`。下一步只唤醒规划固定任务，不直接通知前端、后端或 UI。

## 2026-08-16 — FIFO 151 TEST-S6-02 Rev 3 permission_ok 与领取

- 已重读 `qimao-terms-cloud/AGENTS.md`、`docs/WORKFLOW.md` v4.7、`docs/status/CURRENT.md` v4-375、`docs/testing/S6-real-material-smoke-report.md`、M3 字幕验收/交付产品权威契约与本日志顶部；本轮只做 QA-S6-02-001/002 定向复验，不以派发消息替代权威文件。
- `permission_ok`：工作区根为 `C:\Users\ComradeGu\Documents\七猫兼职`；`qimao-terms-cloud` 位于工作区可写范围；测试/证据路径与仓库外脱敏证据目录可写；普通范围内操作不走 `auto_review`；本轮精确隔离 PostgreSQL/临时对象目录可写。E: 六个真实素材文件不读取、不导入，保持只读冻结。
- `CURRENT` 已差量写为 v4-376；FIFO 151=`active`；`TEST-S6-02 Rev 3`=`in_progress` / Current actor=全链测试与质量验收对话 / Reviewer=规划对话。冻结 Rev 2 真实素材、流畅性、A/B 隔离、播放器、下载摘要和识别链证据，仅复验两项 P1。
- 允许范围：匿名最小夹具、精确隔离数据库、必要 API/Worker 与脱敏证据；不修改生产 frontend/backend、迁移、contracts、DESIGN，不接真实供应商/网络/密钥/付费/云资源，不提交/推送/部署。

## 2026-08-16 — FIFO 150 FRONT-S6-02B 规划审核通过并回流原测试

- 规划审计确认前端已删除 `CreateAcceptanceReleaseBody` import、`AcceptanceReleaseCommandResult` 死 interface、`createAcceptanceRelease` 死函数和只服务旧 S5 POST 的测试 mock；活跃 frontend/tests/packages/backend 生产引用为 0。
- `listAcceptanceReleases` 只读 GET、S7“前往交付确认”按钮与 `/deliveries/confirm` 导航均保留，没有改视觉、CSS、状态副本或兼容层。
- 规划新鲜运行字幕验收前端专项 `18/18`、frontend typecheck、Vite build `175 modules` 和 git diff-check，全部通过；仅保留既有 chunk size 与 `LOCAL_APP_PARITY.md` 换行提示。
- `FRONT-S6-02B Rev 1` 关闭；同一 `TEST-S6-02` 递增为 Rev 3，仅用匿名最小隔离夹具复验两项 QA。既有真实素材、流畅性、A/B 隔离、下载摘要和原文件只读证据全部冻结，不再重复 346.8 MB 素材链。
- `CURRENT` 递增至 `v4-375`，FIFO 151 等待测试固定任务正式唤醒、permission_ok 与 in_progress 回执。

## 2026-08-16 — FRONT-S6-02B Rev 1 FIFO 150 死路径清理完成并交规划

- 删除 `frontend/src/features/subtitle-acceptance/api.ts` 中 `CreateAcceptanceReleaseBody` import、`AcceptanceReleaseCommandResult` interface 与 `createAcceptanceRelease` 函数；保留 `AcceptanceRelease`/`AcceptanceReleaseList` 只读类型、`listAcceptanceReleases` GET 历史读取。
- 删除 `tests/frontend/subtitle-acceptance.test.tsx` 中只服务旧 S5 `POST .../subtitle-acceptance/.../releases` 的 mock 分支；保留 GET `/subtitle-acceptance/releases` 历史展示回归、S7 唯一“前往交付确认”入口回归。
- 活跃 frontend/tests/packages/backend 源码扫描：旧共享类型与 create-release 符号为 0；前端 S5 独立发布 POST 调用为 0。后端历史测试中保留的旧 POST 请求仅用于断言服务端 404，不是前端写能力或兼容路径；开发日志历史条目保留真实清理记录。
- 验证：字幕验收专项 `18/18`；frontend typecheck 通过；Vite build `175 modules` 通过（仅既有大 chunk 提示）；`git diff --check` 通过（保留既有 `LOCAL_APP_PARITY.md` CRLF 提示）。未运行完整 `pnpm check`、未重跑浏览器/UI 矩阵、未修改视觉/CSS、backend、迁移、packages/contracts、DESIGN，未提交/推送/部署。
- 实际修改：`frontend/src/features/subtitle-acceptance/api.ts`、`tests/frontend/subtitle-acceptance.test.tsx`、CURRENT/开发日志。状态写回 `CURRENT v4-374`；FIFO 150 关闭，`FRONT-S6-02B Rev 1` 转 `review / Current actor=规划对话 / Reviewer=规划对话`。下一步只唤醒规划，不通知测试、后端或 UI。

## 2026-08-16 — FRONT-S6-02B Rev 1 FIFO 150 permission_ok 与领取

- 已重读 `qimao-terms-cloud/AGENTS.md`、`docs/WORKFLOW.md` v4.7、`docs/status/CURRENT.md` v4-372、S5/S7 权威契约与开发日志顶部；确认后端已删除 S5 独立 Release 写路径，本轮只清理前端死引用与旧测试分支。
- `permission_ok`：工作区根包含 `C:\Users\ComradeGu\Documents\七猫兼职`；`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库内编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT.md` 已差量写为 v4-373；FIFO 150 转 `active`，`FRONT-S6-02B Rev 1` 进入 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。
- 允许修改仅限 `frontend/src/features/subtitle-acceptance/api.ts`、`tests/frontend/subtitle-acceptance.test.tsx` 与 CURRENT/日志；保留 `listAcceptanceReleases` 只读历史和“前往交付确认”S7 入口，不改视觉、业务交互、backend、迁移、packages/contracts、DESIGN。

## 2026-08-16 — FIFO 149 BACK-S6-02A 规划独立审核通过

- 规划审计确认旧 S5 create-release 已从共享写契约、subtitle-acceptance POST 路由、service、write repository 和旧后端写命令测试中删除；`acceptance_releases` 的生产写入只剩 S7 deliveries 仓储，S5 仅保留只读 Release 列表。
- 项目列表在共享 HTTP 查询契约显式接受合法数字字符串/内部数字，route 统一转换为 number；没有增加代理剥参、前端删分页、全局强制转换或 fallback。
- 规划新鲜运行 subtitle-acceptance/projects/deliveries 三文件 `29/29`，contracts build、backend build、check:repo 与 git diff-check 通过。`db:setup` 的迁移启动在当前沙箱再次触发已知 `uv_os_get_passwd ENOMEM`，但 PostgreSQL 已运行且三文件真实数据库回归全绿；按协议记为 `executor_blocked` 探针，不记业务失败、不新增业务 fallback。
- 跨仓库引用扫描仅剩 frontend `api.ts` 的死 create-release import/interface/function 和前端旧 POST mock，符合既定串行依赖。`BACK-S6-02A Rev 1` 关闭，`FRONT-S6-02B Rev 1` 解锁；完整 `pnpm check` 继续留集成关闭门。
- `CURRENT` 递增至 `v4-372`，FIFO 150 等待前端固定任务正式唤醒、permission_ok 与 in_progress 回执。

## 2026-08-16 — BACK-S6-02A Rev 1 FIFO 149 规划送达确认

- 已将 `CURRENT` 递增至 `v4-371`；FIFO 149 从 `notification_pending` 关闭，固定任务状态保持 `review / Current actor=规划对话`。
- 已只向规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c` 发送 BACK-S6-02A Rev 1 完成包；`read_thread` 确认该消息进入最新 `userMessage`，规划线程处于 `inProgress`，送达与运行态均已确认。
- 本轮不通知前端或测试；后端停止修改。完整 `pnpm check` 仍留给规划安排的前端死代码清理与原 TEST-S6-02 定向复验。

## 2026-08-16 — BACK-S6-02A Rev 1 FIFO 148 实现完成并交规划审核

- QA-S6-02-001：从 subtitle-acceptance 路由、service、write repository、共享 `CreateAcceptanceReleaseBody` / `AcceptanceReleaseCommandResult` 写契约和只服务旧命令的测试中端到端删除旧 POST 写路径；保留 `AcceptanceRelease` 只读 schema、GET 历史列表和 S7 生成投影。S5 pass/preflight 只保持 `ready_to_release`，旧 POST 回归为 404。
- S7 唯一交付创建/Worker 回归确认同一事务与 Worker 成功只产生一条 `AcceptanceRelease`、一条 DeliveryProduct，并将会话推进到 `released`；未增加 legacy/compat/fallback 或第二状态源。前端旧死 import 留给已登记的串行 `FRONT-S6-02B`，本轮未修改 frontend。
- QA-S6-02-002：`ListProjectsQuerySchema` 在唯一 HTTP 查询边界接受合法数字字符串并限制 1–100 / 非负 offset；project route 统一将已校验字符串转换为数字，覆盖默认值、1/100 边界、非数字、负数、超限和格式错误稳定 400。
- 定向验证：`tests/backend/subtitle-acceptance.test.ts` 15/15；`tests/backend/projects.test.ts`、`tests/backend/deliveries.test.ts` 与字幕专项合计 29/29；contracts build、backend build、`check:repo`、`git diff --check` 通过。完整 `pnpm check` 按任务要求留给后续两角色集成与原测试复验。
- 未修改生产 frontend、DESIGN、迁移、真实服务/网络/密钥/付费；未提交、推送或部署。CURRENT 已写为 v4-370，FIFO 148 关闭并登记 FIFO 149 交规划审核。

## 2026-08-16 — BACK-S6-02A Rev 1 FIFO 148 权限握手并领取

- 已完整重读 `qimao-terms-cloud/AGENTS.md`、`docs/WORKFLOW.md` v4.7、`docs/status/CURRENT.md` v4-368、S5/S7 契约、`docs/testing/S6-real-material-smoke-report.md` 与开发日志顶部；确认本轮只清理 QA-S6-02-001/002 两个真实 P1 根因。
- `permission_ok`：工作区根包含 `C:\Users\ComradeGu\Documents\七猫兼职`；仓库位于 `workspace-write/:workspace` 可写范围；普通仓库内编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT.md` 已由 v4-368 递增至 v4-369；FIFO 148 转 `active`，`BACK-S6-02A Rev 1` 进入 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。
- 允许范围：`packages/contracts` 中直接相关 subtitle-acceptance/projects 契约与导出、backend 对应 subtitle-acceptance/projects/deliveries 实现、`tests/backend`、CURRENT/日志；冻结生产 frontend、DESIGN、迁移（除非先交规划冲突）、真实服务/网络/密钥/付费、提交/推送/部署。

## 2026-08-16 — FIFO 148 QA-S6-02 两项 P1 归因与无旧路径返工冻结

- `QA-S6-02-001` 的根因不是测试误用，而是 S5 旧独立 `POST .../subtitle-acceptance/sessions/:sessionId/releases` 写路径仍存在；它会先把会话推进到 `released`，与已冻结的 S7 原子 `AcceptanceRelease + DeliveryProduct + DeliveryManifest` 唯一写路径冲突。
- 规划已把 `M3-subtitle-acceptance-workbench.md` 修正为单一路径：S5 只到 `ready_to_release`；S7 原子固定 Release/产品/清单并由生成 Worker 成功后推进 `released`。旧 POST、后端 service/repository 命令、共享 create-release 写契约、前端死 API 和对应旧测试必须端到端删除；只保留 S7 生成 Release 的只读列表与历史展示。
- `QA-S6-02-002` 的根因是浏览器线格式查询参数为字符串，而 `ListProjectsQuerySchema.limit/offset` 直接声明为整数且 Fastify 未做该处强制转换。修复必须落在统一 HTTP 查询边界并覆盖真实字符串、默认值和非法值；禁止前端删除分页参数、测试代理剥参或路由级临时 fallback。
- 为避免补丁堆叠和共享契约瞬时冲突，按 `BACK-S6-02A → FRONT-S6-02B → 原 TEST-S6-02 定向复验` 串行接力。后端先清运行时/共享旧路径与查询根因，前端随后只删死代码，不改视觉；原测试冻结其他通过项。
- `CURRENT` 递增至 `v4-368`，FIFO 148 等待后端固定任务正式唤醒、permission_ok 与 in_progress 回执。

## 2026-08-16 — FIFO 147 TEST-S6-02 Rev 2 真实素材全链结果交规划复核

- 已用获准 E: 六文件真实字节完成第 1、14、26 集分片上传/续传、Asset 与双角色绑定、真实公司 SRT 解析、零网络 ASR/OCR/术语链、前置审改、字幕验收、三集竖屏播放授权/读取和最终交付下载；零网络流程不代表识别准确率。
- 流畅性 A→B→A 五阶段各 5 轮均在 3 秒内稳定；搜索 164 ms、筛选 155 ms、展开 403 ms、侧栏 385 ms，控制台 error/warn=0/0。浏览器只读控制面不暴露 PerformanceObserver/Long Task 条目，已在报告中明确为测量限制。
- 项目隔离上传中/完成/识别中/审改脏态/交付 ready 各 5 轮；B 跨项目下载返回 404 且不泄露路径/正文，A/B URL 与数据未串。最终 7 个交付文件摘要/大小核对通过，XLSX ZIP/OOXML 条目解析通过。
- 复现并编号 `QA-S6-02-001`（released 会话交付门不衔接）与 `QA-S6-02-002`（项目列表分页字符串参数 400）；不修改生产代码、不直接通知返工角色。
- 报告：`docs/testing/S6-real-material-smoke-report.md`；仓库外脱敏证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a0065d-ce1c-7f11-94d8-56b91f062cf8\s6-02-live-state.json`。原始素材只读，隔离数据库/服务/临时对象随后精确清理。


## 2026-08-16 — FIFO 147 TEST-S6-02 Rev 2 流畅性与项目隔离增量

- 用户要求真实素材冒烟同时保障流畅性与项目之间的隔离切换；该要求在测试领取后加入，因此任务递增为 Rev 2，不另开平行测试，既有 permission_ok 与六文件只读摘要证据继续有效。
- 验收矩阵新增可测量流畅性门：上传期间页面持续响应、Performance/Long Task 记录、点击反馈与数据稳定时间、三集播放器控制、后台恢复和轮询/摘要计算卡顿检查；本机耗时只作冒烟证据，不冒充生产 SLA。
- 新增匿名项目 B，并在 A 上传中/完成/识别中/脏态/交付 ready 五个阶段至少 5 轮 A→B→A；验证 URL/数据/任务/媒体/选择/异步响应/幂等身份和跨项目服务端读取均严格隔离。
- `CURRENT` 递增至 `v4-366`，`TEST-S6-02` 更新为 Rev 2；规划只向正在执行的固定测试任务发送增量差量，不重做已完成步骤。

## 2026-08-16 — FIFO 147 TEST-S6-02 Rev 1 领取与 permission_ok

- 已重读 `AGENTS.md`、`docs/WORKFLOW.md` v4.7、`CURRENT v4-364`、`docs/testing/S6-real-material-smoke-acceptance.md` 和开发日志顶部；未读取历史归档或不在任务范围内的业务素材。
- `permission_ok`：工作区根为 `C:\Users\ComradeGu\Documents\七猫兼职`，`qimao-terms-cloud` 处于 `workspace-write` / `:workspace` 可写范围；`docs/testing`、状态/日志和仓库外测试证据目录可写；`C:\tmp` 临时目录可写；普通仓库内操作不走 `auto_review`。
- E: 六个获准文件（1、14、26 的 MP4/SRT）均已确认存在、可读，并记录大小、UTC 修改时间与 SHA-256 摘要；只读检查未修改、移动、复制或生成旁路文件。
- `CURRENT` 已递增至 `v4-365`；FIFO 147 转 `active`，`TEST-S6-02 Rev 1` 转 `in_progress / Current actor=全链测试与质量验收对话`。接下来仅使用隔离数据库、临时对象/系统临时目录和仓库外脱敏证据；不改生产 frontend/backend、迁移、contracts 或 DESIGN，不接真实供应商/密钥/付费/云资源/外部网络。

## 2026-08-16 — FIFO 147 TEST-S6-02 真实素材冒烟测试冻结与派发

- 用户确认在 TEST-S6-01 技术基线通过后继续真实素材冒烟。规划只读核对第 1、14、26 集共 3 个 MP4 + 3 个 SRT：总字节约 346.8 MB；原始目录和文件保持只读。
- 新增 `docs/testing/S6-real-material-smoke-acceptance.md`，冻结真实分片上传/续传/Asset、三集竖屏播放、真实公司 SRT 解析、零网络术语/ASR/OCR/前置审改/字幕验收链、最终双轨 SRT + 术语 XLSX 下载与精确清理。
- 本轮不接真实供应商、密钥、付费、云资源或外部网络，不评价识别准确率、费用和公网并发；真实正文、帧图、文件字节和下载产品不得进入仓库、日志或截图。
- `CURRENT` 递增至 `v4-364`；`TEST-S6-02 Rev 1=ready / Current actor=全链测试与质量验收对话`，FIFO 147 等待正式固定任务唤醒与 `permission_ok + in_progress` 回执。

## 2026-08-16 — FIFO 146 TEST-S6-01 规划复核与正式关闭

- 规划发现测试结果已写回 `CURRENT v4-361`，但交接只停在 `review`，没有继续执行规划接单/关闭；这是规划总线漏接，不是测试、前端、后端或 UI 的业务失败。
- 根因证据：测试任务只留下内部 `subAgentActivity/interacted`，没有让规划固定 Codex 任务形成新 turn；却误写“规划已确认唤醒与送达”。协议升级为 v4.7：固定角色交接只认 Codex 任务消息以及目标 `read_thread`/`wait_threads` 的新 turn/明确回执，内部子代理活动、共享文件变化和工具成功均不算送达。
- 独立核对 `docs/testing/S6-end-to-end-report.md`、测试对话最终交付和三张正式页面证据。共享数据库并发收集产生的 9 项失败只在套件清理/死锁污染下出现；11 个后端套件分别使用全新隔离库后 `109/109` 通过，因此不生成 `QA-S6-*` 产品缺陷包，也不派发无效返工。
- 本轮规划新鲜运行 `pnpm run check:repo`、`pnpm run lint`、`pnpm run typecheck`、`pnpm run build`，全部退出码 0；前端 175 modules 构建通过，仅有既有 chunk size 非阻断提示。
- `CURRENT` 最终递增至 `v4-363`，FIFO 146 改为 `closed`，`TEST-S6-01 Rev 1` 改为 `done`。关闭通知已通过测试固定任务正式送达并取得明确停止回执。下一步必须先与用户确认统一任务中心和管理员 `ControlShell` 的优先顺序与 MVP，不以测试关闭自动扩大开发范围。

## 2026-08-16 — FIFO 146 TEST-S6-01 结果交规划复核

- 已完成冻结范围内首批三集匿名/隔离验收：后端 11 个套件逐库重跑 `109/109`，前端 `22 suites / 114 tests` 全部通过；未发现 P0/P1/P2 业务缺陷、数据破坏、重复付费或安全问题。
- 正式 React + Fastify + PostgreSQL 浏览器证据已采集：匿名项目创建/刷新恢复、素材待确认页、`1440×900` 与 `1024×768` 根页面无横向溢出，控制台 `error/warn=0/0`；证据路径已写入 `docs/testing/S6-end-to-end-report.md`。
- `check:repo`、lint、typecheck、build 均通过；规划既有 FIFO 144 完整 `pnpm check`（24 files / 233 tests）通过证据继续有效。本轮未触碰默认数据库，避免用 S6 测试污染默认库。
- 一次共享库全套件并发收集的 9 项失败经逐套件全新数据库重跑确认是测试夹具清理/死锁污染，不归因产品；未创建 `QA-S6-*` 缺陷包。
- 精确清理完成：隔离数据库计数 `1→0`，本轮 PostgreSQL/API/前端端口已停止，临时 JSON 已删除，浏览器测试标签已关闭并恢复默认视口，原始 E: 素材未改动。
- `CURRENT` 已递增至 `v4-361`；`TEST-S6-01 Rev 1` 与 FIFO 146 转 `review / Current actor=规划对话`。以下只唤醒规划，不通知前端、后端或 UI。

## 2026-08-16 — FIFO 146 TEST-S6-01 恢复派发送达闭环

- 状态已写回：测试对话将 CURRENT 更新至 v4-359，`TEST-S6-01 Rev 1=in_progress`、FIFO 146=active，并记录 permission_ok。
- 唤醒已发送：规划只向固定测试对话发送恢复包，未指定模型/推理强度，未通知前端、后端或 UI。
- 送达/运行态已确认：`wait_threads` 确认测试对话处于 inProgress；其明确回执工作区/证据路径可写、E: 原始素材只读可访问、普通范围操作不走 auto_review，并已从隔离 PostgreSQL/数据库创建开始。规划将 CURRENT 递增至 v4-360 并关闭派发 FIFO；业务测试任务继续 in_progress。

## 2026-08-16 — FIFO 146 TEST-S6-01 恢复领取

- `permission_ok`：沿用暂停前已确认的工作区、测试/证据目录和 E: 原始素材只读权限；不重复素材盘点。
- 用户要求继续，昨天授权和冻结矩阵不变；`CURRENT` 已递增至 `v4-359`，FIFO 146 转 `active`，`TEST-S6-01 Rev 1` 转 `in_progress / Current actor=全链测试与质量验收对话`。
- 将从本轮精确隔离数据库、端口和匿名项目环境开始；不接真实供应商/密钥/付费/云资源，不修改生产代码，不直接通知前端、后端或 UI。

## 2026-08-16 — FIFO 146 TEST-S6-01 从安全暂停恢复

- 用户明确要求“继续”；昨天的素材写入授权、零网络边界、原始素材只读和 `docs/testing/S6-end-to-end-acceptance.md` 测试矩阵继续有效，不增加任务 Rev。
- 暂停期间未创建数据库、端口、临时对象或输出，未启动服务/Worker/迁移/测试，因此恢复不需要回滚或重复素材盘点；从隔离环境创建开始。
- `CURRENT` 递增至 v4-358，FIFO 146 改为 notification_pending，`TEST-S6-01 Rev 1` 改为 ready / Current actor=全链测试与质量验收对话；等待规划主动唤醒并确认 permission_ok + in_progress。

## 2026-08-16 — TEST-S6-01 用户暂停

- 用户要求“先暂停，明天再继续”。当前安全边界：仅完成权威文件读取、`permission_ok`、第 1/14/26 集 MP4/SRT 存在与元数据只读检查，以及领取状态写回。
- 未开始素材导入、数据库迁移、测试、前端/API/Worker 服务或输出生成；未创建隔离数据库、端口监听、临时对象或仓库外证据；未修改、移动、删除原始 E: 素材。
- `CURRENT` 已递增至 `v4-357`；FIFO 146 改为 `paused`，`TEST-S6-01 Rev 1` 改为 `blocked / Current actor=规划对话`，原因“用户暂停，明日续接”，不记业务失败。

## 2026-08-16 — FIFO 146 TEST-S6-01 领取

- `permission_ok`：工作区根与仓库路径正确，测试/证据目录可写，普通范围内操作不走 `auto_review`；E: 第 1、14、26 集 MP4/SRT 仅确认可读与元数据，原始素材保持只读。
- 已重读 `AGENTS.md`、`docs/WORKFLOW.md` v4.6、`CURRENT v4-355`、S6 验收矩阵、职责矩阵全链测试行、集成合同关闭门和本日志顶部。
- `CURRENT` 已递增至 `v4-356`；FIFO 146 转 `active`，`TEST-S6-01 Rev 1` 转 `in_progress / Current actor=全链测试与质量验收对话`。
- 测试边界：仅使用匿名项目、零网络 Adapter、精确隔离数据库/输出；不修改生产代码，不接真实供应商/密钥/付费/云资源，不通知前端、后端或 UI。

## 2026-08-16 — FIFO 146 TEST-S6-01 获准并进入派发

- 用户明确确认允许将第 1、14、26 集用于隔离测试数据库、生成临时测试输出并在完成后精确清理；原始素材继续保持只读，授权不包含真实供应商、密钥、付费、云资源、部署、Git 提交/推送或删除原始素材。
- 新增 `docs/testing/S6-end-to-end-acceptance.md`，冻结三集选择、匿名命名、隔离数据库、端口、零网络 Adapter、项目→素材/上传→术语→ASR/OCR→前置审改→字幕验收→交付产品主链、刷新/失败/失效、UI 证据、`QA-S6-*` 缺陷回流与精确清理清单。
- `CURRENT` 递增至 v4-355；`TEST-S6-01 Rev 1` 从 blocked 改为 ready / Current actor=全链测试与质量验收对话，FIFO 146 等待规划主动唤醒并确认 `permission_ok + in_progress`。

## 2026-08-16 — FIFO 145 v4.6 协议送达闭环

- 状态已写回：`AGENTS.md`、`docs/WORKFLOW.md` v4.6、职责矩阵、集成合同、`CURRENT v4-353` 与开发日志均已更新。
- 唤醒已发送：只向固定测试对话 `01a0065d-ce1c-7f11-94d8-56b91f062cf8` 发送协议差量；未指定模型或推理强度，未通知前端、后端或 UI 开始动作。
- 送达/运行态已确认：`wait_threads` 先确认测试对话进入 `inProgress`，随后取得明确完成回执；测试接受“测试→规划→返工角色→规划→原测试任务复验→规划关闭”与三段式交接证据。本轮未导入素材、未写数据库、未生成输出、未修改文件。`CURRENT` 最终递增至 v4-354，FIFO 145 关闭。

## 2026-08-16 — FIFO 145 全链测试角色与自动交付协议 v4.6

- 新增固定“全链测试与质量验收对话” `01a0065d-ce1c-7f11-94d8-56b91f062cf8`，与规划、UI、后端、前端共同使用当前保存项目；对话、协议和任务不指定模型或推理强度，由用户在界面手动选择。
- `AGENTS.md` 与 `docs/WORKFLOW.md` 升级为五角色/v4.6，新增测试领取、完整矩阵、稳定 `QA-*` 缺陷包、只交规划、规划拆单、返工回流原测试任务、定向复验、关闭与送达失败重试十步闭环。测试与执行角色禁止直接互相派活，用户不充当传话人。
- 职责矩阵新增“跨模块全链测试与质量门”行；集成合同关闭门补充正式 ID/版本/摘要、规划归因和精确清理证据。测试默认不改生产 frontend/backend、迁移、共享契约或 DESIGN。
- `TEST-S6-01 Rev 1` 预备任务已登记为 blocked：候选样本为获准路径下第 1、14、26 集，原始素材只读；只有用户确认允许写入隔离测试数据库、生成测试输出并完成精确清理后，规划才改为 ready 并自动唤醒测试对话。

## 2026-08-16 — FIFO 144 S5/S7 完整关闭门通过

- 规划独立核对 FIFO 143 `fifo143-results.json` 与两份 UI 验收差量，六个原失败场景全部通过；`FRONT-M3-07B Rev 3` 的正式状态改为 `done`，S5 视频字幕验收与 S7 交付确认/产品库共同关闭。
- 首次沙箱内完整检查在 `tsx src/database/migrate.ts` 启动前因 Node 24 调用 Windows `os.userInfo()` 返回 `uv_os_get_passwd ENOMEM` 而停止；直接只读 Node 探针在同一沙箱复现，证明不是迁移或测试代码失败。非沙箱只读探针正常返回当前用户，系统约有 2.8 GB 可用内存，根因归类为沙箱令牌 `executor_blocked`，未修改业务代码或增加 fallback。
- 在正常宿主环境执行唯一一次完整 `pnpm check`：仓库检查、lint、typecheck、数据库迁移、`24 files / 233 tests`、共享契约构建、后端构建与前端 Vite `175 modules` 构建全部通过；仅保留既有的大 chunk 非阻断警告。
- 按用户既有授权执行项目自带 `pnpm db:stop`；沙箱内发送停止信号被拒后，在正常宿主环境重试同一安全命令，PostgreSQL 正常完成 `server stopped`。未删除数据库、业务数据或其他服务。
- 三轨进度同步为：员工生产网站约 `54/60`，管理员控制台约 `2.5/20`，两站对接与真实生产化约 `4.5/20`，完整产品约 `61/100`。下一主线为 S6 单剧全链和管理员控制台地基规划；真实供应商、密钥、付费、服务器与部署仍需单独授权。

## 2026-08-16 — FIFO 143 规划送达确认

- 已只向规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c` 发送八项差量包；未通知前端或后端。
- `read_thread` 已确认完整 FIFO 143 消息进入规划最新 `userMessage`，规划线程状态为 `active / inProgress`。CURRENT 最小递增为 `v4-351`，FIFO 143 关闭；UI 停止修改并等待规划关闭门结论。

## 2026-08-16 — FRONT-M3-07B Rev 3 FIFO 143 六场景 UI 微终验完成

- 正式环境为当前生产 React build + Fastify + 精确隔离 PostgreSQL `qimao_ui_fifo143_01a00445`；本轮仅使用零网络对象存储 fake 与匿名合成数据，任务端口为 43120/43123。共享 3001/43113 与默认库 `qimao_terms_cloud` 未写入、未停止。
- 六项新鲜结果全部通过：S5 删除弹窗真实 `Tab/Shift+Tab/Escape` 序列为“安全返回→确认删除→安全返回→确认删除→删除选中”；S7 生成确认对应序列为“安全返回→确认生成→安全返回→确认生成→生成交付产品”，没有重复激活命令。
- 同一 `deliveryId=8fb94652-7186-4e8b-89fc-16638c68819f` 的恢复响应未知后，Worker 再次写入 `generation_failed`；人工查询重新显示唯一“恢复本次生成”并聚焦，第二次恢复仍复用同一 ID、创建请求计数为 1。直达失败同样聚焦唯一恢复动作，原因与 requestId 保留。
- 成功链使用 `deliveryId=91bcf9ec-2617-4831-a119-040cb96bd07b`：成功标题初始聚焦、取消倒计时可用，5 秒后自动进入同一详情 URL；正式页面控制台 `error/warn=0/0`，未再出现 render-phase navigate。
- 精确 `1024×768` 下 AppShell 72px，根宽 `1024/1024`；`.tableWrap=844/1196` 且 `overflow-x:auto`，表格 `min-width:1080px`、单元格 `white-space:nowrap`，横滚只存在于表格容器。S5 双轨局部返工首次 HTTP 201，页面恢复；同键同体重放 HTTP 200、同一记录 ID、数据库记录数 1，不再出现 500。
- 证据根新增 `fifo143-results.json`、`fifo143-success.png`、`fifo143-library-1024.png`、`fifo143-s5-rework.png`。其余 49 项、完整矩阵和 Impeccable 未重跑；未运行完整 `pnpm check`，未修改生产 frontend/backend、迁移、contracts 或 DESIGN。
- 精确清理完成：浏览器临时标签已关闭并恢复默认视口；43120/43123 无监听；隔离库存在计数 `1→0`，默认库存在计数仍为 `1`；运行目录、临时 loader/编译覆盖/harness 已删除，仅保留最小证据。CURRENT 写为 `v4-350`，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO 143 等待只向规划总线送达。

## 2026-08-15 — FRONT-M3-07B Rev 3 FIFO 143 六场景 UI 微终验领取

- 已重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.5、`CURRENT v4-348`、S5/S7 UI 验收 §8、开发日志顶部、仓库外 `fifo139-results.json` 及规划列出的六个生产差量文件；冻结 FIFO 139 其余 49 项、完整矩阵和 Impeccable。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- CURRENT 差量写为 `v4-349`；FIFO 143 转 `active`，`FRONT-M3-07B Rev 3` 进入 `in_progress / Current actor=UI 设计对话 / Reviewer=UI 设计对话`。
- 本轮只用正式 React + Fastify + 精确隔离 PostgreSQL 复验六个原失败场景；允许写入仅两份 `docs/ui/`、CURRENT/开发日志和仓库外最小证据。禁止修改生产 frontend/backend、迁移、contracts、DESIGN；不运行完整 `pnpm check`、完整矩阵或 Impeccable，不提交、推送或部署。

## 2026-08-15 — FIFO 140/142 规划差量审核通过并路由六场景 UI 微终验

- 前端审计：两份 focus trap 都改为 `useLayoutEffect` 内一次性初始聚焦，并对 Tab/Shift+Tab 显式按活动项推进；没有持续抢焦点。`DeliveryDetailPage` 在重新读取到 `generation_failed` 时退出 query-only，失败动作有确定焦点；倒计时导航与状态递减已分离；产品库表格使用 `.tableWrap` 内滚、1080px 最小宽度和单元格不逐字折行。业务 API、状态源与冻结视觉方向未改。
- 后端审计：正式 500 的首因是 `acceptance_track[]` 由 `pg` 返回数组字面量字符串，事务本身已成功；读取仓储只把允许值安全收窄为 `dialogue/screen_text`，服务层把 trim 后不足 8 字的理由稳定映射为 422。没有通过重试、fallback、迁移或共享契约变更掩盖根因。
- 规划新鲜验证：`tests/frontend/deliveries.test.tsx`、`tests/frontend/subtitle-acceptance.test.tsx`、`tests/backend/subtitle-acceptance.test.ts` 合计 `3 files / 41 tests` 全部通过；frontend typecheck、Vite 175 modules production build、backend build、contracts build、`check:repo`、`git diff --check` 均退出码 0。仅保留既有大 chunk 与 `LOCAL_APP_PARITY.md` CRLF 提示。
- 结论：FIFO 140 与 142 通过；`BACK-M3-05D Rev 1` 标记 done，`FRONT-M3-07B Rev 3` 保持 review 并转 UI。FIFO 143 只复验六项：S5/S7 两个正向 Tab、恢复未知后 Worker 再次失败、直达失败焦点、倒计时控制台、1024 产品库内滚、S5 合法局部返工 201/重放；其余 49 项和 Impeccable 冻结。完整 `pnpm check` 继续留 UI 通过后的单次关闭门。
- 状态写回：`CURRENT v4-348`；FIFO 143 为 `notification_pending`，等待规划唤醒 UI 固定任务并确认 permission_ok / in_progress。

## 2026-08-15 — BACK-M3-05D Rev 1 FIFO 142 规划送达确认

- 已向规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c` 发送 FIFO 142 完成包；`read_thread` 已确认消息进入规划最新 `userMessage`，线程状态为 `inProgress`。
- `CURRENT.md` 差量写为 `v4-347`，FIFO 142 关闭；后端停止修改，不通知前端/UI。

## 2026-08-15 — BACK-M3-05D Rev 1 FIFO 141 实现完成并交规划审核

- 已在正式 Fastify + 精确隔离 PostgreSQL 路径复现 FIFO 139 合法局部返工的真实 500：事务已写入，但 PostgreSQL 自定义 `acceptance_track[]` 经 `pg` 返回数组字面量字符串，响应 schema 投影失败并被通用处理映射为 `INTERNAL_ERROR`。
- 首个根因最小修复位于 `backend/src/modules/subtitle-acceptance/subtitle-acceptance.read.repository.ts`：读取返工记录时将 PostgreSQL 数组字面量安全收窄为契约允许的 `dialogue` / `screen_text` 数组；`backend/src/modules/subtitle-acceptance/subtitle-acceptance.service.ts` 追加 trim 后理由至少 8 字校验，避免数据库约束错误被 500 掩盖，并以稳定 422 错误码返回。
- `tests/backend/subtitle-acceptance.test.ts` 补齐双轨合法请求 201、可读返工、同键同体 200 replay、同键异参 409、版本冲突 409、零第二记录、选中/未选集状态隔离，以及空白理由可分类 422 零副作用回归。
- 定向验证：字幕验收专项 `15/15`；S5 直接依赖组合（subtitle-acceptance、pre-review、screen-text、terms、material-assets）`51/51`；contracts build 通过；backend build 通过；`check:repo` 通过；`git diff --check` 通过；未运行完整 `pnpm check`。
- 本轮未修改迁移、`packages/contracts`、frontend、DESIGN 或 S7 deliveries；未接真实服务/网络/密钥/付费，未提交、推送或部署。CURRENT 已写为 `v4-346`，FIFO 141 关闭并登记 FIFO 142 交规划审核。

## 2026-08-15 — FRONT-M3-07B Rev 3 FIFO 140 定向微返工完成并交规划

- 焦点陷阱根因收口：S5 删除与 S7 生成确认共用逻辑改为布局阶段一次性安全初始聚焦，Tab/Shift+Tab 显式按当前焦点推进并闭环；未用持续抢焦点 effect，pending 锁、Escape 与触发点恢复保持原行为。
- 同一 `deliveryId` 恢复链收口：恢复响应未知后保留唯一“查询本次生成结果”；查询读回 `generation_failed` 立即退出 query-only、恢复唯一“恢复本次生成”，再次恢复仍复用同一 deliveryId；失败/查询/直达失败均把焦点落到当前唯一动作，ready 查询进入同 ID 成功转场。
- 倒计时导航已从 `setState` updater 移至独立 effect；成功标题焦点、可取消倒计时和详情路由保持不变。产品库 `.tableWrap` 保持内部横滚并将 `.dataTable` 稳定最小宽度设为 1080px、单元格不逐字折行，1024 根页面结构不变。
- 新增/调整可控 DOM 回归：S5/S7 正反向焦点闭环、直达失败焦点、未知恢复→再次失败→同 ID 再恢复、产品表格容器结构；两份专项 `26/26` 通过。
- 实际修改生产文件：`frontend/src/features/deliveries/shared.tsx`、`frontend/src/features/deliveries/DeliveryDetailPage.tsx`、`frontend/src/features/deliveries/Deliveries.module.css`、`frontend/src/features/subtitle-acceptance/SubtitleAcceptanceWorkspace.tsx`；测试：`tests/frontend/deliveries.test.tsx`、`tests/frontend/subtitle-acceptance.test.tsx`。未改 backend、迁移、packages/contracts、DESIGN、S5/S7 API/业务状态。
- 验证：frontend typecheck 通过；Vite build 175 modules 通过（仅既有大 chunk 提示）；`git diff --check` 通过（保留既有 `LOCAL_APP_PARITY.md` CRLF 提示）。未运行完整 `pnpm check`，未重做冻结完整浏览器矩阵、Impeccable 或提交/推送/部署。
- 状态写回：CURRENT `v4-345`，FIFO 140 关闭；`FRONT-M3-07B Rev 3` 转 `review / Current actor=规划对话 / Reviewer=规划对话`。下一步只通知规划总线，UI 仅复验五项变化场景。

## 2026-08-15 — FRONT-M3-07B Rev 3 FIFO 140 permission_ok 与领取

- 已重读 `qimao-terms-cloud/AGENTS.md`、`docs/WORKFLOW.md` v4.5、`docs/status/CURRENT.md` v4-342、S5/S7 UI §8、开发日志顶部及仓库外 `fifo139-results.json`；确认本轮只处理 FIFO 139 五项前端 P1，其他 49 场景冻结。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT.md` 差量写为 v4-344；FIFO 140 转 `active`，`FRONT-M3-07B Rev 3` 进入 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。
- 允许修改仅限 deliveries 相关前端/字幕工作台及对应前端专项测试；冻结 backend、迁移、packages/contracts、DESIGN、S5/S7 业务状态/API、完整浏览器矩阵、完整 `pnpm check`、提交/推送/部署。

## 2026-08-15 — BACK-M3-05D Rev 1 FIFO 141 权限握手并领取

- 已重读 `qimao-terms-cloud/AGENTS.md`、`docs/WORKFLOW.md` v4.5、`docs/status/CURRENT.md` v4-342、S5 字幕验收契约、职责矩阵 S5、`MODULE_INTEGRATION_CONTRACTS.md` 的 `INT-08`、`docs/ui/M3-subtitle-acceptance.md` §8、开发日志顶部及仓库外 FIFO 139 机器证据 `fifo139-results.json`。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT.md` 从 v4-342 差量写为 v4-343；FIFO 141 转 `active`，`BACK-M3-05D Rev 1` 进入 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。
- 本轮只处理 `backend/src/modules/subtitle-acceptance/` 与 `tests/backend/subtitle-acceptance.test.ts`；冻结迁移、packages/contracts、frontend、DESIGN、S7 deliveries 和真实服务/网络/密钥/付费。若证实共享契约或数据库无法表达，停止并交规划冲突，不自行扩大。

## 2026-08-15 — FIFO 139 规划归因审计完成并并行派发两项定向修复

- 规划重读 `CURRENT v4-341`、S5/S7 UI 终验记录、`fifo139-results.json` 与生产实现，确认 49 条正式场景已完整执行；除六个 P1 外的同状态、双视口、下载、空画面字轨、服务端查询和键盘证据全部冻结，不重跑完整矩阵或 Impeccable。
- 前端五项同源问题：S5 删除与 S7 确认弹窗正向 Tab 未推进；同一 deliveryId 恢复未知后重新读取到 `generation_failed` 时没有退出 query-only；直达失败没有确定焦点；倒计时在 `setCountdown` 更新函数内调用 `navigate` 触发 render-phase 更新；产品库表格仅 `min-width:720px`，1024 下没有形成容器内横滚。登记 FIFO 140 / `FRONT-M3-07B Rev 3`，仅允许修正相关前端模块及对应测试，不改 API、业务状态、视觉方向或冻结证据。
- 后端独立问题：S5 合法局部返工请求经正式 Fastify 连续返回 500；现有 `CreateAcceptanceReworkBody`、路由和 PostgreSQL 写链理论上可以表达该请求，不能由前端 fallback 掩盖。登记 FIFO 141 / `BACK-M3-05D Rev 1`，要求在隔离 PostgreSQL 复现真实 HTTP 正向链、定位首个失败点并补正向/幂等重放/同键异参或版本冲突零副作用回归；默认禁止改迁移/共享契约。
- P2 是静态 detector 不覆盖运行时问题的工具边界，不是新增产品缺陷；关闭门继续后置。两项修复文件所有权不重叠，可并行执行；完成后均先交规划，UI 只复验六个原失败场景。
- 状态写回：`CURRENT v4-342`；FIFO 140、141 为 `notification_pending`，等待规划主动唤醒固定前、后端任务并确认 `permission_ok + in_progress`。

## 2026-08-15 — FRONT-M3-07B Rev 2 FIFO 139 正式 UI 终验完成并交规划

- 正式环境：生产 React/Vite 43110 → 受控代理 43111 → 生产 Fastify 43113 + DeliveryWorker，权威库为精确隔离 `qimao_ui_fifo139_01a00445`；数据只含匿名项目、合成 `9:16` MP4 与零网络 fake。未使用共享默认库、真实业务数据、外部网络、云资源、密钥或付费。
- 完整矩阵未在首个问题停止：S5 覆盖会话/历史、真实竖屏 contain、上下双安全区、完整播放控制、三筛选、双新增、选择/剪贴/删除、人工问题、返工、同步 GET preflight；S7 覆盖确认、创建未知、同 ID 查询、两轮 generation_failed/恢复、ready 成功转场、产品库四状态、服务端搜索/筛选/排序/分页、loading/empty/error、详情文件树/下载/空轨/元数据/中文历史/修订入口及回收只读。
- 通过事实：空画面字 SRT 真实下载为 `EF BB BF` 三字节；员工 DOM 无 AcceptanceRelease/raw event kind；交付全链且仅“交付产品库” `aria-current=page`；1440 AppShell 204px、1024 AppShell 72px，S5 根宽无横溢；隔离服务页面控制台除成功倒计时问题外无 warning。
- P1 六项：S5 删除与 S7 确认弹窗真实 Tab 都停在“安全返回”；恢复未知后再次失败仍为 query-only、不能无刷新再恢复；generation_failed 直达焦点为 BODY；倒计时自动进入触发 React setState-during-render，控制台最终 `error/warn=1/0`；1024 产品库未形成表格容器内横滚而逐字折行；S5 人工问题可解决但局部返工提交/唯一恢复均返回真实 500。
- P2 一项：Impeccable detector 本轮只运行一次并返回 `[]`，但静态检测不覆盖运行时焦点、异步恢复、控制台和 1024 可扫读，已如实按降级静态筛查记录。五维评分为视觉层级 8、信息架构 8、排版密度 7、一致性 8、完成度/可访问性 5。
- 证据：仓库外 `fifo139-results.json` 共 49 个场景记录；保留 S5 1440/1024 与 S7 确认/成功/详情/产品库 1440/1024 最小截图。两份 `docs/ui/` 已追加正式终验节，结论 `P0=0 / P1=6 / P2=1 / P3=0 / disposition=fix`。
- 精确清理：隔离库存在计数 `1→0`，43110–43113 监听 `0`；临时 MP4、loader、编译覆盖、Vite 配置和 harness 均删除；共享默认库存在计数仍为 `1`。未运行完整 `pnpm check`，未修改生产 frontend/backend/迁移/packages/contracts/DESIGN 语义，未提交、推送或部署。
- 状态写回：CURRENT `v4-341`，FIFO 139 关闭；`FRONT-M3-07B Rev 2` 转 `review / Current actor=规划对话 / Reviewer=规划对话`。下一步只通知规划总线，不直接通知或恢复前后端。

## 2026-08-15 — FRONT-M3-07B Rev 2 FIFO 139 正式 UI 终验领取

- 已完整重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.5、`CURRENT.md` v4-339、`DESIGN.md` 5.8/5.9、S5/S7 UI 验收、S5/S7 合同、`INT-08` 与开发日志顶部；规划已冻结的 Rev 2 微审结论为员工 DOM 不显示 Acceptance/raw event kind、同一 `deliveryId` 恢复进入成功转场、deliveries 专项 7/7。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。`CURRENT.md` 从 v4-339 最小递增为 v4-340，FIFO 139 转 `active`，任务转 `in_progress / Current actor=UI 设计对话 / Reviewer=UI 设计对话`。
- 本轮只做一次正式 React+Fastify+精确隔离 PostgreSQL 的 S5→S7 完整 UI 矩阵；允许写入仅两份 `docs/ui/` 验收文档、CURRENT/日志和仓库外最小必要证据。禁止修改 `frontend/`、`backend/`、迁移、`packages/contracts/` 或 DESIGN 语义；不运行完整 `pnpm check`，不提交、推送、部署或接真实网络/云资源。

## 2026-08-15 — FRONT-M3-07B Rev 2 规划微审通过并路由 S5→S7 正式 UI 终验

- 规划重读差异：详情来源区已移除 AcceptanceRelease 投影；六类当前后端事件均映射为稳定员工中文，未知事件只显示“交付状态已更新”，原始 kind 不进入员工 DOM。
- `generation_failed` 恢复被服务端接受后，前端把同一 deliveryId 的正式详情写入原查询缓存并导航同一 ID 的 `?transition=success`；`preparing` 继续由原查询轮询，最终 `ready` 后成功标题获焦并显示可取消倒计时，没有第二次创建请求。
- 新鲜验证：deliveries 专项 `7/7`、frontend typecheck 与 `git diff --check` 通过，仅保留既有 `LOCAL_APP_PARITY.md` CRLF 提示。新增回归覆盖未知事件不泄露、同 ID 恢复、preparing→ready 成功标题/倒计时和 recover POST 恰好一次。
- 结论 P0/P1=0，Rev 1 既有 1440/1024、列表/确认页、AppShell 与业务证据继续冻结。任务保持 review，FIFO 139 只由 UI 设计对话用正式 React+Fastify+隔离 PostgreSQL 做 S5→S7 唯一完整终验；UI 不修改生产代码，完整 `pnpm check` 仍留终验通过后的单次关闭门。

## 2026-08-15 — FRONT-M3-07B Rev 2 FIFO 138 微返工完成并交规划复核

- 员工文案投影：详情来源区移除 AcceptanceRelease 级别的“Acceptance 来源”项，仅保留验收会话修订、S3 台词 Release、S4 画面字 Release、素材清单、术语版本和导出模板；历史事件通过稳定中文映射覆盖 `delivery.created`、`generation_scheduled`、`generation_recovery_scheduled`、`generated`、`generation_failed`、`metadata_updated`，未知 kind 统一显示“交付状态已更新”，员工 DOM 不泄露实现代码。
- 失败恢复成功语境：服务端接受同一 `deliveryId` 的 recover 后，前端把返回的同一产品 detail 写入当前查询缓存并导航到同一 ID 的 `?transition=success`；返回 `preparing` 时沿用真实轮询，Worker 完成后进入 ready，成功标题聚焦并显示可取消倒计时；未重发创建或生成新产品。
- 定向回归新增/更新：来源与历史事件无 raw kind、未知事件通用文案、恢复 POST 路径与幂等键仍绑定同一 deliveryId、preparing→后续 GET ready 后成功标题焦点/倒计时；Rev 1 未变化的未知创建、列表四状态、空轨、元数据回归继续通过。deliveries 专项 `7/7`。
- 验证：frontend typecheck 通过；Vite build `175 modules` 通过（仅既有大 chunk 提示）；`git diff --check` 通过（保留既有 `LOCAL_APP_PARITY.md` CRLF 提示）。未运行完整 `pnpm check`，未重做冻结浏览器矩阵。
- 边界：仅修改 `frontend/src/features/deliveries/DeliveryDetailPage.tsx`、`tests/frontend/deliveries.test.tsx` 与 CURRENT/开发日志；未改 API、CSS、确认页、产品库、AppShell、backend、迁移、packages/contracts、DESIGN；未提交、推送或部署。`CURRENT.md` 差量写为 v4-338，FIFO 138 关闭，任务转 `review / Current actor=规划对话`。

## 2026-08-15 — FRONT-M3-07B Rev 2 FIFO 138 permission_ok 与领取

- 已实测 `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- 已领取 FIFO 138，`FRONT-M3-07B Rev 2` 写回 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`；当前只允许 `DeliveryDetailPage.tsx`、`tests/frontend/deliveries.test.tsx`、CURRENT 与开发日志。
- 本轮冻结 API、CSS/视觉、确认页、产品库、AppShell、后端、迁移、packages/contracts、DESIGN、1440/1024 与 Rev 1 其他证据；INT-08 状态源仍为 PostgreSQL/DeliveryWorker，前端只做员工文案与成功转场投影。


## 2026-08-15 — FRONT-M3-07B Rev 1 规划映射审计退回两项同源微返工

- 规划重读 S7 合同、`DESIGN.md` 5.9、UI 验收与正式 React。稳定 `deliveryId`、创建未知只 GET 同一产品、四状态服务端列表、三类文件/空轨、唯一全局导航高亮及 1440/1024 无根横溢方向成立；Impeccable detector 新鲜结果为 `[]`，既有布局与业务证据冻结。
- P1 员工文案仍泄露实现术语：详情来源区直接显示“Acceptance 来源”，历史事件直接显示 `delivery.created` 等原始代码；冻结设计明确要求使用“确认验收内容与来源”等员工可理解投影，并隐藏 AcceptanceRelease/后端事件代码。
- P1 恢复成功语境缺失：`generation_failed` 执行同一产品恢复后只刷新详情，未进入 `?transition=success`；Worker 最终变为 `ready` 时不会聚焦“交付产品生成成功”标题，也没有可取消倒计时，违反 S7 失败恢复→成功焦点门。
- 新鲜验证：deliveries 前端专项 `6/6`、frontend typecheck、Vite build 175 modules、`git diff --check` 均通过，仅保留既有 `LOCAL_APP_PARITY.md` CRLF 提示。这些测试尚未覆盖上述两个失败场景，因此不能直接路由 UI 完整终验。
- FIFO 138 / `FRONT-M3-07B Rev 2` 只允许修改 `frontend/src/features/deliveries/DeliveryDetailPage.tsx`、`tests/frontend/deliveries.test.tsx` 与状态/日志：增加稳定员工事件文案映射；恢复命令被接受后进入同一 deliveryId 的 success transition，并补“preparing→ready 后成功标题获焦/倒计时”定向回归。不得改 API、CSS、后端、迁移、共享契约、DESIGN 或既有列表/确认页/响应式布局；修后先交规划微审，再统一路由 UI。

## 2026-08-15 — FRONT-M3-07B Rev 1 FIFO 137 实现完成并交规划复核

- 正式 React 已接入 `/projects/:projectId/deliveries/confirm?sessionId=...`、`/deliveries`、`/deliveries/:deliveryId`：确认页只核对 S5 服务端来源/集数/三类文件摘要，受保护确认后使用完整 body、稳定 `deliveryId` 与幂等键；网络未知只 GET 同一 ID，确定性冲突清理意图并重新读取权威事实。
- 生成状态只展示后端 `preparing / ready / generation_failed / recycled`；不伪造百分比、客户端进度或取消创建。失败只提供同一产品恢复/查询，ready 成功标题聚焦、倒计时 `aria-live` 可取消并可立即进入详情。
- `/deliveries` 使用服务端搜索、状态、排序、分页，覆盖 loading/empty/error 与四状态；确认、生成、成功、产品库、详情均只高亮全局“交付产品库”，项目中心不会在交付路由形成第二个 active 导航。详情展示三类文件树、空画面字轨、单文件/全部下载、冻结来源、元数据与历史事件；文件正文保持只读，修改入口返回验收创建修订。
- AppShell 响应式证据：正式 React 1440×900 `scrollWidth=clientWidth=1440`；1024×768 自动收起 72px 侧栏、主区 952px、根页面无横溢；新鲜控制台无应用 error/warning。截图已保存于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-1c71-72d3-9171-33ad2c36e941\s7-delivery-evidence\`；本地后端当前无项目数据，确认页错误态忠实展示 `DELIVERY_PROJECT_NOT_FOUND` 与 requestId，未伪造成功/产品状态。
- 新增 `tests/frontend/deliveries.test.tsx` 6 项回归：稳定创建 body/幂等键、未知结果单 GET、列表四状态与服务端查询、详情三类文件/空轨/元数据、失败同 ID 恢复、ready 成功焦点/倒计时。字幕验收专项与全部前端测试合计 `112/112`；frontend typecheck、Vite build（仅既有大 chunk 提示）、Impeccable detector `[]`、`git diff --check` 通过（保留既有 LOCAL_APP_PARITY CRLF 提示）。
- 代码/边界：未改 backend、迁移、packages/contracts、DESIGN；未接真实云资源、密钥、付费、外部上传；未运行完整 `pnpm check`；未提交、推送或部署。大模块拆分仍不在本轮范围。`CURRENT.md` 差量写为 v4-335，FIFO 137 关闭，任务转 `review / Current actor=规划对话`，下一步只等待规划审核。

## 2026-08-15 — FRONT-M3-07B Rev 1 FIFO 137 permission_ok 与衔接预检

- 已实测 `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- 已领取 FIFO 137，`FRONT-M3-07B Rev 1` 写回 `in_progress / Current actor=前端开发对话 / Reviewer=UI 设计对话`；只修改 `frontend/`、`tests/frontend/`、必要 AppShell 接入与状态/日志，未修改 backend、迁移、packages/contracts、DESIGN 或真实云资源。
- 已完成模块衔接预检：INT-08 的权威输入为 S5 `ready_to_release` 与固定来源/模板，S7 由服务端原子创建不可变产品；稳定 `deliveryId`、同 ID GET 恢复未知结果、`preparing` 不伪造百分比、`generation_failed` 只恢复同一产品，前端不推算或补造后端状态。
- 当前同步版本 `CURRENT v4-334`；后续按 v4.5 差量规则继续实现、测试和正式 React 证据，完成后只唤醒规划总线。

## 2026-08-15 — BACK-M3-07A Rev 3 规划微审通过并解锁 S7 前端

- 规划重读运行接线差量：正常 `backend/src/development.ts` 已启动 DeliveryWorker；`startServer` 支持显式注入 DeliveryStorage，开发入口把 Worker 绑定到已启动 API 的 `app.deliveryStorage`；独立 entry 不再静默创建不可共享的内存 fake。异常和信号关闭先 abort、等待 Worker settle，再关闭 API/数据库。
- 新鲜验证：deliveries 专项 `8/8`；backend typecheck、backend build、`check:repo` 与 `git diff --check` 通过，仅保留既有 `LOCAL_APP_PARITY.md` CRLF 提示。新增回归实际走 `startServer(port:0, storage) → API 创建 preparing → runDevelopmentDeliveryWorker → ready → 同一 API 下载`，原运行接线 P1 关闭。
- Rev 2 已冻结的创建身份/幂等、失败恢复、租约接管、对象完整性、来源/模板冻结继续成立；本轮没有改 contracts、迁移、S7 状态、生产前端、DESIGN 或真实云适配器。结论 P0/P1=0，`BACK-M3-07A Rev 3` 标记 done。
- `CURRENT.md` 从 v4-332 差量写为 v4-333，FIFO 136 已关闭并登记 FIFO 137；`FRONT-M3-07B Rev 1` 转 `ready / Current actor=前端开发对话 / Reviewer=UI 设计对话`。规划将主动唤醒前端并确认 permission_ok/运行态，用户无需传话。

## 2026-08-15 — BACK-M3-07A Rev 3 FIFO 136 规划送达确认

- 已按 v4.5 先写回状态与日志，再只唤醒规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c`；`read_thread` 已确认 FIFO 136 / `CURRENT v4-331` 交审消息进入规划最新 `userMessage`，规划线程状态为 `inProgress`。
- `CURRENT.md` 已最小递增为 v4-332，FIFO 136 关闭；`BACK-M3-07A Rev 3` 保持 `review / Current actor=规划对话 / Reviewer=规划对话`，后端停止修改。未通知 UI/前端，未解锁 `FRONT-M3-07B`。

## 2026-08-15 — BACK-M3-07A Rev 3 FIFO 135 实现完成并交规划审核

- 状态写回：`CURRENT.md` 从 v4-330 差量写为 v4-331；FIFO 135 关闭并登记 FIFO 136 `notification_pending`；`BACK-M3-07A Rev 3` 转 `review / Current actor=规划对话 / Reviewer=规划对话`。下一步只向规划固定任务交审，不通知 UI/前端，不解锁 `FRONT-M3-07B`。
- 开发入口：`backend/src/development.ts` 现在在正常 `pnpm dev` 入口启动 `DeliveryWorker`，并把 Worker 的 Storage 绑定到已启动 API 的 `app.deliveryStorage`；服务端支持显式注入 DeliveryStorage。
- 生命周期与关闭：DeliveryWorker 接收可选开发配置/稳定 workerId；独立 worker entry 不再创建隔离内存 fake，必须由 development 入口注入共享 Storage。开发入口在异常或信号退出时先 abort、等待全部 Worker settle，再关闭 API 与 Worker 数据库。
- 真实接线回归：`tests/backend/deliveries.test.ts` 新增真实 `startServer({ port: 0, deliveryStorage })` + `runDevelopmentDeliveryWorker` 流程，覆盖创建 `preparing` → Worker 生成 `ready` → 同一 API 下载字节；专项共 `8/8` 通过。
- 验证：backend typecheck、backend build、专项 `pnpm exec vitest run tests/backend/deliveries.test.ts --reporter=dot`、`pnpm check:repo`、`git diff --check` 均通过；保留既有 `docs/contracts/LOCAL_APP_PARITY.md` CRLF 提示。按边界未运行完整 `pnpm check`。
- 冻结/边界：未修改 contracts、迁移、S7 业务状态、生产前端或 DESIGN；未接真实云适配器、网络、密钥或付费；未提交、推送或部署。等待规划按 S7 合同、`INT-08` 与职责矩阵审核。

## 2026-08-15 — BACK-M3-07A Rev 3 FIFO 135 权限握手并领取

- 已完整重读 `qimao-terms-cloud/AGENTS.md`、`docs/WORKFLOW.md` v4.5、`docs/status/CURRENT.md` v4-329、开发日志顶部、S7 交付合同与 `MODULE_INTEGRATION_CONTRACTS.md` 的 `INT-08`；确认 Rev 2 主体通过事实冻结，本轮只处理开发运行入口接线。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT.md` 从 v4-329 差量写为 v4-330；FIFO 135 保持 `active`，`BACK-M3-07A Rev 3` 已进入 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。允许文件仅 `backend/src/development.ts`、`backend/src/server.ts`、必要的 delivery Worker/专项测试及状态/日志；不改 contracts、迁移、S7 状态、生产前端、DESIGN 或真实云适配器。

## 2026-08-15 — BACK-M3-07A Rev 2 规划微审退回开发运行链接线

- 规划新鲜复验确认 Rev 2 的数据库/API 主体成立：deliveries、subtitle-acceptance、terms、pre-review、screen-text 五个后端文件 `51/51`；contracts build、backend build、`check:repo` 与 `git diff --check` 通过。创建身份/幂等、失败恢复、租约接管、对象摘要校验和来源/模板冻结证据继续冻结。
- 唯一 P1 位于真实开发启动链：`backend/src/development.ts` 只启动 ASR、pre-review、screen-text Worker，没有启动新增 `DeliveryWorker`。因此正常 `pnpm dev` 创建产品后没有消费者，产品会持续停留在 `preparing`，正式 S7 前端无法完成成功转场或下载验收。
- 同源存储接线缺口：API 默认在 `createApp()` 内创建一份 `InMemoryDeliveryStorageFake`，独立 `delivery.worker.entry.ts` 又创建另一份进程内 fake；即使人工单独启动 Worker，写入对象也不在 API 所持实例中，API 下载会稳定判定对象缺失。现有后端测试把同一个 fake 同时注入 app 与 Worker，因而没有覆盖正常开发入口。
- FIFO 135 / `BACK-M3-07A Rev 3` 只允许：让开发入口启动 DeliveryWorker；API 与该 Worker 显式共享同一 DeliveryStorage 实例；保证 AbortSignal/关闭顺序；补一条从正常开发接线创建→Worker→ready→下载的回归。允许最小修改 `backend/src/development.ts`、`backend/src/server.ts`、必要的 delivery Worker/专项测试；不得改 contracts、迁移、S7 状态含义、生产前端、DESIGN 或真实云适配器。
- `CURRENT.md` 从 v4-328 差量写为 v4-329；任务转 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。规划将主动唤醒后端并确认 permission_ok/运行态；`FRONT-M3-07B` 继续 blocked，用户无需传话。

## 2026-08-15 — BACK-M3-07A Rev 2 FIFO 134 规划送达确认

- 已按 v4.5 先写回状态与日志，再只唤醒规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c`；`read_thread` 已确认 FIFO 134 / `CURRENT v4-327` 交审消息进入规划最新 `userMessage`，规划线程状态为 `inProgress`。
- `CURRENT.md` 已最小递增为 v4-328，FIFO 134 关闭；`BACK-M3-07A Rev 2` 保持 `review / Current actor=规划对话 / Reviewer=规划对话`，后端停止修改。未通知 UI/前端，未解锁 `FRONT-M3-07B`。

## 2026-08-15 — BACK-M3-07A Rev 2 FIFO 131 实现完成并交规划审核

- 状态写回：`CURRENT.md` 从 v4-326 差量写为 v4-327；FIFO 131 关闭并登记 FIFO 134 `notification_pending`；`BACK-M3-07A Rev 2` 转 `review / Current actor=规划对话 / Reviewer=规划对话`。下一步只向规划固定任务交审，不通知 UI/前端，不解锁 `FRONT-M3-07B`。
- 异步生命周期：创建事务原子固定 AcceptanceRelease、DeliveryProduct、DeliveryManifest，持久化 preparing Job/Attempt；注入式有界租约 Worker 生成对象并保护成功结果；失败持久化 `generation_failed + reason/requestId`，显式恢复沿用同一 deliveryId，不创建 V2，覆盖租约接管与重复恢复。
- 稳定身份与确认冻结：`deliveryId`、`sourceDigest`、`templateVersionId` 均为创建必填且在事务内核对；响应丢失可 GET 同一产品；同 ID/异键、同键/异 ID、模板切换或导出绑定变化稳定冲突并零副作用。
- 存储与隔离：新增 deliveries 专用 Storage 接口及零网络 in-memory fake；数据库只持久化 `objectKey/digest/size/metadata`，下载严格核对 deliveryId/fileId/projectId、摘要与大小，跨项目拒绝且不泄露 objectKey；清理未获授权的重复别名 routes，保留唯一正式 API。
- 关键文件：`packages/contracts/src/deliveries.ts`；`backend/migrations/1754976011001_add_delivery_async_storage.cjs`、`1754976011002_fix_delivery_object_key_constraint.cjs`；`backend/src/modules/deliveries/`；`backend/src/workers/delivery.worker.ts`、`delivery.worker.entry.ts`；`backend/src/app.ts`、`types/fastify.d.ts`；`tests/backend/deliveries.test.ts`。
- 验证：contracts build、backend typecheck/build、专项及直接依赖组合 `5 个测试文件 / 51/51` 通过；`pnpm check:repo` 通过；`git diff --check` 通过，仅保留既有 `docs/contracts/LOCAL_APP_PARITY.md` CRLF 提示；迁移已应用且再次检查为 `No migrations to run!`。按边界未运行完整 `pnpm check`。
- 边界：未修改生产前端/DESIGN/S5 状态机；未接真实 R2、网络、密钥或付费服务；未提交、推送或部署。等待规划按职责矩阵、`INT-08` 与 S7 合同审核。

## 2026-08-15 — FRONT-M3-05B Rev 3 规划最终微审通过并关闭 S5 前端

- v4.5 送达闭环已完成：规划先将审核结论写回 `CURRENT.md` v4-325 与本日志，再只向前端固定任务发送“通过并停止等待”通知；等待结果确认消息已送达，前端明确回执任务已 `done` 并进入空闲。最终把送达证据最小补记为 `CURRENT.md` v4-326；未通知 UI/后端，未提前解锁 `FRONT-M3-07B`。
- 规划只复验 FIFO 133 两个原失败场景并重读实现时序：模态内事件目标属于活动 `aria-modal` 时正常放行，输入框中文/空格及按钮表单操作不再被全局 handler 取消；事件来自模态外时只阻断会操作遮罩后工作台的已登记快捷键。
- 媒体清理身份已收敛为 sessionId/episodeNumber/selectedAssetId；session revision 只进入 pending 授权快照及返回校验，不再触发同一视频重置。切会话/剧集/Asset 仍执行完整清理，token、媒体身份或 revision 任一过期的成功/失败响应均不写入当前语境。
- 本轮新鲜验证：`pnpm exec vitest run tests/frontend/subtitle-acceptance.test.tsx --reporter=dot` 为 18/18；frontend typecheck 通过；Vite build 168 modules 通过，仅既有大 chunk 提示；Impeccable detector 为 `[]`；指定文件 `git diff --check` 通过。
- 结论 P0/P1=0。方案 A、S5 业务、`±40 ms`、1440/1024 与 S5→S7 入口证据冻结；不再发起第四轮。最终 AppShell/视口/UI 同状态终验与 `FRONT-M3-07B` 合并执行，完整 `pnpm check` 留 S5/S7 单次关闭门。
- `CURRENT.md` 从 v4-324 差量写为 v4-325，`FRONT-M3-05B Rev 3` 标记 done；`FRONT-M3-07B` 现在只等待 `BACK-M3-07A Rev 2` 通过规划审核。规划会通知前端原 Owner 停止等待，不要求用户传话。

## 2026-08-15 — FRONT-M3-05B Rev 3 FIFO 133 状态隔离最终微返工完成并交规划审核

1. 状态/权限：沿用已实测 `permission_ok`，工作区根为 `C:\Users\ComradeGu\Documents\七猫兼职`，仓库位于 workspace-write，普通编辑不走 auto_review；`CURRENT.md` 从 v4-323 差量写为 v4-324，FIFO 133 关闭，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`。
2. 模态输入：活动 `aria-modal=true` 内的 input/textarea/select/contenteditable 与按钮事件正常放行，中文、空格、复制粘贴、空格激活和表单提交不再被窗口级快捷键取消。
3. 后台隔离：模态外只拦截会操作遮罩后工作台的 Ctrl+N/Delete/Cut/Paste/Undo/Redo、Space、J/K/L、方向键；Tab/Escape 仍由活动焦点陷阱处理。
4. 媒体清理身份：`mediaIdentity` 只由 sessionId、episodeNumber、selectedAssetId 组成；同一视频的 session revision 增长不再触发 grant、进度或 playing 清理。
5. 授权快照：请求继续冻结 session/episode/revision/asset 语境；响应必须同时匹配 token、媒体身份和 revision，旧 revision 的 success/failure 丢弃并释放 pending 锁，不污染当前语境。
6. 回归：新增人工问题/返工中文空格输入与按钮提交、切 Asset/切集清媒体、同集保存 revision 增长保留视频、旧 revision 响应丢弃；字幕专项 `18/18` 通过。
7. 验证与边界：frontend typecheck 通过，Vite build 通过（仅既有 chunk size warning），`git diff --check` 通过（保留既有 `LOCAL_APP_PARITY.md` CRLF 提示）；本轮仅修改 `SubtitleAcceptanceWorkspace.tsx` 与专项测试，未改 CSS/API/backend/contracts/DESIGN/S7。
8. 证据/交接：方案 A、±40 ms、S5/S7 入口、1440/1024 与既有浏览器证据冻结；不拆组件、不运行完整 `pnpm check`，未提交/推送/部署。已先写回状态/日志，下一步只唤醒规划固定任务。

## 2026-08-15 — FRONT-M3-05B Rev 2 规划微审退回最终状态隔离修正

- 规划按微返工快车道新鲜运行字幕专项 `15/15`、前端 typecheck、Vite build、Impeccable detector `[]` 与 `git diff --check`；Rev 2 的令牌、请求锁、切会话/剧集清媒体和 `±40 ms` 方向成立，既有视觉/业务证据继续冻结。
- P1 模态输入回归：窗口 keydown 在检查 `isInputTarget` 之前，只要存在 `aria-modal=true` 就对 Tab/Escape 之外所有按键 `preventDefault`。因此人工问题、返工等模态内 textarea/input 的中文、字母、空格和编辑键都会被取消；按钮空格激活也被阻断。修正必须区分“模态内正常交互”和“会落到后台工作台的快捷键”，不能全键封锁。
- P1 媒体身份过宽：`mediaIdentity` 纳入整个 session revision，任何字幕保存/问题处理导致 revision 增长都会执行 `resetMediaState`，清除同一视频的 grant、进度和播放状态，迫使员工反复获取授权。播放器清理身份应只含 session/episode/Asset；revision 只保留在 pending 授权请求快照中，用于拒绝晚到旧响应。
- 两项均源自 Rev 2 新增的状态隔离逻辑，合并为 FIFO 133 / `FRONT-M3-05B Rev 3` 最终微返工；不重跑完整矩阵，不扩大到 CSS、后端、契约、S7 或代码拆分。
- `CURRENT.md` 从 v4-321 差量写为 v4-322；任务转 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。规划将主动唤醒前端并确认 permission_ok/运行态，用户无需传话。

## 2026-08-15 — FRONT-M3-05B Rev 2 FIFO 132 播放器状态微返工完成并交规划审核

1. 状态/权限：已按 v4.5 在 `CURRENT.md` v4-320 基础上差量写为 v4-321；FIFO 132 关闭，`FRONT-M3-05B Rev 2` 转 `review / Current actor=规划对话 / Reviewer=规划对话`。`permission_ok` 持续有效：工作区根为 `C:\Users\ComradeGu\Documents\七猫兼职`，仓库位于 workspace-write，普通编辑不走 auto_review。
2. 媒体身份：新增媒体身份快照（sessionId、episode、session revision、selected asset）与最新身份引用；会话/剧集/选中视频或修订变化时暂停并清理旧 grant、错误、失败、时长、进度和 playing。
3. 授权并发：播放授权请求冻结当前身份，使用一次性本地请求 token 与 active 锁；请求中按钮锁定，旧成功/失败响应在 token 或身份不匹配时丢弃，不写入新语境。
4. 模态隔离：窗口级快捷键在任意 `aria-modal="true"` 存在时全部早退；除 Tab/Escape 交给活动焦点陷阱外，Ctrl+N/Delete/Cut/Paste/Undo/Redo、空格、J/K/L 和方向键均 `preventDefault` 且无副作用。
5. 时间精度：播放器按钮由伪 `±1 帧` 改为诚实 `±40 ms`，位移仍固定 40ms；未改后端、迁移或共享契约字段。
6. 回归：新增会话切换清媒体、乱序授权只接受当前身份、模态快捷键零副作用、40ms 文案/位移 DOM 回归；字幕专项 `15/15` 通过。
7. 验证与边界：前端 `typecheck` 通过，Vite 生产构建通过（仅既有 chunk size warning），`git diff --check` 通过（保留既有 `LOCAL_APP_PARITY.md` CRLF 提示）；本轮仅修改 `frontend/src/features/subtitle-acceptance/SubtitleAcceptanceWorkspace.tsx` 与 `tests/frontend/subtitle-acceptance.test.tsx`，无 CSS、backend、contracts、DESIGN 或 S7 改动。
8. 证据/健康：既有 1440/1024、方案 A、S5 业务、S5→S7 入口和浏览器证据冻结；本轮仅复验变化场景，1561 行 TSX/967 行 CSS cleanup 继续后置；未提交、推送、部署。已先写回状态/日志，下一步只唤醒规划固定任务。

## 2026-08-15 — FRONT-M3-05B Rev 2 FIFO 132 权限握手并领取

- 已完整重读 `qimao-terms-cloud/AGENTS.md`、`docs/WORKFLOW.md` v4.5、`docs/status/CURRENT.md` v4-319 第 6 节及开发日志顶部；确认本轮只处理播放器身份、模态快捷键隔离与 40ms 文案，不重做布局、S5 业务、S5→S7 入口或完整矩阵。
- `permission_ok`：工作区根包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`qimao-terms-cloud` 位于 `workspace-write/:workspace` 且目录可写；普通仓库内编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT.md` 从 v4-319 差量写为 v4-320；FIFO 132 保持 `active`，`FRONT-M3-05B Rev 2` 已领取并进入 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。未增加 Rev 以外的任务范围。

## 2026-08-15 — FRONT-M3-05B Rev 1 规划独立审核退回播放器状态微返工

- 规划重读正式 React、专项回归和 FIFO 129 三张证据，并按 Impeccable 审计流程运行一次检测（`[]`）。既有方案 A 信息结构、S5→S7 唯一入口、只读/脏态门、预检身份、9:16 `contain`、双安全区、1440/1024 布局和已通过业务证据冻结，不重做完整矩阵。
- P1 媒体身份串线：`playback` 只在手动换视频成功时清除；切会话或切剧集不会暂停/清除旧播放授权、旧时长、旧进度和旧错误。`requestPlayback` 也没有冻结 session/episode/revision/asset 身份或请求 token，旧请求晚到时会把上一集 URL 写入当前集，重复点击还可并行发出多个授权请求。
- P1 模态快捷键穿透：窗口级 keydown 只排除输入控件，没有检查活动 `aria-modal=true`。打开预检、删除、轨道选择、人工问题或返工弹窗后，Ctrl+N/Delete/Cut/Paste/Undo/Redo、空格、J/K/L、方向键仍可操作遮罩后的工作台，破坏模态所有权和提交中锁定。
- P1 伪逐帧：按钮与方向键把固定 40ms 标为 `±1 帧`，但当前播放授权/Asset 契约没有权威 fps；只有 25fps 才等价。首版不扩大后端契约，改为诚实的 `±40 ms`，可信帧率能力另行规划。
- 上述三组同源缺口合并为 FIFO 132 / `FRONT-M3-05B Rev 2` 一次微返工；精确允许范围为字幕验收 TSX、专项测试及必要的最小 CSS，不改 S7、后端、迁移、共享契约或 DESIGN。当前 1561 行 TSX/967 行 CSS 的代码健康拆分继续后置，不与本次状态修正混做。
- `CURRENT.md` 从 v4-318 差量写回 v4-319；FIFO 129 关闭、FIFO 132 转 active，任务转 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。规划随后只唤醒前端固定任务并确认送达/运行态，用户无需传话。

## 2026-08-15 — FRONT-M3-05B Rev 1 FIFO 129 五项 S5 差量收口并交规划审核

1. 任务/状态：按规划恢复同一 `FRONT-M3-05B Rev 1`，`permission_ok` 已实测；`CURRENT.md` 从最新 v4-317 差量写为 v4-318，FIFO 129 转 `review`，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`。本轮未增加 Rev。
2. 发布链：移除字幕工作台直接发布/冻结/下载；最近一次成功同步只读 preflight 抽屉展示会话修订、来源版本、通过/阻断集数和结果身份，并只提供 `/projects/:projectId/deliveries/confirm?sessionId=...` 下一步。S7 确认页、产品库、详情及 deliveries API 未实现。
3. 统一门禁与并发：脏态/保存中/命令 pending/历史只读状态统一拦截 Ctrl+N、Delete、粘贴、切会话、切集和返回项目；preflight 打开时冻结 sessionId，loading/重试不重复 GET，切会话后的旧响应丢弃，一键通过校验当前会话、可写、已保存且无命令提交。
4. 模态焦点：preflight、删除、轨道选择、人工问题、返工加入安全初始焦点、Tab/Shift+Tab 闭环、非提交 Escape/遮罩关闭回原触发点、提交中锁定和失败安全焦点；专项 DOM 回归覆盖初始焦点、双向循环及恢复。
5. 媒体与布局：正式 React 采用方案 A 与现有 AppShell；9:16 `object-fit:contain` 主场景，画面字上方/台词下方安全区，增加播放/暂停、进度/时间、音量/静音、0.75/1/1.25/1.5/2 倍速、逐帧、前后 1 秒、全屏/放大。真实本地 Fastify/PostgreSQL 会话浏览器证据：1440 主区 1236、三栏 220/690/326，无根横溢；1024 收起侧栏后主区 952、三栏 182/500/270，无根横溢；媒体授权失败忠实呈现来源不可用与 requestId，不伪造播放。
6. 精确改动：生产 `frontend/src/features/subtitle-acceptance/SubtitleAcceptanceWorkspace.tsx`、`.module.css`，回归 `tests/frontend/subtitle-acceptance.test.tsx`；状态/日志仅作本交接写回。未修改 backend、迁移、packages/contracts、DESIGN 或 S7 文件。
7. 验证：字幕专项 `12/12`；全部前端 `10 files / 100 tests`；frontend TypeScript `tsc --noEmit` 通过；Vite 生产构建通过（仅既有 chunk size warning）；Impeccable 定向检测 `[]`；`git diff --check` 通过（保留既有 `LOCAL_APP_PARITY.md` CRLF 提示）。完整 `pnpm check` 按 S5/S7 关闭门未运行。
8. 证据/健康/边界：浏览器截图保存于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-1c71-72d3-9171-33ad2c36e941\front-m3-05b-fifo129-evidence\layout-1440.png`、`layout-1024.png`、`preflight-1280.png`；组件当前约 1561 行、CSS 967 行，按规划要求登记为 S5 后行为无关 cleanup，后续最小方案为抽出纯展示面板与状态 hook 但不改变唯一状态源。本轮未提交、推送、部署或通知 UI/后端；下一步只等待规划终审。

## 2026-08-15 — BACK-M3-07A Rev 2 FIFO 131 权限握手并领取

- 已完整重读 `qimao-terms-cloud/AGENTS.md`、`docs/WORKFLOW.md` v4.5、`docs/status/CURRENT.md` v4-316、S7 交付合同、`MODULE_INTEGRATION_CONTRACTS.md` 的 `INT-08` 与开发日志顶部，并核对既有 deliveries 契约、迁移、后端模块和专项测试。
- `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，业务仓库处于 `workspace-write/:workspace` 可写范围；普通仓库编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT.md` 从 v4-316 差量写为 v4-317；FIFO 131 转 `active`，`BACK-M3-07A Rev 2` 转 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。
- 本轮严格限制在 deliveries 共享契约导出、必要增量迁移、backend deliveries/app/worker entry、`tests/backend/deliveries.test.ts` 及状态/日志；不改生产前端/DESIGN/S5 状态机，不接真实 R2、网络、密钥、付费，不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-15 — BACK-M3-07A Rev 1 规划交叉审核退回

- 规划没有按后端自报结果放行。新鲜重读共享契约、迁移、routes/service/repository 和专项测试，并运行 contracts build、backend typecheck、`git diff --check`；构建通过，但发现四组直接违反 `INT-08` 和已确认 UI 状态的数据完整性 P1。
- P1-1 异步生命周期是伪状态：创建在单个数据库事务内同步生成全部 XLSX/SRT、写文件并立即把 product/attempt 更新为 ready；任何生成异常都会回滚整条产品记录。现有 API 没有可持久读取的 preparing、generation_failed、租约 Worker 或“恢复同一产品”命令，UI 的生成中、失败恢复和刷新恢复无法消费真实事实。
- P1-2 未知恢复身份不稳定：`CreateDeliveryBody.deliveryId` 被声明为 optional，仓储缺省时服务端随机生成。若响应在落库后丢失，浏览器没有已知 deliveryId 可只读恢复，违背“只 POST 一次、按同一预生成 ID GET”的硬门。
- P1-3 存储和项目隔离越界：正式文件字节直接写入 PostgreSQL `bytea`，没有本轮要求的零网络 Storage adapter / object key 路径；项目级文件下载 route 虽带 projectId，handler 却丢弃该参数并按全局 deliveryId/fileId 读取，跨项目路径不能证明隔离。
- P1-4 确认来源未完整冻结：确认读取与生成分别重新选择术语模板，创建请求只提交 session revision，没有提交/校验确认时的 sourceDigest 与 templateVersionId；模板启用或绑定在两次请求间变化时，生成文件可能与员工刚确认的版本不同。现有三条专项回归也没有覆盖生成失败/恢复、响应丢失、跨项目下载、模板切换、列表查询和新修订历史稳定。
- 规划把上述同源缺口合并为 FIFO 131 / `BACK-M3-07A Rev 2` 一次返工：要求持久化生成 Job/Attempt 与有界租约 Worker、同一产品失败恢复；deliveryId 必填；用注入式零网络 Storage fake 保存不可变字节并严格校验项目归属；创建显式冻结 sourceDigest/templateVersionId。别名 API 与未使用分支不得继续扩张。`CURRENT.md` 最小递增为 v4-316；`FRONT-M3-07B` 继续 blocked，`FRONT-M3-05B` 不受影响继续执行。

## 2026-08-15 — BACK-M3-07A Rev 1 FIFO 130 规划送达确认

- 已按 v4.5 规则只唤醒规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知 UI/前端；`read_thread` 已确认 FIFO 130 / `CURRENT v4-314` 完整交审消息成为规划最新 `userMessage`，规划线程状态为 `inProgress`。
- `CURRENT.md` 已最小递增为 v4-315，FIFO 130 关闭；`BACK-M3-07A Rev 1` 保持 `review / Current actor=规划对话 / Reviewer=规划对话`，后端停止修改，等待规划按 INT-08、S7 合同与职责矩阵审核。

## 2026-08-15 — BACK-M3-07A Rev 1 FIFO 128 实现完成并交规划审核

- 状态写回：`CURRENT.md` 从 v4-313 差量写为 v4-314；FIFO 128 关闭并登记 FIFO 130 `notification_pending`；`BACK-M3-07A Rev 1` 转 `review / Current actor=规划对话 / Reviewer=规划对话`。下一步只向规划固定任务交审，不通知 UI/前端，不解锁 `FRONT-M3-07B`。
- 共享契约与持久化：新增 `packages/contracts/src/deliveries.ts` 并从 contracts index 导出；新增 `backend/migrations/1754976011000_create_delivery_products.cjs`，建立 delivery product、manifest、immutable files/events、attempts 与 idempotency 命令表。迁移已通过 `node backend/dist/database/migrate.js` 应用；`pnpm ... db:migrate` 的已知宿主 `uv_os_get_passwd ENOMEM` 不记为业务失败。
- 权威后端：新增 `backend/src/modules/deliveries/` repository/service/routes/domain/errors，并在 `backend/src/app.ts` 注册；实现确认阻断、全会话通过归约、来源快照/版本 stale 检查、一次幂等生成、确定性 dialogue/screen_text SRT（含无画面字 UTF-8 BOM 空轨）、绑定术语 XLSX、项目/全局列表、详情、只读下载与元数据更新。
- 回归证据：`pnpm --filter @qimao-terms-cloud/contracts run build` 通过；`pnpm --filter @qimao-terms-cloud/backend run typecheck` 与 `run build` 通过；`pnpm exec vitest run tests/backend/deliveries.test.ts tests/backend/subtitle-acceptance.test.ts tests/backend/terms.test.ts tests/backend/pre-review.test.ts tests/backend/screen-text.test.ts --reporter=dot` 为 5 文件 47/47；`pnpm check:repo` 通过；`git diff --check` 仅保留既有 `LOCAL_APP_PARITY.md` CRLF 提示。完整 `pnpm check` 按 S5/S7 关闭门未运行。
- 边界：未修改生产前端/DESIGN、既有 S5 状态机或无关迁移；未接真实云资源、服务、网络、密钥、付费；未提交、推送或部署。等待规划按 `INT-08` 与 S7 合同做交叉审核。

## 2026-08-15 — BACK-M3-07A Rev 1 FIFO 128 权限握手并领取

- 已重读 `qimao-terms-cloud/AGENTS.md`、`docs/WORKFLOW.md` v4.5、`docs/status/CURRENT.md` v4-311、`docs/contracts/M3-delivery-product-workflow.md`、`MODULE_INTEGRATION_CONTRACTS.md` 的 `INT-08`、`MODULE_RESPONSIBILITY_MATRIX.md` 的 S5/S7 行、`DESIGN.md` 2.1/2.2/5.8/5.9、M3 里程碑与产品路线图，并核对现有后端入口、共享契约和测试边界。
- `permission_ok`：工作区根包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围，普通仓库内编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT.md` 从 v4-312 差量写为 v4-313；FIFO 128 转 `active`，`BACK-M3-07A Rev 1` 转 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。本轮交付边界为 deliveries 共享契约、迁移、权威后端、确定性文件生成/读取与后端回归；不改生产前端/DESIGN，不接真实云资源、网络、密钥、付费、提交、推送或部署。

## 2026-08-15 — FRONT-M3-05B Rev 1 FIFO 129 恢复领取

- 已重读 `qimao-terms-cloud/AGENTS.md`、`docs/WORKFLOW.md` v4.5、`docs/status/CURRENT.md` v4-311、第 6 节五项差量、`M3-subtitle-acceptance-workbench.md`、`DESIGN.md` 5.8/5.9、`docs/ui/M3-subtitle-acceptance.md`、`docs/ui/M3-delivery-product-acceptance.md`、现有字幕验收生产代码与专项测试，并确认本轮只沿用户已确认的 S5→S7 一站式产品流收口。
- permission_ok：工作区根包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`qimao-terms-cloud` 位于 `workspace-write/:workspace`，普通仓库内编辑直接使用工作区写入，不走 `auto_review`。
- `CURRENT.md` 从 v4-311 差量写为 v4-312；FIFO 129 转 `active`，`FRONT-M3-05B Rev 1` 转 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。本轮只修改 `frontend/src/features/subtitle-acceptance/`、对应 `tests/frontend/subtitle-acceptance.test.tsx` 及状态/日志；不实现 S7 确认页、产品库、详情或 deliveries API，不改 backend/迁移/packages/contracts/DESIGN，不提交推送部署。

## 2026-08-15 — UI-M3-07 Rev 2 四项定向微返工完成并交规划

1. 任务/状态：FIFO 126 已按规划定向退审完成一次微返工；`CURRENT.md` 从 v4-307 最小递增为 v4-308，FIFO 126 关闭并登记 FIFO 127 `notification_pending`。`UI-M3-07 Rev 2` 转 `review / Current actor=规划对话 / Reviewer=规划对话`；`FRONT-M3-05B` 继续 blocked，不通知或解锁前后端。
2. 焦点变化：确认对话框的 `Tab` 处理改为基于当前焦点索引显式前进/后退。真实浏览器稳定 300ms 后为“安全返回”；实测安全返回 `Tab→确认生成`、确认生成 `Tab→安全返回`、确认生成 `Shift+Tab→安全返回`、安全返回 `Shift+Tab→确认生成`，`Escape` 关闭并返回“生成交付产品”。
3. 信息架构变化：确认、`preparing`、未知、失败、成功、产品库和详情七种 S7 页面语境均且只高亮全局“交付产品库”，当前项统一设置 `aria-current="page"`。项目面包屑和“返回继续修改”保留，不再影响全局模块归属。
4. 文案/身份变化：员工界面改为“确认来源版本和文件清单”“当前已确认来源”“确认验收内容与来源”“生成后文件不可修改；需修改请创建修订”；隐藏通过签名、freeze 与 AcceptanceRelease。产品库五行匿名短 ID 改为稳定且不同的 `dlv_7A8C / dlv_4F2K / dlv_9D5M / dlv_2B6R / dlv_8H3Q`。
5. 精确路径：同步更新 `DESIGN.md` 5.9、`docs/ui/M3-delivery-product-acceptance.md` 和仓库外 `ui-m3-07-delivery-product/index.html`；Rev 2 覆盖 `delivery-confirm-1440.png`、`delivery-confirm-dialog-1440.png`、`delivery-success-1440.png`、`delivery-library-1440.png`、`delivery-library-1024.png`。其余截图及 Rev 1 已通过的 12 张证据结论冻结。
6. 定向验证：浏览器 `warn/error=0`；1440 产品库根宽 `1440/1440`；1024 产品库根宽 `1024/1024`、主区 `952/952`、表格容器/表格 `914/1040`，只在表格内横滚；导航 active/aria-current 七态均为交付产品库；匿名短 ID 数量/去重数 `5/5`。最终截图已逐张目检，未发现根横溢或布局/视觉回归。
7. 冻结与边界：Rev 1 的整体产品流、每集双 SRT/空轨、未知/失败恢复、成功转场、详情、loading/empty/error、双视口与既有键盘通过项未重做；未修改或启动生产 frontend/backend、测试、迁移或 `packages/contracts`，未接真实云资源/API/密钥/付费，未提交、推送或部署。
8. 下一步：按 v4.5 只向规划固定任务发送八项差量包并确认送达；规划只复验上述四项变化场景，之后再路由用户最终体验/验收。UI 不直接通知前端或后端，不自行恢复 S5/S7 开发。
- v4.5 送达闭环完成：八项差量包只发送至规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c`；`read_thread` 确认 FIFO 127 / v4-308 已成为规划任务最新 `userMessage`，任务状态为 `inProgress`。`CURRENT.md` 最小递增为 v4-309 并关闭 FIFO 127；UI 停止修改，未通知前端或后端，`FRONT-M3-05B` 继续 blocked。

## 2026-08-15 — UI-M3-07 Rev 1 规划独立审核定向退回

- 规划没有直接采信 UI 自报 `ship`，按 Product Design 审查流程在本轮重新启动本地原型，以 1440×900 与 1024×768 实际走通“确认 → 受保护确认 → preparing/unknown/failure/ready → 自动进入详情 → 全局产品库”，并把新鲜截图保存到规划仓库外 `planning-audit-ui-m3-07/`。确认页、空画面字文件、同一 deliveryId 恢复、成功转场、详情文件树、产品库状态和 1024 表格内滚均成立；根宽实测 1024/1024、表格容器 914→1040，控制台 warn/error 为 0。
- P1：确认弹窗打开并稳定 250ms 后真实键盘结果为“安全返回”获焦；正向 Tab 仍停在“安全返回”，Shift+Tab 才到“确认生成”，说明正向焦点循环没有成立。Escape 可关闭并恢复“生成交付产品”。必须改为两个动作正反向都可达，并验证首项 Tab→末项、末项 Shift+Tab→首项、边界闭环。
- P1/P2 同源信息架构与文案：确认、生成中、未知、失败和成功均错误高亮全局“项目中心”，且导航缺少 `aria-current=page`；S7 页面应统一高亮“交付产品库”。确认页/确认弹窗仍对员工显示“冻结来源”和内部“通过签名”，违反员工无需理解冻结的已确认口径，应改为“已确认来源版本/来源版本和文件清单”，隐藏内部签名。产品库五行匿名样例短 ID 全部显示同一 `dlv_7A8`，需改为不同值或移除，避免伪造重复身份。
- 以上合并为 FIFO 126 `UI-M3-07 Rev 2` 一次微返工。Rev 1 页面结构、视觉、业务状态、空轨、失败恢复、自动转场、1440/1024 与文档合同全部冻结；不得重做布局或增加功能，不修改生产前后端、迁移、contracts，不解锁 FRONT/BACK。规划已主动发送定向退审，`wait_threads` 确认 UI 固定任务进入 `inProgress`；CURRENT 最小递增为 v4-307，FIFO 126 转 active，用户无需传话。

## 2026-08-15 — UI-M3-07 Rev 1 v4.5 规划交接送达闭环

- 状态已写回：`CURRENT.md` v4-304 已将任务转 `review / Current actor=规划对话 / Reviewer=用户`，FIFO 125 登记为 UI→规划交审；本次送达确认后最小递增为 v4-305 并关闭 FIFO 125。
- 唤醒已发送：只向规划固定任务 `019ff4f8-4a77-7870-8edf-6350490b316c` 发送 v4.5 八项差量包；未通知用户开始验收，未通知或解锁前端、后端。
- 送达/运行态已确认：`read_thread` 读取到 FIFO 125 / v4-304 完整交审消息已成为规划任务最新 userMessage，规划任务状态为 `inProgress`。UI 停止修改，等待规划审核与后续用户验收路由；`FRONT-M3-05B` 继续 blocked。

## 2026-08-15 — UI-M3-07 Rev 1 同一交付产品原型完成并交规划

1. 任务/状态：`UI-M3-07 Rev 1` 已完成，`CURRENT.md` 从 v4-303 最小递增为 v4-304；FIFO 124 关闭，登记 FIFO 125 `notification_pending`，任务转 `review / Current actor=规划对话 / Reviewer=用户`。规划审核前不直接通知用户或前后端，不解锁 `FRONT-M3-05B`。
2. 本轮变化：同一仓库外原型贯通完整确认、受保护生成确认、`preparing`、网络未知、`generation_failed`、成功转场、只读产品详情和全局产品库；产品库另覆盖 loading/empty/error 与 `preparing/ready/generation_failed/recycled`。未知只查询同一 `deliveryId`，失败只恢复同一产品和文件清单，成功标题获焦且倒计时可取消、不抢焦点。
3. 文件事实：每集在确认逐集表和详情文件树中始终同时显示台词/画面字两份 SRT；第 2/4/6/8 集匿名画面字示例明确为“空轨文件 / 0 条 · UTF-8 BOM”，没有隐藏或表现为漏文件。产品详情另显示术语 XLSX、单独下载/下载全部、来源、负责人、备注、创建/更新时间、requestId、deliveryId 和历史事件。
4. 精确路径：权威设计更新 `DESIGN.md` 5.9；新增 `docs/ui/M3-delivery-product-acceptance.md`；原型与 12 张证据位于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\ui-m3-07-delivery-product`。右上页面切换器和状态演示按钮仅为验收工具，不进入生产。
5. 双视口：1440 使用展开 AppShell `204px`；确认/详情主区无根横溢，产品库根 `1440/1440`。1024 使用收起 AppShell `72px`；产品库主区 `952/952`、根 `1024/1024`，表格容器/表格 `914/1040` 只内部横滚；详情主/侧栏约 `589/303px`，确认身份约 `466/382px`、来源单列约 `872px`。
6. 焦点与状态证据：生成确认初始焦点“安全返回”，`Shift+Tab` 到确认、确认后 `Tab` 回安全返回，`Escape` 关闭后回“生成交付产品”；成功状态活动元素为 `#successTitle`。网络未知显示同一 `deliveryId`；失败同时显示原因、requestId、同一 deliveryId 和唯一恢复。浏览器 `warn/error=0`。
7. Impeccable：检测仅运行一次，因 HTML 解析模块缺失降级正则；唯一机械提示为错误块 3px 侧边线，已改为顶部边界且未重跑检测。固定对话协议不启用隐藏子代理，按 degraded finish-reviewer 同线程独立审查；首轮 `disposition: fix` 的 Unicode 导航与未令牌化滚动条均已修正并覆盖同名证据，最终 `disposition: ship`。
8. 边界/验证：`git diff --check -- DESIGN.md docs/status/CURRENT.md docs/logs/DEVELOPMENT_LOG.md` 退出码 0；关键文案和全部证据文件存在。未修改或启动生产 frontend/backend、测试、迁移或 `packages/contracts`，未接网络、真实云资源/API/密钥/付费，未提交、推送或部署；职责为 S5→S7 交付确认与产品库，衔接卡为 `INT-08`。

## 2026-08-15 — UI-M3-07 Rev 1 权限握手并正式领取

- UI 固定任务已完整重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.5、最新 `CURRENT.md`、开发日志顶部、S7 交付合同、`INT-08`、职责矩阵 S5/S7、`DESIGN.md` 2.1/2.2/5.8/5.9 与现有字幕验收 UI 验收文档。
- `permission_ok` 实测：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围，普通仓库内编辑直接使用工作区写入，不走 `auto_review`。`CURRENT.md` 从 v4-302 最小递增为 v4-303；`UI-M3-07 Rev 1` 保持 `in_progress / Current actor=UI 设计对话 / Reviewer=用户`。
- 模块衔接预检已完成：上游只消费 S5 `ready_to_release` 会话、冻结来源与术语/模板版本；S7 由 PostgreSQL 拥有产品、清单、Attempt 和状态，未知只查询同一预生成 `deliveryId`，失败恢复同一产品，上游变化不得覆盖历史交付；返回路径为确认页回字幕验收，生成成功后进入产品详情，全局产品库不在项目二级导航复制。
- 本轮只在既有 AppShell、`#4458D8` 和成熟紧凑内部工作台语言内，用同一仓库外匿名原型贯通确认、生成中/未知/失败/成功、详情和产品库，并提供 1440×900、1024×768 与焦点/键盘证据。允许修改仅限 `DESIGN.md` 相关补充、`docs/ui/M3-delivery-product-acceptance.md`、CURRENT/日志及仓库外原型/证据；不修改生产前后端、迁移、测试或共享契约，不接真实资源，不启动 FRONT/BACK，不提交、推送或部署。

## 2026-08-15 — PLAN-M3-07 冻结 S5→S7 一站式交付产品流

- 用户确认字幕验收完成后不再返回本地修改软件，也不再让员工单独执行“冻结”。新主链固定为“视频字幕验收就绪 → 独立完整交付确认页 → 一次幂等生成 → 成功页 → 全局交付产品库 / 产品详情”；后台仍由同一事务固定不可变 `AcceptanceRelease`，保证旧产品不被后续修改覆盖。
- 新增 `docs/contracts/M3-delivery-product-workflow.md`，同步更新 `PRODUCT.md`、`DESIGN.md`、`docs/architecture.md`、`MODULE_INTEGRATION_CONTRACTS.md`、`MODULE_RESPONSIBILITY_MATRIX.md`、M3 里程碑和完整产品路线图。`INT-08` 现明确一次命令形成 `AcceptanceRelease + DeliveryProduct + DeliveryManifest`，网络未知只读取同一预生成 `deliveryId`。
- 正式文件固定为每集一份台词 SRT、每集一份画面字 SRT 和整剧一个术语 XLSX；某集或整剧没有画面字时仍生成 UTF-8 BOM 合法空 SRT，并在确认/详情标记“空轨文件 / 0 条”。顶层产品按 `剧名-Vn` 版本化，内部不重复嵌套版本目录。
- 全局新增与项目中心/任务中心同级的“交付产品库”：服务端搜索/筛选/排序/分页，显示产品、项目、版本、状态、文件摘要、负责人、备注、创建/更新时间；详情提供三类文件树、下载、来源、requestId 和历史事件。文件不可变，备注等元数据可更新，内容修改必须创建 V2。
- `CURRENT.md` 先递增为 v4-301，登记 `PLAN-M3-07 done` 与 FIFO 124 `UI-M3-07 ready`；随后规划已向 UI 固定任务主动发送正式派发，`wait_threads` 确认消息送达且进入 `inProgress`，CURRENT 最小递增为 v4-302、FIFO 124 转 active。`FRONT-M3-05B Rev 1` 继续 blocked 并保留既有代码/证据，UI 冻结前不猜测入口、不重写生产代码；后端与前端暂不启动。

## 2026-08-15 — FRONT-M3-05B Rev 1 FIFO 123 即时暂停

- 规划收到用户对 S5→S7 产品流的重新冻结请求：旧“冻结后返回另一本地修改软件再统一导出”的理解可能改为云端验收台预检通过后直接原子创建不可变 `AcceptanceRelease` 与交付草稿（台词 SRT、画面字 SRT、术语 XLSX），员工不再单独理解/执行冻结，也不返回另一个软件。
- 按暂停边界立即停止 FRONT-M3-05B Rev 1 的发布/交付相关生产修改，以及竖屏播放器、焦点、只读快捷键等受当前复核影响的 UI 收口；保留已完成代码、测试和只读分析，不回滚、不清理、不提交。
- `CURRENT.md` 更新为 v4-300 活跃快照：FIFO 123 转 `blocked`；`FRONT-M3-05B` 转 `blocked`，`Current actor=规划对话`、`Reviewer=用户`；阻塞原因仅为“S5→S7 产品流重新冻结”，不增加 Rev、不判业务失败。实际生产文件修改数：0。

## 2026-08-15 — FRONT-M3-05B Rev 1 规划独立审核退回

- 用户在规划审核期间补充正式媒体口径：短剧以竖屏为主，画面必须保持足够可读尺寸；新增画面字默认叠在上方安全区、台词在下方安全区；播放器要具备成熟视频网站的播放/暂停、进度、时间、音量、倍速、逐帧、前后 1 秒和全屏/放大。规划已把该口径写入 `DESIGN.md` 5.8、UI 验收 MEDIA-02–04 和 FIFO 123，同本轮一次收口，不另开返工轮次。
- 规划没有把前端自报结论直接视为通过。新鲜复跑 `pnpm exec vitest run tests/frontend/subtitle-acceptance.test.tsx --reporter=dot`，结果 1 文件 7/7；随后逐项对照 `DESIGN.md` 5.8、`docs/ui/M3-subtitle-acceptance.md`、S5 工作台契约、生产 TSX 与专项测试，确认测试绿色但缺少四组冻结行为覆盖。
- P1-1 发布链不一致：权威设计要求发布入口只在成功 preflight 抽屉中出现，并经过受保护确认列明会话修订、来源版本、通过/阻断集数和不可变结果；生产页仍在抽屉外直接调用发布，preflight 抽屉没有发布确认。
- P1-2 只读/脏态门不完整：`released/stale/blocked/preflighting` 或保存/命令进行中时，页面按钮大多被锁，但全局 `Ctrl+N`/`Delete` 仍可打开写入弹窗，会话和项目导航也未统一消费同一脏态离开门；这会造成历史态伪可执行或未保存草稿被静默切走。
- P1-3 模态焦点契约缺失：preflight 抽屉、删除、目标轨道、人工问题、返工及未来发布确认均未实现统一初始安全焦点、Tab/Shift+Tab 闭环、非提交 Escape/遮罩关闭与触发点恢复；专项测试也没有任何 Tab/Escape 回归，不能把截图或单次焦点回落替代完整键盘门。
- P1-4 preflight 身份/并发门缺失：读取没有冻结打开时的 sessionId，也没有阻止 loading 期间重复触发；切换会话后的旧响应可能被用于当前会话。一键通过仅检查有成功结果和集合非空，没有同时校验当前同一会话、可写状态、无脏草稿和非提交中。
- 视觉证据能够证明 1440/1024 根宽、三栏和 released 基础按钮禁用，但不能推翻上述代码级状态/交互缺口。规划把 FIFO 122 关闭为退审，登记 FIFO 123，由前端同一 Rev 一次性最小收口并补 DOM 回归；其他已通过业务、样式和浏览器证据冻结，不提前路由 UI，不运行完整 `pnpm check`。
- 代码健康单列：`SubtitleAcceptanceWorkspace.tsx` 1241 行、CSS 894 行违反长期可维护目标，但当前先不与 P1 功能修正混写；S5 功能关闭后另设无行为 cleanup，拆出展示面板与状态 hooks，再复验受影响场景。

## 2026-08-15 — FRONT-M3-05B Rev 1 正式 React 完成并交规划

1. 任务/版本：同一 `FRONT-M3-05B Rev 1`、FIFO 122 完成正式 React 实现，不新开 Rev；`CURRENT.md` 从 v4-297 差量写为 v4-298，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，只通知规划，不直接通知 UI/后端。
2. 变化事实：落地 `/projects/:projectId/subtitle-acceptance` 与 `project-subtitle-acceptance`，只采用方案 A“时间轴主导的均衡三栏”；项目中心保持唯一跨项目选择器，工作台只返回/切换项目并消费当前 `projectId`。实现恢复唯一当前可写会话、选择 released/stale 历史只读、URL/刷新保持项目/会话/集数、全写锁和来源固定证据。
3. 精确路径：生产前端修改/新增 `frontend/index.html`、`frontend/src/App.tsx`、`frontend/src/modules.ts`、`frontend/src/components/AppShell.tsx`、`frontend/src/components/AppShell.module.css`、`frontend/src/features/subtitle-acceptance/api.ts`、`frontend/src/features/subtitle-acceptance/model.ts`、`frontend/src/features/subtitle-acceptance/SubtitleAcceptanceWorkspace.tsx`、`frontend/src/features/subtitle-acceptance/SubtitleAcceptanceWorkspace.module.css`；回归新增 `tests/frontend/subtitle-acceptance.test.tsx`；证据写回 `docs/contracts/LOCAL_APP_PARITY.md`、`docs/status/CURRENT.md`、`docs/logs/DEVELOPMENT_LOG.md`。未修改后端、迁移、`packages/contracts` 或 `DESIGN.md`。
4. 允许文件与冻结项：正式页面完整消费 Fastify/PostgreSQL 权威事实；没有伪造媒体、代理质量、来源版本或通过/发布状态。S5 共享契约的 `update` 只允许文字/入点/出点，因此正式 UI 不提供直接改轨道，转轨通过明确目标轨的复制/剪切/粘贴完成。未实现 B/C、候选切换、定制器、运行时主题/密度/播放器比例/栏宽设置、`INT-08` 交付产品库、真实云资源/密钥/付费/部署。
5. 功能覆盖：左栏会话与剧集筛选、来源版本新建、逐集状态；中栏真实视频版本选择、短时播放授权、逐帧/时间跳转、媒体失败事实、共享视频/台词/画面字/问题时间轴、拖动移动；右栏全部/台词/画面字筛选、明确“新增台词/新增画面字”、全部筛选 `Ctrl+N` 轨道选择、多选、复制、剪切、粘贴、删除确认、撤销/恢复、文字和时间自动保存、人工问题、warning 至少 8 字 resolve/waive、open issue 阻断通过、同步只读 GET `/preflight` 的 loading/真实原因/requestId/唯一重读/成功焦点、逐集通过、全部 eligible 通过、局部返工、`ready_to_release`、不可变 release 历史读取与 S7 下载边界提示。
6. 浏览器证据：真实 AppShell + Fastify/PostgreSQL 证据目录为 `C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-1c71-72d3-9171-33ad2c36e941\front-m3-05b-evidence`。1440 展开 `front-m3-05b-1440-chrome-cdp-expanded-final.png`：AppShell `204/1236`，三栏 `220/690/326`，播放器/时间轴 `551/469 = 0.54/0.46`，根 `1440/1440`。1440 收起 `front-m3-05b-1440-chrome-cdp-collapsed-final.png`：AppShell `72/1368`，三栏 `220/822/326`。1024 `front-m3-05b-1024-chrome-cdp-final.png`：AppShell 收起主区 `952`，三栏 `182/500/270`，播放器/时间轴 `551/469 = 0.54/0.46`，根 `1024/1024`。三组浏览器 warn/error 均为 0；另有 released 只读、preflight 失败 requestId 与唯一重读成功截图。
7. 定向验证：`pnpm exec vitest run tests/frontend/subtitle-acceptance.test.tsx --reporter=dot` 1 文件 7/7；`pnpm exec vitest run tests/frontend --reporter=dot` 10 文件 95/95；`pnpm --filter @qimao-terms-cloud/frontend run typecheck` 通过；`pnpm --filter @qimao-terms-cloud/frontend run build` 通过，只有 Vite 大 chunk 非阻断提示；`node C:\Users\ComradeGu\.codex\skills\impeccable\scripts\detect.mjs --json frontend/src/features/subtitle-acceptance/SubtitleAcceptanceWorkspace.tsx frontend/src/features/subtitle-acceptance/SubtitleAcceptanceWorkspace.module.css` 返回 `[]`；`git diff --check` 退出码 0，仅保留 `LOCAL_APP_PARITY.md` 既有 CRLF/LF 提示。完整 `pnpm check` 按 S5 关闭门未运行。
8. 职责矩阵与代码健康：本轮职责为视频字幕验收、`INT-07`。当前 `SubtitleAcceptanceWorkspace.tsx` 为 1241 行，CSS 为 894 行，属于关闭前代码健康风险；职责边界已经能安全拆出纯展示面板（会话/来源头部、剧集队列、播放器面板、时间轴面板、字幕编辑面板、问题面板、异步命令抽屉）和状态 hook（会话/集数据、Cue 草稿与自动保存、命令意图恢复、preflight 抽屉）。本轮不大拆的理由是证据阶段已经完成跨会话/幂等/异步恢复/浏览器矩阵，立即拆分会扩大回归面并可能使 UI 终验证据失效；最小后继方案是在 S5 关闭或规划指定的 cleanup FIFO 中只做无行为变更拆分，保留现有专项测试，再复验受影响浏览器场景。

## 2026-08-15 — FRONT-M3-05B Rev 1 FIFO 122 恢复领取

- 前端按 FIFO 122 恢复同一 `FRONT-M3-05B Rev 1`，不新开 Rev；已重读项目约定、v4.4 协议、`CURRENT.md` v4-294、四层功能完整性审查、实际权威 `docs/contracts/M3-subtitle-acceptance-workbench.md`、`DESIGN.md` 5.8、`docs/ui/M3-subtitle-acceptance.md` Rev 4、`LOCAL_APP_PARITY` 字幕验收行、共享 `subtitle-acceptance` 契约、后端 routes/service/repository/source、后端字幕验收专项与日志顶部。规划派发中的 `M3-subtitle-acceptance-workflow.md` 为文件名笔误，用户已更正为 `M3-subtitle-acceptance-workbench.md`。
- permission_ok 实测：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围，普通仓库内 `apply_patch`/编辑不走 `auto_review`。`CURRENT.md` 从 v4-294 最小递增为 v4-295；FIFO 122 转 `active`，`FRONT-M3-05B Rev 1` 转 `in_progress / Current actor=前端开发对话 / Reviewer=UI 设计对话`。
- 编码前异步状态转换预检已完成：会话读取优先 URL 指定会话，其次唯一当前可写会话，历史 `released/stale` 只读且刷新不偷换；全部写命令冻结完整 body + 幂等键，pending 时锁定其它写入，未知/可重试失败只恢复同一意图，确定性冲突清 intent 并刷新 PostgreSQL 权威事实；保存、通过、预检、发布和播放授权分别保留 loading、失败/requestId、唯一恢复、再次失败焦点与成功焦点；同步 preflight 只在抽屉打开时发一次只读 GET，最近一次成功结果才允许一键通过。
- 本轮沿用现有 `frontend/src/features/subtitle-acceptance/api.ts` / `model.ts` 安全雏形继续正式 React 实现；只采用方案 A 和四层功能矩阵，不实现 B/C、定制器、运行时主题/密度/栏宽切换、第二套项目选择器或虚假媒体/来源/后端状态；不修改后端、迁移、packages/contracts 或 DESIGN，不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-15 — UI-M3-05 Rev 4 七条功能等价路径完成并交规划

- 同一仓库外方案 A 可操作原型 `ui-m3-05-rev3-customizer/index.html?final=a` 已补齐七条集中路径：全局项目中心搜索/打开任意 active 云端项目与工作台返回/切换；项目内恢复唯一可写会话并选择 released/stale 历史只读；字幕页全部/台词/画面字筛选；可发现的“新增台词 / 新增画面字”及全部筛选 `Ctrl+N` 先选轨道；紧凑多选/复制/剪切/粘贴/删除与工作副本安全确认；人工问题记录、定位与解决/豁免理由；新建会话明确选择 S3 台词和可选 S4 画面字来源版本。
- 新鲜真实交互证明：项目中心搜索“都市”只返回 1 个 active 匹配并更新项目上下文；选择 stale 历史会话后 `18/18` 写控件全部原生禁用，恢复草稿后 `18/18` 可用；台词筛选只投影 2 条台词 Cue；全部筛选快捷新增打开台词/画面字选择；多选 2 条后删除确认默认聚焦“安全返回”，并明确不改上游 SRT、源视频或不可变历史；人工问题带入 `00:12.480`、轨道/备注且可保存处理理由；新建会话同时显示 S3 与 S4 版本及“不绑定画面字版本”。浏览器运行日志为空。
- 双视口定向证据：1440 根 `1440/1440`、三栏 `220/894/326`、播放器/时间轴 `410/349`；1024 根 `1024/1024`、三栏 `182/572/270`、播放器/时间轴 `339/288`，右栏 `269/269`，时间轴 `572/603` 只在自身横滚。最终文件为 `A-rev4-1440.png` 与 `A-rev4-1024.png`；Rev 3 的 B/C、视觉、同步预检及既有状态/键盘证据未重跑或改写。
- `DESIGN.md` 5.8 与 `docs/ui/M3-subtitle-acceptance.md` 已写明项目中心唯一入口、会话全写锁、双轨工具栏、删除保护、人工问题、来源版本及 Rev 4 证据路径。Impeccable 单次定向检测退出码 0、结果 `[]`，但因 HTML 解析模块不可用采用降级正则，只作为辅助；`git diff --check` 无错误，仅有并行既有 `LOCAL_APP_PARITY.md` CRLF 提示。
- `CURRENT.md` 基于规划后端微审后的 v4-291 最小递增为 v4-292；FIFO 118 关闭，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 121 `notification_pending`。只修改 DESIGN、UI 验收、仓库外匿名原型/证据和状态/日志；未修改生产前端、后端、测试、迁移或 contracts，未通知或解锁前端。下一步只通知规划固定任务并确认送达。
- v4.4 送达闭环完成：正式交审只发送规划固定任务；`read_thread` 确认 FIFO 121 / v4-292 完整消息进入规划最新 `inProgress` 回合，规划明确回执将按“集中修正、一次验收”边界复核。`CURRENT.md` 最小递增为 v4-293，FIFO 121 关闭；UI 停止修改并等待规划裁决，未直接通知、恢复或解锁前端。

## 2026-08-15 — BACK-M3-05C Rev 1 规划微审通过

- 规划独立检查 `tests/backend/subtitle-acceptance.test.ts` 的新增帮助函数和六组回归，确认本任务没有新增迁移、共享字段、API 或生产后端分支；测试真实覆盖 dialogue/screen_text 双轨 2 秒新增、删除只改工作副本、cut/paste 相对时间/原轨/显式跨轨、add/delete/cut-paste 后 undo/redo、同键重放/异参冲突/版本冲突零副作用，以及非法编辑形成质量问题并阻断通过/发布。
- 规划新鲜复跑 `pnpm exec vitest run tests/backend/subtitle-acceptance.test.ts`，结果 1 文件 13/13；随后新鲜运行共享契约构建、后端生产构建、`pnpm check:repo` 和 `git diff --check`，全部通过，仅有既有 `LOCAL_APP_PARITY.md` CRLF 提示。
- 首次 `pnpm run db:setup` 确认 PostgreSQL 已在 55432 运行，但 Node 启动迁移时发生宿主 `uv_os_get_passwd ENOMEM`；独立测试进程仍连接现有已迁移数据库并 13/13 通过。该瞬时宿主内存错误未导致业务失败，规划没有重复堆迁移或改业务代码。
- `CURRENT.md` 从 v4-290 最小递增为 v4-291，`BACK-M3-05C` 标记 done。UI Rev 4 仍在独立执行，`FRONT-M3-05B` 保持 blocked；完整 `pnpm check` 继续留 S5 前端与 UI 终验后的唯一关闭门。

## 2026-08-15 — BACK-M3-05C Rev 1 编辑闭环回归完成并交规划

- 本轮未新增迁移、共享字段或 API，也未修改生产后端状态机；测试暴露结果显示现有 `add/delete/cut/paste/undo/redo` 实现满足本次 05C 后端闭环要求，因此实际只补 `tests/backend/subtitle-acceptance.test.ts` 高价值回归。
- 新增回归覆盖：播放头 2400ms 同时新增 `dialogue` 与 `screen_text`，均为 2 秒且计数正确；单条/批量删除只标记验收工作副本，来源 `pre_edit_release_files` 字节不变，并同步自动问题、Cue 计数和通过签名失效；前端持有复制内容，后端通过 `cut/paste` 验证相对时间、原轨保留和显式跨轨目标；新增、删除、剪贴事件均可 undo/redo。
- 幂等与冲突边界覆盖：同键同请求稳定重放且不新增事件；同键异参返回 `ACCEPTANCE_IDEMPOTENCY_KEY_REUSED`； stale revision 返回 `ACCEPTANCE_SESSION_VERSION_CONFLICT`，且不保存新命令、不新增 Cue/事件。非法空文本并越过视频结尾的编辑按既有契约形成 `empty_text / after_video_end` 质量问题，随后通过返回 blocked、发布稳定 422。
- 新鲜验证：`pnpm exec vitest run tests/backend/subtitle-acceptance.test.ts` 为 1 文件 13/13；`pnpm exec vitest run tests/backend/terms.test.ts tests/backend/pre-review.test.ts tests/backend/screen-text.test.ts tests/backend/subtitle-acceptance.test.ts` 为 4 文件 44/44；`pnpm --filter @qimao-terms-cloud/contracts run build`、`pnpm --filter @qimao-terms-cloud/backend run build`、`pnpm check:repo`、`git diff --check` 均退出码 0。`git diff --check` 仅输出既有 `LOCAL_APP_PARITY.md` CRLF 提示；完整 `pnpm check` 按 S5 关闭门未运行。
- `CURRENT.md` 基于 UI 并行领取后的 v4-288 最小递增为 v4-289；FIFO 119 关闭，新增 FIFO 120 `notification_pending`，`BACK-M3-05C Rev 1` 转 `review / Current actor=规划对话 / Reviewer=规划对话`。未改前端/DESIGN、迁移、共享契约或真实服务配置，未提交、推送或部署；下一步只通知规划固定任务并确认送达。
- v4.4 送达闭环完成：正式交审只发送规划固定任务；`read_thread` 确认 FIFO 120 / v4-289 完整消息进入规划最新 `inProgress` 回合且规划为 active。`CURRENT.md` 最小递增为 v4-290，FIFO 120 关闭；后端停止修改并等待规划微审，未直接通知 UI/前端或解锁 `FRONT-M3-05B`。

## 2026-08-15 — UI-M3-05 Rev 4 正式领取并进入方案 A 集中补齐

- UI 固定任务按 FIFO 118 完整重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.4、最新 `CURRENT.md`、S5 功能完整性审查与修正契约、`DESIGN.md` 5.8、`docs/ui/M3-subtitle-acceptance.md` 和开发日志顶部；确认 `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，仓库处于 `workspace-write/:workspace`，普通仓库写入不走 `auto_review`。
- `CURRENT.md` 基于后端并行领取后的 v4-287 最小递增为 v4-288；`UI-M3-05 Rev 4` 转 `in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`。本轮只在用户已确认的方案 A 内，用同一仓库外原型补齐七条功能等价路径并提供 1440/1024 定向证据；颜色、三栏、`54%/46%`、同步只读预检及既有状态/键盘通过项全部冻结。
- 允许修改仅限 `DESIGN.md`、`docs/ui/`、仓库外匿名原型/证据和状态/日志；不修改生产前端、后端、测试、迁移或共享契约，不重做 B/C，不运行完整浏览器矩阵，不通知或解锁前端。

## 2026-08-15 — BACK-M3-05C Rev 1 权限握手并领取

- 后端固定任务按 FIFO 119 完整重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.4、`CURRENT.md` 最新 v4-286、`docs/contracts/M3-subtitle-acceptance-parity-audit.md`、S5 字幕验收契约、共享 `subtitle-acceptance` 契约、后端读写仓储、专项测试与开发日志顶部。
- permission_ok：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，业务仓库 `qimao-terms-cloud` 处于 `workspace-write/:workspace` 可写范围；普通仓库内编辑使用本地工作区写入，不走 `auto_review`。
- `CURRENT.md` 从 v4-286 最小递增为 v4-287；`BACK-M3-05C Rev 1` 转 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。本轮只对现有 `add/delete/cut/paste/undo/redo` 做高价值闭环验证，范围限 `backend/src/modules/subtitle-acceptance/`、`tests/backend/subtitle-acceptance.test.ts` 与状态/日志写回；不新增迁移、共享字段或 API，不改前端/DESIGN，不运行完整 `pnpm check`，不接真实服务/密钥/网络，不提交、推送或部署。

## 2026-08-15 — S5 四层功能完整性审查完成并集中修正

- 规划逐项对照本地 `apps/short-drama-subtitle-review`、S5 产品契约、共享契约/后端、UI Rev 3 方案 A 原型和前端暂停范围。确认本地应用明确存在全部/台词/画面字筛选、播放头新增、删除、多选剪贴板、人工问题和最近项目恢复；最终原型只展示含糊的“播放头新增”、混合字幕列表与静态问题，缺少明确双轨新增、删除/剪贴板、人工问题、项目切换和会话历史，属于 P1 可发现性/功能完整性缺口。
- 共享契约与后端已经具备 `dialogue/screen_text` 的 add/delete/cut/paste、update/move、undo/redo、项目内会话列表和历史只读读取，因此不推倒后端；但现有字幕验收专项主要覆盖 update/状态/通过/发布，没有完整验证双轨新增和剪贴闭环，需补一次高价值回归。
- 新增 `docs/contracts/M3-subtitle-acceptance-parity-audit.md`，同步修正 S5 契约、`DESIGN.md` 5.8、UI 验收与 `LOCAL_APP_PARITY.md`。项目中心被确认为唯一跨项目选择器：任意 active 云端项目从项目中心打开，工作台内恢复唯一可写会话或选择 released/stale 历史只读会话；未导入云端的本地旧项目仍须先走项目创建、素材确认和上传，旧本地数据迁移不冒充已完成。
- `CURRENT.md` 从 v4-284 递增为 v4-285；FIFO 117 关闭，登记 FIFO 118 `UI-M3-05 Rev 4` 与 FIFO 119 `BACK-M3-05C Rev 1` 受控并行。UI 只在已选方案 A 内集中补入口；后端不改迁移/API，只验证既有编辑闭环。`FRONT-M3-05B Rev 1` 继续 blocked，待两项通过后一次恢复，不重写已完成的 API/model 雏形。
- 本轮 `git diff --check` 无错误，仅保留既有 CRLF 提示；未修改生产前端/后端业务实现，未运行会写数据库的测试，未提交、推送、部署、购买或调用外部服务。
- v4.4 主动送达闭环完成：规划分别只唤醒 UI 和后端个人账号固定任务；`wait_threads` 确认两者均已进入 `active / inProgress`，UI 已给出明确领取回执，后端已进入领取回合。`CURRENT.md` 最小递增为 v4-286，FIFO 118/119 转 active；未唤醒前端，用户无需传话。

## 2026-08-15 — FRONT-M3-05B Rev 1 暂停回执

- 前端收到规划对 FIFO 116/117 的即时暂停后，已停止正式 React 编码、测试扩展和视觉实现；不自行猜测“新增台词字幕 / 新增画面字”入口、项目中心进入路径或当前可编辑工作会话与历史冻结版本只读边界。
- 保留已完成分析与安全改动，不回滚、不清理、不提交。`CURRENT.md` 从 v4-283 最小递增为 v4-284；`FRONT-M3-05B Rev 1` 继续 `blocked / Current actor=规划对话`，等待 FIFO 117 四层功能审查集中裁决，不增加 Rev，不判定开发失败。
- 前端本轮实际已修改/新增文件清单：`docs/status/CURRENT.md`、`docs/logs/DEVELOPMENT_LOG.md`、`frontend/src/features/subtitle-acceptance/api.ts`、`frontend/src/features/subtitle-acceptance/model.ts`。其中生产前端文件为 2 个，仅为 API 封装与状态/标签工具雏形；尚未接入 `App.tsx`、`modules.ts` 或 `AppShell.tsx`，未新增 `tests/frontend/` 回归，未修改 `LOCAL_APP_PARITY.md`、后端、迁移、packages/contracts 或 DESIGN。

## 2026-08-15 — S5 字幕验收四层功能完整性审查启动

- 用户在方案 A 最终预览中发现右侧主要只有“字幕 / 问题”，没有可发现的“新增台词字幕”和“新增画面字”操作入口；这会使长期产品口径与 S5 契约中的人工补录能力可能只存在于文档/API，无法从正式页面完成，按 P1 功能完整性风险处理。
- 规划即时暂停 `FRONT-M3-05B Rev 1`，不增加 Rev、不判定开发失败；`CURRENT.md` 从 v4-282 最小递增为 v4-283，FIFO 116 转 blocked，登记 FIFO 117 active。
- 本轮严格核对四层事实：原本地字幕验收应用、S5 权威契约与后端能力、UI Rev 3 最终模式、正式前端实现范围。除人工新增/删除外，同时审查轨道归属、轻量编辑、问题处理、预检/通过/返工/发布、历史只读、异步恢复、入口可发现性、只有接口没有 UI、UI 承诺但后端不支持和职责越界。
- 统一审查结论形成前，不允许前端自行猜测按钮位置或继续扩大代码；本轮不回滚、不清理、不提交、不推送、不部署。

## 2026-08-15 — FRONT-M3-05B Rev 1 恢复领取方案 A

- 前端按 FIFO 116 从暂停点恢复同一 `FRONT-M3-05B Rev 1`，不新开任务、不增加 Rev；已实测 permission_ok：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，`qimao-terms-cloud` 位于 `workspace-write/:workspace` 可写范围，普通仓库内 `apply_patch`/编辑不走 `auto_review`。
- 本轮沿用暂停前已完成的 S5 后端契约读取与领取记录，当前新增事实仅为 `UI-M3-05 Rev 3` 方案 A 已由用户选择并经规划冻结通过；正式生产方向固定为“时间轴主导的均衡三栏”，不引入 B/C、候选切换、定制器或员工主题/密度/播放器比例/栏宽设置。
- `CURRENT.md` 从 v4-281 最小递增为 v4-282；FIFO 116 转 `active`，`FRONT-M3-05B Rev 1` 转 `in_progress / Current actor=前端开发对话 / Reviewer=UI 设计对话`。后续只在 `frontend/`、`tests/frontend/`、`LOCAL_APP_PARITY` 指定证据行及状态/日志范围内实现和验证；不修改后端、迁移、packages/contracts 或 DESIGN，不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-15 — UI-M3-05 Rev 3 规划冻结核对通过并恢复前端

- 规划独立对照 `DESIGN.md` 5.8、`docs/ui/M3-subtitle-acceptance.md`、仓库外 `?final=a` 最终模式源码与 `A-final-1440.png` / `A-final-1024.png`：方案 A 的时间轴主导均衡三栏、`54%/46%`、`#4458D8`、桌面 `220/326`、1024 `182/270`、同步只读 preflight、失败恢复和唯一生产落点一致，最终模式隐藏候选与定制控件；B/C 仅为仓库外历史候选。
- 视觉与范围核对未发现 P0/P1；`git diff --check` 通过。Impeccable 检测为 `[]`，但因 HTML 解析模块缺失采用降级正则，仅作辅助，最终结论以设计文档、最终模式源码和实际截图为主。
- `CURRENT.md` 从 v4-280 最小递增为 v4-281；`UI-M3-05` Rev 3 标记 done，`FRONT-M3-05B` Rev 1 从原暂停点恢复为 ready，登记 FIFO 116。前端只实现方案 A 和正式 AppShell，不新开任务、不增加 Rev，不引入 B/C、定制器或运行时主题/密度/播放器比例/栏宽切换。
- 完整 `pnpm check` 继续留在正式前端完成并经 UI 终验后的 S5 单次关闭门；本轮未修改生产前端/后端、迁移或 contracts，未提交、推送或部署。

## 2026-08-15 — UI-M3-05 Rev 3 方案 A 正式冻结并交规划

- 按用户明确选择，`DESIGN.md` 5.8 与 `docs/ui/M3-subtitle-acceptance.md` 已把方案 A“时间轴主导的均衡三栏”冻结为生产前端唯一权威方向：默认均衡密度、播放器/时间轴纵向 `54%/46%`、全局靛蓝 `#4458D8`、桌面左右栏 `220/326`、1024 左右栏 `182/270`。台词/画面字/问题轨语义浅面、文字/边界/成功/警告/硬错误变量及 AppShell 内响应式公式均已写明。
- B“文本审校主导”和 C“看片主导”只保留为仓库外选择历史；正式交接明确禁止生产模块、CSS 变体、员工设置或运行时主题/密度/播放器比例/栏宽切换。Rev 1/2 的同步只读 `GET /preflight`、防御性 `preflighting`、状态、失败/requestId/唯一重读、键盘、焦点和完整业务矩阵全部继续生效。
- 前端唯一落点已写入验收：`/projects/:projectId/subtitle-acceptance`、`project-subtitle-acceptance`、`frontend/src/features/subtitle-acceptance/`，并沿现有约定在 `App.tsx`、`modules.ts`、`AppShell.tsx` 接入，回归路径为 `tests/frontend/subtitle-acceptance.test.tsx`。首次交审必须提供真实 AppShell 内方案 A 的 1440/1024 三栏、根溢出、`54%/46%` 计算样式、焦点与失败恢复证据，不得提交 B/C 或定制器截图。
- 仓库外候选页增加只读 `?final=a` 证据模式，只隐藏候选与定制控件，不改变方案 A 主体。新鲜浏览器证据：1440 根宽 `1440/1440`、三栏 `220/894/326`、播放器/时间轴 `410/349`；1024 根宽 `1024/1024`、三栏 `182/572/270`、播放器/时间轴 `339/288`；控制台 error/warn 为 0。最终文件为 `A-final-1440.png`、`A-final-1024.png`。Impeccable 扫描退出码 0、结果 `[]`，但因解析模块缺失采用降级正则，只作为辅助证据。
- `CURRENT.md` 从 v4-278 最小递增为 v4-279；FIFO 114 关闭，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 115 `notification_pending`。只修改 `DESIGN.md`、`docs/ui/M3-subtitle-acceptance.md`、仓库外匿名原型/证据和状态/日志；未修改生产前端、后端、迁移或 contracts。下一步只通知规划固定任务并确认送达，不直接恢复或通知前端。
- v4.4 送达闭环完成：正式交审只发送规划固定任务；`read_thread` 确认 FIFO 115 完整消息进入规划最新 `inProgress` 回合。`CURRENT.md` 最小递增为 v4-280，FIFO 115 关闭；UI 停止修改并等待规划独立核对，未直接通知或恢复前端。

## 2026-08-15 — 用户选择字幕验收 UI 方案 A

- 用户明确回复 `a`，选择时间轴主导的均衡三栏方案；未提出额外调节，因此规划把候选预览中的默认密度、默认播放器占比、靛蓝主色和默认栏宽登记为正式冻结输入。
- `CURRENT.md` 从 v4-277 最小递增为 v4-278；`UI-M3-05 Rev 3` 转 `in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`，登记 FIFO 114。UI 只需把方案 A 写入 DESIGN/UI 验收、形成唯一前端交接入口和最终证据；B/C 仅保留为候选历史，不进入生产实现。
- `FRONT-M3-05B` 在 UI 正式冻结和规划核对前继续 blocked；后端权威契约与生产代码保持不变。

## 2026-08-15 — UI-M3-05 Rev 3 候选预览核对并转用户选择

- 规划核对仓库外候选文件、CURRENT 交付摘要与范围边界：A 时间轴主导、B 文本审校主导、C 看片主导三套方向共享同一组字幕验收业务能力，可继续调整密度、播放器占比、主色和三栏比例；同步只读 preflight、真实失败/requestId、唯一重读、键盘恢复和 1440/1024 无横溢证据均保留。
- 规划尝试直接把本地 `file://` 预览显示到内置浏览器时被应用安全策略拒绝，未绕过限制；候选文件本身存在且已由 UI 完成真实浏览器验证，用户可通过本地文件入口打开，不影响选择门。
- `CURRENT.md` 从 v4-276 最小递增为 v4-277；`UI-M3-05 Rev 3` 保持 review 并转 `Current actor=用户 / Reviewer=用户`。用户确认或提出组合定制前，DESIGN/UI 验收不冻结，`FRONT-M3-05B` 继续 blocked，生产前端不恢复。

## 2026-08-15 — UI-M3-05 Rev 3 第一版用户定制预览完成

- 仓库外新增 `ui-m3-05-rev3-customizer/index.html`：A 时间轴主导（推荐）采用均衡三栏与靛蓝层级；B 文本审校主导扩大编辑区、提高密度并采用暖色纸质层级；C 看片主导扩大播放器、收窄侧栏并采用深色青绿层级。三套方向消费同一组匿名字幕/问题数据和同一交互代码，业务能力没有随视觉方向删减；用户还可独立调整密度、播放器占比、主色和三栏比例，暂存选择只写本机且明确不解锁前端。
- 同步预检交互保留 Rev 2 权威语义：打开后先呈现一次同步只读读取；成功展示逐集归约和最近成功结果的一键通过；失败保留服务端原因与 `requestId`，仅提供唯一“重新读取预检”；共享 `preflighting` 只显示正在核对/重新读取或关闭，不出现百分比、轮询、取消任务或重复启动。
- 真实浏览器定向验证通过：1440 下 A/B/C 三栏分别为 `220/894/326`、`248/810/382`、`182/982/276`，页面根宽均为 1440；1024 下分别为 `182/572/270`、`194/518/312`、`158/634/232`，页面根宽均为 1024。预检失败→唯一重读→成功焦点、关闭回焦预检入口、硬错误回焦问题页均成立，控制台 error/warn 为 0。Impeccable 检测退出码 0、结果 `[]`，但因 HTML 解析模块不可用采用降级正则，只作为辅助证据。
- `CURRENT.md` 从 v4-274 最小递增为 v4-275；FIFO 112 关闭，任务转 `review / Current actor=规划对话 / Reviewer=用户`，登记 FIFO 113 `notification_pending`。本阶段未修改 `DESIGN.md` 5.8 或 `docs/ui/M3-subtitle-acceptance.md` 的最终冻结结论，也未修改生产前后端、迁移、共享契约或前端测试；`FRONT-M3-05B` 保持 blocked。下一步只通知规划固定任务并确认送达，同时在 UI 固定任务中直接请用户体验和选择。
- v4.4 送达闭环完成：正式交接只发送规划固定任务；`read_thread` 确认 FIFO 113 完整消息进入规划最新 `inProgress` 回合。`CURRENT.md` 最小递增为 v4-276，FIFO 113 关闭；UI 停止继续定稿并等待用户亲自选择，未通知或恢复前端。

## 2026-08-15 — UI-M3-05 Rev 3 正式领取并进入用户定制门

- UI 固定对话按 FIFO 112 完整重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.4、`CURRENT.md` v4-273、S5 权威契约、`DESIGN.md` 5.8、`docs/ui/M3-subtitle-acceptance.md` 与开发日志顶部；确认 `permission_ok`：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，仓库处于 `workspace-write/:workspace`，普通仓库写入不走 `auto_review`。
- `CURRENT.md` 从 v4-273 最小递增为 v4-274；FIFO 112 转 `active`，`UI-M3-05 Rev 3` 转 `in_progress / Current actor=UI 设计对话 / Reviewer=用户`。
- 本阶段只在仓库外制作不超过 3 个、业务能力等价的可操作候选预览，让用户亲自比较并选择信息布局/三栏比例、视觉密度、播放器/时间轴呈现和配色层级。Rev 1/2 的真实业务功能、同步只读预检、失败恢复、键盘及 1440/1024 安全证据只作底线；用户确认前不更新 `DESIGN.md` 5.8 或 UI 验收的最终冻结结论，不修改生产前后端、迁移或共享契约，不恢复或通知前端。

## 2026-08-15 — 字幕验收 UI 改为用户亲自定制

- 用户明确终止本次“规划代理 UI 最终定稿”授权，要求亲自选择和定制字幕验收工作台界面。规划已确认 `FRONT-M3-05B Rev 1` 安全暂停，生产前端、测试夹具和视觉实现修改数均为 0，只保留已完成的只读分析和领取记录，因此没有产生返工代码。
- `CURRENT.md` 在前端暂停写回的 v4-272 基础上最小递增为 v4-273；`FRONT-M3-05B` 保持 Rev 1 blocked，重新打开 `UI-M3-05 Rev 3` 为 `ready / Current actor=UI 设计对话 / Reviewer=用户`，登记 FIFO 112。Rev 1/2 的功能、状态、同步预检、键盘和响应式证据仅作为安全基线，不再代表用户已接受最终视觉。
- UI 本轮先提供可操作定制入口和少量清晰方向，由用户亲自决定信息布局、视觉密度、播放器/时间轴呈现和配色；确认后才更新 DESIGN/UI 验收并由规划重新解锁前端。后端权威契约和已通过业务规则保持冻结；本轮不改生产前端/后端、迁移或共享契约。

## 2026-08-15 — FRONT-M3-05B Rev 1 规划即时暂停

- 规划即时暂停正式前端实现：用户已明确收回本次 UI 代理定稿授权，要求字幕验收工作台 UI 由用户亲自选择和定制。前端停止在当前安全边界，不继续生产前端编码、测试夹具扩展或视觉实现；保留已完成只读分析与领取记录，不回滚、不清理、不提交。
- `CURRENT.md` 从 v4-271 最小递增为 v4-272；`FRONT-M3-05B` Rev 1 改为 `blocked / Current actor=规划对话 / Reviewer=UI 设计对话`。阻塞原因仅为等待 `UI-M3-05` 用户定制方向重新冻结；这不是业务失败，也不增加 FRONT Rev。
- 暂停前实际修改的生产文件为 0；尚未修改 `frontend/`、`tests/frontend/`、`LOCAL_APP_PARITY`、后端、迁移、共享契约或 DESIGN。本次仅写回 `docs/status/CURRENT.md` 与 `docs/logs/DEVELOPMENT_LOG.md`，并按 v4.4 只通知规划固定任务。

## 2026-08-15 — FRONT-M3-05B Rev 1 正式领取

- 前端按 FIFO 111 完整重读项目级 `AGENTS.md`、`docs/WORKFLOW.md` v4.4、`CURRENT.md` v4-270、S5 字幕验收契约、`LOCAL_APP_PARITY.md` 字幕验收相关行、`DESIGN.md` 5.8、`docs/ui/M3-subtitle-acceptance.md`、共享 `subtitle-acceptance` 契约、后端 routes/service/read-write repository/source 与开发日志顶部；确认 UI Rev 2 与 BACK Rev 2 已由规划审核通过，双依赖关闭。
- permission_ok：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，业务仓库 `qimao-terms-cloud` 处于 `workspace-write/:workspace` 可写范围；普通仓库内编辑使用本地直写，不走 `auto_review`。
- `CURRENT.md` 从 v4-270 最小递增为 v4-271；FIFO 111 转 `active`，`FRONT-M3-05B` Rev 1 转 `in_progress / Current actor=前端开发对话 / Reviewer=UI 设计对话`。本轮实现范围限于 `frontend/`、`tests/frontend/`、`LOCAL_APP_PARITY` 指定证据行及状态/日志；不修改后端、迁移、共享契约或 DESIGN，不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-15 — BACK-M3-05A Rev 2 规划微审通过并解锁正式前端

- 规划逐项审计 `subtitle-acceptance` 读写仓储与专项回归：部分通过完成后在同一事务按全会话持久集状态归约，只有全部 `passed` 才产生 `ready_to_release`；preflight 与事务通过都阻断全部 open issue，自动 warning 经至少 8 字理由关闭后按稳定问题身份保留；stale/released 播放授权只放开证据读取，仍校验项目 active、冻结 selected Asset 成员、同项目归属和对象存在，业务写保持锁定。
- 规划本轮新鲜复跑 `tests/backend/subtitle-acceptance.test.ts`、`terms.test.ts`、`pre-review.test.ts`、`screen-text.test.ts`，4 文件 38/38 通过；共享契约构建、后端生产构建、`check:repo` 与 `git diff --check` 全部退出码 0。没有发现新的 P0/P1，完整 `pnpm check` 继续只留 S5 正式前端与 UI 终验后的关闭门。
- `CURRENT.md` 从 v4-269 最小递增为 v4-270；`BACK-M3-05A` Rev 2 标记 done，UI/后端双依赖关闭，`FRONT-M3-05B` Rev 1 解锁为 `ready / Current actor=前端开发对话 / Reviewer=UI 设计对话`，登记 FIFO 111。前端交接要求消费现有共享契约和 PostgreSQL 权威事实，严格复现 UI Rev 2 的三栏/状态/键盘与 1440/1024 规则；不得新增后台预检、伪造媒体/质量事实或修改后端、迁移、共享契约和 DESIGN。

## 2026-08-15 — BACK-M3-05A Rev 2 三项权威边界完成并交规划

- 整剧资格收口：`passOne/passEligible` 完成本次选择后，在同一事务内查询当前会话全部集的持久状态；仅全部为 `passed` 才设 `ready_to_release`，只通过 eligible 子集而仍有 `in_review` 集时保持 `draft`，发布事务继续稳定 422。两集回归证明第一集通过后 `draft / passed+in_review`，第二集通过后才进入发布就绪。
- warning 理由收口：preflight 和事务内 `assertPassable` 统一把全部 open issue 视为阻断；自动 warning 必须经既有 issue resolve/waive 命令保存至少 8 字理由。自动检查重算按稳定问题身份继承已关闭状态与理由，回归证明短时长 warning 在未豁免时预检/通过均阻断，豁免后可通过且再次扫描不回归 open。
- 历史证据播放收口：播放授权不再把 stale/released 误作业务写入拒绝；只在项目 active、会话修订匹配、冻结 selected Asset 仍属于 availableVideos 和同项目、对象仍存在时签发 15 分钟只读授权。stale/released 正向播放均通过；released Cue 写仍 409 且目标幂等命令零新增，项目 recycled、冻结成员不匹配和对象缺失分别稳定拒绝。
- 新鲜验证：字幕验收专项 1 文件 7/7；术语、前置审改、画面字、字幕验收直接依赖组合 4 文件 38/38；共享 contracts TypeScript、后端生产构建、`check:repo`、`git diff --check` 全部通过。完整 `pnpm check` 按 S5 关闭门未运行；本地 PostgreSQL 55432 保持运行，未停止或清理共享实例。
- `CURRENT.md` 基于规划 UI 微审写回后的 v4-267 最小递增为 v4-268；FIFO 107 关闭，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 110 `notification_pending`。只修改 subtitle-acceptance 后端模块与专项测试；未改迁移、共享契约、生产前端或 DESIGN，未接真实服务、网络、密钥、付费或云资源，未提交、推送或部署；下一步只唤醒规划固定任务并确认送达。
- v4.4 交接闭环完成：正式交审只发送规划固定任务；`read_thread` 确认完整 FIFO 110 / v4-268 消息进入规划最新 turn，规划为 `active / inProgress`。`CURRENT.md` 最小递增为 v4-269，FIFO 110 关闭；后端停止修改并等待规划独立微审，未直接通知或解锁前端。

## 2026-08-15 — UI-M3-05 Rev 2 规划微审通过

- 规划重读 `CURRENT.md` v4-266，并定向核对 `DESIGN.md` 5.8、`docs/ui/M3-subtitle-acceptance.md` 与实际差异；确认首版预检唯一读取链为同步 `GET /preflight`，失败保留服务端原因/requestId 和唯一人工重读，最近一次成功结果才开放一键通过。
- `preflighting` 已明确为防御性只读状态，不会生成前端后台任务、百分比、轮询、取消命令或重复启动；原型源码扫描无错误任务文字，因此不需要为了改而改，也无需重跑 Rev 1 已通过的完整浏览器矩阵。`git diff --check` 通过。
- `CURRENT.md` 从 v4-266 最小递增为 v4-267，`UI-M3-05` Rev 2 标记 done。后端 Rev 2 仍在执行；前端保持 blocked，待后端规划审核通过后由规划同轮自动解锁。

## 2026-08-15 — UI-M3-05 Rev 2 领取同步预检语义微返工

- 完整重读项目协议 v4.4、`CURRENT.md` v4-262、`DESIGN.md` 5.8、S5 UI 验收、权威契约与开发日志顶部；permission_ok：workspace root 包含 `C:\Users\ComradeGu\Documents\七猫兼职`，仓库处于 `workspace-write/:workspace`，普通仓库编辑不走 `auto_review`。
- 唯一差异确认：首版整剧预检是同步只读 GET，不存在后台任务、进度轮询或取消命令；`preflighting` 仅是防御性只读投影。Rev 1 三栏结构、视觉、1440/1024、编辑/返工/发布/焦点和其他证据全部冻结。
- `CURRENT.md` 从 v4-262 最小递增为 v4-263，FIFO 108 转 `active`，任务转 `in_progress`。本轮只改 `DESIGN.md` 5.8、`docs/ui/M3-subtitle-acceptance.md` 和必要的仓库外原型状态文字；不改生产前后端、迁移或共享契约，不重跑完整浏览器矩阵。
- 规划已确认两项派发均真实送达：后端与 UI 固定任务分别明确 `permission_ok` 并处于 `active / inProgress`。在 UI v4-263 领取写回基础上，规划最小合并为 v4-264，FIFO 107/108 均为 active；前端继续等待双依赖，不要求用户传话。
- 定向修正完成：`DESIGN.md` 5.8 与 `docs/ui/M3-subtitle-acceptance.md` 明确预检是一次同步只读 `GET /preflight`；抽屉覆盖 loading、服务端失败原因/requestId、唯一“重新读取预检”、再次失败/成功焦点、成功逐集结果和关闭。最近一次成功结果才允许一键通过；`preflighting` 只显示“服务端正在核对验收结果”并允许重读或关闭，不展示进度、百分比、轮询、取消任务或重复启动。
- 原型文本扫描确认不存在“预检进度/百分比/轮询/取消任务”错误表述，故按派发未改仓库外原型。`git diff --check` 通过；未重跑完整浏览器矩阵，Rev 1 全部冻结证据继续有效。
- `CURRENT.md` 基于规划并行写回的 v4-264 最小递增为 v4-265；FIFO 108 关闭，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 109 `notification_pending`。未修改生产前后端、迁移或共享契约；下一步只通知规划固定任务并确认送达，不直接通知或解锁前端。
- v4.4 交接闭环完成：正式交审只发送规划固定任务；`read_thread` 确认 FIFO 109 完整消息进入规划最新 `inProgress` turn，规划明确回执已收到并开始重读实际差异做定向微审，同时确认不会因 UI 单项通过而直接解锁前端。`CURRENT.md` 最小递增为 v4-266，FIFO 109 关闭；UI 停止修改并等待规划与后端 Rev 2 统一裁决。

## 2026-08-15 — S5 UI/后端交叉审核与 Rev 2 集中解阻

- 默认 PowerShell 7 路径修复后，规划使用默认执行器新鲜确认 PowerShell `7.6.4`、Node `24.19.0`、pnpm `11.21.0` 和仓库命令均可正常启动；`executor_blocked` 已解除，后续恢复默认执行链，不再使用系统 PowerShell 兼容绕行。
- 规划复核 `DESIGN.md` 5.8、`docs/ui/M3-subtitle-acceptance.md`、S5 契约、共享 TypeBox、Fastify 路由、读写仓储与 Rev 1 回归。UI 的专业编辑套件方向和主要矩阵成立；首版预检实际是同步只读 GET，因此 UI 不得展示不存在的后台进度或取消命令，`preflighting` 只保留防御性只读映射。
- 后端源码审计确认三项同源 P1：`passEpisodes` 当前只据本次选择集的 `blocked` 数量设置整会话状态，会使部分通过子集提前进入 `ready_to_release`；`preflight/assertPassable` 当前允许未豁免的自动 warning 直接通过，与“填写理由后确认”不一致；`createPlaybackGrant` 使用 `requireFresh`，会把 `stale` 旧会话的证据查看一并拒绝，违反历史会话只读可查方向。
- `CURRENT.md` 从 v4-261 最小递增为 v4-262，集中形成 `BACK-M3-05A Rev 2` 与 `UI-M3-05 Rev 2` 两个目录不重叠的受控并行微返工；Rev 1 已通过结构、视觉、编辑、返工、发布和测试证据冻结。`FRONT-M3-05B` 保持 blocked，等待双修正经规划审核，不允许前端复制错误语义或自行猜测。

## 2026-08-15 — UI-M3-05 Rev 1 字幕验收工作台设计完成并交规划

- 完整读取项目协议 v4.4、`CURRENT.md`、S5 权威契约、`DESIGN.md` 与开发日志顶部，并只读核对 `LOCAL_APP_PARITY.md` 字幕验收能力行、本地字幕验收工作台 README/更新说明及既有应用外壳视觉变量。权限握手确认 workspace root 为 `C:\Users\ComradeGu\Documents\七猫兼职`，仓库处于 `workspace-write/:workspace`，普通仓库编辑不走 `auto_review`。
- `DESIGN.md` 5.8 扩展为正式专业编辑套件规范：左侧剧集/筛选、中部播放器+四轨共享时间轴、右侧字幕/问题；覆盖双视频真实版本、播放/逐帧、Cue 文字/时间/拖动、多选剪贴板、撤销恢复、自动保存、硬错误/警告、通过并下一集、整剧预检/一键通过、局部返工、不可变发布、`stale/blocked/released`、媒体与异步失败恢复、焦点闭环及 1440/1024 几何。
- 新增 `docs/ui/M3-subtitle-acceptance.md`，形成页面、会话、逐集、交互、视口、焦点与正式前端交接矩阵；仓库外可操作原型为 `C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a00445-14ec-77c0-9fda-595190220af9\ui-m3-05-subtitle-acceptance\index.html`，仅使用明确标注的匿名示例数据。
- 新鲜浏览器验证：1440×900 根宽 `1440/1440`、三栏 `232/804/332`；1024×768 根宽 `1024/1024`、三栏 `196/472/284`，标题区 `952/952`；整剧预检打开聚焦安全关闭、关闭回原触发点，硬错误通过动作转问题页，控制台 `error=0 / warn=0`。`git diff --check` 通过。
- `CURRENT.md` 基于后端并行送达闭环后的 v4-259 最小递增为 v4-260；任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 106 `notification_pending`。未修改生产 frontend/backend、迁移、共享契约或本地只读应用；未接网络、真实媒体、密钥、付费、云资源、部署、提交或推送；下一步只唤醒规划固定任务并确认送达，不直接解锁前端。
- v4.4 交接闭环完成：正式交审只发送规划固定任务；`wait_threads` 确认规划在最新 `active / inProgress` turn 中明确收到 UI 完成交付，并开始与后端结果做交叉审核。`CURRENT.md` 最小递增为 v4-261，FIFO 106 关闭；UI 停止修改并等待规划独立审核，未直接通知或解锁前端。

## 2026-08-15 — BACK-M3-05A Rev 1 字幕验收权威后端完成并交规划

- 在仓库已有 `subtitle-acceptance` 共享契约、23 号迁移、后端模块与专项测试上续接，没有重写或扩围。权威链覆盖固定 S3/S4/素材/视频/术语来源、逐集 Cue 工作副本、不可变事件、幂等条件写、质量检查、逐集/整剧通过、局部返工、来源失效和不可变 Acceptance Release。
- 定向审计修正三项契约缺口：撤销/恢复重建 Cue 时保留画面字 `pairGroupId/position` 来源元数据，避免绕过配对硬检查；返工事务锁定并验证全部集数属于当前会话，非法集数稳定 422 且请求/集状态零副作用；发布事务自身强制会话为 `ready_to_release`，不能绕过服务端资格直接冻结。同步把同一 PostgreSQL client 的并发查询改为顺序执行，消除 pg@9 前置弃用警告。
- 新鲜验证：字幕验收专项 1 文件 4/4；术语、前置审改、画面字、字幕验收直接依赖组合 4 文件 35/35；共享 contracts TypeScript、后端生产构建、`check:repo`、`git diff --check` 全部通过。完整 `pnpm check` 按契约留 S5 关闭门；本地 PostgreSQL 55432 保持运行，未停止或清理共享实例。
- `CURRENT.md` 从 v4-257 最小递增为 v4-258；任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 105 `notification_pending`。未修改生产前端、DESIGN、迁移或共享契约，未接真实服务、网络、密钥、付费、转码或云资源，未提交、推送或部署；下一步只唤醒规划固定任务并确认送达，不直接通知或解锁前端。
- v4.4 交接闭环完成：正式交审只发送规划固定任务；`read_thread` 已确认完整 FIFO 105 / v4-258 消息进入规划最新 turn，规划状态为 `active / inProgress`。`CURRENT.md` 最小递增为 v4-259，FIFO 105 关闭；后端停止修改并等待规划独立审核，未直接通知或解锁前端。

## 2026-08-15 — 恢复个人账号下的固定四任务协作

- 旧三个固定任务的沙箱不会随账号切换刷新，实际仍为 read-only；规划没有继续重复唤醒，也没有使用隐藏子智能体，而是在同一“七猫兼职”保存项目和同一工作目录建立三个侧边栏可见的个人账号固定替代任务：UI/UX `01a00445-14ec-77c0-9fda-595190220af9`、后端 `01a00445-1878-7072-bfd3-f44de3504a3f`、前端 `01a00445-1c71-72d3-9171-33ad2c36e941`。
- 三个替代任务的 workspace-write 握手均已通过；UI/UX 与后端已进入 active/inProgress，前端已明确进入双依赖等待。`CURRENT.md` 递增为 v4-257，固定任务登记已替换，FIFO 103/104 关闭，恢复了“规划调度—角色执行—写回—规划审核—自动续接”的原工作方式。
- UI 固定对话已完成 FIFO 104 权限握手：工作区根包含 `C:\Users\ComradeGu\Documents\七猫兼职`，业务仓库恢复 `workspace-write/:workspace`，普通仓库内 `apply_patch` 可直接执行且不再经过 `auto_review`。`UI-M3-05 Rev 1` 从既有只读审计事实继续执行；不启用隐藏子智能体，不修改生产前后端、迁移或共享契约。CURRENT 基于 v4-255 最小递增为 v4-256。
- 用户已切回个人账号，并明确要求恢复最初的协作方式：规划、UI/UX、后端、前端使用侧边栏中原有的四个固定任务，不使用隐藏子智能体，也不把全部实现压回规划对话。
- 固定任务均仍存在：规划 `019ff4f8-4a77-7870-8edf-6350490b316c`、UI/UX `019ff52d-d4a1-7440-81a2-fc9c1b0a0996`、后端 `019ff4de-084b-7002-a7eb-20ff93d97d0a`、前端 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf`。
- S5 恢复为 UI/UX 与后端并行、前端等待双依赖的原工作流。公司 API 环境产生的 UI/前端 `permission_blocked` 已解除为历史故障记录；购买、部署、推送、真实付费 API、云资源和破坏性操作仍须单独授权。
- `CURRENT.md` 递增为 v4-255，FIFO 103 关闭，FIFO 104 登记为待完成三段送达闭环；下一步只唤醒原固定任务并确认运行态，不新建任务。

## 2026-08-15 — 协作协议 v4.4 权限链路前置门

- 用户明确要求修复“固定对话 read-only → 普通本地写入误触审批 → auto_review 503 后才发现”的链路。根因属于目标任务运行权限和派发握手缺失，不是用户撤销授权，也不是业务实现失败。
- 项目级 `AGENTS.md` 与 `docs/WORKFLOW.md` 升级 v4.4：每次启动、返工和验收派发后，目标除 `inProgress` 外必须明确确认工作区根包含 `C:\Users\ComradeGu\Documents\七猫兼职`、目标仓库为 `workspace-write/:workspace`、普通仓库编辑不走 `auto_review`。
- `read-only`、根目录不匹配或普通仓库写入触发审批时，目标立即停止并回报 `permission_blocked`；规划负责写回阻塞、修正或重新派发，不计业务 Rev，不让用户传话。范围内本地写入/测试继续自动授权，购买、部署、推送、真实付费 API、云资源和破坏性操作继续单独授权。
- `CURRENT.md` 升级到 v4-250；FIFO 101/102 从表头外错误位置移动到正式规划接力队列，新增 FIFO 103 收集 UI/前端/后端权限握手。本次不改变 S5 范围或生产代码。
- FIFO 103 三角色回执已收到：后端明确根目录正确、`workspace-write` 可写并继续 BACK-M3-05A；UI 和前端均明确根目录正确但当前沙盒为 `read-only`，没有修改业务文件或触发 `auto_review`。规划将 `UI-M3-05` 与 `FRONT-M3-05B` 记为 `permission_blocked / Current actor=规划对话`，不增加业务 Rev；后端继续执行，UI/前端待环境恢复后重新握手自动续接。CURRENT 同步为 v4-251，FIFO 103 保持权限等待而不是伪装 closed。

## 2026-08-15 — S5 字幕验收工作台正式启动

- 用户明确要求恢复范围内本地写入、状态同步和跨角色自动接力；普通本地编辑、测试、规划审核、任务通知与送达确认不再逐次询问。购买、真实付费 API、云资源、部署、推送和破坏性操作继续保留单独授权门。
- 规划读取 M3 里程碑、`LOCAL_APP_PARITY.md` 和本地 `apps/short-drama-subtitle-review/README.md`，确认下一功能为 S5 字幕验收工作台，而不是继续扩画面字 OCR。
- 新增 `docs/contracts/M3-subtitle-acceptance-workbench.md`，固定不可变 S3 台词版本、可选 S4 画面字版本、双视频、三轨时间轴、完整轻量编辑、撤销恢复、确定性质量检查、逐集/整剧验收、局部返工、来源失效和不可变验收 Release。
- `CURRENT.md` 递增为 v4-246；`PLAN-M3-05` 标记 done，`UI-M3-05` 与 `BACK-M3-05A` 并行 ready，`FRONT-M3-05B` blocked 等待 UI/后端双依赖。未接真实云资源、付费、密钥、服务器或部署。
- 自动接力三段证据已完成：状态先写回 v4-247；FIFO 101/102 分别只唤醒 UI 与后端固定对话；`read_thread` 确认两条消息均送达，两个对话都明确回执并进入 `inProgress`。CURRENT 递增为 v4-248，两个通知队列关闭，任务状态改为 `in_progress`；用户无需传话。
- 项目级 `AGENTS.md` 已补长期授权边界：范围内本地编辑、测试、状态/日志写回、规划审核和固定对话自动接力默认授权；外部、付费、部署、推送和破坏性动作保留确认门。临时只读或自动审批服务故障只登记为工具异常，权限恢复后自动续接。CURRENT 同步为 v4-249。

## 2026-08-15 — S4 画面字 OCR 最终质量门通过并正式关闭

- 关闭同步已发送到固定 UI、前端、后端对话。UI 与前端均明确回执收到且保持等待；后端对话为 `notLoaded`，首次消息入队但没有启动 turn，立即重试时工具返回 `agent loop died unexpectedly`。该对话没有待办或后继依赖，故不反复唤醒；失败已写入 `CURRENT v4-245`，后端下次正常启动时以 CURRENT 为准，用户无需传话。
- UI 已完成 `FRONT-M3-04B` Rev 3 两个原失败场景的正式微终验，`P0=0 / P1=0`：未拆分左右父候选逐条与混合批量门禁、拆分后不可变 Release/SRT，以及来源/当前证据不可用时的全写锁、真实 requestId、唯一重读、防重复和失败/成功焦点恢复全部通过；证据见 `docs/ui/M3-screen-text-acceptance.md` §16。
- 规划按约定只运行一次完整 `pnpm check`。精确隔离数据库 `qimao_planning_s4_close_20260815` 从零应用 22 个迁移；仓库边界、lint、TypeScript、20 个测试文件 184/184、共享契约/后端/前端生产构建全部通过。Vite 构建为 164 modules，仅报告非阻断的 500 kB chunk 提示。
- 隔离数据库已删除并核对残留 0，本地 PostgreSQL 已按用户授权停止。`CURRENT.md` 递增为 v4-244，`FRONT-M3-04B` Rev 3 与 S4 标记 `done`；`LOCAL_APP_PARITY.md` 和 M3 里程碑已同步实际覆盖、真实 OCR 厂商/费用/存储剩余缺口及下一阶段 S5。
- 未提交、推送、部署、购买或创建云资源；未接真实 OCR/网络/密钥/付费/R2，也未自动启动 S5。

## 2026-08-15 — FRONT-M3-04B Rev 3 两场景 UI 微终验通过并交规划

- 使用正式 React、正式 Fastify 与精确隔离 PostgreSQL `qimao_ui_m304b_rev3_20260815_097` 只复验 §15 原失败 A/B；Product Design Audit 先取最小截图再审查，Impeccable 沿用规划新鲜定向结果 `[]`。§15 其余视觉、1440/1024、键盘、滚动和业务矩阵冻结，没有重跑完整页面或修改生产代码。
- 场景 A 通过：两集未拆分左右父候选逐条仅有忽略/拆分；混合批量只提交普通候选并播报父候选保持待确认，发布门禁未虚假放开。两集拆分并完成剩余合法决定后，正式不可变 Release `ccd1648a-2c25-4b6e-aa26-f3feff9ad8f1` 成功，两个 SRT 均含独立左/右 Cue。请求计数为创建 1、决定 4 请求/6 合法项、发布 1。
- 场景 B 通过：来源门禁 blocked/stale 时全部候选写动作和发布锁定；来源就绪时，隔离代理只把原 evidence GET 依次转给正式 3004/3004/3002，得到真实 `503 → 503 → 200`。错误块保留真实原因与 requestId，恰好一个重读；恢复中无重读入口、防重复且写动作全锁；再次失败焦点回重读，成功焦点回 `候选证据与编辑` 容器并恢复合法动作。控制台 `error=0 / warn=0`。
- 结论写入 `docs/ui/M3-screen-text-acceptance.md` §16，仓库外最小证据目录为 `front-m3-04b-rev3-ui-micro`。本轮 `P0=0 / P1=0`，无新增 P2/P3；任务保持 `review` 并交回规划，由规划只运行一次完整 `pnpm check` 后裁决 S4 关闭。
- 清理完成：in-app Browser 隔离标签已关闭，3000/3002/3004 已释放，隔离数据库精确删除并核对残留 0，3 个临时脚本已删除；3001、3010 与共享 PostgreSQL 55432 未触碰。
- v4.3 送达闭环完成：状态、验收与日志先写回 v4-242；正式交审只发送规划固定对话；`read_thread` 确认完整 FIFO 098 消息进入规划最新 inProgress turn，`wait_threads` 确认规划为 `active / inProgress`。同步版本递增为 v4-243，FIFO 098 关闭；UI 停止验收并等待规划最终关闭门，不直接通知前端/后端。

## 2026-08-15 — UI 领取 FRONT-M3-04B Rev 3 两场景微终验

- 已完整重读项目协议 v4.3、`CURRENT.md` v4-240、画面字 UI 验收 §15 与开发日志顶部，并按 Product Design Audit、Impeccable 和既定 in-app Browser 的有界终验流程进入执行。
- 本轮只复验两个原失败场景：未拆分左右父候选的逐条/混合批量资格与拆分后不可变 Release/SRT；来源门禁或当前代表截图 loading/真实失败时的全写锁、真实原因/requestId、唯一证据重读、防重复和失败/成功焦点恢复。§15 其余正式视觉、1440/1024、键盘、业务和控制台矩阵冻结。
- `CURRENT.md` 从 v4-240 最小递增为 v4-241，FIFO 097 转 `active`。不修改生产前后端、迁移、共享契约或 DESIGN，不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-15 — BACK-M3-04D / FRONT-M3-04B Rev 3 规划微审通过并路由 UI 两场景终验

- 规划逐项审计后端决定事务与新增回归，确认未拆分父候选以稳定持久化身份识别，approve/edit 在任何候选更新、事件、批次归约或幂等命令保存前拒绝；ignore/split、拆分左右子候选、普通候选与不可变 Release/SRT 正向链未回归。新鲜独立验证创建精确隔离库 `qimao_planning_m304d_20260815`，从零应用 22 个迁移，screen-text 13/13、正确后端生产构建、`check:repo` 和差异检查通过；隔离库已删除且残留 0，共享 PostgreSQL 未停止。
- 规划逐项审计前端 evidence query、统一 writeLocked、父候选逐条/批量资格和恢复焦点，确认来源或当前证据 loading/error 会清普通/跨页选择并锁定所有候选写入口；错误区忠实展示 Fastify 原因/requestId，唯一重读只 refetch 原 evidence 查询，父候选批量保留不会发送其 POST。新鲜复跑 screen-text 前端 14/14、TypeScript、Vite 164 modules 与差异检查通过。
- `BACK-M3-04D` 标记 done；`FRONT-M3-04B` Rev 3 转 UI 定向微终验。`CURRENT.md` 从 v4-239 最小递增为 v4-240，登记 FIFO 097 `notification_pending`。UI 只复验 §15 两个原失败场景，其他正式矩阵全部冻结；未运行完整 `pnpm check`，其仅在 UI 通过后由规划执行一次。

## 2026-08-15 — FRONT-M3-04B Rev 3 父候选资格与证据统一写锁完成并交规划

- 只修改 `frontend/src/features/screen-text/` 与 `tests/frontend/ScreenTextWorkspace.test.tsx`。用正式持久化投影 `source=ocr + pairGroupId 非空 + position=full` 识别未拆分左右父候选，不解析原文或文案；逐条隐藏直接保留/保存编辑，批量保留排除父项并明确提示先拆分、保持 pending。普通单屏与 `source=split + left/right` 子候选保持既有动作。
- 代表截图由正式 evidence query/fetch 读取，不再以 `img onError` 生成前端错误。来源门禁不满足，或当前代表截图 loading/error 时，候选选择、当前页/跨页选择、批量、人工新增、忽略/拆分/保留/恢复/保存和失败重试统一锁定；真实 `ScreenTextApiError` 原样显示原因与 requestId，错误块只有“重新读取候选证据”，只 refetch 原证据查询并覆盖恢复中防重复、再次失败回焦与成功回到证据区焦点。
- 高价值回归新增可控 evidence pending→503 `REQ-ST-EVIDENCE-503`→唯一人工重读→success、来源门禁零候选写请求、父候选逐条和混合批量只提交合法普通候选，并正向确认普通单屏及拆分子候选动作不回归。新鲜 screen-text 专项 1 文件 14/14、前端 TypeScript、Vite 164 modules 生产构建、Impeccable 定向检测 `[]`、`git diff --check` 全部通过。
- `CURRENT.md` 基于并行后端闭环后的 v4-237 最小递增为 v4-238；FIFO 094 关闭并登记 FIFO 096 `notification_pending`，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`。CSS 视觉主体、后端、迁移、共享契约、DESIGN 与 UI §15 其他冻结证据未改；未运行完整 `pnpm check`，未提交、推送或部署。下一步只正式唤醒规划固定对话并确认送达，不直接通知 UI。
- v4.3 交接闭环完成：正式交审只发送规划固定对话；`read_thread` 已确认完整 FIFO 096 / v4-238 消息进入规划最新 turn，规划任务为 `active / inProgress`。同步版本递增为 v4-239，FIFO 096 关闭；前端停止修改并等待规划独立微审，不直接通知 UI。

## 2026-08-15 — BACK-M3-04D Rev 1 左右父候选决定门禁完成并交规划

- 只修改 `screen-text.write.repository.ts` 与对应后端专项测试。权威决定事务用已有持久化事实 `source='ocr' + pair_group_id 非空 + position='full'` 识别未拆分左右同屏父候选；不使用原文换行、文字内容、文件名或浏览器推断，也无需迁移或共享契约变化。
- 父候选直接 approve/edit 在任何候选更新、事件、批次归约或幂等命令保存前稳定返回 `422 SCREEN_TEXT_DECISION_INVALID`。回归逐项比较失败前后目标候选状态/修订/文字、批次状态/修订/计数、目标 DecisionEvent 和两枚幂等键命令，全部零副作用。
- 正向回归覆盖父候选 ignore、在匿名测试中移除原文换行后仍可按持久化身份 split、拆分子候选保持 `source=split / position=left|right / status=edited`、普通单屏候选 approve，以及批次完成后原有不可变 Release/SRT 成功包含左右独立 Cue。既有发布事务未修改。
- 新鲜验证使用精确隔离数据库 `qimao_back_m304d_20260815_093`：从零应用 22 个迁移，screen-text 专项 13/13；后端生产构建、`check:repo`、`git diff --check` 全部通过。隔离库已精确删除且残留 0，共享 PostgreSQL 未停止；按边界未运行完整 `pnpm check`。
- 状态已写回：`CURRENT.md` 基于并行前端写入后的 v4-235 最小递增为 v4-236，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO 093 关闭并登记 FIFO 095 `notification_pending`。未改服务层、迁移、共享契约、Worker/Adapter、证据/播放、发布事务、生产前端或 DESIGN，未接真实 OCR/网络/密钥/付费/R2，未提交、推送或部署；下一步只唤醒规划并确认送达。
- v4.3 交接闭环完成：正式交审只发送规划固定对话；`read_thread` 已确认完整 FIFO 095 / v4-236 消息进入规划最新 turn，规划任务为 `active / inProgress`。同步版本递增为 v4-237，FIFO 095 关闭；后端停止修改并等待规划独立微审，不直接通知前端/UI。

## 2026-08-15 — FRONT-M3-04B Rev 3 领取与状态映射预检

- 已重读 v4.3 协议、`CURRENT.md` v4-234、画面字 UI 验收 §15、正式 screen-text 前端/API 与开发日志；确认 FIFO 094 为 `ready / Current actor=前端开发对话`，本轮与 `BACK-M3-04D` 目录互不重叠可受控并行。
- 预检确认无需修改共享契约：未拆分左右父候选可由正式 `source=ocr + pairGroupId + position=full` 身份识别，拆分后子候选为 `source=split + position=left/right`；证据读取端点的 Fastify 错误可由既有 `ScreenTextApiError` 忠实保留原因、retryable、action 和 requestId。
- 计划只收口两组 P1：父候选仅忽略/拆分且批量保留排除并提示；来源门禁或当前 evidence query loading/error 时统一锁定候选写操作，失败块只提供“重新读取候选证据”并在再次失败/成功后确定焦点。CSS 视觉主体、后端、迁移、共享契约、DESIGN 和 §15 其他通过项冻结。
- `CURRENT.md` 从 v4-234 最小递增为 v4-235，FIFO 094 转 `active`，任务转 `in_progress`。本轮不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-15 — 后端领取 BACK-M3-04D Rev 1 左右父候选决定门禁

- 已重读项目协议 v4.3、`CURRENT.md` v4-233、画面字 UI 终验 §15、S4 权威工作流与日志顶部；确认唯一后端缺口是合法决定校验发生过晚：未拆分左右同屏父候选当前可直接 approve/edit，直到不可变发布事务才被严格配对门禁拒绝。
- 本轮只在 screen-text 后端权威写状态机及对应后端测试中，用稳定持久化身份识别未拆分父候选；只允许 ignore 或 split，approve/edit 稳定 422 且目标候选、批次修订/计数、DecisionEvent 和幂等命令零副作用。拆分后左右子候选、普通单屏候选和发布事务保持不变。
- `CURRENT.md` 从 v4-233 最小递增为 v4-234，FIFO 093 转 `active`，任务转 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。不改迁移、共享契约、Worker/Adapter、证据/播放、发布事务、生产前端或 DESIGN；不接真实 OCR/网络/密钥/付费/R2，不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-15 — FRONT-M3-04B Rev 2 两项 P1 根因裁决并拆定向并行返工

- 规划审阅正式 UI 终验 §15、正式前端动作投影和后端画面字写状态机，确认两项 P1 均成立。左右同屏父候选在前端可直接批量保留，后端也允许 pending→approved/edited，直到发布事务才检查 `{left,right}`，属于合法决定校验发生过晚；来源门禁只影响创建入口、没有进入当前候选写锁，代表截图又由浏览器图片失败文案处理，无法保留 Fastify `requestId` 或形成权威重读闭环。
- 拆为两个目录互不重叠的最小切片：`BACK-M3-04D` Rev 1 只把未拆分左右父候选的决定资格前置到后端，直接保留/编辑稳定 422 且零副作用，忽略/拆分与拆分后发布链保持；`FRONT-M3-04B` Rev 3 只同步动作资格和批量语义，把来源/当前证据就绪纳入统一候选写锁，并为代表截图正式读取失败提供原因、请求标识和唯一重读。
- `CURRENT.md` 从 v4-232 最小递增为 v4-233；FIFO 092 关闭，登记 FIFO 093/094 `notification_pending`。允许后端与前端在互不重叠目录受控并行；其他 §15 通过项冻结，UI 不参与编码，完整 `pnpm check` 继续等待双修正与 UI 两场景微终验通过。

## 2026-08-15 — FRONT-M3-04B Rev 2 正式 UI 终验退回两项 P1

- UI 使用 Product Design Audit、Impeccable 与既定 in-app Browser，在正式 React `3000`、Fastify `3001`、共享 PostgreSQL 上的精确隔离库 `qimao_ui_m304b_20260815_091` 完成一次完整领域终验；匿名项目、公司 SRT、术语 V2、整剧/单集批次、失败重试、明确空集和人工候选均经正式 API/页面建立，没有改生产代码、业务表、迁移或共享契约。
- 同状态高保真、正常双门禁、三范围、项目级批次/候选查询与排序、四态候选、当前页选择、stale 只读唯一新批次入口、失败重试、取消弹窗、证据放大、1440/1024 两态和控制台均通过。1024 侧栏 204/72px 时根页面均为 `1014/1014`，候选表为 `560/780`、`692/780`；控制台 `error/warn=0/0`，Impeccable 定向检测 `[]`。Rev 1 不可变 Release 与同 exportId 下载证据冻结引用。
- P1 一：未拆分的“左侧文字 / 右侧文字”双屏父候选可被批量保留，批次随即显示“已完成/可以发布”；正式发布被服务端以“左右配对必须恰好保留一条左轴和一条右轴”拒绝，而完成态右侧只剩“保存修改”，没有拆分、撤销或恢复入口。P1 二：隔离 backend 精确重启后真实恢复数据库批次但证据对象不可用，页面显示来源门禁未满足与代表截图不可用，“忽略/拆分左右/保留并下一条/保存修改”及候选选择仍 enabled，且没有带请求标识的唯一证据重读。
- 证据已追加到 `docs/ui/M3-screen-text-acceptance.md` §15；仓库外目录为 `front-m3-04b-rev2-ui-final`，阻断截图为 `06-p1-approved-dual-no-correction.png`、`07-p1-release-gate-mismatch.png`、`11-p1-evidence-unavailable-actions-enabled.png`。本轮结论 P0=0/P1=2/P2=2/P3=0，正式 UI 终验不通过。
- 状态已写回：`CURRENT.md` 从 v4-230 最小递增为 v4-231，FIFO 091 关闭并登记 FIFO 092 `notification_pending`；任务保持 Rev 2 并转 `blocked / Current actor=规划对话 / Reviewer=规划对话`。完整 `pnpm check` 继续冻结，下一步只通知规划总线并确认送达，不直接通知前端。
- v4.3 交接闭环已完成：正式退审只发送规划固定对话；`read_thread` 确认完整 P1、证据和最小建议进入规划最新 turn，`wait_threads` 确认规划为 `active / inProgress`，规划已明确开始处理左右配对的决定门禁根因。`CURRENT.md` 最小递增为 v4-232，FIFO 092 转 `active`。隔离数据库已删除且残留 0，3000/3001 服务已停止，本轮临时脚本/日志残留 0；既有 3010 与共享 PostgreSQL 55432 未停止。

## 2026-08-15 — FRONT-M3-04B Rev 2 规划微审通过并路由 UI 正式终验

- 规划逐项核对 `CommandInput` 判别联合、mutation 和 `CommandDialog` 首次提交：cancel/retry/empty/manual/release 的 batch、episode、episodeNumbers、expectedBatchRevision、manual body 和幂等键均在 intent 中一次冻结；mutation 与恢复不再读取实时 `detail.data` 或 `dialog`。
- 新鲜复验：screen-text 专项 1 文件 11/11；前端 TypeScript 通过；Vite 生产构建 164 modules；`git diff --check` 通过。两条未知结果回归确认 revision 5→6 后同 key/同真实 body，确定性 409 回归确认清意图后新 key/new revision。
- 规划接受 Rev 2，FIFO 090 关闭并登记 FIFO 091 `notification_pending`；正式 UI 终验只检查正式 React+Fastify/PostgreSQL 的同状态高保真、完整状态/异步/键盘/响应式/控制台矩阵，不改生产代码。UI 通过后规划只运行一次完整 `pnpm check` 关闭 S4。
- `CURRENT.md` 从 v4-228 最小递增为 v4-229。未改生产前后端、CSS、迁移、共享契约或 DESIGN，未接真实 OCR/网络/密钥/付费/R2，未提交推送部署。
- v4.3 路由闭环已完成：规划只唤醒 UI 固定对话；`wait_threads` 确认 UI 明确接收 FIFO 091 并进入 `active / inProgress`，按 Product Design Audit + Impeccable + 既定 in-app Browser 执行正式终验。`CURRENT.md` 最小递增为 v4-230，FIFO 091 转 `active`；生产前端冻结，未通知前端返工。

## 2026-08-15 — FRONT-M3-04B Rev 2 完整请求意图冻结并交规划微审

- 仅修改 `ScreenTextWorkspace.tsx` 与 `ScreenTextWorkspace.test.tsx`。五类 `CommandInput` 改为完整后端请求身份判别联合：首次提交冻结 `kind`、批次/集数、失败集集合、批次修订、人工新增 body 和幂等键；mutation 与重试只读取冻结 intent，不再从实时 `detail.data` 或 `dialog` 重组 URL/请求体。
- 未知/可重试失败继续重放首次完整事实；确定性非重试错误继续清除旧 intent 并刷新服务端权威详情，下一次用户显式提交生成新 key 和新请求体。取消、失败集重试、明确空集、人工新增和发布共用同一安全边界，没有新增浏览器业务状态源。
- 回归新增两条可控 pending→503→详情 revision 由 5 变 6→人工恢复链路：`confirm-empty` 第二次仍为原 key 与 `{ expectedBatchRevision: 5 }`，`release` 第二次仍为原 key 与 `{ batchId, expectedBatchRevision: 5 }`；另补确定性 409，证明刷新后新提交使用新 key 与 `{ expectedBatchRevision: 6 }`。
- 新鲜验证：`pnpm exec vitest run tests/frontend/ScreenTextWorkspace.test.tsx` 为 1 文件 11/11；前端 TypeScript 通过；Vite 生产构建 164 modules；`git diff --check` 退出码 0（仅既有 CURRENT/日志 CRLF→LF 提示）。未运行完整 `pnpm check`，未改 CSS、视觉、API、后端、迁移、共享契约、DESIGN，未重做 Rev 1 浏览器矩阵，未提交、推送或部署。
- 状态已写回：`CURRENT.md` 从 v4-226 最小递增为 v4-227，FIFO 089 关闭并登记 FIFO 090 `notification_pending`；任务转 `review / Current actor=规划对话 / Reviewer=规划对话`。下一步只正式唤醒规划固定对话并确认送达，不直接通知 UI。
- v4.3 交接闭环完成：正式交审只发送规划固定对话；`read_thread` 确认完整 FIFO 090 消息进入规划最新 turn，`wait_threads` 确认规划为 `active / inProgress`。`CURRENT.md` 最小递增为 v4-228，FIFO 090 转 `active`；未直接通知 UI，前端停止修改并等待规划微审。

## 2026-08-15 — FRONT-M3-04B Rev 1 规划预审退回同键异参 P1

- 规划完成正式画面字前端的状态源、异步恢复和同状态截图预审。服务端批次/候选/Release 读取、stale 只读、历史 exportId、候选四排序、当前页/显式跨页选择和 1440/1024 三栏结构均与冻结范围一致；新鲜运行画面字专项 8/8、前端 TypeScript、Vite 164 modules 生产构建和 `git diff --check` 全部通过。
- 唯一 P1 位于 `ScreenTextWorkspace.tsx` 的命令恢复：`commandIntent` 保存的是 UI 层 `kind` 和人工新增 body，但 `confirm-empty`、`release` 的真实 API body 每次 mutation 都从当前 `detail.data.revision` 重新组装。未知/可重试响应后，详情可能因并发或窗口重新聚焦发生刷新；再次点击“重试同一意图”会以原幂等键携带新的 `expectedBatchRevision`，后端请求摘要不同并稳定拒绝 `SCREEN_TEXT_IDEMPOTENCY_KEY_REUSED`。现有人工新增回归只证明 manual body 冻结，不能覆盖该缺口。
- 集中递增 `FRONT-M3-04B` Rev 2：首次提交时冻结五类命令完整请求身份，mutation 只消费该冻结事实；至少补 `confirm-empty` 与 `release` 两条“第一次 503/未知→详情修订变化→第二次同键同体”的回归。其余生产代码、CSS、视觉、正式 API/后端、迁移、共享契约、DESIGN 与 Rev 1 浏览器证据全部冻结。
- `CURRENT.md` 从 v4-224 最小递增为 v4-225，FIFO 088 关闭并登记 FIFO 089 `notification_pending`。本轮不路由 UI、不运行完整 `pnpm check`；完成后只交规划微审，用户无需传话。
- v4.3 派发闭环已完成：规划只唤醒前端固定对话；`wait_threads` 确认前端明确接收 FIFO 089 并进入 `active / inProgress`。`CURRENT.md` 最小递增为 v4-226，FIFO 089 转 `active`，任务转 `in_progress`；UI 未被提前唤醒。

## 2026-08-15 — FRONT-M3-04B Rev 1 正式画面字 React 工作台完成并交规划

- 在既有 AppShell 注册正式画面字路由与模块，新增 `features/screen-text` API、Workspace、Panels 和专属样式。页面只消费正式 PostgreSQL/API 权威事实，完成“集/批次队列—紧凑候选表—同源截图/视频证据与编辑”三栏，并覆盖双门禁、整剧/选中集/单集、11 类逐集状态、四态候选、服务端批次/候选/Release 查询、当前页与显式跨页选择、全部人工命令、取消/安全重试/需对账、stale 只读、原子不可变发布与历史 exportId 下载。
- 异步状态以冻结意图为边界：网络未知/可重试重放原 `kind/body/key`，确定性冲突清旧意图并刷新权威事实；候选 query identity 包含 batch/episode/search/status/category/sort/page，任何成员页变化先清普通选择，显式全部待确认保持独立语义。补两项终审回归证明排序不会提交隐藏旧候选，人工新增 503 后即使表单被编辑，唯一恢复仍原样重放第一次 body 与幂等键。
- 媒体只使用真实 `previewPath` 和短时播放授权。本地零网络 Adapter 返回证据不可用时，卸载失败图片、保留同构媒体区和 `role=alert` 明确阻断；不伪造截图、视频、OCR、术语命中、用量、集数或成功。`zero_network_call` 仅员工化显示为“零网络调用 N 次”，没有泄露供应商私参或费用配置。
- 新鲜验证：画面字专项 8/8；全部前端 9 文件 82/82；前端 TypeScript 通过；Vite 生产构建 164 modules；`git diff --check` 通过。Impeccable 单次定向检测发现 8 条同源单侧粗色边，已统一改为顶边/浅底/内轮廓；新鲜 finish reviewer 在两项状态修正后给出 `finish`、无 material finding。
- 真实浏览器走通素材/术语 V1→零网络批次→候选保留/忽略→1/1 完成→不可变 V1→历史 SRT；刷新前后 download URL 保持同一 exportId，发布/历史弹窗初始焦点、Escape 关闭和触发点恢复成立，控制台 `error/warn=0/0`。1440 根页面 `1430/1430`；1024 展开/收起侧栏 204/72px，根页面均 `1014/1014`，候选表容器为 `560/780`、`692/780`。最新版仓库外截图：`front-m3-04b/formal-1440x900-expanded.png`、`formal-1024x768-expanded.png`、`formal-1024x768-collapsed.png`、`formal-release-history-1440x900.png`。有意差异仅为真实 1 集项目、真实完成/Release 状态与零网络证据不可用事实。
- 状态已写回：`CURRENT.md` 从 v4-222 最小递增为 v4-223，FIFO 087 关闭并登记 FIFO 088 `notification_pending`；任务转 `review / Current actor=规划对话 / Reviewer=规划对话`。完整 `pnpm check` 依约留 UI 终验后的 S4 单次关闭门；未改后端、迁移、共享契约、DESIGN，未接真实 OCR SDK/网络/密钥/付费/R2，未提交、推送或部署。下一步只正式唤醒规划并确认送达/运行态，不直接通知 UI。
- v4.3 交接闭环完成：正式唤醒只发送规划固定对话；`read_thread` 确认 FIFO 088 完整消息进入规划最新 turn，`wait_threads` 确认规划为 `active / inProgress`，规划明确回执已收到并开始独立差异审计与定向复跑。`CURRENT.md` 最小递增为 v4-224，FIFO 088 转 `active`；未直接通知 UI，用户无需传话。

## 2026-08-15 — BACK-M3-04C 规划独立复验通过并恢复正式前端

- 规划逐项审计共享 `screen-text` 契约、正式路由、读取仓储、服务与后端回归：项目级批次列表由 PostgreSQL 提供状态筛选、ID/requestId 搜索、`updated_desc|created_desc`、稳定分页和真实 total；项目级 Release 列表按版本/文件名/batchId 搜索并忠实恢复既有 Release/Export 身份与下载路径；候选默认 `identity_first`，并支持 `time_asc|confidence_desc|pending_first`，所有排序均以不可变时间与 ID 补稳定次序。
- 新鲜独立验证使用精确隔离数据库 `qimao_planning_m304c_20260815`：从零应用 22 个迁移，`tests/backend/screen-text.test.ts` 为 12/12；共享 contracts 与后端生产构建、`check:repo`、`git diff --check` 全部退出码 0。验证结束只删除该精确隔离库，最终残留 0；共享 PostgreSQL 与既有服务未停止或清理。
- 规划接受 `BACK-M3-04C` Rev 1 并标记 done。原 `FRONT-M3-04B` 冲突已经解除，正式前端恢复为 ready：必须消费新增项目级批次/发布列表和四种服务端排序，继续按 `DESIGN.md` 5.5A、画面字 UI 验收 §1–14 及最终原型实现同状态高保真 React，不得使用浏览器历史 ID 缓存、当前页假排序、前端推算或原型假数据。
- `CURRENT.md` 从 v4-220 最小递增为 v4-221，登记 FIFO 087 `notification_pending`。完整 `pnpm check` 继续留在正式 React 经 UI 终验后的 S4 单次关闭门；未提交、推送、部署，未接真实 OCR SDK/网络/密钥/付费/R2。
- v4.3 派发闭环完成：正式唤醒只发送前端固定对话 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf`；`wait_threads` 确认前端明确收到 FIFO 087 并为 `active / inProgress`，已开始重读权威 UI、工作流和新增只读契约。同步版本递增为 v4-222，FIFO 087 转 `active`，任务转 `in_progress`；规划不并发修改生产前端，用户无需传话。

## 2026-08-15 — BACK-M3-04C Rev 1 只读解阻完成并交规划

- 共享契约与正式 API 新增项目级批次列表：服务端按状态筛选，按批次 ID/首次请求标识搜索，支持 `updated_desc|created_desc`、limit/offset、真实 total 和稳定 ID tie-break；摘要保留 scope、集数、术语/清单身份与版本、状态、修订、计数和时间，不复制 Job 全详情。读取可复用既有来源 stale 投影，但不创建业务事实。
- 新增项目级不可变 Release 列表：服务端按版本、文件名或 batchId 搜索，支持 `version_desc|created_desc` 与稳定分页；从 PostgreSQL 忠实恢复原 releaseId、版本、绑定身份、摘要、Cue 数和既有 Export 的 ID/集数/文件名/SHA-256/大小/下载路径，不创建、重建或重新绑定 Export。
- 候选查询新增 `identity_first`（默认，人名条优先后按首次出现）、`time_asc`、`confidence_desc`、`pending_first` 四种服务端排序；所有排序以 episode/start/end/id 等不可变字段补确定次序。TypeBox 保持 `additionalProperties:false`，未知 sort 和未知字段均返回 400。
- 回归新增两个批次的状态/标识搜索、两种排序与分页/空页 total；四种候选排序的并列值和跨页无重复漏项；两个不可变 Release 的刷新发现、三类搜索、原 Export ID/下载字节稳定，以及读取前后 Release/Cue/Export/command 数量不增。
- 新鲜验证使用精确隔离数据库 `qimao_back_m304c_20260815_085`：从零应用 22 个迁移，screen-text 专项 12/12；共享 contracts 与后端构建、`check:repo`、`git diff --check` 全部通过。隔离库已精确删除且残留 0，共享 PostgreSQL 未停止；按边界未运行完整 `pnpm check`。
- 状态已写回：`CURRENT.md` 从 v4-218 最小递增为 v4-219，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO 085 关闭并登记 FIFO 086 `notification_pending`。未改迁移、生产前端/DESIGN、Worker/Adapter、写仓储、证据/播放/发布事务，未接真实 OCR/网络/密钥/付费/R2，未提交、推送或部署；下一步只唤醒规划总线并确认送达，不直接通知或解锁前端。
- v4.3 交接闭环完成：正式交审只发送规划固定对话；`read_thread` 已确认完整 FIFO 086 / v4-219 消息进入规划最新 turn，规划任务为 `active / inProgress`。同步版本递增为 v4-220，FIFO 086 关闭；后端停止修改并等待规划独立复验，不直接通知或解锁前端。

## 2026-08-15 — FRONT-M3-04B 预检冲突成立并拆 BACK-M3-04C 只读解阻

- 规划独立核对冻结 UI、S4 工作流、共享 `screen-text` 查询契约、正式路由和读取仓储，确认前端冲突成立：项目级批次/发布发现列表不存在，新开页面无法从 PostgreSQL 恢复历史 `batchId/releaseId`；候选查询没有排序枚举且仓储固定时间顺序。浏览器缓存历史 ID、当前页假排序或原型数据都违反唯一权威状态和高保真门，前端停止编码是正确处理。
- 新增 `BACK-M3-04C` Rev 1，只补三项只读能力：批次历史列表、不可变发布历史列表、四种候选服务端稳定排序。批次列表固定状态筛选、ID/请求标识搜索、`updated_desc/created_desc` 与分页；发布列表固定版本/文件名/批次身份搜索、`version_desc/created_desc`、原 Release/Export 身份与分页；候选固定 `identity_first/time_asc/confidence_desc/pending_first`，均用不可变字段补稳定次序。
- 本任务不新增迁移，不修改 OCR Worker、Adapter、写状态机、证据/播放、发布事务、生产前端或冻结 UI；回归必须证明刷新可发现、空页保留真实 total、历史下载 ID 不重建、列表读取零业务新增和四种排序跨页稳定。完整 `pnpm check` 仍只在正式 React 经 UI 终验后运行。
- `CURRENT.md` 从 v4-216 最小递增为 v4-217，FIFO 084 关闭并登记 FIFO 085 `notification_pending`；`FRONT-M3-04B` 保持 blocked，待 `BACK-M3-04C` 规划独立验收通过后自动恢复，不要求用户传话。
- v4.3 派发闭环完成：正式唤醒只发送后端固定对话 `019ff4de-084b-7002-a7eb-20ff93d97d0a`；`wait_threads` 确认后端明确收到 FIFO 085 并为 `active / inProgress`。同步版本递增为 v4-218，FIFO 085 转 `active`，`BACK-M3-04C` 转 `in_progress`；规划不并发修改后端只读链路，前端继续安全等待。

## 2026-08-15 — FRONT-M3-04B Rev 1 编码前契约冲突审查

- 已完整重读 v4.3 协议、`CURRENT.md` v4-214、`DESIGN.md` 5.5A、画面字 UI 验收 §1–14、S4 工作流契约、共享 `screen-text` TypeBox、正式路由/读写/播放仓储和冻结原型；完成创建、读取、候选、决定、空集、取消、重试、证据、播放授权、发布与错误恢复的编码前映射。现有写状态机、证据和原子发布接口可复用，未发现需要前端复制 OCR/Usage/术语事实的理由。
- 冲突类型：UI/交互、代码契约与数据所有权。权威工作流和 UI 要求批次历史、不可变发布历史下载、服务端候选排序及刷新恢复；原型也有“批次历史”和“人名条优先/时间升序/置信度高到低/待确认优先”四种排序。但共享候选查询仅有 `episodeNumber/status/category/search/limit/offset`，正式仓储固定按 `episode_number/start_ms/end_ms/id` 排序；路由只支持创建批次、按已知 `batchId` 读取，以及创建发布、按已知 `releaseId` 读取，没有项目级批次或发布列表。
- 可复现证据：`packages/contracts/src/screen-text.ts:230-237`、`backend/src/modules/screen-text/screen-text.routes.ts:77-160`、`backend/src/modules/screen-text/screen-text.read.repository.ts:112`，对照 `docs/contracts/M3-screen-text-workflow.md:96,125` 与 `docs/ui/M3-screen-text-acceptance.md:51,55,106,125`。新开正式项目页无法从 API 发现当前/历史批次或发布版本，刷新后也不能仅凭 PostgreSQL 权威事实恢复历史下载；任意排序参数会被 TypeBox `additionalProperties:false` 拒绝。
- 影响与最小建议：三栏工作台的左栏批次历史、候选排序/跨页集合语义、发布历史和刷新恢复均受影响；建议只新增项目级批次列表、发布列表的服务端搜索/筛选/稳定排序/分页只读契约，并为候选查询增加四种已确认排序枚举。无需改迁移、OCR Worker、既有写状态机或 UI。缺口未关闭前不能以浏览器缓存、当前页假排序、固定原型数量或其他前端副本代替数据库权威状态，因此没有可安全提交的生产前端子集。
- 状态已写回：`CURRENT.md` 从 v4-214 最小递增为 v4-215，`FRONT-M3-04B` Rev 1 转 `blocked / Current actor=规划对话 / Reviewer=规划对话`；FIFO 083 关闭并登记 FIFO 084 `notification_pending`。本轮未修改 `frontend/`、`tests/frontend/`、后端、迁移、共享契约、DESIGN 或 UI 原型，未运行实现测试/构建，未提交、推送或部署。下一步只唤醒规划总线并确认送达，不直接通知 UI 或后端。
- v4.3 交接闭环完成：状态已写回 v4-215；正式唤醒已只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`；`read_thread` 确认完整 FIFO 084 消息出现在规划当前 turn，`wait_threads` 确认规划为 `active / inProgress`。同步版本递增为 v4-216，FIFO 084 关闭；前端保持阻塞，不通知 UI/后端，不要求用户传话。

## 2026-08-15 — BACK-M3-04A Rev 2 规划独立复验通过并解锁正式前端

- 规划独立代码审查确认五组 P1 已进入正式实现：普通重试只允许最新 Attempt 明确可重试且无外部副作用、安全取消或零候选，取消后的未知结果保持需对账；整剧范围由最新清单完整集派生并逐集验证 `screen_video`，创建与后续写入固定最新 TermVersion；Worker 经引擎中立 EvidenceStorage 保存派生证据字节，读取端校验项目候选、批次/集数归属、摘要、大小和类型；发布严格要求每组 `{left,right}`；批次 Usage 从持久 Attempt 按 provider/单位/币种分组，不再写死 fake 单位。
- 新鲜独立验证使用精确隔离库 `qimao_planning_m304a_rev2_20260815`：从零应用 22 个迁移；screen-text、terms、ASR、ASR Dispatch、pre-review 共 5 文件 47/47；共享 contracts 构建与后端生产构建均通过。无论验证结果如何均执行精确清理，最终隔离库残留为 0；共享 PostgreSQL `127.0.0.1:55432` 未停止或清理。
- 规划接受 `BACK-M3-04A` Rev 2 并标记 done。UI 与后端双依赖均满足，`FRONT-M3-04B` Rev 1 解锁：权威输入为 `DESIGN.md` 5.5A、画面字 UI 验收 §1–14、最终原型/10 张冻结证据、共享 `screen-text` 契约和正式 API。前端必须在既有 AppShell 中同状态高保真复原三栏工作台与完整状态矩阵，只消费真实后端事实，并提交 1440/1024 同视口证据及有意差异清单。
- `CURRENT.md` 从 v4-212 最小递增为 v4-213，FIFO 083 登记 `notification_pending`。完整 `pnpm check` 留正式 React 经 UI 终验后的 S4 单次关闭门；未提交、推送、部署，未接真实 OCR SDK/网络/密钥/付费/R2，也未创建云资源。
- v4.3 派发闭环完成：正式唤醒只发送前端固定对话 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf`；`wait_threads` 确认目标为 `active / inProgress`，前端已开始重读权威输入并进行契约/异步状态映射预检。同步版本递增为 v4-214，FIFO 083 转 `active`，任务转 `in_progress`；规划不并发修改生产前端，用户无需传话。

## 2026-08-15 — BACK-M3-04A Rev 2 五组集中返工完成并交规划

- 付费防重收口：普通重试只选择 latest Attempt `retryable=true / externalSideEffectPossible=false` 的失败、安全取消或明确零候选；`reconciliation_required` 永不进入普通重试。取消已请求后若 Adapter 返回未知或可能已有外部副作用，Attempt/Job/Batch 保持需对账，回归证明拒绝重试时 Attempt、Job 与幂等命令零副作用且不会发生第二次 Worker 调用。
- 来源一致性收口：`scope=all` 先从最新清单派生完整集数，再逐集验证已校验 `screen_video`，缺一集整体稳定阻断；创建必须使用项目最新已确认 TermVersion，后续新版本使旧批次刷新为 stale，候选写入与发布均稳定阻断且事件/命令/Release 零新增。
- 证据与发布收口：新增引擎中立 `ScreenTextEvidenceStorage`，零网络 Adapter 生成实际 SVG 字节，Worker 保存对象，读取端按项目候选、批次/集数前缀、SHA-256、大小与 content type 校验并返回原字节；对象缺失稳定 409 且不泄露 objectKey/Secret。发布前每个保留 pair group 必须恰有两项且位置集合严格为 `{left,right}`，否则 Release/Cue/Export 全部零新增。
- Usage 收口：批次不再硬编码 `zero_network_call / CNY`，而是从已持久化 Attempt Usage 按 provider、billingUnit、currency 确定分组；同构组确定聚合，异构组明确 `split`，不跨单位或币种求和。零网络 cloud API stub 实际返回 `image / 8 / USD / 0.08` 并通过正式 API 读取回归。
- 新鲜验证均使用精确隔离数据库 `qimao_back_m304a_rev2_20260815`：从零应用 22 个迁移；画面字专项 9/9；画面字、术语、ASR、ASR Dispatch、前置审改合计 5 文件 47/47；共享 contracts 与后端生产构建、`check:repo`、`git diff --check` 全部通过。隔离库已删除且残留计数 0，默认 `127.0.0.1:55432` 继续 accepting connections；完整 `pnpm check` 按边界留 S4 关闭门。
- 状态已写回：`CURRENT.md` 从 v4-210 最小递增为 v4-211，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO 081 关闭并登记 FIFO 082 `notification_pending`。未改生产前端或 DESIGN，未接真实 SDK/网络/密钥/付费/R2，未提交、推送或部署；下一步只唤醒规划总线并确认送达，不直接通知或解锁前端。
- v4.3 交接闭环完成：正式交审只发送规划固定对话；`read_thread` 已确认完整 FIFO 082 / v4-211 消息进入规划当前 turn，`wait_threads` 显示规划 `active / inProgress`。同步版本递增为 v4-212，FIFO 082 关闭；后端停止修改并等待规划独立复验，不通知或解锁前端。

## 2026-08-15 — 后端领取 BACK-M3-04A Rev 2 五组集中返工

- 完整重读项目协议 v4.3、`CURRENT.md` v4-209、画面字权威契约和开发日志顶部；确认规划从零 22 个迁移与现有 screen-text 6/6 已通过，Rev 1 三类 Registry/Worker/PostgreSQL 主链、候选审改、确定性 SRT 和无泄密事实冻结。
- 本轮只集中修正五组 P1：普通重试与取消未知的外部副作用防重；scope=all 完整集门禁与项目最新 TermVersion 来源；首版 Storage fake 的真实派生截图字节/摘要/归属链路；发布前 pair group 严格 `{left,right}`；忠实投影 Attempt Usage 并用非零 cloud stub 证明不再硬编码 fake 单位。
- `CURRENT.md` 从 v4-209 最小递增为 v4-210，任务转 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`，FIFO 081 转 `active`。不修改生产前端/DESIGN，不接真实 SDK/网络/密钥/付费/R2，不扩展管理员 API/服务器；完整 `pnpm check` 留 S4 关闭门。

## 2026-08-15 — UI-M3-04 关闭并集中退回 BACK-M3-04A Rev 2

- UI 最终微复验通过：stale 页三项旧决定均不可见且 disabled，唯一可见 enabled 写动作是“从新来源新建批次”，新鲜控制台为空。Rev 1/2 完整设计证据冻结，`UI-M3-04` 标记 done。
- 规划在精确隔离数据库 `qimao_planning_m304a_20260815` 从零应用 22 个迁移并运行 `tests/backend/screen-text.test.ts`，现有 6/6 通过；随后删除隔离库并复核残留为 0。通过项包括三类零网络 Adapter 正式链路、租约、候选、审计、空集和 UTF-8 BOM SRT。
- 独立代码/契约审查一次性发现五组现有测试漏项：普通重试未排除需对账/不可重试/可能外部副作用 Attempt，取消未知结果被压成 cancelled；整剧可能静默漏缺视频集且术语新版本未使旧批次只读；截图端点返回合成 SVG 而非 Adapter 对象字节；pair group 只看位置集合大小并把非 left 当 right；批次 Usage 硬编码零网络单位与 CNY。上述均与 S4 契约的付费防重、完整门禁、真实证据、左右双轴或引擎中立回执冲突。
- `BACK-M3-04A` 集中递增 Rev 2，只在 screen-text 后端/共享契约/测试必要范围内一次修正并补高价值回归；不接真实网络、SDK、密钥、付费或 R2，不改前端/DESIGN。`CURRENT.md` 更新至 v4-209，FIFO 081 `notification_pending`；`FRONT-M3-04B` 继续 blocked。

## 2026-08-15 — UI-M3-04 Rev 3 最后两个 stale 动作关闭并交规划

- 根因确认：`.decisionRow { display:grid }` 覆盖了 HTML `hidden` 的默认呈现。仓库外原型只补 `.decisionRow[hidden] { display:none }`，并在 stale 权限投影中原生禁用“忽略”“拆分左右”“保留并下一条”；既有 `staleReadOnly` 事件守卫继续作为第二层保护。
- 规划同形 URL `?view=stale&planning-audit=rev3` 的新鲜真实 DOM：`#ignoreOne` 与 `#keepOne` 均为 `count=1 / visible=false / enabled=false`，`#splitOne` 同为不可见且 disabled；全页可见且 enabled 的 `data-write-action` 恰好 1 项，为 `#primaryAction / new-source-batch / 从新来源新建批次`。
- 新鲜标签控制台日志为空；`node --check app.js` 与授权文档 `git diff --check` 通过。验收记录新增 §13；Rev 1/2 页面矩阵、视觉、响应式、键盘、弹窗和 10 张证据冻结未重跑，没有新增截图集。
- `CURRENT.md` 从 v4-206 最小递增为 v4-207；任务转 `review / Current actor/Reviewer=规划对话`，FIFO 079 关闭并登记 FIFO 080 `notification_pending`。未改 DESIGN、生产前后端、迁移或共享契约，未通知前端；下一步只唤醒规划微复验并确认送达。
- v4.3 交接闭环完成：正式交审只发送规划固定对话；`read_thread` 已确认完整 FIFO 080 / v4-207 消息进入规划当前 turn，`wait_threads` 显示规划 `active / inProgress`。同步版本递增为 v4-208，FIFO 080 关闭；UI 停止修改并等待规划裁决，未通知前端。

## 2026-08-15 — UI 领取 UI-M3-04 Rev 3 最后两个 stale 动作微返工

- 重读 `CURRENT.md` v4-205、画面字 UI 验收 §12 与日志顶部，确认唯一缺口为右侧“忽略”“保留并下一条”仍 `visible=true / enabled=true`；候选选择、编辑控件、行尾查看、新来源弹窗及 Rev 1/2 其余证据全部冻结。
- `CURRENT.md` 最小递增为 v4-206，任务转 `in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`，FIFO 079 转 `active`。本轮只补真实隐藏/原生禁用和精确 DOM 证明，不改 DESIGN、生产前后端、迁移或共享契约，不通知前端。

## 2026-08-15 — UI-M3-04 Rev 2 规划微复验退回最后两个 stale 动作

- 规划在独立本机标签强制重载 `?view=stale&planning-audit=rev2`。通过项冻结：候选选择与编辑控件禁用、行尾统一“查看”、旧范围只定位、唯一新来源弹窗键盘闭环、控制台 0/0。
- 新鲜 DOM 与交审描述不一致：右侧“忽略”和“保留并下一条”均为 `count=1 / visible=true / enabled=true`。点击“忽略”虽被只读事件守卫拦截、没有产生写入或弹窗，但按钮仍以可执行写动作进入视觉与焦点语境，不能视为“唯一可见未禁用写动作”。
- 任务递增为 Rev 3，只允许移除、禁用或只读替换这两个按钮，并补精确 DOM 状态；其余设计与证据全部冻结。`CURRENT.md` 更新至 v4-205，FIFO 079 `notification_pending`，前端继续 blocked。

## 2026-08-15 — UI-M3-04 Rev 2 来源失效只读门禁完成并交规划

- 只修改仓库外 `m3-screen-text-rev1` 的 stale 状态和 `docs/ui/M3-screen-text-acceptance.md`：加入单一 `staleReadOnly` 权限投影与事件守卫，旧候选、证据、术语命中、历史决定和搜索/筛选/逐集定位继续只读可查；没有重做 Rev 1 页面或修改 DESIGN 语义。
- stale 页只剩“从新来源新建批次”一个可见、未禁用且不在隐藏祖先内的 `data-write-action`。人工新增、取消、候选保留/忽略/恢复、左右拆分、批量决定和保存修改被移除或隐藏；四个候选复选框、当前页全选和五个编辑控件均禁用；旧范围的第 02/06 集只定位并播报，不打开空集或重试弹窗。
- 新鲜真实 DOM：四个行尾动作全部为“查看”，候选状态保持“待确认、待确认、已修改、已忽略”；点击第 06 集后播报“旧草稿只读 · 已定位第 06 集”且可见 dialog=0。唯一恢复弹窗标题/确认为“从新来源新建批次”，初始焦点在关闭，Tab/Shift+Tab 双向闭环，Escape 关闭后焦点恢复原页首主入口。
- 新鲜浏览器标签控制台 `error/warn=0/0`；`node --check app.js` 和授权文档 `git diff --check` 通过。新增 `evidence/10-source-stale-readonly-1440x900.png`，验收记录新增 §11；Rev 1 其余 9 张证据与完整矩阵冻结未重跑。
- `CURRENT.md` 从 v4-202 最小递增为 v4-203；任务转 `review / Current actor/Reviewer=规划对话`，FIFO 077 关闭并登记 FIFO 078 `notification_pending`。生产前后端、迁移、共享 contracts 和 DESIGN 既有语义未改，未通知或解锁前端；下一步只唤醒规划微复验并确认送达。
- v4.3 微复验交接闭环完成：状态已写回 v4-203；唤醒只发送规划固定对话；`read_thread` 确认完整 FIFO 078 / v4-203 / 唯一新来源动作消息已进入规划当前 turn，`wait_threads` 确认规划为 `active / inProgress`。同步版本递增为 v4-204，FIFO 078 关闭；UI 停止修改并等待规划裁决，未通知前端。

## 2026-08-15 — UI-M3-04 Rev 1 规划代理验收集中退审

- 规划按用户本次专属授权，在本轮新启动的本机预览中复验 1440 默认/批量/拆分/失败/来源失效/放大，以及 1024 侧栏 204/72 与读取失败。三栏结构、三范围创建、批量语义、证据 `contain`、失败唯一恢复、弹窗焦点闭环、根页面无横溢和控制台 `error/warn=0/0` 均通过；Impeccable detector 返回 `[]`，但因本机缺 HTML 解析模块仅作降级辅助，不替代真实 DOM/截图。
- 唯一 P1 为来源失效只读门禁：`?view=stale` 的页首与主按钮已正确表达“旧草稿只读 / 从新来源新建批次”，但人工新增、保留、忽略、批量决定和保存修改仍未禁用，真实 DOM 可继续执行旧草稿写操作，违反 `DESIGN.md`、UI 验收记录和 S4 工作流契约。
- 其余 Rev 1 证据全部冻结。任务集中递增为 Rev 2，只修 stale 下全部旧草稿写入口的禁用/移除、只读说明和唯一恢复动作，并补同状态 DOM/键盘/截图证据；不得重做页面、改变业务或修改生产前后端/迁移/contracts。`CURRENT.md` 递增为 v4-201，登记 FIFO 077 `notification_pending`；后端 Rev 1 继续等待规划独立复验，前端继续 blocked。
- v4.3 派发闭环完成：正式唤醒只发送 UI 固定对话；`wait_threads` 确认 UI 明确领取并为 `active / inProgress`。`CURRENT.md` 最小递增为 v4-202，FIFO 077 转 `active`，任务转 `in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`；用户不需要传话。

## 2026-08-15 — BACK-M3-04A Rev 1 画面字权威后端完成并交规划

- 新增 `packages/contracts/src/screen-text.ts` 与迁移 `1754976009000_create_screen_text_workflow.cjs`，PostgreSQL 持有批次、逐集 Job、Attempt、固定素材/术语/Adapter 身份、候选、不可变人工事件、命令幂等、短时播放授权、不可变 Release/Cue/Export；大体积视频和截图不进入数据库，员工 API 不返回对象键、内网地址、Secret 引用或厂商私参。
- 新增 `backend/src/modules/screen-text/`、有界租约 Worker、独立 Worker 入口与 development 接入。Registry 显式登记 `deterministic_fake`、零网络 `cloud_api` stub、零网络 `self_hosted_worker` stub，统一保存 adapter/provider/model/language/deployment、能力快照、输入输出版本、配置与实际输入摘要；三类实现复用同一正式 API→Registry→Worker→PostgreSQL→API 读取链路，没有真实 SDK、网络、密钥、付费或服务器。
- 权威行为包括 active/最新清单/已校验 `screen_video`/不可变 TermVersion 门禁，整剧/选中集/单集与范围冲突，术语投影及候选命中证据，抽帧/去重同构统计与 Usage，租约接管、取消结果落账、失败和零候选子集重试、未知结果需对账，条件版本/幂等保留/驳回/恢复/编辑/左右拆分/人工新增、来源 stale 零副作用、明确空集、人名条身份不臆造、单事务不可变 Release 和确定性 UTF-8 BOM SRT；同时提供 10 分钟只读视频授权和匿名截图证据读取。
- 新鲜验证：第二个精确隔离空库从零应用 22 个迁移后 `tests/backend/screen-text.test.ts` 6/6；同代码在隔离库运行 screen-text/terms/asr/pre-review 四文件 36/36；共享 contracts 构建、后端 TypeScript/lint 与生产构建、`check:repo`、`git diff --check` 全部通过。完整 `pnpm check` 按停止边界留 S4 关闭门。两个专用隔离库均已删除，默认 PostgreSQL `127.0.0.1:55432` 继续 accepting connections；未停止用户既有前后端服务。
- 状态已写回：`CURRENT.md` 从 v4-198 最小递增为 v4-199，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO 076 登记 `notification_pending`。未修改生产前端或 `DESIGN.md`，未提交、推送或部署；下一步只唤醒规划总线并确认送达，不直接通知或解锁前端。
- v4.3 交接闭环完成：状态已写回 v4-199；唤醒已只发送规划固定对话；规划明确回执 FIFO 076 已收到，目标任务为 `active / inProgress`，并说明按 FIFO 先完成 UI-M3-04 代理验收、随后独立复验后端。同步版本递增为 v4-200，FIFO 076 关闭；后端停止修改，不通知前端、不自行解锁，用户无需传话。

## 2026-08-15 — UI-M3-04 正式画面字工作台设计交付规划代理验收

- 在既有 AppShell、204→72 侧栏和紧凑表格体系内完成唯一成熟方向：左侧集/批次队列，中间候选表，右侧同源截图/视频证据与编辑；没有复制外部网站、另造视觉体系或混入上传、任务中心、字幕验收和管理员配置。
- `DESIGN.md` 新增 5.5A，固定双门禁、三范围创建、11 类逐集状态、四类候选决定、证据/术语回执、当前页与显式跨页选择、保留/忽略/恢复/编辑/人工新增、左右拆分、人名条、时间、明确空集、失败重试、取消/需对账、来源失效、发布门禁和不可变画面字 SRT。
- 新增 `docs/ui/M3-screen-text-acceptance.md`，记录完整状态/异步/键盘矩阵、生产停止边界和 9 张匿名证据。仓库外可操作原型位于 `m3-screen-text-rev1`；1440 默认/批量/拆分/失败/失效/放大及 1024 侧栏 204/72/读取失败已取证，1024 根页面 `scrollWidth=clientWidth=1009`，表格只在容器内横滚，控制台 `error/warn=0/0`。
- 真实 DOM 键盘定向复验：失败重试弹窗末项 `Tab` 回首项、首项 `Shift+Tab` 回末项，两态 `dialog.contains(activeElement)=true`；`Escape` 关闭后恢复第 06 集触发项。证据放大关闭也恢复原“放大”。
- `node --check` 与授权文档 `git diff --check` 通过。Impeccable detector 在 HTML 解析依赖不可用的降级正则模式下只报告一项 `border-accent-on-rounded`；人工核对命中的是模块导航 `border-bottom:3px` 活动态下划线，不是圆角卡片描边，不构成修正。无子代理授权，按 Impeccable 降级终审说明在同线程独立复核，结论 `disposition: ship`、P0/P1=0。
- `CURRENT.md` 从 v4-196 最小递增为 v4-197；任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 075 `notification_pending`。本轮未修改生产前端、后端、迁移或共享契约，未接真实 OCR/API、供应商、模型、密钥、付费、服务器或管理员页面，未自行解锁前端。
- v4.3 交接闭环完成：状态已写回 v4-197；唤醒已只发送规划固定对话；`read_thread` 确认完整 FIFO 075 消息出现在规划最新 turn，`wait_threads` 确认规划为 `active / inProgress`。同步版本递增为 v4-198，FIFO 075 关闭；UI 停止修改并等待规划代理裁决，未通知前端。

## 2026-08-15 — UI-M3-04 单次代理验收与 OCR 双类 Adapter 预埋补充

- 用户明确这一次画面字 UI 的交互预览由规划全权代理，自己休息，不再逐张确认；该授权只适用于 `UI-M3-04`，不自动扩展到后续字幕验收、交付或管理员网站。
- 规划采用现有 AppShell/项目工作台为视觉权威，只参考成熟生产后台的信息层级、筛选、状态、证据预览和批量操作；使用 Impeccable 的 Operate 模式做一次完整审查、最多一次集中修正和最终裁决，不重新设计品牌体系，不降低 UI→前端同状态高保真门。
- 用户同时要求预埋云 OCR 厂商与本地引擎接口。`M3-screen-text-workflow.md` 和 `BACK-M3-04A` 验收补充为：Adapter Registry 显式区分 `cloud_api`、`self_hosted_worker`、`deterministic_fake`，保存 deployment/能力快照，并用零网络云 API stub、本地 Worker stub 和 fake 通过同一正式链路。该要求只固定未来接入边界，不授权真实网络、SDK、密钥、付费或服务器。
- UI 领取与规划增量授权发生并行写回，UI 基于旧 Reviewer 字段把任务写成“用户验收”。规划没有覆盖其 `in_progress` 事实，只在 `CURRENT.md` v4-196 最小合并 Reviewer=规划、单次代理授权和双类 Adapter 验收；UI、后端增量消息均已送达且保持 `active / inProgress`，用户不需要传话。

## 2026-08-15 — UI 领取 UI-M3-04 Rev 1 画面字 OCR 工作台设计

- 完整重读项目协议 v4.3、最新 `CURRENT.md`、画面字工作流契约、职责矩阵画面字行、本地等价矩阵画面字行和开发日志顶部；确认本轮与 `BACK-M3-04A` 目录互不重叠并行，正式前端继续 blocked。
- 设计范围只含项目工作台“画面字”：三种识别范围、逐集状态、候选/证据/术语回执、人工决定与编辑、批量选择、左右双轴、人名条、明确空集、失败恢复和不可变版本发布门禁；使用现有 AppShell、204→72 侧栏与高密度紧凑表格语言。
- `CURRENT.md` 从 v4-194 最小递增为 v4-195，任务转 `in_progress / Current actor=UI 设计对话`。交付限于 `DESIGN.md`、`docs/ui/` 和仓库外匿名原型/截图；不修改生产前后端、迁移或共享契约，不接真实 OCR/API，不扩展任务中心、字幕验收、人物风险、服务器或管理员页面。

## 2026-08-15 — 后端领取 BACK-M3-04A Rev 1 画面字权威闭环

- 完整重读项目协议 v4.3、最新 `CURRENT.md` v4-193、`M3-screen-text-workflow.md`、职责矩阵画面字行、`LOCAL_APP_PARITY.md` 画面字等价行和开发日志顶部；确认规划已完成 S4 派发送达闭环，UI 与后端允许目录互不重叠并行，正式前端继续 blocked。
- 本轮只在后端所有权内交付共享 `screen-text` 契约、增量迁移、`backend/src/modules/screen-text/`、有界租约 Worker、Adapter Registry、零网络 deterministic fake 和后端测试；PostgreSQL 是批次、逐集、Attempt、候选、人工事件、草稿与不可变 Release/SRT 的唯一权威。
- 验收固定为术语版本 + `screen_video` Asset 双门禁、术语投影证据、抽帧/去重同构统计、租约接管、取消、失败集重试、未知结果需对账、人工决定不被重跑覆盖、来源 stale、明确空集、左右双轴、人名条不臆造、事务发布和确定性 SRT。
- `CURRENT.md` 从 v4-193 最小递增为 v4-194；任务转 `in_progress / Current actor=后端开发对话`。不修改生产前端或 `DESIGN.md`，不接真实 SDK/网络/密钥/付费/R2，不实现任务中心、字幕验收、风险/人脸、管理员 API 或服务器；完整 `pnpm check` 留 S4 关闭门，不提交、推送或部署。

## 2026-08-15 — PLAN-M3-04 画面字 OCR 方案确认并进入 S4

- 用户确认不直接进入原 S4 单剧整体验收，而是先实现画面字 OCR；后续顺序调整为 S4 画面字、S5 视频字幕验收、S6 单剧全流程联调、S7 交付产品库。
- 规划只读核对 `LOCAL_APP_PARITY.md`、职责矩阵以及本地 `short-drama-terms-workbench` 的画面字源码与回归，确认必须继承候选截图/视频时间、分类/位置/状态、术语提示、保留/忽略/修改、入出场精修、左右双轴、人名条证据、失败/空结果重试和按集画面字 SRT；不照搬桌面 Python 路径、引擎设置窗口或输出文件夹。
- 新增 `docs/contracts/M3-screen-text-workflow.md`，固定术语版本 + `screen_video` Asset 双门禁、三种识别范围、供应商中立 Adapter、抽帧/变化筛选/相似帧去重、可验证术语回执、PostgreSQL 权威状态、人工事件、明确空集、失败/取消/需对账、不可变 Release 与确定性 SRT。
- 同步更新 M3 里程碑、职责矩阵、本地等价矩阵、项目 `AGENTS.md` 和 `CURRENT.md` v4-192。`PLAN-M3-04` 标记 done；`UI-M3-04` 与 `BACK-M3-04A` 进入 ready，允许文件互不重叠的受控并行；`FRONT-M3-04B` 等待 UI 用户验收和后端规划验收。
- 未修改生产前端/后端、迁移或共享代码契约，未接真实 OCR 厂商、网络、SDK、密钥、付费、服务器、云资源、任务中心、字幕验收或交付；未提交、推送或部署。
- 状态已写回：规划任务、两个执行任务和停止边界已进入 `CURRENT.md` v4-192。唤醒已发送：只向 UI 固定对话与后端固定对话发送正式任务包，未通知前端。送达/运行态已确认：`wait_threads` 显示 UI 与后端均为 `active / inProgress`；同步版本递增为 v4-193，前端继续 blocked，用户无需传话。

## 2026-08-15 — S3 前置审改通过完整质量门并正式关闭

- 规划接受 `FRONT-M3-03B` Rev 3 UI 微复验：无活动模态层时媒体错误摘要继续获焦；全轴定位导致原按钮卸载时，焦点回到仍打开的抽屉容器，真实 Tab/Shift+Tab 保持在 dialog，Escape 关闭后回原触发点。P0/P1=0，Rev 2 完整 UI 矩阵和高保真证据冻结通过。
- 规划运行本轮新鲜完整 `pnpm check`，耗时 106.5 秒，退出码 0：仓库边界检查通过，全部 lint/TypeScript 通过，数据库迁移无待执行项，18 个测试文件 157 项全部通过，共享契约、后端和前端生产构建全部通过，前端为 160 modules。
- `CURRENT.md` 更新为 v4-190；`FRONT-M3-03B` Rev 3 标记 `done / Current actor=—`。`UI-M3-03`、`BACK-M3-03A`、`FRONT-M3-03B` 全部关闭，S3 前置审改模块正式完成。没有提交、推送、部署、付费调用、购买或云资源变更。
- 为方便用户醒来直接验收，当前统一预览 `http://127.0.0.1:3010/projects`、本地后端 3001 和 PostgreSQL 55432 保持运行；S4 单剧全流程验收尚未自动启动，字幕验收、OCR 和交付产品库仍为后续独立模块。
- 关闭后运行状态复核：统一预览 `/projects` 返回 HTTP 200；后端实际健康路由 `/health` 返回 HTTP 200，响应为 `status=ok / database=connected`。首次误用不存在的 `/api/health` 得到预期 404，未计为健康证据，随后已用权威路由重新验证。同步版本递增为 v4-191。

## 2026-08-15 — UI 通过 FRONT-M3-03B Rev 3 两场景焦点微复验

- 正式 React 无模态层场景：页面稳定后 `dialogCount=0`，媒体错误 `role=alert` 为真实 `activeElement`；“当前编码不受浏览器支持 / 需要后续兼容代理；当前视频证据已停止播放，不能据此继续看片判断”原阻断事实与文案不变。
- 正式 React 活动全轴场景：打开后初始 `activeElement=关闭本集全轴 / dialog.contains=true`；点击第三行“定位”后当前条目与媒体事实更新，原定位节点随刷新卸载，焦点确定落到抽屉可编程 `ASIDE`。此时 `dialogCount=1 / dialog.contains(activeElement)=true`，后台媒体 alert 仍显示但未获焦，定位成功播报为“已定位仅公司轴，视频将同步到当前轴”。
- 真实键盘补证：回退容器获得焦点后 Tab 与 Shift+Tab 均未离开 dialog，Shift+Tab 到达抽屉内“定位”；Escape 关闭抽屉后焦点恢复“本集全轴”。最终页面控制台 `error/warn=0/0`。
- 两个变化场景通过，P0/P1=0。Rev 2 同状态高保真、真实差异、五组 P1、视觉、1440/1024 和其他矩阵全部冻结；本轮未新增截图集、未修改生产代码、未运行完整 `pnpm check`。临时 3000 与两份精确日志已清理，既有 3001/55432 保持运行。`CURRENT.md` 从 v4-187 最小递增为 v4-188，任务保持 Rev 3 `review` 并转 `Current actor/Reviewer=规划对话`，FIFO 074 转 `notification_pending`；下一步只正式唤醒规划总线并确认送达。
- 唤醒已发送：正式通过结论只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，没有直接通知前端。
- 送达/运行态已确认：`read_thread` 显示完整微复验结论位于规划当前 turn；`wait_threads` 显示规划 `active / inProgress`。`CURRENT.md` 最小递增为 v4-189，FIFO 074 关闭；UI 停止操作并等待规划运行完整关闭门。

## 2026-08-14 — UI 领取 FRONT-M3-03B Rev 3 焦点微复验

- UI 重读 `CURRENT.md` v4-186、正式 UI 验收 §10、开发日志顶部和两个授权变更文件，确认规划已通过差异审核与专项 12/12；生产只调整活动 `aria-modal=true` 的焦点所有权，测试只覆盖定位项保留、节点卸载回抽屉容器和无模态层媒体错误获焦。
- 本轮只在正式 React 复验“全轴定位触发媒体错误”和“无活动模态层媒体错误”两条变化路径，记录真实 `activeElement`、`dialog.contains(activeElement)`、错误摘要与阻断文案；其余 Rev 2 完整矩阵冻结。不得改生产代码、重跑完整矩阵、增加截图集或运行完整 `pnpm check`。

## 2026-08-14 — 规划通过 FRONT-M3-03B Rev 3 微返工并路由 UI 定向复验

- 规划只核对两个授权文件：生产逻辑在媒体错误 effect 中识别活动 `aria-modal=true`，定位按钮仍在模态层内时不移动焦点，触发节点卸载时聚焦抽屉容器，无活动模态层时继续聚焦 `role=alert`；测试分别覆盖三条分支。未发现 CSS、文案、业务状态、API 或其他目录扩张。
- 规划新鲜复跑 `tests/frontend/PreReviewWorkspace.test.tsx` 为 12/12，两个授权文件 `git diff --check` 通过。前端已完成的 TypeScript、160 modules 构建和 Impeccable `[]` 作为同一代码版本证据保留；完整 `pnpm check` 继续留 UI 微复验后的关闭门。
- `CURRENT.md` 更新为 v4-186：任务保持 Rev 3 `review`，转 `Current actor/Reviewer=UI 设计对话`。UI 只复验“定位后焦点仍在抽屉”和“无模态层错误继续获焦”，Rev 2 其他完整矩阵与视觉证据全部冻结；FIFO 074 等待正式 UI 唤醒与送达确认。

## 2026-08-14 — FRONT-M3-03B Rev 3 焦点所有权微返工完成并交规划

- 生产修正仅在 `VideoEvidence` 媒体错误 `useLayoutEffect`：错误形成后先读取当前 DOM 的 `aria-modal=true` 模态层；现有焦点仍位于活动模态层时不移动，定位节点因刷新卸载而焦点脱落时聚焦模态容器，没有活动模态层时继续聚焦既有媒体错误摘要。媒体错误仍保留 `role=alert`、原阻断文案和不可播放事实。
- 对应回归覆盖三条边界：全轴“定位”按钮仍存在时媒体错误不抢焦点且 `dialog.contains(activeElement)=true`；按钮因全轴翻页加载卸载时焦点确定回到可编程抽屉容器；无模态层的媒体 error 与 play rejection 仍自动聚焦错误摘要。未修改 CSS、视觉、业务状态、媒体文案、API 或其他前置审改行为。
- 新鲜验证通过：`pnpm exec vitest run tests/frontend/PreReviewWorkspace.test.tsx --reporter=dot` 为 1 文件 12/12；前端 TypeScript 通过；Vite 8.2.1 生产构建 160 modules；Impeccable 定向检测 `[]`；`git diff --check` 退出码 0，仅有既有文档 CRLF 提示。按微返工边界未运行完整 `pnpm check`，未重做 1440/1024 浏览器矩阵。
- 状态已写回：`CURRENT.md` v4-184，任务保持 Rev 3 并转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 074 `notification_pending`。下一步只正式唤醒规划固定对话并确认送达/运行态，不直接通知 UI；未提交、推送或部署。
- 唤醒已发送：FIFO 074 正式交审只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，发送接口一次成功；未绕过规划通知 UI、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 074 完整交审消息位于规划当前 turn，规划任务为 `inProgress`；规划同一 turn 已明确观察到前端领取与执行，FIFO 073 派发事件同步关闭。`CURRENT.md` 最小递增至 v4-185，FIFO 074 转 `active`；前端停止修改并等待规划审核。

## 2026-08-14 — 前端领取 FRONT-M3-03B Rev 3 焦点所有权微返工

- 已重读协议 v4.3、`CURRENT.md` v4-182、UI 终验 §10 与开发日志顶部，确认 Rev 2 其他同状态高保真、真实差异、五组 P1、1440/1024、控制台和业务交互全部冻结；本轮只处理媒体错误与活动全轴模态层的焦点所有权冲突。
- 第一项预检锁定 `VideoEvidence` 的媒体错误 `useLayoutEffect`、全轴“定位”按钮和抽屉安全焦点的 DOM 挂载时序：媒体错误仍须渲染并由 `role=alert` 播报，但活动 `aria-modal=true` 存在时不得把焦点移出该模态层；定位节点卸载时才回抽屉内关闭按钮或可编程容器。
- 状态写回 `CURRENT.md` v4-183：任务保持 Rev 3，转 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`；FIFO 073 记录前端已收到并执行，等待规划完成发送方的 `read_thread`/`wait_threads` 送达确认。只修改指定生产/测试两文件，不改 CSS、视觉、文案、业务状态、接口或其他模块。

## 2026-08-14 — UI 终验唯一焦点 P1 进入 FRONT-M3-03B Rev 3 微返工

- UI 一次性完整矩阵结论为 P0/P1/P2/P3=`0/1/0/0`。唯一失败可稳定复现：全轴抽屉打开且定位成功后仍保留 `dialogCount=1`，但媒体错误 `role=alert` 把焦点从抽屉抢到遮罩后，`dialog.contains(activeElement)=false`。同状态高保真、真实差异、五组 P1、1440/1024、控制台及其他交互均通过或冻结。
- 规划代码核对确认根因为 `VideoEvidence` 中 `useLayoutEffect(() => { if (mediaError) mediaErrorRef.current?.focus(); }, [mediaError])` 无条件聚焦，没有尊重活动 `aria-modal=true` 的模态层焦点所有权。该问题不需要改后端、共享契约、业务状态、视觉或媒体阻断事实。
- 按 v4.3 微返工快车道，任务递增为 Rev 3，只允许修改 `PreReviewPanels.tsx` 与 `PreReviewWorkspace.test.tsx`：活动模态层存在时媒体错误仍显示但不得把焦点移出模态层；定位按钮仍存在时保持其焦点，否则回抽屉安全焦点；无模态层时媒体错误继续正常获焦。只跑专项、TypeScript、必要构建和差异检查，不重做完整 UI 矩阵或全量截图，不运行完整 `pnpm check`。
- 状态写回 `CURRENT.md` v4-182：Rev 3 为 `ready / Current actor=前端开发对话 / Reviewer=规划对话`，登记 FIFO 073 `notification_pending`。正式唤醒与送达确认后再关闭该交接事件。

## 2026-08-14 — UI 完成 FRONT-M3-03B Rev 2 正式终验并退回唯一焦点 P1

- Product Design Audit 本轮先采集并人工检查正式 React 的 1440×900、1024×768 侧栏 204/72、全轴抽屉和全局脏态新鲜截图，并将 1440 正式页与 UI Rev 4 权威参考放在同一比较输入中复核。1440 根宽 `1430/1430`、三栏 `196/640/310px`；1024 两态均为 `1014/1014`；中缝 `textContent="" / aria-hidden=true`，控制台 `error/warn=0/0`。真实 1 集、媒体不兼容、AI/风险无投影均按权威事实呈现，没有伪造参考数据。
- 五组 P1 与冻结矩阵中，问题状态切换时旧问题操作立即卸载、全局 AppShell 脏态门禁及放弃后单次原导航、未知/409 意图分流、媒体窗口/旧视频事实清理和中缝空 DOM 均通过正式交互或规划 11/11 + 本轮源码交叉证据；Rev 4 未变化的 limited/stale、六类决定、格式/长句、失败恢复、提交、完成/release 和真键盘顺序继续冻结引用。
- 唯一新 P1 可稳定复现：全轴打开时初始焦点为“关闭本集全轴”且在 dialog 内；点击“定位”后抽屉仍打开、主工作区定位反馈已更新，但不兼容媒体的 `useLayoutEffect` 把焦点移到遮罩后 `role=alert`，`dialog.contains(activeElement)=false`。这破坏模态层键盘语境。最小修正只需在全轴仍打开时禁止媒体错误抢焦点，并保持定位项或关闭按钮焦点，不改媒体阻断事实、业务数据或视觉。
- 完整 P0–P3 为 `0/1/0/0`，正式结论不通过。验收文档已追加本轮矩阵和 6 张仓库外证据；本轮临时 3000 和两份精确临时日志已清理，既有 3001/55432 保持运行。`CURRENT.md` 从 v4-179 最小递增为 v4-180，任务保持 Rev 2 `review` 并转 `Current actor/Reviewer=规划对话`，FIFO 072 登记 `notification_pending`。未修改生产前后端、迁移、共享契约或 DESIGN，未运行完整 `pnpm check`，未提交、推送或部署；下一步只正式唤醒规划总线并确认送达。
- 唤醒已发送：FIFO 072 正式退审只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，没有绕过规划通知前端。
- 送达/运行态已确认：`read_thread` 显示完整退审消息位于规划当前 turn；`wait_threads` 显示规划为 `active / inProgress`，且规划已明确回执“作为微返工只修焦点所有权，不重做页面或完整矩阵”。`CURRENT.md` 最小递增为 v4-181，FIFO 072 关闭；UI 停止操作，等待规划统一路由。

## 2026-08-14 — UI 领取 FRONT-M3-03B Rev 2 正式终验

- UI 设计对话重读协议 v4.3、`CURRENT.md` v4-178、UI Rev 4 权威参考、前置审改 DESIGN/UI 验收、共享契约、本地等价矩阵与开发日志顶部，确认规划映射审核已经通过且唯一当前动作是正式 React 领域终验。
- 本轮按 Product Design Audit 先采集并检查本轮 1440×900、1024×768 侧栏 204/72 的真实截图，再按 Impeccable 核对同状态结构/层级/比例/密度、五组 P1、键盘焦点、滚动与控制台；真实 1 集、媒体不兼容、AI/风险无投影作为权威有意差异保留。
- 停止边界不变：不修改生产前端、后端、迁移、共享契约或 DESIGN，不重跑规划已通过的专项/TypeScript/160 模块构建，不运行完整 `pnpm check`。结论完成后只写回规划总线并确认送达，不直接通知前端或自行标记 `done`。

## 2026-08-14 — 规划通过 FRONT-M3-03B Rev 2 映射审核并路由 UI

- 规划按协议 v4.3 审核“权威 UI → 正式 React → 证据”映射：人工对照 UI Rev 4 的 1440 权威参考与前端交付的 1440、1024 侧栏 204/72 三张新证据，首屏项目上下文、四项摘要、本地规则/AI 同构状态、集/问题双视图、关系带、A/B 双来源、无文字双色中缝、唯一最终稿、视频证据元数据和底部上一条/下一条/完成门禁均已恢复。
- 三项有意差异接受为真实事实而非视觉缺陷：匿名项目仅 1 集；真实媒体编码不受浏览器支持，按同尺寸阻断呈现；AI/风险无后端投影，显示未启用/暂无权威数据。未发现用假数据、前端推算或静态结果冒充权威事实。
- 规划代码扫描确认跨集/筛选/页码旧数据身份、确定性 409 与网络未知分流、全局 SPA/`beforeunload` 脏态门禁、`formatOverrideReason`、媒体 error/play rejection、空中缝 DOM 和上一条/下一条实现；新鲜复跑前置审改专项 11/11、前端实际 `pnpm --dir frontend typecheck` 与 `pnpm --dir frontend build`（160 modules）通过，`git diff --check` 无错误。首次误用不存在的 `@qimao/frontend` 筛选时明确返回“无匹配项目”，未计为证据，随后已用真实脚本重跑。
- 状态写回 `CURRENT.md` v4-177：任务保持 Rev 2 `review`，转 `Current actor/Reviewer=UI 设计对话`；UI 只做正式 React 同状态高保真、交互/键盘和真实状态矩阵终验，不修改生产代码、不跑完整 `pnpm check`。正式 UI 唤醒与送达确认完成后再关闭 FIFO 071。
- 唤醒已发送：规划只向 UI 固定对话发送正式终验包，没有通知前端重复动作。送达/运行态已确认：`wait_threads` 显示 UI 为 `active / inProgress` 并明确回执已领取，将按 Product Design Audit 与 Impeccable 对照正式 React/Rev 4；同步版本递增为 v4-178，FIFO 071 关闭。

## 2026-08-14 — FRONT-M3-03B Rev 2 五组 P1 与 UI Rev 4 高保真门完成并交规划

- 数据身份与恢复语义已按权威契约收口：主问题查询和本集全轴不再保留可交互旧响应，切集/筛选/翻页到新身份稳定前没有旧 selectedItem、定位或写命令；只有网络未知和 `retryable=true` 保留同请求体/幂等键，确定性 `409 / retryable=false` 清旧意图并刷新会话/列表/集状态，下一次用户显式动作使用新 revision/version 与新键，不自动重发。
- 离开与媒体根因已关闭：手动编辑时通过文档捕获覆盖 AppShell 全局 SPA 链接并保留 `beforeunload`，放弃后原导航只执行一次；长句理由模式保存沿用当前决定并提交 `formatOverrideReason`。主/放大视频处理媒体 error 和 `play()` rejection，显示“当前编码不受浏览器支持，需要后续兼容代理”，换条目清理旧画幅、播放和时间事实；视频名称、证据窗口、授权到期、真实 Asset 和编辑边界均来自正式响应/浏览器事实。
- UI Rev 4 同状态复原同轮完成：前置审改路由不再显示重复独立顶栏；首屏依次为项目上下文、公司稿/中文识别/术语/会话摘要、本地确定性规则与 AI 未启用层、三栏工作台和粘性逐条/逐集导航。左栏恢复集列表/问题列表切换及紧凑筛选；中栏恢复关系带、来源 A/B、无文字双色中缝和下游第三层唯一最终稿；右栏保留 172px 正常媒体位或同尺寸真实阻断、控制组和证据元数据；底部恢复上一条/下一条、剩余数量、格式阻断与唯一完成动作。
- 正式浏览器使用真实匿名项目 `42067015-0605-4c40-8997-cf98923cff91`：1440×900 根宽 `1430/1430`，项目上下文/摘要/规则/工作台分别从 y=24/88/177/233 开始，三栏为 `196/640/310px`，中缝 `textContent="" / aria-hidden=true`；1024×768 展开 204px 与收起 72px 两态均为根宽 `1014/1014`、水平范围 0，工作台为 `196+546` 与 `196+678`，证据区按验收下置。问题列表真实切换后筛选/搜索可见，控制台 `error/warn=0/0`。
- 三张仓库外证据保存于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\13\019ff92b-c7a6-7693-846b-fe5b3bfea3bf\front-m3-03b-rev2\`：`front-m3-03b-rev2-1440x900.png`、`front-m3-03b-rev2-1024x768-sidebar-204.png`、`front-m3-03b-rev2-1024x768-sidebar-72.png`。与 UI Rev 4 的有意差异只有权威真实事实：当前 1 集而非原型 30 集；真实 MP4 编码不受浏览器支持而显示兼容代理阻断；AI/风险无后端投影而显示未启用/暂无权威数据。没有伪造视频、数量、成功或风险命中。
- 本轮新鲜验证：前置审改专项 11/11；全部前端 8 文件 73/73；前端 TypeScript 通过；Vite 160 modules 生产构建通过；`git diff --check` 通过，仅有既有文档 CRLF 提示。最终 Impeccable 定向检测只复现 UI Rev 4 验收已明确接受的两条来源顶部 3px 内嵌身份线 `side-tab` 警告，真实截图确认其为 A/B 来源辨识且不是侧边装饰卡片，未改已确认视觉。完整 `pnpm check` 按停止边界留正式 UI 终验关闭门。
- 状态已写回：`CURRENT.md` 从 v4-174 最小递增为 v4-175，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO 071 登记 `notification_pending`。未修改后端、迁移、共享契约、`DESIGN.md` 或本地等价矩阵；未提交、推送或部署。本轮临时 Vite 3000 已停止并确认无监听，既有后端 3001 与 PostgreSQL 55432 保持运行。下一步只正式唤醒规划总线并确认送达/运行态，不直接通知 UI。
- 唤醒已发送：正式交审只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，发送接口一次成功；未直接通知 UI、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 071 完整交审消息位于规划最新 turn；`wait_threads` 显示规划为 `active / inProgress`，并明确回执正在核对代码范围、状态映射和三张同视口证据，通过后由规划直接唤醒 UI。`CURRENT.md` 最小递增为 v4-176，FIFO 071 转 `active`；前端停止修改并等待规划统一路由。

## 2026-08-14 — UI→前端一致性升级为长期硬门（协议 v4.3）

- 用户确认以后所有已验收 UI 都必须由正式前端保持一致，不能只在当前前置审改页面临时要求。规划据此更新项目级 `AGENTS.md` 与 `docs/WORKFLOW.md`：UI 关闭后，`DESIGN.md`、UI 验收记录和指定最终原型/截图共同成为权威输入；前端未经裁决不得自行简化、重排或重新设计。
- 前端首次交审新增必备证据：正式 React 与权威 UI 的同状态、同视口对照，必要的 DOM/几何/滚动/焦点测量，以及全部有意差异及来源。功能测试、TypeScript、构建或单张截图不能替代一致性验收；明显结构和视觉偏差不得进入 `done`。
- 同时保留真实事实优先：真实集数、媒体可用性、AI/风险启用状态和后端结果不得为了贴近示例图而伪造。确有契约或运行限制时，前端须按专业异议流程交规划裁决。该规则自 `FRONT-M3-03B` Rev 2 起立即执行，后续所有 UI→前端任务长期适用。
- 规划统筹责任同步固化：规划在解锁前端前负责形成权威参考、页面/状态、视口、真实字段映射、允许差异、目录边界和 Reviewer 完整交接包；前端交付后先做映射完整性审计，再由 UI 验收正式 React。双方差异统一回规划裁决，用户不承担传话。
- 状态已写回：协议 v4.3、CURRENT v4-174、前置审改高保真门和本日志已更新。唤醒已发送：FIFO 070 仅正式通知前端固定对话。送达/运行态已确认：`wait_threads` 显示前端为 `active / inProgress`，并明确回执已重读 v4.3、将一致性收口并入同一 Rev 2；FIFO 070 已关闭。

本文件只记录已发生并有证据的项目变更。计划和建议不得写成完成事实。

## 2026-08-14 — 用户指出正式 React 未充分复原 UI，规划追加同状态高保真门

- 规划按用户异议重新以 `1440×900` 打开当前 React，并与 UI Rev 4 权威参考 `20-default-compact-1440x900.png` 同视图人工比较；当前 React 截图保存于仓库外 `front-m3-03b-current-1440x900.png`。当前页面已在 Rev 2 热更新中移除旧 `⇄`，根页面 `1430/1430` 无横溢，Impeccable 单次检测为 `[]`；这些结果不代表视觉复原已经通过。
- 差异确认：当前生产页额外独立顶栏削弱首屏密度；来源摘要缺少中文识别与确定性规则/AI 同构状态层；左栏没有参考的集/问题双视图层级；当前关系带、双来源和唯一最终稿的色块、间距、比例明显弱化；视频控制/证据元数据与底部上一条/下一条导航不完整。部分数据差异来自真实项目只有 1 集、AI/风险无后端投影、媒体编码不受支持，这些必须保留真实状态，但不能据此删除已确认结构或伪造参考数据。
- 用户要求已纳入仍在执行的 `FRONT-M3-03B` Rev 2，不另拆第三轮：功能正确性修正后，同轮按 `docs/ui/M3-pre-edit-acceptance.md` 新增高保真门复原首屏结构、摘要/规则层、队列、关系带、双来源、唯一最终稿、视频证据和底部导航；1440/1024 都需同视口对比。任务不改后端、迁移、共享契约或 DESIGN，不伪造 30 集、AI 数量、风险或正常视频。
- `CURRENT.md` 更新至 v4-172，FIFO 070 登记 `notification_pending`；下一步只补充通知正在执行的前端固定对话并确认送达，不通知 UI 重新设计。

## 2026-08-14 — 规划独立审核 FRONT-M3-03B Rev 1 并退回 Rev 2

- 规划按 v4.2 重读权威前置审改契约、DESIGN 5.7、UI Rev 4 验收、生产前端、共享/后端错误语义和本地等价矩阵；新鲜复跑 `tests/frontend/PreReviewWorkspace.test.tsx` 7/7、全部前端 8 文件 69/69、前端 TypeScript、Vite 160 模块构建、Impeccable 定向检测 `[]` 与 `git diff --check`，全部通过。通过项只证明既有测试、构建、基础布局和已覆盖交互成立，不覆盖本轮新增根因。
- 正式浏览器重新打开匿名项目 `42067015-0605-4c40-8997-cf98923cff91`：生产页面能读取真实 PostgreSQL/Fastify 状态并显示三栏工作台、双来源、唯一最终稿、视频证据与 AI/风险“未启用”；当前截图保存于仓库外 `front-m3-03b-rev1-planning-audit.png`。同时真实复现“手动修改→输入未保存文本→点击全局侧栏项目中心”直接导航到 `/projects`，页面没有任何脏态提示；DOM 还确认双来源中缝可见 `⇄`，媒体元素不存在 error/abort 处理与兼容代理说明。
- 数据身份 P1：`items` 查询把集数、状态、搜索、页码放入 query key，却使用 `keepPreviousData`；切集时只清选择，不阻断旧响应，旧行仍渲染且 `commandPending=false`，effect 还会把旧集首行重新设为当前选择。因此新集请求未完成时可以对旧集条目发决定命令。`FullAxisDrawer` 的翻页读取同样保留旧页且定位按钮可用，纳入同一根因修正。
- 命令恢复 P1：`create/prepare/decision/undo/policy/complete/release` 的意图只在成功后清理，所有错误都呈现“重试同一意图”。后端 `preReviewConflict` 固定 `409 / retryable=false / reload_pre_edit`，但前端测试把真实确定性版本冲突写成第二次同键成功，掩盖了旧 expectedVersion/expectedRevision 无法靠同请求重放恢复的事实。Rev 2 必须只对网络未知或 `retryable=true` 保留原 body/key；确定性错误清意图、重读权威状态，不自动重提，下一次用户显式动作使用新版本与新键。
- 离开与媒体 P1：当前脏态只拦页面内部项目链接、切集和切问题；AppShell 全局导航不受控，真实 SPA 跳转绕过 `beforeunload`。理由模式行内“保存修改”又固定提交 `custom_text` 且不带 `formatOverrideReason`。视频虽然 `contain` 与放大成立，但没有 `onError`/播放 Promise rejection 处理，违反“不支持编码时明确阻断并提示兼容代理需求”；同时补视频可访问名称、换条目时旧元数据清理。冻结视觉 P1：CSS `sourceBlend::before { content: "⇄" }` 与用户已确认的“中缝无文字、无数字、无符号，只保留双色过渡”直接冲突。
- 规划把以上问题合并为唯一 Rev 2，不拆成多个往返；Rev 1 其他通过项冻结。`CURRENT.md` 更新至 v4-170，FIFO 068 关闭，FIFO 069 登记 `notification_pending`，任务转 `ready / Current actor=前端开发对话 / Reviewer=规划对话`。允许修改前置审改生产模块、必要应用壳脏态协作点及对应测试；不改后端、迁移、共享契约、DESIGN，不扩展 OCR、字幕验收、交付、真实 AI/风险或转码。规划本轮启动的 3000 预览已停止，既有 3001/55432 保持运行。
- 唤醒已发送：规划只向前端固定对话 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf` 发送 FIFO 069 完整退审，发送接口一次成功，未通知 UI、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 已看到完整 FIFO 069 位于前端最新 turn；`wait_threads` 显示前端为 `active / inProgress`，并明确回执从列表查询身份、命令幂等意图与全局导航状态转换预检开始。`CURRENT.md` 最小递增为 v4-171，FIFO 069 关闭，任务转 `in_progress / Current actor=前端开发对话`；规划停止并发修改生产前端。

## 2026-08-14 — FRONT-M3-03B Rev 1 正式前置审改工作台完成并交规划

- 新增 `frontend/src/features/pre-review/` 正式模块，并接入应用路由、侧栏模块注册和页面标题；只消费现有共享 `pre-review` 类型与 Fastify/PostgreSQL 权威 API，覆盖项目/来源/术语/会话门禁、集与问题服务端分页队列、公司稿/ASR 只读对照、组合轴唯一最终稿、六类决定、文本基准范围预览/应用、撤销/脏态、格式与至少 8 字长句理由、逐集完成、不可变 release/SRT 下载、来源变化/limited、按条目视频授权和本集全轴只读分页定位。
- 三画幅视频统一使用真实授权媒体与浏览器 `loadedmetadata`，默认紧凑播放器和按需放大均为 `object-fit: contain`；全轴只读表格保留 980px 最小宽度并只在自身容器横滚。当前契约没有 AI 运行/进度/数量/成功及风险命中投影，正式页只显示“未启用”，没有模拟请求、常量推算或静态词表扫描。
- 所有关键异步操作覆盖加载、稳定失败、requestId、唯一恢复、再次失败、提交中禁用与焦点语境；基准/全轴/视频放大弹窗具备初始焦点、Tab/Shift+Tab 闭环、Escape 返回触发点，脏态与完成/release 门禁消费后端事实。新增 `tests/frontend/PreReviewWorkspace.test.tsx` 的 7 条高价值回归。
- 本轮新鲜验证：前置审改专项 7/7；全部前端 8 文件 69/69；前端 TypeScript 通过；Vite 生产构建 160 modules 通过；Impeccable 定向检测 `[]`；`git diff --check` 通过，仅保留既有文档 CRLF 提示。完整 `pnpm check` 按任务停止边界留正式 UI 终验后的 S3 关闭门。
- 真实浏览器使用匿名本地项目 `42067015-0605-4c40-8997-cf98923cff91` 走现有公开 API 和零网络 Worker 生成权威会话：1440 根页面 `1430/1440`、工作台三列 `196px 632px 310px`；1024 侧栏展开/收起根页面均 `1014/1024`，展开为 `196px 538px` 且证据区下置，收起为 `196px 670px`；视频 `object-fit: contain`，基准/全轴焦点闭环、脏态、AI“未启用”和控制台 `error/warn=0/0` 均成立。仅为本地验证应用现有三条迁移，临时前端/Worker 与日志已停止并清理；既有后端和 PostgreSQL 保持原运行状态。
- 状态已写回：`CURRENT.md` 从 v4-167 最小递增为 v4-168，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 068 `notification_pending`。未修改后端、迁移、共享契约、`DESIGN.md` 或本地等价矩阵，未提交、推送或部署；后续只由规划独立审核并统一路由 UI。
- 唤醒已发送：正式交审只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未直接通知 UI、后端或要求用户传话；发送接口一次成功，无需重试。
- 送达/运行态已确认：`read_thread` 显示 FIFO 068 完整交审消息位于规划最新 turn，`wait_threads` 显示规划任务为 `active / inProgress`。送达证据最小写回后 `CURRENT.md` 递增为 v4-169，FIFO 068 转 `active`；前端停止修改并等待规划审核。

## 2026-08-14 — 前端领取 FRONT-M3-03B Rev 1 并完成接口映射预检

- 完整重读项目协议 v4.2、`CURRENT.md` v4-166、前置审改权威契约、`DESIGN.md` 5.7、UI Rev 4 验收、本地等价矩阵前置审改能力行及开发日志顶部；确认 UI 与后端双依赖均已关闭，唯一当前动作是正式 React 前置审改集成。
- 第一项预检逐一映射页面状态与共享 `pre-review` 类型、正式 Fastify 路由和稳定错误结构：项目/术语门禁复用现有项目素材状态与术语工作区；会话列表/详情提供来源、集状态与完成签名；items 服务端按集、状态、搜索、`limit/offset` 同时支撑问题队列和只读全轴；正式命令覆盖会话创建/准备重试、基准预览/应用、六类决定、撤销、逐集完成、release/SRT 和播放授权。
- 三画幅不新增业务投影：浏览器只从已授权真实 MP4 的 `loadedmetadata` 读取 `videoWidth/videoHeight`，播放器统一 `object-fit: contain`。当前契约没有 AI 运行/进度/数量/成功和风险命中，正式页面只允许明确显示“未启用”，不发模拟请求、不用常量推算、不扫描静态词表。
- 未发现需要修改后端、迁移或共享契约的阻断。`CURRENT.md` 从 v4-166 最小递增为 v4-167，任务保持 Rev 1 `in_progress / Current actor=前端开发对话`；下一步先建立单一 API 错误封装、正式路由与读取骨架，再接入命令状态、脏态和焦点闭环。

## 2026-08-14 — 用户确认 UI-M3-03 Rev 4 并解锁正式前端

- 用户确认规划已通过的 Rev 4 方向；`UI-M3-03` 关闭为 `done`，Rev 1–4 的工作台结构、六类决定、格式/长句门禁、三画幅 `contain`、播放器按需放大、无文字双色来源分隔、本集全轴只读定位与未来 AI/风险占位方向冻结，不再继续 UI 返工。
- `BACK-M3-03A` Rev 3 与 UI 用户验收双依赖已满足，规划同轮解锁 `FRONT-M3-03B` Rev 1 为 `ready / Current actor=前端开发对话 / Reviewer=规划对话`。范围只包含正式 React 前置审改集成及现有契约支持的状态，不扩展 OCR、字幕验收、交付、管理员控制台、真实供应商、转码或时间轴编辑。
- 当前共享契约没有 AI 运行/进度/数量/成功和风险命中投影；正式前端首版只能隐藏或明确显示未启用，不得以常量、前端推算、模拟请求或静态词表伪造。完整 `pnpm check` 留正式前端与 UI 终验后的 S3 关闭门。
- 状态已写回：`CURRENT.md` v4-165 登记 FIFO 067 `notification_pending` 并解锁前端；送达确认后最小递增至 v4-166，FIFO 067 关闭，任务转 `in_progress / Current actor=前端开发对话`。
- 唤醒已发送：正式派发只发送前端固定对话 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf`，未通知 UI、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 067 完整消息位于前端最新 turn，`wait_threads` 显示目标任务为 `active / inProgress`；前端从异步状态转换与现有接口映射预检开始。

## 2026-08-14 — 规划独立审核 UI-M3-03 Rev 4 通过并路由用户

- 规划重新打开最新 Rev 4 原型，使用本轮新鲜浏览器状态复验默认紧凑页、竖屏放大层、本集全轴抽屉、AI 运行态和 1024 侧栏两态；1440 根页面为 `1430/1430`，1024 展开/收起侧栏分别为 204/72px 且根页面均为 `1014/1014`，没有页面级横向溢出。
- 默认播放器实测 `304×172px`；放大层具备 `role=dialog / aria-modal=true`、初始聚焦关闭、Tab 保持在弹窗语境和 Escape 回“放大”，三画幅均为 `object-fit: contain`。公司稿/中文识别中缝实测 `textContent="" / aria-hidden=true / 12px`，只保留双色过渡。
- “本集全轴”抽屉是只读定位工具，包含关系、差异、决定、格式、风险和定位列，没有复制决定动作；定位后播报同步结果，Escape 关闭后焦点返回原入口。AI 入口点击后只在原位显示 `role=status` 的 `38/64` 细进度，根页面宽度不变。
- Impeccable 单次降级检测只重复两条来源顶部 3px 内嵌身份线提示；结合截图与计算样式确认其为来源身份标识，没有新增 P0–P3。`node --check` 与授权文档 `git diff --check` 均通过，P0/P1=0。
- 状态写回 `CURRENT.md` v4-164：FIFO 066 关闭，`UI-M3-03` 转 `review / Current actor=用户 / Reviewer=用户`，等待用户方向确认；`FRONT-M3-03B` 继续 blocked。当前共享契约没有 AI/风险后端投影，生产前端不得伪造这些未来状态，未通知或解锁前端。

## 2026-08-14 — UI-M3-03 Rev 4 定向收口完成并交规划

- `DESIGN.md` 5.7 与 UI 验收已固化 Rev 4：默认播放器保持紧凑并增加同源放大层；公司稿/中文识别之间只留无文字双色过渡，关系事实进入问题元数据和“本集全轴”；全轴抽屉只读分页/定位；AI 五态只占摘要原位；风险词只作公司稿、识别稿、最终稿和全轴的非阻断核对提示。
- 仓库外原型补齐放大层、全轴加载/空/失败/再次失败/恢复/定位、AI 未启用/可运行/运行中/完成/失败和三类风险提示。异步焦点预检发现中间 Tab 依赖浏览器默认移动不稳定，唯一一轮定向修正改为显式逐项焦点循环；其余 Rev 1/2/3 冻结行为未改。
- 新增 9 张 Rev 4 定向证据。1440 默认页为 `1430/1430`、播放器 172px、来源中缝空文本；1024 展开/收起均为 `1014/1014`、侧栏 204/72px。三画幅放大均 `object-fit=contain`；放大与抽屉打开/闭环/Escape 返回、全轴两次失败恢复、行定位同步、AI 失败不阻断均通过，页面控制台 `error/warn=0/0`。
- Impeccable 单次降级检测只重复 Rev 3 已冻结的两条来源顶部 3px 内嵌身份线提示；人工截图确认没有新增侧边标签或装饰卡片，记为既有降级提示，无新增 P0–P3。`node --check` 与授权文档 `git diff --check` 通过；精确临时静态服务 PID 37552 已停止，浏览器视口已重置、标签页已清理。
- 当前共享契约仍没有 AI 调用/数量/进度/成功和风险命中的正式投影；原型状态只供设计验收，生产前端首版不得使用常量、前端推算、模拟请求或静态词表伪造事实。
- 状态已写回：`CURRENT.md` 从 v4-161 最小递增为 v4-162，`UI-M3-03` 转 `review / Current actor=规划对话`，FIFO 065 关闭并登记 FIFO 066 `notification_pending`；未修改生产前后端、迁移或共享契约，未直接通知或解锁前端。
- 唤醒已发送：正式交接只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知前端、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 066 完整消息位于规划最新 turn，规划任务状态为 `inProgress`；没有发送失败或重试。`CURRENT.md` 随后最小递增为 v4-163，FIFO 066 转 `active`，UI 停止修改并等待规划独立审核。

## 2026-08-14 — UI 领取 UI-M3-03 Rev 4 定向收口

- 完整重读项目协议 v4.2、`CURRENT.md` v4-160、前置审改权威契约、`DESIGN.md` 5.7、UI 验收全文和开发日志顶部，确认用户最终方向与规划停止边界一致。
- Rev 1/2 的六类决定、格式、键盘、错误恢复和 15 张证据继续冻结；Rev 3 的三画幅 `contain`、来源 A/B 身份和紧凑自动筛选摘要方向保留。
- 本轮只补默认紧凑播放器按需放大、无文字双色来源分隔、本集全轴浏览/定位、小型 AI 快速筛选未来状态和非阻断风险提示；正式设计前先做异步状态与焦点预检，最多执行一轮完整浏览器矩阵和一轮定向修正。
- `CURRENT.md` 从 v4-160 最小递增为 v4-161，任务保持 `in_progress / Current actor=UI 设计对话`。只修改 `DESIGN.md`、UI 验收、仓库外原型/证据及同步文档，不修改生产前后端、迁移或共享契约，不伪造 AI/风险生产事实。

## 2026-08-14 — 用户确认 UI-M3-03 Rev 4 定向边界并交 UI

- 用户确认播放器默认无需放大，但必须提供按需大尺寸看片；公司稿与中文识别之间不再显示 `1:2`、交叠率或组合轴编号，只保留低占用、无文字的双色过渡分隔，关系详情转入元数据与“本集全轴”抽屉。
- 用户同时接受低强调“本集全轴”查阅、摘要行内小型“AI 快速筛选”按钮/原位进度，以及公司稿、ASR、最终稿风险命中的非阻断定位方案；不增加独立风险模块或员工配置墙。
- 规划检查现有正式接口：本集全部对齐项已有按集分页读取入口，可以支持全轴抽屉；当前共享契约没有 AI 筛选运行/进度或风险投影，因此 Rev 4 只设计未来状态，正式前端不得用常量伪造调用和风险事实。
- `docs/contracts/M3-pre-edit-workbench.md` 已更新为本轮权威边界；`CURRENT.md` 递增为 v4-159，`UI-M3-03` 转 Rev 4 / ready / Current actor=UI 设计对话，FIFO 065 登记为 `notification_pending`。生产前后端、迁移、共享契约和既有原型尚未修改，`FRONT-M3-03B` 继续阻塞。
- 唤醒已发送：正式派发只发送 UI 固定对话 `019ff52d-d4a1-7440-81a2-fc9c1b0a0996`，未通知前端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 065 完整消息位于 UI 最新 turn，任务状态为 `inProgress`；同步版本递增为 v4-160，FIFO 065 转 `active`，`UI-M3-03` 转 `in_progress`。

## 2026-08-14 — 规划独立审核 UI-M3-03 Rev 3 通过并路由用户

- 规划重新打开最新 Rev 3 原型并采集四组新鲜审核证据：1440 竖屏双来源层级、自动筛选判断依据、1024 方形展开侧栏、1024 横屏收起侧栏。根页面实测为 `1430/1430` 和 `1014/1014`，侧栏 204/72px，三类媒体 `object-fit=contain`；窄屏播放器下置后未被队列覆盖。
- 原型源码与 DOM 复核确认公司稿/中文识别为独立来源 A/B，中间关系层显示 `1:2 / 交叠 92% / 组合轴`，唯一最终稿为下游第三层；筛选判断依据由具备 `aria-expanded/aria-controls` 的显式按钮按需展开。
- 与共享 `pre-review` 契约交叉检查后确认：当前后端只有确定性对齐、格式与待处理计数，没有真实 AI 筛选投影。Rev 3 的 `286/14/AI 已关闭` 只作为未来状态设计；正式 `FRONT-M3-03B` 不得伪造这些事实，首版只消费现有后端权威状态并保留未来接入位置。
- Impeccable 单次降级检测把两条顶部内嵌来源标识线报告为 `side-tab`；因检测器缺少 HTML 解析模块，结合新鲜截图和计算样式人工复核后判为误报，不要求为消除提示而削弱来源区分。P0/P1=0。
- 状态写回 `CURRENT.md` v4-158：FIFO 064 关闭，`UI-M3-03` 保持 `review` 并转 `Current actor/Reviewer=用户`；`FRONT-M3-03B` 仍阻塞到用户体验确认，未通知前端、未修改生产代码、迁移或共享契约。

## 2026-08-14 — UI-M3-03 Rev 3 三项定向增量完成并交规划

- `DESIGN.md` 5.7 与 UI 验收已补齐三项权威语义：竖屏/横屏/方形视频按元数据使用 `object-fit: contain` 完整显示；公司稿/中文识别使用独立来源层与中间对齐关系层，唯一最终稿保持下游第三层；自动筛选只显示本地规则优先、AI 可选且失败不阻断的紧凑摘要和按需判断依据。
- 仓库外原型新增三种匿名画幅海报和 4 张 Rev 3 定向证据，Rev 1/2 的 15 张截图与全部状态行为冻结。1024 下仅把队列粘性定位收敛为静态，避免向下查看证据时覆盖播放器，不改变业务动作。
- 真实浏览器结果：`1440×900 / 204px` 根页面 `1430/1430`；`1024×768 / 204px` 与 `/72px` 下竖屏、横屏、方形均为 `1014/1014`、`object-fit=contain`，判断依据可按需展开，最终控制台 `error=0 / warn=0`。
- `node --check` 与授权文档 `git diff --check` 通过。Impeccable 因 HTML 解析模块缺失使用正则降级，发现一条厚色边警告；已把 3px 顶部边框改为内嵌标识线，最终浏览器计算样式为 `border-top=0px / inset box-shadow=3px`，未把降级检测单独作为通过依据。
- 状态已写回：`CURRENT.md` 从 v4-155 最小递增为 v4-156，任务转 `review / Current actor=规划对话`，FIFO 064 登记为 `notification_pending`；未修改生产前后端、迁移或共享契约，未解锁前端。
- 唤醒已发送：正式交接只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知前端、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 064 完整消息位于规划最新 turn，规划任务状态为 `inProgress`；没有发送失败或重试。`CURRENT.md` 随后最小递增为 v4-157，FIFO 064 转 `active`，UI 停止修改并等待规划独立审核。

## 2026-08-14 — UI 领取 UI-M3-03 Rev 3 定向增量

- 完整重读项目协议 v4.2、`CURRENT.md` v4-154、前置审改/系统控制中心/本地等价权威契约、`DESIGN.md` 5.7、UI 验收记录和开发日志顶部，确认用户已通过 Rev 1/2 功能方向。
- 本轮只补三项 UI：证据播放器按元数据适配竖屏/横屏/方形并保持 `object-fit: contain`；公司稿与中文识别以来源标题、标签、边界、间距和中间关系层明确区分，唯一最终稿保持下游第三层；员工页增加紧凑本地规则优先/可选 AI 自动筛选摘要与按需判断依据。
- Rev 1/2 状态行为、六类决定、键盘、格式、错误及 15 张证据冻结；不改生产前后端、迁移或共享契约，不接真实 DeepSeek/API，不扩展系统控制台、优化智能体页面、OCR、完整风险、时间轴、转码、字幕验收或交付。
- `CURRENT.md` 从 v4-154 最小递增为 v4-155，任务转 `in_progress / Current actor=UI 设计对话`。

## 2026-08-14 — 用户确认前置审改 UI Rev 3 与长期优化智能体边界

- 用户确认前置审改 Rev 1/2 的整体功能方向，同时提出三个定向增量：短剧视频证据必须按元数据完整适配竖屏/横屏/方形素材；公司稿与中文识别同屏但须通过来源标题、分组边界和中间对齐关系层清晰区分；员工页只保留紧凑自动筛选摘要及按需判断依据，不增加模型配置墙。
- 只读核对本地应用后确认其存在 `deepseek-v4-flash` 配置以及“本地快速筛选 / AI 复核（可选）”行为。用户决定长期保留这一能力，但本地确定性规则足够优秀时应允许关闭 AI 或只做抽样；AI 停用、失败或超预算不得阻断人工工作台。
- 用户进一步明确人工操作不是逐条触发自动升级，而是长期保留为后台结构化日志；由系统控制台内的持久化优化智能体按管理员选择的模块、时间范围、目标和预算批量分析，输出本地规则、AI 筛选、提示词、热词/风险词和测试候选。候选仍须经过脱敏数据集、离线回归、人工批准和小流量验证，智能体无权直接发布或修改生产版本。
- 已更新 `docs/contracts/SYSTEM_CONTROL_CENTER.md`、`M3-pre-edit-workbench.md`、`LOCAL_APP_PARITY.md` 和 `docs/architecture.md`，固化本地优先/AI 可选、版本快照、长期日志、优化智能体、证据回溯、评测发布与回滚边界；真实 AI、管理 API、微调、付费和控制台生产实现仍后置。
- `CURRENT.md` 从 v4-152 递增为 v4-153：`PLAN-LONG-03` 与 `PLAN-SYSTEM-01` 升为 Rev 2 并关闭；`UI-M3-03` 定向递增为 Rev 3 / ready，只更新原型、DESIGN/UI 验收和对应证据，Rev 1/2 状态行为冻结；`FRONT-M3-03B` 继续等待该 UI 增量，避免正式前端返工。FIFO 063 已登记为 `notification_pending`，正式唤醒下一步只发送 UI 固定对话。
- 状态已写回：规划、系统控制台、等价矩阵和 UI Rev 3 任务先写回 `CURRENT.md` v4-153 与开发日志。
- 唤醒已发送：正式派发只发送 UI 固定对话 `019ff52d-d4a1-7440-81a2-fc9c1b0a0996`，未通知前端、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示完整 FIFO 063 消息位于 UI 最新 turn，UI 任务状态为 `inProgress`；没有发送失败或重试。规划最小写回 v4-154 并关闭 FIFO 063，等待 UI 自行登记领取和交付。

## 2026-08-14 — 规划独立复验通过 BACK-M3-03A Rev 3

- 规划只审 Rev 3 唯一门禁及回归，不重做 Rev 2 已冻结证据。代码确认 `completeEpisode` 在既有事务、项目+幂等键锁、session/episode 行锁内读取数据库 `status/limited_reason`，并在完成签名、episode/session 修订和命令落账前稳定返回 `409 PRE_EDIT_COMPLETION_BLOCKED / run_asr`。
- mixed-ASR 回归在正式 API 上调用 limited 集完成，逐项比较失败前后的 episode status/revision/completionSignature/limitedReason、session status/revision、完成命令总数和目标幂等键记录，全部不变；同文件既有 ready 集完成、完成签名与不可变 release/SRT 正向路径继续通过。
- 创建精确隔离数据库 `qimao_plan_back_m303a_rev3_20260814`，从零成功应用 21 个迁移；新鲜前置审改专项 1 文件 7/7、后端生产构建和 `git diff --check` 通过。隔离库已按精确名称删除并确认残留 0，共享 PostgreSQL 保持运行。
- `CURRENT.md` 从 v4-151 最小递增为 v4-152，FIFO 062 与 `BACK-M3-03A` 关闭。完整 `pnpm check` 留正式前端终验后的 S3 关闭门；后端依赖已满足，但 `UI-M3-03` 仍等待用户体验本地原型后确认，因此未通知或解锁 `FRONT-M3-03B`。

## 2026-08-14 — BACK-M3-03A Rev 3 limited 完成门禁完成并交规划

- 生产改动严格限定 `PreReviewWriteRepository.completeEpisode`：在既有事务取得 episode 行锁并读取 `status/limited_reason` 后，以数据库 `status=limited` 或 `limited_reason IS NOT NULL` 为权威事实，稳定拒绝完成并返回 `409 PRE_EDIT_COMPLETION_BLOCKED / run_asr`；未改共享契约、迁移或其他 Rev 2 状态机。
- 在真实 mixed-ASR 回归中对 limited 集调用正式完成 API，确认错误稳定，且 episode 的 status/revision/completionSignature/limitedReason、session 的 status/revision 及 `pre_edit_commands` 数量和目标幂等键记录均保持不变；既有 ready 集完成与不可变 release/SRT 正向路径仍通过。
- 精确隔离数据库 `qimao_back_m303a_rev3_20260814` 从零成功应用 21 个迁移；新鲜运行 `tests/backend/pre-review.test.ts` 为 1 文件 7/7，通过后端生产构建和 `git diff --check`。测试后 projects/pre-edit sessions/commands 均为 0，隔离库已按精确名称删除并确认残留 0，共享 PostgreSQL 保持运行。
- 本轮只修改后端仓储、对应后端测试和同步文档；未修改生产前端、`DESIGN.md`、迁移或共享契约，未接真实供应商、网络、R2、转码或 OCR，未运行完整 `pnpm check`，未提交、推送或部署。
- 状态已写回：`CURRENT.md` 从 v4-149 最小递增为 v4-150，任务转 `review / Current actor=规划对话`，FIFO 062 登记为 `notification_pending`；正式唤醒下一步只发送规划固定对话，不直接通知或解锁 UI/前端。
- 唤醒已发送：正式交接只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知 UI、前端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 062 完整消息出现在规划最新 turn，规划任务状态为 `inProgress`；没有发送失败或重试。`CURRENT.md` 随后最小递增为 v4-151，FIFO 062 进入 `active`，后端停止修改并等待规划独立复验。

## 2026-08-14 — 后端领取 BACK-M3-03A Rev 3 limited 完成门禁返工

- 完整重读项目协议 v4.2、`CURRENT.md` v4-147、前置审改权威契约与开发日志顶部，确认规划已独立通过并冻结 Rev 2 的 21 迁移、三文件 30/30、双构建及 Worker/来源/术语/时长/策略/幂等/理由证据。
- 本轮只在 `PreReviewWriteRepository.completeEpisode` 的既有事务和 episode 行锁内阻断 `status=limited` 或 `limited_reason IS NOT NULL`；补 mixed-ASR limited 集稳定错误与 episode/session/command 全量零副作用回归，同时保留 ready 集完成和 release 正向路径。
- `CURRENT.md` 从 v4-147 最小递增为 v4-148；任务转 `in_progress / Current actor=后端开发对话`。不修改迁移、共享状态机、生产前端或 `DESIGN.md`，不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-14 — 规划独立复验 BACK-M3-03A Rev 2 并定向退回 limited 完成门禁

- 规划核对共享契约、来源快照、Worker entry/租约回写、策略 preview/apply、人工决定/撤销、完成/release 和 Rev 2 新增回归。可停止 Worker、当前清单同视频 ASR 绑定、旧结果隔离、mixed-ASR limited、固定术语证据、权威视频时长、仅安全一对一自动策略、同计算预览/执行、项目+幂等键事务串行化及 trim 后至少 8 字理由均成立；Rev 2 这些通过项冻结。
- 创建精确隔离数据库 `qimao_plan_back_m303a_rev2_20260814`，从零成功应用 21 个迁移；新鲜运行 `tests/backend/pre-review.test.ts`、`terms.test.ts`、`asr.test.ts` 为 3 文件 30/30，通过共享契约构建、后端生产构建和 `check:repo`；`git diff --check` 退出码 0，仅报告既有两个文档的 CRLF→LF 提示。隔离库随后按精确名称删除并确认残留 0，共享 PostgreSQL 保持运行。
- P1 真实复现：规划在隔离库构造 `status=limited`、`limited_reason=ASR result missing`、只有公司轴且无待人工/格式阻断的单集，调用正式 `PreReviewWriteRepository.completeEpisode` 得到成功响应和 64 位完成签名；数据库随后为 `completed|ASR result missing|true`。服务层没有额外 limited 门禁，现有 limited 测试只检查进入 limited，没有尝试完成，因此全部绿灯不能证明该契约成立。
- 该行为违反前置审改权威契约和已通过 UI 的“有限审改只处理公司稿格式、不得冒充完成 ASR 对照”。`BACK-M3-03A` 递增为 Rev 3，只需在完成命令同一事务/行锁内阻断 limited 集，保证错误稳定且状态、修订、签名、命令均无副作用；补 mixed-ASR limited 负向回归，并保留 ready 正向完成/release 回归。不得重写 Rev 2 其他路径，不改生产前端/DESIGN、迁移或共享状态机。
- `CURRENT.md` 已从 v4-146 最小递增为 v4-147；FIFO 061 转 `notification_pending`，`FRONT-M3-03B` 继续等待 UI 用户确认和后端规划验收双依赖。状态已写回；正式退审下一步只发送后端固定对话，不要求用户传话。
- 唤醒已发送：规划只向后端固定对话 `019ff4de-084b-7002-a7eb-20ff93d97d0a` 发送 Rev 3 定向退审，没有通知 UI、前端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示完整 Rev 3 消息位于后端最新 turn，后端明确回执“已领取 BACK-M3-03A Rev 3，并进入 in_progress”；没有发送失败或重试。后端先按协议将领取写回 v4-148，规划随后最小合并为 v4-149，FIFO 061 关闭。

## 2026-08-14 — BACK-M3-03A Rev 2 四组 P1 与长句理由契约完成并交规划

- 新增可停止、有界轮询的 pre-review Worker entry、独立开发/启动脚本并接入 `development.ts`；queued 正式会话可实际推进。Worker 失败落账先以 `status=leased + lease_owner=当前 Worker` 条件取得所有权，旧 Worker 的迟到失败不能覆盖新租约或成功结果。
- 当前 ASR 查询必须同时匹配最新素材清单同集 `asr_video` Asset；旧视频结果被隔离，全剧无匹配结果返回 `PRE_EDIT_SOURCE_NOT_READY`，有 ASR 与缺 ASR 混合时保存 `limited` 集和会话。专项同时修正无 ASR 时 LEFT JOIN 重名列覆盖集数的真实运行错误。
- 第 21 个迁移为 episode 保存与当前 ASR Attempt 绑定的权威媒体时长，并为 item 保存固定 TermVersion 逐条术语匹配/冲突证据。API 明确返回 `videoDurationMs + known/unknown`；Worker、策略、人工决定和撤销均用保存时长计算 `after_video_end`，未知时不冒充已验证。
- `asr_text_primary` 只自动作用于安全一对一。新增只读策略 preview，按与 apply 相同的计算返回安全更新、保护人工和仍需人工数量；组合轴、低质量、格式或术语冲突继续人工。所有写命令在事务内先按项目+幂等键 advisory lock 串行化后重查，同键并发只产生一次资源/事件并稳定 replay，同键异参稳定 409。
- 按 v4-143 补充将 `formatOverrideReason` 共享契约改为至少 8 字，并由仓储对 trim 后长度做权威 422 校验；1–7 字不落 DecisionEvent、不改变 item/version、不解除门禁，合法理由只覆盖可覆盖的 `long_line` 并保存审计事实。
- 精确隔离库 `qimao_back_m303a_rev2_20260814` 从零成功应用 21 个迁移。最终前置审改专项 7/7；前置审改、术语、ASR 三文件合计 30/30；共享契约与后端构建、`check:repo`、`git diff --check` 全部退出码 0。本任务按约定未运行完整 `pnpm check`。
- 测试后 projects/pre-edit sessions/commands/playback grants 均为 0；隔离库已按精确名称删除并确认残留 0，共享 PostgreSQL 保持运行。未修改生产前端或 `DESIGN.md`，未接真实供应商、网络、密钥、R2、转码、OCR、字幕验收或云资源，未提交、推送或部署。
- `CURRENT.md` 从 v4-144 最小递增为 v4-145；任务转 `review / Current actor=规划对话`，FIFO 061 登记为 `notification_pending`。状态已写回；正式唤醒下一步只发送规划总线，不直接通知 UI/前端。
- 唤醒已发送：正式交接只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知 UI、前端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 061 完整消息位于规划最新 turn，目标状态为 `inProgress`；没有发送失败或重试。确认后 `CURRENT.md` 最小递增为 v4-146，FIFO 061 进入 `active`，后端停止修改并等待规划独立复验。

## 2026-08-14 — 规划登记 S3 长句理由前后端最小对齐补充

- `UI-M3-03` Rev 2 通过后的交叉检查确认：`DESIGN.md` 与正式 UI 已要求长句保留理由至少 8 字，但共享 `CreatePreEditDecisionBody.formatOverrideReason` 当前仍为 `minLength: 1`，后端仓储只 trim 并判断非空；若不提前对齐，1–7 字理由可绕过后端权威门禁。
- 本补充不新增功能或状态：只要求正在执行的 `BACK-M3-03A` Rev 2 把共享契约和后端校验统一为 trim 后至少 8 字，并补“不足 8 字不落事件/不解除门禁、有效理由可审计保存”回归；UI、前端和既有格式状态机保持冻结。
- 状态已写回：`CURRENT.md` v4-143 已登记本约束。
- 唤醒已发送：规划只向后端固定对话 `019ff4de-084b-7002-a7eb-20ff93d97d0a` 发送补充约束，没有通知 UI、前端或要求用户传话。
- 送达/运行态已确认：`wait_threads` 显示后端最新 commentary 明确回复“已收到规划总线 v4-143 的补充约束，并入当前 BACK-M3-03A Rev 2 / in_progress”，且已开始修改对应共享契约；没有发送失败或重试。确认后 `CURRENT.md` 最小递增为 v4-144。

## 2026-08-14 — 规划通过 UI-M3-03 Rev 2 独立审核并转用户方向确认

- 规划按 FIFO 060 对照 `M3-pre-edit-workbench.md`、`DESIGN.md` 5.7、UI 验收记录、仓库外原型源码与 5 张定向截图复核四项退审根因；本轮未修改生产前端、后端、迁移或共享契约。
- 应用内浏览器新鲜复验确认：`company_only` 只显示保留/手改/删除并写入 `keep_company / 公司轴 118`；`asr_only` 只显示补入/手改后补入/忽略并写入 `add_asr / 识别轴 132`；`limited` 只显示公司稿与公司稿格式处理，双源完成保持禁用且给出等待 ASR 后重建会话的下一步。
- 文本基准真实键盘序列为取消、确认、关闭、当前范围 radio、当前基准 radio 后闭环，Escape 关闭并恢复“调整文本基准”。长句不足 8 字时错误与焦点稳定且门禁不放行；有效理由保存 `reason_recorded`，真实裁短至 8 个有效字保存 `text_shortened`，两条路径均只读取已保存事实。
- 1440 根页面 `1430/1430`；规划另以 1024×768 新鲜复验根页面 `1014/1014`，展开/收起后工作区均无页面级横溢；控制台 error/warn 为空。Impeccable detector 返回 `[]`，但明确为缺 HTML 解析模块的正则降级，因此只作辅助，最终结论以截图、源码和真实 DOM/键盘为准。
- 审核结论 P0/P1=0。`CURRENT.md` 更新为 v4-142，FIFO 060 关闭，`UI-M3-03` 转 `review / Current actor=用户 / Reviewer=用户`，只等待正式 UI 方向确认。`FRONT-M3-03B` 继续等待 UI 用户确认与 `BACK-M3-03A` Rev 2 规划验收双依赖，不提前解锁。

## 2026-08-14 — UI 完成 UI-M3-03 Rev 2 四项定向收口并交规划

- `DESIGN.md` 5.7 与 UI 验收记录已把状态专属动作绑定到真实决定语义：仅公司轴只允许保留/手改/删除并使用公司轴时间，仅识别轴只允许补入/手改后补入/忽略并使用识别轴时间；有限审改移除全部 ASR 决定，只允许公司稿与格式处理，不能完成双源对照。
- 文本基准弹窗焦点循环已包含范围与基准 radio。真实 Tab 序列可由取消经过确认、关闭、范围 radio、基准 radio，Shift+Tab 反向成立；Escape 关闭后恢复原“调整文本基准”触发点。长句同时提供真实拆句/裁短与至少 8 字的明确保留理由，未保存或不足 8 字不会解除门禁，保存后形成可审计格式决定。
- Rev 1 三栏布局、视觉和 10 张证据全部冻结；仓库外 `evidence-rev2` 新增 5 张定向截图，分别证明仅公司轴、仅识别轴、有限审改、基准 radio 焦点和长句理由。新增状态在 1024×768 侧栏 204/72 两态根页面均为 `1014/1014`，控制台 `error/warn=0/0`。
- 原型 `node --check`、授权文档 `git diff --check` 通过；Impeccable `detect` 返回 `[]`，但仍是缺 HTML 解析模块的正则降级，只作辅助。临时原型服务 PID 40224 已精确停止并确认，本轮浏览器标签页已清理。
- 未修改生产 frontend/backend、迁移或共享契约，未扩展 OCR、完整风险、时间轴、转码、字幕验收、交付、供应商或云资源。`CURRENT.md` 在保留后端 v4-139 并行领取事实后最小递增为 v4-140；任务转 `review / Current actor=规划对话`，FIFO 060 为 `notification_pending`。状态已写回；正式唤醒下一步只发送规划总线。
- 唤醒已发送：正式交接只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知前端、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 060 完整消息位于规划最新 turn，目标状态为 `inProgress`；没有发送失败或重试。`CURRENT.md` 随后在 v4-140 基础上最小递增为 v4-141，FIFO 060 进入 `active`，UI 停止修改并等待规划独立审核。

## 2026-08-14 — 后端领取 BACK-M3-03A Rev 2 定向返工

- 完整重读项目协议 v4.2、`CURRENT.md` v4-138、前置审改权威契约和开发日志顶部，确认规划已冻结 Rev 1 的迁移、三文件 27/27、双构建与既有六类决定/撤销/stale/release/SRT/只读播放证据。
- 本轮只收口四组 P1：可停止轮询 Worker 入口与 lease-owner 失败回写；当前清单同集视频 Asset 的 ASR 绑定及 mixed/full-missing 行为；安全一对一策略预览、固定术语版本逐条证据和权威视频时长门禁；所有写命令的项目+幂等键并发串行化。
- `CURRENT.md` 从 v4-138 最小递增为 v4-139，任务保持 Rev 2 `in_progress / Current actor=后端开发对话`。不修改生产前端或 `DESIGN.md`，不接真实供应商、网络、密钥、R2、转码、OCR、字幕验收或云资源，不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-14 — 规划独立复验 BACK-M3-03A Rev 1 并一次性退回 Rev 2

- 规划按 FIFO 059 核对共享 `pre-review` 契约、第 20 个迁移、来源/读取/写入/Worker/路由、S3 产品契约及 4 项专项回归。创建精确隔离库 `qimao_plan_back_m303a_review_20260814`，从零成功应用 20 个迁移；新鲜运行前置审改、术语、ASR 三文件 27/27，通过共享契约与后端生产构建、`check:repo` 和 `git diff --check`。隔离库随后按精确名称删除，残留为 0；共享 PostgreSQL 继续运行，未干扰并行 UI。
- 真实运行 P1：仓库只有 `PreReviewWorker.runOnce()`，没有轮询 entry、独立启动脚本或 `development.ts` 接入；现有正式创建 API 只入队，除测试手动调用外无人消费，页面会永久停在 `preparing`。Worker 事务回滚后的失败更新也未带 `lease_owner=当前 Worker` 条件，存在旧失败回写覆盖新租约/成功的竞态。
- 来源 P1：`current_asr` 只按项目、集数和术语版本选最新结果，没有要求 `asr_results.asset_id` 等于最新清单同集 `asr_video` Asset；换视频后旧会话虽会 stale，但基于新清单创建时仍可能绑定旧视频识别结果。专项没有覆盖 mixed-ASR 的 `limited` 会话或旧视频结果隔离。
- 策略/术语 P1：`effectiveSystemDecision` 把 `one_company_many_asr` 也视为 ASR 优先可自动采用，违反组合轴必须人工裁决；固定 `termVersionId` 只进入来源摘要，没有逐条术语匹配/冲突证据。UI 已确认的基准弹窗需要保存前“安全更新/保护人工/仍需人工”权威数量，但共享契约只有执行后的结果，浏览器无法跨全剧分页安全预览。`after_video_end` 虽存在枚举与扫描函数，Worker/决定路径从未传入权威视频时长，当前不能真实触发。
- 并发一致性 P1：所有命令在读取 `pre_edit_commands` 后才取得项目/会话锁；两个并发同键同请求可以同时读到空记录，后到请求会得到版本冲突/唯一键异常而非稳定 replay。Rev 2 必须在同一事务先按项目+幂等键串行化再重查，确保同键同请求只产生一个资源/事件，同键异参稳定 409。
- 为减少往返，规划把以上问题合并成四组同源 Rev 2：运行与租约、当前来源与 limited、策略预览/术语/格式证据、并发幂等；既有六类人工动作、撤销、stale、release/SRT 和只读播放通过项冻结。`CURRENT.md` 更新为 v4-137，FIFO 059 进入 `notification_pending`，前端继续阻塞；完整 `pnpm check` 仍留 S3 关闭门。
- 唤醒已发送：规划只向后端固定对话 `019ff4de-084b-7002-a7eb-20ff93d97d0a` 发送 Rev 2 正式退审，没有通知 UI、前端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示完整 Rev 2 消息位于后端最新 turn，状态为 `inProgress`；未发生发送失败或重试。确认后 `CURRENT.md` 递增为 v4-138，FIFO 059 关闭，`BACK-M3-03A` Rev 2 进入 `in_progress`。

## 2026-08-14 — UI 领取 UI-M3-03 Rev 2 定向返工

- 完整重读协议 v4.2、`CURRENT.md` v4-134、前置审改契约 5–10、`DESIGN.md` 5.7、Rev 1 验收记录和开发日志顶部；使用 Impeccable harden/craft-floor 只审状态专属动作、表单键盘可达性和长句边界，不改变已通过视觉方向。
- 规划已在 v4-133 完成退审送达闭环并把任务置为 `in_progress / Current actor=UI 设计对话`；UI 在保留后端 v4-134 完成交接事实后最小合并为 v4-135，确认只修四项同源缺口。Rev 1 的三栏布局、来源失效、视频、失败恢复、1440/1024 与 10 张证据冻结。
- 本轮只修改 `DESIGN.md` 5.7 对应语义、`docs/ui/M3-pre-edit-acceptance.md`、仓库外原型/四项定向证据和同步文件；不修改生产 frontend/backend、迁移或 contracts，不扩展 OCR、完整风险、时间轴、转码、字幕验收、交付、供应商或云资源。

## 2026-08-14 — BACK-M3-03A Rev 1 前置审改权威后端完成并交规划

- 新增共享 `pre-review` TypeBox 契约和第 20 个增量迁移；PostgreSQL 固定项目、公司 SRT、术语版本、素材清单、视频、ASRResult、adapter、热词与配置摘要、算法和格式策略身份，保存会话、逐集、租约准备 Job、六类组合轴、唯一公司目标、决定/策略事件、幂等命令、完成签名、不可变 release/SRT 和短时播放授权。
- `backend/src/modules/pre-review/` 以只读 `TermSourceService`、现有 Asset/Storage 和当前 ASRResult 为最小来源边界。租约 Worker 生成一对一、一公司多 ASR、多公司一 ASR、company-only、asr-only、uncertain 六类确定性对齐；缺 ASR 的集进入 limited。整剧/选中集/单条策略只更新系统决定，人工决定永不被覆盖。
- 六类人工动作与追加撤销使用不可变 DecisionEvent、条件版本和项目级幂等命令；来源摘要变化把旧会话置为只读 stale，历史条目/事件仍可读取。28 字、中文标点、标记/括号、空文本和视频时长等格式门禁参与完成签名，显式理由只覆盖可覆盖问题；全部集签名后在单事务生成不可变 release 和确定性 UTF-8 BOM/CRLF SRT，重复同键返回同一资源。
- 短时视频证据仅保存 PostgreSQL 授权摘要和只读对象键，过期前可重复读取；没有转码、上传或复制真实素材。专项首轮真实暴露 HTTP 查询/路径整数未接受 URL 字符串以及 ASR `configDigest/hotwordDigest` SQL 别名丢失，两处均已在契约/来源边界修正并由回归覆盖。
- 精确隔离空库 `qimao_back_m303a_20260814` 从零成功应用 20 个迁移。新鲜前置审改专项 4/4；连同术语和 ASR 上游回归共 3 文件 27/27；共享契约与后端构建、`check:repo`、`git diff --check` 全部退出码 0。本任务按约定未运行完整 `pnpm check`。
- 测试后项目、会话、命令、release、播放授权匿名数据计数均为 0；隔离库已按精确名称删除并确认残留 0，共享 PostgreSQL 仍可连接。未修改生产前端或 `DESIGN.md`，未接真实 AI/ASR/OCR、完整风险词库、时间轴编辑、转码、字幕验收、学习规则批准、系统控制台或云资源，未提交、推送或部署。
- `CURRENT.md` 从 v4-133 最小合并为 v4-134；任务转 `review / Current actor=规划对话`，FIFO 059 登记为 `notification_pending`。状态已写回；正式唤醒下一步只发送规划总线，不直接通知 UI/前端。
- 唤醒已发送：正式交接只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知 UI、前端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 059 完整消息位于规划最新 turn，目标状态为 `inProgress`；没有发送失败或重试。确认后在保留 UI v4-135 领取事实的基础上将 `CURRENT.md` 最小递增为 v4-136，FIFO 059 进入 `active`，后端停止修改并等待规划独立复验。

## 2026-08-14 — 规划独立审计退回 UI-M3-03 Rev 2

- 规划对照 `M3-pre-edit-workbench.md`、职责/等价矩阵、`DESIGN.md` 5.7、UI 验收记录、10 张交付截图和仓库外 `index.html/app.js/styles.css`。总体布局、来源条、组合轴上下文、唯一最终稿、基准三范围、格式事实、逐集门禁、来源失效、直接 MP4、失败恢复与响应式方向成立，未发现 OCR、字幕验收、交付或云资源越界。
- P1 业务正确性：原型 `showState(companyOnly/asrOnly)` 只改按钮文字，没有切换事件语义。仅公司稿仍可点击采用识别文本并把“没有可用识别轴”写入最终稿；仅识别场景的“补入/手动修改后补入”仍分别调用普通保留公司稿/采用 ASR 事件。`limited` 仅插入提示条，普通双源决定仍全部可用，与“只处理公司稿格式、不得伪装双源对照”冲突。
- P1 键盘可达性：文本基准对话框的焦点循环只枚举 `button:not(:disabled)`，从取消/确认会在关闭按钮间循环，作用范围和文本基准 radio 不能通过键盘到达；现有“Tab/Shift+Tab 闭环”证据没有覆盖实际表单控件。
- P1 完成路径：权威契约允许超 28 字台词“手动拆句、裁短或明确保留理由”，DESIGN/验收/原型只有修正文案和持续阻断，没有可审计的保留理由入口，合法长句会形成无完成路径。Rev 2 只补状态专属动作、有限审改限制、完整表单焦点闭环和理由事件；其余通过项冻结。
- 规划本轮唯一 Impeccable detector 返回 `[]`，但工具明确为缺 HTML 解析模块的正则降级，不能推翻上述人工代码审查。in-app Browser 拒绝本地 `file://` 原型且规划未绕过安全策略；本轮视觉审查使用交接中明确提供的 10 张证据，源代码审查补足动态行为。截图实际为 full-page 取证（1440 组约 `1430×1032`、1024 组约 `1014×1622/1632`），不把文件像素高度冒充视口高度；既有 DOM 测量只作为 UI 交接证据保留。
- `CURRENT.md` 从 v4-131 更新为 v4-132；FIFO 058 进入 `notification_pending`，`UI-M3-03` 更新为 Rev 2 `ready / Current actor=UI 设计对话 / Reviewer=规划对话`。`BACK-M3-03A` 继续其不重叠后端范围，`FRONT-M3-03B` 继续阻塞。
- 唤醒已发送：规划只向 UI 固定对话 `019ff52d-d4a1-7440-81a2-fc9c1b0a0996` 发送 Rev 2 正式退审，没有通知前端、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示完整退审消息位于 UI 最新 turn，任务状态为 `inProgress`；没有发送失败或重试。确认后 `CURRENT.md` 递增为 v4-133，FIFO 058 关闭，`UI-M3-03` Rev 2 记为 `in_progress`。

## 2026-08-14 — UI 完成 UI-M3-03 Rev 1 前置审改正式设计

- `DESIGN.md` 5.7 已替换旧的泛化描述，正式限定为公司 SRT、ASR、组合轴上下文和唯一最终稿；新增集/问题队列、六类渐进动作、文本基准人工保护、撤销与编辑脏态、格式门禁、完成本集进入下一未完成集、不可变待验收修订和来源变化只读恢复。
- 新增 `docs/ui/M3-pre-edit-acceptance.md`，覆盖正常、仅公司轴、仅 ASR 轴、有限审改、格式阻断、加载、空、失败、再次失败、提交中、本集/整剧完成，以及危险确认、键盘闭环、请求标识、唯一恢复和生产实现停止边界。
- 仓库外可操作原型及 10 张匿名证据位于 `m3-pre-edit-rev1`。真实浏览器实测 1440 根 `1430/1430`，1024 侧栏 204/72 两态均 `1014/1014`；基准/危险弹窗安全聚焦，脏态聚焦保存，提交中决定区获焦且 Tab 不逸出，决定和上下文动作全锁定，成功回 `role=status`；首次重读再次失败后聚焦唯一恢复，第二次恢复成功。新标签页关键交互及 1440/1024 控制台均 `error/warn=0/0`。
- Impeccable `detect` 返回 `[]`，但因本机缺少 HTML 解析模块仅执行正则降级扫描，验收文档已如实标注并以真实浏览器、DOM、键盘和人工截图审查作为主要证据；`node --check` 与授权文档 `git diff --check` 通过。
- 未修改生产 React、后端、迁移或共享契约，未扩展 OCR、完整风险、任意时间轴编辑、转码、字幕验收、交付、真实供应商或云资源。本轮临时 127.0.0.1 静态服务 PID 39764 已精确停止，浏览器临时视口已复位、标签已清理。
- `CURRENT.md` 从 v4-129 最小合并为 v4-130；`UI-M3-03` 保持 Rev 1 转 `review / Current actor=规划对话`，FIFO 058 进入 `notification_pending`。状态已写回；正式唤醒下一步只发送规划总线。
- 唤醒已发送：正式交接只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知前端、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 058 消息位于规划最新 turn，目标状态为 `inProgress`；没有发送失败或重试。`CURRENT.md` 随后最小递增为 v4-131，FIFO 058 进入 `active`，UI 停止修改并等待规划审核。

## 2026-08-14 — UI 领取 UI-M3-03 Rev 1 前置审改工作台设计

- 完整重读项目协议 v4.2、`CURRENT.md` v4-128、前置审改权威契约、职责矩阵“前置审改”行、本地等价矩阵对应五项能力、M3 冲刺、现有 `DESIGN.md` 与开发日志顶部；只读核对本地 `dual_srt.py`、`subtitle_review_workflow.py`、`subtitle_sop.py`、`evidence_player.py` 及旧 UI 补丁中的组合轴、六类决定、下一待处理、完成签名和视频定位行为。
- `CURRENT.md` 从 v4-128 最小合并为 v4-129；`UI-M3-03` 保持 Rev 1 `in_progress / Current actor=UI 设计对话`。设计读取为现有企业工作台的新增高频 Operate 表面，参数为低变化、低动效、高密度；旧桌面多窗口和固定按钮堆叠不作为网页结构。
- 本轮只修改 `DESIGN.md`、`docs/ui/M3-pre-edit-acceptance.md`、仓库外可操作原型/匿名证据和共享同步文件；不修改生产 React、后端、迁移或共享契约，不实现 OCR、完整风险词库、任意时间轴编辑、转码、字幕验收、交付、真实供应商或云资源。

## 2026-08-14 — 后端领取 BACK-M3-03A Rev 1 前置审改权威流程

- 完整重读项目协议 v4.2、`CURRENT.md` v4-126、前置审改权威契约、职责矩阵“前置审改”行、本地双应用等价矩阵对应能力、M3 冲刺及术语/ASR 契约，确认唯一后端执行项为 `BACK-M3-03A` Rev 1。
- `CURRENT.md` 从 v4-126 最小合并为 v4-127，任务转为 `in_progress / Current actor=后端开发对话`。本轮只实现共享契约、增量迁移、`backend/src/modules/pre-review/`、必要 Worker/短时只读播放边界和匿名后端回归；PostgreSQL 为唯一权威。
- 生产前端、`DESIGN.md` 和本地两个应用保持只读；不接真实 AI/ASR/OCR、完整风险词库、任意时间轴编辑、转码、字幕验收、学习规则批准、系统控制台或云资源，不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-14 — PLAN-M3-03 确认并发布前置审改 UI/后端并行任务

- 用户确认采用规划推荐的 S3 方案。规划只读核对 `short-drama-terms-workbench` 的 README、V3.57、V3.79–V3.82 功能契约、`dual_srt.py`、`subtitle_review_workflow.py`、`subtitle_sop.py` 与 `evidence_player.py`，以及字幕验收应用的只读工作流边界；未修改、复制或运行两个本地应用和任何真实素材。
- 新增 `docs/contracts/M3-pre-edit-workbench.md`：保留公司稿为默认文本/专名/断句/时间轴基准，ASR 只作证据；保留一对一/一对多/多对一、公司-only/ASR-only、唯一目标公司轴、六类决定、完成签名、逐集导航、原始来源保护和人工学习事件门禁。云端优化为整剧/选中集/单条文本基准、PostgreSQL 权威恢复、条件版本/幂等、不可变决定与撤销、直接 MP4 seek、28 字长轴门禁和确定性待验收 SRT。
- 同步更新职责矩阵、功能等价矩阵和 M3 冲刺：S3 不吸纳 OCR、完整风险词库、时间轴编辑、360p/1080p 转码、最终字幕验收、规则批准或交付产品库；这些能力继续保留为后续必做项，不通过改名假装完成。
- `CURRENT.md` 更新为 v4-126；`PLAN-M3-03` 关闭，`UI-M3-03` 与 `BACK-M3-03A` 以不重叠文件范围解锁 `ready`，`FRONT-M3-03B` 保持依赖阻塞。状态已写回；规划接下来按 v4.2 分别主动唤醒 UI/后端并确认送达/运行态，不要求用户传话。
- 唤醒已发送：规划只向 UI 固定对话 `019ff52d-d4a1-7440-81a2-fc9c1b0a0996` 和后端固定对话 `019ff4de-084b-7002-a7eb-20ff93d97d0a` 发送各自正式 S3 任务，没有通知前端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示两条正式派发都位于目标最新 turn，UI 与后端状态均为 `inProgress`；没有发送失败或重试。后端随后已按协议领取并把 `CURRENT` 合并为 v4-127；规划在保留该领取事实后将闭环确认合并为 v4-128，UI 与后端并行执行，前端继续依赖阻塞。

## 2026-08-14 — 规划关闭 FRONT-M3-02D 与 S2.1 多剧 ASR

- 规划接受 UI 对正式 React + Fastify Wave B 的完整领域终验：23 部项目、22 条 Dispatch、服务端搜索/筛选/排序/分页、当前页与显式跨页选择、20 部竞态、部分接受、未知创建同一 ID 只读恢复、取消未知只读恢复、列表/详情 503、详情 pending 键盘闭环、1440/1024 侧栏两态及控制台均有真实证据；P0/P1/P2/P3=0。Impeccable 审计继续采用前一规划轮的 `18/20（Excellent）` 与检测 `[]`，本关闭门未修改 UI 或生产代码。
- 规划创建精确隔离数据库 `qimao_plan_s21_waveb_close_20260814`，以该 `DATABASE_URL` 新鲜运行完整 `pnpm check`：从零成功应用 19 个迁移，16 个测试文件 138 项全部通过，仓库边界、lint、类型检查以及共享契约/后端/前端构建全部通过；前端生产构建为 155 modules。
- 隔离库在删除前按精确名称核对，删除后残留计数为 0；共享 PostgreSQL `127.0.0.1:55432` 仍接受连接，未停止或改写 UI 保留的默认服务。没有提交、推送、部署、接真实供应商/网络/密钥/付费、购买服务器或创建云资源。
- `CURRENT.md` 更新为 v4-125，FIFO 057 与 `FRONT-M3-02D` 关闭，M3 S2/S2.1 正式完成；M3 冲刺和本地功能等价矩阵同步真实状态。下一阶段只开启 `PLAN-M3-03` 用户产品细化，不提前发布 UI、后端或前端任务。

## 2026-08-14 — UI 通过 FRONT-M3-02D Rev 4 正式 Wave B 完整领域终验

- 正式 React + Fastify 以独立数据库 `qimao_ui_front_m3_02d_rev4_20260814` 完成一次完整浏览器矩阵。项目中心实际覆盖 23 部匿名项目：服务端搜索、资格/项目状态、三类排序与分页；当前页选择、翻页/排序保留、成员变化清除、18 部显式全量选择和默认 23 部超过 20 上限；5 部混合确认实际为 `3 accepted / 2 blocked / 13 集 / 11 新建`，两类阻断原因与部分接受结果同屏。
- 创建响应未知使用“Fastify 已接收、响应返回前刷新”真实取证：页面重建后只显示原派发恢复入口，连续两次 `ASR_DISPATCH_NOT_FOUND / 404 / retryable=false / reload_asr`、关闭/重开仍保留同一 `dispatchGroupId`，第三次 GET 成功才清理；隔离计数为创建 POST 1、同一 ID GET 3。
- 员工中文识别任务实际覆盖 22 条匿名 Dispatch 的 `10 / 10 / 2` 服务端分页、搜索、接受/运行双筛选、行动优先/更新时间/创建时间排序、需对账/识别中/已取消、详情与质量/用量摘要。任务列表 503 显示原因、请求标识和唯一重读，加载中 `aria-busy` 与按钮禁用，恢复成功聚焦状态消息；空搜索保留唯一返回项目中心入口。
- 详情普通初始加载不抢焦点；人工重读稳定 503 后，pending 确定聚焦 drawer，关闭/重读禁用，Tab/Shift+Tab/Escape 不离开语境，真实成功后焦点落“关闭任务详情”。取消确定路径由 Fastify 成功后投影已取消；取消未知使用同源一次性响应丢失，正式 UI 锁定关闭和第二次 POST、聚焦唯一只读恢复，GET 同一 Dispatch 后进入 cancelled，取消 POST 计数为 1。
- 响应式实测：项目中心 1440 根 `1430/1430`、1024 展开 `1014/1014 + 表格 744/1080`、收起 `1014/1014 + 876/1080`；任务页 1440 根 `1440/1440`、1024 展开 `1024/1024 + 754/1120`、收起 `1024/1024 + 886/1120`。根页面均无横溢，表格横滚只在容器。最终控制台真实 `error/warn=0/0`；P0/P1/P2/P3=0。
- 证据追加到 `docs/ui/M3-asr-dispatch-acceptance.md` 第 9 节；10 张匿名截图保存在仓库外 `front-m3-02d-rev4`。没有修改生产前端、后端、迁移、共享契约或 DESIGN，没有运行完整 `pnpm check`、提交、推送或部署。
- 精确清理已完成：本轮 3002/3020/3021 服务停止，隔离数据库删除并核对残留 0，临时 seed/代理/Vite 配置、flag 与日志删除；他人 3001 和共享 PostgreSQL 55432 保持监听。`CURRENT.md` 从 v4-122 最小合并为 v4-123，任务保持 Rev 4 `review` 并转 `Current actor=规划对话`，FIFO 057 进入 `notification_pending`。状态已写回；正式唤醒随后只发送给规划总线。
- 唤醒已发送：规划固定对话已收到 FIFO 057 正式交接。送达/运行态已确认：`read_thread` 显示该消息位于规划最新 turn，目标状态为 `inProgress`；没有发送失败或重试。确认后 `CURRENT.md` 递增为 v4-124、FIFO 057 进入 `active`，UI 不再继续修改或自行运行规划关闭门。

## 2026-08-14 — UI 领取 FRONT-M3-02D Rev 4 正式 Wave B 领域终验

- 完整重读项目 `AGENTS.md`、`WORKFLOW.md` v4.2、`CURRENT.md` v4-121、`DESIGN.md` 5.5 Wave B、正式多剧 UI 验收、Dispatch 契约、开发日志顶部及 `AsrProjectDispatch`、`AsrDispatches` 和现行样式；使用 Impeccable audit 的 Operate 模式核对权威状态、键盘闭环、错误恢复、紧凑表格与响应式滚动归属。
- `CURRENT.md` 从 v4-121 最小合并为 v4-122；任务保持 Rev 4 `review / Current actor=UI 设计对话` 并明确进入执行。本轮只用正式 React + Fastify + 精确隔离匿名数据完成 Wave B 唯一一次完整浏览器矩阵；Rev 2 原型与 Wave A 证据冻结。
- 允许写入仅限 `docs/ui/M3-asr-dispatch-acceptance.md`、同步文件、开发日志和仓库外匿名证据。不得修改生产前后端、迁移、共享契约或 DESIGN，不运行完整 `pnpm check`，不接真实供应商、网络、密钥、付费、系统控制台或 OCR，不提交、推送或部署。

## 2026-08-14 — 规划通过 FRONT-M3-02D Rev 4 并路由正式 UI 终验

- 规划核对 `AsrProjectDispatch`、`AsrDispatches`、真实后端 `asrNotFound` 语义与两份 Rev 4 回归：未知创建的 recovery GET 不再根据错误状态清除句柄，连续两次真实 `ASR_DISPATCH_NOT_FOUND / 404 / retryable=false / reload_asr` 后仍保留同一 ID；关闭/重开、组件卸载/页面重建继续只 GET 原 ID，成功后才清理，创建 POST 严格 1 次。伪“确定不存在”分支和回归已删除。
- Dispatch 详情仅在本次人工重读意图存在且 fetching 时聚焦可编程 drawer；既有 pending handler 阻断 Tab/Shift+Tab/Escape，关闭按钮、遮罩和重复读取均受锁定。可控延迟回归直接覆盖 pending drawer 焦点、再次失败回唯一重读、成功回关闭按钮；普通初始加载和无错误后台刷新没有焦点意图。
- 规划新鲜运行多剧专项 2 文件 12/12、前端 TypeScript、Vite 生产构建 `155 modules transformed` 和 `git diff --check`，全部通过。按既定边界没有重复运行 Impeccable；同一根因的既有检测 `[]` 与本轮人工复核合并后，技术审计评分为 `18/20（Excellent）`，P0=0、P1=0，未新增 P2/P3。
- `CURRENT.md` 从 v4-119 更新为 v4-120；`FRONT-M3-02D` 保持 Rev 4 `review` 并转 `Current actor/Reviewer=UI 设计对话`。UI 只做本切片唯一一次正式 React 完整领域终验，不修改生产代码；完整 `pnpm check` 留 UI 通过后的规划关闭门。
- 状态已写回：`CURRENT.md` v4-120 与本日志登记规划通过结论、UI 终验范围和停止边界。唤醒已发送：规划只向 UI 固定对话 `019ff52d-d4a1-7440-81a2-fc9c1b0a0996` 发送正式终验消息，没有要求用户或前端传话。送达/运行态已确认：`read_thread` 显示该消息位于 UI 最新 turn，目标状态为 `inProgress`；未发生发送失败或重试。确认后 `CURRENT.md` 递增为 v4-121，FIFO 056 关闭，UI 终验继续异步执行。

## 2026-08-14 — FRONT-M3-02D Rev 4 真实 404 与详情重读焦点修正完成

- 未知创建恢复不再把 `404 && !retryable` 解释为“确定不存在”，也删除了相应伪契约提示；真实后端 `ASR_DISPATCH_NOT_FOUND / 404 / retryable=false / action=reload_asr` 连续两次返回后，会话级句柄仍保存原预生成 `dispatchGroupId`。关闭/重开、卸载并重建页面后继续只 GET 同一 ID，只有成功读取同一 Dispatch 才清理句柄，创建 POST 全程恒为 1 次。
- Dispatch 详情的人工重读意图进入 pending 后，由 DOM 提交阶段确定聚焦既有可编程 drawer；现有 pending 键盘处理继续阻止 Tab/Shift+Tab/Escape 逃逸，关闭、遮罩和重复读取均锁定。再次失败聚焦唯一重读按钮，成功聚焦既有关闭按钮；普通初始加载与无人工意图的后台刷新不触发该焦点路径。
- 回归删除“真实形态 404 清句柄”的伪契约用例，改用正式后端错误形态覆盖连续 GET、关闭/重开、卸载/刷新、同一 ID 和单次 POST；详情可控延迟回归直接覆盖 pending drawer 获焦、双向 Tab/Escape/遮罩锁定、防重复、再次失败和成功焦点。
- 新鲜验证结果：多剧专项 `ProjectCenter.test.tsx` 与 `AsrDispatches.test.tsx` 为 2 文件 12/12；前端 TypeScript 退出码 0；Vite 生产构建 `155 modules transformed`；`git diff --check` 退出码 0。按规划本轮不重复 Impeccable 定向扫描，不运行完整 `pnpm check`。
- 范围保持在两个多剧生产 TSX 与对应两个测试；未修改 CSS、后端、迁移、共享契约、`DESIGN.md` 或单剧 ASR，未提交、推送或部署。
- 状态已写回：`CURRENT.md` 从 v4-117 更新为 v4-118，任务转 `review / Current actor=规划对话`，登记 FIFO 056；送达证据确认后同步版本递增为 v4-119。唤醒已发送：只向规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c` 发送正式审核消息，没有直接通知 UI。送达/运行态已确认：`read_thread` 显示 FIFO 056 消息位于规划最新 turn，目标状态为 `inProgress`；没有发送失败或重试，FIFO 056 更新为 `active`，等待规划独立审核与统一路由。

## 2026-08-14 — 规划根因审计退回 FRONT-M3-02D Rev 4

- 规划独立复跑 Rev 3 多剧专项 2 文件 13/13、前端 TypeScript、Vite 生产构建 `155 modules transformed`、本轮唯一一次 Impeccable 定向检测 `[]` 和 `git diff --check`，全部通过。代码核对确认会话级创建句柄、关闭/重开/刷新只读恢复、取消未知态锁定、全集响应重验及四类人工恢复主体均已实现，改动范围没有越过两个多剧 TSX 与对应测试。
- 实现完整性 P1：真实后端 `asrNotFound('ASR_DISPATCH_NOT_FOUND', ...)` 固定返回 `404 / retryable=false / action=reload_asr`；前端恢复仓储却把 `404 && !retryable` 解释为“确定不存在”，清除会话句柄并重新开放创建。权威 `M3-asr-bulk-dispatch.md` 第 42 行明确任何暂时 404 都必须保留同一 `dispatchGroupId`，不得据此创建第二个 Dispatch；Rev 3 测试使用后端不存在的 `retryable=true 404` 证明保留，又用真实形态证明清理，因而测试与正式 API 语义相冲突。裁决不改后端：任何详情 404 都继续保留句柄和唯一 GET，只有成功读取同一 Dispatch 才自动清理。
- 可访问性 P1：Dispatch 详情错误块的重读按钮在 `detail.isFetching` 后被替换为禁用按钮，同时关闭按钮也禁用；现有 effects 没有在 pending 时聚焦 `detailPanel`。真实浏览器可能把焦点落到 `body`，此后 drawer 的 Tab/Escape handler 无法约束焦点。Rev 4 只在详情人工重读 pending 时聚焦可编程 drawer，并补可控延迟 DOM 回归；错误恢复仍回唯一重读，成功仍回关闭按钮。
- Impeccable 技术审计评分为 `16/20（Good）`：Accessibility 3、Performance 4、Responsive 4、Theming 3、Implementation Integrity 2；P0=0、P1=2、P2/P3 不新增。机械检测 `[]` 是正面证据，但不能覆盖跨前后端错误语义和真实动态焦点，故本轮不得送 UI。
- `CURRENT.md` 从 v4-115 更新为 v4-116，任务递增为 Rev 4 `ready / Current actor=前端开发对话`，FIFO 055 先保持 `notification_pending`。后端、迁移、共享契约、DESIGN、CSS、单剧 ASR及 Rev 3 其他通过项全部冻结。
- 状态已写回：`CURRENT.md` v4-116 与本日志登记两个根因和 Rev 4 停止边界。唤醒已发送：规划只向前端固定对话 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf` 发送正式 Rev 4 领取消息。送达/运行态已确认：`read_thread` 返回该消息位于最新 turn，状态为 `inProgress`；没有发送失败或重试。确认后 `CURRENT.md` 递增为 v4-117、任务记为执行中并关闭 FIFO 055。

## 2026-08-14 — FRONT-M3-02D Rev 3 多剧异步恢复收口完成并交规划

- 创建未知结果新增只保存预生成 `dispatchGroupId` 的会话级最小恢复句柄，不缓存项目集合、幂等键或业务状态；关闭/重开和页面刷新后都只允许 GET 同一资源，不扫描列表或再次创建。恢复成功与确定不存在分别清理句柄；回归覆盖关闭/重开、卸载后重建页面、临时 404 继续读取、确定 404 清理，以及创建 POST 恒为 1。
- 取消未知结果期间禁用“暂不取消”和确认动作，Escape/遮罩均不能关闭，焦点确定落到唯一“重新读取取消结果”；恢复中锁定重复激活，再次失败保留原因/请求标识和恢复焦点，读取到未应用状态仍只允许继续读取，确认取消已保存后聚焦既有成功状态消息，取消 POST 恒为 1。
- 显式“选择全部”改为受控 mutation：首次读取、稳定/再次失败、请求标识、唯一恢复、重复激活锁定和成功反馈均有确定 DOM 状态；响应返回后重新核验 `total <= 20`、条目数量等于 total、项目 ID 唯一，超限或集合不完整不形成伪全选。项目资格列表/批量确认、Dispatch 列表/详情四类人工读取同样补齐恢复中锁定、防重复、再次失败按钮焦点和成功后确定落点；普通初始成功与无错误后台刷新没有聚焦意图。
- 新鲜验证结果：多剧专项 `tests/frontend/ProjectCenter.test.tsx` 与 `tests/frontend/AsrDispatches.test.tsx` 为 2 文件 13/13；前端 TypeScript 退出码 0；Vite 生产构建 `155 modules transformed`；本轮唯一一次 Impeccable 定向检测返回 `[]`；`git diff --check` 退出码 0。按规划未运行完整 `pnpm check`。
- 范围保持在 `AsrProjectDispatch.tsx`、`AsrDispatches.tsx` 与对应两个测试文件，没有修改 CSS、后端、迁移、共享契约、`DESIGN.md` 或单剧 ASR，没有接真实供应商/网络/密钥/付费/系统控制台/OCR，没有提交、推送或部署。
- 状态已写回：`CURRENT.md` 从 v4-113 更新为 v4-114，任务转 `review / Current actor=规划对话`，登记 FIFO 055；送达证据确认后同步版本递增为 v4-115。唤醒已发送：只向规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c` 发送正式审核消息，没有直接通知 UI。送达/运行态已确认：`read_thread` 显示 FIFO 055 消息位于规划任务最新 turn，目标状态为 `inProgress`；没有发送失败或重试，FIFO 055 更新为 `active`，等待规划独立审核与统一路由。

## 2026-08-14 — 规划退回 FRONT-M3-02D Rev 3 一次性异步恢复收口

- 规划按 Impeccable audit 规则核对正式 `AsrProjectDispatch`、`AsrDispatches` 与两个现有前端回归。新鲜执行多剧专项 2 文件 8/8、前端 TypeScript、Vite 生产构建 `155 modules transformed`、Impeccable 定向检测 `[]` 和 `git diff --check` 全部通过；机械检测和既有测试证明当前主链路可构建，但不能覆盖后续动态状态缺口。
- 创建结果未知时，确认面板已允许在非 pending 阶段关闭；再次打开会清空 `createIntent`、未知状态和原 `dispatchGroupId`，下一次提交会生成新 ID/新幂等键并发送第二个创建 POST。取消结果未知同样可由“暂不取消”/Escape/遮罩关闭，`closeCancel` 会清空 `cancelIntent`，重新打开后可再次 POST。两者均违反已确认的“未知结果只读取同一资源、命令 POST 始终 1 次”，属于送 UI 前必须阻断的 P1。
- 同源审查还确认：全集选择使用裸 `async` 点击处理，没有提交中锁定、稳定失败/请求标识/唯一恢复、再次失败或恢复成功焦点，并且只在发请求前检查一次 20 部上限；项目资格列表/确认和 Dispatch 列表/详情的读取恢复也没有一致覆盖恢复中重复激活锁定、再次失败保留和成功后确定焦点。现有 8 项回归没有覆盖上述关闭/重开、竞态和恢复焦点场景。
- `CURRENT.md` 从 v4-111 更新为 v4-112，`FRONT-M3-02D` 递增为 Rev 3 `ready / Current actor=前端开发对话`。允许范围仅为两个多剧页面、对应两个回归文件及必要的现有模块样式；后端、迁移、共享契约、DESIGN、单剧 ASR、已通过视觉/响应式与业务状态冻结。
- 状态已写回：`CURRENT.md` v4-112 与本日志登记 Rev 3 范围，FIFO 054 先保持 `notification_pending`。唤醒已发送：规划向前端固定对话 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf` 发送正式 Rev 3 领取消息。送达/运行态已确认：`read_thread` 返回该消息位于最新 turn，状态为 `inProgress`；没有发送失败或重试。证据确认后 `CURRENT.md` 递增为 v4-113、任务记为执行中并关闭 FIFO 054。

## 2026-08-14 — 用户要求跨角色交接强制主动唤醒与送达确认

- 用户指出只写 `CURRENT` 而未主动唤醒接收对话会造成隐性等待，要求长期强制执行三段闭环：状态/日志先写回；只向规划总线或 `CURRENT` 指定接收对话发送正式唤醒；再用 `read_thread`/`wait_threads` 确认消息已出现且目标进入 `inProgress` 或明确回执。发送失败或未唤醒必须立即重试，不能要求用户传话。
- `AGENTS.md` 与 `docs/WORKFLOW.md` 已更新，协议从 v4.1 升为 v4.2；明确 Owner/Reviewer 负责唤醒规划，规划负责唤醒 Reviewer、返工 Owner和下一角色，FIFO 只有在送达/运行态确认后才能关闭。交接完成汇报必须分别写明“状态已写回、唤醒已发送、送达/运行态已确认”。
- `CURRENT.md` 从 v4-109 更新为 v4-110，并登记 FIFO 054 `active`。本次协议同步不修改生产代码、不重跑 `FRONT-M3-02D` 已有业务测试或构建；规划的代码与 Impeccable 审计继续进行。
- 状态已写回：`AGENTS.md`、`docs/WORKFLOW.md` v4.2、`CURRENT.md` v4-110 和本日志均已更新。唤醒已发送：规划分别向 UI、后端、前端三个固定对话发送“仅确认接收”的正式同步。送达/运行态已确认：`read_thread` 显示 UI 与后端目标任务均为 `inProgress`，前端任务已完成并明确回复“已接收 v4.2 并将执行”；三处均未修改业务文件或自选任务，未发生发送失败。本次送达证据写回后 `CURRENT.md` 递增为 v4-111。

## 2026-08-14 — FRONT-M3-02D Rev 2 多剧 Wave B 前端完成并交规划

- 新增独立 Wave B 前端模块：项目中心改为消费服务端资格搜索、资格/项目状态筛选、行动优先/更新时间/名称排序和分页，支持逐行、当前页、显式跨页全选及 20 部上限；批量确认重新读取服务端资格，分别展示提交前 canCreate/blocked 与提交后 accepted/blocked，不在浏览器复制门禁。既有项目查询仅补充回收所需 `version`，项目创建/回收成功会同步刷新资格投影。
- 每个新建派发意图只生成一次规范化项目集合、随机 `dispatchGroupId` 与幂等键。首次创建 POST 只发送一次；网络未知后只 GET 同一预生成 ID，临时 404 显示“派发尚未确认”并保留唯一重新读取，读取再次失败继续显示本次 GET 的原因和请求标识，不扫描列表或重发创建。成功结果展示后端持久化的首次创建 `requestId` 并获得确定焦点。
- 全局 AppShell 新增“作业 / 中文识别任务”正式入口。员工页消费 Dispatch 服务端搜索、acceptance/execution 双筛选、行动优先/更新时间/创建时间排序、分页、项目/质量/用量汇总和持久创建请求标识；详情保留 accepted/blocked、子批次事实和唯一项目级动作。取消确认覆盖初始安全焦点、pending 容器焦点与键盘锁定、确定失败同幂等键显式重试、未知结果只读详情恢复和成功状态聚焦。
- 定向行为回归 `tests/frontend/ProjectCenter.test.tsx` 与 `tests/frontend/AsrDispatches.test.tsx` 共 8/8，通过服务端查询、选择层级、创建 POST 恒为 1、404 再读、读取失败 requestId、恢复焦点、回收 pending、取消确定/未知结果、单次取消和同键重试。前端 TypeScript 退出码 0；Vite 生产构建 `155 modules transformed`；本轮唯一一次 Impeccable 定向检测返回 `[]`；`git diff --check` 退出码 0。
- 本轮未运行完整 `pnpm check`，留正式 UI 终验关闭门。未修改后端、迁移、共享契约、DESIGN 或已冻结的单剧 ASR；未接真实供应商、网络、密钥、付费、系统控制台或 OCR，未提交、推送或部署。`CURRENT.md` 从 v4-108 更新为 v4-109，任务转 `review / Current actor=规划对话`，只通知规划总线，不直接通知 UI。

## 2026-08-14 — 前端领取 FRONT-M3-02D Rev 2 并完成异步预检

- 重读项目协议 v4.1、`CURRENT.md` v4-107、S2.1 多剧契约、`DESIGN.md` 5.5 Wave B、正式 UI 验收、新共享 ASR 契约和开发日志顶部，确认 `BACK-M3-02F` 已关闭且唯一前端执行项为 `FRONT-M3-02D` Rev 2。
- 按 v4.1 对资格/列表/详情读取、创建和取消逐项预检加载、稳定失败、请求标识、唯一恢复、再次失败、恢复焦点和关闭恢复。创建意图固定一组规范化项目 ID、一个预生成 `dispatchGroupId` 和一个幂等键；未知响应后只读取该 ID，临时 404 继续显示尚未确认且不重发 POST。取消未知结果同样只重读详情，不重发取消命令。
- 项目中心 ASR 资格与选择只由服务端资格投影驱动；现有项目查询仅保留为回收操作补充契约缺少的 `version`，不成为第二套资格或派发状态。未发现新的上游契约冲突，单剧 ASR 行为继续冻结。
- `CURRENT.md` 从 v4-107 更新为 v4-108，任务转 `in_progress / Current actor=前端开发对话`。本轮不修改后端、迁移、共享契约或 DESIGN，不接真实供应商、网络、密钥、付费、系统控制台或 OCR，不运行完整 `pnpm check`。

## 2026-08-14 — 规划独立复验通过 BACK-M3-02F 并恢复多剧前端

- 规划核对共享 schema、增量迁移、路由/service、Dispatch 事务和回归：预生成 `dispatchGroupId` 被规范化并进入请求摘要；幂等键锁与资源 ID 锁按确定顺序获取；同键异 ID、同 ID 异键分别返回稳定冲突；首次创建 `requestId` 只在新建时写入，同键重放不覆盖；未创建 ID 的详情 GET 只返回 404，不写 Dispatch、命令或子结果。
- 规划新建精确隔离库 `qimao_plan_m302f_20260814`，从零成功应用全部 19 个迁移；新鲜运行 `tests/backend/asr.test.ts` 与 `tests/backend/asr-dispatch-rev2.test.ts` 为 2 文件 20/20，通过共享契约构建、后端生产构建、`check:repo` 和 `git diff --check`。测试同时证明一次 POST 后按已知 ID 恢复同一 Dispatch/子批次、列表/详情请求标识一致及响应不含幂等键。
- 本轮隔离库已精确删除并确认残留 0；默认 PostgreSQL 保持运行，规划未清理或停止默认库。后端提供的 7005 down→历史行→up 回填证据与迁移代码一致，本轮不机械重复完整 `pnpm check`。
- `CURRENT.md` 从 v4-106 更新为 v4-107，FIFO 053 与 `BACK-M3-02F` 关闭；`FRONT-M3-02D` 递增为 Rev 2 `ready / Current actor=前端开发对话`，只消费新契约完成多剧 Wave B，未知响应不得重发 POST 或扫描列表。完整质量门留正式 UI 终验关闭，不接真实供应商、密钥、付费、系统控制台或 OCR。

## 2026-08-14 — BACK-M3-02F Rev 1 Dispatch 已知 ID 恢复完成并交规划

- `CreateAsrDispatchGroupBody` 现在必填客户端预生成 UUID `dispatchGroupId`；仓储将规范化 ID、项目集合和 `allowPartial` 一起纳入请求摘要，并以该 ID 显式写入 PostgreSQL。创建同时按幂等键与资源 ID 取得确定顺序的事务级 advisory lock：同键异资源稳定返回 `ASR_DISPATCH_IDEMPOTENCY_KEY_REUSED`，同资源异键稳定返回 `ASR_DISPATCH_GROUP_ID_REUSED`，两者都不创建第二条 Dispatch、命令或项目子批次。
- 新增第 19 个迁移，为 `asr_dispatch_groups` 增加非空 `request_id`。新建只保存首次 Fastify `request.id`，同键重放只读取已有 Dispatch、不覆盖；Summary/Detail 统一返回该稳定标识，列表通过既有详情投影得到同一值。历史行使用 `legacy-dispatch:<dispatch-id>` 确定性回填并有非空/长度约束；普通响应、URL和读取契约不包含幂等键。
- 未增加任何恢复端点。预生成 ID 的既有详情 GET 在记录尚不存在时返回稳定 404 且不会创建 Dispatch、命令或子结果；等价响应丢失回归只发送一次创建 POST，随后按预生成 ID GET 恢复同一 Dispatch、子批次和首次 `requestId`。另覆盖列表/详情/刷新一致、同键重放不覆盖、两类冲突、缺少资源 ID 校验和幂等键不泄露。
- 首次从零迁移运行真实暴露 `node-pg-migrate` 单列 API 形态不兼容并回滚，本轮随即改用仓库既有 `addColumns` 形式；随后同一精确隔离空库成功从零应用全部 19 个迁移。新鲜执行 `tests/backend/asr.test.ts` 与 `tests/backend/asr-dispatch-rev2.test.ts` 共 20/20，共享契约构建、后端生产构建、`check:repo` 和 `git diff --check` 均通过。
- 在业务数据归零后，隔离库实际执行最新迁移 down，插入一条匿名历史 Dispatch，再 up；读取结果为 `legacy-dispatch:11111111-1111-4111-8111-111111111111` 且非空，迁移数恢复 19。随后删除匿名行，只删除本轮精确隔离库 `qimao_back_m302f_20260814` 并确认无残留；默认 PostgreSQL 保持运行，未清理默认业务数据。
- 本轮未运行完整 `pnpm check`，未修改生产前端或 DESIGN，未接真实供应商、SDK、网络、密钥、付费、系统控制台或 OCR，未重写资格、列表查询语义、调度、取消或单剧 ASR，未提交、推送或部署。`CURRENT.md` 从 v4-105 更新为 v4-106，任务转 `review / Current actor=规划对话`，登记 FIFO 053；只通知规划总线，不自行解锁前端。

## 2026-08-14 — 后端领取 BACK-M3-02F Rev 1 Dispatch 已知 ID 恢复修正

- 完整重读项目协议 v4.1、`CURRENT.md` v4-104、多剧 Dispatch 契约第 3/8 节、正式 DESIGN/UI 验收中的创建单请求与未知结果恢复规则，以及开发日志顶部；确认本轮只处理前端预生成资源 ID、首次服务端请求标识持久化和对应稳定冲突。
- `CURRENT.md` 更新为 v4-105，任务转 `in_progress / Current actor=后端开发对话`。允许范围仅为共享 ASR TypeBox、一个增量迁移、Dispatch 后端与对应后端测试；不改生产前端或 DESIGN，不新增列表猜测/幂等键恢复端点，不重写资格、查询、调度、取消或单剧 ASR，不接真实供应商、网络、密钥、付费、系统控制台或 OCR，不运行完整 `pnpm check`。

## 2026-08-14 — 规划确认 FIFO 052 并裁决 Dispatch 已知 ID 恢复

- 规划交叉核对 `DESIGN.md` 268、UI 验收 69/73/102/176、共享 `asr.ts`、正式路由、Dispatch 仓储和建表迁移，确认前端异议成立：当前创建成功前浏览器不知道 groupId，响应丢失后既不能按已有 GET 恢复，也不能刷新后显示首次创建请求标识；按列表猜测或重发 POST 均违反已确认权威来源/单次创建语义。
- 裁决采用创建前已知资源 ID：前端首次提交前生成一个随机 UUID `dispatchGroupId`，创建 body 携带该 ID，后端显式写入并纳入幂等摘要。未知响应后只对该 ID 调用既有详情 GET；暂时 404 继续保留同一意图和唯一重新读取，不扫描列表、不重发创建。该 UUID 只是资源标识，不成为浏览器业务状态。
- 后端同时持久化首次创建的服务端 `requestId`，列表/详情稳定返回且幂等重放不覆盖；幂等键不进入 URL、员工页面或响应。`M3-asr-bulk-dispatch.md` 已同步，UI 的视觉和请求计数语义不变。
- `CURRENT.md` 从 v4-103 更新为 v4-104，FIFO 052 关闭；新增 `BACK-M3-02F` Rev 1 `ready / Current actor=后端开发对话`，只补共享契约、一个增量迁移、Dispatch 后端与定向回归。`FRONT-M3-02D` 继续冻结等待后端规划复验，不要求用户传话。

## 2026-08-14 — FRONT-M3-02D Rev 1 编码前预检发现 Dispatch 未知结果恢复契约冲突

- 完整重读项目协议 v4.1、`CURRENT.md` v4-102、S2.1 多剧契约、`DESIGN.md` 5.5 Wave B、UI 完整验收记录、共享 ASR TypeBox、正式路由及开发日志顶部；按第 13 节先对资格读取、创建、任务读取和取消执行异步状态转换预检。本轮未修改生产前端或前端测试。
- 冲突类型：UI/交互与共享代码契约、未知结果权威恢复。已确认 UI 在 `M3-asr-dispatch-acceptance.md` 69/73/176 和 `DESIGN.md` 268 要求创建未知响应后保留同一意图，只通过“重新读取同一 Dispatch”恢复，创建 POST 计数保持 1，不得以刷新名义重发创建。
- 可复现证据：`POST /api/asr/dispatch-groups` 的 body 不接收客户端 groupId，只有 200/201 成功体返回 `AsrDispatchGroupDetail.id`；网络在服务端落库后、前端收到响应前中断时，浏览器没有 groupId。现有只读路由只有 `GET /api/asr/dispatch-groups/:groupId`，共享契约和路由没有按 `Idempotency-Key`/意图读取命令结果的端点。仓储确实保存 `idempotency_key → dispatch_group_id`，但该事实没有可供前端消费的契约。按项目集合、时间或列表扫描匹配会产生猜测和竞态；同键重发 POST 虽可幂等重放，但直接违反当前“创建请求仍为 1 次/不得重发创建”验收。
- 同源补充：UI 验收 102 行要求详情顶部持久显示请求标识，但 `AsrDispatchGroupSummary/Detail` 没有 requestId 字段；错误响应里的 Fastify requestId 只在该次错误可见，不能作为刷新后的 Dispatch 事实。影响范围为批量创建未知结果、刷新恢复、详情身份和首次送 UI 的完整异步矩阵；资格搜索、列表查询和取消端点本身未发现字段冲突。
- 最小建议：由后端新增按稳定幂等意图只读恢复同一 Dispatch 的共享契约/GET，并让详情返回可刷新恢复的请求标识；或由规划与 UI 明确把同键 POST 重放定义为恢复并修改“请求始终 1 次”的验收。前端不能在现有边界内自行选择。`CURRENT.md` 从 v4-102 更新为 v4-103，任务保持 Rev 1 并转 `blocked / Current actor=规划对话`，登记 FIFO 052；等待规划一次性裁决，不通知 UI，不提交、推送或部署。

## 2026-08-14 — 规划关闭单剧 ASR Wave A 并解锁多剧前端

- FIFO 051 的两处真实焦点复验均通过：preparation/hotwords 从真实 `503` 经唯一人工重读恢复后，各自关闭按钮获焦、焦点仍在 dialog 内且真实 Tab 不离开面板；P0/P1=0。规划接受结果并关闭 `FRONT-M3-02B` Rev 4，Rev 3 其余完整矩阵继续冻结。
- 规划使用精确隔离数据库 `qimao_plan_s21_close_20260814` 新鲜运行一次完整 `pnpm check`：18 个迁移成功，15 个测试文件 131 项全部通过，仓库检查、lint/typecheck、前端 150 模块生产构建、后端与共享契约构建全部通过。隔离数据库随后已删除。
- 规划执行 `pnpm run db:stop` 成功停止本地 PostgreSQL；紧随其后的状态命令以退出码 1 表示“未运行”，与停止后的预期状态一致，不属于质量失败。
- `CURRENT.md` 从 v4-101 更新为 v4-102，FIFO 051 关闭。当前关闭的是单剧 ASR / Wave A，而非整个 S2.1；`FRONT-M3-02D` Rev 1 已按 v4.1 同轮解锁，下一步只做项目中心多剧派发和员工中文识别任务列表/详情，不接真实供应商、密钥、付费、系统控制台或 OCR。

## 2026-08-14 — UI 通过 FRONT-M3-02B Rev 4 两处真实焦点复验并交规划

- preparation 与 hotwords 各经过两次真实 `503`（覆盖一次自动重试）稳定显示原请求失败；人工点击各自唯一重读后均只转发一次原查询并恢复成功。隔离代理最终计数两端点均为 `injected=2 / forwarded=1`。
- preparation 成功态焦点为“关闭新建批次”，hotwords 成功态焦点为“关闭本批次热词证据”；两处 `dialog.contains(document.activeElement)=true`，随后真实 Tab 操作仍留在各自面板语境。定向结论通过，P0/P1=0；Rev 3 其余请求、业务、视觉、响应式、控制台和完整矩阵继续冻结，未新增截图。
- 按协议 v4.1 微返工快车道只回传两处结论：`CURRENT.md` 从 v4-100 最小合并为 v4-101，任务保持 Rev 4 `review` 并转 `Current actor=规划对话`，登记 FIFO 051；不修改生产代码，不自行 done 或解锁多剧前端。
- 本轮 3000/3001/3002 隔离服务已按端口和命令行精确停止；隔离数据库 `qimao_ui_front_m3_02b_rev4_20260814`、本轮代理/夹具/运行目录均已删除并确认数据库残留为 0。共享 PostgreSQL `127.0.0.1:55432` 保持监听，未清理或停止他人资源。

## 2026-08-14 — 用户确认协作协议 v4.1 加速规则

- 规划复盘 S2.1 近期交接，区分必要的权威接口补齐与可提前发现的错误恢复/动态焦点缺口。用户确认在不降低 P0/P1、规划总线和完整切片质量门的前提下优化协作与对接。
- `docs/WORKFLOW.md` 升级为 v4.1：新增最多 2 文件且不改接口/迁移/业务状态/视觉方向的微返工快车道；首次送 UI 前强制覆盖异步加载、失败、请求标识、唯一恢复、重试中、再次失败、恢复成功焦点和关闭恢复；每切片只做一次完整正式浏览器矩阵，返工后只增量复验；原始失败经一次修复仍失败时停止第三个局部补丁并做根因审查。
- 阶段简报增加“按完整内部可用版计算的完成比例”，明确同步版本/FIFO 只是协作事件，不是产品版本；规划可提前写好下一任务的 blocked 输入，在当前切片通过和完整质量门关闭的同一次写回中自动解锁并通知。`AGENTS.md` 与 `CURRENT.md` 已同步，协议为 v4.1、同步版本为 v4-100。当前 UI 两处真实焦点复验继续运行，不扩大或重做范围。

## 2026-08-14 — UI 领取 FRONT-M3-02B Rev 4 两处真实焦点复验

- 重读项目协议、`CURRENT.md` v4-098、Rev 3 终验段与开发日志顶部，确认本轮唯一范围是 preparation/hotwords 两个真实 503 的恢复成功焦点闭环；Rev 3 其余请求、业务、视觉、响应式、控制台和完整矩阵证据全部冻结。
- `CURRENT.md` 更新为 v4-099，任务保持 Rev 4 `review / Current actor=UI 设计对话`。只允许更新 UI 验收记录、同步文件与仓库外匿名证据；不修改生产代码，不运行整套自动化，不通知前端或解锁多剧任务。

## 2026-08-14 — 规划通过 FRONT-M3-02B Rev 4 并只路由两处真实焦点复验

- FIFO 050 源码核对确认 `NewBatchPanel` 与热词 `EvidencePanel` 使用彼此独立的一次性恢复焦点意图：只有错误块人工重读置位；对应 query success、非 fetching 且面板仍挂载时由 `useLayoutEffect` 在 DOM 提交阶段聚焦既有关闭按钮并清除。普通初始 success、无错误后台刷新和质量/对账面板没有触发条件。
- 两条可控延迟回归从唯一重试按钮获焦开始，恢复后分别断言关闭按钮获焦和 dialog 包含 `document.activeElement`，同时保留原请求次数、热词不增加详情请求、请求标识和业务恢复断言。规划新鲜单剧专项 1 文件 12/12、TypeScript、Vite `150 modules transformed`、Impeccable 定向检测 `[]` 与 `git diff --check` 全部通过，未运行完整质量门。
- `CURRENT.md` 从 v4-097 更新为 v4-098，FIFO 050 关闭；`FRONT-M3-02B` 保持 Rev 4 `review` 并转 `Current actor/Reviewer=UI 设计对话`。UI 只复验两个真实 503 恢复成功焦点，不重跑 Rev 3 其他已通过矩阵；通过后由规划运行 S2.1 唯一完整 `pnpm check` 并决定多剧前端解锁，不要求用户传话。

## 2026-08-14 — FRONT-M3-02B Rev 4 恢复成功焦点闭环完成并交规划

- `NewBatchPanel` 与热词 `EvidencePanel` 分别使用一次性恢复焦点意图：只有错误块中的人工重读动作会置位；对应 query 成功、DOM 已提交且面板仍打开时才聚焦既有关闭按钮并立即清除。普通初始成功、无错误的后台刷新和质量/对账面板不会进入该路径，既有 API、查询键、自动重试、业务状态与视觉未改。
- 两条既有可控延迟 503 回归补齐真实焦点时序：重读前显式让唯一恢复按钮获焦，恢复后断言既有关闭按钮获焦且 dialog 包含 `document.activeElement`；原逐集准备请求 2 次、热词请求 2 次、批次详情请求不增加、原因/请求标识/唯一恢复动作和成功事实继续通过。
- 新鲜验证结果：单剧专项 1 文件 12/12，前端 TypeScript 退出码 0，Vite 生产构建 `150 modules transformed`，Impeccable 定向检测 `[]`，`git diff --check` 退出码 0。按规划未运行完整 `pnpm check`。
- `CURRENT.md` 从 v4-096 更新为 v4-097，任务保持 Rev 4 并转 `review / Current actor=规划对话`，登记 FIFO 050。生产与测试只修改 `AsrPanels.tsx`、`AsrWorkspace.test.tsx`；未改后端、迁移、共享契约、`DESIGN.md` 或其他 ASR 页面，未解锁 `FRONT-M3-02D`，未提交、推送或部署；只通知规划总线，不直接通知 UI。

## 2026-08-14 — 前端领取 FRONT-M3-02B Rev 4 恢复成功焦点返工

- 完整重读项目协议、`CURRENT.md` v4-095、ASR UI Rev 3 终验结论与开发日志顶部，确认 FIFO 049 只退回两个只读查询从 error 恢复 success 后的动态焦点 P1。
- `CURRENT.md` 更新为 v4-096，任务转 `in_progress / Current actor=前端开发对话`。本轮只修改 `AsrPanels.tsx` 与 `AsrWorkspace.test.tsx`，让本次面板确实经历错误后恢复成功时于 DOM 提交后聚焦既有关闭按钮，并补两条可控延迟焦点回归；不触碰 Rev 3 冻结项，不解锁多剧前端。

## 2026-08-14 — 规划确认 FRONT-M3-02B 恢复成功焦点 P1 并定向退回 Rev 4

- FIFO 049 按 Impeccable audit 规则核对 UI 的两个真实 503 恢复证据、验收第 9 节、正式 `NewBatchPanel/EvidencePanel` 和定向测试。UI 已证明原因、请求标识、唯一原查询恢复、业务成功、请求计数、1440/1024 与控制台均成立，P0/P2/P3 为 0；这些通过项继续冻结。
- 唯一 P1 成立：人工点击重试后，当前焦点所在按钮随 error 块在 success 提交时卸载；两个面板都只有首次挂载聚焦 effect，没有 error→success 后的确定落点。真实浏览器两处均为 `activeElement=body`、`dialog.contains(activeElement)=false`，现有自动化也没有焦点断言，因此静态检测和数据恢复成功不能推翻动态证据。
- `CURRENT.md` 从 v4-094 更新为 v4-095，FIFO 049 关闭，`FRONT-M3-02B` 递增为 Rev 4 `ready / Current actor=前端开发对话`。本轮只允许两个面板在本次经历 error 后恢复 success 的 DOM 提交阶段聚焦既有关闭按钮，并补两条可控延迟回归；不得对普通 success/后台刷新抢焦点，不改 API、查询键、自动重试、视觉、业务状态或其他已通过范围，不运行完整质量门，不解锁多剧前端。

## 2026-08-14 — UI 完成 FRONT-M3-02B Rev 3 正式终验并交规划裁决

- 正式 React + Fastify + 精确隔离 PostgreSQL 完成一次性矩阵。既有 12/12、TypeScript、150 模块构建、Impeccable `[]`、五态回执、取消/失败集重试/需对账及 Rev 1–2 证据按规划冻结；本轮真实补双门禁、服务端搜索/筛选/排序、1440/1024 两态、两个新增错误恢复和最终控制台。
- 逐集准备与批次热词各用两次真实 503 覆盖一次自动重试，稳定显示原因、请求标识和唯一恢复按钮；人工重读后每个端点只向后端转发 1 次原查询并恢复成功。代理最终计数均为 `injected=2 / forwarded=1`，控制台 `error/warn=0/0`。
- 完整矩阵为 P0=0、P1=1、P2=0、P3=0。唯一同源 P1：两处 query 从 error 恢复 success 后弹窗仍打开，但焦点都落到 `body`，`dialog.contains(activeElement)=false`，Tab 不能恢复弹窗语境；错误态初始焦点、业务恢复、滚动和视觉均通过。
- 新证据写入仓库外 `front-m3-02b-rev3-17` 至 `22` 六张截图；验收记录补充真实步骤、测量、代理计数、分级矩阵和最小建议。`CURRENT.md` 从 v4-093 更新为 v4-094，任务保持 Rev 3 `review`、`Current actor=规划对话`，登记 FIFO 049；未修改生产前端、后端、迁移、共享契约或 DESIGN，未运行完整 `pnpm check`，未解锁多剧前端。

## 2026-08-14 — UI 领取 FRONT-M3-02B Rev 3 正式页面一次性终验

- 完整重读项目协议、`CURRENT.md` v4-092、`DESIGN.md` 5.5、中文识别 UI 全验收记录与开发日志顶部，并按 Impeccable audit 流程确认本轮只做正式 React 单剧中文识别页领域终验。
- `CURRENT.md` 更新为 v4-093，任务保持 `review / Current actor=UI 设计对话`。规划已通过的 12/12、TypeScript、150 模块构建、Impeccable `[]`、差异检查及既有响应式/视觉证据冻结；本轮重点补逐集准备与批次热词两条真实 503→请求标识→唯一原查询重读→恢复证据，并一次性回传 P0/P1/P2/P3 矩阵。只允许更新 UI 验收记录、同步文件和仓库外匿名证据，不修改生产代码或解锁后续任务。

## 2026-08-14 — 规划通过 FRONT-M3-02B Rev 3 并路由 UI 一次性终验

- FIFO 048 源码核对确认返工严格限定 `AsrPanels.tsx` 与 `AsrWorkspace.test.tsx`：逐集准备错误使用既有 `AsrApiError.requestId` 与原 preparation `refetch`；批次热词错误使用同一错误对象与当前 `asr-batch-hotwords` query `refetch`，没有刷新批次详情或建立第二状态源。可控延迟回归覆盖初始加载、503、原因、请求标识、错误块内唯一恢复按钮和恢复成功。
- 规划新鲜执行单剧专项 1 文件 12/12、前端 TypeScript、Vite 生产构建 `150 modules transformed`、Impeccable 定向检测 `[]` 与 `git diff --check`，全部通过；没有运行完整 `pnpm check`。实现完整性结论为通过，本轮未发现新的 P0/P1，Rev 2 的权威读取、视觉与响应式证据继续冻结。
- `CURRENT.md` 从 v4-091 更新为 v4-092，FIFO 048 关闭；`FRONT-M3-02B` 保持 Rev 3 `review` 并转 `Current actor/Reviewer=UI 设计对话`，只做一次正式 React 页面终验。只有真实 P0/P1 可以退审，P2/P3 进入后置清单；UI 通过后由规划运行 S2.1 唯一完整质量门并决定多剧前端解锁，不要求用户传话。

## 2026-08-14 — FRONT-M3-02B Rev 3 只读入口错误恢复完成并交规划

- 逐集准备失败块继续显示后端原因和唯一“重新读取准备事实”，并在错误为 `AsrApiError` 且存在 `requestId` 时显示请求标识；恢复沿用工作台传入的原 preparation query `refetch`。
- 批次热词证据失败块显示标题、后端原因、既有请求标识与唯一“重新读取热词证据”；点击只调用当前 `asr-batch-hotwords` query 的 `refetch`，不刷新批次详情、不建立第二个请求或状态源。
- 新增两项可控延迟回归，直接覆盖初始加载、503 失败原因、请求标识、错误块内唯一恢复按钮、恢复后成功态；热词回归额外断言重试前后批次详情请求计数不变。单剧专项 `12/12`、前端 TypeScript、生产构建 `150 modules transformed` 与 `git diff --check` 均通过；按规划未运行完整 `pnpm check`。
- `CURRENT.md` 从 v4-090 更新为 v4-091，任务保持 Rev 3 并转 `review / Current actor=规划对话`，登记 FIFO 048。生产代码仅修改 `AsrPanels.tsx`，测试仅修改 `AsrWorkspace.test.tsx`；未改后端、迁移、共享契约、`DESIGN.md`、视觉或其他 ASR 页面，未解锁 `FRONT-M3-02D`，未提交、推送或部署；只通知规划总线，不直接通知 UI。

## 2026-08-14 — 前端领取 FRONT-M3-02B Rev 3 只读入口错误恢复收口

- 重读项目协议、`WORKFLOW.md` 12.1/12.2、`CURRENT.md` v4-089、ASR 验收第 9 节与日志顶部，确认 FIFO 047 已关闭，Rev 3 为唯一 `ready / Current actor=前端开发对话`。
- `CURRENT.md` 更新为 v4-090，任务转 `in_progress`。本轮只在 `AsrPanels.tsx` 与对应专项回归中补逐集准备和批次热词证据的错误原因、`AsrApiError.requestId` 与唯一原查询重读动作；Rev 2 的权威读取、成功/加载态、五态回执、marker、弱文字、1440/1024 与视觉全部冻结，不解锁多剧前端。

## 2026-08-14 — 规划审核 FRONT-M3-02B Rev 2 并定向收口新增入口错误恢复

- FIFO 047 代码核对确认 Rev 2 已删除前端历史批次扇出和本地全集搜索/排序，批次准备、服务端列表、批次绑定热词证据、Attempt 五态回执、稳定代码/数量/原因、形状 marker 与 `#747481` 弱文字均消费后端权威事实；既有 1440/1024、滚动与控制台证据不回开。
- 规划新鲜执行 `pnpm exec vitest run tests/frontend/AsrWorkspace.test.tsx --reporter=dot` 为 1 文件 10/10，前端 TypeScript 退出码 0，Vite 生产构建 `150 modules transformed`。这些通过项冻结；完整 `pnpm check` 仍留 S2.1 关闭门。
- 送 UI 前按冻结验收矩阵发现两个同源 P1 恢复缺口：`/batch-preparation` 失败块已有原因与“重新读取准备事实”，但没有显示既有 `AsrApiError.requestId`；“本批次热词证据”失败块只有错误原因，没有请求标识或唯一重新读取动作。两处均违反“错误同时显示原因、请求标识和唯一恢复动作”，且真实网络失败后员工无法恢复热词侧栏。
- `CURRENT.md` 从 v4-088 更新为 v4-089，FIFO 047 关闭，`FRONT-M3-02B` 递增为 Rev 3 `ready / Current actor=前端开发对话`。只允许修改 `AsrPanels.tsx` 和对应回归，复用现有错误对象与 query `refetch`；不改后端、迁移、共享契约、DESIGN、视觉或其他通过行为，不运行完整质量门，不解锁多剧前端，完成后只回规划总线。

## 2026-08-14 — FRONT-M3-02B Rev 2 单剧权威投影收口完成并交规划

- 正式新建面板改读 `GET /asr/batch-preparation` 的逐集可执行/可复用/阻断事实，强制新识别由服务端重新计算；删除按历史批次详情扇出的客户端复用推断。历史批次把编号搜索、状态、行动优先/更新时间排序、20 条分页和真实总数全部提交给服务端，并在筛选切换时保留上一投影避免整页加载闪烁。
- “本批次热词”改读批次绑定证据，展示保存的术语版本、投影版本、摘要、纳入/过滤/截断数量、纳入示例及带稳定原因码的省略条目；Attempt 五态回执显示稳定代码、提交/省略数量和原因，缺失事实不猜成 0。回执与批次状态均使用中文文字、语义色和形状 marker，弱文字变量对齐 `#747481`；没有显示管理员入口或内部边界说明。
- 新鲜验证：单剧专项 `10/10`；全部前端 `6` 文件 `55/55`；前端 TypeScript 退出码 0；生产构建 `150 modules transformed`；Impeccable 定向检测 `[]`；`git diff --check` 退出码 0。未运行完整 `pnpm check`，按规划留给 S2.1 关闭门。
- 真实页面使用正式 React + Fastify + PostgreSQL：1440 展开态根页面 `1440/1440`；1024×768 侧栏展开/收起两态根页面均 `1014/1014`，批次表分别在 `744→1120` 与 `876→1120` 的自身 `overflow-x:auto` 容器横滚；批次绑定热词侧栏读取保存版本/摘要/纳入数量，弱文字实测 `#747481`，控制台 `error/warn=0/0`。临时前后端服务已停止，既有 PostgreSQL 保持运行。
- `CURRENT.md` 从 v4-087 更新为 v4-088，任务保持 Rev 2 并转 `review / Current actor=规划对话`，登记 FIFO 047。未修改后端、迁移、共享契约或 `DESIGN.md`，未进入多剧 Dispatch、真实供应商/API/密钥、管理员入口、字幕编辑、播放器或 S3，未提交、推送或部署；只通知规划总线，不直接通知 UI 或解锁多剧前端。

## 2026-08-14 — 前端领取 FRONT-M3-02B Rev 2 单剧权威投影收口

- 完整重读项目协议、`CURRENT.md` v4-086、S2 ASR 契约、`DESIGN.md` 5.5、UI 验收与日志顶部，确认 `BACK-M3-02E` 已通过 FIFO 046 独立复验，Rev 2 为唯一 `ready / Current actor=前端开发对话`。
- `CURRENT.md` 更新为 v4-087，任务转 `in_progress`。本轮冻结 Rev 1 已通过的创建/取消/失败集重试/需对账、刷新恢复、键盘、1440/1024 和主视觉，只消费批次准备、服务端批次查询、批次绑定热词证据及 Attempt 回执事实，并收口弱文字和状态 marker；不改后端、迁移、共享契约或 `DESIGN.md`，不进入多剧 Dispatch、真实供应商/API/密钥、管理员入口、字幕编辑、播放器或 S3。

## 2026-08-14 — 规划独立复验通过 BACK-M3-02E Rev 1

- FIFO 046 代码核对确认四项交付均使用后端唯一事实：历史热词入口按批次保存的 provider/adapter/model/language/configDigest、能力快照和投影版本重建并核对摘要，返回纳入与省略条目；Attempt 回执事实持久化提交数/省略数/稳定原因，Worker 校验数量与实际 payload 及五态语义；批次编号搜索、状态、行动优先/更新时间排序在数据库分页前执行并以独立 total 支持空页；批次准备一次返回 1–100 集可执行/可复用/阻断事实，复用结果使用单次 `unnest` 集合查询。
- 第一次隔离复验成功应用 18 个迁移，但规划附加诊断误查不存在的 `pgmigrations` 表，在业务测试开始前退出；该临时库已按精确名称删除，未把本次运行冒充通过。随后创建新的 `qimao_plan_fifo046_20260814132729`，使用正确 `schema_migrations` 确认 18 项迁移，新鲜 ASR 两文件 18/18、共享契约构建、后端构建、`check:repo` 和 `git diff --check` 全部通过；结束后只删除该临时库，默认库未清理或停止。
- 回归覆盖批次保存适配器与能力证据、规则过滤/截断原因、跨项目 404、部分提交回执刷新、100 集单次查询、逐集准备的复用/执行/阻断与强制新识别、跨项目术语 422，以及服务端搜索、行动排序、状态筛选、更新时间和空页真实总数。未发现新的 P0/P1。
- `CURRENT.md` 从 v4-085 更新为 v4-086，FIFO 046 与 `BACK-M3-02E` 关闭；`FRONT-M3-02B` 递增为 Rev 2 并解锁，只消费新权威接口和完成既定三个前端收尾，多剧前端继续阻塞。完整 `pnpm check` 仍留 S2.1 关闭门；未接真实供应商、网络、密钥、付费或云资源，未提交、推送或部署。

## 2026-08-14 — BACK-M3-02E Rev 1 单剧权威投影完成并交规划

- 共享 ASR 契约和正式只读 API 已补齐批次绑定热词证据、Attempt 回执事实与批次准备投影。历史批次热词严格使用批次保存的 `provider/adapter/model/language/configDigest`、能力快照和投影版本重建，并核对保存摘要；返回稳定纳入条目和规则过滤、去重、适配器不支持/条数/字符限制的省略条目，不使用读取时当前默认适配器替代历史事实。
- Attempt 新增实际 `submittedCount / omittedCount / reasonCode` 持久化；Worker 在写入前校验五态回执与实际 payload 数量一致，刷新可恢复完整提交、部分提交、不支持与未知事实。员工读取仍不返回对象键、密钥或实际媒体内容。
- 单剧批次列表在数据库分页前支持批次编号搜索、状态筛选、行动优先/更新时间排序，并通过独立总数投影保证 offset 空页仍返回真实 total；保留未指定排序时原创建时间顺序。批次准备 API 一次返回 1–100 集可执行、可复用和阻断事实，显式新识别语义通过 HTTP 布尔查询规范化；全部历史可复用结果只做一次 `unnest` 集合查询。
- 使用精确命名隔离数据库 `qimao_back_m302e_20260814` 从空库应用全部 18 个迁移；新鲜执行 `tests/backend/asr.test.ts` 与 `tests/backend/asr-dispatch-rev2.test.ts` 共 18/18，通过共享契约构建、后端生产构建、`check:repo` 和 `git diff --check`。测试结束时 projects/asr_batches/asr_attempts 均为 0，只删除该隔离库并确认无残留；默认 PostgreSQL 保持运行，未查询或清理默认业务数据。
- 本轮未运行完整 `pnpm check`，未修改生产前端或 `DESIGN.md`，未接真实供应商、SDK、网络、密钥、付费、管理员 API、OCR、S3 或通用任务中心，未提交、推送或部署。`CURRENT.md` 从 v4-084 更新为 v4-085，任务转 `review / Current actor=规划对话`，登记 FIFO 046；只通知规划总线，不自行解锁前端。

## 2026-08-14 — 后端领取 BACK-M3-02E Rev 1 单剧权威投影收口

- 完整重读项目协议、`CURRENT.md` v4-083、`M3-asr-batch.md` 最新单剧流程/热词/页面/API 语义与开发日志顶部，确认任务只补批次绑定热词证据、Attempt 回执事实、服务端批次全集查询和一次性逐集准备投影。
- `CURRENT.md` 更新为 v4-084，任务转为 `in_progress`。本轮允许修改共享 ASR TypeBox、必要持久化、后端 ASR API/仓储和后端测试，并只在精确隔离数据库验证；不修改生产前端或 `DESIGN.md`，不接真实供应商、SDK、网络、密钥、付费、管理员 API、OCR、S3 或通用任务中心，不运行完整 `pnpm check`。

## 2026-08-14 — 规划独立复验通过 BACK-M3-02D Rev 3

- FIFO 045 首次在默认本地数据库复跑 ASR 两文件时，16 项都在 `beforeEach/afterAll` 的全局项目清理阶段被既有匿名 `term_decision_events → term_drafts` RESTRICT 外键阻断，没有进入业务断言；后端构建、`check:repo` 与差异检查通过。规划没有删除默认库记录，也没有把该次运行误记为业务失败或通过。
- 改用本轮创建且名称经过正则校验的隔离临时数据库，从空库成功应用全部 17 个迁移；新鲜 `tests/backend/asr.test.ts + asr-dispatch-rev2.test.ts` 为 2 文件 16/16。结束后只删除本轮创建的 `qimao_plan_fifo045_20260814130042`，默认 `qimao_terms_cloud` 未查询、修改或清理。
- 代码核对确认三项定向修正：Dispatch 详情/摘要的 `totalEpisodes/newJobs/reusableResults` 只对 `acceptanceStatus=accepted` 归并；100 集复用资格通过一次 `unnest` 集合查询；资格与 Dispatch 列表使用独立 filtered total 投影，offset 空页仍返回真实总数。Rev 2 的状态分层、服务端筛选、取消幂等和 4/1 调度未重写。
- 为消除并行验收互相污染，`docs/WORKFLOW.md` 第 13 节新增 S2.1 试运行规则：数据库规划复验和质量门默认使用精确命名隔离库，禁止为了测试清空或停止另一角色的默认库。`CURRENT.md` 从 v4-082 更新为 v4-083，FIFO 045 与 `BACK-M3-02D` Rev 3 关闭，`BACK-M3-02E` 解锁给后端；多剧前端仍等待单剧共享组件稳定。未运行完整 `pnpm check`，未接真实供应商、网络、密钥、付费或云资源，未提交、推送或部署。

## 2026-08-14 — 规划审核通过 UI-M3-02D Rev 2

- 按 FIFO 044 复核 `DESIGN.md` Wave B、`docs/ui/M3-asr-dispatch-acceptance.md` Rev 2、仓库外原型和证据 12–16。人工核图与 DOM/脚本事实一致：`DSP-0814-026` 详情只含匿名项目甲/丙/丁，共 92 集、88 新建/4 复用、46/92 已形成或复用，被阻断项目乙不进入子批次。
- 代码核对确认创建和派发取消在 pending 时由容器获得焦点，按钮禁用，Escape/遮罩/关闭和重复激活均不会关闭或发送第二次请求；确定失败恢复安全焦点，未知创建只重新读取同一意图；取消成功只把匿名项目丙投影为取消请求中，匿名项目甲完成、匿名项目丁需对账、既有结果和历史用量均保留。搜索/资格/项目状态改变成员集合时清选，纯排序/翻页保留显式全量选择。
- 新鲜执行原型 `node --check` 通过；Impeccable detector 返回 `[]`，但 HTML 解析依赖缺失而降级为 regex，只作辅助；授权文档 `git diff --check` 无错误。完整矩阵未发现 P0/P1，Rev 1 已冻结布局、视觉、1440/1024 与滚动证据无需重做。
- `CURRENT.md` 从 v4-081 更新为 v4-082，FIFO 044 关闭，`UI-M3-02D` Rev 2 标记 `done`，FIFO 045 进入 active。未修改生产前后端、迁移或共享契约，未解锁多剧前端，未接真实供应商、网络、密钥、付费或云资源，未提交、推送或部署。

## 2026-08-14 — 规划完成 FIFO 043 单剧 ASR 前端冲突审查

- 规划独立交叉核对 `FRONT-M3-02B` 正式实现、共享 `asr.ts`、`DESIGN.md` 与 `M3-asr-acceptance.md`，并新鲜复跑 `tests/frontend/AsrWorkspace.test.tsx` 8/8。确认三项上游冲突均成立：批次列表固定读取 `limit=100` 后在浏览器按编号搜索/行动优先重排；逐集复用通过 `useQueries` 扫描当前页历史批次详情；热词预览只提供纳入项与省略计数，且入口按读取时当前默认适配器而不是历史批次保存身份重建，Attempt 也没有提交/省略数量和原因。
- 裁决保持正式 UI，不把缺口降级给前端猜测。更新 `docs/contracts/M3-asr-batch.md`，固化一次性逐集准备投影、批次编号服务端全集搜索与行动优先/更新时间排序、按批次保存的适配器身份/能力快照重建热词纳入与省略证据，以及可刷新恢复的 Attempt 厂商中立回执事实；新增 `BACK-M3-02E`，等待当前后端 Rev 3 审核关闭后一次实现。
- 同轮完成 Impeccable 有界审计：机械 detector 为 `[]`，但人工代码核对确认三个纯前端收尾——全局 `--text-muted: #777785` 的小字对比度弱于冻结设计值 `#747481`、热词回执标签缺少现有状态形状 marker 子元素、五态回执正文没有按状态显示提交/省略/原因事实。三项并入 `FRONT-M3-02B` 下一轮，不单独制造 UI 往返；已通过的主链路、1440/1024、创建/取消/重试和键盘证据冻结。
- `CURRENT.md` 从 v4-080 更新为 v4-081：FIFO 043 关闭，FIFO 044 进入 active；随后到达的 `BACK-M3-02D` Rev 3 登记 FIFO 045，不插队。未修改生产前后端、迁移或共享代码契约，未接真实供应商、网络、密钥、付费或云资源，未提交、推送或部署。

## 2026-08-14 — BACK-M3-02D Rev 3 最小查询与汇总返工完成并交规划

- Dispatch 详情、列表摘要与刷新恢复现在只以 `acceptanceStatus=accepted` 项目汇总 `totalEpisodes/newJobs/reusableResults`；blocked 项目仍进入 selected/blocked 和逐项目结果，但即使自身已有集数也不再污染 accepted 集合。Rev 2 的接受/执行状态、取消幂等、服务端筛选排序和公平调度未重写。
- `evaluateWithClient` 把每个 ready episode 的 `asr_results` 往返改为一次 `unnest` 集合查询；新增 100 集匿名回归直接计数该 SQL 只执行一次，没有放宽测试超时。资格和 Dispatch 列表改用同一 filtered CTE 的独立总数投影，即使 offset 落在空页，仍返回筛选后的真实 `total` 和空 `items`。
- 最终使用精确命名的隔离 PostgreSQL 从空库应用全部 17 个迁移，`tests/backend/asr.test.ts` 与 `tests/backend/asr-dispatch-rev2.test.ts` 共 16/16，通过后端生产构建、`check:repo` 与 `git diff --check`；隔离临时库查询为空，无残留。验证开始时本地实例实际未监听，后端只启动既有项目 PostgreSQL 以运行隔离库并保持其运行，未查询、修改或清理默认 `qimao_terms_cloud` 数据。
- 本轮业务修改只涉及 ASR 资格/Dispatch 仓储和对应后端测试；未修改共享契约、迁移、生产前端或 `DESIGN.md`，未接真实供应商、网络、密钥、付费、管理员 API、OCR 或通用任务中心，未提交、推送或部署。完整 `pnpm check` 按边界留给 S2.1 关闭门。`CURRENT.md` 在 UI v4-079 上最小合并为 v4-080，任务转 `review / Current actor=规划对话`，只通知规划总线，不自行解锁 `FRONT-M3-02D`。

## 2026-08-14 — UI-M3-02D Rev 2 派发定向收口完成并交规划

- Rev 1 已通过的信息架构、项目/任务页布局、7→18 选择、视觉、1440/1024、滚动归属和不受影响证据保持冻结。`DESIGN.md` 与 `docs/ui/M3-asr-dispatch-acceptance.md` 已明确成员集合变化和纯观察变化的选择语义、创建提交容器锁定、未知/确定失败恢复，以及只取消可取消未终结子批次的影响确认与反馈。
- 仓库外原型把 `DSP-0814-026` 统一为 accepted 匿名项目甲/丙/丁，合计 92 集、88 新建/4 复用、已形成或复用 46/92；blocked 匿名项目乙不再进入详情。新增 `12–16` 五张 1440 定向证据，旧 `05` 只在错误详情数据上被 `12` 取代，其余冻结证据不重做。
- 真实浏览器动态验证创建和取消 pending 均由容器获得焦点、双向 Tab 不离开、Escape/遮罩/关闭/重复激活受阻且请求计数保持 1；创建确定失败保留 7 部集合并恢复安全取消，未知结果只重新读取同一意图；取消确定失败保留甲/丙/丁原事实，成功仅把丙投影为取消请求中并聚焦 `role=status`，甲完成、丁需对账及历史用量保留。排序/翻页保留 18 部，搜索/资格/项目状态变化清选并播报。
- 最终 `node --check app.js`、授权文档与同步文件 `git diff --check` 通过；Impeccable detector 返回 `[]`，但 HTML 解析模块缺失而降级为 regex，只作辅助。未修改生产 React、后端、迁移或共享契约，未扩展 OCR、上传、通用任务中心、系统控制台或真实供应商，未提交、推送或部署。`CURRENT.md` 在并行前端最新 v4-078 上最小合并为 v4-079，登记 FIFO 044，任务转 `review / Current actor=规划对话`，只通知规划总线。

## 2026-08-14 — FRONT-M3-02B Rev 1 完成审查发现权威接口冲突并交规划

- 正式 React 单剧中文识别页已实现项目路由、素材与术语双门禁、整剧/选中集/单集创建、批次/逐集权威状态、取消、仅失败集重试、需对账、刷新恢复、未知结果同幂等键重放、键盘焦点和 1440/1024 响应式；员工页已省略内部边界说明与管理员入口，未进入多项目 Dispatch、真实供应商/API/密钥、OCR、字幕正文、播放器或 S3 前置审改。
- 新鲜验证通过：`tests/frontend/AsrWorkspace.test.tsx` 8/8、全部前端 6 文件 53/53、前端 TypeScript、Vite 生产构建 150 模块、Impeccable 定向检测 `[]`；独立完成审查确认页面结构、范围边界和 1024 响应式通过，但结论为 `revise`。完整 `pnpm check` 按任务边界未运行。
- 真实页面通过本地公共 API 创建排队批次并刷新恢复。1440×900 根页面 `1440/1440`，侧栏 204px；1024×768 展开/收起根页面均 `1014/1014`，批次表分别 `744/1120`、`876/1120`，横滚仅在表格容器；540px 新建侧栏不推动根页面。打开聚焦关闭、Shift+Tab 闭环、Escape 关闭并恢复触发按钮，控制台 `error/warn=0/0`。
- 冲突 1：`AsrHotwordPreviewSchema` 只提供实际纳入 `entries`、过滤/截断计数和 adapter 能力，不提供 UI Rev 2 明确要求的被过滤/截断具体条目及逐项原因；Attempt 回执也没有省略原因字段。前端不能读取后端内部规则或凭计数猜原因。
- 冲突 2：`AsrBatchListQuerySchema` 只有 `status / sortBy(createdAt|status) / sortDirection / limit / offset`，正式仓储也仅按创建时间或状态排序，没有批次编号搜索或行动优先排序。当前前端先取最多 100 条再搜索/重排不能证明全集，继续扩大客户端拉取会违反服务端分页与权威查询边界。
- 冲突 3：新建面板要求逐集显示“可执行/可复用”，但单项目现有接口只通过逐批次详情暴露 `job.reusedResult/currentResult`；资格接口只有聚合 `reusableResultCount`，没有逐集资格投影。前端若扫描历史批次详情会造成请求数随历史批次线性增长，且仍可能遗漏分页外结果。
- 按专业异议与规划总线协议，`CURRENT.md` 从并行后端最新 v4-077 最小合并为 v4-078，登记 FIFO 043，任务转 `blocked / Current actor=规划对话`。现有前端实现与通过证据冻结；等待规划裁决补共享契约/后端投影，或调整 UI 验收。验收服务和本地 PostgreSQL 已停止，3000/3001 端口已释放；未提交、推送或部署。

## 2026-08-14 — 后端领取 BACK-M3-02D Rev 3 最小查询与汇总返工

- 完整重读项目协议、`CURRENT.md` v4-076、S2.1 批量派发契约、`DESIGN.md` 5.5 Wave B、Dispatch UI 验收与日志顶部，确认 Rev 2 的状态分层、服务端筛选排序、最近批次、取消幂等、17 个迁移和 4/1 调度全部冻结。
- `CURRENT.md` 更新为 v4-077，任务转为 `in_progress`。本轮只在 ASR 资格/Dispatch 仓储与对应后端测试内修正 accepted 汇总、集合化可复用结果查询和空页真实 total；不修改共享契约、迁移、生产前端或 `DESIGN.md`，不停止默认 PostgreSQL、不清理前端数据，不接真实供应商、网络、密钥、付费、管理员 API、OCR 或通用任务中心。

## 2026-08-14 — 规划复验 BACK-M3-02D Rev 2 并合并最后三项服务端缺口

- 规划使用精确命名的隔离 PostgreSQL 数据库从空库应用全部 17 个迁移，并独立运行 `tests/backend/asr.test.ts` 与 `tests/backend/asr-dispatch-rev2.test.ts` 15/15、共享契约构建、后端生产构建、`check:repo` 与 `git diff --check`，全部通过。隔离库已删除；并行前端正在使用的默认 PostgreSQL 仍在运行，未停止服务、未清理其项目数据。
- 代码与 UI 唯一事实交叉审查确认 Rev 2 主链路成立，但发现一个 P1 汇总错误：`AsrDispatchRepository.load` 的总集数、新任务和可复用结果对全部 selected 结果求和，会把 `blocked` 项目混入 accepted 摘要，直接违反同一 Dispatch 的列表、详情和 92 集示例只能引用 accepted 集合的规则。
- 同时一次性登记两个送生产前端前的查询质量缺口：资格读取仍在每个项目内按每个就绪集数逐条查询可复用结果，项目中心查询上限 100 部、单剧上限 100 集时会产生线性数据库往返；资格与 Dispatch 列表使用窗口计数附着当前页，offset 落到空页时会把真实总数误报为 0。
- `CURRENT.md` 更新为 v4-076，FIFO 042 关闭并把同一任务合并为 Rev 3 `ready / Current actor=后端开发对话`。本轮只修 accepted 聚合、集合化可复用查询和空页 total，并补三类回归；Rev 2 的状态分层、筛选排序、取消幂等、迁移与调度全部冻结。单剧前端和 UI Rev 2 继续并行，`FRONT-M3-02D` 保持 blocked；未接真实 API、密钥、付费、服务器或云资源，未提交、推送或部署。

## 2026-08-14 — BACK-M3-02D Rev 2 Wave B 后端完成并交规划

- 共享 TypeBox 与 PostgreSQL 权威读取已将创建时的 `acceptanceStatus=accepted/partial/blocked` 和子批次事实派生的 `executionStatus` 分开；零 accepted 返回 `null`。项目中心新增服务端资格搜索、资格/工作流/生命周期筛选、行动优先/更新时间/名称排序、数据库分页和最近批次投影；Dispatch 列表新增搜索、双状态筛选、行动优先/有效更新时间排序，以及完成项目、质量和处理用量/待对账汇总。
- 新增持久化派发取消幂等命令。同键重放恢复同一结果，同键异组稳定冲突；取消只调用既有单批次领域命令处理 accepted 且 queued/running/cancel_requested 的未终结子批次，已完成、失败、需对账或已取消结果及历史用量不删除。接受后 queued→running/completed、部分完成与需对账等状态均由当前子批次事实派生，刷新不建立第二套状态源。
- 新增匿名高价值回归，覆盖项目中心服务端筛选/搜索/排序/跨分页与最近批次、接受结果在执行迁移中保持不变、完成/部分/需对账汇总、Dispatch 搜索/筛选/排序、取消重放与异参冲突、已完成结果/用量保护及刷新恢复。隔离临时 PostgreSQL 从空库成功应用全部 17 个迁移；`tests/backend/asr.test.ts` 与 `tests/backend/asr-dispatch-rev2.test.ts` 共 15/15，通过共享契约构建、后端生产构建、`check:repo` 和 `git diff --check`。完整 `pnpm check` 按任务边界留给 S2.1 关闭门。
- 两个精确命名的隔离临时数据库均已删除；并行 `FRONT-M3-02B` 正在使用的默认本地 PostgreSQL 与开发服务保持运行，后端未停止服务、未清理其项目数据。未修改生产前端或 `DESIGN.md`，未接真实供应商、网络、密钥、付费或云资源，未实现管理员网站/API、OCR 或通用任务中心，未提交、推送或部署。`CURRENT.md` 在 UI v4-074 上最小合并为 v4-075，任务转 `review / Current actor=规划对话`，只通知规划总线。

## 2026-08-14 — UI 领取 UI-M3-02D Rev 2 派发交互定向收口

- 完整重读项目协议、`CURRENT.md` v4-073、批量派发契约、`DESIGN.md` 5.5、Wave B UI 验收与开发日志顶部，并按 Impeccable harden 流程核对高风险提交、失败恢复、取消确认和跨页选择语义。
- `CURRENT.md` 更新为 v4-074，任务转为 `in_progress`。Rev 1 信息架构、7→18 选择、视觉、1440/1024、滚动归属及不受影响证据冻结；本轮只统一 `DSP-0814-026` 权威事实，补批量创建提交锁定、派发取消确认与成员集合变化时的选择清理，不修改生产前后端、迁移或共享契约。

## 2026-08-14 — 规划审核 UI-M3-02D Rev 1 并定向收口派发事实与高风险提交

- 规划按 Impeccable `audit` 规则重读产品/设计上下文、完整 UI 验收文档、原型 HTML/CSS/JS 和 11 张匿名证据。项目中心服务端资格表达、逐行/当前页/显式跨页全选、7→18 动态摘要、阻断项目保留、部分接受与运行状态分层、专用中文识别任务列表、1440/1024 侧栏两态、表格滚动归属和员工页禁用管理信息整体成立；原型 `node --check` 通过。Impeccable 检测因缺少 HTML 解析依赖降级为 regex，结果只作辅助而未冒充完整无缺陷证明。
- 同一 Dispatch 证据存在 P1 事实漂移：`DSP-0814-026` 的部分接受结果明确接受甲/丙/丁、阻断乙，但详情改为甲/乙/丁；由此接受项目总集数应为 92 却显示 83，新建/复用和项目行也随之错误。该问题会让员工进入不属于本次派发的子批次，违反 PostgreSQL 唯一状态源和不可变逐项目结果。
- 高风险动作还有两项 P1：批量创建的定时模拟在提交中仍允许 Escape/遮罩关闭，随后结果侧栏会再次弹出，不能证明真实付费请求只发送一次；“取消未终结项目”只有说明播报，没有影响范围确认、提交中锁定、失败恢复和成功反馈。跨页全选失效规则也需从单一资格筛选明确扩展到搜索、资格和项目状态等会改变成员集合的服务端查询，纯排序/翻页不得静默改写集合。
- `CURRENT.md` 从 v4-072 更新为 v4-073，FIFO 041 关闭；`UI-M3-02D` 合并为 Rev 2 `ready / Current actor=UI 设计对话`。Rev 1 已通过的信息架构、视觉、响应式和不受影响证据冻结，只补同一 Dispatch 数据、创建提交锁定、取消确认与选择失效语义；`FRONT-M3-02D` 保持 blocked，后端 Rev 2 和单剧前端继续并行。未修改生产前后端、迁移或共享契约，未接真实 API、密钥、付费或云资源，未提交、推送或部署。

## 2026-08-14 — UI-M3-02D Rev 1 Wave B 多剧派发设计完成并交规划

- 冻结 Wave A 单剧设计与 16 张既有证据，在 `DESIGN.md` 5.5 新增项目中心多剧选择、批量确认和员工侧“中文识别任务”正式规则；新增 `docs/ui/M3-asr-dispatch-acceptance.md`，明确服务端资格筛选、Project 选择单位、逐行/当前页/显式跨页全选、1–20 上限、筛选变化清理、selected/canCreate/blocked、逐项目 accepted/blocked，以及 Dispatch 接受结果与执行状态分层。
- 仓库外匿名原型位于 `m3-asr-dispatch-rev1`。当前页确认动态显示 `7 部 / 可创建 4 / 阻断 3 / 205 集 / 109 新任务 / 7 复用`；显式全量选择同步变为 `18 / 11 / 7 / 485 / 282 / 14` 并逐项目列出 18 行。部分接受、失败、取消请求、需对账、读取失败、刷新恢复和空态均有文字、形状、语义色及唯一下一动作。
- 11 张视觉证据覆盖 1440 项目中心/确认/部分接受/任务列表/详情/空错态和 1024 侧栏 204/72 两态。in-app Browser 外层视口固定为 1280×720，因此使用原型逻辑桌面画布按 1440×900 与 1024×768 精确裁切并在验收文档明确标注，不冒充真实外层视口调整；两种画布的 `body/AppShell` 均为等宽无横溢，项目/任务/侧栏内表只在各自容器横滚。
- 批量确认初始焦点、Shift+Tab/Tab 双向闭环、任务详情 Escape 恢复触发点、资格筛选清除选择播报和读取失败重新读取聚焦通过；员工任务页禁用词检查无供应商、并发、预算、服务器、密钥、精确金额或管理员入口，浏览器控制台 `error/warn=0/0`。原型 `node --check`、授权文档 `git diff --check` 通过；Impeccable 检测为 `[]`，但缺 HTML 解析模块而降级为 regex，仅作辅助。
- 本轮只修改 `DESIGN.md`、新增 UI 验收文档、同步文件与仓库外原型/截图；未修改生产 React、后端、迁移或共享契约，未建设 OCR、上传任务、通用任务中心、系统控制台或真实供应商，未提交、推送或部署。`CURRENT.md` 在后端 v4-071 上最小合并为 v4-072，登记 FIFO 041，任务转 `review / Current actor=规划对话`，只通知规划总线。

## 2026-08-14 — 后端领取 BACK-M3-02D Rev 2 Wave B 投影收口

- 完整重读项目协议、`CURRENT.md` v4-070、S2.1 批量派发契约、`DESIGN.md` 5.5 Wave B、Dispatch UI 验收矩阵与日志顶部，确认 Rev 1 的表、创建幂等、逐项目结果、活动批次竞态、单项目命令复用和 4/1 公平调度全部冻结。
- `CURRENT.md` 更新为 v4-071，任务转为 `in_progress`。本轮只补接受/执行状态分层、项目中心服务端资格搜索筛选排序分页及最近批次、Dispatch 服务端列表汇总和幂等派发取消；不改生产前端/DESIGN，不接真实供应商/网络/密钥/付费，不实现管理员网站/API、OCR 或通用任务中心。

## 2026-08-14 — 规划复验 BACK-M3-02D Rev 1 并合并 Wave B 投影缺口

- 规划重读 Wave B 产品契约、最新 `DESIGN.md` 与 UI 验收语义，审查 Dispatch 迁移、共享 TypeBox、资格/派发仓储、单项目创建命令、Worker 策略读取和公平领取。Rev 1 的 PostgreSQL DispatchGroup、规范化项目集合、创建幂等、逐项目 accepted/blocked、活动批次竞态门禁、项目轮转、项目内集数升序和开发默认全局 4/每项目 1 均成立。
- 本轮独立重新执行 `pnpm run db:setup`、ASR 专项、共享契约构建、后端生产构建、`check:repo` 与 `git diff --check`，全部退出码 0；随后停止本地 PostgreSQL，并由状态命令确认实例未运行。完整 `pnpm check` 继续留给 S2.1 关闭门。
- 跨角色契约审计发现同一根因的四项缺口：后端 Dispatch `status` 仍只表达 `accepted/partial/blocked` 创建结果，无法表达排队、运行、完成、失败、取消和需对账；列表缺少正式员工页要求的服务端搜索、运行状态/行动优先排序、有效更新时间和质量/用量汇总；项目中心只有最多 20 个已知 ID 的资格批查，不能按资格/最近任务做服务端筛选分页；派发级幂等取消尚未把取消意图传递给未终结子批次。继续让前端自行推导会形成第二套状态源，因此不能直接关闭后端 Wave B。
- `CURRENT.md` 从 v4-069 更新为 v4-070，登记并关闭 FIFO 040；`BACK-M3-02D` 合并为 Rev 2 `ready / Current actor=后端开发对话`，只收口项目选择投影、接受结果与运行状态分层、正式列表汇总和派发级取消。Rev 1 已通过基础冻结，不重复重写公平调度；`FRONT-M3-02D` 保持 blocked，正在进行的单剧前端和 UI Wave B 不受影响。未接真实 API、管理员网站、密钥、付费或云资源，未提交、推送或部署。

## 2026-08-14 — BACK-M3-02D Rev 1 Wave B 后端完成并交规划

- 新增 PostgreSQL `asr_dispatch_groups / asr_dispatch_project_results / asr_dispatch_commands / asr_project_scheduling` 与公平领取序列。共享 TypeBox 和正式业务 API 支持批量资格投影、幂等创建 DispatchGroup、逐项目 accepted/blocked 结果、列表及详情刷新恢复；员工请求仍不能选择厂商或调度容量。
- 资格投影由后端统一检查项目生命周期、最新不可变术语版本、最新素材清单、ASR 视频覆盖、活动批次和可复用结果。Dispatch 复用既有单项目批次领域命令，规范化项目集合，同键重放保持同一 group/batch，异参稳定冲突；`allowPartial=false` 有阻断项时不创建批次，显式 `allowPartial=true` 才只为合格项目创建，项目级活动批次锁阻止竞态重复批次。
- 新增稳定内部 `AsrSchedulingPolicyReader`，当前仅返回开发默认全局 4、每项目 1、无限定速率；Worker 入口按全局槽位启动有界轮询 lane，仓储用 PostgreSQL 租约、调度锁与 `SKIP LOCKED` 先在项目间轮转，再在项目内按集数/id 确定排序，过期租约和需对账保护保持原语义。
- 匿名回归以三项目覆盖可执行、缺术语、缺视频、整组阻断、显式部分派发、幂等重放、同键异参、刷新恢复、活动批次竞态、项目公平和 4/1 容量。`tests/backend/asr.test.ts` 12/12、共享契约构建、后端生产构建、`check:repo` 与 `git diff --check` 均退出码 0；完整 `pnpm check` 留 S2.1 切片关闭门。测试后 `projects / asr_dispatch_groups / asr_batches / asr_jobs / asr_attempts` 均为 0，本地 PostgreSQL 已停止。
- 本轮只修改共享 ASR 契约、后端 ASR 模块/Worker、必要迁移与后端测试；未修改生产前端或 `DESIGN.md`，未接真实供应商、SDK、网络、密钥、付费或云资源，未实现系统控制台、管理员网站/管理 API、OCR 或导出通用任务中心，未提交、推送或部署。任务写回 `review / Current actor=规划对话`，只通知规划总线。

## 2026-08-14 — UI 领取 UI-M3-02D Rev 1 Wave B 多剧派发设计

- 完整重读项目协议、`CURRENT.md` v4-067、S2.1 批量派发契约、`DESIGN.md` 5.5、Wave A 验收与开发日志顶部，确认 Wave A 单剧结构和证据全部冻结。
- `CURRENT.md` 更新为 v4-068，任务转为 `in_progress`。本轮只设计项目中心的服务端中文识别资格筛选、多剧选择与批量确认，以及员工侧专用“中文识别任务”列表/详情；不设计通用任务中心、系统控制台、OCR、上传任务或真实供应商，不修改生产前后端、迁移或共享契约。

## 2026-08-14 — 前端领取 FRONT-M3-02B Rev 1 单剧中文识别页

- 完整重读项目协议、`CURRENT.md` v4-066、S2 ASR 批次契约、`DESIGN.md` 5.5、UI 验收、功能等价矩阵与开发日志顶部，确认 `UI-M3-02` Rev 2 和 `BACK-M3-02C` 均已由规划关闭。
- `CURRENT.md` 更新为 v4-067，任务转为 `in_progress`。本轮只集成正式单剧中文识别 React 页面与既有零网络 fake 链路，消费后端权威热词预览、五类回执和批次状态；不实现多项目 Dispatch、管理员入口、真实供应商/API/密钥、OCR、字幕正文编辑、播放器或 S3 前置审改，不修改后端、迁移、共享契约或 DESIGN。

## 2026-08-14 — 规划通过 UI-M3-02 Rev 2 并关闭 Wave A 质量门

- 按 FIFO 039 审核 `DESIGN.md` 5.5、`docs/ui/M3-asr-acceptance.md`、原型代码和 evidence/13–16。热词同项目不可变证据、五态回执、准确率未验证、批次取消/需对账、员工处理用量与已通过后端契约一致；1440/1024 侧栏两态、根页面/表格滚动归属、侧栏焦点恢复及控制台证据完整，P0/P1=0。
- 规划运行 Impeccable 检测为 `[]`，但本机缺 HTML 解析模块而降级为 regex，只作辅助；脚本语法检查通过。唯一 P3 为原型可见“员工页边界/精确费用留在系统控制台”内部说明，正式前端直接省略，不要求 UI 返工，也不显示管理员网站入口。
- Wave A 完整 `pnpm check` 退出码 0，本地 PostgreSQL 已停止。`UI-M3-02` 标记 done、FIFO 039 关闭；`FRONT-M3-02B` 与 `UI-M3-02D` 解锁为 ready，可同已运行的 `BACK-M3-02D` 文件不重叠地并行。未接真实 API、管理员网站、密钥、付费或云资源。

## 2026-08-14 — 后端领取 BACK-M3-02D Rev 1 Wave B Dispatch 与公平调度

- 完整重读项目协议、`CURRENT.md` v4-064、S2.1 多剧批量契约、系统控制中心边界、职责矩阵与开发日志顶部，确认本轮只实现 PostgreSQL 权威 DispatchGroup/逐项目结果/幂等、服务端项目资格、复用单项目批次命令、开发默认全局 4/每项目 1 的项目公平领取和稳定内部策略读取接口。
- `CURRENT.md` 更新为 v4-065，任务转为 `in_progress`。本轮不创建通用任务中心、管理员网站或管理 API，不接真实供应商/SDK/网络/密钥/付费，不修改生产前端/DESIGN，不扩展 OCR 或导出。

## 2026-08-14 — 规划独立复验通过 BACK-M3-02C Rev 1

- 基于 `CURRENT.md` v4-063 按 FIFO 038 审核。规划重新执行 `pnpm run db:setup`，新增迁移成功应用；独立 ASR 专项 1 文件 9/9、共享契约构建、后端生产构建和 `check:repo` 全部退出码 0。
- 代码核对确认批次 `cancel_requested/reconciliation_required` 的共享/数据库/汇总/筛选一致，同项目不可变术语版本隔离、通用投影与 adapter 能力快照、调用前 Attempt payload 证据、五态回执及迁移前 deterministic fake v1 兼容成立；没有进入 Dispatch、管理员网站或真实 API。
- 本地 PostgreSQL 已停止。`BACK-M3-02C` 标记 done，FIFO 038 关闭；`BACK-M3-02D` 解锁为 ready，完整 `pnpm check` 继续留 Wave A 两项合并后的集成门。UI FIFO 039 仍按顺序独立审核，前端尚未解锁。

## 2026-08-14 — UI-M3-02 Rev 2 Wave A 增量设计完成并交规划

- 冻结 Rev 1 页面骨架及 `evidence/01–12`，在批次详情新增“本批次热词”次级入口：侧栏显示同项目不可变术语版本、投影版本、摘要、实际纳入/规则过滤/适配器截断数量和可展开证据；五类回执完整映射为 `simulated / submitted / partially_submitted / unsupported / unknown`，并持续提示“已发送不等于准确率已提升 / 热词链路已接通，准确率未验证”。
- 批次与逐集主表统一把“用量与费用”改为“处理用量”，员工侧只显示处理时长、任务数、质量及“已记录 / 待对账”，不再显示精确金额或内部 `deterministic_fake`；精确费用仅作为系统控制台边界说明，没有建设控制台 UI。批次 `cancel_requested / reconciliation_required` 均以中文文字、语义色和形状编码，需对账没有普通重试。
- 新增仓库外证据 `13–16`：1440 热词证据/五类回执，以及 1024 侧栏 204/72 两态批次需对账。实测 1440 根页面 `1430/1430`；1024 两态根页面均 `1014/1014`，批次/逐集横滚只在各自容器；热词侧栏初始焦点、Shift+Tab 闭环、Escape 关闭和原触发点恢复通过，控制台 `error/warn=0/0`。
- 原型脚本 `node --check` 和授权文档 `git diff --check` 通过；Impeccable 有界检测为 `[]`，因缺 HTML 解析模块使用 regex 降级，仅作辅助。`CURRENT.md` 在后端 v4-062 上最小合并为 v4-063，登记 FIFO 039，任务转 `review / Current actor=规划对话`。
- 本轮只修改 `DESIGN.md`、`docs/ui/M3-asr-acceptance.md`、规划同步文件与仓库外匿名原型/截图；未修改生产 React、后端、迁移或共享契约，未扩展项目中心多选、DispatchGroup、系统控制台、真实厂商、SDK、网络、密钥或付费，未提交、推送或部署；只通知规划总线。

## 2026-08-14 — BACK-M3-02C Rev 1 Wave A 后端完成并交规划

### 批次状态与权威热词投影

- 共享 TypeBox 与 PostgreSQL 批次状态统一增加 `cancel_requested/reconciliation_required`；汇总把 `cancel_requested` 从普通 running 中拆出独立计数。任一未终结 Job 有取消意图时批次明确显示取消请求；无可用结果且存在需对账 Job 时显示需对账；有可用结果混合失败/取消/需对账仍保持 `partial`。
- 新增 `GET /api/projects/:projectId/asr/hotwords/preview?termVersionId=...`。后端只接受属于当前项目的不可变术语版本，返回实际纳入的规范术语与人名别称、过滤/截断数量、adapter 能力、投影版本和摘要；跨项目版本稳定返回 `422 ASR_TERM_VERSION_NOT_FOUND`。
- 通用术语投影移除固定 100 项/2000 字截断；adapter 描述保存支持标记、条数和字符能力，批次创建、预览、重试和 Worker 都使用相同保存能力。迁移前 deterministic fake 批次继续按 v1 + 100/2000 重建核对，新批次统一写 v2，不让排队历史因部署升级失效。

### Attempt 证据、回归与范围

- Worker 在适配器调用前把实际热词 payload 的投影版本、SHA-256、条数、字符数及初始 `unknown` 回执写入 Attempt；适配器统一返回 `simulated/submitted/partially_submitted/unsupported/unknown` 之一，正式读取投影刷新后恢复同一证据。deterministic fake 返回 `simulated`，第二个零网络匿名 stub 以 2 项能力截断并返回 `partially_submitted`；普通批次日志仍不复制完整术语或对象地址。
- `pnpm run db:setup` 已实际应用新增迁移。最终 `pnpm exec vitest run tests/backend/asr.test.ts --reporter=verbose` 为 1 文件 9/9，覆盖批次取消/需对账状态、同项目预览与跨项目隔离、109 项通用投影不截断、adapter 截断、摘要错配零 Attempt、payload/回执读取及既有租约/取消/重试/成功保护；共享契约构建、后端生产构建、`pnpm run check:repo` 和 `git diff --check` 均通过。
- 本地 PostgreSQL 已停止并由状态命令确认未运行；完整 `pnpm check` 按规划留给 Wave A 集成门。本轮未实现 DispatchGroup、公平并发、真实供应商/SDK/网络/密钥/付费、系统控制台或生产配置写入，未修改生产前端/DESIGN，未提交、推送或部署。
- `CURRENT.md` 在规划 v4-061 上最小合并为 v4-062；`BACK-M3-02C` Rev 1 转为 `review / Current actor=规划对话`，登记 FIFO 038。只通知规划总线，不直接通知或解锁前端/UI/Wave B。

## 2026-08-14 — 规划确认 API 型识别与管理员动态并发边界

- 用户确认正式 ASR 长期只走云 API；OCR 在真实样本质量和单集费用合适时也可走云 API。员工按剧选择并同时启动多个项目，集只作为后台执行单位；项目启动数量、排队数量和实际在途 API 请求数不再混称为“并发”。
- 用户进一步限定当前只建设员工主站的云端业务功能，不在主站加入供应商、并发、预算或服务器调控页面；当前后端只预留稳定策略读取/Adapter 对接接口和开发默认值，独立管理员网站及管理 API 后续另立任务。
- 更新 `SYSTEM_CONTROL_CENTER.md`：控制台分别管理 ASR API、OCR API、OCR 自建 Worker 和视频转码资源池，并按全局/供应商/项目/速率/队列/预算取最严格生效限制；动态降低并发只影响新领取任务，不中断已受理请求。OCR API 路径记录抽帧、去重、实际提交帧和计费数量。
- 更新 `M3-asr-bulk-dispatch.md`：开发 fake 的 `全局 4 / 每项目 1` 只是本地安全默认；正式生产值由控制台和供应商配额决定。正在执行的 `UI-M3-02` Rev 2 与 `BACK-M3-02C` 范围不变，未接真实 API、密钥、网络、付费或云资源，未修改生产代码、数据库或 DESIGN。

## 2026-08-14 — UI 领取 UI-M3-02 Rev 2 Wave A 增量设计

- 完整重读项目协议、`CURRENT.md` v4-059、S2 ASR 批次/多剧扩展契约、`DESIGN.md` 与开发日志顶部，确认 Rev 1 页面结构及 12 张证据冻结。
- `CURRENT.md` 更新为 v4-060，任务转为 `in_progress`。本轮只补同项目权威热词摘要与证据、五类应用回执、批次 `cancel_requested/reconciliation_required` 以及员工侧处理用量/质量摘要；不设计多项目选择、DispatchGroup、系统控制台或真实厂商，不修改生产前后端、迁移或共享契约。

## 2026-08-14 — 后端领取 BACK-M3-02C Rev 1 Wave A 热词证据与批次状态收口

- 完整重读项目协议、`CURRENT.md` v4-058、S2 ASR 批次/多剧扩展契约、职责矩阵与开发日志顶部，确认本轮只补批次 `cancel_requested/reconciliation_required`、同项目不可变术语版本热词预览、adapter 能力内截断和 Attempt payload/回执证据。
- `CURRENT.md` 更新为 v4-059，任务转为 `in_progress`。本轮不实现 DispatchGroup、公平并发、真实供应商/SDK/网络/密钥/付费，不修改生产前端/DESIGN，不运行完整 `pnpm check`。

## 2026-08-14 — 用户确认 S2.1 热词证据、多剧批量与费用分层

- 用户确认术语热词必须不仅绑定正确项目，还要让员工看见权威预览、实际发送状态，并在真实供应商接入后用同一 1–3 集做无热词/有热词 A/B；fake/stub 只证明管线，不得宣称真实准确率。规划核对现有实现确认项目—术语版本—摘要—Worker 绑定成立，但通用投影仍固定截断 100 项/2000 字，且没有持久化适配器发送回执。
- 用户同时确认多剧批量识别：选择单位固定为项目，不选择上传会话；上传完成页只预选并跳转。新增 `docs/contracts/M3-asr-bulk-dispatch.md`，定义最多 20 项目批量意图、逐项目 accepted/blocked、持久化 DispatchGroup、默认全局 4/每项目 1 的公平调度、局部失败隔离和 PostgreSQL 唯一状态源。
- 冲突审查发现 UI 的批次级 `cancel_requested` 与后端批次状态集合不一致，且全部需对账时后端会汇总为普通 `failed`。契约已补批次 `cancel_requested/reconciliation_required`；共享契约、数据库、汇总、筛选与 UI 必须一次对齐，不允许前端推断另一套状态。
- 费用分层确认：员工主表只突出处理用量、质量和待对账；每次请求金额和按项目/日期/供应商/模型聚合进入独立系统控制台，共用 PostgreSQL Usage，不建立第二本账。同步更新 `M3-asr-batch.md`、职责矩阵、M3 里程碑和 `SYSTEM_CONTROL_CENTER.md`。
- `CURRENT.md` 从 v4-057 更新为 v4-058，登记完成的 `PLAN-M3-02B`。Wave A 解锁 `UI-M3-02` Rev 2 与 `BACK-M3-02C` 并行；`FRONT-M3-02B` 等两项验收后立即开始。Wave B 的 UI/后端/前端任务先登记 blocked，待各自上游关闭后受控并行。未修改生产代码、DESIGN、数据库或共享契约，未接真实 API、网络、密钥、付费、云资源，未提交、推送或部署。

## 2026-08-14 — 规划审核 UI-M3-02 与 BACK-M3-02A Rev 2

- 按 FIFO 先处理 036：规划逐张复核 UI 明确交付的 12 张 ASR 原型证据，运行、视频/术语双门禁、需对账、仅重试失败集、取消请求、完成、空态、读取失败和 1024 侧栏 204/72 两态均与 S2 契约一致，未发现 P0/P1。记录两个不阻塞 P2：正式员工页不显示 `deterministic_fake` 等内部适配器值，“本地服务正常”部署后使用中性“服务正常”。本轮 in-app Browser 安全策略拒绝重新打开另一任务的 `file://` 原型，规划未绕过，也未把既有截图冒充本轮动态浏览器执行；任务路由用户只做方向验收。
- 再处理 FIFO 037：规划执行 `pnpm run db:setup` 成功；新鲜 `pnpm exec vitest run tests/backend/asr.test.ts` 为 1 文件 7/7，共享契约与后端生产构建均退出码 0。代码核对确认创建 body `additionalProperties:false`，员工附带 provider 会被拒绝；普通响应不含对象地址或完整热词；第二个匿名零网络适配器经过同一 registry、Worker、PostgreSQL 和正式读取链路。
- `BACK-M3-02A` Rev 2 关闭为 `done`。当前结论只证明零网络模拟与多适配器边界，不代表真实供应商已可生产启用；真实 API 接入前必须把 `fakeEnabled`/生产 Worker 保护改为受授权配置，并为适配器意外抛错增加 Worker 级故障归一化。未接 SDK、网络、密钥、回调或付费，未修改生产前端/DESIGN，完整 `pnpm check` 仍留 S2 关闭门。
- `CURRENT.md` 从 v4-056 更新为 v4-057：FIFO 036/037 关闭，UI 转用户方向验收，后端标记完成；`FRONT-M3-02B` 仍只等待用户确认 UI 方向，不提前解锁。未提交、推送、部署或创建云资源。

## 2026-08-14 — BACK-M3-02A Rev 2 多适配器边界完成并交规划

### 登记元数据与厂商中立执行上下文

- 新增后端 `AsrAdapterRegistry`：适配器登记稳定 `provider/adapter/model/language/configDigest` 描述，批次创建只使用后端默认登记项，公开创建 body 不增加厂商字段；同键重放和失败子集重试继续复用已保存描述。共享读取 schema 与仓储行类型改为受长度约束的字符串，不再限定 `fake/deterministic_fake` 字面量。
- Worker 领取任务时联结不可变 Asset，内部输入包含 `assetId/objectKey/originalFilename/mediaKind/sizeBytes/checksum`；同时从不可变术语版本重建实际热词，先核对 `hotwordDigest` 再交适配器。普通 API 仍只返回热词摘要，不返回完整热词或 objectKey，Worker 也不记录执行上下文。
- 统一适配器输出包含 Cue、质量、明确失败、未知结果和同构 Usage；Worker 校验 Usage 的 provider、providerRequestId 与对账状态，仓储按适配器返回落账。执行前取消、项目回收和安全租约接管的内部零用量按批次 provider 记录，仓储路径不再写死 fake；Rev 1 状态转换、结果保护与 `reconciliation_required` 语义未重写。

### 第二 stub、Worker 入口与验证

- 后端新增独立 ASR Worker 启动入口和 API+Worker 本地开发入口。每次循环只领取一个任务，空闲轮询限制在 50ms–60s，AbortSignal 可立即中断等待并优雅关闭数据库；现有根级 `pnpm dev` 调用后端 `dev` 时会启动该组合入口，queued 任务可实际推进。
- 新增第二个仅测试用匿名零网络 stub，以非 fake 的描述元数据和非零同构 Usage 走正式 API 创建→registry 解析→可停止轮询 Worker→PostgreSQL→正式 API 读取；断言员工请求附带 provider 被 `400` 拒绝，适配器内部收到完整 Asset 和 `['林川','小川','雾城']` 实际热词，而响应不泄露 objectKey 或热词正文。
- 最终 `pnpm exec vitest run tests/backend/asr.test.ts` 为 1 文件 7/7；`pnpm --filter @qimao-terms-cloud/contracts run build`、`pnpm --filter @qimao-terms-cloud/backend run build` 和 `git diff --check` 均通过。本地 PostgreSQL 已停止；完整 `pnpm check` 按 v4 留给 S2 关闭门。
- 本轮未新增迁移，未实现真实厂商空壳、SDK、网络、回调、API Key、密钥引用或付费；未修改生产前端/DESIGN，未扩展任务中心、S3 对照或 OCR，未提交、推送或部署。`CURRENT.md` 在 UI v4-055 上最小合并为 v4-056，`BACK-M3-02A` Rev 2 转为 `review / Current actor=规划对话` 并登记 FIFO 037；只通知规划总线，不通知或解锁前端。

## 2026-08-14 — UI-M3-02 Rev 1 中文识别批次页完成并交规划

- 更新 `DESIGN.md` 5.5 并新增 `docs/ui/M3-asr-acceptance.md`，正式定义项目工作台“中文识别”页：术语版本与已校验 `asr_video` 双门禁、整剧/选中集/单集、持续可见模拟识别标识、行动优先批次表、原位逐集工作区、质量/尝试/对账侧栏，以及取消、失败集子集重试、需对账、版本过期和完整空错加载状态矩阵。
- 仓库外匿名原型位于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\12\019ff52d-d4a1-7440-81a2-fc9c1b0a0996\m3-asr-rev1\`；最终 12 张截图覆盖 1440 运行/视频阻断/术语阻断/需对账/重试/取消/完成/空态与 1024 侧栏 204/72 两态及错误态。原型三个批次逐集记录为 30/8/30，状态专属事实不串用；单集为 radio 单选，取消和重试会推进示例内存事实。
- 真实浏览器测得 1440 根页面 `1430/1430`；1024 Windows 纵向滚动槽下展开/收起两态根页面均 `1014/1014`，侧栏 204px/72px，收起态导航图标均 18px；批次表 `1120px`、逐集表 `1080px` 的横滚只属于各自容器。加载 `aria-busy=true`，空态 `role=status`，读取失败 `role=alert/aria-live=assertive`；最终控制台 `error/warn=0/0`。
- 原型脚本 `node --check` 与同轮浏览器语法核对通过；Impeccable 机械检测为 `[]`，因缺 HTML 解析依赖仅作辅助。独立第二轮定向终审最终 `PASS`，未发现剩余 P0/P1。`CURRENT.md` 在规划 v4-054 上最小合并为 v4-055，登记 FIFO 036，任务保持 Rev 1 `review / Current actor=规划对话`。
- 本轮仅修改 `DESIGN.md`、`docs/ui/M3-asr-acceptance.md`、规划同步文件与仓库外原型/截图；未修改生产 React、后端、迁移或共享契约，未接真实供应商、密钥、网络、付费或云资源，未扩展密钥控制台、账号、全局任务中心、字幕编辑、播放器或 OCR，未提交、推送或部署；只通知规划总线，不自行解锁前端。

## 2026-08-14 — 规划固化两站一后台与统一系统控制台边界

- 用户确认员工工作台可通过公网域名访问，系统控制台作为另一网站只供部署所有者使用；两者不建设重复后端、数据库或强制使用两台服务器。规划明确“公网可达”不等于匿名开放：员工站使用显式员工邮箱白名单，控制台只允许部署所有者精确邮箱。
- 新增 `docs/contracts/SYSTEM_CONTROL_CENTER.md`，选择 Cloudflare Tunnel + 两个独立 Cloudflare Access Application 作为首期无自建账号入口；两个站使用不同 audience，后端验证 JWT 签名、issuer、audience 和有效期。同步固化引擎/API、路由、提示词/热词、服务器/Worker、预算、日志、Secret 引用和不可变审计的分区与配置生命周期。
- 更新 `PRODUCT.md` 与 `docs/architecture.md`，把原“身份提供方待定”收口为首期外部邮箱身份方案，同时保留未来应用账号、多租户、真实部署值和云资源授权门。未创建 Cloudflare 账户、Tunnel、Access Application、域名、服务器或密钥，未连接网络、未部署或付费。
- `CURRENT.md` 从 v4-053 更新为 v4-054，新增已完成 `PLAN-SYSTEM-01` 和 blocked 的 `UI-SYSTEM-01`。由于 `UI-M3-02` 正在修改 `DESIGN.md`，本轮不并发写同一文件；控制台 UI 合并等待当前 UI 交回规划并由用户确认优先级，不打断 `BACK-M3-02A` 或 `FRONT-M3-02B` 依赖。

## 2026-08-14 — 后端领取 BACK-M3-02A Rev 2 适配边界定向返工

- 完整重读项目协议、`CURRENT.md` v4-052、ASR 契约第 8/12 节和开发日志顶部，确认 Rev 1 已通过的双门禁、幂等、租约接管、结果保护和 `reconciliation_required` 状态机全部冻结。
- `CURRENT.md` 更新为 v4-053，任务转为 `in_progress`。本轮只补后端登记的适配器描述元数据、厂商中立执行输入/输出与 Usage、第二个零网络测试 stub，以及有界轮询和优雅停止的本地 Worker 启动入口；不实现真实厂商空壳、SDK、网络、密钥或付费，不修改生产前端/DESIGN，不扩展任务中心、S3 或 OCR。

## 2026-08-14 — 规划独立复验 BACK-M3-02A Rev 1 并定向退回适配边界

- 规划核对 ASR 迁移、共享 TypeBox 契约、批次/取消/重试命令、租约 Worker、读取投影、热词投影和零网络 fake；本轮重新执行 `pnpm exec vitest run tests/backend/asr.test.ts` 为 1 文件 6/6，通过共享契约构建和后端生产构建。Rev 1 的双门禁、幂等、租约接管、结果保护与需对账基线保留。
- 按用户“现在即预留大量厂商 API 接口”的最新要求做冲突审查，确认现有 `AsrAdapter` 只完成了 fake 测试隔离，尚不是可替换的正式厂商边界：`provider/adapter/model` 在共享契约、读模型、创建仓储和 Usage 写入中固定为 fake；执行输入只有文件名与热词摘要，没有 Asset 对象引用、校验元数据和实际热词；服务器/脚本没有启动 Worker 的入口，正式前端创建后任务不会自行离开 queued。
- 契约补充最小厂商中立边界：批次元数据由后端登记配置固定，Worker 按批次解析适配器；内部执行上下文提供不可变 Asset 元数据和与 digest 一致的实际热词；适配器统一返回 Cue、质量、未知结果和 Usage；第二个仅测试用零网络 stub 证明可替换性；本地 Worker 必须有有界轮询和优雅停止入口。当前仍不写任何真实厂商空壳，不接 SDK、密钥、网络或付费。
- `CURRENT.md` 更新为 v4-052，FIFO 035 关闭；`BACK-M3-02A` 递增为 Rev 2 `ready / Current actor=后端开发对话`。`UI-M3-02` 继续独立并行，`FRONT-M3-02B` 保持 blocked；完整 `pnpm check` 继续留 S2 关闭门。本轮未修改生产代码、前端、DESIGN 或数据库迁移，未提交、推送或部署。

## 2026-08-14 — BACK-M3-02A Rev 1 S2 ASR 后端完成并交规划

### 权威批次、租约恢复与结果保护

- 新增 S2 ASR 共享 TypeBox 契约和 PostgreSQL 迁移，批次、逐集 Job、Attempt、不可变 Result/Cue、Usage 及创建/取消/重试命令均以数据库为权威；正式 API 支持整剧、选中集、单集创建，列表/详情读取，取消与失败子集重试。创建时锁定项目、最新已确认素材清单、已校验 `asr_video` Asset 与当前项目不可变术语版本，缺失视频形成逐集 blocker，回收中项目和无效术语版本由稳定领域错误阻断。
- 新增数据库租约 Worker 和仅开发/测试可用的 `deterministic_fake` adapter，不调用网络、不读取密钥。Worker 支持安全租约接管；已知失败可显式重试，未知外部结果进入 `reconciliation_required` 且不自动重试；质量 `rejected` 结果保留在不可变尝试历史但不成为当前可用结果，后续失败或强制重跑不会覆盖既有成功结果。
- 术语热词从显式不可变 `TermVersion` 确定生成，过滤普通职位/泛称并按确定规则去重、截断；API 只返回摘要、数量和 digest，不返回完整热词。每次 fake 尝试均写入零时长、零字符、零费用用量；Cue 按集数、时间轴与轴号持久化并由数据库触发器禁止更新。

### 回归、清理与范围

- `pnpm exec vitest run tests/backend/asr.test.ts`：1 文件 6/6 通过，覆盖素材+术语双门禁、三种范围、规范化创建重放/同键异参、取消重放、失败子集重试、租约接管、通过/警告/拒绝/需对账、成功复用与强制失败保护、不可变结果/Cue、热词摘要及零费用用量。
- `pnpm exec vitest run tests/backend`：7 文件 60/60 通过；`pnpm --filter @qimao-terms-cloud/contracts run build`、`pnpm --filter @qimao-terms-cloud/backend run build`、`pnpm run check:repo` 与 `git diff --check` 均通过。迁移已由 `pnpm run db:setup` 从当前本地数据库实际应用；最终本地 PostgreSQL 已停止。完整 `pnpm check` 按 v4 留给 S2 纵切关闭门。
- 最终范围仅涉及共享 ASR 契约、ASR 后端模块/专属 Worker、必要迁移、应用路由注册和后端测试；未修改生产前端或 DESIGN，未接真实供应商、网络、API Key、ASR/OCR 云资源，未建立任务中心或 S3 对照编辑，未提交、推送或部署。
- `CURRENT.md` 在并行 UI 写入的 v4-050 上最小合并为 v4-051；`BACK-M3-02A` Rev 1 转为 `review / Current actor=规划对话`，登记 FIFO 035。只通知规划总线，`UI-M3-02` 保持 `in_progress`，`FRONT-M3-02B` 保持 blocked 且不由后端解锁。

## 2026-08-14 — UI 领取 UI-M3-02 Rev 1 中文识别批次页设计

- 完整重读项目协议、`CURRENT.md` v4-049、S2 ASR 批次契约、职责矩阵中文识别行、功能等价矩阵对应行、`DESIGN.md` 与开发日志顶部，确认本轮只设计项目工作台“中文识别”批次页与完整状态矩阵。
- `CURRENT.md` 更新为 v4-050，任务转为 `in_progress`。本轮只修改 `DESIGN.md`、`docs/ui/` 与仓库外匿名原型/截图；不修改生产 React、后端、迁移或共享契约，不设计密钥控制台、账号、全局任务中心、字幕编辑、播放器、OCR 或真实付费 API。

## 2026-08-14 — 后端领取 BACK-M3-02A Rev 1 S2 ASR 权威流程

- 完整重读项目协议、`CURRENT.md` v4-048、S2 ASR 批次契约、职责矩阵中文识别行、功能等价矩阵对应行与开发日志顶部，确认本轮只实现 PostgreSQL 权威批次、共享契约、正式 API、数据库租约 Worker、`deterministic_fake`、不可变 Cue、热词摘要、零费用用量和后端回归。
- `CURRENT.md` 更新为 v4-049，任务转为 `in_progress`。UI 可按不重叠目录并行；后端不修改生产前端/DESIGN，不接真实供应商/网络/密钥，不建立任务中心、S3 对照编辑或 OCR，不运行完整 `pnpm check`。

## 2026-08-14 — 用户确认 S2 ASR 推荐方案并解锁 UI/后端并行

- 用户明确确认“先用零付费 fake 固定完整流程，同时调研真实中文 ASR API；真实密钥和 1–3 集样本调用另行授权”的推荐方案。规划完成 `PLAN-M3-02`，没有购买服务器、创建云资源、接入密钥或产生付费调用。
- 规划只读核对本地应用 `batch_asr`、`asr_term_prompt`、ASR 历史与对应回归：保留整剧批次、确认术语热词、普通职位/泛称过滤、源文件保护、成功结果不覆盖、异常内容隔离、取消、失败集子集重试和整剧历史恢复；云端优化为 PostgreSQL 权威批次、不可变结果与数据库租约 Worker。
- 新增 `docs/contracts/M3-asr-batch.md`，固化整剧/选中集/单集、术语版本与已校验 ASR 视频双门禁、批次/逐集状态、不可变 Cue、运行与质量分离、热词摘要、创建/取消/重试幂等、未知结果需对账、零费用 fake、未来真实用量与密钥安全边界。同步更新 M3 冲刺、模块职责矩阵和本地功能等价矩阵。
- `CURRENT.md` 从 v4-047 更新为 v4-048：`PLAN-M3-02` 标记 `done`；`UI-M3-02` 与 `BACK-M3-02A` 分别设为 `ready` 并允许文件不重叠的受控并行；`FRONT-M3-02B` 保持 `blocked`，必须等待 UI 用户方向通过和后端规划独立验收。未修改业务代码、生产 UI、迁移或共享代码契约，未提交、推送或部署。

## 2026-08-13 — 规划关闭 M3 S1 术语纵切并进入 ASR 产品协商门

- 规划按 Impeccable 技术审计规则复核 UI 的完整终验矩阵，并抽查正式页面主表、真实 Cue 第 2 页人工新增、模板真实冲突恢复、全量发布确认、不可变历史下载以及 1024 侧栏展开/收起两态共 7 张关键截图；报告与画面一致，核心路径可完成，P0/P1 为 0。
- 接受 P2“模板/发布居中 dialog 非提交态点击遮罩不关闭”和 P3“历史标题暴露后端实现措辞”为后置项；Escape、取消/关闭、焦点闭环和核心任务均正常，不再制造当前切片返工。共享契约中无调用者的 `ConfirmTermVersion*` 记为 P3，因后端已无对应运行路由，推迟到下一次后端术语契约维护时删除。
- 按用户授权运行 S1 唯一一次完整 `pnpm check`，退出码 0；随后执行 `pnpm run db:stop` 成功，并用状态命令确认项目本地 PostgreSQL 未运行。M3 冲刺与功能等价矩阵已把多集 SRT 术语来源、术语人工审核、术语版本与导出更新为完成/已等价。
- `CURRENT.md` 从 v4-046 更新为 v4-047，FIFO 034 关闭，`FRONT-M3-01B` Rev 3 标记 `done`。新增 `PLAN-M3-02` Rev 1 `review / Current actor=用户`，只讨论中文 ASR 批次、供应商接入、术语热词、费用与授权边界；用户确认前不发布实现任务，不接密钥、不付费、不购买或部署云资源。本轮未提交、推送或部署。

## 2026-08-13 — UI 完成 FRONT-M3-01B Rev 3 正式 React 完整终验并交规划

- 使用正式 React `/terms` 与真实本地 API 建立 1 集 35 Cue 匿名项目，一次性完成来源摘要、搜索/四态/八类筛选、排序升降序、普通选择翻页清理、显式全量选择跨页、证据侧栏、Cue 第 2/2 页人工新增、逐行确认/驳回、公司五字段模板、单一发布、不可变 V1 和历史 XLSX 下载。真实状态最终为 36 个候选中的 33 待确认、1 已确认、1 已修改、1 已驳回；发布纳入 35 项并排除已驳回项。
- 模板管理真实制造启用指针并发变化，正式页面稳定显示 `TERM_EXPORT_TEMPLATE_VERSION_CONFLICT`、中文原因和请求标识，失败后焦点回到 dialog 内关闭按钮；刷新权威模板后，通过 UI 保存并启用 V4，字段顺序为 `type/name/aliases/note/gender`。发布绑定该 V4，历史下载地址返回 200、16463 字节和有效 XLSX/ZIP 签名，临时文件已删除。
- 1440×900 根页面 `1430/1430`；1024×768 Windows 纵向滚动槽下，侧栏展开 204px 和收起 72px 两态根页面均为 `1014/1014`，表格 `980px` 只在容器内产生 236px/104px 横滚。1024 模板窗口内部纵滚且根横溢为 0；最终控制台 `error/warn=0/0`。11 张正式页面截图与完整矩阵已追加到 `docs/ui/M3-terms-acceptance.md`。
- 正式请求完成过快，没有绕过 in-app Browser 隔离注入延迟器；CandidatePanel、TemplateDialog 与发布确认的提交中焦点/按钮锁定明确引用规划已独立复验的可控延迟 DOM 门作为等价证据，不冒充本轮真实延迟运行。完整终验未发现 P0/P1；记录 P2“模板和发布居中 dialog 的非提交态遮罩点击不关闭”与 P3“历史区标题暴露后端实现措辞”后置，不阻塞当前术语切片。
- 匿名项目与本轮模板 V2–V4 已按精确 ID/版本清理，启用模板恢复 V1；3000、3001、55432 端口已释放。`CURRENT.md` 从 v4-045 最小合并为 v4-046，登记 FIFO 034，任务保持 Rev 3 `review` 并转 `Current actor=规划对话`。未修改生产前端、后端、迁移、共享契约或 DESIGN，未重复冻结自动化、未提交、推送或部署，只通知规划总线。

## 2026-08-13 — UI 领取 FRONT-M3-01B Rev 3 一次性正式页面终验

- 完整重读项目协议、`CURRENT.md` v4-044、`DESIGN.md` 5.4、M3 术语 UI 验收、M3 术语契约和开发日志顶部，确认本轮只对正式 React 术语页做一次完整 UI 领域终验，不修改生产代码或扩展设计。
- `CURRENT.md` 更新为 v4-045；任务保持 Rev 3 `review / Current actor=UI 设计对话`。规划已通过的 17/17、TypeScript、145 模块构建、Impeccable、契约/等价矩阵和定向 DOM 门全部冻结，不重复运行。
- 本轮将统一覆盖 1440/1024 两态、来源与候选主链、普通/全量选择及分页、证据/人工新增、模板/发布/历史、三类弹窗/侧栏键盘焦点、滚动与控制台；真实 pending 注入若受浏览器隔离限制，只引用并明确标记规划的可控延迟 DOM“等价证据”。

## 2026-08-13 — 规划通过 FRONT-M3-01B Rev 3 并路由 UI 一次性终验

- 规划只读复核普通选择页码 effect、发布错误分类与查询刷新、CandidatePanel/TemplateDialog 的 pending/rejected 焦点 effect、dialog 容器自身 Tab/Shift+Tab 边界及四项新增定向回归；确认三项均处理原退审根因，Rev 2 已冻结的单一发布、只读门禁、候选状态、Cue 分页、视觉和等价矩阵未被改写。
- 独立运行 `pnpm exec vitest run tests/frontend/TermsWorkspace.test.tsx` 为 1 文件 17/17；前端 TypeScript、145 模块生产构建、Impeccable 定向机械检测 `[]` 和 `git diff --check` 全部通过。未发现新的 P0/P1，也未重复全部前端或完整 `pnpm check`。
- 按用户要求的速度与 v4 停止线，规划不再追加普通前端优化，将 `FRONT-M3-01B` 保持 Rev 3 `review` 并把 `Current actor/Reviewer` 路由 UI 设计对话，只进行一次正式 React 页面完整终验。UI 必须一次性回传全部发现；P2/P3 记录后置，不阻塞术语切片，只有真实 P0/P1 才允许退审。
- `CURRENT.md` 从 v4-043 更新为 v4-044，FIFO 033 关闭。本轮只修改规划状态与日志，未修改生产前端、后端、迁移、共享契约、DESIGN 或等价矩阵，未提交、推送或部署；完整 `pnpm check` 仍留 UI 通过后的 S1 关闭门。

## 2026-08-13 — FRONT-M3-01B Rev 3 交互恢复收口完成并交规划

### 三项定向修复

- 普通“当前页选择”现在随候选页码变化清空；显式 `allPendingSelected` 仍保持独立的跨页权威范围。新增回归从第一页选择后翻到第二页，确认普通批量栏消失，第二页批量请求只包含第二页新选择的候选 ID。
- CandidatePanel 与 TemplateDialog 在 mutation 进入 pending 后确定聚焦各自可编程 dialog；焦点位于容器时，Tab/Shift+Tab 会进入弹窗内首尾可操作项，无可操作项时留在容器，pending Escape/遮罩不关闭。请求失败、按钮重新可用且错误态已提交后，焦点确定回到关闭按钮；成功仍沿用既有关闭、触发点恢复与页面反馈语义。两类窗口均以可控延迟 Promise 覆盖 pending→rejected DOM 焦点。
- 正式发布仅在网络未知错误或 `TermApiError.retryable=true` 时保留同一 `publishIntent` body/key；明确非重试错误会清除旧意图并重新读取术语工作区、候选、版本/导出及模板状态，不自动再次提交。已有未知结果同键回归保留，新增确定性草稿冲突证明首次 revision 4/旧键失败后，刷新到 revision 5，下一次用户显式提交使用新 body/new key。

### 验证与边界

- 最终 `pnpm exec vitest run tests/frontend/TermsWorkspace.test.tsx`：1 文件 17/17 通过。首次限定验证的 2 项失败来自测试未等待候选详情按钮，以及 jsdom 无布局使 `offsetParent` 过滤后 Tab 保持在 dialog 容器；修正为等待详情和断言焦点始终处于 dialog 语境后复跑全绿，生产实现未因此改变。
- 前端 TypeScript 退出码 0，生产构建 145 模块通过，Impeccable 定向检测 `[]`，最终 `git diff --check` 退出码 0。按任务要求未重复全部前端测试或完整 `pnpm check`。
- `CURRENT.md` 从 v4-042 更新为 v4-043，`FRONT-M3-01B` Rev 3 转为 `review / Current actor=规划对话` 并登记 FIFO 033。未修改后端、迁移、共享契约、DESIGN 或 `LOCAL_APP_PARITY.md`，未提交、推送或部署；只通知规划总线。

## 2026-08-13 — 前端领取 FRONT-M3-01B Rev 3 交互恢复收口

- 完整重读项目协议、`CURRENT.md` v4-041、开发日志顶部和 Impeccable harden/质量底线，确认 Rev 2 的单一发布、统一只读、pending 状态、Cue 分页/跨筛选保留、视觉与等价矩阵均已通过规划独立审计并冻结。
- `CURRENT.md` 更新为 v4-042，任务转为 `in_progress`。本轮只修普通当前页选择跨页清理、CandidatePanel/TemplateDialog 的提交中与失败焦点，以及发布意图对网络未知/可重试和确定性非重试错误的分类恢复；不修改后端、迁移、共享契约、DESIGN 或 `LOCAL_APP_PARITY.md`。

## 2026-08-13 — 规划完成 FRONT-M3-01B Rev 2 审计并合并送 UI 前返工

- 规划独立核对正式术语 API、页面、候选/模板弹窗、测试、M3 契约、UI 验收矩阵和功能等价三行；确认 `/terms/releases` 单一发布、非活动/来源变化/提取运行统一只读、仅 `pending` 参与选择与批量、`rejected` 先恢复、Cue 服务端分页并跨筛选保留、两处视觉小修均按范围交付，未发现后端/契约/DESIGN 越权。
- 独立执行术语专项 13/13、全部前端 5 文件 41/41、前端 TypeScript、145 模块生产构建、Impeccable 机械检测 `[]` 和 `git diff --check`，全部通过；没有运行完整 `pnpm check`。这些通过项冻结，不在返工中重做。
- 送 UI 前按完整交互矩阵发现三项手工审计缺口：候选普通当前页选择在页码变化后保留旧页 ID，批量栏显示数量可能大于真正提交的当前页候选；CandidatePanel 与 TemplateDialog 的提交按钮/关闭按钮禁用后没有把焦点转入 dialog，动态失败后可能重现焦点落到背景；`publishIntent` 对确定性非重试错误也永久保留旧请求体/旧键，刷新后仍不能建立新提交意图。三项均有页面状态或源码路径证据，机械检测和已有通过测试不能覆盖。
- 为避免先送 UI 再退审，FIFO 032 关闭，`FRONT-M3-01B` 更新为 Rev 3 `ready / Current actor=前端开发对话`，一次性修正当前页选择清理、两类弹窗 pending→rejected 焦点和发布意图分类恢复并补定向 DOM 回归；其余业务、视觉、等价矩阵和后端事实冻结。本轮只更新规划状态与日志，未修改生产代码、契约或 DESIGN，未提交、推送或部署。

## 2026-08-13 — FRONT-M3-01B Rev 2 数据完整性收口完成并交规划

### 单一发布与统一只读

- 正式“确认并导出”已删除前端 `confirmTermVersion`、旧 `ConfirmTermVersion*` 引用和确认后再创建导出的双请求，只消费共享 `PublishTermVersionBody` 并调用 `POST /api/projects/:projectId/terms/releases`；历史导出列表/下载和附加导出 API 保持不变。发布未知结果会保留完整请求体和幂等键，重试直接重放同一发布意图，恢复后端返回的原版本、模板与导出绑定。
- 页面统一以项目 `active`、活动草稿来源仍为最新公司 SRT 摘要、最新提取不为 `running` 作为候选/模板/发布写入资格；不满足时仍可读取证据、模板历史、不可变版本与历史 XLSX，但隐藏或禁用人工新增、编辑、裁决、批量、模板写入/启用、发布及失败重试。普通选择与部分/全量批量只包含 `pending`；`rejected` 只保留“恢复”，不能直接编辑或再次裁决。

### Cue 分页、视觉小修与验证

- 人工新增 Cue 改为服务端 `limit=30/offset` 分页，继续支持原文搜索和集数筛选；翻页、搜索与筛选变化只重置当前页，不清空已选 Cue ID，可从总量超过 30 的后页选择真实证据并与首页证据一起提交。
- 按 Impeccable 已指出范围，仅把 `.pageNotice` 与证据引用的单侧 `4px/3px` 粗色边改为统一细边框，未改已确认布局、视觉层级或业务交互。定向检测无输出。
- 最终 `pnpm exec vitest run tests/frontend/TermsWorkspace.test.tsx` 为 1 文件 13/13，通过发布未知结果同键重放、四类只读状态、非 pending 限制和 Cue 跨页保留；全部前端为 5 文件 41/41。前端 TypeScript 退出码 0，生产构建 145 模块通过，`git diff --check` 退出码 0。首次验证曾因测试把原生 `summary` 错按 `button` 查询而出现 1 项失败，改为标签定位后复跑全绿；生产行为未因此变更。未运行完整 `pnpm check`。
- `LOCAL_APP_PARITY.md` 仅更新多集 SRT 导入、术语人工审核、术语版本与导出三行；`CURRENT.md` 从 v4-039 更新为 v4-040，`FRONT-M3-01B` Rev 2 转为 `review / Current actor=规划对话` 并登记 FIFO 032。未修改后端、迁移、共享契约或 DESIGN，未接真实 AI/ASR/OCR/云资源，未提交、推送或部署；只通知规划总线。

## 2026-08-13 — 前端领取 FRONT-M3-01B Rev 2 术语数据完整性收口

- 完整重读项目协议、`CURRENT.md` v4-038、M3 术语契约、冻结 UI、功能等价矩阵及开发日志顶部，确认 `BACK-M3-01E` 已通过规划独立复验，正式发布唯一写入口为 `POST /api/projects/:projectId/terms/releases`。
- `CURRENT.md` 更新为 v4-039，任务转为 `in_progress`。本轮只消费共享 `PublishTermVersion*`、统一只读资格、限制 `pending` 选择/批量、补 Cue 服务端分页与跨页已选保留，并移除两处单侧粗色边；不修改后端、迁移、共享契约、DESIGN 或冻结视觉，不扩展后续模块。

## 2026-08-13 — 规划通过 BACK-M3-01E 并解锁前端术语收口

- 规划独立核对共用写门禁、候选仓储、发布仓储、正式路由和共享 schema，确认事务锁顺序、项目 `active`、活动草稿、最新已确认公司 SRT 摘要、运行中提取、候选合法转换、发布失败回滚及同键同参重放均与 M3 S1 契约一致；旧 `POST /terms/versions` 已无后端运行入口，历史附加导出/下载仍保持独立且不构成正式发布双轨。
- 独立执行术语专项 1 文件 11/11、共享契约构建、后端生产构建、`check:repo` 与 `git diff --check`，全部通过；完整 `pnpm check` 按 v4 留给 S1 最终关闭门。本地 PostgreSQL 已确认停止。
- 共享契约仍保留 `ConfirmTermVersion*`，当前仅供尚未收口的前端旧调用编译；它不对应已注册的后端写路由，定为 P3 过渡清理项。`FRONT-M3-01B` Rev 2 只移除前端引用，待调用者归零后由 S1 关闭门清理共享死类型，不为此新增一次跨角色返工往返。
- `CURRENT.md` 从 v4-037 更新为 v4-038，FIFO 031 关闭，`BACK-M3-01E` 标记 `done`；`FRONT-M3-01B` Rev 2 自动转为 `ready / Current actor=前端开发对话`，一次性完成单一发布、统一只读、pending 选择、Cue 分页、未知结果回归和两处视觉小修。未修改生产代码、迁移或 DESIGN，未提交、推送或部署。

## 2026-08-13 — BACK-M3-01E Rev 1 数据完整性收口完成并交回规划

### 权威写入门禁与状态转换

- 新增共用术语写门禁，在候选决定、批量逐项决定、人工新增及正式发布各自的数据库事务内，按同一顺序锁定最新素材清单、术语提取、项目和活动草稿；项目非 `active`、草稿非活动、草稿来源摘要不再匹配最新全部已校验公司 SRT，或项目仍存在 `running` 提取时，均以稳定领域错误阻断写入。证据/历史等只读接口未改变。
- 普通采用/驳回只允许 `pending→approved/rejected`，恢复只允许 `rejected→pending`；编辑继续形成 `edited`，但不能绕过恢复直接编辑已驳回项。批量接口仍逐项提交并返回局部成功/失败，非法状态不再被覆盖写入。

### 单一幂等发布事务

- 共享契约新增显式 `templateVersionId` 的单一发布请求/结果；正式 `POST /api/projects/:projectId/terms/releases` 在一个 PostgreSQL 事务中确认不可变 `TermVersion`、绑定不可变模板版本并创建 `TermExport`，版本命令和导出命令使用同一幂等键/请求摘要。
- 首次成功与同键同参重放返回相同 `versionId/exportId/templateVersionId`；同键异参或命中旧的非完整命令记录稳定返回幂等冲突。显式模板不存在时不写版本；导出插入失败会回滚版本、条目、草稿状态和命令记录，网络未知结果可用原键重试，不会留下已确认版本但无 XLSX，也不会生成重复版本/导出。
- 旧 confirm-only `POST /api/projects/:projectId/terms/versions` 不再注册；版本读取、历史附加导出与按 `exportId` 下载仍保留，但不再是正式确认的必经第二步。显式模板绑定不读取当前启用指针，因此模板启用项并发变化不会改写本次或历史导出。

### 验证、清理与范围

- `pnpm exec vitest run tests/backend/terms.test.ts`：1 文件 11/11 通过。新增回归覆盖 `recycled/purging`、来源变化、运行中提取、非法重复采用/驳回/恢复与驳回后直接编辑、批量局部结果、模板不存在、事务失败无半成品、同键重放相同 IDs、同键异参冲突、启用模板变化下的显式绑定，以及原 V1→新草稿→V2/历史下载不回归。
- `pnpm --filter @qimao-terms-cloud/contracts build`、`pnpm --filter @qimao-terms-cloud/backend build` 与最终 `git diff --check` 均退出码 0。没有新增迁移；测试清理钩子已删除匿名项目、临时失败触发器和非默认模板，本轮本地 PostgreSQL 已正常停止。
- 对照 `LOCAL_APP_PARITY.md`，本轮实际覆盖“术语人工审核”的后端只读门禁/状态机和“术语版本与导出”的原子发布边界；矩阵语义与完成状态仍由规划复验后统一写回，本轮未越权修改。未运行完整 `pnpm check`，未修改生产前端、DESIGN，未接真实 AI/ASR/OCR 或云资源，未提交、推送或部署。
- `CURRENT.md` 从 v4-036 最小合并为 v4-037；`BACK-M3-01E` Rev 1 转为 `review / Current actor=规划对话`，登记 FIFO 031。只通知规划总线，`FRONT-M3-01B` 保持 blocked，不由后端通知或解锁。

## 2026-08-13 — 后端领取 BACK-M3-01E Rev 1 数据完整性收口

- 完整重读项目协议、`CURRENT.md` v4-035、M3 术语契约与 UI 验收、功能等价矩阵和开发日志顶部，确认本轮只覆盖“术语人工审核”“术语版本与导出”两项同源数据完整性边界。
- `CURRENT.md` 更新为 v4-036，任务转为 `in_progress`。只补数据库事务内的项目/活动草稿/当前来源/运行提取/候选转换门禁，以及单一幂等版本发布与模板导出绑定；前端 Rev 2 保持 blocked，不修改生产前端、DESIGN，不接真实 AI/ASR/OCR 或云资源。

## 2026-08-13 — 规划退审 FRONT-M3-01B Rev 1 并合并收口路径

- 规划独立核对正式术语页、候选/版本/导出后端状态机、共享契约、M3 契约、UI 验收和功能等价矩阵；独立复跑 `TermsWorkspace.test.tsx` 1 文件 6/6 与前端生产构建 145 模块通过。通过证据证明已有主路径可运行，但没有覆盖不可编辑、来源过期、非法状态转换、发布中断和 Cue 超过首 30 条的边界。
- 确认三个数据完整性缺口：项目已回收、来源变化或提取运行时，前端仍留有编辑/批量/驳回/恢复/重试入口，后端候选写入也没有完整生命周期与来源兜底；非 `pending` 可被批量确认/驳回；“确认版本”和“创建导出”由浏览器分两次请求，网络在中间中断会留下已确认版本但无本次 XLSX。另确认人工新增 Cue 固定 `limit=30/offset=0` 无分页，不能保证选择任意真实证据。
- 按 Impeccable 审计运行一次正式术语目录检测，发现 `.pageNotice` 与证据引用使用单侧 `4px/3px` 粗色边两项视觉反模式；该项只并入下一次前端 CSS 小修，不单独制造 UI 往返。专项测试与构建仍通过，不推翻上述真实契约缺口。
- `M3-terms-workflow.md`、`M3-terms-acceptance.md` 与 `LOCAL_APP_PARITY.md` 已同步权威门禁：候选状态转换与项目/来源只读必须前后端共同执行，Cue 选择必须服务端分页，“确认并导出”必须由单一后端幂等事务原子保存版本和模板导出绑定。矩阵三行退回“开发中”，不把计划当作完成事实。
- `CURRENT.md` 更新为 v4-035，FIFO 030 关闭；发布 `BACK-M3-01E` Rev 1 `ready`，`FRONT-M3-01B` 更新为 Rev 2 `blocked`。后端通过后再由前端一次性补门禁、分页、单一发布契约与视觉小修，最后只送 UI 一轮真实浏览器终验；本轮未修改生产前端/后端/迁移/共享代码，未运行完整 `pnpm check`，未提交、推送或部署。

## 2026-08-13 — FRONT-M3-01B Rev 1 正式术语页完成并交规划

### 实际交付

- 新增正式项目术语路由与模块入口，页面按已确认 UI 集成来源/提取门禁、服务端搜索/四态/八类筛选和正式排序、紧凑候选表、证据侧栏、人工新增/编辑/确认/驳回/恢复及项目生命周期保护；“概览与素材”可直接进入术语模块，ASR/OCR 与画面字仍保持未启用。
- 人工新增只调用 `GET /api/projects/:projectId/terms/cues` 搜索当前活动草稿及来源约束下的真实 Cue，没有证据不能保存；部分批量逐项回显成功/失败，显式“全部待确认”跨当前筛选读取后端权威全量，任一失败停止版本与导出并只为失败项提供逐项重试。
- 零待确认或全量采用成功后按“采用 → 不可变版本 → 显式模板绑定导出”执行；公司模板固定 `type/name/aliases/gender/note` 五字段，只以新版本保存和显式启用。页面刷新调用 `GET /api/projects/:projectId/terms/versions/:versionId/exports` 恢复原 `exportId/templateVersionId/columns`，不缓存导出 ID、不按当前模板重建历史文件。
- `LOCAL_APP_PARITY.md` 仅写回“多集 SRT 导入 / 术语人工审核 / 术语版本与导出”三行的云端覆盖、行为差异、验证证据与剩余缺口；未提前实现真实 AI/ASR/OCR、完整前置审改、风险、播放器、字幕验收或交付。

### 验证与交接

- `pnpm exec vitest run tests/frontend/TermsWorkspace.test.tsx`：1 文件 6/6 通过，覆盖服务端正式查询、真实 Cue 人工新增、部分/全量局部失败门禁、版本→导出顺序、历史绑定恢复和五字段模板版本。
- `pnpm exec vitest run tests/frontend`：5 文件 34/34 通过；前端 TypeScript 检查退出码 0；生产构建 145 模块通过。Impeccable 最终定向检测与 `git diff --check` 均无输出。
- `CURRENT.md` 从 v4-033 更新为 v4-034，`FRONT-M3-01B` Rev 1 转为 `review / Current actor=规划对话` 并登记 FIFO 030。依约未运行完整 `pnpm check`，真实浏览器终验留规划后继路由；未修改后端、迁移、共享契约或 DESIGN，未提交、推送或部署，只通知规划总线。

## 2026-08-13 — 前端领取 FRONT-M3-01B Rev 1 正式术语页

- 完整重读项目协议、`CURRENT.md` v4-032、M3 术语契约、已确认 UI、职责矩阵术语行、功能等价矩阵与新增本地应用等价要求；确认 `BACK-M3-01D` 已补齐人工新增真实 Cue 选择和历史导出绑定刷新恢复两项权威只读接口。
- `CURRENT.md` 更新为 v4-033，`FRONT-M3-01B` Rev 1 转为 `in_progress`。实现范围只覆盖多集 SRT 术语来源、术语人工审核、术语版本与导出三行，不提前实现 ASR/OCR、完整前置审改、播放器、字幕验收或交付；不修改后端、迁移、共享契约或 DESIGN。

## 2026-08-13 — 规划建立双应用等价门禁并通过 BACK-M3-01D

- 用户明确最终网站必须掌握并覆盖两个本地应用的基本全部功能，允许按第一性原理优化行为路径、交互和实现方式，但已有核心能力必须能够实现。
- 规划只读核对 `apps/short-drama-terms-workbench` 的 README、机器可读 `compatibility/feature_contracts.json`，以及 `apps/short-drama-subtitle-review` 的完整 README 与桌面核心/自测文件清单；确认现有云端主链路正确，但“仅作参考”和“内部版暂不阻塞”的文字不足以防止未来静默删减。
- `PRODUCT.md` 新增双应用功能等价硬门禁；新建 `docs/contracts/LOCAL_APP_PARITY.md`，分列审改/术语和字幕验收的来源保护、识别审改、风险/学习、播放器、时间轴、字幕编辑、冻结验收与导出恢复等能力域及当前状态。`WORKFLOW.md` 要求后续任务立项/关闭映射矩阵并写回差异与证据；两周内部版仍可分阶段，但未开始能力不能被当作永久非目标。
- 按 FIFO 029 独立核对 `BACK-M3-01D` 的共享 schema、路由、Cue 只读仓储、版本导出列表及回归；独立执行术语专项 1 文件 9/9、共享契约构建、后端生产构建和 `git diff --check` 均通过，随后本地 PostgreSQL 已停止。
- `CURRENT.md` 更新为 v4-032；`BACK-M3-01D` 关闭，`FRONT-M3-01B` 原 Rev 1 恢复为 `ready`，并新增当前术语切片的功能等价矩阵写回要求。本轮未修改生产前端、业务后端、迁移、共享契约或 DESIGN，未提交、推送或部署。

## 2026-08-13 — BACK-M3-01D Rev 1 权威只读契约完成并交回规划

### 实际交付

- 在共享术语契约增加 Cue 查询参数、Cue/分页结果与术语版本导出列表 schema。`GET /api/projects/:projectId/terms/cues` 强制 `draftId`，先核对草稿归属与 `active` 状态，再只读取该草稿 `sourceSrtSetDigest` 对应 Cue；支持原文包含搜索、集数、`limit/offset`，数据库按 `episodeNumber/cueIndex/id` 确定排序并返回独立 total。
- 新增单一 `TermCueRepository` 作为 PostgreSQL 只读边界，响应只含 `cueId/assetId/episodeNumber/cueIndex/startMs/endMs/text`。跨项目草稿返回 404，已确认或失效草稿返回 409；返回的 Cue ID 可直接通过既有人工新增接口的当前来源校验。
- `GET /api/projects/:projectId/terms/versions/:versionId/exports` 只从 `term_exports` 与不可变模板版本读取该术语版本的全部既有绑定，按 `createdAt DESC,id DESC` 排序；返回原 `exportId/templateVersionId/columns`，不创建、重建或改写导出。

### 验证、清理与边界

- `pnpm exec vitest run tests/backend/terms.test.ts`：1 文件 9/9 通过。新增回归覆盖跨项目、跨来源和非活动草稿隔离，原文搜索、集数、跨分页顺序、空结果、Cue 人工新增；并覆盖导出列表恢复原绑定、模板切换后历史绑定/下载稳定及读取不增加导出记录。
- `pnpm --filter @qimao-terms-cloud/contracts run build`、`pnpm --filter @qimao-terms-cloud/backend run build` 和最终 `git diff --check` 均退出码 0。本轮本地 PostgreSQL 已正常停止，专项清理钩子已清除匿名项目和非默认模板。
- `CURRENT.md` 从 v4-030 最小合并为 v4-031；`BACK-M3-01D` Rev 1 转为 `review / Current actor=规划对话`，登记 FIFO 029。依据职责矩阵“术语”行，未新增迁移，未修改前端、DESIGN、术语状态机或既有写入语义，未运行完整 `pnpm check`，未提交、推送或部署；只通知规划总线，`FRONT-M3-01B` 保持 blocked。

## 2026-08-13 — 后端领取 BACK-M3-01D Rev 1 权威只读契约补充

- 完整重读项目协议、`CURRENT.md` v4-029、M3 术语契约、职责矩阵术语行与开发日志顶部，确认前端提出的 Cue 选择和历史导出恢复缺口已经规划核对成立。
- `CURRENT.md` 更新为 v4-030，任务转为 `in_progress`。本轮只补活动草稿/来源摘要约束的 Cue 查询，以及按术语版本读取既有导出绑定；不新增迁移，不修改前端、DESIGN、术语状态机或既有写入路径，完成后只交规划总线。

## 2026-08-13 — 规划接受前端术语读取契约冲突并拆出最小后端补充

- 规划独立核对共享 schema、正式 Fastify 路由、工作区/版本投影、候选仓储和导出仓储，确认 `FRONT-M3-01B` 报告的两项缺口均成立：人工新增强制真实 `evidenceCueIds`，但没有查询任意来源 Cue 的入口；导出读取必须预先知道 `exportId`，但没有按 `termVersionId` 恢复历史绑定的入口。
- 裁决禁止前端复用其他候选证据、缓存导出 ID 或按当前模板重建历史文件。该问题属于已确认 S1 内的代码契约/数据所有权缺口，不需要用户重新选择产品方向；前端原 Rev 1 保持 `blocked` 且已完成部分冻结。
- 新增 `BACK-M3-01D` Rev 1：不做迁移，只增加受活动草稿及其 `sourceSrtSetDigest` 约束的 Cue 搜索/集数筛选/分页只读 API，以及按 `projectId + termVersionId` 确定性列出现有导出绑定的 API；回归覆盖隔离、分页顺序、人工新增可用性和切换模板后的历史恢复。
- `CURRENT.md` 更新为 v4-029，并登记 FIFO 028 已关闭；后端补充通过规划独立复验后，再自动恢复 `FRONT-M3-01B`。未修改生产前端、后端、迁移、共享契约或 DESIGN，未提交、推送或部署。

## 2026-08-13 — FRONT-M3-01B Rev 1 提交术语契约与刷新恢复冲突审查

### 冲突类型与当前依据

- 冲突类型为代码契约与权威数据所有权。依据 `M3-terms-workflow.md`、`DESIGN.md` 5.4、UI Rev 3 和职责矩阵术语行，正式前端必须支持“人工新增关联真实 SRT 证据”和“历史导出绑定原模板且刷新后恢复”，不得用浏览器缓存、现有候选证据或当前模板猜测。
- 前端在领取后只读映射全部共享术语 schema、正式 Fastify 路由、工作区投影、候选仓储和导出仓储；尚未修改生产代码或前端测试。

### 可复现证据与影响

- `CreateManualTermCandidateBodySchema` 强制 `evidenceCueIds` 至少 1 项；正式路由只有候选详情返回该候选已经绑定的 Cue，没有按项目/草稿查询或搜索真实 `term_cues` 的 API。人工新增遗漏术语时无法从权威来源选择任意字幕证据，复用其他候选证据会制造错误关联。
- PostgreSQL `term_exports` 和 `TermExportSchema` 持有 `termVersionId/templateVersionId/exportId`，但 `TermWorkspaceSchema`、`TermVersionSchema` 不投影导出绑定；正式 GET/下载路由均要求调用方预先知道 `exportId`，且没有按 `termVersionId` 列出导出的入口。刷新后浏览器无法恢复历史导出 ID 和原模板绑定；缓存 ID 会成为第二状态源，用当前启用模板重建则可能改变历史结构。
- 两项缺口直接阻断人工新增、模板绑定导出、历史重新下载和刷新恢复四个必验路径。其余候选筛选/裁决虽可单独编码，但会形成无法完成验收的半套正式页面，因此按协议停止。

### 最小建议、继续边界与路由

- 最小建议一：后端提供受当前草稿/来源摘要约束、可分页搜索的真实 SRT Cue 只读契约，返回 `cueId/集数/轴号/时间/原文`，供人工新增明确选择。
- 最小建议二：在工作区/版本投影加入已绑定导出摘要，或提供按 `projectId + termVersionId` 查询导出列表/当前正式导出的接口，使刷新后能从 PostgreSQL恢复 `exportId` 与原模板版本并下载历史结构。
- `CURRENT.md` 更新为 v4-028；`FRONT-M3-01B` 保持 Rev 1，转为 `blocked / Current actor=规划对话`。前端只通知规划总线，不直接联系后端/UI；未实现真实 AI/ASR/OCR 等越界功能，未提交、推送或部署。

## 2026-08-13 — 前端领取 FRONT-M3-01B Rev 1 正式术语纵切

- 前端开发对话完整重读项目协议 v4、`CURRENT.md` v4-026、M3 术语契约、`DESIGN.md` 5.4、UI Rev 3 验收、职责矩阵术语行及开发日志顶部，确认 UI 与术语/模板后端依赖均已通过且任务为 `ready`。
- 按 v4 规则只把任务改为 `in_progress`，不机械增加任务 Rev；范围仅为 `frontend/src/features/terms/`、必要 App 路由/模块注册/AppShell 标题和前端测试，PostgreSQL/API 继续作为候选、状态、版本和模板的唯一权威来源。
- 使用 Impeccable 的既有 Operate 工作台规则约束一致性、状态和可访问性，但不改写已确认 UI；不实现真实 AI/ASR/OCR、密钥控制台、视频播放器、任务中心或账号，不修改后端、迁移、共享契约或 DESIGN，不提交、推送或部署。

## 2026-08-13 — 用户确认术语 UI 并解锁正式前端集成

- 用户确认 `UI-M3-01` Rev 3 最终增量方向；规划将 UI 任务标记 `done`。已确认范围包括术语正式排序与证据、候选四态、选择全部待确认、一键全部采用并导出、局部失败原子门禁与唯一重试，以及公司五字段模板不可变版本管理。
- `BACK-M3-01A` 与 `BACK-M3-01C` 已先后通过规划独立复验，因此 `FRONT-M3-01B` 的全部依赖同时满足；任务从 `blocked` 解锁为 `ready / Current actor=前端开发对话`。
- 前端只允许实现 `frontend/src/features/terms/`、必要路由/模块注册和前端测试，并消费后端权威状态与显式导出绑定；完成后必须回到规划总线审核，不得直接通知 UI。真实 AI/ASR/OCR、播放器、密钥控制台、任务中心、账号权限、提交、推送和部署继续不在范围内。
- `CURRENT.md` 更新为 v4-026；本轮只更新状态与日志，未修改生产前端、后端、迁移、共享契约或 DESIGN。

## 2026-08-13 — 规划关闭 UI 证据复核与后端导出契约返工

- 按 FIFO 先审 `UI-M3-01` Rev 3：人工查看 `rev3-1440-template-fields-current.png` 与 `rev3-1440-bulk-failure-with-retry.png`，确认模板只显示 `type/name/aliases/gender/note`，局部失败同屏显示未创建版本/文件、具体并发原因和唯一“重试”。证据与当前契约一致，队列 026 关闭；任务路由用户只做最终增量方向确认，尚未标记 `done`。
- 再审 `BACK-M3-01C` Rev 2：代码核对确认 `TermExportTemplateColumnSchema` 的嵌套对象已严格关闭，旧无绑定 `/versions/:versionId/export.xlsx`、`exportVersion` 和 `defaultTemplate` 生产路径不存在，默认五列下载只走显式导出绑定。
- 规划独立运行 `pnpm run db:setup`、`pnpm exec vitest run tests/backend/terms.test.ts`（1 文件 8/8）、共享契约构建、后端生产构建和 `git diff --check`，全部退出码 0；随后 `pnpm run db:stop` 成功。队列 027 与 `BACK-M3-01C` 关闭；未运行完整 `pnpm check`，留给 S1 关闭门。
- `CURRENT.md` 更新为 v4-025。`FRONT-M3-01B` 仍未解锁，当前只等待用户确认 `UI-M3-01` 最终增量方向；未修改生产前端、业务后端、迁移、DESIGN，未提交、推送或部署。

## 2026-08-13 — BACK-M3-01C Rev 2 定向返工完成并交回规划

### 实际修正

- `TermExportTemplateColumnSchema` 的嵌套列对象增加 `additionalProperties: false`；API 回归分别提交 `formula`、`style` 和任意未声明配置，三类请求均返回 400，模板列表仍只有默认版本，证明请求被拒绝而非静默丢弃后保存。
- 删除无生产调用者的旧 `/api/projects/:projectId/terms/versions/:versionId/export.xlsx` 路由、`exportVersion` 服务方法和 `defaultTemplate` 仓储方法；代码扫描在后端与术语专项中不再发现这些符号。
- 默认五列表头、条目顺序、无示例行和重复下载字节一致性断言，统一改走“创建显式 `TermVersion + TemplateVersion` 导出绑定 → 按 exportId 下载”的正式链路。Rev 1 的迁移、表结构、模板启用、历史导出及术语状态机没有改动。

### 验证、清理与边界

- `pnpm exec vitest run tests/backend/terms.test.ts`：1 文件 8/8 通过。
- `pnpm --filter @qimao-terms-cloud/contracts run build` 与 `pnpm --filter @qimao-terms-cloud/backend run build`：均退出码 0；`git diff --check` 退出码 0。
- 专项 `afterAll` 已清理匿名项目及非默认模板，本轮启动的本地 PostgreSQL 已正常停止。按任务边界未运行完整 `pnpm check`，留给 S1 关闭门。
- 并行 UI 写回后重读 `CURRENT.md` v4-023，并最小合并为 v4-024；`BACK-M3-01C` Rev 2 转为 `review / Current actor=规划对话`，登记 FIFO 027。未修改迁移、候选/草稿/术语版本、项目生命周期、生产前端或 DESIGN，未提交、推送、部署或解锁前端；只通知规划总线。

## 2026-08-13 — UI 完成 UI-M3-01 Rev 3 最终证据刷新并交回规划

- 通过独立本机端口和 `?preview=1&rev=3-20260813` 强制加载仓库外当前原型，排除旧缓存。新模板证据 `rev3-1440-template-fields-current.png` 的 DOM 与画面均只含 `type/name/aliases/gender/note`，旧 `content/notes=false`。
- 当前失败样例原有具体原因但没有明确行级“重试”按钮。只在仓库外取证原型做最小呈现修正：将失败样例放到首行，并把该失败行的唯一主操作从普通“确认”改为“重试”。新证据 `rev3-1440-bulk-failure-with-retry.png` 同屏显示顶部“未创建 V1、未生成 XLSX”、叶知秋行具体并发更新原因和唯一“重试”；DOM 为 `retryCount=1 / confirmCount=0`。
- 模板与失败两态控制台均为 `error/warn=0/0`；仓库外 `app.js` 的 `node --check`、授权文档 `git diff --check` 通过。最终证据路径和实测已写入 `docs/ui/M3-terms-acceptance.md`；DESIGN 语义、生产前端、后端、迁移、共享契约及 Rev 2 其他冻结证据均未修改。
- 并行后端写回后重读 `CURRENT.md` v4-022，并最小合并为 v4-023；`UI-M3-01` 保持 Rev 3，转为 `review / Current actor=规划对话`，登记 FIFO 026。UI 只通知规划总线，不通知前端、不自行解锁 `FRONT-M3-01B`。

## 2026-08-13 — 后端领取 BACK-M3-01C Rev 2 定向返工

- 重读项目协议、`CURRENT.md` v4-021 与开发日志顶部，确认 Rev 1 的迁移、模板/导出表、显式绑定、历史确定性下载及术语主体证据冻结；本轮只收紧嵌套列请求边界，并移除无生产调用者的旧无绑定直出路径。
- `CURRENT.md` 更新为 v4-022，任务转为 `in_progress`。不修改迁移、候选/草稿/术语版本、项目生命周期、生产前端或 DESIGN；完成后只交规划总线复验。

## 2026-08-13 — UI 领取 UI-M3-01 Rev 3 最终证据刷新

- 重读 `CURRENT.md` v4-020、术语 UI 验收记录与开发日志顶部，确认规划已冻结 Rev 2 的 DESIGN、交互逻辑、模板窗口、键盘及 1024/1440 测量；本轮只刷新模板字段和局部失败两张最终截图并排除旧缓存。
- `CURRENT.md` 更新为 v4-021，任务保持 Rev 3 并转为 `in_progress`。不修改 DESIGN 语义、生产前端、后端、迁移或共享契约；只有当前原型无法呈现既定证据时才允许最小仓库外取证修正。

## 2026-08-13 — 规划审核 UI-M3-01 Rev 2 并只退最终证据同步

- 规划按 Impeccable `audit` 完成一次有界审计：`DESIGN.md` 与验收矩阵中的当前页/全部待确认范围、唯一主动作、批量局部失败、模板不可变版本、键盘焦点、1024/1440 滚动归属和模块边界均与 M3 契约一致。仓库外原型的当前 `fieldLabels` 明确为 `type/name/aliases/gender/note`；机械检测返回 `[]`，但因本机缺 HTML 解析模块为正则降级，只作辅助。
- 三张证据图人工核对发现两个证据完整性缺口：`rev2-1440-template-manager.png` 仍显示旧 `content/notes`，与当前原型、DESIGN、验收文字及共享契约的 `name/note` 直接矛盾；`rev2-1024-bulk-failure.png` 只展示顶部整批结论，没有展示验收文字所声称的失败行具体原因和唯一重试入口。
- 任务更新为 `UI-M3-01` Rev 3 `ready`，只刷新这两张与当前代码一致的最终证据并核对浏览器无旧缓存；Rev 2 的设计、交互、测量、键盘、正常全量截图和其他证据冻结。`CURRENT.md` 更新为 v4-020；前端继续阻塞，UI 仍只通过规划总线交接。

## 2026-08-13 — 规划独立复验 BACK-M3-01C Rev 1 并合并双路径契约返工

### 独立通过证据

- 规划逐项核对共享五字段契约、增量迁移、模板仓储、服务/路由、XLSX 生成和术语专项：公司模板版本、单例启用指针、条件启用、模板/导出幂等命令、`TermVersion + TemplateVersion` 显式绑定、不可更新触发器和确定性历史下载主链路与 S1 契约一致。
- 独立执行 `pnpm run db:setup` 后，13 个迁移成功；术语专项 `tests/backend/terms.test.ts` 为 1 文件 8/8，共享契约构建、后端生产构建和 `git diff --check` 均退出码 0。项目永久清理删除 `term_versions` 时由外键级联删除项目导出/命令，不影响公司级模板。随后本地 PostgreSQL 已正常停止。

### 一次性退审与停止边界

- P2 契约严格性：`TermExportTemplateColumnSchema` 的嵌套对象未设置 `additionalProperties: false`。规划用共享 schema 实测携带 `{ formula: '=1' }` 的列仍返回 `acceptsUndeclaredColumnConfig=true`；服务会静默丢弃该字段，与“首版不实现公式/样式/任意配置”的边界冲突，也会误导未来前端认为保存成功。
- P2 单一路径：正式后端同时保留显式“创建导出绑定 → 按 exportId 下载”和旧 `/versions/:versionId/export.xlsx` 无绑定直出。代码扫描确认旧路由只有后端测试调用；启用自定义模板后它仍固定读取默认 v1，既不创建审计绑定，也与 UI 的当前模板语义不一致。
- 两项属于同一个导出契约收口根因，合并为 `BACK-M3-01C` Rev 2：严格拒绝嵌套未声明配置，并删除/停用无真实调用者的旧无绑定路由，默认模板回归统一走显式绑定链路。Rev 1 迁移、数据模型、模板启用、历史字节稳定与数据库快照证据全部冻结；不重写状态机、不运行完整 `pnpm check`、不修改 UI/前端或解锁 `FRONT-M3-01B`。`CURRENT.md` 更新为 v4-019。

## 2026-08-13 — UI 完成 UI-M3-01 Rev 2 并交回规划

- 在 Rev 1 用户已确认的术语工作台结构上完成唯一增量方向：当前页选择后显式提供“选择全部 N 项待确认候选”；部分选择保留批量确认/驳回；权威全量态收起普通批量动作，只保留“全部采用并导出 XLSX”；零待确认页首主操作统一为“确认并导出”。
- 全量路径的确认框绑定来源摘要、待处理数量和当前模板版本；局部失败状态明确“未创建版本、未生成 XLSX”，同时保留成功项真实状态并在失败行显示稳定原因。公司模板窗口只允许编辑模板名和 `type/name/aliases/gender/note` 五个固定字段的表头/顺序，支持保存新版本、保存并启用、历史只读与旧版本启用，不形成任意列设计器。
- 只更新 `DESIGN.md`、`docs/ui/M3-terms-acceptance.md` 和仓库外 `m3-terms-rev2/` 原型/3 张证据；未修改生产前端、后端、迁移、共享契约、ASR/OCR、播放器、账号或任务中心。
- 真实浏览器验证：1440 根页面 `1425/1425`；1024 Windows 滚动槽下根页面 `1009/1009`，侧栏展开 `204px` 与收起 `72px` 时表格 `1040/759`、`1040/891`，横滚只在 `.tableWrap`；模板窗口 1024 为 `760/760`。全量选择显式升级、原子门禁、局部失败逐项提示、模板字段/历史与 Tab/Shift+Tab/Escape 闭环均通过，控制台 `error/warn=0/0`；仓库外脚本 `node --check` 与授权文档 `git diff --check` 通过。
- `CURRENT.md` 更新为 v4-018；`UI-M3-01` 保持 Rev 2，转为 `review / Current actor=规划对话`，登记 FIFO 024。UI 只通知规划总线，不直接通知前端、不自行解锁 `FRONT-M3-01B`。

## 2026-08-13 — UI 领取 UI-M3-01 Rev 2

- 重读项目协议 v4、`CURRENT.md` v4-015、M3 术语契约 5/7/9、职责矩阵术语行、`DESIGN.md` 5.4、既有 M3 UI 验收记录与开发日志顶部；确认 Rev 1 整体方向已获用户通过，本轮只补全部待确认选择升级、一键采用/导出门禁及公司级五字段模板版本窗口。
- 按 v4 将任务改为 `in_progress`，保留 Rev 2；只允许修改 `DESIGN.md`、`docs/ui/M3-terms-acceptance.md` 和仓库外原型/截图，不修改生产前端、后端、迁移或共享契约。
- 采用 Impeccable harden 约束处理全量选择歧义、批量局部失败、导出原子门禁、模板字段唯一性、历史版本只读和键盘焦点；不扩展到 ASR/OCR、播放器、账号、任务中心或任意列设计器。

## 2026-08-13 — BACK-M3-01C Rev 1 完成并交回规划

### 实际交付

- 新增共享模板/导出契约：五个固定字段 `type/name/aliases/gender/note`、字段—显示表头、不可变模板版本、当前启用版本、显式导出绑定及创建/启用请求；不暴露任意字段、公式或样式配置。
- 新增 1 个增量迁移：公司级模板版本、单例启用指针、模板幂等命令、术语导出绑定及导出幂等命令共 5 张表；默认 v1 固定为 `类型、中文内容、别称、性别、备注`。数据库约束保证五字段各一次、名称/表头非空，模板版本和导出绑定禁止更新。
- 新增模板列表、幂等保存新版本、条件启用 API，以及已确认 `TermVersion + TemplateVersion` 的幂等导出绑定、元数据和 XLSX 下载 API。模板启用只更新单例指针；旧版本保留，历史下载继续引用原模板版本。
- XLSX 生成器按模板列顺序读取固定五字段数据，不改变数据类型、别称分隔、空值和术语条目排序；原默认五列下载入口明确读取默认模板 v1，保持 `BACK-M3-01A` 已通过行为。

### 验证与清理

- 术语专项 `tests/backend/terms.test.ts` 为 1 文件 8/8：覆盖默认模板、重复/缺失字段 422、模板保存幂等、数据库不可更新、旧版本保留、新版本条件启用、导出绑定幂等、历史元数据、同一导出重复下载字节一致及自定义表头/顺序。
- 专项在模板启用和两种导出前后比较候选、草稿、术语版本和版本条目的完整 PostgreSQL JSON 快照，结果逐字段完全一致；启用 v2 后重新下载 v1 历史导出，字节保持一致。
- 后端生产构建、共享契约构建和 `git diff --check` 均通过。独立临时库从零执行 13 个迁移，核对 5 张导出相关表、2 个不可变触发器、默认 v1 和启用指针后已删除。
- 主库最终 `projects/term_exports/term_export_commands/term_export_template_commands` 均为 0，只保留迁移创建的默认模板 v1 且正确启用；本地 PostgreSQL 已停止。按 v4 未运行完整 `pnpm check`，留给 S1 关闭门。

### 边界与交接

- 依据职责矩阵“项目工作台 / 术语”行，仅修改共享模板契约、必要迁移、术语后端模块及后端测试；`BACK-M3-01A` 保持 done，没有修改候选、草稿、术语版本、上传或回收语义。
- 未修改生产前端/DESIGN，未实现任意字段、公式/样式设计器、账号审批、多租户或真实 AI/ASR，未提交、推送、部署或创建云资源。
- `BACK-M3-01C` 保持 Rev 1，转为 `review / Current actor=规划对话`；当前只通知规划独立复验，不直接通知或解锁前端。

## 2026-08-13 — 规划关闭 BACK-M3-01A Rev 2，并拆分一键采用与版本化模板任务

### 后端独立复验

- 规划独立核对 `term-candidate.repository.ts` 与术语 API 回归：人工新增只规范化名称一次，全空白名称在写库前返回 `422 / TERM_CANDIDATE_INVALID / edit_candidate`；失败后沿用原草稿修订可正常新增，证明错误请求没有推进修订。跨类型同名由草稿级唯一约束稳定返回 `409` 和准确文案。
- 本轮重新启动本地 PostgreSQL 后，术语专项 `tests/backend/terms.test.ts` 为 1 文件 8/8；后端生产构建成功，`git diff --check` 通过。随后已正常停止本地 PostgreSQL。Rev 1 的迁移、来源、证据、四态、不可变事件/版本和 XLSX 证据继续冻结，完整 `pnpm check` 留给 S1 切片关闭。
- `BACK-M3-01A` Rev 2 标记 `done`；队列 023 关闭。新增导出模板属于独立产品范围，不回开已经通过的术语核心任务。

### 用户确认与范围裁决

- 用户确认 Rev 1 术语页整体方向，并要求在 AI 候选质量足够时无需逐条确认：从当前页选择可显式扩展为本草稿全部待确认候选，随后一次完成全部采用、不可变版本创建和 XLSX 下载。局部失败必须保留真实逐项结果，但停止版本创建和导出；已驳回项不得被静默采用。
- 用户要求表头可通过模板编辑并由后端保存。规划把首版收敛为公司级、版本化的五字段表现模板：只允许改模板名称、`类型/中文内容/别称/性别/备注` 五字段的显示表头与列顺序；不允许删除字段、增加任意业务字段或改变术语数据。保存形成不可变模板版本，历史导出绑定原模板版本。
- `M3-terms-workflow.md`、职责矩阵和 M3 冲刺里程碑已同步上述边界；`CURRENT.md` 更新为 v4-014。`UI-M3-01` Rev 2 与独立 `BACK-M3-01C` Rev 1 受控并行，前者只更新已通过原型，后者只实现模板版本/导出后端；`FRONT-M3-01B` 继续阻塞，等待两项分别验收，不提前写占位实现。

## 2026-08-13 — BACK-M3-01A Rev 2 定向返工完成并交回规划

- 完整重读项目协议、`CURRENT.md` v4-011 与开发日志顶部，确认唯一后端可执行项是规范名输入边界返工；生产代码只修改 `backend/src/modules/terms/term-candidate.repository.ts`，测试只修改 `tests/backend/terms.test.ts`。
- `createManual` 现在只计算一次 trim 后的规范名，并在任何候选写入前拒绝空串，返回稳定 `422 / TERM_CANDIDATE_INVALID / edit_candidate`；数据库 `23505` 映射文案统一改为“同一草稿中已存在相同中文术语的候选”，准确覆盖跨类型同名约束。
- API 回归证明全空白名称不会落到通用 500，且不会增加草稿修订；随后同修订可正常人工新增。再以最新修订跨类型新增相同中文术语，稳定返回 `409 / TERM_CANDIDATE_INVALID / edit_candidate` 和准确文案。
- 定向术语专项 `tests/backend/terms.test.ts` 为 1 文件 8/8；后端生产构建退出码 0，`git diff --check` 无输出。按 v4 未运行完整 `pnpm check`；主库 `projects/term_candidates` 均为 0，本地 PostgreSQL 已停止。
- Rev 1 已通过的来源、提取、候选四态、事件、版本、XLSX、迁移、上传和回收证据全部冻结；未修改共享契约、其他术语状态机、前端/DESIGN，未提交、推送、部署或通知前端。任务保持 Rev 2，转为 `review / Current actor=规划对话`。

## 2026-08-13 — 规划完成 BACK-M3-01A Rev 1 独立复验并合并一次输入边界返工

### 独立通过证据

- 规划代码审查确认：最新清单全部 `company_srt` 必须绑定已校验 SRT Asset；对象字节会再次核对大小和 SHA-256；`sourceSrtSetDigest` 只由集数、Asset ID 和内容校验构成，视频变化不会使术语过期；SRT 解析保留稳定 Cue，候选必须引用真实 Cue。
- 独立启动本地 PostgreSQL 后，术语专项 `tests/backend/terms.test.ts` 为 1 文件 8/8；全部后端为 6 文件 51/51。共享契约构建、后端生产构建和 `check:repo` 均退出码 0；术语范围未发现外部网络调用或供应商密钥模式。
- 规划新建隔离数据库 `qimao_terms_cloud_audit_v4010` 从零执行全部 12 个迁移，查询得到 `12` 个迁移记录、`11` 张 `term_*` 表和 `3` 个不可变触发器；随后已删除该隔离数据库。本轮启动的本地 PostgreSQL 已正常停止。
- 规划从正式 `createTermVersionXlsx` 生成匿名两行样本，使用标准表格工具实际导入并渲染成功：仅 `Sheet1`，五列为 `类型、中文内容、别称、性别、备注`，人名先于地名，别称以 ` / ` 分隔，非人名性别为空，公式错误扫描为 0。该样本只保存在当前规划任务仓库外验收目录，不进入源码或交付。

### 合并缺口与定向路由

- 首轮代码审查发现一个 P2 输入边界：人工新增请求的 `name` 只在共享 schema 检查原始长度；`TermCandidateRepository.createManual` 将全空白字符串 `trim()` 后直接写入数据库，会触发 `term_candidates_values_valid`，再由全局错误处理误报为可重试 `500 INTERNAL_ERROR`，而不是员工可修正的稳定业务错误。
- 同一名称唯一性已经由数据库按 `draft_id + name` 强制，但现有 `23505` 文案仍写“相同类型和名称”，会在跨类型同名时误导员工。两项属于同一规范名输入/唯一性根因，合并为一次 Rev 2，不拆散成多轮。
- `BACK-M3-01A` 更新为 Rev 2 `ready / Current actor=后端开发对话`：只允许修改候选仓储与术语专项测试，补全空白名称 `422 TERM_CANDIDATE_INVALID` 和跨类型同名准确文案/API 回归；Rev 1 的来源、提取、事件、版本、XLSX、迁移、回收及零付费证据全部冻结。`FRONT-M3-01B` 继续阻塞。

## 2026-08-13 — BACK-M3-01A Rev 1 完成并交回规划

### 实际交付

- 按职责矩阵“项目工作台 / 术语”行新增唯一共享代码契约 `packages/contracts/src/terms.ts` 和 Fastify 术语 API：来源/运行/草稿/版本投影、候选分页/搜索/状态与类型筛选/确定性排序、候选详情与证据/审计、人工裁决与新增、批量局部结果、草稿克隆、版本确认和 XLSX 下载。所有业务错误沿用统一请求标识结构。
- 新增 3 个术语增量迁移，PostgreSQL 持有 `TermExtractionRun`、稳定 Cue、草稿候选、真实证据、不可更新的人工事件、不可更新的已确认版本快照和幂等命令；同一草稿中的名称保持单一正式类型。整项目永久清理仍可按依赖顺序删除这些审计记录，不阻塞既有 Asset 清理。
- 最新已确认清单中的全部 `company_srt` 必须绑定已校验 Asset；后端通过最小 `UploadStorage.readObject` 只读边界逐对象核对大小和 SHA-256，再按集数、Asset ID 和内容校验值生成 `sourceSrtSetDigest`。只修改视频保持摘要，修改公司 SRT 明确标记来源过期。
- SRT 严格解析 UTF-8、轴号、时间范围和非空原文，并以 Asset/集数/轴号/起止时间/原文生成稳定 Cue ID；单文件单轴错误会精确失败并保存 failed 提取运行，不能跳过坏文件。
- 交付前把稳定 Cue 持久化收口为 `jsonb_to_recordset` 单次集合写入，避免 50–100 集素材按 Cue 逐条往返数据库；不改变 Cue 身份、事务或失败语义。
- `TermExtractionAdapter` 可替换；本任务默认实现只识别匿名测试标记的确定性 fake，配置明确 `paid=false`、用量 `paidCalls=0`，没有网络调用、供应商 SDK 或密钥。adapter 输出仍须经过八类、名称唯一、置信度和真实 Cue 证据校验，失败项只记诊断，不能成为权威候选。
- 候选支持 `pending/approved/edited/rejected`、人工新增/修改/驳回/恢复、候选条件版本和草稿条件版本；批量确认/驳回逐项事务并返回局部结果。全部离开 pending 且来源仍匹配后才能幂等生成不可变 V1；从 V1 建立新草稿后再次显式确认生成 V2，不覆盖 V1。
- 正式 XLSX 只从已确认版本生成 `类型、中文内容、别称、性别、备注` 五列；八类顺序、人名优先、同类首次证据顺序、` / ` 别称分隔、非人名空性别和无示例行均由后端固定。

### 验证与清理

- 集合写入优化后重新运行术语专项 `tests/backend/terms.test.ts`：1 文件 8/8 通过，覆盖双集全部就绪、视频/SRT 两类来源变化、坏轴失败运行、八类真实证据、服务端分页筛选排序、条件裁决/恢复/人工新增、批量局部失败、事件不可更新、V1→V2、不变快照、五列 XLSX 和项目到期清理兼容。
- 最终全部后端测试：6 文件 51/51 通过；独立回收专项：1 文件 7/7 通过。后端生产构建、共享契约构建和后端静态检查均退出码 0。
- `pnpm run check:repo`、后端 lint、`git diff --check` 通过；术语范围密钥模式扫描 0 命中。按 v4 质量门未运行完整 `pnpm check`，留给 S1 切片关闭统一执行。
- 进程唯一临时 PostgreSQL 数据库从零执行 12 个迁移，核对 11 张术语表和 3 个不可变触发器后立即删除；主库最终 `projects/term_runs/term_drafts/term_versions/term_cues` 均为 0，本地 PostgreSQL 已停止。

### 边界与交接

- 唯一跨目录生产边界是 `UploadStorage.readObject`/内存 fake 的只读实现、应用术语路由注册，以及项目永久清理时先删除术语依赖；上传写入、分片、完成和 Asset 绑定未重构。
- 未调用真实 AI/ASR，未写入、返回或记录密钥，未修改生产前端/DESIGN，未实现 OCR、视频播放器、任务中心、管理员控制台或账号；未修改根级依赖，未提交、推送、部署或创建云资源。
- `BACK-M3-01A` 保持 Rev 1，更新为 `review / Current actor=规划对话`。当前只请求规划独立复验；后端未直接通知或解锁 UI/前端。

## 2026-08-13 — 规划通过 UI-M3-01 Rev 1 交接审计并路由用户方向验收

### 审计结论

- 规划逐项核对 `DESIGN.md` 5.4、`docs/ui/M3-terms-acceptance.md`、M3 术语契约和职责矩阵，确认页面只承载项目工作台“术语”：公司 SRT 来源/提取事实、候选筛选与正式排序、证据侧栏、四态人工裁决、人工新增/编辑、批量处理、待确认门禁、不可变版本和来源过期。
- 规划重新查看 6 张 1440/1024/证据侧栏/来源变化/V1 确认证据图；视觉层级、紧凑表格、中文状态与语义色、单一主动作、响应式滚动归属和来源变化阻断未发现 P0/P1，也没有把上传、任务中心、ASR/OCR、播放器、密钥、账号或学习库塞入当前切片。
- 证据侧栏保留集数、轴号、时间和原文，满足“结论回到真实 SRT 证据”；默认顺序与正式八类/人名优先/同类首次证据规则一致。现阶段无需让 UI 返工。

### 证据限制与路由

- 规划尝试在当前任务的应用内浏览器打开 UI 任务仓库外 `file://` 原型时被浏览器安全策略阻止，因此没有绕过策略重跑交互；该限制不等同于产品失败。规划使用 UI 已保存的原始证据图完成视觉审计，并保留 UI 已记录的控制台和焦点结果为交接证据，而非冒充规划任务的新浏览器实测。
- 确认版本弹窗的组合键动态读数仍未在设计原型阶段完整取得；正式前端必须以 DOM 回归和真实键盘终验覆盖初始焦点、Tab/Shift+Tab 闭环、Escape/取消恢复触发点。
- `UI-M3-01` 保持 Rev 1，转为 `review / Current actor=用户 / Reviewer=用户`。`BACK-M3-01A` 继续并行开发；`FRONT-M3-01B` 仍同时等待用户方向通过与后端规划独立验收，不提前解锁。

## 2026-08-13 — UI-M3-01 Rev 1 正式术语页设计完成并交回规划

### 正式交付

- 更新 `DESIGN.md` 5.4，固化项目工作台术语页的来源门禁、唯一主动作、紧凑表格、证据侧栏、四态裁决、人工新增/编辑、批量栏、不可变版本、来源过期和 1440/1024 滚动归属；后续章节顺延编号，没有修改业务契约。
- 新增 `docs/ui/M3-terms-acceptance.md`，记录设计判读、Impeccable 减法、状态矩阵、键盘规则、响应式、非颜色编码、开发停止边界和真实浏览器证据。
- 在仓库外 `m3-terms-rev1/` 交付可操作 HTML 原型；覆盖搜索、筛选、排序、逐行/当前页选择、批量确认/驳回、证据侧栏、人工新增、编辑、来源变化、提取加载/运行/失败/空、项目禁用和版本确认。6 张最终截图位于原型 `evidence/`。

### 验证与限制

- 1440×900 正常态和证据侧栏完成截图验收；1024×768 展开/收起侧栏均未出现页面底部横向滚动，表格最小宽度只在自身容器横滚。来源变化与 V1 确认态分别截图；修正了确认态顶部与表格状态不同步的原型投影问题后重拍，确认表格待确认标签为 0。
- 真实浏览器验证证据侧栏获得焦点、Escape 关闭后返回原触发按钮；逐行勾选后普通工具栏切换为批量栏；四态均有文字与语义色；最终控制台 `error/warn=0/0`。
- 确认框已实现初始聚焦取消、Tab/Shift+Tab 双向闭环、Escape/取消关闭和触发点恢复；组合键自动化在 in-app Browser 隔离焦点读取处超时，因此没有把未取得的动态读数冒充通过，已要求正式前端以 DOM 回归和真实键盘终验两层证明。
- 原型脚本 `node --check` 通过；Impeccable 检测返回 `[]`，但本机缺少 HTML 解析模块而降级为正则模式，仅作为辅助证据；`git diff --check` 通过。并行存在的前后端工作树改动未触碰。

### 范围与路由

- 本轮只修改 UI 权威文件和仓库外原型，没有修改 `frontend/src`、后端、迁移、`packages/contracts`、真实资料、密钥或云资源，没有提交、推送或部署。
- `CURRENT.md` 更新为 v4-007；`UI-M3-01` 保持 Rev 1，转为 `review / Current actor=规划对话`。UI 只通知规划总线，不直接通知前端、不自行解锁 `FRONT-M3-01B`。

## 2026-08-13 — UI 领取 UI-M3-01 Rev 1

- 完整重读项目协议 v4、`CURRENT.md` v4-005、`DESIGN.md`、M3 术语契约、职责矩阵和开发日志顶部，确认唯一 UI 可执行项为 `UI-M3-01 Rev 1 / ready`。
- 按 v4 规则只把任务改为 `in_progress`，不机械增加任务 Rev；交付范围限定为 `DESIGN.md`、`docs/ui/M3-terms-acceptance.md` 与仓库外交互预览/截图。
- 采用 Impeccable 的 Operate/shape 约束完成术语高密度工作台审计，并仅使用 design-taste-frontend 的既有品牌审计和最终预检规则；不修改生产前端、后端、迁移或共享契约，不设计 ASR/OCR、视频播放器、任务中心、管理员密钥页或账号。

## 2026-08-13 — 后端领取 BACK-M3-01A Rev 1

- 完整重读项目协议 v4、`CURRENT.md` v4-004、M3 术语契约、职责矩阵、M3 冲刺里程碑和开发日志顶部，确认唯一后端可执行项为 `BACK-M3-01A Rev 1 / ready`。
- 按 v4 规则只把任务改为 `in_progress`，不机械增加任务 Rev；范围限于术语共享契约、后端模块、必要迁移/路由、最小 SRT Asset/Storage 只读边界和后端测试。
- PostgreSQL 保持唯一权威；本轮只使用匿名小 SRT 和确定性 fake，不调用真实 AI/ASR，不写或返回密钥，不修改生产前端/DESIGN、根级依赖或其他工作台模块。

## 2026-08-13 — PLAN-M3-01 用户确认并发布 S1 并行任务

- 用户明确确认术语融合方案和双控制台 API 密钥安全方案；`docs/contracts/M3-terms-workflow.md` 从待审核草案升格为 M3 S1 权威产品/数据基线，`PLAN-M3-01` Rev 3 标记 `done`。
- 按协作协议 v4 的受控并行发布 `UI-M3-01` 与 `BACK-M3-01A`：UI 只负责项目工作台术语页的正式交互与状态证据；后端只负责 SRT 来源/证据、候选四态、人工事件、不可变版本、五列 XLSX 和无付费副作用的 extraction adapter/fake。
- `FRONT-M3-01B` 只登记为 `blocked`，必须同时等待 UI 方向通过和后端规划独立验收；前端不得提前写占位实现。三个角色的交付、异议和退审仍只回规划总线，不互相直接接力。
- 当前仍未授权真实 AI/ASR 密钥、付费调用、云资源、提交、推送或部署；S1 不吸纳 ASR、OCR、视频播放器、任务中心、管理员密钥页或账号系统。`CURRENT.md` 更新为 v4-004。

## 2026-08-13 — PLAN-M3-01 增补云端 API 密钥与控制台边界

- 用户提出本地 API 密钥迁移到多人云端网站后不能暴露。规划核对官方 Secret 管理与内部应用访问控制资料后，把控制面拆为“云平台密钥控制台”和“网站业务控制台”。
- 原始供应商密钥只允许部署所有者写入专用 Secret 管理设施，保存后不明文回显；首版网站不持有 Secret 管理写权限。未来业务控制台只管理启停、供应商/模型、预算、并发、有限重试、用量、连通性和 Secret 引用，不能查看完整密钥。
- 员工浏览器只向本系统后端创建幂等任务；Worker 在服务端读取 Secret 并调用供应商，PostgreSQL保存任务、配置快照、请求标识和用量。普通错误与日志必须脱敏。
- 当前没有应用账号系统，草案明确首个云端内部版本须先由身份感知代理、VPN 或允许名单保护整站；未来管理员路径再叠加更严格策略。`CURRENT.md` 更新为 v4-003，`PLAN-M3-01` Rev 3 继续等待用户审核，未发布实现任务或接入真实密钥。

## 2026-08-13 — PLAN-M3-01 术语纵切融合草案交付用户审核

### 只读继承与模板核对

- 规划只读核对原工作台的术语 SOP、全剧 Pro/Flash 与本地高召回补漏、真实字幕证据校验、四态人工裁决、版本和模板导出回归；确认旧实现的正式状态为 `pending / approved / edited / rejected`，只有后两种通过态进入识别与正式导出。
- 使用标准表格工具只读检查 `assets/术语库模板.xlsx` 并完成视觉核对：正式可见列为 `类型、中文内容、别称、性别、备注`，Sheet1 示例行不是业务数据。模板未被修改。

### 去其糟粕后的单一草案

- 新增 `docs/contracts/M3-terms-workflow.md`，以用户最新提示词为业务权威：正式对外使用人名、地名、特定物品、朝代、组织名、等级、物种/种族名、特殊概念/事件八类；人名优先、同类按首次 SRT 证据排序。
- 保留旧应用有效机制：全剧解析、本地高召回索引、AI 只产候选、证据必须回到真实 SRT、低频具名角色不静默遗漏、人工新增/确认/修改/驳回、不可变版本和五列 XLSX。
- 明确舍弃旧规则中的两类问题：不再把“张总裁、叶将军”等有稳定特指证据的职位称呼一律删除；不向员工直接暴露旧 17 类，旧类型只映射到八类。普通疾病、通用物品、泛称和无证据臆造仍排除。
- 术语来源使用独立 `sourceSrtSetDigest`，只改视频不使术语过期；公司 SRT 内容变化要求新草稿/新版本，但不覆盖旧版本或自动触发付费识别。正式导出只读已确认版本，证据和模型审计留在后端。

### 状态与边界

- 职责矩阵和 M3 里程碑已挂接草案；`CURRENT.md` 更新为 v4-002，`PLAN-M3-01` Rev 2 进入 `review / Current actor=用户`。
- 本轮没有修改生产前端、后端、迁移或共享代码契约，没有调用真实 AI/ASR、创建云资源、提交、推送或部署；用户确认前不拆 UI、后端和前端实现任务。

## 2026-08-13 — 回收站最终交付门通过并升级协作协议 v4

### 回收站关闭

- 规划裁决 UI Rev 21 的 B 项属于合规验收工具隔离，不是产品失败。Rev 20 可控延迟 DOM 回归已经直接覆盖 pending dialog 焦点、两按钮禁用、Tab/Shift+Tab/Escape/遮罩不逃逸、单次请求、失败恢复和同幂等键重试；规划代码审查与独立专项 15/15 证明该测试作用于正式状态机。UI 的真实 409 又在 500ms/1.2s 两次稳定读取中证明错误态聚焦取消且焦点位于 dialog 内，因此接受等价证据，不更换或绕过安全环境制造新一轮。
- 用户明确授权后，最终完整 `pnpm check` 退出码 0；随后执行 `pnpm run db:stop`，本地 PostgreSQL 正常停止并输出 `server stopped`。`FRONT-M2-06` Rev 22 标记 `done`，回收站纵向切片关闭。

### 协作协议 v4

- `docs/WORKFLOW.md` 升级为 v4：规划 FIFO 只串行审核交接，不再被解释为全局串行开发；同一纵向切片最多允许三个文件互不重叠的 UI/后端/前端任务受控并行。
- 新增阶段简报：连续 2–3 次交接、阶段变化、交付风险或两日无简报时，由规划只汇报当前阶段、完成事实、阻断、下一角色和最晚日期是否受影响。
- 新增协作持续改进：所有角色可带证据提议流程改进，规划统一审查、试运行和版本化；不得各自维护协议。连续两次退审强制根因审查；Reviewer 有界批量检查完整矩阵；P0–P3 分级；返工跑定向验证，完整检查留到切片关闭。
- 任务 Rev 改为工作包版本，单纯领取、通知或路由不再机械递增；同步版本仍随每次有效写回递增。`CURRENT.md` 进入同步协议 v4、版本 `v4-001`。

### 下一阶段

- 用户确认 2026-08-27 是内部可用工作台的最晚日期而非固定耗时，允许在保证质量门的前提下越早越好。新增 `docs/milestones/M3-internal-workbench-sprint.md`，按术语、ASR、前置审改、单剧验收四个纵向切片推进。
- 当前只建立 `PLAN-M3-01` 产品协商任务，不发布业务实现；下一步先与用户确认术语纵切的具体方案和验收边界。本轮未提交、推送、部署或创建云资源。

## 2026-08-13 — UI 执行 FRONT-M2-06 Rev 21 最终动态终验并交回规划

### A 项通过

- 正式页面用匿名项目触发真实版本冲突；`409` 返回请求标识 `835344ba-9785-4605-84cd-0d5c7c1411fb`。
- 错误稳定后 500ms 与 1.2s 两次读取均为“取消”获得焦点且 `dialog.contains(activeElement)=true`；截图已保存并人工检查。最终控制台 `error/warn` 为 0/0。

### B 项验收环境阻断

- 当前 in-app Browser 的页面评估是安全隔离视图，`fetch/window.fetch/XMLHttpRequest/document.createElement` 均不可见，`window/globalThis` 不可扩展，无法安装规划指定的页面内临时 fetch 包装器。
- 同页 `javascript:` 注入被 Browser URL 安全策略明确拒绝，并要求不得通过替代浏览器、底层 CDP 或间接注入绕过；UI 按安全规则停止，没有规避。
- 包装器从未安装，原 `window.fetch` 从未被替换。因此 pending 锁定 B 项没有真实动态结论，本轮既不冒充通过，也不作为产品失败；规划需决定补充合规终验环境，或接受 Rev 20 的可控延迟 DOM 回归与独立 15/15/构建证据为等价证据。

### 清理与路由

- 证据已追加 `docs/ui/M2-recycle-bin-acceptance.md`；截图位于仓库外 `frontend-recycle-dynamic-rev21/`。
- 2 个匿名项目已按精确 UUID 删除；本轮 3000、3001、55432 服务均已停止并确认端口释放。未修改生产代码、后端、迁移、共享契约或 DESIGN，未提交、推送或部署。
- `CURRENT.md` 更新为 v3-104；`FRONT-M2-06` Rev 22 保持 `review`，`Current actor` 转回规划对话。UI 只通知规划总线，不自行标记完成或直接通知前端。

## 2026-08-13 — 规划通过 FRONT-M2-06 Rev 20 送审前审计并路由最终动态终验

### 独立复验

- 规划核对正式实现：`role=dialog` 只增加 `tabIndex=-1`；确定状态 effect 在弹窗存在且 mutation pending 时聚焦 dialog，错误提交后聚焦重新启用的取消，成功路径仍由既有逻辑聚焦状态消息。现有 dialog `onKeyDown` 因此能在 pending 阶段接收并阻止 Tab/Escape，遮罩关闭继续由 pending 门禁拒绝。
- 延迟 Promise 回归在 pending 阶段直接断言 dialog 获焦、两按钮禁用、Tab/Shift+Tab/Escape/遮罩不逃逸和重复点击不产生第二请求；rejected 后聚焦取消并保留同幂等键重试。它补齐了 Rev 17 测试遗漏，未用源码字符串或结构断言代替真实 DOM 行为。
- 规划独立项目中心+回收站专项 2 文件 15/15、前端生产构建 141 模块通过；Impeccable 定向检测 `[]`，`git diff --check` 无输出。范围审计健康分 20/20（Accessibility、Performance、Responsive、Theming、Implementation Integrity 均 4/4），自动化与代码范围内没有新的 P0/P1/P2/P3；最终发布结论仍等待真实浏览器两项动态证据。

### 路由与交付门

- `CURRENT.md` 更新为 v3-103，队列 019 关闭；`FRONT-M2-06` Rev 21 保持 `review` 并路由 UI 设计对话。
- UI 不再使用数据库锁；在不修改生产代码的前提下，以页面内临时 `fetch` 包装器把本次 recycle 请求延迟约 1.5–2 秒，一次性验证 pending dialog 焦点、按钮禁用、Tab/Shift+Tab/Escape/遮罩不逃逸和无重复请求；另以正式 409 验证错误稳定后的取消焦点。临时包装器验收后恢复。
- UI 通过后仍先回规划；规划再运行一次完整 `pnpm check` 作为本切片交付门，随后才能标记 `done`。当前未发布工作台任务，未提交、推送或部署。

## 2026-08-13 — FRONT-M2-06 Rev 20 提交中弹窗焦点约束完成并交回规划

### 定向修改

- 只修改 `ProjectCenter.tsx`：为既有 `role=dialog` 容器增加 `tabIndex=-1` 使其可编程聚焦；保留 Rev 17 错误态逻辑，并扩展同一确定状态 effect，在 mutation 进入 pending 且弹窗存在时聚焦 dialog，从而让既有 dialog `onKeyDown` 能接收并阻止 Tab/Escape。rejected 后仍聚焦重新启用的取消，成功后仍聚焦既有状态消息。
- 只修改对应 `ProjectCenter.test.tsx`：可控延迟 Promise 回归在 pending 阶段直接断言 dialog 获焦，分别发送 Tab、Shift+Tab、Escape 和遮罩动作，确认焦点与弹窗均不逃逸；再次点击禁用的确认按钮后仍只有一次回收请求。rejected 后焦点回到取消且位于弹窗内，随后继续以同一幂等键重试成功。

### 验证与边界

- 项目中心+回收站联合专项：2 文件 15/15 通过；前端生产构建转换 141 模块成功；按用户点名的 Impeccable 技能完成一次定向机械检测，结果为 `[]`；`git diff --check` 无输出。
- 本轮没有修改 CSS、错误文案、视觉、API、状态机或回收站主体；Rev 17 错误聚焦、初始焦点、非提交 Tab 闭环与关闭恢复、成功消息均保持。未抽通用弹窗，未修改后端、迁移、共享契约或 DESIGN。
- 按规划裁决未运行完整 `pnpm check`；未提交、推送或部署。`FRONT-M2-06` 更新为 Rev 20 `review / Current actor=规划对话`，前端只请求规划总线独立复验，未直接通知 UI；工作台任务继续不发布。

## 2026-08-13 — 前端领取 FRONT-M2-06 Rev 18 提交中焦点合并返工

- 前端开发对话重读项目协议、协作协议 12.1/12.2/13/16、`CURRENT.md` v3-100、开发日志顶部，并按用户点名的 Impeccable 技能加载项目上下文、审计规则与代码质量底线；确认唯一缺口是 pending 双按钮禁用后 dialog 没有确定焦点目标，真实浏览器可能让焦点掉到 `body` 并绕过 dialog 键盘处理。
- 任务递增为 Rev 19 `in_progress`；只修改 `ProjectCenter.tsx` 与对应测试，使 pending 状态确定聚焦可编程聚焦的 dialog，并用可控延迟 Promise 覆盖焦点、键盘关闭约束、重复提交、失败恢复与幂等重试。
- Rev 17 错误态 effect、初始焦点、非提交闭环与关闭恢复、成功消息，以及文案、视觉、API、状态机、回收站主体均冻结；不修改后端、迁移、契约或 DESIGN，不运行完整 check，不提交、推送或部署。

## 2026-08-13 — 规划复验 FRONT-M2-06 Rev 17 并在送 UI 前合并提交中焦点缺口

### 通过证据

- 规划代码核对确认失效的 `onError → queueMicrotask` 已删除；`RecycleApiError` 提交且 mutation 退出 pending 后，新的 effect 会在弹窗仍存在时聚焦重新启用的“取消”。可控延迟测试覆盖 pending 后 rejection、手工模拟焦点脱落和同幂等键重试，原真实 409 退审根因已经得到针对性修正。
- 规划独立复跑项目中心+回收站 2 文件 15/15，通过；前端生产构建转换 141 模块成功；Impeccable 定向机械检测返回 `[]`，`git diff --check` 无输出。未运行完整 `pnpm check`，符合本轮“交付门统一运行”的裁决。

### 送审前冲突审查

- 规划没有直接路由 UI，因为下一轮已经明确要求真实验证“提交中锁定”，而现有代码在 pending 时同时禁用取消/确认、弹窗容器又不可聚焦。真实 Chrome 上焦点从禁用按钮脱落到 `body` 已由上一轮 409 证据证明；一旦焦点在 `body`，绑定于 dialog 的 `onKeyDown` 无法接收 Tab/Escape，Tab 可能进入遮罩后的页面。
- 新测试只断言两个按钮禁用、Escape/遮罩不关闭，随后才主动执行 `confirmButton.blur()`；没有在 pending 阶段断言焦点位置，也没有发送 Tab/Shift+Tab 或检查背景焦点，因此 15/15 不能证明该终验项。
- 这是与原缺陷同源的 P1 动态焦点问题。按用户要求的冲突审查与“整批发现、一次返工”原则，规划在送 UI 前直接并入 Rev 18：使 dialog 容器可编程聚焦，pending 提交后确定聚焦容器，并补齐 Tab/Shift+Tab/Escape/遮罩/重复提交/失败恢复的一个延迟回归。原错误态 effect 与其他通过项冻结。

### 路由与边界

- `CURRENT.md` 更新为 v3-100，队列 018 关闭；`FRONT-M2-06` Rev 18 保持前端 `ready`。本轮规划未修改生产代码，未启动服务、创建数据、提交、推送或部署。
- 回收站仍是唯一活动主线；工作台两周冲刺协议和新任务继续等待本任务最终关闭后发布。

## 2026-08-13 — FRONT-M2-06 Rev 17 动态失败焦点修正完成并交回规划

### 定向修改

- 只修改 `ProjectCenter.tsx`：删除 `recycleMutation.onError` 中可能早于错误态提交和浏览器焦点脱落的单次 `queueMicrotask`；改为在 `RecycleApiError` 已提交、mutation 已退出 pending 且确认框仍存在时，由 React effect 确定聚焦既有“取消”按钮。
- 只修改对应 `ProjectCenter.test.tsx`：未知结果路径改用可控延迟 Promise，真实覆盖 `pending → rejected`；提交中两个按钮禁用，Escape 与遮罩关闭均受阻；模拟焦点脱落后提交 rejection，确认错误态渲染后焦点回到取消且仍在弹窗内部，随后同一幂等键重试成功。

### 验证与边界

- 项目中心+回收站联合专项：2 文件 15/15 通过；前端生产构建转换 141 模块成功；`git diff --check` 无输出。
- 按规划裁决，本轮无需运行完整 `pnpm check`，留交付门统一执行。初始焦点、Tab 双向闭环、Escape/取消/遮罩恢复、成功消息焦点、文案、视觉、API、状态机、回收站主体及此前证据均冻结且未重做。
- 未抽通用弹窗，未修改后端、迁移、共享契约或 DESIGN，未提交、推送或部署。`FRONT-M2-06` 更新为 Rev 17 `review / Current actor=规划对话`，前端只请求规划总线独立复验，未直接通知 UI；工作台任务继续不发布。

## 2026-08-13 — 前端领取 FRONT-M2-06 Rev 15 动态失败焦点返工

- 前端开发对话重读项目协议、协作协议 12.1/12.2/13/16、`CURRENT.md` v3-097、UI Rev 13 真实键盘终验与开发日志顶部，确认唯一缺陷是 `onError` 单次微任务可能早于错误态 DOM 提交和浏览器焦点脱落。
- 任务递增为 Rev 16 `in_progress`；只修改 `ProjectCenter.tsx` 与对应前端测试，把失败聚焦改为已提交错误状态驱动的确定行为，并用可控延迟 Promise 覆盖提交中锁定与失败后弹窗内焦点。
- 初始焦点、Tab 闭环、三种关闭恢复、成功消息焦点、文案、视觉、API、状态机、回收站主体及既有证据全部冻结；不抽通用弹窗，不修改后端、迁移、契约或 DESIGN，不提交、推送或部署。

## 2026-08-13 — 规划确认 FRONT-M2-06 Rev 14 动态焦点退审并定向分派 Rev 15

### 冲突审计

- 规划按 Impeccable `audit` 的无障碍与键盘规则复核 UI Rev 13 真实证据、正式 `ProjectCenter` 焦点实现和现有回归。范围审计健康分为 17/20（Accessibility 2/4、Performance 4/4、Responsive 4/4、Theming 4/4、Implementation Integrity 3/4）；唯一问题为 1 个 P1 动态焦点缺陷，无新增 P0/P2/P3。已通过的初始焦点、Tab 闭环、三种关闭恢复、成功消息、响应式与视觉证据保持正向结论。
- Impeccable 定向机械检测对 `ProjectCenter.tsx` 与对应 CSS 返回 `[]`，但这不覆盖真实浏览器异步焦点时序。正式 409 后 500ms 与 1.2s 均为 `activeElement=body`，构成直接反证，退审成立。
- 根因位于 `recycleMutation.onError` 的单次 `queueMicrotask`：它可能在 React Query 错误态渲染提交、按钮解除禁用和浏览器从禁用按钮移除焦点之前执行；因此可能错误判断焦点仍在弹窗内，或在取消按钮仍禁用时聚焦无效。现有 jsdom 回归没有复现这一浏览器时序。

### 定向裁决

- `CURRENT.md` 更新为 v3-097，队列 017 关闭；`FRONT-M2-06` Rev 15 退回 `ready / Current actor=前端开发对话`。只把失败聚焦改为由已提交错误状态驱动的确定行为，并以可控延迟 Promise 覆盖 `pending → rejected → 弹窗内焦点`；失效的单次微任务路径须删除或停用。
- 下一轮 UI 只复验两项：真实失败渲染稳定后的弹窗内焦点，以及通过页面内可控延迟请求形成的提交中按钮禁用、Escape/遮罩不可关闭、Tab 不逃逸与重复提交受阻。已通过部分全部冻结，不重做回收站主体。
- 当前回收站任务继续优先收口；按用户要求，工作台两周冲刺协议与新任务在本任务最终关闭前不发布。本轮未修改生产代码，未启动服务、创建数据、提交、推送或部署。

## 2026-08-13 — UI 完成 FRONT-M2-06 Rev 13 真实键盘终验并退回规划

### 真实通过项

- 正式页面打开确认框后聚焦“取消”；Tab/Shift+Tab 在“取消”和“确认移入回收站”之间双向闭环。
- 非提交期 Escape、点击取消与点击遮罩均关闭弹窗，并恢复本次匿名项目原始行触发按钮。
- 成功提交后原行移除，焦点落到既有 `role=status`、`tabIndex=-1` 成功消息；最终控制台 `error/warn` 为 0/0。

### 唯一真实失败与证据限制

- 匿名项目在弹窗打开后由后端版本 1 改为 2；确认返回真实 `409` 与请求标识 `c2bfecfd-f97f-4df3-b369-24deda0fe61f`。弹窗、错误信息和按钮都保留，但 500ms 与 1.2s 两次 DOM 读取均为 `activeElement=body`、焦点不在弹窗内。
- 最小修正只需让失败错误渲染稳定后把焦点恢复到“取消”或错误摘要；不得改变已通过的初始焦点、Tab 闭环、三种关闭路径、成功焦点、文案、视觉、API 或状态机。
- 本轮尝试通过本地 PostgreSQL 锁构造提交中挂起窗口，但请求仍在首次 DOM 采样前完成；因此提交中禁止关闭/重复提交只保留既有自动化证据，本轮不冒充真实动态通过，也不列为新增失败。

### 清理与路由

- 证据已追加 `docs/ui/M2-recycle-bin-acceptance.md`；截图位于仓库外 `frontend-recycle-keyboard-rev13/`。
- 5 个匿名项目已按精确 UUID 删除；本轮 3000、3001、55432 服务均已停止并确认端口释放。未修改生产代码、后端、迁移、共享契约或 DESIGN，未提交、推送或部署。
- `CURRENT.md` 更新为 v3-096；`FRONT-M2-06` Rev 14 保持 `review`，`Current actor` 转回规划对话。UI 只通知规划总线，不自行标记完成或直接通知前端。

## 2026-08-13 — 规划通过 FRONT-M2-06 Rev 12 交接审计并路由 UI 终验

### 独立复验

- 规划核对唯一两个生产/测试改动目标：确认框打开聚焦安全的“取消”，Tab/Shift+Tab 在首末按钮双向闭环；非提交 Escape、取消和遮罩关闭均恢复本次原始行触发按钮；失败保留弹窗与内部焦点；成功后聚焦既有 `role=status`、`tabIndex=-1` 消息。
- 规划独立复跑 `ProjectCenter.test.tsx` 与 `RecycleBin.test.tsx`，2 文件 15/15 通过；独立前端生产构建转换 141 模块成功；`git diff --check` 无输出。前端报告的全部前端 28/28、完整 `pnpm check` 与 Impeccable 空检测结果作为交接证据保留，但未冒充规划本轮独立运行结果。
- 改动没有扩展到确认文案、视觉、API、状态机、回收站主体、后端、迁移、共享契约或 DESIGN；Rev 8 九张截图及此前通过的业务、查询和响应式证据继续冻结。

### 路由

- `CURRENT.md` 更新为 v3-095，队列 016 关闭；`FRONT-M2-06` 递增为 Rev 13，保持 `review` 并把 `Current actor` 指向 UI 设计对话。
- UI 只做真实浏览器键盘终验：初始焦点、Tab 双向闭环、三种取消路径焦点恢复、失败留框、成功消息聚焦，以及提交中禁止关闭/重复提交且焦点不逃到遮罩后的页面；同时确认控制台 error/warn 为 0。
- UI 不重做回收站主体、不修改生产代码；终验结论须先回规划总线，不能直接标记 `done` 或通知下一角色。本轮未提交、推送或部署。

## 2026-08-13 — FRONT-M2-06 Rev 12 项目回收确认框焦点闭环完成并交回规划

### 定向修改

- 只修改 `ProjectCenter.tsx`：打开项目回收确认框时保存本次行级触发按钮并聚焦安全的“取消”；弹窗自身处理 Tab 两端双向闭环与非提交 Escape，提交期间继续阻止关闭和重复操作。
- 取消、点击遮罩或 Escape 关闭后，焦点恢复到本次原始行级“移入回收站”按钮；确认失败保持弹窗，并在焦点意外丢失时恢复到弹窗内安全按钮。
- 确认成功且原项目行移除后，焦点转到既有成功状态消息；消息保留 `role=status` 并仅增加 `tabIndex=-1` 作为可编程焦点落点。确认文案、视觉、API 和状态机均未改变。
- `ProjectCenter.test.tsx` 新增真实 DOM 行为回归，覆盖打开初始焦点、Tab/Shift+Tab 两端闭环、Escape/取消/遮罩返回原触发器、失败留框内焦点与成功消息聚焦。

### 验证与边界

- 项目中心专项：1 文件 7/7 通过；项目中心+回收站联合专项：2 文件 15/15 通过；全部前端测试：4 文件 28/28 通过。
- 前端生产构建转换 141 模块成功；最终完整 `pnpm check` 退出码 0；Impeccable 对两个改动目标的机械检测返回空数组；`git diff --check` 无输出。
- Rev 8 的九张截图、回收站主体、正式 API、状态表达、服务端查询和响应式证据均按要求冻结且未重做。本轮未抽通用弹窗，未修改后端、迁移、共享契约或 DESIGN，未提交、推送或部署。
- `FRONT-M2-06` 更新为 Rev 12 `review / Current actor=规划对话`，只请求规划总线复验；前端未直接通知 UI、未自行标记 `done` 或解锁后继任务。

## 2026-08-13 — 前端领取 FRONT-M2-06 Rev 10 焦点闭环返工

- 前端开发对话重读项目协议、协作协议 12.1/12.2/13/16、`CURRENT.md` v3-092、UI Rev 8 终验和 Impeccable 无障碍审计规则，确认唯一缺陷是项目中心回收确认框缺少动态焦点管理。
- 任务递增为 Rev 11 `in_progress`；本轮只在 `ProjectCenter` 与对应前端测试中补安全初始焦点、Tab/Shift+Tab 双向闭环、非提交 Escape、关闭后触发按钮恢复、失败留框和成功消息焦点。
- 确认文案、视觉、API、状态机、回收站主体、Rev 8 九张截图及其他正式证据全部冻结；不抽通用弹窗，不修改后端、迁移、契约或 DESIGN。

## 2026-08-13 — 规划确认 FRONT-M2-06 Rev 9 UI 退审并定向分派 Rev 10

### 审核结论

- 规划读取 UI 终验记录、九张证据说明和现有 `ProjectCenter` 实现，并按 Impeccable 的 Accessibility/Keyboard Navigation 技术审计规则核对。UI 的动态证据成立：确认框虽然声明 `role="dialog"` 与 `aria-modal="true"`，但代码没有焦点进入、Tab/Shift+Tab 限制、Escape 关闭或关闭后的焦点恢复。
- 真实浏览器测得打开、取消和成功提交后的焦点位置，与源码缺少任何 `focus`/键盘处理完全一致。Impeccable 机械检测对两个项目中心目标文件返回空数组，只能说明没有命中静态规则，不能替代动态焦点验收。
- 该问题会使纯键盘用户进入遮罩后仍操作背景页面或在弹窗关闭后失去位置，属于发布前必须修复的 P1 无障碍缺陷；不涉及文案、视觉、API、数据状态或回收站主体。

### 定向裁决

- `CURRENT.md` 更新为 v3-092，队列 015 关闭；`FRONT-M2-06` Rev 10 定向退回 `ready / Current actor=前端开发对话`。
- 只允许在 `ProjectCenter` 与对应测试中补齐：打开聚焦安全操作、Tab 双向闭环、非提交 Escape 取消、取消/遮罩/Escape 恢复原触发按钮、成功后聚焦现有 `role=status` 消息。确认失败保持弹窗与内部焦点；提交期间仍禁止重复关闭或提交。
- UI 已通过的三项影响、后端数量、全部回收站状态、服务端查询、请求标识、1024 两态滚动、控制台和九张截图全部冻结。修正后 UI 只复验确认框键盘闭环，不重做回收站主体。
- 本轮未修改生产前端、后端、契约或 DESIGN，未启动服务、创建数据、提交、推送或部署。

## 2026-08-13 — UI 完成 FRONT-M2-06 Rev 8 正式页面终验并退回规划

### 通过项

- 正式项目中心确认框完整显示三项影响，回收成功直接呈现后端 `terminatedUploadCount`；匿名样本真实反馈 2 个未完成上传已终止。
- 正式回收站覆盖已回收倒计时、恢复成功/失败、清理中、等待后台重试、清理最终失败、请求标识和完整结果集中的已清理轮询提示；搜索、服务端筛选排序与恢复唯一动作均通过。
- 1024×768 展开/收起侧栏时根页面均为 `clientWidth=scrollWidth=1014`，10px 是 Windows 纵向滚动槽；980px 表格只在 `.tableWrap` 内部形成 `744/980`、`876/980` 横滚。最终控制台 `error/warn` 为 0/0。1440 与加载态复用 Rev 4 冻结正式证据，未发现回归。

### 不通过项与最小建议

- 确认框打开后焦点仍停留在遮罩后的“移入回收站”按钮；Tab/Shift+Tab 未进入或闭环于弹窗，Escape 不关闭。点击取消或确认成功后，焦点均落到 `body`；成功消息虽有 `role=status`，但没有确定焦点落点。
- 该问题只属于项目中心确认框的键盘/焦点实现缺陷。最小修正限定为：打开时聚焦弹窗内安全操作、Tab 闭环、Escape 等同取消、取消恢复触发按钮、成功后聚焦状态消息或列表标题；不得改变文案、视觉、API、状态机或回收站主体。

### 证据、清理与路由

- 证据已追加 `docs/ui/M2-recycle-bin-acceptance.md`；本轮 9 张正式页面截图位于仓库外 `frontend-recycle-qa-rev8/`。
- 8 个匿名项目已按精确 UUID 删除；本轮 3000、3001、55432 服务均已停止并确认端口释放。未修改生产前端、后端、迁移、共享契约或 DESIGN，未提交、推送或部署。
- `CURRENT.md` 更新为 v3-091；`FRONT-M2-06` Rev 9 保持 `review`，`Current actor` 转回规划对话。UI 只通知规划总线，不自行标记完成或直接通知前端。

## 2026-08-13 — 规划通过 FRONT-M2-06 Rev 7 并路由 UI 终验

### 定向复验

- 规划核对 `RecycleBin.tsx` 唯一修改：前次观察增加完整结果标识；只有查询签名一致、前后 `total === items.length` 且无 `cleanupJobStatus` 筛选时，才允许把先前 `purging` 项缺席表达为已清理。该条件不会把 `retryable → leased` 状态迁移或当前 100 条窗口变化伪装成清理成功。
- 新增两项负向回归分别覆盖 CleanupJob 筛选迁移与不完整窗口；原完整结果集正向提示继续通过。规划独立复跑项目中心+回收站专项为 2 文件 13/13，独立前端生产构建转换 141 模块成功。
- Rev 4 项目中心回收、正式 API、服务端排序筛选、幂等意图、1440/1024、侧栏两态、控制台和匿名数据清理证据保持冻结；本轮没有要求前端重做。

### 状态与路由

- `CURRENT.md` 更新为 v3-090，队列 014 关闭；`FRONT-M2-06` Rev 8 保持 `review`，`Current actor` 由规划切换为 UI 设计对话。
- UI 只做正式页面真实浏览器终验：复核既有业务状态、视觉层级、1440/1024 与侧栏两态滚动、项目回收确认框键盘/焦点、恢复动作、状态播报和控制台；结果无论通过或失败都先回规划总线，不直接通知前端。
- 本轮未修改生产代码、后端、契约或 DESIGN，未启动业务服务、创建测试数据、提交、推送或部署。

## 2026-08-13 — FRONT-M2-06 Rev 7 清理完成提示边界修正并交回规划

### 定向修改

- 只修改 `RecycleBin.tsx` 的既有清理完成观察记录：除查询签名和先前 `purging` 项外，同时保存该次响应是否满足 `total === items.length`。
- 仅当查询签名不变、前后两次响应都是当前查询完整结果集、且没有 `cleanupJobStatus` 筛选时，才把先前 `purging` 项缺席显示为“项目已清理”。无状态筛选+完整窗口的既有正向提示保持不变。
- 新增两项负向回归：`cleanupJobStatus=retryable` 中 Worker 重新领取为 `leased`、项目移出筛选结果时不提示已清理；前后响应均 `total > items.length`、项目仅移出当前 100 条窗口时不提示已清理。

### 验证与边界

- 回收站专项 `RecycleBin.test.tsx`：1 文件 8/8 通过；项目中心+回收站联合专项：2 文件 13/13 通过；全部前端测试：4 文件 26/26 通过。
- 前端生产构建 141 模块通过；最终完整 `pnpm check` 退出码 0；`git diff --check` 无输出。
- Rev 4 的项目中心、API、样式、服务端排序筛选、幂等逻辑、浏览器与响应式证据全部冻结且未重做。本轮未修改后端、迁移、共享契约或 DESIGN，未扩展分页 UI、云资源或其他业务，未提交、推送或部署。
- `FRONT-M2-06` 更新为 Rev 7 `review / Current actor=规划对话`，只请求规划总线复验；前端未直接通知 UI、未自行标记 `done` 或解锁后继任务。

## 2026-08-13 — 前端领取 FRONT-M2-06 Rev 5 定向返工

- 前端开发对话重读项目协议、协作协议 12.1/12.2/13/16、`CURRENT.md` v3-087 与规划退审日志，确认唯一缺陷是清理完成提示把筛选状态迁移或不完整结果窗口误判为 `purged`。
- 任务递增为 Rev 6 `in_progress`；Rev 4 的项目中心、API、样式、服务端排序筛选、幂等逻辑、浏览器与响应式证据全部冻结。
- 本轮只收紧 `RecycleBin` 同查询缺席推断：前后响应均完整且无 `cleanupJobStatus` 筛选时才允许提示已清理，并补状态迁移与不完整窗口负向回归；不修改后端、迁移、契约、DESIGN，不扩展分页或其他业务。

## 2026-08-13 — 规划定向退审 FRONT-M2-06 Rev 4

### 交接审计结论

- 规划复核正式回收站 API 消费、项目中心回收确认、回收站页面、服务端查询参数、CleanupJob 状态映射、回收/恢复幂等意图、测试和浏览器证据；目录范围与停止边界完整。独立复跑 `ProjectCenter.test.tsx` 与 `RecycleBin.test.tsx` 为 2 文件 11/11 通过。
- 项目中心只列 `active` 项目，回收成功反馈只使用后端 `terminatedUploadCount`；搜索、三类排序和两类状态筛选均提交服务端；恢复失败留行、未知结果同键重试、1024/1440 页面滚动归属等实现可以冻结，不要求重做。

### 失败证据与最小修正

- `RecycleBin.tsx` 当前把“相同查询签名下，先前任一 `purging` 项在新响应中缺席”直接解释为项目已清理。但查询签名包含 `cleanupJobStatus`：例如正在查看 `retryable` 时，Worker 把任务重新领取为 `leased`，项目仍为 `purging`，却会从筛选响应中消失并触发错误的“项目已清理”成功提示。
- `listRecycleBin` 当前固定读取 `limit=100`；当响应 `total > items.length` 时，某个项目也可能只是移出当前结果窗口，列表缺席同样不能证明 `purged`。该提示会把后端未完成事实伪装为成功，属于权威状态实现缺陷，不能先交 UI 验收。
- `CURRENT.md` 更新为 v3-087，队列 013 关闭；`FRONT-M2-06` Rev 5 定向退回 `ready / Current actor=前端开发对话`。只允许收紧提示条件：上次与本次响应均为当前查询完整结果，且没有 CleanupJob 状态筛选时才保留缺席推断；补状态迁移和不完整窗口两项负向回归。Rev 4 其余生产实现、测试和浏览器证据冻结，UI 暂不通知。
- 本轮未修改生产前端、后端、契约或 DESIGN，未启动服务、创建测试数据、提交、推送或部署。

## 2026-08-13 — FRONT-M2-06 Rev 4 正式回收站前端完成并交回规划

### 实际修改

- 项目中心新增行级“移入回收站”、包含项目名和三项影响的二次确认；请求成功前项目保持原列表，成功反馈只使用正式响应 `terminatedUploadCount`，0 时不虚构终止数量。回收网络未知结果保留项目与确认框，并以同一意图幂等键重试。
- 新增正式 `/recycle-bin` 导航、路由与页面：搜索、`recycleExpiresAt/name/recycledAt` 排序方向、`lifecycleStatus` 与 `cleanupJobStatus` 均进入服务端查询；前端不做单页假排序或假筛选。
- 页面显示后端 `recycledAt`、`recycleExpiresAt`、生命周期和 CleanupJob 权威事实；覆盖已回收倒计时、恢复、清理中、等待重试、最终失败、稳定失败原因、尝试次数、下次重试和请求标识。恢复失败保留项目；网络未知结果复用同一恢复意图键；同一查询刷新确认原 `purging` 项消失时显示“项目已清理”轻提示。
- 回收站加载态保留筛选与表头骨架，空态不提供创建或永久删除；980px 紧凑表格只在自身容器横向滚动。项目中心既有表格样式选择器收紧到自身容器，避免影响新页面。

### 实际验证

- `pnpm exec vitest run tests/frontend/ProjectCenter.test.tsx tests/frontend/RecycleBin.test.tsx`：2 文件 11/11 通过，覆盖三项确认、成功数量、未知结果幂等重试、服务端查询参数、加载/空态、清理中/重试/最终失败、恢复失败留行、请求标识、恢复成功和清理完成提示。
- 全部前端测试：4 文件 24/24 通过；最终完整 `pnpm check` 退出码 0，仓库边界、lint、类型、迁移、10 个测试文件 69 项及前后端构建全部通过；正式前端构建 141 模块。`git diff --check` 无输出。
- 真实浏览器以正式 API 完成匿名“创建项目 → 打开三项确认 → 回收成功 → 回收站恢复成功 → 再次回收”链路。1440×900 展开侧栏时根页面 `1440/1440`、表格容器 `1170/1170`；1024×768 展开 204px 时根页面 `1024/1024`、表格容器 `754/980`，收起 72px 时根页面 `1024/1024`、表格容器 `886/980`。页面无横溢，980px 表格横滚只在容器；恢复主操作可由正式控件到达，控制台错误/警告 0。
- 浏览器匿名项目按精确 UUID 删除并复核残留数为 0；本轮启动的 3000 前端端口已释放，未停止进入本轮前已存在的 3001 后端进程。

### 边界与交接

- 本轮只修改 `frontend/src/`、`tests/frontend/` 及协议要求的同步状态/日志；未修改后端、迁移、`packages/contracts` 或 DESIGN，未复制后端状态、猜数量或做单页假排序/筛选。
- 未实现立即永久删除、单文件/交付回收、真实 R2、账号权限、ASR/OCR/术语，未提交、推送或部署。
- `FRONT-M2-06` 更新为 Rev 4 `review / Current actor=规划对话`。当前只请求规划总线做交接审计；前端未直接通知 UI、未自行标记 `done` 或解锁下一任务。

## 2026-08-13 — 前端领取 FRONT-M2-06 Rev 2

- 前端开发对话重读项目级 `AGENTS.md`、协作协议 12.1/12.2/13/16、`CURRENT.md` v3-084、正式回收站 DESIGN/UI 验收、共享契约与开发日志顶部，确认 UI 与后端依赖均已通过且任务为 `ready / Current actor=前端开发对话`。
- 任务递增为 Rev 3 `in_progress`；本轮只实现项目中心项目级回收动作、正式回收站页面、服务端搜索/排序/筛选、后端权威生命周期与清理状态投影、稳定幂等意图重试及前端回归。
- 写入范围限定为 `frontend/`、`tests/frontend/` 及同步状态/日志；不修改后端、迁移、共享契约或 DESIGN，不实现立即永久删除、单文件/交付回收、真实 R2、账号权限、ASR/OCR/术语，不提交、推送或部署。完成后只交回规划总线。

## 2026-08-13 — 规划通过 BACK-M2-06 Rev 6 并解锁正式前端集成

### 独立复验

- 规划按 FIFO 审查新增迁移、共享 TypeBox 契约、回收/恢复路由、生命周期仓储与新增回归：`terminatedUploadCount` 由幂等命令记录持久化，首调与同键重放读取同一事实；恢复响应仍使用独立契约，不夹带回收专属字段。
- `recycledAt` 使用 CleanupJob 每次回收时重置的 `created_at`，不受 Worker 更新 `updated_at` 影响；`recycleExpiresAt/name/recycledAt` 只通过固定白名单映射为 SQL 列，方向限定 `ASC/DESC`，项目 ID 作为确定性并列键，排序在数据库 `LIMIT/OFFSET` 前执行。
- `cleanupJobStatus` 直接进入后端查询条件，前端无需从 `purging` 猜测重试状态。新增测试真实跨两个分页核对默认/名称/回收时间顺序，并区分两个 `purging` 项目中的 `retryable` 项。
- 本轮独立 `pnpm check` 退出码 0；随后独立复跑 `tests/backend/recycle.test.ts` 为 1 文件 7/7 通过。复验启动的本地 PostgreSQL 已正常停止。

### 状态与路由

- `CURRENT.md` 更新为 v3-084，队列 012 关闭；`BACK-M2-06` Rev 7 标记 `done`。Rev 3 已通过的事务、Storage fake、Worker、失败重试和竞态行为保持冻结，未发现新的阻断项。
- `UI-M2-04` 与后端依赖现已同时满足，`FRONT-M2-06` Rev 2 解锁为 `ready / Current actor=前端开发对话`。前端只消费正式契约，实现项目中心回收确认、回收站列表/搜索/服务端排序筛选、倒计时、恢复和清理状态；完成后仍先交回规划总线，再由规划路由 UI 做真实页面验收。
- 本轮未修改生产前端或后端业务代码，未接云资源，未提交、推送或部署。

## 2026-08-13 — BACK-M2-06 Rev 5 定向返工完成并交回规划

### 实际修改

- 新增迁移 `1754976005003_add_terminated_upload_count.cjs`，将回收时终止的未完成上传数量保存到幂等命令记录；回收首调与同键重放都从持久化事实返回相同 `terminatedUploadCount`。
- 共享回收站投影新增稳定 `recycledAt`；恢复后再次回收会重置 CleanupJob 的创建时间，Worker 后续更新 `updated_at` 不会改变回收时间。
- 共享查询新增 `sortBy=recycleExpiresAt/name/recycledAt`、`sortDirection=asc/desc` 和 `cleanupJobStatus`；排序以项目 ID 作为并列键，在 SQL 的 `LIMIT/OFFSET` 前执行。回收站分页参数同时接受经过范围约束的 URL 数字字符串，并在仓储边界归一化。
- 路由分别使用回收与恢复响应契约；回收响应包含终止数量，恢复响应保持原有项目结果。新增回归覆盖首调/重放数量一致、稳定回收时间、三类跨页排序及 `retryable` 清理状态筛选。

### 实际验证

- `pnpm exec vitest run tests/backend/recycle.test.ts`：1 个文件 7/7 通过。
- `pnpm exec vitest run tests/backend`：5 个文件 43/43 通过。
- `pnpm run lint`、`pnpm run typecheck`、`git diff --check`：均退出码 0。
- 完整 `pnpm check`：退出码 0；仓库边界、lint/typecheck、本地迁移、9 个测试文件 61 项、后端构建与前端 138 模块构建全部通过。
- 进程唯一临时 PostgreSQL 数据库从零执行 9 个迁移，确认 `terminated_upload_count` 为非空列后立即删除；主库最终 `projects=0`、`upload_sessions=0`、`cleanup_jobs=0`，本地 PostgreSQL 已停止。

### 边界与交接

- Rev 3 已通过的生命周期事务、Storage fake、CleanupJob Worker、失败重试和竞态行为未重写；未修改生产前端或 DESIGN，未接真实 R2、孤儿总核对、单文件/交付回收、账号权限，未提交、推送或部署。
- `BACK-M2-06` 更新为 Rev 6 `review / Current actor=规划对话`。当前只请求规划独立复验；后端未直接通知或解锁 `FRONT-M2-06`。

## 2026-08-13 — 后端领取 BACK-M2-06 Rev 4 定向返工

- 重读项目协议、`CURRENT.md` v3-081、正式回收站 DESIGN/UI 验收输入和规划退审证据，确认任务为 `ready / Current actor=后端开发对话`。
- 任务递增为 Rev 5 `in_progress`；冻结 Rev 3 已通过的事务、回收/恢复、Storage fake、CleanupJob Worker、失败重试和竞态行为。
- 本轮只补 `terminatedUploadCount` 稳定重放、`recycledAt` 稳定投影、数据库分页前的三类确定性排序、CleanupJob 状态筛选及相应后端回归；不修改生产前端/DESIGN，不扩展云资源或其他生命周期。

## 2026-08-13 — 规划退审 BACK-M2-06 Rev 3 并定向分派 Rev 4

### 独立复验结论

- 规划按 FIFO 登记后复核生命周期迁移、回收/恢复路由与事务、CleanupJob 租约 Worker、Storage fake、共享契约、职责矩阵和正式回收站验收规则；`pnpm run db:setup` 退出码 0，独立复跑 `tests/backend/recycle.test.ts` 为 1 文件 6/6 通过。
- Rev 3 的核心后端行为成立：回收事务会终止未完成会话且不影响已完成 Asset/清单；恢复不复活会话；分片/对象删除可重复；到期后进入 `purging`；租约有效时不重复领取、过期可接管；缺失对象可继续，删除失败保留原因并重试；竞态完成不能复活项目或会话。

### 退审证据与裁决

- `project-lifecycle.repository.ts` 只把 `terminatedUploadCount` 写入审计事件；`ProjectLifecycleCommandResultSchema` 和回收路由成功响应只返回 `project`。这无法实现已验收的“`N` 个未完成上传已终止”，且前端不能根据当前会话自行猜测。Rev 4 必须让首次回收和同键重放稳定返回同一数量。
- `RecycleBinItemSchema` 没有稳定 `recycledAt`；现有 `updatedAt` 会在 Worker 进入 `purging` 时变化，不能代表回收时间。查询也固定按到期时间排序，无法在数据库分页前执行已验收的项目名称/回收时间排序。Rev 4 必须提供稳定回收时间投影与带确定性次级键的服务端排序。
- `RecycleBinQuerySchema` 只能按项目生命周期筛选；`purging` 同时包含正在清理、等待重试和最终失败，不能在分页前实现“等待后台重试”筛选。Rev 4 必须提供类型化 CleanupJob 状态筛选，前端只做语义映射，不复制清理状态。
- 以上属于已确认 UI 与代码共享契约不一致的局部修正，不改变用户可见流程、成本或数据策略。`CURRENT.md` 更新为 v3-081：队列 011 关闭，`BACK-M2-06` Rev 4 定向退回 `ready / Current actor=后端开发对话`；`FRONT-M2-06` 保持阻塞。未修改生产代码、迁移、共享契约或前端，未接云资源，未提交、推送或部署。

## 2026-08-13 — BACK-M2-06 Rev 3 完成并交回规划复验

### 已完成

- 新增项目生命周期、清理任务、未完成上传清理、审计事件与最小墓碑迁移；共享代码契约覆盖回收/恢复命令、回收站列表和 CleanupJob 投影。
- 实现 `POST /api/projects/:projectId/recycle`、`POST /api/projects/:projectId/restore` 与 `GET /api/recycle-bin`：回收/恢复均使用幂等键和项目版本，48 小时窗口由集中配置提供，`purging`、过期或已清理项目不可恢复。
- 回收事务先锁项目，再锁并终止所有未完成上传；恢复保留已完成 Asset、清单和绑定，但已终止会话保持 `aborted`。相关上传确认、完成、过期和失败落账统一为项目锁优先，回收/完成竞态稳定返回 `PROJECT_NOT_ACTIVE`，不会复活会话或创建 Asset。
- 未完成分片及竞态形成的未完成对象由 Storage fake 可重复清理；清理失败不回滚项目回收，保存可重试事实，恢复和到期 Worker 均可继续清理。
- 新增无状态 `ProjectCleanupWorker.runOnce()`：以 PostgreSQL 租约领取到期任务，项目进入 `purging` 后不可恢复；对象删除幂等，缺失对象记录核对结果后继续；失败保留 `purging`、重试时间和原因，租约过期可由另一 Worker 接管；完成后清除业务明细、脱敏项目行并保存 `purged` 最小墓碑计数。

### 验证

- 回收专项 1 个文件 6 项全部通过：回收/恢复幂等、完成 Asset/清单保留、未完成会话不复活、分片清理失败恢复、过期恢复拒绝、缺失对象继续、删除失败重试、有效/过期租约和回收/完成竞态。
- 后端项目、素材、资产绑定、上传、回收专项 5 个文件 42 项全部通过；最终完整 `pnpm check` 退出码 0，仓库边界、lint、typecheck、本地 PostgreSQL 迁移、9 个测试文件 60 项测试和前后端构建全部通过。
- 在隔离临时数据库从零顺序执行 8 个迁移，迁移计数为 8，临时数据库随后删除；`git diff --check` 和最终 `pnpm check:repo` 通过。
- 自动化只使用匿名 4–8 字节代码内样例；最终项目表残留计数为 0，本地 PostgreSQL 已停止。

### 边界与交接

- 本轮只修改后端、迁移、共享契约、后端测试、后端说明及同步文件；没有修改生产前端或 DESIGN，没有接入真实 R2、全库孤儿核对、单文件/交付回收、账号权限或付费服务，没有提交、添加远程、推送或部署。
- 本地内存 Storage fake 不跨进程，测试通过依赖注入在同一进程运行 Worker；执行单元不持有内存业务状态，未来接入持久对象存储后可由独立 Worker 宿主复用。本任务已转为 `review / Current actor=规划对话`，只通知规划总线，后端停止且不自行解锁 `FRONT-M2-06`。

## 2026-08-13 — UI-M2-04 用户验收通过

- 用户查看规划审核后的正式回收站交互预览与五张关键截图后回复“确认”，验收整体交互方向。
- `CURRENT.md` 更新为 v3-079，`UI-M2-04` Rev 5 标记 `done`；顶部“页面/场景”下拉仅为原型状态切换器，不进入生产页面。
- `BACK-M2-06` 继续独立开发，不因 UI 验收被打断；`FRONT-M2-06` 仍保持 `blocked`，当前只剩后端交付经规划独立验收这一项依赖。规划通过后再自动解锁前端，不要求用户传话。

## 2026-08-13 — 规划通过 UI-M2-04 Rev 3 交接审计并路由用户验收

- 规划按 FIFO 读取 `CURRENT.md` v3-077、`DESIGN.md` 回收站正式章节、`docs/ui/M2-recycle-bin-acceptance.md`、日志顶部和仓库外五张截图，并按 Product Design 的 UX/可访问性审核框架逐张复核。
- 范围与契约一致：只设计整个项目的回收、48 小时恢复、清理中不可恢复和清理失败等待重试；项目中心确认框清楚列出未完成上传立即终止、已完成资料保留和到期不可恢复三项影响，没有立即永久删除、单文件删除、7 天交付回收、账号权限或真实 R2 越界。
- 五张截图的层级、状态文字、危险操作确认和恢复/清理反馈清楚；状态不只靠颜色表达，恢复失败保留项目，清理失败不伪装成功。1440 与 1024 根页面无横溢，1024 少量横滚只存在于紧凑表格；正式实现须保证恢复主操作仍能通过键盘和表格滚动到达。截图无法单独证明完整读屏语义，后续生产 UI 验收仍须验证焦点、键盘闭环和状态播报。
- `CURRENT.md` 更新为 v3-078，队列 010 关闭；`UI-M2-04` Rev 4 保持 `review` 并路由用户验收。顶部“页面/场景”选择器只属于原型状态切换器，不进入生产页面；`FRONT-M2-06` 继续阻塞，仍需 UI 用户验收和 `BACK-M2-06` 规划验收同时通过。

## 2026-08-13 — UI-M2-04 Rev 3 正式回收站设计交付并交回规划

- UI 设计对话沿用 UI-M2-01 已确认的冷灰 AppShell 与紧凑列表方向，在 `DESIGN.md` 新增项目回收站正式规则，并新增 `docs/ui/M2-recycle-bin-acceptance.md`；仓库外 `qimao-recycle-bin.html` 提供可交互电脑端预览与 5 张关键状态截图。
- 项目中心二次确认明确三项影响：立即终止全部未完成上传且恢复后不自动复活；已完成 Asset、清单和项目资料在 48 小时内保留；到期进入后台清理后不可恢复。回收站覆盖加载、空数据、倒计时、恢复成功/失败、清理中不可恢复、清理失败等待后台重试和项目已清理。
- 1440×900 实测根页面 `1440/1440`、表格 `1178/1178`；1024×768 展开 204px 侧栏根页面 `1024/1024`、表格容器 `778/842`，收起 72px 侧栏根页面仍为 `1024/1024`、表格容器 `910/922`。页面横向范围均为 0，少量横滚只在表格容器内部。
- 八类状态逐项检查通过；项目回收确认、恢复反馈、搜索/筛选/排序和侧栏开合可交互。修正一次侧栏图标重建问题后，以新浏览器标签复验控制台 error/warn 0；Impeccable 降级机械检测返回空结果，真实浏览器与截图为主要证据。
- 本轮未修改 `frontend/src`、后端、迁移或共享契约，未提供立即永久删除、单文件删除、7 天交付回收、账号权限或真实 R2。`CURRENT.md` 更新为 v3-077，`UI-M2-04` Rev 3 `review / Current actor=规划对话`；只交回规划总线审核，不自行请求前端开始或标记完成。

## 2026-08-13 — UI-M2-04 Rev 2 领取

- UI 设计对话完整重读项目级 `AGENTS.md`、协作协议 12.1/12.2、`CURRENT.md` v3-075、`DESIGN.md`、既有 M2 UI 验收、M2 生命周期契约、职责矩阵“回收站”行和开发日志顶部，领取 `UI-M2-04` Rev 1。
- 同步版本更新为 v3-076，任务更新为 Rev 2 `in_progress`；本轮沿用 UI-M2-01 已确认方向，只细化一套项目级回收站正式交互与电脑端预览，不重新做三版发散。
- 写入范围限定为 `DESIGN.md`、`docs/ui/`、仓库外原型与截图及本任务同步行/日志；不修改生产前端、后端、迁移或共享契约，不提供立即永久删除、单文件删除、7 天交付回收、账号权限或真实 R2。完成后只交回规划总线。

## 2026-08-13 — BACK-M2-06 Rev 2 领取

- 后端开发对话完整重读项目级 `AGENTS.md`、协作协议 12.1/12.2、`CURRENT.md` v3-074、M2 生命周期契约、职责矩阵“回收站”行、M2 里程碑和开发日志顶部，领取 `BACK-M2-06` Rev 1。
- 同步版本更新为 v3-075，任务更新为 Rev 2 `in_progress`；本轮只实现本地 Storage fake 下的项目回收/恢复、回收站投影、未完成上传终止与清理、48 小时集中配置、CleanupJob 租约 Worker、对象删除审计和 `purged` 最小墓碑。
- 写入范围限定为 `backend/`、迁移、`packages/contracts/`、`tests/backend/` 及本任务同步行/日志；不修改生产前端或 DESIGN，不接真实 R2，不做全库孤儿核对、单文件/交付回收、账号权限、提交、推送或部署。完成后只交回规划总线。

## 2026-08-13 — 用户确认先完成回收站并解锁 UI/后端并行任务

- 用户明确要求先把回收站相关能力做完，再开始术语与其他核心工作台。规划保持本地 Storage fake 路径，真实 R2、购买与部署继续后置。
- `PLAN-M2-06` 采用已展示的推荐行为并关闭：项目回收时立即终止全部未完成上传并可重复清理未完成分片；48 小时内恢复时保留已完成 Asset、清单和项目资料，但终止会话不自动复活，员工需重新选择原文件并新建上传任务。
- M2 生命周期契约补充上述删除/恢复顺序，并明确本切片的项目级 48 小时回收与长期交付“48 小时后进入 7 天可恢复期”是两个不同生命周期，当前不混做。
- `CURRENT.md` 更新为 v3-074；`PLAN-M2-06` Rev 2 标记 `done`，并行解锁 `UI-M2-04` 与 `BACK-M2-06` Rev 1 `ready`。`FRONT-M2-06` Rev 1 保持 `blocked`，等待 UI 用户验收和后端规划验收同时通过。
- UI 只设计正式回收站和项目中心回收动作；后端只实现项目生命周期、幂等命令、回收投影、租约 Worker、Storage fake 删除和审计。两者均不得扩展到真实 R2、孤儿总核对、单文件/交付回收、账号权限、提交、推送或部署。

## 2026-08-13 — 用户选择本地回收站优先并进入行为确认门

- 用户对 `PLAN-M2-05` 明确选择方案 A：先基于现有 Storage fake 实现本地项目回收站，真实 Cloudflare R2、办公网络实测、购买和部署继续后置。
- 规划核对 `PRODUCT.md`、M2 里程碑、M2 生命周期契约、职责矩阵、既有 UI 验收和当前代码，确认无需重新讨论的基线：只回收整个项目；48 小时内可恢复；`purging` 后不可恢复；普通页面不提供立即永久删除；清理 Worker 使用数据库租约、幂等对象删除、失败重试和最小审计墓碑。
- `CURRENT.md` 更新为 v3-073；`PLAN-M2-05` Rev 2 标记 `done`，新建 `PLAN-M2-06` Rev 1 `review / Current actor=用户`。唯一待确认建议是：回收时立即终止未完成上传并清理未完成分片；恢复时保留已完成 Asset、清单和项目资料，但未完成上传不自动复活，员工须重新选择文件并新建上传任务。
- 用户确认前不解锁 UI、后端或前端实现；本切片不包含 7 天交付素材回收、单文件删除、真实 R2、孤儿总核对、账号权限、提交、推送或部署。

## 2026-08-13 — 规划通过 UI 两态终验并关闭正式上传队列切片

- 规划按 FIFO 审核 `FRONT-M2-04B` Rev 19，读取 Rev 18 两态验收记录并逐张复核仓库外 `frontend-qa-rev18/` 两张 1024×768 截图；两态页面底部均无整页横向滚动条，唯一横向滚动条位于 980px 表格容器内部。
- 展开侧栏 204px 与收起 72px 两态均为根页面 `clientWidth=scrollWidth=1014`、水平范围 0；表格容器分别为 744→980 和 876→980。`innerWidth=1024` 多出的 10px 是 Windows 纵向滚动条槽，测量和视觉证据一致。
- 结合 Rev 8/13 已冻结的共享 MP4、错误恢复、完整上传、后端 `ready`、整批 100%、完成项折叠、1440 页面和控制台证据，规划判定正式多文件上传队列达到本切片验收标准。`CURRENT.md` 更新为 v3-072，队列 009 关闭，`FRONT-M2-04B` Rev 20 标记 `done`；M2 里程碑同步记录完成事实。
- 新建 `PLAN-M2-05` Rev 1 `review / Current actor=用户`，只用于选择下一切片顺序：A 本地回收站优先（推荐）、B 真实 R2 优先、C 暂停开发先预览。用户选择前不解锁任何实现、云资源、购买、部署、提交或推送。

## 2026-08-13 — FRONT-M2-04B Rev 19 UI 两态终验通过并交回规划

- UI 设计对话只复验正式 `/uploads` 的 1024×768 两态，没有重做共享 MP4、错误恢复、完整上传、完成项折叠、1440 页面或业务流程。
- 展开态侧栏 204px：根页面 `clientWidth=scrollWidth=1014`、水平范围 0；`.tableWrap clientWidth=744 / scrollWidth=980`、内部横滚 236px；表格宽 980px。
- 收起态侧栏 72px：根页面同为 `1014/1014`、水平范围 0；`.tableWrap 876/980`、内部横滚 104px；表格宽 980px。`innerWidth=1024` 多出的 10px 是 Windows 纵向滚动条槽，不构成横溢。
- 两张截图底部均无页面级横向滚动条，唯一横向滚动条保留在表格容器内；新增证据保存于仓库外 `frontend-qa-rev18/`。UI 领域结论为通过。
- 按规划总线将 `FRONT-M2-04B` 更新为 Rev 19 `review / Current actor=规划对话`，不自行标记 done、不通知前端或解锁后继任务。未修改生产代码；匿名项目 `1832f637-3a0e-4064-b721-06b13d0c59e6` 已删除，本轮 3000、3001、55432 服务均停止。

## 2026-08-13 — 规划通过 Rev 17 横溢修复审计并路由 UI 两态终验

- 规划按 FIFO 审核 `FRONT-M2-04B` Rev 17，确认本轮生产改动严格限定为 `UploadQueue.module.css`：`.page` 增加 `min-width: 0`，`.tableWrap` 增加 `position: relative`，既有 `overflow-x: auto` 与表格 `min-width: 980px` 保持不变。
- 测量口径核对通过：Windows 非覆盖式纵向滚动条会使 `innerWidth=1024` 而根布局宽为 1014；无页面横溢应以 `scrollWidth === clientWidth` 或水平可滚范围 0 判断。前端证据显示根节点两态均为 1014/1014，表格容器展开 744→980、收起 876→980，横滚只存在于表格容器。
- 规划独立运行 `pnpm exec vitest run tests/frontend/UploadQueue.test.tsx`，1 个文件 7 项全部通过；独立运行正式前端构建，138 个模块构建成功；CSS 行级核对和 `git diff --check` 通过。
- `CURRENT.md` 更新为 v3-070，队列 008 关闭；任务递增为 Rev 18 `review / Current actor=UI 设计对话`。UI 只复验 1024×768 侧栏 204px/72px 两态，不重做共享入口、错误恢复、完成态、1440 页面或业务流程；结论仍须先交回规划总线。

## 2026-08-13 — FRONT-M2-04B Rev 17 修复 1024 页面级横溢并交回规划

- 修复前在同一匿名共享清单下复现 UI 证据：1024×768 展开侧栏 204px 时根页面 `scrollWidth=1188`，收起为 72px 后 `scrollWidth=1056`；表格保持 980px，横向内容逃逸到根页面。
- 根因不是 AppShell 外层网格：`.workspace`、`.main` 和 `.tableWrap` 已允许收缩。实际逃逸来自 UploadQueue 嵌套 Grid 的隐式最小内容约束，以及末列表头绝对定位的全局 `sr-only` 文本没有在表格滚动容器内建立定位上下文。
- 只修改 `frontend/src/features/uploads/UploadQueue.module.css` 两个约束：`.page { min-width: 0; }`；`.tableWrap` 增加 `position: relative`，保留既有 `min-width: 0; overflow-x: auto` 和表格 `min-width: 980px`。没有修改 AppShell、JSX、业务状态或交互。
- 1024×768 修复后展开/收起实测：侧栏分别 204px/72px；两态根节点均为 `scrollWidth=clientWidth=1014`、页面水平可滚范围 0。浏览器 `innerWidth=1024` 与布局宽 1014 的 10px 差值来自 Windows 非覆盖式纵向滚动条槽，因此无横溢的正确判据是 `scrollWidth === clientWidth`，不是强制等于包含滚动条槽的 `innerWidth`。
- 表格自身滚动保持：展开态 `.tableWrap clientWidth=744 / scrollWidth=980`，内部横向范围 236px；收起态为 `876 / 980`，内部横向范围 104px；两态表格实际宽度均为 980px。1024 截图目视确认横向滚动条只出现在表格容器，页面底部不再出现横向滚动条，控制台错误/警告为 0。
- 上传专项 `UploadQueue.test.tsx` 7/7 通过；前端生产构建 138 模块通过；完整 `pnpm check` 退出码 0，8 个测试文件 54 项、lint、类型、迁移与前后端构建全部通过；Impeccable 检测返回空结果，`git diff --check` 无输出。
- 匿名布局项目已核对零残留，本轮 3000、3001、55432 服务均停止。共享 MP4、错误恢复、完整上传、完成项折叠、视觉层级和全部业务交互冻结；未修改后端、迁移、共享契约、DESIGN，未提交、推送或部署。
- `FRONT-M2-04B` 从 Rev 16 `in_progress` 更新为 Rev 17 `review / Current actor=规划对话`；按规划总线只通知规划做交接审计，不直接通知 UI 或解锁下一任务。

## 2026-08-13 — FRONT-M2-04B Rev 16 领取 1024 横溢定向返工

- 前端开发对话重读项目约定、规划总线、`CURRENT.md` v3-067、UI Rev 13 余项复验和日志顶部，确认唯一目标是消除正式 `/uploads` 在 1024×768 的页面级横向溢出。
- `FRONT-M2-04B` 从 Rev 15 `ready` 更新为 Rev 16 `in_progress`；本轮只检查 AppShell 主内容列与 UploadQueue 容器的最小收缩约束，保留 `.tableWrap` 内 980px 表格最小宽度和自身横向滚动。
- 共享 MP4、错误恢复、完整上传、完成态、视觉层级和全部业务交互冻结；不修改后端、迁移、共享契约、DESIGN 或重构其他页面。完成后只交回规划总线。

## 2026-08-13 — 规划审核 1024 横溢并定向退回前端

- 规划按 FIFO 审核 `FRONT-M2-04B` Rev 14：核对 UI 的五张新增证据、页面测量、验收记录、正式 AppShell 与 UploadQueue CSS，确认共享 MP4 正常入口、指纹错误恢复、完整上传、后端 `ready`、完成项折叠和控制台均已通过。
- 唯一退审项成立：1024×768 展开侧栏时页面 `scrollWidth=1188`，收起后仍为 `1056`，密集表格的横向滚动逃逸到整页；这属于已确认设计内的前端布局收缩约束缺陷，不需要重新讨论产品方案。
- `CURRENT.md` 更新为 v3-067，规划队列 007 关闭；同一任务递增为 Rev 15 `ready / Current actor=前端开发对话`。返工仅允许修正 AppShell 主内容列或 `/uploads` 容器收缩，使页面无横溢且 `.tableWrap` 保留自身横向滚动和 980px 表格最小宽度。
- 其余 UI 已通过项全部冻结；前端不得修改后端、迁移、共享契约、DESIGN 或重构其他页面。修复交回规划后，UI 只复验 1024×768 侧栏展开/收起两态，不重做其他证据。

## 2026-08-13 — FRONT-M2-04B Rev 14 UI 余项复验发现 1024 页面级横溢

- UI 设计对话基于 `frontend-qa-rev8/` 既有证据继续余项，没有重做已通过的 1440×900 页面。新增 5 张真实页面截图保存于仓库外 `frontend-qa-rev13/`。
- 通过项：正常素材确认 UI 已允许同集双视频角色共享同一 MP4，保存后上传页 3 项绑定聚合为 2 个物理文件/共享 MP4 单行；错误文件显示“失败”和唯一“重新选择原文件”，正确文件可恢复；完整上传后后端 `ready`、整批 100%、完成项默认折叠并可展开；控制台错误和警告为 0。
- 唯一不通过项：1024×768 展开侧栏时 `documentElement.scrollWidth=1188 > innerWidth=1024`，收起为 72px 后仍 `1056 > 1024`；截图底部出现页面级横向滚动，完成表格从 `x=105` 延伸至 `x=1085`。这违反横向滚动仅留在密集表格容器的 UI 验收边界。
- 最小建议只修正 `/uploads` 主内容网格/容器的收缩约束，保留侧栏 204→72、980px 表格最小宽度、现有视觉与交互；复验只需 1024×768 展开/收起两态，不重做其余通过项。
- 按规划总线将 `FRONT-M2-04B` 更新为 Rev 14 `review / Current actor=规划对话`，只回传规划审核，不直接退回前端或标记 done。未修改生产前端、后端、迁移或共享契约；匿名项目、夹具和本轮服务已清理，3000、3001、55432 均无监听。

## 2026-08-13 — 规划通过 Rev 12 交接审计并路由 UI 继续验收

- 规划按总线登记并审核 `FRONT-M2-04B` Rev 12：修改范围严格限定为 `frontend/src/features/materials/scan.ts` 与 `tests/frontend/ProjectMaterials.test.tsx`，未触碰上传页主体、后端、迁移、共享契约或 DESIGN。
- 代码审计确认路径占用记录现在保留集数与角色，只允许同集、角色恰为 `asr_video + screen_video`、扫描文件为视频的共享；跨集、字幕、其他角色组合和类型/指纹无效继续阻断，与后端 83–99 行规则一致。
- 规划独立运行 `pnpm exec vitest run tests/frontend/ProjectMaterials.test.tsx tests/frontend/UploadQueue.test.tsx`，2 个文件 13 项全部通过；独立运行完整 `pnpm check`，退出码 0。
- 前端提交的真实浏览器证据同时满足正常素材确认 UI 首次保存 HTTP 201、3 项绑定、上传页 2 个物理文件、共享 MP4 单行和控制台 0 错误；匿名项目、夹具与本地服务已经清理。
- `CURRENT.md` 更新为 v3-065，FIFO 006 关闭；任务更新为 Rev 13 `review / Current actor=UI 设计对话`。UI 只从已有 `frontend-qa-rev8/` 证据继续 1024×768、完整完成/折叠、错误恢复、最终控制台和共享入口修正复验，不从头重做。
- UI 无论通过或退审都必须按规划总线交回规划，不直接通知前端、标记 `done` 或解锁下一任务。本轮没有修改生产代码、提交、推送或部署。

## 2026-08-13 — FRONT-M2-04B Rev 12 完成共享 MP4 定向返工并交回规划

- `findPairingBlockers` 的路径占用记录改为保留集数与角色；仅当同一路径在同一集恰好组成 `asr_video + screen_video` 且扫描文件为视频时允许共享。跨集复用、字幕复用、其他角色组合和素材类型/指纹错误继续形成阻断。
- `ProjectMaterials.test.tsx` 新增回归同时覆盖合法同集双视频共享、跨集视频复用、跨集字幕复用和字幕角色占用视频等其他组合；修改范围严格限定为规划指定的两个前端文件，上传页主体未改。
- 素材专项 `ProjectMaterials.test.tsx` 6/6 通过；上传队列专项 `UploadQueue.test.tsx` 7/7 通过；完整 `pnpm check` 退出码 0，仓库检查、lint、类型检查、数据库迁移、全量测试与前后端构建均通过；`git diff --check` 无输出。
- 真实浏览器从正式素材确认页选择匿名文件夹，将同集 EP01.mp4 同时选为中文识别视频与画面字视频后显示 0 个阻断且确认按钮可用；首次保存回显清单 v1、3 项绑定。该新建清单走后端 `created` 成功分支 HTTP 201，前端仅在 `response.ok` 后回显成功。
- 随后通过正式“上传任务”导航进入 `/uploads`：批次显示清单 v1、物理文件 2；EP01.srt 一行，EP01.mp4 以“中文识别视频 · 画面字视频 / 共享文件 · 上传一次”恰好一行展示；浏览器控制台 0 错误。
- 匿名验收项目 `a473aedd-cc1b-423c-a5be-a7e79f8b946b` 已按精确 UUID 删除并核对零残留，临时夹具目录已删除，3000、3001、55432 端口均释放。未修改后端、迁移、共享契约、DESIGN 或上传页主体，未提交、推送、部署或创建云资源。
- `FRONT-M2-04B` 从 Rev 11 `in_progress` 更新为 Rev 12 `review / Current actor=规划对话`；按规划总线只通知规划做交接审计，不直接通知 UI、不标记 `done`、不解锁下一任务。

## 2026-08-13 — FRONT-M2-04B Rev 11 领取共享 MP4 定向返工

- 前端开发对话重读项目约定、规划总线、`CURRENT.md` v3-062、UI Rev 8 冲突证据、M2 契约共享规则和日志顶部，确认当前唯一动作是素材确认前端的局部阻断修正。
- `FRONT-M2-04B` 从 Rev 10 `ready` 更新为 Rev 11 `in_progress`；本轮只修改 `frontend/src/features/materials/scan.ts` 与 `tests/frontend/ProjectMaterials.test.tsx`，允许同集同一路径恰好用于 `asr_video + screen_video`。
- 跨集复用、字幕复用和其他角色组合继续阻断；不修改上传页主体、后端、迁移、共享契约或 DESIGN。完成后运行素材专项、UploadQueue 专项、完整 `pnpm check` 和正常 UI 确认到共享上传队列的真实浏览器链路，再只交回规划总线。

## 2026-08-13 — 规划审核共享 MP4 冲突并定向退回前端

- 规划按总线读取 `CURRENT.md` v3-061、UI Rev 8 六张截图说明、冲突复现、前端 `findPairingBlockers`、后端素材清单验证和既有资产绑定测试，并登记 FIFO 005。
- 冲突成立：`frontend/src/features/materials/scan.ts` 使用 `Map<relativePath, episode>` 对任意重复路径一律阻断；`backend/src/modules/materials/material.routes.ts` 已明确允许同集、两个角色恰为 `asr_video + screen_video`、视频元数据完全一致的共享绑定。后端既有测试还验证共享 MP4 一次上传并绑定唯一 Asset。
- 规划将问题分类为“已确认契约下的局部前端实现缺陷”，无需用户重新选择方案。只允许修正 `findPairingBlockers` 的共享视频例外并在 `ProjectMaterials.test.tsx` 补充同集共享允许、跨集/字幕/其他组合仍阻断的回归；不改上传页主体、后端、迁移、共享契约或已验收视觉。
- `CURRENT.md` 更新为 v3-062，FIFO 005 关闭；`FRONT-M2-04B` 更新为 Rev 10 `ready / Current actor=前端开发对话`。前端须运行素材与上传专项、完整 `pnpm check`，并从正常素材确认 UI 证明 API `201`、上传页 2 个物理文件和共享 MP4 单行。
- 前端完成后按规划总线只交回规划；规划审核通过才路由 UI 从已有 1440×900 证据继续 1024×768、完整完成/折叠、错误恢复和最终控制台复验，不从头重做。
- 本轮只修改状态与日志，没有修改生产前端、后端、迁移、共享契约或 UI 设计，没有提交、推送或部署。

## 2026-08-13 — FRONT-M2-04B Rev 9 UI 验收发现共享清单入口冲突

- UI 设计对话从正式 React `/uploads` 页面执行 1440×900 真实浏览器验收，已验证空状态、素材文件夹/多文件双入口、行动优先紧凑表格、唯一整批总体进度、单文件文字状态、五列排序、素材筛选、选择后批量栏、行内详情和共享物理文件单行；6 张截图保存在仓库外 `frontend-qa-rev8/`。
- 可复现冲突：素材确认页把同集同一 MP4 同时选为中文识别视频和画面字视频后显示“已用于第 1 集，不能重复占用”并禁用确认；但职责矩阵与 M2 契约明确允许该共享。相同清单直接提交本地 API 返回 `201` 和 3 项绑定，上传页正确归并为 2 个物理文件且共享 MP4 只显示一行。
- 根因只读定位为 `frontend/src/features/materials/scan.ts` 的 `findPairingBlockers` 对任意重复路径一律阻断，缺少后端已有的“同集 asr_video/screen_video 且视频元数据完全一致”例外。这是生产正常入口冲突，不是测试操作或非阻断展示问题。
- 按专业异议机制将 `FRONT-M2-04B` 更新为 Rev 9 `blocked / Current actor=规划对话`。最小建议是只修正素材确认前端共享例外并补前端回归；1024×768、完整完成/折叠、错误恢复和最终控制台复验暂缓，修正后从现有证据继续。
- 没有修改 `frontend/src`、后端、迁移或共享契约。匿名项目 `f1ecbe6b-e976-4b49-86c4-144e56c79006`、临时夹具和本轮本地服务已清理，3000、3001、55432 端口已释放；截图证据保留。

## 2026-08-13 — 所有跨角色交接升级为规划总线

- 用户明确要求：后端、前端和 UI 完成任何环节后，无论原本要通知 Reviewer、返工 Owner 还是下一角色，都必须先经过规划对话审核和总流程调度。
- `docs/WORKFLOW.md` 已改为两次规划门：Owner 交付先回规划做交接审计；指定 Reviewer 形成领域结论后再次回规划。只有规划可以标记最终 `done`、退回 `ready`、解锁后继任务及发送跨角色启动/返工通知。
- `AGENTS.md` 同步禁止 UI、前端、后端直接互相接力。所有交付、验收、退审和冲突统一进入 `CURRENT.md` 的规划 FIFO 队列，用户不承担复制和传话。
- `CURRENT.md` 更新为 v3-060；正在执行的 `FRONT-M2-04B` Rev 8 UI 验收不重启，但 UI 的通过、退审或冲突结论必须先回规划，不得直接通知前端或解锁端到端验收。
- 本轮只修改协作协议、项目级约定、当前看板和日志，没有修改生产前端、后端、迁移、共享契约或 UI 设计，没有提交、推送或部署。

## 2026-08-13 — FRONT-M2-04B Rev 8 完成正式多文件上传队列并转 UI 验收

- 新增正式 `/uploads` React 路由和行动优先队列；交付多文件/文件夹双入口、唯一物理文件合并、素材/状态/集数筛选、五列排序、完成项折叠、行内详情、选择后批量暂停/继续/取消、错误重选和原行恢复。
- 单文件只显示文字状态；顶部按后端会话与 Asset 事实计算唯一整批总体进度。ASR 与画面字角色共享同一 MP4 时只形成一行、一个 SHA-256、一个 `UploadSession` 和一个最终 Asset。
- 上传引擎使用服务端分片大小、单文件并发 3、浏览器总并发 12；SHA-256 按 4 MiB 分块并让出主线程。断网恢复后自动续传缺失分片，授权过期自动续签一次，创建/确认/完成/取消复用稳定幂等意图。
- 最终完整 `pnpm check` 退出码 0：8 个测试文件 53 项测试全部通过，lint、类型检查、迁移、前后端构建和仓库边界通过；上传专项 1 个文件 7 项通过，`git diff --check` 无输出，`impeccable` 检测为空。
- 1440×900 真实浏览器以匿名 2 B SRT 和 8 B 共享 MP4 完成双会话完整上传，后端项目归约为 `ready`；页面为整批 100%、2 个物理文件、共享 MP4 单行，完成筛选、批量栏和侧栏收起正常，无横向溢出，控制台 0 错误。
- 匿名验收项目按精确 UUID 核对零残留，2 个临时夹具和本轮本地服务已清理，3000、3001、55432 端口释放。未修改后端、迁移、共享契约、产品或设计规划；未提交、推送、部署、接真实 R2 或创建云资源。
- `FRONT-M2-04B` 从 Rev 7 `in_progress` 更新为 Rev 8 `review / Current actor=UI 设计对话`；下一步仅由 UI 对话按 Rev 15 合并方向做真实页面视觉/交互验收，通过后再通知规划端到端验收。

## 2026-08-13 — FRONT-M2-04B Rev 7 领取正式多文件上传队列

- 前端开发对话重读 `AGENTS.md`、协作协议、`CURRENT.md` v3-057、职责矩阵“上传任务”行、`DESIGN.md` 5.2、M2 上传契约、已验收 Rev 15 合并方向和开发日志顶部，确认 UI 与后端依赖均已通过。
- `FRONT-M2-04B` 已从 Rev 6 `ready` 递增为 Rev 7 `in_progress`；本轮仅实现正式 React 多文件上传队列、前端测试和真实浏览器验证。
- 写入边界固定为 `frontend/src/`、`tests/frontend/`、前端自有说明以及本任务必需的共享状态/日志行；不修改后端、迁移或共享契约，不实现或注册任务中心、术语、ASR/OCR、审改、验收、交付、真实 R2 或云资源。

## 2026-08-13 — 规划登记 UI-M2-03 Rev 16 通过并解锁正式前端

- 规划按队列读取 `CURRENT.md` v3-056、最终 UI 验收记录、`DESIGN.md`、职责矩阵和 Rev 15 合并方向截图，确认用户已明确验收通过，且最终稿只包含上传模块能力。
- 最终方向固定为：行动状态分组、完成项折叠和行内详情；“选择素材文件夹 / 选择多个文件”双入口；轻量素材/状态标签、普通筛选与选择后批量栏；单文件只显示文字状态，整批顶部显示唯一总体进度。
- `PLAN-M2-04`、`BACK-M2-04A` 与 `UI-M2-03` 三项依赖全部满足。规划队列新增并关闭 004；`CURRENT.md` 更新为 v3-057，`FRONT-M2-04B` 递增为 Rev 6 `ready / Current actor=前端开发对话`。
- 前端只获准修改 `frontend/src/`、`tests/frontend/` 和前端自有说明，消费现有后端与共享契约；不得实现或注册任务中心、术语、ASR/OCR、审改、验收、交付、真实 R2 或云资源。完成后由 UI 对话验收真实页面，再由规划做端到端验收。
- 规划检查发现 UI 验收记录第 148、150 行仍保留验收前旧停止边界；该文档属于 UI 设计角色，将自动通知 UI 做非阻塞机械修正，不影响已由顶部结论、CURRENT 和用户明确反馈成立的验收结果。
- 本轮未修改生产前端、后端、迁移或共享契约，未提交、推送、部署或创建云资源。

## 2026-08-13 — UI-M2-03 Rev 16 用户验收通过

- 用户对 Rev 15 合并确认稿反馈“目前没看出什么问题”，确认该组合方向可作为正式前端实现依据。
- 最终方向保持方案一的行动状态分组、完成项折叠和行内详情，采用方案二的上传双入口、轻量标签、普通筛选与选择后批量栏；单文件不显示百分比或进度条，只有整批顶部显示总体进度。
- `UI-M2-03` 更新为 Rev 16 `done` 并清空 `Current actor`；验收记录与截图证据见 `docs/ui/M2-upload-queue-acceptance.md`。
- UI 对话没有修改或解锁生产前端、后端、迁移和共享契约。下一步交给规划对话按队列与依赖协议决定是否解锁 `FRONT-M2-04B`；生产实现完成后仍须由 UI 设计对话进行真实页面视觉/交互验收。

## 2026-08-13 — UI-M2-03 Rev 15 组合方向确认稿

- 用户从 Rev 12 三版中选择“方向 1 整体 + 方向 2 局部控件”：保留行动状态分组、完成项折叠和行内详情，替换为并列的“选择素材文件夹 / 选择多个文件”、轻量素材/状态标签、普通筛选与选择后批量栏。
- 按用户反馈移除所有单文件上传百分比和逐文件进度条；单文件只显示“上传中”等文字+语义色状态，整批顶部保留唯一总体进度与百分比。
- 已生成并目视复核 Rev 15 合并确认稿：`C:\Users\ComradeGu\.codex\visualizations\2026\08\12\019ff52d-d4a1-7440-81a2-fc9c1b0a0996\rev12\04-selected-combined-direction.png`。稿件只包含素材上传范围，没有后续流程导航。
- `UI-M2-03` 更新为 Rev 15 `review / Current actor=用户`，等待用户确认组合稿。`FRONT-M2-04B` 继续阻塞；没有修改生产前端、后端、迁移或共享契约。

## 2026-08-13 — UI-M2-03 Rev 14 上传专用三版交付

- Product Design audit 重新查看当前上传页与用户参考截图，确认可保留的是紧凑表格、分类/筛选层级、文字+语义色、排序、选择和行尾菜单；需要删除的是常驻技术详情、竞争动作和任何后续流程导航。
- Impeccable distill 将页面单一目标收敛为“员工一次选择多个文件或素材文件夹，在一个紧凑队列中看到多个物理文件并行上传，并优先恢复失败项”；相对路径、指纹、会话、分片和请求 ID 仅在原行展开。
- Product Design ideate 独立生成并逐张复核恰好三版 1440×1024 方向，分别使用行动状态分组、单表行动优先和按集台账三种组织方式；三张证据保存在仓库外 `rev12/` 目录，显示顺序即用户选择编号。
- 三版均只包含多文件/文件夹选择、素材分类、上传状态筛选、紧凑物理文件列表、批量选择、排序、进度、恢复和取消未完成上传；没有术语、中文识别、画面字、前置审改、字幕验收或交付流程导航。
- `UI-M2-03` 更新为 Rev 14 `review / Current actor=用户`，等待用户选择 1/2/3 或提出组合返工。`FRONT-M2-04B` 继续阻塞；没有修改生产前端、后端、迁移或共享契约，没有提交、推送、部署或创建云资源。

## 2026-08-13 — UI-M2-03 Rev 13 领取上传专用三版返工

- UI 设计对话完整重读项目协议、`CURRENT.md` v3-052、模块职责矩阵、`DESIGN.md` 5.2、M2 里程碑和上传队列验收记录；任务指向职责矩阵“上传任务”单一模块行。
- 同步版本更新为 v3-053，任务更新为 Rev 13 `in_progress`。本轮按 Product Design audit → Impeccable distill → Product Design ideate 执行并只交付恰好三版电脑端方向。
- 三版仅覆盖多文件/文件夹选择、素材分类、上传状态筛选、紧凑物理文件列表、多文件并行状态与恢复；禁止出现术语、中文识别、画面字、前置审改、字幕验收和交付流程标签。
- 只修改 `DESIGN.md`、`docs/ui/` 和仓库外原型/截图；不修改生产前端、后端、迁移或共享契约，不解锁 `FRONT-M2-04B`。

## 2026-08-13 — 规划完成 UI-M2-03 Rev 11 跨角色范围冲突审查

### 裁决与权威边界

- 异议成立。上传任务只拥有多素材选择、物理文件上传、素材分类、上传状态、暂停/续传、服务端校验、失败恢复和取消未完成上传；术语、中文识别、画面字、前置审改、字幕验收和交付不得出现在上传页流程导航。
- 新增 `docs/contracts/MODULE_RESPONSIBILITY_MATRIX.md`，逐项固定用户目标、模块归属、任务 ID、UI/前端/后端权限、权威数据、允许目录、非目标、依赖和验收；`docs/WORKFLOW.md` 同步要求每个 `ready` 任务只能指向一个矩阵模块行。
- 明确“上传任务 / 任务中心 / 项目工作台”三边界：上传任务只传文件；任务中心后续汇总 ASR/OCR/AI/导出异步执行；项目工作台承载术语确认、识别结果、人工审改、验收和交付。
- 多文件选择按唯一物理文件建立多个独立 `UploadSession`，项目与清单版本下的批次只是只读投影；同集两个视频角色共享同一 MP4 时只上传一次，批量动作逐项执行现有会话命令。

### 跨代码审查与任务写回

- 只读扫描 `frontend/src`、`backend/src/modules`、`packages/contracts/src` 和相关测试：正式前端尚无上传页；术语、中文识别、画面字仅是未路由且未由 AppShell 展示的 `planned` 项目模块。后端只有项目、素材和上传模块，素材角色名称没有对应 ASR/OCR 执行接口或供应商调用，因此无需返工已验收生产代码。
- 修正 `DESIGN.md`、M2 里程碑、M2 上传契约、架构和 UI 验收记录，清除上传页与后续处理混放的输入，并把旧稿浏览器证据明确降为作废历史，不能用于新稿验收。
- 规划队列 003 关闭；`CURRENT.md` 更新到 v3-052。`UI-M2-03` 递增为 Rev 12 `ready / Current actor=UI 设计对话`，只重做三版多素材上传方向；`FRONT-M2-04B` 递增为 Rev 5 且继续 `blocked`，等待修正版 UI 用户验收。
- 本轮没有修改生产前端、后端、迁移或共享代码契约，没有接入任务中心、术语、ASR/OCR、回收站、云资源或付费服务，没有提交、推送或部署。

## 2026-08-13 — UI-M2-03 Rev 11 提交任务边界冲突审查

- 用户明确指出上传任务只负责素材分类与素材上传，并须支持一次选择多个素材、多个物理文件并行上传；术语、中文识别、画面字、前置审改、字幕验收和交付属于任务中心或后续工作流。
- UI 首轮三版错误地把七个后续流程标签放入上传任务，均已作废；`DESIGN.md` 与 UI 验收记录已撤回该错误边界，没有修改生产前端、后端、迁移或共享代码契约。
- 冲突类型为产品规则、UI/交互与任务所有权冲突。可复现证据是三版顶部流程导航与用户最新口径直接相反；若继续会把错误信息架构传入 `FRONT-M2-04B`，并可能掩盖前后端同类越界。
- `UI-M2-03` 更新为 Rev 11 `blocked / Current actor=规划对话`。最小建议是规划形成逐环节职责/范围矩阵，覆盖模块归属、任务 ID、UI、前端、后端、权威数据、允许目录、非目标、依赖和验收，并审查现有前后端任务后再重新分派 UI。
- 不受影响且可保留的输入为：13 类状态、紧凑物理文件列表、文字+语义色、五列排序、选择后批量栏、行内渐进详情、唯一主恢复动作和需确认的“取消未完成上传”。受影响的视觉出图与开发解锁已停止。

## 2026-08-13 — UI-M2-03 Rev 10 领取三版视觉返工

- UI 设计对话完整重读项目级 `AGENTS.md`、协作协议 v3、`CURRENT.md` v3-049、`DESIGN.md`、M2 里程碑与开发日志顶部，并直接查看用户提供的参考截图。
- 同步版本更新为 v3-050，任务更新为 Rev 10 `in_progress`；本轮按指定顺序执行 Product Design audit、Impeccable distill 和 Product Design ideate。
- 交付限定为恰好三版可视方向，均保留上传流程与 13 类状态，并覆盖本地化一级流程、二级筛选、紧凑列表、行内渐进详情、文字+语义色状态、五列表头排序、勾选后批量栏、行尾三点菜单和唯一主恢复动作。
- 本轮只修改 `DESIGN.md`、`docs/ui/` 与仓库外原型/截图；不修改 `frontend/src`、后端、迁移或共享契约，不自行确定最终版，不提前解锁前端。危险动作只允许需确认的“取消未完成上传”，已完成 Asset 不删除。

## 2026-08-13 — UI-M2-03 Rev 8 补充状态、排序、批量选择与行级菜单

### 已确认的表格行为

- 用户确认借鉴参考截图的状态标签、表头排序、逐行/全选勾选和行尾三点菜单；这些能力必须与紧凑列表一起设计，不能重新铺成一排操作按钮。
- 状态同时使用文字和语义色；文件/标题、集数、状态、大小、更新时间支持可见的升降序，默认先突出失败、待处理和进行中项目，再按集数排列。
- 勾选后才出现批量操作栏；三点菜单只放低频行级操作。主要恢复动作继续直接可见，避免用户每次都进入菜单寻找“继续、重试”等当前必要动作。
- 删除语义拆开：未完成上传只能执行“取消未完成上传”，并明确已完成素材不删除；已完成 Asset、原始素材或整个项目的删除必须等待回收站契约，不能在上传列表用通用“删除”直接清除。

### 状态与边界

- `UI-M2-03` 从 Rev 8 递增为 Rev 9，仍为 `ready / Current actor=UI 设计对话`；`FRONT-M2-04B` 继续阻塞。
- 本轮只补充 UI 任务输入，没有修改生产实现、后端契约、上传状态或数据删除规则。

## 2026-08-13 — UI-M2-03 Rev 7 补充鬼手式分类的本地化适配

### 已确认的信息架构

- 用户提供鬼手项目页截图，只要求学习“一级分类标签、当前分类筛选、紧凑列表”的组织方法，不要求复刻品牌、配色、栏目名称或业务逻辑。
- 规划只读核对原本地工作台：中文识别与画面字是两类独立任务；项目术语是识别与审改的前置门禁；字幕审改和视频验收是前后两个不同工作台；学习库是后台不可变记录和维护能力，不属于普通员工主导航。
- 云端项目内一级流程固定按真实生产顺序表达为“素材、术语、中文识别、画面字、前置审改、字幕验收、交付”；二级筛选随当前模块变化。人名条属于素材角色/画面字，视频任务属于任务事实，公司级规则资产和学习库保留为未来受控入口。
- 顶部标签只突出待处理或失败数量，不机械展示各模块不同单位的总数；列表继续采用紧凑主列和按需展开详情，避免分类改进反而增加信息噪声。

### 状态与边界

- `UI-M2-03` 从 Rev 7 递增为 Rev 8，仍保持 `ready / Current actor=UI 设计对话`；本次只是 UI 返工输入补充，不改变后端、里程碑范围或前端阻塞状态。
- 参考截图仅作为当前设计输入，不进入生产素材或业务数据库；UI 三版预览必须经过用户选择，不能把参考站点直接当成已确认设计。

## 2026-08-13 — UI-M2-03 Rev 6 用户视觉退审并定向返工

### 用户结论与返工范围

- 用户确认当前上传队列列表观感偏杂乱，未通过 Rev 6 的最终视觉验收；既有上传流程、物理文件聚合、共享角色、暂停/继续、刷新重选、错误恢复和 13 类状态均继续保留。
- 返工方向确认为“紧凑主列表 + 行内渐进展开详情”：默认只显示文件/集数、角色、状态、进度/大小和一个主操作；路径、指纹、会话、分片、请求标识和完整错误详情按需展开；批次摘要压成一行，已完成项可折叠，次要操作收进更多菜单。
- UI 对话须先用 Product Design audit 形成当前稿的截图证据，再用 Impeccable distill 做信息减法，最后用 Product Design ideate 提供恰好三版可视方向给用户选择；不得由 UI 对话自行确定最终方案。

### 状态与边界

- `UI-M2-03` 递增为 Rev 7，退回 `ready / Current actor=UI 设计对话`；规划队列 002 已关闭，交接改由固定 UI 对话执行。
- 本轮没有修改 `DESIGN.md`、UI 原型或生产代码，没有删除功能，没有改变后端契约；`FRONT-M2-04B` 继续保持阻塞，直到用户选定并验收新的 UI 方向。

## 2026-08-13 — 规划独立验收 BACK-M2-04A Rev 5 通过

### 验证与结论

- 重新运行完整 `pnpm check`，退出码 0；仓库边界、lint、typecheck、本地 PostgreSQL 18.4 迁移、7 个测试文件 46 项测试以及共享契约、后端和前端构建全部通过。
- 单独复跑 `material-assets.test.ts`、`materials.test.ts`、`uploads.test.ts`，3 个后端测试文件 31 项全部通过。
- 代码级核对确认：同一物理文件必须一次覆盖清单内共享该指纹的全部角色；完成落账、Asset 创建与槽位绑定处于同一数据库事务；非生产且确为内存 Storage fake 时才注册本地二进制 PUT，生产环境不暴露该入口。
- `git diff --check` 对后端、共享契约和后端测试无输出；范围扫描没有发现 AWS SDK、R2 客户端、ASR/OCR、API Key 或 `.env` 接入，命中仅为正常的运行环境判断。

### 写回与边界

- `BACK-M2-04A` 递增为 Rev 6 并标记 `done`；规划队列 001 已关闭。
- `FRONT-M2-04B` 递增为 Rev 4 但继续保持 `blocked`，当前只等待 `UI-M2-03` 的用户视觉/交互验收；本轮没有提前唤醒前端。
- 未修改后端业务实现，没有接入 R2、回收站、ASR/OCR，没有创建云资源、提交、推送、部署或发布。

## 2026-08-13 — 规划自动交接改为单活动先进先出队列

### 已完成

- 在 `docs/WORKFLOW.md` 12.2 固化规划接力收件队列：按首次有效交接到达顺序分配序号，不按角色或预设开发顺序写死。
- 规定全局最多一个 `active` 项；后到自动消息只能入队，等待用户或依赖的项目保留原序号但让出执行位，同任务同 Rev 重复消息合并、新 Rev 重新排到队尾。
- 在 `CURRENT.md` 建立权威队列表：`BACK-M2-04A` Rev 5 为当前活动复验，`UI-M2-03` Rev 6 保留第二到达序号并等待用户视觉/交互验收。
- 明确普通自动消息不得抢占；只有用户明确要求停止、替换或调序时才能改变当前优先级并记录原因。

### 边界

- 本轮只修改协作协议、当前队列和日志，没有改变 UI 或后端任务的业务验收状态，没有解锁 `FRONT-M2-04B`。
- 后端独立复验此前因系统审批连接中断尚未形成通过或退回结论，仍需作为当前活动项继续完成。

## 2026-08-13 — UI-M2-03 Rev 6 完成并转交用户验收

### 已完成

- 在 `DESIGN.md` 固化正式上传队列：按物理文件聚合，同集中文识别视频与画面字视频共享同一 MP4 时只上传一次；批次和单文件分别提供暂停、继续、重新选择、取消与错误恢复。
- 明确本机暂停不改变服务端会话；刷新后先恢复后端清单与分片事实，再重新选择原文件并只续传缺失分片；指纹不符、会话过期、后端校验和项目回收均有独立动作。
- 完成仓库外交互预览与 `docs/ui/M2-upload-queue-acceptance.md`；侧栏支持 204px 与 72px 收展，高风险取消使用原生确认层，项目回收提供明确恢复出口。

### 验证

- 无头 Chrome 覆盖 13/13 状态；正常队列状态各有 5 条物理文件行，可见页面标题始终为 1，整页横向溢出为 0，控制台错误为 0。
- 暂停/继续实际往返 `uploading` / `paused`，刷新恢复重新选择后返回 `uploading`；侧栏实测 204↔72，1024px 默认保持 204px。
- 取消确认实际打开，安全返回按钮默认获得焦点；详情包含会话有效期和最近错误，项目回收恢复按钮可见。
- 1440×900 正常上传与 1024×768 刷新恢复截图完成；Impeccable 降级机械检测的唯一进度条动画警告已修正。独立完成复核首轮 `revise` 的 5 项实质缺口全部 `resolved`，最终 disposition 为 `ship`。
- `git diff --check` 对本轮 UI 权威文件无输出；未修改 `frontend/src`、后端、迁移或共享代码契约。

### 边界与交接

- `UI-M2-03` 已转为 Rev 6 `review`，当前只等待用户视觉与交互验收；`FRONT-M2-04B` 仍不得由 UI 对话提前解锁。
- 本轮未读取真实媒体字节，未接 R2、回收站 Worker、识别或付费服务，没有提交、推送、部署或创建云资源。

## 2026-08-13 — BACK-M2-04A Rev 5 完成并转交规划复验

### 已完成

- 后端开发对话按 M2.1 契约建立 `material_asset_bindings` 与 `upload_session_material_targets`，由 PostgreSQL 持有清单版本、集数、素材角色、Asset 和源指纹的权威关联；清单读取和上传会话读取返回共享代码契约中的绑定信息。
- 素材清单只放宽同一集 `asr_video` / `screen_video` 对同一路径、同元数据 MP4 的共享，其他跨集、公司 SRT 或跨类型重复仍拒绝；一次上传必须覆盖共享文件的全部角色，并最终绑定同一个 Asset。
- 新清单按项目、指纹、大小和媒体类型复用已校验 Asset；上传过程中出现同一身份的新清单时，旧会话完成也会把 Asset 安全投影到最新清单，不跨项目复用。
- 项目状态由后端按最新清单和上传/绑定事实统一归约，优先级为 `blocked → verifying → uploading → ready → draft`；未选择 `screen_video` 不阻塞 `ready`，失败、过期或清单变更造成的可操作缺口进入 `blocked`。
- 新增项目详情、项目上传会话列表，以及仅在非生产环境且使用内存 Storage fake 时注册的二进制 HTTP PUT 分片入口；生产环境不暴露该入口，也未实现真实对象存储适配器。

### 验证

- 资产绑定、素材清单和上传协议定向回归 3 个测试文件 31 项全部通过；覆盖同文件双角色唯一 Asset、清单复用与变更阻断、错误指纹/不完整角色拒绝、无画面字仍就绪、上传期间新清单绑定，以及既有上传生命周期回归。
- 完整 `pnpm check` 退出码 0：仓库边界、lint、typecheck、本地 PostgreSQL 18.4 迁移、7 个测试文件 46 项测试、共享契约与前后端构建全部通过。
- 源码范围扫描未发现 AWS SDK、R2 客户端、ASR/OCR 实现、API Key 或 `.env`；测试仅使用匿名 4–8 字节代码内样例。

### 边界与交接

- 本任务没有修改 `frontend/`、UI 原型或产品语义，没有接入 R2、回收站、ASR/OCR，没有购买或创建云资源，也没有提交、添加远程、推送、部署或发布。
- `BACK-M2-04A` 已转为 `review`，当前轮到规划对话按 M2.1 契约独立复验；本后端对话停止，不自动领取前端或后续任务。

## 2026-08-13 — UI-M2-03 Rev 5 领取

- UI 设计对话完整重读项目级 `AGENTS.md`、协作协议 v3、`CURRENT.md` v3-041、`DESIGN.md`、M2 里程碑和 M2.1 契约，领取 `UI-M2-03` Rev 4。
- 同步版本更新为 v3-042，任务更新为 Rev 5 `in_progress`；与 `BACK-M2-04A` 并行期间只拥有 `DESIGN.md`、`docs/ui/` 和仓库外原型/截图。
- 本轮只设计整剧/单文件上传队列、同文件双视频角色标识、浏览器暂停/继续、刷新后重新选择、错误恢复和完整状态预览；不修改 `frontend/src`、后端、迁移、共享代码契约，不接真实 R2，不提交、推送或部署。

## 2026-08-13 — BACK-M2-04A Rev 4 领取

- 后端开发对话完整重读项目级 `AGENTS.md`、协作协议 v3、`CURRENT.md` v3-040、M2 里程碑和 M2.1 契约，领取 `BACK-M2-04A` Rev 3。
- 同步版本更新为 v3-041，任务更新为 Rev 4 `in_progress`；与 `UI-M2-03` 并行期间只拥有 `backend/`、迁移、`packages/contracts/` 和 `tests/backend/`。
- 本轮只交付版本化 Asset 绑定、同集双视频角色共享一次上传、后端项目状态归约、非生产 fake HTTP 分片入口及后端回归；不修改前端/UI，不接真实 R2、回收站或识别功能，不提交、推送或部署。

## 2026-08-13 — PLAN-M2-04 确认与自动接力启用

### 用户确认与规划固化

- 用户明确回复“可以”，确认紧邻上下文中的 `PLAN-M2-04` 路径：UI 设计与后端资产绑定并行，两项分别验收后再由前端集成。
- M2 契约升级为 M2.1 规划确认基线：同集 `asr_video` 与 `screen_video` 可以共享一次上传和同一个已校验 Asset；其他跨集、公司 SRT 或跨类型复用仍禁止。新增清单角色—Asset 独立绑定语义，并确定后端项目状态归约优先级。
- `PLAN-M2-04` 更新为 Rev 3 `done`；`UI-M2-03` 更新为 Rev 4 `ready`，`BACK-M2-04A` 更新为 Rev 3 `ready`；`FRONT-M2-04B` 更新为 Rev 3 并继续等待两个上游验收。

### 自动通知机制

- `CURRENT.md` 登记规划、UI、后端和前端四个固定 Codex 任务 ID；协议新增“交付后通知 Reviewer、验收后通知下一角色、冲突通知规划”的自动接力规则。
- 自动消息只负责唤醒，接收任务必须重读权威文件；消息发送失败不得要求用户手动传话。只有 `Current actor=用户` 的产品、视觉、成本或数据决策仍需用户本人确认。

### 边界

- 同步版本更新为 `v3-040`。本轮只固化已确认规划、解锁任务和协调规则；没有修改业务实现、数据库迁移或生产 UI，没有提交、推送、部署、购买或创建云资源。

## 2026-08-13 — COORD-v3 四角色协议与冲突审查机制

### 已完成的协作升级

- 用户授权新增独立“前端开发对话”，现有开发对话固定为“后端开发对话”；代码仍保留在同一个 `qimao-terms-cloud` 仓库和同一工作目录，不拆成两个代码项目。
- `docs/WORKFLOW.md` 升级为 v3，明确规划、UI 设计、后端开发和前端开发的目录所有权、共享契约唯一写入者、任务颗粒度、并行条件、七项交接、前端依赖门禁和双阶段验收。
- 项目级 `AGENTS.md`、M2 里程碑、README 和 `CURRENT.md` 已同步四角色名称；新开发任务使用 `BACK-*` / `FRONT-*`，历史 `DEV-*` 保留为历史事实。
- 主线拆为 `UI-M2-03`、`BACK-M2-04A` 和 `FRONT-M2-04B`：UI 与后端只在用户确认后并行，前端必须等待两项依赖通过，不能复制接口或另建业务状态。
- 已在同一保存项目和本地工作目录创建并置顶前端开发任务 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf`。它首次读取 `v3-036`、随后主动接收规划同步并重读 `v3-037`，均正确识别 `FRONT-M2-04B` 为阻塞状态并停止；两轮都未修改文件或领取任务。
- 规划已直接向现有 UI 与后端任务发送 `v3-038` 同步；两者均返回固定角色、所有权、禁写边界、冲突升级方式和当前任务状态，且没有修改文件或提前领取任务。用户不再承担这次角色协议的人工转述。

### 专业异议与主管审查

- 用户补充确认：每个角色都可以评价方案和提出专业意见。发现 UI 不合理、前后端对接、状态、成本、性能或安全冲突时，角色将受影响任务暂停并把可复现证据交给规划对话。
- 规划负责区分实现缺陷、文档/代码契约不一致、UI/技术冲突和产品取舍；已确认范围内直接裁决，涉及体验、范围、成本或数据策略时形成选项并与用户共同决定，再一次性更新所有受影响任务。
- 异议不授权各角色自行改方案；裁决必须记录采纳/拒绝、依据、影响、下一动作和验收。用户不承担跨对话传话。

### 边界

- 本轮只更新协作、里程碑和任务状态文档，并创建独立前端开发任务；未修改业务代码、数据库或 M2 代码契约，没有提交、推送、部署或创建云资源。
- 最终看板同步到 `v3-039`；只有 `PLAN-M2-04` 的 `Current actor=用户`，三个依赖任务在等待期间使用 `Current actor=—`，避免把同一个用户决策伪装成三项待办。

## 2026-08-13 — PLAN-M2-04 主线恢复与方案确认门建立

### 已核对事实

- M2 已完成项目中心、整剧素材元数据清单和内存 Storage fake 分片协议；正式上传队列 UI、浏览器真实分片、Asset 与清单角色绑定及回收站仍未完成。
- 当前内存 fake 只通过测试代码的 `uploadAuthorizedPart` 接收字节，没有浏览器可调用的 HTTP 上传目标，因此不能直接解锁正式上传 UI 并声称端到端可验收。
- 当前 `Asset` 只绑定项目，尚未绑定清单版本、集数和素材角色；项目 `ready` 也不能依据最新清单的必需绑定可靠计算。
- 现有清单对 `manifest_id + relative_path` 设置唯一约束并禁止重复占用，与用户已确认“同一 MP4 可同时作为同集 ASR 视频和画面字视频”冲突，下一切片必须定向修正。

### 状态与边界

- `CURRENT.md` 同步至 `v2-035`，新增 `PLAN-M2-04` Rev 1 `review`、`UI-M2-03` Rev 1 `blocked` 和 `DEV-M2-04A` Rev 1 `blocked`，当前轮到用户确认具体推进路径。
- 规划推荐 UI 上传交互设计与后端绑定/本地浏览器上传桥并行，二者验收后再由独立开发任务集成正式页面；用户确认前不解锁。
- 本轮只读核对并更新任务状态，没有修改 M2 契约、业务代码或数据库；没有提交、推送、部署、购买或创建云资源。

## 2026-08-13 — PLAN-LONG-03 批量基准切换与后台学习库确认

### 已确认的产品结论

- 公司稿/ASR 基准支持系统默认、整剧、选中集批量和单集覆盖；批量切换只写入对应单集覆盖值，并且只影响未确认项，不覆盖已有采纳稿。
- 每次人工采纳、修改、合并、断句和时间轴修正都保存不可变学习事件；项目回收或删除不能删除已经归档的学习证据。
- 项目内已确认修正可立即生成后续建议，跨项目证据只聚合为隐藏候选；候选经过人工批准、真实回归和版本化评估后才能发布为公司级热词、纠错规则或训练数据版本。
- 普通员工不显示跨项目学习库或候选规则；当前无账号阶段不提供普通业务读取接口。第一阶段不复制音频或视频，真正的 ASR 微调或蒸馏需要另行确认数据授权、保留期限、评估和预算。

### 文档与范围

- 更新 `PRODUCT.md`、`DESIGN.md` 和 `docs/architecture.md`，统一基准解析、批量命令、学习事件所有权、隐藏范围、发布门禁和失败恢复。
- `CURRENT.md` 同步至 `v2-034`，新增已完成的 `PLAN-LONG-03`；没有创建或解锁开发任务。
- 本轮未修改本地应用、云端业务代码、数据库或 M2 契约；没有采集训练数据、提交、推送、部署、付费调用或创建云资源。

## 2026-08-13 — PLAN-LONG-02 双源字幕采纳与格式规则确认

### 已确认的产品结论

- 公司 SRT 与 ASR 都作为只读来源；每集允许切换对照主基准，逐条通过采用公司稿、采用 ASR、合并或人工修改形成唯一采纳稿，并记录采纳来源。
- ASR 质量推荐综合音频覆盖、术语命中、低置信片段、时间轴完整度和异常长句比例，不使用单一置信度，也不自动覆盖人工结果。
- 最终台词轨去除常规中英文标点，停顿用空格，多人对白保留行首半角减号；对照时忽略纯标点、空格和相邻分轴差异。画面字轨不应用台词去标点规则。
- 单轴目标不超过 18 个有效字，19–28 字提示优化，超过 28 字阻断待验收发布；自动断句优先使用停顿、词级时间戳和语义边界，并保护术语、姓名和数字，无法可靠切分时转人工确认。

### 文档与范围

- 更新 `PRODUCT.md`、`DESIGN.md` 和 `docs/architecture.md`，同步双源数据所有权、界面动作、质量推荐和确定性格式门禁。
- `CURRENT.md` 同步至 `v2-033`，新增已完成的 `PLAN-LONG-02`；没有创建或解锁开发任务。
- 本轮未修改两个本地应用、云端业务代码、数据库或 M2 契约；没有提交、推送、部署、付费调用或创建云资源。

## 2026-08-13 — PLAN-LONG-01 双工作台长期边界校准

### 已确认的产品结论

- 只读核对原“海外短剧审改工作台”“字幕验收工作台”及其交接规格后，将长期主链路明确为：前置审改发布待验收修订，视频字幕验收读取快照并形成冻结验收版本，正式交付只读取有效冻结版本。
- 用户确认：单个局部问题可在视频字幕验收端直接修正；整集或批量问题退回前置审改并产生新修订。
- 用户确认：视频字幕验收首期保留文字、开始/结束时间、拖动、增加和删除字幕；不在验收端重新运行 ASR、OCR 或制作术语。
- 复杂内容风险、人物/人脸画面风险和严重等级阻断退出近期主流程；近期只保留视频证据与字幕时间轴等技术门禁，后续根据真实使用再设计。

### 文档与范围

- 更新 `PRODUCT.md`、`DESIGN.md` 和 `docs/architecture.md`，统一双工作台职责、返工边界、冻结失效规则、交付产品库和视频清晰度/保留策略。
- `CURRENT.md` 同步至 `v2-032`，新增已完成的 `PLAN-LONG-01`，没有创建或解锁开发任务。
- 本轮未修改业务代码、数据库或 M2 契约；没有提交、推送、部署、付费调用或创建云资源。`DEV-M2-04` 仍须先与用户讨论清单版本—集数—素材角色—资产绑定和项目状态计算。

## 2026-08-13 — DEV-M2-03 Rev 9–10 规划最终复验通过

### 独立验证

- 重新运行完整 `pnpm check`，退出码0：仓库边界、lint/typecheck、本地 PostgreSQL迁移、6个测试文件41项测试和前后端构建全部通过。
- 上传专项17项逐项通过；新增“会话完成后仍稳定重放此前成功的分片确认”与此前16项状态机回归全部保持通过。
- 规划独立匿名8字节终验真实执行两分片上传流程：首次确认200、整份完成 `200 / completed`、完成后原键原请求迟到重放 `200 / completed`，返回最终素材且数据库素材计数为1。
- 匿名项目按精确 UUID 清理；范围扫描未发现 AWS SDK、R2、浏览器文件读取或下一阶段实现；`git diff --check` 无输出。
- 首次专项因本地 PostgreSQL已停止而在连接阶段统一失败；随后使用项目统一 `pnpm check` 完成数据库准备，并取得上述专项17/17和完整41/41的有效结果。

### 正式结论与边界

- 最后一处延迟幂等重放缺口达到复验标准；同步版本由 `v2-030` 更新为 `v2-031`，`DEV-M2-03` 从 Rev 9 `review` 更新为 Rev 10 `done`，`Current actor` 清空。
- 完成范围为本地内存 Storage fake 与分片上传协议地基，不代表正式上传 UI、真实文件直传、R2、网络吞吐、回收站或云端部署已完成。
- 未创建或解锁下一任务。下一步先由规划对话与用户协商清单版本—集数—素材角色—资产绑定和项目状态计算；未提交、推送、部署或创建云资源。


## 2026-08-13 — DEV-M2-03 Rev 8–9 延迟幂等重放修正完成

### 实际修改

- 路由在项目生命周期、会话状态、过期和存储信息门禁前，先按幂等键、请求摘要和上传会话识别已持久化的 `confirm_part` 命令；同键同请求直接返回当前权威会话。
- 仓储事务内同样把既有命令识别移到当前状态门禁之前，覆盖路由预检完成后发生并发状态变化的窗口。
- 同键异请求仍返回 `IDEMPOTENCY_KEY_REUSED`；没有既有命令的全新确认仍执行原有项目、过期、状态、分片和存储门禁。
- 新增“分片确认成功→其余分片确认→会话完成→原确认迟到重放”回归，断言返回 `200 / completed` 与唯一素材。

### 真实验证

- `pnpm lint` 退出码 0。
- 上传专项：1 个测试文件、17 项测试全部通过。
- 完整 `pnpm check` 退出码 0：仓库边界、lint/typecheck、本地 PostgreSQL 18.4 迁移、6 个测试文件 41 项测试和前后端构建全部通过。
- `git diff --check` 无输出；本地 PostgreSQL 已停止。

### 未完成与交接

- 本轮没有改动其他已通过状态机，没有开始正式上传 UI、清单资产绑定、真实 R2、云资源、回收站、识别或后续切片。
- 未创建提交、远程、推送或部署。`DEV-M2-03` 转为 Rev 9 `review`，轮到规划对话只复验延迟重放、上传专项和完整检查。

## 2026-08-13 — DEV-M2-03 Rev 8 延迟幂等重放修正领取

- 开发对话读取 `CURRENT.md` v2-028，领取规划第二轮复验定向退回的 `DEV-M2-03` Rev 7。
- 同步版本更新为 v2-029，任务更新为 Rev 8 `in_progress`；本轮只让已存在的分片确认命令在当前项目/会话状态与存储核对前完成同键重放识别。
- 同键异请求和全新确认的全部既有门禁保持不变；不改其他状态机，不开始下一切片，不提交、推送、部署或创建外部资源。

## 2026-08-13 — DEV-M2-03 Rev 6–7 第二轮规划复验定向退回

### 已通过

- 规划对话重新运行完整 `pnpm check`；退出码0，迁移、6个测试文件40项测试、类型/规范检查和前后端构建全部通过。
- 临时独立复验使用匿名4–8字节数据覆盖5条路径，其中对象合并后落账中断恢复、迟到确认不复活取消终态、项目回收后拒绝授权/确认/完成但允许取消、完成/取消竞态4项通过。
- 这证明上一轮四类严重退审问题及补充竞态已经修复，可以保留现有状态机和回归测试。

### 唯一未通过项

- 分片1以固定幂等键确认成功，分片2随后确认并使整份上传完成；再次发送分片1的原键原请求，实际返回 `409`，未满足“同键同请求稳定重放”。
- 根因是确认路由与仓储均在查询既有 `confirm_part` 命令前检查当前项目、过期和会话状态；会话成为 `completed` 后，合法迟到重试先被 `UPLOAD_STATE_INVALID` 拦截。

### 写回与边界

- 临时规划复验文件已删除；所有匿名项目按精确 UUID 清理，残留计数为0；`git diff --check` 无输出。
- 同步版本由 `v2-027` 更新为 `v2-028`，原任务从 Rev 6 `review` 更新为 Rev 7 `ready` 并退回开发对话。
- 返工只调整分片确认的幂等重放顺序：已存在命令的同键同请求先稳定重放，同键异请求仍冲突；全新确认请求继续执行全部项目、会话、分片和存储门禁。增加一项延迟重放回归并重新运行专项与完整检查。
- 不修改其他已通过状态机，不开始正式上传 UI、素材清单资产绑定、真实 R2、云资源或后续切片。


## 2026-08-13 — DEV-M2-03 Rev 5–6 状态机返工完成

### 实际修改

- 完成命令在调用存储前写入 `upload_commands` 占位；同一完成意图在对象已合并、数据库尚未落账时先核对对象，再补建唯一素材并转为 `completed`。
- 分片确认在同一事务锁内重读项目与会话状态，并真正绑定 `Idempotency-Key` 与规范请求摘要；同键同请求重放不增加版本，同键异请求返回 `IDEMPOTENCY_KEY_REUSED`。
- 取消命令在锁内先把会话写为 `aborted` 并保存命令，再执行可重复的存储清理；完成/取消竞态由先取得锁的命令唯一决定，迟到确认不能复活终态。
- 项目非 `active` 时拒绝分片授权、确认和完成；取消清理仍可执行。短时分片授权不改变 PostgreSQL 业务状态，因此移除无实际语义的强制幂等请求头。
- 扩展内存 Storage fake，仅为匿名测试增加“对象已合并后中断”、分片核对暂停和完成暂停故障控制；没有引入真实对象存储或外部网络。
- 更新上传契约、M2 里程碑和后端说明，固化恢复顺序、并发赢家、幂等边界和项目生命周期门禁。

### 真实验证

- `pnpm lint` 退出码 0。
- 上传专项 `pnpm exec vitest run tests/backend/uploads.test.ts`：1 个测试文件、16 项测试全部通过。
- 新增 5 项高价值回归：确认同键同/异请求、对象合并后落账中断恢复、已通过存储核对的迟到确认、完成/取消确定性竞态、项目回收后拒绝授权/确认/完成但允许取消。
- 完整 `pnpm check` 退出码 0：仓库边界、lint、typecheck、本地 PostgreSQL 18.4 迁移、6 个测试文件 40 项测试、前后端生产构建全部通过。
- `git diff --check` 无输出；源码范围扫描未发现 AWS SDK、R2 适配或新增外部网络/识别实现。扫描中的 `asr_video`、`ocr` 和浏览器 `fetch` 命中均为已存在的素材角色命名或站内 API。
- 本轮只使用匿名 4–8 字节合成数据；本地 PostgreSQL 已停止，未创建云资源、远程、提交、推送或部署，也未修改只读参考应用。

### 未完成与交接

- 正式上传 UI、清单版本—集数—素材角色—资产绑定方案、AWS SDK/R2、网络吞吐、回收站/Worker、ASR/OCR/术语仍未实现。
- `DEV-M2-03` 转为 Rev 6 `review`，`Current actor=规划对话`；规划须独立复验本轮四类退审探测与完整检查，开发不会自动开始 `DEV-M2-04`。

## 2026-08-12 — DEV-M2-03 Rev 5 状态机返工领取

- 开发对话读取 `CURRENT.md` v2-025 和规划对 Rev 3 的故障注入/并发复验结果，领取退回的 `DEV-M2-03` Rev 4。
- 同步版本更新为 v2-026，任务更新为 Rev 5 `in_progress`；owner 与 reviewer 保持不变。
- 本轮只修对象合并后的数据库落账恢复、迟到分片确认与完成/取消竞态、确认幂等键语义、项目非 active 门禁，并补故障注入与并发回归。
- 保留首轮迁移、Storage fake、契约和常规测试；不做正式上传 UI、清单资产绑定方案、AWS SDK/R2、云资源、回收站、ASR/OCR/术语、提交、推送或部署。

## 2026-08-12 — DEV-M2-03 Rev 3–4 规划独立评审退回

### 已通过基础

- 规划对话按 `CURRENT.md` v2-024 领取 `DEV-M2-03` Rev 3 `review`，重新运行完整 `pnpm check`；退出码 0，迁移、6 个测试文件 35 项测试、类型检查、规范检查和前后端构建通过。
- 单一 `UploadStorage`、内存 fake、PostgreSQL 上传表、SRT/MP4 边界、缺失分片、常规重复确认/完成/取消、过期与对象校验等首轮实现可以保留。
- `git diff --check` 无输出；源码范围未发现 AWS SDK、R2、浏览器文件读取、回收 Worker、ASR/OCR 或术语实现，没有越过云资源和后续切片边界。

### 未通过证据

- 完成中断探测：Storage fake 已合并对象后，在最终数据库落账前注入一次异常。首次完成返回 `500 INTERNAL_ERROR`；同一请求重试返回 `409 UPLOAD_VERSION_CONFLICT`；最终会话为 `completing`、`asset=null`，无法通过现有协议恢复。
- 终态并发探测：分片确认先通过存储检查并暂停，取消请求随后返回 `200 / aborted`；恢复迟到确认后其仍返回 `200 / uploading`，最终数据库状态被改回 `uploading`、版本 3。
- 幂等探测：同一 `Idempotency-Key` 用于两个不同分片确认，两次均返回 200 且两个分片都被写入，强制请求头没有实际同键异请求保护。
- 生命周期探测：项目被精确置为 `recycled` 后，原上传会话仍能取得新分片授权并返回 200。
- 探测只使用匿名 4–8 字节数据和唯一名称项目，均按精确 UUID 清理；残留名称查询计数为 0。

### 正式退回与复验标准

- 同步版本由 `v2-024` 更新为 `v2-025`；`DEV-M2-03` 保持原 owner，从 Rev 3 `review` 更新为 Rev 4 `ready`，`Current actor` 退回开发对话。
- 返工只处理同一状态机根因：外部存储成功但数据库结果未知时可核对恢复且只创建一个素材；事务锁内重读会话与项目状态，迟到确认不能复活终态；确认及保留强制幂等头的授权落实同键语义；项目非活动后禁止授权、确认和完成但允许安全取消清理。
- 必须增加与上述四个探测等价的自动化回归，并通过专项测试和完整 `pnpm check`。不要求重写已通过基础，不实现正式上传 UI、真实 R2、云资源、素材清单绑定方案或下一切片。
- 上传对象与已确认清单版本、集数、素材角色的权威关联属于下一切片前的产品协商项，本轮开发不得自行扩展。


## 2026-08-12 — DEV-M2-03 Rev 2–3 内存 Storage fake 与分片协议地基

### 输入与范围

- 按用户确认的方案 A 和 `CURRENT.md` v2-022 执行，仅建立真实云存储接入前的上传协议地基。
- 输入为 `ADR-0001`、`ADR-0002`、M2 权威契约及里程碑的 `DEV-M2-03` 已确认范围；没有引入正式上传队列 UI、真实浏览器直传或云资源。

### 实际实现

- 新增上传共享契约：会话、分片、最终素材、创建/授权/确认/完成/取消请求、授权响应和带缺失分片详情的稳定错误。
- 新增 PostgreSQL 迁移，建立 `assets`、`upload_sessions`、`upload_parts`、`upload_commands` 及上传状态/媒体类型枚举；数据库保存业务状态、版本、错误和素材绑定。
- 新增单一 `UploadStorage` 接口与 `InMemoryStorageFake`。fake 模拟分片授权、匿名小字节写入、ETag/SHA-256、按序合并、对象查询、取消和可控故障；不接触网络或云凭据。
- 集中配置默认 64 MiB 分片、单文件并行 3、单浏览器并行 12、会话/授权时限和文件大小上限；测试通过注入配置使用 4 字节匿名分片，不把测试大小写成业务常量。
- 实现创建会话、读取会话、授权缺失分片、确认分片、幂等完成和幂等取消六个 API。创建时校验项目 active、SRT/MP4、大小和幂等键；完成时用版本条件、有序确认分片和 SHA-256 校验，只创建一个最终素材。
- 生产环境没有真实存储适配器时明确拒绝启动，避免内存 fake 被误当作生产存储。

### 验证与修正

- 首轮 10 项专项测试中，取消命令重放因已取消后的版本变化被错误判为冲突；修正为先命中幂等命令，并进一步把同键异取消请求的幂等/版本判断放到存储副作用之前。
- 最终专项 11 项全部通过，覆盖创建幂等与同键异请求、非活动项目、类型/大小限制、缺失分片阻断、只授权缺失分片、重复确认/完成/取消、授权过期重签、会话过期、指纹不符、临时存储故障恢复、对象不存在、大小与校验失败。
- 最终 `pnpm check` 退出码 0：仓库边界、TypeScript lint/typecheck、本地 PostgreSQL 18.4 迁移、6 个测试文件 35 项测试和共享契约/后端/前端构建全部通过。
- `git diff --check` 通过；范围扫描未发现 AWS SDK、R2、外部网络请求、浏览器文件内容读取、回收站、ASR/OCR 或术语实现。

### 边界与交接

- 未使用真实视频、字幕、表格或客户数据；Storage fake 仅处理测试代码生成的匿名小字节。
- 未创建 R2、Neon、Railway 或其他云资源，未做 1 GB/10 GB、网络吞吐或 5–6 真实并发批次测试。
- 未修改只读参考应用；未提交、添加远程、推送或部署。完整验证后停止 PostgreSQL 和残留后端进程，3000/3001/55432 均无监听。
- `CURRENT.md` 更新为 v2-024，`DEV-M2-03` Rev 3 `review`，交规划对话独立复验；不得自动开始 `DEV-M2-04`。

## 2026-08-12 — DEV-M2-03 Rev 2 协议地基领取

- 开发对话读取 `CURRENT.md` v2-022，领取用户已选择方案 A 后解锁的 `DEV-M2-03` Rev 1。
- 同步版本更新为 v2-023，任务更新为 Rev 2 `in_progress`；owner 和 reviewer 保持不变。
- 本轮只实现上传会话/分片/幂等与素材绑定迁移、内存 Storage fake、创建/读取/授权/确认/完成/取消 API、稳定错误和自动化测试。
- 不实现正式上传队列 UI、真实浏览器文件直传、AWS SDK/R2、云资源、网络吞吐、回收站、ASR/OCR/术语，不提交、推送或部署。

## 2026-08-12 — PLAN-M2-03 第三切片方案确认与开发交接

### 用户取舍

- 规划对话先比较三条路径：A“先完成上传协议地基”、B“协议与正式上传页面合并”、C“直接接入真实 R2 实测”。
- 用户明确选择方案 A。该选择只授权本地开发内存 Storage fake 与完整分片协议，不授权创建云资源、真实文件上传、网络测试或正式上传队列 UI。

### 规划写回

- 在 `docs/milestones/M2-upload-lifecycle.md` 固化 `DEV-M2-03` 的数据所有权、创建/授权/确认/完成/取消、幂等、过期、校验、失败恢复、集中配置和匿名测试验收边界。
- 新建 `PLAN-M2-03` Rev 1 并标记为 `done`；新建 `DEV-M2-03` Rev 1、状态 `ready`、`Current actor=开发对话`、`Reviewer=规划对话`。
- 同步版本从 `v2-021` 递增为 `v2-022`。开发对话可以直接读取共享文件领取任务，用户不需要转述具体实现要求。

### 明确未完成

- 未修改业务源码、数据库或正式 UI，未运行功能测试。
- 未引入 AWS SDK、未创建 R2/Neon/Railway 或任何外部资源，未产生云费用。
- 未提交、推送、部署，也未解锁 `DEV-M2-04` 或其他后续切片。

## 2026-08-12 — DEV-M2-02 Rev 9–10 规划独立复验通过

### 复验结果

- 规划对话按 `CURRENT.md` v2-020 读取 `DEV-M2-02` Rev 9 `review`，逐项检查服务端路径校验、确定性幂等摘要、前端留空回显、确认前文件信息、人工集数门禁、回归测试和 M2 权威契约。
- 本轮重新运行完整 `pnpm check`，退出码 0；仓库边界、类型与规范、本地 PostgreSQL 迁移、5 个测试文件 24 项测试及前后端构建全部通过。
- 素材专项 2 个测试文件 14 项逐项通过；非法路径测试同时证明数据库未写入清单，语义等价但属性顺序不同的同键请求稳定重放首次结果。
- 源码范围扫描未发现文件内容读取、AWS SDK、对象存储、ASR/OCR 作业、回收 Worker 或下一切片实现；`git diff --check` 通过。

### 正式结论与边界

- 六类退审缺口全部达到复验标准，`DEV-M2-02` 验收通过；同步版本由 `v2-020` 更新为 `v2-021`，任务由 Rev 9 `review` 更新为 Rev 10 `done`，`Current actor` 清空。
- 当前完成范围仅为项目中心和整剧素材元数据配对确认；文件字节上传、Storage fake、R2、分片协议、术语提取、ASR/OCR、回收站和云端部署均未实现或授权。
- 本轮没有提交、推送、部署或创建外部资源，也没有新增或解锁下一任务；下一切片必须先与用户讨论并明确确认。

## 2026-08-12 — DEV-M2-02 Rev 8–9 六类验收缺口定向修正

### 完成

- 已确认详情改为按集固定显示公司 SRT、中文识别视频、画面字视频三角色；可选画面字没有绑定时明确显示“明确留空”和空路径占位。
- 扫描确认前的配对选项和待分配文件同时显示文件名、完整相对路径和格式化大小；同名候选可按路径区分，未知类型或非法集数显示问题原因。
- 人工目标集数在浏览器端只接受 1–100 的整数；小数、0、负数和 101 等越界值保持禁用，分配函数再次校验而不只依赖输入控件属性。
- 服务端不再剥离绝对路径前缀；严格拒绝绝对、空段、`.`、`..`、非当前根目录、文件名带路径分隔符和路径末段/`fileName` 不一致，统一返回 `MATERIAL_MANIFEST_INVALID`。
- 素材确认幂等摘要改为递归排序对象键后的确定性 JSON，语义等价但属性顺序不同的请求可稳定重放，同键异请求仍冲突。
- `docs/contracts/M2-upload-lifecycle.md` 补齐素材清单、绑定和命令实体，以及读取/确认 API、版本权威、路径约束和稳定错误边界。

### 验证

- 首次素材专项运行中 3 条测试因旧样例通过改变根目录制造冲突、且前端查询未区分两个同名按钮而失败；把样例修正为同根目录内合法差异并精确定位目标按钮后，专项 2 个测试文件 14 项全部通过。
- 最终 `pnpm check` 退出码 0：仓库边界、TypeScript lint/typecheck、本地 PostgreSQL 18.4 迁移、5 个测试文件 24 项测试和前后端生产构建全部通过。
- 后端新增回归逐项覆盖绝对、越界、错根、路径末段/文件名不一致，以及同键语义等价 JSON 的属性顺序变化；非法路径均未写入清单。
- 真实浏览器在 1440×900 电脑屏幕使用 4 个匿名合成文件完成同名候选区分、大小显示、非法 1.5 集门禁、确认 v1 和刷新恢复；三角色详情明确回显画面字留空，控制台错误与警告为 0。
- `impeccable` 机械检测返回空结果；截图复核未发现信息层级、表格宽度或溢出回归。

### 边界与交接

- 本轮没有读取或上传文件字节，没有引入 AWS SDK/Storage fake、分片上传、术语提取、ASR/OCR、回收站或云资源。
- 匿名浏览器项目按精确 UUID 删除，临时测试文件不可恢复地删除，本轮 3000/3001/55432 服务均已停止。
- 没有新增实现提交、远程、推送或部署；`DEV-M2-02` 更新为 Rev 9 `review`，交规划对话按 6 条标准独立复验后停止。

## 2026-08-12 — DEV-M2-02 Rev 8 定向修正领取

- 开发对话读取 `CURRENT.md` v2-018 和规划对 Rev 6 的独立复验结果，领取退回的 `DEV-M2-02` Rev 7。
- 同步版本更新为 v2-019，任务更新为 Rev 8 `in_progress`；owner 和 reviewer 保持不变。
- 本轮只修已确认留空回显、确认前文件信息、相对路径完整性、人工集数边界、幂等规范化和权威契约 6 类缺口，并补针对性自动化测试。
- 不改变视觉方向与电脑屏幕支持范围，不开始文件字节、对象存储、分片上传、术语提取、ASR/OCR、回收站、提交、推送或资源创建。

## 2026-08-12 — DEV-M2-02 Rev 6–7 规划独立评审退回

### 通过的基础验证

- 规划对话按同步协议读取 `CURRENT.md` v2-017，确认 `DEV-M2-02` Rev 6 为 `review` 且 `Current actor=规划对话`，未依赖开发日志直接判定。
- 本轮重新运行完整 `pnpm check`，退出码 0；仓库边界、类型与规范、本地 PostgreSQL 迁移、5 个测试文件 18 项测试和前后端构建通过。
- 另行运行素材专项测试，2 个测试文件 8 项测试逐项通过，覆盖现有确认、刷新、幂等、版本冲突、必需角色、多候选和对话框焦点路径。

### 未通过的验收证据

- 已确认详情只遍历实际绑定，刷新后没有按集回显可选画面字“明确留空”；与里程碑“缺失状态必须可见”和 UI 验收中的草稿原样回显不一致。
- 确认前界面没有展示文件大小；同名候选的下拉选项只显示文件名，不能依靠相对路径区分。
- 匿名本地 API 边界探测中，集数 101 被统一拒绝；但 `../EP01.srt`/`../EP01.mp4` 越界相对路径以及相对路径末段与 `fileName` 不一致的两份清单均返回 201 并写入 v1，证明服务端数据完整性校验不足。探测创建的 3 个匿名项目已按精确 UUID 删除。
- 待分配目标集数的浏览器操作只判断非空，未限制为 1–100 的整数，用户可进入最终由服务端拒绝的无效草稿。
- 幂等请求摘要虽固定了绑定数组排序，但绑定对象仍通过属性展开构造；语义相同但 JSON 属性顺序不同的请求可能被误判为同键异请求。
- `docs/contracts/M2-upload-lifecycle.md` 尚未记录已经实现的素材清单实体、最新清单读取/版本化确认 API 和稳定错误边界，权威契约与实现不一致。

### 正式结论与返工边界

- `DEV-M2-02` 本轮不通过：全局同步版本由 `v2-017` 更新为 `v2-018`，任务由 Rev 6 `review` 更新为 Rev 7 `ready`，`Current actor` 退回开发对话。
- 复验只要求修正上述 6 类缺口并补回归测试；不更换已确认视觉方向，不恢复移动端验收，不开始文件字节上传、Storage fake、R2、分片协议、术语提取、ASR/OCR、回收站或下一切片。
- 本轮未修改业务源码、未提交、推送、部署或创建云资源。

## 2026-08-12 — DEV-M2-02 Rev 5–6 整剧素材配对确认纵切

### 任务与输入

- 开发对话按 `CURRENT.md` v2-016 执行 `DEV-M2-02` Rev 5，只使用已确认的 M2 里程碑、`DESIGN.md` 和 `docs/ui/M2-material-pairing-acceptance.md` 作为输入。
- 本轮同步写回将任务更新为 Rev 6 `review`，`Current actor` 与 `Reviewer` 均交给规划对话；达到交接点后停止，不自动领取下一项。

### 实际实现

- 在共享契约中增加公司 SRT、中文识别视频、画面字视频三类素材角色，以及绑定、确认命令、清单版本和项目素材状态类型。
- 增加 PostgreSQL 素材清单、清单绑定和幂等命令迁移；每个项目确认新版本前使用事务和 advisory lock，保存请求摘要并拒绝同键异请求与陈旧预期版本。
- Fastify 增加最新素材清单读取和素材清单确认接口，校验相对路径、文件指纹、素材类型、必需角色、重复占用与项目存在性，稳定返回版本或冲突错误码。
- React 增加项目素材页、项目上下文和项目级模块导航；浏览器仅扫描相对路径、文件名、大小和修改时间，按集数并集自动配对三类素材，支持逐格人工调整、待分配文件、明确阻断、版本确认和刷新恢复。
- 已确认后端清单与本地未确认草稿分开显示；多候选不会误报为缺失，提交对话框支持初始焦点、焦点圈闭、Escape、焦点归还及提交期间防重复。

### 验证与界面证据

- 最终 `pnpm check` 退出码 0：仓库边界、TypeScript lint/typecheck、本地 PostgreSQL 18.4 迁移、5 个测试文件 18 项测试和前后端生产构建全部通过。
- 后端测试覆盖确认与刷新、幂等重放及同键异请求冲突、陈旧版本冲突、缺失与重复绑定拒绝；前端测试覆盖后端清单恢复、元数据扫描确认、多候选阻断和提交中焦点约束。
- 真实浏览器使用 `C:\tmp` 下的 4 个匿名合成小文件完成项目创建、2 集自动配对、确认后端 v1、刷新恢复和重新扫描后的本地未确认状态；测试夹具随后已删除，本轮 3000/3001/55432 服务端口均已释放。
- 正式电脑屏幕范围实测 1280、1440、1920px；页面一级标题为 1，项目上下文、配对台账和确认流程可用。用户随后明确窄屏与移动端不属于正式支持范围，相关旧证据只保留为历史记录。
- 独立完成复核首轮要求修正上下文状态、多候选阻断、真实文件夹按钮和对话框键盘焦点；全部修正后最终 disposition 为 `ship`。机械检测返回空结果。
- 完成业务流程时浏览器错误与警告为 0；结束前最终快照出现 1 条开发中改写文件导致的 Vite 热更新失败日志，最终完整类型检查、18 项测试与生产构建通过。

### 边界与交接

- 没有读取、上传或保存文件字节；没有引入 AWS SDK、Storage fake、分片上传、术语提取、ASR/OCR、回收站或云资源。
- 没有修改只读参考应用，没有复制视频、字幕、术语、数据库、凭据或生成物；没有新增实现提交、Git 远程、推送或部署。
- PostgreSQL/后端清单版本继续作为唯一权威来源；浏览器扫描结果和调整只属于确认前草稿。
- `DEV-M2-02` 现交规划对话独立复验，评审不得自动扩大到下一开发切片。

## 2026-08-12 — DEV-M2-02 Rev 5 开发领取

- 开发对话读取同步协议 v2、`CURRENT.md` v2-015、已确认里程碑和 UI 验收文档后，领取整剧素材配对确认元数据纵切。
- 同步版本更新为 v2-016，任务由 Rev 4 `ready` 更新为 Rev 5 `in_progress`，owner 与 reviewer 保持不变。
- 本轮交付限定为浏览器本地元数据扫描、集数并集、三类素材自动配对、人工调整、幂等版本化确认、PostgreSQL 持久化、刷新恢复和真实测试。
- 不上传文件字节，不引入 AWS SDK/Storage fake，不实现分片上传、术语提取、ASR/OCR、回收站，不创建云资源，不提交或推送。

## 2026-08-12 — 人物画面风险首期边界确认

### 只读核对与用户决策

- 规划对话只读核对原本地工作台，确认现有内容合规方案包含公司 SRT/ASR/OCR 风险线索、稀疏与场景变化抽帧、定点证据帧、少量选中截图视觉复核和人工判断；当前没有完成独立人脸身份识别模块。
- 用户确认网站后续采用统一风险审查中心，首期人物画面风险只做候选证据与人工裁决；不建设人脸身份库、不保存身份识别生物特征模板、不做跨集或跨项目人物身份比对。
- 台词、画面字和人物画面风险共享证据、严重度和人工决定语言；P0/P1 未解决时阻止整剧完成与正式交付，P2 保持可见但不新增硬阻断。“未命中”不等于“确认安全”。

### 写回与边界

- 长期决策已写入 `PRODUCT.md`、`DESIGN.md` 和 `docs/architecture.md`；同步版本由 `v2-014` 更新为 `v2-015`。
- 本轮没有设计风险审查详细页面、没有创建下游 UI/开发任务，也没有修改 `DEV-M2-02` 的素材配对范围；未实现或调用人脸模型、视觉 AI、ASR/OCR、云资源、提交、推送或部署。

## 2026-08-12 — UI-M2-02 用户验收与 DEV-M2-02 解锁

### 用户验收

- 用户打开整剧素材配对确认交互预览后反馈“看着还可以”，本轮按验收通过写回。
- `UI-M2-02` 从 Rev 3 `review` 更新为 Rev 4 `done`；交互预览与 8 类状态作为正式实现的 UI 输入。

### 正式交接

- 规划对话复核 UI 交付物、验收记录和既定产品范围齐全；全局同步版本由 `v2-013` 更新为 `v2-014`。
- `DEV-M2-02` 从 Rev 3 `blocked` 更新为 Rev 4 `ready`，`Current actor` 指向开发对话，完成后由规划对话独立复验。
- 开发范围只包括素材元数据扫描、配对、人工调整、版本化确认、PostgreSQL 持久化和刷新恢复；不包含文件字节上传、分片协议、Storage fake、R2、术语提取、ASR/OCR、回收站、提交、推送、部署或资源创建。

## 2026-08-12 — UI-M2-02 Rev 3 整剧素材配对确认页交付

### 完成

- UI 对话在既有 AppShell 和 `DESIGN.md` 视觉体系内完成整剧素材配对确认页的仓库外交互预览，正式前端保持未修改。
- 交付文件夹选择、按集三角色自动配对、逐格改选/清空、待分配文件、相对路径、缺失/冲突/重复占用/类型/指纹门禁、动态确认摘要、确认中、确认失败恢复和已确认版本详情。
- 页面覆盖待处理阻断、全部匹配、扫描中、空文件夹、扫描失败、确认中、确认失败和已确认详情 8 类状态；侧栏继续支持 204px 展开与 72px 收起。
- 首轮独立完成复核判定 `revise`；5 个交互真实性问题经单一可变清单状态源修正后，同一复核者逐项判定 `resolved`，最终 disposition 为 `ship`。

### 交付物

- 仓库外交互预览：`qimao-material-pairing.html`
- `docs/ui/M2-material-pairing-acceptance.md`

### 验证

- 无头 Chrome 覆盖 8/8 页面状态；空文件夹实际进入空态，非推荐候选和可选清空会原样进入已确认快照。
- 待分配文件选择后从集合移除；MP4 不能分配为 SRT；指纹异常文件不可分配；同一相对路径重复占用会产生阻断并禁用确认。
- 确认失败展示 `MATERIAL_MANIFEST_VERSION_CONFLICT`，读取最新清单后返回可调整状态；浏览器控制台错误为 0。
- 桌面侧栏实测 204px → 72px；360px 宿主下 iframe 与页面宽度均为 328px、侧栏 88px、表格只在自身容器内横向滚动、可见一级标题 1 个。
- `pnpm check` 通过：仓库边界、TypeScript lint/typecheck、本地 PostgreSQL 迁移、3 个测试文件 10 项测试和前后端构建全部成功。

### 正式交接

- 全局同步版本由 `v2-012` 更新为 `v2-013`，`UI-M2-02` 由 Rev 2 `in_progress` 更新为 Rev 3 `review`，`Current actor` 转为用户。
- 用户确认前 `DEV-M2-02` 继续保持 `blocked`；本轮不构成业务 API、文件字节上传、对象存储、ASR/OCR、提交、推送、部署或资源创建授权。

## 2026-08-12 — UI-M2-02 Rev 2 领取整剧素材配对确认页

### 当前动作

- UI 对话按同步协议读取 `CURRENT.md`、`docs/WORKFLOW.md`、`DESIGN.md` 和 M2 第二切片验收，领取唯一 `ready` 任务 `UI-M2-02`。
- 任务状态由 `ready` 更新为 `in_progress`；全局同步版本由 `v2-011` 更新为 `v2-012`，任务 Rev 由 1 更新为 2。
- 本轮只交付仓库外可交互预览与 UI 验收记录；不修改正式前端，不实现业务 API、文件字节上传、R2、ASR/OCR 或云资源。

### 未完成

- 文件夹选择、自动配对、逐格改选/清空、待分配文件、阻断、确认反馈、已确认详情和完整页面状态仍在制作与验证中。
- `DEV-M2-02` 继续保持 `blocked`，不得提前领取。

## 2026-08-12 — PLAN-M2-02 方案 B 确认与 UI-M2-02 分派

### 用户决策

- 用户明确选择第二切片方案 B“整剧素材配对确认纵切”，而不是后端地基优先或分片上传协议优先。
- 切片范围固化为：浏览器本地扫描整剧文件夹元数据、集数并集、三类素材自动配对、人工逐格调整、版本化确认、PostgreSQL 持久化和项目详情刷新恢复。
- 本切片不上传文件字节；分片上传、Storage fake、R2、术语提取、ASR、画面字识别和回收站仍属后续切片。

### 正式交接

- 同步版本更新为 v2-011；`PLAN-M2-02` 更新为 Rev 7 `done`。
- 新增 `UI-M2-02` Rev 1 `ready`，由 UI 对话先完成新增确认页和完整状态，Reviewer 为用户。
- `DEV-M2-02` 更新为 Rev 3 `blocked`，等待 `UI-M2-02` 用户验收后再由规划对话解锁；没有让开发边写边猜新交互。
- 未修改云端业务代码，未提交、推送、部署、购买或创建资源。

## 2026-08-12 — PLAN-M2-02 术语版本与并行流程确认

### 用户确认

- 术语候选全部进入已确认、已修改或已驳回后，由员工显式确认正式术语版本；允许人工补充遗漏术语。
- 正式术语修改后创建新版本，旧 ASR/画面字结果保留并标记使用旧版本；默认只重跑受影响集数，也允许员工选择整剧重跑，不自动覆盖或产生费用。
- SRT 解析和术语整理可与大视频上传并行；ASR 和画面字识别必须同时等待术语版本确认及本集所需视频完成服务端校验。

### 同步状态

- 同步版本更新为 v2-010；`PLAN-M2-02` 更新为 Rev 6 `review`，下一步由用户比较并确认第二开发切片的具体方案；`DEV-M2-02` 保持 `blocked`。
- 未修改云端业务代码，未提交、推送、部署、购买或创建资源。

## 2026-08-12 — PLAN-M2-02 术语前置门禁确认

### 用户确认

- 项目术语必须先由员工确认，再进入整部剧的后续生产流程。
- 同一已确认术语不只约束中文语音识别，也必须约束画面字识别。
- 长期产品与架构文档已明确：术语表格只是导出表现，后端项目术语及确认版本是权威来源；ASR 和画面字识别任务必须记录所引用的术语版本。

### 范围边界与待确认

- 该规则属于网站长期工作流，未把 ASR、画面字识别或术语审核提前加入 M2 上传生命周期实现。
- 仍待确认候选术语的完成条件、术语修改后的旧识别结果处理，以及大视频上传是否可以与术语确认并行。
- 同步版本更新为 v2-009；`PLAN-M2-02` 更新为 Rev 5 `review`；`DEV-M2-02` 保持 `blocked`。
- 未修改云端业务代码，未提交、推送、部署、购买或创建资源。

## 2026-08-12 — PLAN-M2-02 首轮业务输入确认

### 用户确认

- 公司当前提供的台词基本为 SRT；首期不把 XLSX、CSV、TXT 或 DOCX 作为公司台词主输入。
- 术语表是网站在项目内提取、人工确认后导出的结果，而不是创建项目时必须上传的原始表格。
- 中文语音识别不要求无字/无人名条视频，只要音轨适用即可；画面字检查使用有人名条或包含画面字的视频。
- 视频绝大多数为 MP4，首期可以围绕浏览器直接播放和时间定位规划；尚未确认的非 MP4 转码不自动进入第二切片。

### 同步状态

- 同步版本更新为 v2-008；`PLAN-M2-02` 更新为 Rev 4 `review`，继续由用户确认整剧集清单和工作台衔接；`DEV-M2-02` 保持 `blocked`。
- 未修改云端业务代码，未提交、推送、部署、购买或创建资源。

## 2026-08-12 — PLAN-M2-02 原本地工作台流程只读核对

### 已核对事实

- 只读检查原本地应用的项目导入、素材角色推断、视频格式、集数识别、字幕交接、整剧门禁、术语交接和证据播放器实现；未运行或修改本地应用，未复制任何业务文件、数据库或输出。
- 本地应用以一部剧为顶层项目，按集组织内部处理记录；导入一部剧素材文件夹并保留相对路径，自动推断中文识别视频、画面字识别视频和公司 SRT，候选模糊时要求人工确认。
- 集数识别覆盖中文“第 N 集/话”、Episode/EP/E、前导数字和结尾数字；重复同类文件会阻断，无法识别集数会显式警告。
- 整剧交接把每集台词、可选画面字、无字/有字视频和术语规范快照绑定到同一项目版本；整剧门禁要求全部内部集处理完成后才允许整体交付。
- 本地证据播放按字幕毫秒时间码截取上下文片段；网站需要保留这一时间关联，并按用户方向升级为编辑区和右侧视频联动。

### 待用户确认

- 公司实际提供的台词是否始终为 SRT，还是还会出现 XLSX、CSV、TXT、DOCX 等格式。
- 一部剧通常是否同时提供无字/纯净视频和有字/人名条视频，以及右侧播放器默认使用哪一套。
- 本地扫描支持的宽视频格式远多于浏览器原生播放能力；需决定限制上传格式，还是保留原格式并为网页生成 MP4 预览版本。

### 同步状态

- 同步版本更新为 v2-007；`PLAN-M2-02` 更新为 Rev 3 `review`，继续由用户确认业务细节；`DEV-M2-02` 保持 `blocked`。
- 未修改云端业务代码，未提交、推送、部署、购买或创建资源。

## 2026-08-12 — PLAN-M2-02 规划门禁与业务细节确认

### 用户反馈与纠正

- 用户明确要求每次进行范围、方案或切片规划时，规划对话必须先展示和询问具体细节，再共同讨论方案，不能单方面直接决定并解锁开发。
- 用户特别指出上传文件会继续进入项目工作台，因此必须先确认文件类型与格式、文件夹结构、剧集与台词匹配、重复文件处理和上传后的工作台接手方式。
- 上一轮把“可以”解释成最终方案确认并直接将 `DEV-M2-02` 设为 `ready`，授权粒度过大，现已纠正。
- 同步版本更新为 v2-006；`PLAN-M2-02` 更新为 Rev 2 `review`、`Current actor=用户`；`DEV-M2-02` 更新为 Rev 2 `blocked` 并清空当前行动角色。

### 长期规则

- `docs/WORKFLOW.md` 新增“规划协商门”：先分轮确认会改变数据模型和流程的关键问题，再展示 2–3 个带取舍的方案，由用户明确确认后才解锁下游任务。
- M2 切片分解明确标记为草案；用户确认前不构成开发授权。
- 本轮只纠正规则、规划状态和日志，没有修改业务代码，没有提交、推送、部署、购买或创建资源。

## 2026-08-12 — PLAN-M2-02 后续切片拆分与 DEV-M2-02 分派

### 规划结果

- 用户同意继续规划后，规划对话依据 M2 里程碑、上传契约、ADR-0002 和已确认 UI，把剩余范围拆为 `DEV-M2-02` 至 `DEV-M2-07` 六个顺序切片。
- 第二切片限定为项目详情与上传领域持久化/API 骨架：Asset、UploadSession、UploadPart 数据模型，以及创建、读取、取消上传会话的元数据闭环。
- 同步版本更新为 v2-005；新增 `DEV-M2-02` Rev 1 `ready`，`Owner/Current actor=开发对话`，`Reviewer=规划对话`。

### 颗粒度与边界

- `DEV-M2-02` 不接收文件字节、不引入 AWS SDK、不实现 Storage fake、不编写上传队列 UI，也不开始回收站或真实云资源。
- 分片授权、确认、完成和校验属于 `DEV-M2-03`；上传页面属于 `DEV-M2-04`；真实 R2 与办公网络实测属于需要用户另行授权的 `DEV-M2-05`。
- 本轮只更新规划、状态和日志，没有修改业务代码，没有提交、推送、部署、购买或创建外部资源。

## 2026-08-12 — DEV-M2-01 Rev 4–5 规划独立复验通过

### 复验结果

- 规划对话按同步协议 v2 读取 `CURRENT.md` v2-003，确认 `DEV-M2-01` Rev 4 为 `review` 且 `Current actor=规划对话`，未依赖用户转述开发内容。
- 独立审查新增迁移、项目仓储、API 错误映射、前端创建意图状态和新增回归测试；实现与本轮验收边界一致，未发现新的范围扩张。
- 本轮重新运行完整 `pnpm check`，退出码为 0；仓库检查、代码规范、类型检查、本地 PostgreSQL 迁移、全部 10 项测试及前后端构建通过。
- 另行运行后端项目 API 与前端项目中心测试，2 个测试文件、8 项测试逐项通过，包括同键同规范化名称重放、同键异名稳定 `409` 且不重复创建，以及未知结果重试复用原幂等键。

### 正式结论与边界

- `DEV-M2-01` 验收通过：同步版本更新为 v2-004，任务更新为 Rev 5 `done`，`Current actor` 清空。
- 当前仅完成技术栈、本地 PostgreSQL、项目创建/搜索/列表及其幂等安全边界；不代表上传、回收站、ASR、OCR、账号或云端部署已经实现。
- 未创建或领取下一任务；未提交当前实现、推送、部署、购买服务或创建云资源。

## 2026-08-12 — DEV-M2-01 Rev 3–4 创建幂等修正

### 实际变更

- 开发对话读取同步协议 v2 和 `CURRENT.md` v2-001 后领取规划验收退回项；领取时同步版本更新为 v2-002，任务从 Rev 2 `ready` 更新为 Rev 3 `in_progress`。
- 新增数据库迁移，为 `project_commands` 保存已规范化的请求名称；历史本地记录由关联项目名称安全回填。
- 服务端在事务锁内比较幂等键对应的规范化名称：同键同名返回首次项目，同键异名返回结构化 `409 IDEMPOTENCY_KEY_REUSED`，不创建第二个项目。
- 前端将幂等键移到创建意图持有；同一规范化名称在未知结果后重试时复用原键，成功、取消或名称改变后结束原意图。
- 新增后端冲突稳定性测试与前端未知结果重试测试，并将既有同键重放测试扩展为前后空白规范化场景。

### 真实验证

- 针对性测试通过：2 个测试文件、8 项相关测试；新迁移 `1754976001000_add_project_command_request_name` 成功应用。
- 完整 `pnpm check` 退出码为 0：仓库检查、代码规范、类型检查、本地 PostgreSQL 迁移、3 个测试文件中的 10 项测试，以及共享契约、Fastify 后端和 React/Vite 前端构建全部通过。
- 后端测试确认同键异名连续两次均返回 `409` 且数据库项目数为 1；前端测试确认未知结果前后两个请求的 `Idempotency-Key` 完全相同。

### 正式交接与边界

- 同步版本更新为 v2-003，任务更新为 Rev 4 `review`，`Current actor` 和 `Reviewer` 均切换为规划对话；由规划对话直接复验并写回结论。
- 未实现 R2、回收站、ASR、OCR 或其他下一切片；未创建云资源、提交、推送或部署。

## 2026-08-12 — DEV-M2-01 规划验收退回与交接闭环修正

### 已通过

- 重新运行 `pnpm check`，退出码为 0；现有 3 个测试文件、8 项测试、类型检查、仓库检查和前后端构建通过。
- 实际启动本地 PostgreSQL、Fastify 和 Vite，通过浏览器验证空状态、项目创建、刷新后持久化和搜索；390px 窄屏无页面级横向溢出，浏览器控制台错误和警告为 0。
- 验收结束后停止了本轮启动的 3000/3001 本地前后端进程；未创建云资源、远程仓库、部署或付费调用。

### 未通过

- 使用同一个 `Idempotency-Key` 先创建“幂等验收-A”、再请求创建“幂等验收-B”：第一次返回 `201`，第二次返回 `200` 并静默返回第一次项目，没有拒绝不同请求内容。
- 前端当前每次创建调用都会生成新的幂等键，网络结果未知后的重试不能复用同一创建意图的键，仍存在重复创建风险。

### 正式交接

- `DEV-M2-01` 保持原 owner 为开发对话，从 `review` 退回 `ready`；不新建重复任务。
- 复验标准：同键同请求稳定重放；同键不同规范化名称返回稳定 `409`；一次前端创建意图在未知结果重试时复用原键；相应自动化测试和完整 `pnpm check` 通过。
- 本轮同步补强 `docs/WORKFLOW.md`：验收对话必须在回复用户前写回日志和任务状态，禁止只在聊天中给结论后要求用户人工转述。
- 协作协议升级为 v2：看板新增全局同步版本、任务 `Rev`、`Current actor` 和 `Reviewer`；`review` 对指定验收角色属于可执行任务，不再受“只领取 ready”旧规则阻断。
- 统一任务颗粒度、七项交接信息和写回顺序；接收方只需读取 `CURRENT.md`，用户不再承担跨对话复制任务或验收意见。
- 未授权提交当前实现、推送、部署或开始 R2、回收站、ASR、OCR 等后续范围。

## 2026-08-12 — DEV-M2-01 技术栈、本地 PostgreSQL 与项目中心切片

### 完成

- 按用户授权先将已确认的规划、成本和 UI 文档建立本地提交 `00c502d`；保持远程为空，没有推送或部署。
- 落地 pnpm workspace、TypeScript 5.9、React 19、Vite 8、React Router 8、TanStack Query 5、Fastify 5、TypeBox、`pg` 和 `node-pg-migrate`，并建立前后端共享项目契约。
- 固定并建立本地 PostgreSQL 18.4；新增可重复执行的安装、启动、迁移、状态和停止命令。Windows PostgreSQL 二进制无法可靠使用含中文路径的运行文件，最终将生成运行时和数据目录限定在 `C:\tmp\qimao-terms-cloud-postgres-18.4`。
- 建立项目表和幂等命令表迁移；实现数据库健康检查、项目创建、幂等重放、搜索和列表 API。
- 实现正式 React 项目中心，覆盖加载、空数据、失败、创建校验、列表和窄屏状态；业务数据以 PostgreSQL 为权威来源。
- 本切片更新为 `review`，等待用户验收；实现文件保持未提交，未获得新的实现提交授权。

### 验证

- `pnpm check` 通过：仓库边界、代码规范、类型检查、真实 PostgreSQL 迁移、3 个测试文件中的 8 项测试，以及共享契约、后端和前端构建全部成功。
- 真实浏览器完成项目创建和刷新后持久化验证；1440px 桌面与 390px 窄屏均无页面级横向溢出，控制台错误和警告为 0。
- UI 方向契约已保留到生产构建；独立完成复核结论为 `ship`。机械检测返回空结果，但因本机缺少其完整 HTML/CSS 解析依赖而采用了降级正则模式。
- 敏感信息检查未发现私钥、常见云密钥或带口令数据库 URL；Git 远程保持为空。

### 边界与未完成

- 未实现 R2 真实上传、回收站、ASR、OCR、账号权限、Worker 或云端部署。
- 未购买或创建 R2、Neon、Railway 等任何云资源，没有添加远程、推送或部署。
- 未修改、移动或删除只读参考应用，也未复制其视频、字幕、术语、数据库或生成资料。
- 本轮到 `review` 即停止，不自动领取或实现下一项任务。

## 2026-08-12 — UI-M2-01 用户验收

### 完成

- 用户确认 M2 项目中心、上传任务和回收站交互预览。
- `UI-M2-01` 从 `review` 更新为 `done`。
- 规划与 UI 前置任务均已完成，`DEV-M2-01` 从 `blocked` 解锁为 `ready`。

### 边界

- 本次确认只解锁开发任务，没有自动开始业务编码。
- 未授权创建云资源、部署、远程推送或购买服务。

## 2026-08-12 — UI-M2-01 三页状态预览

### 完成

- 依据 `DESIGN.md` 和 M2 契约制作项目中心、上传任务、回收站三页交互预览，正式前端保持未修改。
- 为每页提供正常、加载、空数据、失败、禁用和恢复六类状态，共 18 个可切换组合。
- 全局侧栏支持 204px 展开与 72px 收起；窄屏收敛为图标导航，并保留可访问名称。
- 固化 48 小时回收、浏览器本地暂停、`purging` 不可恢复、无即时物理删除入口和三类上传错误恢复动作。
- 将任务转入 `review`，等待用户确认后再形成正式开发交接。

### 交付物

- 仓库外交互预览：`qimao-m2-states.html`
- `docs/ui/M2-ui-acceptance.md`

### 验证

- 无头浏览器覆盖 18/18 个页面状态组合，页面级横向溢出为 0，控制台错误为 0。
- 桌面侧栏实测 204px → 72px；创建校验、成功恢复态、48 小时回收反馈、上传错误码和 `purging` 禁用均通过。
- 360px 宿主宽度下，内容宽度与可用 iframe 宽度同为 328px；四张关键状态截图完成视觉复核。
- 独立只读 finish review 结论为 `ship`；其指出的上传局部失败/全局服务状态歧义已修正。
- 仓库级 `pnpm check` 通过：边界检查、语法检查、4 项测试和前后端构建全部成功。

### 未完成

- 用户尚未确认本轮 UI 预览；`UI-M2-01` 尚未标记为 `done`。
- 本轮没有实现正式前端、后端接口、数据库、对象存储或清理 Worker。

## 2026-08-12 — PLAN-M2-01 技术选型与成本边界

### 完成

- 依据官方资料选择 React/Vite、Fastify、PostgreSQL、R2、Railway 新加坡、Neon 新加坡和 Cloudflare Access 的单一路径。
- 固化分片、并发、Worker、测试替身、部署拓扑和中国大陆办公网络实测门槛。
- 按 48 小时素材留存建立开发、低、中、高和极高档月成本，并将 ASR/OCR 成本明确排除。
- 将任务转入 `review`，等待用户确认；没有创建账户、购买资源、提交、推送、部署或编写 M2 业务代码。

### 交付物

- `docs/decisions/ADR-0002-m2-technology-selection-gate.md`
- `docs/costs/M2-cost-boundary.md`
- `deploy/README.md`

### 未完成

- UI-M2-01 已进入 `review`，尚待用户验收，因此 DEV-M2-01 仍保持阻塞。

### 用户验收

- 用户已确认 `PLAN-M2-01` 技术选型与成本边界。
- 用户明确要求暂不购买或创建云资源；本次确认不构成部署、远程推送或任何外部资源操作授权。

## 2026-08-12 — DEV-M1-BASELINE 本地 Git 基线

### 完成

- 开发对话将通用“继续下一项”指令误判为明确提交授权，建立了本地初始提交 `4c90ac5`；用户发现后明确确认保留该提交与 `m1-baseline` 标签。
- 为该提交创建注释标签 `m1-baseline`，形成可回退点。
- 保持 Git 远程为空；没有推送、部署、发布，也没有修改只读参考应用。

### 验证

- 提交前运行 `pnpm check`：仓库边界、语法检查、4 项测试和前后端构建全部通过。
- 提交前敏感信息扫描未发现私钥、常见云密钥或带口令数据库 URL。
- 暂存范围为 32 个源码和文档文件；`node_modules/` 与 `frontend/dist/` 保持忽略，未进入提交。

### 未完成

- `ADR-0002` 技术选型和 M2 UI 交付尚未完成，`DEV-M2-01` 继续阻塞。
- 未创建 Git 远程，也未推送到 GitHub。

## 2026-08-12 — 三对话接力机制

### 完成

- 固定规划、UI、开发三个对话的职责、非职责和交付物。
- 建立单一 `CURRENT.md` 任务看板、任务负责人和五种状态。
- 为三个角色定义开始读取、领取任务、完成记录和交给下一角色的协议。
- 建立当前 M2 的规划、UI、Git 基线和开发任务依赖关系。

### 未完成

- 各角色尚未领取新的 `ready` 任务。
- Git 提交、远程仓库、功能实现和部署仍未进行。

## 2026-08-12 — M2.0 开发准备包

### 完成

- 固化已确认的员工规模、并发批次、日处理量、剧集规模、单集时长、项目容量和 48 小时回收基线。
- 将里程碑 2 限定为项目中心、大文件上传生命周期和项目回收站。
- 定义项目工作状态、生命周期状态、上传会话状态、核心实体、API 草案、幂等和清理边界。
- 建立跨对话读取顺序、编码前技术门禁和后续交接方式。
- 更新架构与项目说明，使其不再把 M2 业务范围标记为未确认。

### 未完成

- 尚未选择具体前后端框架、数据库迁移工具、对象存储提供商或部署平台。
- 尚未建立任何 Git 提交、标签或远程仓库。
- 尚未实现 M2 业务代码、数据库、对象存储、回收 Worker 或页面功能。

### 验证

- 文档完成前的工程基线：`pnpm check` 通过，4 项测试通过，构建通过。
- 文档完成后重新运行 `pnpm check`：仓库边界验证、语法检查、4 项测试和前后端构建全部通过。
# 2026-08-15 规划｜基础设施 503 / 执行器故障分流（v4.4）

- 结论：本轮重复出现的两类错误不是业务代码缺陷。模型网关 503 来自公司兼容网关 `https://apitokenzz.xyz/v1` 的 `responses` 路由，错误包含“无可用上游”和 request id `req_7f92cd1d092ba0d4ef2e1ac0`；`CreateProcessAsUserW failed: 5` 是 Windows 本地执行器启动失败。
- 处理：在 `AGENTS.md` 与 `docs/WORKFLOW.md` 增加 `provider_blocked`、`approval_route_blocked`、`executor_blocked`、`permission_blocked` 四类分流；同一 503 请求最多一次受控重试，执行器失败停止同命令重试，均不得修改业务代码或继续堆积 FIFO。
- 当前影响：后端固定对话已回报 `permission_ok + executor_blocked`；UI/前端固定对话仍受 `permission_blocked` 影响。该记录不改变 S5 字幕验收业务范围，待网关模型映射和宿主执行器恢复后按 `CURRENT.md` 自动续接。
- 未做：未读取、输出或更换任何 API 密钥；未购买、部署、推送、提交或调用真实付费接口。

# 2026-08-15 规划｜重启后基础设施复核

- 默认 `exec_command` 仍解析到不存在的用户 PowerShell 7 路径，报 `CreateProcessAsUserW failed: 5`；实际 Codex runtime PowerShell 可启动，Node/pnpm/Git 版本与仓库读取正常。
- 完整 `pnpm check` 新鲜结果：仓库边界、lint、TypeScript 全部通过；`db:setup` 在 `pg_ctl -l C:\\tmp\\qimao-terms-cloud-postgres-18.4\\postgres.log` 处因 `Permission denied` 停止，未进入测试和构建阶段。登记 `local_runtime_blocked`，不归因于业务代码。
- 直接绕过脚本启动 PostgreSQL 的尝试被公司网关自动审查 503 拦截，未继续改用其他间接执行路径；保留原始 request id 并按 `provider_blocked` 处理。
## 2026-08-15 — UI-M3-05 Rev 4 规划审核通过并恢复前端

- 规划独立对照 `docs/contracts/M3-subtitle-acceptance-parity-audit.md`、`DESIGN.md` 5.8、`docs/ui/M3-subtitle-acceptance.md`、仓库外最终原型源码和 `A-rev4-1440.png` / `A-rev4-1024.png`，确认 Rev 4 七条路径与四层审查一致：项目中心唯一选择任意 active 云端项目；项目内恢复唯一可写会话并只读查看 released/stale；全部/台词/画面字筛选；明确双轨新增与全部筛选 `Ctrl+N` 轨道选择；多选/复制/剪切/粘贴/删除安全确认；人工问题记录及处理理由；新建会话明确选择 S3/S4 来源版本。
- 规划复核未发现新的 P0/P1。方案 A 的颜色、三栏、54:46、同步只读 preflight 与既有状态/键盘矩阵保持冻结；1440/1024 根页面无横溢，1024 只有时间轴容器内部横滚。浏览器安全策略拒绝规划重新打开 `file://` 页，未绕过；结论由最终源码、UI 真实浏览器记录与两张新鲜截图交叉支持。
- `CURRENT.md` 从 v4-293 最小递增为 v4-294；`UI-M3-05 Rev 4` 标记 done，`BACK-M3-05C` 已 done，`FRONT-M3-05B Rev 1` 从原暂停点恢复为 ready，登记 FIFO 122。前端只沿用已有 API/model 雏形实现方案 A 与七条权威路径，不增加 Rev、不实现 B/C/定制器、第二套项目选择器或虚假后端事实。
- 完整 `pnpm check` 继续留在正式前端完成并经 UI 同状态终验后的 S5 单次关闭门；本轮未修改生产前端/后端、迁移或共享契约，未提交、推送或部署。
## 2026-08-15 — 协作协议 v4.5 与模块衔接契约启用

- 用户确认优化四项协作摩擦：CURRENT 只保留活跃快照并归档历史；交接改为八项差量包和精确路径；正式实现前只做一次 UI/契约/状态/异步映射；微返工只跑定向复验。同时新增“模块与模块必须事先对齐”的硬门，避免每个页面和后端模块各自独立完成却无法串成主流程。
- `docs/WORKFLOW.md` 升级为 v4.5，`AGENTS.md` 同步：CURRENT 目标不超过 160 行，固定角色只读当前任务精确输入，不再通读完整历史；交接不重抄未变化事实；每个任务必须同时指向职责矩阵模块行和 `MODULE_INTEGRATION_CONTRACTS.md` 的 `INT-*`；一个纵向切片最多一次完整浏览器矩阵，微返工必须列出冻结证据与唯一变化场景。
- 新增 `docs/contracts/MODULE_INTEGRATION_CONTRACTS.md`，以 `INT-01` 至 `INT-10` 固化项目→素材→上传→术语→ASR/画面字→前置审改→字幕验收→交付、任务中心和生命周期横切关系；每张衔接卡明确上游不可变产物、下游冻结字段、状态所有者、版本失效、幂等/未知结果、UI 返回路径与跨边界验收。`MODULE_RESPONSIBILITY_MATRIX.md` 继续拥有模块内部职责，两者形成纵向职责 + 横向衔接双基线。
- 旧 `CURRENT.md` v4.4–v4.295 已原样归档到 `docs/status/archive/CURRENT-v4.4-through-v4.295.md`；新 `CURRENT.md` 为 107 行活跃快照，同步版本 v4-296，只保留 S5 当前阶段、固定任务、FIFO 121/122、五个 S5 任务、FRONT-M3-05B 差量包、`INT-07` 衔接门和授权边界。
- FRONT-M3-05B 业务编码不暂停；规划已通知前端在 v4.5 切换完成前暂缓共享状态文件写回，避免并发覆盖。下一步把 v4.5 精确读取入口同步给前端、后端、UI，并确认送达；本轮不改生产前后端、迁移、共享代码契约或 DESIGN，不提交、推送或部署。
- v4.5 差量同步已分别发送前端、后端和 UI 固定任务。三方均明确收到并按精确路径读取：后端/UI 已完成只读确认后停止，未改文件或运行测试；前端确认收到后继续 `FRONT-M3-05B` 编码，不重跑测试、不改协作文档，并恢复后续 CURRENT/日志差量写回。用户不需要传话。

## 2026-08-15 — 完整产品三轨进度与跨站衔接纳入规划

- 用户要求以后进度必须同时包含员工网站、管理员网站和两站对接，不能只统计正在开发的员工工作台。新增 `docs/milestones/PRODUCT_ROADMAP.md`，固定权重为员工生产网站 60%、管理员系统控制台 20%、两站对接与真实生产化 20%；当前可验收基线分别约为 48/60、2.5/20、4.5/20，完整产品约 55%，仅看 M3 零网络员工工作台约 80%。
- `docs/WORKFLOW.md` 12.3 已要求每次阶段简报同时报告三轨与加权总进度；`M3-internal-workbench-sprint.md` 明确自身只代表员工内部工作台，不再被包装成完整产品进度。
- `MODULE_INTEGRATION_CONTRACTS.md` 新增 `INT-11` 管理配置→业务 Worker、`INT-12` 运行/用量→控制台、`INT-13` 外部身份→两个网站/API 权限域、`INT-14` 人工事件→策略与学习中心；管理 API、ControlShell、真实供应商、Access/Tunnel 和生产部署继续如实标记为未实现。
- `CURRENT.md` 从 v4-296 最小递增为 v4-297，新增完整产品三轨进度。当前 FRONT-M3-05B 业务执行与 FIFO 122 不变；本轮只改规划、里程碑、衔接合同、状态和日志，不改生产前后端、迁移、共享契约或 DESIGN。
## 2026-08-15 — UI-M3-07 Rev 2 规划差量复验通过并转用户验收

- 规划重读 `CURRENT.md` v4-309、`DESIGN.md` 5.9、`docs/ui/M3-delivery-product-acceptance.md` 和 UI 交接证据，没有把 UI 自报结果直接视为通过。规划侧新鲜浏览器复验确认：确认弹窗稳定后初始聚焦“安全返回”，正向和反向循环均只在“安全返回 / 确认生成”之间，Escape 回到“生成交付产品”；S7 员工界面不再出现 freeze、AcceptanceRelease、通过签名或 `sig_demo_87`；确认页、生成语境和产品库统一归属全局“交付产品库”。
- 规划侧新鲜截图位于仓库外 `planning-audit-ui-m3-07/10-rev2-confirm.png`、`11-rev2-dialog.png`、`12-rev2-library-1024.png`。1024 根页面实测 `1024/1024`，横向滚动只留在产品表格容器；五行产品短 ID 肉眼与 DOM 均为不同稳定值。`git diff --check` 退出码 0，仅保留既有 `LOCAL_APP_PARITY.md` CRLF 提示。
- 结论：四项原问题全部关闭，P0/P1=0，`UI-M3-07 Rev 2` 通过规划差量复验并转用户体验/验收。`CURRENT.md` 最小递增为 v4-310；`FRONT-M3-05B` 和后端继续保持暂停，用户确认前不解锁实现。
## 2026-08-15 — UI-M3-07 用户确认并拆分 S7 实现任务

- 用户确认 `UI-M3-07 Rev 2`。规划将任务标记 done，正式冻结完整交付确认、生成中/未知/失败/成功转场、产品详情、全局产品库、每集双 SRT 与空画面字合法空轨规则；生产前端后续必须提供同状态、同视口证据，不得自行简化或重排。
- 为避免前端再次猜测接口，实施顺序拆为：`BACK-M3-07A` 先拥有共享契约、迁移、PostgreSQL 权威状态、确定性文件生成与读取 API；`FRONT-M3-05B` 可与其并行，只关闭字幕验收入口、写锁/焦点和竖屏播放器五项既有差量；`FRONT-M3-07B` 在后端规划审核通过且 S5 入口稳定后解锁。
- `CURRENT.md` 最小递增为 v4-311，登记 FIFO 128/129；完整 `pnpm check` 继续保留为 S5/S7 正式 React 终验后的单次关闭门。真实云资源、R2、外部总库、账号权限、付费 API、提交、推送和部署不在本轮授权。
# 2026-08-17｜FIFO187 BACK-SYSTEM-04A Rev1 领取回执

- permission_ok：workspace root=`C:\Users\ComradeGu\Documents\七猫兼职`；仓库位于 `workspace-write/:workspace` 可写；普通仓库编辑不走 auto_review。
- 已按 v4.8 启动包完成领取，CURRENT 更新为 v4-484，FIFO187 / `BACK-SYSTEM-04A` Rev1 状态为 `in_progress`，Current actor=后端开发对话。
- 本轮范围：预算策略/唯一 active/稳定命令与只追加审计、BudgetQuote+Reservation admission、settlement 与 unknown/reconciliation 占用、ASR/ScreenText 零网络 cloud stub 接入；禁止真实网络、Secret、付费、前端、部署及 SYSTEM-03 bootstrap/default/fallback 路径。
# 2026-08-17｜规划独立审核 FIFO197 并集中退回 FIFO198 BACK-SYSTEM-05A Rev2

- 规划重读 `SYSTEM-secret-security-readiness.md`、职责矩阵密钥行、`INT-11/13/15/16`、共享 Secret 契约、迁移、service/routes/Worker 与专项测试。接受 Rev1 的数据所有权、零网络 Provider、不可变版本、租约 Worker、引擎绑定、撤销 active/非终态保护及枚举根因修正；不要求重写已通过主体。
- P1-1：`createReference` / `rotateReference` 直接写 `available`，`getBindableVersion` 因而允许尚未运行验证的新版本绑定，引擎契约违反“验证通过后才可绑定”；创建事件还被误计为 `validatedAt`。Rev2 必须让新版本初始为 `unknown`，只有 Worker 成功验证才写 `available`，失败/unknown 保真，绑定只接受实际验证成功或仅处于服务端轮换提醒的版本。
- P1-2：`SystemControlSecretReferenceListQuery.status` 已暴露但 SQL 忽略；正式 `/security` 还缺服务端 search/provider/status/sort、绑定部署数、最近验证、轮换到期、按引用/版本验证历史、使用位置和 Secret 审计读取。Rev2 必须补有界分页/真实 total/稳定排序与安全字段，浏览器不得拉全量后自行过滤、扫描引擎或拼审计。
- P1-3：create/rotate/revoke 有稳定命令 ID，却没有按命令 ID 的只读 GET；响应丢失时前端只能重发 POST 或猜结果。Rev2 必须增加统一或等价的正式 Secret command GET，404 零副作用，同一 ID 可在重启后从 PostgreSQL 恢复；不得增加第二状态源或自动无限重试。
- P1-4：冻结状态包含 `rotation_due`，主表要求轮换提示，但当前契约/服务无权威到期事实；撤销理由也只靠 schema `minLength`，空格可绕过。Rev2 固定服务端 90 天策略：从最近一次成功验证起计算 `rotationDueAt/rotation_due`，仅作轮换提醒、不改写历史引擎/Attempt；理由 trim 后至少 8 字，失败零副作用并保持稳定业务错误。
- FIFO197 关闭，FIFO198 登记 `notification_pending`；只允许 Secret 共享契约、必要迁移、system-control Secret/engine/routes/Worker 与专项测试。禁止真实 Secret、网络、付费、云资源、部署、浏览器换算、fallback/compat/legacy；UI FIFO196 继续 permission_blocked，前端/测试不解锁。
## 2026-08-19｜FIFO248 FRONT-SYSTEM-07C Rev5 领取并进入 in_progress

- 原样回显 `handoffToken=FIFO248-FRONT-SYSTEM-07C-R5-V4.662`；权限指纹：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。
- 已重读 AGENTS.md、WORKFLOW v4.9、CURRENT v4-662、SYSTEM-policy-learning-acceptance §22、开发日志顶部及 Wave C 生产/专项回归；CURRENT 差量写回 v4-663，FIFO248 active、FRONT Rev5 in_progress。
- 本轮范围限定为 rollback unknown 时关闭比较 Drawer 并保留同一 releaseCommandId 恢复意图、查询成功不重开历史 Drawer，以及确定性 impact/approval/release 4xx 刷新后的 ErrorBlock 安全焦点；不改后端、契约、DESIGN、CSS/视觉主体、Wave B、员工站或其它已通过证据。
## 2026-08-20｜FIFO290 规划独立微审通过并关闭 UI-SYSTEM-09

- 规划仅复核 Rev2 变化边界：`docs/ui/SYSTEM-ordered-execution-routing-acceptance.md` §10、同壳原型源码、`evidence/rev2/results.json` 与两张 1440 新截图；未重跑 FIFO288 已冻结49项、完整 Chrome 矩阵或 Impeccable detector。
- `/routing` 的编号、排序、容量和连接检查只属于真实 EngineDeploymentVersion；人工处理已移出目标表，作为全部已启用真实目标均确定失败后的领域工作台出口，不编号、不注册伪 Adapter、不使用引擎容量。`/changes` 的目标数、顺序差异与检查数也仅统计真实目标。
- 新证据 `24/24`、console error/warn=`0/0`、pageerror=0；两张截图的层级和计数与 DESIGN 5.19 一致，授权文件 `git diff --check` 通过。原跨契约 P1 关闭，`UI-SYSTEM-09 Rev2=done`、FIFO290=`closed`，CURRENT 更新至 v4-783。
- BACK-SYSTEM-09A 继续在独立后端任务执行 ASR/ScreenText 有序运行链；FRONT/TEST 保持 blocked，未接真实模型、供应商、Secret、网络、付费或部署。
## 2026-08-20｜FIFO289 规划复核未通过并集中转 FIFO291 Rev2

- 规划未重复完整测试，直接交叉核对共享契约、迁移、RoutingService、ASR/ScreenText Worker repository、Rev1 测试与 SYSTEM-09 里程碑，确认四项同源 P1。
- `screen_text` 当前让 `ocr_self_hosted_worker` 与 `ocr_api` 各自从 priority=1 连续，再用 `ORDER BY priority,pool_id` 临时拼接；这不是用户确认的本地→低价云→高质量云唯一顺序，且 ScreenText 16/16 未覆盖跨池真实前进。
- 新契约/数据库仍使用 `primary/fallback/emergency` role，违反新模型 `preferred/standard/emergency`；Worker 仅以 `externalSideEffectPossible=false` 决定前进，没有把 401/403 `unauthorized` 编码为硬停止；逐目标容量虽已存库，ASR仍使用进程级静态策略，ScreenText没有消费三项目标容量。
- 规划把权威里程碑补清为 workflowStage 全局连续序列、非本阶段目标为空、结构化 `external_not_accepted` 唯一自动前进分类，以及按当前 routingTargetId 执行三项容量。登记 `FIFO291-BACK-SYSTEM-09A-R2-V4.785`；UI保持done，FRONT/TEST继续blocked，真实模型/供应商/Secret/网络/付费/部署仍未接入。

## 2026-08-21｜FIFO337 Access 接线与 TEST-SRV-024 浏览器认证增量

- 测试服务器 `20260821-access-jwt-v4889` 完成 frozen install、contracts/backend/两站 build 与普通 Node contracts import；原子切换 `/opt/qimao-terms-cloud/current` 后 Fastify production 回环监听与 `/health=200` 通过。受保护 backend.env 仅更新规划指定身份键，保持 root:qimao 0640，未记录值、JWT、Cookie、Authorization、Basic 密码或 Tunnel token。
- Cloudflare Tunnel 两条 ingress 已生效：员工 `milaidi.online→127.0.0.1:8080`、管理员 `milaidi.top→127.0.0.1:8081`。员工 curl 真链 Basic 后 `/api/projects`、`/api/tasks`、`/health` 均 200 JSON；员工 system-control、管理员直接 origin 无 JWT 均 403；管理员未登录域名 302 Access 拦截。
- 用户紧急反馈：Codex 内置浏览器访问员工域名显示 `ERR_INVALID_AUTH_CREDENTIALS` 且未出现原生 Basic 登录框。服务器只读对照仍为未认证 401、`WWW-Authenticate: Basic` 存在、受保护 curl 200；服务/PG/Tunnel/监听正常。登记 `TEST-SRV-20260820-024=P1/confirmed`，不移除认证、不公开匿名、不改密码、不使用 URL 内嵌凭据，等待规划决定兼容访问面。
