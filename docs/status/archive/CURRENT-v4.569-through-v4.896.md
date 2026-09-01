# 当前项目活跃快照

最后更新：2026-08-21
同步协议：v5.0
同步版本：`v4-896`

最近写入角色：规划文档书记（workspace-write successor）

## 当前接力总线与 execution leases

> v5.0 已接管本轮素材文件夹修复。固定 FRONT、UI、TEST 任务的临时 `read-only` 只代表这些旧执行通道转为 observer，不代表用户撤销授权、仓库不可写或任务无人领取；同角色 writable successor 已沿原停点续接。以下表格是当前唯一活跃接力快照，历史 FIFO 只作审计，不参与调度。

| 工作流 | 业务状态 | 固定任务 | 当前可写执行/停点 | 下一门 |
| --- | --- | --- | --- | --- |
| `FRONT-MATERIAL-FOLDER-01 Rev1` | `in_progress` | `read-only observer`，零修改 | writable FRONT successor 正在重跑目录选择定向测试、typecheck、build 与 scoped diff-check | 形成 `artifact_written` 后只交规划 |
| `BACK-MATERIAL-FOLDER-01 Rev1` | `artifact_written`，待规划复核 | 原 BACK 产物已完成 | 新增 create-upload 命令同身份 GET 恢复；build/check 通过，数据库专项因本地 55432 未运行未冒充通过 | 由 TEST 在隔离 PostgreSQL 复验 |
| `UI-MATERIAL-FOLDER-01 Rev1` | `artifact_written` | `read-only observer` | UI docs successor 已把四阶段、目录降级、暂停/继续、刷新重选和 1024/390 验收写入既有 `docs/ui/M2-material-pairing-acceptance.md` | 作为 FRONT/TEST 权威输入，不再建第二文档 |
| `TEST-MATERIAL-FOLDER-01 Rev1` | `waiting_on_FRONT_artifact_written` | `read-only observer`，零修改 | writable TEST successor 已完成只读预检并保留独占测试路径，未抢改 FRONT 测试 | FRONT 冻结后立即执行独立验收 |

共同租约：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`；`permission_profile=workspace-write/:workspace`；`ordinary_writes=direct`；`authority_generation=2`。固定只读 observer 不持有写路径。

- FRONT lease：`handoffToken=FRONT-MATERIAL-FOLDER-01-RESUME-V4.895`；`allowed_paths=frontend/src/features/uploads/{UploadQueue.tsx,UploadQueue.module.css,model.ts,sha256.ts,file-selection.ts},tests/frontend/UploadQueue.test.tsx`；predecessor 停点为目录选择后缺少可见分配/进度，当前真实剩余为定向测试选择器口径复验。
- TEST lease：`handoffToken=TEST-MATERIAL-FOLDER-01-RESUME-V4.895`；`allowed_paths=tests/frontend/material-folder-flow.test.tsx,tests/backend/upload-command-recovery.test.ts`；状态为等待 FRONT `artifact_written`，随后验证目录、51 集/102 文件元数据规模、暂停继续、unknown 同身份恢复与 A/B 隔离。
- 接力顺序固定为 `FRONT artifact_written → planning_received → TEST reviewer_started → TEST artifact_written → 规划关闭/服务器新 release`。账号、Provider、模型、Codex 重启或固定任务权限变化只重新探针，不清空本表、不重复已经发出的写命令。

> BACK-MATERIAL-FOLDER-01：实现已转 `review / Current actor=规划对话 / Reviewer=规划对话`。新增 `GET /api/projects/:projectId/uploads/commands/:commandId`，其中 `commandId` 即 create POST 的 `Idempotency-Key`；同项目只读恢复已提交 UploadSession，跨项目/未知稳定404，POST 同键重放/异参冲突继续由既有命令事务处理。素材目录、暂停/继续仍复用既有 MaterialManifest/UploadSession 唯一状态源，无迁移。contracts/backend build、check:repo、git diff-check 通过；uploads 专项因本地 PostgreSQL 55432 未运行而在 beforeEach `ECONNREFUSED`，未冒充通过。

> `handoffToken=FIFO338-BACK-EMPLOYEE-SESSION-01-R1-V4.890`：BACK-EMPLOYEE-SESSION-01 Rev1 后端实现已收口并转 `review / Current actor=规划对话 / Reviewer=规划对话`。固定后端任务在宿主重启后变为只读，规划仅有界接管其已开始的后端差量：新增严格登录/session/logout 契约、版本化 scrypt verifier、HMAC-SHA256 14 天 `__Host-` Cookie、精确 Origin 写请求门与 employee principal；旧 Nginx Basic/loopback 受信头生产解析已物理删除，管理员 Cloudflare Access 保持独立。新鲜员工会话+管理员 Access 专项 `2 files / 11 tests`、contracts/backend build、backend typecheck、check:repo、git diff-check 均通过。前端登录页尚未实现/部署，员工域名继续保持现有认证保护。

> `FIFO337-TEST-SERVER-ACCESS-DEPLOY-01-R1-V4.889`：测试服务器已从不可变 release `20260821-access-jwt-v4889` 原子切换 backend；frozen install、contracts 普通 Node import、根 build、Fastify production `/health=200`、员工域名 Basic 后项目/任务/health JSON 真链均通过。管理员域名未登录由 Cloudflare Access 302 拦截，直接 origin 无 JWT 403；有效邮箱会话需用户本人在可见页面完成后再复验。紧急增量登记 `TEST-SRV-20260820-024`：Codex 内置浏览器访问员工域名显示 `ERR_INVALID_AUTH_CREDENTIALS` 且未弹 Basic 登录框，curl 对照仍未认证401/受保护200；保持认证与服务，不改密码、不公开匿名、不用 URL 内嵌凭据，等待规划裁决。

> `handoffToken=FIFO336-BACK-CLOUDFLARE-ACCESS-01-R2-V4.888`：BACK-CLOUDFLARE-ACCESS-01 Rev2 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。员工认证已物理删除 Cloudflare employee AUD verifier/环境配置，唯一员工身份来源为 loopback Nginx 受信头；管理员仅接受 control AUD/JWKS/issuer/邮箱白名单，员工公开 API、管理员 JWT 隔离与已通过回归保持不变。

> `FRONT-PUBLIC-WEB-01 Rev1` 已完成：repo_root=`C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、permission_profile=`workspace-write/:workspace`、ordinary_writes=`direct`。状态 `review / Current actor=规划对话 / Reviewer=规划对话`。员工 frontend 已统一使用单一安全 UUID 能力，纯 HTTP 下原生 `crypto.randomUUID` 缺失时由 `crypto.getRandomValues` RFC4122 v4 fallback 生成；不改请求 body、稳定意图、幂等/unknown/冲突状态机，不改 backend、contracts、迁移、system-frontend、DESIGN、服务器或部署。静态扫描确认 frontend/src 不再存在直接 `crypto.randomUUID` 或 `Math.random` 幂等 fallback。

> 用户明确当前目标仅为“接入测试服务器，在网站上运行并测试员工站和管理员站”。规划已覆盖此前扩展验收范围，将服务器任务收敛为 `TEST-SERVER-WEB-SMOKE-01`：Fastify仅回环3001、员工站回环8080、管理员站回环8081，用户通过SSH本地端口转发访问18080/18081；不等待域名/TLS，不开放公网应用端口，不做压测/故障注入/ASR/OCR/COS/Sentry。启动必需的专属storage静态门保留；两站能打开后只诚实标明因测试身份或外部服务未接导致的403/不可用功能。

> FIFO333 在新 release/构建通过后停止于 `/var/lib/qimao-terms-cloud=root:root 0755`，未擅自改权，裁决正确。规划核对正式 unit 与历史时间试验状态后拒绝递归 chown/chmod 共享父目录；正式部署资产改为 `StateDirectory=qimao-terms-cloud/storage`、`QIMAO_STORAGE_ROOT=/var/lib/qimao-terms-cloud/storage`、ReadWritePaths仅专属子目录。父目录与其他历史证据保持root所有，systemd只管理 `storage=qimao:qimao 0750`。TEST-SRV-010进入 fixing；待 FIFO334 先做真机 `systemd-analyze verify`、父目录/中间符号链接与创建前后差量核验，再恢复production上传/交付与两站烟雾。

> `handoffToken=FIFO333-TEST-SERVER-DEPLOY-01-R4-V4.881` 已派发，测试服务器协作恢复执行。规划新鲜独立复验 FIFO332：filesystem `1 file / 5 tests`、backend production build、git diff-check 均 exit 0。服务器只允许新不可变 release、SHA/frozen install/root build、临时隔离库+临时存储根的 production Fastify 同源分片上传/交付跨实例真链；通过后才启动现有空应用库的回环 Fastify，再进入127.0.0.1:8080/8081两站 Nginx 烟雾。不得公开端口、续费、接真实供应商/Secret/COS/Sentry/付费或启动Worker/压测；每个里程碑必须同步协作看板与问题台账。

> 测试服务器协作交互已补齐：新增唯一用户可读看板 `docs/deployment/TEST-SERVER-COLLABORATION.md`，统一展示实时阶段、协作角色、用户反馈方式、未解决问题和下一次交接；交接清单/一日运行手册不再错误显示“未连接/待派发”。FIFO332 已完成，TEST-SRV-009 由 `confirmed → fixing → retest`，等待新不可变 release 在服务器执行 production Fastify、上传/交付和两站回环烟雾。当前用户无需提供密码或续费；服务器继续安全暂停到精确恢复令牌。

> handoffToken=`FIFO332-BACK-DEPLOY-STORAGE-01-R2-V4.879`：同一 BACK-DEPLOY-STORAGE-01 Rev2 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。filesystem namespace 创建现在先对受信 root 逐级 lstat/非符号链接校验再创建，Upload/Delivery 中间路径替换为符号链接会 fail-closed，Delivery 不再间接创建 uploads 命名空间或保留未使用 store。authorizePart 纳入 storageUploadId 单资源锁，多个 part 并发授权均持久保留。abort/delete/read/head 继续只操作摘要派生且逐级受根约束的精确普通文件。新增回归覆盖 Upload/Delivery 中间 symlink、并发授权、Linux 权限条件断言与既有并发完成/实例重建；filesystem 专项 fresh `1 file / 5 tests`、backend typecheck/build、check:repo、git diff-check 通过。项目 PostgreSQL 仍为 PID 11716 占位无响应状态，未杀进程、删数据或改默认库；DB-backed production Fastify/uploads/deliveries 链仍留测试服务器新 release 复验。

> handoffToken=`FIFO331-BACK-DEPLOY-STORAGE-01-R1-V4.877`：任务已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。新增单一 `FilesystemUploadStorage`/`FilesystemDeliveryStorage`：`QIMAO_STORAGE_ROOT` 必须是已存在绝对非符号链接可写目录，multipart manifest/授权摘要/分片/对象元数据持久落盘，临时文件 fsync 后原子 rename，objectKey 只经摘要路径，实例重建可恢复，交付 head/read/delete 跨进程成立。同源 binary PUT 已由 `DirectUploadStorage` 能力判定，production `startServer()` 在 listen 前装配正式磁盘适配器；`createApp()` 未注入仍 fail-closed。环境示例、systemd StateDirectory/ReadWritePaths 与 Linux 运行文档已同步。新鲜 filesystem 专项 `1 file / 4 tests`、backend typecheck/build、production storage gate、check:repo、git diff-check 通过；uploads/deliveries 真实 PostgreSQL 专项因项目本地 PostgreSQL PID 11716 占用端口但无响应，尝试 `pnpm db:start` 首因为 `pg_ctl ... postgres.log: Permission denied`，未修改/删除数据。Access/Secret/provider、服务器部署、公网与完整 pnpm check 继续留后续门。

> handoffToken=`FIFO330-TEST-SERVER-DEPLOY-01-R3-V4.876`：FIFO329 已通过规划独立复核：新鲜 contracts真build、普通Node动态import `ProjectSchema`、backend build与diff-check均退出0，生成84个dist运行时文件；正式包解析已越过原ERR_MODULE_NOT_FOUND。规划关闭BACK-DEPLOY-RUNTIME-01并恢复服务器部署，但禁止修改旧release；必须生成新不可变release、清单/敏感扫描/归档SHA、本地远端SHA，服务器重新frozen install与根build，再以既有root-owned环境文件运行普通Node production硬门。只有Fastify真实监听回环且health通过才可安装两站loopback Nginx并做断库、深链、API不回退HTML、source map、两站隔离和监听烟雾。下一真实readiness失败即停，不得development/fake绕过；不开放公网、不续费、不接真实厂商。

> handoffToken=`FIFO329-BACK-DEPLOY-RUNTIME-01-R1-V4.874`：FIFO329 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。仅在 contracts/package 与直接构建脚本、部署说明建立唯一 ESM 产物闭环：`packages/contracts/dist/*.js + *.d.ts + *.map`；exports 的 types 条件保留源码类型解析，Node import/default 指向 dist，未提交生成 dist。backend、两站、根 build/dev/test 路径均显式先构建 contracts，Linux 发布文档明确整体携带 `packages/contracts/dist`，不再只复制 backend/dist。干净路径删除旧 contracts/dist 后 `pnpm run build` 成功，workspace 动态 import `ProjectSchema` 成功；contracts typecheck/build、backend typecheck/build、frontend/system-frontend build、frontend system-control 定向 `7/7`、backend sidecar 定向 `11/11`、check:repo、git diff-check 均通过。`NODE_ENV=production node backend/dist/server.js` 已越过 contracts ERR_MODULE_NOT_FOUND，下一真实首因为既有 `生产环境必须配置 DATABASE_URL` readiness 门，未注入 fake/吞错。服务器 PG 仍仅回环、Fastify/Nginx/Worker 保持停止。

> handoffToken=`FIFO328-TEST-SERVER-DEPLOY-01-R2-V4.873`：FIFO327 国内三源三轮时间门经规划接收后正式解锁下一阶段。依据用户既有“允许安装基础软件并部署测试环境”授权，TEST-SERVER-DEPLOY-01 Rev2 已派发，仅执行 loopback 测试环境：主机/账户/端口/最近时间轮预检→PostgreSQL仅回环与安全测试凭据→37/37迁移及业务零行→固定release依赖/构建→production Fastify真实硬门→仅在硬门通过后安装两站静态产物和127.0.0.1:8080/8081 Nginx并做烟雾。不得以development/mock/fallback绕过真实Storage/Access/provider门，不开放公网、不改DNS/TLS/防火墙、不接厂商/Secret/COS/Sentry/付费、不续费。任一时间新轮失败或阶段首因失败即停止交规划；到期仍为硬停止点。

> handoffToken=`FIFO327-TEST-SERVER-OPS-01-R5-V4.872`：Rev5 domestic-only 三轮正式通过。固定 `www.aliyun.com`、`www.qq.com`、`www.baidu.com`，手动轮与timer连续两轮均3/3成功、spread/median/maxabs通过、每轮一次平滑校正成功、失败计数0；timer两轮间隔约5分17秒且无重叠。trial timer当前active+enabled，timesyncd inactive+enabled，包htpdate inactive+disabled；PG/Nginx/Fastify/Worker、DB/env/迁移仍未启动或创建，公网仍仅SSH 22。该事实只证明国内HTTP一天试用时间基线，不等同生产可信时间；旧Rev4失败不回写。

> handoffToken=`FIFO326-TEST-SERVER-OPS-01-R5-V4.871`：用户明确接受“仅国内 HTTP 时间源”作为一天试用的临时时间基线，且当前不续费。规划将其登记为全新 Rev5 产品/风险决策，Rev4 六源失败与回滚结论保持关闭，不回写、不删改、不在旧门内静默排除国际源。Rev5 固定且仅使用 `www.aliyun.com`、`www.qq.com`、`www.baidu.com`，每轮三源各查询一次且必须 `3/3` 成功；不得重试、换源、增加第四源或改参数。门值仍为 spread≤2s、|median|≤2s、max correction≤60s；先手动成功一轮，再由同一 systemd timer 连续成功两轮，间隔5±1分钟且无重叠。任一来源/阈值/校正/调度失败立即停用 trial、恢复 timesyncd，不再自动追加 Rev6。三轮通过也只解锁 loopback 部署复核，不自行启动 PostgreSQL/Nginx/Fastify/Worker，不开放端口、不续费、不购买资源；`2026-08-21 11:04` 仍为硬停止点。

> handoffToken=`FIFO325-TEST-SERVER-OPS-01-R4-V4.869`：Rev4同名script/service已改为systemd原生Logs/State/Runtime目录管理，远端SHA与本地一致，`bash -n`、`systemd-analyze verify`、daemon-reload通过；运行前trial与包htpdate停用、timesyncd active+enabled。手动唯一轮于17:52:31真实查询固定六源各一次：offset为Debian `-2.125000`、Cloudflare `0`、Microsoft `0.250000`、Aliyun/QQ/Baidu各 `0.125000`，median `0.125000`、spread `2.375000`、maxabs `2.125000`。因spread超过预先冻结的 `≤2s`，门失败，未执行 `-a` 校时；失败计数1，service exit1。任务已停止trial/timer并恢复timesyncd active+enabled，NTP=yes/NTPSynchronized=no。规划禁止在看到结果后排除来源、重试、换源或放宽阈值；依“任一失败即停、无Rev5”正式关闭Rev4，最终结论为本雨云一天试用在当前时间共识门下未通过部署前置，等待用户未来另选供应商或显式开启全新产品决策。

> handoffToken=`FIFO324-TEST-SERVER-OPS-01-R4-V4.868`：用户新裁决为继续部署、先证明服务器可用再决定是否续费，当前不购买资源。规划重新评估后允许全新Rev4，Rev3保持关闭且不再补丁。Rev4仍只使用Debian官方htpdate与固定六源；改由systemd `LogsDirectory/StateDirectory/RuntimeDirectory` 自动创建并提供三个root-only目录，脚本只消费对应环境变量，不再mkdir/chown/rm目录根，不碰共享 `/var/log/qimao-terms-cloud`，service删除ReadWritePaths。执行门固定为手动成功1轮+同一timer连续成功2轮、间隔5±1分钟且无重叠；任一失败立即回滚timesyncd并永久停止本方案，不再Rev5。三轮通过后仅交规划，不自行启动PG/Nginx/Fastify/Worker或创建DB/env/迁移。`2026-08-21 11:04`仍为硬停止点，成功只证明loopback试用时间基线，不等同生产可信时间或解锁公网/Secret/厂商API/付费。

> handoffToken=`FIFO323-TEST-SERVER-OPS-01-R3-V4.866`：最终安全回滚完成。Rev3 timer已inactive+disabled，service inactive+dead且reset-failed；原 `/etc/default/htpdate` 已由非符号链接root:root0644备份原样恢复，备份与当前SHA256均为 `841d7be93400ad8b7f4d4ede7d1f22a1865d79e0a4a41a7df1d94d91b9a9090a`；包自带htpdate为loaded+inactive+disabled。`systemd-timesyncd` 已active+enabled，`NTP=yes / NTPSynchronized=no` 诚实保留机房屏蔽UDP/123事实。PostgreSQL/Nginx inactive+masked-runtime，Fastify/Worker、DB/env/迁移均未创建或启动；最终仅22监听，80/443/3001/5432无监听。Rev3资产、目录和root-only审计保留但均不自启。最终裁决：本雨云一天试用在当前可信时间门下未通过部署前置；不续费、不购买资源、不再追加Rev3修补，TEST-SERVER-OPS-01转 `blocked / Current actor=用户 / Reviewer=规划对话`，仅当用户另选供应商或明确开启全新方案时再恢复。

> handoffToken=`FIFO322-TEST-SERVER-OPS-01-R3-V4.865`：专属目录修正、两资产重传/SHA、`bash -n`、`systemd-analyze verify` 与daemon-reload均通过，但timer于17:37:37首个真实触发仍在任何六源查询/校时前失败：`ProtectSystem`命名空间下脚本 `mkdir -p /var/log/qimao-terms-cloud/time-trial` 对只读共享父目录返回Permission denied，exit1；timer已于17:39:39停止，应用/数据库仍全停。依FIFO321预先冻结的“本修正仍失败即停”，规划不允许第三次script/unit修补，正式裁决该雨云主机在“一天试用、零额外费用、当前可信时间门”下未通过部署前置。已派发安全回滚：禁用Rev3 timer/service、恢复原htpdate配置但保持包daemon禁用、恢复并启用timesyncd，保留审计与已安装资产，不删除数据、不启动应用、不购买或续费。

> handoffToken=`FIFO321-TEST-SERVER-OPS-01-R3-V4.864`：目录前置核验发现共享 `/var/log/qimao-terms-cloud` 已为真实目录、非符号链接、`qima:qima 0750`；状态父/子目录缺失。规划核对正式后端/Worker单元与部署文档后拒绝将共享日志根改为root:adm，因为业务服务需写该目录。批准Rev3唯一最小资产修正：时间任务改用专属 `/var/log/qimao-terms-cloud/time-trial`（root:adm 0750），service `ReadWritePaths` 同步指向该子目录；共享根所有权/权限/内容不变。状态父目录root:root0755、子目录root:root0700。仅更新并重传script/service两项、重做SHA/静态门后观察既有timer两轮；本修正若仍失败即停，不再追加修正。另登记后续应用启动前必须核对服务器账户 `qima` 与仓库unit `User=qimao` 的命名一致性，本轮不得顺手改账户或业务unit。

> handoffToken=`FIFO320-TEST-SERVER-OPS-01-R3-V4.863`：正确公钥路径恢复后，主机指纹、`whoami=qimao-deploy`、`sudo -n` 通过；三项Rev3资产已上传且本地/远端SHA256一致，root-owned安装、服务器 `bash -n` 与 `systemd-analyze verify` 通过。timer首轮在任何查询/校时前以 `226/NAMESPACE` 失败，journal首因为 `ReadWritePaths` 的 `/var/lib/qimao-terms-cloud/time-trial` 尚不存在；timer已停止，应用/数据库仍全停。规划核对资产后批准唯一单点修复：仅预创建本任务自有日志/状态目录并固定root所有权/权限，不改script/unit/timer逻辑、不新增路径或重试。路径与静态门重验、旧daemon状态复核通过后，只启动既有timer观察连续两轮；任一失败或周期不符立即停止并交规划，不再叠加修复。

> handoffToken=`FIFO319-TEST-SERVER-OPS-01-R3-V4.862`：最后一次SSH失败原因为私钥路径文件名少一个字符：命令使用 `qima_test_server_20260820_ed25519`，真实既有文件为 `qimao_test_server_20260820_ed25519`；同名 `.pub` 也存在，创建/修改时间与本日bootstrap记录一致。规划仅以受控外部执行核对文件存在与名称元数据，未读取、复制或显示私钥内容，也未枚举其他密钥。已将正确路径交回服务器任务并恢复执行：先仅一次 BatchMode+StrictHostKeyChecking只读核验主机指纹、`whoami=qimao-deploy`、`sudo -n`；通过后才按既定顺序上传三资产并验证/观察timer两轮，失败则立即停止且不新增密钥或通道。

> handoffToken=`FIFO318-TEST-SERVER-OPS-01-R3-V4.861`：用户已在Codex内置浏览器登录雨云，当前唯一详情页DOM可读、VNC iframe root提示符可见；旧daemon inactive+masked-runtime截图门继续成立。三项Rev3资产仍仅在仓库，尚未上传/安装/启用；最近一次SSH/scp因同一外部执行环境间歇看不到专用私钥而未连接成功。规划继续只允许既有 `qimao-deploy` 公钥由OpenSSH直接消费：精确ssh/scp可走受控外部执行，私钥路径只作为 `-i` 参数，不得读取、复制、显示、移动或写入临时目录；禁止VNC heredoc/base64、大段粘贴、临时HTTP下载或降低SSH策略。若同一安全上下文仍不可见，立即转 `blocked_on_ssh_key_visibility`，不得新增第三通道。

> handoffToken=`FIFO317-TEST-SERVER-OPS-01-R3-V4.860`：用户VNC截图确认旧 `htpdate` 已为 `LoadState=masked / ActiveState=inactive / SubState=dead / UnitFileState=masked-runtime`，Rev3首个安全门正式通过。服务器任务仅在本地新增 `qimao-htpdate-trial`、`.service`、`.timer` 三项资产，尚未上传或启用；PostgreSQL仍inactive+masked-runtime、15/main down，DB/角色/env/迁移/业务行均为0。规划已恢复服务器任务，优先通过此前验证的 `qimao-deploy` 专用公钥安全通道完成主机身份/用户/sudo复核、三资产临时上传与SHA256、服务器 `bash -n`/`systemd-analyze verify`；不得复制或显示私钥，不得改走VNC大段粘贴/base64/cron/第二客户端。静态门通过后才可启用timer并观察连续两轮 `5±1` 分钟，两轮通过前所有应用与数据库继续冻结。

> handoffToken=`FIFO316-TEST-SERVER-OPS-01-R3-V4.859`：用户截图已提供当前权威状态，旧 `htpdate=ActiveState=active / UnitFileState=enabled`，`systemd-timesyncd=inactive / enabled`；因此上轮 stop/runtime mask 未生效，Rev3 的 inactive+masked-runtime 先决门明确未通过。规划已向服务器任务派发唯一可逆恢复动作：仅在用户可见root VNC中执行一次 `systemctl stop htpdate.service && systemctl mask --runtime htpdate.service`，随后同一行只读输出 LoadState/ActiveState/SubState/UnitFileState 与结束标记。任一报错或未得到 `inactive + masked-runtime` 即停止；截图证据成立前禁止创建Rev3资产或启动任何应用服务。

> handoffToken=`FIFO315-TEST-SERVER-OPS-01-R3-V4.858`：Edge重启后雨云详情页DOM恢复可读，VNC Terminal input已激活；服务器任务仅提交一次规划指定的只读命令，查询 `htpdate` 与 `systemd-timesyncd` 的 ActiveState/UnitFileState并输出结束标记。提交后终端文本与截图读取再次超时，任务未重复输入，因此状态仍为 `verification_pending / Current actor=用户`。恢复输入进一步收敛为用户直接截取当前VNC终端画面回传；无需再次执行命令。Rev3资产写入0，PG/Nginx/Fastify/Worker、DB/env/迁移/端口无变化。

> handoffToken=`FIFO314-TEST-SERVER-OPS-01-R3-V4.857`：用户已按要求重新打开雨云 VNC，但 Edge 扩展通道与内置浏览器通道对详情页/iframe DOM、截图仍连续超时；专用公钥执行上下文也仍无法访问用户 `.ssh` 私钥。该事实证明阻塞在浏览器/执行通道，不是用户未重开页面。旧 `htpdate` 状态仍为 `verification_pending`，Rev3资产写入0、所有应用服务保持停止。恢复路径收敛为：用户在可见的root VNC中执行规划提供的单条只读 `systemctl show` 命令并回传无敏感信息的输出截图，或等待安全公钥执行路径恢复；不再要求重复刷新页面。

