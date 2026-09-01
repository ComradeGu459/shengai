# AI-HOTFIX-SERVER-DIAG-1538

## artifact

```yaml
artifact_written: true
outcome: diagnosed
requires_user: false
```

## evidence

- 审计范围为服务器本地时间 `2026-08-30 22:35:00–22:50:00 CST (UTC+08:00)`；未执行发布、重启、清理、DB 写入、route/budget 写入或 Provider/COS 调用。
- root systemd journal 的完整窗口显示：`22:40:00` ASR unit 启动；`22:40:10` 明确为 `Main process exited, code=exited, status=1/FAILURE`；`22:40:15` 明确按 `Restart=on-failure` 执行 restart counter=`1`；`22:41:43` 的停止/启动来自既定回滚。该事实证明是正常退出码失败后被 systemd 策略重启，不是 signal kill。
- 1537 新 release 进程的既有 stderr 日志给出应用层确定首因：`SystemControlBudgetError`，稳定 `code=SYSTEM_CONTROL_BUDGET_QUOTE_INVALID`，安全错误文本为 `finalQuantity 必须是十进制字符串。`；调用栈落在 `SystemControlBudgetService.settle`，随后经 `AsrWorker.runOnce`/`runUntilStopped` 退出 Node。日志未输出 Secret、原始 Provider 载荷或对象信息。
- unit 定义只读事实：`ExecStart=/usr/local/bin/node --preserve-symlinks-main /opt/qimao-terms-cloud/current/backend/dist/workers/asr.worker.entry.js`；`Restart=on-failure`、`RestartSec=5s`；stdout/stderr 分别追加到既有 worker log/error log。当前回滚后的逐属性状态为 `Result=success`、`ExecMainCode=0`、`ExecMainStatus=0`、`NRestarts=0`、`ActiveState=active`、`SubState=running`。
- 同一 batch 脱敏对账：`episode 1|job completed|attempt 1 completed|error none|claim present|external_side_effect_possible=0|provider_request_id present|effect completed`；`episode 2|job failed|attempt 1 failed|error ASR_LEASE_EXPIRED|claim present|external_side_effect_possible=0|provider_request_id absent|effect external_not_accepted`；`episode 2|job failed|attempt 2 failed|error SYSTEM_CONTROL_BUDGET_HARD_LIMIT|claim present|external_side_effect_possible=0|provider_request_id absent|effect external_not_accepted`。未返回 UUID、TaskId、Secret 或载荷。
- 1537 的生产回滚基线保持：current=`term-budget-capability-20260830-r1`、employee static=`frontend-employee-upload-background-20260830-r1`、ASR route 容量=`1/1/10`；当前 health=`200`，三 unit 均 active/running、NRestarts=`0`、ExecMainStatus=`0`。

## root_cause

唯一确定首因是候选 release 的 budget settlement 输入合同异常：ASR worker 在结算阶段向 `SystemControlBudgetService.settle` 传入了非十进制字符串形式的 `finalQuantity`，触发 `SYSTEM_CONTROL_BUDGET_QUOTE_INVALID` 未被 worker 外层转换为业务失败，进程以 status=1 退出；systemd 的 `Restart=on-failure` 随后造成 `NRestarts=1`。这不是 systemd 自身故障，也不是 Tencent/COS 请求未知。

## remaining_gap

需要 BACK/PLANNER 在下一次发布前核对 budget settlement 的 `finalQuantity` 类型转换与失败收敛；同时对账 episode 2 的 `ASR_LEASE_EXPIRED`/`SYSTEM_CONTROL_BUDGET_HARD_LIMIT`，避免重复外部请求。当前任务不实施修复、不重发、不清理业务 attempt。

## next_owner

`BACK` 先核对结算类型合同，`PLANNER` 再决定是否签发新的候选发布；不得在同一基线上盲重跑 Provider。

## residual

- 生产服务已在旧 current/static 基线上健康运行。
- 既有 batch 保留 1 个 completed attempt、2 个 failed attempt（其中 1 个 `ASR_LEASE_EXPIRED`、1 个 `SYSTEM_CONTROL_BUDGET_HARD_LIMIT`）；本片未修改或清理。
- 无本片临时文件、传输目录、候选 release/static 或其他写入残留。

