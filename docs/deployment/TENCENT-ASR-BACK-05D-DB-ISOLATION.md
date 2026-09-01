# TENCENT-ASR-BACK-05D-DB-ISOLATION

## outcome

```yaml
artifact_written: true
outcome: blocked
slice_outcome: read_only_audit
lease: 0
next_owner: PLANNING
requires_user: true
```

代码侧已形成“隔离 URL 必须覆盖生产 URL”的单一路径；本轮不能把远端 synthetic 标为可执行，因为仓库文档未证明目标主机已配置 `qimao` DB peer/login。缺少该主机事实时只能在 business 的 peer 前门稳定阻断，绝不回退生产库。

## evidence

- `deploy/debian/bin/asr-isolated-synthetic-bootstrap.mjs` 的 `createIsolatedDatabaseUrl(dbName)` 只生成无凭据 Unix socket URL：`postgresql:///qimao_asr_05a_<run>?host=/var/run/postgresql`。prepare 强制 `--env-dir` 位于临时根内；`installDatabaseEnv()` 将仅含该 `DATABASE_URL` 的 `database.env` 以 `root:qimao 0640` 安装到该目录，并在安装前后删除临时明文文件。prepare 用 `createdb --owner=qimao` 创建同名隔离库，`--drop-db` 只处理该安全前缀名称。
- `deploy/debian/bin/asr-isolated-synthetic-business.mjs` 读取 `${envDir}/database.env`，`parseIsolatedDatabaseUrl()` 严格要求空 user/password/port、唯一 socket host、pathname 恰为 `--db-name`；`mergeRuntimeEnv()` 从 process/backend/object-storage/provider 环境剥离 `DATABASE_URL`、`PG*` 等数据库键，再把 database.env 作为唯一来源。创建 pool 前执行 `SELECT current_database(), current_user`，必须等于 `--db-name`/`qimao`，否则以稳定 `DATABASE_PEER_MISMATCH` 或 `DATABASE_PEER_CHECK_FAILED` 停止。
- 因此即使临时 `backend.env` 复制了生产值、进程继承了生产 `DATABASE_URL` 或 provider 文件含 PG 键，均不会进入 effective env；business 不接收 URL 值参数，也不调用默认 `createPool()`。app、UploadCompletionWorker、AsrWorker、connection-test Worker 与 cleanup Worker 共用同一显式 pool。
- `backend/src/config.ts`、`backend/src/database/pool.ts`、`backend/src/database/migrate.ts` 支持显式 URL/pool；`tests/backend/system-control-routing.test.ts` 等夹具证明随机库、迁移、注入 pool、terminate/drop/不存在核对的顺序。`docs/deployment/TENCENT-ASR-SERVER-05A-HARNESS.md` 记录的 05A 自测已覆盖数据库 URL 生成、身份和清理门（本轮未重跑）。
- `docs/deployment/BACKEND-LINUX-RUNTIME.md` 仅明确 `local all postgres peer` 与 `qimao_backend` SCRAM，未给出 `qimao LOGIN` 或 `local all qimao peer`；代码的无密码 URL 只有在目标 PostgreSQL 已存在该角色并启用对应 peer 规则时才可连接。这是唯一未由仓库证据闭合的远端前置。

## frozen_contract

### qimao peer/socket 结论

采用无凭据 Unix socket 作为唯一隔离接口，但当前不能证明目标主机已满足它。禁止把 `qimao_backend` 生产 SCRAM URL、默认库、进程继承 URL 或 root-only 生产 URL 作为 fallback；peer 前门失败即 blocked。SERVER 只能以不改配置的只读证据证明 `qimao` DB role/login、`pg_hba` peer、socket 路径和隔离库 owner 均已存在。

### bootstrap → business 文件接口