> handoffToken=`FIFO313-TEST-SERVER-OPS-01-R3-V4.856`：Rev3 先决门未通过，当前为 `verification_pending / Current actor=用户 / Reviewer=规划对话`。服务器任务已尝试关闭卡住的临时页、重新打开雨云详情/VNC并切回原标签，但 DOM、截图和控制台画面连续超时；当前执行上下文也无法读取用户 `.ssh` 中的专用私钥，因此不能证明上轮 `htpdate stop + runtime mask` 已完成。严格按门禁未创建 Rev3 script/unit/timer/state，未重复 stop/mask，PG/Nginx/Fastify/Worker、DB/env/迁移/端口均无变化。恢复输入只需用户刷新或重新打开雨云 VNC，使既有 root shell 画面可读；恢复后的第一条动作只能是只读 `systemctl show/is-active`，确认旧 daemon inactive+masked 后才可继续。

> handoffToken=`FIFO312-TEST-SERVER-OPS-01-R2-V4.855`：HTP Rev2 固定六源 query-only 全部 RC=0，国内/国际六个独立操作方均成立，offset 为 `0–0.125s`、散布 `0.125s`、控制端交叉偏差约 `0.576s`、最大校正需求 `0.125s`，来源一致性门通过。但 Debian `htpdate` 常驻模式每次校正后固定休眠30分钟再叠加300秒，实际约35分钟一轮，无法满足已冻结的5分钟持续门；旧常驻进程停止结果仍须先完成只读核验。规划选择方案A并登记 Rev3：不引入第二客户端，仅用同一 `htpdate` 的 root-owned systemd oneshot+timer 每5分钟执行固定六源、平滑校正和审计；连续两轮失败必须停止测试栈。只有旧 daemon 确认 inactive/masked、unit/script 静态验证通过且连续两轮间隔 `5±1` 分钟真实成功后，才允许继续 PostgreSQL/Nginx/Fastify loopback 部署。

> 雨云客服确认当前机房因 NTP 攻击长期屏蔽 NTP 流量，原“等待 UDP/123 修复”恢复门不可成立。规划为满足用户一天、零费用、仅验证可用性的目标，批准 Debian 12 官方 `htpdate` 作为严格有界的 `trial_only_http_consensus` 临时时间基线：至少3个独立 HTTP Date 来源 query-only 成功、源间散布≤2秒、与本机控制端 UTC 偏差≤2秒、所需校正≤60秒才允许平滑校正；持续5分钟级校验，连续两轮失败即停应用。该基线不等同可信生产时间，不得标为 `NTPSynchronized=yes`，不得解锁公网、TLS/JWT/Access、真实 Secret、厂商 API、COS/Sentry、付费调用或生产发布。到期前必须停应用/数据库/HTP并恢复原 timesyncd 配置，不续费、不购买资源。

> 用户已把 TEST-SERVER-DEPLOY-01 收敛为“只使用现有一天试用窗口验证可用性”，明确不续期、不购买资源、不产生续期费用。`2026-08-21 11:04` 为硬停止点；HTP 只作为该窗口内的临时 HTTP 共识时间基线，不等同可信生产同步，也不解锁公网、TLS/JWT/Access、真实 Secret、厂商 API、COS/Sentry、付费调用或生产发布。到期前必须停止测试栈和 HTP timer、恢复原 timesyncd 配置并保留审计日志。

> TEST-SERVER-DEPLOY-01 已完成 Debian 12 基础安装、SSH/公钥/sudo 加固与发布快照准备；4 vCPU/7.8GiB/99G、Nginx 1.22.1、PostgreSQL 15.18、Node 24.19.0、pnpm 11.21.0 成立。PostgreSQL/Nginx/Fastify 仍未启动，数据库角色/库/凭据/迁移/业务行均为0，公网仍仅22可达。当前为 `in_progress / Current actor=测试服务器接入与问题记录任务 / Reviewer=规划对话`，唯一执行门是 Rev3 HTP timer 的旧进程停稳核验与连续两轮新鲜成功；若失败或周期不符，立即回滚并关闭本次试用，不再叠加 Rev4。

> 用户已明确授权安装测试服务器基础软件并部署测试环境，登记 `TEST-SERVER-DEPLOY-01=in_progress / Current actor=测试服务器接入与问题记录任务 / Reviewer=规划对话`。执行顺序固定为只读主机预检→最小 Debian 运行时安装→仅 loopback/SSH 隧道部署→新测试数据库从零37/37迁移与业务零行→两站/Fastify/health/端口安全烟雾。不会自行开放80/443、修改DNS/TLS或接入真实厂商、模型、Secret、COS/Sentry、付费调用；若 production Storage/Access/provider 硬门阻断则保留首因交规划，不以 development/mock/fallback 绕过。

> SYSTEM-09 已由规划正式关闭。`FIFO311-TEST-SYSTEM-09-R2-V4.847` 在当前仓库 37 项迁移的精确隔离 PostgreSQL 上完成唯一完整 `pnpm check`，退出码0；Vitest `46 files / 447 tests`、四工作区 lint/typecheck/build 全通过。结合 FIFO309 正式 Fastify、两站 production build、零网络有序路由/本地 OCR sidecar、系统 Chrome 双视口与权限矩阵，最终 `P0/P1/P2/P3=0/0/0/0`、无 `QA-SYSTEM-09-*`。隔离库、端口、浏览器和进程残留均为0，共享 PostgreSQL 55432 未迁移、未清理、未写入。UI/BACK/FRONT/TEST 切片统一转 `done`，FIFO308–311 统一转 `closed`。真实 FunASR/PaddleOCR、云厂商、Secret、外部网络、付费与生产发布仍不在本阶段完成事实内。

> handoffToken=`FIFO311-TEST-SYSTEM-09-R2-V4.847`：唯一完整关闭门已完成并交规划复核。前置 `check:repo`/`git diff-check` 通过；精确隔离库从零当前37/37迁移、`schema_migrations=37`、`projects=0`；唯一 `DATABASE_URL` 绑定完整 `pnpm check` 退出码0，Vitest `46 files / 447 tests` 全通过，四工作区 lint/typecheck/build 全通过。隔离库已 DROP，`qimao_system09_*` 残留、临时监听端口、pnpm/vitest 进程均为0，共享 PostgreSQL 55432 未迁移/未清理并保持运行。P0/P1/P2/P3=`0/0/0/0`，无 QA-SYSTEM-09；状态转 `FIFO311=review / TEST-SYSTEM-09 Rev2=review / Current actor=规划对话`。

> handoffToken=`FIFO311-TEST-SYSTEM-09-R2-V4.847`：已完成权限握手并领取。`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。状态写回 `FIFO311=active / TEST-SYSTEM-09 Rev2=in_progress / Current actor=全链测试与质量验收对话 / Reviewer=规划对话`；冻结 FIFO309 全部产品、浏览器、专项与 P0–P3=0 证据，仅执行 check:repo、git diff-check、37/37隔离迁移、唯一完整 pnpm check、精确清理与孤儿核对，不触碰共享默认库。

> handoffToken=`FIFO311-TEST-SYSTEM-09-R2-V4.847`：FIFO310 已通过规划差异审查与新鲜双文件组合复验 `2 files / 15 tests`；确认测试应用不再拥有外部 pool，唯一 afterAll 链为 `app.close → pool.end → admin terminate → DROP → 残留确认 → admin.end`，无 timeout/sleep/retry/fallback/生产改动。登记 TEST-SYSTEM-09 Rev2 最终关闭门 `ready / Current actor=全链测试与质量验收对话 / Reviewer=规划对话`：冻结 FIFO309 产品矩阵，只创建一份从零37迁移隔离库并运行本轮唯一完整 `pnpm check`，通过且清理为0后交规划关闭 SYSTEM-09。

> handoffToken=`FIFO310-BACK-TEST-HEALTH-02-R1-V4.844`：FIFO310 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。原始失败精确定位为两套件 `afterAll` 首个 `await app.close()`；`backend/src/app.ts` 的 onClose 会调用注入数据库的 `end()`，在 FIFO309 全套顺序下应用关闭阶段等待外部 pool，未进入 terminate/DROP。仅修改两份测试：应用注入 query/connect 代理且不拥有 pool，afterAll 按 `app.close → pool.end → admin terminate → DROP → 残留确认 → admin.end` 单一链清理；无 timeout 放宽、sleep/retry/fallback、生产改动或业务断言改动。新鲜证据：pre-review `7/7`、operations `8/8`；两文件顺序 `15/15`、反序 `15/15`；与 routing/strategy-runtime 邻近串行组合 `31/31`；backend tsc/build、git diff-check 通过；临时数据库残留查询为 `[]`。完整 `pnpm check` 留 TEST 唯一关闭门。

> handoffToken=`FIFO309-TEST-SYSTEM-09-R1-V4.839`：最终全链验收已完成并交规划复核。正式 routing/OCR sidecar/operations 专项、37迁移隔离纵向 Fastify、两站 production build、系统 Chrome 双视口与权限/零网络矩阵均通过，P0/P1/P2/P3=`0/0/0/0`，未形成 `QA-SYSTEM-09-*`。唯一完整关闭门按要求绑定从零37迁移的隔离数据库后仅运行一次 `pnpm check`：退出码1，447/447测试断言通过、44文件通过，唯一失败为 `pre-review.test.ts` 与 `system-control-operations.test.ts` 的隔离清理 `afterAll` 默认10秒钩子超时；无产品断言失败。原始日志与脱敏证据已保留，隔离库/端口/浏览器/harness已精确清理，共享 PostgreSQL 55432 未迁移、未清理、保持原运行态。状态转 `FIFO309=review / TEST-SYSTEM-09 Rev1=review / Current actor=规划对话`，等待规划关闭裁决。

> handoffToken=`FIFO309-TEST-SYSTEM-09-R1-V4.839`：用户已明确恢复。权限指纹重新确认：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。状态恢复为 `FIFO309=active / TEST-SYSTEM-09 Rev1=in_progress / Current actor=全链测试与质量验收对话 / Reviewer=规划对话`；routing 7/7、OCR sidecar 11/11、operations 8/8、check:repo、git diff-check 既有证据冻结，不重复。暂停时未完成的六文件专项将从头开始运行，随后完成正式纵向/浏览器矩阵与清理，末尾只运行一次完整 `pnpm check`。

> handoffToken=`FIFO309-TEST-SYSTEM-09-R1-V4.839`：用户即时暂停，任务保持 `blocked / Current actor=规划对话`，FIFO309=`paused`，原因“用户即时暂停”。已完成权威文件读取、权限握手与领取写回；新鲜专项中 `system-control-routing 7/7`、`screen-text-local-ocr-sidecar 11/11`、独立 `system-control-operations 8/8` 通过。五文件合跑原始结果保留为 `3 failed / 2 passed`（asr/screen-text 旧夹具直接写入已被37项迁移收紧为 NOT NULL 的 `routing_policy_pools.max_concurrent_jobs`；operations 合跑 afterAll 超时，独立重跑8/8通过），不得据此宣称产品缺陷。后续六文件专项在用户暂停时已安全中止，未运行完整 `pnpm check`；隔离库、端口、Node/pnpm/Vitest/Chrome 进程均核对无本轮残留，共享 PostgreSQL 55432 连接保持可用。

> handoffToken=`FIFO309-TEST-SYSTEM-09-R1-V4.839`：已完成权限握手并领取。权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`；`FIFO309=active / TEST-SYSTEM-09 Rev1=in_progress / Current actor=全链测试与质量验收对话 / Reviewer=规划对话`。本轮严格按当前仓库37项迁移与正式 production Fastify、两站 build、零网络路由/sidecar Worker、系统 Chrome 执行；只写测试报告、CURRENT、开发日志和仓库外脱敏证据，不改生产 frontend/system-frontend/backend/contracts/migrations/DESIGN，不接真实供应商、Secret、网络、付费或部署。

> handoffToken=`FIFO309-TEST-SYSTEM-09-R1-V4.839`：规划已独立核对 `backend/migrations/*.cjs=37`，FIFO308 派发中的“38迁移”是旧口径，不是产品或环境失败；UI 产品场景 `10/10`、P0–P3=0，正式构建/服务/隔离库/零网络 Worker/Chrome 与清理证据成立。SYSTEM-09 各实现切片现统一冻结，登记最终全链关闭门 `ready / Current actor=全链测试与质量验收对话 / Reviewer=规划对话`：只使用当前仓库全部37项迁移，覆盖有序路由、安全前进、本地 OCR sidecar、operations 投影、管理员 routing/changes/logs 与两站隔离，最后运行唯一完整 `pnpm check`；不接真实供应商、Secret、网络、付费或部署。

> handoffToken=`FIFO308-FRONT-SYSTEM-09C-R6-UI-R1-V4.836`：单项 production UI 微复验已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。新鲜 system-frontend build 45 modules、正式 Fastify、从零执行仓库当前全部迁移、零网络 Worker 与 Playwright 1.62.1/系统 Chrome 下，请求场景 `10/10` 通过，`P0/P1/P2/P3=0/0/0/0`：第三次显式重读前按钮真实获焦；pending 时同一 ErrorBlock、旧 requestId、stale 与唯一 disabled“读取中…”保留，`activeElement` 精确为该 `role=alert`；真实200后才清投影并聚焦“日志与质量”H1；application console error/warn=`0/0`、pageerror=`0`，两条受控503单列。原始结果 `12/11/1` 的唯一失败不是产品断言：派发写“38迁移”，但本轮仓库正式 `backend/migrations/*.cjs` 实际为37个，node-pg-migrate从零执行37/37且 schema_migrations=37；已保留原始结果与独立 adjudication，交规划校正环境口径后决定 TEST。生产代码修改0，UI不自行解锁 TEST。

> handoffToken=`FIFO308-FRONT-SYSTEM-09C-R6-UI-R1-V4.836`：UI 设计对话已完成权限握手并领取，状态 `active / in_progress / Current actor=UI设计对话 / Reviewer=UI设计对话`。权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`；本轮只在新鲜 production system-frontend + 正式 Fastify + 从零38迁移隔离 PostgreSQL + 零网络 Worker + Playwright/系统 Chrome 下复验 `/logs` 当前完整 query 第三次显式错误重读的 pending ErrorBlock 焦点与真实200后H1，并抽查 console。FIFO306其余22项、FIFO304 26项及FIFO302 112项冻结，生产代码修改0，TEST继续 blocked。

> handoffToken=`FIFO308-FRONT-SYSTEM-09C-R6-UI-R1-V4.836`：FIFO307 已通过规划代码门，Rev6 冻结并转 UI 单项 production 微复验，状态 `ready / Current actor=UI设计对话 / Reviewer=UI设计对话`。规划确认 `focusWhenBusy` 默认关闭，只在 busy false→true 的 layout 阶段聚焦现有 ErrorBlock 根；`/logs` 仅对当前完整 query 的显式错误恢复启用。规划新鲜日志专项 `11/11`、system-frontend typecheck、git diff-check 通过。UI 只验证按钮从可用切为 disabled 后 activeElement=同一 ErrorBlock，并抽查200后H1；其余全部冻结，TEST继续 blocked。

> handoffToken=`FIFO307-FRONT-SYSTEM-09C-R6-V4.833`：FRONT-SYSTEM-09C Rev6 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。仅改 `system-frontend/src/controlPrimitives.tsx`、`system-frontend/src/logsPage.tsx` 与 `tests/frontend/system-control-runtime.test.tsx`：ErrorBlock 新增默认关闭的 `focusWhenBusy`，仅日志当前完整 query 的显式错误重读在 busy 从 false→true 的布局提交阶段聚焦同一 `role=alert` 容器；成功仍在真实200稳定后聚焦 H1，其他页面/普通刷新/身份变化冻结。新鲜管理员组合 7 files / 98 tests、日志定向 11/11、system-frontend typecheck、Vite 45 modules build、`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 `pnpm check`、浏览器矩阵或 Impeccable，未改 ControlShell/routing/CSS/API/backend/contracts/migrations/DESIGN/员工站/服务器，未提交/推送/部署。

> handoffToken=`FIFO307-FRONT-SYSTEM-09C-R6-V4.833`：已完成权限握手并领取，`FIFO307=active / FRONT-SYSTEM-09C Rev6=in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。本轮仅处理 `/logs` 显式错误重读 pending 时原生 disabled 导致的 BODY 失焦：为公共 ErrorBlock 增加默认关闭的 busy 聚焦语义，仅由当前完整 query 的显式错误重读启用；ControlShell、routing、CSS/API、backend/contracts/migrations/DESIGN、员工站与服务器冻结。

> handoffToken=`FIFO307-FRONT-SYSTEM-09C-R6-V4.833`：FIFO306 唯一剩余 P1 已完成规划归因，登记一个极小 pending 焦点接管修正，状态 `ready / Current actor=前端开发对话 / Reviewer=规划对话`。真实浏览器确认 ErrorBlock、旧 requestId、stale 与禁用“读取中…”在 pending 全程存在；焦点落 BODY 的唯一原因是当前重读按钮从可用切为原生 `disabled` 时浏览器自动 blur。Rev6 只允许为公共 ErrorBlock 增加可选的 busy/pending 安全聚焦请求，并仅在 `/logs` 当前完整 query 的显式错误重读 pending 使用，使焦点落同一 ErrorBlock 容器；普通/自动刷新、其他 ErrorBlock、成功 H1、身份变化与所有业务事实冻结。FIFO306 其余22项、FIFO304 26项及 FIFO302 112项冻结，TEST继续 blocked。

> handoffToken=`FIFO306-FRONT-SYSTEM-09C-R5-UI-R1-V4.830`：正式 UI 最后三场景微复验已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。新鲜 production system-frontend build 45 modules、正式 Fastify、从零38迁移隔离 PostgreSQL、零网络 Worker 与 Playwright 1.62.1/系统 Chrome 原始结果 `23项/22通过/1失败`，`P0/P1/P2/P3=0/1/0/0`。routing 真实遮罩关闭回焦与 pending 锁通过；1024 真实 sidebar-overlay、几何、鼠标关闭回焦、高层 Modal/Drawer 所有权及 1440 无遮罩通过；logs 503→503→pending→200 保留 stale/旧 requestId/唯一禁用重读并在成功后聚焦 H1，但第三次重读 pending 时 `activeElement=BODY`，为唯一 P1。普通刷新与身份切换不继承恢复意图，application console error/warn=`0/0`、pageerror=`0`，两条受控503单列。生产代码修改0，TEST继续 blocked。

> handoffToken=`FIFO306-FRONT-SYSTEM-09C-R5-UI-R1-V4.830`：UI 设计对话已完成权限握手并领取，状态 `active / in_progress / Current actor=UI设计对话 / Reviewer=UI设计对话`。权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`；本轮只在正式 production system-frontend + Fastify + 从零38迁移隔离 PostgreSQL + 零网络 Worker + Playwright/系统 Chrome 下复验 FIFO304 三项原失败与 console，已通过26项及 FIFO302其余112项冻结，生产代码修改0，TEST继续 blocked。

> handoffToken=`FIFO306-FRONT-SYSTEM-09C-R5-UI-R1-V4.830`：FIFO305 已通过规划代码门，Rev5 实现冻结并转 UI 最后三场景微复验，状态 `ready / Current actor=UI设计对话 / Reviewer=UI设计对话`。规划核对确认：Modal 遮罩只在命中自身且未锁时阻止默认鼠标事件后关闭；logs `recoveryError` 仅是当前 query 的只读错误投影，不参与业务决策，普通刷新/身份变化清理；真实 `sidebar-overlay` 仅在 1024 展开时渲染，z-index 39 位于 sidebar 40 下且不覆盖更高 Modal/Drawer。规划新鲜三专项 `53/53`、system-frontend typecheck、git diff-check 通过。UI 只复验 FIFO304 三项原失败，其他26项和 FIFO302 其余112项冻结，TEST继续 blocked。

> handoffToken=`FIFO305-FRONT-SYSTEM-09C-R5-V4.827`：FRONT-SYSTEM-09C Rev5 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。仅改 `system-frontend/src/controlPrimitives.tsx`、`system-frontend/src/logsPage.tsx`、`system-frontend/src/ControlShell.tsx`、`system-frontend/src/responsive.css` 与管理员专项回归：公共 Modal 遮罩在真实 mousedown 命中时先阻止默认聚焦再唯一关闭；`/logs` 同完整 query 的显式错误重读保留 stale/requestId/唯一 ErrorBlock，pending 锁定并仅在同次真实成功提交后聚焦 H1；1024 ControlShell 增加真实侧栏遮罩，Escape/鼠标关闭回展开触发点且高层 aria-modal 不被抢。FIFO305=review，FIFO304 已通过项与 routing/员工站/backend/contracts/migrations/DESIGN/服务器冻结。

> FIFO305 新鲜验证：管理员 `system-control*.test.tsx` 7 files / 98 tests 通过（目标三专项初跑 53/53，日志定向 11/11）；system-frontend typecheck、workspace Vite production build 45 modules、`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 `pnpm check`、Impeccable、完整浏览器矩阵；未接外部服务，未提交/推送/部署。代码变更行数均低于800：controlPrimitives 115、logsPage 132、ControlShell 348、responsive.css 131。

> handoffToken=`FIFO305-FRONT-SYSTEM-09C-R5-V4.827`：已完成权限握手并领取，`FIFO305=active / FRONT-SYSTEM-09C Rev5=in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。本轮仅处理公共 Modal 遮罩默认事件、logs 同查询恢复 pending 错误投影、1024 ControlShell 真实遮罩 DOM；routing 业务、FIFO304 已通过项及其余矩阵冻结。

> handoffToken=`FIFO305-FRONT-SYSTEM-09C-R5-V4.827`：FIFO304 三场景微复验已完成规划状态时序审查，三项 P1 合并为最后一次前端焦点/覆盖层所有权收口，状态 `ready / Current actor=前端开发对话 / Reviewer=规划对话`。根因：① Modal 遮罩 `mousedown` 关闭后，后续 `mouseup/click` 默认行为把已恢复的触发点焦点覆盖为 BODY；② `useAsyncRead.reload` 在 pending 时清空 error，导致恢复 ErrorBlock/按钮卸载并丢焦；③ 1024 侧栏只有阴影，没有真实遮罩 DOM。Rev5 只允许：公共 Modal 遮罩命中时先 preventDefault/stopPropagation 再关闭并回焦；logs 在同 query 恢复 pending 期间保留旧 ErrorBlock/stale/requestId、锁唯一重读，成功再清；ControlShell 增加 1024 真实遮罩层并复用同一关闭/回焦边界。FIFO304 已通过26项与 FIFO302 其余112项冻结，TEST继续 blocked。

> handoffToken=`FIFO304-FRONT-SYSTEM-09C-R4-UI-R1-V4.824`：正式 production 三场景微复验完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。新鲜 system-frontend build 45 modules、正式 Fastify、从零38迁移隔离 PostgreSQL、零网络 Worker 与系统 Chrome 原始结果 `29项/26通过/3失败`，`P0/P1/P2/P3=0/3/0/0`：routing 遮罩关闭回 BODY；logs 第三次重读 pending 时 ErrorBlock/唯一重读卸载且回 BODY；1024 覆盖侧栏没有正文遮罩。Escape/取消回焦、pending 关闭锁、stale requestId/再次失败焦点/成功 H1、普通刷新与迟到身份、1024几何和上层 Modal/Drawer Escape、application console/pageerror 均通过。FIFO302 其余112项冻结，生产代码0，TEST继续 blocked。

> handoffToken=`FIFO304-FRONT-SYSTEM-09C-R4-UI-R1-V4.824`：UI 设计对话已完成权限握手并领取，状态 `active / in_progress / Current actor=UI设计对话 / Reviewer=UI设计对话`。权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`；本轮只在新鲜 production system-frontend + 正式 Fastify + 从零38迁移隔离 PostgreSQL + 零网络 Worker + 系统 Chrome 下复验 FIFO302 三项原失败及 console/最小几何，FIFO302 其余112项冻结，生产代码/契约/迁移/DESIGN 修改0，TEST继续 blocked。

> handoffToken=`FIFO304-FRONT-SYSTEM-09C-R4-UI-R1-V4.824`：FIFO303 已通过规划代码门与标准验证，`FRONT-SYSTEM-09C Rev4` 实现冻结并转由 UI 设计对话做三场景 production 微复验，状态 `ready / Current actor=UI设计对话 / Reviewer=UI设计对话`。规划新鲜标准运行三专项 `53/53`、管理员组合 `7 files / 98 tests`、system-frontend typecheck、git diff-check 通过；串行 `--no-file-parallelism` 额外暴露两个不属于 FIFO302 三项原失败的既有焦点时序断言波动，已保留为 TEST 关闭门观察项，不改写标准通过事实，也不冒充产品失败。本轮 UI 只验证 routing Modal 回焦、logs `503→503→pending→200` 焦点身份、1024 覆盖侧栏 Escape/回焦及上层 Modal/Drawer 所有权；FIFO302 其余112项冻结，TEST继续 blocked。

> handoffToken=`FIFO303-FRONT-SYSTEM-09C-R4-V4.821`：已完成三项最小前端返工并交规划复验，`FIFO303=review / FRONT-SYSTEM-09C Rev4=review / Current actor=规划对话 / Reviewer=规划对话`。routing 新建草稿 Modal 使用稳定触发点回焦；logs 错误重读绑定完整查询身份，仅真实成功提交后在布局阶段聚焦 H1，普通刷新/自动刷新/身份切换不消费恢复意图；1024 覆盖侧栏由最上层 Escape 关闭并回“展开侧栏”，高层 Modal/Drawer 不被抢。定向管理员组合 98/98、system-frontend typecheck、Vite 45 modules build、git diff-check 已通过。

> handoffToken=`FIFO303-FRONT-SYSTEM-09C-R4-V4.821`：已完成权限握手并领取，`FIFO303=active / FRONT-SYSTEM-09C Rev4=in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。权限指纹：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。本轮仅关闭 FIFO302 三项焦点 P1：routing 草稿 Modal 触发点回焦、logs 同查询恢复焦点身份、1024 ControlShell 覆盖侧栏 Escape/回焦；其余业务与矩阵冻结。

> handoffToken=`FIFO303-FRONT-SYSTEM-09C-R4-V4.821`：FIFO302 的 3 项 P1 已完成规划集中归因并登记一次最小前端返工，状态 `ready / Current actor=前端开发对话 / Reviewer=规划对话`。只修：① `/routing` 新建路由草稿 Modal 通过 Escape/遮罩/取消关闭后回精确触发点；② `/logs` 同查询 `503→503→200` 的再次失败 ErrorBlock 焦点与成功稳定渲染后 H1 焦点，普通刷新/查询切换/迟到响应不得消费恢复意图；③ 1024 管理员覆盖侧栏 Escape 从最上层侧栏关闭并回“展开侧栏”，正文继续 `x=72,width=952`。允许修改对应 system-frontend 页面/ControlShell、必要公共焦点原语与前端专项；禁止改 backend/contracts/migrations/DESIGN/员工站/服务器。FIFO302 其余112项冻结，TEST继续 blocked。

