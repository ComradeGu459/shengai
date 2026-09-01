# 测试服务器协作看板

## 权限与接力同步 v5.0｜2026-08-21

- 权威接力快照已写入 `docs/status/CURRENT.md v4-896`。FRONT、UI、TEST 固定任务的 `permission_profile=read-only` 只使原执行通道转为 observer；同角色 writable successor 使用 `workspace-write/:workspace + ordinary_writes=direct` 从原停点续接，不等待用户转述。
- FRONT successor 当前正在完成素材文件夹选择、分配预览、暂停继续的定向复验与构建；BACK create-upload 命令恢复产物已是 `artifact_written`；UI 验收文档已完成；TEST successor 已占用独立测试路径并等待 FRONT 冻结后开始正式验收。
- 接力固定为 `FRONT artifact_written → 规划收件 → TEST 独立验收 → 规划关闭/服务器新 release`。固定任务界面显示闲置不再作为“没有工作”的判断依据，以 CURRENT 的 execution lease 和同一 `handoffToken` 三阶段为准。
- 该权限是 Codex 工作区的本地文件租约，不是网站账号、雨云、腾讯云或 Cloudflare 权限。当前测试服务器保持现状：不部署本轮未验收产物、不上传真实 5.17 GB 素材、不启动 ASR/OCR，不改变现有公网/回环服务。

## 当前阻塞｜TEST-SRV-20260821-002

员工素材页当前只能显示已登记的 102 条物理文件，重新选择本地文件/素材文件夹后未完成绑定，进度保持 0%。该问题已确认并进入修复：BACK 命令同身份恢复与 UI 验收文档均已形成产物，FRONT writable successor 正在收尾，TEST writable successor 等待 FRONT 冻结后执行独立验收。验收通过后才由测试服务器任务制作不可变 release、部署并做公网真实 smoke；当前继续暂停真实素材确认、任务执行和 ASR/OCR，不在服务器临时改业务代码或伪造上传成功。

## FIFO345｜TEST-SERVER-EMPLOYEE-SESSION-DEPLOY-R2｜2026-08-21

- release：`20260821-employee-session-v4896`；本地归档 SHA-256 `091DB055222B3BF908865BC70D5C0B94CBDA4407FF47E9DB7B4D98F8C59D7D38`；服务器 frozen install/root build 完成，contracts/backend/frontend 产物存在，员工 Vite=198 modules。
- backend/env：`current` 已原子切换到新 release；`qimao-backend` active，health=200；环境文件保持 root:qimao 0640，仅新增固定用户名/会话开关/verifier/secret/origin 键，值不写入台账；旧 trusted-proxy/test-username 键已移除。
- employee：loopback Nginx Basic 与 remote_user 引用均为0；旧 htpasswd 保留 root:www-data 0640；员工静态根为 `/srv/qimao-terms-cloud/frontend-v4896`，root:root 0755。
- 公网真链：`https://milaidi.online/`=200；一次受控登录=200；session/projects/tasks=200；登出清 Cookie 后 session=401；重启 backend 后同会话=200；管理员未登录 `milaidi.top`=302；员工会话及直接 origin system-control 均=403。
- runtime：Nginx/Fastify/PostgreSQL/cloudflared/domestic-relaxed timer active，Worker inactive；公网监听22/18080/18081，3001/5432/8080/8081 仅回环，80/443 未监听；迁移=37。当前只读项目计数=3，部署前快照=2，来源待规划归因。
- 安全/清理：未触发生产 429 锁定（固定全局键的 429 由部署前专项证据覆盖）；密码、hash、Cookie、JWT、Access/Tunnel token、DB secret 均未回显；临时脚本、env 临时文件、cookie jar 均已删除；旧 release/env/Nginx 回滚副本保留。
- 下一门：保持网站运行供测试；管理员 Cloudflare Access 邮箱会话、强密码替换、备份/轮转/自启动等后置治理另由规划裁决；不启动 Worker/真实 ASR/OCR/付费服务，不开放新端口。

