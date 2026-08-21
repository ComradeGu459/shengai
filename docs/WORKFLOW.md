# 审改工作台云端版协作协议 v6.1

最后更新：2026-08-21

v6.1 是治理恢复版，不叠加 v4/v5/v6.0 的隐藏 successor 流程。旧协议和旧 CURRENT 已归档，只用于审计。业务状态、任务 Rev、稳定命令身份和已有证据继续有效。

## 1. 目标

本协议只解决四件事：

1. 每个工作包有唯一 Owner、唯一 Reviewer 和唯一文件租约；
2. 所有实际执行都发生在用户可见的固定角色任务中；
3. 交付必须真正唤醒目标任务并确认新 turn；
4. 当前状态保持短、可读、可恢复，不依赖对话记忆。

协议不是后台调度器。文件落盘不会自动运行任务；真正运行依赖 Codex 任务消息、任务新 turn 和当前规划轮次。

## 2. 角色

| 角色 | 负责 | 典型路径 |
| --- | --- | --- |
| 规划 | 范围、拆单、租约、审核、冲突、状态写回 | `PRODUCT.md`、里程碑、`CURRENT`、开发日志 |
| UI | 信息架构、交互、视觉与正式 UI 验收 | `DESIGN.md`、`docs/ui/` |
| BACK | API、契约、迁移、服务端状态机 | `backend/`、`packages/contracts/`、`tests/backend/` |
| FRONT | 两站生产界面、浏览器交互、前端测试 | `frontend/`、`system-frontend/`、`tests/frontend/` |
| TEST | 独立矩阵、隔离数据、浏览器验收、缺陷证据 | 独立测试文件、`docs/testing/`、仓库外证据 |
| SERVER | 测试机、部署资产、运行状态、问题台账 | `deploy/`、`docs/deployment/`、服务器证据 |

跨角色需求由规划拆单。共享契约语义由规划冻结，BACK 实现，FRONT 消费，TEST 独立验证。

### 2.1 规划是总管，不是默认施工角色

规划的标准闭环是：

```text
定位问题与权威状态源
  -> 给出最优解决路径、边界和验收门
  -> 派发给用户可见的领域 Owner
  -> 审核交付和证据
  -> 解决角色间契约、顺序或文件冲突
  -> 派发 Reviewer / 定向返工
  -> 最终收口
```

规则：

- 规划不领取常规业务实现租约，不以“更快”为理由自己修改领域文件，也不使用隐藏执行者代做。
- 角色只读、消息未送达或进度较慢，均不构成规划接管实现的理由；应先恢复用户可见可写 Owner。
- 角色连续两次针对同一根因提交有证据的失败并正式 `blocked` 后，规划负责重新诊断、调整方案或重新拆单，仍优先由领域 Owner 实现。
- 只有用户明确授权“规划直接介入”、当前没有可写领域 Owner，且精确异常租约已登记时，规划才可做最小必要修改；不得调用隐藏代理，产物必须交原领域角色独立审核。
- 规划可以随时修改协作协议、活跃快照和开发日志，但这不授权其代写产品契约、UI、生产代码、测试或部署资产。

## 3. 权威状态

### 3.1 文件职责

- `docs/status/CURRENT.md`：唯一活跃快照，最多约 180 行。
- `docs/status/archive/`：已关闭和被替换的历史快照，只读。
- `docs/logs/DEVELOPMENT_LOG.md`：追加式过程证据，不参与调度。
- 产品、契约、设计、测试和部署文档：各自领域的长期事实。

`CURRENT` 与开发日志只有规划或规划文档书记可写。其他角色交结构化差量，不因无状态文件权限而阻塞业务产物。

### 3.2 业务状态

| 状态 | 含义 |
| --- | --- |
| `ready` | 输入和租约可派发 |
| `in_progress` | 可写 Owner 已实际开始 |
| `artifact_written` | Owner 产物和证据已形成，等待规划收件 |
| `review` | 规划已收件，等待或正在独立审查 |
| `blocked` | 有明确阻塞和恢复输入 |
| `done` | 规划确认验收与清理完成 |

权限、消息和执行器故障不是业务失败，不增加业务 Rev。

## 4. Execution lease

每个活动写任务必须在 `CURRENT` 有一条租约，字段固定为：

```text
task_id / rev / role / status
handoff_token / authority_generation
repo_root / permission_profile / ordinary_writes
allowed_paths
predecessor / stoppoint
deliverable / acceptance / stop_conditions
owner_thread_id
```

规则：

- `allowed_paths` 必须精确，不能用整个仓库兜底；
- 一个物理文件同一时刻只属于一个活动租约；
- Owner 开始前检查当前 `git status/diff` 与租约重叠；
- 账号、模型、Provider、重启或工作区变化只使权限/通道探针过期，原租约、停点、Rev 和命令身份保留；
- 模型和推理强度由用户控制，任务消息不得覆盖。

## 5. 派发与权限握手

规划派发按以下顺序执行：

1. 读取 `CURRENT`，确认任务、依赖、Owner、Reviewer 和非目标；
2. 核对活动租约与目标路径无重叠；
3. 向固定角色任务发送同一 `handoff_token`；
4. 目标新 turn 回执 `repo_root / permission_profile / ordinary_writes / allowed_paths / authority_generation`；
5. 若 `workspace-write/:workspace + direct`，进入 `in_progress`；
6. 若 `read-only`，固定任务零修改并回报 `permission_blocked`；规划暂停该工作包，不得用内部子代理或隐藏 successor 代写；
7. 只有用户可见的原角色任务恢复可写，或用户可见的新替代任务完成权限握手并进入注册表后，工作包才可继续。

