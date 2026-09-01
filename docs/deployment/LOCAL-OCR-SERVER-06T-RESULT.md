# LOCAL-OCR-SERVER-06T

## outcome

`passed`

06K 唯一匿名 synthetic fixture 已按精确身份完成清理。首个 project 直接删除事务因现有 `screen_text_batch_assets.asset_id -> assets` 的 RESTRICT 外键顺序失败并自动回滚；未重发 COS 删除。随后在同一精确身份复核后，仅执行一次 DB-only 有序事务并成功提交。

## evidence

- 前置只读锁定：project/batch/job/attempt 均为 `1/1/1/1`；candidate 为 `4`；source MP4 为 `1`；PNG evidence 为 `4`；asset 为 `1`；对象白名单为 `5` 个且唯一。
- COS：仅对上述白名单执行删除；5/5 删除确认，随后逐对象 Head 均为 `404`。
- DB：有序删除 batch asset 关联、screen-text batch、项目级 terms/manifests/uploads/assets 及项目关联记录后，精确删除 project 成功提交。
- 清理后：project/batch/job/attempt/candidate/source/evidence/asset 及关联残留均为 `0`；其他 project 数量保持 `17`。
- 未修改 Provider、deployment、route、budget、release/current、服务或业务代码；未调用 OCR、业务 API 或迁移。

## remaining_gap

无。该 06K synthetic fixture 的输入对象和 evidence 对象均已清理；生产 OCR evidence 持久化能力未被修改。

## next_owner

TEST：如需继续验收，应重新申请并创建新的受控 fixture；本轮不保留旧 06K fixture。

## files

- `docs/deployment/LOCAL-OCR-SERVER-06T-RESULT.md`

## residual

- DB：本 fixture 关联残留 `0`。
- COS：本 fixture 白名单残留 `0`，5 个对象均 Head=404。
- 其他 project/object：未触碰；其他 project 计数未变。
- 临时执行脚本将在回执写入后精确移除。

## requires_user

`false`