状态：员工 session release `20260821-employee-session-v4896` 已上线并通过 HTTPS 登录/session/projects/tasks/logout 与 Fastify 重启后 Cookie 保持；管理员域名未登录 Access 302 保持；当前唯一产品前置是素材文件夹批量分配/暂停继续修复与独立验收。
最后同步：2026-08-21，`CURRENT v4-896 / WORKFLOW v5.0`。

本页是测试服务器的唯一协作入口。详细故障历史仍以 [`TEST-SERVER-ISSUES.md`](../testing/TEST-SERVER-ISSUES.md) 为准；执行步骤以 [`TEST-SERVER-ONE-DAY-RUNBOOK.md`](TEST-SERVER-ONE-DAY-RUNBOOK.md) 为准。

## 1. 现在到哪里了

| 项目 | 当前事实 | 状态 |
| --- | --- | --- |
| 主机 | Debian 12，4 vCPU、约 8 GB 内存、约 92 GB 可用磁盘 | 已通过 |
| 登录安全 | `qimao-deploy` 公钥登录与 `sudo -n` 可用；root/密码 SSH 已关闭 | 已通过 |
| 时间基线 | domestic-relaxed Rev1 固定阿里云、QQ、百度；手动 1 轮 + timer 连续 2 轮均 3/3、median/spread/maxabs=0、adjust_ok，失败计数 0 | 仅限当前一月国内测试，不等同生产可信时间 |
| PostgreSQL | 15/main，仅监听 `127.0.0.1:5432`；37/37 迁移；当前保留 2 个匿名项目 `公网HTTP兼容验证` 与 `1`，未上传媒体/字幕 | active，回环 |
| 构建 | contracts、backend、员工站、管理员站生产构建成功；员工 v4885 本轮 196 modules、定向 2 files/12 tests 通过 | 已通过 |
| 本地磁盘存储 | 专属 `/var/lib/qimao-terms-cloud/storage` 由 systemd 创建为 `qimao:qimao 0750`；父目录与 `time-trial` 未改变 | 已通过最小启动门 |
| Fastify | v4880 release 正式启动，回环 `127.0.0.1:3001/health` 真实 200 | active，回环 |
| Nginx/两站 | 员工静态根切换至 `frontend-v4885`，管理员保持 `system-frontend-v4880`；公网规则 `18080/tcp`、`18081/tcp` 已保存；首页/深链/health 均 200 | active，公网测试 |
| 员工 Basic Auth | loopback 员工站 `127.0.0.1:8080` 已启用 bcrypt Basic Auth；认证文件 `root:www-data 0640`，父目录 `root:root 0750` 并仅授予 www-data 穿越权限；管理员 `8081` 不启用 Basic | 一月临时测试；固定弱凭据必须在继续公网测试前更换为强随机密码（P1） |
| Backend 身份 release | `20260821-access-jwt-v4889` 已原子切换 `current`；contracts/backend dist、frozen install、根 build、普通 Node contracts import 均通过；受保护 env 身份键已配置 | Fastify active，回环 health 200 |
| Cloudflare Tunnel | 官方 APT `cloudflared 2026.8.2`，`cloudflared.service` root-owned、enabled/active，4 条 HA 连接，request errors=0；Dashboard 已下发 `milaidi.online→127.0.0.1:8080`、`milaidi.top→127.0.0.1:8081` ingress | 员工域名 curl 真链通过但浏览器登录受阻；管理员未登录 Access 302，待有效邮箱会话 |
| 压力测试 | 尚未开始 | 后置，不在本轮目标 |