1. bootstrap（`qimao-deploy`）只接受现有 `--env-dir`、`--db-name` 等位置化路径参数；不接受数据库 URL 值，也不读取生产 `backend.env` 的 URL。它在 `<root>/<env-dir>/database.env` 生成 `DATABASE_URL=postgresql:///...`，并以 `root:qimao 0640` 安装；输出只含 dbName、target/stat 等脱敏事实。
2. business（`qimao`）继续接受现有 `--env-dir` 与 `--db-name`，但 database 事实只读该 `database.env`；backend/object/provider 文件仅提供非数据库配置。它在导入 app/Worker、创建 pool、迁移前完成 URL pathname 与 `--db-name` 精确比较，并用 `current_database/current_user` 做一次只读 peer 门。
3. 有效门通过后，app、UploadCompletionWorker、AsrWorker、system-control connection-test Worker 和 cleanup Worker 共用同一个 `DATABASE_URL`/pool；任何 Worker 重启仍从该隔离库重新 claim。bootstrap 负责创建/删除库，business 负责业务链，不新增控制面或第二状态源。

### API 与反向清理

沿用 04H 已核对的 project → manifest → COS multipart → 202/verifying → UploadCompletionWorker → terms → engine/route/budget → ASR batch/dispatch → AsrWorker 链；每个写请求使用稳定 `Idempotency-Key`，CreateRecTask 最多一次，unknown 只查同一身份。结束顺序为取消未完成命令、已知 COS 对象 abort/delete + Head 缺失、停 loopback/app/Workers、bootstrap `--drop-db`、核对数据库不存在、`--cleanup --root` 删除 env/release/media/temp。

## verifiable_gates

- 本地可证伪门：运行 bootstrap/business 自测或等价纯函数，证明生产 `DATABASE_URL`/PG* 被剥离、database.env 只有唯一键、pathname 不匹配/额外路径/凭据 URL 均拒绝、有效 socket URL 通过；验证生成文件 `root:qimao 0640`。本轮未运行测试。
- 远端 prepare 前门（SERVER 后续执行）：先以 `qimao-deploy` prepare 创建精确随机库和 database.env；只读检查 role/peer/socket 与 `qimao` 可读性；再以 `qimao` business 前门验证 `current_database/current_user`。任何一步失败立即 drop 精确 dbName 并 cleanup，禁止启动业务链。
- 只有 peer 门通过后才允许 loopback app/Worker；成功/unknown 均需按已知 COS/provider 身份反向清理。生产 DATABASE_URL、生产 DB、控制面、公网路由不得进入 effective env 或发生写入。

## remaining_gap

代码侧隔离 URL 覆盖已具备；唯一剩余缺口是目标主机的 `qimao` DB role/login、`pg_hba` peer 与 socket 可用性尚无受控只读证据。若主机不能提供该前置，需 PLANNING 另签明确的受保护 SCRAM 派生 URL 合同；本片不新增第二路径。04H 的 WAV/MP4 合同冲突仍保留，不能绕过。

## next_owner

`PLANNING`：裁决是否接受 SERVER 提供的 peer 前门证据；若不接受，另签单一凭据派生方案。`SERVER`：仅在裁决后执行一次 prepare 前门，使用候选 SHA、完整 provider/object-storage env 和临时隔离主机；不得把生产 URL/凭据放入 argv、日志、仓库或 business effective env。

## files

- 仅更新：`docs/deployment/TENCENT-ASR-BACK-05D-DB-ISOLATION.md`
- 只读证据：`deploy/debian/bin/asr-isolated-synthetic-bootstrap.mjs`、`deploy/debian/bin/asr-isolated-synthetic-business.mjs`、`backend/src/config.ts`、`backend/src/database/pool.ts`、`backend/src/database/migrate.ts`、`docs/deployment/TENCENT-ASR-BACK-04H-RESULT.md`、`docs/deployment/TENCENT-ASR-SERVER-05A-HARNESS.md`、`docs/deployment/TENCENT-ASR-SERVER-05B-RESULT.md`、`docs/deployment/BACKEND-LINUX-RUNTIME.md` 与随机库测试。

## residual

本轮仅读仓库并更新本报告；未运行测试、迁移、PostgreSQL、Worker、COS、Tencent 或服务器动作，未读取 Secret。无临时库、对象、进程、env、unit 或生产写入；既有脏树保持不变。

## requires_user

`true`：需要规划确认目标主机是否已有 `qimao` peer 前置，并继续采用现有受支持 MP4 synthetic；确认前不启动 business synthetic。
