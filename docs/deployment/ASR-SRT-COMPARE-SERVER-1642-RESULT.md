# ASR-SRT-COMPARE-SERVER-1642-R1

## artifact

```yaml
artifact_written: true
outcome: blocked
slice_outcome: rolled_back
blocker: BACKEND_RESTART_OR_HEALTH_FAILED
goal_gap: 1650 候选已安全回滚，尚未成为生产 current/static；线上 bundle marker 与未认证 compare API 门未运行；backend 回滚后 NRestarts=5
next_owner: BACK/BACK-PLANNER
requires_user: false
```

## outcome

1650 在当前用户直接批准后完成唯一 SCP（3 文件），并启动唯一文件化 root runner。runner 通过 payload、baseline 和 candidate gates，原子切换新 backend/static 后仅尝试重启 `qimao-backend.service`；候选主进程以 status `1/FAILURE` 退出，systemd 自动重试 5 次后仍未通过稳定性门，runner 立即恢复 old current/static/backend 并完成清理，最终输出 `BACKEND_RESTART_OR_HEALTH_FAILED rollback=passed cleanup=passed`。

回滚后的新鲜只读复核确认：current=`/opt/qimao-terms-cloud/releases/ai-recovery-1607-r3`、static=`/srv/qimao-terms-cloud/frontend-ai-hotfix-1552`；backend/ASR/OCR 为 `active/running`，screen-text 为 `inactive/dead`；health、员工根页和 ASR 深链均为 `200`。backend 的 systemd `NRestarts=5` 是本次候选前向失败留下的精确计数；未执行额外 reset/restart。未认证 compare API 与线上 bundle marker 未进入 post-switch gate。

## frozen candidate

| artifact | bytes | SHA-256 |
| --- | ---: | --- |
| `work/asr-srt-compare-20260831-r1.tar.gz` | 15,108,491 | `e434f8ada6223505e4e4d406b8a11c1fbaed130c64337066a6b13464e4af0135` |
| `deploy/asr-srt-compare-1642/runner.sh` | 12,554 | `d6aee9ce2a4425b95f77295c15a897d59a2d0e031fe9bda2fb024f70b6209f1c` |
| `deploy/asr-srt-compare-1642/SHA256SUMS` | 177 | `e1184ddf9f6625f516fa2a12598ac5823f7091b46b27578b11d76b69056b196e` |

- archive 创建时间早于本任务；本片只消费规划已复核候选，没有重建或生成第二 archive。
- archive 共 `87,170` members，仅含 `backend/` 与 `static/`；绝对路径、`..` 路径、意外顶层成员均为 `0`。
- 类型为 regular=`18,801`、directory=`13,594`、internal hardlink=`54,775`；hardlink 的绝对/`..`/缺失目标均为 `0`。
- 五个真实入口均通过 Node `v24.19.0` 的 `--check`：`server`、ASR Worker、screen-text Worker、pre-review Worker、term-extraction Worker。
- static 为 `index.html + 3 assets`；bundle 命中“查看 SRT 对照”和“抽样集：第 2 / 8 / 29 集”。
- runner 通过 Git Bash `5.2.37` 的 `bash -n`，CR bytes=`0`；只重启 backend，不重启 ASR/OCR/sidecar、不启动 screen-text Worker，不执行迁移、POST 或 psql。
- runner 先验证 old current=`ai-recovery-1607-r3`、old static=`frontend-ai-hotfix-1552`、四 unit 精确状态与新 release/static absent；切换后验证 health、未认证 compare API `401 JSON 非 HTML`、员工根页/ASR 深链、bundle marker，并要求 backend `MainPID` 连续 5 秒稳定且 `NRestarts=0`。任何门失败由同一 runner 恢复旧 current/static/backend 并精确清理。

## local execution note

