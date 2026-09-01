artifact_written: true

# OCR-RUNTIME-CONFIG-SERVER-1737-EXEC

## outcome

```yaml
outcome: passed
slice_outcome: passed
goal_gap: none within this release slice; administrator acceptance remains with planning and no real OCR task was started
release_id: ocr-runtime-config-20260901-r1
schema: qimao.application-release/v2
employee_static_mode: preserve
fixed_install_preflight_attempts: 2
fixed_entry_installations: 1
fixed_swaps: 1
application_release_executions: 1
backend_restarts: 1
database_writes: 1
migration: gated
migration_schema: 1754976037000_add_screen_text_runtime_config
asr_restarts: 0
openvino_restarts: 0
screen_starts: 0
provider_calls: 0
cos_writes: 0
route_writes: 0
budget_writes: 0
real_ocr_calls: 0
rollback: not_required_release_passed
next_owner: 规划
requires_user: false
```

用户在本 SERVER 任务中直接确认了精确六项身份和既有 `qimao-test-server` 后，六项冻结文件已用一次 SCP 批次上传。目标 Debian 原生 runner/validator/helper/archive 门通过，新 fixed 完成原位原子安装；application inbound 精确为 declaration、archive、helper、SHA 四项，固定入口已且仅已调用一次。

发布成功应用 migration `1754976037000_add_screen_text_runtime_config`，backend 与管理员站切换到 `ocr-runtime-config-20260901-r1`，员工站指针逐字保持 1727 target。backend 只重启一次；ASR/OpenVINO PID 未变，screen-text Worker 保持 inactive，没有处理 OCR 队列或调用 Provider/COS/真实 OCR。

## frozen files and installed identities

| role | local source | bytes | SHA-256 | remote result |
| --- | --- | ---: | --- | --- |
| fixed runner | `deploy/debian/bin/qimao-application-release` | 39,799 | `b44236b0ea880822a7b6af2425f9f4f1f06a75d4961db15a9e02793142f2c5bf` | `/usr/local/sbin/qimao-application-release`, `root:root 0750`, regular, links=`1` |
| fixed validator | `deploy/debian/bin/application-release-declaration.mjs` | 22,440 | `449f3bbc4d66946d92bc174ddfd7cf98b54dc86e2d42f570514e7dedbc7f8fe0` | `/usr/local/libexec/qimao-application-release-declaration.mjs`, `root:root 0750`, regular, links=`1` |
| declaration | `deploy/ocr-runtime-config-release-1736/application-release.declaration.json` | 1,111 | `6b08358a0de68ad4462abea2842d3dd47bb96d18329211d41e1cbe8d4c2137d4` | inbound consumed and removed |
| archive | `work/ocr-runtime-config-20260901-r1.tar.gz` | 8,967,309 | `7eee0746fddcfb69acc95145e82bbe46c338cd11c8d12b1e6fbba73800386bec` | inbound consumed and removed |
| migration helper | `deploy/ocr-runtime-config-release-1736/db-migration-gate.mjs` | 10,002 | `83c26bbfed3b08bc17e9d9da3021462ef819faba72bd5775328974fa7ead80f5` | installed inside immutable release as `.db-migration-gate.mjs`, `root:qimao 0640`, links=`1` |
| payload checksums | `deploy/ocr-runtime-config-release-1736/SHA256SUMS` | 295 | `cdeffbec8bae00b97addb220631939d9d561ae0cba6a9ed2fe5a8c1bec470a8c` | inbound consumed and removed |

上传暂存的六项均先核对为 `qimao-deploy:qimao-deploy 0600`、regular、links=`1`，bytes/SHA 为 6/6 精确匹配。四项 inbound 再次核对 actual SHA 和 validator 闭合集 `files=3`，没有额外 helper、runner 或第二 archive。

## pre-release baseline

严格基线使用 fixed runner 的真实 `/health` 路径重新核对后通过：

```text
fixed runner=33479/dc125c82a770e8c6dead2a514cc64346460f417298400ab1c4fbf2e06022506c
fixed validator=17424/3582da5267d3233352ae82a1fc50bd5382552f2aab78f88966f698dbe8a2dc18
backend_pointer=/opt/qimao-terms-cloud/releases/asr-budget-default-off-20260901-r1
employee_pointer=/srv/qimao-terms-cloud/frontend-asr-budget-default-off-20260901-r1
system_pointer=/srv/qimao-terms-cloud/system-frontend-asr-budget-default-off-20260901-r1
backend=active/running/0/0 pid=892628
asr=active/running/0/0 pid=694703
screen=inactive/dead/0/0 pid=0
openvino=active/running/0/0 pid=842128
health/employee-root/employee-asr/system-root/system-budgets=200/200/200/200/200
unauth_engines=403/application-json/nonhtml
release_lock=unheld
inbound/runtime/candidate/stage/next=absent
```

首次独立只读脚本误探测受保护的 `/api/health`，得到 401；该脚本中的 `&&` 列表又使失败未立即终止，因此其 `remote_preflight=passed` 输出作废。随即在任何上传/安装前改用 fixed runner 的精确 `/health` 路径，并把断言拆成独立 `test`，得到上列权威 200 基线。没有把错误探针结果当作发布依据。

## Debian native fixed gate and installation

目标 Debian `/bin/bash` 的原生 symlink self-test 输出精确为：

```text
runner_self_test=passed cases=19 statuses=401,403 employee=replace,preserve preserve_rollback=guarded
```

