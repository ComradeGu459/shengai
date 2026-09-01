artifact_written: true

# ASR-BUDGET-RELEASE-SERVER-PREP-1725

## outcome

```yaml
outcome: rolled_back
slice_outcome: blocked
goal_gap: application release is not active; migration 6036000 is retained, while all three application pointers were restored after the fixed post-switch probe required 401 but the frozen route contract returns 403
release_id: asr-budget-default-off-20260901-r1
schema: qimao.application-release/v2
migration: 1754976036000_default_budget_enforcement_off
migration_state: applied_retained_unique
remote_read_only_checks: passed_after_rollback
remote_transfer_batches: 4
fixed_entry_installations: 1
application_release_executions: 1
backend_restart_commands: 2
asr_restarts: 0
openvino_restarts: 0
screen_starts: 0
secret_reads: 0
provider_calls: 0
cos_writes: 0
route_writes: 0
real_recognition_calls: 0
requires_user: true — a new mutually consistent frozen runner/declaration and probe contract must be approved before any second release execution
next_owner: 规划
```

用户在本 SERVER 任务直接授权后，fixed v2 已安装到既有固定路径，四件套也已上传、逐件校验，并且固定发布入口已且仅已调用一次。6036000 migration 及其严格 after gate 通过并按 runner 约定保留；随后 post-switch 门因冻结 runner 要求未认证探针必须为 `401`、而冻结候选路由明确返回 `403` 而失败。runner 已恢复 backend、员工站、管理员站三个旧指针，重启旧 backend 并清除 inbound、runtime、候选目录与 `.next`；应用发布未生效，不得把本轮写成发布成功。

## fixed-entry v1 baseline and v2 extension

安装前远端固定入口是 1722 已发布的 v1 身份：

| target | bytes | SHA-256 | identity |
| --- | ---: | --- | --- |
| `/usr/local/sbin/qimao-application-release` | 26,672 | `6b2097610b50dfbb4ad9dd26b95ba8d375ded4fc87c8994ba0aaa69da2ceabbb` | `root:root 0750`、links=`1` |
| `/usr/local/libexec/qimao-application-release-declaration.mjs` | 11,469 | `4f064446c09ce40f4b27f980620377d25d813782d0ce237d72694c8a7ef3c3c3` | `root:root 0750`、links=`1` |

该 v1 只支持 `backend/ + static/`，不能冻结或切换管理员静态站。本地既有固定入口已按同一公开入口做最小 v2 扩展，没有新增一次性 runner：

- v1 声明仍只接受 backend + 员工站，已用 1721 真实声明与 SHA 清单回归通过；
- v2 声明新增唯一 `previousSystemStaticTarget`、`systemStaticMarkers` 与派生 `system-frontend-<release-id>`；
- v2 归档顶层严格增加 `system-static/`；候选门验证管理员 `index/assets/markers`；
- `/srv/qimao-terms-cloud/system-frontend.application-release.next` 使用同样的 `ln + mv -Tf` 原子指针切换；任一后续门失败由同一 rollback 同时恢复 backend、员工、管理员三个旧指针，并精确清理三个 stage/new/next；
- 固定入口仍只重启 backend；ASR、screen-text、OpenVINO 仅做状态/PID 保持门，不启动、停止或重启。

本地 fixed v2 身份：

| artifact | bytes | SHA-256 |
| --- | ---: | --- |
| `deploy/debian/bin/qimao-application-release` | 32,630 | `af38d24e0d9c9722cfd7aba44a7ae0f0a8e9feb41ad31d8ece477fa8777e1b27` |
| `deploy/debian/bin/application-release-declaration.mjs` | 14,872 | `dc78058e15f1e4f8b5e0ec06d3cf463f243dd9e5c1ba0a32a99f6b15e573eb02` |

validator 的 Node syntax、17 项 v1/v2 self-test、v1 真实声明回归、v2 候选声明与闭合 SHA 文件集均通过；固定文件和声明/SHA/helper 均为 UTF-8 无 BOM、LF、CR bytes=`0`。本机没有 Bash/WSL，故 fixed runner 的 `/bin/bash -n` 必须在上传后的安装前门执行，未把 Node 结果冒充 Bash 通过。

