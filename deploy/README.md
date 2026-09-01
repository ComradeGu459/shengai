# 部署

本目录保存声明式部署资产，不会因文件落盘自动连接云账户、创建资源、读取凭据或执行发布。

## 测试服务器应用发布唯一入口

测试服务器后续常规 `backend + employee static` 发布、同步管理员站的
`backend + employee static + system static` 发布，以及保持员工站指针不变的
`backend + system static` 发布，都只使用一个公开 root 入口：

```text
/usr/local/sbin/qimao-application-release /var/tmp/qimao-application-release-inbound
```

- 固定 runner 源码：`debian/bin/qimao-application-release`；声明校验器：`debian/bin/application-release-declaration.mjs`。
- `qimao.application-release/v1` 保持原有 backend + 员工站合同；只有声明为 `v2` 时才支持 `system-static/`、管理员站 marker 和旧管理员站回滚目标。
- v1 和既有 v2 声明未提供 `release.employeeStatic` 时严格保持原有 `replace` 语义；v2 也可显式声明 `{ "mode": "replace" }`，归档继续必须包含 `static/` 并切换员工站。
- v2 如声明 `release.employeeStatic={"mode":"preserve","expectedTarget":"/srv/qimao-terms-cloud/frontend-..."}`，release 中不得再出现 `previousStaticTarget`，candidate 不得出现 `staticMarkers`，归档也不得含 `static/`。固定入口在 baseline、stage、switch、rollback、post-switch 和 final cleanup 都逐次确认员工 symlink 仍解析到 `expectedTarget`，并保证 employee stage/`.next` 从未创建。
- preserve 只影响员工静态站；backend、`system-static/`、migration、健康门与失败回滚仍使用同一固定入口和既有路径，禁止用手工链接或一次性 runner 替代。
- 每个发布批次只替换 `application-release.declaration.json`、由 release id 派生名称的 archive、`SHA256SUMS`，以及 `migration.mode=gated` 时唯一可选的 `db-migration-gate.mjs`。
- `asr-srt-compare-1642/runner.sh`、`screen-text-partial-release-1714/runner.sh` 等按任务生成的 runner 只保留为历史证据，不得作为新发布入口或复制成新版本。
- 固定入口的安装、传输和执行都是单独的外部动作；本地文件存在不代表已经安装或发布。

完整声明合同、安全门、回滚与安装前门见 `docs/deployment/RELEASE-AUTOMATION-SERVER-1717-RESULT.md`。

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
