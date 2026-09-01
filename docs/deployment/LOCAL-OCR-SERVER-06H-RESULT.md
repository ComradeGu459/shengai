# LOCAL-OCR-SERVER-06H 结果

- outcome: blocked
- slice_outcome: blocked
- goal_gap: synthetic 在 Worker 领取阶段因 SYSTEM_CONTROL_BUDGET_QUOTE_INVALID 失败，未到达抽帧、OCR 候选和证据 COS Put/Head/独立 Get 验收。
- next_owner: BACK/PLANNING
- requires_user: true（需先修复或重新规划预算报价配置，并取得新的 formal lease；本轮禁止盲重跑）
- role: SERVER
- formal_lease: 1

## candidate identity / manifest

- repo_root: C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud
- candidate_id: 20260828-local-ocr-06h-r1
- candidate archive SHA-256: DF0E459B83C8C722556F7515839023AF9F348CF9D22A012B8133077A4144B854
- candidate manifest SHA-256: E6DED885ED69694688CDCED54EEFF62821FC8C751D3066EC49C418074CA60A83
- candidate manifest bytes: 733
- source identity: 当前 contracts 四个 dist 与 migrations 26000/27000；未修改业务源码

| 文件 | bytes | SHA-256 |
|---|---:|---|
| packages/contracts/dist/screen-text.js | 20464 | 483219c8a358533cfd55acb264f0c42918192267f0c3a484a181798ba56b682a |
| packages/contracts/dist/screen-text.d.ts | 77215 | 488f690d9f9e94e10409db9cf69926a7153a141c94daa11a9d3f7aca5a9ce497 |
| packages/contracts/dist/screen-text.js.map | 24731 | d1b33538f6df5362aaa633cc5aad78dee7ecb2ba65ddc244298ebbb10cbf5c10 |
| packages/contracts/dist/screen-text.d.ts.map | 4781 | ef3f25ac4705cb49897d0bbc9bef312c1e048791def9ff737bf10e10523b1cb6 |
| backend/migrations/1754976026000_expand_screen_text_batch_model.cjs | 535 | ea0c18ff9cbb0c9d3559d43753dc0081399a733b4895c2a79b2650afc92a46eb |
| backend/migrations/1754976027000_expand_screen_text_attempt_model.cjs | 539 | 3a121105616df018f0fcf25b60536955dccd2f4881166fa94661887b6f16365d |

## preflight / migration

- SSH connection: existing protected credential + configured username qimao-deploy@103.36.63.67 passed；未使用 milaidi.online，未读取或输出私钥。
- preflight: 27000 unregistered；screen_text_attempts.model was character varying(80)；Worker 停止后 DB 连接从 6 降至 5，其他 active query 为 0。
- DDL lock probe: ACCESS EXCLUSIVE on public.screen_text_attempts with controlled lock_timeout=3000ms passed.
- migration: exactly once；26000 and 27000 are registered in schema_migrations as ids 41 and 42；both screen_text_batches.model and screen_text_attempts.model are now character varying(160).
- migration stdout was copied to this result file before any cleanup:

<pre>> Migrating files:
> - 1754976027000_expand_screen_text_attempt_model
### MIGRATION 1754976027000_expand_screen_text_attempt_model (UP) ###
</pre>

- migration stderr was copied to this result file before any cleanup: empty, 0 bytes.

## switch / rollback / runtime

- migration success后曾原子切换到 /opt/qimao-terms-cloud/releases/20260828-local-ocr-06h-r1；candidate backend health 曾通过，Worker 曾恢复。
- synthetic 失败后按失败恢复分支切回 /opt/qimao-terms-cloud/releases/20260828-local-ocr-05g-r4-composite。
- final current target: /opt/qimao-terms-cloud/releases/20260828-local-ocr-05g-r4-composite
- final qimao-backend.service: active/running, NRestarts=0
- final qimao-worker@screen-text.worker.entry.js.service: active/running, NRestarts=0
- final qimao-upload-completion-worker.service: active/running, NRestarts=0
- final health: GET http://127.0.0.1:3001/health returned {"service":"qimao-terms-cloud-backend","status":"ok","milestone":"m2-projects","database":"connected"}
- active routing pointer/target 未修改；本轮未修改 migration、route、Provider、CORS、连接测试或业务代码。

## synthetic evidence

- synthetic identity: project c5ed4cdc-b8df-4b75-9705-9f0bbf82f549
- failure: SYSTEM_CONTROL_BUDGET_QUOTE_INVALID
- failure stage: Worker claim / budget quote；因此没有通过 terminal batch/job/attempt，未产生 candidate，未产生 evidence Put/Head/独立 Get。
- cleanup verification after correcting the existing screen_text_batch_assets -> assets RESTRICT deletion order:
  - batches deleted: 1
  - projects deleted: 1
  - evidence objects found/deleted: 0
  - video object: deleted；independent Head after delete: missing
  - remaining project/assets/batches/jobs/candidates: 0/0/0/0/0
- no fixture is retained for TEST because the terminal OCR evidence gate did not pass.

## remaining gap

预算报价配置必须先使生产 Worker 能为 screen_text self-hosted route 生成有效 quote；之后由规划线程发新任务卡和新的 formal lease，再单次执行完整 synthetic：抽帧 → loopback OCR → candidate/log → private COS evidence Put/Head/independent Get/content-type/size/SHA。

## files

- written: docs/deployment/LOCAL-OCR-SERVER-06H-RESULT.md
- migration stdout/stderr were embedded above before cleanup; local task staging copies are removed
- no BACK/FRONT/UI/TEST business files changed

## residual

- database migration 26000/27000 remains applied；本轮不回滚 migration。
- current/services are restored to 05G；failed synthetic DB/COS fixture is removed.
- candidate release, uploaded archive/manifest, migration capture files and one-shot remote helper files were removed and verified after this result file was written.

## requires_user

是：请由 BACK/PLANNING 处理 SYSTEM_CONTROL_BUDGET_QUOTE_INVALID 的预算报价事实，并重新下发不超过 8 行的当前任务卡；SERVER 不会自行修改 Provider/route/budget 业务实现，也不会盲重跑。
