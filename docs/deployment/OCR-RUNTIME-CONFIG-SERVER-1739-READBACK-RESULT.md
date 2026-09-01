artifact_written: true

# OCR-RUNTIME-CONFIG-SERVER-1739-READBACK

## outcome

```yaml
outcome: passed
slice_outcome: passed
deployment_id: 998dea43-3257-4a0b-9a05-765598cbfdd8
v2_version_id: 2df4aa12-8560-446e-9f51-398ed9b57b38
active_routing_version_id: 7bd41c8c-18b0-46f3-83ec-17fdb0729b6f
active_deployment_version_id: e0ac8bc6-feea-4d12-836d-17e7e82dfcda
transaction_read_only: on
database_writes: 0
server_file_writes: 0
migrations: 0
service_restarts: 0
worker_starts: 0
provider_calls: 0
cos_writes: 0
route_writes: 0
budget_writes: 0
next_owner: 规划
requires_user: false
```

管理员 UI 创建的 OpenVINO v2 已在数据库中形成独立、不可变版本；其运行配置精确为 `frameIntervalMs=1200`、`maxFramesPerEpisode=480`，完整 `config_digest` 以前缀 `b0c4e734cd87` 开始。v1 原记录仍保留且未被覆盖，当前活动 `screen_text` 路由仍只指向 v1。v2 创建后没有新增 `screen_text_batches` 或 `screen_text_attempts`，因此本次 UI 操作没有启动真实 OCR 工作。

## version evidence

| version | version id | runtime_config | config digest | created_at (UTC) |
| ---: | --- | --- | --- | --- |
| 1 | `e0ac8bc6-feea-4d12-836d-17e7e82dfcda` | `null` | `0ffcf19d4a9d390d8a4f0a0ce94d78b47542d0595bfb65b6c7500ab427bf07ac` | `2026-08-27T18:02:11.422Z` |
| 2 | `2df4aa12-8560-446e-9f51-398ed9b57b38` | `{"preset":"screen_text_openvino_ppocrv6_small","frameIntervalMs":1200,"maxFramesPerEpisode":480}` | `b0c4e734cd876250720cb7d7dffec5b0114c815da382fc24495df4cae7be6dfd` | `2026-09-01T08:43:04.392Z` |

两条版本记录均属于 deployment `998dea43-3257-4a0b-9a05-765598cbfdd8`；共同部署身份为 capability=`screen_text`、execution_kind=`self_hosted_worker`、adapter_key=`screen_text_openvino_ppocrv6_small`、status=`enabled`。

`engine_deployment_versions_immutable` trigger 的 `tgenabled=O`，函数为 `reject_system_control_immutable_update`。这与 v1/v2 追加版本、禁止更新或删除旧版本的合同一致。

## active route evidence

活动指针仍为：

```text
environment=development
workflow_stage=screen_text
routing_version_id=7bd41c8c-18b0-46f3-83ec-17fdb0729b6f
pointer_updated_at=2026-08-27T18:54:06.501Z
routing_target_id=1a9eb5ee-3402-4c9b-a81b-1dd8ad7c88bc
pool_id=ocr_self_hosted_worker
deployment_version_id=e0ac8bc6-feea-4d12-836d-17e7e82dfcda
priority=1
role=preferred
```

路由目标逐字等于 v1 version id，并未切换到 v2。

## no-work evidence

以 v2 的 `created_at=2026-09-01T08:43:04.392Z` 为闭区间下界，对全表执行只读计数：

```text
screen_text_batches.created_at >= v2.created_at: 0
screen_text_attempts.created_at >= v2.created_at: 0
```

## read-only boundary and residual

权威回读在 `BEGIN READ ONLY` 事务内执行，`SHOW transaction_read_only` 返回 `on`，输出白名单字段后显式 `ROLLBACK`。首轮回读曾因本地把 adapter_key 假设为另一个字面量而以 `DEPLOYMENT_IDENTITY_INVALID` 停止；该只读事务同样已回滚，未把假设失败当作数据失败。随后只回读任务允许的版本、活动路由、immutable trigger 与创建后计数字段，得到本文证据。

未读取素材、Secret、任务 payload 或原始业务正文；未执行数据库写、迁移、服务重启、Worker 启动、Provider/COS/OCR 调用或 route/budget/engine 写入。两个只读 transient unit 均使用 `--wait --pipe --collect`，终态无 unit 残留；未在服务器写入文件。

本地只新增本文结果文件；未 reset、checkout、clean、stash、commit 或 push。`remaining_gap=none within this readback slice`，`residual=0`，`requires_user=false`。规划可继续决定是否另行签发 v2 路由激活；本任务不授权自动切换。
