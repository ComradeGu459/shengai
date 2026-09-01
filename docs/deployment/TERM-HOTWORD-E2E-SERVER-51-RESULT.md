# TERM-HOTWORD-E2E-SERVER-51

blocked

## outcome

`release_preflight_failed` → bounded reconciliation 仍为 `unknown`。首个确定编排异常发生在 SCP 前的 transfer preflight：PowerShell here-string 以 CRLF 传入 Bash，导致固定路径后置 `stat` 失败（`cannot statx ...$'\r'`）。随后已发生的唯一执行事实按新停止令完成同一身份对账；不重发、不启动第二个 runner。

## evidence

- 本地 50R1 `bytes-sha.json` 自身 SHA：`2bdb6d10e49745af2fa6e2df6fe91c280557759a2af9341f95a043b7eb3777e2`；逐项实际文件 bytes/SHA 全等，未修改准备目录。
- 远端初始身份/碰撞前门通过：`qimao-deploy`、Node `v24.19.0`，固定 transfer/runtime/status/transient 均无碰撞。
- 实际计数：SCP=`1`；transient launch=`1`；第二 SCP/第二 runner=`0`。
- 已发生外部业务计数：DeepSeek POST=`1`、HTTP=`200`；Tencent CreateRecTask=`1`；Tencent 状态=`unknown`；未重发或查询第二身份。
- bounded reconciliation：对同一 `TaskId` 调用既有 `DescribeTaskStatus` 接口；release transport 返回稳定 `unknown`，原因是该值为 `tencent:create-unknown:<job>:1` 非腾讯官方数值 TaskId，现有实现按合同 fail-closed，未产生第二 Create。provider 网络层 Describe 请求未观察到可证明的实际发送；不得据此猜测 Tencent 终态。
- 唯一稳定业务身份来自同一 root-only status：
  - `runId=term-control-final-e2e-46-r1`
  - `projectId=0d92b7ba-6ccb-4c07-8b7b-4fdf93725dc8`
  - `termRunId=7fa9dcad-f978-4a53-a5d2-6603df5b50c2`
  - `termAttemptId=c3c0700b-ac7b-4dc8-ae18-a14833b80e89`
  - `termVersionId=77bf9a13-8615-408c-b0b3-6da5d97f4096`
  - `batchId=f985c595-e2c9-4ac8-8228-c4f9b1c542ed`
  - `TaskId=tencent:create-unknown:e6183a68-e8f1-42ab-8e08-3075f550f78b:1`
- status 记录 `ASR_CREATE_UNKNOWN`、`asrCreateStatus=unknown`、`reconciliationRequired=true`；因此不能宣称 confirmed TermVersion、HotwordList completed 或 Tencent completed。
- 未输出 Secret、原始响应、载荷或对象键。

## cleanup

- 已按同一稳定身份精确删除 transfer：`/tmp/qimao-term-control-final-e2e-46-transfer`。
- transient 已 collect：`LoadState=not-found`、`ActiveState=inactive`。
- 因 bounded reconciliation 仍 unknown 且 `reconciliationRequired=true`，按既有保护语义保留 runtime/status/隔离 DB/COS 对账上下文：runtime=`present`，status=`present`；未盲删任何对账前提。

## remaining_gap

真实链路未形成可验收终态：Tencent Create 已接受到同一稳定身份但官方数值 TaskId 不可观测，bounded Describe 仍 unknown；未确认 HotwordList、digest、usage/cue 或 completed。残留对账上下文必须保留，下一片只能沿该身份恢复 provider-side correlation/终态后再决定清理。

## next_owner

规划/服务器/Provider Owner：下一片复用文件化 LF 传输 helper，先处理 transfer preflight 编排；同时只能沿本次稳定身份恢复官方 TaskId/终态。不得现场修改本 runner、重放 SCP、重启第二 runner 或盲重发 Tencent。

## residual

- 远端 transfer=`absent`，transient=`not-found`；runtime/status/隔离 DB/COS 为 reconciliation 保留态。
- 生产 current、DB、控制面、四 unit、公网路由未被本片写入；本片未执行发布或配置修改。
- 本地 50R1 准备目录保留不变。

## requires_user

`false`
