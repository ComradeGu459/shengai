# 测试服务器问题台账

## TEST-SRV-20260822-038

- 状态：`confirmed / server-relay-active`。
- 任务：`UPLOAD-OBJECT-STORAGE-01-SERVER Rev3`。
- release：`20260822-object-storage-server-relay-v4948-r1`；本地/远端源码归档 SHA-256 均为 `85E971A48AB8BCF18EF7F5720F5D0AEE5E6C57227B7AEF5781990A815B0C1B64`。服务器 pnpm `11.21.0` frozen install、根 build、contracts/backend/S3 adapter/员工与管理员 frontend 产物通过；schema_migrations 仍为 `39`，未执行迁移。
- Secret/systemd：`/etc/qimao-terms-cloud/object-storage.env` 仅核验为非符号链接、`root:qimao 0640`，并原子加入 `QIMAO_S3_UPLOAD_MODE=server_relay`；未读取、输出或记录任何其它值。backend unit 新增可选 EnvironmentFile，并在安装前后均通过 `systemd-analyze verify`；旧 unit/env root-only 备份保留，供回滚使用。
- provider 探针：正式 `ProductionS3CompatibleUploadStorage` 以 path-style/server relay 完成 create multipart、内存 capability、服务器 relay 单分片、ListParts、Complete、Head/Get 摘要核对、Delete/Head 删除复核。输出不含 capability、URL、对象名或 Secret；唯一极小对象已删除。历史 `PutBucketCors=501` 未重试，未放宽 Origin 或修改 Bucket 公共访问。
- 切换与回滚：发布前确认完整 backend 回滚目标=`20260822-upload-tus-v4945-r1`、员工旧静态=`frontend-upload-tus-v4945-r1`；backend current 与员工静态原子切至 v4948-r1，管理员静态仍为 `system-frontend-v4880`。首次切换尝试仅因 current 父目录需 root 写而在创建 `.next` 前停止，未改变链接/服务；随后 root 原子切换、backend restart、Nginx `-t`/reload 和 health 均成功。旧 release、静态、unit/env 备份均保留。
- smoke：loopback/公网 `/`、`/uploads`、`/health` 均为 `200`；未知 API=`401 application/json`，新 asset=`index-Fy5Fj8GD.js` 的 map=`404`。qimao-backend、Nginx、cloudflared、PostgreSQL 均 active；3001/5432 继续为回环监听。未上传真实素材、未创建项目、未启动 Worker、未改数据库业务数据、DNS、Cloudflare 或防火墙。
- 下一门：规划可在现有可见员工会话内执行一次最小 SRT 公网真传；SERVER 不读取 Cookie/密码/OTP，且不再尝试 Bucket CORS。

## TEST-SRV-20260822-037

- 状态：`blocked / no-cutover`。
- 任务：`UPLOAD-OBJECT-STORAGE-01-SERVER Rev2`。
- 构建：r1=`20260822-object-storage-v4947-r1` 在本轮探针脚本的 pnpm workspace 模块解析处失败，未发起 ROS 请求；修正部署探针的 backend SDK 解析后，r2=`20260822-object-storage-v4947-r2` 的本地/远端源码归档 SHA-256 一致，为 `D1A96622A36B4C966E5453FA1C16E1B898F9D6B0372B157059760FE53A8226D7`。服务器 pnpm `11.21.0` frozen install、根 build、contracts/backend/两站 frontend 及 ROS 探针产物均通过。
- Secret 边界：只核验 `/etc/qimao-terms-cloud/object-storage.env` 为非符号链接、`root:qimao 0640`；未读取、输出、hash、复制或写入任何值。
- 首因：以固定 path-style 与精确私有 CORS（唯一 Origin、`PUT/GET/HEAD`、限定 headers/expose headers、`MaxAge=900`）调用 ROS `PutBucketCors` 返回 `NotImplemented`/HTTP `501`。按停止门未替换为 wildcard Origin、未省略字段或继续 multipart。
- 影响与清理：未创建 multipart、分片或对象，故无探针对象残留；未切换 backend/current 或员工静态、未重启 Fastify/Nginx、未改数据库、Worker、DNS、Cloudflare、防火墙或 Bucket 公共访问。r1/r2 候选和本轮无凭据临时归档保留，供规划复核；backend `current` 的 v4945-r1 目标仍缺失，员工静态 current 当前可解析，故不得把 backend current 当作可用回滚点。
- 后续：需先取得 ROS Bucket CORS 控制面的官方支持矩阵或用户控制台确认；该门通过后才可重签 multipart 探针/候选切换，不在本任务猜测兼容参数。

## TEST-SRV-20260822-036

- 状态：`phase-A prepared / no external change`。
- 任务：`UPLOAD-DIRECT-INGRESS-01-SERVER`，handoff=`UPLOAD-DIRECT-INGRESS-01-SERVER-R1-V4.946`。
- 事实：主机 `103.36.63.67` 的 80/443 当前无监听；3001/5432/8080/8081 仅回环，18080/18081 仍是既有公网回退。Nginx、backend、cloudflared active。主机未发现 UFW、iptables 或 nft input 链，但雨云控制台防火墙不在 SSH 可见范围；Tus 存储可用约 90 GiB。certbot/acme.sh 和现有 Let’s Encrypt 证书均不存在。
- 产物：新增未安装的直连 HTTPS Nginx/TLS/systemd 草案和离线静态检查；固定目标为 DNS-only `upload.milaidi.online`，只接受精确 Tus OPTIONS/POST/HEAD/PATCH，CORS 仅 `https://milaidi.online`，日志不记录 URI、认证信息或上传元数据。
- Phase-A 对齐：按 BACK 冻结合同改为仅转发 `x-qimao-upload-capability`，显式清空 Cookie 与 Authorization；不返回 `Access-Control-Allow-Credentials`，预检/实际响应的 Origin 与 Vary 均固定，allow/expose headers 已收敛到合同清单。
- Phase-C 阻塞：DNS-only `upload` 记录尚未创建；本机没有 Cloudflare DNS connector，浏览器控制面不可用。未以 Tunnel、HTTP 或认证绕过替代，未改变证书、443、防火墙、env、current、员工静态或业务数据。
- 未执行：未改 DNS、雨云防火墙、80/443、TLS、cloudflared、Nginx、backend、数据库或业务数据；未读取 Secret、Cookie、Authorization、token 或用户文件。等待 BACK 最终路径/认证/CORS 合同和规划 Phase-B token。

## TEST-SRV-20260821-034

- 状态：`confirmed / canary-active`
- 严重度：P1（先上传、完成时服务端校验最终部署 canary）
- 任务：`UPLOAD-DIRECT-START-01`。
- 产物：backend release=`20260821-upload-direct-start-v4934`，员工静态=`frontend-upload-direct-start-v4934`；候选 manifest SHA-256=`99f4132b78e555c37f6197db158f5d779bc2b940a90078e55a1807dc1557500f`，静态 manifest SHA-256=`8541e87dfb9bead25bd246bd68b26130eb304c1e4e3e44f6a39720ba8d98b8a1`；既有 install/build/扫描门复用通过。
- 切换：旧 backend=`20260821-material-recycle-v4930`、员工静态=`frontend-upload-hash-perf-v4933`、管理员=`system-frontend-v4880`；原子切换后 bounded readiness 第 4 轮、`3160ms`，`/health=200` 且 database=connected；`nginx -t`/reload 通过。
- smoke：旧基线与候选 loopback/公网 `/`、`/uploads` 最终 `200 text/html`；`/health` 最终 `200 application/json` 且 database=connected；未知 API 最终 `401 application/json` 非 HTML；`.map` 最终 `404` 且无 source map 泄露；`nosniff` 与旧基线同为缺失，按既有 P2 记录，不作为本切片阻断。
- 运行边界：backend/员工静态已解析到新目标，管理员未变；schema_migrations=`38`，Fastify/Nginx/cleanup worker active，其他 Worker=`0`，时间 timer active，监听边界未变。未执行合成上传、未创建项目、未写业务数据；用户需 Ctrl+F5 后用现有项目实测。
- 回滚：旧 backend/员工静态目标保留；前次 smoke harness 误判已纠正，本轮未再触发回滚。未读取或输出 Cookie、Secret、OTP、token、私钥或连接值。
- 交付：`artifact_written`（仅更新本台账与协作看板；未改 `CURRENT`/`DEVELOPMENT_LOG`，未提交推送）。

## TEST-SRV-20260821-033

- 状态：`rolled-back / blocked`
- 严重度：P1（先上传、完成时服务端校验部署切换失败）
- 任务：`UPLOAD-DIRECT-START-01`。
- 候选 release：`20260821-upload-direct-start-v4934`；frozen install、contracts/backend/frontend build、SHA256SUMS 与敏感扫描通过，未重跑已成功 install/build。
- 迁移：使用唯一 systemd-run transient oneshot（User/Group=`qimao`、受保护 EnvironmentFile、候选 backend cwd、直接 Node ExecStart）成功执行 `1754976023000_allow_pending_upload_checksum`；`schema_migrations`=`37→38`，projects/assets/upload_sessions/upload_parts/upload_commands 计数与迁移前一致；transient unit 已 collect、无残留。
- 切换首因：backend current 与员工静态短暂切换后，限定健康检查首个真实错误为 `curl: (7) Failed to connect to 127.0.0.1 port 3001`；未继续公网 smoke 或合成上传。脚本立即原子回滚。
- 回滚后：backend=`20260821-material-recycle-v4930`、员工静态=`frontend-upload-hash-perf-v4933`、管理员=`system-frontend-v4880`；nginx/Fastify/cleanup worker active，Fastify health=`200`，其他 Worker=`0`。迁移保持 38（向后兼容旧客户端）。
- 边界与残留：未创建项目、未上传素材、未执行合成上传；数据库业务行未改；候选 release 保留首因证据；未读取或输出 Cookie、Secret、OTP、token、私钥或连接值。
- 交付：`blocked`（仅更新本台账与协作看板；未改 `CURRENT`/`DEVELOPMENT_LOG`，未提交推送）。

## TEST-SRV-20260821-032

- 状态：`confirmed / canary-active`
- 严重度：P1（员工大文件本地 SHA 性能与后台校验文案的 frontend 静态 canary）
- 任务：`SERVER-FRONT-UPLOAD-HASH-PERF-01 Rev1`。
- 质量证据：任务提供的 3 files/28 tests、frontend typecheck、frontend production build、限定 diff-check 均通过；本轮直接使用该新鲜 `frontend/dist`，未重建业务源码。
- 产物与扫描：归档仅含 `index.html`、JS、CSS 三文件，source map 排除；archive SHA-256=`296f2eebc3685a2b69b09264f8b4571b9ac64775c84acf8bb8fba3e3722467fd`，`SHA256SUMS` SHA-256=`09097a68c2bc52e4822b3a849cf5e1ab551b0b086d87129061d4d3bc8556ea63`；远端清单逐项校验通过。DATABASE_URL/私钥/Secret/凭据值/`127.0.0.1:3001`/`localhost:端口`/`.env` 阻断命中均为 `0`；唯一 `http://localhost` 为既有 React Router 无端口字面量，按既有规则豁免。
- 发布：员工静态从 `frontend-upload-refresh-v4932` 原子切换至不可变目录 `frontend-upload-hash-perf-v4933`；新目录 root-owned、文件不可写，旧目标保留可回滚。管理员静态仍为 `system-frontend-v4880`，backend 仍为 `20260821-material-recycle-v4930`。
- smoke：loopback 与公网 `/`、`/projects`、`/uploads` 均 `200 text/html`；`/health` 均 `200 application/json`；未知 API 均 `401 application/json`（非 HTML）；新 JS/CSS 均 `200` 且响应体 SHA 与清单一致；新 JS map `404`。Nginx `-t`/reload 通过；仅切换员工软链接，Nginx 配置与既有安全响应头基线未改。
- 边界与清理：nginx、Fastify、专用 cleanup worker 均 active，其他 Worker=`0`；未重启 backend/PG、未启动 Worker、未创建项目、未上传文件、未写业务数据；管理员、数据库、Tunnel/DNS/Access、认证策略、防火墙和端口边界不变。远端临时归档已删除，旧员工目录保留；未读取或输出 Cookie、Secret、OTP、token、私钥或连接值。
- 交付：`artifact_written`（仅更新本台账与协作看板；未改 `CURRENT`/`DEVELOPMENT_LOG`，未提交推送）。

## TEST-SRV-20260821-031

- 状态：`confirmed / canary-active`
- 严重度：P1（员工上传页刷新/分配确认栏 frontend 静态 canary）
- 任务：`SERVER-FRONT-UPLOAD-REFRESH-ACTION-01 Rev1`。
- 产物与扫描：仅取本轮 `frontend/dist` 的 `index.html`、JS、CSS 三个文件；排除唯一 source map（远端 map=404）。`SHA256SUMS` 清单 SHA-256 为 `abcefc95fa32bacc562a68dd4579eb66cb65b346f15ac31b38c17d8bee79b6af`；DATABASE_URL/私钥/Secret 值/`127.0.0.1:3001`/`localhost:端口`/env 阻断命中均为 `0`。
- 发布：员工静态从 `frontend-material-recycle-v4930` 原子切换至不可变目录 `frontend-upload-refresh-v4932`；管理员静态仍为 `system-frontend-v4880`，backend 仍为 `20260821-material-recycle-v4930`。新目录 root-owned、文件不可写，远端 SHA 校验通过；旧员工目录保留可回滚。
- smoke：loopback 与公网 `/`、`/projects`、`/uploads` 均 `200 text/html`；`/health` 均 `200 application/json`；未知 API 返回 `401 application/json`（非 HTML）；新 JS map 返回 `404`。新旧切换前后安全响应头名称集合一致；Nginx `-t`/reload 通过。初次 smoke 曾因本地错误要求未知 API 必须 `404` 而安全回滚，后续只读确认实际 `401 JSON` 符合验收，未修改产物后恢复同一 release。
- 边界与清理：未修改 backend、管理员站、PostgreSQL、Worker、Cloudflare Tunnel、DNS、Access、Basic/session 策略、防火墙或端口；未上传素材、创建项目或写业务数据。远端/本地暂存、临时 header 文件与切换软链接均无残留；未读取或输出 Cookie、Secret、OTP、token、私钥或连接值。
- 交付：`artifact_written`（仅更新本台账与协作看板；未改 CURRENT/DEVELOPMENT_LOG，未提交推送）。

## TEST-SRV-20260821-030

