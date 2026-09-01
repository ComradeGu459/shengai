# Debian 12 后端测试服务器运行资产

状态：准备资产，未执行远程部署。

这份文档只描述一个纯 Debian 12、单机反向代理 + 本机 PostgreSQL + Fastify 后端的可审计运行边界。它不改变仓库现有 Railway/Neon/R2 选型，也不代表任何服务器、域名、证书、对象存储、Secret 或供应商已经获批或已创建。

## 1. 本轮边界与当前阻断

- 本轮只在既有存储接口、后端启动/上传接线、对应专项测试与 `deploy/debian/**` 运行资产内收口；没有修改迁移、`package.json`、前端、管理员前端或业务状态机。
- 后端入口来自既有 `backend/package.json`：编译后的 `backend/dist/server.js`。`backend/src/server.ts` 固定监听 `127.0.0.1`，端口读取 `PORT`（默认 `3001`）。Linux 不得调用 Windows-only 的 `tools/local-postgres.mjs`。
- 迁移入口复用既有 `pnpm --filter @qimao-terms-cloud/backend run db:migrate`，它运行编译后的 `dist/database/migrate.js` 和 `node-pg-migrate`；不新增 Linux 专用迁移器或第二数据库。
- `startServer()` 在 `NODE_ENV=production` 下从 `QIMAO_STORAGE_ROOT` 装配正式本地 `UploadStorage`/`DeliveryStorage`；`createApp()` 仍保留未注入时的 fail-closed 门。真实 Secret、供应商网络和付费 API 均不在本轮授权内，因此本资产包不能被描述为完整生产就绪。禁止以 `development`/`staging` 绕过存储门禁。
- `backend/src/development.ts` 会把 API 与多个 Worker 绑在一个开发进程，并使用内存交付存储；它不是生产入口。本轮 systemd 只提供独立 API 和“已审核为 standalone 的 Worker entry”模板。
- 服务器、容量监控、压测、峰值、长稳、故障注入、报告和停止控制属于管理员 `system-frontend`/ControlShell 的后续范围。员工 `frontend`/AppShell 不得新增入口、按钮、状态、脚本或测试文案；本文不定义员工页面，也不向员工暴露压测控制。若未来有页面，只能复用管理员 `/servers`、`/logs` 或规划批准的管理员测试容量入口。

## 2. 目标目录与账户

建议在测试机上建立以下目录；这里只给布局，不在本机创建：

```text
/opt/qimao-terms-cloud/current/           # 当前已审核 release，原子切换的目录
/opt/qimao-terms-cloud/releases/<id>/     # 保留的构建 release
/etc/qimao-terms-cloud/backend.env        # root:qimao 0640，不能进 Git
/var/lib/qimao-terms-cloud/              # root:root 0755 父目录；可保留其他隔离审计状态
/var/lib/qimao-terms-cloud/storage/      # systemd StateDirectory；QIMAO_STORAGE_ROOT，qimao:qimao 0750
/var/lib/qimao-terms-cloud/storage/uploads/    # multipart 临时分片与已完成上传对象
/var/lib/qimao-terms-cloud/storage/deliveries/ # 交付对象
/var/log/qimao-terms-cloud/              # qimao: qimao 0640，供 logrotate
/var/backups/qimao-terms-cloud/           # root 或备份账户 0750
```

创建最小运行账户（命令仅供用户在获批服务器上执行）：

```sh
sudo adduser --system --group --home /opt/qimao-terms-cloud qimao
sudo install -d -o qimao -g qimao -m 0750 /opt/qimao-terms-cloud/releases
sudo install -d -o qimao -g qimao -m 0750 /var/log/qimao-terms-cloud
sudo install -d -o root -g qimao -m 0750 /etc/qimao-terms-cloud
sudo install -d -o root -g root -m 0750 /var/backups/qimao-terms-cloud
```

`qimao` 不应拥有 `/etc`、PostgreSQL 管理角色、Nginx 配置或备份删除权限。

## 3. Debian / PostgreSQL 准备

不要用宝塔、LNMP、Docker 或仓库里的 Windows 本地 PostgreSQL 工具。Debian 12 上可由用户在授权窗口执行：

```sh
sudo apt-get update
sudo apt-get install --yes postgresql postgresql-client nginx logrotate curl openssl apache2-utils
```

