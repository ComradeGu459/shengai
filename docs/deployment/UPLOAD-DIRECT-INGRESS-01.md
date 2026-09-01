# UPLOAD-DIRECT-INGRESS-01：直连 Tus 数据面

状态：`server-side verified / public blocked_on_provider_sni / rolled back to v4945-r1`。2026-08-22 已完成证书、Nginx 443、v4946-r1 backend/员工静态切换和服务器内最小边界验证；公网域名不可用后已恢复原线上路径。

## 2026-08-22 部署结果

- Cloudflare DNS-only A 已解析到 `103.36.63.67`；DNS-01 TXT 验证通过。
- 证书已签发至 `/etc/letsencrypt/live/upload.milaidi.online/`，有效期至 2026-11-20。该证书使用手工 DNS-01，当前不能自动续期；未启用误导性的自动续期 timer。
- backend current 已原子切换为 `20260822-upload-direct-ingress-v4946-r1`，员工静态切换为 `frontend-upload-direct-ingress-v4946`；旧 v4945-r1 保留回滚。
- `QIMAO_DIRECT_UPLOAD_ORIGIN=https://upload.milaidi.online` 已写入受保护环境文件，Fastify health=200。
- Nginx 已监听 `0.0.0.0:443`；回环 SNI 验证中：普通路径404、错误 Origin 403、正确预检204、无能力 create 401，且未上传文件字节。
- 公网检测中，TCP 443 成功、IP 直连 TLS/HTTP 成功；但携带 `upload.milaidi.online` SNI 的 TLS ClientHello 被连接重置，同时间窗无 Nginx access 记录。结论是请求在机房入口被拦截，不是证书、Nginx、Fastify或上传状态机故障。
- 为避免影响现有测试，已恢复 backend `20260822-upload-tus-v4945-r1`、员工静态 `frontend-upload-tus-v4945-r1` 和原受保护环境文件；直传站点已停用，443 不再监听。Cloudflare Tunnel 保持 active，公网主站 `/health` 与 `/uploads` 均返回200。证书与未启用的站点资产保留供后续恢复，不改数据库或既有上传记录。
- 用户开放 TCP 18443 后，Nginx 曾改为仅监听18443：公网 TCP、受信证书、SNI、普通路径404和精确 CORS 204 首轮均通过。数分钟后带 `upload.milaidi.online` SNI 的握手再次被重置，而 `https://103.36.63.67:18443` 无SNI仍返回Nginx 404；因此高位端口只是短暂穿透，不能作为稳定上线方案。v4946/18443 切换已按同一回滚点撤回，最终18443无监听。
- 后续不得继续枚举端口规避过滤。只有机房完成备案/域名过白，或迁移到没有此类SNI过滤且经授权的服务器/对象存储，才可重新启用直连数据面。
- 在机房完成域名备案/过白，或另行批准并验证高位 TLS 端口前，不得宣称直连上传已上线。

## 已核对的基线

- 主机公网 IPv4：`103.36.63.67`；Nginx、qimao-backend、cloudflared 均为 `active`。
- 当前仅 `18080/18081` 监听公网；`3001/5432/8080/8081` 均仅回环。`80/443` 无监听、Nginx 也无 80/443 server 或 TLS 证书指令。
- 主机未发现 UFW、iptables 或 nft input 链规则；这不能证明雨云控制台防火墙状态，Phase-B 必须由用户在雨云控制台复核。
- 本机未安装 `certbot`/`acme.sh`，`/etc/letsencrypt/live` 无现有证书。Tus 存储同一文件系统可用约 `90 GiB`；以每个文件上限 5 GiB、最大四并发及完成阶段可能的双份空间计算，Phase-B 开放前仍须确认可用空间不少于 `50 GiB`。
- 当前 backend=`20260822-upload-tus-v4945-r1`、员工静态=`frontend-upload-tus-v4945-r1`、管理员静态=`system-frontend-v4880`；现有 Nginx 备份目录计数为 2。

## 固定入口与最小资产

