# TERM-CONTROL-E2E-EXECUTE-SERVER-47

blocked

## outcome

`business_failed_before_asr`。唯一 transient runner 启动一次并自然结束；未重放、未现场修补。首个确定业务错误为 `BUDGET_APPROVE_API_SYSTEM_CONTROL_BUDGET_IMPACT_BLOCKED`，阶段为 `business`，退出码为 `1`。

## evidence

- 远端只读前门：`qimao-deploy` 登录成功；固定 transfer、runtime、status 均 absent；同名 transient `LoadState=not-found`。
- 唯一 SCP：退出码 `0`；5 个文件远端 bytes/SHA 与 SERVER-46 冻结值完全一致。未传 `bytes-sha.json`，未改文件名。
- 唯一 transient：`qimao-term-control-final-e2e-46.service` 启动返回 `0`，初始为 `active/running`；最终 `LoadState=not-found`、`Result=success`、`ExecMainStatus=0`。
- runner checkpoint 已到 `bootstrap=prepared`、`migrate=migrated`、`route_copy=verified`；route-copy pointer=1、terms_api target=1，隔离 route identity 与生产读取结果匹配。
- business facts（失败清理前 root-only status 读取并保存）：
  - `runId=term-control-final-e2e-46-r1`
  - `projectId=a6e0d5b1-61c1-4ebd-8a82-013e2d2281a2`
  - `termRunId=b3fa4c91-6386-4235-ad92-109979ca394e`
  - `termAttemptId=ab10dfe5-3a1b-44f9-89a3-fbed7b048006`
  - `termVersionId=7d4dc2e6-f76f-4be1-8972-5679c13c9ab7`
  - DeepSeek POST=`1`，HTTP=`200`
  - Tencent CreateRecTask=`0`
  - batch/TaskId/ASR HotwordList：未产生
  - `reconciliationRequired=false`
- 业务失败发生在预算批准 API，位于 ASR dispatch/CreateRecTask 之前；因此 Tencent 调用、ASR batch、TaskId、hotwordDigest/HotwordList 均为 `0`/未产生。未输出原始响应、Secret、载荷、对象键或 error detail 正文。
- 生产收尾只读核对：
  - current=`/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1`
  - static=`/opt/qimao-terms-cloud/static`
  - `qimao-backend.service`、`qimao-worker@term-extraction.worker.entry.js.service`、`qimao-worker@system-control.secret-validation.worker.entry.js.service`、`qimao-worker@system-control.connection-test.worker.entry.js.service` 均 `active/running`、`NRestarts=0`、`ExecMainStatus=0`
  - loopback health HTTP=`200`
  - 生产 active `terms_api` route count=`1`，target provider=`deepseek`、model=`deepseek-v4-flash`、version=`1`、status=`active`，未变更

## cleanup

失败证据保存后已精确删除 `/tmp/qimao-term-control-final-e2e-46-transfer` 与 `/run/qimao-term-control-final-e2e-46.status.jsonl`；`/tmp/qimao-asr-term-control-final-e2e-46-r1` 已 absent；transient unit 已 collect。远端临时残留=`0`。本地冻结准备目录按要求保留。

## remaining_gap

真实闭环尚未完成：虽然已观察到 DeepSeek HTTP 200 并取得本轮 termVersionId，但未完成预算批准后的 ASR dispatch → Tencent CreateRecTask → HotwordList completed 验收，也未形成 TaskId/hotwordDigest 终态证据。该失败不是 Tencent 或 ASR 失败。

## next_owner

规划 / 控制面 Owner：先审查并修复既有 `BUDGET_APPROVE_API_SYSTEM_CONTROL_BUDGET_IMPACT_BLOCKED` 根因，再依据新授权决定是否重新签发执行窗口；SERVER 本轮不修改源码、route、provider、DB 或 unit，不自动重放。

## residual

远端 transfer/runtime/status/transient/隔离 DB/COS 临时资源均为零；生产 current、控制面、四 unit、health 未改。唯一保留物为本地 SERVER-46 冻结准备目录。

## requires_user

false