- 状态：`confirmed / canary-active`
- 严重度：P1（专用项目清理 worker 入口修正后的可回滚回收站 canary）
- 任务：`SERVER-PROJECT-CLEANUP-UNIT-01 Rev1`。
- unit 修正与门禁：仅将 `ExecStart` 加入 `--preserve-symlinks-main`，其余 `User/Group=qimao`、`NoNewPrivileges`、`ProtectSystem=strict`、`ReadWritePaths` 等限制未变。远端安装前后 unit SHA-256 对账通过；`systemd-analyze verify` 通过。
- production preflight：使用保留 release 的绝对入口、同一 Node flag、受保护 production env 与 qimao 身份运行；进程保持存活 5 个轮询窗口，收到 SIGTERM 后优雅退出（exit=0）。前后快照一致：项目 `7`、version_sum=`17`、active=`1`、recycled=`6`、purging=`0`、cleanup `scheduled=6`、leased=`0`、due=`0`、future scheduled=`6`。
- 发布与运行：切换前 due=`0`；backend 从 `20260821-employee-session-v4896` 原子切换到 `20260821-material-recycle-v4930`，员工静态从 `frontend-material-canary-v4914` 切换到 `frontend-material-recycle-v4930`；管理员静态仍为 `system-frontend-v4880`。Fastify loopback health=200，Nginx `-t`/reload 通过。专用 unit 已 enable 且 active，连续 5 个轮询窗口数据不变；其他 worker 数=`0`。
- 只读 smoke：loopback 与公网员工首页、`/uploads`、`/recycle-bin` 均 `200 text/html`；loopback/公网 `/health` 均 `200 application/json`；公网项目与回收站 API 在无凭据下返回 `401 application/json`，未发生 HTML 回退。静态 bundle 含“系列文件夹”“角色文件夹”、`只重算当前槽位/重新选择原文件` 单槽替换提示、“永久删除”“清空回收站”入口文案；未点击删除/清空、未上传或修改现有项目。未执行浏览器 console 捕获（本轮使用 curl 只读能力）。
- 回滚与清理：旧 backend/员工静态目标均保留，可原子回滚；远端 SHA manifest 复核通过，新 release 与员工静态目录保留供用户测试。unit、preflight、smoke 临时文件与临时软链接均无残留；未修改管理员静态、数据库 schema、DNS/Tunnel/Access、防火墙或其他 Worker，未记录或输出 endpoint、密码、Cookie、Secret、OTP、token 或连接值。
- 交付：`artifact_written`（unit 与本台账/协作看板已写入；未改 CURRENT/开发日志，未提交推送）。

## TEST-SRV-20260821-029

- 状态：`confirmed / quarantined`
- 严重度：P1（R5 标准 release 的专用 cleanup worker 启动门失败，已安全回滚）
- 任务：`SERVER-MATERIAL-RECYCLE-CANARY-01 Rev5`。
- 构建与扫描：从当前工作树组装源码 release，未复用旧 `dist`/`node_modules`；服务器 Node `24.19.0`、pnpm `11.21.0` 的 frozen install 通过（锁文件解析跳过，210 个包）；contracts/backend/frontend 构建通过，构建后 `*.map`/`*.d.ts` 清理。第一方 `src/dist` 扫描 420 个文件：允许 `DATABASE_URL` 键名命中 `6`、允许本地开发 URI 命中 `2`、阻断命中 `0`；应用清单 481 文件自校验通过，`SHA256SUMS` SHA-256 为 `1671ccf6012b81c3429897e9313a2689d489012cee50ce2fd59ed6398b3e520d`。workspace 链接均指向当前 release，旧 release 链接 `0`。
- 运行门：普通 Node production 动态导入 contracts 与 backend 入口通过，未调用 listen；due-job 门为 `purging=0`、`leased=0`、`due=0`、未来 scheduled=`6`。backend 原子切换后 health/database=200；Nginx `-t` 与 reload 通过；管理员静态根未变。
- 首因：专用 unit 以 `/opt/qimao-terms-cloud/current/backend/dist/workers/project-cleanup.worker.entry.js` 启动后立即 `Deactivated successfully`，无错误、未进入轮询。该入口经 `current` 软链接调用时缺少既有 `--preserve-symlinks-main` 参数，导致 standalone entry 判断不成立；按 R5 停止门未修改 unit 重试、未进入 Rev6。
- 回滚：停止 worker/backend，原子恢复 backend 到 `20260821-employee-session-v4896`、员工静态到 `frontend-material-canary-v4914`；管理员静态仍为 `system-frontend-v4880`。专用 unit 已移除，旧 backend、员工 loopback 与公网 health 均 200。
- worker/数据边界：worker 从未 active、未 claim；回滚后数据库快照仍为项目总数=`7`、version_sum=`17`、`active=1`、`recycled=6`、`purging=0`、cleanup `scheduled=6`、`leased=0`、`due=0`、未来 scheduled=`6`。未执行永久删除/清空、真实上传、其他 Worker、管理员静态切换、DNS/Tunnel/Access/防火墙或 schema 操作。
- 清理：远端源码 staging、切换临时软链接和 unit 临时文件均无残留；新 release 与员工静态目录保留作失败证据，旧回滚目标未删除；未记录或输出 endpoint、密码、Cookie、Secret、OTP、token 或连接值。
- 后续：本轮停止并交规划 blocked；需重新裁决 unit 入口资产后另签任务，不在本任务继续修补或部署。

## TEST-SRV-20260821-028

- 状态：`confirmed / quarantined`
- 严重度：P1（recycle canary 运行时依赖门失败，已安全回滚）
- 任务：`SERVER-MATERIAL-RECYCLE-CANARY-01 Rev4`。
- 前置结果：精确敏感扫描通过；允许 `DATABASE_URL` 键名命中 `3`、允许开发 URI 命中 `1`、阻断命中 `0`；候选 `SHA256SUMS` 清单哈希为 `4b19f5c88817df4800bc33ce5511fc0bd5681c5c004cc648807b19d399320c93`。due-job 门为 `purging=0`、`leased=0`、`due=0`、未来 scheduled=`6`。
- 发布尝试：新 backend release 与员工静态目录已在授权范围内准备，远端 SHA 对账、Node 语法、contracts 直接导入、专用 unit `systemd-analyze verify` 均通过；两条员工/backend 软链接完成原子切换，管理员静态根未变。
- 首因：正式 Fastify 重启时，backend 路由请求的 `PurgeProjectCommandParamsSchema` 从 workspace contracts 包解析不到，进程以 `SyntaxError` 退出并自动重启失败。候选归档自身 contracts dist 含该导出，但 release 的 workspace 依赖链接解析到旧 workspace 包，暴露出发布组装不一致；未继续试探式修复或重试。
- 回滚：立即停止失败 backend，原子恢复 backend 到 `20260821-employee-session-v4896`、员工静态到 `frontend-material-canary-v4914`；管理员静态仍为 `system-frontend-v4880`。旧 backend `/health`（含 database connected）复验 200。
- worker/数据边界：专用 cleanup unit 已移除且从未启动；generic worker 单元数为 `0`；未 claim、未修改/删除/延期任何 cleanup job 或项目，回滚后计数仍为 `purging=0`、`leased=0`、`due=0`、未来 scheduled=`6`、项目总数=`7`。未执行 Nginx reload、公网 smoke、真实上传或删除/清空动作。
- 清理：切换临时软链接无残留；新 release 与新员工静态目录保留作失败证据和后续规划审计，未删除旧回滚目标；未记录或输出 endpoint、密码、Cookie、Secret、OTP、token 或连接值。
- 后续：本轮停止，需规划重新裁决 release 依赖组装后另签任务；不在本任务继续补丁或重复部署。

## TEST-SRV-20260821-027

- 状态：`confirmed`
- 严重度：P1（recycle canary release 敏感扫描硬门命中）
- 任务：`SERVER-MATERIAL-RECYCLE-CANARY-01-R2-V4.927`。
- 前置结果：只读 due-job 门通过（`purging=0`、`leased=0`、`due=0`、未来 scheduled=6）；root production build 的 contracts/backend/frontend 构建均通过。
- 扫描分类：纯 `DATABASE_URL` 键名命中允许；阻断命中来自真实 PostgreSQL URI 字面量，仍触发硬门。未输出或使用任何连接值、Secret、Cookie、OTP 或 token。
- 清理/影响：未生成可用 SHA manifest；已删除本次任务创建的本地候选归档，确认无残留。未上传或创建远端 release，未切换 backend current/员工静态根，未启动 cleanup worker，未重启 Fastify 或 reload Nginx；数据库与现有项目保持不变。
- 后续：由规划先裁决产物扫描边界/构建输入后另签新 SERVER 任务；本任务不通过替换字符串、复制旧 release 或放宽扫描继续发布。

## TEST-SRV-20260821-026

- 状态：`confirmed`
- 严重度：P1（现有项目清理队列未为空，阻断回收站 canary 发布）
- 任务：`SERVER-MATERIAL-RECYCLE-CANARY-01-R1-V4.926`。
- 只读预检：身份与无密码 sudo 通过；Fastify、Nginx、PostgreSQL、Cloudflare Tunnel active；既有时间试验 timer active、service inactive、unit result=success；后端 health 与两站 loopback health 均 200；迁移 `37`。
- 数据边界：现有项目生命周期为 `active:1,recycled:6`；`cleanup_jobs` 为 `scheduled:6`，即存在 queued 清理任务。没有启动 cleanup worker，也未创建、修改或清空任何项目数据。
- 停止：依执行门，发现 queued cleanup job 后立即停止；未生成新 release、未切换 backend current 或员工静态根、未重启 Fastify、未执行 Nginx reload、未运行公网 smoke。
- 影响：服务器零写入；现有员工静态 canary、后端 v4896、管理员静态 v4880 与其他服务保持不变。
- 后续：由规划先处理/裁决现有 cleanup 队列，再另签新 SERVER 任务；本任务不自行启动 worker、不消费队列、不触碰用户现有项目。

## TEST-SRV-20260821-003

- 状态：`closed`
- 严重度：P1（员工静态 canary 发布门曾被本地校验误判阻断，现已完成受控发布）
- 时间：2026-08-21；任务 `SERVER-MATERIAL-CANARY-01 / Rev3`，`SERVER-MATERIAL-CANARY-01-R3-V4.914`。
- 本地结果：新鲜员工前端 production build 通过（199 modules）；4 个 dist 文件已归档并以 `SHA256SUMS` 自校验。归档的 `SHA256SUMS` SHA-256 为 `76f6efc3dd24fbf8b622dfff97985bd16d7a91631a41a05c4746fca49be161fb`。
- 安全扫描：`DATABASE_URL`、私钥、Bearer/Secret token、`127.0.0.1:3001`、`localhost:<port>` 与明文测试密码均为 0。唯一 `http://localhost` 为 React Router 无端口 URL 基址（JS 与 source map），符合既有精确豁免。
- Rev3 结论已被 Rev4 复核取代：既有 `known_hosts` 不是缺失或不匹配，存在并精确匹配登记指纹的记录。
- Rev4 主机键复核：既有 `known_hosts` 已有且能精确匹配登记指纹的记录。唯一无凭据 ED25519 探测工具失败只作工具事实记录；规划裁决不把它作为停止门，未重试。
- 校验口径更正：前两次严格 SSH 结果分别受 PowerShell 多行数组匹配与把 `sudo -n whoami` 的 `root` 成功输出误作 `qimao-deploy` 的本地断言错误影响；两者均非服务器故障。最终单一成功标记复核确认 `whoami=qimao-deploy` 与无密码 sudo 均通过。
- 发布：新员工静态不可变目录 `frontend-material-canary-v4914` 已上传；远端 `SHA256SUMS` 校验通过，清单自身 SHA-256 为 `76f6efc3dd24fbf8b622dfff97985bd16d7a91631a41a05c4746fca49be161fb`。员工软链接从 `frontend-v4896` 原子切换至该 canary，旧目录保留作回滚目标。
- smoke：员工 loopback `8080` 首页与 `/health` 均为 200；员工 HTTPS 首页与 `/health` 均为 200；管理员静态根仍为 `system-frontend-v4880`。Nginx、后端、管理员站、数据库、Tunnel、DNS、Worker 与防火墙均未修改。
- 清理：未创建临时 known_hosts 文件；原子切换的临时软链接已由 rename 消耗，无残留。canary 保持供用户测试。

## 调度事实｜协作协议 v6.1｜治理恢复冻结｜2026-08-21

- 更换 Codex 账号或模型后只重新探测任务权限，不重置仓库事实、不重复业务 Rev，也不调整用户手动固定的模型或推理强度。
- 所有业务执行已暂停，活动 execution lease=0；内部子代理已停止，固定 FRONT/BACK/UI/TEST/SERVER 均冻结。
- 项目不再使用隐藏 successor。固定角色任务为只读时直接 `permission_blocked`，必须等待该用户可见任务恢复或登记用户可见替代任务。
- 权威活跃状态只见 [`CURRENT.md`](../status/CURRENT.md)，服务器实时状态只见 [`TEST-SERVER-COLLABORATION.md`](../deployment/TEST-SERVER-COLLABORATION.md)。本台账只保留问题事实和状态历史。

## TEST-SRV-20260821-002

- 状态：`confirmed / quarantined`（治理恢复期间不继续修复或部署）
- 严重度：P1（素材上传/批量分配主流程阻塞）
- 时间：2026-08-21；具体时分待用户补充。
- 环境/版本：公网员工站 `https://milaidi.online`，员工 session 登录；浏览器/设备/requestId 未提供。
- 页面/操作：项目素材页，批次 `test`；点击选择素材文件夹/选择文件后尝试上传。
- 预期：选择一个系列目录，按子目录或文件名自动分配公司字幕 SRT、中文识别视频、画面字幕视频；也可单独选择文件；随后开始上传并显示进度。
- 实际：页面显示总计 5.17 GB、102 个物理文件、进度 0%，全部 102 项为“等待本地文件”；素材行仍需逐项“重新选择原文件”，选择文件夹后没有可见反应。
- 证据：用户截图显示 51 集素材映射表；当前选择列仍按单文件下拉，画面字幕视频为“明确留空”。requestId/服务日志未取得。
- 复现：用户已复现；当前未自动上传、未创建新业务数据；本轮不自动引用或上传截图以外的本地素材。
- 归因边界：需产品任务同时检查“本地文件句柄/目录选择未绑定”与“文件夹级批量自动分配”两个独立问题；测试服务器任务不修改员工前端/后端业务实现。
- 规划分派建议：FRONT 负责文件/目录选择与浏览器兼容、相对路径保留和可见错误/进度；BACK 负责目录映射、集数匹配、幂等上传与缺失/重复文件返回；UI 负责“系列文件夹→字幕/中文识别视频/画面字幕视频”分配交互；TEST 负责单文件、多文件、目录批量、取消/重试、重复/缺失/大批量回归。产品修复通过后再由本任务生成新 release、部署并做真实 smoke。
- 停止条件：在修复 release 通过公网重新验证前，不继续素材确认、任务执行或 ASR/OCR 测试；不在服务器临时注入映射逻辑或假上传成功。
- 治理审计新增事实：尚未部署的在途实现已发现跨项目扫描迟到 P0，以及幂等键污染、unknown 身份丢失、错误恢复终态和暂停收口至少四项 P1；该切片整体隔离，等待用户确认恢复路线。

## TEST-SRV-20260821-001

