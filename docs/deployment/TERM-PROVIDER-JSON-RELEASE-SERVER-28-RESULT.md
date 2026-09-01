# TERM-PROVIDER-JSON-RELEASE-SERVER-28 结果

## outcome

`passed`；`artifact_written=true`。

SERVER-28 消费 26 冻结三件套，仅修正 runner 的 unit 谓词为逐字段 `systemctl show --value` 精确比较；唯一 SCP、唯一 runner、current/static 原子切换、四 unit restart 与 health 门均完成。

## evidence

- 冻结输入核对通过：archive `9,533,912` bytes，SHA-256=`d8e1d8e10c0e454869d6eb346d85163fe651ccf95dde429f04f0fcde383b6430`；manifest `118,848` bytes，SHA-256=`7fcaf1871492282924a08675f8da97786aa093e560c7b332cc23d2bf12f4a610`；audit `272` bytes，SHA-256=`ab9dd4e542e3a59478d85a59e6b791fe86c5accdb1460b56ffdf4b1b9c32bfec`。
- 远端 identity：数值 UID/GID=`999/996`；archive `15,024` members、`476` 个 symlink、absolute symlinks=`0`；11-gate import 全部 `exit=0/loaded`。
- 服务器 current=`/opt/qimao-terms-cloud/releases/term-provider-json-20260830-r1`；static=`/srv/qimao-terms-cloud/system-frontend-term-provider-json-20260830-r1`。
- active terms route 只读核对为唯一一条：`environment=development`、`workflow_stage=terms`、`status=active`、`pool=terms_api`、`routing_version_id=8e76ffde-83f6-4cad-b8ff-0f2bf620f38d`、`routing_target_id=56d6f40f-608e-4c2a-9628-32599779d984`、`deployment_version_id=d149bfec-e95f-4a57-8aea-40655a458053`、`model=deepseek-v4-flash`。
- current dist SHA-256=`ddfe86cc8eb8aaed9766cae510385cb9b3c4f5ea3127a6de0d844afc96d897d2`；三项合同均存在：`thinking: { type: 'disabled' }`、`max_tokens: 16_384`、`TERM_TARGET_JSON_STRUCTURE_EXAMPLE`。
- 四 unit 均逐字段通过：`ActiveState=active`、`SubState=running`、`NRestarts=0`、`ExecMainStatus=0`。
- health：`HTTP 200`，`status=ok`，`database=connected`。
- Provider 调用=`0`；生产 DB 写入=`0`；migration/static 配置/provider.env/unit/drop-in/canonical route 均未改动。

## remaining_gap

无本片发布阻断缺口；真实 Provider/E2E 不属于本发布任务，未执行。

## next_owner

`TEST`：可消费已发布 current，按独立任务验证真实业务闭环。

## files

- `docs/deployment/TERM-PROVIDER-JSON-RELEASE-SERVER-28-RESULT.md`
- 仓库外保留 26 冻结三件套。

## residual

- 远端固定 staging、传输副本和临时 runner 已清理；新 release/static 按 immutable 发布保留，current/static 已指向候选。
- 仓库脏工作树按要求保留；未 reset/checkout/clean/stash，未提交或推送。

## requires_user

`false`：发布已完成，无需额外用户操作。
