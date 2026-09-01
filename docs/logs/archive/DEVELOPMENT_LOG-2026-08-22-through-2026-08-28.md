# 开发日志归档（2026-08-22 至 2026-08-28）

> 从实时短页机械迁移；正文未改写。原正文 SHA-256：$tailHash。
> 本文件只读，不参与当前调度。

## 2026-08-28｜本地 OCR Provider 与唯一 active route 上线

- 生产候选复用既有 05D Node 依赖闭包并 overlay 05G 构建，解决把增量 archive 当完整 release 的启动失败；backend、OpenVINO、screen-text 与 connection-test Worker 均 active，当前 `NRestarts=0`。connection-test 实例补齐 `/usr/local/bin/node --preserve-symlinks-main` 后，唯一测试以一次 attempt 在约 1054ms 内 succeeded。
- 管理控制面只创建一个 OpenVINO deployment/version/test；登记与测试各 POST 一次。唯一 screen_text route 依次 create/test/impact/approve 各一次、publish 一次，影响检查活动任务/待对账/失败测试均为 0，最终 active target 为本地 OpenVINO、preferred、并发1/单项目1/队列20。
- 未访问真实素材或创建业务任务，COS 与业务队列保持 0；下一门仅用一个合成项目验证真实业务 Worker 及私有 COS evidence 读回，不再重做 Provider、模型、连接测试或路由发布。

## 2026-08-23｜multipart完成阶段改为持久化异步核验

- BACK将multipart完成请求收敛为事务内校验、创建唯一持久任务并返回`202/verifying`；独立Worker在外部Complete前先落`write_in_flight`，完成后按同一objectKey执行Head与摘要核验，再以唯一事务创建Asset和素材绑定。HTTP请求链不再合并对象或回读整对象计算SHA。
- unknown恢复禁止第二次Complete、禁止新建multipart或列表扫描；租约接管阻止旧Worker修改新owner事实。项目回收与在飞Complete竞态通过晚到对象补偿删除关闭，普通MP4共享ASR/画面字角色与专用文件独立Asset语义保持不变；旧TUS只保留兼容基线，不是当前方向。
- 规划以真实失败驱动三轮审查，修复重试SQL类型、TUS跨项目访问、测试隔离、租约丢失和旧同步测试合同。新鲜复验7个上传测试文件44/44、BACK typecheck/build、迁移语法与限定diff-check通过；未连接ROS、服务器或部署，候选仍须真实浏览器能力探针确认。

## 2026-08-23｜ROS候选的精确身份与真实并发完成本地收口

- BACK把multipart取消合同收敛为必须同时携带UploadId与objectKey，create回滚、显式取消、项目回收/清理均复用既有业务身份；S3活动实现移除`ListMultipartUploads`扫描回退。专项纯存储和S3命令测试通过，BACK typecheck与全仓build通过，未连接ROS或服务器。
- FRONT将文件队列与数据面并发拆开为最多2个活跃文件、全局最多3个真实对象存储PUT；单文件分片可并行，回执合并不倒退。规划拦截了“pause中止在途PUT并自动重排”的初版，Rev1改为在途PUT自然完成且只confirm一次、暂停只阻止新PUT并及时释放未使用许可。
- 规划新鲜复验前端上传4文件37/37、FRONT typecheck、全仓build与行尾检查通过。数据库相关上传/回收组合为41/42；唯一旧断言仍是multipart响应不应公开`storageUploadId`，与本轮精确Abort改动无关，单列后续收口。当前仍未实施异步完成/核验，真实ROS能力保持unknown。

## 2026-08-23｜真实 ROS 浏览器探针收口到证据与供应商边界

- 唯一真实 Edge 导航已到达短时探针页，但服务器wrapper未保留final summary；基础设施清理确认0，对象/multipart残留因身份丢失只能记为unknown。未刷新、未第二次导航，也未扫描列表或盲发写/清理命令，因此尚不能把ROS直传candidate写成已验证。
- BACK只加固独立探针的终态证据合同：清理后一次性输出脱敏终态，页面显示RUNNING/PASS/BLOCKED/UNKNOWN，signal、TTL与provider失败均覆盖；规划新鲜复验专项9/9、BACK typecheck、全仓build和两文件行尾检查通过，未改业务上传协议或连接服务器/ROS。
- 官方ROS文档已确认S3兼容、私有桶和临时上传URL，但没有说明multipart孤儿过期/计费、`ListMultipartUploads`、浏览器`ETag`暴露及完整API边界。规划只整理问题，由用户向雨云客服发送；答复返回前不重跑真实探针、不派发BACK/FRONT实施。

## 2026-08-23｜独立 ROS 浏览器探针工具通过

- SERVER 临场探针两次只形成只读基线，审计恢复确认未生成 UploadId、对象、helper、Nginx location 或临时目录；一次无配置变更 reload 后业务 current、监听和服务状态保持基线，残留为 0。规划停止第三次临场拼脚本，改由固定 BACK 形成可测试工具。
- BACK 仅新增 `backend/src/tools/ros-browser-probe.ts` 与对应专项测试：工具禁用默认、只监听回环、强 token、10分钟上限、单次 capability、真实同源页面、合成两片、脱敏输出与超时/signal清理，不接业务 API 或数据库。
- 规划首轮审核发现 Delete/Abort 回执不足以证明零残留；同一 BACK 定向补为 Delete 后同对象 Head=missing、Abort 后同 UploadId ListParts=NoSuchUpload 才通过，禁止 GetObject 摘要回读和 ListMultipartUploads 扫描。
- 新鲜复验：专项 7/7、BACK typecheck、BACK build、两文件 diff-check 全绿。工具本身未连接 ROS/服务器；下一门仅由固定 SERVER 执行用户已授权的真实浏览器探针。

## 2026-08-23｜ROS 直传能力探针安全停止

- 规划按正式 lease 仅派固定 SERVER 验证真实 ROS multipart 与浏览器 Origin；规划侧连续空回执后，没有替换任务或重复写，而是要求同一 Owner 先核对旧动作，并通过唯一脱敏部署报告文件补齐可审计交接。
- SERVER 结论为 `blocked` 而非 capability fail：当前安全浏览器控制面无法在不部署测试入口或注入脚本的条件下，把短时预签名能力交给真实页面 Origin；curl/Node 不能替代真实浏览器 PUT/ETag 门。
- 本轮服务器连接、受保护配置读取、SDK 操作、ROS multipart/object 和临时资源均为 0，清理计数与残留均为 0；未修改 Bucket、线上服务或业务代码。
- 唯一恢复输入是用户明确授权一个高熵单次同源探针入口、回环 helper 与一次 Nginx reload；获授权前不派 BACK/FRONT，不把 candidate 写成已验证。

## 2026-08-23｜规划上下文换代与 ROS 直传候选收口

- 旧规划任务 `019ff4f8-4a77-7870-8edf-6350490b316c` 转为只读历史档案；当前本任务成为唯一活动规划，只继承权威摘要，后续仅在发现遗漏或事实冲突时按需回读旧规划相关最近片段。
- 更正“`PutBucketCors=501` 必然阻止预签名直传”的过时推论：该结果只证明 CORS 管理接口未实现；客服已确认预签名 URL 上传和跨域请求可用，但真实 ROS 浏览器 Origin 与 multipart SDK 兼容仍未探针验证。
- 唯一候选方向收敛为私有 ROS、后端短时签发、浏览器直接 multipart、后端异步完成/核验，Cloudflare 不承载文件字节；旧 TUS/`server_relay` 仅保留历史，不再作为当前执行方向。
- 本切片只更新协作协议、CURRENT 与本条聚合日志；未修改业务代码或服务器，未派发执行角色。ADR-0001 保持不变，M2 上传合同留待 BACK 正式实施切片更新，TUS 部署文档不改写。

## 2026-08-22｜雨云 CORS 501，切换为同源分片转发

- BACK/FRONT 对象存储 multipart 实现已由规划新鲜验证：后端 2 files/6 tests、前端 3 files/22 tests、两端 typecheck/build 与限定 diff-check 均通过；服务器 root-only 对象存储 env 已安全写入。
- SERVER 候选 `20260822-object-storage-v4947-r2` 完成 frozen install 与根 build，但真实 `PutBucketCors` 返回 `NotImplemented/HTTP 501`；未创建 multipart/object、未切换 current、未重启线上服务，私有桶无本轮残留。
- 产品方向不再依赖供应商 CORS：保留 16 MiB multipart、暂停/续传和现有 UploadSession，由主站同源分片路由验证短时 capability 后立即执行 S3 UploadPart。该路径每个请求低于 Cloudflare 单请求上限，不回退为 5.17 GB 整文件代理，也不建立第二业务状态源。

## 2026-08-22｜大文件上传转为雨云私有对象存储直传

- 用户已购买雨云 ROS `浙江宁波 #12440` 的 `20G 存储 + 100G 流量` 套餐并明确授权接入 Bucket `milaidi`；Bucket 继续保持私有，主站/登录继续走 Cloudflare，大文件数据面改为浏览器直达国内对象存储。
- 新方向不再尝试 443/18443 绕过机房 SNI 过滤，也不回退为整文件经 Fastify/Cloudflare 代理。既有 UploadSession、Asset、素材角色绑定、暂停/继续和 downstream objectKey 仍是唯一权威事实。
- 当前只并行 BACK 合同/适配器与 SERVER 无 Secret 预检；Secret 只允许进入服务器 root-only 配置，不进入聊天、仓库、日志、前端或任务证据。FRONT 与 TEST 等 BACK 合同后再接力，避免治理流程和重复烟雾测试拖慢实现。

## 2026-08-22｜tus M3 前端切换通过，进入快速 TEST 门

- FRONT 采用 headless `@uppy/core` + `@uppy/tus` 接入现有素材分类与角色绑定界面，16 MiB 分块、同源 Cookie、暂停/继续和会话恢复均由 TUS 驱动；活动源码已移除旧 authorizePart/PUT/confirmPart/uploadMissingParts 调用。
- 规划在中途发现固定 FRONT turn 长时间无产物后，以实际文件和新鲜 typecheck 收敛出两个编译错误并在同一固定任务续作，没有新建替代对话。随后拦截 create 异常自动重发风险，冻结为 Tus POST 最多一次、未知先 GET 同一业务会话、取得 storageUploadId 后才 HEAD/PATCH 恢复、complete 未知不重复 POST。
- 新鲜独立验证：上传队列、素材文件夹和 TUS 引擎 3 files / 19 tests 全绿；frontend typecheck、production build（307 modules）和限定 diff-check 通过。构建仅有既有大 chunk 警告。
- 当前只派固定 TEST 做前后端合同快速关闭门；不跑完整 `pnpm check`，通过后直接进入固定 SERVER 不可变 release、公网匿名小文件真传与回滚验证。
- 快速门随后由规划新鲜复验通过：FRONT 19/19、BACK 7/7、frontend/backend typecheck、限定 diff-check 全绿；固定 TEST 的消息观测仍为空，未作为通过证据。execution lease 已转给固定 SERVER 执行不可变发布。
- 原固定 SERVER 派发后超过15分钟持续零消息/工具/SSH或构建进程/部署文档变化；规划在相隔超过5分钟的两次只读快照中确认本轮写入为0并撤销租约。按 v6.3 硬门仅建立一个同名固定 SERVER 接替任务 `01a02748-34aa-7861-840f-4748bdc58958`，精确承接 UPLOAD-TUS-DEPLOY-01，原任务收到停止令牌且不得并行。

## 2026-08-22｜tus M2B 完成事务通过，转入 FRONT M3

- BACK M2B 已把 tus Upload-Length 完成字节提升到现有最终对象存储，再复用原 complete 幂等事务创建 UploadSession/Asset/material bindings；临时 tus resource 不作为 Asset objectKey 暴露，成功后清理。
- 规划新鲜复验 `upload-tus-spike/business/finalize` 3 files / 7 tests、BACK typecheck、限定 diff-check 全绿。覆盖未传满不完成、摘要异常零 Asset、跨项目拒绝、同命令重放唯一 Asset、共享普通视频双角色一次 Asset、专用 screen 独立 Asset、替换 screen 不改 asr。
- execution lease 已切到固定 FRONT 的 M3：采用 Uppy Core + Tus 的 headless 传输能力，保留项目现有分类/预览/进度界面，删除活动链上的旧自制 authorize/PUT/confirm 调用；完成后才进入独立 TEST 和测试服务器发布。

## 2026-08-22｜tus M2A 规划复验通过并进入 M2B

- 规划直接核对 M2A 实际文件并新鲜运行：`upload-tus-spike` + `upload-tus-business` 2 files / 4 tests、BACK typecheck、迁移 node-check、限定 diff-check 全部通过。
- M2A 已把 `/api/uploads/tus` 接到既有 UploadSession/create command 稳定身份，按员工主体和项目范围保护 POST/HEAD/PATCH；同 create 重放返回同一 Location，响应丢失可 GET 原 command 后 HEAD/续传，Fastify 重启不丢 offset。
- `transport_kind` 只用于阻止旧 multipart 与 tus 同时驱动同一 UploadSession，不建立第二业务会话。下一片 M2B 只收口 tus 完成字节到现有 Asset/manifest bindings 事务；通过后才允许 FRONT 切换传输层。

## 2026-08-22｜协作 v6.4 补齐可见接力硬门

- 重新审计发现：固定 BACK 的 tus M1/M2A turn 实际产生了文件和测试，但最近完成 turn 没有可见交接内容；同时 CURRENT 仍写 BACK idle。任务消息、线程状态、文件事实和看板四者发生偏离，用户无法确认协作是否继续。
- `AGENTS.md` 与 `docs/WORKFLOW.md` 升至 v6.4：固定 Owner 必须依次发 `task_received`、首个真实动作后的 `work_started`、结束时的 `artifact_written/blocked`；空完成不算有效接力，规划不得只凭 `active/inProgress` 推进下一片。
- 正式 execution lease 改为派发前写入 CURRENT、审核后清除；普通小修仍走轻量卡，不增加定时心跳、重复探针、替代对话或完整验收链。
- 当前先恢复 BACK M2A 的可见交付并做规划独立复验；通过后才进入 M2B，五个固定角色继续复用原任务 ID，不新建对话。
- v6.4 同步随后直发五个固定任务，五个 turn 均快速 `completed` 但没有可见消息/工具；BACK 再做“只回复 CHANNEL_ACK”的1.5秒最小探针，仍为 `latestAssistantMessageId=null`。因此阻塞收敛为后台续接通道异常，而不是任务卡复杂、权限、Owner 理解或业务执行耗时；当前停止继续后台派发。
- 用户随后提供固定 BACK 页面截图，证明后台探针及用户直接探针均实际显示 `CHANNEL_ACK`。因此更正：固定任务本体和消息通道可用，异常位于规划侧 `read_thread/wait_threads` 的消息观测；不替换固定任务、不重复权限握手，规划以后用可见任务、精确差量和新鲜验证交叉审核并在本对话镜像状态。

## 2026-08-21｜大文件上传改为先传后验并发布 v4934

- 公网 102 文件/5.17GB 复测证明请求未离开浏览器：原链在 `createUpload` 前计算整文件 SHA-256，并在分片上传成功后对同一 Blob 再算一次摘要；服务器同时段 create/authorize/PUT/confirm/complete 均为 0，根因不是 Nginx、Fastify、PostgreSQL 或磁盘。
- BACK 将 create 的整文件摘要改为可选，仅放宽进行中 `upload_sessions.checksum_value`；完成时以存储合并对象的服务端 SHA-256 为权威，同事务写回会话并创建 Asset。Asset 与分片摘要仍非空；旧带摘要客户端继续兼容，错误期望摘要稳定失败且不产生 Asset/绑定。
- FRONT 删除上传前整文件 hash 和分片确认前的重复 hash；分配确认后立即 `create → authorize → PUT → confirm`，进度只由服务端确认字节驱动。BACK 上传专项 23/23、FRONT 上传/目录组合 22/22，前后端 typecheck/build 均通过。
- SERVER 生成候选 `20260821-upload-direct-start-v4934`，PostgreSQL 37→38 且业务计数不变。部署中先后识别并修正候选目录权限、远端 shell 引号、2 秒单次 health 误判及 smoke 基线解析问题；修正探针证明候选约 3.13 秒 ready。
- 最终 backend `20260821-upload-direct-start-v4934` 与员工静态 `frontend-upload-direct-start-v4934` 已在线，readiness 3160ms；公网/loopback 首页、`/uploads`、health、未知 API JSON 和 `.map` 404 均通过。管理员静态、Worker、DNS/Tunnel/认证/防火墙未变，旧 release 保留回滚。

## 2026-08-21｜协作切换为 v6.3 固定角色轻量模式

- 根因确认：治理恢复期的逐任务权限探针、短空窗替代、三段强制接力、微步骤状态写回和重复全量验收被沿用到日常 bug 修复，协作成本已经明显超过开发成本；效率下降主要是流程设计问题，不是功能本身突然变复杂。
- `AGENTS.md` 与 `docs/WORKFLOW.md` 已切换到 v6.3：长期复用五个领域固定任务；同一权限代际缓存可写能力；普通小修只发轻量任务卡并由规划直接审核；默认最多2个、必要时最多3个并行角色。
- 固定角色替代新增硬门：至少15分钟连续零消息/工具/输出/文件变化，两次相隔至少5分钟的只读快照，精确范围零写入、无运行中动作，撤销原范围，并先向用户说明原因、证据和替代范围。短时沉默、长命令或外部等待不得触发替代。
- 六个固定任务标题统一为“职责名称｜长期固定”，已移除“可写替代”等恢复期字样；Rev、状态、权限代际和当前需求以后不进入标题。
- 完整 `pnpm check` 收敛到发布、合并或大型切片关闭前一次；测试夹具、宿主超时、派发口径和 harness 问题先与产品断言分离。CURRENT/日志只在里程碑和真实阻塞更新，不再记录每次探针、命令或同步版本。
- `CURRENT` 收敛至 v4-933，五个固定领域任务全部保留并待命；当前无业务活动任务、无产品 P0/P1 阻塞，下一步由用户公网测试反馈直接触发对应固定角色。

## 2026-08-21｜TEST 空 turn 已替换为新可见任务

- 原 TEST 收到 TEST-MATERIAL-RECYCLE-02 后约 4 分钟持续无消息、工具或产物；规划心跳后仍无变化，按 v6.2 该空 turn 不算接力，服务器/数据库/工作树动作均为 0。
- 原 TEST 已冻结归档；新建用户可见 `全链测试（可写替代）`，任务 ID `01a023b6-e562-7e61-8302-f6b1f2f7d136`，复用同一 Rev/token、精确范围和用户模型设置，不创建 worktree。
- 新 TEST 先完成 authority_generation=4 权限握手；若为 managed-root，须经规划精确探针后才可执行。CURRENT 更新至 v4-922，活动租约仍为1。

## 2026-08-21｜素材与回收实现收口，进入独立 TEST 门

- BACK Rev2 的 purge 同命令 GET 已通过规划核对：与 POST 共用 advisory lock，跨项目、异种命令和未知键安全 404；recycle 隔离专项 11/11，数据库残留 0。
- FRONT 回收站接入单项永久删除、服务端全分页快照清空、ID+version 二次比对、逐项非原子进度和 unknown GET；专项 8/8 后规划发现批量完成仍全局锁页，退回同 Owner 最小返工。
- FRONT Rev2 将全局锁收敛到真实 running/pending，完成进度可见但剩余项目恢复操作；移除全分页30秒轮询。专项 9/9、frontend typecheck/build、限定 diff-check 通过，规划完成 planning_received。
- UI/BACK/FRONT 实现阶段全部收口；签发 TEST-MATERIAL-RECYCLE-02 Rev1，只在隔离 PostgreSQL 和匿名小夹具做独立验收，禁止读取真实5.17GB素材、操作测试服务器现有项目或启动真实 ASR/OCR。CURRENT 更新至 v4-921，活动租约=1。

## 2026-08-21｜素材三级选择 FRONT 已收件，回收站进入合同恢复与界面接线

- FRONT managed-root 探针创建、读取、删除均通过且零残留；总系列文件夹、三角色独立文件夹、单槽替换、确认前零上传、共享 MP4 单次物理上传与同轮其他角色草稿保留已落入唯一 UploadQueue 路径。
- 修复了 UploadQueue 未闭合 JSX 与角色目录重算回退已确认 manifest 的根因；素材两专项 21/21、frontend typecheck、production build、限定 diff-check 通过。规划只读核对关键数据流后完成 planning_received，未部署。
- 规划审核发现 purge 首轮合同只有 POST 幂等事实，尚缺 UI unknown 所需的同命令只读查询；签发 BACK Rev2，以同 Idempotency-Key advisory lock 后读取，禁止用第二次删除 POST 查询结果。
- 同时签发 FRONT 回收站界面租约：单项永久删除、全分页权威快照清空、非原子逐项进度、二次确认和 unknown GET；不允许开发或测试清理服务器现有项目。CURRENT 更新至 v4-920，活动租约=2。

## 2026-08-21｜回收站永久删除后端已收件

- BACK 完成 managed-root 探针并零残留；实现 `POST /api/projects/:projectId/purge`，仅 recycled + expectedVersion + Idempotency-Key 可进入 purging，同参重放同事实、异参稳定 409，purging 不可恢复。
- 复用既有 `cleanup_jobs` 与 `project_lifecycle_commands`，没有迁移、批量命令表或第二状态源。“清空回收站”保持为前端跨服务端权威分页的逐项幂等调用，不伪装原子事务。
- 新增只运行 ProjectCleanupWorker 的 production 入口；它使用真实数据库与 FilesystemUploadStorage，不启动 ASR/OCR。
- recycle 隔离专项 10/10，contracts/backend typecheck/build、check:repo、限定 diff-check 通过，隔离库残留 0。规划完成 planning_received；未部署/未启动 Worker。CURRENT 更新至 v4-919，活动租约=1。

