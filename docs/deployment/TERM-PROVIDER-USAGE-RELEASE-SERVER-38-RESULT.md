# TERM-PROVIDER-USAGE-RELEASE-SERVER-38

## artifact_written

`artifact_written`

## outcome

发布成功。仅消费 SERVER-35 冻结三件套，经 deploy-owned transfer 唯一 SCP 后，由唯一 transient systemd unit 执行 runner；root-only status.jsonl 持久化 terminal `passed`。current/static 已原子切换到 `term-provider-usage-20260830-r1`，旧 immutable 回滚目标保留。

## evidence

- 冻结输入未重建且本地 bytes/SHA 核对一致：
  - archive：`9,471,776` bytes，SHA-256=`020437197f6fef783fa04a1789ba727cf293a152d140b38630122a9677c3b925`
  - manifest：`3,000,555` bytes，SHA-256=`61372755bb1ac1a6bbe22aaf57ea98bd0a5afba78f44c4ff3b508dc615ec6f07`
  - audit：`1,190` bytes，SHA-256=`0f03a1de65ed6b93ae11a05c6abe95d60c8d2de4ea9e3830ef0c706663d5bcff`
- 登录身份创建的唯一 transfer dir 为 `qimao-deploy:0700`；显式传输三件套与 runner 的唯一 SCP 返回 `exit=0`。传输后输入门通过，root staging 由 runner 创建。
- 唯一 transient unit：`qimao-term-provider-usage-release-38.service`。启动后未重放；status `/run/qimao-term-provider-usage-release-38.status.jsonl` 为 `root:root 0600`，记录身份、输入、staging、baseline、release/static、原子切换、unit、health/route、cleanup 共 11 行，terminal=`passed`。
- runner 未 source `/etc/qimao-terms-cloud/*.env`，未读取或输出 Secret；route 前后均使用 `sudo -n -u postgres -- psql -d qimao_terms_cloud` 本机 socket 只读查询。
- 最终 current=`/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1`；static=`/srv/qimao-terms-cloud/system-frontend-term-provider-usage-20260830-r1`。新 release/static 与旧 `term-provider-json-20260830-r1` 回滚目标均存在；current/static 指向新候选。
- 四 unit 分别读取并均满足 `ActiveState=active`、`SubState=running`、`NRestarts=0`、`ExecMainStatus=0`：`qimao-backend.service`、`qimao-worker@term-extraction.worker.entry.js.service`、`qimao-worker@system-control.secret-validation.worker.entry.js.service`、`qimao-worker@system-control.connection-test.worker.entry.js.service`。
- loopback health=`200`；postgres socket 只读投影返回唯一既有 active `terms_api` route，target/version/provider/model 与发布前一致。
- Provider/COS/DeepSeek/Tencent/业务 API 写入=`0`；未修改 provider.env、Secret、route、迁移或业务数据。

## remaining_gap

无本次发布门遗留。业务 Provider E2E 不在本任务范围内，且本任务按授权保持外部调用为 0。

## next_owner

`PLANNER`：审核本发布证据后，按后续独立任务决定是否进入真实业务 E2E；本发布无需返工。

## residual

- 成功收尾已精确删除 transient unit、status、transfer、staging；systemd 查询该 transient unit 为 `LoadState=not-found`。
- 新 immutable 与旧回滚目标保留；本地冻结三件套保留。本轮本地 transfer view 与临时 runner 已精确删除。
- 仓库原有脏工作树保留；本任务未修改业务源码，未提交、未推送。

## requires_user

`false`
