# LOCAL-OCR-SERVER-03L-AUDIT

## outcome

`artifact_written`

只读审计完成；未重启、未重建 unit/release、未写服务器、未读取 Secret 或环境值。

## evidence

- 审计对象为 `qimao-worker@asr.worker.entry.js.service` 的 systemd 持久 journal/历史状态；journal 可读条目=`132`，其中历史退出事件=`16`。
- unit 身份：fragment=`/etc/systemd/system/qimao-worker@.service`；03K 实例由该模板展开。
- ExecStart 路径类别：`current`；实际命令路径类别为 `current/backend/dist/workers/asr.worker.entry.js`，不是固定 release 路径。当前入口文件可读。
- 首次历史退出：`code=exited`、`status=203`、`signal=EXEC`；稳定 systemd 错误码为 `203/EXEC`。
- 只读路径门：服务器 `/usr/bin/node` absent；现有 `/usr/local/bin/node` 可执行。故退出发生在 direct-main 执行阶段，Node 进程未启动。
- 原始日志仅在远端受控解析为结构化字段；未输出或复制原始日志正文。未发现可安全归类的 Tencent 配置错误码、S3 signer 错误、模块缺失名或 DATABASE_URL/其他缺失配置键名。
- 当前运行复核：current 为 `20260828-local-ocr-06k-r1`；backend、screen-text Worker、upload-completion Worker 均 active，均 `NRestarts=0`；backend health 返回 `status=ok`、`database=connected`；ASR unit 为 inactive/disabled。
- 03K backend drop-in、ASR env 与候选残留均 absent；未查询业务素材、control plane、COS 或 Tencent。

## direct_cause

唯一已证实首因为 `direct-main`：`qimao-worker@.service:18` 的 `ExecStart=/usr/bin/node ...` 指向服务器不存在的 Node 可执行文件，systemd 因此返回 `203/EXEC`。该事实早于应用启动，不能归因于 DATABASE_URL、数据库连接、Tencent 配置、S3 signer 或模块解析。

## minimal_fix

仅提出、未实施：在新的正式部署 lease 下，将该 ASR Worker 实例的 direct-main 调整为服务器现有可执行的 `/usr/local/bin/node`（或以等价的受控 unit override 固定该绝对路径），再执行一次 daemon-reload/启动健康门。不得在本审计中修改 unit 或重放业务/provider 调用。

## remaining_gap

本轮没有证据表明应用层 Tencent 配置、S3 signer 或模块解析可达；这些门需在 direct-main 修复后另行按授权验证。真实 WAV、COS、CreateRecTask、业务 synthetic 与计费闭环仍未执行。

## next_owner

`PLANNER → SERVER`：审核 direct-main 最小修复并签发新的正式 lease；修复后仍须先通过 Worker 健康门，再决定是否进入后续真实探针。

## files

- `docs/deployment/LOCAL-OCR-SERVER-03L-AUDIT.md`
- 对照源码：`deploy/debian/systemd/qimao-worker@.service:18`、`backend/src/workers/asr.worker.entry.ts:74-94`

## residual

- 服务器保持 06K；backend、screen-text、upload 健康且未重启；ASR unit inactive/disabled。
- 未产生本轮服务器写入、release、env、drop-in、COS 对象、Tencent 任务或业务数据。

## requires_user

`yes`：需要规划确认并签发 direct-main 修复任务；本轮不应自行修改 unit 或重放任何 provider/业务写命令。
