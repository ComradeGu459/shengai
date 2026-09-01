# TERM-CONTROL-RELEASE-E2E-SERVER-11 结果

## outcome

`blocked`；`artifact_written=true`

## evidence

- 唯一远端 runner 已启动；Step `baseline` 通过，随后在发布前门 `archive_input` 以 `MANIFEST_SHA`、exit=`25` 停止。
- 唯一首因：runner 内冻结的 manifest SHA literal 与本轮本地 manifest 实际 SHA 不一致。实际 SHA 为 `8c817c05f11161f88db403594599c21a58071e99073ad36d2e2131bf9ddfd2ad`；runner literal 多出一位字符。不是候选 payload、服务器、业务或外部服务结论。
- 本轮 immutable candidate：archive bytes=`9,299,863`，SHA=`d3e72eb2b85bbe4031baac0c3060674a12d25763313147c59cfe31e4582ec575`；manifest bytes=`115,796`，SHA=`8c817c05f11161f88db403594599c21a58071e99073ad36d2e2131bf9ddfd2ad`；本地三件套保留供规划审核。
- 失败发生在 provider、迁移、release/static、systemd、health/API/static 和 E2E 之前；未安装/替换 provider.env，未运行 migration，未切换 current/static，未写 drop-in 或重启 unit。
- 外部事实：SCP=`1`；远端 runner=`1`；DeepSeek POST=`0`；COS PUT=`0`；Tencent CreateRecTask=`0`；Tencent DescribeTaskStatus=`0`；engine/route/run=`0`。
- 远端固定 staging `/tmp/qimao-asr-term-control-release-e2e-11-r1` 已按失败清理并复核 absent；本机 runner/helper、解包树、transfer staging、媒体均已清理。生产 current、DB、控制面、公网路由和既有服务未变。

## remaining_gap

仅缺少规划审核后的正确 manifest SHA 编排；按发布硬停止规则，本轮不修 runner、不重试、不重新 SCP、不进行 E2E。需要规划侧签发新的单次发布任务后才能继续。

## next_owner

`PLANNING`

## residual

```yaml
remote_staging: 0
local_temporary_runner_helper_media: 0
deployed_release_created: 0
static_target_created: 0
provider_changed: 0
migration_executed: 0
external_writes: 0
candidate_trio_retained_for_review: 1
```

## requires_user

`false`
