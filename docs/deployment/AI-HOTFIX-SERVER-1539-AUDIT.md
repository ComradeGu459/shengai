# AI-HOTFIX-SERVER-1539-AUDIT

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## evidence

- `AI-HOTFIX-SERVER-1539-RESULT.md` 不存在；本片以同一 SSH alias 对服务器做只读核对，未执行写操作。
- `no_action: true`。唯一原因：没有发现 1539 的传输、runner 启动或发布事实；1539 release/static、transfer、stage 均 absent，且 22:50 后相关 unit journal 无 1539/发布/重启命中。
- 当前基线只读事实：
  - current link=`/opt/qimao-terms-cloud/releases/term-budget-capability-20260830-r1`；`readlink -f /opt/qimao-terms-cloud/current` 为空，目标当前不可解析。
  - 员工 static link/realpath=`/srv/qimao-terms-cloud/frontend-employee-upload-background-20260830-r1`。
  - health=`200 application/json; charset=utf-8`。
  - backend=`active/running/NRestarts=0`；ASR=`active/running/NRestarts=0`；screen-text=`active/running/NRestarts=0`。
  - 三 unit 的 `ActiveEnterTimestamp` 均为 `Sun 2026-08-30 22:41:43 CST`，与既有回滚时刻一致。
- 22:50:00 CST 之后，以 root 只读读取三 unit journal 并过滤生命周期、错误、lease、budget、1539 标签，命中 `0`；未发现可归属于 1539 的 runner 或回滚日志。
- 1539 相关路径只读残留核对：
  - `/opt/qimao-terms-cloud/releases/ai-hotfix-1539`=`absent`
  - `/srv/qimao-terms-cloud/frontend-ai-hotfix-1539`=`absent`
  - `/var/tmp/qimao-ai-hotfix-1539-transfer`=`absent`
  - `/opt/qimao-terms-cloud/.ai-hotfix-1539.stage`=`absent`
- 既有真实 batch `e6edf993-15ab-4302-a535-4ae382b7c9b3` 只读事实：batch=`queued`，created=`2026-08-30 21:53:44.729895+08`，updated=`2026-08-30 22:45:10.376003+08`；jobs=`1 completed + 1 failed + 49 queued`。
- 同一 batch attempts：episode 1 / attempt 1=`completed`，provider_request_id=`present`，error=`none`，external_side_effect_possible=`false`；episode 2 / attempt 1=`failed`，provider_request_id=`absent`，error=`ASR_LEASE_EXPIRED`，external_side_effect_possible=`false`；episode 2 / attempt 2=`failed`，provider_request_id=`absent`，error=`SYSTEM_CONTROL_BUDGET_HARD_LIMIT`，external_side_effect_possible=`false`。
- usage 只读事实：episode 1 / attempt 1=`final`、provider_request_id=`present`；episode 2 两个失败 attempt 无 usage provider_request_id。未读取或输出原始 provider 响应、Secret、载荷或对象键。

## external_counts

```yaml
1539_remote_write_actions: 0
readonly_ssh_sessions: 7
scp: 0
root_runner: 0
provider_calls: 0
deepseek: 0
tencent_create: 0
cos_calls: 0
route_writes: 0
budget_writes: 0
database_writes: 0
unit_restarts: 0
cleanup_writes: 0
```

## rollback

本片未触发回滚；没有发现 1539 写入，因此没有可回滚的 1539 状态。服务器保持既有回滚后的旧 current/static、三 unit 与 health 状态。

## remaining_gap

1539 热修未发布，ASR batch 仍为 `1 completed + 1 failed + 49 queued`，且 current link 当前不可解析。由于本片严格只读，不修复 current、不重启服务、不触碰 batch、route、budget 或 Provider。

## next_owner

`PLANNER`：基于本审计事实决定是否重新派发 1539 的唯一发布切片；不得把本片只读审计误报为已部署或已回滚。

## residual

1539 release/static/transfer/stage 残留均为 `0`；既有 batch 与旧员工 static 保留未动。current 的悬空链接是既有状态，本片未改变。

