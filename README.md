# 审改工作台云端版

海外短剧审改工作台的云端项目。仓库包含 Fastify 后端、员工 React/Vite 工作台、管理员 React/Vite 控制台、共享契约、数据库迁移、Worker、测试与声明式部署入口。

> 仓库不保存视频、音频、真实字幕、术语数据、数据库、API Key、`.env` 或供应商载荷。旧本地应用仅作只读行为参考。

## 当前生产阶段

- 员工站：[https://milaidi.online/](https://milaidi.online/)
- 管理员站：[https://milaidi.top/](https://milaidi.top/)
- 已上线：登录、项目/素材、私有腾讯 COS multipart 与后台上传恢复、术语/热词、腾讯 ASR、OpenVINO OCR、前置审改和字幕验收的现有生产链路。
- 当前未关闭的产品门：员工画面字候选审改新版已通过本地验收并冻结发布包，但尚未部署，也未完成当前真实项目的最终人工验收。

当前协调状态、阻塞和唯一下一步看 [CURRENT](docs/status/CURRENT.md)，已部署与待发布身份看 [ACTIVE_RELEASE](docs/status/ACTIVE_RELEASE.md)；代码、数据库和真实外部事实优先，若与 CURRENT 冲突必须修正文档。

## 目录

```text
backend/          Fastify 模块化单体、迁移、API 与 Worker
frontend/         员工工作台
system-frontend/  管理员控制台
packages/         前后端共享契约
tests/            后端、前端和跨模块测试
deploy/           声明式部署入口与发布输入
docs/             产品、设计、状态、测试与部署证据
tools/            本地验证和 PostgreSQL 工具
```

运行时数据只放在 Git 已忽略的 `inputs/`、`work/`、`outputs/`、`data/` 或 `storage/`，不得放进源码或测试目录。

## 固定工具版本

- Node.js `24.19.0`（现有 Volta 与 `.node-version`）
- pnpm `11.21.0`（现有 Volta 与 `packageManager`）

## 本地入口

```powershell
pnpm install --frozen-lockfile
pnpm db:setup
pnpm dev
```

`pnpm dev` 启动 backend 与员工站；管理员站单独启动：

```powershell
pnpm --filter @qimao-terms-cloud/system-frontend run dev
```

- backend：`http://localhost:3001`
- 员工站：`http://localhost:3000`
- 管理员站：`http://localhost:3010`
- 健康检查：`GET http://localhost:3001/health`

常用验证：`pnpm test`、`pnpm typecheck`、`pnpm build`、`pnpm check:repo`。完整 `pnpm check` 仅用于大型里程碑或发布前的一次完整门。

本地 PostgreSQL 18.4 由 `pnpm db:install|start|setup|status|stop` 管理，监听 `127.0.0.1:55432`，默认数据库为 `qimao_terms_cloud`；Windows 运行目录为 `C:\tmp\qimao-terms-cloud-postgres-18.4`。

## 六角色协作

本项目复用六个固定逻辑角色：规划、UI、BACK、FRONT、TEST、SERVER。固定的是职责与文件所有权，不是永久物理任务 ID；不建立平行仓库或新 worktree。

- 项目边界和所有权：[AGENTS](AGENTS.md)
- 派发、交付和停止规则：[WORKFLOW](docs/WORKFLOW.md)
- 当前产品状态：[CURRENT](docs/status/CURRENT.md)
- 发布资料导航：[deployment index](docs/deployment/INDEX.md)

只读参考应用：`C:\Users\ComradeGu\Documents\七猫兼职\apps\short-drama-terms-workbench`。禁止写入、移动、删除或复制其中的真实数据、缓存、凭据与构建物。
