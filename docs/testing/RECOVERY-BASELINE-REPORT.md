# 当前完整工作树健康度报告

日期：2026-08-21  
任务：`TEST-RECOVERY-BASELINE-01` / Rev 2  
handoffToken：`TEST-RECOVERY-BASELINE-01-R2-V4.905`  
角色：TEST；authority_generation=3  
仓库：`C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`  

## 结论

本轮只证明当前完整工作树在一次真实质量门中的健康度，不重建 v4-849 物理基线，不解除 C 隔离，也不构成可部署结论。

- `git diff --check`：退出码 0；仅有既有 `LOCAL_APP_PARITY.md` CRLF 提示。
- `pnpm run check:repo`：退出码 0。
- contracts/backend/frontend/system-frontend lint 与 typecheck：通过。
- 当前正式迁移：37/37；业务 bootstrap 表均为 0。
- 唯一一次 `pnpm check`：退出码 1；`52` 个测试文件中 `48` 通过，`4` 失败；`493` 个测试中 `487` 通过，`6` 失败。
- 因测试阶段非零，根脚本的最终 `pnpm build` 阶段未执行；不能宣称完整质量门通过。

## PostgreSQL 与隔离

Rev1 的陈旧 `postmaster.pid` 已在重新核验以下条件后精确移动，未删除源文件、未覆盖目标：

`C:\tmp\qimao-terms-cloud-postgres-18.4\data\postmaster.pid` → `C:\Users\ComradeGu\Documents\七猫兼职\qa-evidence-recovery-baseline-01\postmaster.pid.stale-before-recovery`

随后仅运行仓库既有 `pnpm db:start`。只读身份为 `postgres|127.0.0.1|55432|postgres`，`listen_addresses=127.0.0.1`，`port=55432`；`pnpm check` 内部的既有 `db:setup` 只确认本机实例和默认库存在，日志未出现创建默认库，后续 backend migrate 继承隔离 `DATABASE_URL` 并输出 `No migrations to run!`，未迁移或清理共享默认库，也未停止共享 PostgreSQL。

本轮隔离库：`qimao_recovery_baseline_20260821_153133`。

- 由正式 `pnpm --filter @qimao-terms-cloud/backend run db:migrate` 从零迁移，`schema_migrations=37`。
- `projects`、routing、engine、ASR、ScreenText、uploads、materials、terms、deliveries、feedback、system-control、strategy、acceptance、pre-review 等业务 bootstrap 均为 0。
- `term_export_template_settings` 与 `term_export_template_versions` 各 1 行；确认来自迁移 `1754976006003_create_term_export_templates.cjs` 的内置“默认五字段模板”种子，不是本轮业务数据。
- 完成后本隔离库会话为 0，精确 DROP 成功，`qimao_recovery_baseline_%` 残留为 0；共享 PostgreSQL 保持运行。

## 唯一完整门结果与首因

`pnpm check` 按既有顺序执行了 `check:repo → lint → typecheck → test`。测试阶段首个真实失败为：

1. `tests/backend/system-control-operations.test.ts` 的 `afterAll` hook 超过默认 10 秒，报 `Hook timed out in 10000ms`。
2. `tests/backend/uploads.test.ts`：`Uint8Array` 与 `Buffer` 深比较不一致。
3. C：`tests/frontend/material-folder-flow.test.tsx` 2 项失败（目录入口状态、unknown 创建结果展示）。
4. C：`tests/frontend/UploadQueue.test.tsx` 3 项失败（unknown 恢复、暂停/继续、102 文件分配摘要）。

未重跑、未提高 timeout、未 skip、未改测试或生产实现；普通非零结果保留原始首因后完成隔离清理。

## 边界与风险

完整门实际覆盖了 C/D 当前文件，因此即使通过也不能证明 A+B 纯净或解除 C 隔离。本轮失败集中包含 C 测试和 D 共享接线/测试；当前工作树不能引用历史 `46 files / 447 tests` 作为现状通过证据。

未启动公网/服务器、真实浏览器、Worker、真实素材、Secret、ASR/OCR 供应商、付费或外部网络动作。原始日志、退出码、迁移核对和清理证据保存在：

`C:\Users\ComradeGu\Documents\七猫兼职\qa-evidence-recovery-baseline-01\`

本报告只交规划审核，不写 CURRENT/开发日志，不提交、不推送、不部署。