- 状态：`closed`
- 严重度：P1（员工公网登录链路）
- 版本：`20260821-employee-session-v4896`，员工站改为站内签名 session 登录；旧 Basic htpasswd 保留但不再被 Nginx 引用。
- 结果：公网 HTTPS 首页=200，登录=200，session/projects/tasks=200；Cookie 属性核验通过（`__Host`、HttpOnly、Secure、SameSite=Lax、14天）；登出响应清除 Cookie，清 Cookie 后 session=401。
- 重启保持：重启 `qimao-backend` 后同一会话 session=200；管理员域名未登录=302，员工会话访问 system-control=403，直接 origin system-control=403。
- 安全边界：限速使用服务端固定全局键，未信任 CF-Connecting-IP/XFF；本轮未在生产运行态故意触发 429，使用部署前专项测试证据覆盖该门。
- 监听/数据：公网保留 22/18080/18081；3001/5432/8080/8081 仅回环；Worker inactive；迁移=37。部署前项目计数快照为2，本轮收口只读核对为3，来源未在本轮写请求中产生，保留为需规划继续归因的事实。
- 证据/清理：临时 env/验证脚本/cookie jar 已精确删除；未记录密码、verifier、session secret、Cookie、JWT、Tunnel token 或数据库凭据。

状态流转：`new` → `confirmed` → `fixing` → `retest` → `closed`。关闭后如复发，仅追加 `reopened` 记录，保留全部历史。截图只在测试者明确选择后引用；本台账不自动上传截图、录像或敏感日志。

## TEST-SRV-20260820-001

- 状态：`confirmed`
- 严重度：P2（阻断本机性能 harness 验证；未影响业务或服务器）
- 首次记录：2026-08-20T10:46:16+08:00
- 环境/版本：Windows 本地工作区；Node `24.19.0`；`tsx 4.23.12`；仓库快照为未提交并行开发状态。
- 页面/操作：无页面；执行 `tests/performance/performance-harness.ts` 的 `--dry-run --scenario smoke --json` 与本地 fake smoke。
- 预期：dry-run 输出零副作用预览；fake smoke 在 loopback 内完成，费用 `CNY 0.00`。
- 实际：两次启动均在 `tsx` 初始化时失败：`uv_os_get_passwd returned ENOMEM (not enough memory)`；harness 主逻辑未运行。
- requestId/日志证据：无 requestId；Node 堆栈指向 `node:os:306` 与 `tsx/dist/temporary-directory-*.mjs`，`ERR_SYSTEM_ERROR`，errno `-4057`。
- 复现状态：本轮同一命令已受控复现一次；依照执行器故障规则，不重复重试。
- 清理状态：未启动 fake/数据库/浏览器/远程连接，无需清理。
- 截图：未选择，不引用。
- 后续：待本机执行器/内存环境恢复后，先重跑 dry-run，再运行 loopback fake smoke；不得将此问题标记为服务器部署失败。

## TEST-SRV-20260820-002

- 状态：`closed`
- 严重度：P3（服务器初始化操作指引；尚未形成服务故障）
- 首次记录：2026-08-20T11:06:07+08:00
- 环境/版本：雨云管理云服务器页面；新购测试主机处于“创建中”；4 vCPU、8 GB 内存、100+ GB 磁盘；当前系统显示“宝塔面板 10.0 [Debian 12/LNMP]”。
- 页面/操作：管理云服务器 → 信息与监控；用户不清楚默认系统及下一步操作。
- 预期：获得与项目测试部署边界一致的纯 Debian 12 主机，并明确 SSH 公钥、访问路径、安装许可和停止条件后再接入。
- 实际：默认预装宝塔面板与 LNMP，与本项目冻结的纯 Debian 12、Nginx/PostgreSQL/Fastify 最小运行方案不一致；当前尚未连接或部署。
- requestId/日志证据：无 requestId、无服务器日志；证据为用户于本任务明确提供的管理页面截图。
- 复现状态：截图已确认；待服务器从“创建中”进入可操作状态后核对镜像/重装选项。
- 清理状态：未连接主机、未安装软件、未写入 Secret、未改 DNS/TLS/防火墙，无需清理。
- 截图：用户已明确附加本地截图；仅在本台账引用其存在，不上传或复制截图文件。
- 后续：先确认新服务器无需要保留的数据，再由用户决定是否授权重装为纯 Debian 12；重装属于清空主机的破坏性操作，未确认前不得执行。
- 进展（2026-08-20T11:07:23+08:00）：用户提供“重装系统或软件”页面截图，已确认上半区提供 Debian 版本选择、下半区为附加软件安装；尚未选择版本或执行重装。下一步只展开 Debian 版本列表核对纯 Debian 12，不选择宝塔/LNMP/Docker/其他应用，也不点击“立即安装”。
- 进展（2026-08-20T11:08:27+08:00）：用户已在系统列表选中纯 `Debian 12`；未选择宝塔/LNMP 或附加软件，尚未点击“立即重装”。执行前仍需用户确认该新主机没有任何需要保留的数据。
- 状态历史：`confirmed → fixing`（用户执行纯 Debian 12 重装）→ `retest`。
- 进展（2026-08-20T11:11:53+08:00）：管理页显示主机“运行中”，系统为纯 `Debian 12`，原宝塔/LNMP 标识已消失。尚未通过 SSH 核对 `/etc/os-release`、监听端口与预装软件，因此先保持 `retest`；下一步只确认 SSH 端口和公钥登录，不在聊天传递密码或私钥。
- 进展（2026-08-20T11:14:53+08:00）：远程连接区确认存在公网地址、`root` 初始用户和平台生成的已遮罩密码，但页面未显示 SSH 端口或公钥注入入口。密码未查看、未写入台账；下一步从防火墙规则核对 SSH 端口，随后在用户本机使用密码做一次性首次登录并安装 SSH 公钥，聊天中不传递密码或私钥。
- 复测与关闭（2026-08-20T12:06:50+08:00）：用户明确提供的客服测试截图显示重装后的主机可从 serial VNC 与外部 OpenSSH 成功进入 `root` shell，系统登录横幅为 Debian GNU/Linux，且 SSH 主机指纹已随重装更新。结合此前管理页纯 Debian 12 状态，确认默认宝塔/LNMP 已由纯 Debian 12 替代，状态 `retest → closed`。后续 SSH 公钥加固仍由 `TEST-SRV-20260820-004` 独立跟踪，不把 root 密码传入聊天。

## TEST-SRV-20260820-003

- 状态：`closed`
- 严重度：P1（测试主机公网入口未收敛，连接与部署前必须修正）
- 首次记录：2026-08-20T11:15:45+08:00
- 环境/版本：雨云管理云服务器 → 防火墙规则；纯 Debian 12 测试主机处于运行中。
- 页面/操作：检查安全组与防火墙入站规则。
- 预期：SSH 仅允许用户确认的管理员出口 IPv4 `/32`，应用阶段再按授权开放 80/443；3000/3001/3010/5432 与其他端口不公开。
- 实际：未绑定安全组；防火墙处于黑名单模式且规则列表为空。根据页面说明，未被“丢弃”的端口默认全部开放。
- requestId/日志证据：无 requestId、无服务器日志；证据为用户于本任务明确提供的防火墙页面截图。
- 复现状态：截图确认；尚未从外部扫描或连接，未扩大网络探测。
- 清理状态：尚未新增、删除或保存防火墙规则；未连接主机、未部署应用。
- 截图：用户已明确附加本地截图；仅引用其存在，不上传或复制。
- 后续：先建立并核对 `TCP/22 + 管理员出口 IPv4/32 + 允许` 规则，再切换白名单模式；顺序错误可能导致 SSH 锁出，因此每一步截图确认后再保存。80/443 后续按测试访问路径单独授权。
- 进展（2026-08-20T11:16:56+08:00）：新建规则弹窗已确认支持启用、动作、源地址/CIDR、业务端口、源端口、协议与描述；默认动作为“丢弃”，尚未保存。下一步应将动作改为“允许”，源地址限定用户当前公网 IPv4 `/32`，业务端口 `22`、源端口留空、协议 `TCP`，保存并核对规则存在后才能切白名单。
- 状态历史：`confirmed → fixing`（新增 SSH 允许规则并切换白名单）→ `retest`。
- 进展（2026-08-20T11:21:48+08:00）：截图确认白名单模式已启用，唯一启用规则为“允许 / 源地址空 / 业务端口 22 / TCP”。源地址空表示全球可达 SSH，是用户明确接受的临时宽松边界；其他未手动允许端口应被拦截。尚未做外部端口复测或 SSH 登录，问题保持 `retest`；公钥登录启用后应关闭密码登录，条件允许时再收敛 SSH 来源。
- 复测与关闭（2026-08-20T11:23:58+08:00）：经用户明确授权，从当前工作机执行无凭据 TCP 握手；22=`true`，80/3001/5432=`false`。确认白名单实际生效，未登录、未发送凭据、未写服务器。状态 `retest → closed`。已知限制：SSH 22 仍对全部源地址开放，须以公钥登录并关闭密码/root 远程登录降低风险；以后若收敛来源，只追加 `reopened`，不删除本记录。

## TEST-SRV-20260820-004