## 2026-08-21｜FRONT 空 turn 通道替换

- 原 G3 FRONT 任务收到素材分类租约后完成一个约 7 分钟空 turn；规划心跳触发的第二 turn 仍持续无消息、工具或产物。两轮均未发生业务写入。
- 规划已归档原任务并创建用户可见 `前端开发（可写替代）`，任务 ID `01a02398-34ac-7781-8cbf-1cd3dd87af32`；保持 `FRONT-MATERIAL-CLASSIFY-03-R1-V4.917` 的同一业务 Rev、精确路径与用户模型设置。
- 新任务先做 authority_generation=4 权限握手；通过后才消费已收件 UI artifact 开始实现。CURRENT 更新至 v4-918。

## 2026-08-21｜素材三级选择与回收清理 UI 语义已收件

- 新可见 UI 任务完成 managed-root 探针并零残留，归一化为 workspace-write-equivalent。
- `M2-material-pairing-acceptance.md` 已冻结总系列自动分类、逐集逐角色单文件替换、三种角色独立文件夹重算、共享 MP4 单次上传及确认前零上传。
- `M2-recycle-bin-acceptance.md` 已冻结单项永久删除、清空回收站二次确认、逐项非原子进度、失败继续与 purging 不可恢复；固化结论明确覆盖旧“无永久删除入口”描述。
- 规划已完成 planning_received 并把 UI artifact 同步给 FRONT/BACK；UI 转 review/idle。CURRENT 更新至 v4-917，活动租约=2。

## 2026-08-21｜UI 空 turn 通道替换

- 原 G3 UI 任务收到 `UI-MATERIAL-RECYCLE-02` 后连续两个新 turn 均为消息、工具和产物 0；两次均无业务写入，不计作 UI 方案失败。
- 规划已归档原任务并创建用户可见 `UI 设计（可写替代）`，任务 ID `01a02392-4d7b-7df1-8fa9-f16e539f2102`；保持同一 token、Rev、allowed_paths 与用户模型设置。
- 新任务先做 authority_generation=4 权限握手；未通过前不写 UI 文档。FRONT/BACK 租约不受影响。

## 2026-08-21｜公网复测暴露文件夹分类与回收站能力缺口

- 用户公网复测确认：点击选择系列文件夹后仍显示“尚未选择”，没有按公司字幕/中文识别视频/画面字视频形成分类结果。
- 新需求冻结为三级选择：总系列文件夹自动分类三类素材；某一集某一角色可单文件替换；三种角色均可分别选择整系列文件夹并只重算该角色。回收站允许单项永久删除和“清空回收站”，但必须二次确认、幂等、可见进度，不能由开发或测试自动删除现有数据。
- 规划签发三条无重叠租约：UI 只写两份既有验收文档；FRONT 只修上传目录读取/分类/替换预览；BACK 只补永久删除合同、服务端状态推进和独立 cleanup worker 入口。
- TEST 与 SERVER 暂不领取；等三项 artifact_written 后由规划统一审核，再派独立测试与测试服务器发布。CURRENT 更新至 v4-916，活动 execution lease=3。

## 2026-08-21｜员工素材静态 canary 已发布

- SERVER 纠正 PowerShell 多行输出数组匹配误判后，严格 SSH 身份与无密码 sudo 门通过；此前 generic failure 不再作为真实服务器故障。
- 员工静态归档完成本地/远端 `SHA256SUMS` 对账，`/srv/qimao-terms-cloud/frontend` 从 `frontend-v4896` 原子切换到 `frontend-material-canary-v4914`；旧目标完整保留，可回滚。
- loopback 8080 首页/health 与员工 HTTPS 首页/health 均返回 200；管理员静态仍为 `system-frontend-v4880`。
- 后端、Nginx 配置、数据库、Tunnel、DNS、Worker、防火墙均未修改。该交付仅为员工静态 canary，不宣称完整 `pnpm check` 或生产发布通过。
- `SERVER-MATERIAL-CANARY-01 Rev3` 已转 review，CURRENT 更新至 v4-915，活动 execution lease=0。

## 2026-08-21｜SERVER managed-root 能力探针通过

- 新SERVER在精确仓库根完成规划指定探针：apply_patch创建、读取固定内容、apply_patch删除；最终Test-Path=false且Git状态无该路径。
- writable root `C:\Users\ComradeGu\Documents\七猫兼职` 覆盖仓库，ordinary_writes=direct；权限归一化为 `workspace-write-equivalent:managed-root`。
- authority_generation递增为4；新SERVER进入唯一注册表并领取 `SERVER-MATERIAL-CANARY-01 Rev3`，旧SERVER保持归档。
- CURRENT更新至v4-914；active execution lease=1。

## 2026-08-21｜权限标签能力化与 SERVER 替换

- 旧SERVER连续两个空turn均在无消息/无工具/无服务器动作下被撤销，旧任务已归档，未形成双写。
- 新建用户可见 `测试服务器（可写替代）`，任务ID `01a02377-9bf6-7b23-8cb7-de7760e29ee0`；首轮回执 `managed/restricted + ordinary_writes=direct`，旧协议因只认固定字符串误判为blocked。
- AGENTS/WORKFLOW改为能力判定：managed/restricted必须证明writable root覆盖仓库，并在规划精确令牌下用apply_patch完成临时文件创建/读取/删除零残留，才能归一化为workspace-write-equivalent。
- CURRENT更新至v4-913；业务execution lease=0，仅SERVER临时权限探针待执行。

## 2026-08-21｜SERVER canary 空 turn 撤销并重派 Rev2

- SERVER Rev1 新 turn 持续约10分钟但无用户消息、assistant消息或工具记录；规划为防止迟到执行与替代任务冲突，发送撤销指令后该空 turn 已完成，服务器动作/写入为0。
- 未创建隐藏代理或第二个SERVER任务。规划复用同一用户可见SERVER任务签发Rev2，范围和回滚门不变。
- CURRENT更新至v4-912；active execution lease仍为1。

## 2026-08-21｜员工素材页测试服务器 canary 裁决

- 最终完整门仍非零：50/52 files、492/493 assertions；剩余为 operations afterAll 超时与管理员 SYSTEM-06 焦点断言，最终根build未执行。所有隔离库已清理。
- 与员工素材页直接相关的两文件20/20、四文件合并49/49、frontend typecheck与production build均已新鲜通过；后端生产代码本轮未改。
- 为尽快恢复用户公网测试，规划批准只在测试服务器发布员工静态canary；不解除生产隔离、不宣称全仓通过。后端v4896、管理员站、PG、Tunnel、DNS、Worker保持不动，发布失败原子回滚。
- CURRENT更新至v4-911；active execution lease=1，仅SERVER。

## 2026-08-21｜tasks 清理所有权修复完成，派发最终门

- BACK 仅修改 `tests/backend/tasks.test.ts`：用 end no-op 代理让 app 不拥有外部 pool，hook 独占 `app.close→pool.end→terminate→DROP→残留确认→admin.end`。
- tasks 单跑7/7、operations正反序15/15、operations+tasks+projects三文件重压21/21；hook无超时，backend typecheck/build通过，所有测试库残留0。
- BACK租约关闭为review。规划签发 `TEST-RECOVERY-FINAL-01 Rev1`：新隔离库上仅一次完整 `pnpm check`，不再重复定向实现；退出0才允许服务器发布。
- CURRENT 更新至 v4-910；active execution lease=1，UI/SERVER继续冻结。

## 2026-08-21｜完整断言全绿，剩余测试清理所有权

- TEST 四文件独立合并门 49/49 全绿，operations hook 未超时。随后唯一完整 `pnpm check` 中 493/493 assertions 全通过，但 operations 与 tasks 两个 afterAll 超过10秒，退出码1；最终build未执行。
- A/B隔离库以及 operations/tasks 测试库均已精确清理，相关前缀残留0。素材业务失败已关闭为断言通过，当前剩余问题不是产品断言。
- 只读代码核对显示 tasks 把外部 pool 直接注入 app，hook 又依赖 app 关闭它；operations 已使用 end no-op 代理并独占 pool.end。规划签发 BACK-TEST-CLEANUP-01，仅修 tasks 的数据库所有权/清理顺序，不修改素材业务、不放宽timeout。
- CURRENT 更新至 v4-909；active execution lease=1。TEST等待新artifact，UI/SERVER继续冻结。

## 2026-08-21｜BACK/FRONT 产物交 TEST 合并门

- BACK Rev2 只改 `tests/backend/uploads.test.ts` 的 Uint8Array 断言：uploads 21/21；与 operations 正反序组合均 29/29，afterAll 未超时；backend typecheck/build 通过，隔离库残留0。
- FRONT Rev1 只改 `frontend/src/features/uploads/UploadQueue.tsx`：目录入口、unknown 恢复、整批暂停继续、102文件即时反馈的两测试20/20；frontend typecheck/build通过。
- 两侧执行租约关闭为 review。规划签发唯一 `TEST-RECOVERY-REPAIR-01 Rev1`：先四文件独立合并复验，只有全绿才执行一次新的隔离库完整 `pnpm check`；非零不重跑。
- CURRENT 更新至 v4-908；active execution lease=1。服务器 v4896、UI与部署继续冻结。

## 2026-08-21｜BACK 健康度租约收窄至 Rev2

- BACK Rev1 新鲜复现：`system-control-operations.test.ts` 单跑 8/8，afterAll 约 1.18 秒，完整门中的超时当前不可单独复现，因此零修改保留；`uploads.test.ts` 为 20/21，唯一失败是测试用 Buffer 深比较合同规定的 Uint8Array。
- 规划不允许修改无法复现的 operations 文件，也不允许改正确的生产存储合同。Rev2 仅允许修 `tests/backend/uploads.test.ts` 的错误断言，再以 uploads 单跑、operations+uploads 正反序组合观察清理 hook。
- CURRENT 更新至 v4-907；活动租约数量仍为 2，FRONT 原租约不变。

## 2026-08-21｜恢复基线完成与双线修复派发

- `TEST-RECOVERY-BASELINE-01 Rev2` 唯一一次 `pnpm check` 已结束，退出码 1；52 个测试文件中 48 通过，493 项中 487 通过。首个真实错误为 `system-control-operations.test.ts` 的 afterAll 10 秒超时；另有 filesystem storage 字节类型断言与 C 隔离区 5 项前端失败。
- lint/typecheck 通过；测试非零后最终 build 未执行。隔离库 37/37，除迁移模板种子外业务零行；已精确 DROP，前缀残留 0。共享 PostgreSQL 保持 127.0.0.1:55432。
- 规划将修复拆成两个不重叠租约：BACK 仅处理后端两项健康度首因；FRONT 仅处理素材文件夹/上传 C 隔离区。TEST 等两侧产物后再做一次定向组合复验；UI、SERVER 保持 idle，禁止部署。
- CURRENT 更新至 v4-906；active execution lease=2。本轮不清理工作树、不提交、不推送、不修改服务器。

## 2026-08-21｜恢复诊断门 Rev2

- Rev1 在执行测试前只读发现本机 PostgreSQL 55432 未监听，`postmaster.pid` 记录的 PID 11716 已不存在；TEST 按门 blocked，未运行测试、未创建数据库或报告。
- 规划核对仓库既有运行时固定数据目录为 `C:\tmp\qimao-terms-cloud-postgres-18.4\data`。Rev2 只允许在再次验证路径、普通文件和 PID 不存在后，将精确陈旧 PID 文件移动到获准证据目录留存，再使用既有 `pnpm db:start` 恢复回环实例。
- 环境恢复成功后才继续原单次隔离库 `pnpm check`；不迁移/清理共享默认库，不删除陈旧 PID 证据，不重试完整门。CURRENT 更新至 v4-905。

## 2026-08-21｜当前工作树完整诊断门派发

- TEST R1 曾建议临时复制 A+B 源码投影；规划因违反单一源码和禁止复制目录规避重叠而拒绝。
- TEST R2 只读 import 闭包确认：现有后端认证测试经 `createApp` 加载 uploads/C/D，前端候选依赖 jsdom；严格 A+B 纯测试集合为 empty。
- 规划不再伪造纯 A+B 结论，改为签发 `TEST-RECOVERY-BASELINE-01 Rev1`：对当前完整工作树仅运行一次隔离数据库 `pnpm check`，记录真实健康度。该门即使全绿也不解除 C 隔离或部署禁令。
- CURRENT 更新至 v4-904；活动 execution lease=1，仅 TEST 可写报告与仓库外证据。BACK、FRONT、UI、SERVER 均 idle，业务实现租约为 0。

## 2026-08-21｜共享文件 provenance 裁决完成

- BACK 确认 `app/server/fastify types/upload routes/uploads tests/contracts index` 等共享文件混合 A/B/C；FRONT 确认 `App/AppShell/AsrProjectDispatch` 为 A+B 混合，`UploadQueue*` 整体仍属 C。两者均零修改回交。
- SERVER 首次普通用户跟随 release 目录遇到 Permission denied 后按门停止；规划仅追加已验证 `sudo -n` 的同路径只读租约。R2 确认 current→`20260821-employee-session-v4896`，取得后端与两站静态聚合摘要，服务器写入 0。
- v4896 目录没有发布 manifest/SHA256SUMS；远端快照不能反推本地源码。规划裁决不复制服务器源码/dist、不伪造历史 commit，改为保持当前工作树并按小批物理文件新鲜复验。
- CURRENT 更新至 v4-903；下一跳仅由 TEST 只读设计构建/runtime 与 A+B 最小链复验，尚不运行测试或签发功能实现租约。

## 2026-08-21｜共享文件 provenance 审计启动

- 用户确认继续推荐恢复路线。规划以 `GOVERNANCE-PROVENANCE-R1-V4.901` 分别唤醒 BACK、FRONT、SERVER 的用户可见 G3 任务；三个任务均已出现新 turn 并回显只读范围。
- BACK 只核对后端/合同共享接线，FRONT 只核对员工壳层与 UploadQueue 混合文件，SERVER 只从本地证据核对 v4896 release/manifest/SHA；禁止写文件、测试、构建、浏览器、服务器或数据库动作。
- UI 无新交互事实，继续 idle；TEST 等首轮来源裁决后再接最小复验设计，避免测试先于物理恢复集。
- 当前业务 execution lease 仍为 0；CURRENT 更新至 v4-902。本轮不回退、不清理、不提交、不推送、不部署。

## 2026-08-21｜G3 文件分类与冲突裁决

- BACK、FRONT、UI、TEST、SERVER 五个可写固定任务均以只读审计租约完成 A/B/C/D/E 分类；未修改业务文件，未运行测试、构建、浏览器、服务器或数据库动作。
- 规划完成跨角色冲突裁决并新增 `docs/governance/RECOVERY-FILE-INVENTORY-2026-08-21.md`：A 为 v4-849 验收基线，B 为 v4896 运行保留层，C 为素材文件夹隔离集，D 为共享/待证明集，E 为两个 0 字节根文件候选。
- `UploadQueue.tsx` 整文件归 C；`upload.routes.ts`、`uploads.test.ts`、`App.tsx`、`AppShell*` 等混合文件归 D，禁止整文件从单一阶段覆盖。
- 推荐恢复路线为逻辑上的 `A + B`；C 原样保留且不得部署，先对 D 做 provenance 审计。CURRENT 更新至 v4-901；五个角色继续 registered/idle，active execution lease=0，等待用户确认恢复路线。

## 2026-08-21｜G3 五个可写固定任务重建

- 用户明确要求重建五个可写任务。本轮创建的 BACK、FRONT、UI、TEST、SERVER 均为侧栏可见项目任务，直接使用保存项目，不创建 worktree，不指定或覆盖模型/推理强度。
- 五个任务只执行权限握手，全部回执正确 repo root、当前治理分支、`workspace-write` 与 `ordinary_writes=direct`，状态均为 `ready_for_registration`；未修改文件、未运行测试或服务器动作。
- `CURRENT` 更新至 v4-900 / `authority_generation=3`，五个新任务进入唯一注册表；旧 G2 只读任务退出注册表并归档。
- 当前 active execution lease 仍为 0。可写能力恢复不等于业务已恢复；下一门仍是文件归类和恢复点确认。

## 2026-08-21｜GitHub 公开治理快照

- 确认远端 `ComradeGu459/shengai` 为公开仓库；没有把 CURRENT、服务器台账、问题历史或完整日志归档上传。
- 新建并推送 `codex/governance-recovery-v6.1`，提交 `fe10b4c docs: reset collaboration governance`。
- 提交仅含 `AGENTS.md`、`docs/WORKFLOW.md` 与治理恢复审计；敏感模式、邮箱和 IPv4 扫描均为 0，未夹带其余 200 余项业务改动。
- 固定 BACK/FRONT/UI/TEST/SERVER 的新鲜权限仍为 read-only；现有任务不能由文档直接升级权限，恢复实施必须登记用户可见且实际通过 workspace-write 探针的替代任务。
- 用户再次确认规划是项目“大脑”和总管家，不是默认施工角色。`AGENTS.md` 与 `WORKFLOW.md` 已追加硬规则：规划负责最优解、派发、审核、返工、衔接和冲突裁决；默认不领取领域实现，也不使用隐藏代理。只有同根因两次有证据失败、正式 blocked、无可写 Owner 且用户明确授权时，才允许一次性最小介入。
- 上述补充已提交并推送为 `4517930 docs: define planning control boundary`。

## 2026-08-21｜治理恢复冻结与协作协议 v6.1

- 用户明确暂停项目推进，先拨乱反正项目对话、权限和写作文档。本轮停止全部内部 FRONT/TEST/审计子代理，活动业务 execution lease 收敛为 0；未继续修改业务代码、测试、服务器或部署。
- 取证确认 `main` 最后提交为 `e16c5eb`（2026-08-15），当前工作区有 200 余个脏条目，且存在大量未跟踪 SYSTEM、登录、部署和测试资产。因此禁止直接 `git reset --hard`、`checkout --` 或 `clean`。
- 恢复边界冻结为三层：`v4-849 / SYSTEM-09` 是最后完整测试基线；服务器 release `20260821-employee-session-v4896` 是当前运行基线并保持不动；素材文件夹在途实现尚未部署且含跨项目 P0 与多项 P1，整体转 `quarantined`。
- `AGENTS.md` 与 `docs/WORKFLOW.md` 更新为 v6.1：只允许规划、UI、BACK、FRONT、TEST、SERVER 六个用户可见固定任务参与；只读任务直接阻塞，禁止隐藏子代理、内部 successor、临时线程或 worktree 代写业务代码、测试和领域文档。
- 六个固定任务已重新命名、置顶并完成冻结握手。BACK、FRONT、UI、TEST、SERVER 均报告当前为 `read-only`、执行租约为 0；这表示任务诚实冻结，不表示任务已获得写权限或正在实现。
- `CURRENT` 更新至 v4-898 / `governance_recovery_freeze`；v4-897 已原样归档并完成 SHA-256 对账。新增 `docs/governance/RECOVERY-AUDIT-2026-08-21.md`，记录取证、可信基线、隔离问题和后续恢复决策。
- 重复的旧规划、旧 UI、旧测试任务已归档（可恢复、未删除）。当前只保留六个固定任务作为后续可见协作入口。

## 当前停止点

- 不回退、不提交、不推送、不部署、不清理脏工作区。
- 不向只读任务派发实现；不创建隐藏可写代理替代固定任务。
- 下一阶段仅做文件级归类：可信保留、待独立复验、隔离、明显临时残留。形成清单后再由用户决定恢复路线。
# 2026-08-21｜TEST 集成收件与两条定向返工（v4-923）

- `TEST-MATERIAL-RECYCLE-02 Rev1` 已形成报告：素材/上传/回收站 Owner 专项前端 30/30、后端 11/11，空隔离库迁移 37/37；1440/1024 正式浏览器布局、purging、409/404 对账与 console error/warn=0/0 通过，两枚隔离库和临时服务均已清理。
- 本轮唯一完整 `DATABASE_URL=<隔离库> pnpm check` 退出 1：50/52 files、498/499 assertions。失败集中为 `ProjectMaterials.test.tsx` 旧断言期望 4 bindings、实际 6，以及 `system-control-runtime.test.ts` afterAll 默认 10 秒 hook 超时；没有新增产品 P0/P1。
- 规划已真正唤醒可写 FRONT/BACK 新 turn：FRONT 只核对两集三角色/共享 MP4 结构并修正一份旧测试；BACK 只按已验证 pool 所有权模式修正一份测试清理，均禁止改生产或放宽 timeout。SERVER 继续冻结，等待 TEST 变化复验。
# 2026-08-21｜素材分类与回收站 canary 已发布（v4-932）

- FRONT 关闭旧绑定口径：两集完整配对为 6 个角色绑定，但每集两个视频角色共享同一 MP4，物理视频仍只上传一次；ProjectMaterials/素材/UploadQueue 邻接 27/27。
- BACK 关闭 runtime 测试清理超时：应用不再拥有外部测试 pool，清理顺序统一；单项 5/5、与 operations 正反序 13/13，隔离库残留 0。
- TEST 变化复验 35/36；唯一未过为 102 文件单测在当前宿主超过固定 15 秒。该同场景此前两次通过且没有业务断言失败；测试侧稳定化连续失败后已恢复原测试并停止第三补丁，规划按可回滚 canary 接受该 P2。
- SERVER 初次最小归档因复用旧 workspace 依赖导致 contracts 导出不一致，已完整回滚；随后按标准 source release 在新目录独立 frozen install/build，运行与扫描门通过。专用 cleanup unit 补齐 `--preserve-symlinks-main` 后空轮询与连续 5 个窗口均未 claim 未来任务。
- 当前 backend/员工静态为 `material-recycle-v4930`，管理员静态未变；Fastify health、Nginx、公网页面/深链/JSON错误边界通过，cleanup worker active，其他 Worker=0。数据库保持 7 项目（active 1/recycled 6）、future scheduled 6、purging/leased/due 均 0；未执行上传、永久删除或清空，旧目标保留可回滚。

