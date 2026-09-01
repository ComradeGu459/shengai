# TERM-CONTROL-E2E-AUDIT-SERVER-20

- artifact_written: yes
- blocked: true
- outcome: evidence_unrecoverable
- requires_user: false

## evidence

审计范围为 SERVER-19 唯一运行的服务器时间窗 `2026-08-30 03:17:20` 至 `03:18:10`（Asia/Shanghai）。未重跑 E2E，未发起 DeepSeek、COS 或 Tencent 请求，未修改生产配置、unit 或数据库。

- journal 共 80 条，但与 Provider 请求相关的关键词 `api.deepseek.com`、`chat/completions`、`CreateRecTask`、`tencent_cloud`、`provider_request_id`、`DeepSeek`、`Tencent` 命中 0 条。
- 可确定的启动边界：03:17:31 journal 记录 `/tmp/term-control-route-e2e-19-phase-b-wrapper.sh` 被调用；03:17:58 SSH 会话结束，journal 记录该 sudo 会话消耗 CPU `5.073s`。journal 没有 harness 子进程阶段、HTTP 状态或异常文本。
- 持久数据库记录：项目 `e4f5907c-9308-4925-b209-58b23d086e3b` 于 03:17:34.773705 创建，最终 03:17:57.647 purge；tombstone 为 `asset_count=2`、`object_deleted_count=2`、`object_missing_count=0`、`terminated_upload_count=0`。
- 同一时间窗当前可见记录为：`term_extraction_runs=0`、`asr_batches=0`、`asr_attempts=0`。术语运行记录随后随 synthetic project purge 删除；没有可用于恢复 DeepSeek run/status/request id 的持久记录。没有 ASR batch/attempt，故没有可查询的 Tencent TaskId。
- 上一回合已确认的 canonical 稳定资源仍在：SecretReference `70241673-bc30-4a69-8a2e-7a1fb72f6320` / version `d9b406fd-282b-4c1d-85a8-a59b86d67259` 为 `available`；engine `c7960837-8dab-40e4-b40d-e833c10508c3` 与 version `d149bfec-e95f-4a57-8aea-40655a458053` 为 `enabled`；route `8e76ffde-83f6-4cad-b8ff-0f2bf620f38d` 为唯一 `active`，`terms_api` target 指向该 version。
- 上一回合已见的 SERVER-19 最终 stdout 在收取时被截断；当前 journal 和持久记录均不能补回它。因此不能证明 DeepSeek POST 是否 attempted/accepted，也不能给出第一条业务异常文本或 Provider 时间戳。

## first_determinate_stop

唯一可证明的停止点是“2 个 COS assets 完成后、ASR batch 创建前”。这不是对 DeepSeek 网络行为的否定：由于没有保存的 run/request 记录、Provider 日志或最终 stdout，DeepSeek POST 状态为 `unrecoverable`，第一条确定异常为 `unrecoverable`，不得据此重试。

## remaining_gap

缺失 DeepSeek POST 的 attempted/accepted 证据、DeepSeek run 状态与候选/TermVersion 记录；没有 ASR batch，因此缺失 Tencent TaskId、completed 状态、锁定的 termVersionId/hotwordDigest 和 HotwordList receipt。

## next_owner

SERVER/编排 owner 仅设计下一次单次 harness，待明确授权后再执行：

1. 启动前由 root 在固定 runtime tree 创建 0640、owner `0:996` 的 append-only checkpoint/stdout 文件；每个阶段先写入时间、stage、稳定 id、HTTP status 和 error code，再进行下一步。stdout 与进程退出码持久化后才允许清理。
2. 使用固定 command/idempotency keys，立即持久化 projectId、manifestId、uploadId、term runId、draftId、termVersionId、ASR batchId；Provider 请求只允许各自一次。
3. DeepSeek 返回 unknown 时只查询同一 term runId；Tencent 返回 unknown 时只查询同一 TaskId；禁止新建 run、重新 POST 或更换身份。所有日志过滤载荷、Secret、Base64、对象键，只保留 allowlisted 状态字段。
4. 清理延后到 safe result 已落盘并复制出 runtime tree 后；清理阶段另写 checkpoint，保留 purge/tombstone 计数，避免再次先 purge 后丢失业务证据。
5. harness 完成后再以只读方式核对四个 unit；本次审计不执行上述设计。

## residual

- SERVER-19 的 synthetic project/COS/runtime tree 已由上一回合精确清理；本审计未产生残留。
- 唯一 canonical SecretReference、engine/version、active terms route 按要求保留。
- Secret 值、请求载荷、Base64、对象键均未输出或写入本报告。
