# TENCENT-ASR-SERVER-03A

## outcome

`blocked`

## evidence

- CURRENT 为 `v4-1237`，formal lease=`1`；本轮只读完成前置核对，未读取或传输 `SecretKey.csv`，未访问 COS/ASR。
- 06Q 已确认 backend 当前实际运行 `20260828-local-ocr-06k-r1`，backend active、`NRestarts=0`、health/database 正常、未认证 API=`401`；06K 已包含 Tencent ASR compiled dist。本轮未重启服务。
- `backend/src/server.ts:34-52,127-130` 在显式 ASR 环境完整配置时可装配真实 Tencent registry；`backend/src/modules/asr/tencent-asr-adapter.ts` 的真实 adapter key 为 `tencent_cloud_recorded_v1`。
- 但 `backend/src/modules/system-control/system-control.engine-registry.ts:25-33` 的 `CONTROL_PLANE_PROBE_KEYS` 仅允许 Wave A 零网络 probe，不包含 `tencent_cloud_recorded_v1`；`resolveRegisteredEngine()` 在 `:69-73` 因此拒绝该真实 adapter。相同限制也作用于 `runRegisteredProbe()` 的 `:163-164`。
- `backend/src/modules/system-control/system-control.engine.service.ts:186-193,199-239` 证明 `createDeployment()` 在任何 deployment/version INSERT 前先调用 `resolveForBody()`；因此当前代码无法通过既有控制面建立真实 Tencent deployment/version。路由服务也在 `backend/src/modules/system-control/system-control.routing.service.ts:165-172` 再次要求 adapter 已在当前进程登记。
- 直接 SQL 绕过上述注册与审计门会产生未被控制面认可的 deployment/route，违反本任务的控制面边界，未执行。

## remaining_gap

唯一阻塞是当前已部署代码的控制面真实 adapter 白名单仍冻结为零网络 probe；没有经过 BACK/规划审核的、允许 `tencent_cloud_recorded_v1` 的生产候选，无法安全创建 active `asr_api` route，也不应进入 Worker/Secret/COS/ASR/synthetic 写阶段。

## next_owner

BACK/规划：在新任务中提供并审核允许真实 Tencent adapter 进入控制面的候选（保持 fail-closed、审计与幂等约束），随后再由 SERVER 重新执行 03A。当前任务不得通过数据库旁路或临时运行时补丁替代该候选。

## files

- `docs/deployment/TENCENT-ASR-SERVER-03A-RESULT.md`
- `docs/status/CURRENT.md`
- `docs/deployment/LOCAL-OCR-SERVER-06Q-RESULT.md`
- `docs/deployment/TENCENT-ASR-SERVER-02L-RESULT.md`
- `backend/src/modules/system-control/system-control.engine-registry.ts`
- `backend/src/modules/system-control/system-control.engine.service.ts`
- `backend/src/modules/system-control/system-control.routing.service.ts`
- `backend/src/modules/asr/tencent-asr-adapter.ts`
- `backend/src/server.ts`

## residual

- 远端未创建 release、ASR Worker unit、root-only ASR env、deployment/version、route 或 synthetic 身份；未修改 DB、COS、服务、current、unit、代码或 migration。
- 未读取/传输 Secret，未调用 COS/ASR，未产生付费写入；未创建需清理的本轮临时件或 fixture。
- 现有 06K/backend/既有 Worker、route、budget 与生产数据保持原状；脏工作树按要求保留。

## requires_user

`true`

