artifact_written: true

# SCREEN-TEXT-REVIEW-SERVER-1750-FREEZE

## outcome

```yaml
outcome: blocked
slice_outcome: no_candidate_frozen
blocker: existing_fixed_contract_cannot_declare_system_static_preserve
release_id: screen-text-review-20260901-r1
server_connections: 0
remote_transfers: 0
database_writes: 0
service_restarts: 0
fixed_entry_executions: 0
next_owner: 规划
residual: 0
requires_user: true
```

1750 要求当前 backend portable 闭包加员工 frontend 生产静态，同时要求管理员站声明 `preserve`，并且只能复用既有 fixed v2.1 声明/validator/runner。现有 fixed 合同无法表达这个组合，故按“唯一首因即停”规则没有创建无效候选，也没有运行后续构建、归档、上传或服务器动作。

## contract evidence

现有 `deploy/debian/bin/application-release-declaration.mjs` 与 `deploy/debian/bin/qimao-application-release` 的可表达状态只有：

- schema v2 的 `employeeStatic.mode=preserve`：员工站保持旧指针；但 schema v2 强制 `system-static` 启用、声明 `previousSystemStaticTarget`/新管理员目标和 `systemStaticMarkers`，随后会切换管理员站。
- schema v1：没有 `system-static` 字段或管理员站 preserve 合同；只能替换员工 `static/`，管理员站不在声明中。

runner 的 emit 门明确要求 schema v2 的 `system_static_enabled=true` 时 `old_system_static`、`new_system_static` 和管理员 markers 均存在；同时仅对 `employee_static_mode` 识别 `replace|preserve`。因此“员工 static replace + 管理员 system-static preserve”既不能由 v2 声明，也不能由 v1 声明安全实现。

1750 所需的目标指针组合应为：

```text
backend: /opt/qimao-terms-cloud/releases/admin-summary-20260901-r1 -> /opt/qimao-terms-cloud/releases/screen-text-review-20260901-r1
employee static: /srv/qimao-terms-cloud/frontend-asr-budget-default-off-20260901-r1 -> new screen-text-review target
system static: /srv/qimao-terms-cloud/system-frontend-admin-summary-20260901-r1 -> unchanged (preserve)
```

其中最后一项没有现有声明字段或 fixed 原子切换分支可承载。添加字段、修改 fixed 或引入第二发布流程均超出本任务“复用既有 fixed、不改业务源码”的边界。

## files

本轮没有生成或冻结 declaration、archive、SHA256SUMS；没有可供后续动作任务消费的候选文件。既有 fixed 源码未改动，既有 `admin-summary-20260901-r1` 发布产物未改动。

## remaining_gap

规划需先裁决并形成新的不可变发布合同：

1. 允许 fixed/validator 增加独立的 `systemStatic.mode=preserve`（需新身份、新自测和新发布授权）；或
2. 将本切片目标改为现有合同可表达的组合（例如员工 preserve、管理员 system-static replace）；或
3. 明确管理员站 preserve 只是口头约束并接受 schema v1 不声明该事实（不建议默默采用）。

在裁决前不得运行本地归档、上传、部署或假装冻结成功。服务器连接、写入、迁移、重启、Worker、Provider、COS 和真实任务均为 0；本地只新增本结果文档，未 reset、checkout、clean、stash、commit 或 push。
