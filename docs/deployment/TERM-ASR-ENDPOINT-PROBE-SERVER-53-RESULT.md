# TERM-ASR-ENDPOINT-PROBE-SERVER-53

## 交付

- artifact_written
- outcome: `provider_rejected_permission_denied`
- requires_user: `false`

## outcome

SERVER-51 的唯一 CreateRecTask 已由腾讯云根控制台权威事件确认到达但被拒绝：CAM `errorCode=11008`、API `errorCode=210`、`AuthFailure.UnauthorizedOperation`，原因是缺少 `asr:CreateRecTask`；`responseElements` 为空且没有官方 TaskId。因此本片按 `external_not_accepted` 完成固定身份清理。

## evidence

- 紧急停止前已完成一次文件化 LF probe 的唯一传输；本地 probe `node --check` 通过，LF-only（CR=0）。远端固定 runtime、root-only status、provider.source 与 release 内官方 CommonClient 前门均通过。
- 紧急停止前，probe 使用 root 内存读取 provider.source，并通过残留 release 的官方 CommonClient 对固定正整数探针身份调用原生 `DescribeTaskStatus` 一次。请求已触达 Provider，收到 API 响应：`code=AuthFailure.UnauthorizedOperation`、`name=Error`、`httpStatus=null`、`requestIdPresent=true`、`requestIdLength=36`、`requestIdSha256=0fbbb2f24df3f3d7e1d831168d434f7ff256d0bcd172db65bf99b6b326166356`。未输出 TaskId、Secret、原始响应、message、对象信息或 URL。
- 本片实际调用计数必须如实区分范围更新前后：CreateRecTask=`0`、DeepSeek=`0`；DescribeTaskStatus=`1`（发生在紧急停止/范围更新之前），范围更新后追加 Describe/Create/DeepSeek=`0`。未执行 runner、发布、业务 API 或第二次 Provider 调用。
- 清理前隔离库安全计数：projects=`1`、assets=`2`、upload_sessions=`2`、asr_batches=`1`、term_extraction_runs=`1`；未读取或输出对象键。
- 紧急停止时本地 SSH 已被终止，但远端固定清理进程随后完成：其控制流仅在 COS 对象删除及成功 HEAD 缺失核对完成、隔离 DB 删除成功后才删除 runtime/status。runtime 与 status 均已核实 absent，因此 COS 清理门、隔离 DB 删除和固定 root 删除均已完成。
- 生产只读核对：current=`/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1`，static=`/opt/qimao-terms-cloud/static`；四 unit 均 `active/running`、`NRestarts=0`、`ExecMainStatus=0`；health HTTP=`200`；唯一 active `terms_api` route 为 `deepseek/deepseek-v4-flash/1/active`，未变更。

## cleanup

- 仅针对 SERVER-51 固定身份执行清理：COS 临时对象删除并以同一对象身份 HEAD 缺失核对、隔离 DB 删除、runtime（含 release/harness/probe/env 与安全输出）删除、root-only status 删除。
- 远端 runtime=`absent`、status=`absent`、隔离 DB=`absent`；本地 probe 临时目录=`absent`。未执行生产恢复写入。

## remaining_gap

CreateRecTask 被 Provider 权限拒绝，没有创建官方任务，因此不存在可继续 Describe 的官方 TaskId，也不存在 ASR HotwordList 终态需要恢复。该 lease 不再进行 Provider 或业务重试。

## next_owner

规划 / Provider 负责人：保留腾讯云事件中的权限缺口事实；若未来重新开展真实 ASR，需另签新 lease 并先解决 `asr:CreateRecTask` 权限，不得在本片重发。

## residual

SERVER-51 隔离 DB、COS 临时对象、runtime、status、release、harness、probe 与本地临时 probe 均为 0；生产 current/static、route、四 unit 与 health 保持原基线。

## requires_user

false