- 状态：`closed`
- 严重度：P1（SSH bootstrap 尚未加固，禁止安装或部署应用）
- 首次记录：2026-08-20T11:25:25+08:00
- 环境/版本：纯 Debian 12 测试主机；公网仅 TCP/22 可达，但来源为全部地址；平台仍提供初始 `root`/密码登录。
- 页面/操作：首次 SSH bootstrap 与远程登录安全收口。
- 预期：通过雨云网页控制台/VNC 创建非 root 部署用户，写入用户本人公钥；第二个独立公钥会话验证成功后，才关闭 `PasswordAuthentication` 与 root 远程登录，并始终保留网页控制台恢复路径。
- 实际：尚未连接服务器，非 root 用户、公钥会话和 sshd 加固均未完成；应用安装与部署保持禁止。
- requestId/日志证据：无 requestId、无服务器日志；已由无凭据 TCP 握手确认 22 可达。用户本机已创建不覆盖现有文件的专用 ED25519 密钥，公钥指纹 `SHA256:Vxo7RNt4UUFfJz/bJACBKj5c0RilhfgytK/xAjd3GEY`；私钥未显示、未发送、未写入仓库。
- 复现状态：`confirmed`；等待用户继续网页控制台/VNC 操作，不自行连接、修改或保存服务器。
- 清理状态：服务器端零写入；本地新增专用密钥文件位于用户 `.ssh` 目录，未覆盖既有密钥。后续测试机回收时应一并撤销服务器公钥并由用户决定是否删除本地专用密钥。
- 截图：沿用用户明确提供的服务器信息与防火墙截图；不上传或复制。
- 后续：先在网页控制台/VNC建立非 root 用户与 `authorized_keys`，再由用户本机验证第二个公钥会话；验证前不得关闭密码/root 登录，验证后再加固并复验控制台恢复。聊天中不得发送密码、私钥或完整公网 IP。
- 进展（2026-08-20T11:31:14+08:00）：雨云 serial VNC 已出现 Debian 12 `ttyS0` 登录提示；首次 `root`/密码尝试后未进入 shell，控制台返回 `login:`，且未显示明确 `Login incorrect`。当前无法区分密码粘贴为空、剪贴板未进入 Xterm 或凭据不匹配；按受控重试边界只再尝试一次，禁止连续猜测或把密码发送到聊天。
- 进展（2026-08-20T11:32:26+08:00）：第二次受控尝试明确返回 `Login incorrect`。原平台密码登录门判定不可用，停止继续尝试，未进入 shell、未改服务器。下一步只允许打开雨云“重置密码”流程核对字段；密码由用户本人设置并保管，不进入聊天、截图、仓库或日志，确认平台是否要求关机/重启后再执行。
- 进展（2026-08-20T11:37:14+08:00）：用户通过平台“留空自动生成强密码”完成重置后，serial VNC 使用新密码仍返回 `Login incorrect`。问题已从“可能复制旧密码”收敛为“VNC 剪贴板未实际粘贴”或“平台密码重置未写入/未解锁 guest root”两类；停止继续 VNC 猜测。只允许用户在本机原生 SSH 客户端使用新密码做一次判别，仍失败则按雨云官方连接/管理说明提交工单，不安装、不部署、不自行连接服务器。
- 进展（2026-08-20T11:38:56+08:00）：首次 PowerShell 命令把中文占位符“服务器公网IP”原样作为 hostname，客户端在本机 DNS 解析阶段失败，未连接服务器、未产生认证尝试。下一步只将占位符替换为面板数字公网 IP 后执行同一条密码优先 SSH 判别。
- 进展（2026-08-20T11:44:12+08:00）：本机原生 OpenSSH 已连接 TCP/22，首次确认服务器 ED25519 host fingerprint=`SHA256:6QjFP0M0/SQlpcbrpJWVSsoS+iEmQnuoDIhoOy1wvP0` 并写入用户 `known_hosts`；平台自动生成的新 root 密码连续两次返回 `Permission denied`，第三次提示出现后要求用户 `Ctrl+C`，不再尝试。结合 serial VNC 的 `Login incorrect`，已排除公网、防火墙、sshd 不可达与单一 VNC 剪贴板问题，当前阻塞收敛为雨云 Debian 12 镜像的 root 凭据未正确初始化/账户锁定或密码重置未写入 guest。服务器端零写入，下一步只提交雨云工单，不再重置、重装、猜测或部署。
- 进展（2026-08-20T11:50:48+08:00）：雨云客服建议重装。当前主机尚无应用、业务数据或服务器端写入，用户据此进入供应商建议的修复路径，状态 `confirmed → fixing`。重装仅选择纯 Debian 12，不选择宝塔/LNMP/Docker 或其他预装软件；重装后原 SSH 主机指纹预计失效，必须先通过平台页面核对系统状态和防火墙，再重新确认主机指纹与登录边界，完成前继续禁止安装和部署应用，并保留网页控制台/VNC 恢复路径。
- 进展（2026-08-20T11:57:50+08:00）：用户明确提供的 serial VNC 截图仍显示重装前的失败登录与超时历史，底部仅出现新的 `login:` 提示；该窗口可能保留终端缓冲，截图本身不能证明重装已完成，也没有出现成功认证或新主机指纹证据。停止继续输入密码，先关闭串口窗口并以雨云面板“重装完成/运行中”、纯 Debian 12 系统信息及防火墙页面作为重装完成判据，再重新打开 VNC。
- 进展（2026-08-20T12:02:07+08:00）：用户明确提供的雨云防火墙截图确认重装流程后平台规则仍保持“白名单模式”，唯一启用规则为允许全部来源访问 TCP/22，其他未允许端口继续封闭；无需修改或重建规则，`TEST-SRV-20260820-003` 的“非 SSH 端口已收敛”关闭结论继续成立。SSH 仍为全源可达的临时边界，待公钥第二会话验证成功后再关闭密码与 root 远程登录。
- 进展（2026-08-20T12:06:50+08:00）：客服在重装后的新系统使用当前 root 密码分别通过 serial VNC 与外部 SSH 成功进入 shell，并确认了新的 ED25519 主机指纹；此前失败发生在重装前的旧系统/旧凭据边界，不能归因为用户 SSH 命令或防火墙配置错误。root 密码登录已恢复，但仍不得把密码交给本任务或写入聊天；下一步由用户在本机交互式输入密码完成一次受控登录，再写入已生成的专用公钥，`TEST-SRV-20260820-004` 继续保持 `fixing`。
- 进展（2026-08-20T12:43:34+08:00）：用户本机首次执行重装后 SSH 验证时，把 PowerShell 启动文本、提示符 `PS ...>`/`>>` 与命令一并粘贴；同时将数字地址误放进 `Read-Host` 的提示文字位置，随后在输入阶段粘贴了 `PowerShell 7.6.4`，导致 `$serverIp` 实际值成为该文本。`ssh-keygen -R` 仅报告本地 `known_hosts` 无此主机，SSH 在本机 DNS 解析阶段失败；未连接服务器、未认证、未产生服务器端写入。改为一次只输入一条不含提示符的直接命令继续验证。
- 进展（2026-08-20T12:47:25+08:00）：用户已正确清除本机旧 `known_hosts` 条目并重新连接；SSH 显示的新 ED25519 指纹与客服截图完全一致，且新条目已写回本机 `known_hosts`，因此目标主机与重装后身份确认通过。用户输入的密码连续两次返回 `Permission denied`，第三次提示出现后停止并要求 `Ctrl+C`；客服此前已用当前凭据成功进入同一主机，故当前剩余边界为用户是否从重装后面板复制了“当前密码”以及本地输入/粘贴是否完整，不再怀疑公网、端口、主机指纹或 sshd 可达性。服务器端仍零写入。
- 进展（2026-08-20T12:49:44+08:00）：用户停止上一会话后重新发起 SSH，密码认证再次返回 `Permission denied`；第二次提示出现即停止，不再继续猜测。用户终端与客服截图中的重装后 ED25519 指纹精确值均为 `SHA256:xMAhJ68ebTILI2tgehbSeTjQKJ9Czrfq66W4xzTMZ40`；此前本任务面向用户的人工转录把易混字符误写为 `xMAN...TILl2...`，现已纠正，主机身份本身一致。当前输出无法证明剪贴板内容来源，下一步由雨云客服确认其成功测试所用密码是否来自当前面板、测试后是否改动密码，并在必要时同步面板凭据；不在聊天传递密码。无配置或应用写入，系统认证日志可能正常记录失败尝试。
- 进展（2026-08-20T13:14:25+08:00）：用户同意改走公钥 bootstrap，避免继续传递或猜测 root 密码。本任务仅将本机专用 ED25519 `.pub` 公钥复制到用户本地剪贴板，命令成功且未输出密钥内容；未读取或复制私钥、未连接服务器。下一步由用户明确发送公钥给雨云客服，请其创建非 root `qimao-deploy`、写入 `authorized_keys` 并保留现有 root/密码恢复路径；第二个公钥会话验证前不得关闭原登录方式。
- 进展（2026-08-20T14:41:35+08:00）：用户未发送公钥请求，转而提供客服的进一步截图。截图同时展示面板公网地址、用户名和密码三行各自的“复制”入口，其中红框明确标出密码行右侧的第三个“复制”；serial VNC 已进入 root shell，`Last login` 显示此前来自外部 SSH 的成功会话，证明客服使用有效凭据先后通过 SSH 与 VNC。当前高概率差异是用户此前复制了相邻的地址/用户名、使用了旧剪贴板，或未从红框所示密码入口重新复制；且本任务在上一里程碑已把公钥写入本地剪贴板，当前剪贴板明确不能作为密码使用。允许仅再做一次“点击密码行复制后立即粘贴”的受控验证，失败即停止。
- 进展（2026-08-20T14:44:13+08:00）：用户在收到红框定位说明后重新发起 SSH，密码认证仍连续两次返回 `Permission denied`，第三次提示出现后要求立即 `Ctrl+C`。至此不再把问题归因于目标地址、用户名、主机指纹、端口或相邻复制按钮；客服截图中的 root shell 可能是此前保留的既有会话，不能单独证明其刚刚用“面板当前密码”完成了全新认证。下一步要求客服先退出旧 shell，再明确使用面板当前密码创建全新 SSH/VNC 会话，或直接为 `qimao-deploy` 写入用户公钥；本任务停止所有密码重试。
- 暂停（2026-08-20T14:48:43+08:00）：按用户即时暂停要求，服务器支线原地停止；不再尝试密码、不连接、不安装、不部署、不改配置。`TEST-SRV-20260820-004` 保持 `fixing`，仅在用户后续明确回复“继续”后恢复。
- 暂停期证据（2026-08-20T14:54:24+08:00）：用户明确提供的 serial VNC 截图显示窗口当前已停在 `root@RainYun-...:~#`，说明存在一个已认证的 root shell；截图不包含该会话由谁、何时或使用哪种凭据建立的证据，因此不据此恢复操作或关闭问题。保持原地暂停，不在该 shell 输入命令，等待用户明确“继续”。
- 恢复（2026-08-20T14:56:08+08:00）：用户明确回复“继续”，服务器支线从暂停恢复，`TEST-SRV-20260820-004` 保持 `fixing`。先仅在现有 serial VNC root shell 执行只读身份与系统核对；确认后才创建非 root 用户和写入用户公钥，不安装软件、不部署应用、不关闭 root/密码恢复路径。
- 接入里程碑（2026-08-20T15:08:53+08:00）：经用户明确“继续”授权，通过其现有雨云 VNC root 会话完成最小 SSH bootstrap。只读确认 `whoami=root`、系统为 `Debian GNU/Linux 12 (bookworm)`；确认 `qimao-deploy` 原不存在后，以 `--disabled-password` 创建 UID/GID 1000 的非 root 用户。建立 `/home/qimao-deploy/.ssh`（所有者 `qimao-deploy:qimao-deploy`、权限 `700`）和 `authorized_keys`（权限 `600`），写入本机专用 ED25519 公钥；服务器端指纹与本机均为 `SHA256:Vxo7RNt4UUFfJz/bJACBKj5c0RilhfgytK/xAjd3GEY`。随后在沙箱外以 `BatchMode`、`StrictHostKeyChecking=yes` 发起第二个独立公钥会话，只读 `whoami` 返回 `qimao-deploy`、退出码 0，公钥登录验证成功。VNC root 恢复路径仍保留，未安装软件、未部署应用、未关闭 root/密码登录；只读确认 `/usr/bin/sudo` 已存在，但该无密码用户尚无管理员权限。是否授予基于公钥的 `NOPASSWD` sudo 属于待用户明确确认的权限提升，`TEST-SRV-20260820-004` 继续保持 `fixing`。
- 加固与复测（2026-08-20T15:17:04+08:00）：用户明确授权为 `qimao-deploy` 配置无密码 sudo 并在验证后关闭 SSH root/密码登录。先生成临时 sudoers 规则 `qimao-deploy ALL=(ALL:ALL) NOPASSWD:ALL`，经 `visudo -cf` 返回 `parsed OK` 后，以 root/`440` 安装到 `/etc/sudoers.d/qimao-deploy`，正式文件再次 `parsed OK`；独立公钥会话执行 `sudo -n whoami` 返回 `root`、退出码 0。随后只读确认原有效策略为 `permitrootlogin yes`、`passwordauthentication yes`、`kbdinteractiveauthentication no`、`pubkeyauthentication yes`；生成并校验 SSH drop-in 后，以 root/`644` 安装 `/etc/ssh/sshd_config.d/00-qimao-hardening.conf`，完整 `/usr/sbin/sshd -t` 无输出通过，有效策略变为 `permitrootlogin no`、`passwordauthentication no`、`kbdinteractiveauthentication no`、`pubkeyauthentication yes`。`systemctl reload ssh` 后服务为 `active`；新建独立公钥会话再次 `sudo -n whoami → root`、退出码 0；强制 root 仅密码、禁用公钥的无交互负向测试返回 `Permission denied (publickey)`，退出码 1，符合预期。状态 `fixing → retest`。VNC root 恢复会话继续保留，未安装软件、未部署应用、未修改防火墙；仅余 `/tmp/qimao-deploy.sudoers` 与 `/tmp/00-qimao-hardening.conf` 两个无秘密校验临时文件，等待用户确认后删除并关闭问题。
- 清理与关闭（2026-08-20T15:26:04+08:00）：用户明确授权删除两个精确临时路径 `/tmp/qimao-deploy.sudoers` 与 `/tmp/00-qimao-hardening.conf`；删除后 `ls` 均返回 `No such file or directory`。复核正式 `/etc/sudoers.d/qimao-deploy` 仍为 `root:root 440`，正式 `/etc/ssh/sshd_config.d/00-qimao-hardening.conf` 仍为 `root:root 644`，此前公钥登录、无密码 sudo、SSH 服务 active、root/密码负向测试结论不变。状态 `retest → closed`。VNC root 恢复会话仍保留；未安装软件、未部署应用、未写 Secret、未改 DNS/TLS/防火墙。若以后公钥或 sudo/SSH 策略失效，只追加 `reopened`，不删除本记录。

## TEST-SRV-20260820-005

