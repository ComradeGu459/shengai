# 部署

当前里程碑只完成部署选型，不会连接任何云账户、创建资源或写入凭据。

## M2 选定拓扑

- Railway 新加坡 Web 服务：运行 Fastify API，并提供 Vite 构建后的单页应用。
- Railway Cron 服务：使用同一代码和镜像，定时执行回收清理和孤儿核对，完成后退出。
- Neon 新加坡 PostgreSQL 18：保存全部业务元数据和任务状态。
- Cloudflare R2 Standard：浏览器通过短时分片 URL 直接上传大文件。
- Cloudflare Access：公司试用时以邮箱一次性验证码保护应用入口，后端校验 Access JWT。

具体技术和成本边界分别见：

- `docs/decisions/ADR-0002-m2-technology-selection-gate.md`
- `docs/costs/M2-cost-boundary.md`

后续部署材料统一放在本目录，并保持以下边界：

- Web 前端、HTTP 后端和 Worker 可以独立扩缩容；
- 业务代码仍属于同一模块化单体，共享同一领域模型与任务协议；
- PostgreSQL、对象存储、任务队列和密钥服务通过环境注入，不把凭据写入仓库；
- 本地、测试和生产环境的声明分离，生成的部署包不得提交。
- 中国大陆办公网络必须先完成 R2 实际上传测试；未通过时退回规划选品，不在实现中静默加入第二套生产存储。