## 2026-08-25｜上传存储候选由雨云 ROS 切换为腾讯 COS（v4-1047）

- 雨云客服连续两天未能确认 multipart 浏览器能力；现有证据也未形成可归因 provider 的失败。按第一性原理确认大文件直传不经过 VPS，因此不购买或迁移云服务器，只替换对象存储候选。
- 用户已创建腾讯 COS 私有桶 `milaidi-upload-1310313248`（南京、单 AZ、SSE-COS、版本控制关闭），按 `https://milaidi.online` 精确配置 PUT CORS，并创建仅限该桶对象操作的 CAM 程序身份；Secret 未进入聊天或仓库，已生成当前 Windows 账户专属的 DPAPI 加密副本。
- 腾讯 COS provider 级真实合成探针已通过：virtual-hosted multipart Create、两片 PUT（16 MiB + 1 KiB）、ListParts=2、Complete、Head 长度 16778240、匿名 GET=403、Delete 与删除后 Head=404；固定测试对象已精确清理。当前仍是 candidate：BACK provider 适配已落地但尚未被测试服务器使用；SERVER root-only 注入、真实 `milaidi.online` 浏览器 CORS、业务部署和真实素材上传尚未完成；雨云 ROS、TUS 与 `server_relay` 保持只读历史。
- BACK 已加入 Tencent provider/virtual-hosted 寻址与专项测试，规划新鲜 COS 专项 1/1、BACK typecheck 通过。Codex 内置浏览器能到真实页面 Origin，但其受限检查上下文不能执行网络 PUT，故本轮没有触发 COS 请求，不能写成 CORS 失败；同一 UploadId 已精确 Abort、签名交接已删除。固定 SERVER 空完成且服务器写入为0，下一步只允许形成短时同源 helper 后做一次浏览器 PUT，不再重复 provider 或浏览器启动诊断。
- 原固定 SERVER `01a02748-34aa-7861-840f-4748bdc58958` 在多次派发中持续空完成；跨5分钟只读快照证明消息、工具、命令、目标文件及服务器写入均为0。规划已撤销其任务卡并冻结，按替代硬门将唯一 SERVER Owner 切回既有用户可见、曾有真实 SSH/回滚证据的 `01a02377-9bf6-7b23-8cb7-de7760e29ee0`；同角色仍只有一个可写 Owner，未新建任务或 worktree。
- 备用 SERVER 随后的业务 turn 与最小 `CHANNEL_ACK` 也均终态空 turn，消息、工具、命令、目标文件及服务器写入仍为0；两代物理任务现已冻结，活动 lease=0。根因收敛为“固定逻辑角色被误写成永久物理任务 + 冗长上下文 + 终态空 turn 仍走慢等待门”。`AGENTS.md`、`WORKFLOW v6.7` 与 `CURRENT v4-1044` 已改为短任务卡、组合开工回执、终态空 turn 快速失效、用户可见上下文换代，并明确禁止要求用户代发任务卡或 READY；同时按第一性原理只保留与真实风险相称的必要安全门，已有新鲜证据覆盖的低风险步骤不得重复审查。
- 用户于 2026-08-26 明确授权新建 SERVER；用户可见本地任务 `01a039a7-953a-7282-b05f-46997f016442` 已创建并置顶，未使用 worktree，6.6 秒内返回 `task_received|work_started CHANNEL_ACK`。该任务成为唯一 SERVER Owner，接收 `UPLOAD-COS-SERVER-03`；两代失效任务继续只读冻结，不并行派发。
- 新 SERVER 已确认受保护 DPAPI 凭据、SSH 公钥和 `sudo -n` 可用；首次业务 turn 因执行环境要求对“1.42 MiB 单文件 probe helper + cleanup supervisor 写入测试服务器 `/tmp`、`/run` root 临时路径”取得动作时授权而 blocked。远端/COS 写入与浏览器导航均为0，本地闭包、bundle、脚本已精确清理且残留0；后续只等待该单项授权，不恢复搜索或增加替代路径。
- 用户明确将此类“已授权测试目标所必需、精确且可清理的测试环境临时 helper/supervisor 写入与一次性执行”设为默认授权，不再逐项确认；业务部署、网络边界变更、公开桶、真实素材、购买资源、Secret 输出和不可逆写入不在默认授权内。`UPLOAD-COS-SERVER-03` 已恢复 active，并继续使用同一 SERVER Owner。
- `UPLOAD-COS-SERVER-03` 已真实 PASS 并完成双向交付：页面发出跨源预检和两片 PUT，均读取 ETag；ListParts=2（16777216/1024）、Complete、Head=16778240、精确 Delete，远端对象/multipart及临时凭据/helper/listener/Nginx location 残留0，`nginx -t` 通过。规划曾因使用已下线的动态任务包装器只看到停滞快照；切换直接 Codex App MCP 后收到完整 `artifact_written`。协作协议 v6.9 固化“派发→收件开工→Owner回传→规划接收审核”四段闭环，包装器故障只记 `observer_degraded`。
- 按用户要求归档当前项目用不到的旧任务：两代失效 SERVER、旧规划和 9 个旧开发/排查任务，共 12 个，均为可恢复归档且未删除；侧栏只保留规划、BACK、FRONT、UI、TEST、SERVER 六个置顶现役逻辑角色，其他项目未改动。
- 正式实施首片 `UPLOAD-COS-BACK-01` 向旧 BACK `01a0231d-63ae-7153-8271-c52f011b4833` 派发后，业务 turn 286.5 秒终态空完成；唯一最小 `CHANNEL_ACK` 又在 2.1 秒内空完成，两轮消息、工具、命令、文件和业务写入均为0。按 v6.9 快速失效门撤销 lease 并归档该物理任务；等待用户明确授权创建新的用户可见本地 BACK 固定任务，不再第三次派发。
- 纠错复核：上一条“BACK 零动作/物理任务失效”结论撤销。桌面日志和 `read_thread(includeOutputs=true)` 证明同一 286.5 秒回合已真实收件、执行工具、修改4个文件、完成专项测试/typecheck/build/diff-check并回传 `artifact_written`；只有规划侧 `wait_threads` 丢失了最终消息观察结果。BACK 原任务已解除误归档并重新置顶，未新建替代任务。协作协议升至 v6.10：等待结果为空时必须先读目标完整回合并核对文件/命令事实，禁止据此直接 ACK、撤销、归档、换代或再次向用户索权。

## 2026-08-26｜腾讯 COS 业务链实现与发布前门收口（v4-1052）

- FRONT 已切换到唯一 HTTPS COS presigned multipart 链；BACK 补齐腾讯 COS provider、600 秒/16 MiB、异步完成 Worker，并在 COS 模式关闭新 TUS/可写数据面，旧会话只允许查询和显式 abandon。独立 TEST 通过后端 28/28、前端 39/39、单文件 2/2、两端 typecheck/build 与旧链零命中，隔离数据库和临时证据残留 0。SERVER 只读预检确认线上仍是 `20260823-upload-relay-5m-r1`，公开 TUS/relay、缺完成队列迁移/Worker/新 provider 键；随后本地生成唯一 `20260826-upload-cos-browser-direct-r1-45179303-2f0015547908` 归档，221 个 manifest 文件与 COS/Worker/迁移/旧入口关闭门全部通过，归档 SHA-256=`6f049b64c957c08297078e99abbeb1968a0a8cb4cce5b0cee12dcb5d3c2ced70`。当前仅剩一次测试服务器发布与真实页面业务验收，尚未部署或操作真实素材。
- 用户授权发布、真实页面合成素材验收及失败自动回滚后，SERVER 完成 Phase-A、迁移、候选 backend/Worker、两站静态、Nginx 旧入口关闭与服务器 smoke；内置浏览器随后在创建唯一 synthetic 项目时有界超时，按同名精确查询确认项目不存在，未产生 `projectId/uploadId/objectKey`，因此未进入 authorize 或 COS PUT，不能写成 COS/CORS 失败。发布已自动回滚至旧 backend/两站静态/旧存储与 Nginx，health=200、端口仅回环；候选 release、远端归档、两站候选静态、synthetic MP4 和临时文件精确清理，候选残留与 synthetic 项目均为 0。完成队列迁移保持向前且空表，pre-migrate dump 留作审计。唯一下一门收敛为候选 `POST /api/projects` 页面创建超时根因，修复并独立复验前不再次发布。

## 2026-08-26｜连续目标协作状态机整治（v4-1056）

- 复盘确认 SERVER 回传、规划接收与回滚证据完整，停滞不是消息链断裂，而是规划把 `rolled_back` 切片终态误当产品终态：CURRENT 曾同时出现目标未完成、下一步可执行、全部角色 idle、活动任务卡=0。协作协议升至 v6.11，将产品目标/里程碑/执行切片/物理 turn 分层；增加 `slice_outcome/goal_gap/next_owner/requires_user` 交付字段与规划终态守卫，禁止 `objective_status=active + continuation=required + active task=0`。正式 lease 继续只服务高风险动作，轻量诊断用活动任务卡，避免为修复停滞反而增加审批。上传目标恢复 `UPLOAD-COS-TEST-03` 接力，先归因项目创建超时，不重复已通过的 COS/CORS 门。
- 首次规则回放形成真实闭环：TEST 约 5 秒内收件开工，候选前端专项 10/10，候选 backend 在全新隔离库的 Fastify inject/真实 HTTP POST 均 201（约 124–131ms）、同名 GET 200、数据库单项目/单命令落账，隔离库/端口/日志残留 0；因此 FRONT 与隔离 BACK/DB 被排除，剩余边界收敛到候选部署运行时或浏览器控制层。规划没有把 TEST blocked 当终点，也没有接受其对只读服务器日志的多余索权，活动任务卡已转交 SERVER-07 做历史日志关联。
- SERVER-07 随后只读证明候选时段 Nginx/Fastify 完全没有 `POST /api/projects`，唯一项目请求是 GET 200，PostgreSQL 无项目 INSERT/error；因此上次发布回滚的首因是浏览器控制动作未真正提交表单，不是候选业务请求 pending。活动任务卡继续转交 TEST-04，在本地隔离候选上固化带 Network 证据的分步提交序列，避免再次用控制层超时替代业务证据。

## 2026-08-26｜TEST-09-IAB2 终态对账与状态投影修复（v4-1079）

- TEST 使用自身 Codex 内置浏览器完成登录页、synthetic 项目、1 集/2 物理文件/3 角色、文件重新绑定和单次上传确认；两项均在创建 UploadSession 前进入“创建结果待确认”，同一命令 recovery GET 返回 404，未发生 COS PUT、ETag、complete、Asset 或 Worker 完成，最终结构化交付为 `blocked`，不是上传通过。
- `wait_threads/read_thread` 对该 completed turn 返回空 items/null 最新消息，侧栏仍显示历史任务预览；但原始 session JSONL 明确保留 `artifact_written`、最终 `blocked`、工具与外部动作。外部核查所指出的 CURRENT 仍标 active 属实，但“无效空交接/结果完全未知”不成立；本次归因为 `observer_projection_gap + CURRENT 更新滞后`，不伪记 `orchestration_gap`。
- CURRENT 已把 TEST 切片关闭为 `blocked`，关闭其正式验收 lease，并把唯一活动卡切到 SERVER-17 只读 503 根因对账；在根因交付前冻结重测、重构、重发创建 POST和再次发布，已通过的 provider、CORS、构建与发布门不重复。

## 2026-08-26｜六角色小范围协作复位与候选基线（v4-1080）

- 六个固定角色已按最新 turn 与原始 session 日志对账：BACK-02、FRONT-02 均有 `artifact_written`；UI idle；TEST-09-IAB2 有有效 `blocked`；SERVER-17 有有效只读 `artifact_written/passed`；规划是唯一状态 Owner。侧栏 BACK/FRONT/TEST/SERVER 的 summary/preview 均可能保留旧任务内容，`notLoaded` 只表示未加载，二者不参与业务状态裁决。
- SERVER-17 将根因边界收敛为 Fastify upload-create 在约 259/441 ms 返回两次 503 且未持久化 UploadSession，排除 Nginx timeout/connect 与 Worker/数据库写入；内部 provider/校验错误分类被现有 createMultipart 边界抹平，下一 Owner 为 BACK。
- CURRENT 从 111 行约 18KB 压缩为当前目标、immutable candidate、已证实事实、唯一阻塞、六角色状态、单一任务卡和保护边界；没有新增 v6.12，也没有改写 AGENTS/WORKFLOW。有效终态按 `outcome/evidence/remaining_gap/next_owner` 审核，缺失即 invalid-handoff，不再延续 active。
- Git 默认折叠口径仍为 260 个状态项；展开未跟踪目录后为 427 条叶级路径（113 modified、3 deleted、311 untracked）。`RECOVERY-FILE-INVENTORY-2026-08-21.md` §14 已绑定 Git 基线、线上 release/R2/manifest SHA、叶级清单 SHA 与 PLANNING/BACK/FRONT/UI/TEST/SERVER/SHARED/UNASSIGNED 路径 Owner；不提交、不清理、不把整棵脏树冒充已部署候选。
- 唯一活动卡 `UPLOAD-COS-BACK-03` 已在 CURRENT 登记后以 7 行短卡派给原固定 BACK，并收到 `task_received` 与 `work_started`；只修复/显式分类 upload-create 503，禁止真实 COS、重复探针、全量构建、部署或前端改动。
- BACK-03 随后以结构化 `blocked` 收口：唯一 503 分支是 `CreateMultipartUpload` 在 UploadSession 落库前失败；四个后端/专项文件加入稳定脱敏 provider 分类，专项 4 passed、backend typecheck 与限定 diff-check 通过。离线仍无法知道线上是鉴权、桶不存在、请求拒绝还是网络，remaining gap 精确缩为“线上一次新稳定身份请求返回的新错误分类”。
- 规划在收到 BACK 终态后立即把 CURRENT 从 BACK active 切换为 SERVER-18，未等待下一轮人工审计。下一片只做 backend-only diagnostic candidate 的必要单次 build/发布与 health 门，静态、Worker、Nginx/CORS、旧入口和业务上传请求全部冻结；之后才由 TEST 恢复唯一单标签页真实闭环。
- SERVER-18 以 R2 远端 release 克隆加 5 个编译输出覆盖形成 `20260826-upload-cos-browser-direct-r2-backend-diagnostic-b03-server18`；运行时差量只有 3 JS+2 d.ts，对应 BACK-03 三个生产源文件，未夹带其余脏树。归档 SHA-256=`b4d3121d77c8a04edd09554f34611cc6d987a90c571d67275a6661f41c7130df`；health=200、API=401 JSON、backend/Worker active且零重启，两站静态和 Nginx 未变，业务 POST/COS/DB 写入为0。
- 规划收到 SERVER 终态后立即关闭其 active 状态并把唯一活动卡切至 TEST-10：只用 Codex IAB 和全新稳定身份做一次页面闭环；失败只读取新稳定 provider code，成功才继续 multipart/Worker/Asset；最终由 TEST 写入新的真实页面验收报告，避免以内部专项、探针或发布冒充最终用户结论。

## 2026-08-26｜协作复位后腾讯 COS 公网大文件闭环通过（v4-1102）

- 外部审计指出的 CURRENT 滞后、角色实际回合与总控不一致、侧栏预览过期、状态文件承载过多历史、候选脏树缺少精确 Owner 基线及缺最终验收报告等问题均被接纳并修正；TEST-09 原始 JSONL 证明其为有效 `blocked` 交付而非空交接，Git 260 个折叠状态项展开后为 427 条叶级路径。CURRENT 只保留当前事实，六角色交付统一以 `outcome/evidence/remaining_gap/next_owner/files/residual/requires_user` 审核。
- 真实 503 通过脱敏稳定分类收敛为 `STORAGE_PROVIDER_AUTH`；只读对账证明服务器两项 Secret 均与用户保存的腾讯子用户 CSV 不一致，endpoint 也偏离冻结值。SERVER 原子替换凭据并纠正 endpoint 后，backend/Worker active 且零重启，唯一 CreateMultipartUpload+Abort 成功；Secret 未进入聊天、仓库或日志。`NTP=no` 仍是运维 warning，但 RTT 校正时钟偏差在 5 秒内，不构成签名阻塞。
- TEST 在 `milaidi.online` 以单一 synthetic 项目完成真实页面链：manifest v1 为 1 集/2 物理文件/3 角色，普通 MP4 同时绑定 asr/screen 且只上传一次；SRT multipart 1/1，16,778,240-byte MP4 multipart 2/2，整批 100%、失败 0、项目 ready，未出现 TUS/server_relay 或重试。
- SERVER 按唯一 projectId 终审：恰好 2 个 completed session、3 个非空 ETag part、2/2 completion jobs、2 Asset/3 角色绑定且视频双角色共用同一 Asset；两个精确 COS Head 长度为 70 与 16,778,240。证据固化后两个对象删除 204/Head 404，synthetic 项目及全部关联行单事务归零，残留 0。公网大视频可用完整产品门关闭为 passed。

## 2026-08-26｜腾讯 COS 正式公网发布与发布后复验（v4-1108）

- 用户授权正式发布后，SERVER 发现公网 backend、Worker、两站静态、冻结归档和 manifest SHA 已是验收通过的不可变候选，因此执行 `no_op_promotion`：未重复部署、重启或 reload；backend/Worker/Nginx/Tunnel/公网 health 与 API 门通过，精确回滚基线保持可用。
- TEST 在 `milaidi.online` 新建唯一 synthetic 项目完成发布后单标签页冒烟：1 集、2 物理文件、3 角色，普通 MP4 双角色共享且只上传一次；SRT multipart 1/1、16,778,240-byte MP4 multipart 2/2，页面 ready、100%、失败 0、服务端确认，无 TUS/server_relay 或重试。
- SERVER 同一 projectId 对账得到 2 completed session、3 个非空 ETag、2/2 completed job、2 Asset/3 绑定和零重复命令/session/object。首次清理 helper 的前置控制流已证明双 Head=200 且长度匹配，随后因把删除后的字符串 `"404"` 与数字 `404` 比较而误报 `partial`；规划将其裁决为证据输出缺陷，不是产品失败，未重跑上传。
- 两个 COS 对象、项目及全部关联数据库行、本机 70-byte SRT/16,778,240-byte MP4 夹具和 IAB 标签均已精确清理，逐表、关联 join、COS 与本机残留为 0。最终验收报告和 CURRENT 已收口为 `objective_status=complete`、活动任务卡/lease=0、`remaining_gap=none`。

## 2026-08-26｜真实用户上传无响应诊断（v4-1113）

- 用户真实浏览器在约 22:00 创建项目与确认 102 个物理文件的 manifest 均成功，但最先并发的两次 upload-create 都在 Fastify 返回 400；UploadSession、command、part、completion job、Asset 与 Worker 任务均为 0，因此文件字节尚未进入 COS，服务健康且不是服务器/COS/Worker 故障。
- 51 个 SRT 与 51 个 MP4 均符合扩展、50 GiB 与 10,000 分片边界；两条 400 的 Nginx 响应长度均为 188 bytes，唯一匹配 `REQUEST_VALIDATION_FAILED`，排除三个显式 `UPLOAD_*` handler 分支。当前日志不记录请求正文或 validation path，保持隐私边界。
- 最新线上 bundle 的 synthetic 页面闭环此前通过，而同一真实客户端近两小时未观察到 current 静态 bundle 加载；当前最强解释是旧标签页运行旧前端、请求合同与新后端不一致。总控已改为等待用户关闭旧页/强制刷新后在现有项目重新选择同一文件夹复测；不重复 provider、CORS、构建、发布或 COS 探针。

## 2026-08-26｜真实上传恢复与吞吐性能候选（v4-1120）

- 用户强制刷新后旧合同 400 消失；新窗口内 upload-create、authorize、confirm 与 complete 均成功，已观察多批会话持续接力，服务端无对应 4xx/5xx 或 Worker 失败。页面曾显示的“1 个失败”没有服务端失败对应，仍需其可见文案才能定位本地投影，禁止盲目重试或删除。
- 严格日志窗口的 8.57 Mbps 会漏计窗口外确认和在途 PUT；本机活跃上传连续 12 秒出站实测平均 22.72 Mbps（18.06–24.22）。代码核对确认现有分片上传并非串行，但两个活跃文件共享全局 3 PUT，形成可释放的前端并发门。
- 性能候选保持 16 MiB、两活跃文件和每文件 3 worker，只把全局 PUT permit 从 3 提至 6，不改 backend、协议、完成阶段、unknown 或重试语义。FRONT 专项与邻接测试、typecheck/build 通过；TEST 独立复验并发/permit 13/13、UploadQueue 23/23、material-folder-flow 9/9、backend 对象存储 5/5，成功/失败/暂停/取消均无 permit 泄漏，限定 diff-check 通过。
- 候选尚未部署，线上仍使用全局 3 PUT；下一步只等待用户明确确认前端性能候选发布。不能承诺吞吐翻倍，发布后必须用同一网络、同类文件做前后对照，实际结果仍受本地上行、网络路径与 COS 限速共同约束。

## 2026-08-27｜上传并发候选发布、测速与收口（v4-1124）

- 用户授权后仅发布员工前端 `frontend-20260826-upload-cos-perf03-r1`，全局 PUT 由 3 提至 6；单文件 3 worker、两活跃文件、16 MiB 分片及 backend/Worker/COS/Nginx/管理员端均未改变。公网首页、项目/上传深链、静态指纹、source-map 404、health/API 与回滚门通过，旧员工前端保留为精确回滚点。
- Codex IAB 唯一 synthetic 闭环为 2 集、4 物理文件、6 角色绑定；两部 64 MiB MP4 各 4/4 multipart 分片，页面 ready、100%、失败 0。134,217,728 bytes 的可观测窗口为 40.603 秒，折算 26.44 Mbps，较 22.72 Mbps 旧基线提升约 16.4%；用户接受该速度，不再继续增加并发、迁移地域或购买加速。
- SERVER 终审确认 4 个 completed session、10/10 非空 ETag part、4 completed job、4 verified Asset、6 角色绑定、零 4xx/5xx 与零幂等重复。证据固化后 4/4 COS 对象精确删除并同身份 Head=404，项目及全部关联数据库行、外键引用、本机夹具和浏览器标签残留均为 0。

