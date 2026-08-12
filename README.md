# 审改工作台云端版

这是海外短剧审改工作台的全新云端项目。里程碑 1 已完成可运行、可验证、与本地应用完全隔离的工程骨架；里程碑 2 已完成范围与契约准备，业务代码尚未开始。

> 本仓库不包含任何视频、音频、字幕、术语数据、数据库、API Key、`.env` 或生成文件。原本地应用仅作为只读的功能与运行逻辑参考，不复制其数据和历史构建物。

## 当前状态

已具备：

- 独立 Git 仓库和零远程仓库配置；
- 分离的后端、前端、测试、部署与文档目录；
- Node.js、pnpm 与 Volta 的精确版本固定；
- 最小后端健康检查、最小前端占位页；
- 仓库边界、敏感文件忽略规则和自动验证；
- 面向对象存储直传、ASR API、任务队列、Worker 扩容和 PostgreSQL 的模块化单体边界说明。

尚未开始：登录、项目管理、字幕导入、术语提取、人工审改、ASR、任务队列、数据库、对象存储和部署实现。

当前产品范围、UI 规则和里程碑状态分别记录在：

- [PRODUCT.md](PRODUCT.md)
- [DESIGN.md](DESIGN.md)
- [里程碑 2：上传生命周期](docs/milestones/M2-upload-lifecycle.md)
- [当前交接状态](docs/status/CURRENT.md)

## 目录

```text
backend/   后端模块化单体与 HTTP 入口
frontend/  Web 前端
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
pnpm check
pnpm dev
```

常用命令：

- `pnpm dev`：同时启动后端和前端骨架；
- `pnpm dev:backend`：启动后端，默认监听 `http://localhost:3001`；
- `pnpm dev:frontend`：启动前端，默认监听 `http://localhost:3000`；
- `pnpm test`：运行独立测试目录中的测试；
- `pnpm lint`：执行当前阶段的 JavaScript 语法检查；
- `pnpm build`：验证后端入口并生成被 Git 忽略的前端 `dist/`；
- `pnpm check:repo`：检查目录边界、工具版本、Git 远程和敏感文件忽略策略；
- `pnpm check`：依次执行仓库检查、语法检查、测试和构建。

健康检查：

```text
GET http://localhost:3001/health
```

## 参考应用边界

只读参考路径：

```text
C:\Users\ComradeGu\Documents\七猫兼职\apps\short-drama-terms-workbench
```

禁止从新项目脚本写入、移动、删除或重命名该目录中的任何内容。需要借鉴功能时，只提炼行为、状态和验收条件；不得复制本地数据库、素材、缓存、凭据、输出或历史构建目录。

## 下一里程碑

里程碑 2 的范围已经确认。开始业务开发前，先按 [当前交接状态](docs/status/CURRENT.md) 完成技术选型门禁并建立里程碑 1 Git 基线；之后严格按 [M2 里程碑说明](docs/milestones/M2-upload-lifecycle.md) 实现，不并入 ASR、OCR、账号系统或旧数据迁移。
