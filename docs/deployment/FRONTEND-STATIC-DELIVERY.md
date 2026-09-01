# 两站静态前端构建与交付清单

本清单只覆盖员工站 `frontend/` 与管理员站 `system-frontend/` 的 Linux 静态构建、托管和交付。它不创建第二套站点，不改变业务代码，也不包含 Secret、真实供应商、付费或云资源配置。

## 1. 当前构建基线

权威版本来自仓库根 `package.json`、两端各自的 `package.json` 与 `vite.config.ts`：

| 项目 | 版本/事实 |
| --- | --- |
| Node.js | `24.19.0`（`engines` 与 Volta） |
| pnpm | `11.21.0`（`packageManager` 与 Volta） |
| React/Vite | React `19.2.8`、Vite `8.2.1` |
| 员工站开发端口 | `3000`；仅开发服务器把 `/api`、`/health` 代理到 `127.0.0.1:3001` |
| 管理员站开发端口 | `3010`；仅开发服务器把 `/api`、`/health` 代理到 `127.0.0.1:3001` |
| 员工产物 | `frontend/dist/` |
| 管理员产物 | `system-frontend/dist/` |
| source map | 两端 `build.sourcemap=true`，每个 JS/CSS 构建会同时产生 `.map`（交付前按下文清单处理） |

生产构建不读取 API 基址配置：两端代码都使用同源相对路径 `/api/...` 和 `/health`。员工站唯一的非 Secret 构建变量是可选的 `VITE_BUILD_VERSION`（反馈安全上下文中的构建标识）；管理员站当前没有 `import.meta.env` 依赖。禁止把数据库 URL、JWT、Secret、Provider key、内部 endpoint 或任意凭据放进 `VITE_*`，因为 Vite 变量会进入浏览器产物。

### 可复用命令

在仓库根执行，不要执行 `pnpm install` 以外的隐式联网步骤；交付环境应使用锁文件安装：

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
pnpm install --frozen-lockfile

pnpm --filter @qimao-terms-cloud/frontend run typecheck
pnpm --filter @qimao-terms-cloud/frontend run build