> handoffToken=`FIFO302-FRONT-SYSTEM-09C-R3-UI-R1-V4.818`：正式 production UI 终验已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。唯一 production 两站 + 正式 Fastify + 从零 38 迁移隔离 PostgreSQL + 零网络 Worker + 系统 Chrome 原始结果 `115项/112通过/3失败`；人工对账把受控/预期非2xx浏览器网络诊断从 application console 分离，并纠正一条 BODY/H1 假阳性，最终 `P0/P1/P2/P3=0/3/0/0`。三项 P1 为路由草稿 Modal Escape 回 BODY、日志 stale 恢复成功回 BODY、1024 覆盖侧栏 Escape 未收起/未回展开触发点；其余权限、两站隔离、routing/changes/logs、unknown、Attempt 链、安全、1440/1024 几何通过。生产代码/契约/迁移/DESIGN 修改0；TEST 继续 blocked，等待规划集中归因。

> handoffToken=`FIFO302-FRONT-SYSTEM-09C-R3-UI-R1-V4.818`：正式 production UI 终验已由 UI 设计对话领取，进入 `active / in_progress`；`FRONT-SYSTEM-09C Rev3` 保持 `review / Current actor=UI设计对话 / Reviewer=UI设计对话`。本轮只运行新鲜 system-frontend production build + 正式 Fastify + 从零全部迁移精确隔离 PostgreSQL + 零网络 Adapter/Worker + Playwright/系统 Chrome 完整矩阵，允许写 docs/ui、CURRENT/日志与仓库外脱敏证据，生产代码/契约/迁移/DESIGN 修改0，TEST 继续 blocked。

> FIFO301 已通过规划独立关闭门：管理员正式 `7 files / 95 tests`、system-frontend typecheck、正式 Vite production build `45 modules` 均通过；首次从仓库根直接调用 Vite 因入口目录错误未找到 index.html，已按正式 workspace build 入口重跑成功，不计产品失败。代码核对确认 Advance 提示只消费同一服务端 event 的 externalNotAccepted=true、externalSideEffectPossible=false 与相邻 Attempt 身份，unknown/unauthorized/cancelled/quality_rejected 不伪造前进；connection-test unknown 文案正确。`FRONT-SYSTEM-09C Rev3=done`。现解锁 `handoffToken=FIFO302-FRONT-SYSTEM-09C-R3-UI-R1-V4.818` 正式 UI 终验；TEST 继续 blocked，服务器登录阻塞独立并行。

> `handoffToken=FIFO301-FRONT-SYSTEM-09C-R3-V4.815`：实现已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。`/logs` 继续只读消费正式 operations：服务端 search/domain/status/project/from/to/sort/limit/offset、真实 total、routeDigest/目标序号/部署版本/中文安全效果、ASR/ScreenText Attempt 链与仅在“明确未受理且无副作用”时的下一目标提示；unknown/reconciliation/unauthorized/cancelled/quality_rejected 不误报前进，连接测试 unknown 诚实说明可能副作用且只查询同一记录。新增回归覆盖 ASR/ScreenText、连接 unknown、历史 null、服务端筛选分页、stale 唯一重读恢复与 Drawer 事实；system-control 管理员组合 7 files/95 tests、typecheck、Vite 45 modules build、git diff-check 已通过。仅改 system-frontend logs/runtime CSS 与对应 runtime 专项测试；未改 backend/contracts/迁移/DESIGN/员工站，未接真实厂商/网络/Secret/付费/部署，未运行完整 pnpm check/完整浏览器矩阵，未提交推送部署。

> FIFO300 已通过规划独立关闭门：新鲜 operations `1 file / 8 tests`、contracts/backend TypeScript 均退出 0；代码核对确认 connection-test unknown 为 `externalNotAccepted=false / externalSideEffectPossible=true`，queued 不虚构副作用，读取零写回归成立。`BACK-SYSTEM-09C-OPS Rev2=done`。现解锁 `handoffToken=FIFO301-FRONT-SYSTEM-09C-R3-V4.815`：只在 system-frontend `/logs` 消费正式 operations 的 route/target/deployment/effect、Attempt 链与 RoutingAdvanceEvent；不改后端、契约、迁移、员工站或服务器。UI/TEST 继续 blocked。

> `handoffToken=FIFO300-BACK-SYSTEM-09C-OPS-R2-V4.812`：已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。system_control connection-test Attempt 链现在对 unknown 保守返回 `externalNotAccepted=false / externalSideEffectPossible=true`；completed/failed 无可靠“未受理”事实时不猜为 true，queued 不宣称外部副作用。隔离 operations 专项 `1 file / 8 tests`、contracts/backend typecheck+build、`check:repo`、`git diff-check` 全通过；无契约/迁移/routes/09A/09B/前端/服务器改动，完整 `pnpm check` 留 TEST。并行事实保持不变。

> 测试服务器 `TEST-SRV-20260820-004` 继续 `fixing / Current actor=用户与雨云客服`：重装后 ED25519 指纹已精确核对为 `SHA256:xMAhJ68ebTILI2tgehbSeTjQKJ9Czrfq66W4xzTMZ40`，与客服证据一致，TCP/22 与 sshd 可达；用户两个受控密码会话仍认证失败，已停止猜测。此前易混字符人工转录错误已纠正，不能再使用旧写法。下一步仅由雨云客服确认其成功测试所用密码是否来自当前面板、测试后是否改变，并在必要时同步面板凭据；不向规划/聊天提供密码，不连接、不安装、不部署。SYSTEM-09 FIFO299 独立并行，不受此阻塞影响。

> `handoffToken=FIFO299-BACK-SYSTEM-09C-OPS-R1-V4.808`：已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。operations 只读契约/投影已补齐 ASR/ScreenText 的 routeDigest、routingTargetId、targetPriority、deploymentVersionId、effectClass，同 Job 有序 Attempt 链及只追加 RoutingAdvanceEvent 安全字段（前后 Attempt、priority、稳定分类、requestId、外部副作用事实）；历史旧行明确保留 null，人工终点不伪造成 RoutingTarget。新鲜 operations 专项 `1 file / 7 tests`、contracts/backend build、`check:repo`、迁移 node-check、git diff-check 通过；邻近 routing `7/7` 通过。ASR/ScreenText 组合直接跑在旧默认 schema 上，首个真实错误为 `routing_policy_pools.max_concurrent_jobs` NOT NULL（旧库未完成 ordered-routing 迁移），归因为环境而非本轮产品失败，未修改默认库/迁移；完整 `pnpm check` 留 TEST。并行服务器、UI/FRONT/TEST 事实保持不变。

> FIFO298 已通过规划独立关闭门：新鲜 sidecar+routing `2 files / 18 tests`、contracts/backend TypeScript 均退出 0，代码与回归确认 timeout/Abort 后未 settle 的底层 invoke 持续占用槽位、真实 settle 后才允许下一调用；真实帧相对几何与 extractor 权威时长同样成立。`BACK-SYSTEM-09B Rev3=done`。现解锁 `handoffToken=FIFO299-BACK-SYSTEM-09C-OPS-R1-V4.808`：只扩展正式 system-control operations 只读契约/投影，向 `/logs` 提供 routeDigest、routingTargetId、targetPriority、deploymentVersionId、effectClass 与只追加 RoutingAdvanceEvent 安全链；不得新增写状态、迁移、前端假字段或真实外部动作。FRONT Rev3、UI、TEST 继续 blocked，服务器 SSH 加固独立并行。

> handoffToken=`FIFO298-BACK-SYSTEM-09B-R3-V4.805`：已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。底层 transport 未真实 settle 时 Adapter 槽位持续占用，迟到 resolve/reject 后才释放；position 改为使用对应帧真实宽度的相对几何；frame extractor 返回并校验权威 `videoDurationMs`，完成 outcome/Worker 持久链原样使用，不再按抽样时间猜测。新鲜 sidecar `11/11`、sidecar+routing `2 files / 18 tests`、contracts/backend build、`check:repo`、静态边界扫描和 `git diff --check` 通过；无迁移、无默认库清理、无真实模型/网络/Secret/付费/服务器动作，完整 `pnpm check` 留 TEST。

> FIFO297 已通过规划独立关闭门：新鲜 system-control-plane `34/34`、管理员组合 `7 files / 91 tests` 全绿，代码核对确认跨 `ocr_api / ocr_self_hosted_worker` 删除后按原全局 priority 重编号，分页离开可见事实时清除 deployment/version 选择并阻止陈旧提交。`FRONT-SYSTEM-09C Rev2=done`；该任务后继仅剩 `/logs`，继续 blocked 等待正式 operations 投影。

> FIFO296 规划独立复验 `2 files / 15 tests` 与 contracts/backend typecheck 均通过，但 maxConcurrent 与真实媒体投影仍有两项同根 P1，集中转 FIFO298 `BACK-SYSTEM-09B Rev3`：超时/Abort 后当前代码立即 `active -= 1`，忽略 Abort 且仍未 settle 的底层 transport 仍在运行，下一调用可再次 invoke，实际绕过并发上限；candidate position 仍用固定 640/213/426 像素判断，且 `videoDurationMs` 用最后抽样时间/固定 1000ms 猜测。Rev3 只做底层 invoke fail-closed 占槽、真实帧相对几何与 extractor 权威时长，不改 09A、前端、operations 或服务器。

> handoffToken=`FIFO297-FRONT-SYSTEM-09C-R2-V4.802`：本轮已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。`routingPage.tsx` 的画面字目标现在按跨 `ocr_api / ocr_self_hosted_worker` 的全局 priority 统一重编号，删除/新增/移动后的提交 body 与可见顺序一致，并在提交前校验 preferred/standard/emergency 的唯一顺序；部署/版本服务端分页离开当前可见页时诚实清理失效选择并阻止陈旧草稿提交。新鲜验证：system-control-plane `34/34`、管理员 `system-control*.test.tsx` `7 files / 91 tests`、system-frontend typecheck、Vite production build `45 modules`、`git diff --check` 均通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。`/logs` 缺失字段仍不伪造，backend/contracts/migrations/DESIGN/员工站未改；未运行完整 pnpm check、未提交/推送/部署。

> handoffToken=`FIFO296-BACK-SYSTEM-09B-R2-V4.801`：已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。本轮把 `screen_text_local_ocr_v1` 统一为服务端真实 frame extractor 输入（不再把整段 MP4 bytes 冒充 640×360 帧），严格 TypeBox request/response schema（含嵌套 additionalProperties、类型/范围/confidence/几何/时间/语言/文本）在 transport 前后执行；invalid request 在副作用前 `external_not_accepted`，invalid response 为 `external_unknown/reconciliation` 且不生成候选/evidence。Adapter 自有 bounded race、Abort、deadline、maxConcurrent 与 finally 清理，never-resolve/忽略 Abort/迟到 resolve 不挂 Worker、不改终态；Worker 只通过 UploadStorage+注入 frame extractor 校验媒体身份，A/B objectKey 隔离，缺失/大小/checksum/类型或 extractor 事实不满足时诚实阻断。无迁移、无真实模型/Python/Docker/服务器/网络/Secret/付费/09A 重写；新鲜 sidecar+Worker媒体+09A routing `2 files / 15 tests`、backend/contracts tsc、check:repo、git diff-check 全通过，完整 pnpm check 留 TEST。

> FIFO295 规划独立复验为 `7 files / 90 tests`、system-frontend typecheck、production build 45 modules 全绿，但代码微审发现两项有序编辑 P1，集中转 FIFO297 `FRONT-SYSTEM-09C Rev2`：画面字跨 `ocr_api / ocr_self_hosted_worker` 删除目标时，现有 `renumber` 按 pool 数组顺序重编号而不是按删除前全局 priority，可能静默改变剩余目标先后；部署/版本分页切换后已选真实版本会从可见选项消失但 draft 仍保留并可提交。FIFO297 只修全局顺序保持和稳定选择可见性/诚实清理，并补创建 body 对账；`/logs` 仍等待后端唯一只读投影，不允许前端伪造。

> FIFO294 规划独立微审未通过，集中转 FIFO296 `BACK-SYSTEM-09B Rev2`：新鲜 sidecar+routing 仍为 `2 files / 12 tests` 全绿，但只证明受控 fake 自身按预期工作。三项运行边界尚未闭合：TypeBox request/response schema 未在运行时执行，错误范围/类型仍可进入候选；`deadlineMs/maxConcurrent` 只由 fake transport 自愿遵守，失控 transport 可永久挂起或绕过并发；Worker 把完整视频字节同时标成一张固定 640×360 已解码帧，混淆“整段视频由 sidecar 解码”和“服务端帧提取”。FIFO296 只修这三项并补恶意/失控 transport 与 Worker+UploadStorage 集成回归；09A、安全前进、前端与服务器任务冻结，TEST 继续 blocked。

> FIFO295 `FRONT-SYSTEM-09C Rev1` 已交规划 review：`/routing` 与 `/changes` 的正式 RoutingTarget/容量/人工终点/发布恢复实现进入独立复核；`/logs` 因正式 system-control-operations 契约和后端 GET 尚无 routeDigest、routingTargetId、targetPriority、RoutingAdvanceEvent、effectClass 而诚实停止，未伪造字段。规划把该缺口登记为后继 `BACK-SYSTEM-09C-OPS Rev1`，待 FIFO296 关闭后由后端补唯一只读投影，再由 FRONT-SYSTEM-09C Rev2 接入；当前不解锁 UI/TEST。

> handoffToken=`FIFO295-FRONT-SYSTEM-09C-R1-V4.796`：FRONT-SYSTEM-09C Rev1 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。独立 `system-frontend` 已把 `/routing` 切换为服务端 RoutingTarget 1–8 草稿编辑（全局 priority、preferred/standard/emergency、真实部署版本、逐目标容量、分页选择），`/changes` 展示真实目标顺序/容量/影响与人工终点；员工 frontend、backend、迁移、contracts、DESIGN 未修改。新鲜管理员组合为 `7 files / 90 tests` 全绿，system-frontend typecheck、Vite production build（45 modules）、`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。`/logs` 所需 `routeDigest/routingTargetId/targetPriority/RoutingAdvanceEvent/effectClass` 当前不在正式 operations 契约/后端 GET 投影内，未伪造字段，待规划按冲突机制处理；未提交、推送、部署，未运行完整 pnpm check。

> 测试服务器纯 Debian 12 初始化现已验证完成：客服截图确认重装后的新系统可从 serial VNC 与外部 OpenSSH 使用当前 root 凭据进入 shell，Debian 登录横幅正常且 SSH 主机指纹已更新；`TEST-SRV-20260820-002 retest→closed`。`TEST-SRV-20260820-004` 继续 `fixing`，因为当前只恢复了 root/密码入口，尚未建立非 root 用户、公钥第二会话或关闭密码/root 远程登录。下一步只由用户在本机交互式输入密码登录并写入已生成公钥；密码不得进入聊天、截图、仓库或日志，完成加固前不安装、不部署。

> handoffToken=`FIFO294-BACK-SYSTEM-09B-R1-V4.796`：已按权限指纹领取 `BACK-SYSTEM-09B Rev1`，当前状态 `active / in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。本轮只实现 ScreenText 本地 OCR sidecar 的零网络协议适配、服务端 UploadStorage 媒体读取、受控 fake transport、资源/超时/Abort/进程退出边界及 09A effectClass 安全映射；不下载模型、不安装 Python/Docker/系统依赖、不连接服务器/真实网络/Secret/付费/部署，不新增迁移或第二任务/路由/状态源。并行 FRONT-SYSTEM-09C 与 TEST 事实保持不变。

> handoffToken=`FIFO294-BACK-SYSTEM-09B-R1-V4.796`：完成实现并转 `review / Current actor=规划对话 / Reviewer=规划对话`。共享契约新增严格 `screen_text_local_ocr_v1` 请求/响应与结构化框/置信度/语言/版本；ScreenText Registry 登记 `screen_text_local_ocr_sidecar_fake` 零网络协议描述，Worker 复用权威 UploadStorage/Asset 校验并读取服务端字节，缺失或摘要/大小/类型/资源上限不满足时在 transport 前稳定阻断。受控 fake 覆盖 Abort、deadline、并发、进程退出、external_not_accepted、unauthorized、timeout/unknown，并按 09A effectClass 仅允许明确未受理且无副作用的安全前进；本地 fake 预算为 CNY 0.000000/unmetered_local，不声称 PaddleOCR 已运行。无迁移、无真实网络/模型/Secret/付费/服务器动作；本轮新鲜证据为 sidecar+09A routing `2 files / 12 tests`、backend/contracts tsc、check:repo、git diff-check 全通过；默认业务库未清理，完整 pnpm check 留 TEST。

> handoffToken=`FIFO295-FRONT-SYSTEM-09C-R1-V4.796`：FRONT-SYSTEM-09C Rev1 已按权限指纹领取并进入 `active / in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`；本轮只在独立 `system-frontend` 消费正式有序 RoutingTarget、发布/日志事实，不改员工 frontend、backend、迁移、contracts、DESIGN，不接真实供应商/Secret/网络/付费/部署。

> FIFO293 已通过规划独立关闭门并关闭：规划逐段核对迁移、ASR/ScreenText Worker repository 与新增容量回归；随后在精确隔离 PostgreSQL 从零执行全部 38 项迁移，串行复跑 migration/routing/ASR/Dispatch/ScreenText 共 `5 files / 50 tests` 全绿，隔离库已 DROP 且残留=0。第一次直接使用共享默认库的组合命令因旧 schema 出现 `routing_policy_pools.max_concurrent_jobs` 与缺 `routing_advance_events`，已如实归因为环境未迁移而非产品回归，未计入通过证据。`BACK-SYSTEM-09A Rev3=done`；现并行解锁 FIFO294 `BACK-SYSTEM-09B Rev1`（仅零网络本地 OCR 运行边界）与 FIFO295 `FRONT-SYSTEM-09C Rev1`（管理员正式有序路由页面），TEST 继续 blocked。

> `TEST-SRV-20260820-004` 已按雨云客服建议进入 `fixing`：当前主机无应用、业务数据或服务器端写入，允许仅重装纯 Debian 12，不选择宝塔/LNMP/Docker。重装完成前不连接、不安装、不部署；完成后必须重新核对平台系统状态、防火墙、新 SSH 主机指纹与登录边界，并保留 VNC 恢复路径。旧 known_hosts 指纹只作为历史证据，不直接信任重装后的主机。

> `TEST-SRV-20260820-004` 已收敛为雨云侧凭据初始化阻塞：本机 OpenSSH 可达 TCP/22 并已确认主机指纹，平台自动生成的新 root 密码连续两次 `Permission denied`；结合 serial VNC 的 `Login incorrect`，已排除公网、防火墙、sshd 不可达和单一 VNC 剪贴板问题。服务器端零写入，应用未安装/部署；停止继续重置、重装或猜测，只由用户向雨云提交工单，待厂商恢复 root 凭据/账户状态后再继续非 root 用户、公钥与 sshd 加固。SYSTEM-09 FIFO293 后端返工继续并行，不受该阻塞影响。

> handoffToken=`FIFO293-BACK-SYSTEM-09A-R3-V4.792`：BACK-SYSTEM-09A Rev3 已完成定向返工并转 `review / Current actor=规划对话 / Reviewer=规划对话`。1754976022000 旧主备迁移回归确认 screen_text 本地 primary→fallback→云 primary→fallback 为 priority 1..4，只有首项 preferred，其余 standard，旧列删除且正式 RoutingService 可读；ASR 15/15、ScreenText 19/19、ASR Dispatch 8/8、routing 7/7，迁移隔离库从零/旧数据场景均已 DROP。queueLimit 仅统计下一目标 queued Job，perProjectMax 仅统计同目标活动 Attempt；两目标容量隔离回归成立。contracts/backend tsc、check:repo、migration node-check、git diff-check 通过；PostgreSQL 55432 保持运行，未接真实供应商/Secret/网络/付费/部署，完整 pnpm check 留 TEST 关闭门。

> FIFO291 规划独立微审未通过，集中转 FIFO293 `BACK-SYSTEM-09A Rev3`：新鲜 routing 专项仍为 `7/7`，但现有回归没有覆盖两条真实边界。其一，迁移会保留每个旧 pool primary 的 `preferred`，带 `ocr_self_hosted_worker + ocr_api` 旧数据时可能生成多个 preferred；其二，ASR/ScreenText 的 `queueLimit` 仍统计整个 routingVersion 的 queued Job，`perProjectMax` 仍统计项目跨目标活动 Job，并非当前 `routingTargetId` 的逐目标额度。FIFO293 只修迁移角色/确定顺序和这两项逐目标计数，补“带旧主备数据迁移”及“两目标不同容量、互不占额”的 ASR/ScreenText 隔离回归；effectClass、unknown 停止、全局 priority、UI 与服务器任务全部冻结，FRONT/TEST 继续 blocked。

> `TEST-SRV-20260820-003` 已按“除 SSH 外公网入口收敛”范围关闭：用户启用白名单，唯一允许为 TCP/22；经明确授权的无凭据 TCP 握手为 22=true、80/3001/5432=false，未登录或写服务器。当前下一道 P1 是 SSH bootstrap hardening：22 的源地址为空，仍为全球可达，主机尚处于初始 root/密码边界。应用安装/部署继续禁止；优先经雨云网页控制台/VNC创建非 root 部署用户并写入用户公钥，验证第二个公钥会话后再关闭密码登录和 root 远程登录，全程保留控制台恢复路径，用户不得在聊天发送密码、私钥或完整公网 IP。

> handoffToken=`FIFO292-TEST-SERVER-OPS-01-R1-V4.786`：测试服务器准备阶段已通过规划独立复核并关闭交接。新任务 `测试服务器接入与问题记录`（`01a01d0c-3f0f-7f73-801e-d3298d631428`）已形成到手前/后清单、唯一 `TEST-SRV-*` 问题台账，并修正 performance harness 对缺失指标补0和阶段耗时虚报的边界；规划新鲜 TypeScript 专项与授权路径 `git diff --check` 通过。任务现为 `blocked / Current actor=用户 / Reviewer=规划对话`，作为后续口述服务器问题的唯一窗口保留。尚缺测试机 IP、SSH 用户/端口、Debian 版本/指纹、公钥方式、访问路径、管理员出口 IP、安装许可、规格/窗口/预算/停止条件；收到前不连接、不安装、不部署，不接 Secret、真实厂商网络、付费或云资源。SYSTEM-09 后端返工继续并行。

> handoffToken=`FIFO291-BACK-SYSTEM-09A-R2-V4.785`：BACK-SYSTEM-09A Rev2 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。四项同源 P1 已收口：routingVersion/workflowStage 全局连续 priority（screen_text 统一 OCR 目标序列）、preferred/standard/emergency 角色与一次性旧主备迁移、结构化 effectClass 安全前进门、逐 RoutingTarget 容量参与排队/claim/下一目标准入。新鲜隔离证据：routing 7/7、ASR 14/14、ASR Dispatch 8/8、ScreenText 18/18；从零迁移部署/策略/目标/active/advance 业务行均为0并已 DROP 临时库；contracts/backend build、check:repo、migration node-check、git diff-check 通过。期间修正 screen_text queued 重试误把已完成 Attempt 当作过期 running 的根因，保留 unknown/过期租约语义；未接真实供应商、Secret、网络、付费、部署，完整 pnpm check 留 TEST 关闭门。保留 UI 已关闭事实，FRONT/TEST 继续 blocked。

> FIFO289 规划独立复核未通过，集中归并为 FIFO291 `BACK-SYSTEM-09A Rev2`：现实现把 `ocr_self_hosted_worker` 与 `ocr_api` 各自从 priority=1 编号后再按 `priority,pool_id` 临时拼接，不能稳定表达“本地1→低价云2→高质量云3”；共享契约仍使用旧 `primary/fallback/emergency`，未落实 `preferred/standard/emergency`；Worker 只凭 `externalSideEffectPossible=false` 自动前进，未对 401/403 `unauthorized` 做不可前进的结构化门；逐目标 `maxConcurrentJobs/perProjectMax/queueLimit` 已持久化但执行仍使用进程级静态调度值。FIFO291 只修这四个同源 P1 并补本地→云、unauthorized/unknown停止、逐目标容量的零网络隔离回归；UI已关闭，FRONT/TEST继续blocked。

> handoffToken=`FIFO289-BACK-SYSTEM-09A-R1-V4.774`：BACK-SYSTEM-09A Rev1 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。有序 RoutingTarget、routeDigest、Attempt 目标身份与只追加安全前进事件已落地；ASR/ScreenText 新写路径删除 primary/fallback 选择旁路，人工处理不作为目标，`emergency` 仅允许最后一个真实 EngineDeploymentVersion。隔离从零迁移无业务 bootstrap；routing 6/6、ASR 13/13、ScreenText 16/16、Dispatch 8/8 新鲜通过，backend/contracts build、tsc、check:repo、migration node-check、diff-check 通过。PostgreSQL stale pid 仅按授权删除并恢复，55432 保持运行；未接真实供应商/Secret/网络/付费/部署，未运行完整 pnpm check。保留 FIFO290 UI done/review 与 FRONT/TEST blocked；八项差量包仅交规划固定任务。

> FIFO290 已通过规划独立微审并关闭：规划核对 Rev2 验收文档、原型源码、`results.json` 与两张新截图，确认 `/routing` 的 1–8 编号只属于真实 EngineDeploymentVersion，人工处理是全部已启用真实目标均确定失败后的领域工作台出口，不编号、不做连接检查、不使用引擎容量；`/changes` 的目标数、顺序差异和连接检查数也只统计真实目标。变化矩阵 `24/24`、console error/warn=`0/0`、pageerror=0，授权文件 `git diff --check` 通过，原跨契约 P1 已关闭，`UI-SYSTEM-09 Rev2=done`。BACK-SYSTEM-09A 继续独立执行，FRONT/TEST 保持 blocked。

> handoffToken=`FIFO290-UI-SYSTEM-09-R2-V4.779`：UI-SYSTEM-09 Rev2 唯一 P1 已集中修正并转 `review / Current actor=规划对话 / Reviewer=规划对话`。`/routing` 与 `/changes` 的编号、顺序、连接检查和容量只保留真实 EngineDeploymentVersion；人工处理改为全部已启用真实目标均确定失败后的领域工作台出口，不占目标序号。最小 Playwright/系统 Chrome 变化矩阵 `24/24`，console error/warn=`0/0`、pageerror=0；FIFO288 其余49项冻结，生产代码修改0。同令牌八项差量包已发送到规划固定任务，并确认目标新 turn=`inProgress`。

> FIFO288 规划 UI 独立复核结论：有序表、safe failover、unknown/CNY、发布焦点、执行链和 1440/1024 证据成立，但存在 1 个跨契约 P1。匿名原型把“人工处理队列”作为第 4 个 RoutingTarget，并赋予部署版本、容量和连接检查；权威模型规定每个 RoutingTarget 必须引用真实 EngineDeploymentVersion，人工处理不是引擎部署。规划已同步校正启动包并通知 BACK：真实本地/云目标全部耗尽后才进入领域人工处理出口，人工不占目标序号、不注册伪 Adapter。登记 FIFO290 `UI-SYSTEM-09 Rev2` 做同一原型/文档的集中修正；FIFO288 其余 49 项证据冻结，FRONT/TEST 继续 blocked。