公网 smoke 通过：员工 `18080`、管理员 `18081` 首页/深链/health 可达；员工项目创建 UI 已提交 1 次 `POST /api/projects` 并返回 201，随后只读列表确认项目 `85dcdd34…`；当前数据库只读核对共有 2 个匿名项目（另一个为 `1`，不自动删除），浏览器控制台无 `randomUUID` 错误；员工基础 API 200，未知 API 404 非 HTML，任务中心原始 403 已由本轮 trusted proxy 身份接线后经域名 Basic 复验为 200；管理员未登录域名由 Access 302 拦截，直接 origin 管理 API 仍 403，尚待有效邮箱会话。静态 `.map` 404 且 `nosniff` 存在。归档 `20260820-public-http-uuid-v4885` SHA-256=`BF951EA89BFEA696885C20DDF4A2FAC177D62784D43B4BCD49984ACE241174AF`；唯一第三方 `http://localhost` 字面量为 React Router 无 origin 时内部 URL 构造，已按规划精确豁免，localhost 任意端口/127.0.0.1:3001/DATABASE_URL/Secret 均 0 命中。3001/5432 仅回环，80/443 无监听。上传跨重启、压测、故障注入、真实 ASR/OCR、COS/Sentry 与生产级结论全部后置。

## 2. 当前协作角色

| 协作任务 | 当前职责 | 当前状态 |
| --- | --- | --- |
| 规划对话（当前对话） | 唯一调度、审核、状态汇总和下一门裁决 | 进行中 |
| 后端开发对话 | BACK-MATERIAL-FOLDER-01：create-upload 命令同身份 GET 恢复 | `artifact_written`，待规划/TEST隔离库复核 |
| 前端开发对话 | FRONT-MATERIAL-FOLDER-01：目录选择、分配预览、暂停继续 | writable successor `in_progress`；固定任务为只读 observer |
| UI 设计对话 | UI-MATERIAL-FOLDER-01：既有 M2 验收文档差量 | docs successor 已 `artifact_written`；固定任务为只读 observer |
| 全链测试 | TEST-MATERIAL-FOLDER-01：51集/102文件元数据、unknown、A/B隔离 | writable successor 等待 FRONT `artifact_written` |
| 测试服务器对话 | 保持当前两站与服务运行；产品验收后制作新 release 并公网 smoke | 等待本轮 TEST 关闭门，不提前部署 |

当前保持最小一月测试运行：PostgreSQL、Fastify、Nginx、domestic-relaxed timer 与 cloudflared active；Worker 未启动；公网仅规则允许 22/18080/18081，3001/5432/8080/8081 仅回环。Tunnel 两条 ingress 已生效；员工站已由站内14天安全 Cookie 会话替代活动 Basic 入口，HTTPS 登录/session/projects/tasks/logout 与后端重启保持已通过；管理员未登录仍由 Access 302 拦截。18080/18081 继续保留运维回退，员工对 system-control、管理员直接 origin 均 403。

## 2.1 真实功能矩阵（本轮只读核对）

| 功能 | 当前真实事实 | 可用边界 |
| --- | --- | --- |
| 员工站页面 | `frontend-v4896`；HTTPS站内登录/session/logout与14天安全Cookie链已部署 | 浏览器登录真链通过，当前不再依赖活动Basic入口 |
| 项目创建/列表/详情 | Fastify + PostgreSQL 真实链路；员工会话 principal 生效 | 可操作；本轮只保留匿名测试数据 |
| 上传/交付 | 生产进程已注入本地文件存储；当前102物理文件目录选择后无可见分配/进度 | `TEST-SRV-20260821-002` 修复中，未宣称已完成 |
| 任务中心 | 员工会话后 tasks API 真实200 | 可读；Worker仍未启动，不伪造完成 |
| 管理员站页面 | v4880 静态壳：首页、深链、health 均 200 | 可打开 |
| 管理 API | 直接 origin/loopback 无 JWT 返回 403；域名未登录由 Cloudflare Access 返回 302 | 有效邮箱会话后的 200 尚待用户本人完成可见登录 |
| Worker | `qimao-worker` inactive | 未启动，不伪装任务已处理 |
| ASR/OCR/术语 | 默认 registry 为 deterministic fake/zero-network adapter | 仅协议/失败边界可测，不是真实模型或厂商能力 |

## 2.2 身份接线首因

