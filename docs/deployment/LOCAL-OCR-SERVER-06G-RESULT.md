# LOCAL-OCR-SERVER-06G 结果

- outcome: blocked
- direct_cause: 同一 migration identity `1754976027000_expand_screen_text_attempt_model` 已执行一次并返回非零；候选随后 fail-closed 清理，禁止重跑。
- last_success_gate: 06F overlay 六文件解包、clone 复制及逐项 SHA 校验通过。
- preflight: 本轮在迁移前未完成 screen-text Worker quiescence/DDL 锁探针（`not_run`）；因此不伪称 06G 前置门通过。
- migration_stdout_stderr: `unavailable`。本次执行未在清理前将远端 stdout/stderr 固化到本文件；候选和临时日志已清理，禁止为补证重跑。

## Candidate / overlay

- attempted release（已清理）：`20260828-local-ocr-06g-r1`（实际复用 06F overlay 内容）
- base/current：`20260828-local-ocr-05g-r4-composite`
- overlay archive SHA-256：`AA17BFDF03CAAD332D5DD0F4443A094CEFD275F0BD2603DCEF90310D69617235`
- candidate manifest：临时生成后随失败候选删除，manifest SHA=`unknown`。

| 相对路径 | 字节 | SHA-256 |
| --- | ---: | --- |
| `packages/contracts/dist/screen-text.js` | 20464 | `483219C8A358533CFD55ACB264F0C42918192267F0C3A484A181798BA56B682A` |
| `packages/contracts/dist/screen-text.d.ts` | 77215 | `488F690D9F9E94E10409DB9CF69926A7153A141C94DAA11A9D3F7ACA5A9CE497` |
| `packages/contracts/dist/screen-text.js.map` | 24731 | `D1B33538F6DF5362AAA633CC5AAD78DEE7ECB2BA65DDC244298EBBB10CBF5C10` |
| `packages/contracts/dist/screen-text.d.ts.map` | 4781 | `EF3F25AC4705CB49897D0BBC9BEF312C1E048791DEF9FF737BF10E10523B1CB6` |
| `backend/migrations/1754976026000_expand_screen_text_batch_model.cjs` | 535 | `EA0C18FF9CBB0C9D3559D43753DC0081399A733B4895C2A79B2650AFC92A46EB` |
| `backend/migrations/1754976027000_expand_screen_text_attempt_model.cjs` | 539 | `3A121105616DF018F0FCF25B60536955DCCD2F4881166FA94661887B6F16365D` |

## Schema / runtime 对账

- `schema_migrations`：1754976026000 存在；1754976027000 不存在。
- `screen_text_batches.model`=`varchar(160)`；`screen_text_attempts.model`=`varchar(80)`。
- current 仍为 05G-R4；backend、upload-completion Worker、screen-text Worker、OpenVINO 均 active，NRestarts=0，health=200。
- 未完成 atomic backend 切换；deployment/version、active route、Worker、COS 配置未改。

## Synthetic / COS

- synthetic project/batch/job：`not_run`。
- 抽帧、OCR、candidate、日志及 evidence：`not_run`。
- COS Put/Head/Get/Delete：`not_run`；无对象身份和残留。

## 清理与交接

- 候选 release、overlay、stage、publish/debug helper、迁移临时日志及本地 staging：均已删除；residual=0。
- 无业务数据库行、COS对象、项目或 route 写入；现行服务未需回滚。
- remaining_gap: BACK 需在不重跑本身份的前提下取得并修复 1754976027000 的明确 PostgreSQL 错误，补齐 Worker quiescence/锁探针与“迁移前复制 stdout/stderr”流程后再申请新切片。
- next_owner: BACK
- files: `docs/deployment/LOCAL-OCR-SERVER-06G-RESULT.md`
- requires_user: false
