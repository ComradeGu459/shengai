# 审改工作台云端版：项目约束

本文件适用于仓库 `C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`。用户最新明确要求优先；本文件只保留项目级稳定约束，协作步骤见 [WORKFLOW](docs/WORKFLOW.md)，当前协调状态只看 [CURRENT](docs/status/CURRENT.md)。代码、数据库和真实外部事实优先；发生冲突时必须修正 CURRENT。

## 1. 冲突顺序与事实来源

1. 用户当前明确要求；
2. 本文件；
3. `docs/WORKFLOW.md`；
4. 业务代码、契约、迁移、测试和真实外部事实；
5. `docs/status/CURRENT.md` 的当前协调状态；
6. 开发日志、RESULT 和归档仅供审计，不参与调度。

完成、发布或通过必须有同一候选、环境和输入的可复核证据。回滚只证明外部状态恢复，不代表目标完成。

## 2. 仓库与工作树边界

- 唯一可写仓库根是 `C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`。
- 父目录 `C:\Users\ComradeGu\Documents\七猫兼职` 的空 Git 仓库是已知边界问题；不得在父仓库执行配置、清理、提交或任何修复。
- 保留全部未提交改动；禁止 reset、checkout、clean、stash、批量覆盖、平行仓库和新 worktree。
- 同一物理文件同一时刻只允许一个可写 Owner。开始修改前只需一次目标路径的 `git status/diff` 对账。
- 原始视频、字幕、术语、凭据、Cookie/Auth、Secret、数据库、对象键和供应商载荷不得进入仓库、截图或日志。

## 3. 六个固定逻辑角色

| 角色 | 默认所有权 | 不得越界 |
| --- | --- | --- |
| 规划 | `AGENTS.md`、`docs/WORKFLOW.md`、`docs/status/`、开发日志、范围与审核 | 修改业务实现或执行生产写入 |
| UI | `DESIGN.md`、`docs/ui/`、UI 验收 | 修改生产前后端 |
| BACK | `backend/`、`packages/contracts/`、迁移、`tests/backend/` | 修改员工站或管理员站 |
| FRONT | `frontend/`、`system-frontend/`、`tests/frontend/` | 修改后端、迁移或共享契约语义 |
| TEST | 独立测试、隔离数据、浏览器验收、`docs/testing/` | 修改生产实现 |
| SERVER | `deploy/`、`docs/deployment/`、服务器运行与发布证据 | 在服务器现场修改业务源码 |

固定的是角色和文件所有权，不是永久增长的物理任务。换代规则只在 `docs/WORKFLOW.md` 维护。

## 4. 授权与外部动作

- 一次明确授权覆盖同一目标、环境/对象、数据范围和风险边界内的整个切片；本地低风险修改与相称验证不重复询问。
- 购买或付费、公开资源、真实 Secret、提交/推送、部署、服务器或数据库写入、删除/覆盖用户数据和不可逆动作必须有明确授权。
- 外部写入结果 unknown 时只查询同一稳定身份；禁止盲重发 POST、SCP、发布或付费请求。
- 用户已授权的测试目标包含指定测试环境内必要且可精确清理的临时 helper、夹具和一次性执行，但不自动扩大到生产发布或真实用户数据。

## 5. 实现与验证不变量

- 每个业务状态只有一个服务端权威来源；前端和文档只投影。
- 后续 ASR/OCR/术语 Provider 复用既有路由、任务、日志、预算、对象存储和 Worker；只补适配器、必要配置与一次真实验证。
- 小修只跑复现和受影响测试；中型切片增加 typecheck/必要 build；完整 `pnpm check` 只在大型里程碑或发布前运行一次。
- 同一首因两次失败后停止第三次补丁，回到权威状态、时序和官方资料重新规划。
- 达到冻结验收即停止，不顺带重构、兼容双轨或新增第二控制面。

## 6. 入口

- 项目与命令：[README](README.md)
- 协作流程：[WORKFLOW](docs/WORKFLOW.md)
- 当前状态：[CURRENT](docs/status/CURRENT.md)
- 当前发布：[ACTIVE_RELEASE](docs/status/ACTIVE_RELEASE.md)
- 部署资料：[deployment index](docs/deployment/INDEX.md)
- Node.js `24.19.0`；pnpm `11.21.0`；保持现有 Volta 与 `packageManager` 配置。