- 状态：`confirmed`
- 严重度：P1（测试主机时钟未获得可信同步，阻断数据库迁移、服务启动和审计烟雾）
- 首次记录：2026-08-20T16:04:00+08:00
- 环境/版本：雨云纯 Debian 12 测试主机；`systemd-timesyncd 252.39-1~deb12u2`；时区 `Asia/Shanghai`；主机即将于 2026-08-21 11:04 到期。
- 页面/操作：`TEST-SERVER-DEPLOY-01` 基础软件安装后的时间同步门；启用 `systemd-timesyncd` 并等待同步，再读取服务状态和 journal。
- 预期：`NTP=yes`、`NTPSynchronized=yes`，迁移、请求日志和容量证据使用可信同一时钟。
- 实际：服务保持 `active` 且 DNS 可解析 Debian NTP 池，但 `NTPSynchronized=no`、`Packet count=0`。journal 连续记录多个不同 NTP 地址的 UDP/123 回复超时，未收到任何时间包；首因收敛为主机或上游网络的 NTP 出站/回包路径不可用，不是单一域名解析失败。
- requestId/日志证据：无 HTTP requestId；脱敏 journal 证据为 `Timed out waiting for reply from <NTP-IP>:123`，覆盖 `0–3.debian.pool.ntp.org` 多个地址；未记录公网主机地址、密码、密钥或 Secret。
- 复现状态：安装前为 `NTPSynchronized=no`；安装并启用服务后等待 20 秒仍失败，随后只读日志确认该状态已持续约 10 分钟。依照部署停止规则，不更换 NTP 源、不手工校时、不以 HTTP Date 或跳过检查绕过。
- 清理状态：部署暂停在安全边界。Nginx `1.22.1`、PostgreSQL `15.18`、Node `24.19.0`、pnpm `11.21.0` 与必要系统工具已安装；Nginx/PostgreSQL 均 `inactive + masked-runtime`，PostgreSQL 15/main 为 `down`，只监听 SSH 22。未创建数据库角色/数据库，`backend.env` 不存在，未启动 Fastify/Worker，未启用 Nginx 站点，未开放 80/443/3001/5432，未接任何真实服务或付费网络。
- 截图：本问题未选择截图，不引用。
- 后续：由规划确认雨云是否限制 UDP/123，或批准一个可审计的可信时间同步替代方案；同时用户应先续期服务器。同步门复测为 `yes` 后才恢复 PostgreSQL 与应用部署，状态再进入 `fixing/retest`。
- 规划裁决（2026-08-20T16:08:00+08:00）：接受多地址 UDP/123 reply timeout 为当前唯一首因，任务保持 `blocked_on_time_sync / waiting_for_user`。禁止手工校时、HTTP/HTTPS Date、切换 NTP 源、安装 chrony/ntpsec 等第二客户端，也禁止启动 PostgreSQL/Nginx/Fastify、生成运行凭据、执行迁移或构建；runtime masks、release 与已安装包原样保留。恢复前需用户完成服务器续期，并由雨云工单修复该 RCS 实例/宿主到公网 NTP 的 UDP/123 出站及回包路径。恢复复测只使用现有 `systemd-timesyncd`，必须同时满足 `NTPSynchronized=yes`、`Packet count>0`、状态/偏差合理。
- 用户范围裁决（2026-08-20T16:12:00+08:00）：用户明确本机仅用于一天试用，先验证可用性后再决定是否续费；当前不续期，续期不再作为技术恢复门，也不得产生续期或其他购买费用。现有到期时间改为本轮硬停止点。NTP 故障与续期无关，仍需雨云修复 UDP/123 出站/回包并通过现有 `systemd-timesyncd` 复测；若供应商未能在试用窗口内修复，则如实结论为“供应商网络门导致试用期内无法完成部署验证”，不得以绕过时钟门伪造可用。
- 客服确认（2026-08-20T16:18:00+08:00）：用户转述雨云客服明确答复“目前 NTP 攻击较严重，机房均屏蔽 NTP 流量”，并建议改用“HTP”等其他时间同步方式。由此确认 UDP/123 超时是供应商机房策略，不是临时丢包、DNS、续期或用户配置错误；原“等待雨云修复 NTP 回包”路径在该机房当前不可成立。客服建议本身不等于项目对 HTTP/HTTPS Date、第二校时客户端或手工校时的授权；任务继续保持 `confirmed / blocked_on_time_sync`，只交规划评估一次性试用是否接受受控 HTTP(S) 时间源及其精度、来源、持续同步和审计限制，裁决前不安装、不改时钟、不启动数据库或应用。
- 有界 HTP 裁决与复测（2026-08-20T16:15:15+08:00）：规划为“一天、零费用、仅验证可用性”批准 Debian 官方 `htpdate 1.3.7-1` 的 `trial_only_http_consensus` 临时门。执行前已把 timesyncd 的 UTC/RTC、配置摘要、状态与 journal 保存为服务器 root-only 日志，随后停止但未删除 `systemd-timesyncd`，其 enable 状态保持。安装 `htpdate` 前以 runtime mask 阻止自动启动；包版本精确匹配，服务保持 `inactive + masked-runtime`。仅以 `-q -d -4 -n` 查询 `www.debian.org`、`www.kernel.org`、`www.cloudflare.com`，未使用 `-s/-a`，未修改时钟。Debian 成功（报告 Offset 0.125 秒），Cloudflare 成功（Offset 0.250 秒），kernel.org 返回 `No server suitable for synchronization found`、退出码 1；控制端与远端末次 UTC 约差 0.6 秒。由于只有 2/3 来源成功，未满足“至少3源成功且任一失败即停”的接受门，立即停止，不替换第四来源、不启 daemon、不配置平滑校正，也不启动 PostgreSQL/Nginx/Fastify。状态继续为 `confirmed / blocked_on_time_sync`。
- Rev2 固定池通过（2026-08-20T16:17:03+08:00）：依规划冻结规则，仅执行一次 `-q -d -4 -n` 批次，按固定顺序查询 Debian、Cloudflare、Microsoft、Aliyun、QQ、Baidu；每源一次、未增加第七源、未重试、未改时钟。六源全部退出码 0，分属六个独立操作方，包含三个国际与三个中国大陆来源；报告偏差依次为 0.062、0.125、0、0.125、0.125、0.125 秒，时间散布 0.125 秒，服务器与控制端同时 UTC 交叉偏差约 0.576 秒，最大校正需求 0.125 秒。root-only 证据保存为 `/var/log/qimao-terms-cloud/htpdate-rev2-query-only.txt`；Rev2 接受门全部通过，但明确不等同 `NTPSynchronized=yes` 或可信生产时间。
- 持续校验首轮（2026-08-20T16:19:43+08:00）：安装无凭据配置 `/etc/default/htpdate` 与审计标记 `/etc/qimao-terms-cloud/time-source.mode=trial_only_http_consensus`，原包配置保存为 `/etc/default/htpdate.pre-qimao-trial`。固定六源守护进程实际参数为 `-D -a -l -d -4 -n -m 300 -M 300`，`HTP_IFUP=no`；首轮六源均取得标准 Date，最终仅平滑 `Adjusting 0.125 seconds`，服务显示 active。`systemd-timesyncd` 保持 stopped+enabled，`timedatectl` 继续诚实显示 `NTPSynchronized=no`；PostgreSQL/Nginx/Fastify 仍未启动。
- 守护模式硬边界（2026-08-20T16:37:49+08:00）：启动约 10 分钟后仍无第二轮 HTTP 查询。复核 Debian bookworm `htpdate 1.3.7-1` 官方 man page与同版本源代码确认：`-m/-M` 单位虽为秒，但每次 `sumtimes` 非零并发生平滑校正后，程序会先固定执行 `sleep(DEFAULT_MIN_SLEEP)`（30 分钟），再执行配置的 `sleep(sleeptime)`（300 秒）；因此当前守护模式约 35 分钟一轮，无法满足规划冻结的“每 5 分钟至少两源成功、连续两轮失败即停”门。没有增加 timer/cron/第二客户端或其他补丁路径；保持数据库与应用停止。已通过网页 VNC 提交 `systemctl stop htpdate && systemctl mask --runtime htpdate` 及只读状态输出命令，但浏览器控制在提交后刷新超时，停止结果当前必须记为 `verification_pending`，不得宣称已完成；本机 SSH 执行上下文此时无法读取用户 `.ssh` 私钥路径，未绕过该保护。下一步只交规划裁决是否允许包内 htpdate 的单一路径 systemd timer/oneshot 方案，或直接回滚本次 HTP 试用。
- Rev3 先决门阻塞（2026-08-20T16:43:56+08:00）：规划批准仅使用 Debian `htpdate 1.3.7` 的 root-owned systemd oneshot+timer，但硬先决条件是先重新连接并只读证明包自带 daemon 已 `inactive + masked-runtime`。本轮先后尝试关闭卡住的临时标签、重新打开雨云详情页、新建 VNC 页面及切回用户原雨云标签页；页面 URL/标题可取得，但 DOM、截图或控制台画面读取均连续超时，无法看到前一步状态命令的结束标记。本机 SSH 执行上下文继续明确拒绝读取用户 `.ssh` 私钥路径，未复制、显示或绕过私钥保护。依 Rev3 规则保持 `verification_pending`：未新建 `/usr/local/libexec/qimao-htpdate-trial`、未写 oneshot/timer、未启动 PG/Nginx/Fastify，也未重复提交 stop/mask 命令。恢复条件仅为用户刷新/重开雨云 VNC 后提供可读取的 root shell，或既有专用公钥在安全执行路径重新可用；随后第一条动作只能是只读状态验证。
- 用户已按要求于 2026-08-20T16:50:41+08:00 重新打开 VNC，但 Edge 扩展、内置浏览器和专用 SSH 公钥三条安全读取路径仍无法取得服务器终端状态：网页详情页/iframe DOM 与截图连续超时，SSH 仅在本机报专用私钥不可访问并未连接。继续保持 `verification_pending`，不写 Rev3 资产，不执行任何服务器变更。
- Edge 重启后恢复了详情页 DOM 可读性（2026-08-20T17:05:47+08:00）：确认雨云详情页存在已激活的 VNC `Terminal input`，未见验证码交互被执行。已由本任务向该终端提交一次只读命令 `systemctl show htpdate -p ActiveState -p UnitFileState; systemctl show systemd-timesyncd -p ActiveState -p UnitFileState; echo __REV3_READONLY_END__`；命令提交后的终端文本/截图再次超时，结果严格记为 `verification_pending`，未重复输入、未写配置、未启动测试栈。
- 唯一标签接管仍阻塞（2026-08-20T17:13:44+08:00）：用户确认当前 Edge 仅保留一个雨云详情页/VNC 标签。浏览器 `openTabs` 能看到该标签，但对从当前列表取得的同一标签执行 `claimTab` 连续超时；未重新输入任何服务器命令，未读取或保存凭据，未创建 Rev3 资产，旧 htpdate 停止/运行时屏蔽结果继续严格记为 `verification_pending`。
- 旧 daemon 停止结果（2026-08-20T17:17:05+08:00）：用户在可见 root VNC 中执行规划指定单行命令后回传终端输出，显示 `LoadState=masked`、`ActiveState=inactive`、`SubState=dead`、`UnitFileState=masked-runtime`，并出现停止验证标记；命令链未见报错。当前先记录为用户文本证据，仍等待包含上述四行的清晰 VNC 截图，截图门通过前不创建 Rev3 资产。
- Rev3 先决门通过（2026-08-20T17:20:37+08:00）：用户提供清晰 VNC 截图，四项状态同时成立：`LoadState=masked`、`ActiveState=inactive`、`SubState=dead`、`UnitFileState=masked-runtime`，出现 `__REV3_STOP_VERIFIED__`，root 提示符返回。允许进入 Rev3 资产准备。
- Rev3 资产已在本地准备（2026-08-20T17:20:37+08:00）：仅在允许范围 `deploy/debian/htpdate/**` 新增 root-owned 调度脚本、oneshot unit 与 5 分钟 timer；脚本固定六源、单次 query-only 门、国内/国际与散布/中位/最大校正限制、连续两轮失败停止本轮自有测试单元，并记录 root-only 失败计数。服务器端尚未写入；本机无 bash/systemd-analyze，静态验证仍需服务器路径完成。
- Rev3 写入通道仍阻塞（2026-08-20T17:20:37+08:00）：Edge 当前唯一雨云标签仍可被 `openTabs` 发现，但接管控制通道再次超时；本机专用 SSH 私钥路径仍不可用。未上传资产、未启用 timer、未启动 PostgreSQL/Nginx/Fastify/Worker，下一步只在安全控制路径恢复后上传并做 `bash -n`/`systemd-analyze verify`。
- 内置浏览器切换（2026-08-20T17:28:32+08:00）：用户在 Codex 内置浏览器完成雨云登录并打开同一详情页/VNC；IAB DOM 可读且 root 提示符可见，浏览器控制路径恢复。当前外部执行会话对专用私钥文件可见性不稳定，SSH/scp 上传尚未完成；未复制/显示私钥，未改 SSH 策略，未启动任何服务。若安全 SSH 通道不能稳定恢复，不改走 VNC 大段粘贴或 base64，需用户本机执行一次受控资产上传后再由 IAB 继续。
- SSH key visibility 最终阻塞（2026-08-20T17:29:22+08:00）：按规划续派仅用既有 `qimao-deploy` 专用密钥执行一次 `BatchMode + IdentitiesOnly + StrictHostKeyChecking` 只读核验；OpenSSH 报 `Identity file ... not accessible`，随后 `Permission denied (publickey)`。未建立会话、未读取/复制/移动私钥、未改变 SSH 策略；不再追加第三通道，Rev3 上传/静态验证/timer/应用与 DB 继续冻结，状态交规划 `blocked_on_ssh_key_visibility`。
- Rev3 首轮服务失败（2026-08-20T17:32:44+08:00）：修正密钥路径后上传 3 项资产，服务器/本地 SHA256 一致；root-owned 安装、`bash -n` 与 `systemd-analyze verify` 均通过，旧 htpdate 再确认 `inactive + masked-runtime`。启用 timer 后首轮触发立即以 `226/NAMESPACE` 失败；journal 首因为 `ReadWritePaths` 目标 `/var/lib/qimao-terms-cloud/time-trial` 不存在。已停止 `qimao-htpdate-trial.timer` 防止重试，保留失败服务状态与 unit 原样；未启用第二轮、未启动 PostgreSQL/Nginx/Fastify/Worker。等待规划对该确定部署资产缺目录问题裁决，禁止叠加补丁。
- Rev3 单点修正裁决（2026-08-20T17:35:00+08:00）：核对后确认共享 `/var/log/qimao-terms-cloud` 必须保持 `qima:qima 0750` 供后续业务账户写日志，不得为时间试用 chown；仅将本地脚本日志目录与 service `ReadWritePaths` 改为专属 `/var/log/qimao-terms-cloud/time-trial`，并预创建该目录 `root:adm 0750`、状态父目录 `root:root 0755`、状态子目录 `root:root 0700`。仅重传脚本与 service，远端 SHA256 与本地一致；`bash -n`、`systemd-analyze verify`、daemon-reload 通过；旧 htpdate 仍 `inactive + masked-runtime`，timer 启动前为 `inactive + enabled`。
- Rev3 修正后首轮（2026-08-20T17:37:37+08:00）：timer 触发时 service 从命名空间阶段继续执行，但脚本在 `mkdir -p /var/log/qimao-terms-cloud/time-trial` 处因受限命名空间将共享根视为只读，返回 `Permission denied`、退出码 `1/FAILURE`；未产生六源 query、未执行校时，日志文件与失败计数未生成。已于 2026-08-20T17:39:39+08:00 停止 timer，保留 service failed 与 journal 首因；未启动 PostgreSQL/Nginx/Fastify/Worker，继续 blocked_on_first_cause，禁止再追加修正，等待规划裁决。
- 最终回滚（2026-08-20T17:42:19+08:00）：按规划最终裁决精确执行 `disable --now qimao-htpdate-trial.timer`、停止并 reset-failed 本轮 service；确认 timer `inactive + disabled`、service `inactive + dead + Result=success`。核对既有 root-owned 普通文件 `/etc/default/htpdate.pre-qimao-trial` 后原样恢复 `/etc/default/htpdate`，两者 SHA256 均为 `841d7be93400ad8b7f4d4ede7d1f22a1865d79e0a4a41a7df1d94d91b9a9090a`。移除 htpdate 运行时 mask，包自带 htpdate 保持 `inactive + disabled`；`systemd-timesyncd` 恢复 `active + enabled`，`NTP=yes` 但 `NTPSynchronized=no`（供应商 UDP/123 屏蔽事实未绕过）。Rev3 脚本/unit/专属目录与 root-only 证据均保留，未删除日志或文件；PostgreSQL/Nginx 继续 `inactive + masked-runtime`，Fastify/Worker/DB/env/迁移未创建。最终监听仅 TCP/22，80/443/3001/5432 无监听；结论固定为本雨云一天试用在当前可信时间门下未通过部署前置，不续费、不购买资源。
- Rev4 上游核对与资产替换（2026-08-20T17:50:00+08:00）：用户提供的 `https://github.com/twekkel/htpdate` 为 htpdate 上游仓库；其 README 明确支持多来源、渐进校时和 daemon，但建议 Linux 优先使用发行版打包版本，且准确度说明不等同严格 NTP。按规划 FIFO324 保持 Debian 官方包，仅将同名 trial 脚本改为消费 systemd 提供的 `LOGS_DIRECTORY`/`STATE_DIRECTORY`/`RUNTIME_DIRECTORY`，service 使用 `LogsDirectory/StateDirectory/RuntimeDirectory` 自动创建并移除 `ReadWritePaths`；未改六源、门值或 timer 语义。远端 SHA256 与本地一致，`bash -n`、`systemd-analyze verify`、daemon-reload 通过；timer 保持 `inactive + disabled`，htpdate `loaded + inactive + disabled`，timesyncd 启动前为 `active + enabled`。
- Rev4 手动时间门（2026-08-20T17:52:31+08:00）：按批准先停止 timesyncd（保持 enabled）并手动启动 trial service；systemd 目录自动创建成功，脚本实际完成六个固定源各一次查询。结果为 Debian `-2.125000s`、Cloudflare `0`、Microsoft `0.250000s`、Aliyun/QQ/Baidu 各 `0.125000s`；中位 `0.125000s`，散布 `2.375000s`，最大绝对偏差 `2.125000s`，超过冻结门 `spread≤2s/maxabs≤60s`，因此未执行 `-a` 平滑校时。失败计数为 `1`，随后已停止 trial/timer 并恢复 timesyncd `active + enabled`；`NTP=yes`、`NTPSynchronized=no`。按 FIFO324“任一失败即停、不进入 timer/不再 Rev5”，数据库、应用、端口边界保持冻结。
- Rev5 domestic-only 产品决策与三轮通过（2026-08-20T18:35:04+08:00）：用户明确接受仅国内 HTTP 时间源作为一天试用基线；规划冻结且仅使用阿里云、QQ、百度三源，每轮各一次、3/3成功，门值仍为 spread≤2s、abs(median)≤2s、maxabs≤60s。仅更新脚本源列表与3/3门，复用 Rev4 的 systemd LogsDirectory/StateDirectory/RuntimeDirectory 设计；远端脚本 SHA256=`CD82BDC813409D9C9204335B6A15BBBA068C3852C1ABF0B2B4F5C87438C61034`，bash -n、systemd-analyze verify、daemon-reload通过。手动轮 18:29:07 三源均 `0.125000s`，平滑校时成功；timer 第一轮 18:29:26 三源均 `0.125000s`，成功；timer 第二轮 18:34:43 三源均 `0s`，成功；两轮间隔约 5 分钟、无重叠，失败计数为 `0`。当前 trial timer 保持 `active + enabled`，timesyncd 保持 `inactive + enabled`，htpdate 包服务保持 `inactive + disabled`；PostgreSQL/Nginx/Fastify/Worker、DB/env/迁移未启动/创建，未开放80/443/3001/5432。三轮只证明国内试用时间基线通过，不等同生产可信时间；交规划进行下一阶段 loopback 部署评审。

## TEST-SRV-20260820-006

- 状态：`closed`
- 严重度：P1（阻断固定 release 的依赖安装、迁移与构建；未启动 Fastify/Nginx）
- 首次记录：2026-08-20T18:40:00+08:00
- 环境/版本：测试服务器 Debian 12；Node `24.19.0`；固定 release `20260820-system09-v4851`；运行账户 `qimao`；父目录 `/opt/qimao-terms-cloud` 由保留的 legacy `qima` 账户所有。
- 页面/操作：部署阶段 C，按规划以 `qima` 账户执行固定 release 的 `pnpm --version` / `pnpm install --frozen-lockfile`。
- 预期：qimao 能使用已安装的 Node/Corepack 与 pnpm，随后按锁文件安装依赖并进入正式迁移/构建。
- 实际：Corepack 尝试创建 `/opt/qimao-terms-cloud/.cache/node/corepack/v1` 时返回 `EACCES: permission denied`；由于 `qimao` 无法写入其 home 下缓存目录，pnpm 版本查询和依赖安装均未开始。
- requestId/日志证据：无 HTTP requestId；SSH 命令原始首因仅为 `node:fs ... Error: EACCES ... mkdir '/opt/qimao-terms-cloud/.cache/node/corepack/v1'`，未记录凭据或环境值。
- 复现状态：同一受控命令已复现一次；依阶段首因规则停止，不重试、不切换用户、不改用第二包管理路径。
- 清理状态：PostgreSQL 回环实例及隔离测试数据库/角色已按部署阶段 B 创建；未安装 workspace 依赖、未执行迁移、未构建、未启动 Fastify/Nginx/Worker，未开放公网端口。未删除现有 release 或服务器日志。
- 截图：未选择，不引用。
- 后续：已获用户批准并仅创建 `/opt/qimao-terms-cloud/.cache`（qimao:qimao 0750）；Corepack 与 pnpm 11.21.0 可用，锁文件校验和 210 包安装成功。该问题状态 `confirmed → fixing → closed`；缓存目录保留供本 release 使用。

