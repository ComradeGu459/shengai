# LOCAL-OCR-SERVER-06Q

## outcome

`artifact_written`

## evidence

- 预检通过：`/opt/qimao-terms-cloud/current` 为 `20260828-local-ocr-06k-r1`；backend 预检运行身份仍为 `20260828-local-ocr-05g-r4-composite`；05G-R4 精确回滚目录存在且未修改。
- 06K identity 与 06P/06K 一致：archive SHA-256=`8743f3c075ee2723bdde8af33c605ffd2d81042e4d9b49bda2d82c58868175f`；manifest SHA-256=`38ac554f66d1b59ee442825399aac0febdf305252924c7adfda6cf20ddfb19ea`；`packages/contracts/dist/screen-text.js` SHA-256=`483219c8a358533cfd55acb264f0c42918192267f0c3a484a181798ba56b682a`。
- 仅执行一次 `systemctl restart qimao-backend.service`；未重启 screen-text Worker 或 upload-completion Worker，未启动 OCR，未运行 migration，未重跑 OCR/synthetic。
- 重启后 backend MainPID cwd 为 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`；实际解析的 contracts compiled 文件为 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1/packages/contracts/dist/screen-text.js`，SHA 与 06K 一致，`ScreenTextExecution.model.maxLength=160`。
- backend `activeState=active`、`NRestarts=0`；`/health` 为 HTTP 200，`status=ok`、`database=connected`；未认证 `/api/projects` 为 HTTP 401。
- screen-text Worker 与 upload-completion Worker 的 MainPID、`NRestarts` 均与预检一致，证明本轮未重启两个 Worker。
- 未执行 batch detail 重放；本轮只确认 backend 运行身份与服务门，不将运行身份修复冒充为业务接口重新验收。

## remaining_gap

本轮运行身份与健康门无缺口；按任务禁止项，batch detail 500 的一次受控 GET、OCR/synthetic 业务闭环仍留给后续 TEST/规划任务验收。

## next_owner

TEST：复用 06K 唯一 fixture，在不新建 fixture、不重跑迁移的前提下执行后续既定验收；如需再次验证 batch detail 响应，另行使用只读、单次受控 GET 任务。

## files

- `docs/deployment/LOCAL-OCR-SERVER-06Q-RESULT.md`
- `docs/deployment/LOCAL-OCR-SERVER-06P-RESULT.md`
- `docs/deployment/LOCAL-OCR-SERVER-06K-RESULT.md`
- active backend release：`/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`
- exact rollback release：`/opt/qimao-terms-cloud/releases/20260828-local-ocr-05g-r4-composite`
- runtime contracts：`/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1/packages/contracts/dist/screen-text.js`

## residual

- current 保持 06K；backend 已实际加载 06K；05G-R4 回滚身份保留。
- screen-text/upload Worker、OCR、DB、COS、route、budget、fixture 均未触碰；未创建新 release、未提交或推送。
- 未发生失败回滚；本轮只读核验脚本已精确清理。

## requires_user

`false`
