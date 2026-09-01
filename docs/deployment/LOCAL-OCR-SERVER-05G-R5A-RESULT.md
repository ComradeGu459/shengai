# LOCAL-OCR-SERVER-05G-R5A 只读结果

## outcome

`blocked`：同一 connection test 仍为 `queued`，本轮未 POST、未点击、未部署、未 restart/reload。

## evidence

- 精确 testRunId：`24bf93fb-acad-4a79-aa8c-63ceb92bea01`。
- DB GET：`status=queued`、`attempt_count=0`、`reason_code` 为空；`lease_owner` 不存在、`lease_expires_at` 不存在、当前有效 lease=false。
- 精确 deployment/version 仍存在：deploymentId=`998dea43-3257-4a0b-9a05-765598cbfdd8`、versionId=`e0ac8bc6-feea-4d12-836d-17e7e82dfcda`；requestId=`4cd1c37f-bff5-4730-8d9f-34dc12f79e29`。
- 候选仍为 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-05g-r4-composite`，`current` 解析到该 release；health=200、未认证 API=401；backend active、MainPID=331631、NRestarts=0。
- Node 路径修正后的 connection-test unit：`ActiveState=inactive`、`SubState=dead`、`MainPID=0`、`Result=success`、`ExecMainStatus=0`、`NRestarts=80`；`ExecStart` 为 `/usr/local/bin/node .../system-control.connection-test.worker.entry.js`，`Type=simple`、`Restart=on-failure`、`RemainAfterExit=no`、已 enabled。
- 修正后 bounded journal（从 02:05:40 起）仅见启动/started/deactivated 三条状态类事件，未见 claim/lease 事件；前一轮已知的 `/usr/bin/node` 不存在错误未在修正后窗口重复出现。

## direct_cause

唯一可证的直接原因是：connection-test Worker 当前没有存活进程（MainPID=0），所以没有轮询者去领取该 queued test；数据库也证实未产生 lease/attempt。unit 使用 `Restart=on-failure`，而最近一次进程以 status=0 正常退出，故不会自动拉起，形成“queued 且无人 claim”。更深层的正常退出触发者不在本轮 bounded journal 中，保持 unknown，不作猜测。

## minimal_fix

由 SERVER 在不新增测试事实的前提下，使该专用 Worker 保持长驻轮询（优先修正其 clean-exit 生命周期或为该实例设置有界的 always-restart 策略），然后仅 GET 同一 testRunId 验证获得 lease/attempt 并进入终态；不得再次 POST。

## remaining_gap

testRunId 尚未 passed/failed/unknown；没有 claim、attempt 或 reason。候选运行时和登记事实保留，未执行清理或回滚。

## files

- 本地新增：`docs/deployment/LOCAL-OCR-SERVER-05G-R5A-RESULT.md`。
- R5A 服务器写入：无。

## residual

候选 release、root-only env、connection-test unit/drop-in、唯一 deployment/version/testRun 及远端归档均保留；无 COS 对象、真实素材、业务 route 或业务任务动作。

## next_owner

`SERVER`

## requires_user

`false`