在发现既有冻结 archive 前，本片误做了一次重复 backend build；pnpm 在实际编译开始前以 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` 停止，frontend build 与 `pnpm deploy` 均未开始，既有 archive bytes/SHA 未改变。该失败不构成新的候选，也未被用来覆盖规划已复核 archive。

runner 本地语法门首次发现既有 `api_content_type` 命令替换缺少闭合双引号；在外部动作前完成唯一语法纠错。同时把最终清理重新纳入回滚 trap，并增加 backend 5 秒稳定 PID 门。修正后 Bash/CR/固定路径/禁止动作门均通过；没有服务器现场补丁。

## switch / rollback / HTTP / unit

```yaml
production_baseline_runner: passed
new_release_gate: passed
new_static_gate: passed
current_switch: attempted_once_then_restored
static_switch: attempted_once_then_restored
rollback: passed
health_after_rollback: 200
unauthenticated_srt_compare: not_run_after_rollback
employee_root_after_rollback: 200
employee_asr_deep_link_after_rollback: 200
online_bundle_markers: not_run_after_rollback
backend_unit_after_rollback: active/running/NRestarts=5/ExecMainStatus=0
asr_unit_after_rollback: active/running/NRestarts=0/ExecMainStatus=0
screen_unit_after_rollback: inactive/dead/NRestarts=0/ExecMainStatus=0
ocr_unit_after_rollback: active/running/NRestarts=0/ExecMainStatus=0
```

回滚后的链接、HTTP 和 unit 字段均来自本轮新鲜只读复核；候选 post-switch compare API 与 bundle marker 因 backend 重启门失败而未运行。

## pre-approval history

```yaml
ssh_transfer_setup: 1
remote_empty_inbound_created: 1
scp_policy_rejection_before_process_start: 1
scp_process_started: 0
uploaded_files: 0
uploaded_bytes: 0
root_runner: 0
current_switch: 0
static_switch: 0
rollback: 0
backend_restart: 0
asr_restart: 0
ocr_restart: 0
sidecar_restart: 0
screen_worker_start: 0
database_writes: 0
route_writes: 0
budget_writes: 0
cos_calls: 0
provider_calls: 0
business_api_writes: 0
ssh_cleanup: 1
remote_empty_inbound_deleted: 1
```

## residual

- 服务器：固定入站目录、候选 release/static、stage 与 next link 均已由 runner/复核确认 absent；旧 current/static 保留，生产健康。
- 生产：新 current/static 已恢复；backend 前向重启失败后由同一 runner 重启旧 backend 并验证健康；ASR/OCR/sidecar 未重启，screen-text 未启动。backend 当前 `NRestarts=5` 为本次候选失败期间 systemd 自动重试计数，未做额外 reset/restart。
- 本地：保留唯一冻结 archive/wrapper、当前 runner、`SHA256SUMS` 与本结果文件；未创建第二候选。其余已有脏树原样保留。

## pre-approval R1 history

R1 收到经规划转述的批准后，重新完成一次固定入站目录创建；执行审批层仍在 SCP 进程启动前拒绝，理由是代理转述的批准不足以授权该敏感 archive 向具体目的地传输，要求当前用户在本任务中直接确认。随后用固定 SSH 清理空目录，删除并复核成功。R1 未修改 archive、runner 或 SHA 清单，也未启动 root runner。

```yaml
r1_transfer_setup: 1
r1_scp_policy_rejection_before_process_start: 1
r1_scp_process_started: 0
r1_uploaded_files: 0
r1_root_runner: 0
r1_cleanup: passed
```

累计本任务两次入站目录创建/删除均为空且已清理；累计 SCP 进程启动 `0`、上传字节 `0`、root runner `0`。

## approved execution evidence

```yaml
r1_transfer_setup: 1
r1_scp: 1
r1_uploaded_files: 3
r1_uploaded_bytes: 15121113
r1_root_runner: 1
r1_payload_gate: passed
r1_baseline_gate: passed
r1_candidate_gate: passed
r1_backend_restart_forward: 1
r1_backend_restart_rollback: 1
r1_asr_restart: 0
r1_ocr_restart: 0
r1_sidecar_restart: 0
r1_screen_worker_start: 0
r1_current_link_switches: 2
r1_static_link_switches: 2
r1_rollback: passed
r1_health_after_rollback: 200
r1_unauthenticated_compare: not_run
r1_provider_calls: 0
r1_cos_calls: 0
r1_database_writes: 0
r1_route_writes: 0
r1_budget_writes: 0
r1_residual: 0
```

## remaining gap (pre-1650 history)

候选未发布。首个确定失败点是 `qimao-backend.service` 前向 restart 的 systemd control process error；同一 runner 已安全回滚。禁止本片继续重试、现场修改 runner、重传或启动其他 Worker。下一步由 `PLANNER/BACK` 诊断该 backend restart 首因，形成新的候选/发布切片后再决定是否重试。

## DIAG-1649：backend restart 首因

```yaml
artifact_written: true
diagnosis: deployment_layout_mismatch
first_nonzero: ExecStartPre_read_gate_status_1
first_nonzero_time: 2026-08-31T18:25:00+08:00
next_owner: SERVER
requires_user: false
```

- 失败时段 root journal 的首个非零原始脱敏记录为：`qimao-backend.service: Control process exited, code=exited, status=1/FAILURE`，随后为 `Failed with result 'exit-code'`；没有 `Main process exited`、Node `SyntaxError`、`ERR_MODULE_NOT_FOUND`、listen 或数据库错误记录。
- systemd 有效 unit 的前置门和启动路径均固定为 `/opt/qimao-terms-cloud/current/backend/dist/server.js`（`deploy/debian/systemd/qimao-backend.service:17-18`）。回滚后的旧 current 以 `qimao:qimao`、`750/755/644` 通过同一读取门，证明 unit/旧基线本身可用。
- 候选 archive 顶层为 `backend/` 与 `static/`；runner 在 `deploy/asr-srt-compare-1642/runner.sh:215` 将 `unpack/backend/.` 平铺复制到 release 根，candidate gate 在 `:230` 也只检查 `release_stage/dist/server.js`。因此新 current 实际布局是 `current/dist/server.js`，而 systemd 前置门读取不存在的 `current/backend/dist/server.js`，直接以 status `1` 阻断启动。
- 归因：`candidate_code=false`、`release_artifact_identity=true`、`deployment_orchestration=true`。这是 SERVER runner 的 release-root 布局缺陷，不是 ASR/OCR/Provider/DB/route/budget 业务故障。
- 运行证据：同一 runner 回滚后 current/static 恢复；backend、ASR、OCR 为 `active/running/NRestarts=0`，screen-text 为 `inactive/dead`，health/员工根页/ASR 深链均 `200`；新 release/static/stage/next/inbound 均 absent。
- 外部副作用保持：诊断阶段 SSH 只读；未重启、未 SCP、未发布、未写 DB/route/budget/COS/Provider，也未修改候选或 runner。

最小下一 Owner：`SERVER` 先修正 release 布局契约（使 immutable release 保持 `backend/dist/...`，或在新 runner 中明确并验证 unit 期望路径），完成本地 archive/layout gate 与一次独立复核后，另签新的发布切片；不得在生产现场补目录或直接重放本候选。

## PREP-1650：release layout 修正

```yaml
artifact_written: true
outcome: local_candidate_ready
slice_outcome: passed
goal_gap: 仍需另签发布切片执行一次 SCP/root runner
next_owner: SERVER
requires_user: false
```

- 仅修改 `deploy/asr-srt-compare-1642/runner.sh` 与 `deploy/asr-srt-compare-1642/SHA256SUMS`；业务 archive、静态候选、业务源码均未改动。
- runner 现先创建 `$release_stage/backend`，再把 archive 的 `backend/.` 安装到 `$release_stage/backend/`；五个入口 gate 全部改为 `$release_stage/backend/dist/...`，最终 current 路径与 systemd 的 `/current/backend/dist/server.js` 对齐。
- 修正后 runner：`12,554` bytes，SHA-256=`d6aee9ce2a4425b95f77295c15a897d59a2d0e031fe9bda2fb024f70b6209f1c`；Git Bash `5.2.37` `bash -n` exit=`0`，CR bytes=`0`。
- `SHA256SUMS` 已同步 runner 新 SHA：`177` bytes，SHA-256=`e1184ddf9f6625f516fa2a12598ac5823f7091b46b27578b11d76b69056b196e`，CR bytes=`0`。
- archive 身份保持不变：`15,108,491` bytes，SHA-256=`e434f8ada6223505e4e4d406b8a11c1fbaed130c64337066a6b13464e4af0135`；未重建、未重打包、未执行 SSH/SCP/root/重启/Provider/COS/DB/route/budget 动作。
- 本地布局门通过：archive 仍含 `backend/dist/server.js`，runner 目标映射为 `new_release/backend/dist/server.js`；无 `$release_stage/dist/...` 旧平铺引用残留。

下一片只能在新的发布切片中消费新 runner/SHA 与原 archive；仍禁止现场补目录、重建 archive 或绕过 unit 路径契约。

## EXEC-1650：获批上传与 root runner 实际结果

```yaml
approval: current_user_direct
destination: 103.36.63.67
inbound: /var/tmp/qimao-asr-srt-compare-1642-inbound
archive_sha256: e434f8ada6223505e4e4d406b8a11c1fbaed130c64337066a6b13464e4af0135
runner_sha256: d6aee9ce2a4425b95f77295c15a897d59a2d0e031fe9bda2fb024f70b6209f1c
sha_manifest_sha256: e1184ddf9f6625f516fa2a12598ac5823f7091b46b27578b11d76b69056b196e
transfer_setup: 1
scp: 1
uploaded_files: 3
uploaded_bytes: 15121113
root_runner: 1
payload_gate: passed
baseline_gate: passed
candidate_gate: passed
backend_restart_forward_command: 1
backend_auto_restart_attempts: 5
backend_restart_rollback_command: 1
asr_restart: 0
ocr_restart: 0
sidecar_restart: 0
screen_worker_start: 0
current_link_switches: 2
static_link_switches: 2
terminal: blocked
blocker: BACKEND_RESTART_OR_HEALTH_FAILED
rollback: passed
cleanup: passed
health_after_rollback: 200
employee_root_after_rollback: 200
employee_asr_after_rollback: 200
unauthenticated_compare: not_run
online_bundle_markers: not_run
database_writes: 0
route_writes: 0
budget_writes: 0
cos_calls: 0
provider_calls: 0
business_api_writes: 0
fixed_inbound_absent: true
new_release_absent: true
new_static_absent: true
stage_and_next_absent: true
```

### 失败首因：候选 production closure 缺少可解析的 `@tus/utils`

- root runner 已通过修正后的 `backend/dist/...` layout gate；这次不再是 DIAG-1649 的 release-root 布局问题。
- 远端只读 journal 显示候选 backend 首次启动后 `Main process exited, status=1/FAILURE`，systemd 随后自动重试计数 `1..5`；没有 control-process/layout 错误。runner 在第五次失败后恢复旧 current/static/backend。
- 远端只读 `backend.error.log` 的候选首个确定应用错误为：`Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@tus/utils' imported from /opt/qimao-terms-cloud/releases/asr-srt-compare-20260831-r1/backend/node_modules/@tus/server/dist/server.js`。
- 本地 archive 只读核对显示：`@tus/server` package 声明依赖 `"@tus/utils": "^0.7.1"`；归档虽含 `.pnpm/.../@tus/utils`，但不含 Node 从扁平化的 `backend/node_modules/@tus/server` 解析所需的 `backend/node_modules/@tus/utils` 或 `backend/node_modules/@tus/server/node_modules/@tus/utils`。因此这是 production closure/link topology 缺陷，不能由 runner 在生产现场补目录。
- 归因：`release_artifact_identity=true`、`deployment_orchestration=false`、`candidate_runtime_closure=false`。候选已回滚，当前线上旧版本保持可用；不得重传、重跑、现场改 runner 或 reset `NRestarts`。

下一 Owner：`BACK/PLANNER` 重新生成并独立复核 self-contained backend production closure（至少覆盖 `@tus/utils` 的实际 Node resolution），形成新的 archive/SHA/runner 发布切片后再决定是否重试。
