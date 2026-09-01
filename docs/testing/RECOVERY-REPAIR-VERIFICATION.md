# TEST-RECOVERY-REPAIR-01 复验报告

日期：2026-08-21  
任务：`TEST-RECOVERY-REPAIR-01` / Rev 1  
handoffToken：`TEST-RECOVERY-REPAIR-01-R1-V4.908`  
角色：TEST；authority_generation=3  
仓库：`C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`

## 结论

本轮完成 A 四文件合并门，并在 A 全绿后按授权执行唯一一次隔离数据库绑定的完整 `pnpm check`。A 全绿；B 的完整门测试阶段因两个后端测试文件的 `afterAll` 清理 hook 超过 10 秒而退出 1。当前工作树不能宣称完整质量门通过，也不因此解除 C 隔离或获得部署许可。

## A：四文件合并门

- 前置 `git diff --check` 与 `pnpm run check:repo` 均退出 0。
- 隔离库：`qimao_recovery_repair_a_20260821_155605`；正式迁移 37/37。
- 迁移后核对：`schema_migrations=37`；projects、upload_sessions、material_manifests、term_drafts、asr_batches、screen_text_batches、delivery_jobs、connection_test_runs、feedback_events、acceptance_sessions、pre_edit_sessions 等业务 bootstrap 均为 0；模板迁移种子 `term_export_template_settings=1`、`term_export_template_versions=1` 单列保留。
- 唯一命令：
  `pnpm exec vitest run tests/backend/system-control-operations.test.ts tests/backend/uploads.test.ts tests/frontend/UploadQueue.test.tsx tests/frontend/material-folder-flow.test.tsx`
- 结果：4 files、49/49 tests 通过；operations `afterAll` 未超时。
- A 隔离库已精确 DROP，operations 测试前缀无残留。

## B：唯一完整门

- 隔离库：`qimao_recovery_repair_b_20260821_155834_cdf4db`；正式迁移 37/37，bootstrap 核对同 A，模板种子同样单列。
- 唯一命令：`DATABASE_URL=postgresql://postgres@127.0.0.1:55432/qimao_recovery_repair_b_20260821_155834_cdf4db pnpm check`（实际通过 PowerShell 环境变量绑定，运行一次）。
- `check:repo`、四工作区 lint、四工作区 typecheck 均通过；既有 `db:setup` 仅确认本机实例并输出 `No migrations to run!`，未迁移/清理共享默认库。
- 首个真实失败：`tests/backend/system-control-operations.test.ts` 的 `afterAll` hook 超过 `10000ms`。
- 同一轮随后失败：`tests/backend/tasks.test.ts` 的 `afterAll` hook 超过 `10000ms`。
- 测试计数：`2 failed | 50 passed (52)` files；`493 passed (493)` tests；退出码 1。最终根 `pnpm build` 阶段未执行。
- 未重跑、未放宽 timeout、未 skip、未修改生产代码或既有测试。

## 清理与边界

- 已精确终止本轮隔离库会话并 DROP A/B 数据库；核对 `qimao_recovery_repair_*`、`qimao_operations_*`、`qimao_tasks_*` 残留均为 0。
- PostgreSQL 共享实例保持运行，身份为 `postgres|127.0.0.1|55432|postgres`，`listen_addresses=127.0.0.1`。
- 未启动应用服务器、浏览器、公网、Worker、真实素材、Secret、ASR/OCR 供应商或付费动作。
- 原始脱敏日志、退出码、迁移核对和清理证据：`C:\Users\ComradeGu\Documents\七猫兼职\qa-evidence-recovery-repair-01\`。
- 初次只读核验误用了不存在的 `uploads` 表；未启动测试，随后改用实际的 `upload_sessions` 表核验并通过。权威结果见 `a-05-migration-verification-corrected.log` 与 `b-03-migration-verification.log`。

本报告只交规划审核；不写 CURRENT/开发日志，不提交、不推送、不部署。A/B 通过或失败均不改变 C 隔离裁决。