后端现在由 FIFO336 接入单一管理员 Cloudflare Access JWT resolver：`backend/src/modules/access/cloudflare-access.ts` 使用服务端配置的 issuer、control audience、JWKS 和管理员邮箱白名单；`backend/src/app.ts` 仅对 `/api/system-control/**` 做逐请求门禁，员工公开项目 API 不因该开关被拦截。员工任务/反馈身份由 loopback Nginx Basic Auth 后的 `X-Qimao-Employee-User` 受信头映射，后端只接受与环境用户名完全一致的 loopback 头，不接受 Cloudflare employee AUD、普通 Basic Auth 或浏览器伪造。

测试服务器受保护环境文件已配置 `QIMAO_ACCESS_REQUIRED`、`QIMAO_ACCESS_ISSUER`、control audience/邮箱白名单，以及 `QIMAO_EMPLOYEE_TRUSTED_PROXY_AUTH` 与测试用户名；文件保持 root:qimao 0640，备份同权限。JWKS 固定使用官方 `${issuer}/cdn-cgi/access/certs`，仓库只保留 `<...>` 占位示例，绝不写入 JWT、Secret、Basic 密码或 tunnel token。员工密码仍只由服务器 Nginx htpasswd 管理；管理员有效邮箱会话与 OTP 只允许用户本人在可见 Cloudflare 页面输入。

## 2.3 Cloudflare Tunnel 安装前置与最短安全顺序

服务器只读核对结果：官方 APT 已安装 `/usr/local/bin/cloudflared 2026.8.2`；`cloudflared.service` 为 root-owned、enabled/active，HA 连接数 4，本地 metrics `cloudflared_tunnel_request_errors=0`。Dashboard ingress 已生效：`milaidi.online → 127.0.0.1:8080`（员工 Basic 后 health 200）与 `milaidi.top → 127.0.0.1:8081`（未登录 Access 302）。当前不再改 Dashboard/Access/DNS/TLS 或 80/443，也不输出 tunnel token。

安装前置：两个域名已注册并由可控 DNS/Cloudflare zone 委派；规划提供官方 cloudflared 安装许可、Tunnel ingress 配置与 root-only 受保护 token 写入方式；Access 两个 Application 的 issuer/audience、JWKS、用户邮箱白名单和后端 JWT resolver 方案先明确；同时约定 HTTPS 回滚、停止时间和保留现有 18080/18081 的窗口。token 只能在用户秘密步骤或服务器受保护环境文件中输入，不能贴进聊天、仓库或日志。

最短顺序已执行至：配置身份环境与不可变 backend release → 原子切换 Fastify → Dashboard 两条 ingress → 员工域名 Basic/项目/任务/health HTTPS 真链。剩余唯一用户门是管理员在可见 Cloudflare Access 页面完成邮箱会话（若出现 OTP 由用户本人输入），然后只读复验管理员 `/api/system-control/overview=200`。验证完成前保留 18080/18081 运维回退；是否回收公网端口由规划另行裁决。

## 3. 你怎么反馈问题

你继续在“测试服务器”任务里直接说自然语言即可，不需要学习找 Bug，也不需要填写测试清单。最少只要提供：

1. 你在哪个页面；
2. 点了什么；
3. 看到什么不对；
4. 有截图就附截图，没有也可以。

例如：`管理员网站打开后一直转圈，我点了刷新还是一样，截图如下。`

服务器任务负责把信息整理进唯一问题台账；规划对话负责归因、分派和关闭。不要在聊天或截图中发送密码、私钥、数据库地址、Cookie、Authorization 或供应商密钥。

## 4. 问题状态摘要

