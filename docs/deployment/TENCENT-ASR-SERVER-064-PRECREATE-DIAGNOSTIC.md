# TENCENT-ASR-SERVER-064-PRECREATE-DIAGNOSTIC

```yaml
artifact_written: true
outcome: blocked
stage_code: DATABASE_PEER_MISMATCH
diagnostic_outcome: not_reached_precreate_ready
run_id: asr-064-20260829-r1
plan_sha256: 6c4873079883f5f3461cbafbee06b676de0ccc52d4063262ca817b15765782f4
archive_sha256: e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30
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

- 已读取 `docs/backend/ASR-BACK-063-ERROR-CONTRACT.md` 与 062 结果；仓库内没有名为 063 的 deployment result 文件。
- 064 本地修正增加的是既有单入口的有界 `PreCreateDiagnostic` 模式，不是第二流程。business 复用同一 project → manifest → upload → terms → engine → route → budget → batch → dispatch 链，设计终点为 `AsrWorker.runOnce()` 前的 `precreate_ready`。
- business 与 runner 语法/self-test 均通过；诊断 Preflight 通过，plan 明确 `precreate_stop=before AsrWorker.runOnce()`、`create_rec_task_maximum=0`、`tencent_writes_maximum=0`。
- 唯一 diagnostic Execute 事件：

  ```text
  media.generate_once       completed
  remote.create_root        completed
  remote.transfer.scp       completed
  remote.sha_verify         completed
  remote.release_dir        completed
  remote.extract            completed
  remote.env_install        completed
  remote.provider_install   completed
  bootstrap.prepare         completed
  business.run              failed: DATABASE_PEER_MISMATCH
  finally.cleanup.database  completed
  finally.cleanup.root      completed
  local.cleanup.media       completed
  ```

- `completed_events` 共 10 项，`unknown_events` 仅为 `business.run`，`cleanup_errors=[]`。
- runner 报告 `network_actions=9`、`external_writes=8`；这些是隔离传输、部署与业务前置链动作，不代表 Tencent 写入。因在 `AsrWorker.runOnce()` 前的数据库 peer 门阻断，Tencent writes、CreateRecTask、DescribeTaskStatus 均为 `0`。
- 本轮没有输出媒体正文、凭据、对象键或供应商任务标识。

## usage

按腾讯官方 [GetUsageByDate 文档](https://cloud.tencent.com/document/product/1093/111167) 对 `2026-08-29`、`asr_rec` 执行了一次只读查询；请求脚本语法检查通过，但安全结果为 `USAGE_QUERY_FAILED`，未获得可验证的 Count、Duration 或查询时间，因此不猜报用量，也未重试。

## cleanup

- `finally.cleanup.database`、`finally.cleanup.root`、`local.cleanup.media` 均 completed。
- runner `cleanup_errors=0`，已知隔离数据库、远端 root 与本机派生媒体均按本轮 owned 资源清理；本机一次性用量查询脚本已删除。
- `residual=0`；生产 current/DB/控制面/公网路由未由本轮 runner 修改。

## remaining gap / next owner

唯一业务首因已收敛为 `DATABASE_PEER_MISMATCH`，发生在 Tencent 调用前；因此 062 的 `BUSINESS_RUN_FAILED` 不是 Tencent 错误。用量查询仅返回安全失败码，Count/Duration/查询时间仍缺失。按停止条件不重试 diagnostic、CreateRecTask 或用量查询；`next_owner=PLANNING`。

