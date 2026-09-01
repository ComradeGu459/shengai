# TENCENT-ASR-SERVER-05M-SYNTHETIC

```yaml
artifact_written: true
outcome: blocked
current: v4-1318
run_id: asr-05l-20260829-r1
next_owner: PLANNING
requires_user: false
```

## 唯一首因

唯一 Execute 在 `remote.create_root` 阶段失败，runner 原始 stage code 为 `ROOT_CREATE_FAILED`。按停止条件未重试、未旁路探查、未继续任何后续阶段。

## Preflight 证据

```text
outcome=passed
network_actions=0
external_writes=0
plan_sha256=2e585ee253c37fcb88733e12f052177d3bb698386bb6c5728b7d77edc3ac0850
run_id=asr-05l-20260829-r1
remote_root=/tmp/qimao-asr-05l-20260829-r1
env_dir=/tmp/qimao-asr-05l-20260829-r1/env
database=qimao_asr_05a_05l_20260829_r1
archive_sha256=e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30
```

Preflight embedded self-test 通过，使用与 Execute 相同的 runner 默认输入和 RunId。

## Execute 证据

本轮仅调用一次：

```text
pwsh -NoProfile -File deploy/debian/bin/Invoke-TencentAsrSynthetic.ps1 -Execute -RunId asr-05l-20260829-r1 -PlanSha256 2e585ee253c37fcb88733e12f052177d3bb698386bb6c5728b7d77edc3ac0850
```

runner 脱敏输出：

```json
{"artifact":"qimao.tencent-asr.single-entry","outcome":"blocked","code":"ROOT_CREATE_FAILED","stage_code":"ROOT_CREATE_FAILED","network_actions":1,"external_writes":1,"events":[{"label":"media.generate_once","status":"completed"},{"label":"remote.create_root","status":"failed"},{"label":"finally.cleanup.database","status":"completed"},{"label":"finally.cleanup.root","status":"completed"},{"label":"local.cleanup.media","status":"completed"}],"completed_events":["media.generate_once","finally.cleanup.database","finally.cleanup.root","local.cleanup.media"],"unknown_events":["remote.create_root"],"cleanup_errors":[]}
```

## 外部与业务事实

- 媒体只执行一次 `media.generate_once`；本机派生目录已被 runner 清理，未输出语音正文或派生媒体 SHA。
- remote root 创建尝试 1 次并失败；因此 scp、远端 SHA/解包、env/provider、bootstrap prepare、business 均为 0。
- `CreateRecTask` 次数为 0；COS 上传、TaskId、业务 job/cue/usage/log/budget 均未产生。
- 因未进入传输、prepare 或 business，生产 current、生产 DB、控制面和公网路由未被本轮 runner 触碰。

## 清理与残留

runner 已按自身 finally 顺序执行 `finally.cleanup.database → finally.cleanup.root → local.cleanup.media`。

- `database_owned=false`（未进入 prepare `outcome=prepared`），未执行 DB drop。
- `root_owned=false`（mkdir 未成功），未删除可能已存在的远端 root，避免误删原资源；该远端 root 状态未旁路探查。
- 本机媒体目录检查：不存在，local residual=0。
- COS、业务进程、release/env/harness 未创建；本轮无可清理外部事实。

## remaining_gap

远端 `/tmp/qimao-asr-05l-20260829-r1` 的存在性/归属未在失败后另行探查；必须由下一次规划明确安全处置。不得以本结果重试 Execute、改参数、换候选或旁路 runner。

`next_owner=PLANNING`，`requires_user=false`。