远端安装终态与本地冻结身份一致：runner/validator 均为 `root:root 0750`、regular file、links=`1`，SHA-256 分别为 `af38d24e...e1b27` 与 `dc78058e...3eb02`；远端 `/bin/bash -n`、Node syntax 和 17 项 v1/v2 self-test 均通过。两次安装预检分别因命令转义和临时文件缺少 `.mjs` 扩展而在交换前安全停止，旧 v1 哈希均复核完整、暂存均清理；第三次以保留 `.mjs` 扩展的门禁完成原位升级，没有创建或保留一次性 runner。

## local build and portable closure

本轮新鲜 `pnpm run build` exit=`0`：contracts/backend/sidecars 构建完成，员工站 Vite 为 198 modules，管理员站为 45 modules。首次 `pnpm deploy --legacy` 因两个 workspace 外链被自包含门拒绝，失败归档自动删除；随后同一候选使用 pnpm 11 injected workspace 模式，170 个生产依赖全部从本机 store 复用、下载为 0，形成没有工作区外链的 portable backend。

本地五个 backend 入口 `node --check` 与六项 portable import 全部通过。员工站两个预算阻断 marker、管理员站三个预算默认关闭/启停 marker 均逐字存在于构建资产。

归档身份与结构：

```text
archive=work/asr-budget-default-off-20260901-r1.tar.gz
bytes=9764557
sha256=056409a6b2ea23ee3f1bd8da39f41ad1786f8f343e78be394c8d2f217b921efc
members=14927
regular=11475
directories=2192
symlinks=476
hardlinks=784
roots=backend,static,system-static
duplicates=0
6036000_members=1
```

归档通过 fixed runner 内嵌的同字节 Python archive gate：无绝对/控制字符/`..`/反斜杠路径，无非法类型、跨根链接或悬空链接。6036000 在候选迁移集中恰好一份，上一迁移为 6035000。

## declaration, migration gate and SHA

固定 inbound 四件套：

| inbound basename | local source | bytes | SHA-256 |
| --- | --- | ---: | --- |
| `application-release.declaration.json` | `deploy/asr-budget-default-off-release-1725/application-release.declaration.json` | 1,432 | `1ce4e26b0ae6c9da859fcc945a7ddc30e568fd3bf2be11f0ef7974bd21a3603c` |
| `asr-budget-default-off-20260901-r1.tar.gz` | `work/asr-budget-default-off-20260901-r1.tar.gz` | 9,764,557 | `056409a6b2ea23ee3f1bd8da39f41ad1786f8f343e78be394c8d2f217b921efc` |
| `db-migration-gate.mjs` | `deploy/asr-budget-default-off-release-1725/db-migration-gate.mjs` | 7,953 | `d5e386209b2a9039da9fd48d45c65c79db0f9c817a09cc35840174a9fe793112` |
| `SHA256SUMS` | `deploy/asr-budget-default-off-release-1725/SHA256SUMS` | 299 | `a486b0ab39d4cb551ba427ce5b9f3a38a2192ff67a25a6ca8851cf0231f1939e`（前三项闭合；不递归列入自身） |

helper 的 Node syntax 与 self-test 通过。真实 before 门只接受 6035000 已应用、6036000 是唯一 pending，且 development active budget 精确为既有 v3/硬门开启/没有管理员显式启用审计。after 门要求：6036000 在 `schema_migrations` 恰好一条；`enforcement_enabled` 仍为非空 boolean/default false；`budget_reservations.budget_policy_version_id` 已为 nullable UUID；immutable trigger 有效；所有仍为 true 的策略均有创建时显式启用审计；development active v3 已归一为 false。

## fresh remote read-only baseline before execution

```text
current=/opt/qimao-terms-cloud/releases/pre-review-acceptance-release-20260901-r1
employee=/srv/qimao-terms-cloud/frontend-pre-review-acceptance-release-20260901-r1
system=/srv/qimao-terms-cloud/system-frontend-ai-hotfix-1552
backend=active/running/0/0 pid=873405
asr=active/running/0/0 pid=694703
screen=inactive/dead/0/0 pid=0
openvino=active/running/0/0 pid=842128
health/employee-root/employee-asr/system-budgets=200/200/200/200
release_lock=root:root/0600/0B/unheld
inbound/runtime/current.next/static.next/system-static.next=absent
```

