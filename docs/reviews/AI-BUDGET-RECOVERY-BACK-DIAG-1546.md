# AI-BUDGET-RECOVERY-BACK-1546

## outcome

已按冻结范围完成两处最小实现：预算恢复同时处理 `reserved` 与 `reconciliation_required`；ASR retry 在保留原 `attempt.retryable` 语义的基础上，允许安全的 `SYSTEM_CONTROL_BUDGET_HARD_LIMIT` 失败，并强制要求无 Provider 身份、无外部副作用。

## behavior

- `recoverReservations` 对 `reconciliation_required` 的终态 Attempt/Usage 读取最终数量、最终金额、Provider identity 与 `reconciliationStatus=final`，按原转换快照幂等收口为 `settled` 或 `overrun`，并写入真实结算金额。
- 已是 `reconciliation_required` 且仍未知的预留不再被释放、降级或反复更新；再次 recovery 返回零变更。无外部事实的 `reserved` 仍按既有逻辑释放。
- ASR retry eligible 条件为原 `attempt.retryable` 或预算硬阻断安全例外，同时统一要求 `provider_request_id IS NULL`、`external_side_effect_possible=FALSE`。完成集、带外部身份/副作用的失败、非预算且不可重试失败均被排除。
- retry 仍复用原批次的 TermVersion、route snapshot、asset/checksum 和 retry command 幂等；创建 retry batch 不调用 Adapter。

## files

- `backend/src/modules/system-control/system-control.budget.service.ts`
- `backend/src/modules/asr/asr-command.repository.ts`
- `tests/backend/system-control-budget.test.ts`
- `tests/backend/asr.test.ts`

## evidence

- backend typecheck：通过。
- `git diff --check`：通过（仅有既有 `docs/contracts/LOCAL_APP_PARITY.md` 的 CRLF 警告）。
- 预算专项：`tests/backend/system-control-budget.test.ts`，16/16 通过。
- ASR 专项：`tests/backend/asr.test.ts`，19/19 通过。
- 首次运行因本地 PostgreSQL 未启动而得到 `ECONNREFUSED`；随后仅启动仓库既有、监听 `127.0.0.1:55432` 的本地测试实例，未进行部署或外部调用。
- 新增回归覆盖：`reconciliation_required + final usage` 收口与二次幂等、未知对账保持不变、51 集中完成集排除且 50 集预算安全失败生成 retry batch、同 key 重放、Provider identity/副作用/非预算不可重试失败排除，以及 retry batch 初始无 attempts。

## remaining_gap

无本轮功能性剩余缺口；本地 PostgreSQL 测试实例可按仓库既有脚本启停。

## next_owner

BACK 验收者：复核已通过的专项证据；不需要改公共合同、迁移、UI、控制面或服务器。

## residual

本轮未读取 Secret、未联网调用 Provider、未部署；保留工作树全部既有脏改动。除本轮两处源逻辑及对应回归/本审核记录外，无范围内新增架构。

## requires_user

false（唯一剩余动作是恢复既有测试数据库并重跑验证）。
