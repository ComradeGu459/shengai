artifact_written: true

# RELEASE-ASR-BUDGET-SERVER-1727

## outcome

```yaml
outcome: passed
slice_outcome: passed
goal_gap: none
release_id: asr-budget-default-off-20260901-r1
schema: qimao.application-release/v2
fixed_entry_installations: 1
application_release_executions: 1
backend_restarts: 1
database_writes: 0
migration: none
helper_uploaded: false
asr_restarts: 0
openvino_restarts: 0
screen_starts: 0
provider_calls: 0
cos_writes: 0
route_writes: 0
budget_writes: 0
real_recognition_calls: 0
secret_reads: 0
next_owner: 规划
requires_user: false
```

用户在本 SERVER 任务中直接授权后，1726 冻结的 fixed runner/validator 和三项 application inbound 已上传到既有 `qimao-test-server`。两个 fixed 文件完成原位原子安装；应用固定入口已且仅已调用一次，`migration.mode=none`，没有上传 helper、没有再次执行 6036000，也没有数据库写。backend、员工站、管理员站三个指针均切换到 `asr-budget-default-off-20260901-r1`，全部后置门和清理门通过。

## frozen identities and remote installation

| artifact | bytes | SHA-256 | remote result |
| --- | ---: | --- | --- |
| `deploy/debian/bin/qimao-application-release` | 33,479 | `dc125c82a770e8c6dead2a514cc64346460f417298400ab1c4fbf2e06022506c` | `/usr/local/sbin/qimao-application-release`, `root:root 0750`, regular, links=`1` |
| `deploy/debian/bin/application-release-declaration.mjs` | 17,424 | `3582da5267d3233352ae82a1fc50bd5382552f2aab78f88966f698dbe8a2dc18` | `/usr/local/libexec/qimao-application-release-declaration.mjs`, `root:root 0750`, regular, links=`1` |
| `deploy/asr-budget-default-off-release-1726/application-release.declaration.json` | 1,365 | `eea531921b8bfffa9c8322c715c8820db24a033d2be261a54e3c4413f5eedd3c` | application inbound，已由固定入口清理 |
| `work/asr-budget-default-off-20260901-r1.tar.gz` | 9,764,557 | `056409a6b2ea23ee3f1bd8da39f41ad1786f8f343e78be394c8d2f217b921efc` | application inbound，已由固定入口清理 |
| `deploy/asr-budget-default-off-release-1726/SHA256SUMS` | 211 | `4ed0eebaba30ec5441ff7830d8e46a8f796f992a3c49447026374cc6461030ec` | application inbound，已由固定入口清理 |

远端安装前后均执行 runner `/bin/bash -n`、9 项 `--self-test`，以及 validator Node syntax、24 项 v1/v2 self-test。应用 inbound 文件集精确为 declaration/archive/SHA 三项；声明 validator 输出 migration=`none`，SHA closed-set 输出 files=`2`，emit 精确得到 `probe_expected_status=403`、`migration_mode=none`、空 migration helper。`db-migration-gate.mjs` 不存在于 inbound，也没有被上传。

## pre-release baseline

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
release_lock=unheld
inbound/runtime/candidate-final/next=absent
```

## single fixed-entry execution

固定入口调用次数精确为一次，exit=`0`：

```text
payload_gate=passed release:asr-budget-default-off-20260901-r1 migration:none fixed_entry:passed declaration:passed sha:closed
baseline=passed backend:active/running/0/0 asr:active/running/0/0 screen:inactive/dead/0/0 openvino:active/running/0/0 health:200 employee:200/200 system_static:true
archive_audit=passed members:14927 regular:11475 directories:2192 symlinks:476 hardlinks:784
candidate_gate=passed backend_entries:5 static_markers:2 system_static:true system_static_markers:3 imports:6
post_switch=passed health:200 unauth_budget_overview:403/json/nonhtml employee:200/200 system_static:true backend:active/running/0/0/stable_pid_5s asr:active/running/0/0 screen:inactive/dead/0/0 openvino:active/running/0/0
terminal=passed release:/opt/qimao-terms-cloud/releases/asr-budget-default-off-20260901-r1 static:/srv/qimao-terms-cloud/frontend-asr-budget-default-off-20260901-r1 system_static:/srv/qimao-terms-cloud/system-frontend-asr-budget-default-off-20260901-r1 backend_restart:1 db_write:0 migration:none schema_retained:none cos_write:0 route_write:0 budget_write:0 provider_calls:0 asr_restart:0 openvino_restart:0 screen_start:0
```

`schema_retained:none` 表示本次 runner 没有尝试或声明 migration；6036000 已在 1725 执行并通过严格 after gate的数据库事实不受本次发布影响。1727 没有读取数据库 environment file、没有创建 migration transient unit，也没有执行数据库命令。

## final verification

```text
backend_pointer=/opt/qimao-terms-cloud/releases/asr-budget-default-off-20260901-r1
employee_pointer=/srv/qimao-terms-cloud/frontend-asr-budget-default-off-20260901-r1
system_pointer=/srv/qimao-terms-cloud/system-frontend-asr-budget-default-off-20260901-r1
backend=active/running/0/0 pid=892628 stable_5s=true
asr=active/running/0/0 pid=694703 unchanged=true
screen=inactive/dead/0/0 pid=0
openvino=active/running/0/0 pid=842128 unchanged=true
health/employee-root/employee-asr/system-root/system-budgets=200/200/200/200/200
unauth_budget_overview=403/application-json/nonhtml
fixed_runner_validator=identity-and-self-test-passed
release_lock=unheld
residual=zero
```

首次终验读取 root-only fixed 文件、随后非特权解析 backend release 目标时分别被主机权限边界拒绝；两次均为只读断言，未调用发布入口或 service。改用 `sudo -n` 读取相同事实后全部通过，不构成重试发布。

## remaining_gap

无本任务范围内缺口。应用、员工站和管理员站已发布；backend 仅重启一次，ASR/OpenVINO PID 未变化，screen-text 保持停止，403 JSON non-HTML 探针和五项 HTTP 验收通过。后续业务验收或版本登记由规划接手；本任务不自动执行真实识别、预算命令、Provider/COS 调用、Git commit/push 或第二次发布。

## residual

远端固定 v2.1 文件和三个新 release 目录按设计保留。application inbound、release runtime、fixed 安装 stage/runtime、三个 `.next` 和三个 candidate stage 均不存在；固定全局 lock 文件保留且未占用。工作区既有脏树未 reset、checkout、clean、stash、commit 或 push。
