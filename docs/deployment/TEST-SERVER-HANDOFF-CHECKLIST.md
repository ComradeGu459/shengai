# 测试服务器到手前/后最短清单

状态：执行中；主机、SSH、时间试用基线、PostgreSQL 37/37 迁移和生产构建已完成，当前等待本地磁盘存储新发布包的服务器复验。实时状态与用户反馈入口见 [`TEST-SERVER-COLLABORATION.md`](TEST-SERVER-COLLABORATION.md)。

本清单只适用于全新、独占的 Debian 12 测试服务器和匿名 fake/stub。所有容量、故障、报告与停止控制仅属于管理员 ControlShell；员工 AppShell 不新增入口、按钮、状态、脚本或测试文案。

## 到手前：用户只需提供（本轮已完成）

1. 确认主机不是生产、共享数据库或生产公网 IP，并明确本次允许 SSH、安装软件和部署。
2. 提供测试主机 IP、SSH 用户与端口、Debian 版本、SSH 主机指纹和仅用于本机的公钥登录方式；不要在聊天中发送密码、私钥、数据库 URL 或 API key。
3. 确认访问模式：三个测试域名 `work/admin/api`，或 SSH 隧道 + 本机 Hosts；同时给出管理员出口 IP allowlist。
4. 说明是否允许安装 Node `24.19.0`、pnpm `11.21.0`、PostgreSQL、Nginx、logrotate 与 curl；给出 CPU/内存/磁盘/网络规格。
5. 冻结代码快照、允许启动的服务/Worker、匿名 A/B 夹具、测试窗口、CNY 预算（默认 `¥0.00`）和立即停止条件。

缺任何一项：不登录、不安装、不改 DNS/TLS/防火墙、不写入 Secret、不部署。

## 到手后：最短执行顺序（执行到第 4 步的 Fastify 启动门）

1. 核验 SSH 指纹、Debian 12、主机规格、时钟和非生产隔离；记录脱敏事实。
2. 仅在获批窗口安装依赖，配置 PostgreSQL/Node/Fastify 为 loopback，不开放 `3000/3001/3010/5432`。
3. 从冻结快照构建两站，进行产物 hash 与敏感内容扫描；将员工站与管理员站置于分离静态根。
4. 在专用空库迁移，核对业务行数为零；经审核后安装 Nginx/systemd/健康检查，管理员站同时保持 IP allowlist + 临时 Basic Auth 或 SSH 隧道。
5. 依次验证 `/health`、两站深链刷新、API 真实非 2xx、A/B 隔离、员工站无管理/容量控制入口；任一失败停止并记录。
6. 只在管理员控制面启动 smoke → 1/5/10/20 阶梯 → 短峰值 → 单变量故障注入；1–4 小时长稳需再次获批。
7. 停止负载后只读对账并精确回收本轮数据库、进程、临时访问门、隧道/DNS 和匿名夹具；不删除未确认归属资源。

关联：`BACKEND-LINUX-RUNTIME.md`、`FRONTEND-STATIC-DELIVERY.md`、`TEST-SERVER-ONE-DAY-RUNBOOK.md`、`../testing/TEST-SERVER-PERFORMANCE-PLAN.md`、`../testing/TEST-SERVER-CAPACITY-ACCEPTANCE.md`。
