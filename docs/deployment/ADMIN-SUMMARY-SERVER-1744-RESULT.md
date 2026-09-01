artifact_written: true

# ADMIN-SUMMARY-SERVER-1744

## outcome

```yaml
outcome: blocked
slice_outcome: local_release_bundle_frozen_remote_execution_not_started
blocker: preflight_harness_field_order_assumption
release_id: admin-summary-20260901-r1
schema: qimao.application-release/v2
employee_static_mode: preserve
migration: none
frozen_files: 3
remote_transfer_batches: 0
application_release_executions: 0
backend_restarts: 0
database_writes: 0
route_writes: 0
budget_writes: 0
engine_writes: 0
provider_calls: 0
cos_writes: 0
worker_starts: 0
residual_from_this_task: 0
next_owner: 规划
requires_user: true
```

1744 候选已在本地冻结为唯一 declaration/archive/SHA 三件套；archive 顶层严格只有 `backend/ + system-static/`，员工静态成员为 0，migration 精确为 `none`。本地产品测试、两端类型检查和生产构建、portable 闭包、fixed validator/runner 与 archive gate 全部通过。

远端上传前只读门在核对 unit 状态时停止。根因是本任务的临时只读脚本假设 `systemctl show --value` 按 `ActiveState/SubState/Result/ExecMainStatus/MainPID` 输出，目标机实际输出为 `MainPID/Result/ExecMainStatus/ActiveState/SubState`；因此脚本对完全健康的值执行了错误字符串匹配。这不是 fixed runner、候选、服务或服务器状态漂移。

任务卡规定前置门出现一次失败即停止回规划、不做 Rn 补丁。本轮据此没有修改临时脚本后继续发布，没有 SCP、inbound、fixed 安装、fixed-entry 调用、指针切换、重启或数据库/route/budget/engine/Provider/COS/真实任务写入。

## files

| role | path | bytes | SHA-256 |
| --- | --- | ---: | --- |
| declaration | `deploy/admin-summary-release-1744/application-release.declaration.json` | 1,028 | `c9313b556496d128070ad539deb66eccf11f3e7e914332398cf572a312ca26b5` |
| archive | `work/admin-summary-20260901-r1.tar.gz` | 8,963,703 | `76e2774720d288ef5115604d883790126aee649a9470f98ec73d1c8200c903bb` |
| checksum closure | `deploy/admin-summary-release-1744/SHA256SUMS` | 202 | `c5a5534fb082aac3e596357f39da86fa24b23c76fe5365d481437e7f199f9de1` |

复用但未上传、未安装的既有 fixed 身份：

| role | path | bytes | SHA-256 |
| --- | --- | ---: | --- |
| fixed runner | `deploy/debian/bin/qimao-application-release` | 39,799 | `b44236b0ea880822a7b6af2425f9f4f1f06a75d4961db15a9e02793142f2c5bf` |
| fixed validator | `deploy/debian/bin/application-release-declaration.mjs` | 22,440 | `449f3bbc4d66946d92bc174ddfd7cf98b54dc86e2d42f570514e7dedbc7f8fe0` |

`SHA256SUMS` 的闭集只有 declaration 与 archive 两项；`migration.mode=none`，不存在 helper。validator 返回 `files=2`。声明锁定：

```text
previous_backend=/opt/qimao-terms-cloud/releases/ocr-runtime-config-20260901-r1
next_backend=/opt/qimao-terms-cloud/releases/admin-summary-20260901-r1
employee_static_mode=preserve
employee_target=/srv/qimao-terms-cloud/frontend-asr-budget-default-off-20260901-r1
previous_system_static=/srv/qimao-terms-cloud/system-frontend-ocr-runtime-config-20260901-r1
next_system_static=/srv/qimao-terms-cloud/system-frontend-admin-summary-20260901-r1
system_probe=/api/system-control/overview expected_status=403
migration=none
```