## TEST-SRV-20260820-007

- 状态：`closed`
- 严重度：P1（阻断正式迁移编译、依赖后的构建与 Fastify 启动；未启动 Fastify/Nginx）
- 首次记录：2026-08-20T18:55:00+08:00
- 环境/版本：测试服务器 Debian 12；Node `24.19.0`；pnpm `11.21.0`；固定 release `20260820-system09-v4851`；backend `db:migrate` 入口。
- 页面/操作：部署阶段 B 完成后，以 root:qimao 受保护环境运行 `pnpm --filter @qimao-terms-cloud/backend run db:migrate`。
- 预期：使用 release 内完整 TypeScript 配置编译 `backend/dist/database/migrate.js`，随后在隔离数据库中执行 37 项迁移。
- 实际：编译首个确定错误为 `error TS5083: Cannot read file '/opt/qimao-terms-cloud/releases/20260820-system09-v4851/tsconfig.base.json'`。随后出现的 moduleResolution、target、类型导出等大量错误均视为该根配置缺失的连锁结果；迁移程序未启动，数据库 schema 未写入。
- requestId/日志证据：无 HTTP requestId；SSH 原始输出保留 TS5083 首因，未记录 DATABASE_URL、密码或其他 Secret。
- 复现状态：固定 release 同一迁移命令已受控失败一次；随后仅补齐工作树中已存在的 `tsconfig.base.json`（SHA-256=`D4A69CE6AC5CBCA2D5796C9D3981B7E277765DE4B54E4EF065E5261C0E94046A`）并重跑，37/37 迁移成功。
- 清理状态：PostgreSQL 仍仅监听 127.0.0.1:5432；`schema_migrations=37`，核心业务表 `projects`、`material_manifests`、`term_versions`、`asr_batches`、`screen_text_batches`、`delivery_products`、`system_control_commands` 均为 0 行；隔离数据库和角色、受保护 env、依赖安装结果与 release 保留。未启动 Fastify/Nginx/Worker，未开放公网端口。未删除任何失败产物或日志。
- 截图：未选择，不引用。
- 后续：交付包缺失已修复，issue 状态 `confirmed → fixing → retest → closed`；继续进行构建阶段，若出现新的首因另行登记。

## TEST-SRV-20260820-008

- 状态：`confirmed`
- 严重度：P1（阻断 production Fastify 启动硬门；未启动 Fastify/Nginx）
- 首次记录：2026-08-20T19:12:00+08:00
- 环境/版本：测试服务器 Debian 12；Node `24.19.0`；pnpm `11.21.0`；固定 release `20260820-system09-v4851`；contracts/backend/frontend/system-frontend 构建命令均已返回成功。
- 页面/操作：部署阶段 D，以 `NODE_ENV=production`、`PORT=3001`、服务器受保护环境执行正式 `backend/dist/server.js` 有界启动。
- 预期：Fastify 在回环 3001 监听，随后进入真实 UploadStorage/DeliveryStorage 生产硬门判定。
- 实际：Node 模块加载阶段即失败，首个原始错误为 `ERR_MODULE_NOT_FOUND: Cannot find module '/opt/qimao-terms-cloud/releases/20260820-system09-v4851/packages/contracts/src/projects.js' imported from .../packages/contracts/src/index.ts`。当前 contracts 包的 `exports` 仍指向 `./src/index.ts`，其源码使用 `.js` 相对导出；构建脚本仅 `tsc --noEmit`，没有产生可供 production Node 运行的 contracts JS 产物。
- requestId/日志证据：无 HTTP requestId；首个 Node ESM 错误已由有界启动输出保留，未输出 DATABASE_URL、密码或其他 Secret。
- 复现状态：production 正式入口已受控失败一次；按硬门规则停止，不切换 development、不注入内存 fake、不改 contracts/backend 生产实现。
- 清理状态：PostgreSQL 仍仅监听 127.0.0.1:5432；迁移 37/37、核心业务表零行、四项前端/后端构建产物保留；Fastify/Nginx/Worker 未启动，未开放公网端口。未删除 release 或失败证据。
- 截图：未选择，不引用。
- 后续：交规划评估现有 contracts 生产打包/导出契约；在获得明确产品范围授权前，不修改 `packages/contracts`、backend 或其运行时导入路径，也不进入 Nginx/站点烟雾。
- 规划暂停门（2026-08-20T19:20:00+08:00）：规划确认首因属于仓库正式打包缺口，不是服务器、PostgreSQL、迁移或依赖安装失败。状态保持 `confirmed`，阻断标签 `blocked_on_product_fix`；独立产品修复 FIFO329-BACK-DEPLOY-RUNTIME-01-R1-V4.874 负责唯一正式 contracts runtime build/export 与干净构建门。禁止服务器临时生成或复制 contracts JS、修改 release exports、使用 tsx/development、改 node_modules 或注入 fake；Fastify/Nginx/Worker 保持停止，3001/8080/8081 不监听，不进入站点烟雾。当前无需用户操作，等待规划精确恢复令牌。
- 规划恢复与关闭（2026-08-20T19:35:00+08:00）：FIFO330-TEST-SERVER-DEPLOY-01-R3-V4.876 批准新干净 release `20260820-contracts-runtime-v4875`；contracts runtime build/export、普通 Node 动态导入 `ProjectSchema`、backend/两站构建均通过。旧 release 未修改，issue 状态 `confirmed → fixing → retest → closed`；原模块解析阻塞已消除。

## TEST-SRV-20260820-009

- 状态：`retest`
- 严重度：P1（production Fastify 真实依赖未满足，阻断 3001/两站 loopback 烟雾）
- 首次记录：2026-08-20T19:38:00+08:00
- 环境/版本：测试服务器 Debian 12；新 release `20260820-contracts-runtime-v4875`；Node `24.19.0`；正式 `backend/dist/server.js`；`NODE_ENV=production`；隔离 PostgreSQL 37/37 已迁移且业务零行。
- 页面/操作：按 FIFO330 D 门使用服务器现有 root:qimao 受保护环境执行一次有界 production Fastify 启动。
- 预期：Fastify 真实监听 `127.0.0.1:3001`，随后才能进行 `/health` 与 Nginx loopback 两站烟雾。
- 实际：contracts 模块已正常解析后，应用在 `createDefaultUploadStorage()` 首个真实生产门拒绝启动：`Error: 生产环境尚未配置真实对象存储适配器。` 进程退出，未监听 3001。
- requestId/日志证据：无 HTTP requestId；原始 Node 错误堆栈已保留，未输出 DATABASE_URL、密码、Secret 或供应商凭据。
- 复现状态：正式 production 入口已受控执行一次并命中该首因；按 FIFO330 停止，不接入真实对象存储、Access、Secret、厂商 API、COS/Sentry，不使用 memory fake/development 绕过。
- 清理状态：新 release 保留；旧 release 未修改；PostgreSQL 仅回环 active，Rev5 timer active+enabled/failure count 0；Fastify/Nginx/Worker 未启动，3001/8080/8081 未监听，公网仍仅22。无需要清理的临时凭据或进程。
- 截图：未选择，不引用。
- 后续：交规划决定是否另行授权真实 UploadStorage/DeliveryStorage/Secret/Access/provider 依赖；未获新授权前不继续 E、不更新 current、不安装或启动 Nginx。
- 规划暂停门（2026-08-20T19:45:00+08:00）：FIFO330 八项差量已接收。规划裁决一天试用改采用服务器本地磁盘持久存储，不购买 COS、不使用内存 fake；但必须由仓库正式实现 UploadStorage+DeliveryStorage、同源生产分片 PUT、原子文件写入、路径/符号链接防护、跨进程 multipart 恢复及 production env 注入。独立产品修复 FIFO331-BACK-DEPLOY-STORAGE-01-R1-V4.877 负责实现与复核；本任务状态阻断标签 `blocked_on_filesystem_storage_product_fix`。新旧 release 与 current 保持不变，Fastify/Nginx/Worker 停止，3001/8080/8081 未监听；PostgreSQL 回环 37/37 空库与 Rev5 时间轮原状保留。未获后续精确 release 令牌前不写服务器、不更新台账事实之外的资产、不开放公网、不续费。
- 产品修正完成（2026-08-20T20:10:00+08:00）：FIFO331/332 已在仓库正式完成 `FilesystemUploadStorage`、`FilesystemDeliveryStorage`、production 注入与同源 binary PUT；规划 Rev2 审核要求的中间路径符号链接拒绝、并发分片授权持久化和 Delivery 独立命名空间已收口。新鲜 filesystem 专项 `5/5`、backend typecheck/build、check:repo、diff-check 通过。问题从 `confirmed → fixing → retest`；只有新不可变 release 在测试服务器真正启动 Fastify、完成上传/交付跨实例读取后才能关闭。

## TEST-SRV-20260820-010

- 状态：`closed`
- 严重度：P1（阻断正式本地文件存储命名空间核对与 production Fastify 真链；未启动 Fastify/Nginx/Worker）
- 首次记录：2026-08-20T20:32:05+08:00
- 环境/版本：测试服务器 Debian 12；新不可变 release `20260820-filesystem-storage-v4880`；Node `24.19.0`；pnpm `11.21.0`；PostgreSQL 15/main 仅回环监听，37/37 迁移且核心业务表零行；Rev5 国内三源时间 timer 最近轮成功、失败计数为 0。
- 页面/操作：FIFO333 Rev4 步骤 3，核对 `QIMAO_STORAGE_ROOT` 与正式 Upload/Delivery 存储命名空间。
- 预期（原门）：服务器端受保护环境使用 `QIMAO_STORAGE_ROOT=/var/lib/qimao-terms-cloud`；根目录及其 `uploads`、`deliveries` 命名空间均为非符号链接、`qimao:qimao`、`0750`，然后进入临时隔离数据库/存储真链和 production Fastify 启动。
- 实际：环境键已安全追加，未回显其他值；既有 `/var/lib/qimao-terms-cloud` 为普通目录但所有者/权限为 `root:root 0755`，与冻结要求不一致；`uploads`、`deliveries` 尚不存在。按“发现既有不匹配路径即停止”边界，未执行 `chown`、`chmod`、删除或命名空间创建，未启动 Fastify。
- requestId/日志证据：无 HTTP requestId；受控 SSH 只读 `stat` 结果为 `root:root 755 directory`，未输出环境值、密码或 Secret。发布包归档/远端 SHA 为 `3EEC9EB50D4C78CF881B566C03CB304280A44BF1D765889E70E9B74FE8F7E244`；frozen install、根 build、contracts 普通 Node 动态导入均 exit 0。
- 复现状态：首个目录权限核对已受控完成一次；依 FIFO333 停止，不重试、不擅自改权限、不切换存储路径、不临时写服务器适配器。
- 规划归因与新门（2026-08-20）：父目录曾承载 root-only 时间试验状态，直接递归 `chown/chmod` 会扩大应用账户权限并可能改写历史证据，因此拒绝原地改权。仓库正式部署资产改为专属 `StateDirectory=qimao-terms-cloud/storage` 与 `QIMAO_STORAGE_ROOT=/var/lib/qimao-terms-cloud/storage`；父目录继续 `root:root 0755`，既有内容不动，仅由 systemd 创建并拥有 `storage` 子目录 `qimao:qimao 0750`。问题进入 `confirmed → fixing`；服务器必须先证明父目录/既有子项均非符号链接、嵌套 StateDirectory 经 `systemd-analyze verify` 通过、启动前后只改变专属子目录，才可继续真链。
- 清理状态：新 release 保留且未修改；PostgreSQL 仅回环 active，Fastify/Nginx/Worker 停止，3001/8080/8081 无监听，公网仍仅 SSH 22；未创建临时数据库/存储根、未更新 `current`、未开放公网、未续费。
- 截图：未选择，不引用。
- 后续：规划已批准专属 `storage` 子目录；systemd 创建并核对 `qimao:qimao 0750`，父目录与既有 `time-trial` 未改变。问题状态 `confirmed → fixing → retest → closed`；完整上传/交付跨重启真链未纳入本轮网站目标，另行后置。

## TEST-SRV-20260820-011

- 状态：`closed`
- 严重度：P1（阻断 qimao-backend systemd 启动；未影响数据库）
- 首次记录：2026-08-20T20:42:00+08:00
- 环境/版本：Debian 12；Node `24.19.0` 实际入口为 `/usr/local/bin/node`；本轮 loopback 网站接入。
- 页面/操作：安装本轮 `qimao-backend.service` 后执行 `systemd-analyze verify`。
- 预期：unit 能解析并启动正式 backend。
- 实际：unit 首版 `ExecStart=/usr/bin/node`，服务器不存在该路径，静态验证报 `Command /usr/bin/node is not executable: No such file or directory`；未启动应用。
- requestId/日志证据：无 HTTP requestId；systemd-analyze 原始错误已保留，未输出环境值或 Secret。
- 复现状态：一次确定性复现；将部署资产改为 `/usr/local/bin/node` 后 SHA 对账、daemon-reload、systemd-analyze verify 均通过。
- 清理状态：仅覆盖本轮 qimao-backend unit；无业务数据改动，端口未新增。
- 后续：状态 `confirmed → fixing → retest → closed`；该修复属于部署资产路径校正，不改业务代码。

## TEST-SRV-20260820-012

- 状态：`closed`
- 严重度：P1（backend 进程启动后无监听，阻断网站接入）
- 首次记录：2026-08-20T20:43:00+08:00
- 环境/版本：Debian 12；v4880 release；`current` 指向 v4880。
- 页面/操作：通过 `current/backend/dist/server.js` 启动正式 Node 入口。
- 预期：进程保持运行并监听 `127.0.0.1:3001`。
- 实际：首版 unit 启动后约 1 秒正常退出、无监听；原始入口判断在软链接路径下未进入 `startServer()`。
- requestId/日志证据：systemd journal 仅记录 `Deactivated successfully`，无 HTTP requestId、无 Secret 输出。
- 复现状态：加 `--preserve-symlinks-main` 后进程稳定运行，`/health` 真实 200。
- 清理状态：无额外业务文件；unit 保留修正结果。
- 后续：状态 `confirmed → fixing → retest → closed`；不改 backend 业务实现。

## TEST-SRV-20260820-013

- 状态：`closed`
- 严重度：P1（可能意外开放公网 80；已立即停止并修正）
- 首次记录：2026-08-20T20:44:00+08:00
- 环境/版本：Debian 12；Nginx 默认 `sites-enabled/default` symlink 原本存在。
- 页面/操作：启动仅含 8080/8081 的 loopback 配置后复核监听。
- 预期：公网只保留 SSH 22。
- 实际：Nginx wildcard 会加载本轮备份名 `default.disabled-fifo334`，导致默认站点监听 `0.0.0.0:80` 与 `[::]:80`；已立即停止 Nginx，未开放 443。
- requestId/日志证据：无 HTTP requestId；`ss -ltn` 与 `nginx -T` 记录了监听来源。
- 复现状态：将本轮创建的默认 symlink 可逆移到 `sites-available` 后，`nginx -t` 通过，重新启动仅监听 127.0.0.1:8080/8081。
- 清理状态：保留可恢复的默认 symlink 于 `sites-available/default.disabled-fifo334`；无公网 DNS/TLS/防火墙改动。
- 后续：状态 `confirmed → fixing → retest → closed`；公网 80/443 仍未监听。