- `TEST-SRV-20260820-001`：Windows 本机 `tsx` 初始化偶发 `ENOMEM`；不影响当前服务器部署，后续在服务器复测。
- `TEST-SRV-20260820-005`：机房屏蔽 UDP/123；用户已接受国内三源 HTTP 时间作为一天试用基线，仍不能外推为生产可信时间。
- `TEST-SRV-20260820-009`：旧发布包缺生产存储适配器；FIFO331/332 已完成产品修正，状态进入服务器复验，不再是“等待是否开发”。
- `TEST-SRV-20260820-010`：父目录 `root:root 0755` 属于共享状态父级，不能直接改权；正式部署根已收敛到专属 `storage` 子目录，等待 systemd 真机验证。
- `TEST-SRV-20260820-011`：systemd unit 原先引用不存在的 `/usr/bin/node`；已改用服务器实际 `/usr/local/bin/node` 并通过静态验证。
- `TEST-SRV-20260820-012`：Node 入口经 `current` 软链接时未保持主模块 URL，进程无监听即退出；unit 已加入 `--preserve-symlinks-main`，Fastify 已稳定监听。
- `TEST-SRV-20260820-013`：Nginx 默认站点被 wildcard 继续加载导致公网 80；已将本轮发现的默认 symlink 可逆移出 `sites-enabled`，公网 80/443 未监听。
- `TEST-SRV-20260820-014`：Nginx `www-data` 无法穿过旧 release 0750 父目录导致两站 404；已复制 v4880 两站产物到专属 `/srv/qimao-terms-cloud/*-v4880`，首页与深链恢复 200。
- `TEST-SRV-20260820-015`：雨云控制台自动新增规则曾返回“输入参数无效”；用户手动保存 `18080/tcp`、`18081/tcp` 后已关闭。
- `TEST-SRV-20260820-016`：曾误把失败计数文件大小 2 字节当作计数 2；日志与文件内容已纠正，条目关闭。
- `TEST-SRV-20260820-017`：domestic-relaxed Rev1 手动 1 轮 + timer 2 轮通过，条目关闭；后续轮次若偏差超 30 秒立即硬停，连续 6 轮失败也硬停。
- `TEST-SRV-20260820-018`：原始员工任务中心 403 已由 `TEST-SRV-20260820-023` 的 loopback trusted proxy 接线关闭；历史事实保留，当前域名 Basic 后任务 API 200。
- `TEST-SRV-20260820-019`：公网纯 HTTP 下 `crypto.randomUUID` 兼容缺陷已由员工 v4885 修复；一次 UI 创建返回 201 且列表唯一出现，状态 `confirmed → fixing → retest → closed`。
- `TEST-SRV-20260820-020`：真实员工/管理员身份与 Cloudflare Tunnel 尚未接线；页面可达但任务中心/管理员 API 诚实 403，保持 `confirmed`，等待产品 JWT resolver 与用户秘密步骤的 Tunnel 门。
- `TEST-SRV-20260820-021`：历史“Tunnel 无 ingress”已由 Dashboard 两条 hostname ingress 配置关闭；当前事实由 `TEST-SRV-20260820-023` 记录。
- `TEST-SRV-20260820-022`：历史 loopback Basic 已被员工站内 Cookie 会话替代；旧 htpasswd 只作受保护回滚资产，不是当前登录入口。
- `TEST-SRV-20260820-023`：管理员 Access 环境与 Tunnel ingress 保持；管理员未登录302、直接origin403，有效邮箱会话仍由用户本人完成。
- `TEST-SRV-20260820-024`：历史内置浏览器 Basic 弹框不兼容已由 v4896 站内登录路径绕开；当前员工HTTPS登录/session/logout真链通过。

## 5. 下一次自动交接

保持现有两站和 cloudflared 连接运行，不把在途素材代码部署到服务器。FRONT 形成 `artifact_written` 后由规划收件并启动 TEST；TEST 通过目录、51集/102文件、暂停继续、unknown与A/B隔离关闭门后，测试服务器任务才制作新不可变 release、SHA对账、部署并执行公网真实 smoke。管理员域名继续由 Access 保护；邮箱/OTP仍只由用户本人在可见页面完成。systemd自动启动、备份、日志轮转、持续容量与真实ASR/OCR继续后置；若时间timer触发硬门，立即停止业务栈并交规划。

服务器已续费一月；当前用户无需再次提供服务器密码。域名入口为 `https://milaidi.online`（员工站内登录）与 `https://milaidi.top`（管理员 Cloudflare Access）；IP `18080/18081` 仍为回退入口。HTTP 回退无 TLS；本轮验收仅使用匿名小夹具，不上传真实5.17GB视频/字幕、密码或个人信息。管理员未登录会被 Access 拦截，邮箱会话后的管理 API 仍待用户本人完成可见登录后复验。
