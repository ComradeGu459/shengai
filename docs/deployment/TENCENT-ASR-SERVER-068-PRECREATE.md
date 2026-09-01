# TENCENT-ASR-SERVER-068-PRECREATE

```yaml
artifact_written: true
outcome: blocked
run_id: asr-068-20260829-r1
plan_sha256: 6c9ee384017ba7725b6d256c827ee4a3c28abe241fc08d98852294d3f37a7d59
remote_root: /tmp/qimao-asr-068-20260829-r1
primary_stage: remote.release_dir
primary_code: RELEASE_DIR_FAILED
business_outcome: not_reached
dispatch_prepared: not_reached
asr_worker_run_once: not_reached
network_actions: 4
external_writes: 3
tencent_writes: 0
create_rec_task: 0
describe_task_status: 0
full_execute: not_run
cleanup_errors: 1
residual: remote_root_cleanup_unverified_retained
next_owner: PLANNING
requires_user: false
```

## evidence

- fresh diagnostic Preflight 通过；计划绑定 `asr-068-20260829-r1`，模式为 `precreate_diagnostic`，固定 archive SHA 为 `e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30`。
- 唯一一次联网提权 Execute 的 runner 原始结构化结果保留了首个失败：`remote.release_dir` → `RELEASE_DIR_FAILED`。首错发生在 `media.generate_once`、远端 root 创建、传输和远端 SHA 核对之后，bootstrap/business 之前。
- 完成事件：`media.generate_once`、`remote.create_root`、`remote.transfer.scp`、`remote.sha_verify`、`finally.cleanup.database`、`local.cleanup.media`。
- 未知事件：`remote.release_dir`；cleanup 错误：`finally.cleanup.root`。cleanup 错误未覆盖原始首因。
- 因未进入 business，`precreate_ready`、`dispatchPrepared=true`、`AsrWorker.runOnce=false` 均未形成；COS、Tencent、CreateRecTask、DescribeTaskStatus 均为 `0`，未运行 full Execute。
- 生产 current、生产数据库、控制面和公网路由未进入本次失败路径；未执行 Secret、业务或生产服务动作。

## cleanup / residual

- 数据库 cleanup 事件为 `completed`；本轮在 bootstrap/business 前失败，没有业务 COS 对象或 Tencent 事实需要清理。
- 本机媒体 cleanup 事件为 `completed`。
- 远端 root cleanup 事件为 `failed`，故不能宣称远端 root 已清零；精确残留记为 `remote_root_cleanup_unverified_retained`，未重试或追加远端命令。

`next_owner=PLANNING`；`requires_user=false`。按停止条件不重放、不改代码、不重建候选、不追加 diagnostic 或 full Execute。
