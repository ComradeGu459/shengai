# TENCENT-ASR-SERVER-076-PRECREATE

```yaml
artifact_written: true
outcome: blocked
run_id: asr-076-20260829-r1
plan_sha256: 336dfb603a6f99781b7bdde641bcb0e1b7c8d84d13d89b392592896deeca131b
remote_root: /tmp/qimao-asr-076-20260829-r1
primary_stage: business.api_gate
primary_code: API_GATE_FAILED
business_outcome: blocked
precreate_ready: not_reached
dispatch_prepared: not_reached
asr_worker_run_once: not_reached
network_actions: 9
external_writes: 8
tencent_writes: 0
create_rec_task: 0
describe_task_status: 0
full_execute: not_run
cleanup: database_root_media_completed
cleanup_errors: 0
residual: 0
production_baseline: unchanged_by_isolated_path
next_owner: PLANNING
requires_user: false
```

## evidence

- fresh diagnostic Preflight 通过；唯一 Execute 使用同一 RunId 和 plan SHA，复用冻结 04B、现有 runner/bootstrap 与 075 business，未重建候选。
- runner 完成媒体生成、远端 root、传输、SHA、release、解包、env/provider 和 `bootstrap.prepare`；storage config/client、ASR registry 及此前基础门均已通过。
- business 在后续 API gate 阶段失败，原始结构化结果返回稳定码 `API_GATE_FAILED`；未输出异常正文、环境值或敏感值。
- 未达到 `precreate_ready`、`dispatchPrepared=true` 或 Worker 调用阶段；未运行 full Execute。
- Tencent writes、CreateRecTask、DescribeTaskStatus 均为 `0`；未形成业务 COS 或后续 dispatch 事实。

## cleanup / residual

- `finally.cleanup.database`、`finally.cleanup.root`、`local.cleanup.media` 均为 `completed`，`cleanup_errors=[]`；runner 报告 `residual=0`。
- 生产 current、生产数据库、控制面和公网路由未进入本次隔离失败路径；未读取或写入 Secret、媒体正文或 COS 对象键。
- 本轮不重试、不修改代码、不重建候选、不运行 full；后续由 `PLANNING` 处理 `API_GATE_FAILED`。

`next_owner=PLANNING`；`requires_user=false`。
