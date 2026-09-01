# TENCENT-ASR-SERVER-065-SYNTHETIC

```yaml
artifact_written: true
outcome: blocked
stage_code: UNEXPECTED_FAILURE
failure_event: business.run
run_id: asr-065-20260829-r1
plan_sha256: 75a81e8aeeee02c41699f1ee648f2b1d86b8d9ddb013020947f9f83db0e71e3d
archive_sha256: e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30
precreate_outcome: not_reached_precreate_ready
full_execute: not_invoked
network_actions: 9
external_writes: 8
tencent_writes: 0
create_rec_task: 0
describe_task_status: 0
cleanup_errors: 0
residual: 0
next_owner: PLANNING
requires_user: false
```

## evidence

- 仅在 business harness 内增加数据库 peer 查询行规范化：`database_name/user_name` 转为 canonical `databaseName/userName`；未修改 role、`pg_hba`、业务源码或架构。
- 本地三门通过：business `node --check`、business self-test（含 snake_case 规范化）、runner AST/self-test 与 peer normalization dataflow 断言。
- diagnostic fresh Preflight 通过；计划绑定 `asr-065-20260829-r1`，并声明在 `AsrWorker.runOnce()` 前停止、CreateRecTask/Tencent writes 上限为 0。
- 唯一 diagnostic Execute 返回 runner 精确 `code=UNEXPECTED_FAILURE`、`stage_code=UNEXPECTED_FAILURE`，失败事件为 `business.run`。
- 事件状态：

  ```text
  media.generate_once       completed
  remote.create_root        completed
  remote.transfer.scp        completed
  remote.sha_verify          completed
  remote.release_dir         completed
  remote.extract             completed
  remote.env_install         completed
  remote.provider_install    completed
  bootstrap.prepare          completed
  business.run               failed: UNEXPECTED_FAILURE
  finally.cleanup.database   completed
  finally.cleanup.root       completed
  local.cleanup.media        completed
  ```

- `completed_events` 共 10 项，`unknown_events` 仅为 `business.run`，`cleanup_errors=[]`。
- `DATABASE_PEER_MISMATCH` 未作为本轮返回码出现，但 business 仍未返回 `precreate_ready`；generic `UNEXPECTED_FAILURE` 不足以证明后续业务门已通过，不能猜测其内部首因。
- 因 diagnostic 在 `AsrWorker.runOnce()` 前未达成功门，Tencent writes、CreateRecTask、DescribeTaskStatus 均为 `0`；full Execute 未调用。

## precreate / full

- `precreate_outcome=not_reached_precreate_ready`。
- 依据停止条件未进入 fresh full Preflight，也未执行 full Execute；没有第二次 Execute、外部创建或 provider/COS/systemd/构建重跑。
- 未输出媒体正文、Secret、对象键或供应商任务标识。

## cleanup / gap

- 隔离数据库、远端 root、本机媒体清理事件均 completed；`cleanup_errors=0`，`residual=0`。
- 生产 current、生产 DB、控制面与公网路由未由本轮 runner 修改。
- 唯一可证实的剩余缺口是 `business.run → UNEXPECTED_FAILURE`；由于本轮要求失败即停，不继续诊断、不重试，next owner 为 `PLANNING`。

