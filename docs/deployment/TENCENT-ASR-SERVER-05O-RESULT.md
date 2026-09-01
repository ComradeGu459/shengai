# TENCENT-ASR-SERVER-05O-SYNTHETIC

```yaml
artifact_written: true
outcome: blocked
current: v4-1320
run_id: asr-05o-20260829-r1
stage: BOOTSTRAP_PREPARE_FAILED
next_owner: PLANNING
requires_user: false
```

## Preflight

唯一 runner Preflight 通过：

```text
run_id=asr-05o-20260829-r1
plan_sha256=70e10a0041c90f8a029abc0861373ad63bedc6cbda234d93e378833772262aff
network_actions=0
external_writes=0
embedded_self_test=passed
```

## 唯一 Execute 结果

Execute 通过联网升级沙箱启动，仅调用一次，未重试：

```json
{"artifact":"qimao.tencent-asr.single-entry","outcome":"blocked","code":"BOOTSTRAP_PREPARE_FAILED","stage_code":"BOOTSTRAP_PREPARE_FAILED","network_actions":8,"external_writes":7,"events":[{"label":"media.generate_once","status":"completed"},{"label":"remote.create_root","status":"completed"},{"label":"remote.transfer.scp","status":"completed"},{"label":"remote.sha_verify","status":"completed"},{"label":"remote.release_dir","status":"completed"},{"label":"remote.extract","status":"completed"},{"label":"remote.env_install","status":"completed"},{"label":"remote.provider_install","status":"completed"},{"label":"bootstrap.prepare","status":"failed"},{"label":"finally.cleanup.database","status":"completed"},{"label":"finally.cleanup.root","status":"completed"},{"label":"local.cleanup.media","status":"completed"}],"completed_events":["media.generate_once","remote.create_root","remote.transfer.scp","remote.sha_verify","remote.release_dir","remote.extract","remote.env_install","remote.provider_install","finally.cleanup.database","finally.cleanup.root","local.cleanup.media"],"unknown_events":["bootstrap.prepare"],"cleanup_errors":[]}
```

## 业务/外部事实

- 媒体只生成一次并已进入本地 cleanup；未输出语音正文或媒体值。
- archive/media 传输、远端 SHA、release 解包、env/provider 安装均完成。
- `bootstrap.prepare` 未成功返回可确认的 prepared 结果，故未确认隔离 DB ownership，未进入 business。
- business、COS 上传、Tencent `CreateRecTask`、TaskId、job/cue/usage/log/budget 均为 0。
- 未进入 business/控制面链，生产 current、生产 DB、控制面和公网路由未被本轮流程触碰。

## 清理与残留

- database cleanup event 已执行；因 `database_owned=false`，未 drop 未确认创建的 DB。
- root cleanup event 已执行；root 创建成功后由 runner 执行 owned-only cleanup。
- 本机媒体目录检查：不存在，local residual=0。
- cleanup_errors=[]；primary stage code 保持 `BOOTSTRAP_PREPARE_FAILED`。
- 未做额外远端 read-back，避免产生第二个远端核查动作；远端 cleanup 命令本身已返回 completed。

## remaining_gap

唯一缺口是 `BOOTSTRAP_PREPARE_FAILED` 的远端运行原因；按本轮停止条件不现场诊断、不修改 runner/参数、不重试 Execute、不创建第二外部事实。

`next_owner=PLANNING`，`requires_user=false`。