## 2026-08-27｜首次术语提取门禁死锁修复候选（v4-1129）

- 用户真实 `test` 项目已正确识别 51 集/51 个已验证 company_srt Asset，当前来源 digest 有效且术语 draft/version/run 均为 0；“公司 SRT 内容已变化”并非数据变化，而是 backend 把首次导入的 `trackedDigest=null` 误判为 `sourceIsCurrent=false`，frontend 因而隐藏既有“开始提取术语”入口。
- backend 生产修复仅调整 1 行：来源 ready 且没有 tracked history 时允许首次提取；存在历史 digest 后仍只允许完全匹配，真实 SRT 变化继续只读并返回 `TERM_SOURCE_CHANGED`。frontend 生产组件未改，只补首次入口与历史变化警告回归。
- TEST 将 terms 测试上传辅助链对齐现行异步完成合同后，backend terms 11/11、frontend TermsWorkspace 18/18、两端 typecheck 与限定 diff-check 全绿；隔离库相关表残留 0。候选尚未部署，下一步只等待用户确认 backend-only 发布。

## 2026-08-27｜首次术语提取入口线上修复通过（v4-1132）

- 根因确认并修复：首次导入无 draft/version/run 时 `trackedDigest=null` 被误判为来源过期；backend 仅用 1 行调整使 ready 且无历史的来源可开始首次提取，同时保留历史 digest 不匹配时的 `TERM_SOURCE_CHANGED` 保护。frontend 生产代码未改。
- backend terms 11/11、frontend TermsWorkspace 18/18、两端 typecheck 与限定 diff-check 通过，隔离库相关表残留 0。SERVER 发布 backend-only immutable release `20260827-terms-first-import-05-r1`，archive SHA-256=`48e9180572fe5a0f5e596cc300ced90d923d0f3a51c55285dd002390795dd753`；health/API、backend/Worker、零重启与回滚门通过，静态、COS、Nginx 和运行边界未改。
- TEST 用 Codex IAB 只读验收真实 `test` 项目：刷新前后均为 51 集/51 份素材、待建立草稿、0 项，旧“公司 SRT 内容已变化”告警消失，“开始提取术语”按钮可见；未点击按钮、未建立草稿/版本/提取任务、未调用 AI 或付费能力。`remaining_gap=none`。

## 2026-08-27｜管理员控制台真实服务器与业务日志接线本地候选（v4-1138）

- 线上只读核对确认管理站/API/Access 可用，空状态首因不是整站断线：生产 RuntimeTelemetryProvider 未注入，operations 未覆盖 upload/terms；无真实 ASR/OCR Provider 的引擎、路由和预算继续诚实保持未配置。
- BACK 接入受保护 runtime snapshot Provider，并把 UploadSession/CompletionJob 与 TermExtractionRun 纳入只读 operations；规划审核修正 collector schema/env 双端错位、nullable 布尔、费用对账语义和 TasksCurrent→processCount 错误映射。FRONT 补齐 upload/terms 的真实状态、筛选与领域化只读详情；不返回文件名、对象键、摘要、正文、原始错误或 Secret。
- 独立 TEST 纵向门通过：runtime snapshot/runtime API/operations/system logs 共 4 文件 30/30，collector→真实 FileRuntimeTelemetryProvider 为 4 resources/4 descriptors/4 telemetry，contracts/backend/system-frontend typecheck 与 build 全绿，隔离库、fixture 与缓存残留 0。候选尚未部署；下一步只等待一次合并部署授权，失败自动回滚。

## 2026-08-27｜管理员控制台真实接线上线与只读终验（v4-1143）

- 用户明确授权后，SERVER 发布合并 release `20260827-system-live-server05-r1` 与同名管理员静态；归档 SHA-256=`efc2083dd592a46d19d395fae7685800230f4f9e8883582e23da3ac1088237dd`，manifest SHA-256=`4e97c1fcfa1f242de58bef5e8c000ab11170838867a5d5a00216139d9783b702`。collector/service/timer 一并安装，snapshot 为 root:qimao 0640、四个稳定资源、`processCount=null`，timer active/30s；backend/Worker active 且 `NRestarts=0`，health=200、API=401 JSON、管理员首页/深链/资产=200、Nginx 与 loopback 门通过。
- 部署阶段曾因把 monotonic timer 用 realtime 字段验收而两次自动回滚；journal 与快照合同均证明 collector/timer 实际成功，旧 backend/static 每次恢复 health=200。验收谓词收敛为 unit `OnUnitActiveSec=30s`、loaded/active 后，同一不可变归档最终一次通过；未形成第二候选或改业务代码。精确回滚点为 backend `20260827-terms-first-import-05-r1`、管理员静态 `system-frontend-20260826-upload-cos-browser-direct-r2-front02-server16` 与 root-only baseline。
- TEST 通过现有 Edge Access 会话的新临时标签完成真实页面只读门：`/servers` 刷新前后均为 backend、Upload Completion Worker、PostgreSQL 15-main、Tencent COS 四个稳定 ID；`/logs` 总记录 103，文件上传 102、术语提取 1，两类详情均无文件名、对象键、正文、digest、Secret 或原始错误。旧四域可访问，`/engines` 无部署、`/routing` 无 active 路由、`/budgets` 无生效策略且硬阻断，控制台 error/warn=0/0。
- 本轮未执行数据库迁移、员工前端变更、COS 请求、上传、提取、造数或真实业务写入；TEST 自建标签已关闭，用户原标签未改。远端临时归档与临时 symlink 残留 0，正式 release、静态目录、回滚备份及本地 staging/archive 按发布审计保留。管理员控制台真实接线目标以 `objective_status=complete`、活动任务卡/lease=0、`remaining_gap=none` 收口。

## 2026-08-27｜腾讯云 ASR 数据面本地候选（v4-1147）

- `TENCENT-ASR-BACK-01A` 建立腾讯录音文件识别异步适配器：私有 COS 来源只接受短时 HTTPS 读取能力，Create/Describe 映射官方状态与 `AudioDuration`，创建结果 unknown 使用稳定内部对账身份并禁止盲目再次创建；签名未完成按未送达处理。腾讯专用回归 7/7，ASR 邻接合跑 3 files/30 tests，backend typecheck/build 与限定 diff-check 通过；隔离库删除且本轮 PostgreSQL 停止。BACK 回合的消息投影连续为空，规划未伪造 `artifact_written`，而是按文件、命令与官方字段独立审核后接纳本地候选。尚未接专用 AI Secret、生产 registry/Worker、enabled 部署、active 路由、真实网络或付费调用，后续由 `TENCENT-ASR-BACK-01B` 在默认禁用边界内完成生产装配。
- `TENCENT-ASR-BACK-01B` 补齐官方独立 ASR SDK、扁平响应归一化、私有 COS 精确对象短时 HTTPS GET 签名、默认禁用的 server/Worker registry 与专用 AI 配置；缺失或半配置均 fail-closed，Create 成功但 TaskId 缺失、非十进制或超出安全整数时进入稳定对账态并禁止再次 Create，已存非法 TaskId 也不会触发供应商调用。最终专项 2 files/17 tests、backend typecheck/build 通过；隔离 PostgreSQL 上 6 files/51 tests 全绿，精确测试库删除且本地 PostgreSQL 停止。未开通服务、接 Secret、部署、创建 enabled engine/active route 或发生真实网络与付费调用；里程碑继续转入腾讯 OCR 本地候选。

## 2026-08-27｜腾讯云 OCR Provider 本地候选（v4-1151）

- `TENCENT-OCR-BACK-02A` 接入官方独立 OCR SDK 与 `GeneralBasicOCR`：逐帧 Base64、文本/置信度/位置/证据、官方 RequestId、timeout/unknown 对账及默认禁用 registry 已落盘；WebP/超限帧在网络前拒绝，timeout 真正生效，usage 按已发调用计数，启用必须提供正数 CNY 最大金额报价，禁止以 0 元预算执行付费请求。规划复验专项 2 files/9 tests、local sidecar 邻接合跑 3 files/20 tests、backend typecheck/build 与限定 diff-check通过。未接 Secret、服务开通、部署或真实调用；Provider 边界已过，但生产 Worker 仍缺私有 COS 短时读取与真实有界抽帧器，下一片只补媒体数据面并避免整对象回读大视频。

## 2026-08-27｜OCR 本地双运行时架构冻结（v4-1154）

- 用户将 OCR 当前方向改为 OpenVINO + PP-OCRv6 Small 主力、ONNX Runtime + 同模型备用、最终人工确认，并冻结 Provider 增量规则：复用既有 routing/task/log/budget/COS/Worker，只补适配器、配置与一次真实验证。腾讯 OCR 候选从未部署、开通、接 Secret 或真实调用，现转为待退休未发布历史差量；进行中的媒体切片已停止，零外部动作。新切片只在既有 local-sidecar/registry 上登记两个独立本地 deployment descriptor 与 loopback 配置，路由优先级和人工确认继续使用现有能力，不新建控制台、状态机、权限、任务、日志或预算体系。

## 2026-08-27｜PP-OCRv6 Small 本地主备适配器候选（v4-1155）

- `LOCAL-OCR-BACK-03A` 在既有 screen-text local-sidecar、registry、routing、Worker、COS 媒体桥和人工审核上完成最小增量：OpenVINO 与 ONNX Runtime 为两个独立 loopback Provider，共用一个显式 PP-OCRv6 Small 模型 SHA-256，OpenVINO 仅作为默认描述符，备用推进继续由已有 routing priority 决定；没有新增控制台、状态机、权限、任务、日志或预算。请求体/帧字节、超时、错误分类、unknown 对账和真实提交 receipt 均有边界，腾讯 OCR 历史差量不进入活动 registry。规划新鲜复验 3 文件 22/22、backend typecheck/build 全绿；物理 turn 投影为空但精确写入与命令事实存在，记为 `observer_degraded`。本里程碑只代表代码候选，运行时、模型、部署和单样本真实推理仍未发生；下一片仅做服务器只读能力清单。

## 2026-08-27｜本地 OCR 服务器能力盘点与运行面冻结（v4-1156）

- `LOCAL-OCR-SERVER-03B` 全程只读、服务器零写入：测试机为 x86_64/4 vCPU Xeon 6252，具备 AVX2/AVX-512/VNNI，约 2 GiB 内存、无 swap、约 86 GiB 磁盘可用；系统仅有 Python 3.11.2，未发现 uv/pip3/ffmpeg、OpenVINO/ONNX Runtime/PaddleOCR/PaddlePaddle/NumPy、限定目录虚拟环境、PP-OCRv6 模型或 OCR systemd unit，3100/3101/8000/8001 当前空闲。桌面回合投影为空，但原始 session 有 task_received/work_started、三轮只读 SSH 与结构化 artifact_written，记为 `observer_degraded`。依据官方 PaddleX/PaddleOCR 高性能推理能力，运行面冻结为一个可参数化 sidecar 包装，分别强制 `openvino` 与 `onnxruntime` backend，共用本地校验过的 PP-OCRv6 Small det/rec 模型包；自动下载、内部 fallback 与第二控制面均禁用。下一片先形成零模型可测的本地进程候选，部署和真实推理后置到一次合并授权。

## 2026-08-27｜PP-OCRv6 Small 可部署 sidecar 候选（v4-1159）

- `LOCAL-OCR-BACK-03C` 形成严格 loopback、可生产构建的本地 OCR sidecar：一个常驻 PaddleX HPI Python 进程按 `openvino|onnxruntime` 参数化，显式加载本地 `PP-OCRv6_small_det` 与 `PP-OCRv6_small_rec`，READY 后才监听，启动/请求超时分离，禁止自动下载、静默 fallback、跨请求重复建模与敏感输出；兼容官方 `res`/`json` 结果及四值框/多边形。正式构建生成 Node sidecar dist，Python runner/env 作为发布伴随文件。规划新鲜复验 7 files/40 tests、backend typecheck/build 和限定 diff-check 全绿；本里程碑仍未安装运行时、模型或部署。用户确认目标机为 8 GB 内存并已授权两套 loopback 引擎与 synthetic 真推理，下一 Owner 切至 SERVER，写入前仅核对同机身份/内存；现场仍为约 2 GiB 时停止，避免部署到错误主机。

## 2026-08-27｜PP-OCRv6 3.7 服务器实测与 runner 契约回切（v4-1160）

- `LOCAL-OCR-SERVER-03D` 证实目标机为 7.8 GiB RAM/约 7.0 GiB 可用、4 vCPU、约 87 GiB 磁盘，资源足够；官方兼容组合为 PaddleOCR 3.7.0、PaddleX 3.7.2、PaddlePaddle 3.2.0、OpenVINO 2025.4.1、ONNX Runtime 1.22.0 与 ultra-infer-python 1.2.0，PP-OCRv6 Small det/rec registry 与官方归档 SHA 均通过，且无 langchain/openai/genai。
- 真初始化把阻塞缩小为本地 runner 契约：原配置缺 `pipeline_name`/DocPreprocessor 结构；临时补齐后旧 `paddle2onnx==1.3.1` 生成 0 字节 ONNX，OpenVINO 无法加载。SERVER 未启动 OCR unit、未改 backend/Worker/COS/业务数据；远端 release/models/work、模型临时件、日志、归档及本地 staging 全部精确清理，既有 backend/Worker active 且 `NRestarts=0`。总控转入 `LOCAL-OCR-BACK-03E`，只补 PaddleX 3.7 完整配置与 `paddle2onnx==2.0.2rc3` 运行口径，随后回同一 SERVER 重验，不重做已通过的资源、版本和模型门。

## 2026-08-27｜PaddleX 3.7 runner 契约修复候选（v4-1161）

- `LOCAL-OCR-BACK-03E` 只调整 Python runner 与一份邻接测试：补齐 PaddleX 3.7 OCR 的 `pipeline_name/text_type/use_doc_preprocessor/use_textline_orientation/SubPipelines/SubModules`，显式关闭文档预处理和文本行方向，保持本地 PP-OCRv6 Small det/rec、手动 OpenVINO/ONNX backend、无下载/无内部 fallback、单进程只初始化一次 pipeline。专项 9/9、邻接 7 文件 41/41、backend typecheck/build、`py_compile` 与限定检查通过，规划复验专项 9/9、typecheck 通过；临时 `__pycache__` 已清理，无服务器或网络动作。既有部署授权继续有效，总控直接转 `LOCAL-OCR-SERVER-03F`，只重验修订 runner 与两套真推理，不重复控制面或要求用户再次授权。

## 2026-08-27｜OpenVINO 真推理通过与 native 日志阻塞（v4-1162）

- `LOCAL-OCR-SERVER-03F` 固定 PaddleX 3.7.2 官方依赖 `paddle2onnx==2.0.2rc3` 后，OpenVINO 对 synthetic 中文完成真推理：返回 1 个非空框、置信度约 0.9997，det/rec ONNX 转换产物约 9.9/21.2 MB 且非零。正式 Node sidecar 仍正确 fail-closed，原因是 UltraInfer/C++ 在 READY 前直接向 OS stdout 写入 8 行非 JSON，绕过 Python contextlib；环境变量抑制复测无效。SERVER 未继续启动 ONNX，已删除 03F release/models/work/env/unit/归档/staging 与全部 OCR 进程，残留 0；backend/Worker active、`NRestarts=0`。总控转 `LOCAL-OCR-BACK-03G`，只补进程 fd 级日志隔离与 native 直写回归，再回同机验证。

## 2026-08-27｜本地 OCR native fd 协议隔离候选（v4-1163）

- `LOCAL-OCR-BACK-03G` 仅在 Python runner 增加进程 fd 级隔离：独立保留协议输出 fd，pipeline 初始化/推理期间把 stdout/stderr fd 指向 devnull，退出时恢复并关闭；READY/boxes 继续严格走 NDJSON。fake PaddleX 在 create/predict 内直接 `os.write(1/2, ...)` 的 OpenVINO/ONNX 回归证明 native 噪声不泄漏、stderr 为空、pipeline 仍只初始化一次。专项 9/9、邻接 7 文件 41/41、backend typecheck/build、py_compile 与限定检查通过，规划复验专项 9/9、typecheck 通过，临时缓存清理。总控直接转 `LOCAL-OCR-SERVER-03H` 做最终主备顺序真验证，既有部署授权继续有效。

## 2026-08-27｜本地 OCR 探索暂停与根因路线收敛（v4-1167）

- 03H–03J 没有形成可部署 OCR：依次暴露默认 PyPI 大包超时、误取 GPU UltraInfer wheel、探针脚本噪声；03J 接到审计指令后立即终止进程并清理临时 cache/release/models/work/env/archive/script/log，OCR unit=0、backend/Worker active 且 `NRestarts=0`。
- 规划只读核对旧本地应用实物与官方资料：旧应用成功基线是 RapidOCR 3.9.1 直接加载 PP-OCRv6 Small ONNX，OpenVINO 2026.2.1 主力、ONNX Runtime 1.27.0 备用，未使用 PaddleX/PaddleOCR/Paddle2ONNX/UltraInfer；五类错误均来自新增的配置、转换、HPI 包选择、native 协议或下载层，不是 8 GB 服务器/CPU 推理能力不足。
- 唯一路线冻结为保留现有 Node sidecar、严格协议及 routing/task/log/budget/COS/Worker，只由 BACK 收敛 Python runner 到 RapidOCR 直载模型；SERVER 不恢复 03J，待 BACK 门通过后才按精确 wheel/model SHA 做一次离线安装和 synthetic 主备顺序验收。审计见 `docs/governance/LOCAL-OCR-ROOT-CAUSE-AUDIT-2026-08-27.md`；当前仍未部署或启用本地 OCR。

## 2026-08-27｜RapidOCR 直载 runner 本地候选（v4-1169）

- `LOCAL-OCR-BACK-04B` 移除 Python runner 对 PaddleX/Paddle2ONNX/UltraInfer 的运行依赖，改为 RapidOCR 3.9.1 显式加载本地 PP-OCRv6 Small det/rec 与内置分类 ONNX；OpenVINO/ONNX Runtime、Small、PP-OCRv6/PP-OCRv4 均传 RapidOCR 真 Enum，不下载、不静默 fallback，原 Node sidecar、NDJSON/HTTP、稳定身份、资源限制、Provider 与控制面不变。
- 规划首次审核发现字符串枚举会被 RapidOCR 3.9.1 `ParseParams.update_batch` 必然拒绝，BACK 定向返工后用等价 Enum fake 锁定真实契约；两引擎、连续两请求、两种框、native stdout/stderr 隔离与单进程一次初始化均覆盖。新鲜验收为 4 文件 25/25、backend typecheck/build、Python compile 和限定检查全绿。
- 下一片只在测试服务器按固定核心 wheel 与 det/rec/cls SHA 完整缓存后离线安装，顺序真验 OpenVINO/ONNX，并只保留 OpenVINO 单引擎 loopback 候选；不启用业务路由或访问真实素材。

## 2026-08-27｜RapidOCR 双引擎真推理通过与 Node 启动门回切（v4-1170）

- `LOCAL-OCR-SERVER-04C` 完整校验并安装 RapidOCR 3.9.1、OpenVINO 2026.2.1、ONNX Runtime 1.27.0 与 det/rec/cls 三份模型，forbidden Paddle/PaddleX/Paddle2ONNX/UltraInfer/GPU/CUDA 为 0。OpenVINO 与 ONNX direct runner 按顺序各自 READY、连续 2 次 synthetic 中文非空合法框、严格 NDJSON、同 PID/单次加载全通过；峰值 RSS 约 877/431 MiB，服务器剩余内存约 6.87/6.89 GiB。
- 唯一失败层收窄为正式 Node sidecar：READY/3100 监听前稳定报 `LOCAL_OCR_SIDECAR_START_FAILED`、exit 2，systemd 曾自动重启 41 次；正式 Node HTTP synthetic 因启动门失败而 `not_run`。这不推翻 direct 引擎、模型、CPU 或内存证据。
- SERVER 已完整回滚并清除本轮 release/cache/models/venv/env/unit/进程/端口、临时 helper、依赖 cache 与 synthetic 图片，残留 0；backend/Worker active 且 `NRestarts=0`，无业务 route、真实素材、COS、DB 或控制面动作。结果见 `docs/deployment/LOCAL-OCR-SERVER-04C-RESULT.md`；下一 Owner=BACK，只修 Node→Python READY 启动边界后回同机重验服务门。

## 2026-08-27｜RapidOCR 正式 Node 启动边界本地排除（v4-1171）

- `LOCAL-OCR-BACK-04D` 新增生产构建后的 `entry.js → PaddleHpiProcessEngine → 实际 Python runner → READY → HTTP` 回归；fake RapidOCR/cv2/numpy 与 runner 共置，在生产最小 `env={PATH}` 下由 OpenVINO、ONNX Runtime 各连续完成两次请求，且单次初始化、stdout 仅监听事件、stderr 为空。规划阻止了用 `PYTHONPATH` 人为制造依赖，生产源码无需再叠补丁。
- 规划新鲜复验本地 OCR 4 文件 27/27、backend typecheck/build、Python compile 与精确检查通过。04C 的正式服务失败因此回切到服务器 unit/env/release 装配差异；总控转 `LOCAL-OCR-SERVER-04E`，只以禁止自动重启风暴的正式 unit 顺序重验两 backend 的 Node 服务门，不重复已通过的 direct runner、模型、CPU 或资源门。

## 2026-08-27｜正式 Node 服务门锁定 venv launcher 根因（v4-1172）

