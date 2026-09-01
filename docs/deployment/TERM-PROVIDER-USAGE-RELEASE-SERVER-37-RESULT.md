# TERM-PROVIDER-USAGE-RELEASE-SERVER-37

## artifact_written

`blocked`

## outcome

唯一一次 SCP 成功；唯一一次 root runner 发生部分发布副作用后丢失远端会话输出，未形成可验收的发布结果。已按既定失败路径恢复 122A（`term-provider-json-20260830-r1`）并完成四 unit 重启、health 与 route 只读复核；候选未保留在服务器。

## evidence

- 仅消费 35 冻结三件套，未重建：
  - archive：`9,471,776` bytes，SHA-256=`020437197f6fef783fa04a1789ba727cf293a152d140b38630122a9677c3b925`
  - manifest：`3,000,555` bytes，SHA-256=`61372755bb1ac1a6bbe22aaf57ea98bd0a5afba78f44c4ff3b508dc615ec6f07`
  - audit：`1,190` bytes，SHA-256=`0f03a1de65ed6b93ae11a05c6abe95d60c8d2de4ea9e3830ef0c706663d5bcff`
- 登录身份创建的远端 transfer dir 为 `qimao-deploy:0700`；一次 SCP 使用四个显式文件名，返回 `exit=0`。
- root runner 未 source `/etc/qimao-terms-cloud/*.env`，未读取或输出 Secret；route 查询合同为 `sudo -n -u postgres -- psql -d qimao_terms_cloud` 本机 socket 只读查询。
- runner 返回的可见输出仅为 SSH 登录身份 home 目录权限警告：`could not change directory to "/home/qimao-deploy": Permission denied`；未返回 runner stdout，随后确认 runner 进程已结束。
- runner 部分副作用的只读状态为：current/static 曾短暂指向 `term-provider-usage-20260830-r1`，对应新 release/static 与 transfer/staging 均曾存在。未重新执行 runner；按既定失败回滚恢复后最终只读状态为：
  - current=`/opt/qimao-terms-cloud/releases/term-provider-json-20260830-r1`
  - static=`/srv/qimao-terms-cloud/system-frontend-term-provider-json-20260830-r1`
  - 新 release=`0`，新 static=`0`，transfer=`0`，staging=`0`
- 回滚后四 unit 分别读取并均满足 `ActiveState=active`、`SubState=running`、`NRestarts=0`、`ExecMainStatus=0`：`qimao-backend.service`、`qimao-worker@term-extraction.worker.entry.js.service`、`qimao-worker@system-control.secret-validation.worker.entry.js.service`、`qimao-worker@system-control.connection-test.worker.entry.js.service`。
- 回滚后 loopback health=`200`；通过 `sudo -n -u postgres -- psql -d qimao_terms_cloud` 只读查询返回唯一既有 active `terms_api` route，target/version/provider/model 投影与基线一致。
- Provider/COS/DeepSeek/Tencent/业务 API 写入=`0`；未修改 provider.env、Secret、route、迁移或业务数据。

## remaining_gap

候选未完成 current/static 发布验收；失败的确定边界是 root runner 远端会话在部分发布后丢失，既无完整 stdout 也无可恢复的 runner 退出码/失败命令。因此本任务按编排失败停止，不现场修改 runner、不重试 SCP/runner。

## next_owner

`PLANNER`：如需继续，应另行定义一次新的发布编排合同，先解决 runner 会话/阶段证据持久化问题；不得把本次部分副作用当作成功发布。

## residual

- 服务器回滚后 current/static、四 unit、health、唯一 active route 均恢复并核验；新 release/static、transfer/staging 残留均为 `0`。
- 本地冻结三件套仍保留；本轮本地 transfer view 与临时 runner 已精确删除。
- 仓库原有脏工作树保留；本任务未修改业务源码，未提交、未推送。

## requires_user

`false`