- 目标：`upload.milaidi.online` 为 **DNS-only A** 到 `103.36.63.67`；主站、登录和普通 API 继续经过 Cloudflare。
- `deploy/debian/nginx/qimao-upload-direct.conf`：只监听 HTTPS；仅允许 `OPTIONS/POST` 到 `/api/uploads/tus`，以及 `OPTIONS/HEAD/PATCH` 到带受限 ID 的 `/api/uploads/tus/:id`。其余路径一律 404。
- CORS 仅为 `https://milaidi.online`，实际响应与预检均有精确 `Origin`/`Vary: Origin`，不返回 `Access-Control-Allow-Credentials`。上传浏览器请求不发送 Cookie 或 Authorization，只使用 `x-qimao-upload-capability`；Fastify 仍是认证与授权的唯一权威。
- 单 PATCH 限 `3 MiB` 以匹配当前 2 MiB 分片；`proxy_request_buffering off`、`proxy_buffering off`、一小时 upstream 超时、每 IP 四并发。5 GiB 是跨多次 PATCH 的会话总量，不设置总文件 wall-clock 截断或 PATCH `limit_req`。
- `qimao-upload-direct-log.conf` 必须安装于 Nginx `http` 上下文。日志仅含 request-id、操作类别、状态、字节数、耗时和数值 offset；不记录 URI、IP、Cookie、Authorization、Tus metadata 或文件名。
- ACME renew service/timer 仅供证书已签发且 certbot 已安装后启用；`qimao-upload-direct-acme-reload` 先执行 `nginx -t` 才 reload。

## Phase-B 前置合同

BACK 必须冻结并由规划以 Phase-B token 指明：

1. 真实 TUS create/resource 路径和资源 ID 字符集；
2. `x-qimao-upload-capability` 的精确验证语义；不得回退 Cookie、Authorization 或 Nginx 伪造身份；
3. CORS allow headers=`Tus-Resumable, Upload-Length, Upload-Metadata, Upload-Offset, Content-Type, x-qimao-upload-capability`，expose headers=`Location, Tus-Resumable, Upload-Offset, Upload-Length, Upload-Metadata`；
4. 2 MiB chunk、短写回滚和服务端 offset 进度的最终兼容性。

合同不同于本草案时，先更新草案中的精确路径/CORS header，再运行 `node deploy/debian/bin/validate-upload-direct-assets.mjs`；不得以 wildcard、Cookie、Authorization 或 Nginx 伪造身份绕过合同。

## 需由用户执行的控制台动作

1. Cloudflare `milaidi.online` zone：确认没有冲突的 `upload` A/AAAA/CNAME，再创建 `upload` A=`103.36.63.67`，关闭橙云代理（DNS-only）；不创建 Tunnel ingress、Access Application 或 wildcard 记录。
2. 雨云安全组/防火墙：仅放行公网 TCP `443` 到该主机；保持 `80` 关闭，且绝不放行 `3001/5432/8080/8081`。若改用 HTTP-01，仅在签发窗口临时开放 80，并在完成后立即关闭。
3. 证书：优先使用 DNS-01，使常态下只暴露 HTTPS。手工 DNS-01 需要用户在 Cloudflare Dashboard 添加 ACME 给出的短期 TXT；自动 DNS-01 需要另行授权、最小权限的 DNS token，不能写入本仓库、命令行或日志。

## Phase-B 上线与回滚顺序

1. 规划验收 BACK 合同并发放 Phase-B token；SERVER 只读复核 DNS 解析、443 防火墙、磁盘空间和现有回滚点。
2. 在不启用站点前安装 log-format 资产，安装 certbot，完成并验证 `upload.milaidi.online` 证书；证书私钥保留在 root-only 路径。
3. 按合同复核站点草案，安装站点与 ACME reload 脚本，执行 `nginx -t`；通过后才启用 443 site、reload 一次 Nginx，并 enable timer。
4. 用不含凭据的协议边界请求验证：错误 Origin=403、错误路径=404、错误方法=403、规范 OPTIONS=204 且只有精确 CORS；认证正向 create/PATCH/HEAD/complete 仅在用户现有同源会话中验证。
5. 回滚：disable 直连 site，恢复启用前的 Nginx 配置备份，`nginx -t && systemctl reload nginx`，关闭雨云 443 并将 DNS 记录移除或恢复到切换前值。不要回滚数据库、backend current、员工/管理员静态、cloudflared 或现有 Tus 会话。

## 本 Phase-A 未执行的动作

未申请证书、安装 certbot、启用 systemd timer、安装/启用 Nginx 配置、绑定 80/443、修改雨云防火墙、修改 Cloudflare DNS/Tunnel/Access、重载服务或读取任何 Secret/Cookie/token/数据库密码。
