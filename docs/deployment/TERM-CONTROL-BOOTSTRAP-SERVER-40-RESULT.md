# TERM-CONTROL-BOOTSTRAP-SERVER-40

## 交付

`blocked`

本任务只执行 bootstrap `--prepare` 验证；bootstrap 在可读性门失败，未进入 `prepared`，因此按停止门未执行 business，也未发生 DeepSeek、Tencent、COS 或业务 API 调用。

## outcome

- 固定 run：`term-control-bootstrap-40-r1`
- 新 archive：9,471,776 bytes，SHA `020437197f6fef783fa04a1789ba727cf293a152d140b38630122a9677c3b925`
- transient unit：`qimao-term-control-bootstrap-40.service`，仅启动 1 次
- unit 结果：`ActiveState=failed`、`SubState=failed`、`Result=exit-code`、`ExecMainStatus=1`、`NRestarts=0`
- 精确 bootstrap code：`BACKEND_ENV_READABILITY_FAILED`
- bootstrap exit：`1`
- status checkpoint 顺序：`identity → runtime ready → bootstrap prepare_start → terminal failed`

## evidence

- 本地前门：新 usage archive 与固定 SHA/字节一致；bootstrap、business 均 `node --check=0`；媒体为 736,321 bytes、SHA `18ea79c0c8b5432314a46b3d73091bffec8114a5323dd24f24e20cff3e612870`。
- 传输：deploy-owned transfer 目录 0700；唯一 SCP；远端五个固定输入文件均存在，archive 字节与 SHA 正确。
- `--prepare` 完整参数已传入：`--root`、`--archive`、`--release`、`--env-dir`、`--media`、`--business`、`--provider-source`、`--db-name`、`--archive-sha`、`--media-sha`、`--media-bytes`。
- bootstrap 原始 JSON 仅在 root-only 文件中读取其稳定 `code`，并在清理前写入 status；未输出 Secret、env 值、对象键或载荷。
- business invocation=0；DeepSeek POST=0；Tencent CreateRecTask=0；COS/API 写入=0。
- 清理后隔离数据库计数为 0；现有 `terms_api` route 数量为 1，未执行 route/config/Secret/current 写入。
- current 仍为 `/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1`。
- 四个现行生产 unit 分别为 `active/running/0/0`：`qimao-backend.service`、`qimao-worker@term-extraction.worker.entry.js.service`、`qimao-worker@system-control.secret-validation.worker.entry.js.service`、`qimao-worker@system-control.connection-test.worker.entry.js.service`；loopback health=200。

## cleanup / residual

- 已精确删除 `/tmp/qimao-term-control-bootstrap-40-transfer`、`/tmp/qimao-asr-term-control-bootstrap-40-r1`、`/run/qimao-term-control-bootstrap-40.status.jsonl` 和 transient unit；unit `LoadState=not-found`。
- 本地 40 transfer view、媒体副本和 runner 已删除；新 archive、manifest、audit 冻结三件套未修改。
- `residual=0`；未修改生产 current/config/route/unit/Secret 或业务数据。

## remaining_gap / next_owner

- `remaining_gap`：既有 bootstrap 在 `BACKEND_ENV_READABILITY_FAILED` 处停止，未达到 `prepared → database_dropped → temp_root_removed` 成功链路；本任务不允许现场修复或重试。
- `next_owner`：部署/规划维护者；先针对现行 `/etc/qimao-terms-cloud` backend env 的 qimao 可读性门做只读诊断，再安排新的 bootstrap 验证窗口。
- `requires_user=false`
