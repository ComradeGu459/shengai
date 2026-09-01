artifact_written: true

# OCR-RUNTIME-CONFIG-SERVER-1734

## outcome

```yaml
outcome: blocked
slice_outcome: blocked
goal_gap: existing fixed v2.1 cannot express an atomic backend + system-static release while preserving the employee static pointer unchanged
blocking_code: FIXED_ENTRY_TOPOLOGY_MISMATCH
local_builds: 0
archives_created: 0
remote_reads: 0
remote_transfers: 0
fixed_entry_installations: 0
application_release_executions: 0
migration_attempts: 0
service_restarts: 0
database_writes: 0
provider_calls: 0
cos_writes: 0
real_ocr_calls: 0
rollback: not_required_effects_zero
next_owner: 规划
requires_user: true — continuing requires explicit approval to change either the employee-pointer constraint or the fixed declaration/runner contract
```

1734 在本地发布拓扑预检命中新的单一首因，已按任务停止条件终止。没有构建候选、创建 archive、连接 SSH、上传文件、读取 Secret、执行 6037000、切换指针、重启服务或调用固定入口；因此没有需要回滚的外部副作用。

## blocking evidence

任务要求同时满足：

1. 原子切换 backend 与管理员静态站；
2. 员工站指针完全不切换；
3. 只复用 1727 已安装的 fixed v2.1；
4. 不修改 runner、架构或业务代码。

现有 fixed v2.1 无法表达该组合：

- validator 对任何声明都派生 `nextStaticTarget=/srv/qimao-terms-cloud/frontend-<release-id>`，并以 `STATIC_TARGET_NOT_NEW` 拒绝 next 与 previous 相同；
- v2 candidate 必须包含员工 `staticMarkers`，archive gate 也要求 v2 顶层同时存在 `backend/`、`static/`、`system-static/`；
- runner 在 migration 后无条件创建新的 employee static 目录、设置 `static_switched=1` 并执行 `mv -Tf "$STATIC_NEXT" "$STATIC_LINK"`；
- post-switch 又无条件要求 `/srv/qimao-terms-cloud/frontend` 解析到新派生目录；
- v1 虽然不含管理员静态站，但因此不能完成 system-static 发布。

即使把当前员工站资产原样复制进 `static/`，员工 symlink 仍会从当前 `frontend-asr-budget-default-off-20260901-r1` 切换到新的 `frontend-<1734-release-id>`，依然违反“员工站不切换”，也不能冒充指针未变。省略 `static/`、复用当前 release id、预建链接或手工分两次切换都会被现有声明/archive/baseline 门拒绝，或绕过唯一固定入口，均不在授权范围。

## current project facts used

本轮重读 `docs/status/CURRENT.md` 的 `v4-1734`：当前 backend、员工站、管理员站均为 `asr-budget-default-off-20260901-r1`；1727 已成功，ASR/OpenVINO PID 在该发布中未变，screen-text 保持 inactive，固定发布残留为 0。以上是项目当前快照，不是本轮重新连接服务器所得；本轮没有产生新的外部事实或主机写入。

已审核业务候选事实仍在工作区：migration `1754976037000`、backend OCR runtimeConfig 与管理员页面实现可检索到；但由于 fixed-entry topology 门在构建前已确定失败，本轮没有运行构建、归档或 migration helper，不能把源码存在写成可发布候选已冻结。

## remaining_gap

规划必须先选择并获得明确授权的单一修订方向：

1. 允许员工站随同发布切换到内容相同的新 immutable static 目录，继续复用现有 fixed v2.1；或
2. 新开 fixed-entry 设计/安装任务，使声明严格支持 `employeeStatic: preserve`，并补 validator/runner 自测、旧 v1/v2 兼容、三指针 rollback 与远端安装授权。

在选择完成前不得为 1734 制作 payload、上传、执行 migration 或调用固定入口。不得使用一次性 runner、手工链接、单独静态复制或并行试路规避该门。

## residual

仅写入本文档。既有 1727 fixed 源码、1726 payload、业务脏树和历史结果均未修改；未 reset、checkout、clean、stash、commit 或 push。远端 effects=`0`，rollback=`not_required`。