- `LOCAL-OCR-SERVER-04E` 正确组装固定 RapidOCR/OpenVINO/ONNX Runtime、三模型与 fresh Node/runner 指纹，但 OpenVINO 正式 sidecar 在 READY 前 exit 2/`ENGINE_UNKNOWN`；根因是 Node 配置校验把 release 的 `venv/bin/python` 符号链接 realpath 成系统 `/usr/bin/python3.11`，从而绕过 venv 并无法导入 RapidOCR。ONNX 按首错停止，两个 HTTP 门均未冒充执行。
- unit 使用 `Restart=no`，`NRestarts=0`；release/cache/models/env/unit/进程/3100/3101 与本地 staging 已精确回滚，backend/Worker 保持 active。总控转 `LOCAL-OCR-BACK-04F`，只保留经校验的 launcher 原始绝对路径并补 symlink 回归；禁止借机转发 `PYTHONPATH`/全量环境、换包模型或再造启动路线。

## 2026-08-27｜venv Python launcher 路径修复候选（v4-1173）

- `LOCAL-OCR-BACK-04F` 将 runner executable 校验拆为专用 launcher 语义：绝对路径和最终普通文件仍强校验，但配置与 spawn 保留原始规范化路径，使 Linux `venv/bin/python` 继续读取邻近 `pyvenv.cfg`；runner script 仍 canonicalize，模型 containment、最小 env、RapidOCR/模型/HTTP/NDJSON 与 Provider/控制面不变。
- 跨平台 junction/file-symlink 回归同时证明 executable 不被 target 替换、script 仍 realpath；规划新鲜复验本地 OCR 4 文件 28/28、backend typecheck/build、Python compile 与限定检查通过。fresh sidecar SHA=`99EE3EB60A220B5C41ED7F1A50A2020C50D9511CE37F5E2198EE475C5967C3ED`；总控转 `LOCAL-OCR-SERVER-04G`，只重验两 backend 的正式 Node HTTP 门。

## 2026-08-27｜RapidOCR 正式 Node 主备门通过（v4-1174）

- `LOCAL-OCR-SERVER-04G` 使用修复后的 launcher 语义完成两套正式 Node HTTP 门：OpenVINO、ONNX Runtime 均在 READY 后连续两次返回 200 与非空合法中文框，同 PID/单次加载、`NRestarts=0`；最终仅 OpenVINO active+enabled/127.0.0.1:3100，ONNX stopped+disabled/3101 无监听，服务器只保留一个 OCR runner。release、manifest、模型和 root-only unit/env 按成功态保留，临时 staging/synthetic/公网监听残留 0；backend/Worker、COS、DB、业务路由和控制面未改。
- 引擎部署里程碑已完成；要让既有 screen-text Worker 处理视频，当前唯一缺口是代码合同已经引用但仓库尚无实现的 `QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN`。总控转 `LOCAL-OCR-BACK-05A`，只补有界 ffprobe/ffmpeg executable 与回归，继续复用既有短时 COS URL、Worker、Provider registry、路由、日志、预算和证据存储。

## 2026-08-27｜有界视频抽帧器本地候选通过（v4-1177）

- `LOCAL-OCR-BACK-05A/05A-R1` 只实现既有 `QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN` 合同：HTTPS 输入经显式绝对路径 ffprobe/ffmpeg 有界抽帧，固定 manifest 输出；单帧 7.5 MB、累计 32 MB、总像素/帧数/时长门并行生效，remote size 缺失/`N/A` 不误判。top-level SIGTERM/SIGINT 会取消并等待当前子进程，实际忽略 SIGTERM 的强制终止回归证明返回前 PID 已退出且无 manifest。规划新鲜验收 5 文件 30/30、backend typecheck/build、diff-check 通过；extractor SHA=`4C92D359F451BF571AAAD0F05029D46B550E15BBE13667DF80B33F46FFE1E5B3`。本轮未改 Worker/COS/Provider/路由/任务/预算、服务器或引擎；总控转 SERVER 05B，仅部署 immutable extractor 并做 synthetic COS→抽帧→OpenVINO 数据面门。

## 2026-08-27｜COS→抽帧→OpenVINO synthetic 数据面通过（v4-1178）

- `LOCAL-OCR-SERVER-05B` 将 fresh extractor（JS SHA=`B9C09ABC4BD08785D269AC7DCCDD5E8E9C137A742C6EC79C9BF27C145D8FF498`）作为 root-owned immutable release 部署；唯一 synthetic 中文视频经私有 COS Put/Head、10 分钟 GET URL、ffprobe/ffmpeg 得到 2 帧，现有 OpenVINO 3100 返回 200 与 2 个合法非空框。临时 COS 对象 Delete 后 Head=404，远端/本机临时件 0；OpenVINO 保持单常驻/NRestarts=0，ONNX disabled，backend/Upload Worker/DB/route 均未改。结果见 `docs/deployment/LOCAL-OCR-SERVER-05B-RESULT.md`。规划随后在生产装配审计中发现 backend 与独立 Worker 仍各自使用进程内 evidence Map，故先转 BACK 05C，把证据层薄接到已有对象存储，再启动业务 Worker。

## 2026-08-27｜ScreenText 持久 evidence 生产装配候选（v4-1181）

- 用户在获知 OCR 衍生截图可能包含素材画面/文字后，明确授权写入现有私有腾讯 COS。`LOCAL-OCR-BACK-05C` 只新增 Production S3/DeliveryStorage 到 ScreenText evidence 的薄适配：Put/Head/Get/Delete 复用同一对象命名空间，持久 Head 提供 content type，读取重算 SHA/大小；两个独立实例 A 写/B 读/delete/missing 通过。production server 与 Worker 不再回退各自进程内 Map，Worker 的 signer/media/evidence 复用同一 S3 实例，无持久 S3 时启动前 fail-closed。规划新鲜验收无数据库 5 文件 35/35、backend typecheck/build、diff-check 通过；本机旧 DB 套件只因 55432 未启动而未进入断言。总控转 SERVER 05D，先原子发布 backend/Worker 服务门，不提前创建 route 或 synthetic 业务数据。

## 2026-08-28｜持久 evidence 与 ScreenText Worker 生产候选发布（v4-1186）

- `LOCAL-OCR-SERVER-05D/05D-R1/05D-R2/05D-R3` 作为一个发布里程碑收口：前三次分别在 env 父目录组、普通部署身份读取 root-owned `/opt` 链、401 响应采集谓词处 fail-closed 并完整回滚；它们均为发布编排/验证器缺陷，不是 OCR、COS 或业务 API 失败。R3 复用同一 archive，在统一 sudo root 边界和文件化 401 校验后原子通过；release `/opt/qimao-terms-cloud/releases/20260827-local-ocr-05d-backend-r1` 保留，backend、upload-completion Worker、screen-text Worker 与 OpenVINO active/NRestarts=0，ONNX inactive/disabled，三轮稳定观察一致。未写 route、业务 DB/COS 或真实素材。发布后接线审计发现控制面仍只允许 fake adapter 且 connection-test Worker 仍装配 fake registry；总控转 BACK 05F，只修真实本地 OCR registry 与一次 loopback 协议 probe，再进入 route/synthetic 闭环。

## 2026-08-28｜真实本地 OCR 控制面连接候选（v4-1187）

- `LOCAL-OCR-BACK-05F` 将既有控制面从 fake-only 收敛到精确的 OpenVINO/ONNX adapter key；实际 env registry 未启用的 key 仍拒绝，生产 connection-test Worker 缺本地 OCR 配置即 fail-closed且不回退 fake。真实连接 probe 使用 `testRunId` 稳定身份、一次 loopback 调用和不含真实素材的有效 320×128 PNG；success/timeout/401/unknown 与 inactive key 均有回归。首版 PNG 只有 signature、IDAT 已损坏，规划用 chunk/zlib 审计发现后定向返工；修订版 IHDR/IDAT/IEND、解压长度和声明尺寸一致。规划新鲜复验 2 文件 17/17、backend typecheck/build、diff-check 通过；下一片只发布候选并运行一次真实 OpenVINO connection test，不创建 route 或业务任务。

## 2026-08-28｜本地 OCR 私有 evidence 与 synthetic 业务闭环（v4-1223）

- 在既有 routing/task/log/budget/COS/Worker 上完成 OpenVINO + PP-OCRv6 Small 主链：生产 Worker 从私有腾讯 COS 读取 synthetic MP4，有界抽取 4 帧并完成 4 次 OCR，生成 4 个 candidate/log 与 4 张私有 PNG evidence；每个 evidence 均经独立 Put/Head/Get、content-type、大小和 SHA 验证。active route 保持既有 OpenVINO target，未新建控制台、状态机、权限或预算；ONNX Runtime 已通过独立真实 HTTP 门但保持 inactive/disabled，作为人工切换备用。
- 员工页最初因 backend 主进程仍停在 05G-R4 contracts（model maxLength=80），无法序列化数据库中 86 字符的 PP-OCRv6 model 而 detail=500；current/Worker 已是 06K。只重启 backend 加载现成 06K contracts（maxLength=160）后，页面显示待审核 batch、4 条候选和 evidence 面板；服务端窗口为 list 2×200、detail 1×200、candidates 2×200、evidence 1×200，detail 500=0，backend/两个 Worker 均 active 且 NRestarts=0。
- 唯一 synthetic 项目验收后精确清理：源 MP4+4 PNG 共 5 个 COS 对象均 Head=404，project/batch/job/attempt/candidate/asset 与关联 DB 残留为 0，其他 project 数量保持 17；生产 evidence 持久化能力、active route、06K runtime 与 05G-R4 回滚点未改变。该结论只代表 synthetic 业务可用，尚未使用真实用户素材。

## 2026-08-28｜腾讯 ASR 私有 COS 真实连接探针通过（v4-1236）

- 早期 02A-K 均在外部写入前 fail-closed，逐步排除旧 release 缺 SDK、Windows TTS、Node 路径、CSV 传输与 pnpm/Junction 跨平台依赖树问题；整树 deploy/复制路线正式停止。最终临时 esbuild 0.28.2 CJS runner 静态打入官方 ASR SDK、现有 ProductionS3CompatibleUploadStorage、TencentOfficialAsrTransport/TencentAsrAdapter；两个已证实可选的 `encoding`/`supports-color` 分支内联闭合，metafile 第三方 external=0，本机与 Linux 无 node_modules 双自检均为 networkCalls=0。
- 使用腾讯官方仓库固定提交 WAV（129,998 bytes，16 kHz/16 bit/mono/4.06 s，SHA-256=`07805781706572202743fa5466187edb6b5410e0678ec162b7ae05f4ae271826`）完成唯一真实数据面：私有 COS Put/Head、600 秒签名 GET、独立 GET 的大小与 SHA 一致；ASR `ap-shanghai/16k_zh/SourceType=0` 只 CreateRecTask 一次，随后只 Describe 同一数字 TaskId 至 `completed`，`quality=pass`、1 cue、4060 ms。
- finally 删除唯一 COS 对象并确认 Head=404，本机/远端 entry、bundle、metafile、CSV、WAV 与临时目录均为 0；Secret、签名 URL、对象键、TaskId 与供应商原始正文均未进入仓库、日志或报告。本轮 `remaining_gap=none`，但未持久配置 ASR Secret、未部署 ASR Worker、未创建 active route 或业务任务；这些属于后续新的业务发布范围。

## 2026-08-28｜腾讯 ASR Worker synthetic 重放硬停止与发布模板回切（v4-1269）

- 在 02L 真实连接探针通过后，BACK 只补控制面 allowlist/非零计价、生产写门和 runtime 直接依赖；后续部署继续复用现有 routing/task/log/budget/COS/Worker，没有新建第二套控制面。规划用官方 dedicated-lockfile deploy 与相对 symlink tar 收敛出 Linux 可移植候选，真实 storage/ASR/Worker/app/server 五入口均可加载；systemd `/usr/bin/node`、daemon-reload 时序、组合加载门无诊断、`current` symlink direct-run、drop-in 目录和 EnvironmentFile 接线依次被隔离为发布编排首因，而不是 ASR Provider 或业务代码失败。
- Linux Node 24.19.0 独立探针证明默认经 `current` symlink 启动时 direct-run guard=false，`--preserve-symlinks-main` 后=true；03T 随后证明 Worker 可先 active/NRestarts=0，但因没有继承完整对象存储环境在 `QIMAO_S3_REGION` 处退出。最后一次 03U 按硬停止条件在部署前检查冻结路径 `/etc/qimao-terms-cloud/object-storage.env`，发现实际 absent 后立即停止：没有上传/安装 candidate、启动 ASR、下载 WAV，COS/Tencent/API/DB/control-plane 写入均为0；current保持06K，既有服务健康，handoff/temp残留0。
- ASR synthetic 结论为“未通过、业务重放已停止”，不能用02L连接探针冒充业务闭环。下一任务唯一允许范围是统一 Worker 发布模板与本地同构预检：在本地提前证明portable archive、symlink启动、canonical drop-in、完整EnvironmentFile集合、effective ExecStart及首错诊断；在该模板通过前不得继续ASR业务重放。术语热词MVP仅保留后续方案，不并行实施。
- `WORKER-RELEASE-SERVER-01A` 随后只在 `deploy/` 落地统一声明与离线预检器：ASR fixture 声明 backend/object-storage/provider 三类 EnvironmentFile、canonical drop-in 与 preserve-main ExecStart；规划新鲜复核 Node syntax、18门self-test、drop-in逐字渲染和限定diff-check全绿，缺drop-in目录、缺provider声明、standalone静默均按预期失败，临时件清零。该产物尚未验证真实systemd或主机env，不改变ASR硬停止结论；后续若获新方向，必须先基于模板冻结权威EnvironmentFile路径和主机前置门。

## 2026-08-28｜ASR 提速复位、主机基线与单候选硬停止（v4-1275）

- 协作协议在原 v6.11 内补入第一性原理提速预算与“外部先证”：证据按身份复用，同候选单构建/单部署/单 synthetic，同层同因两次失败后硬停；新 SDK/引擎/存储/打包/部署路径首次实现前先核对官方文档、官方 GitHub release/issue 与必要成熟实现，不增加新治理版本。
- `WORKER-RELEASE-SERVER-01B` 只读主机基线证明 current/06K/五入口存在且取得哈希；`object-storage.env` 实际为 `root:qimao 0640`，旧“absent”是非 root 可见性误判。live ASR unit 仍为 `qima:qima + /usr/bin/node`、无 canonical drop-in/preserve flag/provider env，与仓库 `qimao:qimao + /usr/local/bin/node` 漂移；远端零写入。
- `TENCENT-ASR-SERVER-04A/04A-R1` 严格消耗两次构建预算：首次因捕获文件预先占用 pnpm 空目标而在 deploy 前失败；定向修正后 dedicated-lockfile deploy 成功（lock 169、闭包 170），真实五入口 import 全绿，但实际 standalone 因本地 PostgreSQL `127.0.0.1:55432` 未运行而 `ECONNREFUSED`。按标准不做第三次构建或临时绕过；临时候选清零，服务器部署/provider/WAV/COS/Tencent/API/DB/control-plane 写入均为 0，`CreateRecTask=0`。结果见 `docs/deployment/TENCENT-ASR-SERVER-04A-RESULT.md`；ASR synthetic 仍未完成。
- 用户重新授权后，规划冻结“项目现有 PostgreSQL + 一次性隔离库 + actual standalone”路线；SERVER 完成隔离库 43/43 迁移、真实 Worker 约 8 秒存活并冻结唯一 archive SHA=`e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30`。04E 的重启风暴被精确定位为 drop-in 错装旧身份；04F 修为 `qimao:qimao` 后，provider、三份 env、systemd 与 5/5 `active/running,NRestarts=0` 全部通过。04G/H 又证明生产控制面会留下不可删除历史，而一次性隔离 DB + loopback app/Workers 可零代码完成并全清理，业务上传合同则要求 MP4。用户批准服务器生成匿名 MP4 后，04I 唯一 harness 先修正一次“解包前导入”的顺序错误，第二次在任何解包、隔离库、COS/Tencent/业务写入前因服务器无既有语音生成器 `NO_EXISTING_SPEECH_GENERATOR` 停止并清零。规划确认本机已有 Windows 内置语音与 ffmpeg 8.0.1，可不安装软件生成 MP4；因这会把载荷来源从服务器改为本机，总控暂停等待本机→服务器/COS/Tencent 的精确外传授权。

## 2026-08-29｜ASR synthetic 执行编排复盘与外部重放冻结（v4-1316）

- 04K 至 05K 的阻断逐项对账后确认：腾讯 ASR 数据面、冻结候选和 Worker 启动已有独立通过证据；本阶段没有供应商失败证据。阻断集中在 harness 权限/暂存扩展名、错误的跨次媒体 SHA 验收、bootstrap 调用参数、本机临时路径及手工 SSH 参数，其中 05I 漏传 `-i`、05K 又把同一 key 名拼错，均为执行编排缺陷。
- 结构性首因是调用端仍在每轮即时拼装媒体、SSH/SCP、远端 root、env 与 bootstrap 参数，权威值散落在任务卡和文档中；逐次“任何失败即停”还把零外部写入的本地拼写错误放大成完整新切片。规划冻结所有外部重放，下一步先审核一个机器可验证的单入口：OpenSSH config 固定身份、runner 生成并消费完整计划、零写入 preflight、正式运行最多一次 Tencent 创建；通过前 SERVER 保持 idle。

## 2026-08-29｜ASR 单入口越过可读性门并锁定数据库角色缺口（v4-1334）

- 05L 单入口、精确 child code 与 05W provider target 返回修正通过离线门后，05X 只执行一次 frozen plan：媒体、远端 root、传输、SHA、解包、三份 env/provider 和七类可读性检查全部通过，随后以 `DATABASE_CREATE_FAILED` 停止；business/COS/Tencent/CreateRecTask 均为 0，隔离 DB/root/媒体清理完成、residual=0、生产基线未变。
- 05Y 一次只读 SSH 证明 `createdb` 可经既定 postgres sudo 路径执行，但 PostgreSQL 中 `qimao` 与 legacy `qima` 角色均不存在，因此 `createdb --owner=qimao` 的唯一首因是 owner role absent。PostgreSQL 官方 peer/LOGIN 合同支持无密码的同名本机角色；由于新增共享集群登录角色属于持久权限主体变更，05Z 未派发、server writes=0，等待用户明确批准。
- 同期只读核对术语热词现状：仓库已有不可变 TermVersion 投影、清空/去重、digest、批次/重试版本固定与回执字段；腾讯适配器仍只发 `HotwordId`，能力常量也未对齐官方临时 `HotwordList` 的 128 项与单项 30 字符/最多 10 个汉字限制。后续只做该临时热词 MVP；无确认版本路径需显式可空事实，DeepSeek V4 Flash 只接既有术语提取 adapter，不进入 ASR 热词序列化。

## 2026-08-29｜腾讯 ASR synthetic 通过与术语热词 MVP 本地候选（v4-1395）

- 109 唯一重放在同一隔离身份内完成；112 只读数据库对账证明 batch/job/attempt completed，result/cue/term-cue/usage/operation 均已持久化，quality=pass、reconciliation=final。源码合同与持久事实共同证明腾讯适配器只有取得 completed 才会写入该终态，因此 ASR synthetic 正式判定通过；后续单次 Describe 无响应不逆转已落盘事实。113 精确清理 helper 在 env 路径、显式 DB 与 helper 错误契约三层连续失败后硬停止，未产生删除；109 隔离 DB/root 与可能 COS 对象保留为登记残留，生产基线未变。
- 热词 MVP 只在既有 ASR 数据流增加 Tencent 请求级 `HotwordList` 和 nullable TermVersion：显式 confirmed UUID、创建时选择最新 confirmed、显式 null 三种语义被区分；eligibility/preparation/direct create/dispatch/read/retry 共享同一锁定值。无 confirmed 版本不阻断 ASR且回执为 `unused/no_confirmed_term_version`，confirmed 但零投影不会误报无版本；数据库仅放宽 batch/job/result 三列并同步 attempt receipt 约束，没有新平台、控制台、Provider、状态机或部署流程。
- 规划独立启动项目本地 PostgreSQL 18.4 并成功执行 migration up；修正旧测试仍把 missing_terms 当 blocker 的过时预期，并识别一次 500 为旧 contracts runtime 未重建而非业务失败。重建现有 contracts 后，Tencent adapter/runtime 与 ASR command/eligibility/dispatch 共 4 文件 48/48、contracts/backend typecheck、migration syntax 与精确 diff-check 全绿；本地 PostgreSQL 已停止、临时 Vitest 配置已删除。本轮未连接腾讯/COS/测试服务器、未读取 Secret、未发 CreateRecTask，热词候选尚未部署。

## 2026-08-29｜术语 Provider 异步底座与 unknown 防重发（v4-1400）

- `TERM-PROVIDER-BACK-116` 复用现有术语候选、人工裁决、TermVersion 与导出链，只增加一个 OpenAI-compatible 适配器和 `term_extraction_runs` Worker：DeepSeek V4 Flash 为默认 preset，custom 只换 endpoint/model/key；POST 只创建 running run 并返回 202，Provider 请求不再占用普通 API 生命周期。一次运行把 endpoint/model/prompt/category order 保存为无 Secret 的不可变解析快照，响应严格校验 JSON、八类、真实 Cue ID 与 usage；Bearer key 不进入数据库快照或日志。
- Worker 使用 claim/lease，且在 Provider POST 前持久化 `provider_started_at`；已开始的未知外部写不会因租约过期自动 claim 或切换第二 Provider。Provider stub 3/3、既有术语回归 11/11（合计 14/14）、contracts/backend typecheck、两份迁移语法与本地 PostgreSQL 18.4 migration up、精确 diff-check 均通过；本地 PostgreSQL 已停止。本片未读 Secret、未调用真实 DeepSeek/COS/腾讯、未部署，也未修改管理员前端。
- 管理员需求已冻结为复用现有 system-control：117 先增加 `terms` engine/routing 与不可变 prompt/category/provider 配置；随后 BACK 运行时接线与 FRONT 管理员页面可在契约冻结后并行。最终只做一次 DeepSeek synthetic、确认 TermVersion 和带临时 HotwordList 的腾讯 ASR，不先部署环境变量临时版。

