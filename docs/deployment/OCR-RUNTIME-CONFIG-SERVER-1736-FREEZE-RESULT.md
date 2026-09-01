artifact_written: true

# OCR-RUNTIME-CONFIG-SERVER-1736-FREEZE

## outcome

```yaml
outcome: local_release_bundle_frozen
slice_outcome: passed
goal_gap: six exact files are frozen locally; they are not uploaded, installed, or executed on qimao-test-server
release_id: ocr-runtime-config-20260901-r1
schema: qimao.application-release/v2
employee_static_mode: preserve
migration: gated
migration_schema: 1754976037000_add_screen_text_runtime_config
frozen_files: 6
application_inbound_files: 4
server_connections: 0
remote_transfers: 0
fixed_entry_installations: 0
application_release_executions: 0
migration_attempts: 0
service_restarts: 0
database_reads: 0
database_writes: 0
provider_calls: 0
cos_writes: 0
real_ocr_calls: 0
next_owner: 规划
requires_user: true — the next task needs one direct platform confirmation covering the exact six-file upload, atomic fixed-entry installation, and one fixed-entry release invocation on qimao-test-server
```

1735 的唯一 fixed runner/validator 身份保持不变；本任务没有修改 fixed 源码或业务实现。当前审核候选已构建为 release `ocr-runtime-config-20260901-r1`，应用 archive 的顶层闭集严格为 `backend/ + system-static/`，员工 `static/` 成员为 0。v2 声明使用 `employeeStatic.mode=preserve` 并把员工 target 锁定到当前 1727 指针；backend 与管理员站派生到新的 immutable target，migration 仅允许 gated 执行 `1754976037000_add_screen_text_runtime_config`。

本任务没有连接服务器，没有 SSH、上传、root、安装、固定入口调用、迁移、数据库、重启、Provider、COS 或真实 OCR 动作。

## exact frozen approval set

下一次平台确认的完整不可变集合共六项：两个 fixed 安装输入，加四项 application inbound。`SHA256SUMS` 的闭合集只覆盖 declaration、archive、migration helper 三项；fixed 文件不进入每轮 inbound，也不能被发布批次覆盖。

| role | exact path | bytes | SHA-256 |
| --- | --- | ---: | --- |
| fixed runner | `deploy/debian/bin/qimao-application-release` | 39,799 | `b44236b0ea880822a7b6af2425f9f4f1f06a75d4961db15a9e02793142f2c5bf` |
| fixed validator | `deploy/debian/bin/application-release-declaration.mjs` | 22,440 | `449f3bbc4d66946d92bc174ddfd7cf98b54dc86e2d42f570514e7dedbc7f8fe0` |
| declaration | `deploy/ocr-runtime-config-release-1736/application-release.declaration.json` | 1,111 | `6b08358a0de68ad4462abea2842d3dd47bb96d18329211d41e1cbe8d4c2137d4` |
| archive | `work/ocr-runtime-config-20260901-r1.tar.gz` | 8,967,309 | `7eee0746fddcfb69acc95145e82bbe46c338cd11c8d12b1e6fbba73800386bec` |
| migration helper | `deploy/ocr-runtime-config-release-1736/db-migration-gate.mjs` | 10,002 | `83c26bbfed3b08bc17e9d9da3021462ef819faba72bd5775328974fa7ead80f5` |
| payload checksums | `deploy/ocr-runtime-config-release-1736/SHA256SUMS` | 295 | `cdeffbec8bae00b97addb220631939d9d561ae0cba6a9ed2fe5a8c1bec470a8c` |

唯一发布冻结目录是 `deploy/ocr-runtime-config-release-1736/`，只含 declaration、helper、SHA 三项；唯一 archive 使用 runner 由 release id 强制派生的 basename，保存在 `work/ocr-runtime-config-20260901-r1.tar.gz`。两个 fixed 文件继续使用 1735 冻结的唯一源码路径，没有复制临时 runner 或 validator。

## declaration and baseline contract

validator 的 normalized emit 已逐项对账：

```text
release_id=ocr-runtime-config-20260901-r1
previous_backend=/opt/qimao-terms-cloud/releases/asr-budget-default-off-20260901-r1
next_backend=/opt/qimao-terms-cloud/releases/ocr-runtime-config-20260901-r1
employee_static_mode=preserve
previous_static=/srv/qimao-terms-cloud/frontend-asr-budget-default-off-20260901-r1
next_static=/srv/qimao-terms-cloud/frontend-asr-budget-default-off-20260901-r1
previous_system_static=/srv/qimao-terms-cloud/system-frontend-asr-budget-default-off-20260901-r1
next_system_static=/srv/qimao-terms-cloud/system-frontend-ocr-runtime-config-20260901-r1
asr=active/running/0/0
screen_text=inactive/dead/0/0
openvino=active/running/0/0
system_probe=/api/system-control/engines expected_status=403
migration=gated schema=1754976037000_add_screen_text_runtime_config
employee_static_markers=0
system_static_markers=3
```

管理员静态 marker 精确为 `OpenVINO 抽帧配置`、`抽帧间隔（毫秒）`、`每集最大帧数`，均存在于本轮 production build 和最终 archive 的 `system-static/assets/`。声明没有 `previousStaticTarget` 或 `candidate.staticMarkers`；archive 没有 `static/`。

上述 previous targets 与 unit 状态来自 1727 已审核项目快照，本任务没有把它们冒充为新鲜远端读取。下一次获批执行仍必须先由 fixed runner 的 baseline gate 在副作用前逐字复核实际指针、unit、health、probe、锁和残留；任一漂移即零切换失败。

## migration gate

`db-migration-gate.mjs` 复用成熟 gated migration 数据流：