pnpm --filter @qimao-terms-cloud/system-frontend run typecheck
pnpm --filter @qimao-terms-cloud/system-frontend run build
```

本次准备阶段的真实结果（2026-08-19，未改业务代码）：

- 员工站 typecheck：通过；Vite production build：通过，`195 modules`。
- 管理员站 typecheck：通过；Vite production build：通过，`45 modules`。
- 员工构建会给出既有单 chunk 大于 500 kB 的 Vite 提示；这不是构建失败，也未在本任务引入拆包或视觉变化。

## 2. 产物与发布边界

每个站点只交付自己 `dist/` 目录的完整内容，保持相对路径和大小写：

```text
frontend/dist/index.html
frontend/dist/assets/*
system-frontend/dist/index.html
system-frontend/dist/assets/*
```

`dist/`、source map、构建缓存均已被 `.gitignore` 忽略，不应提交到 Git，也不应把它们复制回源码目录。交付包建议在 CI/交付机上生成到仓库外临时目录，包名带有 commit/build 标识；本仓库不新增 `deploy/frontend` 脚本，因为现有 Vite 脚本已经稳定产生产物，额外脚本会形成第二套构建入口。

source map 当前由配置明确生成。若生产不需要公开调试信息，应在托管层限制 `*.map` 的公开访问或将 map 保存到受控诊断存储；不得在没有重新审核的情况下删除 map、改写 Vite 配置或把 map 当作 Secret 存储。无论是否公开 map，都必须先完成下方敏感内容扫描。

### 完整性校验

在构建产物目录的父目录生成排序稳定的 SHA-256 清单；清单本身可以随交付包发送，但不能包含凭据：

```bash
cd /srv/qimao-build
find frontend-dist system-frontend-dist -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum > SHA256SUMS
sha256sum -c SHA256SUMS
```

Windows 复核等价命令（不作为 Linux 交付脚本）：

```powershell
Get-ChildItem frontend-dist,system-frontend-dist -Recurse -File |
  Sort-Object FullName |
  Get-FileHash -Algorithm SHA256
```

交付前对两个 `dist/` 做二进制扫描，发现命中必须停发并回报，不得用替换字符串掩盖：

```bash
rg -a -n --hidden \
  'BEGIN .*PRIVATE KEY|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]|postgres(ql)?://|Bearer[[:space:]]+[A-Za-z0-9._-]+' \
  frontend-dist system-frontend-dist
```

同时检查产物不存在指向开发机的绝对 API 地址；正常生产请求应保持 `/api`、`/health` 相对路径：

```bash
rg -a -n '127\.0\.0\.1:3001|localhost:3001|VITE_API_BASE_URL|DATABASE_URL' \
  frontend-dist system-frontend-dist
```

若命中的是构建诊断或文档字符串，应人工逐项确认；不得把真实 endpoint、数据库连接串或 Secret 带入静态资源。

## 3. 同一公网 IP 的三域名拓扑

建议使用三个 DNS 名称指向同一公网 IP（文档中的主机名和 IP 均为占位符，不得写死到前端或仓库）：

| Host | 入口 | 反向代理目标 | 静态根 |
| --- | --- | --- | --- |
| `work.<company-domain>` | 员工站 | `/api/*`、`/health` 代理到本机 Fastify `127.0.0.1:3001` | `/srv/qimao-terms-cloud/frontend` |
| `admin.<company-domain>` | 管理员站 | `/api/*`、`/health` 代理到本机 Fastify `127.0.0.1:3001` | `/srv/qimao-terms-cloud/system-frontend` |
| `api.<company-domain>` | API 运维/健康入口 | 全部转发到本机 Fastify `127.0.0.1:3001` | 无 |

要求：

1. `work` 与 `admin` 的 `/api` 和 `/health` 使用同源反代，浏览器不需要新的 CORS 或 API 基址开关；`api` 域名用于运维、探活或受控 API 客户端，不应被前端代码拼接调用。
2. 三个 DNS 记录都只引用部署平台提供的变量/主机名；不要在源码、Vite 环境变量或文档示例中写入真实服务器 IP。
3. Fastify 当前 `startServer()` 默认监听 `127.0.0.1` 和 `PORT`（默认 `3001`），适合与本机反向代理同机运行。生产必须由服务管理器注入 `NODE_ENV=production`、`PORT` 和 `DATABASE_URL`，并由后端任务另行注入真实 Secret/Access/存储/Worker 适配器；静态前端不承载这些值。
4. `work` 与 `admin` 使用不同的访问策略和 audience；管理员导航不得注册到员工站，员工站也不得出现 ControlShell 入口。跨站返回只允许不带 Secret/internal reference 的业务路径参数。
5. TLS、Access/JWT、限流和安全响应头在反向代理/后端层配置，不在静态构建阶段伪造登录或权限状态。
6. 服务器部署、容量监控、压测、峰值/长稳、故障注入、报告与停止控制只属于管理员 `system-frontend` / ControlShell（现有 `/servers`、`/logs`，以及未来经设计批准的管理员测试容量入口）。员工 `frontend`/AppShell 不新增任何对应入口、按钮、状态、脚本或测试文案；部署侧的 `deploy/`、`tests/`、`docs/` 资产不改变这一隔离。

## 4. History fallback 与 API 分流

员工站使用 React Router `BrowserRouter`，管理员站使用 `pushState`/`popstate` 路由。两站直接访问深链都需要 SPA fallback：

- 员工站非 API 路径（如 `/projects/<projectId>/asr`、`/tasks`、`/deliveries/<deliveryId>`）在静态文件不存在时回退到 `frontend/dist/index.html`。
- 管理员站非 API 路径（如 `/engines`、`/routing`、`/changes`、`/security`、`/budgets`、`/servers`、`/logs`、`/strategy`、`/feedback` 及 `/system-control/*` 别名）在静态文件不存在时回退到 `system-frontend/dist/index.html`。
- `/api/*` 和 `/health` **不得**回退 HTML，必须保持 Fastify 的真实状态码、`x-request-id` 和 JSON 错误；这保证前端的 loading/error/stale/requestId 投影不被代理层伪造成 200。
- 查询字符串必须原样传递给前端路由；刷新、直接粘贴深链和返回键都应落在同一 host 的对应站点。

等价的 Nginx/Caddy 行为是“静态文件优先，未命中再回退同站 `index.html`；API/health 先反代”。本任务不新增第二份 Nginx/Caddy 配置，部署方应在平台配置中落实这一规则并在发布前验证三条深链与一条 API 失败响应。

## 5. 无域名临时烟雾路径

没有 DNS/TLS 时仍可做静态路由烟雾检查，但不能把它当作生产验收：

```bash
# 员工站静态预览（只读 dist）
pnpm --filter @qimao-terms-cloud/frontend exec vite preview --host 127.0.0.1 --port 4173

# 管理员站静态预览（另一个终端）
pnpm --filter @qimao-terms-cloud/system-frontend exec vite preview --host 127.0.0.1 --port 4174
```

检查：

- `http://127.0.0.1:4173/projects`、`/tasks`、一个项目深链刷新后仍返回员工 `index.html`。
- `http://127.0.0.1:4174/`、`/engines`、`/routing`、`/feedback` 刷新后仍返回管理员 `index.html`。
- 静态预览没有 `/api` 反代时，接口失败必须诚实显示；不得用 mock JSON、假 200 或浏览器本地状态掩盖。需要 API 联调时，使用现有两端开发服务器（3000/3010）或一个临时本机反向代理把 `/api` 指向 Fastify 3001，不修改前端 API 路径。
- 烟雾结束只需停止本轮启动的预览进程；不得停止共享 PostgreSQL、其他角色服务或清理非本轮目录。

## 6. 发布前最短清单

1. 在干净的 Linux 工作目录按锁文件安装 Node/pnpm，执行两端 typecheck/build。
2. 记录 commit/build 标识；如需反馈构建上下文，只设置非敏感 `VITE_BUILD_VERSION`。
3. 对 `frontend/dist` 与 `system-frontend/dist` 生成 SHA-256 清单并完成敏感内容/绝对地址扫描。
4. 将两份静态根分别复制到版本化发布目录，原子切换当前软链接；不要覆盖源码、不要把两个 `index.html` 合并。
5. 配置 `work/admin/api` 三个 host 到同一 IP；确认 work/admin 的 `/api` 同源反代、api host 直达 Fastify，确认 HTTPS/Access/audience 分离。
6. 依次验证员工与管理员深链刷新、`/api` 真实错误响应、`/health`、静态资源 MIME/cache、请求 ID 透传和根页面无横溢。
7. 回滚时只切换静态版本软链接并恢复对应后端配置；不删除旧构建、不改数据库、不重发业务命令。

## 7. 当前未决项与停止边界

- 本次没有新增 `deploy/frontend/**` 文件；已有脚本足以生成可靠的两份静态产物。
- 服务器部署、容量/压测/长稳/故障注入与停止控制的产品入口严格留在管理员 ControlShell；员工站保持零入口、零按钮、零状态投影、零脚本和零测试文案。
- 仓库后端当前默认仍依赖服务端注入的生产数据库、Secret/Access、真实存储和 Worker/供应商适配器；前端静态构建成功不等于 API 已具备生产能力。后端/基础设施任务必须单独完成这些注入并验证，不能在本清单中用环境变量或 mock 代替。
- 当前 Vite source map 默认生成，是否公开由部署安全策略决定；若需关闭或上传受控诊断存储，应另开前端构建变更并重新验证。
- 本清单不授权购买、部署、真实网络、Secret、付费、云资源、Git 提交或推送；仅作为后续测试服务器准备与发布评审依据。
