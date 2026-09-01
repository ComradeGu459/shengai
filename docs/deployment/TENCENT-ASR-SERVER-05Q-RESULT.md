# TENCENT-ASR-SERVER-05Q-SYNTHETIC

```yaml
artifact_written: true
outcome: blocked
current: v4-1322
run_id: asr-05q-20260829-r1
stage: QIMAO_READABILITY_FAILED
next_owner: PLANNING
requires_user: false
```

## Preflight

唯一 runner Preflight 通过：

```text
run_id=asr-05q-20260829-r1
plan_sha256=9684a1958c1f2326be83d8e305c6251b12c0fd5debccdde93b576a77f85cc45c
network_actions=0
external_writes=0
embedded_self_test=passed
```

## 唯一 Execute 结果

Execute 通过联网升级沙箱启动，仅调用一次，未重试。runner 透传的精确 child code 为 `QIMAO_READABILITY_FAILED`：

```json
{"artifact":"qimao.tencent-asr.single-entry","outcome":"blocked","code":"QIMAO_READABILITY_FAILED","stage_code":"QIMAO_READABILITY_FAILED","network_actions":8,"external_writes":7,"events":[{"label":"media.generate_once","status":"completed"},{"label":"remote.create_root","status":"completed"},{"label":"remote.transfer.scp","status":"completed"},{"label":"remote.sha_verify","status":"completed"},{"label":"remote.release_dir","status":"completed"},{"label":"remote.extract","status":"completed"},{"label":"remote.env_install","status":"completed"},{"label":"remote.provider_install","status":"completed"},{"label":"bootstrap.prepare","status":"failed"},{"label":"finally.cleanup.database","status":"completed"},{"label":"finally.cleanup.root","status":"completed"},{"label":"local.cleanup.media","status":"completed"}],"completed_events":["media.generate_once","remote.create_root","remote.transfer.scp","remote.sha_verify","remote.release_dir","remote.extract","remote.env_install","remote.provider_install","finally.cleanup.database","finally.cleanup.root","local.cleanup.media"],"unknown_events":["bootstrap.prepare"],"cleanup_errors":[]}
```

## 业务/外部事实

- 媒体只生成一次并已由 runner 清理；未输出语音正文或媒体值。
- root、archive/media 传输、远端 SHA、release 解包、env/provider 安装均完成。
- bootstrap 在 qimao readability 阶段返回 blocked；未确认 `outcome=prepared`，因此未确认隔离 DB ownership。
- business、COS 上传、Tencent `CreateRecTask`、TaskId、job/cue/usage/log/budget 均为 0。
- 未进入 business/控制面链，生产 current、生产 DB、控制面和公网路由未被本轮流程触碰。

## 清理与残留

- database cleanup event 已执行；因未确认 prepared/DB ownership，未 drop DB。
- root cleanup event 已执行，owned root 已由 runner 清理。
- 本机媒体目录检查：不存在，local residual=0。
- `cleanup_errors=[]`；primary stage code 保持 `QIMAO_READABILITY_FAILED`。

## remaining_gap

唯一缺口是 bootstrap qimao readability 失败的远端原因。按本轮停止条件不现场诊断、不修改 runner/参数、不重试 Execute、不创建第二外部事实。

`next_owner=PLANNING`，`requires_user=false`。