> handoffToken=`FIFO289-BACK-SYSTEM-09A-R1-V4.774`：BACK-SYSTEM-09A Rev1 已按权限指纹领取并进入 `active / in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。本轮仅处理 ASR/ScreenText 有序 RoutingTarget、routeDigest、Attempt 目标身份、确定性安全前进与只追加 RoutingAdvanceEvent；保留 FIFO288 UI-SYSTEM-09 review 事实，FRONT/TEST 继续 blocked。真实供应商、Secret、网络、付费和部署均未接入。

> FIFO288 `UI-SYSTEM-09 Rev1` 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`：在唯一 ControlShell 冻结 `/engines /routing /changes /logs` 的 1–8 有序目标、操作员启停、safe failover、unknown 原地停止、影响/批准/发布/恢复、Attempt 1→2→3、完整读取状态、高风险焦点与 1440/1024。权威输入为 `DESIGN.md` 5.19、`docs/ui/SYSTEM-ordered-execution-routing-acceptance.md` 和仓库外同壳原型；Playwright/系统 Chrome `50/50`、console error/warn=`0/0`、pageerror=0。Impeccable detector 因解析器缺失降级，发现的 width 布局动画已删除并经真实 Chrome 复验；生产代码/契约/迁移/员工站修改0。同令牌八项差量包已发送到规划固定任务并确认新 turn 处于 inProgress。

> 用户已确认 `PLAN-SYSTEM-09` 统一有序执行路由方案：固定主/备将升级为 1–8 个服务端有序目标，ASR/OCR 先关闭运行时安全兜底，本地 OCR 可排第一；术语候选和需要 OCR/AI 的表格识别后续复用同一骨架，普通 XLSX/CSV 继续本地确定性解析。新增权威启动包 `docs/milestones/SYSTEM-ordered-execution-routing.md`，同步路线图、职责矩阵与 `INT-11`。登记 FIFO288 `UI-SYSTEM-09 Rev1` 与 FIFO289 `BACK-SYSTEM-09A Rev1` 可并行领取；FRONT-SYSTEM-09C、BACK-SYSTEM-09B、术语/表格 Wave 和 TEST-SYSTEM-09 保持 blocked。真实 FunASR/PaddleOCR 安装、云厂商、Secret、网络、付费、服务器部署仍未授权。

> `PLAN-P3-01` 四角色只读准备审计已完成并交用户确认：现有零网络 fake/stub、部署版本、Secret安全引用、路由/批准/发布、CNY预算、日志和历史骨架可复用；真实付费 ASR 当前仍为 `NO-GO`。两个 P0 前置是服务端受控 1–3 集试跑隔离（不移动 active、不接员工任务）与真实 provider adapter/私有 Secret resolver/受控网络及媒体读取。唯一准备文档为 `docs/milestones/P3-real-asr-pilot-readiness.md`；推荐本机隔离环境按 `14 → 1 → 26`、`¥10/集、¥30总额` 试跑，但供应商/区域留存/Secret引用/预算/质量门须用户明确确认后才可实施。FIFO283–286=`closed`，`PLAN-P3-01=review / Current actor=用户`；未接网络、Secret、付费、COS、Sentry或服务器。

> FIFO282 TEST-SYSTEM-08 Rev1 已完成独立 INT-18 纵向验收并转 `review / Current actor=规划对话`：正式 employee/system-frontend production build、Fastify、从零37项迁移隔离 PostgreSQL、ScreenshotStorageFake、系统 Chrome；纵向 harness `45/45`，P0/P1/P2/P3=`0/0/0/0`，六类反馈、权限/项目隔离、真实 PNG digest/size/type、幂等与事件只追加、双视口/焦点/console 全通过。唯一完整 `pnpm check`=`44 files / 418 tests` 全绿，check:repo、lint、typecheck、四工作区构建通过；隔离库/端口/服务/Chrome/harness 精确清理，共享 PG55432 保持运行。报告：`docs/testing/SYSTEM-test-feedback-observability-integration-report.md`；只交规划复核，不通知 UI/FRONT/BACK。

> FIFO281 已通过规划独立证据审计并关闭：原始 `fifo281-results.json` 为正式 production 两站 + Fastify + 从零隔离 PostgreSQL + ScreenshotStorageFake + 系统 Chrome `12/12`，严格同查询 `503→503→pending→200`、第二次 ErrorBlock 焦点、pending 不提前聚焦、成功 H1、普通刷新搜索框持焦、offset/search 身份切换迟到保护和单一查询源全部成立；13 次主列表请求、4 个受控 503、detail/events/writes=0 与 console 0/0 均逐项一致。`fifo281-cleanup.json` 确认 Chrome、两站、Fastify 关闭且隔离库 DROP。`FRONT-SYSTEM-08B Rev7=done`。登记 `handoffToken=FIFO282-TEST-SYSTEM-08-R1-V4.769`，解锁 TEST-SYSTEM-08 执行独立 INT-18 纵向集成与本切片唯一完整 `pnpm check`；不接真实 COS/Sentry/网络/付费/云资源。

> FIFO281 `FRONT-SYSTEM-08B Rev7` UI G场景微终验已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`：`handoffToken=FIFO281-FRONT-SYSTEM-08B-R7-V4.765`。正式 production 两站前端 + Fastify + 从零全部迁移隔离 PostgreSQL + ScreenshotStorageFake + Playwright/系统 Chrome 的唯一 G 矩阵 `12/12`，`P0/P1/P2/P3=0/0/0/0`；同一完整查询 `503→503→pending→200` 的20行 stale、真实 requestId、唯一 ErrorBlock 焦点、pending 锁与完成后 H1 焦点成立，普通刷新保持搜索框焦点，offset/search 身份切换与迟到响应均未复活旧意图。reports 主请求13次且无 detail/events/写请求/轮询/第二查询源；application console error/warn=0/0、pageerror=0。隔离库/服务/Chrome已清理，共享PG55432保持运行，生产代码修改0；同令牌八项包已在规划固定任务新 turn 出现，FIFO281=`delivered`，由规划核对并决定TEST。

> FIFO280 已通过规划独立代码门并关闭：规划逐行核对确认错误重读改为本次 `reports.reload(afterSuccess)` 的真实完成回调，完整 `queryKey`（含 offset）变化会清除旧恢复意图，pending、翻页与迟到响应不再依靠 loading 状态推断；规划新鲜复跑员工+管理员反馈专项 `2 files / 23 tests`、system-frontend typecheck、Vite production build `45 modules` 与 `git diff --check` 均通过。登记 `handoffToken=FIFO281-FRONT-SYSTEM-08B-R7-V4.765`，仅由 UI 固定任务在正式 production 两站 + Fastify + 从零隔离 PostgreSQL + ScreenshotStorageFake + 系统 Chrome 复验 G：同查询 `503→503→pending→200`、第二次错误焦点、pending 不提前聚焦、普通刷新不抢焦、翻页/筛选迟到身份与 console；A–F、B–E及 FIFO273 其余矩阵全部冻结，TEST 继续 blocked。

> FIFO280 Rev7 微审返工已完成并再次交规划：错误重读改用 `reports.reload(afterSuccess)` 的同一次请求完成回调，取消基于 loading/refreshing 观察的提前聚焦；完整 `queryKey`（含 limit/offset）变化会清除错误恢复意图，旧页迟到响应不会聚焦新页或复活旧意图。新增 pending 未完成焦点/按钮锁、翻页身份与回原页不复活回归。新鲜管理员反馈专项15/15、员工+管理员组合23/23、frontend/system-frontend typecheck、两端 Vite build（195/45 modules）、git diff-check通过（仅既有LOCAL_APP_PARITY CRLF提示）。实际生产仍仅 `system-frontend/src/feedbackPage.tsx`，测试仅 `tests/frontend/system-control-feedback.test.tsx`；未改公共Hook/API/CSS/backend/contracts/migrations/DESIGN，未跑完整 pnpm check/浏览器矩阵/Impeccable，未提交推送部署。FIFO280 保持 `review / Current actor=规划对话 / Reviewer=规划对话`，唤醒已发送并确认规划新 turn。

> FIFO280 `FRONT-SYSTEM-08B Rev7` 已完成并交规划复核：错误列表重读与普通顶栏刷新拆为独立意图；错误重读只递增 reports 查询版本，不再顺带读取详情/events，第二次 stale 失败保留20行/新 requestId 并由唯一 ErrorBlock 持焦，同查询成功且非 refreshing 时才聚焦“反馈问题”H1；普通刷新清除错误恢复意图，搜索框焦点不被成功响应抢走；查询身份变化清除旧意图，迟到响应不聚焦新查询。新增管理员回归覆盖 `503→503→200`、普通刷新持焦和切身份迟到响应。新鲜反馈管理员专项14/14、员工+管理员组合22/22、frontend/system-frontend typecheck、两端 Vite build（195/45 modules）、`git diff --check`通过（仅既有LOCAL_APP_PARITY CRLF提示）。实际生产改动仅 `system-frontend/src/feedbackPage.tsx`，回归改动仅 `tests/frontend/system-control-feedback.test.tsx`；未改 API/CSS/backend/contracts/migrations/DESIGN，未运行完整 `pnpm check`、浏览器矩阵或 Impeccable，未提交推送部署。FIFO280 转 `review / Current actor=规划对话 / Reviewer=规划对话`，只唤醒规划固定任务。错误/普通刷新及此前 A–F/console 证据保持冻结。

> FIFO279 已由规划集中归因并关闭为 `FRONT-SYSTEM-08B Rev7` 唯一输入：A员工遮罩、F Drawer分页/顶层键盘、B–E和console均正式通过并冻结，只剩 G 的列表读取焦点意图。根因是错误重读与普通顶栏刷新共用 `refresh()`，且 `focusAfterRetry=true` 后只检查 `!loading && !error`；已有 stale data 的 reload 会进入 `refreshing=true/loading=false/error=null`，因而请求尚未结束就提前聚焦H1并清除恢复意图，第二次失败无法让 ErrorBlock持焦，普通刷新也会误消费该意图。登记 `handoffToken=FIFO280-FRONT-SYSTEM-08B-R7-V4.761`：拆分错误重读与普通刷新，错误重读只重跑同一 reports 查询，失败聚焦ErrorBlock、成功聚焦H1；普通顶栏刷新不得设置/消费恢复焦点。禁止新增延时、重试、fallback或第二查询源；TEST继续 blocked。

> FIFO279 同令牌交回已由规划固定任务接收并进入新 turn：规划确认A/F正式关闭，G仅剩一个同根P1，并独立定位为错误重读与普通顶栏刷新共用 `refresh()` 导致恢复焦点意图过早消费/错误继承；`notification_pending → delivered`，UI设计对话停止，TEST不解锁。

> FIFO279 `FRONT-SYSTEM-08B Rev6` UI三组微终验已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`：同一正式 production 两站前端 + Fastify + 从零隔离PostgreSQL + ScreenshotStorageFake + 系统Chrome原始20项为16通过/4失败，人工对账两项harness口径后产品裁决18通过/2失败，`P0/P1/P2/P3=0/1/0/0`。A员工遮罩5/5、F Drawer分页/顶层键盘8/8、console 3/3通过；G严格503→503→200、20行/requestId/唯一重读/成功H1成立，但第二次503后ErrorBlock未持焦且普通顶栏刷新错误消费旧恢复焦点意图，两项同根P1。生产代码修改0，隔离库/服务/Chrome/harness已清理，共享PG55432保持运行；TEST继续blocked。

> FIFO279 `FRONT-SYSTEM-08B Rev6` UI三组微终验已由UI设计对话领取并进入 `active / in_progress`：`handoffToken=FIFO279-FRONT-SYSTEM-08B-R6-V4.757`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。仅沿FIFO277同一正式路径复验A员工遮罩、F Drawer分页/最上层键盘与上层Modal隔离、G列表stale和本轮console；B–E及FIFO273其余75项冻结，生产代码修改0，TEST继续blocked。

> FIFO278 已通过规划独立代码门并关闭：员工 backdrop 在关闭前取消默认鼠标动作，未增加第二回焦源；公共 `ReadOnlyDrawer` 以 document capture + 最上层 `aria-modal` 判定统一拥有 Escape/Tab，BODY 泄漏可恢复、上层 Modal 不被抢占。规划新鲜复跑两份反馈专项 `21/21`，源码核对确认 production 仅改员工 FeedbackModal 与公共 Drawer，未继续向 feedbackPage 叠加局部状态。登记 `handoffToken=FIFO279-FRONT-SYSTEM-08B-R6-V4.757`，UI 只复验 A、F 与 G stale，并抽查上层 Modal 隔离/console；B–E及FIFO273其余75项冻结，TEST继续 blocked。

> FIFO278 `FRONT-SYSTEM-08B Rev6` 已完成并交规划复核：员工 FeedbackModal 遮罩命中且非 pending 时先 `preventDefault/stopPropagation` 再走唯一 close，真实 mousedown 回原“反馈问题”入口；公共 ReadOnlyDrawer 统一使用最上层 `aria-modal=true` 判定的 document capture 键盘所有权，focusRequest 后同步聚焦标题，BODY 泄漏时仍可处理 Tab/Escape，存在上层 Modal 时不抢事件。新鲜反馈员工+管理员专项 `21/21`、frontend/system-frontend typecheck、两端 Vite production build（195/45 modules）、`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。实际生产改动：`frontend/src/features/feedback/FeedbackModal.tsx`、`system-frontend/src/runtimeCommon.tsx`；回归改动：`tests/frontend/feedback.test.tsx`、`tests/frontend/system-control-feedback.test.tsx`。未改 feedbackPage/API/CSS/backend/contracts/migrations/DESIGN，未运行完整 `pnpm check`、未重复 Impeccable、未提交推送部署。FIFO278 转 `review / Current actor=规划对话 / Reviewer=规划对话`，已唤醒规划等待独立复验；G stale 仍按原计划留 UI 同批复验。

> FIFO278 `FRONT-SYSTEM-08B Rev6` 已由前端开发对话领取并进入 `in_progress`：`handoffToken=FIFO278-FRONT-SYSTEM-08B-R6-V4.754`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。本轮只处理员工 FeedbackModal 遮罩默认鼠标动作与公共 ReadOnlyDrawer 最上层焦点/键盘所有权，G stale 留 UI 后续同批复验；不改 API/CSS/backend/contracts/migrations/DESIGN，不运行完整 `pnpm check`，不提交推送部署。

> FIFO277 已由规划集中归因并关闭为 `FRONT-SYSTEM-08B Rev6` 输入：B摘要同范围、C附件详情、D事件unknown、E事件409正式通过并冻结；A/F 两组P1均为焦点层所有权。A 根因为员工反馈 backdrop `mousedown` 直接 close，未像管理员 Drawer 一样先 `preventDefault/stopPropagation`，React 回焦后仍会被浏览器默认鼠标动作覆盖为 BODY。F 不能继续在 `feedbackPage` 叠加分页局部标志：应由公共 `ReadOnlyDrawer` 作为最上层 modal 的唯一焦点/键盘所有者，在 `focusRequest` 后覆盖查询阶段 DOM 变更，并在焦点意外泄漏到 BODY 时仍能处理 Escape/Tab；存在更上层 Modal 时不得抢其事件。登记 `handoffToken=FIFO278-FRONT-SYSTEM-08B-R6-V4.754`，只修 A/F 与真实事件序列回归；G stale 留下一轮 UI 同批复验，TEST继续 blocked。

> FIFO277 同令牌正式交回已由规划固定任务接收并进入新 turn：规划回执确认 B/C/D/E 关闭，A/F 两组为真实浏览器焦点所有权问题，G stale 保持待复验；`notification_pending → delivered`，UI设计对话停止，TEST不解锁。

> FIFO277 `FRONT-SYSTEM-08B Rev5` UI变化场景复验已转 `review / Current actor=规划对话 / Reviewer=规划对话`：正式 production 两站前端 + Fastify + 从零隔离 PostgreSQL + ScreenshotStorageFake + 系统 Chrome 的 A–G 计划34项中，本轮实际裁决27项（21通过/6失败），7项未裁决，`P0/P1/P2/P3=0/2/0/0`。B摘要同范围、C附件详情、D事件unknown、E事件409均通过；A普通遮罩关闭后焦点落BODY而非原“反馈问题”，F真实鼠标分页焦点、分页后Drawer标题接管与Escape关闭/回焦失败。F失败后活动Drawer拦截后续底层触发点，按单一harness停止门未再叠修或第四次运行，因此F遮罩、G stale 503→503→200及本轮末端console聚合保持未裁决；FIFO273其余75项继续冻结，TEST仍blocked。生产代码修改0，隔离库已DROP、任务服务/浏览器由finally关闭，共享PG55432保持运行。

> FIFO277 `FRONT-SYSTEM-08B Rev5` UI变化场景复验已领取并进入 `in_progress`：`handoffToken=FIFO277-FRONT-SYSTEM-08B-R5-V4.750`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。仅使用 production 两站前端 + 正式 Fastify + 从零隔离 PostgreSQL + ScreenshotStorageFake + 既有 Playwright/系统 Chrome 复验 FIFO273 六组原P1与stale唯一未裁决项，其余75项冻结；生产代码修改0，TEST继续 blocked。

> FIFO276 已通过规划独立代码门并关闭：`changeEventsPage(nextOffset)` 使事件历史前后分页统一先递增 Drawer `focusRequest` 再切 offset；回归先真实聚焦“下一页”按钮，再验证按钮卸载后的 loading 标题接管、新页标题聚焦、Escape 关闭与原“查看详情”回焦。规划新鲜复跑员工/管理员反馈专项 `2 files / 19 tests` 全绿，代码核对确认未新增状态源、未改公共 Drawer 默认行为。登记 `handoffToken=FIFO277-FRONT-SYSTEM-08B-R5-V4.750`，由 UI 固定任务只复验 FIFO273 六组原 P1 与唯一未裁决 stale 读取恢复；FIFO273 其余75项和已通过正式矩阵冻结，TEST继续 blocked。

> FIFO276 `FRONT-SYSTEM-08B Rev5` 已完成并交规划复核：新增 `changeEventsPage(nextOffset)`，上一页/下一页统一先递增 Drawer `focusRequest` 再切换事件 offset；专项回归先显式聚焦真实“下一页”按钮，验证 loading 期间 Drawer 标题接管、新页标题持续聚焦、Escape 关闭并回原“查看详情”触发点。新鲜反馈员工+管理员专项 `19/19`、system-frontend typecheck、Vite production build `45 modules`、`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。实际生产改动仅 `system-frontend/src/feedbackPage.tsx`，回归改动 `tests/frontend/system-control-feedback.test.tsx`；未改 runtimeCommon/backend/contracts/migrations/DESIGN，未运行完整 `pnpm check`、未重复 Impeccable、未提交推送部署。FIFO276 转 `review / Current actor=规划对话 / Reviewer=规划对话`，已唤醒规划等待独立复验。

> FIFO276 `FRONT-SYSTEM-08B Rev5` 已由前端开发对话领取并进入 `in_progress`：`handoffToken=FIFO276-FRONT-SYSTEM-08B-R5-V4.747`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。本轮只统一上一页/下一页事件分页的 Drawer 焦点请求，并让回归显式聚焦真实下一页按钮；其余 FIFO275 通过项冻结。Current actor=前端开发对话、Reviewer=规划对话；不改 backend/contracts/migrations/DESIGN，不运行完整 `pnpm check`，不提交推送部署。

> FIFO275 规划代码门复核未完全通过，保留同一 `FRONT-SYSTEM-08B Rev5`，登记 `handoffToken=FIFO276-FRONT-SYSTEM-08B-R5-V4.747` 做唯一微返工：事件历史“上一页”已在切换 offset 前递增 Drawer `focusRequest`，但“下一页”仅更新 offset；真实 Chrome 鼠标点击会先把焦点放到即将因 loading 卸载的下一页按钮，随后仍可能落到 BODY。现有测试直接 `fireEvent.click`，未先聚焦按钮，因而错误继承原 Drawer 标题焦点并漏过真实行为。FIFO276 只允许统一上一页/下一页的分页焦点交接，并让回归先显式聚焦下一页按钮，再验证 loading、新页、Escape 与原“查看详情”触发点；FIFO275 其余摘要、事件成功/恢复、身份门和公共 Drawer 通过项冻结，UI/TEST 继续 blocked。

> FIFO275 `FRONT-SYSTEM-08B Rev5` 已完成并交规划复核：选中 status 时从同范围服务端 list.total 投影唯一相容摘要，其余互斥摘要确定为0（confirmed/fixing 合并“处理中”）；事件 POST 成功、同 eventId GET 恢复成功与分页查询均通过 Drawer focusRequest 聚焦活动详情标题，迟到身份响应不再抢焦，分页加载期间焦点仍留 Drawer，Escape 关闭后回原“查看详情”触发点。实际改动：`system-frontend/src/feedbackPage.tsx`、`system-frontend/src/runtimeCommon.tsx`、`tests/frontend/system-control-feedback.test.tsx`；公共 Drawer 仅新增可选纯聚焦请求语义，其他调用默认行为不变。新鲜验证：反馈员工+管理员专项 `19/19`、frontend/system-frontend typecheck、system-frontend Vite production build `45 modules`、`git diff --check` 通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未运行完整 `pnpm check`、未做浏览器矩阵、未重复 Impeccable，未改 backend/迁移/contracts/DESIGN，未提交推送部署。FIFO275 转 `review / Current actor=规划对话 / Reviewer=规划对话`，已唤醒规划等待独立复验。

> FIFO275 `FRONT-SYSTEM-08B Rev5` 已由前端开发对话领取并进入 `in_progress`：`handoffToken=FIFO275-FRONT-SYSTEM-08B-R5-V4.744`；本轮只关闭选中 status 摘要互斥确定0、事件成功/恢复聚焦活动 Drawer、事件分页后 Drawer 焦点接管三项源码门差量，其他员工/管理员反馈链冻结。权限指纹：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。Current actor=前端开发对话、Reviewer=规划对话；未改 backend/迁移/contracts/DESIGN，不运行完整 `pnpm check`，不提交推送部署。

> FIFO274 规划代码门未通过，保留同一 `FRONT-SYSTEM-08B Rev5` 做审核差量，不增加业务 Rev。规划新鲜复跑反馈专项 `2 files / 12 tests` 全绿，但源码核对发现三处遗漏：选中 status 后互斥摘要仍以 `null` 显示“未知”而非确定0；event POST/unknown GET 成功仍把焦点送到 Drawer 后的页面 H1；事件分页切换 query identity 会卸载当前分页按钮且没有 Drawer 内焦点接管，仍可能落 BODY 并使 Escape 失效。登记 `handoffToken=FIFO275-FRONT-SYSTEM-08B-R5-V4.744`，只修上述三处并补对应 activeElement/互斥0回归；FIFO274 已完成的员工通知、附件旧路径0、event错误/恢复层级与其余矩阵冻结，UI/TEST 继续 blocked。

> FIFO274 `FRONT-SYSTEM-08B Rev5` 已完成并交规划复核：员工 FeedbackModal 在确定失败/已创建无截图通知出现时交由 AppShell 通知独占焦点，普通取消仍回“反馈问题”入口；管理员摘要在未选状态时按完整查询范围读取五类真实 total，选中状态时只消费同范围列表 total 并按中文摘要投影；详情直接消费服务端 attachment metadata，删除 system-control metadata 旧读取，binary content 路径保持；event unknown 恢复与确定409 ErrorBlock 均置于活动详情 Drawer 内，恢复仅 GET 同一 eventId，提交中/错误/恢复按钮焦点与 Drawer 安全层保持。补充回归覆盖通知与入口回焦、状态筛选 query、附件旧路径0、event recovery Drawer 可达/同身份 GET、确定冲突错误焦点。新鲜员工/管理员反馈专项 `12/12`、frontend/system-frontend typecheck、两端 Vite production build（195/45 modules）、git diff-check 通过；未运行完整 `pnpm check`、未重复 Impeccable、未做完整浏览器矩阵。实际生产改动：`frontend/src/features/feedback/FeedbackModal.tsx`、`system-frontend/src/feedbackPage.tsx`、`system-frontend/src/feedbackApi.ts`；回归改动：`tests/frontend/feedback.test.tsx`、`tests/frontend/system-control-feedback.test.tsx`。未改 backend/迁移/contracts/DESIGN，未提交推送部署。FIFO274 转 `review / Current actor=规划对话 / Reviewer=规划对话`，已唤醒规划等待独立复验。

> FIFO273 已由规划完成集中归因并关闭为一次前端 Rev5 输入：六组 P1 均不需要新增后端契约或路由。管理员详情已经返回完整附件 metadata，前端额外请求不存在的 system-control metadata 路径属于重复旧读取，应直接消费详情事实；四项摘要必须保留 search/surface/kind/status/project/from/to/sort/sortDirection 完整查询范围，status 已限定时只显示对应服务端 total（confirmed/fixing 合并为“处理中”），其余互斥项归零，不能覆盖 status 再发另一范围查询。其余四组统一收口为员工通知/入口单一焦点所有者，以及管理员 Drawer 内 event recovery/error、分页焦点和关闭回原触发点。登记 `handoffToken=FIFO274-FRONT-SYSTEM-08B-R5-V4.742`，只允许修改两站反馈前端、必要公共焦点原语与专项测试；FIFO273 其余 75 个通过断言冻结，stale 503→503→200 保持待 UI 变化场景补裁决，TEST 继续 blocked。