- `--before` 要求 `1754976036000_default_budget_enforcement_off` 已应用、6037000 未应用，且候选 migrations 与 `schema_migrations` 的 pending 差集精确只有 6037000；
- `--after` 要求 6037000 身份恰好一条；`screen_text_batches` 与 `screen_text_attempts` 各有 nullable `jsonb runtime_config` 和 `varchar(64) runtime_config_digest`；
- after gate 同时核对两个 snapshot check constraint、扩展后的 `engine_deployment_versions_values_valid`、两个 enabled immutable trigger 及唯一 trigger function `reject_screen_text_runtime_config_update`；
- helper 只通过候选 backend 的 `pg` 连接数据库，不读取或输出连接串/Secret。runner 仍使用 systemd 原生 `EnvironmentFile` 和 qimao 身份执行 before/migrate/after。

helper syntax 与纯本地自测通过，唯一成功输出为 `helper_self_test=passed`。本任务没有设置 `DATABASE_URL`，也没有执行 before/after 或任何数据库读写。

## fresh local verification

```text
Node=v24.19.0 pnpm=11.21.0 Python=3.14.7 Git-Bash=5.2.37
backend typecheck=passed
system-frontend typecheck=passed
backend production build=passed (contracts + backend tsc + sidecars)
system-frontend production build=passed (Vite 45 modules)
pnpm deploy=passed production packages:170 reused:170 downloaded:0 supply-chain-lock:169
portable candidate gate=passed backend_entries:5 imports:6 employee_static:preserve system_static_markers:3
runner bash syntax=passed
runner self-test（PowerShell 7 + Git Bash 5.2.37，`MSYS=winsymlinks:sys`）=runner_self_test=passed cases=19 statuses=401,403 employee=replace,preserve preserve_rollback=guarded
validator node syntax=passed
validator self-test={"outcome":"passed","cases":36,"schemas":["qimao.application-release/v1","qimao.application-release/v2"]}
declaration validate={"outcome":"passed","releaseId":"ocr-runtime-config-20260901-r1","migration":"gated"}
SHA closed-set={"outcome":"passed","files":3}; actual hashes=passed
helper node syntax=passed; helper_self_test=passed
migration node syntax=passed
archive_audit=passed members:14926 regular:11355 directories:2190 symlinks:476 hardlinks:905
archive_closed_set=passed roots:backend,system-static employee_static_members:0 expected_migration:1 future_migrations:0 migration_files:52 backend_entries:5 system_static_markers:3
encoding=UTF-8 no BOM, LF, CR bytes:0
```

最终 archive 使用现有 portable-closure 的 reparse/symlink、hardlink 与越界规则生成；内嵌于 fixed runner 的同字节 archive gate 已直接审计最终文件。一次临时闭集断言最初把 6037000 本身误判为 future migration，纠正临时比较逻辑后同一冻结 archive 通过；没有放宽 archive 或 runner 合同。最终冻结前重新物化同一 production closure，并在其 staging 上先通过五入口、六 import 和 marker 门后生成当前唯一 archive；预冻结 archive 已替换，未保留第二包。

规划独立复核补充：Windows plain Git-Bash 的临时符号链接语义会令 `readlink -f` 返回链接自身，从而产生退出码 1；这不是目标 Debian 上的 runner 失败。使用冻结时相同的 `MSYS=winsymlinks:sys` 后，规划复跑得到上述 19-case 成功输出。该 Windows 模拟证据不能替代目标 Debian 原生 symlink 自测；下一次外部动作仍须在安装切换前由目标机运行同一 self-test，失败即恢复旧 fixed，应用发布次数保持 0。

## one future external action

后续只需在动作所在的同一 SERVER 任务取得一次直接平台确认，确认对象必须逐字包含上表六个路径、bytes、SHA 和既有 `qimao-test-server`。确认后按单一路径连续执行：

1. 上传并原子安装两个 fixed 文件，远端逐字复核 bytes/SHA/owner/mode/links，执行 Bash/Node syntax 与同一 self-test；失败恢复旧 fixed 并精确清理，应用发布次数保持 0。
2. 仅把 declaration、archive、helper、SHA 四项放入 `/var/tmp/qimao-application-release-inbound`，复核 owner/mode、精确文件集、actual SHA、声明 emit 与 lock/baseline。
3. 已安装 fixed 前门全部通过后，只调用一次 `/usr/local/sbin/qimao-application-release /var/tmp/qimao-application-release-inbound`；失败不重试，由同一 runner 自动回滚三个可变指针并精确清理。6037000 若已通过 after gate则按既有策略保留，不能执行 down。
4. 终态只读验收 backend 与管理员站新指针、员工指针逐字未变、backend 单次 restart、ASR/OpenVINO PID 与 unit 保持、screen 仍 inactive、health/root/engines probe、6037000 唯一及 runtime-config 列/约束/trigger；不发起真实 OCR 素材任务。

这四步是一次已冻结外部操作的内部顺序，不是四次授权，也不允许第二次 fixed-entry 调用。

## remaining gap and residual

规划下一步只需审核本文档及六项身份；若接受，应把用户导航到执行动作所在的同一 SERVER 任务完成一次直接确认。未经该确认不得上传、安装或发布，也不得使用旧 v2.1 fixed、一次性 runner、手工 symlink 或拆分发布绕过 preserve 合同。

本任务只新增 `deploy/ocr-runtime-config-release-1736/` 三个冻结文件、唯一 archive 和本文档。临时 production staging 已按专用系统临时目录边界精确删除；`work/` 中本 release basename 只有一个最终 archive。既有脏树未 reset、checkout、clean、stash、commit 或 push。