## TEST-SRV-20260820-014

- 状态：`closed`
- 严重度：P1（阻断员工/管理员静态首页与深链）
- 首次记录：2026-08-20T20:45:00+08:00
- 环境/版本：Debian 12；v4880 两站 dist；Nginx `www-data`。
- 页面/操作：请求 `127.0.0.1:8080/` 与 `127.0.0.1:8081/`。
- 预期：两站首页 200。
- 实际：两站均 404；Nginx error.log 为 `Permission denied`，因旧 release 的 `releases` 父目录为 0750，www-data 无法穿过。
- requestId/日志证据：无 HTTP requestId；Nginx error.log 已保留首因，未输出 Secret。
- 复现状态：将已构建 v4880 两站 dist 复制至专属 `/srv/qimao-terms-cloud/frontend-v4880` 与 `system-frontend-v4880`（root:root 0755），切换本轮软链接后首页、深链均 200。
- 清理状态：旧 release 未改权、未删除；仅新增本轮静态副本与 loopback 配置。
- 后续：状态 `confirmed → fixing → retest → closed`；员工/管理员网站已达到本轮可访问目标。

## TEST-SERVER-WEB-SMOKE-01

- 状态：`closed`
- 范围：仅回环网站接入，不代表完整生产部署。
- 证据：Fastify `/health` 直接与经 8080/8081 代理均 200；两站首页 200；深链刷新 200；未知 `/api` 返回 404 且非 HTML；`.map` 返回 404；公网监听仅 TCP/22，3001/5432/8080/8081 均为 loopback。
- 未覆盖：登录身份策略、完整上传/交付跨重启真链、真实 ASR/OCR、COS/Sentry、压测、故障注入、域名/TLS、续费。

## TEST-SRV-20260820-015

- 状态：`closed`
- 严重度：P1（曾阻断公网 18080/18081 防火墙放行；服务器本地 Nginx 监听已就绪）
- 首次记录：2026-08-20T20:58:29+08:00
- 环境/版本：雨云 RCS 测试服务器；白名单模式；既有放行 TCP/22 保持不变；目标为任意来源 TCP/18080、TCP/18081。
- 页面/操作：雨云控制台“防火墙规则”→“新建防火墙规则”，尝试保存允许 TCP/18080、TCP/18081（空源地址/全网段，描述 `public-test-web-20260820`）。
- 预期：新增两站公网端口放行规则，其他端口不变。
- 实际：控制台自动提交连续返回“输入参数无效”；随后用户在可见页面手动分别创建 `18080/tcp` 与 `18081/tcp` 允许规则，源地址留空，既有 22 规则保持不变。
- requestId/日志证据：无可见 requestId；控制台可见错误文本为“输入参数无效”；未读取或记录账号凭据。
- 复现状态：自动表单错误已复现；用户手动规则保存成功，未绕过验证码或调用未授权接口。
- 清理状态：规则保留；Nginx 公网配置通过 `nginx -t`，随后从本机外部验证 18080/18081 首页、深链、health 与 API smoke。
- 后续：规则事实已关闭；服务因 TEST-SRV-20260820-016 时间门失败而停止，不能据此宣称当前公网仍可访问。

## TEST-SRV-20260820-016

- 状态：`closed`
- 严重度：P1（曾因状态读取误判触发停止；未造成数据损坏）
- 首次记录：2026-08-20T21:15:51+08:00
- 环境/版本：Debian 12；Rev5 国内三源 HTTP 时间试验；Fastify/Nginx/PostgreSQL 公网 smoke 已通过后复核。
- 页面/操作：读取 `qimao-htpdate-trial.timer` 最近状态与 `/var/lib/qimao-htpdate-trial/consecutive-failures`。
- 预期：最近时间轮成功且失败计数为 0，才能保持测试栈运行。
- 实际：当时命令把 `stat %s`（文件大小 2 字节）误标成 `failure_count=2`，随后按保守门停止 `qimao-backend`、Nginx、PostgreSQL 与 trial timer/service 并恢复 `systemd-timesyncd`。随后只读读取文件内容确认实际值为 `0`；专属日志中最近完整轮次全部 `3/3`、offset `0.000000`、`spread=0`、`adjust_ok`。21:15:44 轮次是在人工停止时收到 SIGTERM，并非源失败。
- requestId/日志证据：无 HTTP requestId；`/var/lib/qimao-htpdate-trial/consecutive-failures` 内容为 `0`（root:root、0600）；`/var/log/qimao-htpdate-trial/htpdate-trial.log` 保存了最近轮次原始 source/offset/adjust 记录，未读取或输出 Secret。
- 复现状态：误判已纠正；Rev5 历史策略与本条记录保留，不把人工停止当作时间源失败。
- 清理状态：Fastify/Nginx/PostgreSQL inactive；trial timer disabled/inactive；htpdate 包 inactive/disabled；systemd-timesyncd active/enabled；构建产物、日志与公网规则保留。
- 后续：本条关闭；新用户裁决另立 `TEST-SERVER-TIME-RELAX-01`，使用放宽后的 domestic-only trial 门，不改写 Rev5 历史。

## TEST-SRV-20260820-017

- 状态：`closed`
- 严重度：P1（时间基线曾阻断网站运行；domestic-relaxed Rev1 已通过试用门）
- 首次记录：2026-08-20T21:32:19+08:00
- 环境/版本：Debian 12；Debian 官方 htpdate 1.3.7；`qimao-htpdate-trial` domestic-relaxed Rev1；固定源仅 `www.aliyun.com`、`www.qq.com`、`www.baidu.com`。
- 页面/操作：新裁决 `TEST-SERVER-TIME-RELAX-01`；手动一轮 + timer 连续两轮；每源每轮仅一次。
- 预期：至少 2/3 成功；spread≤5s；abs(median)≤30s；每个成功源 abs(offset)≤30s；abs(median)≤5s 标记 normal，5–30s 标记 warning；失败连续 6 轮才停止，超过 30s 的 median/成功源立即硬停。
- 实际：手动 21:24:15、timer 21:24:57、timer 21:30:02 三轮均 3/3；median=0、spread=0、maxabs=0、class=normal、adjust_ok；失败计数保持 0。
- requestId/日志证据：无 HTTP requestId；root-only `/var/log/qimao-htpdate-trial/htpdate-trial.log` 已记录每源 query、offset、gate、adjust；Rev1 脚本远端 SHA256 `57d6b5da61259b41b78a9ed736ad63448a7be6d7c4e6a230a25b54c085d5a7d9`；未输出 Secret。
- 复现状态：Rev1 静态 `bash -n`、`systemd-analyze verify` 通过；timer active/enabled；包自带 `htpdate.service` inactive、masked-runtime；`systemd-timesyncd` inactive 但 enabled 作为回滚路径。
- 清理状态：未安装第二客户端、未使用 cron/手工 HTTP Date 写时；PostgreSQL/Fastify/Nginx 已按顺序恢复，Worker 未启动；公网端口仍仅规则允许的 18080/18081，3001/5432 仅回环，80/443 无监听。
- 后续：策略仅限当前一天、国内访问试用，不等同生产可信时间；任一未来轮次触发硬门或连续 6 轮失败，立即停止测试栈并恢复 timesyncd。

## TEST-SRV-20260820-018

- 状态：`confirmed`
- 严重度：P1（员工身份无法读取任务中心，中心任务无法领取）
- 首次记录：2026-08-20T22:30:41+08:00
- 环境/版本：公网员工站 `http://<服务器公网IP>:18080`；当前部署 release `20260820-filesystem-storage-v4880`；Debian 12；Fastify 生产模式；Nginx 公网测试端口 18080。
- 页面/操作：员工站“任务中心”打开/重新读取中心任务。
- 预期：当前员工身份按其项目范围读取可见任务，并在具备资格时领取。
- 实际：接口 `GET /api/tasks?limit=20&offset=0` 返回 `403 TASKS_FORBIDDEN`，消息为“当前员工身份无权读取任务中心。”；这不是未绑定域名造成的，员工站静态页与同源 API 可通过公网 IP 正常访问。
- requestId/日志证据：外部只读复验返回 `X-Request-Id: 26215820-e63f-4a84-9069-ff54b54f41e7`；未读取或记录 Secret、Cookie 或个人信息。
- 复现状态：已复现；前端当前没有可用的员工 principal/项目范围身份接入，后端按设计拒绝任务中心读取。管理员身份接入未配置的限制保持不变。
- 清理状态：未创建任务、未写入业务数据、未修改服务器配置；网站与数据库保持原运行状态。
- 后续：身份接入需后续产品门（邮箱登录/受信 JWT 校验/精确员工项目范围）；当前不要重复点击“领取”或伪造身份。状态保持 `confirmed`。

## TEST-SRV-20260820-019

- 状态：`closed`
- 严重度：P1（公网员工站无法创建项目；点击确认前端异常，未发出请求）
- 首次记录：2026-08-20（用户本轮口述）
- 环境/版本：同 TEST-SRV-20260820-018；员工站公网端口 18080。
- 页面/操作：员工站项目中心点击“创建项目/新建项目”，用户反馈“没有反应”。
- 预期：首次点击展开项目名称表单；输入名称后点击“确认创建”，服务端返回 201/200 并刷新项目列表。
- 实际：项目表单已正常展开，输入名称后点击“确认创建”没有提交；浏览器控制台记录 `TypeError: crypto.randomUUID is not a function`，异常发生在创建幂等键生成处，因此未发出 POST。公网测试站使用纯 HTTP，非安全上下文不提供该 API；这属于部署协议与前端运行时的组合缺陷，不是项目 API 或未绑定域名导致。
- requestId/日志证据：无 HTTP requestId（请求未发出）；浏览器控制台时间 `2026-08-20T14:33:19.576Z`，资源 `/assets/index-C4s87B8b.js`，原始错误为 `TypeError: crypto.randomUUID is not a function`。只读复验 `GET /api/projects?lifecycleStatus=active&limit=100` 返回 `200`、`{"items":[],"total":0}`，requestId=`f40b0af9-840f-413f-a5b5-7a41e19a423c`；未发送 POST，未创建项目。
- 复现状态：已复现；员工站按钮与输入框可见，但提交事件在生成幂等键时抛错并停在页面。
- 清理状态：无新增数据、无服务器写入。
- 后续：需要产品侧修复正式前端运行时兼容，或提供 HTTPS/TLS 安全上下文后再验证；本测试任务不修改 frontend 业务实现，也不在浏览器注入随机数或伪造 POST。当前不要重复点击提交，以免修复后产生重复意图。
- 产品修复与公网复测（2026-08-20T23:03:41+08:00）：规划令牌批准 FRONT-PUBLIC-WEB-01 Rev1。工作树员工站本轮生产构建为 `196 modules`，定向 `tests/frontend/randomUuid.test.ts` 与 `tests/frontend/ProjectCenter.test.tsx` 共 `12/12` 通过；生成静态归档 `20260820-public-http-uuid-v4885`，归档 SHA-256=`BF951EA89FBEA696885C20DDF4A2FAC177D62784D43B4BCD49984ACE241174AF`，JS 资产 SHA-256=`E9BE77CD057BEB79EB9E171A6EC1CD6521A28268B83A8CE37F338EFFA145698D`。远端 `/srv/qimao-terms-cloud/frontend` 已原子切换并解析到 `frontend-v4885`，管理员静态根仍为 `system-frontend-v4880`，`nginx -t` 与 reload 成功；此前三次整仓 staging cwd/文件名扫描失败已按规划作为执行噪音处理，未遗留同名 archive/release。
- 归档扫描边界（2026-08-20）：产物中唯一 `http://localhost` 为 React Router 在无 `window.location.origin` 时的第三方内部 URL 构造字面量，无端口、无 fetch/API 引用；按规划精确豁免并记录上下文。`localhost:<port>`、`127.0.0.1:3001`、`DATABASE_URL`、Secret/key 关键字扫描均 0 命中；未修改 bundle。
- 公网真实复验（2026-08-20T23:03:41+08:00）：在公网员工项目中心通过 UI 填写匿名名 `公网HTTP兼容验证`，仅点击一次“确认创建”；浏览器控制台错误/警告为空。Nginx 访问日志显示同一时间窗口仅 1 条 `POST /api/projects` 且状态 `201`，随后只读 `GET /api/projects` 返回唯一项目 `85dcdd34-16d6-4a89-9fc0-4ed576868634`、`total=1`；响应 `X-Request-Id=4d7c50a3-8a64-4887-ba87-7eede5b964df`。新 helper 生成 RFC4122 v4 幂等键，具体值不写入日志或台账；未重发 POST。
- 复测状态：`confirmed → fixing → retest → closed`。员工首页、项目深链、health 均 200；未知 `/api` 为 404 非 HTML，`.map` 为 404；管理员首页/深链/health 200，管理员 `/api/system-control/overview` 仍诚实 403（邮箱身份未接入）。
- 清理状态：匿名项目是用户明确尝试创建的测试数据，保留供后续试用；未上传视频、字幕、术语、密码或个人信息。员工/管理员/后端/数据库版本边界按要求保留，Worker 未启动；公网仅 22/18080/18081，80/443/3001/5432 未暴露。

## TEST-SRV-20260820-020