> FIFO273 `FRONT-SYSTEM-08B Rev4` 正式 UI 终验已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`：唯一 production 两站前端 + 正式 Fastify + 从零隔离 PostgreSQL + ScreenshotStorageFake + 系统 Chrome 原始85项为73通过/12未通过，人工对账后通过75、产品失败9、未裁决1，`P0/P1/P2/P3=0/6/0/0`。六组P1为员工遮罩/首次create 409回焦、摘要status同范围、管理员附件metadata路径404、事件unknown恢复块被Drawer遮挡、事件409错误焦点、事件分页后Drawer Escape/遮罩回焦；stale完整恢复因hook未完成保持未裁决。应用主动console error/warn=0/0、pageerror=0，受控非2xx浏览器诊断已逐项登记。隔离库/任务端口/临时harness已清理，共享PG55432保持运行，生产代码修改0；TEST继续 blocked，交规划集中归因。

> FIFO273 `FRONT-SYSTEM-08B Rev4` 正式 UI 终验已领取并进入 `in_progress`：`handoffToken=FIFO273-FRONT-SYSTEM-08B-R4-V4.739`；权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。任务保持 `review / Current actor=UI设计对话 / Reviewer=UI设计对话`；本轮只执行唯一 production 员工/管理员前端 + Fastify + 从零隔离 PostgreSQL + ScreenshotStorageFake + 系统 Chrome 完整矩阵，生产代码修改0，TEST继续 blocked。

> FIFO272 已由规划独立复验通过并关闭：代码核对确认 FeedbackNotice 联合类型把纯创建失败与已创建无截图分离，continueUpload 确定性4xx 只走一次显式关闭/重置并清 FrozenIntent；规划新鲜运行反馈组合 `2 files / 9 tests`、员工 frontend typecheck 与 Vite production build `195 modules` 全通过。登记 `handoffToken=FIFO273-FRONT-SYSTEM-08B-R4-V4.739`，由 UI 固定任务执行唯一正式员工/管理员两站 React+Fastify+从零隔离 PostgreSQL 浏览器矩阵；FRONT 停止修改，TEST 继续 blocked。

> FIFO272 `FRONT-SYSTEM-08B Rev4` 已完成并交规划复核：FeedbackModal→AppShell 改为带 kind 的通知联合类型，创建确定失败显示“反馈未提交”并可重新填写；已创建但截图未附上显示唯一“反馈已创建”通知，仅提供“知道了”，不暗示新建或重新恢复。截图续传确定性 4xx 使用同一关闭/重置路径，清理 FrozenIntent 后只发送一次“反馈已创建，但截图未附上”真实原因与 requestId，不再被旧 partial 闭包覆盖。新鲜验证：员工反馈专项 `7/7`、反馈管理员组合 `9/9`、frontend typecheck、Vite production build 195 modules、git diff-check 通过；未运行完整 `pnpm check`、未重复 Impeccable/浏览器矩阵。任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，未改管理员反馈页、backend/迁移/contracts/DESIGN，未提交推送部署。

> FIFO272 `FRONT-SYSTEM-08B Rev4` 已领取并进入执行：`handoffToken=FIFO272-FRONT-SYSTEM-08B-R4-V4.736`；`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`，`permission_profile=workspace-write/:workspace`，`ordinary_writes=direct`。Current actor=前端开发对话、Reviewer=规划对话；只处理“反馈已创建但截图未附上”与“反馈未创建”通知分流，以及截图续传确定冲突的单一关闭/重置路径，Rev3 其余事实冻结。

> FIFO271 规划根因复验完成：新鲜反馈专项 `2 files / 7 tests` 全绿，FrozenIntent 显式续传、写锁与 projectDraft 边界成立；但部分完成关闭仍复用 AppShell 固定“反馈未提交 / 重新填写反馈”错误语义，与“服务端反馈已创建、仅截图未附上”直接矛盾。续传阶段确定性 4xx 还会先上报真实错误，再因 `close()` 读取旧 partial 闭包用部分提示覆盖它。登记 `handoffToken=FIFO272-FRONT-SYSTEM-08B-R4-V4.736`，只收口“未创建失败”和“已创建但无截图”两类通知所有权及确定冲突单一落点；其余 Rev3 代码/证据冻结，UI/TEST 继续 blocked。

> FIFO271 `FRONT-SYSTEM-08B Rev3` 已完成并交规划复核：截图未知/部分完成保留同一 FrozenIntent（feedbackId、attachmentId、阶段 body/key 与截图 bytes），查询只 GET 同一 feedback/attachment；服务端确认未 uploaded 后只显示唯一查询与显式“继续上传已确认截图”，续传按权威阶段复用原身份/键，complete GET 确认 uploaded 才显示完整成功。冻结意图存在时表单字段与“提交反馈”全锁，关闭部分完成仅诚实提示“反馈已创建，截图未附上；管理员仍可看到这条反馈”。管理员 projectDraft 与已提交 projectId 分离，空值/合法 UUID 才提交查询，非法草稿本地错误安全聚焦且不发 list/summary 请求。新鲜验证：反馈专项 `7/7`、全部前端 `19 files / 201 tests`、frontend/system-frontend typecheck、两端 Vite build、git diff-check 通过；未运行完整 `pnpm check`、未重复 Impeccable、未做正式浏览器完整矩阵。任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，未改 backend/迁移/contracts/DESIGN，未提交推送部署。

> FIFO270 已由规划完成根因/状态时序审查并关闭为 Rev3 输入：规划新鲜复跑员工/管理员反馈专项 `2 files / 3 tests`，现有通过项成立；但截图子链在 create/authorize/upload/complete 任一响应未知后只反复 GET，服务端证明反馈或附件仍未 uploaded 时没有“继续同一冻结阶段”的显式入口，已确认的截图可能永久停在部分完成。另有管理员项目编号直接进入查询 identity，输入未完成 UUID 时会发出必然 400 的服务端请求。登记 `handoffToken=FIFO271-FRONT-SYSTEM-08B-R3-V4.733`，由前端仅重构这两处恢复/查询所有权，不自动重发写命令、不生成新身份、不改后端/契约/视觉；UI/TEST 继续 blocked。

> FIFO271 `FRONT-SYSTEM-08B Rev3` 已领取并进入执行：`handoffToken=FIFO271-FRONT-SYSTEM-08B-R3-V4.733`；`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`，`permission_profile=workspace-write/:workspace`，`ordinary_writes=direct`。Current actor=前端开发对话、Reviewer=规划对话；只处理截图分阶段显式续传与 projectId 草稿/合法提交边界，Rev2 其余事实冻结。

> FIFO270 `FRONT-SYSTEM-08B Rev2` 已领取：`handoffToken=FIFO270-FRONT-SYSTEM-08B-R2-V4.731`；`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`，`permission_profile=workspace-write/:workspace`，`ordinary_writes=direct`。任务置为 `active / in_progress`，Current actor=前端开发对话；本轮只收口规划归并的四组反馈 P1。

> FIFO270 `FRONT-SYSTEM-08B Rev2` 已完成并交规划复核：员工截图支持 PNG/JPEG/WebP 本地受控预览、真实像素/大小、对象 URL 及时撤销；create API 使用正式 `FeedbackReport`，截图各阶段未知只查询同一 feedback/attachment，未确认上传时诚实显示“反馈已创建，截图尚未确认完成”，确认上传后才显示完整成功。员工上下文补齐浏览器/版本、路由、项目/任务短身份、窗口/时区、requestId/性能未采集投影，白名单 taskType 与确定冲突后的 AppShell 邻近错误焦点成立。管理员摘要沿用 search/surface/kind/status/project/from/to/sort/sortDirection 同范围服务端 total，分页与列表列序、页面区域、详情附件元数据/显式查看大图、截图读取错误恢复和 1080px 容器内横滚已补齐。新鲜验证：反馈专项 3/3、全部前端 19 文件 197/197、frontend/system-frontend typecheck、两端 Vite build、git diff-check 通过；Impeccable 不重复，完整 pnpm check 与正式 Fastify/PostgreSQL 浏览器矩阵留后续关闭门。任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，未改 backend/迁移/contracts/DESIGN，未提交推送部署。

> FIFO269 前端主体与定向基线经规划复核后转一次集中 Rev2：规划新鲜复跑两份反馈专项 `2/2`，但正式设计映射仍有四组 P1。员工截图选择缺本地预览/尺寸，且授权、上传或完成任一响应未知后，只要 GET 到反馈就误报完整成功；管理员四摘要未沿用当前同范围筛选，项目/时间/排序控件缺失；列表列序和详情截图缺少冻结的页面区域、附件大小/确认时间/“查看大图”；员工安全上下文投影不完整，确定性创建冲突仍留在 Modal 内且未刷新/清理旧意图。登记 FIFO270 `FRONT-SYSTEM-08B Rev2`，只一次收口上述同源前端问题，不改后端/契约/DESIGN；UI/TEST 继续 blocked。

> FIFO269 `FRONT-SYSTEM-08B Rev1` 已完成并交规划复核：员工 AppShell“反馈问题”与管理员 ControlShell `/feedback` 均消费正式反馈 API，截图显式隐私确认后按 authorization→binary content→complete 上传；创建/状态事件未知仅同身份 GET，服务端摘要/筛选/分页/详情/事件/附件读取与中文业务投影成立。FIFO269 转 `review / Current actor=规划对话 / Reviewer=规划对话`；未接外部 COS/Sentry/网络/Secret/付费/部署。定向反馈专项 2/2、全部前端 19 文件 196/196、frontend/system-frontend typecheck、两端 Vite build、Impeccable detector `[]`、git diff-check 均通过；本轮未运行完整 pnpm check，正式 Fastify/PostgreSQL 浏览器矩阵留规划/UI 终验。

> FIFO269 `FRONT-SYSTEM-08B Rev1` 已领取：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`，`permission_profile=workspace-write/:workspace`，`ordinary_writes=direct`；曾置为 `active / in_progress`，现已转 `review`，由规划独立复核两站反馈实现。

> FIFO268 已由规划独立复验通过并关闭：规划逐文件核对反馈契约、同一未发布迁移、feedback service/routes/storage 与专项，确认真实截图字节上传/摘要核验/管理员读取、显式隐私确认、employee 项目范围失败关闭、全局命令键并发所有权、事件分页与最小列表/最新事件摘要均为单一正式路径。规划新鲜运行 feedback `6/6`、contracts/backend build 与 `check:repo` 全通过。`BACK-SYSTEM-08A Rev2=done`；登记 FIFO269 `FRONT-SYSTEM-08B Rev1`，由前端固定对话按 UI-SYSTEM-08 与正式 API 接入员工 AppShell“反馈问题”和管理员 ControlShell `/feedback`，TEST 继续 blocked。

> FIFO268 `BACK-SYSTEM-08A Rev2` 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`；保留 FIFO266 UI-SYSTEM-08 Rev1 已关闭事实。本轮收口真实截图字节/隐私确认、项目归属失败、跨资源幂等、事件分页和最小列表投影，不改 UI/前端或接外网。新鲜 feedback 专项 6/6、contracts/backend typecheck+build、迁移 node-check、check:repo、git diff-check 均通过；隔离库已 DROP，共享 PostgreSQL 未改业务数据，完整 pnpm check 留 TEST 关闭门。

> FIFO267 后端主体与专项基线经规划复核后退为一次集中 Rev2 输入：规划新鲜复跑专项 4/4，但正式前端仍缺真实截图字节上传/管理员读取，附件也未保存显式隐私确认时间；employee 缺项目范围时归属校验失败开放；事件/附件完成的幂等键缺跨资源并发所有权；超过100条事件无分页继续读取；管理员列表返回过多详情且缺最新事件摘要。登记 FIFO268 `BACK-SYSTEM-08A Rev2`，只收口上述同源合同/权限/恢复问题，不改 UI/前端或接外网。FRONT/TEST 继续 blocked。

> FIFO266 已由规划独立审核通过并关闭：规划核对 DESIGN 5.18、UI 验收矩阵、仓库外原型、22/22 `results.json` 与三张关键截图；员工创建/显式截图、管理员列表/历史/重开、unknown/冲突、1440/1024 与焦点证据一致。验收页状态和“提交者”截图文案已同 Rev1 校正，生产代码修改0。`UI-SYSTEM-08 Rev1=done`、FIFO266=`closed`；BACK-SYSTEM-08A 继续独立实现，FRONT/TEST 仍 blocked。

> FIFO267 `BACK-SYSTEM-08A Rev1` 的领取记录：曾按最新并行快照置为 `active / in_progress / Current actor=后端开发对话 / Reviewer=规划对话`；保留 FIFO266 UI-SYSTEM-08 Rev1 的 `review` 事实。本轮只实现反馈契约、唯一 PostgreSQL 报告/事件、显式截图 fake、逐请求权限、幂等恢复与脱敏读取，不通知 UI/FRONT/TEST。

> FIFO267 `BACK-SYSTEM-08A Rev1` 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`：新增严格反馈契约、1754976021000 结构迁移（空库零业务行、事件不可变、截图身份摘要不落 objectKey）、Fastify 正式路由、逐请求 employee/system-control 权限、稳定 feedback/event/attachment 身份与幂等/冲突/GET 恢复、状态关闭/重开、显式截图 fake、管理员筛选分页/真实 total 与安全投影。专项 `tests/backend/system-control-feedback.test.ts` 4/4；contracts/backend typecheck/build、migration node-check、check:repo、git diff-check 通过。未接真实 COS/Sentry/网络/Secret/部署，未运行完整 pnpm check；FRONT/TEST 继续 blocked。

> FIFO266 `UI-SYSTEM-08 Rev1` 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`：规划微审已通过主体设计、22/22、双视口/焦点/隐私/关闭重开证据；同 Rev1 仅把验收页首状态改为“已交规划审核”，并将截图选择主体精确为“提交者”，不重跑矩阵、不改原型或业务方向。生产代码/契约/迁移修改0，不宣称 BACK API 完成；FIFO267/BACK 并行事实保持不变。

> 用户已确认 `PLAN-SYSTEM-08`“测试反馈与错误观测”方向：测试者自由操作，不增加测试任务清单；员工站与管理员站提供低干扰“反馈问题”，自动上下文严格脱敏，截图仅在显式选择并再次确认后上传；管理员 `/feedback` 负责服务端查询、不可变流转历史与关闭后重新打开。规划已冻结 `docs/contracts/SYSTEM-test-feedback-observability.md`、职责矩阵行与 `INT-18`，登记 FIFO266 UI 与 FIFO267 BACK 并行；真实 COS、Sentry、域名、部署、账号和外部网络仍需用户后续授权。

> FIFO265 已由规划独立复核通过并关闭：规划核对 `docs/testing/M3-unified-task-center-integration-report.md`、仓库外脱敏 `summary.json`、16 项 `ok=true`、1440/1024 几何、零 console error/warn、隔离库/端口/浏览器清理与共享 PostgreSQL 55432 运行态，均与正式交接一致；唯一完整 `pnpm check` 退出码0，`41 files/389 tests` 全绿且四工作区构建通过。`TEST-M3-08 Rev1=done`、FIFO265=`closed`，M3-08 统一任务中心正式关闭，产品 `P0/P1/P2/P3=0/0/0/0`。

> FIFO264 已由规划复核通过并关闭：正式三场景9/9、P0/P1/P2/P3=`0/0/0/0`，正确员工frontend build 192 modules、焦点/1024几何/503请求序列与零残留成立。`FRONT-M3-08B Rev4=done`。登记 FIFO265 `TEST-M3-08 Rev1`：`handoffToken=FIFO265-TEST-M3-08-R1-V4.714`，由全链测试固定对话独立执行正式 Fastify+production frontend+从零隔离 PostgreSQL+系统Chrome 的 INT-09 纵向矩阵，并只运行一次新鲜完整 `pnpm check`；通过后关闭统一任务中心，失败则稳定编号并回规划。

> FIFO265 已领取并进入 `in_progress`：权限指纹为 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。先执行正式 INT-09 六类任务/隔离/命令恢复/双视口矩阵，完成后只运行一次完整 `pnpm check`。

> FIFO265 已完成并交规划复核：正式 Fastify + 员工 frontend production build + 从零隔离 PostgreSQL + 系统 Chrome/Playwright 纵向 harness `16/16`；backend/frontend tasks 专项 `2 files/16 tests`；唯一完整 `pnpm check` 退出码0，`41 files/389 tests` 全绿，员工 frontend 192 modules、system-frontend 42 modules 构建通过。旧 `/asr-dispatches`/`AsrDispatches` 与员工 bundle 管理入口扫描为0，隔离库/端口/Chrome/harness已清理，共享55432保持运行。产品 `P0/P1/P2/P3=0/0/0/0`，报告已写回，TEST/FIFO265 转 review，交规划关闭。

> FIFO264 `FRONT-M3-08B Rev4` UI三场景微复验已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。新鲜 production React 192 modules + 正式 Fastify + 从零隔离 PostgreSQL + 系统 Chrome 正式结果9/9，P0/P1/P2/P3=`0/0/0/0`：Drawer遮罩关闭回原查看详情且焦点圈/Escape无回归；1024收起与展开workspace均保持 `x=72,width=952`、216覆盖与遮罩/正文/根溢出/回焦成立；同查询主GET `503→503→200`、stale20行、requestId、再次失败ErrorBlock焦点、成功H1焦点及普通顶栏重读不抢焦成立。隔离库/31664/32664/Chrome/harness已清理，共享PG55432保持运行；生产代码修改0，等待规划决定TEST。

> FIFO264 `FRONT-M3-08B Rev4` UI三场景微复验已领取并进入 `in_progress`。`handoffToken=FIFO264-FRONT-M3-08B-R4-V4.711`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。本轮只使用 production React + 正式 Fastify + 从零隔离 PostgreSQL + 既有 Playwright/系统 Chrome 复验 Drawer遮罩回焦、1024覆盖workspace与列表503→503→200成功焦点；其余矩阵冻结，生产代码修改0。

> FIFO263 已由规划独立复验通过并关闭：规划核对遮罩事件时序、workspace显式第二列与查询身份绑定的单一focus recovery intent；新鲜员工 frontend production build 为192 modules（纠正交接中误写的system-frontend 42 modules），tasks专项9/9证据成立。登记 FIFO264 `FRONT-M3-08B Rev4` UI三场景微复验：`handoffToken=FIFO264-FRONT-M3-08B-R4-V4.711`；只复验Drawer遮罩回焦、1024覆盖workspace、列表503→503→200成功焦点，其余FIFO262通过项冻结。TEST继续blocked。

> FIFO263 完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`：遮罩 mousedown 先 `preventDefault`/停止冒泡再回原详情触发点；`/tasks` <=1100px fixed 侧栏脱离网格后 workspace 明确占第二列；列表 ErrorBlock 唯一重读绑定当前查询身份的一次性焦点意图，失败继续保留唯一动作并聚焦，成功仅聚焦统一任务中心标题，普通加载/筛选/顶栏重读不抢焦。只修改 `frontend/src/features/tasks/TasksPage.tsx`、`frontend/src/components/AppShell.module.css`、`tests/frontend/tasks.test.tsx`；其余业务/契约/视觉证据冻结。

