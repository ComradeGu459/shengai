# ASR-BACK-114-HOTWORD-MVP

## outcome

artifact_written：已在现有 Tencent Recorded ASR 请求链加入官方 `HotwordList` 投影；未新增状态、表、Provider、控制面或部署流程。

## evidence

- `TencentCreateRecTaskRequest` 明确支持 `HotwordList`，与本地锁定的 `tencentcloud-sdk-nodejs-asr@4.1.298` 官方类型一致。
- 新增 `buildTencentHotwordList`：trim/去空、每项最多 30 个 Unicode 字符且最多 10 个汉字、截断后去重、最多 128 项，固定权重 `5`，输出 `词|5` 逗号串。
- CreateRecTask 仅在存在有效投影时发送 `HotwordList`；无术语投影时不发送，既有 receipt 保持零提交事实；截断/去重/超限通过 `partially_submitted` 与计数反映。
- 现有任务重试继续复用持久化 batch/term-version 热词投影与 digest，未改变重试身份或状态机。

## validation

- `git diff --check -- backend/src/modules/asr/tencent-asr-adapter.ts tests/backend/tencent-asr-adapter.test.ts`：通过。
- 定向 Vitest、backend typecheck/build 已尝试，但当前工作区未物化 `vitest`/`tsc` 可执行文件（命令分别以“not recognized”退出），因此未能取得本机测试绿灯。

## remaining_gap

需在依赖可执行文件可用的同一工作树重新运行 Tencent adapter/runtime 专项及 backend typecheck/build；本轮未连接腾讯/COS/服务器，未读取 Secret。

## next_owner

PLANNING（复核后安排依赖就绪环境验证）。

## residual

仅保留本轮两份 adapter 专项测试与一份报告差量；无临时数据库、网络进程或外部资源。

## requires_user

false

## R1 状态

blocked：无 confirmed TermVersion 的完整语义无法仅在 adapter 内闭合。当前 `CreateAsrBatchBody.termVersionId` 必填，且 `asr_batches`、`asr_jobs`、`asr_results` 的 `term_version_id` 迁移约束为 NOT NULL；command、worker、read、dispatch 多处直接查询/解引用该字段并要求热词摘要。要实现 null 锁定、重试复用与读取兼容，必须同步新增 nullable 迁移及跨模块查询/类型改动，并定义“未使用” receipt 合同，超出本轮已验证的最小 adapter 切片，故未继续写入或运行外部动作。

remaining_gap：需规划签发独立的 nullable TermVersion 迁移与跨模块租约，并先确定 receipt 的正式“unused”状态/字段；现有 0 词 `submitted` 不能作为最终语义。

next_owner：PLANNING。

## 115-R5 结果

outcome：仅更新两份后端 ASR 测试旧断言，反映无术语项目现为 eligible/可派发。

evidence：`tests/backend/asr.test.ts` 断言无术语项目 `eligible=true`、`termVersionId=null`、空热词并可在 partial dispatch 中接收；补 preparation 无参数返回 NULL。`tests/backend/asr-dispatch-rev2.test.ts` 将搜索结果中的旧 `missing_terms` 断言改为 `eligible`。

validation：限定 `git diff --check` 通过；本轮未运行 Vitest，当前环境缺少 runner，未宣称测试通过。

remaining_gap：retry 从 NULL batch 保持 NULL 的集成断言仍需在可用依赖/隔离数据库环境补跑确认。

next_owner：PLANNING。

## 115-R4 结果

outcome：修正命令层 undefined/null 三态语义。

evidence：合同允许 `termVersionId` 为 optional uuid 或显式 null；undefined 在 create/preparation 时选择最新 confirmed，null 锁定无版本，uuid 仅接受 confirmed。dispatch 将 eligibility snapshot 的 uuid/null 原样传入，不省略；retry 仍复制源 batch 锁定值。

validation：迁移 `node --check`、限定 `git diff --check` 通过；未宣称集成测试已验证，当前环境无法运行 Vitest/TypeScript，且未新增虚假测试结果。

