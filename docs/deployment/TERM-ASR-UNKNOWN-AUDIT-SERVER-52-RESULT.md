# TERM-ASR-UNKNOWN-AUDIT-SERVER-52

## 交付

- artifact_written
- outcome: blocked

## outcome

CloudAudit `LookUpEvents` 唯一一次调用返回 `permission_denied`，稳定错误码为 `AuthFailure.UnauthorizedOperation`。事件数为 0，无法裁决 SERVER-51 的 Tencent CreateRecTask 是否已被接受，也没有可关联的官方数值 TaskId。按停止门不重试、不改 CAM、不调用 CreateRecTask 或 DescribeTaskStatus。

## evidence

- SERVER-51 Create 时间窗由 root-only 元数据确定：`StartTime=1788049443`（UTC `2026-08-30T00:24:03Z`），`EndTime=1788049453`（UTC `2026-08-30T00:24:13Z`）。窗口来自 `business.stdout` 创建时间与 status 完成时间；未读取或输出业务正文。
- 残留 release 中官方 `tencentcloud-sdk-nodejs-common` CommonClient 存在；`provider.source` 仅由 root 进程读入内存，未输出 Secret 值。
- API 合同调用参数：版本 `2019-03-19`、Action `LookUpEvents`、`EventName=CreateRecTask`、`MaxResults=20`、`Mode=standard`；未输出 requestParameters、URL、HotwordList、对象键、SecretId 或 IP。
- 本片 CloudAudit 调用计数：`1`；Tencent ASR CreateRecTask：`0`；Tencent ASR DescribeTaskStatus：`0`；SCP、runner、发布、清理：`0`。
- 安全投影：`eventCount=0`、`errorCode=AuthFailure.UnauthorizedOperation`、`apiErrorCode=null`、数值 TaskId 候选为空；因此 EventTime、EventId、RequestID、eventRegion 均无可记录事件值。

## cleanup

按本任务只读合同未执行清理。SERVER-51 对账前提继续保留：runtime、root-only status、隔离 DB、COS 临时对象保留；transfer 已不存在，transient 已按既有证据不存在。本片未产生状态变更。

## remaining_gap

CloudAudit 权限被拒，无法恢复 SERVER-51 的官方 Tencent TaskId，也无法证明 CreateRecTask 的最终接受状态；bounded reconciliation 仍未闭合。

## next_owner

云账号/IAM/CAM/Provider 负责人：为只读 CloudAudit `LookUpEvents` 提供所需权限并复核 `AuthFailure.UnauthorizedOperation`。在授权前不得新建 CreateRecTask、DescribeTaskStatus、runner 或清理对账上下文。

## residual

SERVER-51 的 runtime、status、隔离 DB、COS 及其最小对账上下文保持原状；本地仅新增本结果文档。

## requires_user

false