> FIFO263 领取回执：`handoffToken=FIFO263-FRONT-M3-08B-R4-V4.708`；`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`；`permission_profile=workspace-write/:workspace`；`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。FIFO263 已置 `active`，`FRONT-M3-08B Rev4` 已置 `in_progress`，Current actor=前端开发对话，Reviewer=规划对话。只处理遮罩回焦、tasks 窄屏 workspace 第二列和列表错误恢复焦点三项同源所有权问题。

> FIFO262 已由规划完成集中归因并关闭为返工输入：此前5项未裁决全部形成真实产品证据并通过，三项剩余P1均归为“脱离/卸载后的布局与焦点所有权”而非领域状态问题。登记 FIFO263 `FRONT-M3-08B Rev4`：`handoffToken=FIFO263-FRONT-M3-08B-R4-V4.708`，只修 Drawer遮罩 mousedown 回焦、fixed侧栏时workspace固定第二列、列表error恢复成功焦点；要求用单一焦点恢复意图与明确grid placement收口，不新增延迟/fallback。其余数据/命令/UI证据冻结，TEST继续 blocked。

> FIFO262 `FRONT-M3-08B Rev3` UI变化场景复验已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。production React + 正式 Fastify + 从零隔离 PostgreSQL + 系统 Chrome 的 A–H 最终产品裁决为通过14、失败3、未裁决0，P0/P1/P2/P3=`0/3/0/0`。通过：Drawer标题焦点圈/Escape、409焦点与新key、详情读取恢复、侧栏焦点圈、1440、项目排序分页、初始/再次读取与stale、cancel unknown、Delivery recover、控制台；三项P1为 Drawer遮罩关闭焦点落BODY、1024覆盖展开时workspace被放入72px第一列、列表初始错误恢复成功后焦点落BODY。隔离库/31662/32662/Chrome已清理，共享PG55432保持运行；生产代码修改0，TEST继续 blocked，仅交规划集中归因。

> FIFO262 `FRONT-M3-08B Rev3` UI变化场景复验已领取并进入 `in_progress`。`handoffToken=FIFO262-FRONT-M3-08B-R3-V4.705`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。本轮只使用 production React + 正式 Fastify + 从零精确隔离 PostgreSQL + 既有 Playwright/系统 Chrome 复验三项原 P1 与五项原未裁决场景；FIFO260 其余30项冻结，生产代码/契约/迁移/DESIGN 修改0。

> FIFO261 已由规划独立复验通过并关闭：规划核对 `trapDrawer`、冲突焦点让位、tasks-only 1024覆盖侧栏结构/样式与专项，并新鲜运行 `tests/frontend/tasks.test.tsx` 9/9。登记 FIFO262 `FRONT-M3-08B Rev3` UI变化场景复验：`handoffToken=FIFO262-FRONT-M3-08B-R3-V4.705`；仅复验三项原 P1，并补裁决 FIFO260 因 harness 未进入断言的项目/排序分页、初始error/stale、transport unknown、Delivery recover与Drawer遮罩五项；其余30项冻结，TEST继续 blocked。

> FIFO261 `FRONT-M3-08B Rev3` 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。任务 Drawer 标题已纳入双向焦点圈，确定409后的唯一 ErrorBlock 不再被标题 effect 抢焦，`/tasks` 在 <=1100px 使用72px正文轨道与216px覆盖侧栏/遮罩，1440及其他路由保持原204px语义。新增回归后 tasks 专项9/9、全部前端17文件194/194、frontend typecheck、Vite 192 modules、git diff-check通过；FIFO260其余通过项与5项未裁决场景未被改写。

> FIFO260 正式 UI 终验已由规划接收并集中归因：三项 P1 均有 production React+Fastify+隔离 PostgreSQL+系统 Chrome 真实证据，分别为 Drawer 标题初焦后 Shift+Tab 泄漏、确定409后标题覆盖唯一错误焦点、1024展开侧栏仍以204px网格挤压正文；5项 harness 未进入产品断言的场景保持未裁决，不当作通过或产品失败。登记 FIFO261 `FRONT-M3-08B Rev3`：`handoffToken=FIFO261-FRONT-M3-08B-R3-V4.703`，只修焦点所有权与 tasks 路由1024覆盖侧栏，并补最小回归；其余 FIFO260 通过项冻结，TEST 继续 blocked。

> FIFO260 固定任务交接已闭环：UI 已仅向规划固定任务发送携带原令牌的八项差量包；规划新 turn 已出现并明确确认三项真实产品缺口，正在集中归因且不会把 harness 误判路由给代码。FIFO260=`active`，`FRONT-M3-08B Rev2` 保持 `review / Current actor=规划对话 / Reviewer=规划对话`；TEST 继续 blocked，UI 停止执行且未通知 FRONT/BACK/TEST。

> FIFO260 `FRONT-M3-08B Rev2` 正式 UI 终验已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。唯一 production React + Fastify + 从零隔离 PostgreSQL + 系统 Chrome 原始矩阵保留 `27/38`；人工/源码对账后产品裁决为通过30、失败3、未裁决5，P0/P1/P2/P3=`0/3/0/0`。三项 P1：Drawer 标题初焦的 Shift+Tab 泄漏并使 Escape/触发点闭环失效；确定409刷新后 ErrorBlock 焦点被详情标题夺走；1024 展开仍是204px网格挤压正文而非216px覆盖。其余未裁决均为 harness 定位器/故障形态，不冒充产品结论。隔离库、31660/32660、测试 Chrome与临时 harness已精确清理，共享 PostgreSQL 55432保持运行；生产代码修改0，TEST 继续 blocked，等待规划集中归因。

> FIFO260 `FRONT-M3-08B Rev2` 正式 UI 终验已领取并进入执行。`handoffToken=FIFO260-FRONT-M3-08B-R2-V4.699`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。任务保持 `review / Current actor=UI设计对话 / Reviewer=UI设计对话`；本轮只运行唯一一次 production React + Fastify + 从零精确隔离 PostgreSQL UI 全矩阵，可写范围限 docs/ui、CURRENT/日志与仓库外脱敏证据，生产代码/契约/迁移/DESIGN 修改0，TEST 继续 blocked。

> FIFO259 已由规划独立复验通过并关闭：规划核对显式 `refreshIdentity`、固定详情 GET、完整 canonical 身份门与 transport unknown 分类，并新鲜运行 `tests/frontend/tasks.test.tsx`，结果 `7/7`。登记 FIFO260 `FRONT-M3-08B Rev2` 正式 UI 终验：`handoffToken=FIFO260-FRONT-M3-08B-R2-V4.699`，由 UI 设计对话使用 production React + 正式 Fastify + 从零精确隔离 PostgreSQL 完整核对 UI Rev1、六类任务、真实摘要/详情、领域动作、分页/深链/unknown/冲突/焦点、1440/1024 与旧入口删除；TEST 继续 blocked。

> FIFO259 `FRONT-M3-08B Rev2` 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。修正了显式有界刷新身份、分页外 `taskType/resourceId` 深链固定详情 GET、任务读取 transport rejection 的 unknown/retryable 投影，以及完整 canonical 任务身份迟到响应门。专项 7/7，关键入口组合 41/41，全部前端 17 文件 192/192，frontend typecheck、Vite 192 modules、git diff-check 通过；未改视觉/AppShell/modules/App、backend/contracts/migrations、领域 API 或旧入口删除事实。

> FIFO259 `FRONT-M3-08B Rev2` 已领取并进入 `in_progress`。`handoffToken=FIFO259-FRONT-M3-08B-R2-V4.696`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。本轮只修任务中心显式刷新身份、分页外深链详情、transport unknown 恢复及完整 `taskType+resourceId` 身份门；不改视觉、AppShell/modules/App 路由、backend/contracts/migrations、领域命令或旧入口删除事实。

> FIFO258 规划独立代码审查未通过，已集中登记 `FRONT-M3-08B Rev2` 微返工：`handoffToken=FIFO259-FRONT-M3-08B-R2-V4.696`。当前列表顶栏“重新读取”和初始错误块均只调用 `updateQuery({})`，URL/依赖不变时不会产生新 GET；项目派发以 `taskType/resourceId` 深链进入时只在当前20项分页内查找，分页外目标不会打开；原生 fetch transport rejection 被 `isRetryable` 误判为确定失败；恢复身份仅比较 resourceId 而未比较契约规定的 `taskType+resourceId`。Rev2 只允许在 tasks 前端与专项测试内修正上述同根读取/身份问题，不改视觉主体、后端、契约、路由或领域命令；UI/TEST 继续 blocked。

> FIFO258 `FRONT-M3-08B Rev1` 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。正式员工 `/tasks` 已接入唯一 AppShell/模块/路由，四项摘要由同范围 status-specific GET 的真实 total 聚合，列表服务端搜索/类型/状态/项目/排序/分页，详情抽屉展示有界历史与 Dispatch 子结果；取消/交付恢复只复用既有领域命令，unknown/retryable 保留同资源人工 GET，确定冲突清意图并刷新权威事实。旧全局 `/asr-dispatches` 路由、导航、页面、旧测试和链接已删除，项目 ASR 发起能力改链 `/tasks?taskType=asr_dispatch&resourceId=...`。仅修改 frontend tasks/接入/链接与对应前端测试、CURRENT/日志，未改 backend/contracts/migrations/DESIGN/system-frontend。新鲜验证：tasks 专项 3/3；入口相关组合 4 文件 37/37；全部前端 17 文件 188/188；frontend typecheck、Vite production 192 modules、Impeccable detector `[]`、git diff-check 均通过；旧路径前端/测试静态命中0。正式浏览器连接因本机 Browser RPC trusted-path 错误未建立，Fastify 本地烟测因 `uv_os_get_passwd ENOMEM` 未启动，均无残留进程；正式 UI 终验保留由规划继续安排。

> FIFO258 `FRONT-M3-08B Rev1` 已领取并进入 `in_progress`。`handoffToken=FIFO258-FRONT-M3-08B-R1-V4.693`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。本轮只实现员工 `/tasks` 唯一统一任务中心并删除旧 `/asr-dispatches` 全局入口，保留项目 ASR 发起能力；不改 backend/contracts/migrations/DESIGN/system-frontend，不提交/推送/部署。

> FIFO257 已由规划独立复验通过并关闭：规划核对 tasks SQL/路径/动作断言并新鲜运行 `tests/backend/tasks.test.ts`，结果 `7/7`。Dispatch `nativeStatus`、cancel_requested 动作空集、PreReview open_workspace 和六类正式 returnPath 均与 App.tsx/统一任务合同一致，tasks 后端旧 `/asr-dispatches` 命中0。`BACK-M3-08A Rev3=done`，FIFO257=`closed`；UI/BACK 双依赖已关闭。

> 登记 FIFO258 `FRONT-M3-08B Rev1`：`handoffToken=FIFO258-FRONT-M3-08B-R1-V4.693`，状态 `ready / Current actor=前端开发对话 / Reviewer=规划对话`。正式 React 只实现 `/tasks` 唯一入口并消费共享 tasks 契约/领域既有命令；删除全局“中文识别任务”导航、`/asr-dispatches` 路由/页面/旧测试与所有链接，不保留 redirect/compat；项目中心多剧发起与项目 ASR 工作台保留。需提供 UI 同状态/同视口证据、有意差异清单、1440/1024、六类真实事实、Dispatch 子结果、服务端查询分页、unknown/冲突/焦点与旧路径静态0。TEST 继续 blocked。

> FIFO256 规划主体复验通过但交叉路由审查保留一组同源 P1，故作为微返工输入关闭：Dispatch 规范状态与子结果、ASR Batch 状态、默认排序、项目隔离和动作大方向均已修正；但 Dispatch `nativeStatus` 仍显示创建受理状态而非执行原状态，ASR/ScreenText `cancel_requested` 仍重复暴露 cancel，前置审改仍返回直接 retry，且 ASR Batch、ScreenText、PreReview、Delivery 与 Dispatch 的多条 `returnPath` 不对应正式 React 现有路由。若直接交前端会形成不存在页面或第二详情路径。

> 登记 FIFO257 `BACK-M3-08A Rev3` 微返工：`handoffToken=FIFO257-BACK-M3-08A-R3-V4.690`，状态 `ready / Current actor=后端开发对话 / Reviewer=规划对话`。仅修改 tasks 投影与专项：Dispatch `nativeStatus` 忠实表达执行原状态；cancel_requested 无重复取消；PreReview 失败只 open_workspace；所有 returnPath 对齐正式 `/tasks`、`/projects/:projectId/asr|screen-text|pre-review` 与 `/deliveries/:deliveryId`，通过 query 保留稳定资源身份，不新增页面、兼容路径或状态源。其余 Rev2 证据冻结，FRONT/TEST 继续 blocked。

> FIFO257 `BACK-M3-08A Rev3` 已领取并进入 `in_progress`。`handoffToken=FIFO257-BACK-M3-08A-R3-V4.690`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。本轮仅收口 tasks 投影/专项，不改其他生产路径；Rev2 证据与 FRONT/TEST blocked 事实保留。

> FIFO257 `BACK-M3-08A Rev3` 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。Dispatch 在存在 accepted batch 时忠实返回 queued/running/partial/completed/failed/cancel_requested/reconciliation_required/cancelled 原执行状态，未有 accepted batch 时保留受理状态；ASR/ScreenText 的 `cancel_requested` 不再提供 cancel，PreReview failed 仅提供 `open_workspace`。六类 returnPath 已对齐冻结正式路径：Dispatch 使用 `/tasks?taskType=asr_dispatch&resourceId=...`，ASR/ScreenText 使用项目工作台 query，PreReview 使用 session query，Delivery 使用 `/deliveries/:deliveryId`。专项补齐 nativeStatus、动作空集、PreReview 工作台动作和六类路径断言。
>
> 新鲜验证：`tests/backend/tasks.test.ts` `7/7`；backend build、`check:repo`、`git diff --check` 通过；tasks 后端旧 `/asr-dispatches` 静态扫描为 0。中途真实 PostgreSQL `42803`（Dispatch 聚合新增 native 字段未纳入 GROUP BY）已修复，临时诊断已移除。未改 contracts、迁移、领域写状态、frontend、DESIGN，未运行完整 `pnpm check`。FIFO257 交规划复核，FRONT/TEST 继续 blocked。

> FIFO254 已由规划完成交叉审核并关闭：UI-M3-08 Rev1 的唯一 `/tasks` 方向、六类任务信息结构、同页详情抽屉、领域动作边界、38/38 真实浏览器矩阵、1440/1024、焦点/unknown/冲突和独立 Impeccable SHIP 证据均与规划契约一致；生产代码修改0。`UI-M3-08 Rev1=done`，FIFO254=`closed`。正式前端仍保持 blocked，等待后端统一投影修正通过。

> FIFO255 规划独立代码审查未通过并已关闭为返工输入：当前 Rev1 把 ASR Dispatch 的创建受理状态误当成执行状态，导致“accepted + 运行中 Batch”可显示已完成；独立 ASR Batch 列表遗漏 `cancel_requested/reconciliation_required`；默认排序不是契约冻结的需处理优先；Dispatch 详情只返回非空 batchId 且最多5条历史，不能完整承接可见项目子结果；`returnPath` 仍指向将删除的 `/asr-dispatches`，部分 `retry` 动作也超出领域实际安全边界。以上均属于同一任务投影语义，不解锁前端。

> 登记 FIFO256 `BACK-M3-08A Rev2`：`handoffToken=FIFO256-BACK-M3-08A-R2-V4.687`，状态 `ready / Current actor=后端开发对话 / Reviewer=规划对话`。仅集中修正 ASR Dispatch 执行状态派生、独立 ASR Batch 完整规范状态、默认注意优先排序、可见 Dispatch 子结果契约/查询、规范返回路径和领域安全动作，并补对应隔离回归；不新增迁移/通用任务表/Worker，不改领域写状态机、UI/前端/DESIGN，不运行完整 `pnpm check`。FRONT/TEST 继续 blocked。

> FIFO256 `BACK-M3-08A Rev2` 已领取并进入 `in_progress`。`handoffToken=FIFO256-BACK-M3-08A-R2-V4.687`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。本轮仅在 tasks 契约/后端投影/专项范围内收口五组同源 P1；FIFO254 已关闭事实、FRONT/TEST blocked 事实保留。

> FIFO256 `BACK-M3-08A Rev2` 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。Dispatch 执行状态现在只从当前可见 accepted 项目的 `asr_batches` 派生，覆盖 queued/running/partial/completed/failed/cancel_requested/reconciliation_required/cancelled，并在无 accepted batch 时保持 `unknown`；ASR 独立 Batch 与 ScreenText 投影补齐取消中/需对账状态和安全动作，默认排序改为需处理优先+更新时间倒序+稳定身份 tie-break。任务详情新增有界 `dispatchResults`，返回全部可见 pending/ready/accepted/blocked 项目子结果及安全执行摘要，项目隔离成立，返回路径统一 `/tasks/asr_dispatch/:resourceId`。
>
> 新鲜验证：`tests/backend/tasks.test.ts` 连续两次 `7/7`；与 `tests/backend/asr.test.ts` 组合 `2 files / 20 tests` 全通过；contracts build、backend build、`check:repo`、`git diff --check` 全通过。测试使用独立 `qimao_tasks_*` 临时库并在 afterAll 精确 DROP，未新增迁移/通用任务表/Worker，未改领域写状态机、frontend、DESIGN，未运行完整 `pnpm check`。FIFO256 交规划复核，FRONT/TEST 继续 blocked。

> FIFO254 固定任务交接已闭环：UI 设计对话已向规划固定任务发送携带原令牌的八项差量包；规划新 turn 已出现并明确正在交叉核对 UI 与后端字段。FIFO254=`active`，`UI-M3-08 Rev1` 保持 `review / Current actor=规划对话 / Reviewer=规划对话`；FRONT/TEST 继续 blocked，UI 停止执行且未通知 BACK/FRONT/TEST。

> FIFO254 `UI-M3-08 Rev1` 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。既有员工 AppShell `/tasks` 已冻结四项服务端摘要、六类领域任务、紧凑表/稳定查询分页、650px 详情抽屉、有界历史、真实或 unknown 进度、Dispatch 子结果不重复、领域取消/恢复/回工作台、loading/empty/error/stale/再次失败/成功、pending/unknown/冲突与 1440/1024 焦点闭环；正式接入删除独立中文识别任务入口和 `/asr-dispatches`。匿名原型真实 Chrome `38/38`、console error/warn=`0/0`、pageerror=`0`，Impeccable detector=`[]`、Verdict Pass=`SHIP`、P0/P1/P2/P3=`0/0/0/0`。本 UI 任务生产代码修改0；FIFO255/BACK review 事实保留，FRONT/TEST 继续 blocked，等待规划双审。

> FIFO254 `UI-M3-08 Rev1` 已由 UI 设计对话领取并进入 `in_progress`。`handoffToken=FIFO254-UI-M3-08-R1-V4.681`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。本轮仅细化 DESIGN 5.6、形成 `docs/ui/M3-unified-task-center-acceptance.md` 与同壳仓库外匿名原型/证据；生产 frontend/system-frontend/backend/contracts/migrations 修改0，FRONT/TEST 保持 blocked。

> FIFO255 `BACK-M3-08A Rev1` 已领取并进入 `in_progress`。`handoffToken=FIFO255-BACK-M3-08A-R1-V4.681`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。本轮只新增 tasks 共享只读契约/导出、backend tasks 有界 PostgreSQL 投影与专项测试；首版迁移=0，不建通用任务表/Worker/命令状态，不改既有领域写路径；FIFO254/UI 保持并行事实。

> FIFO255 `BACK-M3-08A Rev1` 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。`handoffToken=FIFO255-BACK-M3-08A-R1-V4.681`；交付 `packages/contracts/src/tasks.ts` 与导出、`backend/src/modules/tasks/` 只读 API、app 接线及 `tests/backend/tasks.test.ts`。六类 PostgreSQL 领域来源均由有界 UNION/CTE 投影：Dispatch 子批次去重、未被 Dispatch 引用的 ASR Batch、ScreenText、术语、前置审改准备、交付生成；列表服务端筛选/排序/分页/真实 total，详情历史最多5条并按身份过滤。逐请求 employee + tasks:read、项目隔离、未知/跨项目安全边界、敏感字段脱敏与读取零写副作用均有回归；首个详情 SQL 别名错误已按真实 `Invalid time value` 修复，无临时诊断残留。FIFO254/UI 的 in_progress 并行事实保留；FRONT/TEST 仍 blocked。

> `PLAN-M3-08` 已完成统一任务中心规划预检并关闭：新增 `docs/contracts/M3-unified-task-center.md`，同步 DESIGN 5.6、职责矩阵、INT-09 与里程碑。唯一方向为员工 `/tasks` 紧凑数据表；只读聚合六类现有领域事实，不建通用任务表/Worker/迁移，不混入上传或管理员任务；正式前端接入时删除独立“中文识别任务”导航与 `/asr-dispatches` 页面路径。登记 FIFO254 `UI-M3-08 Rev1` 与 FIFO255 `BACK-M3-08A Rev1` 并行执行；FRONT/TEST 保持 blocked，等待 UI/BACK 双审。

> SYSTEM-07C 已正式关闭：FIFO253 唯一新鲜完整 `pnpm check` 退出码0，40 files/377 tests 全绿；check:repo、四工作区 lint/typecheck/build、frontend 189 modules、system-frontend 42 modules 均通过。QA-SYSTEM-07C-CHECK-001/002 未再出现，测试专用差量未引入生产/API/状态机/视觉变化；临时数据库与本轮进程残留为0，共享 PostgreSQL 55432 保持原运行态。`TEST-SYSTEM-07C Rev2` 与 FIFO253 转 done/closed。下一阶段正式进入员工站“统一任务中心”规划预检，先核对现有领域任务权威与 INT-09，不提前实现第二套任务状态源。

> FIFO253 正式唤醒、送达与运行态均已确认：TEST 固定对话在新 turn 原样回显 `handoffToken=FIFO253-TEST-SYSTEM-07C-R2-V4.677`，回执正确 repo_root、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`，已进入 `inProgress`。本轮只运行一次新鲜完整 `pnpm check`，不并行启动其他测试/浏览器/数据库任务；规划等待真实退出码，不代跑、不重试、不提前启动统一任务中心。

> FIFO253 Rev2 唯一完整门已通过：`pnpm check` 退出码0，40 files/377 tests 全绿；check:repo、四工作区 lint/typecheck、四工作区构建（contracts/backend/frontend 189 modules/system-frontend 42 modules）均通过。QA-SYSTEM-07C-CHECK-001/002 不再出现；`qimao_prereview_*`、`qimao_fifo253_*` 残留均为0，无本轮 pnpm/vitest/node 孤儿进程，共享 PostgreSQL 55432 保持运行。报告已追加 Rev2 结果，TEST/FIFO253 转 review，交规划关闭。

> FIFO251/252 已由规划完成独立差异审查并关闭：后端只移除独立临时库 `afterAll` 的冗余 TRUNCATE，并以 `app.close → terminate → DROP → 不存在校验 → admin.end` 建立单一清理所有权；前端只把两个已稳定复现的同步 DOM 断言改为等待对应异步权威呈现，原业务断言未放宽。没有生产实现、状态机、API、视觉或兼容路径改动。登记 FIFO253 `TEST-SYSTEM-07C Rev2`，只运行一次新鲜完整 `pnpm check` 与清理核对；退出码 0 后关闭 SYSTEM-07C，若失败则保留原始新根因并停止。

> FIFO252 `FRONT-TEST-HEALTH-01 Rev1` 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。`handoffToken=FIFO252-FRONT-TEST-HEALTH-01-R1-V4.672`；在 `tests/frontend/ScreenTextWorkspace.test.tsx` 仅补两处同根异步等待：stale 旧批次先等待候选 checkbox 可达再断言 disabled；普通选择流程在点击全选后等待“成员来自当前服务端筛选范围”再断言。未改生产 ScreenText 或业务行为。ScreenText 单文件连续两次 `14/14`；与 SYSTEM-07C 管理关键测试组合 `7 files / 89 tests`；frontend typecheck、Vite `189 modules` production build、git diff-check 全通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。未跑完整 pnpm check、未改 backend/contracts/migrations/DESIGN/CSS视觉、未提交/推送/部署，等待规划独立复验。

> FIFO251 `BACK-TEST-HEALTH-01 Rev1` 已完成并转 `review / Current actor=规划对话`。`handoffToken=FIFO251-BACK-TEST-HEALTH-01-R1-V4.672`；根因是独立临时库由 DROP 负责整体清理，afterAll 的前置 TRUNCATE 属冗余锁等待；现收敛为 `app.close() → admin terminate → DROP → 查询确认数据库不存在 → admin.end()` 单一链。新鲜 pre-review `7/7`，与 `system-control-strategy-runtime` 邻近组合 `16/16`，backend build、git diff-check 通过；`qimao_prereview_*` 临时库残留为0。仅修改测试清理，不改生产 backend/contracts/migrations/frontend/DESIGN，不跑完整 `pnpm check`；FIFO252 review 事实保留，等待 TEST 最终关闭门。

> FIFO251 `BACK-TEST-HEALTH-01 Rev1` 已领取并进入 `in_progress`。`handoffToken=FIFO251-BACK-TEST-HEALTH-01-R1-V4.672`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。本轮只诊断并最小收敛 `tests/backend/pre-review.test.ts` 的独立临时库 afterAll 清理时序；不改生产 backend/contracts/migrations/frontend/DESIGN，不增加 timeout/sleep/fallback；FIFO252 in_progress 事实保留。

> FIFO252 `FRONT-TEST-HEALTH-01 Rev1` 已领取并进入 `in_progress`。`handoffToken=FIFO252-FRONT-TEST-HEALTH-01-R1-V4.672`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。本轮只修 `ScreenTextWorkspace.test.tsx` stale 用例中候选异步读取面的显式等待，不改生产 ScreenText、业务行为或其他测试健康项。

> FIFO250 规划关闭门审计结论：SYSTEM-07C 产品纵向矩阵通过，但唯一完整 `pnpm check` 退出码为 1，因此不直接关闭。两项稳定编号归入测试健康返工而非产品状态机：`QA-SYSTEM-07C-CHECK-001` 为独立临时库 pre-review `afterAll` 的冗余清理在全套顺序运行中超过 10 秒；`QA-SYSTEM-07C-CHECK-002` 为 ScreenText stale 用例等待一个异步面后同步读取另一候选面，存在确定测试竞态。登记 FIFO251/BACK 与 FIFO252/FRONT 并行做最小测试专用修正；禁止增加 sleep、fallback 或仅调大 timeout。两项交回后仅由 TEST 再执行一次完整 `pnpm check`，退出码 0 才关闭 SYSTEM-07C。

> FIFO250 正式唤醒已发送且运行态已确认：全链测试固定对话在新 turn 原样回显 `handoffToken=FIFO250-TEST-SYSTEM-07C-R1-V4.669`，回执 `repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`，现已进入 `inProgress` 并先写回领取状态。规划停止业务实现，仅持续监督纵向集成、清理与完整关闭门。

> FIFO250 已完成独立纵向验收并交规划复核：正式 Fastify + system-frontend production build + 从零隔离 PostgreSQL + 零网络 strategy Worker + 系统 Chrome 矩阵产品项全部通过，P0/P1/P2/P3=`0/0/0/0`；报告 `docs/testing/SYSTEM-policy-learning-07c-integration-report.md`。本切片唯一完整 `pnpm check` 真实跑完但保留两项非产品既有套件差量（pre-review afterAll 10 秒 hook 超时、ScreenText stale 异步夹具缺 checkbox），对应单文件/专项复跑通过，已稳定编号交规划决定。隔离库、端口、Worker、Chrome 与临时 harness 已精确清理，共享 PostgreSQL 55432 保持原状态。

> FIFO249 已由规划完成独立原始证据审计并关闭：保留 `fifo249-results.json` 原始 `5/8`，不改写测试结果；规划逐项核对 `requestFacts`、原始 body、`Idempotency-Key`、两张截图与 `fifo249-adjudication.json`，确认三项“失败”均由通用 harness 错误优先记录 `impactRunId` 导致。真实事实为同一 rollback `releaseCommandId` 三次 GET=`503/503/200`，两次 approval 使用不同 `approvalId`/key，两次 release 使用不同 `releaseCommandId`/key；恢复入口鼠标可达、确定冲突 ErrorBlock 焦点与 console 0/0 成立。产品裁决 `8/8`、P0/P1/P2/P3=`0/0/0/0`。`FRONT-SYSTEM-07C Rev5` 转 `done`；登记 FIFO250 `TEST-SYSTEM-07C Rev1`，只由全链测试对话执行独立纵向集成与本切片唯一完整 `pnpm check` 关闭门。

> FIFO249 固定任务交接已闭环：规划新 turn 原样回显 `handoffToken=FIFO249-FRONT-SYSTEM-07C-R5-V4.665`，确认收到 CURRENT v4-667、docs/ui §23 与原始/人工对账证据，正在独立核对 raw requestFacts、body、Idempotency-Key 和 `5/8 → 8/8` 归因。FIFO249=`active`，`FRONT-SYSTEM-07C Rev5` 保持 `review / Current actor=规划对话 / Reviewer=规划对话`，TEST 暂不解锁；UI 停止执行。

> FIFO249 `FRONT-SYSTEM-07C Rev5` 定向 UI 微终验已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。正式 production React + Fastify + 从零 35 迁移隔离 PostgreSQL + 零网络 Worker + 系统 Chrome 已关闭 FIFO247 两项原失败：rollback unknown 恢复入口可见/可点/同命令只读恢复/成功焦点与迟到响应成立；impact/approval/release 确定409刷新后的 ErrorBlock 焦点及下一动作新 ID/body/key 成立；读取恢复与公共文案无回归。P0/P1/P2/P3=`0/0/0/0`，生产代码修改0，等待规划决定 TEST。

> FIFO249 送达前快照：原始 harness 汇总为 `5/8`，三项末尾断言均因通用记录字段把 `impactRunId` 优先于 approvalId/releaseCommandId 而误判；原始 requestFacts 明确为 rollback 同 releaseCommandId `GET 503/503/200`，approval/release 两次 body 与 key 均使用新稳定身份。原始 JSON 保留，另有 adjudication JSON。隔离库残留0、31249/32249无监听、临时 harness 已删除，共享 PostgreSQL 55432保持 running；当时 FIFO249=`notification_pending`，现已按上方送达确认更新为 `active/review`。

> FIFO249 `FRONT-SYSTEM-07C Rev5` 定向 UI 微终验已领取并进入执行：`handoffToken=FIFO249-FRONT-SYSTEM-07C-R5-V4.665`；permission_ok：`repo_root=C:\\Users\\ComradeGu\\Documents\\七猫兼职\\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。任务保持 `review / Current actor=UI设计对话 / Reviewer=UI设计对话`，FIFO249=`active`；仅复验 FIFO247 两项原失败与一条读取恢复抽查，生产代码修改 0，TEST 继续 blocked。

> FIFO248 已由规划独立复验通过并关闭：代码核对确认 rollback unknown 会清比较 Drawer 的局部身份但保留完整 `releaseCommandId + action + versionId` 恢复身份，同命令 GET 不再依赖已清空的 `selectedVersionId`，成功转到 versions 并聚焦 Wave C 标题；确定性 4xx 不再设置读取恢复焦点标记，唯一 ErrorBlock 保持焦点，读取恢复成功标题焦点不回归。规划新鲜运行管理员六文件 `75/75`、system-frontend typecheck、42 modules production build 与 diff-check 全通过。FIFO249 只由 UI 在正式环境复验 FIFO247 两个原失败场景；其余矩阵冻结，TEST 继续 blocked。

> FIFO248 `FRONT-SYSTEM-07C Rev5` 已完成并转 `review / Current actor=规划对话 / Reviewer=规划对话`。`handoffToken=FIFO248-FRONT-SYSTEM-07C-R5-V4.662`；rollback unknown 现在关闭比较 Drawer 但保留同一 `releaseCommandId + action=rollback` 恢复意图，唯一动作显示“查询本次策略恢复结果”，成功后回到版本事实/标题且不重开历史 Drawer；确定性 impact/approval/release 4xx 清理 Modal/旧意图并刷新权威事实，ErrorBlock 保持安全焦点，下一次显式动作使用新稳定身份。共享 `CommandRecovery` 仅增加可选展示文案参数，默认文案、DOM 与焦点行为不变。定向策略 13/13、管理员六文件组合 75/75、system-frontend typecheck、Vite 42 modules production build、git diff-check 全通过；未跑完整 pnpm check/完整浏览器矩阵/Impeccable，未改 backend/contracts/migrations/DESIGN/Wave B/员工站，未提交/推送/部署。等待规划独立复验。

> FIFO248 `FRONT-SYSTEM-07C Rev5` 已由前端开发对话领取并进入 `in_progress`。`handoffToken=FIFO248-FRONT-SYSTEM-07C-R5-V4.662`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。本轮只关闭 rollback unknown 的 Drawer 覆盖/恢复身份门与确定性 4xx 的错误焦点所有权，后端、契约、DESIGN、CSS/视觉主体、Wave B、其他 FIFO247 证据冻结。

> FIFO248 `FRONT-SYSTEM-07C Rev5` 已由规划完成根因归并并准备定向派发。`handoffToken=FIFO248-FRONT-SYSTEM-07C-R5-V4.662`；只修两项同源焦点所有权：rollback unknown 时关闭比较 Drawer 但保留同一 releaseCommand 恢复意图，使唯一查询动作可见、可点击且不重发 POST；确定性 4xx 刷新权威事实后保留唯一 ErrorBlock 焦点，不再借用读取恢复的标题焦点标记。后端、契约、DESIGN、CSS/视觉主体、Wave B 与其他已通过证据冻结；TEST 继续 blocked。

> FIFO247 已由规划完成独立归因并关闭：恢复入口遮挡来自比较 Drawer 继续保持 fixed 高层，页面级 CommandRecovery 虽可程序聚焦但无法指针命中；确定性冲突的 `clearConflict` 错误复用了 `readRecoveryFocus`，导致刷新结束后标题抢走 ErrorBlock 焦点。两项均为同一前端焦点/覆盖所有权，不需要后端或 UI 重做，合并至 FIFO248。

> FIFO247 `FRONT-SYSTEM-07C Rev4` UI 变化场景微终验已完成并转 `review / Current actor=规划对话`。最终正式 production React + Fastify + 从零隔离 PostgreSQL + 零网络 Worker + 系统 Chrome 六组变化场景拆为 8 项裁决，`4 passed / 4 failed`；失败归并为两项 P1：rollback unknown 恢复按钮被仍打开的比较 Drawer 遮挡，三类确定性 409 的安全错误焦点被刷新后的 Wave C 标题夺走。P0/P1/P2/P3=`0/2/0/0`，TEST 继续 blocked，生产代码修改 0。

> FIFO247 已确认通过：1440/1024 当前→目标双栏与 `420/350 ms、0.800000/0.750000` 单行 token；history 中性进入、显式固定 version GET、关闭/Escape/触发点恢复和迟到响应；分页清理与分页外固定 GET；target/baseline/history/version/impact/approval 六读取面的 stale/requestId/锁写/唯一重读/再次失败/成功标题焦点。正式 rollback 的服务端 POST/同命令 GET、target 200、唯一当前生效和历史不改写也成立，仅 UI 恢复入口遮挡不通过。

> FIFO247 最终证据位于仓库外 `fifo247-system-07c-ui-evidence`：JSON、1440/1024 比较截图及 rollback unknown 遮挡截图。应用 console error/warn=`0/0`、pageerror=`0`；19 条浏览器网络诊断与受控 503/409 身份逐一匹配。隔离库前缀残留 0，31247/32247 无监听，测试 Chrome 已关闭，共享 PostgreSQL 55432 保持 running；未跑完整 pnpm check，未提交/推送/部署。

> FIFO247 `FRONT-SYSTEM-07C Rev4` UI 变化场景微终验已领取并进入 `in_progress`。`handoffToken=FIFO247-FRONT-SYSTEM-07C-R4-V4.658`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`。本轮只以正式 production React + Fastify + 从零隔离 PostgreSQL + 零网络 Worker + 系统 Chrome 复验六组变化场景；FIFO242/245 其余通过矩阵冻结，生产代码修改 0，TEST 继续 blocked。