## 2026-08-29｜术语 engine/routing 控制面后端（v4-1401）

- `TERM-CONTROL-BACK-117` 没有新建 Provider/提示词平台，而是在现有 system-control 中增加 `terms` capability、`terms_api` 单池与不可变 `runtime_config`：DeepSeek preset 锁定官方 HTTPS endpoint/model，custom 保存显式 HTTPS endpoint/model，二者共同保存 prompt 与八类完整唯一排列；Secret 继续只暴露引用/摘要。原 deployment enabled/disabled、ordered targets、active pointer、历史版本和发布流程继续作为唯一状态源。
- 本地 PostgreSQL 18.4 真实 migration up 通过；旧 ASR/OCR 三池和 screen_text primary/fallback 迁移仍保持全局连续、唯一 preferred。engine/routing/migration 三份专项 16/16、contracts/backend typecheck、migration syntax、仓库验证与精确 diff-check 全绿；本地数据库已停止。未修改管理员前端或术语 Worker，未读 Secret、调用 Provider、部署或提交推送。
- 后续按文件不重叠并行：BACK 118 只把 run/attempt/Worker 接到已发布 route/deployment/Secret 快照并实现受限安全 fallback；FRONT 119 只把术语配置、八类顺序、API 主备与启停呈现在现有管理员站。二者通过前不做真实 DeepSeek。

## 2026-08-29｜FRONT-119 空交接状态修复（v4-1402）

- FRONT 首回合约 18 分钟后 `completed`，同期 `enginesPage.tsx`、`routingPage.tsx`、`changesPage.tsx` 有与术语控制台一致的真实写入，但 assistant/tool items、测试证据与结构化终态均为空；该回合按既有硬门记为 `invalid-empty-handoff` / `orchestration_gap`，不得用文件存在推导前端已通过。
- 总控已把 119 从活动业务执行移出；同一固定 FRONT 仅补专项测试、typecheck/build/diff-check 和 `artifact_written|blocked`，禁止重建角色或重复实现。BACK-118 仍是唯一 active 业务切片。

## 2026-08-29｜FRONT-119 原始会话对账与本地门通过（v4-1403）

- 对精确完成回合回读原始 session 后确认：`wait_threads/read_thread` 漏投影，但原始记录保留全部命令与 `artifact_written`；FRONT 已完成术语 preset/custom、提示词、八类排序、Secret 引用、版本/启停及 `terms_api` 主备页面。故 v4-1402 的临时 `invalid-empty-handoff/orchestration_gap` 结论更正为 `observer_projection_gap`。
- 规划独立复跑管理员专项 37/37、contracts/system-frontend typecheck、contracts build、Vite build 与 diff-check 全绿；7 个临时依赖 junction 已精确删除。FRONT 转 review/idle，唯一 active 业务切片保持 BACK-118。

## 2026-08-29｜术语受控 Worker 与崩溃收敛通过（v4-1405）

- BACK-118 把一次 run 原子绑定 active `terms_api` route、全部 enabled 有序 target、配置摘要和每 target 唯一 attempt；Secret 只按引用进入 Worker 调用栈。只有明确 `external_not_accepted` 才切备用，认证/计费/校验、200 协议错误、网络 unknown 均停在当前 attempt。
- 规划审核发现 marker 后进程崩溃会留下不可领取 running；R1 在 Worker 领取前原子 sweep 过期 marker attempt 为 unknown 并终止 run，备用保持 queued。崩溃回归、术语/Provider 18 项、迁移 1 项、backend typecheck、迁移语法和 diff-check 均通过，未读 Secret、未调用 Provider、未部署。
- 下一唯一缺口不是重做控制面，而是让现有 root-only `provider.env` 成为 server/Secret validation/term Worker 共用的生产 Secret provider，并让 terms connection test 按已保存 runtimeConfig/model 核对；范围冻结为 BACK-120。

## 2026-08-29｜术语生产 Secret 宿主适配通过（v4-1406）

- BACK-120 在现有 Secret provider 模块增加单一 Base64 JSON env provider，最多 8 个 DeepSeek/custom 候选；缺失保持 not_configured，坏 Base64/UTF-8/JSON/字段/重复/超限启动 fail-closed。公开发现、引用、日志与数据库只见身份/显示名/digest，原值只在 Worker `resolveValue` 调用栈。
- production server、Secret validation Worker、term Worker 已共用同一 factory，旧 `DEEPSEEK_API_KEY` 不再是受控 server 启动前提；terms connection test 使用保存的 runtimeConfig/model 核对 custom descriptor 且保持零网络。专项 5 files / 36 tests、contracts/backend typecheck/build、迁移检查和 diff-check 通过。
- 本地实现关闭后转 SERVER-121：只发布一个 backend+管理员站候选、安装 root-only DeepSeek 候选 env 并启动既有 Worker；本片不创建控制面事实或调用 Provider，失败自动回滚。

## 2026-08-29｜术语控制面首次发布因 CRLF 回滚（v4-1407）

- SERVER-121 冻结唯一 backend+system-frontend archive（SHA=`6d0e9221cfb07757cf9ea0b92a1b7e0aa1d0dfb777c47e5d164827faa027ed01`），本地 11 项 import probe、152/152 JS check 与静态敏感扫描通过；唯一远端执行在迁移和服务切换前退出，121 release/provider.env/drop-in/static/staging 均清零，旧 current/static/backend 恢复且 backend active、NRestarts=0，DeepSeek/COS/Tencent 调用为 0。
- 规划从原始工具输出取得唯一失败 `bash: line 29: $'\r': command not found`，并用本机 Node 24 同构 probe 证明 stdin 参数仍位于 `process.argv[2]`，推翻结果文档的 argv 归因。下一片只复用同一 archive，把临时脚本确定性转 LF，并以本机/远端 CR byte=0 与 `bash -n` 为执行前硬门；不重建候选或改业务代码。

## 2026-08-29｜术语控制面发布早期门转逐阶段诊断（v4-1408）

- 121-R1 复用同一 archive，已证明本机/远端脚本 CR byte=0、远端 `bash -n` 通过；唯一部署仍约 1.7 秒 exit=1 且 runner stdout=0。脚本按约回滚，新 release/provider.env/drop-in/static/staging 均 absent，旧 current/static 未变，backend 恢复 active/NRestarts=0；migration、DeepSeek、COS、Tencent 调用均为 0。
- 同一发布已两次在编排早期门失败，禁止第三次部署式试错。下一片只在隔离临时目录逐阶段核对 archive SHA、extract、同权限 manifest verifier 与既有 import probe，以固定阶段码锁定唯一失败命令；不得触碰 current、systemd、provider.env、数据库或静态站，结束时精确清理。

## 2026-08-29｜术语控制面 archive basename 首因锁定（v4-1409）

- `TERM-CONTROL-SERVER-121-DIAG` 在隔离 `/tmp` 中以固定阶段码证明 R1 首因：SCP 保留本地 archive basename，而部署脚本读取固定 `candidate.tar.gz`，因此 `archive_sha` 明确 path missing；tar、权限、manifest 607 项和 import probe 均未执行。诊断未读 Secret、未改 current/static/systemd/DB、未调用外部服务，finally cleanup 与 residual=0。
- 下一片仍复用同一 archive/SHA，不重建候选：SCP 显式指定远端 `candidate.tar.gz`，先在服务变更前通过 regular-file/bytes/SHA、extract、同权限 manifest 与 11-gate import 全门，再允许一次原路径发布；失败仍回滚停止，不另起部署路线。

## 2026-08-29｜术语控制面隔离 import 缺依赖闭包（v4-1410）

- 121-R2 已通过远端 archive regular-file/bytes/SHA、解包、root:qima 权限、Node24 manifest verifier 与 607 项；唯一失败为隔离目录 storage import。规划在本机把同一 archive 解到仓库外、同样不提供 node_modules，精确复现 `ERR_MODULE_NOT_FOUND` 且缺失 `@aws-sdk/client-s3`，随后删除临时目录并核对 residual=false。
- 候选按既有发布合同不携带 node_modules，真实部署脚本会复用旧 current 的依赖闭包；R2 预检遗漏该步骤，不能据此判定 storage 业务或候选失败。下一片先只读核对旧闭包/AWS 包，再按真实 runner 复制闭包完成全部 11-gate；仅全绿后允许一次原路径发布。

## 2026-08-29｜术语控制面两级 pnpm 闭包对齐（v4-1411）

- 121-R3 在服务变更前核对到旧 current 根级 node_modules 存在，但根级 `@aws-sdk/client-s3/package.json` 不存在，故停止并清理，未解包或触碰生产。项目既有 `LOCAL-OCR-SERVER-05G-AUDIT2/R4` 已记录可运行 release 使用根级 node_modules pnpm store + `backend/node_modules` 直接链接两级布局；R3 的单根目录门与复制计划不符合真实解析拓扑。
- 下一片不安装或下载依赖，先用当前 storage 入口真实模块解析核对两级闭包，再把根级与 backend 两个 node_modules 按既有 composite 模式复制到隔离候选；607 项 manifest 与 11-gate 全绿后才允许一次原路径发布。

## 2026-08-29｜术语控制面停止旧依赖拼接并回到自包含候选（v4-1412）

- 121-R4 证明旧 current 两级闭包能加载 storage、ASR runtime 与 ASR Worker，但不能加载当前 app；本轮仍在隔离 preflight 停止，部署/Secret/DB/systemd/DeepSeek/COS/Tencent 为 0，远端与本地临时件清零。继续逐包修补旧 release 会产生不可复现混合版本，旧闭包拼接路线正式停止。
- pnpm 官方 `deploy` 合同要求目标目录含隔离 node_modules 并可直接复制运行；项目 03J 已用固定 pnpm 11.21.0、non-legacy dedicated lock 与命令行 injected workspace 生成自包含闭包，验证所有 Junction 目标位于 deploy 根、转换为相对 POSIX symlink 后 Linux 五入口通过。下一片只生成一份当前自包含候选并做 Linux 临时门，不部署；候选通过后才另行发布。

## 2026-08-29｜自包含候选 scoped filter 口径修正（v4-1413）

- 122A 唯一 official deploy 在生成目标前返回 `ERR_PNPM_CANNOT_DEPLOY_MANY`；原始 argv 显示嵌套 PowerShell 中 scoped filter `@qimao-terms-cloud/backend` 未被引用，故不是 pnpm 闭包或候选失败。deploy 根、新 archive、下载、服务器、Secret 与生产写入均为 0，临时目录已清零。
- 规划用引用后的同一 filter 新鲜执行 `list --depth -1 --json`，结果恰为一个 `@qimao-terms-cloud/backend`。R1 只修正 argv 单参数边界，继续同一 non-legacy/cache-only/03J 自包含路线，不增加第二方案。

## 2026-08-29｜术语控制面自包含候选 Linux 门通过（v4-1414）

- 122A-R1 以 corrected 单一 quoted filter 完成 official non-legacy deploy：170 包、reused=170/downloaded=0；121 冻结 607 项业务 payload bytes/SHA 全匹配。新 archive 9,417,436 bytes、14,842 members、476 个归档内相对 POSIX symlink，外部/绝对/缺失目标均为 0；本机五入口与 Linux 11-gate/五入口全部 loaded。
- archive SHA=`c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`，manifest SHA=`48cc60997ee4d52ae700e2eab879ab31a6c07f421796a2565f8721d95feef961`；规划独立复算 bytes/SHA 与 SHA 文件一致，临时 remote/local residual=0。下一片只部署该自包含 archive，禁止重建或复制旧 current node_modules，不提前创建控制面或调用 Provider。

## 2026-08-29｜自包含候选部署在 staging 身份门停止（v4-1415）

- 122B 的 archive/manifest/SHA、607 file、4 static 与本机 Secret schema 门通过，但远端 staging 仍为 qimao-deploy 私有目录时先以 qima 执行 Node `--check`，因不可穿透返回 `MODULE_NOT_FOUND`；候选尚未解包，provider.env/迁移/release/current/static/systemd/外部调用均为 0，remote/local 临时件精确清理。
- 该首因在 122A Linux 门已有已验证顺序：staging 先装配 root:qima 0750 并证明 qima 可穿透，再以 qima 执行候选检查。R1 只复用该顺序，继续同一自包含 archive，不重建或切换路线。

## 2026-08-29｜自包含候选解包权限首因锁定（v4-1416）

- 122B-R1 已通过外层 staging 的 root:qima 0750、qima 逐级穿透/文件读取、脚本语法、archive bytes/SHA 与 14,842 members 门；同一 archive 解包后，候选目录的 qima 逐级 `x` 门以 `QIMA_DIR_TRAVERSE_FAILED` 停止。symlink/manifest/11-gate、Secret、迁移、release/static/systemd 与 DeepSeek/COS/Tencent 均未到达，远端/本地临时残留为 0。
- R2 不重建候选或改变依赖路线：解包后只用不跟随 symlink 的权限规范化将目录设 root:qima 0750、普通文件设 root:qima 0640，随后重新验证 476 个相对链接边界、五入口 qima 可读与完整 11-gate；全绿后才允许原发布路径，失败仍回滚并只报唯一首因。

## 2026-08-29｜纠正解包权限验证器误判（v4-1417）

- 122B-R2 在权限规范化后仍由同一 `QIMA_DIR_TRAVERSE_FAILED` 截停，发布与外部动作继续为 0、残留为 0。规划回读实际 runner 后确认验证命令使用 `find … -exec /usr/bin/test -x {} +`（文件门同为 `test -r`）；GNU find 的 `{} +` 会把多个匹配路径一次传入命令，而 `test -x/-r` 是单路径一元判断，故该门不能证明任何目录权限失败。
- 结论修正为 `verification_gate_bug`，不再追加权限补丁。R3 仅把权限门改为 qima 身份下的 GNU find `! -executable` / `! -readable` 首个失败路径检查；若真有失败必须返回 path/stat/namei，若为空则继续同一候选的 symlink、manifest、11-gate 与原发布路径。

## 2026-08-29｜find 扫描错误转只读取证（v4-1418）

- 122B-R3 已移除错误批量 test 门，但 qima 身份的 `find -P … ! -executable` 本身 exit=1，且没有输出不合格路径；本轮未在清理前结构化保存 stderr，因此不能判定为真实权限失败、find 兼容问题或候选树异常。发布、Secret、DB、systemd 与外部调用继续为 0，残留为 0。
- 连续同类门失败已触发硬停止：下一片仅在隔离 `/tmp` 对 tiny tree 与同一 archive 捕获 find 路径/版本、命令、exit、stdout/stderr，并用逐项 shell 循环给出独立真值；取得唯一首因前不得再部署。

## 2026-08-29｜DIAG4 harness 缺口与极小对照（v4-1419）

- DIAG4 的 archive 身份、解包、权限规范化和解包树逐路径 qima 检查通过，但脚本误把 fixture 的 predicate 命令复用于 `extracted_*` 标签；89 字节 stderr 也未原样交付，只做了长度形态推断。因此该轮不能证明 archive find predicate，也不能解释 R3 scan error，规划拒绝将其写成已锁定根因。
- 下一片不再上传 archive 或生成复杂 harness，只在单个 SSH 命令中创建每一级均明确 root:qima 0750 的 tiny tree，固定 `cd /tmp` 后直接打印 find/stdout/stderr/exit、stat/namei 与逐路径 test；该对照只回答 find 能否扫描已知可达目录，随后立即清理。

## 2026-08-29｜权限门诊断收口并恢复唯一发布（v4-1421）

- DIAG5 因无特权 `qimao-deploy` 无法设置 root:qima、DIAG6 因嵌套引号截断，均未进入有效 find 对照且未触碰候选/生产；两轮固定临时目录均清零。继续扩展 tiny harness 的收益已低于复用现有正证据，诊断路线停止。
- DIAG4 虽误复用了 archive predicate 标签，但其另一独立分支确实由 root 从实际解包树生成完整清单，并由 qima 对每个目录/普通文件逐项执行一元 `test -x/-r`，结果 false 均为 0。R4 废弃批量 test 与 qima-find predicate，只复用该逐路径门后继续同一 immutable 候选的 symlink/manifest/11-gate 与发布；不增加候选、依赖或架构路线。

## 2026-08-29｜R4 远端 archive SHA 门停止（v4-1422）

- R4 在本地 PowerShell helper 自动变量 `$Args` 冲突修正后才真正进入远端；唯一远端执行通过 bytes 门、在 SHA 比较 exit=52 停止并回滚，未解包或触碰 Secret/DB/release/static/systemd/外部系统，staging 与本地临时物清零。规划复核 runner 比较代码无误，并新鲜复算本地 archive 为 9,417,436 bytes / `c039879c…d016d5`。
- 结果报告省略了非敏感的远端实际 hash，不能区分显式上传源错误与远端字节差异。下一片只用直接 SCP 做一次可观测传输并在清理前输出本地/远端完整 SHA 与 bytes，不解包、不部署。

## 2026-08-29｜传输完整性确认并锁定 UTF-8 BOM（v4-1423）

- 直接 SCP 诊断证明本地与远端 archive 均为 9,417,436 bytes，SHA 同为 `c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`；payload 传输无损。R4 的 `.sha256` 首 token 含 UTF-8 BOM，严格比较多出 BOM 才触发 exit=52。
- R5 只在 runner 解析首 token 时剥离可选 BOM，并继续同一 immutable candidate、逐路径权限门及原发布；不生成新 archive、不改业务代码或外部调用范围。

## 2026-08-29｜R5 staging 父目录身份缺口（v4-1424）

- R5 已通过 BOM 修正后的 archive SHA、tar 解包与解包树 root:qima 权限规范化，随后在 qima 逐路径门 exit=60；未进入 symlink/manifest/11-gate 或生产发布，回滚、远端 staging 与本地临时物清零。
- 规划回读 runner 确认它只 chown 了解包树和两个清单，却遗漏把 SCP 建立的外层 staging 从 deploy 私有 0700 改为 root:qima 0750，qima 无法穿透父目录读取清单。R6 只补回已在 R1 证明可用的 staging owner/mode 顺序，并要求任何门在清理前交付安全 stdout/stderr。

## 2026-08-29｜R6 symlink 解析公式纠正（v4-1425）

- R6 已通过 staging 身份、BOM/SHA、tar 解包、权限规范化与 qima 完整逐路径门，首次进入 `archive_members_links` 后以聚合 exit=66 停止；未到 manifest/11-gate 或生产发布，回滚及残留清理成功。
- 规划对照 122A 已通过的构建器确认：正确目标为 `resolve(dirname(link), rawTarget)`，R6 却用 `realpath "$link/../$target"`，会先跟随链接再处理 `..`。R7 只恢复 dirname 语义，并在断言前输出 14,842/476/external/absolute/missing 五项计数。

## 2026-08-29｜术语控制面发布冻结与唯一 Runbook（v4-1426）

- 用户要求停止补丁式发布后，规划确认 R7 从未派发并冻结固定 SERVER。121 的 CRLF/文件名/旧闭包拼接与 122B 的 staging、权限验证、BOM、诊断 harness、symlink 公式逐层归因完成：旧 121 存在候选打包合同缺口；122A-R1 自包含候选已替代它，之后没有业务代码失败证据，122B 全部首因属于发布编排。
- 回读 03J、05G、既有 systemd/原子 current/static 证据并复核 pnpm 官方 non-legacy deploy 合同；冻结 `TERM-CONTROL-RELEASE-RUNBOOK.md` 的唯一顺序和五个服务器写入阶段。相同 SHA 的归档链接证据直接复用，不再重复全量 link/find/逐路径诊断；发布前门再失败一次即返回规划，不创建 Rn 补丁。
- 本片只写规划文档并重新复算本地三件套 bytes/SHA；未读取 Secret、未连接或写测试服务器、未部署、未迁移、未调用 DeepSeek/腾讯/COS，SERVER 保持 idle/frozen，等待用户/规划确认后才可签发一次正式 lease。

## 2026-08-29｜唯一发布首次执行在 Runbook 输入漏项硬停止（v4-1428）

- 用户确认后，规划向固定 SERVER 签发 `TERM-CONTROL-RELEASE-01`。唯一执行完成本机候选/脚本门、固定 staging 与一次 SCP，随后 Step 0 调用未列入冻结传输输入的 `db-baseline.mjs`，以 `MODULE_NOT_FOUND`/exit 21 停止；这是 Runbook artifact inventory 缺口，不是候选、数据库或服务器故障。
- 硬停止生效：provider、迁移、release/static、drop-in、daemon-reload、unit 启停、DeepSeek/COS/Tencent 均为 0；runner 回滚/清理成功，固定 staging 和本地临时目录残留为 0。观察接口投影为空，但新结果文件证明真实执行与交付，记为 `observer_projection_gap`。
- 规划不重放：清除 lease 并冻结 SERVER；修正版删除额外 DB helper，Step 0 只保留运行基线，Step 5 直接使用现有 `checkOrder=true/singleTransaction=true` 迁移入口。首次单次授权已耗尽，等待用户确认后才可重新签发一次执行。

## 2026-08-29｜修正版发布本地文本校验范围收口（v4-1431）

- `TERM-CONTROL-RELEASE-02` 实际完成本地候选身份、AST/语法与 Secret schema 形态门；唯一首因是 `Assert-NoCr` 被误用于二进制 archive，触发 `CR_BYTE_PRESENT`。它在首次 SSH 前停止，SCP/staging/Secret/迁移/release/static/systemd/外部调用为 0，本地临时件清零，候选 bytes/SHA 未变。
- 观察接口在回合结束前持续投影为空，导致规划中途把它误判为 `verified_zero_start`；结果文件落盘后已按文件/进程事实纠正为 `observer_projection_gap`。下一片只把 CR/LF 检查限定到生成的 `.ps1/.sh/.mjs` 文本，其余 Runbook、候选、写入预算和停止门不变，继续复用同一固定 SERVER。

