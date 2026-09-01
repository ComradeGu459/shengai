# ASR-SRT-COMPARE-SERVER-PREP-1655

## outcome

```yaml
artifact_written: true
outcome: local_candidate_ready
slice_outcome: passed
remote_actions: 0
next_owner: PLANNER
requires_user: false
```

本轮仅在本地复核并冻结 r2 三件套；未执行 SSH、SCP、root runner、服务器读取、重启或业务写入。Windows 不解包 POSIX symlink，不把本机能力边界误判为 archive 失败。

## frozen artifacts

| artifact | bytes | SHA-256 |
| --- | ---: | --- |
| `work/asr-srt-compare-20260831-r2.tar.gz` | 9,301,722 | `4c818ae7e70673a7658f4ee857f910bc2e8755b8cdfbfb0ecff0ec54ad847e47` |
| `deploy/asr-srt-compare-1642/runner.sh` | 13,594 | `dd1ed93969b386f805a86544230798f87213bdc61b11c14df5018ba69ee31358` |
| `deploy/asr-srt-compare-1642/SHA256SUMS` | 177 | `91f008f0c3a9e729afe39bdb305e2575529dbb0f5417b136837f9182e81d643d` |

`SHA256SUMS` 内容已更新为 r2 archive 与当前 runner 的 SHA；archive 未重建、runner 仅更新 r2 release/static/bytes/SHA 绑定。

## archive audit

```yaml
members: 14918
regular: 11347
directories: 2190
posix_symlinks: 476
internal_hardlinks: 905
top_level: backend,static
member_absolute_or_traversal: 0
symlink_unsafe_or_missing_target: 0
hardlink_unsafe_or_missing_target: 0
```

- `backend/node_modules/@tus/server` → `../.pnpm/@tus+server@2.4.4/node_modules/@tus/server`。
- `backend/node_modules/.pnpm/@tus+server@2.4.4/node_modules/@tus/utils` → `../../../@tus+utils@0.7.1/node_modules/@tus/utils`。
- 五个入口均在 archive 中：`backend/dist/server.js`、ASR、screen-text、pre-review、term-extraction worker；`static/index.html` 与 3 个 asset 文件存在。
- 静态 bundle 命中“查看 SRT 对照”及“抽样集：第 2 / 8 / 29 集”标记。

## runner gates

```yaml
runner_binding: r2 archive/release/static
bash_syntax: passed
bash_version: 5.2.37
cr_bytes: 0
legacy_release_root_dist_reference: 0
candidate_import_gate: present_before_atomic_switch
candidate_imports: tus/server, storage, asr-runtime, asr-worker, app, server
backend_baseline_gate: active/running/nonnegative_NRestarts/ExecMainStatus=0
backend_post_switch_gate: exact_old_backend_state_including_NRestarts
forbidden_remote_or_business_actions: 0
```

runner 仍复用 1642 成熟原子切换/回滚合同，只将 archive、release、static、next/stage 目标切到 r2；未修改业务源码、既有回滚目标或旧 runner 分支。

## remaining_gap

Windows 本地未执行真实 Node import；下一发布片必须在 Linux staging 以真实路径验证 `@tus/server`、`@tus/utils` 与五入口 import 后，才可签发新的 SCP/root runner execution。当前禁止服务器上传或发布。

## residual

- 本地保留 r2 archive、当前 runner、`SHA256SUMS` 与本结果文件。
- 未创建临时解包树、未修改业务源码、未调用 Secret/Provider/COS/DB/route/budget。
- 未提交、未推送、未清理用户既有脏树。

## DIAG-1657：BASELINE_GATE_FAILED 唯一首因

```yaml
artifact_written: true
diagnosis: backend_NRestarts_counter_only
remote_readonly: true
remote_writes: 0
provider_calls: 0
business_writes: 0
runner_modified: false
next_owner: PLANNER
requires_user: false
```

root 只读复核确认 current=`/opt/qimao-terms-cloud/releases/ai-recovery-1607-r3`、old release/static 均存在且类型正确；r2 new release/static、两处 stage、两处 next、固定 inbound 与 runtime 均 absent。health、员工根页和 ASR 深链均为 `200`。

四个 unit 实际值如下：

```yaml
backend: active/running/NRestarts=5/ExecMainStatus=0
asr: active/running/NRestarts=0/ExecMainStatus=0
screen_text: inactive/dead/NRestarts=0/ExecMainStatus=0
ocr_openvino: active/running/NRestarts=0/ExecMainStatus=0
```

runner 基线门要求 backend 精确为 `active/running/0/0`；因此本次 `BASELINE_GATE_FAILED` 的唯一不满足项是 backend `NRestarts=5`。current/static、目录残留、其他 unit 和 HTTP 门均不是首因。`NRestarts=5` 是 1650 候选前向启动失败留下的计数；本诊断未 reset-failed、未重启、未重跑，也不把清零计数当作修复。

最小本地修正不是放宽 `NRestarts=0` 门，而是等待新的候选发布切片在独立 Linux import/staging 门通过后，使用可观测的稳定健康基线再执行；随后由 PREP-1658 将 runner 改为捕获并锁定当前非负计数，仍拒绝任何发布期间的计数增量。