> FIFO246 已由规划独立复验通过并关闭：代码核对确认 `versions→impact→approval` 保留同一服务端版本上下文，只有进入/离开 history 与历史分页清除历史局部身份；历史页初始不再自动读取详情或打开 Drawer，显式“比较”才建立触发点与固定 version GET。比较 Drawer 保留当前→目标双栏，每侧字段改为单列，值列最小 110px，数值 token 不换行，窄于既有断点才堆叠。规划新鲜运行管理员六文件 `72/72`、system-frontend typecheck 与 42 modules production build全通过。FIFO247 仅由 UI 用正式环境复验双视口可读性和 FIFO245 未裁决的五组状态/焦点场景；其余完整矩阵冻结，TEST 继续 blocked。

> FIFO246 `FRONT-SYSTEM-07C Rev4` 已完成并转 `review / Current actor=规划对话`。`handoffToken=FIFO246-FRONT-SYSTEM-07C-R4-V4.655`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。历史/版本/影子验证/批准连续工作流保留同一 selectedVersion；仅进入/离开 history 或历史分页清理失效局部身份，历史页先中性列表，显式“比较”才打开 Drawer。比较保留当前→目标双栏，每侧字段单列、数值 token 与单位完整可读；未改后端、契约、DESIGN、Wave B、员工站或业务状态。

> FIFO246 定向验证已完成：策略 Wave C `10/10`、管理员六文件组合 `72/72`、system-frontend typecheck、Vite 42 modules production build、git diff-check 均通过（仅既有 LOCAL_APP_PARITY CRLF 提示）。新增回归覆盖 history 中性进入/显式比较、Escape/触发点恢复、分页清理、versions→impact→approval 同版本上下文、比较区 `350 ms / 0.750000` token 结构；未跑完整 pnpm check/完整浏览器矩阵/Impeccable，未提交、推送或部署。下一步只由规划独立复验后唤醒 UI/TEST。

> FIFO245 已由规划完成集中归因并关闭：比较 Drawer 仍使用“外层双栏 × 每侧字段双栏 × 行内 145px 标签”的三重横向切分，导致 `420 ms / 0.750000` 在 1440/1024 都被压成逐字符纵排；同时从其他阶段进入“历史与恢复”仍沿用 `selectedVersionId`，违反 DESIGN 5.17“切换标签即清除旧详情和选择”的身份门，并造成 Drawer 未经本页“比较”触发即自动打开。FIFO246 `FRONT-SYSTEM-07C Rev4` 只一次收口这两个同源问题：历史页先呈现中性服务端列表、显式点击“比较”才开 Drawer；比较区在两视口保持当前→目标字段 token 可读。后端、契约、Wave B、其他已通过行为冻结；TEST 继续 blocked，待前端交回后仅由 UI 补齐 P1 与五组未裁决场景。

> FIFO245 `FRONT-SYSTEM-07C Rev3` UI 变化场景复验已完成并转 `review / Current actor=规划对话`。最终正式运行 12 组中 7 组有效通过，确认基线首发、自定义第二次发布、同一 target 200/唯一当前生效、真实迟到响应保护、中文动态标题、双视口与控制台门；5 组因历史页既有选择自动打开 Drawer 后与 harness 点击顺序冲突而未裁决，不冒充通过或产品失败。真实 1440/1024 均复现比较数值逐字符纵向断行 P1，P0/P1/P2/P3=`0/1/0/0`，TEST 继续 blocked。生产代码修改 0。

> FIFO244 已由规划独立复验通过并关闭：代码核对确认 runtime version 固定 GET 为唯一详情来源，确定冲突清 Modal/恢复意图并刷新权威事实，历史 Drawer 显式关闭后不再由基线 effect 重开，读取失败统一保留 stale/requestId/唯一原查询重读并锁写；标题焦点、中文动态发布文案与比较区断行已按 FIFO242 归因收口。规划新鲜运行管理员 6 文件 `70/70`、system-frontend typecheck、42 modules build、diff-check 全通过。现仅路由 UI 对 FIFO242 原失败变化场景做一次定向真实复验；完整矩阵与已通过证据冻结，TEST 继续 blocked。

> FIFO244 `FRONT-SYSTEM-07C Rev3` 已完成集中收口并转 `review / Current actor=规划对话`：同一 Wave C 标题真实聚焦、导入/批准/发布后固定版本 GET 不再被旧缓存遮蔽、确定冲突清理 Modal/恢复意图并刷新权威事实、历史 Drawer 关闭不重开、读取失败保留 stale/requestId 与唯一重读并锁写入口、用户文案/动态发布标题/严格字段可读性及 1024 覆盖布局已收口；FIFO243 target 500 修复事实保留，UI/TEST 继续 blocked。定向管理员组合 `6 files / 70 tests`、strategy Wave C `21/21`、system-frontend typecheck、Vite 42 modules build、git diff-check 全通过；未跑完整 pnpm check/完整浏览器矩阵，未提交/推送/部署。`handoffToken=FIFO244-FRONT-SYSTEM-07C-R3-V4.643`，等待规划独立复验。

> FIFO243 已由规划独立复验通过并关闭：代码核对确认响应 schema 只移除会被 Fastify/JS 浮点误判的 `multipleOf` 元数据，输入与持久规则包仍由两条正式服务边界统一执行 0..1 与最多六位十进制校验，没有 fallback、第二查询或伪健康。规划新鲜运行 runtime `9/9`、contracts/backend build、check:repo、git diff-check 全通过；第二次发布→target 200→正式 rollback→target 200 与历史不可改写回归成立。FIFO244 前端继续 in_progress，UI/TEST 仍 blocked。

> FIFO243 `BACK-SYSTEM-07C Rev6` 已完成并转 `review / Current actor=规划对话`。从零隔离 PostgreSQL 正式 HTTP 已复现并修复第二次批准版本发布后 target GET 500：根因是共享严格 rule-pack 响应 schema 的十进制 `multipleOf=0.000001` 被 Fastify serializer 对合法 `0.8` 按二进制浮点误判；移除 serializer 不安全的 multipleOf 元数据，后端仍以六位十进制精度校验输入/持久版本。已移除测试临时诊断，第二次发布→target 200→正式 rollback→target 200、旧版本 retired/contentDigest 不变回归通过。新鲜 runtime 9/9、contracts/backend typecheck/build、check:repo、git diff --check 全通过；未新增迁移、未接外部服务、未运行完整 pnpm check。`handoffToken=FIFO243-BACK-SYSTEM-07C-R6-V4.643`，等待规划唤醒确认；FIFO244 in_progress 事实保留。

> 用户已于重启后明确“继续”。规划已恢复项目 PostgreSQL 55432，并完成 `COORD-RESTART-20260818C` 四角色新 turn 探针：UI/BACK/FRONT/TEST 均原样回执 `restart_wake_ok`，协作指纹重新有效。FIFO243/244 沿用原 Rev 与 handoffToken 从保留中间态续接：后端先移除临时诊断后继续真实 500 根因复现，前端核对已落盘半成品后继续集中返工；不重复已完成分析，UI/TEST 继续 blocked。

> 用户因电脑明显卡顿准备重启，已下达即时暂停。FIFO243/244 均停止在安全边界：保留已落盘源码/测试，不回滚、不提交、不推送，不继续测试、构建或派发；`BACK-SYSTEM-07C Rev6` 与 `FRONT-SYSTEM-07C Rev3` 统一转 `blocked / Current actor=规划对话 / Reviewer=用户`，重启后仍沿用原 handoffToken 和 Rev 续接。规划进程检查未发现项目 Node/pnpm 测试进程；本地 PostgreSQL 已通过唯一 `pnpm db:stop` 优雅停止。剩余两个 Node 进程均为 Codex 自身 `kernel.js/trusted-worker.js`，未误停。UI/TEST 继续 blocked。

> FIFO244 `FRONT-SYSTEM-07C Rev3` 已领取并进入 `in_progress`。`handoffToken=FIFO244-FRONT-SYSTEM-07C-R3-V4.643`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。本轮只集中收口 Wave C 焦点、权威版本缓存、冲突/Drawer/stale 门、中文与动态标题、比较可读性及 1024 覆盖布局；不绕过 FIFO243 target 500。

> FIFO243 `BACK-SYSTEM-07C Rev6` 已领取并进入 `in_progress`。`handoffToken=FIFO243-BACK-SYSTEM-07C-R6-V4.643`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。本轮只在精确隔离 PostgreSQL 复现第二次发布后 runtime-target 500，修真实投影根因并补 200/rollback 回归；FIFO244、迁移与其他状态机冻结。

> FIFO242 已由规划完成集中归因并关闭交接：正式 UI 矩阵 57 项中 44 通过/13 失败。真实生产修复拆为两个互不重叠工作包：FIFO243 后端只复现并修复“第二个已批准版本发布 201 后同一 runtime-target GET 500”；FIFO244 前端集中修复标题焦点引用、批准后陈旧版本缓存、确定冲突清意图、历史 Drawer 关闭重开、stale/唯一重读、中文文案/动态发布标题、比较区断行与 1024 覆盖布局。`QA-SYSTEM-07C-COVERAGE-01` 属后续 UI 真实迟到响应证据，不要求前端再造第二实现；受控 403/409/500/503 产生的 Chrome `Failed to load resource` 属预期网络诊断，关闭门改为“应用 `console.error/warn=0`、无未捕获异常，且预期非 2xx 与断言身份完全匹配”，禁止通过伪 200 或吞错消除。FIFO243/244 可并行，UI/TEST 继续 blocked。

> FIFO240/241 已由规划联合复验通过：后端稳定版本 GET 与前端同 ID 异步恢复路径完全一致，规划新鲜运行 backend runtime + 6 个管理员前端文件为 `7 files / 77 tests` 全通过；system-frontend typecheck/42 modules build、contracts/backend build、check:repo 与 diff-check 全通过。FIFO242 只做正式 React + Fastify + 精确隔离 PostgreSQL + 零网络 Worker 的 Wave C 完整 UI 终验；TEST 继续 blocked。

> FIFO241 `FRONT-SYSTEM-07C Rev2` 已完成并转 `review / Current actor=规划对话`。`handoffToken=FIFO241-FRONT-SYSTEM-07C-R2-V4.634`；本轮仅补正常 impact `201 queued` 后同一 impactRunId 的唯一查询/恢复、分页外版本的固定 GET、迟到响应丢弃；Rev1 其余冻结，等待规划复验。

> FIFO240 `BACK-SYSTEM-07C Rev5` 已领取并进入 `in_progress`。`handoffToken=FIFO240-BACK-SYSTEM-07C-R5-V4.634`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。本轮只补按 `strategyVersionId` 读取正式 pre_review runtime version 的稳定 GET 与分页外直接读取回归；迁移、写状态机、前端与 FIFO241 冻结。

> FIFO240 `BACK-SYSTEM-07C Rev5` 已完成并转 `review / Current actor=规划对话`。固定 GET 已按 `strategyVersionId` 直接查询 `strategy_artifact_versions` 且强制 `runtime_module=pre_review`，错误模块/不存在稳定 404、逐请求 strategy:read 与零写副作用成立；runtime 专项 9/9、contracts/backend typecheck、check:repo、git diff-check 通过。`handoffToken=FIFO240-BACK-SYSTEM-07C-R5-V4.634`，等待规划确认送达；FIFO241 前端 review 事实保留。

> FIFO239 `FRONT-SYSTEM-07C Rev1` 已由规划定向退审：规划新鲜复跑 6 个管理员前端文件 `64/64`、typecheck 与 42 modules production build 均通过，但发现两项未被现有测试覆盖的 P1。其一，正常创建 impact 返回 `201 queued` 后页面把该对象长期保存在本地，既不读取同一 `impactRunId`，也不允许同身份继续查询，Worker 完成后仍显示排队；其二，历史版本详情通过前100个资产×前100个版本扫描定位，超过分页窗口会无法打开，违反服务端分页与权威恢复。FIFO240 后端补稳定版本详情 GET，FIFO241 前端并行接该固定端点并补 queued/running/unknown 同一身份查询；UI/TEST 继续 blocked。

> FIFO239 `FRONT-SYSTEM-07C Rev1` 已完成并转 `review / Current actor=规划对话`。`handoffToken=FIFO239-FRONT-SYSTEM-07C-R1-V4.631`；permission_ok：`repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`、`permission_profile=workspace-write/:workspace`、`ordinary_writes=direct`（普通仓库编辑不走 `auto_review`）。本轮只在 `system-frontend/` 与对应前端测试实现既有 `/strategy` Wave C；UI/TEST 仍 blocked，后端/契约/DESIGN/员工站冻结，等待规划独立复验与 UI/TEST 终验。

> FIFO237 `BACK-SYSTEM-07C Rev3` 已由规划独立退审：发布必填证据、版本级状态和正式 HTTP 正向链已成立，但 impact 仍只冻结 sampleRefs，Worker 执行时重新读取可变业务表；claim→执行→完成又处于同一未提交事务，崩溃会整体回滚且队列只发现 queued，不能形成真正的固定快照、过期 running 接管或 unknown 持久恢复。新鲜组合测试 3 个策略文件 12 项通过，pre-review 7 项因默认数据库仍是旧 schema、缺 runtime_status 而全部 skipped。FIFO238 `BACK-SYSTEM-07C Rev4` 只修快照字节冻结、分事务租约/接管和隔离测试环境；FRONT/UI/TEST 继续 blocked。

> FIFO238 `BACK-SYSTEM-07C Rev4` 已完成并转 `review / Current actor=规划对话`：`handoffToken=FIFO238-BACK-SYSTEM-07C-R4-V4.628`。ImpactRun 现在在创建事务内冻结候选/当前版本摘要、排序 cue、质量/时长、术语证据和项目/会话/集/组/item 身份；Worker 只读不可变 `snapshot_input`，claim/finalize 分离为短事务，过期租约持久化旧 Attempt=unknown 后由新 Attempt 接管，成功结果受 owner 条件保护。所有相关后端测试改用精确临时数据库，FRONT/UI/TEST 继续 blocked，待规划复核。

> FIFO238 已由规划独立复验通过并关闭：代码核对确认 `snapshot_input` 与数据库不可变触发器覆盖实际评测输入，Worker 不再读取实时审改表；claim/evaluate/finalize 跨事务、过期 running 接管、旧 Attempt=unknown、迟到完成保护和异常持久 unknown 均成立。规划新鲜运行 runtime/pre-review/strategy/optimization 四文件 `22/22`，contracts/backend build、check:repo、migration node-check 与 diff-check 全通过。FIFO239 `FRONT-SYSTEM-07C Rev1` 只消费冻结的正式合同实现同一 ControlShell Wave C；UI/TEST 继续 blocked。

> FIFO229 `BACK-ENV-POSTGRES-01 Rev1` 已由规划独立微审关闭：`tools/local-postgres.mjs` 只把唯一启动日志移至既有 ASCII `postgresStateRoot`，`node --check`、`db:start/status`、`pg_isready 127.0.0.1:55432` 与幂等启动均通过；数据、业务状态和数据库身份未改变。PostgreSQL 55432 保持 running。

> SYSTEM-07B 已正式关闭：测试固定任务完成 Fastify + production system-frontend + 34 migrations + 零网络 Worker + 系统 Chrome 1440/1024 全链验收，P0/P1/P2/P3=0；规划唯一完整 `pnpm check` 为 38 files / 355 tests 全绿并完成四工作区构建。Codex Browser 组件限制继续后置，不再影响产品验收。

> SYSTEM-07C 首模块启动包和 Wave C 交互语义已冻结：只切换“前置审改本地规则”，使用 `pre_review_local_rule_pack_v1` 严格字段载荷；默认规则作为受保护不可变数据库历史长期保留并可人工恢复。UI 中文业务文案已通过规划复审并关闭，当前只剩后端权威链实施；FRONT/TEST 继续 blocked。

## 1. 当前阶段与进度

| 轨道 | 权重 | 当前完成 | 当前事实 |
| --- | ---: | ---: | --- |
| 员工生产网站 | 60 | 约 55 | 约 92%；S1–S7、真实素材冒烟与交付链已关闭，剩统一任务中心和生产细节收口 |
| 管理员系统控制台 | 20 | 约 20 | 策略 Wave C 首模块受控生效/回滚与完整关闭门已通过；本地零网络控制面主框架闭合，真实厂商接入仍属生产化轨道 |
| 两站对接与真实生产化 | 20 | 约 6 | 本地零网络配置、运行聚合和权限边界已验证；真实供应商、Secret、Cloudflare、对象存储与部署未开始 |
| **完整产品** | **100** | **约 82** | 员工主链与管理员本地零网络控制面已闭合；剩统一任务中心和真实厂商/云端生产接入 |

当前授权门：真实 Secret、外部网络、付费 API、云资源、提交/推送和部署仍需用户单独授权；所有主费用继续统一按人民币 CNY 表达。

## 2. 协作链路审计结论

根因不是个人账号缺少协作能力，而是旧 API 阶段留下的执行习惯与状态歧义：角色完成后只写 CURRENT 或在自己的 final 中说“交规划”，没有真正发送固定任务消息；规划任务不是常驻后台，因此不会因文件变化自动产生新 turn。

本轮只读探针 `COORD-AUDIT-20260818-01`：

| 角色 | 固定任务 ID | send/read/wait | 角色→规划真实回流 | 当前任务态 |
| --- | --- | --- | --- | --- |
| UI 设计对话 | `01a012fb-e9f3-7801-a660-b22518eeea0c` | available / available / available | `outbound_wake_ok`，规划新 turn 已确认 | idle |
| 后端开发对话 | `01a00445-1878-7072-bfd3-f44de3504a3f` | available / available / available | `outbound_wake_ok`，规划新 turn 已确认 | idle |
| 前端开发对话 | `01a00445-1c71-72d3-9171-33ad2c36e941` | available / available / available | `outbound_wake_ok`，规划新 turn 已确认 | idle / FIFO221 paused |
| 全链测试与质量验收对话 | `01a0065d-ce1c-7f11-94d8-56b91f062cf8` | available / available / available | `outbound_wake_ok`，规划新 turn 已确认 | idle |
| 测试服务器接入与问题记录任务 | `01a01d0c-3f0f-7f73-801e-d3298d631428` | available / available / available | FIFO292 同令牌回执完成，当前 `waiting_for_user` | idle / 等待测试机输入或用户口述问题 |

v4.9 已新增：唯一 `handoffToken`、`notification_pending → delivered → active → closed` 状态机、`notification_blocked`、账号/Provider 切换后四角色探针、规划每个新 turn 的接力扫描，以及“角色 final/文件变化不等于唤醒”的硬门。

## 3. 当前任务

| ID | Rev | Owner | Current actor | Reviewer | Status | 当前事实 / 下一步 |
| --- | ---: | --- | --- | --- | --- | --- |
| `UI-SYSTEM-09` | 2 | UI 设计对话 | 规划对话 | 规划对话 | `done` | FIFO290：规划微审确认人工终点与真实 RoutingTarget 完全分离；最小 Chrome 24/24、P0–P3=0，FIFO288 其余49项冻结 |
| `BACK-SYSTEM-09A` | 3 | 后端开发对话 | — | 规划对话 | `done` | 有序目标、安全前进、逐目标容量与不可变执行身份已纳入 FIFO309/FIFO311 最终全链关闭证据 |
| `BACK-SYSTEM-09B` | 3 | 后端开发对话 | — | 规划对话 | `done` | 本地 OCR sidecar 严格协议、真实帧/权威时长、fail-closed 并发槽与 unknown 边界通过最终全链门 |
| `BACK-SYSTEM-09C-OPS` | 2 | 后端开发对话 | — | 规划对话 | `done` | route/target/effect、Attempt 链与 AdvanceEvent 只读投影通过最终全链门，connection unknown 不误报未受理 |
| `FRONT-SYSTEM-09C` | 6 | 前端开发对话 | — | 规划对话 | `done` | routing/changes/logs 正式页面及最终焦点收口通过 production Chrome 矩阵，P0–P3=0 |
| `TEST-SYSTEM-09` | 2 | 全链测试与质量验收对话 | — | 规划对话 | `done` | FIFO311：37迁移隔离库唯一完整 pnpm check 46 files/447 tests 全通过，SYSTEM-09 正式关闭 |
| `BACK-TEST-HEALTH-02` | 1 | 后端开发对话 | — | 规划对话 | `done` | FIFO310：清理所有权根因关闭；正反序15/15、邻近31/31、规划组合15/15，零残留 |
| `BACK-DEPLOY-RUNTIME-01` | 1 | 后端开发对话 | — | 规划对话 | `done` | FIFO329：contracts正式ESM dist/exports、干净构建、普通Node import及部署产物闭环经规划复核通过 |
| `BACK-DEPLOY-STORAGE-01` | 2 | 后端开发对话 | — | 规划对话 | `review` | FIFO332：逐级 namespace symlink 防护、并发 part 授权锁、Delivery 无 uploads 副作用与本地磁盘专项回归完成；真实DB专项留测试服务器复验 |
| `BACK-CLOUDFLARE-ACCESS-01` | 2 | 后端开发对话 | 规划对话 | 规划对话 | `review` | FIFO336：物理删除员工 Cloudflare AUD verifier/配置；仅 system-control control AUD 门；员工 loopback 受信头映射 employee principal；Access 专项9/9、contracts/backend构建、check:repo、diff-check通过 |
| `BACK-EMPLOYEE-SESSION-01` | 1 | 后端开发对话 | 后端开发对话 | 规划对话 | `in_progress` | FIFO338：员工登录、14天安全 Cookie 会话、CSRF 与员工/管理员身份隔离实现中；不改迁移、前端、DESIGN 或真实服务器配置 |
| `BACK-MATERIAL-FOLDER-01` | 1 | 后端开发对话 | 规划对话 | 规划对话 | `review` | 新增 create_upload 稳定 commandId 只读恢复 GET；既有目录映射/暂停继续单一状态源保留；contracts/backend build、check:repo、diff-check通过，uploads 专项待本地PG恢复后复验 |
| `TEST-SERVER-OPS-01` | 5 | 测试服务器接入与问题记录任务 | — | 规划对话 | `done` | FIFO327：国内三源手动1轮+timer连续2轮均3/3、原阈值与5±1分钟门通过；仅证明一天试用时间基线 |
| `TEST-SERVER-DEPLOY-01` | 3 | 测试服务器接入与问题记录任务 | 规划对话 | 规划对话 | `blocked` | FIFO330：新release/build/contracts运行门通过；production缺真实UploadStorage，等待FIFO331正式本地磁盘存储产品修复，不临时绕过 |
| `PLAN-COORD-01` | 1 | 规划对话 | — | 用户 | `done` | 协作链路复审、四角色真实回流探针、AGENTS/WORKFLOW v4.9 和 CURRENT 精简已完成 |
| `PLAN-M3-08` | 1 | 规划对话 | — | 用户 | `done` | 统一任务中心唯一入口、六类领域投影、无通用任务表、旧ASR全局入口移除与关闭门已冻结 |
| `UI-M3-08` | 1 | UI 设计对话 | — | 规划对话 | `done` | FIFO254：`/tasks` 列表/详情/领域动作/完整状态与双视口已冻结；Chrome 38/38、Impeccable SHIP，生产代码修改0 |
| `BACK-M3-08A` | 3 | 后端开发对话 | — | 规划对话 | `done` | FIFO257：六类只读投影、执行状态、完整子结果、路径与动作已规划复验；无迁移/通用任务表/新Worker |
| `FRONT-M3-08B` | 4 | 前端开发对话 | — | 规划对话 | `done` | FIFO264正式UI三场景9/9、P0–P3=0；规划复核关闭 |
| `TEST-M3-08` | 1 | 全链测试与质量验收对话 | — | 规划对话 | `done` | FIFO265：正式纵向矩阵16/16、唯一完整 pnpm check 41 files/389 tests、四工作区构建与清理均经规划复核关闭 |
| `PLAN-SYSTEM-08` | 1 | 规划对话 | — | 用户 | `done` | 用户确认自由探索反馈、显式截图、管理员闭环、历史保留/重开和未来脱敏 Sentry；不做测试清单、会话录像或自动截图 |
| `PLAN-P3-01` | 1 | 规划对话 | 用户 | 用户 | `review` | 四角色只读审计已合并为唯一准备文档；等待用户确认供应商/协议/区域留存/Secret引用/14→1→26/¥10每集与¥30总额/质量门 |
| `UI-SYSTEM-08` | 1 | UI 设计对话 | — | 规划对话 | `done` | FIFO266：规划核对设计/验收/22项结果/关键截图并关闭；两站低干扰入口、显式截图、管理员闭环、双视口与焦点冻结，生产代码0 |
| `BACK-SYSTEM-08A` | 2 | 后端开发对话 | — | 规划对话 | `done` | FIFO268：规划独立复验 feedback 6/6、contracts/backend build 与 check:repo 通过；真实截图字节、权限、全局幂等、历史分页和最小列表正式关闭 |
 | `FRONT-SYSTEM-08B` | 7 | 前端开发对话 | — | 规划对话 | `done` | FIFO281 原始12/12与请求/console/清理证据经规划审计通过；完整反馈前端矩阵关闭 |
| `TEST-SYSTEM-08` | 1 | 全链测试与质量验收对话 | — | 规划对话 | `done` | FIFO282：规划核对45/45、唯一完整pnpm check 44 files/418 tests、四工作区构建与清理后关闭 |
| `UI-SYSTEM-07B` | 2 | UI 设计对话 | — | 规划对话 | `done` | Wave B 设计、候选四类动作、unknown/冲突/焦点与双视口已冻结 |
| `BACK-SYSTEM-07B` | 2 | 后端开发对话 | — | 规划对话 | `done` | Optimization/Candidate/Decision/Evaluation 权威链和 decisionId 不可变 GET 已通过 |
| `FRONT-SYSTEM-07B` | 3 | 前端开发对话 | — | 规划对话 | `done` | 正式前端、15/15 状态矩阵与测试任务真实 Chrome 全链证据通过 |
| `BACK-ENV-POSTGRES-01` | 1 | 后端开发对话 | — | 规划对话 | `done` | 唯一 ASCII 启动日志路径、55432 ready 与幂等启动已独立复验；不改 data、业务状态或数据库身份 |
| `ENV-BROWSER-01` | 3 | 规划对话 | — | 规划对话 | `done` | 诊断完成：内置 Browser 与 Chrome 扩展通道共用的底层服务均拒绝自身 `browser-service.mjs`，与项目/账号/协作无关；不再叠加配置，作为 Codex 组件限制后置 |
| `TEST-SYSTEM-07B` | 1 | 全链测试与质量验收对话 | — | 规划对话 | `done` | 独立纵向验收 P0/P1/P2/P3=0；报告 `docs/testing/SYSTEM-policy-learning-integration-report.md`；完整 pnpm check 38 files/355 tests 与构建通过 |
| `PLAN-SYSTEM-07C` | 1 | 规划对话 | — | 用户 | `done` | 用户确认严格结构化规则、显式基线导入、零网络影子评测与受控发布；默认基线作为不可变历史保留并可人工恢复 |
| `UI-SYSTEM-07C` | 3 | UI 设计对话 | — | 规划对话 | `done` | 六类员工可见工程词已统一为中文业务投影；规划核对 1440/1024 证据、DOM、焦点、根/表滚动与工程身份注释后关闭，生产代码修改0 |
| `BACK-SYSTEM-07C` | 6 | 后端开发对话 | — | 规划对话 | `done` | FIFO243 规划独立复验通过：合法0.8不再触发响应序列化500，六位精度仍在后端强校验；第二次发布/读取/回滚/历史不变成立 |
| `FRONT-SYSTEM-07C` | 5 | 前端开发对话 | — | 规划对话 | `done` | FIFO249 原始证据规划审计通过：保留 raw 5/8，三项 harness 误判由 request/body/key 复核为产品 8/8，P0–P3=0 |
| `TEST-SYSTEM-07C` | 2 | 全链测试与质量验收对话 | — | 规划对话 | `done` | FIFO253 Rev2 唯一完整门 40 files/377 tests 全绿；两项测试健康差量未再出现，零残留关闭 |
| `BACK-TEST-HEALTH-01` | 1 | 后端开发对话 | — | 规划对话 | `done` | FIFO251 规划差异审查通过；单一临时库清理链、7/7、邻近16/16和零残留成立 |
| `FRONT-TEST-HEALTH-01` | 1 | 前端开发对话 | — | 规划对话 | `done` | FIFO252 规划差异审查通过；两个同根异步等待、连续14/14与组合89/89成立 |