## 2026-08-30｜provider stdin 跨平台换行边界冻结（v4-1432）

- `TERM-CONTROL-RELEASE-03` 通过候选、文本、SSH staging 与唯一 SCP 门；远端 runner 在生产 Step 0 前以 `PROVIDER_INPUT_INVALID` 停止。唯一首因是 PowerShell `WriteLine` 默认发送 CRLF，Bash `read` 去掉 LF 后仍保留 CR；生产 Secret、迁移、release/static、systemd 和外部调用均为 0，远端/本地临时件清零。
- 规划用本机字节探针确认唯一修正：`UTF8Encoding(false)` 生成原始 byte[]，末尾仅追加 `0A`，末字节=10 且全体不含 13；下一片直接写 SSH `StandardInput.BaseStream`，禁止 `WriteLine` 或平台 newline。候选、Runbook 顺序、单 SCP/单 runner预算和硬停止门不变。

## 2026-08-30｜发布业务身份代际对账并冻结 qimao（v4-1434）

- `TERM-CONTROL-RELEASE-04` 通过 raw-LF 和 Step 0/1，在 Step 2 用遗留 `qima` 读取门时得到 `QIMAO_STAGE_READ_FAILED`；生产写入与外部调用仍为 0，回滚/清理成功。规划没有继续猜 chmod/chgrp，而是派发一次只读身份审计。
- 审计证实四个目标 unit 均为 `qimao:qimao`；current release、五入口和 env 为 `root:qimao 0750/0640`，qimao 全部可达/可读、qima 全部失败，与仓库 unit 及 05D/05R 成功证据一致。Runbook 唯一冻结 bootstrap=`qimao-deploy`、business=`qimao:qimao`、release=`root:qimao`；禁止遗留 qima、双轨 fallback 或权限放宽。

## 2026-08-30｜术语控制面 immutable candidate 发布通过（v4-1435）

- `TERM-CONTROL-RELEASE-06` 复用同一 122A-R1 三件套，以 canonical `qimao:qimao`、UTF-8 raw-LF provider stdin、一次 SCP 与一次远端 runner 完成唯一发布链。四项冻结迁移只运行一次；current/static 原子切换；provider.env 为 `root:root 0600`；backend、term-extraction、secret-validation、connection-test 四 unit 均 active/running、`NRestarts=0`；health/API/static 门通过。
- staging 与本地传输临时件清零，旧回滚目标保留；员工站、upload/OCR/ASR Worker 未重启。发布阶段没有 engine/route/run 或 DeepSeek/COS/Tencent 调用，因此下一片只做一次真实管理员配置与匿名 synthetic 热词 ASR 闭环，不重复候选、依赖、发布或旧业务门。

## 2026-08-30｜真实术语闭环发布后编排复位

- BACK-25/32 已按 DeepSeek 官方 JSON Output/usage 合同修正请求与嵌套数字用量；SERVER-38 已将 `term-provider-usage-20260830-r1` 成功发布，四 unit 与 health/唯一terms route通过，生产基线未再改变。
- SERVER-41 bootstrap-only通过；42–45仍未完成真实业务闭环。实际问题集中于临时测试编排：42丢失隔离控制面与异步Worker；43把legacy构造占位误判成真实Provider；44在仅createdb的空库上先导入data-only；45漏候选approve且先传后审。各片外部创建为0或未进入可证明accepted状态，腾讯Create均为0，临时资源已按各结果文档清零。
- 规划回读SERVER-31成功实物与PostgreSQL官方pg_dump文档确认：`--data-only`不含schema，必须先运行候选迁移；provider runtime必须继承现有DeepSeek配置再附加腾讯overlay；术语202必须经同一Worker终态、候选确认、刷新revision后发布。
- 为终止反复重写回归，冻结远端动作，改为SERVER-46仅本地一次完整prepare：保留一个非敏感准备目录与固定bytes/SHA，规划一次审核完整时序后直接执行同一产物，不再清理后重建，不需要用户逐次恢复。CURRENT压缩为当前事实与唯一Owner，历史留本日志和领域结果。

## 2026-08-30｜唯一术语热词闭环准备包冻结

- SERVER-46 在同一非敏感准备目录补齐迁移后十表复制、既有provider配置继承、异步术语Worker、pending候选确认与版本发布、ASR结果取证；未更改业务源码，未执行远端或Provider动作。
- 规划对照冻结包腾讯 SDK common@4.1.220 与官方实现撤销了不存在的成功HTTP字段检查，并以真实Bash/嵌入JS解析拦截heredoc结构错误。最终实际验证通过：runner Bash、4个Node片段、1个内嵌Bash、两个mjs语法/既有self-test，以及5份产物bytes/SHA逐项一致；manifest=`3e209d3552319f4bbb67f98d9641c6919771be9a9f1548eb5aa1ee40873e5dc2`。
- 只将此结果认定为本地准备通过；自动衔接SERVER-47使用原产物单次传输/执行，DeepSeek POST与Tencent Create各最多1次。生产current、数据库、控制面与公网路由保持不变，真实E2E结论以47新证据为准。
- SERVER-47仅启动一次：DeepSeek POST=1/HTTP200并生成confirmed TermVersion，随后在预算approve门以`SYSTEM_CONTROL_BUDGET_IMPACT_BLOCKED`停止，Tencent Create=0；生产基线未变，所有隔离残留清零。规划对照源码确认terms能力加入后，预算coverage两处遗留`asr ELSE ocr`映射把terms误算为OCR；先派BACK做两处同源最小修复和数据库回归，不重放服务器任务。

## 2026-08-30｜预算修复候选与腾讯Create unknown收口

- BACK-48 将预算impact/overview coverage严格限制为`asr/screen_text`，不再把`terms`投影成OCR；专项16/16、迁移与backend typecheck通过。SERVER-49据此生成唯一自包含候选，归档SHA=`169b62a48f14dec962fcc9041c518e5b2fb36b0aefef15cefb4ad141b025804e`，相对当前release只有预算服务TS/JS/JS.map三项差量，15,024成员、476相对symlink与五入口门通过。
- SERVER-50机械装配新E2E包时首次`bytes-sha.json`仍保留旧runner身份，规划独立复算后将其判为无效交接；50R1只修正该清单项。最终五文件逐项bytes/SHA全等，清单SHA=`2bdb6d10e49745af2fa6e2df6fe91c280557759a2af9341f95a043b7eb3777e2`，远端动作0。
- SERVER-51先出现transfer here-string CRLF编排失败，执行端违反同片硬停止继续了唯一SCP/transient；DeepSeek POST=1/HTTP200、Tencent Create=1，但Create返回unknown/缺TaskId安全分支只持久化占位身份，第二Create/runner=0。transfer与unit已清理，隔离DB/COS/runtime/status为防重复写而保留。
- 规划确认腾讯录音文件ASR只有Create与按数值TaskId Describe，没有按时间列举任务的恢复API。SERVER-52用官方CommonClient对窄时间窗唯一调用CloudAudit `LookUpEvents`，被`AuthFailure.UnauthorizedOperation`拒绝；未调用ASR接口或改权限。项目暂停在唯一外部事实门：由已登录控制台读取该Create事件，或临时授予现有子用户仅`cloudaudit:LookUpEvents`只读权限；取得RequestID/TaskId前禁止重发Create或删除对账上下文。

## 2026-08-30｜真实术语热词闭环与预算候选发布收口

- 腾讯控制台操作记录将51的unknown收敛为`AuthFailure.UnauthorizedOperation`且任务未创建；现有子用户策略仅追加`asr:CreateRecTask`与`asr:DescribeTaskStatus`。SERVER-54随后以DeepSeek POST=1/HTTP200生成confirmed TermVersion，并将2项热词放入唯一Tencent Create请求；同一官方正数TaskId最终completed，第二DeepSeek/Create均为0，隔离DB、COS对象、runtime与transient清零。
- BACK-48修复terms被预算coverage误投影为OCR的问题；冻结候选只含预算服务TS/JS/JS.map三项差量。发布前先用SERVER-67恢复并全量审计旧current基线；后续失败均发生在发布runner编排门，最终锁定并纠正“用base size校验candidate差量”和“ASR入口路径漏写modules”两项确定性错误，未把它们误判为业务或候选失败。
- SERVER-77以同一候选三件套完成一次原子发布：current=`term-budget-capability-20260830-r1`，static根含直接`index.html`；后端health与管理员`/`、`/engines`、`/routing`、`/budgets`均HTTP 200，四unit active/running、`NRestarts=0`，唯一terms route不变。发布阶段迁移、Secret/CAM/route/DB与DeepSeek/腾讯/COS调用均为0，transfer/stage/status/transient残留清零，旧release/static作为回滚目标保留。

## 2026-08-30｜员工站全流程验收首次命中生产接线缺口

- 内置浏览器以全新匿名一集项目完成清单V1、COS上传100%（2物理文件、0失败）及DeepSeek术语提取/3项确认/不可变TermVersion V1；同一MP4正确复用为ASR与画面字视频且只上传一次。
- ASR页仍硬编码“模拟识别/零外部网络”，而当前生产基线只有terms route及四个术语相关unit；SERVER-54真实腾讯ASR仅为隔离synthetic，未发布生产route/Worker。验收因此在首次真实阻塞处停止，OCR虽门禁1/1就绪也未创建批次；下一步由SERVER先证明现有release能否直接复用route/budget/Worker接线，FRONT并行消费既有`AsrBatchPreparation`运行字段修正文案，只有代码事实缺口才派BACK，不重复上传、术语或独立引擎探针。

## 2026-08-30｜员工AI验收改为真实生产路径

- SERVER-02只读核对current后确认：OCR已有唯一active route、screen-text Worker与OpenVINO sidecar；ASR current虽含编译入口和root-only env，但`asr_api` active target=0、effective budget pointer=0、canonical Worker inactive。唯一产品阻塞收敛为现有控制面的ASR生产接线，不再笼统归因为OCR/ASR都未部署。
- 用户撤销以fake、模拟、synthetic或内部夹具作为完成标准。匿名IAB项目停止在上传/术语观察证据，不创建AI批次或付费调用；BACK只读冻结精确控制面合同，SERVER随后只允许一次可回滚的生产配置与Worker启动，FRONT候选在生产门通过后才可发布。最终可用性只由用户主动在真实项目/真实素材上创建的Tencent ASR（含HotwordList）与OpenVINO OCR任务终态证明。

## 2026-08-30｜员工ASR/OCR生产前门接通

- 管理员在`milaidi.top`完成合法Access登录后，现有03H Tencent版本按`1/1/10`容量形成ASR route v3=`df527ca0-8fa9-4edd-abde-48cb355c6775`；budget v3=`78767e10-c54c-456e-9ec0-d2785df294a9`含CNY日/月提醒9、硬阻断10。两者均完成测试、影响检查、批准和发布，成为唯一生效指针。
- SERVER复用既有COS CAM凭据生成root-only Tencent env，backend零网络registry识别`tencent_cloud_recorded_v1`，canonical ASR Worker与backend均active/running、`NRestarts=0`。员工static最终复用既有原子软链模板发布到`frontend-employee-asr-20260830-r1`；两次切换前runner误判均已完整清零，不再保留自造runner路线。
- IAB发布后只读preparation返回`tencent_cloud / tencent_cloud_recorded_v1 / 16k_zh`、术语V1及1/1集可执行；OCR页返回本地服务正常、V1固定、1/1集就绪。面板均关闭且批次/腾讯/COS业务调用为0；最终产品验收只等待用户在自己的真实项目主动创建ASR与OCR任务，不使用匿名夹具替代。

## 2026-08-30｜真实整剧上传完成与后台恢复发布

- 用户真实项目“妈妈是神在人间的分神”完成 `102/102` 个物理文件、`5.17 GB / 5.17 GB` 的腾讯 COS multipart 直传，失败 `0`、待处理 `0`，项目进入 `ready`；普通 MP4 继续同时绑定 ASR/画面字角色且只物理上传一次。两次中断均由浏览器标签页生命周期丢失本地 File 权限引起，服务端已完成分片和 UploadSession 未丢失，重新选择同一目录后按原会话续传。
- 后台上传候选复用既有协议，新增 SPA File 交接、FileSystemDirectoryHandle→IndexedDB、权限恢复、beforeunload 提示及原 UploadSession/missing parts 续传；专项 `34/34`、frontend typecheck/build与限定diff-check通过。FRONT/TEST结构化交付为空，规划按 invalid-empty-handoff 独立复验，不将空回合作为证据。
- 用户明确批准后，SERVER-1532将员工static原子切换为`frontend-employee-upload-background-20260830-r1`；线上bundle标记、根页、`/uploads`、source-map 404与health通过，backend/ASR/OCR保持active/running且`NRestarts=0`，旧static保留回滚，临时物为0。网页支持后台标签页继续及刷新/重开恢复；关闭整个浏览器或电脑休眠不伪装持续执行。

## 2026-08-31｜AI热修与ASR route 8/6/300正式发布

- 管理员控制面新建并完成测试、影响检查、批准和发布ASR route v5=`e8cde90d-73e0-4d52-813c-59ba6367649e`；唯一Tencent preferred target容量为`8/6/300`，v3退役、v4只读保留。发布审计活动任务0、待对账0、失败连接检查0。
- 预算开关候选按不可变策略修正：既有策略迁移后backfill=true，仅新草稿默认false；关闭只跳过hard-limit，仍保留规则、reservation、warning、usage/settlement与审计。规划新鲜验证后端/迁移`37/37`、管理员`38/38`，三项typecheck与backend/员工/管理员production build通过。
- 唯一candidate archive=`10,269,137` bytes、SHA-256=`dbf672508232b6a5d43fa1950f8fffb9a69371e9cfa666b9fcad070b4a3bc4e4`。平台授权投影与迁移验收表名两处编排缺口均停在链接切换前并完成精确清理；最终复用同一archive，以修正后的唯一runner完成迁移、backend/员工static/管理员static原子切换及backend/ASR/OCR重启。
- 终态health、员工4路径、管理员4路径均200；三unit active/running/`NRestarts=0`；active budget仍为v3且`enforcement_enabled=true`，route仍为v5 `8/6/300`。原真实batch保持`1 completed + 50 failed`，provider identity计数不增，本片腾讯/COS/业务API调用均为0；未自动关闭预算或触发付费重试。

## 2026-08-31｜真实ASR/OCR故障对账与OCR输出候选收口（v4-1601）

- 真实ASR批次对账为`28 completed + 22 failed`；22项全部在腾讯调用前被active budget v3的`SYSTEM_CONTROL_BUDGET_HARD_LIMIT`本地拒绝，供应商实际失败数为0。迁移只把“迁移后新建策略”的默认值改为false；历史v1/v2/v3按不可变语义保留true，因此用户记忆与现网事实并不矛盾，真正关闭需发布新budget版本。
- 真实OCR批次止损在`39 failed + 12 queued`，仅screen-text Worker安全停止；同一素材证明COS GET、长度、PrivateTmp、ffprobe、ffmpeg均通过，唯一失败为frame-extractor的输出/manifest合同。最小候选改用有界MJPEG/image2并保留PNG兼容，规划新鲜复核专项`9/9`、OCR相关矩阵`33/33`、backend typecheck/build通过。
- BACK执行回合completed但未返回`outcome/evidence/remaining gap/next owner`，记为`orchestration_gap`；规划以落盘代码、专项回归和构建独立验收，不把空回合当交付。生产尚未发布，screen-text Worker保持停止；后续只允许一次同素材门控发布与原批次恢复，不创建新batch或盲重发。

## 2026-08-31｜AI恢复候选冻结与生产执行授权阻塞（v4-1608）

- OCR抽帧候选在真实失败素材上得到exit 0、123帧、5,243,550 bytes与manifest；OCR矩阵`33/33`、screen-text完整回归`23/23`、预算`16/16`及contracts/backend build均通过。最终冻结`ai-recovery-1607-r1.tar.gz`为10,270,355 bytes、SHA-256=`b2f5bbc158eb0ce51e4238556043182d34b80fa7b15d023e91401e3547bf0c9b`，相对1552精确八项内容差量，15,029成员、476安全symlink、unsafe=0。
- 唯一远端执行请求在本机`CreateProcess`前被审批层以`EXECUTION_APPROVAL_REJECTED_BEFORE_PROCESS_START`拒绝；SSH/SCP、服务器写入、current切换、backend重启、OCR retries、Worker启动、腾讯/COS调用和预算写入均为0。生产保持`ai-hotfix-1552`、screen-text Worker停止、OCR批次`39 failed + 12 queued`、ASR批次`28 completed + 22 local-budget-failed`。
- SERVER lease已清零，产品目标保持active但暂停于精确生产执行授权；授权后只能复用冻结1607三件套走固定原子发布与失败回滚路线。下一里程碑“系统控制台真实化与易用化整改”只登记queued，不在本恢复验收前并行实施。

## 2026-08-31｜OCR恢复执行桥接状态纠偏（v4-1617）

- 权威对账确认唯一主线仍为`AI-RECOVERY-SERVER-EXEC-1616`；`AI-RECOVERY-SERVER-PREP-1614-R5`与`AI-RECOVERY-SERVER-LOADER-1616`只产生本地编排文件，SERVER线程为idle。截至纠偏时新增SSH/SCP、root、服务器写入、current/env切换、服务重启、OCR retries、Worker启动与Provider调用均为0；生产仍为1552，原批次仍是`39 failed + 12 queued`。
- CURRENT收口为规划主通道负责一次受控执行桥接，SERVER仅在桥接结束后做独立只读对账；所有execution lease当前为0，不把本地准备写成生产恢复。唯一下一步卡为“同一loader Bash预检 → 一次可审计桥接 → 仅固定39集OCR恢复 → SERVER只读对账”；宽泛重试、completed/ASR项与unknown盲重发仍禁止。
- 独立审计尚有loader信号临界区STOP-SHIP意见，本轮按纠偏要求不继续修脚本、不连服务器；下次必须先以同一本地产物关闭该门再执行。ROS预签名直传架构仅登记queued，不得并行文档、探针、派发、实现或服务器动作，也不改变已完成的COS上传事实。

## 2026-08-31｜OCR桥接首门安全停止与基线对账（v4-1619）

- R6以systemd RuntimeDirectory收口loader生命周期后获得两路独立PASSED。首次1616 root transient在首个只读基线门以`EXTRACTOR_BASELINE_INVALID`退出；未解包、切换、重启、POST、启动Worker或调用Provider，RuntimeDirectory、inbound、release、stage与runtime残留均为0，生产current仍为1552。
- fresh只读对账确认唯一差异：canonical extractor实际为`/opt/qimao/local-ocr/20260827-local-ocr-05b-r1/frame-extractor.js`，而runner误假定为1552内路径。R7只在本地修正该基线并同步runner/SHA/loader身份，两路独立复核PASSED；SERVER已回idle，R7不构成生产恢复。无新可复现阻断证据时禁止继续R8/R9，下一动作只能回到同一1616单次桥接。

## 2026-08-31｜OCR模式修复、末帧根因与固定SERVER空交接硬停止（v4-1630）

- 1622-R1已把生产current从r1原子推进到r2，唯一差量为extractor `0644→0750`；真实素材direct-spawn得到123帧/5,243,550 bytes，唯一51集恢复命令提交一次且全部锁定本地OpenVINO、Tencent=0。原5秒客户端timeout导致episode1 unknown，停机连带episode2失败；对齐sidecar既有60秒后episode3/4真实完成并进入review_pending。
- episode5进一步暴露确定性末帧合同错误：Python runner固定`endMs=capturedAtMs+1000`可越过视频时长。最小候选将start/end限制在`0..videoDurationMs`且保持正区间，规划新鲜复核25/25、Python编译、backend typecheck、sidecar build与diff-check通过；当前批次为`2 review_pending + 45 queued + 2 failed + 2 reconciliation_required`，screen-text Worker保持停止。
- 冻结发布闭包包含runner、候选Python、三边界离线preflight与SHA清单；固定SERVER的PREP与三个获批执行turn均completed/items=[]，实际只出现空inbound创建/删除。达到硬停止后，用户一次性豁免规划角色代行同一冻结动作；首个runner在切换前被生产mawk跨行`||`语法门安全挡住并完整清理，唯一同文件兼容修正经远端mawk探针后发布成功。current=r3，OpenVINO geometry-r3 active/running、`NRestarts=0`，screen-text仍停止，POST/DB/route/ASR/Provider=0，临时残留0；r2与04g-r1保留回滚。
- 用户新增“抽帧频率等参数可在管理员后台调节”。当前算法约每秒1帧、最多600帧并受总像素/总字节上限约束；恢复后只扩展既有screen_text engine不可变runtimeConfig和管理员版本页，让批次锁定抽帧间隔/最大帧数快照，不另建控制面，也不与当前r3止血发布混做。

## 2026-08-31｜OCR隔离诊断权限阻塞与ASR/SRT只读对比候选（v4-1643）