创建任务或发送消息成功不等于领取。规划必须用任务读取/等待能力确认目标的新 turn；未确认时标记 `notification_pending`。

## 6. 可见固定任务

- 项目只注册六个用户可见角色任务：规划、UI、BACK、FRONT、TEST、SERVER。
- 任务侧栏可见、名称清晰、权限握手通过、精确租约存在，四项同时成立才可执行写入。
- 固定任务为只读时保持 `permission_blocked`；不得让隐藏子代理、内部 successor、临时任务或 worktree 代写。
- 确需替换固定任务时，新任务必须对用户可见；规划先登记新任务 ID，再冻结旧任务，任何时刻同角色最多一个可写 Owner。
- 领域文档缺权限同样阻塞；规划不得跨角色代写设计、契约、测试或部署产物。

## 7. 接力状态机

一个交付只允许以下阶段：

```text
Owner in_progress
  -> artifact_written
  -> planning_received
  -> reviewer_started
  -> reviewer artifact_written
  -> planning_received
  -> done 或定向返工
```

### `artifact_written`

Owner 提交八项以内的差量：任务/token、实际文件、行为、验证、失败、残留、边界、下一门。计划、预期和未运行测试不得写成通过。

### `planning_received`

规划必须在新 turn 中：

1. 原样确认 token；
2. 核对文件范围、证据和清理；
3. 写回 `CURRENT`/日志；
4. 决定 Reviewer 或返工 Owner；
5. 真正发送下一任务并确认新 turn。

### `reviewer_started`

Reviewer 回显同一 token、权限和独立路径后开始。Reviewer 不修改生产代码，不直接通知返工 Owner。

规划轮次结束前，如果仍有安全可执行的下一跳，必须先启动它。若规划轮次已经结束，文档不会自行唤醒后继；需要用户、自动化或新的规划消息再次启动。

## 8. 并行与文件锁

- 默认最多三个并行执行租约；规划只调度和审核，不领取业务实现租约。
- 并行执行者必须是注册表中的用户可见固定任务；内部子代理不参与本项目生产协作。
- 同一纵向切片可以并行 BACK、UI、只读审计，但依赖 BACK 契约的 FRONT 必须等待契约冻结。
- TEST 可先做只读矩阵，正式写测试必须等待生产文件冻结。
- 出现路径重叠时，后到任务等待；不得覆盖、重置或另建副本。
- 工作树脏是正常状态；所有任务只认自己的租约和差量。

## 9. 产品实现规则

- 每个业务状态有且只有一个服务端权威来源。
- 写命令使用稳定资源 ID、命令 ID、`Idempotency-Key` 和请求摘要。
- unknown 只 GET 同一身份，不自动重发 POST，不扫描列表猜测。
- 确定冲突清除旧意图并刷新权威事实；下一次用户动作使用新命令身份。
- 新路径成为权威时删除旧写路径和旧测试；不建立长期兼容层或前端第二状态源。
- UI 重复原语复用公共 Modal、Drawer、ErrorBlock、焦点与 pending 机制。

## 10. 验收闭环

1. Owner 跑定向测试、类型检查和必要构建；
2. 规划检查契约、边界、未运行项和证据；
3. UI 功能由 UI 做正式页面变化场景验收；
4. TEST 使用隔离数据库、生产构建和真实浏览器执行冻结矩阵；
5. 返工只跑变化场景及必要邻接边界；
6. 切片关闭或内部发布前仅运行一次完整 `pnpm check`；
7. P0 立即停止，其他缺陷完成一轮矩阵后集中交回。

测试不能修改生产实现；返工 Owner 不能直接要求 TEST 复验。所有跳转都回规划。

## 11. 恢复与中断

| 事件 | 处理 |
| --- | --- |
| 账号/模型/Provider/重启 | 递增 `authority_generation`，重做权限与消息探针，从原停点续接 |
| 固定任务只读 | `permission_blocked`，暂停工作包，等待该可见任务恢复或显式登记可见替代任务 |
| 发送成功但无新 turn | `notification_pending`，重试一次后 `notification_blocked` |
| 执行器失败 | 保留停点，不改业务代码掩盖宿主故障 |
| 同一根因两次修复失败 | 停止局部补丁，重新审查状态源与时序 |
| 用户暂停 | 停止新动作，保留租约、证据和已发命令身份 |

已发写命令在任何恢复场景都只能查询原身份，不得因换账号、任务或模型重复提交。

## 12. 外部动作与服务器

购买、续费、部署、DNS/TLS、防火墙、Secret、真实供应商、付费、COS/Sentry、提交/推送和破坏性操作必须有用户明确授权。

服务器问题统一进入 `docs/testing/TEST-SERVER-ISSUES.md`，状态只按 `new -> confirmed -> fixing -> retest -> closed`；重新出现追加 `reopened`。SERVER 只复现、部署和收证，不修改生产业务代码。

## 13. 用户简报

规划只在以下节点主动汇报：

- 一个切片进入实现、验收、部署或完成；
- 连续完成 2–3 次跨角色接力；
- 出现 P0/P1、外部授权或交付风险；
- 用户主动询问。

简报固定说明：现在在哪、完成了什么、谁在运行、阻塞、下一步、哪些结论尚未验证。不得把 FIFO 数、同步版本或代理数量当成功能进度。

## 14. 快速唤醒模板

```text
读取 AGENTS.md、WORKFLOW.md v6.1、CURRENT.md 顶部和本租约列出的输入。
先回执 handoff_token、authority_generation、repo_root、permission_profile、ordinary_writes、allowed_paths 与 overlap。
权限未通过则零修改转 observer；通过后只从 predecessor 停点继续。
不要改模型/推理强度，不要写 CURRENT/开发日志，不要自选任务。
```
