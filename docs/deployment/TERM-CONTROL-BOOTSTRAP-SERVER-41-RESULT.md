# TERM-CONTROL-BOOTSTRAP-SERVER-41

## 交付

`artifact_written`

## outcome

- bootstrap-only 验证成功：`prepared → database_dropped → temp_root_removed`
- 固定 run：`term-control-bootstrap-41-r1`
- transient unit：`qimao-term-control-bootstrap-41.service`，仅启动 1 次，terminal=`passed`，exit=0
- bootstrap code：无错误（成功 JSON）；bootstrap exit=0
- business invocation=0；DeepSeek POST=0；Tencent CreateRecTask=0；COS/API 写入=0

## evidence

- 使用新 usage archive：9,471,776 bytes，SHA `020437197f6fef783fa04a1789ba727cf293a152d140b38630122a9677c3b925`；未使用旧 d8e1 archive。
- 媒体输入：736,321 bytes，SHA `18ea79c0c8b5432314a46b3d73091bffec8114a5323dd24f24e20cff3e612870`。
- 完整 `--prepare` argv 已执行：`--root`、`--archive`、`--release`、`--env-dir`、`--media`、`--business`、`--provider-source`、`--db-name`、`--archive-sha`、`--media-sha`、`--media-bytes`。
- runtime env-dir 的 `backend.env` 与 `object-storage.env` 均由 root 创建为 `root:qimao`（数值 owner/group 为 `0:996`）、mode `0640`；随后 `sudo -n -u qimao -- test -r` 均通过。源 `/etc` 文件未修改。
- root-only status checkpoint 顺序：`identity → runtime → env_readability passed/ready → bootstrap prepare_start → prepared → database_dropped → temp_root_removed → terminal passed`。
- 既有 current 仍为 `/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1`；canonical `terms_api` route 只读计数仍为 1。
- 四个生产 unit 分别读取均为 `ActiveState=active`、`SubState=running`、`NRestarts=0`、`ExecMainStatus=0`：`qimao-backend.service`、`qimao-worker@term-extraction.worker.entry.js.service`、`qimao-worker@system-control.secret-validation.worker.entry.js.service`、`qimao-worker@system-control.connection-test.worker.entry.js.service`。
- loopback health=200。

## cleanup / residual

- 已精确删除 `/tmp/qimao-term-control-bootstrap-41-transfer`、`/tmp/qimao-asr-term-control-bootstrap-41-r1`、`/run/qimao-term-control-bootstrap-41.status.jsonl` 与 transient unit；unit `LoadState=not-found`。
- 隔离数据库 `qimao_asr_05a_term_control_bootstrap_41_r1` 计数为 0；runtime/transfer/status 残留为 0。
- 本地 41 transfer view、媒体副本和 runner 已删除；冻结 archive/manifest/audit 未修改。
- 未修改 production current、provider/config、route、Secret、unit 或业务数据。
- `residual=0`

## remaining_gap / next_owner

- `remaining_gap=none for bootstrap-only acceptance`；本任务未验证 business/Provider E2E，符合任务范围。
- `next_owner=TERM-CONTROL-FINAL-E2E`（如需继续真实闭环，应另行按预算与停止门执行）。
- `requires_user=false`
