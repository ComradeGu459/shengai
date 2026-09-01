# TENCENT-ASR-SERVER-066-STAGE-LOCALIZATION

```yaml
artifact_written: true
outcome: blocked
stage: remote.create_root
stage_code: ROOT_CREATE_FAILED
run_id: asr-066-20260829-r1
plan_sha256: d77efe14ef97af9c3e8a02c574a8b9f39ad258b221f7a6496893b96024a52f98
precreate_outcome: not_started
full_execute: not_invoked
network_actions: 1
external_writes: 1
tencent_writes: 0
create_rec_task: 0
describe_task_status: 0
cleanup_errors: 0
residual: remote_root_unverified_preexisting
next_owner: PLANNING
requires_user: false
```

## evidence

- 本地阶段定位改动仅在 business harness：新增统一 stage wrapper，保留 HarnessError 原码，未知异常映射为当前阶段的 `UNEXPECTED_<STAGE>`；未修改 backend 业务源码、数据库 role、`pg_hba`、runner 外部策略或冻结 archive。
- 本地门通过：business `node --check`、business self-test、runner AST/self-test、限定 diff-check；self-test 覆盖 HarnessError 原码、TypeError 当前阶段映射和错误正文不进入输出。
- diagnostic fresh Preflight 通过，计划绑定 `asr-066-20260829-r1`，并声明 `AsrWorker.runOnce()` 前停止及 Tencent 写入上限为 0。
- 唯一 diagnostic Execute 在首个远端动作 `remote.create_root` 失败，runner 精确返回 `code=ROOT_CREATE_FAILED`、`stage_code=ROOT_CREATE_FAILED`。
- 事件状态：

  ```text
  media.generate_once       completed
  remote.create_root        failed: ROOT_CREATE_FAILED
  finally.cleanup.database  completed
  finally.cleanup.root      completed (owned=false，未删除)
  local.cleanup.media       completed
  ```

- `network_actions=1`、`external_writes=1`，`unknown_events` 仅为 `remote.create_root`，`cleanup_errors=[]`。
- root 创建失败发生在 bootstrap、business、COS 和 Tencent 之前；Tencent writes、CreateRecTask、DescribeTaskStatus 均为 `0`。

## cleanup / gap

- 本机派生媒体已清理；数据库未取得 owned 状态，数据库清理事件无持久库可删。
- 远端 root 未因 `mkdir` 成功而取得所有权，runner 的 owned-only 安全门没有删除它；因此不能把该 root 报为已清零，记录为 `remote_root_unverified_preexisting`。
- 未进入 business，故没有 COS 对象或业务事实可报告；full Execute 未调用，也未重试 diagnostic。
- 生产 current、生产 DB、控制面与公网路由未由本轮修改。

`next_owner=PLANNING`；按停止条件不再执行远端核查、第二次 diagnostic 或 full Execute。