validator Node syntax 与 36-case v1/v2 self-test、declaration gated validate、SHA closed-set、helper syntax/self-test、实际 `sha256sum -c` 和最终 archive 内嵌安全门均通过：

```text
archive_audit=passed members:14926 regular:11355 directories:2190 symlinks:476 hardlinks:905
```

第一次 fixed 安装预检把 validator 暂存为无扩展名 `validator.new`，Node 24 以 `ERR_UNKNOWN_FILE_EXTENSION` 在任何目标交换前拒绝。终态为 `install_started=0`、`rollback=not_required`、application execution=`0`，旧 fixed 两项 SHA/owner/mode、三指针和六项上传文件随后重新核对未变，安装 stage 已清理。修正为保留 `.mjs` 的 `validator.new.mjs` 后，同一原子安装路径完成唯一 fixed swap，并在安装目标上再次通过 Debian 原生 runner/validator self-test。

一次临时只读 recovery 命令还曾因 PowerShell 引号展开而没有形成有效断言；它未执行写操作。随后改用无插值的 stdin 脚本重新核对，权威结果为 `old_fixed:retained app_execution:0 transfer:6 pointers:unchanged`。上述两次 harness 修正都发生在 fixed entry 调用前，不构成发布重试。

## single fixed-entry execution

固定入口调用次数精确为一次，exit=`0`，完整关键输出为：

```text
payload_gate=passed release:ocr-runtime-config-20260901-r1 migration:gated fixed_entry:passed declaration:passed sha:closed
baseline=passed backend:active/running/0/0 asr:active/running/0/0 screen:inactive/dead/0/0 openvino:active/running/0/0 health:200 employee:200/200 employee_static:preserve system_static:true
archive_audit=passed members:14926 regular:11355 directories:2190 symlinks:476 hardlinks:905
candidate_gate=passed backend_entries:5 employee_static:preserve static_markers:0 system_static:true system_static_markers:3 imports:6
migration=passed schema:1754976037000_add_screen_text_runtime_config
post_switch=passed health:200 unauth_ocr_runtime_config_engines:403/json/nonhtml employee:200/200 employee_static:preserve system_static:true backend:active/running/0/0/stable_pid_5s asr:active/running/0/0 screen:inactive/dead/0/0 openvino:active/running/0/0
terminal=passed release:/opt/qimao-terms-cloud/releases/ocr-runtime-config-20260901-r1 static:/srv/qimao-terms-cloud/frontend-asr-budget-default-off-20260901-r1 employee_static:preserve system_static:/srv/qimao-terms-cloud/system-frontend-ocr-runtime-config-20260901-r1 backend_restart:1 db_write:1 migration:gated schema_retained:1754976037000_add_screen_text_runtime_config cos_write:0 route_write:0 budget_write:0 provider_calls:0 asr_restart:0 openvino_restart:0 screen_start:0
```

helper before gate 只允许 pending 6037000；migrate 成功后，runner 的 after gate 已核对 migration 身份、四个 runtime-config snapshot 列、三个 check constraint 和两个 immutable trigger。发布后又以同一 immutable helper 执行一次只读 after gate，输出精确为：

```text
db_gate=after passed schema=1754976037000_add_screen_text_runtime_config
```

## final state

```text
fixed_runner=39799/b44236b0ea880822a7b6af2425f9f4f1f06a75d4961db15a9e02793142f2c5bf root:root/0750/links1
fixed_validator=22440/449f3bbc4d66946d92bc174ddfd7cf98b54dc86e2d42f570514e7dedbc7f8fe0 root:root/0750/links1
backend_pointer=/opt/qimao-terms-cloud/releases/ocr-runtime-config-20260901-r1
employee_pointer=/srv/qimao-terms-cloud/frontend-asr-budget-default-off-20260901-r1
system_pointer=/srv/qimao-terms-cloud/system-frontend-ocr-runtime-config-20260901-r1
backend=active/running/0/0 pid=902359 stable
asr=active/running/0/0 pid=694703 unchanged
screen=inactive/dead/0/0 pid=0 unchanged
openvino=active/running/0/0 pid=842128 unchanged
health/employee-root/employee-asr/system-root/system-budgets/system-engines=200/200/200/200/200/200
unauth_engines=403/application-json/nonhtml
system_static_markers=3/3
migration=1754976037000_add_screen_text_runtime_config applied_unique_after_gate
```

员工指针在 baseline、runner terminal、发布后只读验收和清理后终验中均逐字等于 `/srv/qimao-terms-cloud/frontend-asr-budget-default-off-20260901-r1`。不存在 `/srv/qimao-terms-cloud/frontend-ocr-runtime-config-20260901-r1`，员工 stage/`.next` 从未保留。

## residual and remaining gap

已消费的 `/var/tmp/qimao-ocr-runtime-config-1737-transfer` 在逐项复核六项 SHA 后精确删除，不可恢复。application inbound、runner runtime、fixed install stage、三个 `.next`、backend/employee/system stage、意外 employee candidate 及本 release 的 transient systemd units 均为 absent；全局 lock 为 `root:root 0600 0B` 且 unheld。

有意保留的新 immutable backend release、管理员静态 release、已安装 fixed 和 release 内只读 migration helper；旧 backend、员工站和管理员站 target 保留为回滚事实。本任务没有 reset、checkout、clean、stash、commit、push，也没有读取或输出 Secret。

本发布切片无剩余服务器缺口，`requires_user=false`。规划可继续管理员站 OCR 参数的只读/人工验收；不得把本次上线自动扩展为真实 OCR 素材任务、启动 screen-text Worker、处理既有队列或调用 Provider/COS。