数据库只监听回环地址，且不开放公网连接。编辑 PostgreSQL 主配置（实际路径以 `SHOW config_file;` 为准）：

```conf
listen_addresses = '127.0.0.1'
port = 5432
```

`pg_hba.conf` 至少保留本机 peer 管理和本机 SCRAM 应用连接；不要加入 `0.0.0.0/0`、公网网段或明文密码规则：

```conf
local   all   postgres                         peer
local   all   qimao_backend                    scram-sha-256
host    qimao_terms_cloud qimao_backend 127.0.0.1/32 scram-sha-256
```

重载后用 `ss -ltnp` 验证仅出现 `127.0.0.1:5432`（若启用 IPv6，必须另行确认没有公网监听）。创建角色和数据库时不要把密码写进 shell 历史：

```sh
sudo -u postgres psql -v ON_ERROR_STOP=1 \
  -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qimao_backend') THEN CREATE ROLE qimao_backend LOGIN; END IF; END \$\$;"
sudo -u postgres psql -c "\password qimao_backend"
sudo -u postgres createdb --owner=qimao_backend --if-not-exists qimao_terms_cloud
```

密码只写入服务器受保护的 `backend.env` 或 `~qimao/.pgpass`（权限 `0600`），不回显到日志、命令输出、Nginx、systemd unit 或仓库。

## 4. 环境文件与构建产物

从 [`backend.env.example`](../../deploy/debian/env/backend.env.example) 复制后，由 root 填入真实值：

```sh
sudo install -o root -g qimao -m 0640 deploy/debian/env/backend.env.example /etc/qimao-terms-cloud/backend.env
sudoedit /etc/qimao-terms-cloud/backend.env
```

示例中的 `CHANGE_ME`、`.example.invalid`、TEST-NET IP 都必须在真正启用前替换；它们不是可用凭据。至少需要用户另行提供：

- 经批准的 Debian 主机、域名、TLS 证书/ACME 方案和管理员测试出口 IPv4；
- PostgreSQL 版本、数据库角色密码注入方式和备份保留策略；
- 经批准的 Upload/Delivery Storage、Secret resolver、ASR/OCR provider 及其网络出口；本轮不收集这些值；
- 明确允许哪些 standalone Worker、对应租约/停止策略和管理员 ControlShell 入口。

在受控构建机执行现有脚本，不在服务器用 `tsx`/watch 模式：

```sh
pnpm install --frozen-lockfile
pnpm run build
```

根构建会先执行唯一的 `@qimao-terms-cloud/contracts` 真正编译，再按 workspace 依赖顺序生成 `packages/contracts/dist`、`backend/dist` 和两站静态产物；发布包必须从该构建结果整体取用，不得只复制 `backend/dist`。