remaining_gap：需在隔离 PostgreSQL 与依赖可用环境补跑 direct create/read、preparation、eligibility+dispatch、retry-null 集成回归及 typecheck/build。

next_owner：PLANNING。

## 115-R3 修正

outcome：完成 TermVersion 身份显式传递修正。

evidence：`AsrAdapterInput.termVersionId` 由 Worker 使用 claim 中锁定值传入；Tencent 仅在 `termVersionId === null` 时返回 `unused/no_confirmed_term_version`。confirmed 版本即使投影为 0 词也返回既有合法 `submitted + 0/0 + reasonCode=null`，不会误报无版本；已补两种零词回归。

validation：迁移 `node --check` 与限定 `git diff --check` 通过；Vitest/TypeScript 执行文件仍未物化，专项测试和 typecheck/build 未运行。

remaining_gap：需在依赖可用环境运行 Tencent adapter/runtime、ASR eligibility/dispatch/command 专项及完整 typecheck/build。

next_owner：PLANNING。

## 115-R3 结果

outcome：完成 eligibility、preparation、dispatch 的 nullable TermVersion 入口闭合。

evidence：preparation 请求版本改为可选，显式值仅接受 confirmed；省略时选择项目最新 confirmed，无版本返回 NULL 与空热词摘要。eligibility 不再因缺术语版本阻断，复用查询使用 `IS NOT DISTINCT FROM`；dispatch 直接把 eligibility snapshot 的 NULL 传入 create，不重新选择版本。批次/准备/结果合同均允许 NULL。

validation：迁移 `node --check` 与限定 `git diff --check` 通过；当前环境未物化 Vitest/TypeScript，未能运行 pnpm 定向测试、typecheck 或 build。

remaining_gap：需在依赖和隔离 PostgreSQL 可用环境验证 direct create、preparation、eligibility/dispatch、retry NULL roundtrip 及旧显式版本回归。

next_owner：PLANNING。

## 115-R2 结果

outcome：已修正 nullable TermVersion 迁移遗漏的两个既有 `asr_attempts` 约束，并补 Worker `unused` receipt 守卫。

evidence：`1754976028000_allow_null_asr_term_versions.cjs` 的 up 先 drop/recreate `asr_attempts_hotword_payload_valid`（加入 `unused`）与 `asr_attempts_hotword_receipt_facts_valid`（加入 `no_confirmed_term_version`）；down 先检测现存新状态/原因并 fail-closed，再恢复旧约束及三列 NOT NULL。Worker 仅接受 `unused + 0/0 + no_confirmed_term_version + payloadCount=0`，其他逻辑不变。

validation：迁移 `node --check` 与限定 `git diff --check` 通过；本环境未物化 Vitest/TypeScript 可执行文件，未能运行隔离 DB migration 或定向测试/typecheck/build。

remaining_gap：需在依赖和本地 PostgreSQL 可用环境运行 up/down 隔离回归、非法组合约束测试及 ASR 专项/typecheck/build。

next_owner：PLANNING。

## 115 结果

outcome：已完成 nullable TermVersion MVP 的合同、迁移与核心 command/worker/read 兼容切片。

evidence：新增 `1754976028000_allow_null_asr_term_versions.cjs`，仅放宽 batch/job/result 的 `term_version_id`，down 在存在 NULL 时拒绝恢复 NOT NULL；创建请求可省略版本，显式版本要求 confirmed，省略时锁定项目最新 confirmed，无 confirmed 时锁定 NULL 并生成稳定空 projection；结果/批次合同允许 NULL，最新版本判定对 NULL 明确为 false；Tencent 0 词 receipt 为 `unused/no_confirmed_term_version` 且不发送 HotwordList。

validation：本轮未运行测试或构建（当前环境仍缺少 `vitest`/`tsc` 可执行文件）；仅完成静态差量核对。

remaining_gap：需在依赖可执行环境运行 migration up/down、ASR command/dispatch/adapter/runtime 专项及 contracts/backend typecheck/build；还需对所有旧读模型与重试路径做数据库回归，确认 NULL 数据在真实隔离库可完整往返。

next_owner：PLANNING。
