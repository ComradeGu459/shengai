# TEST-RECOVERY-FINAL-01 最终复验报告

日期：2026-08-21  
任务：`TEST-RECOVERY-FINAL-01` / Rev 1  
handoffToken：`TEST-RECOVERY-FINAL-01-R1-V4.910`  
角色：TEST；authority_generation=3  
仓库：`C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`

## 结论

本轮只执行一次最终隔离数据库完整质量门。前置检查和 37/37 迁移通过；唯一一次 `pnpm check` 在测试阶段退出 1，当前工作树不能宣称完整质量门通过，也不自动解除 C 隔离或授予部署许可。

## 前置与隔离库

- 限定相关文件的 `git diff --check`：退出 0。
- `pnpm run check:repo`：退出 0。
- 唯一隔离库：`qimao_recovery_final_20260821_161514_57748a`。
- 经正式 `pnpm --filter @qimao-terms-cloud/backend run db:migrate` 从零迁移 37/37。
- 迁移核对：`schema_migrations=37`；projects、upload_sessions、material_manifests、term_drafts、asr_batches、screen_text_batches、delivery_jobs、connection_test_runs、feedback_events、acceptance_sessions、pre_edit_sessions 等业务 bootstrap 均为 0；`term_export_template_settings=1`、`term_export_template_versions=1` 为迁移定义的模板种子，单列不计业务数据。

## 唯一完整门结果

- 命令：`DATABASE_URL=postgresql://postgres@127.0.0.1:55432/qimao_recovery_final_20260821_161514_57748a pnpm check`（实际通过 PowerShell 环境变量绑定，仅运行一次）。
- `check:repo`、contracts/backend/frontend/system-frontend lint：通过。
- contracts/backend/frontend/system-frontend typecheck：通过。
- 既有 `db:setup` 仅确认本机实例并输出 `No migrations to run!`；未迁移或清理共享默认库。
- 首个真实失败：`tests/backend/system-control-operations.test.ts` 的 `afterAll` hook 超过默认 `10000ms`。
- 另一失败：`tests/frontend/system-control-runtime.test.tsx` 的 SYSTEM-06 失败路径焦点断言，期望 `role=alert` 获得焦点但实际焦点仍在页面标题。
- 计数：`2 failed | 50 passed (52)` test files；`1 failed | 492 passed (493)` tests；退出码 1；耗时 317.91s。
- 因测试阶段非零，根脚本最终 `pnpm build` 未执行；不宣称四工作区 build 通过。
- 未重跑、未放宽 timeout、未 skip、未 retry、未修改生产代码或既有测试。

## 清理与边界

- finally 已精确终止本隔离库会话并 DROP；核对 `qimao_recovery_final_*`、`qimao_operations_*`、`qimao_tasks_*` 及本轮测试前缀残留均为 0。
- 共享 PostgreSQL 保持运行，身份为 `postgres|127.0.0.1|55432|postgres`，`listen_addresses=127.0.0.1`。
- 未启动应用服务器、浏览器、公网、真实素材、Worker、Secret、ASR/OCR 供应商或付费动作。
- 原始脱敏日志、退出码、迁移核对和清理证据：`C:\Users\ComradeGu\Documents\七猫兼职\qa-evidence-recovery-final-01\`。

本报告只交规划审核；不写 CURRENT/开发日志，不提交、不推送、不部署。当前质量门结果不改变 C 隔离裁决。
