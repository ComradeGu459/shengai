# UPLOAD-COS-SERVER-05｜immutable release candidate

本文是 `deploy/` Owner 的本地发布契约。它描述可审计候选包，不代表已连接、部署或重启 TEST 服务器。

## 固定边界

- 对象存储：private Tencent COS，provider `tencent-cos`，region `ap-nanjing`，virtual-hosted addressing；候选使用 `browser_direct` multipart，presign TTL 固定 `600` 秒。
- COS bucket、AccessKey、Secret、员工/Access 身份和数据库连接只从服务器 root-only 环境注入；仓库与归档只保留键名或占位符。
- 新会话只走现有 multipart 合同（part size `16 MiB`）；不启用 TUS，不启用同源 relay，不公开 bucket，不携带真实素材。
- 归档不包含旧的 `qimao-upload-direct*.conf`、`qimao-upload-relay-direct*.conf` 或任何历史 release 副本。

## 候选包内容

候选必须由当前工作树一次构建得到，并只包含以下边界：

1. `backend/dist` 运行时 JavaScript、`backend/package.json`、全部迁移（含 `1754976025000_create_upload_completion_jobs.cjs`）。
2. `packages/contracts/dist` 与 package manifest、根 `package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`。
3. 当前 `frontend/dist` 与已存在的 `system-frontend/dist` 静态产物。
4. `deploy/debian/systemd/qimao-backend.service`、`qimao-upload-completion-worker.service`、COS 键名示例、Nginx 两站/后端/headers 模板、`healthcheck.sh`、日志轮转配置。
5. 本文件与 `manifest.json`。不得复制 node_modules、日志、`.env`、私钥、source map、历史归档或无关工作树目录。

依赖由部署端按归档内 lockfile 执行 frozen install；归档不夹带另一套依赖树。

## 配置门（只列键名与非 Secret 约束）

`backend.env` 与 root-only `object-storage.env` 合并后，必须存在：

`NODE_ENV`、`PORT`、`DATABASE_URL`、`QIMAO_UPLOAD_STORAGE_KIND`、`QIMAO_S3_PROVIDER`、`QIMAO_S3_REGION`、`QIMAO_S3_BUCKET`、`QIMAO_S3_ACCESS_KEY_ID`、`QIMAO_S3_SECRET_ACCESS_KEY`、`QIMAO_S3_PRESIGN_TTL_SECONDS`、`QIMAO_S3_UPLOAD_MODE`、`QIMAO_DIRECT_UPLOAD_ORIGIN`。

候选约束为：`QIMAO_UPLOAD_STORAGE_KIND=s3`、`QIMAO_S3_PROVIDER=tencent-cos`、`QIMAO_S3_REGION=ap-nanjing`、bucket 为既定 private bucket、`QIMAO_S3_PRESIGN_TTL_SECONDS=600`、`QIMAO_S3_UPLOAD_MODE=browser_direct`。COS endpoint 由 provider 固定为 `https://cos.ap-nanjing.myqcloud.com`，寻址固定为 `virtual-hosted`；不在归档写入 Secret 值。

## 不可变发布顺序

1. **Preflight**：校验归档 SHA-256、manifest 内每个关键文件 hash、目标 release 目录为空且 owner/mode 正确；只读确认旧 release、static root、systemd/Nginx 当前指针。
2. **迁移**：在目标数据库上仅执行向前迁移，确认 `upload_completion_jobs` 与 `1754976025000` 已存在；不执行 down、truncate 或跨项目迁移。
3. **Backend**：以新 release 原子更新 `current`，安装 unit/env 后启动 `qimao-backend.service`；先过本机 `/health`、数据库 `SELECT 1`、API JSON/鉴权和配置 fail-closed 门。
4. **Worker**：只启用 `qimao-upload-completion-worker.service`，确认 standalone entry 可读、进程 owner 为 `qimao`、无重启环；不启用通用 worker 模板替代它。
5. **Frontend**：最后分别原子切换 `/srv/qimao-terms-cloud/frontend` 与 `/srv/qimao-terms-cloud/system-frontend`，确认 `index.html`、指纹静态资源和 source-map 404 门。

## 验收门

- `/health` 200 且 `status=ok`；Nginx `-t` 通过，3001/5432 仅 loopback；两个页面和 `/api` 返回真实 JSON/静态状态，不把 API 错误 fallback 成 HTML。
- 新 multipart 页面链：create → authorize；浏览器对每个预签名 COS URL 发真实 `OPTIONS`（若浏览器预检）和 `PUT`，两片均取得可读 `ETag`；completion/Head 后按同一 `uploadId + part/objectKey` 精确 Delete，或同一 UploadId 精确 Abort，残留为 0。
- CORS 只允许配置的页面 origin、`PUT/OPTIONS`、必要请求头并 expose `ETag`；不得出现 relay fallback、TUS 新会话或公开 bucket。
- COS 配置下 `server.ts` 不提供 `tusDirectory`，因此旧 TUS 路由不注册；`browser_direct` 下同源 relay 写入口不开放。归档 Nginx 资产不包含旧 TUS/relay location。

## 回滚与清理

若任一门失败：停止并禁用 upload-completion worker，恢复 backend 与两个 static root 到 preflight 记录的同一 release/环境身份，`nginx -t` 后再 reload；不回滚已成功的数据库向前迁移，除非另有明确批准。仅按该次候选产生的同一 `uploadId`、part 和 objectKey 做 Delete/Abort；unknown 只查同一身份，禁止列表扫描、盲重发、TUS/relay fallback。最后确认进程、临时 release、日志和 COS multipart 残留为 0。

本候选完成后，唯一仍需授权的线上动作是：在 TEST 服务器按本顺序部署并运行一次受保护的真实浏览器 COS multipart 验收；本轮本地打包不执行该动作。
