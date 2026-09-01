# TERM-CONTROL-IDENTITY-AUDIT-05 结果

`artifact_written=true`；`outcome=artifact_written`；本片仅执行一次只读 SSH 会话，未传包、建 staging、改权限、改文件、改服务、改数据库或调用外部业务系统。

## evidence

- SSH 使用项目 OpenSSH config/alias，唯一会话 exit=`0`；root 只读 shell `outer_uid=0`。
- OS 身份：`qima` 与 `qimao` 均存在；`qima` 的主组/附加组均为 `qima`，`qimao` 的主组/附加组均为 `qimao`。两者 shell 均为 `nologin`。
- 四个目标实例的 effective metadata 均为 `User=qimao`、`Group=qimao`、`DynamicUser=no`、空 `SupplementaryGroups`：
  - `qimao-backend.service`：active/running，FragmentPath 为 backend unit，UnitFileState=`disabled`。
  - `qimao-worker@term-extraction.worker.entry.js.service`：inactive/dead，FragmentPath 为 `qimao-worker@.service`。
  - `qimao-worker@system-control.secret-validation.worker.entry.js.service`：inactive/dead，FragmentPath 为 `qimao-worker@.service`。
  - `qimao-worker@system-control.connection-test.worker.entry.js.service`：inactive/dead，FragmentPath 为 `qimao-worker@.service`，现有连接测试 drop-in 仍存在。
- 远端直接查询未加载的裸模板 `qimao-worker@.service` 返回 `unit_show_exit=1`；这不改变四个已实例化 unit 的 effective 身份。仓库模板 `deploy/debian/systemd/qimao-worker@.service` 的 source contract 为 `User=qimao`、`Group=qimao`，与实例化事实一致。
- 当前 current 指向 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`；release 根为 `root:qimao`、mode=`750`。五个真实入口均为 regular file、`root:qimao`、mode=`640`：storage、ASR runtime、ASR worker entry、app、server。
- `/etc/qimao-terms-cloud` 为 `root:qimao 750`；`backend.env` 为 `root:qimao 640`、`776` bytes；`object-storage.env` 为 `root:qimao 640`、`421` bytes。未读取任何 env 内容；目录/入口的 `namei -l` 仅用于元数据核对。
- qima 对 current、release、backend/dist、五个入口、env 目录及两份 env 的所有对应 `test -x/-r` 均 exit=`1`。
- qimao 对同一组路径的所有对应 `test -x/-r` 均 exit=`0`。
- 本地权威对照：`deploy/debian/systemd/qimao-backend.service`、`deploy/debian/systemd/qimao-worker@.service` 与 `docs/deployment/TENCENT-ASR-SERVER-05R-IDENTITY-FIX.md` 均固定 canonical business identity 为 `qimao:qimao`。

## unique_cause

`qima` 是遗留 OS 用户/组，无法穿透当前 `root:qimao`、0750/0640 的 release 与 env 权限边界；`qimao` 是当前实际 unit、仓库模板、部署文档和所有可读性门共同使用的唯一身份。因此此前若以 qima 运行发布/业务检查，会稳定得到权限失败；这不是候选业务代码或外部系统故障。

## canonical_identity

```yaml
business_user: qimao
business_group: qimao
bootstrap_user: qimao-deploy
worker_template_user: qimao
worker_template_group: qimao
legacy_identity: qima:qima
fallback_allowed: false
```

不提出创建、删除或变更用户/组，也不放宽 0750/0640 到 0755/0644。

## release_contract

- release root 与入口：`root:qimao`；目录 0750；普通文件 0640；qimao 逐级 `x` 与入口 `r` 必须通过。
- backend/object-storage env：`root:qimao 0640`；只由 canonical `qimao` 运行的 unit/业务流程消费。
- 四个新目标 unit 与 worker template：`User=qimao`、`Group=qimao`、`DynamicUser=no`，不新增 supplementary group。
- 既有 qima 用户/组仅作为审计对象，不作为 fallback、替代身份或发布目标。

## remaining_gap

当前四项目标 unit 中 backend active，其余三个为 inactive/dead，属于当前部署状态事实；本片没有启动或修改服务。裸 template 的远端 `systemctl show` 不可直接加载，但实例化 unit 与仓库 source contract 已提供同一身份证据。若继续发布，应由规划另签使用 `qimao` 的单次 Runbook 任务。

## next_owner

`PLANNING`：将 `qima:qima` 权限失败归因冻结为遗留身份不匹配；后续如解冻发布，只允许沿用 `qimao:qimao`，不得添加双轨 fallback。

## residual

```yaml
ssh_sessions: 1
remote_writes: 0
staging_created: 0
files_changed: 0
permissions_changed: 0
services_changed: 0
database_writes: 0
external_calls: 0
secret_values_read: 0
material_residual: 0
```

`requires_user=false`。
