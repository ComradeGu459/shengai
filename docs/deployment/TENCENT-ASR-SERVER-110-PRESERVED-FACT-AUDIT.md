# ASR-SERVER-110-PRESERVED-FACT-AUDIT

## outcome

artifact_written。R1 只读核验确认 109 的隔离业务事实仍存在，但 COS source HEAD 返回 error，无法完成“providerRequestId 与源对象均存在”的联合门；不执行查询或重放。

## evidence

- 固定 RunId：`asr-109-20260829-r1`。
- remote root：`exists=true`；安全属性为 `directory|qimao-deploy|qimao|750`。
- 隔离 DB：`exists=true`。
- 全库聚合：projects=1、asr_batches=1、asr_jobs=1、asr_attempts=1、providerRequestId 非空计数=1；batch/job/attempt 状态集合均为 `completed`。
- 按 projects.name 精确匹配后 join：batch=1、job=1、attempt=1、providerRequestId 非空计数=1；batch/job/attempt 状态均为 `completed`。
- providerRequestId：`exists=true`（仅布尔事实）。
- COS source HEAD：`error`；已取得并在远端变量中使用匹配 project 的视频 asset key，但未回显 key/URL，未取得 `exists` 布尔结果。
- 外部写入=0；未执行 runner、业务重放、CreateRecTask、DescribeTaskStatus、cancel、delete、drop 或生产修改。
- 未输出 TaskId、对象键、URL、Secret、文本、媒体或数据库连接串。

## cleanup

本轮只读核验未创建资源，未执行任何清理动作；一次性本机核验脚本已删除。

## residual

109 remote root 仍存在，隔离 DB 仍存在；按用户要求未删除。providerRequestId 与业务状态事实保留；COS source HEAD 未取得成功结果，不能宣称对象存在或已清理。

## remaining_gap

指定 project 下的 batch/job/attempt/providerRequestId 持久事实均存在且状态为 completed；但 COS source HEAD 为 error，联合保留事实门未闭合。若后续确认源对象存在，现有 `TencentOfficialAsrTransport.DescribeTaskStatus`（由 `TencentAsrAdapter` 调用）可对账同一 providerRequestId；本轮未执行该查询。

## next_owner

PLANNING

## requires_user

false