上述检查没有读取 environment file、Secret 或业务行，也没有执行迁移、链接切换、service 命令或业务 API 写入。全局 lock 是固定协调文件而非本轮 transient，当前未被占用。

## authorized execution and rollback evidence

四件套远端文件集精确为 4 项，均为 `qimao-deploy:qimao-deploy 0600`、regular file、links=`1`；四项 SHA-256 与上表一致。helper syntax/self-test 通过，fixed v2 validator 的 declaration + SHA closed-set 门返回 `{"outcome":"passed","files":3}`。

固定入口只调用一次：

```text
payload_gate=passed release:asr-budget-default-off-20260901-r1 migration:gated fixed_entry:passed declaration:passed sha:closed
baseline=passed backend:active/running/0/0 asr:active/running/0/0 screen:inactive/dead/0/0 openvino:active/running/0/0 health:200 employee:200/200 system_static:true
archive_audit=passed members:14927 regular:11475 directories:2192 symlinks:476 hardlinks:784
candidate_gate=passed backend_entries:5 static_markers:2 system_static:true system_static_markers:3 imports:6
migration=passed schema:1754976036000_default_budget_enforcement_off
terminal=blocked code=POST_SWITCH_GATE_FAILED rollback=passed cleanup=passed migration_attempted:1 schema_retained:1754976036000_default_budget_enforcement_off
```

`migration=passed` 只有在 after helper 确认 `schema_migrations` 中 6036000 恰好一条、列/默认值/trigger/active development v3 归一全部满足后才会输出，因此 migration 已应用且唯一；失败路径按固定策略不逆向撤销 schema。候选 backend 首次重启后进入 post-switch 门，失败回滚又重启旧 backend，共执行 2 次 backend restart 命令，不满足“成功发布只重启一次”的验收条件。ASR、OpenVINO 未重启，screen-text 未启动，没有 provider/COS/route/budget command 或真实识别调用。

post-switch 的确定阻断条件是冻结契约不一致：fixed runner 在 `deploy/debian/bin/qimao-application-release:766` 强制未认证探针为 `401`，而候选 `backend/src/modules/system-control/system-control.routes.ts:602-605` 明确声明 `403` 并调用 `forbidden(...)`。回滚后的真实无认证 GET 也返回 `403 application/json; charset=utf-8` 且 non-HTML。没有通过改 runner、改声明、带鉴权或手工绕门来冒充成功。

回滚后新鲜只读终验：

```text
backend_pointer=/opt/qimao-terms-cloud/releases/pre-review-acceptance-release-20260901-r1
employee_pointer=/srv/qimao-terms-cloud/frontend-pre-review-acceptance-release-20260901-r1
system_pointer=/srv/qimao-terms-cloud/system-frontend-ai-hotfix-1552
backend=active/running/0/0 pid=891165
asr=active/running/0/0 pid=694703
screen=inactive/dead/0/0 pid=0
openvino=active/running/0/0 pid=842128
health/employee-root/employee-asr/system-root/system-budgets=200/200/200/200/200
unauth_budget_overview=403/application-json/nonhtml
inbound/runtime/upgrade-stage/current.next/static.next/system-static.next=absent
backend/employee/system candidate and stage directories=absent
release_lock=root:root/0600/0B/unheld
```

## remaining_gap

应用目标尚未发布，三个应用指针仍是发布前版本；数据库 migration 6036000 已应用并保留。继续前必须由规划重新冻结一个互相一致的探针契约：要么 fixed runner 接受该路由既有的 `403/json/nonhtml`，要么候选后端经业务/API owner 审核后统一改为 `401`。任何方案都必须形成新的不可变身份、重跑 v1/v2 回归并取得新的明确发布授权；不得复用本轮 inbound（已清理），也不得自动重试已执行过一次的固定入口。

## residual

远端 fixed v2 保留在两个既有固定路径；6036000 schema 保留。应用 inbound/runtime、fixed-v2 upgrade stage、三个 `.next`、三个候选 stage 和三个候选最终目录全部不存在；全局固定 lock 文件保留且未占用。工作区仍只保留一个冻结候选/archive、fixed v2 源码、声明/helper/SHA、portable packager 的可选 `system-static` 支持、部署索引更新和本文档；没有第二归档。既有脏树和历史 release 原样保留，未 reset、checkout、clean、stash、commit 或 push。
