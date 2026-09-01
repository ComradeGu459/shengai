# LOCAL-OCR-SERVER-05G-R5B 结果

## outcome

`passed`：仅修正同一 connection-test 实例的 main-symlink 启动边界；原测试从 `queued` 被唯一 claim 一次并成功终结。

## evidence

- drop-in：`/etc/systemd/system/qimao-worker@system-control.connection-test.worker.entry.js.service.d/05g-node-path.conf`。
- drop-in 由 SHA-256 `c3fe05ac643edff3a6e0cba26614d2f414be9930dd274941479b888062ac03eb` 原子更新为 `3c3c3454636ed62f1cbcd43a74a22c2cfece824217b0cde34a962a12e813263e`；权限 `root:qimao 0640`。
- 最终 ExecStart：`/usr/local/bin/node --preserve-symlinks-main /opt/qimao-terms-cloud/current/backend/dist/workers/system-control.connection-test.worker.entry.js`；`Restart=on-failure` 保持不变。
- daemon-reload/start 后 5 次、每秒一次只读采样均为 `active/running`，同一 MainPID=`333061`，每次 `NRestarts=0`、ExecMainStatus=0；未出现 clean-exit。
- 精确 testRunId=`24bf93fb-acad-4a79-aa8c-63ceb92bea01` 的 DB GET：`status=succeeded`、`attempt_count=1`、`reason_code` 为空、`latency_ms=1054`；完成后 lease_owner/lease_expires_at 均为空。
- deployment/version 仍为 deploymentId=`998dea43-3257-4a0b-9a05-765598cbfdd8`、versionId=`e0ac8bc6-feea-4d12-836d-17e7e82dfcda`。候选 current/release、backend health=200、未认证 API=401、backend NRestarts=0 与 R5A 核对一致。

## root_cause

经 `current` 符号链接启动时，Node ESM main guard 需要保留 symlink 主入口；缺少 `--preserve-symlinks-main` 会使入口不进入 daemon。R5B 只补该参数，未改业务代码或 Restart 策略。

## external_actions

- 仅对上述实例 drop-in 做一次原子写入并执行 daemon-reload/start。
- 未点击浏览器、未 POST、未创建新 deployment/version/test，未启用 deployment、route，未访问 COS、业务任务或真实素材。

## runtime

- 候选 release：`/opt/qimao-terms-cloud/releases/20260828-local-ocr-05g-r4-composite`，`current` 指向该 release。
- connection-test Worker：active/running，MainPID=333061，NRestarts=0；既有 backend/Worker 状态未改变。
- 精确回滚点：R5B 前 drop-in SHA `c3fe05ac643edff3a6e0cba26614d2f414be9930dd274941479b888062ac03eb`；候选 backend 回滚目标仍为 `/opt/qimao-terms-cloud/releases/20260827-local-ocr-05d-backend-r1`。

## remaining_gap

本切片无运行时或 connection-test 差口；deployment 仍保持“可用于草稿”，未启用生产 route，按范围交规划后续裁决。

## files

- 本地新增：`docs/deployment/LOCAL-OCR-SERVER-05G-R5B-RESULT.md`。
- 服务器仅更新：上述 connection-test 实例 drop-in。

## residual

预期候选 release、root-only env、Worker drop-in、唯一 deployment/version/testRun 与历史归档保留；无新增 COS 对象、业务项目、业务任务或未授权写入。

## next_owner

`PLANNING`

## requires_user

`false`