## PREP-1658：稳定 backend 基线快照

```yaml
artifact_written: true
remote_actions: 0
archive_changed: false
import_gate_changed: false
backend_baseline: active/running/nonnegative_NRestarts/ExecMainStatus=0
rollback_gate: exact_old_backend_state_including_NRestarts
asr_screen_ocr_gates: unchanged
runner_bytes: 13568
runner_sha256: 0cb124c94641a95fa4904e7c3a196de486a9453e8c3b32c7d44a3cef1176be47
manifest_sha256: a80d8fa759f967cd927ab7cbd5500c03e8a1e0c4484b8105e62346a87fe6e5c2
bash_syntax: passed
cr_bytes: 0
```

runner 先捕获当前 backend 的 ActiveState/SubState/NRestarts/ExecMainStatus，要求 active/running、NRestarts 为非负整数、ExecMainStatus=`0`，并保存完整状态；该快照用于回滚后精确恢复校验。候选发布后的 backend 改由独立的 `active/running/0/0` 与 5 秒 PID 稳定门验收。未硬编码 `5`、未清零计数、未删除增量门。

## PREP-1660：候选重启后的稳定性门

```yaml
artifact_written: true
remote_actions: 0
archive_changed: false
backend_baseline_gate: active/running/nonnegative_NRestarts/ExecMainStatus=0
backend_post_switch_gate: active/running/NRestarts=0/ExecMainStatus=0
candidate_pid_stability: 5s
asr_screen_ocr_gates: unchanged
err_trap_original_rc_preserved: true
runner_bytes: 13650
runner_sha256: d1953d254e9210837e1b63c2fca545ab2232d19f5877b702c5943bb8d3cf7b4a
manifest_sha256: be0d7317e48439de36380e77b63ad9fea579a24b4ef458cc3f031bb85702f7a5
bash_syntax: passed
cr_bytes: 0
```

候选 restart 后现在捕获 candidate backend PID 与状态，要求 `active/running/0/0`，等待 5 秒后 PID、状态和 `NRestarts=0` 保持不变；不再把重启前历史 `NRestarts` 与候选状态比较。ERR trap 先保存原始 `$?`，再设置 failure code 并传入 rollback，负例验证保持非零退出。

## PREP-1662：compare API content-type 门修正

```yaml
artifact_written: true
remote_actions: 0
archive_changed: false
api_request_count: 1
api_status_gate: 401
api_content_type_gate: application/json*
api_body_gate: non_html
removed_dependency: awk_IGNORECASE
positive_negative_parser_gate: passed
runner_bytes: 13594
runner_sha256: dd1ed93969b386f805a86544230798f87213bdc61b11c14df5018ba69ee31358

## EXEC-1664：r2正式发布与独立终验

```yaml
artifact_written: true
outcome: passed
archive_sha256: 4c818ae7e70673a7658f4ee857f910bc2e8755b8cdfbfb0ecff0ec54ad847e47
runner_sha256: dd1ed93969b386f805a86544230798f87213bdc61b11c14df5018ba69ee31358
checksums_sha256: 91f008f0c3a9e729afe39bdb305e2575529dbb0f5417b136837f9182e81d643d
root_runner_exit: 0
current: /opt/qimao-terms-cloud/releases/asr-srt-compare-20260831-r2
employee_static: /srv/qimao-terms-cloud/frontend-asr-srt-compare-20260831-r2
backend: active/running/NRestarts=0/ExecMainStatus=0
asr: active/running/NRestarts=0/ExecMainStatus=0
screen_text: inactive/dead/NRestarts=0/ExecMainStatus=0
ocr_openvino: active/running/NRestarts=0/ExecMainStatus=0
business_or_provider_writes: 0
temporary_residuals: 0
requires_user: false
```

- root runner依次通过payload SHA/Bash、旧基线、候选五入口/static、qimao身份真实Linux import、原子切换、backend计划重启、5秒稳定PID、未授权compare 401/JSON/非HTML与员工两页200。
- 独立只读终验确认current/static均指向r2，旧`ai-recovery-1607-r3`与`frontend-ai-hotfix-1552`继续存在为回滚目标；ASR与OpenVINO PID保持，screen-text未启动。
- 入站、release/static stage、next和runtime全部不存在。服务器经Cloudflare公网IP访问根页与ASR深链均HTTPS200；Codex本机浏览器出口连接关闭只记录为验证环境限制，不误判生产故障。
- DB、COS、route、budget与Provider写入均为0；未创建新ASR/OCR批次或付费调用。
manifest_sha256: 91f008f0c3a9e729afe39bdb305e2575529dbb0f5417b136837f9182e81d643d
bash_syntax: passed
cr_bytes: 0
```

未授权 compare API 现在通过同一次 curl 的 `%{http_code}` 与 `%{content_type}` 获取状态和类型，不再依赖 mawk 的 `IGNORECASE` 或响应头大小写；仍要求 `401`、`application/json*` 且响应体不含 HTML。r2 archive、PREP-1660 稳定性门、ASR/screen/OCR 门及回滚合同均未改变。
