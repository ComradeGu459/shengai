# AI-HOTFIX-SERVER-1544

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## evidence

- 复用 1541 冻结三件套：archive=`10267996` / `80bee3c1fd49515ea8cc10c34140ab39412c8cda311e9f28f6fb5f4cbfdccb8f`；manifest=`5783` / `c84c26ac2fdd8cf770621acc72e7d805a08070b6566fcf40c48b821d70743a1b`；audit=`3393` / `d7a400fd1e323bd9890561530b4c574a8555f0d7c503869391c6cb3a9c9fcd1d`。
- 新 runner 仅由 1537 模板机械改为 1544，并加入 `toBudgetDecimal`、`qimao-upload-handles-v1`、重新授权文案存在门，以及 `SCREEN_TEXT_FAKE_DISABLED`、三项模拟文案不存在门；runner=`6803` bytes / `4cbc861366d1277717bd4387c35d853153011f74ad3531aef92b1a6c01b2dd58`，Bash `-n` exit=`0`、CR=`0`，无 `1537`/`1543`/`BASE_`/旧基线 archive 引用。
- transfer 创建=`1`，SCP=`1` exit=`0`，root runner=`1` exit=`0`。runner 首次切换到 current=`/opt/qimao-terms-cloud/releases/ai-hotfix-1544`、员工 static=`/srv/qimao-terms-cloud/frontend-ai-hotfix-1544`，health=`200`，assets=`3`。
- postverify 首个确定业务门失败：同一 batch `e6edf993-15ab-4302-a535-4ae382b7c9b3` 最终为 jobs=`1 completed + 50 failed`；attempts=`1 completed + 51 failed`。episode 2 的既有失败为 `ASR_LEASE_EXPIRED` 与 `SYSTEM_CONTROL_BUDGET_HARD_LIMIT`；episode 3–51 新增失败均为 `SYSTEM_CONTROL_BUDGET_HARD_LIMIT`，全部 `provider_request_id=absent`、无外部副作用标记。仅 episode 1 completed attempt 保留既有 provider_request_id，未新增 provider identity。
- 该业务/预算门失败后立即按既定路径恢复旧 current/static 并重启三 unit；回滚命令 exit=`0`。最终 current link/realpath=`/opt/qimao-terms-cloud/releases/term-budget-capability-20260830-r1`；员工 static realpath=`/srv/qimao-terms-cloud/frontend-employee-upload-background-20260830-r1`；health=`200 application/json; charset=utf-8`。
- 回滚后 backend、canonical ASR、screen-text 均逐字段为 `active/running/NRestarts=0/ExecMainStatus=0`。1544 new release、new static、stage、transfer 均 absent；route、budget、DB schema、env、Secret 未由本片修改。

## external_counts

```yaml
transfer_dir_create: 1
scp: 1
root_runner: 1
current_static_switch: 1
backend_restart: 2
asr_worker_restart: 2
screen_text_restart: 2
rollback: 1
new_provider_request_ids: 0
existing_provider_request_ids_observed: 1
provider_calls: 0
cos_calls: 0
database_writes: 0
route_writes: 0
budget_writes: 0
business_api_writes: 0
```

## rollback

已执行唯一回滚：current/static 恢复旧目标，三 unit 重启并验证健康；1544 未引用 release/static、stage、transfer 均已精确删除。旧 release/static 保留为生产基线。

## remaining_gap

热修候选未保留在生产 current。首个确定业务异常为批次新增 job 在预算门 `SYSTEM_CONTROL_BUDGET_HARD_LIMIT` 下失败；这些新增失败没有 provider_request_id，未重试 episode2，也未重复 Create。禁止本片继续现场修 runner、改 budget/route 或重建 batch。

## next_owner

`PLANNER`：先审查现有 batch 的预算硬阻断与 1544 运行时实际预算状态，再决定后续唯一修复路径；不得把本片 runner success 误报为业务验收成功。

## residual

- 服务器：旧 current/static、三 unit、health 保留；1544 release/static/stage/transfer 残留均为 `0`。
- 生产业务：同一 batch 保留 `1 completed + 50 failed` jobs，attempts=`1 completed + 51 failed`；仅 1 个既有 provider_request_id，新增失败均无外部身份。
- 本地：1541 三件套与 1544 runner 保留；未修改业务源码、route、budget、DB 或 env。