保留 workspace 的 `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`backend/package.json`、`packages/contracts/package.json` 以及 `backend/dist`、`packages/contracts/dist` 和经过审核的生产依赖。将一个完整 release 复制到 `/opt/qimao-terms-cloud/releases/<id>/` 后，以原子方式更新：

```sh
sudo ln -sfn /opt/qimao-terms-cloud/releases/<id> /opt/qimao-terms-cloud/current.next
sudo mv -Tf /opt/qimao-terms-cloud/current.next /opt/qimao-terms-cloud/current
```

上面的切换命令仅是部署窗口内的操作说明，本轮没有执行。不得复制 `node_modules/.cache`、`.local`、数据库、日志、`.env` 或任何凭据。

## 5. 迁移与启动顺序

迁移前先确认 `DATABASE_URL` 来自 `/etc/qimao-terms-cloud/backend.env`，并在备份策略就绪后执行既有入口：

```sh
set -a
. /etc/qimao-terms-cloud/backend.env
set +a
pnpm --filter @qimao-terms-cloud/backend run db:migrate
```

该命令会先按仓库现有脚本编译后端，再由 `dist/database/migrate.js` 运行全部迁移。Linux 不调用 `pnpm db:setup`、`pnpm db:start` 或 `tools/local-postgres.mjs`；这些是项目 Windows 本地实例入口。迁移后应从 `schema_migrations` 核对序列和业务表初始行数，确认没有任何未授权 bootstrap/default/active 业务数据。

安装 systemd 模板并做静态检查：

```sh
sudo install -o root -g root -m 0644 deploy/debian/systemd/qimao-backend.service /etc/systemd/system/qimao-backend.service
sudo install -o root -g root -m 0644 deploy/debian/systemd/qimao-worker@.service /etc/systemd/system/qimao-worker@.service
sudo systemctl daemon-reload
sudo systemd-analyze verify /etc/systemd/system/qimao-backend.service /etc/systemd/system/qimao-worker@.service
```

后端服务固定使用 `NODE_ENV=production`、`127.0.0.1:3001`、受保护环境文件和 systemd `StateDirectory=qimao-terms-cloud/storage`。对象存储只拥有专属 `storage` 子目录；不得递归改变父目录或同级历史审计目录。`QIMAO_STORAGE_ROOT` 缺失、相对路径、符号链接、不可写或非目录时，服务在 listen 前失败；不要改成 `pnpm dev` 或 `NODE_ENV=staging` 来绕过。

本轮正式本地存储只证明单机 loopback 试用：上传分片、授权摘要、对象元数据和交付 bytes 均落在 StateDirectory，写入采用临时文件、fsync、原子 rename，恢复依靠磁盘事实而不是进程内存。它不代表跨主机、高可用、备份或灾备对象存储。

## 5.1 Cloudflare Access 身份边界

管理员后端只接受 Cloudflare Access 代理注入的 `Cf-Access-Jwt-Assertion`，由单一服务端 resolver 使用 Node 内置 `crypto` 的 RS256/JWKS（仓库没有额外 JWT 依赖，等价避免引入第二验证栈）校验 issuer、control audience、`exp`/`nbf`、非空 subject/email 和服务端邮箱白名单；不会信任邮箱 header、Host、Basic Auth 或前端状态。只有 `/api/system-control/**` 受 `QIMAO_ACCESS_REQUIRED=true` 保护，`/health` 与员工公开 API 不因该开关被拦截；管理员配置不完整时在 listen 前失败。

员工站使用同源登录 API 与服务器签名 Cookie。密码只以版本化 scrypt verifier 保存，明文不进入环境文件、源码、响应或日志；会话 Secret 至少 32 字节。登录成功签发 `__Host-` Cookie，固定 14 天，带 `HttpOnly`、`Secure`、`SameSite=Lax` 与 `Path=/`。所有员工写请求（包括登录）必须命中服务端配置的精确 HTTPS Origin；Cookie 篡改、超长、过期或配置缺失均 fail-closed。员工 principal 只有 `tasks:read`、`feedback:create`、`projectAccess=all`，不能获得 system-control 能力。

环境文件只放占位配置：管理员 `QIMAO_ACCESS_ISSUER`、`QIMAO_ACCESS_CONTROL_AUDIENCE`、`QIMAO_ACCESS_CONTROL_EMAIL_ALLOWLIST`，以及员工 `QIMAO_EMPLOYEE_SESSION_REQUIRED`、`QIMAO_EMPLOYEE_AUTH_USERNAME`、`QIMAO_EMPLOYEE_PASSWORD_VERIFIER`、`QIMAO_EMPLOYEE_SESSION_SECRET`、`QIMAO_EMPLOYEE_ORIGIN`。JWKS 固定取官方 `${issuer}/cdn-cgi/access/certs`；JWKS 仅做有界成功缓存，获取失败不使用过期缓存猜测。日志、错误和响应不得记录管理员 JWT、员工 Cookie、密码、verifier、会话 Secret 或白名单。Access readiness 只读显示管理员 control 配置状态，不把 `/health` 表述为已完成任何登录。

Worker 模板的 `%i` 只接受已通过 standalone 审核的编译入口，例如：

```sh
sudo systemctl enable --now 'qimao-worker@pre-review.worker.entry.js.service'
```

当前入口事实：

| 编译入口 | 本轮结论 |
| --- | --- |
| `pre-review.worker.entry.js` | 有 standalone 入口，可在拥有正式依赖和停止策略后单独评审 |
| `asr.worker.entry.js` | 生产环境明确拒绝未获授权的真实 ASR 适配器；未获 provider/Secret/网络授权前不得启动 |
| `screen-text.worker.entry.js` | 生产环境明确拒绝未登记的真实画面字适配器；未获授权前不得启动 |
| `system-control.strategy.worker.entry.js` | 生产环境明确拒绝未配置策略学习 Worker；未获后续授权前不得启动 |
| `delivery.worker.entry.js` | standalone 入口明确抛错，必须由注入共享 Storage 的 development/后续正式入口拥有；不得用模板启动 |

## 6. Nginx、两站静态托管、测试门与网络面

[`qimao-backend.conf`](../../deploy/debian/nginx/qimao-backend.conf) 保留独立 API host 模板；[`qimao-sites.conf`](../../deploy/debian/nginx/qimao-sites.conf) 托管两站静态产物：`work.example.invalid` 的 root 是 `/srv/qimao-terms-cloud/frontend`，`admin.example.invalid` 的 root 是 `/srv/qimao-terms-cloud/system-frontend`。这与 `FRONTEND-STATIC-DELIVERY.md` 的版本化静态根/软链接布局一致：发布时让这两个 root 指向对应 release 的 `frontend/dist`、`system-frontend/dist`，不要合并两个 `index.html`。

两站的 `/api`、`/api/*`、`/health` location 均先反代 `127.0.0.1:3001`，`proxy_intercept_errors off`，不把 Fastify 4xx/5xx fallback 成 HTML；只有非 API 路径才回退各自 `index.html`。静态 MIME、带指纹资源长缓存、`index.html` 不缓存、`*.map` 默认 404 已写入模板。共享头部片段 `qimao-proxy-headers.conf` 只含 request-id/转发头，不含凭据。

启用前必须替换域名、证书路径和 `198.51.100.10/32` TEST-NET 占位值，并创建仅用于测试的 Basic Auth 文件。管理员 HTTP 与 HTTPS 整站均同时受固定 IP + Basic Auth 临时门保护；员工站不增加管理员、容量或压测入口：

```sh
sudo htpasswd -c /etc/nginx/.htpasswd-qimao-test test-admin
sudo chown root:www-data /etc/nginx/.htpasswd-qimao-test
sudo chmod 0640 /etc/nginx/.htpasswd-qimao-test
sudo install -o root -g root -m 0644 deploy/debian/nginx/qimao-backend.conf /etc/nginx/sites-available/qimao-backend.conf
sudo install -o root -g root -m 0644 deploy/debian/nginx/qimao-sites.conf /etc/nginx/sites-available/qimao-sites.conf
sudo install -o root -g root -m 0644 deploy/debian/nginx/qimao-proxy-headers.conf /etc/nginx/snippets/qimao-proxy-headers.conf
sudo ln -sfn /etc/nginx/sites-available/qimao-backend.conf /etc/nginx/sites-enabled/qimao-backend.conf
sudo ln -sfn /etc/nginx/sites-available/qimao-sites.conf /etc/nginx/sites-enabled/qimao-sites.conf
sudo nginx -t
sudo systemctl reload nginx
```

这是明确的反向代理认证/IP 限制占位，不是正式 Cloudflare Access/JWT，也不应在 UI 或错误文案中冒充正式身份系统。管理员 `system-frontend`/ControlShell 后续若需要服务器、容量、压测、峰值、长稳、故障注入、报告或停止控制，只能复用 `/servers`、`/logs` 或规划批准的管理员入口；员工 AppShell 不增加任何入口、按钮、状态、脚本或测试文案。

主机防火墙/云防火墙最终只允许：

```text
22/tcp   SSH（仅受控来源）
80/tcp   Nginx（用于 HTTPS 重定向）
443/tcp  Nginx HTTPS
```

不开放 3001、5432、任何 Worker 管理端口或调试端口。上线前用 `ss -ltnp` 和防火墙规则导出双重核对；后端和 PostgreSQL 必须只显示回环监听。

## 7. 日志与健康检查

systemd unit 将后端和 Worker 的 stdout/stderr 写到 `/var/log/qimao-terms-cloud/`；[`logrotate/qimao-terms-cloud`](../../deploy/debian/logrotate/qimao-terms-cloud) 每日轮转14份，使用 `copytruncate`，不要求重启业务。日志中不得出现 `DATABASE_URL`、密码、Secret、内部引用、objectKey、完整 URL query、请求正文或供应商原始载荷。

健康检查脚本 [`healthcheck.sh`](../../deploy/debian/bin/healthcheck.sh) 只请求本机 `/health`，要求 HTTP 200 且 JSON `status=ok`；它不会创建任务、写数据库或调用外部服务：

```sh
sudo install -o root -g root -m 0750 deploy/debian/bin/healthcheck.sh /usr/local/sbin/qimao-backend-healthcheck
sudo -u qimao QIMAO_HEALTH_URL=http://127.0.0.1:3001/health \
  /usr/local/sbin/qimao-backend-healthcheck
```

`/health` 会执行 `SELECT 1`，因此 PostgreSQL 停止时应诚实失败，不得用静态健康值或缓存掩盖。

## 8. 备份、恢复与停机边界

[`backup-postgres.sh`](../../deploy/debian/bin/backup-postgres.sh) 使用 `pg_dump --format=custom` 和 `sha256sum` 写入受保护目录；它只消费外部注入的 `DATABASE_URL`，不把凭据写入文件。建议在管理员 ControlShell/运维编排中定时执行，并把备份复制到另一个受批准的安全位置；本轮不建立 Cron、云备份或容量监控。

脚本安装时固定权限，避免 release 目录权限漂移：

```sh
sudo install -o root -g root -m 0750 deploy/debian/bin/backup-postgres.sh /usr/local/sbin/qimao-backup-postgres
sudo install -o root -g root -m 0750 deploy/debian/bin/restore-postgres.sh /usr/local/sbin/qimao-restore-postgres
```

恢复是有意的破坏性动作，仅允许显式 `--confirm`：

```sh
sudo systemctl stop qimao-backend.service
sudo -u qimao env DATABASE_URL='由受保护环境注入' \
  /opt/qimao-terms-cloud/current/deploy/debian/bin/restore-postgres.sh \
  /var/backups/qimao-terms-cloud/qimao_terms_cloud-<UTC>.dump --confirm
pnpm --filter @qimao-terms-cloud/backend run db:migrate
sudo systemctl start qimao-backend.service
```

实际恢复前必须核对 dump 的 SHA-256、目标数据库、业务停机窗口和回滚方案；本文没有执行这些命令。

## 9. 精确卸载清单（仅说明，不执行）

按以下顺序只删除本部署创建的精确对象，先归档日志和备份，保留用户明确要求保留的证据：

1. `systemctl disable --now qimao-worker@<已启用入口>.service`，再 `systemctl disable --now qimao-backend.service`。
2. 删除 `/etc/systemd/system/qimao-worker@.service`、`qimao-backend.service`，执行 `systemctl daemon-reload`。
3. 删除 `/etc/nginx/sites-enabled/qimao-backend.conf` 和对应 `sites-available` 文件；`nginx -t` 通过后 reload。
4. 删除 `/etc/nginx/.htpasswd-qimao-test`、`/etc/logrotate.d/qimao-terms-cloud`，停止后再移除 `/var/log/qimao-terms-cloud/*`。
5. 在确认备份完成且无其他项目共享后，删除精确 release 目录 `/opt/qimao-terms-cloud/releases/<id>`、`current` 软链接、`/etc/qimao-terms-cloud/backend.env` 和 `/var/backups/qimao-terms-cloud`。
6. 最后由 PostgreSQL 管理员明确确认后执行 `dropdb qimao_terms_cloud` 和 `DROP ROLE qimao_backend`；不得 `DROP CLUSTER`、`TRUNCATE` 全库或触碰其他项目。
7. 用 `ss -ltnp`、`systemctl list-units`、`find` 精确核对 3001/5432、systemd、Nginx、日志和 release 不再残留。

## 10. 本轮验证与停止条件

本轮只做本地静态验证，不启动服务、不连接远程、不创建数据库、不购买、不接真实 Secret/provider：

```powershell
node --check tools/local-postgres.mjs
sh -n deploy/debian/bin/healthcheck.sh
sh -n deploy/debian/bin/backup-postgres.sh
sh -n deploy/debian/bin/restore-postgres.sh
pnpm run check:repo
git diff --check
```

在 Debian 12 真机启用前，必须由用户/规划另行完成：

- `systemd-analyze verify`、`nginx -t`（证书、域名、Basic Auth 文件和测试 IP 已替换后）；
- 迁移从目标空库执行并核对业务初始行数；`/health` 200 与数据库断开时的诚实失败；
- `ss -ltnp`/防火墙只开放22/80/443；备份 SHA-256 和受控恢复演练；
- 管理员 ControlShell 的权限、容量/日志/停止入口设计与真实 provider/Storage/Secret 的授权门。

上述条件未满足前，结论是“部署资产已准备、服务器未部署、真实服务 NO-GO”，而不是“测试服务器已上线”。
