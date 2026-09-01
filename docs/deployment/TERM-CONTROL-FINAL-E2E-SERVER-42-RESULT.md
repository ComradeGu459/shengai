# TERM-CONTROL-FINAL-E2E-SERVER-42

## 交付

`blocked`

## outcome

- 固定 run：`term-control-final-e2e-42-r1`
- bootstrap `--prepare` 已成功，随后仅执行 1 次 SERVER-31 原始 business harness 及完整 argv。
- business 在术语阶段 API gate 失败：精确稳定错误码 `TERMS_API_GATE_FAILED`，exit=1。
- 业务 harness 只输出稳定 code，不透传 HTTP status、response body 或 Secret；因此没有可安全恢复的更细原始错误详情。
- 未重发 business、DeepSeek、Tencent 或任何 unknown 查询；未修改源码、runner、route、config 或 current。

## evidence

- 使用新 usage archive：9,471,776 bytes，SHA `020437197f6fef783fa04a1789ba727cf293a152d140b38630122a9677c3b925`；未使用旧 d8e1 archive。
- 媒体输入：736,321 bytes，SHA `18ea79c0c8b5432314a46b3d73091bffec8114a5323dd24f24e20cff3e612870`。
- root-only status 顺序：`identity → runtime → env_readability passed → bootstrap prepare_start → prepared → business invocation → terminal failed`。
- env-dir 的 `backend.env`、`object-storage.env` 均为本轮副本，owner/group 数值 `0:996`（root:qimao）、mode `0640`；先 `stat`，再由 qimao 执行 `test -r`，均通过；`/etc` 源文件未修改。
- 业务失败发生在 TERMS API gate，未产生 confirmed TermVersion、ASR batch、HotwordList 或 Tencent TaskId；Tencent CreateRecTask=0。DeepSeek 未达到可证明 accepted 状态，且未发生第二次调用。
- 既有 production current 仍为 `/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1`；canonical `terms_api` route 只读计数仍为 1。
- 四个生产 unit 分别读取均为 `ActiveState=active`、`SubState=running`、`NRestarts=0`、`ExecMainStatus=0`：`qimao-backend.service`、`qimao-worker@term-extraction.worker.entry.js.service`、`qimao-worker@system-control.secret-validation.worker.entry.js.service`、`qimao-worker@system-control.connection-test.worker.entry.js.service`；loopback health=200。

## cleanup / residual

- business finally 已执行其既有 synthetic/COS 清理路径；随后已 drop 隔离数据库并 cleanup runtime。
- 已精确删除 `/tmp/qimao-term-control-final-e2e-42-transfer`、`/tmp/qimao-asr-term-control-final-e2e-42-r1`、`/run/qimao-term-control-final-e2e-42.status.jsonl` 与 transient unit；unit `LoadState=not-found`。
- 隔离数据库计数为 0；synthetic project/COS/runtime/transfer/status 残留为 0。
- 本地 42 transfer view、媒体副本和 runner 已删除；冻结 archive/manifest/audit 未修改。
- `residual=0`

## remaining_gap / next_owner

- `remaining_gap`：本次未完成术语 run succeeded、候选确认、confirmed TermVersion 和 ASR HotwordList；首因是 `TERMS_API_GATE_FAILED`，原始 HTTP 详情按 harness 合同不可恢复。
- `next_owner`：部署/规划维护者；先对当前 terms API gate 的稳定 status/code 做只读诊断，再另行安排 E2E，不在本任务现场修复或重试。
- `requires_user=false`
