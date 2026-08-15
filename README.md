# 审改工作台云端版

这是海外短剧审改工作台的全新云端项目。里程碑 1 工程骨架已完成；当前开发切片已落地项目创建、项目列表和整剧素材元数据配对确认，业务状态由本地 PostgreSQL 18 提供。

> 本仓库不包含任何视频、音频、字幕、术语数据、数据库、API Key、`.env` 或生成文件。原本地应用仅作为只读的功能与运行逻辑参考，不复制其数据和历史构建物。

## 当前状态

已具备：

- 独立 Git 仓库和零远程仓库配置；
- 分离的后端、前端、测试、部署与文档目录；
- Node.js、pnpm 与 Volta 的精确版本固定；
- React/Vite 项目中心与 Fastify 项目 API；
- 本地 PostgreSQL 18、可重复迁移和项目创建幂等保护；
- 浏览器本地素材元数据扫描、按集自动配对、人工调整和版本化确认；
- 后端素材清单持久化、幂等确认、版本冲突保护和刷新恢复；
- PostgreSQL 上传会话/分片/素材状态与内存 Storage fake 驱动的分片协议地基；
- 仓库边界、敏感文件忽略规则和自动验证；
- 面向对象存储直传、ASR API、任务队列、Worker 扩容和 PostgreSQL 的模块化单体边界说明。

尚未开始：正式上传队列 UI、浏览器文件直传、真实 R2 上传、回收站、登录、术语提取、人工审改、ASR、OCR、任务队列和云端部署。内存 Storage fake 仅供本地开发和匿名自动化测试，不是生产存储或容量验证。

当前产品范围、UI 规则和里程碑状态分别记录在：

- [PRODUCT.md](PRODUCT.md)
- [DESIGN.md](DESIGN.md)
- [里程碑 2：上传生命周期](docs/milestones/M2-upload-lifecycle.md)
- [当前交接状态](docs/status/CURRENT.md)

## 四角色协作

本仓库采用一个项目、一个工作目录和四个固定 Codex 对话：规划、UI 设计、后端开发、前端开发。`docs/status/CURRENT.md` 是唯一当前任务看板，`docs/WORKFLOW.md` 定义目录所有权、任务依赖、并行条件和验收接力；用户不需要在对话之间复制任务内容。

- UI 设计只维护设计基线、原型和验收，不修改生产 React 页面。
- 后端维护数据库、API、存储和 `packages/contracts/` 唯一共享代码契约，不修改生产前端。
- 前端只消费共享契约并维护 `frontend/` 与前端测试，不修改后端、迁移或契约含义。
- 规划负责产品语义、里程碑、依赖和端到端验收，不编写业务代码。

当前 M2 有连续的未提交实现，因此四个对话使用同一保存项目和本地工作目录；未经明确批准，不为角色协作复制仓库或建立隔离工作树。

## 目录

```text
backend/   Fastify 模块化单体、迁移与 HTTP 入口
frontend/  React/Vite Web 前端
packages/  前后端共享接口契约
tests/     跨模块、集成与仓库规则测试
deploy/    部署清单和环境说明
docs/      项目与架构文档
tools/     本地验证工具
```

运行时目录统一使用仓库根目录下的 `inputs/`、`work/`、`outputs/`、`data/` 或 `storage/`，这些目录已被 Git 忽略。不要把真实业务资料放进源码或测试目录。

## 固定工具版本

- Node.js `24.19.0`（Volta 与 `.node-version`）
- pnpm `11.21.0`（Volta 与 `packageManager`）
- Git `2.52.0.windows.1`（本机验证版本，不作为仓库运行时依赖）

安装 Volta 后进入项目目录，Volta 会自动选择固定版本。

## 开发命令

```powershell
pnpm install --frozen-lockfile
pnpm db:install
pnpm db:setup
pnpm check
pnpm dev
```

`pnpm db:install` 首次会从 EnterpriseDB 官方地址下载经过固定 SHA-256 校验的 PostgreSQL 18.4 Windows 二进制（约 322 MiB）。由于 PostgreSQL Windows 工具不能可靠处理当前含中文的仓库路径，运行时与数据库文件保存在 `C:\tmp\qimao-terms-cloud-postgres-18.4`，不会进入 Git。实例只监听 `127.0.0.1:55432`，使用数据库 `qimao_terms_cloud`，仅用于本地开发。

常用命令：

- `pnpm dev`：准备数据库并同时启动后端和前端；
- `pnpm dev:backend`：启动后端，默认监听 `http://localhost:3001`；
- `pnpm dev:frontend`：启动前端，默认监听 `http://localhost:3000`；
- `pnpm db:setup`：启动本地 PostgreSQL、创建数据库并执行迁移；
- `pnpm db:status`：显示本地 PostgreSQL 版本和连接状态；
- `pnpm db:stop`：停止本项目的本地 PostgreSQL；
- `pnpm test`：运行独立测试目录中的测试；
- `pnpm lint`：执行 TypeScript 与工具脚本检查；
- `pnpm build`：构建后端与前端产物；
- `pnpm check:repo`：检查目录边界、工具版本、Git 远程和敏感文件忽略策略；
- `pnpm check`：依次执行仓库检查、语法检查、测试和构建。

健康检查：

```text
GET http://localhost:3001/health
GET http://localhost:3001/api/projects
POST http://localhost:3001/api/projects
GET http://localhost:3001/api/projects/:projectId/material-manifest
POST http://localhost:3001/api/projects/:projectId/material-manifests/confirm
POST http://localhost:3001/api/projects/:projectId/uploads
GET http://localhost:3001/api/uploads/:uploadId
POST http://localhost:3001/api/uploads/:uploadId/parts/authorize
POST http://localhost:3001/api/uploads/:uploadId/parts/confirm
POST http://localhost:3001/api/uploads/:uploadId/complete
POST http://localhost:3001/api/uploads/:uploadId/abort
```

## 参考应用边界

只读参考路径：

```text
C:\Users\ComradeGu\Documents\七猫兼职\apps\short-drama-terms-workbench
```

禁止从新项目脚本写入、移动、删除或重命名该目录中的任何内容。需要借鉴功能时，只提炼行为、状态和验收条件；不得复制本地数据库、素材、缓存、凭据、输出或历史构建目录。

## 下一里程碑

当前切片完成后按 [当前交接状态](docs/status/CURRENT.md) 进入评审；真实 R2 上传与回收站不会自动开始。
