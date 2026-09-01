# TENCENT-ASR-SERVER-074-PRECREATE

```yaml
artifact_written: true
outcome: blocked
run_id: asr-074-20260829-r1
plan_sha256: 941b8db647a6af352902193ca98c588481b6575298cfa228ad885d4c2fcfe8bc
remote_root: /tmp/qimao-asr-074-20260829-r1
primary_stage: business.asr_registry
primary_code: UNEXPECTED_ASR_REGISTRY
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

- fresh diagnostic Preflight 通过；唯一 Execute 使用同一 RunId 和 plan SHA，复用冻结 04B archive、现有 runner/bootstrap 与 073 business，未重建候选。
- runner 完成媒体生成、远端 root、传输、SHA、release、解包、env/provider 和 `bootstrap.prepare`；`STORAGE_CONFIG` 与 `STORAGE_CLIENT` 通过。
- business 在 `ASR_REGISTRY` 阶段失败，原始结构化结果精确返回 `UNEXPECTED_ASR_REGISTRY`；未输出异常正文、环境值或路径值。
- 该结果不是四个白名单配置 code，因此未投影为 `TENCENT_ASR_<CODE>`；未达到 `precreate_ready`、`dispatchPrepared=true` 或 Worker 调用阶段。
- Tencent writes、CreateRecTask、DescribeTaskStatus 均为 `0`；未运行 full Execute，未进入项目、上传、业务 COS 或后续 dispatch 链。

## cleanup / residual

- `finally.cleanup.database`、`finally.cleanup.root`、`local.cleanup.media` 均为 `completed`，`cleanup_errors=[]`；runner 报告 `residual=0`。
- 生产 current、生产数据库、控制面和公网路由未进入本次隔离失败路径；未读取或写入 Secret、媒体正文或 COS 对象键。
- 本轮不重试、不修改代码、不重建候选、不新增诊断；后续由 `PLANNING` 处理 `UNEXPECTED_ASR_REGISTRY`。

`next_owner=PLANNING`；`requires_user=false`。