管理员静态 marker 为 `系统运行正常`、`最近 24 小时处理量`、`当前需要处理的原因`、`处理当前问题`，分别覆盖“是否正常、处理多少、失败原因、下一步”。

## local evidence

```text
targeted tests=2 files / 19 tests passed
backend typecheck=passed
system-frontend typecheck=passed
backend production build=passed
system-frontend production build=passed modules:45
pnpm deploy=passed production packages:170 reused:170 downloaded:0 supply-chain-lock:169
portable candidate=passed roots:backend,system-static backend_entries:5 imports:6 markers:4
validator syntax=passed
validator self-test=passed cases:36 schemas:v1,v2
declaration validate=passed release:admin-summary-20260901-r1 migration:none
SHA closed-set=passed files:2 actual_hashes:passed
runner bash syntax=passed
runner self-test=passed cases:19 statuses:401,403 employee:replace,preserve preserve_rollback:guarded
archive_audit=passed members:14926 regular:11522 directories:2190 symlinks:476 hardlinks:738
archive_closed_set=passed roots:backend,system-static employee_static_members:0 migration_files:52 latest:1754976037000
```

第一次尝试从 1737 archive 在 Windows 工作树解包并做差量覆盖，因该 Linux archive 的 symlink 不能在当前 Unicode 路径下还原而在任何覆盖/新归档前停止。专用 partial stage 随即在已验证的 `work/` 边界内精确删除。最终冻结 archive 由此前已通过的 pnpm injected portable 闭包重新物化，临时 stage 在 archive 审计后精确删除；没有第二 archive。

## remote read-only evidence

失败后的无断言只读快照证明底层远端事实没有漂移：

```text
fixed runner=39799/b44236b0ea880822a7b6af2425f9f4f1f06a75d4961db15a9e02793142f2c5bf root:root/0750/links1
fixed validator=22440/449f3bbc4d66946d92bc174ddfd7cf98b54dc86e2d42f570514e7dedbc7f8fe0 root:root/0750/links1
backend_pointer=/opt/qimao-terms-cloud/releases/ocr-runtime-config-20260901-r1
employee_pointer=/srv/qimao-terms-cloud/frontend-asr-budget-default-off-20260901-r1
system_pointer=/srv/qimao-terms-cloud/system-frontend-ocr-runtime-config-20260901-r1
backend=pid902359 success/0 active/running
asr=pid694703 success/0 active/running
screen=pid0 success/0 inactive/dead
openvino=pid842128 success/0 active/running
health/employee-root/employee-asr/system-root/system-overview=200/200/200/200/200
unauth_overview=403/application-json
```

诊断脚本在输出上述白名单事实后，其 residual 循环又因 stdin 末尾解析错误停止；没有执行写操作。本文不把未执行的全局 residual 断言冒充为已通过，仅确认本任务从未创建远端文件、unit、inbound、runtime、candidate、stage 或 `.next`，因此 `residual_from_this_task=0`。

## remaining gap

新 release 尚未上传或发布，三条应用指针、backend PID 和三个 preserved Worker 均保持 1737 状态。规划若继续，应新签一个只消费上表已冻结三件套的动作任务：先使用字段名显式解析而非依赖 `systemctl --value` 顺序，完成一次只读基线与全局 residual 门；门通过后只上传这三项并调用既有 fixed 入口一次。不得重建 archive、修改 fixed、添加 migration helper、生成员工静态、现场补丁或第二发布路线。

若平台仍要求远端写动作在执行任务内确认，用户只需确认上表三项 bytes/SHA、既有 fixed 两项身份、目标 `qimao-test-server` 以及“上传三项并调用 fixed 入口一次”这一唯一动作；不得重复传输本轮，因为本轮传输次数为 0。

本地保留唯一冻结三件套与本文；临时 stage 为 0。既有脏树未 reset、checkout、clean、stash、commit 或 push。
