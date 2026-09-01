# LOCAL-OCR-SERVER-06P

## outcome

`artifact_written`

## evidence

- MainPID 的实际 cwd 为 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-05g-r4-composite`；当前 `/opt/qimao-terms-cloud/current` 已指向 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`。本轮以 MainPID cwd 作为运行时解析基准，未被已切换的 `current` 符号链接误导。
- 从 MainPID cwd 对应 backend entry 解析到实际 contracts compiled 文件：`/opt/qimao-terms-cloud/releases/20260828-local-ocr-05g-r4-composite/packages/contracts/dist/screen-text.js`。
- 实际运行时 contracts 文件 SHA-256：`f046a3bec1df5e34fd4bea787f1eda30001df12d837da47bf31bc3bf728c224e`；读取其 `ScreenTextExecution.model` schema 的 `maxLength=80`。
- 06K release manifest 记录的 contracts `packages/contracts/dist/screen-text.js` SHA-256 为 `483219c8a358533cfd55acb264f0c42918192267f0c3a484a181798ba56b682a`，06K manifest SHA-256 为 `38ac554f66d1b59ee442825399aac0febdf305252924c7adfda6cf20ddfb19ea`，06K archive SHA-256 为 `8743f3c075ee2723bdde8af33c605ffd2d81042e4d9b49bda2d82c58868175f`；实际 MainPID contracts SHA 与 06K manifest 不一致，且 MainPID 不在 06K release。
- 只读 SQL 仅返回长度：`batch_model_chars=86`、`attempt_model_chars=86`；未读取或输出 model 全文、正文、对象键或 Secret。
- `packages/contracts` 的 `ScreenTextExecution.model` 是 batch detail 响应 `ScreenTextBatchSchema` 的字段；对应 route 在 `backend/src/modules/screen-text/screen-text.routes.ts:101` 声明 200 响应 schema。因此运行时 maxLength=80 时，数据库中的长度 86 在 handler 返回后的响应序列化阶段被拒绝，足以解释该 500。

## conclusion

`runtime_old_contract`

当前 backend MainPID 仍加载 05G-R4 的旧 contracts（80），不是 current 所指的 06K contracts（160）。该代际差异与 batch/attempt model 长度 86 构成完整的 handler 后序列化 500 解释。

## remaining_gap

`none`（根因所需的 runtime identity、contract maxLength、文件 SHA 与 DB model 长度均已获得；未执行修复。）

## next_owner

SERVER：在单独、明确授权的服务变更任务中，以 06K release 为 backend 实际启动身份，先保留 05G-R4 精确回滚，再仅重启 backend 并做 health/route 门核对；本轮不执行重启。

## files

- `docs/deployment/LOCAL-OCR-SERVER-06P-RESULT.md`
- `docs/deployment/LOCAL-OCR-SERVER-06K-RESULT.md`
- runtime compiled contracts：`/opt/qimao-terms-cloud/releases/20260828-local-ocr-05g-r4-composite/packages/contracts/dist/screen-text.js`
- 06K manifest/archive identity：见 `LOCAL-OCR-SERVER-06K-RESULT.md`
- response schema source：`backend/src/modules/screen-text/screen-text.routes.ts:101`

## residual

- 未重放 API；未修改代码、DB、COS、route、budget 或配置；未重启服务；未清理 06K fixture。
- 当前 `current` 与 backend MainPID cwd 存在代际分离：current=06K、backend runtime=05G-R4；需未来授权任务处理，不能在本轮隐式修复。

## requires_user

`true`：若要让 backend 实际加载 06K contracts，需要另行授权一次受控 backend 重启/运行身份切换；本轮只完成证据核对。