- 同一episode7离线同构路径已证明COS短时GET、136帧、OpenVINO+PP-OCRv6 Small、52框及Node输出合同通过；隔离HTTP sidecar的端口覆盖修正和冻结SHA本地门也通过。但固定SERVER连续三次均在SCP进程启动前被执行层拒绝，即使已带上用户对同服务器、四文件、隔离unit/root runner的明确授权，上传/root/HTTP仍为0。按停止条件记录`tool_permission_blocked`，入站、unit与3199残留0，screen Worker继续停止，禁止第四次提交或绕行上传。
- BACK复用既有公司SRT与已完成ASR cues增加有界只读对比：固定第2/8/29集首中尾，返回双方cue起止时间、重叠和一对多关系，人工判断枚举不持久化；不调用Provider、不写业务状态、不导出整集。固定BACK终态为空但五个目标文件有真实变化，规划新鲜复核专项1/1、contracts/backend typecheck与diff-check通过，本地PostgreSQL随后停止。
- FRONT在现有员工ASR详情接入只读对比抽屉，提供左右对照、临时漏词/额外/专名/时间/一致标记、缺失/失败/窄屏状态；无console、下载、剪贴板或字幕持久化。固定FRONT终态同样为空，规划新鲜复核专项14/14、typecheck、198 modules生产build与diff-check通过。
- SERVER-1642旧物理回合虽连续超过15分钟无可见消息/工具项，规划最初只核对deploy/docs/父目录而漏看`work/`，因而把它误记为文件变化0；用户批准轮换后，新SERVER发现旧回合实际已在`work/`生成唯一archive与wrapper。此处纠正为“空结构化交接但存在本地候选”，不是零动作通道。新SERVER未覆盖候选，复算archive=`15,108,491` bytes、SHA=`e434f8ada6223505e4e4d406b8a11c1fbaed130c64337066a6b13464e4af0135`，87,170成员仅含backend/static，路径/硬链、五入口、三项assets和两条marker门均通过；runner语法、CR、禁用动作与5秒稳定PID门通过。执行审批层仍在SCP进程启动前拒绝私有backend源码/依赖/static外传，上传/root/切换/重启/业务写均为0，空入站清理完成。用户随后在规划任务精确批准，但审批域明确拒绝规划转述，要求用户在SERVER任务内直接确认；第二次SCP仍未启动，所有生产动作与残留继续为0。恢复只需在新SERVER固定任务内发送同一授权，不再从规划任务转述或绕行。

## 2026-08-31｜部署授权域与低级错误审计（v4-1653）

- 用户在SERVER任务直接批准后，1642唯一SCP/root runner实际执行；候选切换时systemd前置门失败并由同一runner完整回滚，生产health/员工入口和unit恢复，外部业务写与残留均为0。只读journal与unit/path核对证明首因不是候选代码，而是runner把archive的`backend/.`平铺到release根，与systemd固定的`current/backend/dist/server.js`布局不一致。
- SERVER-PREP-1650只在本地把release映射修正为`release/backend/...`，不重建archive；新runner=`12,554` bytes / `d6aee9ce2a4425b95f77295c15a897d59a2d0e031fe9bda2fb024f70b6209f1c`，SHA清单=`e1184ddf9f6625f516fa2a12598ac5823f7091b46b27578b11d76b69056b196e`，Bash/CR/五入口门通过，外部动作0。
- 根因复盘确认协作消息不能转移用户授权，且批准前缺少真实unit→release布局门，造成用户被迫跨任务重复发送。协议已改为“SERVER冻结和复核、规划任务作为唯一授权宿主与单次执行桥、SERVER只读验收”；冻结身份变化必须先完整重冻，只在同一宿主合并请求一次，禁止再让用户充当跨任务消息中转。
- 扩展审计把近期低级错误归为五类：文本/argv（CRLF、here-string、文件名参数）、release/依赖闭包（旧依赖拼接、缺包或导出不一致）、路径/身份（平铺目录、qima/qimao、owner/mode）、谓词/时序（systemctl字段顺序、timer字段、反向条件、readiness过短）、状态编排（旧目标存在、env被shell误解析、局部完成误报整体成功）。共同原因是重复手写runner、验证静态身份多于实际运行路径、文档禁令多于机器门。
- AGENTS与WORKFLOW已把授权细则和第一性原理条款合并，删除重复的审核/纠错/失败预算描述；发布标准收敛为复用成熟原子模板与五项机器门。依据pnpm官方`deploy`自包含生产目录、systemd官方`ExecStartPre`失败即阻断unit，以及ShellCheck针对Shell语法/语义陷阱的定位；不在当前切片安装新工具或引入第二部署平台。

## 2026-08-31｜1650真实回滚与生产闭包首因（v4-1654）

- 修正layout后的唯一SCP/root runner已实际执行：payload、baseline、candidate门通过，候选backend因`@tus/server`无法解析`@tus/utils`退出；runner随后完整恢复旧current/static/backend，health与员工页面200，外部业务写和残留均为0。
- 归因从发布目录编排收敛为候选production closure/link topology缺陷。原archive永久冻结为失败证据，禁止重传、现场补symlink或继续修改runner；唯一下一步由BACK使用pnpm官方deploy路径生成并本地真实导入验证自包含闭包。

## 2026-08-31｜r2闭包接力复核（v4-1655）

- 固定BACK耗时约18.5分钟后仍以`completed/items=[]`空交接结束，但文件对账发现新r2 archive与backend build，故记为`invalid-empty-handoff_with_artifact`而非零动作或通过。r2=`9,301,722` bytes / SHA-256=`4c818ae7e70673a7658f4ee857f910bc2e8755b8cdfbfb0ecff0ec54ad847e47`，14,918成员、仅backend/static，`@tus/server`与其`@tus/utils`均表现为归档内相对链接。
- Windows `bsdtar`两次均在创建POSIX symlink时失败，工作区与系统临时残留已精确清零；这属于本机能力边界，不归因archive。固定SERVER下一片只做本地拓扑审计、runner/SHA重冻；新身份获准后，Linux staging真实import才是发布前首门。
- 规划复核发现初版runner仍只有`node --check`，不足以阻止运行期缺依赖重演；1655-R1已在原子切换前加入qimao身份的`@tus/server`与官方五入口真实import门，并重新冻结runner/SHA。新三件套必须在当前规划任务获得一次合并执行批准后才能上传，禁止复用1650旧批准或拆分多次询问。
- 1656首次执行仅在baseline门停止并清理；1657证明唯一false是backend历史累计`NRestarts=5`与runner硬编码0不符。1658改为捕获稳定完整快照并要求发布后无增量，不清零、不硬编码5、不放宽状态。协作语义同步改为“规划已决定，待平台执行门”；同风险、同环境、同目标的常规发布修正不再要求用户重新判断。

## 2026-08-31｜r2真实import通过与post-switch编排误判收口（v4-1661）

- 用户批准的r2三件套完成唯一SCP/root runner：payload、旧基线、五入口、`@tus/server/@tus/utils`真实Linux import、候选backend restart与health均通过；随后runner错误要求计划restart后的完整backend状态仍等于重启前`NRestarts=5`，而systemd按事实将该历史计数重置为0，故候选在无业务错误时被post-switch门误判。runner于20:05:46启动候选、20:05:50恢复旧版；current/static、health、员工根页与ASR深链全部恢复，ASR/OCR未重启，DB/COS/route/budget/Provider写入0，r2入站、stage、next、release/static与runtime残留0。
- 同轮还发现ERR trap先设置failure_code再读取`$?`，把真实失败码覆盖为0。PREP-1660仅修两项runner合同：计划restart后要求`active/running/0/0`并锁定PID/完整状态5秒无变化；ERR trap先捕获rc再回滚，负例实测退出1。archive保持`4c818ae7…47e47`，新runner=`13,650` bytes / `d1953d25…f7b4a`，SHA清单=`be0d7317…f7a5`；Bash、CR与正负门均通过，未改业务代码或连接服务器。

## 2026-08-31｜r2稳定启动与响应头解析误判收口（v4-1663）

- PREP-1660三件套完成唯一SCP/root runner，payload、baseline、五入口、真实Linux import、候选restart与health再次全部通过；候选稳定运行8秒后在未授权compare API类型门回滚。只读实测响应为401、`content-type: application/json; charset=utf-8`，而服务器mawk对runner的`IGNORECASE + /^Content-Type:/`表达式输出空，证明唯一首因是发布脚本手写响应头大小写解析，不是候选代码、服务状态或API合同。旧current/static、四unit、三个HTTP与全部r2残留对账通过，DB/COS/route/budget/Provider写入0。
- PREP-1662只将该门改为同一次curl的`%{http_code}`和`%{content_type}`原生write-out，继续要求401、JSON与body非HTML；保留稳定PID、blocked非0、三unit不变及原子回滚合同。archive保持`4c818ae7…47e47`，新runner=`13,594` bytes / `dd1ed939…31358`，SHA清单=`91f008f0…d643d`；Bash、CR、单请求和HTTP正负例通过，未改业务代码或再次连接服务器。

## 2026-08-31｜ASR/SRT只读对照r2正式发布（v4-1665）

- 用户批准的PREP-1662三件套完成唯一SCP/root runner并以exit0终止：payload、旧基线、候选五入口与依赖、qimao身份真实import、原子current/static切换、backend计划重启与5秒稳定PID、compare 401/JSON/非HTML、员工根页/ASR深链全部通过。current=`asr-srt-compare-20260831-r2`，员工static=`frontend-asr-srt-compare-20260831-r2`；backend、ASR、OpenVINO均active/running/NRestarts=0，screen-text保持inactive/dead。DB/COS/route/budget/Provider写0，ASR/OCR未重启，旧release/static保留回滚，入站、stage、next、runtime残留0。
- 独立只读终验复核相同指针、四unit、health与员工两页；未授权compare仍为401、`application/json; charset=utf-8`且非HTML。Windows curl与Codex浏览器出口分别遇到TLS握手失败/连接关闭，未据此误判站点故障；服务器经Cloudflare公网IP `172.67.179.103`访问`https://milaidi.online/`及ASR深链均为HTTPS200、证书校验0。当前发布里程碑passed，下一步只需用户登录真实员工页查看已有批次对照，不自动创建付费任务。
- 发布完成后协作优先级转回OCR第7集`LOCAL_OCR_UNKNOWN`与超时一致性；下一切片仅限本地诊断、代码和测试，禁止继续准备ASR对照页候选或执行服务器/外部动作。

## 2026-08-31｜OCR三层超时竞争本地收口（v4-1667）

- episode7离线同构门已经排除COS、抽帧、OpenVINO模型和Node输出合同；本轮进一步定位到engine、loopback HTTP与Adapter共用同一截止时间，确定性的sidecar 504可能先被外层Abort覆盖为`LOCAL_OCR_UNKNOWN`。最小候选建立`engine=T、HTTP=T+1s、Adapter=T+2s`，并仅把严格`504 + LOCAL_OCR_ENGINE_TIMEOUT`映射为可重试且无外部副作用；其他5xx、坏响应、断连和外层超时继续保留unknown，取消与单次调用语义不变。
- 固定BACK物理回合再次以`completed/items=[]`结束，记为`invalid-empty-handoff_with_artifact`；规划直接审核落盘的runtime与测试差量，并新鲜运行runtime/Adapter/真实sidecar子进程矩阵`32/32`、contracts/backend typecheck、sidecar build与限定diff-check，全部通过。测试期间一次性命令垫片已删除，未安装依赖、未连接服务器、未启动业务Worker、未读真实素材、未写DB/COS或调用Provider。
- 本里程碑只形成本地候选，不宣称生产OCR恢复。screen-text Worker继续停止，第7集与剩余队列不自动重发；后续若进入生产，只能另行冻结最小候选并同时锁定sidecar T、HTTP T+1s与Adapter T+2s的运行时配置。

## 2026-08-31｜OCR三层超时候选正式发布（v4-1671）

- 冻结backend-only archive=`8,503,451` bytes / SHA-256=`ef332ee660686999546a889a08aeaea331db08cace96f177ea39e5eb46277f76`，与r2严格只差`local-ocr-runtime.{js,d.ts,js.map}`；runner=`b6d21299c2d9f55316e9bfe4861f0aa5a0b67dc22fe42b3cfe42e6d061024133`，SHA清单=`22dc36a504de56275d65a283b0cef3af0878402bd9f1b48aa0b7a47516025b9d`。固定SERVER两次均在传输前被授权域阻止且精确清理空入站；用户在主会话按完整SHA直接批准后，由同一主会话执行既有不可变runner，未重冻或现场修改。
- 唯一SCP与root runner均exit0；payload、旧基线、候选入口、qimao身份真实import及post-switch全部通过。current=`ocr-timeout-20260831-r1`，timeout合同为engine `60000ms`、HTTP `61000ms`、Adapter `62000ms`；backend仅重启一次后active/running/0/0并稳定，ASR与OpenVINO保持原PID、screen-text保持inactive/dead，health/projects/asr均HTTP200。
- DB/COS/route/budget/Provider写入0，ASR/OpenVINO重启0，screen Worker启动0；入站、runtime、stage与current.next残留0。该发布仅关闭超时竞争代码上线门，不代表队列恢复：第7集与剩余OCR任务未重试，后续必须另用稳定命令身份和精确范围恢复。

## 2026-08-31｜协作上下文轻量复位（v4-1672）

- 侧栏从七个置顶任务收口为规划、BACK、FRONT、UI、TEST、SERVER六个固定角色；旧协调任务“梳理对话与前后端开发”及“审改台本地”“独立优化术语表项目v3”“视频审查”三个旧业务任务已归档为可恢复的只读历史，未删除任务或创建替代任务。
- `CURRENT`从历史流水压缩为单页生产事实、唯一后续路径、六个角色和少量协作约束；完整历史继续保留在本日志与对应部署/测试结果，不再进入新任务卡。当前没有自动启动Worker、重试OCR、修改业务代码或执行服务器动作。

## 2026-08-31｜OCR单任务执行入口发布（v4-1679）

- 第7集同一Attempt只读对账确认仍为`LOCAL_OCR_UNKNOWN/external_unknown`，没有严格`504 + LOCAL_OCR_ENGINE_TIMEOUT`日志证据，故保持`reconciliation_required`且未重发。为避免常驻Worker连续领取47项，既有screen-text entry增加正式`--once`模式；复用同一registry、COS、evidence、DB与`runOnce`，无参常驻行为不变，额外参数fail-closed。BACK回合为空但两文件候选存在，规划独立专项`7/7`、backend typecheck与diff-check通过。
- 冻结archive=`8,504,735` bytes / SHA-256=`ae720ef210e9a5512d5105d08595ccec173e78ec79e6df1a8717178586780293`，相对生产严格只差screen-text worker entry三项编译文件。用户按完整三SHA批准后，唯一SCP/root runner exit0；current=`ocr-worker-once-20260831-r1`，backend重启一次并稳定，ASR与OpenVINO PID不变、screen Worker仍停止，HTTP `200/200/200`、临时残留0、业务写与Provider调用0。
- 本里程碑只发布单任务能力，没有执行`--once`或处理队列。下一步若获明确范围，只允许领取一个现有queued任务并在其单一终态后退出；第7集unknown继续隔离。

## 2026-09-01｜OCR sidecar合同修复与真实队列恢复（v4-1711）

- 生产sidecar已原子切换到`20260901-local-ocr-contract-r1`并完成独立只读验收：有效systemd投影、进程运行路径和模型/Python路径均指向新runtime；OpenVINO、backend、ASR服务稳定，旧runtime命中与临时残留均为0。随后一次canonical PrivateTmp `--once`让episode13以67/67帧、5个候选/证据进入review_pending，证明真实员工OCR路径成立。
- 用户明确批准后，主规划线程只执行唯一canonical screen-text Worker启动门；SERVER按新failed/unknown/reconciliation与服务漂移守卫持续监控。42个queued全部形成completed attempt，新增probed/ocr帧各3287、候选/证据各1386且均为pending；最终批次为`45 review_pending + 5 failed + 1 reconciliation_required`，queued/running均为0，旧异常项未被retry/cancel。
- 队列清空后screen-text Worker已停止为inactive/dead；OpenVINO PID842128、backend831090、ASR694703全程未漂移、`NRestarts=0`，health保持200/405。下一阶段只追踪既有人工审核、screen_text Release、pre-review与字幕验收数据流，不重做OCR底座或控制面。

## 2026-09-01｜画面字显式部分Release合同（v4-1713）

- 只读数据流审计确认员工画面字、pre-review、字幕验收与交付入口均已存在；首个真实阻塞是Release严格要求batch completed，而当前5 failed+1 reconciliation既不能被cancel收敛，也不能在不重新执行Provider时retry。现有合同没有成功集子集Release，继续服务器操作无法解决。
- 用户专项批准后，BACK在既有Release与幂等命令上增加可选`allowPartial`和单一迁移；默认严格行为不变。显式部分发布只在无待处理/运行/待审核/stale任务且至少一集成功时放行，cue只来自completed/confirmed_empty，failed/reconciliation/cancelled按episode冻结job、attempt、error、effectClass与providerRequestId，旧job/attempt终态不变、Provider调用0。
- 规划审核发现并返工关闭三项边界：完整批次传allowPartial仍产出完整Release；异常快照补齐unknown身份；全异常批次拒绝空Release。新鲜screen-text专项27/27、contracts/backend typecheck、迁移语法与限定diff-check均通过；候选尚未部署，下一步只接员工页面显式确认和排除摘要。

## 2026-09-01｜画面字部分Release员工页候选（v4-1714）

- 固定FRONT回合以空结构化交接结束，但目标TSX、CSS与专项测试存在真实差量；规划按协议不采信任务终态，直接审查文件和运行新鲜验证。员工页只在无active/review_pending/stale、至少一集成功且至少一集failed/reconciliation/cancelled时显示“部分发布”，确认页列出排除集与错误码，未知写结果继续复用同一幂等身份。
- 历史版本页现明确区分完整/部分Release并展示不可变排除摘要；默认严格发布仍不发送`allowPartial`，全异常或仍有待确认集时按钮不放行。专项15/15、contracts/frontend typecheck、198 modules生产build与限定diff-check通过；首次从仓库根直调Vite因工作目录错误找不到`index.html`，按真实frontend目录重跑成功，未将编排错误误判为候选缺陷。
- 当前仍是本地候选，生产数据库尚未执行新迁移、backend/static尚未切换。下一步只复用成熟原子模板在本机冻结受影响闭包、SHA与单次Runbook，不连接服务器、不部署或重启。

## 2026-09-01｜部分Release发布闭包与迁移顺序收口（v4-1715）

- SERVER本地冻结初版archive/runner/SHA后，规划复核发现runner明确`migration:0`，若直接切换会让新read/write先于`partial/excluded_episodes`列上线；初版因此判为不可发布，不连接服务器。另精确清理任务自建`.tmp-tar-test`，未触碰既有脏树。
- 1714-R1保持archive不变，只增加文件化DB gate并修正runner/Runbook：候选门先确认生产已到6033000、6034000未应用且唯一pending；current切候选但旧backend PID保持运行，由systemd原生EnvironmentFile以qimao身份执行单事务migration，校验schema_migrations、两列和约束后才切static、重启backend一次。迁移后门失败则恢复旧current/static/backend并保留向后兼容6034000，不执行可能破坏数据的down。
- 规划最终按文件复算：archive=`9,308,173B / 695e477a34f62d67d77893fa3faa1d23fb28141e271916a4fdf32ab9c05c83c7`，runner=`17,004B / bfe4cf32ae31a70adb63b1bdaa220e8b880c1c606b8fadc3c2049cffe8becde7`，DB helper=`4,855B / c7d22cd1ca404773b6ef874c9988c7bd248596c7b83bfa02228769a5dd0232f7`；SHA清单三行一致，helper语法/自测、archive 14919唯一安全成员与限定diff-check通过，临时残留0。任务回传中的archive SHA有手工抄写错误，未采用；权威身份以上述文件复算为准。生产动作仍为0。

## 2026-09-01｜显式部分Release生产发布（v4-1716）

- 用户明确批准1715发布后，固定SERVER再次以`completed/items=[]`结束且没有新结果文档；规划先只读核对，确认生产仍为旧current/static、schema四项均0、固定远端路径全absent，故记为`invalid-empty-handoff / external_actions=0`，没有把空终态误报为成功。
- 同一授权与冻结身份下，规划代行唯一生产链。入站目录创建一次；创建命令的附带stat因PowerShell提前解释远端命令替换而返回非零，但目录实际身份正确，随后只读stat通过且未重复创建。唯一SCP与唯一root runner均exit0；payload、Linux Bash、旧基线、真实import、6034000 before/after DB门、原子指针、backend单次重启、health/401 JSON/员工两页全部通过。
- 最终current=`screen-text-partial-release-20260901-r1`、员工static=`frontend-screen-text-partial-release-20260901-r1`、schema=`1/1/1/1`；backend新PID866078稳定，ASR PID694703与OpenVINO PID842128不变，screen-text Worker保持inactive/dead。入站/runtime/stage/next残留0，Provider/COS/route/budget/业务API写0。独立终验一度误用POST/80得到403/000，按runner精确GET/8080复核为401 JSON非HTML与200/200，临时文件已清零。
- 发布只解除“异常集阻断成功集Release”。内置浏览器真实员工页与生产数据库只读对账一致：45集review_pending、5集failed、1集reconciliation_required，批次总计1541条pending；1710的1386仅是42个新完成attempt的新增量。页面已显示逐条、当前页选择和批量审核入口，但候选中存在明显单字/乱码，系统不得自动批量确认内容；清零后才进入部分Release与字幕验收。
## 2026-09-01｜固定声明式发布入口

- 将1642无迁移发布与1714受控迁移发布的共同门收敛为固定root runner、严格JSON声明和校验器；测试服务器已安装并核对bytes/SHA/owner/mode、Bash/Node语法与10项自测。安装本身未执行应用发布、迁移、链接切换或服务重启，临时staging与发布残留为0。后续常规发布只改变声明、归档、SHA清单和可选迁移helper，不再手写逐批runner；项目级连续授权由规划裁决，平台动作确认仍按宿主强制门执行。
## 2026-09-01｜真实前置审改与字幕验收上线

- 服务端锁定ASR、术语、素材、策略与画面字Release身份，部分画面字发布的排除集随验收会话进入不可变AcceptanceRelease；员工前端已接通真实审改、发布、字幕验收和交付确认，并为缺失上游提供正确入口。候选通过后由固定声明式发布入口应用6035000并原子切换backend/static；健康、深链、权限、服务稳定性与零残留终验通过，未重启ASR/OpenVINO、未调用Provider或写COS/route/budget。
