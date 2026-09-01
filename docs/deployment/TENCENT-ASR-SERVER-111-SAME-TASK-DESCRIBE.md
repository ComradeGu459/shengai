# ASR-SERVER-111-SAME-TASK-DESCRIBE

## outcome

blocked。109 保留现场中的唯一非空 providerRequestId 已确认存在；使用既有 release transport 执行了一次同一任务的 `DescribeTaskStatus`，返回 `DESCRIBE_FAILED`，未获得可用终态。

## evidence

- RunId：`asr-109-20260829-r1`。
- providerRequestId：`exists=true`，未回显值。
- 官方 TaskStatus：`unavailable`；未获得 0/1/2/3。
- 安全 ErrorCode：`DESCRIBE_FAILED`。
- RequestId：`exists=false`（未收到可确认的响应 RequestId）。
- 同一 Describe 调用次数：1；未执行 CreateRecTask、第二 TaskId、业务重放、cancel、delete 或 drop。
- 结果/cue/usage/operation 计数与状态：本轮聚合查询未返回，记为 `unknown`，不作猜测。
- 未输出 Result、文本、TaskId、对象键、URL、Secret 或数据库连接串。

## cleanup

按 unknown 规则未清理隔离 DB、COS source 或 remote root；一次性本机 helper 已删除。未执行任何远端写入或清理命令。

## residual

109 的 remote root 与隔离 DB 按保留现场规则继续存在；providerRequestId 对应的外部事实仍需规划审核。外部写入=0（本轮仅 Describe 读取）。

## remaining_gap

同一 TaskId Describe 未返回可用状态，且 DB 的 result/cue/usage/operation 明细未形成可报告结果；不得再次 Describe、Create 或猜测终态。

## next_owner

PLANNING
