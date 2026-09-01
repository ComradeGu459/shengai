# TERM-CONTROL-ROUTE-E2E-SERVER-19

- artifact_written: yes
- outcome: blocked
- requires_user: false

## evidence

- Phase A 已完成且 canonical 资源保留：
  - SecretReference `70241673-bc30-4a69-8a2e-7a1fb72f6320`，version `d9b406fd-282b-4c1d-85a8-a59b86d67259`，状态 `available`。
  - DeepSeek engine `c7960837-8dab-40e4-b40d-e833c10508c3`，version `d149bfec-e95f-4a57-8aea-40655a458053`，`enabled`，model `deepseek-v4-flash`，SecretReference version 已绑定。
  - terms route `8e76ffde-83f6-4cad-b8ff-0f2bf620f38d` 当前唯一 active；pool `terms_api` 只有一个 target，指向上述 deployment version。
  - Phase A validation succeeded，Provider network calls 为 0；未创建 synthetic project/COS。
- Phase B 使用数值身份 `uid=999`、`gid=996`，固定 runtime tree 权限为目录 `0750`、文件 `0640`、owner `0:996`；Tencent ASR overlay 仅在 runtime tree 内装配，未改 `/etc` 或 unit。
- Phase B 证实创建了 2 个 synthetic COS assets；最终 tombstone 为 `asset_count=2`、`object_deleted_count=2`、`object_missing_count=0`、`terminated_upload_count=0`，synthetic project 已 purge。
- Phase B 结束后数据库时间窗内没有 ASR batch/attempt；因此未进入 Tencent Create，无法验收同一 TaskId、termVersionId、hotwordDigest 和 HotwordList。
- 最终四个 unit 均为 `active/running`，`NRestarts=0`、`ExecMainStatus=0`：
  - `qimao-backend.service`
  - `qimao-worker@term-extraction.worker.entry.js.service`
  - `qimao-worker@system-control.secret-validation.worker.entry.js.service`
  - `qimao-worker@system-control.connection-test.worker.entry.js.service`
- 临时 runtime tree、overlay、wrapper、synthetic video 均已精确删除；服务器残留核验为 `none`。

## remaining_gap

真实术语 `DeepSeek → candidate confirmation → TermVersion → Tencent HotwordList` 未形成可复核的完整证据链。唯一可证的停止点是在 ASR batch 创建之前；原始 harness 最终 stdout 在收取时被截断，随后 synthetic project purge 删除了术语运行记录，因此无法安全恢复更具体的异常文本。按停止规则不重试 Provider。

## next_owner

SERVER/编排 owner：基于保留的 active canonical terms route，重新提供可持久化最终 stdout 的单次 E2E harness；在确认首因后再决定是否授权新的真实 Provider 调用。

## residual

- 按要求永久保留唯一 canonical SecretReference、engine/version 和 active terms route。
- 无 synthetic project、COS object、runtime tree 或临时 overlay/wrapper 残留。
- Secret 值、Base64、对象键均未写入本报告。