## 4. 规划接力队列

| FIFO | handoffToken | 状态 | 当前动作 |
| ---: | --- | --- | --- |
| 332 | `FIFO332-BACK-DEPLOY-STORAGE-01-R2-V4.879` | `review` | 逐级 namespace symlink 防护、并发 part 授权锁、Delivery 隔离副作用与权限/实例重建回归完成；DB-backed 链留测试服务器复验 |
| 335 | `FIFO335-BACK-CLOUDFLARE-ACCESS-01-R1-V4.885` | `review` | Access JWT/JWKS、双 audience、生产配置硬门与 readiness 已完成；本地 RSA/JWK 6/6、contracts/backend build、check:repo、diff-check 通过，待规划复核 |
| 331 | `FIFO331-BACK-DEPLOY-STORAGE-01-R1-V4.877` | `closed` | Rev2 已在同一实现上完成收口并转 review |
| 330 | `FIFO330-TEST-SERVER-DEPLOY-01-R3-V4.876` | `blocked` | 新release与构建通过；D命中真实对象存储硬门，等待FIFO331复核后再发新不可变release恢复令牌 |
| 329 | `FIFO329-BACK-DEPLOY-RUNTIME-01-R1-V4.874` | `closed` | contracts正式ESM运行时产物、exports、干净构建、普通Node及部署文档经规划复核通过 |
| 328 | `FIFO328-TEST-SERVER-DEPLOY-01-R2-V4.873` | `closed` | A–C与37/37迁移完成，contracts运行时首因已由FIFO329产品修复关闭；部署转FIFO330新release继续 |
| 327 | `FIFO327-TEST-SERVER-OPS-01-R5-V4.872` | `closed` | 国内三源手动1轮与timer连续2轮全部3/3通过，失败计数0；时间门关闭并转FIFO328 loopback部署 |
| 326 | `FIFO326-TEST-SERVER-OPS-01-R5-V4.871` | `closed` | 全新 domestic-only trial 已由FIFO327三轮实测通过并收口 |
| 325 | `FIFO325-TEST-SERVER-OPS-01-R4-V4.869` | `closed` | Rev4手动六源门因spread2.375s>2s失败，未校时、未启timer两轮；已恢复timesyncd并关闭试用部署，无Rev5 |
| 324 | `FIFO324-TEST-SERVER-OPS-01-R4-V4.868` | `closed` | systemd目录管理与静态门通过，手动首轮结果转FIFO325；按任一失败即停收口，无timer两轮或应用部署 |
| 323 | `FIFO323-TEST-SERVER-OPS-01-R3-V4.866` | `closed` | 安全回滚与状态/端口核对完成；雨云一天试用未通过可信时间门，不再Rev3、不续费，服务器任务转blocked等待新决策 |
| 322 | `FIFO322-TEST-SERVER-OPS-01-R3-V4.865` | `closed` | 专属目录修正仍在首轮mkdir权限失败；按停止门转FIFO323安全回滚，不再第三次修补 |
| 321 | `FIFO321-TEST-SERVER-OPS-01-R3-V4.864` | `closed` | 共享日志根不可chown，专属子目录修正已执行但timer首轮仍失败，转FIFO322停止裁决 |
| 320 | `FIFO320-TEST-SERVER-OPS-01-R3-V4.863` | `closed` | 226/NAMESPACE首因修正后发现共享日志所有权边界，转FIFO321专属目录方案 |
| 319 | `FIFO319-TEST-SERVER-OPS-01-R3-V4.862` | `closed` | 密钥文件名少一个o根因关闭，公钥SSH及三资产上传/静态门恢复成功 |
| 318 | `FIFO318-TEST-SERVER-OPS-01-R3-V4.861` | `closed` | IAB/VNC与安全SSH路径恢复链已由FIFO319关闭 |
| 317 | `FIFO317-TEST-SERVER-OPS-01-R3-V4.860` | `closed` | 旧daemon截图门通过并进入资产上传；后续结果统一收口至FIFO323 |
| 316 | `FIFO316-TEST-SERVER-OPS-01-R3-V4.859` | `blocked` | 截图确认旧htpdate仍active+enabled；已派发单次stop+runtime mask+只读复核，等待用户回传inactive+masked-runtime截图 |
| 315 | `FIFO315-TEST-SERVER-OPS-01-R3-V4.858` | `blocked` | 只读状态命令已提交一次但结果无法由工具读取；等待用户直接回传当前VNC终端截图，不再执行命令 |
| 314 | `FIFO314-TEST-SERVER-OPS-01-R3-V4.857` | `blocked` | 用户已重开VNC，Edge扩展/内置浏览器仍无法读取；保持verification_pending，改由用户手动执行单条只读systemctl show并回传无敏感截图 |
| 313 | `FIFO313-TEST-SERVER-OPS-01-R3-V4.856` | `blocked` | Rev3先决门因雨云VNC画面连续超时停在verification_pending；等待用户刷新/重开VNC，恢复后第一步仅只读确认旧daemon状态 |
| 312 | `FIFO312-TEST-SERVER-OPS-01-R2-V4.855` | `closed` | Rev2六源一致性通过、内置常驻调度不通过；规划选择A并转FIFO313验证单一htpdate oneshot+timer先决门 |
| 311 | `FIFO311-TEST-SYSTEM-09-R2-V4.847` | `closed` | 37迁移隔离库唯一完整 pnpm check 46 files/447 tests 全通过；规划复核后正式关闭 SYSTEM-09 |
| 310 | `FIFO310-BACK-TEST-HEALTH-02-R1-V4.844` | `closed` | 清理所有权/关闭顺序已通过后端正反序与规划15/15复验，转FIFO311最终门 |
| 309 | `FIFO309-TEST-SYSTEM-09-R1-V4.839` | `closed` | 正式产品/浏览器矩阵 P0–P3=0；清理钩子健康差量经 FIFO310 修复并由 FIFO311 唯一完整门复验通过 |
| 308 | `FIFO308-FRONT-SYSTEM-09C-R6-UI-R1-V4.836` | `closed` | logs 单项10/10、P0–P3=0；37项迁移口径经规划校正并纳入最终关闭证据 |
| 306 | `FIFO306-FRONT-SYSTEM-09C-R5-UI-R1-V4.830` | `review` | 正式微复验22/23，P0/P1/P2/P3=0/1/0/0；logs恢复pending焦点落BODY，已集中交规划 |
| 305 | `FIFO305-FRONT-SYSTEM-09C-R5-V4.827` | `review` | 三项P1合并收口已通过规划代码门，等待FIFO306正式微复验 |
| 304 | `FIFO304-FRONT-SYSTEM-09C-R4-UI-R1-V4.824` | `review` | 正式微复验26/29、P0/P1/P2/P3=0/3/0/0；三项集中交规划，生产代码0、TEST继续blocked |
| 303 | `FIFO303-FRONT-SYSTEM-09C-R4-V4.821` | `review` | 三项焦点 P1 已完成；管理员组合98/98、typecheck、Vite45 modules、diff-check通过，待规划复验 |
| 302 | `FIFO302-FRONT-SYSTEM-09C-R3-UI-R1-V4.818` | `review` | 正式UI矩阵112/115；三项焦点P1已集中交规划，生产代码0，TEST继续blocked |
| 301 | `FIFO301-FRONT-SYSTEM-09C-R3-V4.815` | `review` | `/logs` 正式 operations 执行链与中文安全投影完成，待规划复核 |
| 298 | `FIFO298-BACK-SYSTEM-09B-R3-V4.805` | `ready` | 等待后端领取最后三项 sidecar 诚实运行边界；不接真实模型/服务器/网络 |
| 297 | `FIFO297-FRONT-SYSTEM-09C-R2-V4.802` | `closed` | 规划独立 34/34、管理员组合 91/91；有序编辑与分页选择缺口关闭 |
| 296 | `FIFO296-BACK-SYSTEM-09B-R2-V4.801` | `closed` | 严格 schema/真实 frame extractor 主体通过；底层 invoke 占槽与相对几何/权威时长转 FIFO298 |
| 295 | `FIFO295-FRONT-SYSTEM-09C-R1-V4.796` | `closed` | routing/changes 主体通过独立测试；有序编辑两项微返工转 FIFO297，logs 缺口另走后端投影 |
| 294 | `FIFO294-BACK-SYSTEM-09B-R1-V4.796` | `closed` | Rev1测试通过但规划发现runtime schema、Adapter自有超时/并发、视频/帧语义三项缺口，集中转FIFO296 |
| 293 | `FIFO293-BACK-SYSTEM-09A-R3-V4.792` | `closed` | 规划从零隔离库38迁移后串行复跑5文件50项全绿、残留0；关闭09A并解锁BACK09B/FRONT09C |
| 292 | `FIFO292-TEST-SERVER-OPS-01-R1-V4.786` | `closed` | 准备清单、问题台账和 harness 诚实指标边界经规划复核通过；固定任务 waiting_for_user，真实接入另待授权 |
| 291 | `FIFO291-BACK-SYSTEM-09A-R2-V4.785` | `closed` | Rev2 专项通过但规划发现旧数据迁移可生成多个preferred，且queueLimit/perProjectMax仍非逐目标计数；集中转FIFO293 |
| 289 | `FIFO289-BACK-SYSTEM-09A-R1-V4.774` | `closed` | Rev1测试通过但规划发现跨池顺序、旧role、401/403门与容量执行四项缺口，集中转FIFO291 |
| 290 | `FIFO290-UI-SYSTEM-09-R2-V4.779` | `closed` | 规划已核对验收、源码、results.json 与两张新截图；唯一跨契约 P1 关闭，UI-SYSTEM-09 Rev2=done |
| 288 | `FIFO288-UI-SYSTEM-09-R1-V4.774` | `delivered` | UI 已写回 review、发送八项差量包并确认规划固定任务新 turn/inProgress；等待规划审核，不通知 FRONT/BACK/TEST |
| 286 | `FIFO286-UI-P3-01D-R1-V4.772` | `closed` | 只读旅程审计完成：既有ControlShell可复用；确认缺少服务端受控小样本身份，真实付费前P0阻断 |
| 285 | `FIFO285-TEST-P3-01C-R1-V4.772` | `closed` | 只读试跑矩阵完成：冻结14→1→26、质量门、CNY止损、故障注入和脱敏证据边界 |
| 284 | `FIFO284-FRONT-P3-01B-R1-V4.772` | `closed` | 只读前端审计完成：两站骨架可复用；真实运行时、任务诊断/费用/恢复投影需后端权威事实 |
| 283 | `FIFO283-BACK-P3-01A-R1-V4.772` | `closed` | 只读后端审计完成：零网络链闭合，真实adapter/Secret resolver/transport/media/error mapping尚未闭合 |
| 282 | `FIFO282-TEST-SYSTEM-08-R1-V4.769` | `closed` | 规划核对报告、45/45、唯一完整门44 files/418 tests与零残留后关闭SYSTEM-08 |
| 281 | `FIFO281-FRONT-SYSTEM-08B-R7-V4.765` | `closed` | 规划核对原始12/12、13次主GET、4个受控503、零串请求与完整清理后关闭FRONT，解锁TEST |
| 280 | `FIFO280-FRONT-SYSTEM-08B-R7-V4.761` | `closed` | 规划新鲜 23/23、typecheck、45 modules build、diff-check 与完成回调/queryKey 代码门通过；转 FIFO281 |
| 279 | `FIFO279-FRONT-SYSTEM-08B-R6-V4.757` | `closed` | A/F/console正式通过；G同根焦点意图转FIFO280 |
| 278 | `FIFO278-FRONT-SYSTEM-08B-R6-V4.754` | `closed` | 规划新鲜21/21与源码所有权门通过；转FIFO279 UI变化复验 |
| 277 | `FIFO277-FRONT-SYSTEM-08B-R5-V4.750` | `closed` | B–E正式通过；A/F焦点所有权转FIFO278，G stale留UI同批复验 |
| 276 | `FIFO276-FRONT-SYSTEM-08B-R5-V4.747` | `closed` | 规划新鲜19/19及源码/真实按钮焦点回归通过，转FIFO277 UI变化复验 |
| 275 | `FIFO275-FRONT-SYSTEM-08B-R5-V4.744` | `closed` | 规划复核主体通过；下一页缺 focusRequest 且 JSDOM 测试未模拟真实按钮焦点，集中转 FIFO276 |
| 274 | `FIFO274-FRONT-SYSTEM-08B-R5-V4.742` | `closed` | 专项12/12但规划源码门未通过；三处遗漏集中转FIFO275，不送UI |
| 273 | `FIFO273-FRONT-SYSTEM-08B-R4-V4.739` | `closed` | 正式矩阵 P0/P1/P2/P3=0/6/0/0；规划确认六组均归前端Rev5，stale一项留变化复验 |
| 272 | `FIFO272-FRONT-SYSTEM-08B-R4-V4.736` | `closed` | 规划新鲜9/9、typecheck、195 modules build与通知/冲突代码审查通过；转FIFO273 UI终验 |
| 271 | `FIFO271-FRONT-SYSTEM-08B-R3-V4.733` | `closed` | 新鲜7/7及主体成立；规划发现AppShell“反馈未提交”与已创建部分事实矛盾、确定冲突被旧partial闭包覆盖，转FIFO272 |
| 270 | `FIFO270-FRONT-SYSTEM-08B-R2-V4.731` | `closed` | 规划新鲜 3/3 基线通过，但发现截图子链无显式续传出口与项目编号输入即查询两项所有权缺口，统一转 FIFO271 |
| 269 | `FIFO269-FRONT-SYSTEM-08B-R1-V4.728` | `closed` | 主体与专项基线成立；规划发现截图诚实恢复、同范围摘要/完整查询、列表详情和员工上下文/冲突焦点缺口，集中转 FIFO270 |
| 268 | `FIFO268-BACK-SYSTEM-08A-R2-V4.725` | `closed` | 规划逐文件核对并新鲜复跑 feedback 6/6、contracts/backend build、check:repo 后关闭后端门 |
| 267 | `FIFO267-BACK-SYSTEM-08A-R1-V4.717` | `closed` | 主体和专项基线成立；规划交叉审查发现五组阻断正式前端的合同缺口，集中转 FIFO268，不拆散补丁 |
| 266 | `FIFO266-UI-SYSTEM-08-R1-V4.717` | `closed` | 规划核对主体设计、22/22、双视口/焦点/隐私与同 Rev1 文字校正后关闭；FRONT仍等待BACK |
| 265 | `FIFO265-TEST-M3-08-R1-V4.714` | `closed` | 规划核对报告、脱敏summary、双视口/权限/清理与唯一完整门后关闭 M3-08 |
| 264 | `FIFO264-FRONT-M3-08B-R4-V4.711` | `closed` | UI三场景9/9、P0–P3=0，规划关闭FRONT并解锁TEST |
| 263 | `FIFO263-FRONT-M3-08B-R4-V4.708` | `closed` | 规划代码复验与正确员工frontend 192 modules build通过；转FIFO264 |
| 262 | `FIFO262-FRONT-M3-08B-R3-V4.705` | `closed` | 14通过/3失败/0未裁决；剩余三项P1转FIFO263 |
| 261 | `FIFO261-FRONT-M3-08B-R3-V4.703` | `closed` | 规划核对实现并新鲜运行tasks 9/9；进入FIFO262变化复验 |
| 260 | `FIFO260-FRONT-M3-08B-R2-V4.699` | `closed` | 正式UI矩阵产品裁决30通过/3失败/5未裁决，三项P1转FIFO261 |
| 259 | `FIFO259-FRONT-M3-08B-R2-V4.696` | `closed` | 规划核对实现并新鲜运行 tasks 7/7；四项同根读取/身份缺口关闭，转 FIFO260 |
| 258 | `FIFO258-FRONT-M3-08B-R1-V4.693` | `closed` | 主体实现与验证完成，规划审计发现同根重读/深链/unknown/身份门缺口，转 FIFO259 |
| 256 | `FIFO256-BACK-M3-08A-R2-V4.687` | `closed` | Rev2 主体复核后同源投影差量转 FIFO257，最终 BACK-M3-08A 已关闭 |
| 254 | `FIFO254-UI-M3-08-R1-V4.681` | `closed` | UI正式方向与证据经规划复核关闭，最终 M3-08 已完成 |
| 253 | `FIFO253-TEST-SYSTEM-07C-R2-V4.677` | `closed` | 规划核对报告、完整门与清理证据；SYSTEM-07C 正式关闭，转统一任务中心规划预检 |
| 252 | `FIFO252-FRONT-TEST-HEALTH-01-R1-V4.672` | `closed` | 规划核对仅两处异步等待，无生产差异/断言放宽；连续14/14、关键组合89/89通过 |
| 251 | `FIFO251-BACK-TEST-HEALTH-01-R1-V4.672` | `closed` | 规划核对单一清理所有权，无timeout/sleep/fallback；7/7、邻近16/16、零临时库通过 |
| 250 | `FIFO250-TEST-SYSTEM-07C-R1-V4.669` | `closed` | 产品纵向矩阵通过；完整门真实退出1，规划不伪关闭，两个测试健康差量路由 FIFO251/252 |
| 249 | `FIFO249-FRONT-SYSTEM-07C-R5-V4.665` | `closed` | 保留原始5/8；规划逐项核对requestFacts/body/key和截图，确认3项均为harness错误取impactRunId，产品8/8、P0–P3=0，解锁TEST |
| 248 | `FIFO248-FRONT-SYSTEM-07C-R5-V4.662` | `closed` | 规划新鲜 75/75、typecheck、42 modules build、diff-check通过；恢复身份与冲突焦点代码审查成立，路由 FIFO249 |
| 247 | `FIFO247-FRONT-SYSTEM-07C-R4-V4.658` | `closed` | 规划确认两项 P1 均为前端焦点/覆盖所有权，合并至 FIFO248；其余正式矩阵冻结 |
| 246 | `FIFO246-FRONT-SYSTEM-07C-R4-V4.655` | `closed` | 规划代码审查与新鲜 6 files/72 tests、typecheck、42 modules build、diff-check通过；连续流程与历史身份门没有互相回归，路由 FIFO247 |
| 245 | `FIFO245-FRONT-SYSTEM-07C-R3-V4.651` | `closed` | 规划集中归因完成：P1 为比较区三重横向切分；历史页自动开 Drawer 同时违反 DESIGN 5.17 查询身份门，合并至 FIFO246；五组未裁决不冒充通过或产品失败 |
| 244 | `FIFO244-FRONT-SYSTEM-07C-R3-V4.643` | `closed` | 固定任务送达与同令牌新 turn 已确认；规划新鲜管理员70/70、typecheck、42 modules build、diff-check通过，路由FIFO245 |
| 243 | `FIFO243-BACK-SYSTEM-07C-R6-V4.643` | `closed` | 状态、固定任务唤醒与同令牌新 turn 已确认；规划新鲜 runtime 9/9、双构建、仓库/差异门通过，500 根因关闭 |
| 242 | `FIFO242-FRONT-SYSTEM-07C-R2-V4.639` | `closed` | 规划已完成集中归因；真实缺陷进入 FIFO243/244，迟到响应与预期非2xx console口径留 UI 变化场景复验 |
| 241 | `FIFO241-FRONT-SYSTEM-07C-R2-V4.634` | `closed` | 规划与FIFO240联合复验通过：queued/running/unknown同ID查询、迟到响应保护与固定version GET成立，路由FIFO242 |
| 240 | `FIFO240-BACK-SYSTEM-07C-R5-V4.634` | `closed` | 规划联合复验通过：稳定版本GET、分页外直接读取、权限/404/零写副作用与runtime专项成立 |
| 239 | `FIFO239-FRONT-SYSTEM-07C-R1-V4.631` | `closed` | 自动测试/构建通过但规划发现正常 queued 无查询路径与100×100历史扫描两项P1，合并至FIFO240/241，不送UI |
| 238 | `FIFO238-BACK-SYSTEM-07C-R4-V4.628` | `closed` | 规划代码审查与新鲜 4 files / 22 tests、双构建、仓库/迁移/差异门通过；解锁 FIFO239，不直接解锁 UI/TEST |
| 237 | `FIFO237-BACK-SYSTEM-07C-R3-V4.625` | `closed` | 发布/版本/provenance 已通过；固定快照和租约恢复仍不成立，标准组合测试暴露默认库旧 schema，合并至 FIFO238 |
| 236 | `FIFO236-BACK-SYSTEM-07C-R2-V4.621` | `closed` | 定向测试通过但测试/实现仍把 SQL 伪造批准与可选发布证据当成功，固定快照 Worker 未执行真实规则；合并至 FIFO237 |
| 235 | `FIFO235-BACK-SYSTEM-07C-R1-V4.614` | `closed` | 送达与专项通过；规划代码/契约审查发现四组结构性 P1，合并至 FIFO236，不接受 SQL 直写夹具替代正式链 |
| 234 | `FIFO234-UI-SYSTEM-07C-R3-V4.614` | `closed` | 规划有界复审通过：六类生产可见工程词命中0，两张最小证据保持同壳布局与1024内部滚动，API稳定身份仅留工程注释；无新增P0–P3 |
| 233 | `FIFO233-UI-SYSTEM-07C-R2-V4.610` | `closed` | 四项 P1 与同壳 1440/1024 原型证据通过；规划另登记非阻塞工程词 P2 至 FIFO234 |
| 232 | `FIFO232-UI-SYSTEM-07C-R1-V4.606` | `closed` | 状态/唤醒/送达已确认；规划审查发现四项跨 UI/API P1，合并进入 FIFO233，不解锁后端 |
| 231 | `FIFO231-TEST-SYSTEM-07B-R1-V4.601` | `closed` | 规划独立复核报告、清理与新鲜完整 pnpm check 通过；SYSTEM-07B 正式关闭 |
| 230 | `FIFO230-FRONT-SYSTEM-07B-R3-V4.598` | `closed` | 15/15 自动矩阵通过但真实 Chrome 主链未执行；生产代码0，规划将缺口合并进 FIFO231，不再原地重派 UI |
| 229 | `FIFO229-BACK-ENV-POSTGRES-01-R1-V4.595` | `closed` | 规划独立微审通过；ASCII 日志路径、启动/状态/ready/幂等证据成立，PostgreSQL 55432 保持 running |
| 228 | `FIFO228-FRONT-SYSTEM-07B-R3-V4.591` | `closed` | 交回已核对；harness 第一条 admin.query 等待无响应的 55432。规划确认挂死项目 postgres 占端口但 pg_isready 失败并精确停止；根因转 FIFO229 |
| 227 | `FIFO227-FRONT-SYSTEM-07B-R3-V4.587` | `closed` | environment_blocked 已核对；规划精确停止6个无监听旧 Node 后错误仍在，排除内存泄漏；正常用户上下文同一 tsx 命令成功，转 FIFO228 |
| 226 | `FIFO226-ENV-BROWSER-01-R1-V4.578` | `closed` | UI 新 turn 只执行一次最小探针并交回同一令牌；当前应用不会自动重建已停止的 MCP 服务，等待用户完整重启 Codex |
| 225 | `FIFO225-FRONT-SYSTEM-07B-R3-V4.574` | `closed` | environment_blocked 交回与清理已核对；产品 15/15/build/Fastify/34 migrations 证据保留，阻塞转独立环境探针 |
| 224 | `FIFO224-FRONT-SYSTEM-07B-R3-V4.572` | `closed` | 规划已确认令牌、差量与新鲜 13/13/typecheck；无新路径或越界，路由 UI |
| 223 | `FIFO223-FRONT-SYSTEM-07B-R2-V4.570` | `closed` | 送达与三项原缺口通过；规划发现同根新建 unknown 身份遗漏，转 FIFO224，不送 UI |
| 222 | `FIFO222-PLAN-COORD-01-R1-V4.569` | `closed` | 协作专项审计完成；四角色通道均真实回流，v4.9 生效 |
| 221 | — | `closed` | 用户已恢复业务；暂停解除，既有实现不重复编码，缺口转入 FIFO223 微返工 |

二次重启探针 `COORD-RESTART-20260818B-UI/BACK/FRONT/TEST` 均由对应固定任务主动回流并确认规划新 turn；四任务均为 `workspace-write`、普通仓库写入可用、send/read/wait 可用。协作链路已恢复；Browser 组件限制已与产品验收解耦，后续正式 UI 证据使用项目既有 Playwright 与系统 Chrome。

## 5. v4.9 运行门

1. 规划每个新 turn 先扫描 CURRENT 和四个固定任务，再处理新业务。
2. 跨角色交接必须携带 `FIFO<序号>-<任务ID>-R<Rev>-V<同步版本>`；目标新 turn 原样回显后才算 active。
3. 角色自己的 final、`Current actor=规划对话`、文件写回、发送接口成功或 `subAgentActivity` 均不算送达。
4. 账号、Provider、wire API、模型通道、Codex 重启或固定任务重建后，先暂停业务并重跑四角色只读探针。
5. CURRENT 只保留活跃任务、未关闭 FIFO 和最近协作结论；v4.296–v4.568 完整旧快照已归档至 `docs/status/archive/CURRENT-v4.296-through-v4.568.md`。
6. 未经用户明确要求，不提交、不推送、不部署、不接真实付费服务、不调用 Superpowers。

长期输入：

- 产品路线：`docs/milestones/PRODUCT_ROADMAP.md`
- 模块职责：`docs/contracts/MODULE_RESPONSIBILITY_MATRIX.md`
- 模块衔接：`docs/contracts/MODULE_INTEGRATION_CONTRACTS.md`
- 协作协议：`docs/WORKFLOW.md`
- 完整过程：`docs/logs/DEVELOPMENT_LOG.md`
- 历史快照：`docs/status/archive/`