- 状态：`confirmed`
- 严重度：P1（阻断“真实可操作”MVP 的身份、任务中心、管理员 API 与 HTTPS 域名入口；页面静态与匿名项目链路仍可用）
- 首次记录：2026-08-20（用户要求两个网站必须是真实可操作环境，并准备接入 Cloudflare Tunnel/域名）
- 环境/版本：Debian 12；Fastify v4880；员工静态 `frontend-v4885`；管理员静态 `system-frontend-v4880`；PostgreSQL 37/37、当前 2 个匿名项目；公网 TCP/22、18080、18081；3001/5432/8080/8081 仅回环。
- 页面/操作：员工“任务中心”读取、管理员系统控制台 API、准备访问 `milaidi.online`（员工）与 `milaidi.top`（管理员）。
- 预期：员工凭受信身份按项目范围读取任务；管理员凭用户邮箱登录后访问 system-control；两个域名经 HTTPS Tunnel 分别转发到 127.0.0.1:8080/8081。
- 实际：公网只读复验员工首页/项目页/深链/health 与管理员首页/深链/health 均 200；`GET /api/tasks` 返回 403 `TASKS_FORBIDDEN`，`GET /api/system-control/overview` 返回 403；项目创建/列表/详情是真实 PostgreSQL 链路但 actor 固定为 `local-user`，当前数据库有 2 个匿名测试项目。上传/交付完整跨重启真链未在公网验收。`qimao-worker` inactive；默认 ASR、OCR/屏幕文本与术语提取为 deterministic fake/zero-network adapter，不能称为真实模型或厂商服务。
- 身份接线首因：`backend/src/app.ts` 未注入 `systemControlPrincipalResolver` 时使用 `() => null`，`defaultAccessReadiness` 将 issuer、employee audience、control audience 均置为未配置；`backend/src/server.ts` 只注入本地文件存储。任务路由要求 `employee` audience、`tasks:read` capability 与项目范围；管理路由要求 `system-control` audience 和精确 capability。仓库当前无 `jose`、`jsonwebtoken`、`@fastify/jwt` 依赖，受保护环境仅存在 `DATABASE_URL`、`NODE_ENV`、`PORT`、`QIMAO_STORAGE_ROOT` 键名。
- Tunnel 前置事实：服务器 `cloudflared` 命令和 systemd unit 均不存在；尚未改 DNS、Cloudflare、TLS 或 80/443，也未读取/写入 tunnel token。目标映射固定为 `milaidi.online → 127.0.0.1:8080`、`milaidi.top → 127.0.0.1:8081`。
- requestId/日志证据：本轮公网只读 403 响应未在台账保存 Cookie、Authorization 或 Secret；时间门最新日志为三源 3/3、offset/median/spread/maxabs=0、`adjust_ok`、failure count=0。身份缺口由源代码静态核对与公网状态共同证明，不伪造 principal。
- 复现状态：已复现并确认；不是未绑定域名单独造成，不能用测试 header、固定主体、Basic Auth 或前端假登录绕过。
- 清理状态：未安装 cloudflared，未改 DNS/Cloudflare/TLS/防火墙，未启动 Worker，未创建新业务数据；现有两站与匿名测试项目保留，公网 18080/18081 保持运行。
- 后续最小门：DNS/zone 只读确认 → 规划确定 Cloudflare Access 两个 Application 的 issuer/JWKS/audience 与精确邮箱白名单 → 产品实现正式 JWT 校验、employee 项目范围和 system-control principal resolver → 用户秘密步骤提供 Tunnel token → 官方 cloudflared root-only systemd ingress → HTTPS 首页/深链/health/API 非 HTML smoke → 真实员工任务与管理员邮箱 API 复验。未获凭据边界前不得安装或接入外部资源。
- 进展（2026-08-20T23:55:07+08:00）：规划已完成 Cloudflare Access JWT 产品接线；测试服务器尚未注入真实 issuer/audience/邮箱白名单，因此员工任务中心与管理员 API 继续诚实 403。按新授权已通过官方 Cloudflare APT 源安装 `/usr/local/bin/cloudflared 2026.8.2`，token 仅经 SSH stdin 写入 `/etc/cloudflared/token`（root:root 0600），未进入命令行、日志或台账；`cloudflared.service` 为 root-owned、enabled/active，4 条 HA 连接，metrics request errors=0。
- 进展清理/边界：未改 DNS、Cloudflare Dashboard、Access、TLS 或 80/443；18080/18081、PG/Fastify/Nginx 与现有数据不变。cloudflared 日志提示尚未提供 ingress rules，所有 incoming HTTP 将返回 503；因此 Tunnel 连接健康但域名入口尚未完成，转由新问题 `TEST-SRV-20260820-021` 跟踪。
- 事实更新（2026-08-20）：身份产品接线已由 FIFO335 完成，当前 403 的直接原因收敛为测试服务器尚未注入真实 `QIMAO_ACCESS_*` issuer/audience/邮箱白名单配置；不再归因于仓库缺 JWT resolver。Tunnel 安装已完成，前述“cloudflared 不存在”保留为安装前历史，现状以本条进展和 `TEST-SRV-20260820-021` 为准。

## TEST-SRV-20260820-021

- 状态：`confirmed`
- 严重度：P1（Tunnel 进程已连通，但域名 HTTPS 入口无法转发到员工/管理员站）
- 首次记录：2026-08-20T23:55:07+08:00
- 环境/版本：Debian 12；`cloudflared 2026.8.2`；Tunnel ID `1ce3b296-afce-455d-981e-9278f6370b2b`；官方 APT 包；`cloudflared.service` root-owned、enabled/active。
- 页面/操作：Cloudflare Tunnel `qimao-test-server` 连接与域名入口准备。
- 预期：Tunnel 将 `milaidi.online` 转发到 `127.0.0.1:8080`、`milaidi.top` 转发到 `127.0.0.1:8081`，HTTPS 首页/深链/health/API 非 HTML 可用。
- 实际：服务 active/running、`NRestarts=0`、4 条已注册 HA 连接，metrics `cloudflared_tunnel_ha_connections=4`、`cloudflared_tunnel_request_errors=0`；但日志明确为 `No ingress rules were defined ... cloudflared will return 503 for all incoming HTTP requests`。因此连接健康不等于域名入口已配置。
- requestId/日志证据：无 HTTP requestId；仅记录 tunnelId、版本、服务状态、连接数和脱敏日志事实，未记录 token、Cookie、Authorization 或环境值。
- 复现状态：已确认；不重试、不自行新增第七源或命令行 token，不改 Dashboard/Access。
- 清理状态：token 保留在服务器 root-only 文件供 systemd 使用；未改 DNS/Cloudflare/TLS/80/443、防火墙、PG/Fastify/Nginx 或业务数据；18080/18081 保留为公网回退。
- 后续：规划/用户在 Cloudflare Dashboard 配置两个精确 hostname/ingress 后，再由本任务只读复验 HTTPS 首页、深链、health、API 非 HTML；随后再按 Access issuer/audience/邮箱白名单门复验员工任务与管理员 API。未获新的 Dashboard 操作授权前不执行外部配置。

## TEST-SRV-20260820-022

- 状态：`confirmed`
- 严重度：P1（员工公网一月测试使用固定弱凭据；必须在继续长期测试前更换为强随机密码；本条不代表生产安全）
- 首次记录：2026-08-21（用户明确授权员工临时 Basic Auth）
- 环境/版本：Debian 12；Nginx active；员工 loopback `127.0.0.1:8080`；管理员 loopback `127.0.0.1:8081`；公网回退 `18080/18081`；Fastify 仍仅 `127.0.0.1:3001`。
- 页面/操作：员工站临时共享 Basic Auth 接入；管理员站保持邮箱登录路线，不启用 Basic。
- 预期：员工未认证请求返回 401；使用用户指定临时凭据后首页、深链、health、项目列表真实返回 200；管理员首页/深链/health 可达且无 `WWW-Authenticate`，管理 API 继续诚实 403。
- 实际：员工 `8080` 未认证 `/`、`/projects`、`/health`、`/api/projects` 均 401；认证后四项均 200。管理员 `8081` `/`、`/overview`、`/health` 为 200，`/api/system-control/overview` 为 403，Basic challenge 缺失。公网回退 `18080/18081` 未误加 `auth_basic`，仍按现有 HTTP 配置运行。
- 配置/安全证据：`/etc/nginx/qimao-auth/employee.htpasswd` 为 `root:www-data 0640`，父目录 `root:root 0750` 并仅授予 www-data 穿越权限；员工配置含 1 个 `auth_basic` 与 2 个 `$remote_user` 受信头注入点，公共/管理员站点清空该头；共享代理头片段清空客户端同名头；`nginx -t`、reload、service active 均通过。未记录明文密码、bcrypt 哈希、Cookie、Authorization 或 token。
- 首因/修复：首次认证失败由 Windows→SSH 标准输入的 CRLF 被带入旧 bcrypt 值造成；服务器端按精确密码字节重写后，`htpasswd` 校验与 Nginx 实际 200 均通过。该执行噪音不归因于产品 API 或域名。
- 复现状态：已确认；未认证/认证、管理员无 Basic 与管理员 403 均在本轮新鲜回环请求验证。
- 清理状态：保留本轮受保护 htpasswd、配置备份和 Nginx 运行态；未改 DNS、Cloudflare Dashboard/Access、Tunnel token、80/443、防火墙、数据库、Worker 或业务数据。固定弱凭据不写入本台账，后续强密码替换前不得将其描述为生产安全。
- 后续：员工 Basic 仅限一月临时测试；规划需另行派发强密码轮换、systemd 自动启动、PG/两站备份、日志轮转、时间同步连续监控、证书/Tunnel 健康与一月停止/续费策略，当前不顺带扩展。

## TEST-SRV-20260820-023

- 状态：`retest`
- 严重度：P1（管理员有效 Access 邮箱会话尚未由用户本人完成可见复验；员工身份已通过）
- 首次记录：2026-08-21（`FIFO337-TEST-SERVER-ACCESS-DEPLOY-01-R1-V4.889`）
- 环境/版本：Debian 12；不可变 backend release `20260821-access-jwt-v4889`；归档 SHA-256=`AD5BE2C5B05688BAA9BA3456DE9B559D6ABEC0BA65C7A5CDB7B21534ED838DEA`；Node 24.19.0；pnpm 11.21.0；Fastify/PG/Nginx/cloudflared active；Worker inactive。
- 页面/操作：受保护 backend 环境身份键接线、原子切换 `current`、员工域名 `milaidi.online` 与管理员域名 `milaidi.top` HTTPS 只读真链。
- 预期：员工经 Basic 后项目/任务/health JSON 可读；员工不能访问 system-control；管理员未登录由 Cloudflare Access 拦截；管理员有效邮箱会话后 system-control API 才能 200；直接 origin 无 Access JWT 必须 403。
- 实际：新 release frozen install、根 build、contracts 普通 Node import 均通过；Fastify 原子切换后 `127.0.0.1:3001/health=200`。员工 loopback 与域名 Basic 后 `/api/projects=200`、`/api/tasks?limit=20&offset=0=200`、`/health=200`，内容类型均 JSON；员工 system-control=403。管理员 loopback 与直接 origin system-control=403；`https://milaidi.top/health` 未登录返回 302，`https://milaidi.online/health` 未认证 401、认证后 200。Tunnel active、4 条 HA、restart=0，Dashboard 两条 ingress 已生效。
- requestId/日志证据：员工 loopback `/api/projects`=`5ef39c99-a26a-4b45-bff9-98893f6c5b17`、`/api/tasks`=`2e6d3576-3b67-423b-96b9-4d3d61a7eefe`；域名 `/api/projects`=`ea7b64ba-71bd-41c3-b846-a786ccabe2b6`、`/api/tasks`=`fb9181ff-56c2-4d9a-b6a0-3a1d9bb1eee2`；管理员直接 origin=`ba2c7cbc-f5b8-403a-b0d6-314c05e9cb89`。未记录 JWT、Cookie、Authorization、Basic 密码或 Tunnel token。
- 复现状态：员工真链已通过；管理员未登录拦截已通过；有效邮箱会话/OTP 未自动操作，等待用户本人在可见 Cloudflare 页面完成后再只读复验，不创建项目、不上传媒体、不发送写请求。
- 清理状态：旧 release 未修改，旧前端静态根未换版；PostgreSQL 37/37 与 2 个匿名项目保留；Worker 未启动；3001/5432 仍仅回环；公网回退 18080/18081 保留；环境文件 root:qimao 0640，受保护备份同权限。
- 后续：用户本人完成管理员 Cloudflare Access 邮箱会话后，仅复验 `milaidi.top` 首页/深链/health 与 `/api/system-control/overview` 200；若出现 OTP，只能用户本人输入。员工固定弱 Basic 凭据继续列为一月测试 P1，后续需强密码轮换；不接真实 provider/ASR/OCR/Worker，不开放 80/443，不删除回退端口。

## TEST-SRV-20260820-024

- 状态：`confirmed`
- 严重度：P1（员工域名在 Codex 内置浏览器中无法进入原生 Basic Auth 登录流程；当前不允许移除认证、公开匿名或改用 URL 内嵌凭据）
- 首次记录：2026-08-21（用户在 Codex 内置浏览器访问 `https://milaidi.online/`）
- 环境/版本：Cloudflare Tunnel 两条 ingress 已生效；员工 loopback `127.0.0.1:8080` 与公网域名均由 Nginx Basic Auth 保护；backend release `20260821-access-jwt-v4889`；Nginx/Fastify/PostgreSQL/cloudflared active；Worker inactive。
- 页面/操作：浏览器打开员工域名首页，期待出现浏览器原生 Basic Auth 登录框并进入员工站。
- 预期：未认证 401 + `WWW-Authenticate: Basic`；用户在浏览器登录框输入临时凭据后首页/深链/API 可操作。
- 实际：Codex 内置浏览器显示 `ERR_INVALID_AUTH_CREDENTIALS`，未出现 Basic Auth 登录框。服务器只读复验未认证 `https://milaidi.online/`=401、`WWW-Authenticate: Basic` 存在；通过受保护 curl 凭据首页/health=200；回环未认证首页=401。服务器服务、监听、PG 37/37、项目数2、Fastify health=200均保持正常。
- requestId/日志证据：本轮认证失败发生在浏览器挑战阶段，未产生业务 API requestId；curl 只读复验未记录响应体、密码、Cookie、Authorization 或 Tunnel token。
- 复现状态：用户浏览器现象已确认；curl 对照成功，问题边界收敛为浏览器原生 Basic Auth 与当前用户实际访问面不兼容，不归因于 Fastify、PG、Tunnel 或密码值。
- 清理状态：未改密码、htpasswd、Nginx、Tunnel、DNS、Access、防火墙、数据库或业务数据；不移除认证，不公开匿名，不使用 URL 内嵌凭据。
- 后续：保持当前服务和认证配置，等待规划决定兼容的用户访问方案；管理员 Cloudflare Access 继续保持不变，员工不要重复提交写请求或在聊天发送密码。

## TEST-SRV-20260822-025

- 状态：`partial`（发布成功；认证正向 Tus 真传待用户可见会话）
- 严重度：P2（验收权限边界，不是服务故障）
- 环境/版本：backend `20260822-upload-tus-v4942-src`、员工静态 `frontend-upload-tus-v4942`、管理员静态 `system-frontend-v4880`；PostgreSQL `39/39`；Fastify/Nginx/cloudflared active。
- 实际：本地/远端 release SHA-256 一致，pnpm 11.21.0 frozen install、根 build、不可变 root-owned release、原子 backend/员工静态切换和第 4 次 health readiness 均通过。迁移前后 projects=15、upload_sessions=42、upload_parts=16、assets=16、upload_commands=74 不变，旧会话 `multipart=42`。loopback/公网首页与 `/uploads`=200、未知 API=401 JSON、map=404；Tus OPTIONS=204 且协议版本正确，未认证 POST=403 JSON、规范 HEAD/GET=401 JSON，Fastify health 仍为 200。
- 未完成：完整 create→Tus POST/PATCH/HEAD→complete→Asset/绑定、首次 POST=1、非零进度、恢复 HEAD、共享普通视频与专用 screen Asset 断言，需要一个现有员工同源认证会话。执行该项会要求读取或输入密码、Cookie 或 OTP；本任务未读取 Secret、Cookie、认证信息或真实素材，未绕过身份，也未创建/删除业务测试项目。
- 清理/回滚：当前 v4942 在线；切换前 v4940 backend/员工静态和 v4934 backend/员工静态均保留。无真实素材上传、无 cleanup/删除操作；仅本轮临时归档待本地清除。
- 后续：用户在可见员工登录页面完成会话后，另行以最小合成 SRT/小字节 MP4 执行一次受控正向 Tus 烟雾；不得在聊天发送密码、Cookie、Authorization 或 OTP。
