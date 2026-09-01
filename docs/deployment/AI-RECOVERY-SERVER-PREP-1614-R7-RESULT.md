# AI-RECOVERY-SERVER-PREP-1614-R7 结果

## outcome

`artifact_written`

仅在本地修正 runner 的唯一 extractor 基线事实，同步 `SHA256SUMS` 与 loader 内嵌 runner 身份，并新增本结果文档。未执行服务器、网络、API、Provider 或数据库动作。

## R7 基线修正

- current 回滚 release 仍固定为 `ai-hotfix-1552`。
- `old_extractor` 改为唯一已确认的 canonical 实际值：`QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN=/opt/qimao/local-ocr/20260827-local-ocr-05b-r1/frame-extractor.js`。
- runner 的启动基线门与 pre-commit 回滚终态断言都继续复用同一个 `old_extractor` 变量，因此两处同时采用该 canonical 值。
- env backup/restore 实现未修改；`new_extractor`、R5 `post_started` 事务边界、R6 RuntimeDirectory、route/monitor 均未修改。

## 哈希闭包

- `SHA256SUMS` 已同步当前 runner；preflight/retry 哈希未变化。
- loader 中 runner 固定 bytes/SHA 及 `SHA256SUMS` 固定 SHA 已同步。

## local verification

- runner 中 canonical `old_extractor` 精确出现一次，启动门与 pre-commit 断言均引用该变量。
- 原 1552 内 extractor 基线字符串已不存在；`new_extractor`、R5/R6 关键边界仍存在。
- 哈希闭包、loader 内嵌 bytes/SHA、CR=0、BOM=0、尾随空白与限定 diff-check：通过。

## residual

- 外部动作：0。
- retry/preflight/route/monitor、业务源码与 `docs/status/CURRENT.md` 修改：0。
