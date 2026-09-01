# LOCAL-OCR-SERVER-06F 结果

- outcome: blocked
- 最后成功门：本地 overlay 六文件逐项 SHA、远端解包/clone 复制与候选内容校验均通过；候选未切换，synthetic seed 未开始。
- 直接阻塞：候选 `backend/dist/database/migrate.js` 返回非零并触发 fail-closed 清理。迁移 stderr 临时日志已随失败清理，无法安全还原原始错误正文；不重跑迁移。
- candidate release（已清理）：`20260828-local-ocr-06f-r1`
- base/current：`20260828-local-ocr-05g-r4-composite`（回滚/现行均为该 release）
- overlay archive SHA-256：`AA17BFDF03CAAD332D5DD0F4443A094CEFD275F0BD2603DCEF90310D69617235`
- candidate manifest：曾在 root-owned release 内生成，因迁移 fail-closed 随候选一并删除；manifest SHA-256 未取得（`unknown`），不伪造 immutable 成功证明。

## 变更闭包与哈希

本轮唯一 overlay（压缩包及 staging 已删除）包含：

| 相对路径 | 字节 | SHA-256 |
| --- | ---: | --- |
| `packages/contracts/dist/screen-text.js` | 20464 | `483219C8A358533CFD55ACB264F0C42918192267F0C3A484A181798BA56B682A` |
| `packages/contracts/dist/screen-text.d.ts` | 77215 | `488F690D9F9E94E10409DB9CF69926A7153A141C94DAA11A9D3F7ACA5A9CE497` |
| `packages/contracts/dist/screen-text.js.map` | 24731 | `D1B33538F6DF5362AAA633CC5AAD78DEE7ECB2BA65DDC244298EBBB10CBF5C10` |
| `packages/contracts/dist/screen-text.d.ts.map` | 4781 | `EF3F25AC4705CB49897D0BBC9BEF312C1E048791DEF9FF737BF10E10523B1CB6` |
| `backend/migrations/1754976026000_expand_screen_text_batch_model.cjs` | 535 | `EA0C18FF9CBB0C9D3559D43753DC0081399A733B4895C2A79B2650AFC92A46EB` |
| `backend/migrations/1754976027000_expand_screen_text_attempt_model.cjs` | 539 | `3A121105616DF018F0FCF25B60536955DCCD2F4881166FA94661887B6F16365D` |

## 迁移与远端状态证据

- `1754976026000_expand_screen_text_batch_model`：`schema_migrations` 中存在；`screen_text_batches.model` 为 `varchar(160)`。
- `1754976027000_expand_screen_text_attempt_model`：本轮结束时未登记；`screen_text_attempts.model` 仍为 `varchar(80)`。
- `migrate.js` 非零后候选目录、临时解包、overlay、迁移日志均由同一失败清理路径删除；未执行 down，未重跑。
- current 仍解析到 05G-R4；backend、upload-completion Worker、screen-text Worker、OpenVINO 均 `active`，各 `NRestarts=0`；health=200。
- 未切换静态/route/Worker/COS 配置；未访问 COS，未写数据库业务行，未创建 project/manifest/asset/batch/job，未生成 candidate/evidence。

## Synthetic/COS 门

- synthetic 视频：`not_run`（迁移门未通过）。
- `ScreenTextWriteRepository.create`：`not_run`。
- COS Put/Head/Get/Delete：`not_run`；无 object key、无对象残留。
- Worker 抽帧/OCR/candidate/evidence：`not_run`。

## 清理、残留与回滚

- 远端候选 release、overlay、stage、publish/debug helper、迁移临时日志：均不存在（精确路径核对 residual=0）。
- 本地 overlay/staging/verify 临时目录：均删除。
- 服务未因候选切换而重启；现行 05G-R4 健康状态保持不变。无需回滚服务指针。
- residual: `0`（保留既有 05G-R4 运行状态与已存在的 1754976026000 前向迁移；无 06F fixture）。

## 交接

- remaining_gap: BACK 需提供/修复 `1754976027000` 的可执行迁移并先在隔离事务/受控环境取得明确 PostgreSQL 错误证据；修复后再由 SERVER 重建唯一候选，禁止本轮盲重跑。
- next_owner: BACK
- files: `docs/deployment/LOCAL-OCR-SERVER-06F-RESULT.md`
- requires_user: false
