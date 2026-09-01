# AI-BUDGET-RECOVERY-SERVER-DIAG-1545

## artifact

```yaml
artifact_written: true
outcome: diagnosed
requires_user: false
```

## evidence

- 本片严格只读；未部署、未重启、未改 route/budget/DB/env，Provider/COS 调用=`0`。
- active budget pointer=`78767e10-c54c-456e-9ec0-d2785df294a9|version=3|environment=development`。
- `asr_api/CNY` 规则：day=`warning 9.000000000000 / hard 10.000000000000`；month=`warning 9.000000000000 / hard 10.000000000000`。
- 当前 day/month 计量完全一致：settled=`0`、reserved=`0`、unknown=`8.750000`、total=`8.750000`、remaining=`1.250000000000`、blocked=`false`、warning=`false`。因此不是 settled 累计超限，也不是规则缺失。
- 同一 batch `e6edf993-15ab-4302-a535-4ae382b7c9b3` episode 1 最终 usage：provider=`tencent_cloud`、duration=`122708 ms`、billing unit=`minute`、billing quantity=`2.045133`、final amount=`0.059650 CNY`、reconciliation=`final`、provider_request_id=`present`。
- 该 completed attempt 绑定的唯一遗留 reservation 为 `reconciliation_required/unknown`，maximum quantity=`300`、maximum amount=`8.750000 CNY`，final amount=`none`；它正是当前 day/month `unknown=8.75` 的来源。未输出 reservation UUID、provider request id 原值或任何 Secret。
- 当前实际 engine billing snapshot：`tencent_cloud|tencent_cloud_recorded_v1|16k_zh|zh-CN|metered|CNY|minute|maximumQuantity=300|maximumAmount=8.750000`。新的 admission 使用该真实报价上限时，现有 unknown 占用后的单 job 判断为 `8.75 + 8.75 = 17.50 > hard 10`，所以返回 `SYSTEM_CONTROL_BUDGET_HARD_LIMIT`。
- episode 2–51 的失败元数据均证明失败发生在 admission 前：
  - episode 2 / attempt 1：`ASR_LEASE_EXPIRED`；quote digest=`absent`、reservation=`none`、provider_request_id=`absent`。
  - episode 2 / attempt 2：`SYSTEM_CONTROL_BUDGET_HARD_LIMIT`；quote digest=`absent`、reservation=`none`、provider_request_id=`absent`。
  - episode 3–51 / attempt 1：均为 `SYSTEM_CONTROL_BUDGET_HARD_LIMIT`；quote digest=`absent`、reservation=`none`、provider_request_id=`absent`。
- jobs 最终为 `1 completed + 50 failed`；attempts 为 `1 completed + 51 failed`；provider_request_id 非空计数仍为 `1`，没有本片新增供应商身份。
- 首个可证伪根因：遗留 `reconciliation_required/unknown` reservation 占用 `8.75 CNY` 的最大额，叠加单个 Tencent 真实 quote 上限 `8.75 CNY` 后超过 hard limit `10 CNY`。50 个失败 job 并未形成累计 reservation；它们是在 quote/reservation 持久化前被同一 admission 门阻断。
- 1544 回滚终态只读核对：current/realpath=`/opt/qimao-terms-cloud/releases/term-budget-capability-20260830-r1`；员工 static=`/srv/qimao-terms-cloud/frontend-employee-upload-background-20260830-r1`；health=`200 application/json; charset=utf-8`；backend、ASR、screen-text 均 `active/running/NRestarts=0/ExecMainStatus=0`。

## root_cause

`SYSTEM_CONTROL_BUDGET_HARD_LIMIT` 的直接原因是单 job quote 与遗留 unknown reservation 的叠加，而不是 day/month settled 使用量、规则缺失或 Provider 拒绝。遗留 reservation 的最终金额为空，仍按 maximum amount 参与预算；失败 attempt 没有持久 quote/reservation，不能通过它们反推真实媒体时长。

## budget_derivation

- 已知真实单 job quote envelope：maximum=`8.750000 CNY`、maximum quantity=`300 minute`；真实费率来自运行时 billing snapshot 对应的 `1.75 CNY/hour`。已知 episode 1 实际金额为 `0.059650 CNY`，但不能代表 episode 2–51。
- 若保留现有 unknown reservation，允许再 admission 一个相同 quote 的最小 hard limit 必须严格大于 `17.500000 CNY`；仅对这个“下一 job”门加 20% 余量，建议值为 `21.000000 CNY`。这不是处理 50 个 job 的最终总额。
- 50 个失败 job 的精确最低预算不能从当前持久事实得到：episode 2–51 没有 quote、reservation 或媒体 duration。若取得每个真实时长 `D_i`（毫秒）并确认按同一费率结算，则串行 worker 的预算上限应按实际门计算：
  - 保留 unknown 时：`hard > 8.750000 + 8.750000 + Σ(actual_i for i=2..50)`，其中 `actual_i = round6(1.75 × D_i / 3,600,000)`；20% 余量为该结果乘 `1.20`。
  - 先使遗留 reservation 得到真实终态后：将上式的遗留 `8.750000` 替换为该 reservation 的真实最终金额，再按同一公式计算。
- 因缺少 `D_2..D_51` 与失败前 quote，任何把 50 直接乘以 `8.75` 或用 episode 1 时长外推的数值都会是猜测，本片不提供这种数值建议。

## external_counts

```yaml
readonly_ssh: 2
provider_calls: 0
cos_calls: 0
database_writes: 0
route_writes: 0
budget_writes: 0
unit_restarts: 0
```

## remaining_gap

需要由规划/BACK 决定如何对现有 completed attempt 的遗留 `reconciliation_required/unknown` reservation 做有证据的幂等收敛，并取得 episode 2–51 的真实媒体时长或受信 quote；本片不修改 reservation、不提高 budget、不重试失败 job。

## next_owner

`PLANNER`：将本诊断交 BACK 审核 reservation 恢复语义与真实时长来源，再决定是否另签预算恢复与批次处理切片。

## residual

生产 batch 保留 `1 completed + 50 failed` jobs；仅 1 个 provider_request_id 存在。预算 active policy/rules、旧 current/static、三 unit 与 health 保持回滚基线；本片无写入残留。

