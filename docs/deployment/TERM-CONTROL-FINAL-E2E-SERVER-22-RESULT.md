# TERM-CONTROL-FINAL-E2E-SERVER-22

- artifact_written: yes
- blocked: true
- outcome: blocked_at_zero_network_preflight
- requires_user: false

## evidence

- 外部调用前只读预检通过：`uid=999`、`gid=996`；四个目标 unit 均为 `active/running`，`NRestarts=0`、`ExecMainStatus=0`。
- root wrapper 已创建固定 runtime tree，目录 `0750`、checkpoint/stdout 与 harness 文件 `0640`、owner `0:996`；effective env 设计为先删除六个 inherited `QIMAO_TENCENT_ASR_*`，再按 `backend → object-storage → runtime ASR overlay` 合并。
- checkpoint 第一条确定异常为：`stage=preflight`、`outcome=blocked`、`errorCode=ASR_REGISTRY_NOT_TENCENT`；进程退出码 `2`。
- 该异常发生在 project 创建前，checkpoint 中 `projectId=null`；没有 synthetic project、COS 上传、DeepSeek POST 或 Tencent CreateRecTask，付费 Provider 调用次数为 0。
- 首因与当前 registry 装配逻辑一致：harness 将 `NODE_ENV` 设为 `test`；Tencent registry 在非 production 模式下保留 `deterministic_fake` 为 default，因此 default descriptor 不是 `tencent_cloud`。未修改生产源码、`/etc`、unit 或 canonical route。
- cleanup checkpoint 为 `PROJECT_ID_NOT_CAPTURED`，退出码 `3`；本次无业务资源可清理。runtime tree、overlay、wrapper、harness、checkpoint 副本及 synthetic video 已精确删除，服务器残留核验为 `none`。
- 既有唯一 canonical SecretReference、DeepSeek engine/version 与 active terms route 未改动。

## remaining_gap

未执行 confirmed TermVersion、合规 HotwordList 或 Tencent TaskId completed 验收。需要后续任务在不改变生产源码/配置的前提下，以 production registry default 语义重新执行一次带 checkpoint 的闭环；本次不重试。

## next_owner

SERVER/编排 owner：下一次执行前保留显式 effective env 合并合同，并把 harness 的 registry/app 运行上下文对齐当前 production 装配语义；先验证零网络 default descriptor 为 `tencent_cloud`，再按同一证据门执行唯一一次 Provider 闭环。

## residual

- canonical SecretReference、engine/version 和 active terms route 按要求保留。
- 无 synthetic project、COS object、runtime tree、overlay、harness 或 checkpoint 残留。
- Secret 值、请求载荷、Base64、对象键均未输出或写入本报告。
