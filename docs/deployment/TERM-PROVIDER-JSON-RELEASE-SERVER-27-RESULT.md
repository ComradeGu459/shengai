# TERM-PROVIDER-JSON-RELEASE-SERVER-27 结果

## outcome

`blocked`；`artifact_written=true`。

本轮消费 26 冻结三件套完成唯一一次 SCP，并执行一次复用的 release runner。候选通过归档、解包、11-gate import 和 dist 合同门，随后在四 unit 健康判定处触发 runner 回滚；未修改生产 DB、迁移、static 配置、provider.env、unit/drop-in 或 canonical route，Provider 调用为 0。

## evidence

- 冻结输入核对通过：archive `9,533,912` bytes，SHA-256=`d8e1d8e10c0e454869d6eb346d85163fe651ccf95dde429f04f0fcde383b6430`；manifest `118,848` bytes，SHA-256=`7fcaf1871492282924a08675f8da97786aa093e560c7b332cc23d2bf12f4a610`；audit `272` bytes，SHA-256=`ab9dd4e542e3a59478d85a59e6b791fe86c5accdb1460b56ffdf4b1b9c32bfec`。
- SCP argv 由已解析绝对路径字符串数组经 native splatting 传入；argv 门通过，唯一 SCP=`exit 0`。
- 远端身份门：数值 UID/GID=`999/996`；archive `15,024` members、`476` symlinks、absolute symlinks=`0`；qimao 数值身份读取门通过。
- 解包门通过：11-gate import 全部 `exit=0/loaded`；dist 中 `thinking disabled`、`max_tokens=16384`、完整 JSON 结构示例均存在。
- 失败首因：runner 在 `phase_start=units` 后退出并触发 trap。冻结 runner 的 unit 状态匹配要求 `ActiveState/SubState` 先于 `NRestarts/ExecMainStatus`，而 `systemctl show` 实际输出顺序为 `NRestarts, ExecMainStatus, ActiveState, SubState`，导致已启动的健康 unit 被误判为 `UNIT_HEALTH_FAILED`。同一时间窗 journal 显示四 unit 均已 `Started`，随后统一停止并恢复。
- 回滚后只读核对：current=`/opt/qimao-terms-cloud/releases/20260829-term-control-122a-r1`；static=`/srv/qimao-terms-cloud/system-frontend-20260829-term-control-122a-r1`；candidate release/static=`absent`；固定 staging=`absent`。
- 回滚后四 unit 均为 `ActiveState=active`、`SubState=running`、`NRestarts=0`、`ExecMainStatus=0`；health=`HTTP 200`、`status=ok`、`database=connected`。
- 外部调用计数：DeepSeek/COS/Tencent=`0`；生产 DB 写入=`0`。

## remaining_gap

候选未保持发布状态，未完成发布后 active terms route 与服务器 dist 的最终 current 复核。当前 active route 未被本轮改变。

## next_owner

`PLANNER → SERVER`：需另签独立切片修正 runner 的只读状态谓词顺序后再发布；本轮禁止继续重试 SCP、修改已冻结候选或现场补丁。

## files

- `docs/deployment/TERM-PROVIDER-JSON-RELEASE-SERVER-27-RESULT.md`
- 仓库外保留 26 冻结三件套。

## residual

- 远端固定 staging、候选 release/static 和传输副本均已清理；current/static、四 unit、DB、`provider.env`、unit/drop-in、route 保持基线。
- 本地临时 runner 与 transfer 目录已清理；脏工作树未 reset/checkout/clean/stash，未提交或推送。

## requires_user

`false`：既有授权覆盖后续同范围发布；需由规划方签发新的独立切片。
