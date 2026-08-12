# ADR-0002：M2 业务编码前执行一次性技术选型门禁

状态：已接受并经用户确认；未授权购买、创建云资源或部署
日期：2026-08-12

## 背景

当前前端是无框架静态占位页，后端是无依赖 Node.js 健康检查。M2 将首次引入真实页面状态、数据库迁移、对象存储 SDK、短时授权、后台清理和集成测试。如果边写边更换框架或云服务，会导致状态契约、开发命令和部署方式反复变化。

## 决策

### 运行时与代码组织

- 保留仓库现有 Node.js `24.19.0`、pnpm `11.21.0` 和工作区结构，迁移到 TypeScript `5.9.x`；所有具体版本由锁文件固定，不使用 alpha、beta 或 RC 版本。
- 继续采用模块化单体。前端、HTTP API 和定时清理入口属于同一仓库和领域模型；M2 不拆微服务，不引入 Redis 或外部消息队列。
- 新增一个前后端共同使用的契约包，只存放 TypeBox/JSON Schema、稳定错误码和传输类型，不放业务逻辑。

### 前端

- React `19.2.x` 的当前安全修补版本、Vite `8.x`、React Router `8.x` 声明式模式和 TanStack Query `5.x`。
- 页面是桌面优先的单页应用，不使用 SSR、React Server Components 或全栈 React 框架。
- TanStack Query 只管理服务端状态；上传暂停、选中文件和本地恢复提示使用组件状态与 IndexedDB，不能成为业务完成状态。
- CSS 自定义属性与 CSS Modules 实现 `DESIGN.md`，不引入会另建一套视觉规则的大型 UI 组件库。
- 前端模块测试使用 Vitest 与 Testing Library；项目创建、断点续传和回收恢复使用 Playwright 做最小真实浏览器流程。

### 后端与数据库

- Fastify `5.11.x`、TypeBox JSON Schema、`pg` 连接池和 `node-pg-migrate` 的最新稳定非预发布版本。
- PostgreSQL `18` 是项目、素材、上传会话、任务和审计状态的唯一权威来源。开发和生产使用同一套迁移，不使用 SQLite 或另一套 ORM 模型作为业务替身。
- HTTP API 由 Fastify 路由 Schema 同时完成输入校验、响应序列化和 OpenAPI 基础描述；错误结构服从 M2 契约。
- M2 清理由同仓库的有界命令入口执行，使用 PostgreSQL 租约和幂等状态；不在 Web 进程内依赖内存定时器。

### 对象存储与上传

- M2 测试与首轮公司试用选择 Cloudflare R2 Standard，使用 Asia-Pacific location hint；不使用有 30 天最低计费期的 Infrequent Access。
- 后端使用 AWS SDK for JavaScript v3 的 S3 客户端创建分片上传并签发短时分片 URL，浏览器直接上传，文件字节不经过 Fastify 或 Railway。
- 默认分片 `64 MiB`、单文件并行分片 `3`、单浏览器全局并行分片 `12`；全部集中配置，可根据办公上行实测调整。
- R2 对 30 GB 单对象有充足余量：多部分对象上限约 5 TiB、最多 10,000 个分片；未完成分片使用生命周期规则清理。
- 单元与契约测试使用内存中的 Storage fake；接入 R2 账户后再运行可选的真实存储集成测试。只有这两个真实调用点，不实现多云供应商集合。

### 部署与访问保护

- M2 测试部署选择 Railway 新加坡：一个服务运行 Fastify 并提供已构建 SPA，一个按计划启动并立即退出的 Cron 服务执行清理与孤儿核对。
- PostgreSQL 选择 Neon 新加坡。开发期可使用 Free，首轮公司试用使用 Launch 并设置计算上限与闲置缩容。
- 公司试用入口使用 Cloudflare Access 免费计划和公司邮箱一次性验证码保护；不建设应用内账号管理，但 Fastify 必须校验 Access JWT，防止绕过受保护域名直接访问源站。
- 环境变量与密钥只配置在托管平台；仓库只记录变量名称和验证规则，不保存实际值。
- 私人 GitHub、CI、远程推送和云资源创建仍需用户分别授权，本 ADR 不构成购买或发布授权。

## 中国大陆办公网络门槛

R2 的低价格不能替代真实网络验证。购买长期资源或对公司开放前，必须在至少两个代表性办公网络执行：

1. 1 GB 快速测试和 10 GB 分片上传各三次。
2. 验证暂停、刷新恢复、授权过期和单分片重试。
3. 记录持续吞吐、失败率、重试量和完成时间。

日上传 100 GB、300 GB、600 GB 若需在 8 小时内完成，理论最低持续总上行约为 28、83、167 Mbps；按 25% 协议和波动余量规划为 35、105、210 Mbps。若实测无法稳定满足实际档位，任务回到规划对话重新选择阿里云 OSS 等区域方案；不得在 M2 同时维护 R2 和 OSS 两套生产实现。

## 决策约束

- 保持模块化单体，不拆微服务。
- 优先选择成熟、长期维护、文档清楚且能支持 TypeScript 的单一路径。
- 不同时实现多个数据库、多个对象存储或多个前端方案进行长期比较。
- 对象存储必须支持服务端分片上传、短时授权、校验和未完成分片生命周期清理。
- 技术选型必须能在本地用匿名合成数据验证，不依赖真实客户素材。
- 新增生产依赖前说明其当前职责，禁止为了未来可能使用而提前引入。

## 成本边界

详细估算见 `docs/costs/M2-cost-boundary.md`。M2 纯开发测试目标为每月 `5–10 USD`；不含 ASR/OCR 的公司平衡档目标为每月 `44–69 USD`。超过 `100 USD/月` 时必须由规划对话核对真实用量后再提高限额。

## 未选择的方案

- Supabase 一体化：账号能力有吸引力，但 M2 暂不做账号，文件存储和出口成本也高于短留存场景，暂不选择。
- 单台 VPS 自建 PostgreSQL 与 MinIO：月租可预测，但备份、磁盘扩容、证书、故障恢复和大文件出口全部转为自运维，不适合首轮公司试用。
- Cloudflare Workers + D1：成本低，但偏离 PostgreSQL 权威状态，并增加未来长任务和 Node Worker 的运行差异，不选择。
- 阿里云 OSS：大文件、断点续传和中国区域能力满足要求，作为 R2 网络实测不通过时的重新选品候选；本轮不并行实现。

## 官方依据

- [Node.js 24 LTS](https://nodejs.org/en/about/previous-releases)
- [React 当前版本](https://react.dev/versions)、[Vite 8](https://vite.dev/blog/announcing-vite8)、[Fastify TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [PostgreSQL 版本支持](https://www.postgresql.org/support/versioning/)、[Neon 定价](https://neon.com/pricing)
- [R2 定价](https://developers.cloudflare.com/r2/pricing/)、[R2 大文件上传](https://developers.cloudflare.com/r2/objects/upload-objects/)、[R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)
- [Railway 定价](https://docs.railway.com/pricing)、[新加坡区域](https://docs.railway.com/deployments/regions)、[Cron Jobs](https://docs.railway.com/cron-jobs)
- [Cloudflare Access 免费计划](https://www.cloudflare.com/plans/zero-trust-services/)、[邮箱一次性验证码](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/)
