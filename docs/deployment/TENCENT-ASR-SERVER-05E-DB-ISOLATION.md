# TENCENT-ASR-SERVER-05E-DB-ISOLATION

```yaml
artifact_written: true
outcome: passed
scope: local-only
current: v4-1308
lease: 0
server_actions: 0
secret_actions: 0
media_actions: 0
database_actions: 0
cos_actions: 0
tencent_actions: 0
next_owner: SERVER
requires_user: false
```

## Frozen contract

本轮只修改两个正式 harness 与本文件；未修改业务源码、业务合同或测试，未连接服务器，未读取 Secret/媒体，未执行真实 DB/COS/Tencent。

### Bootstrap

`bootstrap --prepare --db-name <name>` 现在按数据库名生成唯一隔离 URL，并通过既有 `sudo -n install` 写入 `<env-dir>/database.env`：

```text
DATABASE_URL=postgresql:///qimao_asr_05a_<suffix>?host=%2Fvar%2Frun%2Fpostgresql
```

其中 serialized query 使用 percent-encoding，解析后的 `host` 精确为 `/var/run/postgresql`；文件只包含 `DATABASE_URL` 一项，目标 owner/group/mode 为 `root:qimao`、`0640`。bootstrap 不读取、不复制生产 `DATABASE_URL`，返回值只包含目标 stat，不包含 URL 内容。

### Business environment

business 的 effective env 合并顺序为：进程环境 → backend.env（过滤全部数据库环境键）→ object-storage.env → provider.env → database.env，database.env 最后覆盖数据库配置并成为唯一数据库事实。继承的 `DATABASE_URL`、`PGHOST`、`PGPORT`、`PGDATABASE`、`PGUSER`、`PGPASSWORD`、`PGSERVICE`、`PGSERVICEFILE`、`PGSSLMODE`、`PGOPTIONS` 均先剔除。

database.env 严格要求只有 `DATABASE_URL`。URI 必须满足：

- scheme 为 `postgresql`，authority hostname/user/password/port 均为空；
- pathname 精确为 `/<db-name>`；
- query 只允许一个 `host` 键，解析值精确为 `/var/run/postgresql`；
- 拒绝 TCP host、凭据、错误数据库名、额外 query/key 和 fragment。

### Migration gate

business 在 `Object.assign(process.env, effectiveEnv)` 后先导入 pool 模块并调用 `createPool(effectiveEnv.DATABASE_URL)`，只读执行：

```sql
SELECT current_database() AS database_name, current_user AS user_name
```

只有 `current_database=<db-name>` 且 `current_user=qimao` 时才 import `database/migrate.js`。peer 查询失败或身份不符会先关闭 pool，再在迁移 import 前阻断。通过迁移门后，app、UploadCompletionWorker、connection-test Worker、AsrWorker 全部注入同一个显式 pool；business 内不存在无参数 `createPool()`。

实现依据：node-postgres 支持以 Unix socket 路径作为 host 的连接配置；PostgreSQL URI 允许使用 named `host` 参数指定 Unix-domain socket，并要求特殊 URI 部分按规则编码。[node-postgres connecting](https://node-postgres.com/features/connecting)；[PostgreSQL connection URIs](https://www.postgresql.org/docs/current/libpq-connect.html)。

## 本地证据

运行了两个正式文件的 `node --check`，均为 exit `0`。

bootstrap：

```text
{"component":"bootstrap","outcome":"passed","cases":["happy","database_url_generation","ownership_plan","release_required","release_within_root","stage_code_mapping","command_dispatch","wrong_extension","wrong_identity","media_sha_mismatch","cleanup_order"],"createRecTaskMaximum":1,"providerReadRole":"qimao"}
```

business：

```text
{"component":"business","outcome":"passed","cases":["happy","database_url_generation","database_env_keys","merge_precedence","database_rejections","migration_gate_order","wrong_extension","wrong_identity","media_sha_mismatch","cleanup_order"],"providerReadRole":"qimao","createRecTaskMaximum":1}
```

自测特别证明：

- URL 生成与 parser 结果的 database/Unix socket host；
- database.env 单键集合与 database.env 最终合并优先级；
- TCP、凭据、错误数据库名、额外键拒绝；
- qimao 数据库 peer 与非 qimao/错库拒绝；
- `assign_effective_env → create_explicit_pool → verify_current_database_and_user → import_migrate` 顺序；
- 原有身份、媒体 SHA、正式 `.mjs`、cleanup 顺序门仍通过。

## Files / diff-check / residual

本轮目标文件：

- `deploy/debian/bin/asr-isolated-synthetic-bootstrap.mjs`
- `deploy/debian/bin/asr-isolated-synthetic-business.mjs`
- `docs/deployment/TENCENT-ASR-SERVER-05E-DB-ISOLATION.md`

限定检查结果：两个 `.mjs` 与本文件无尾随空白；限定 `git diff --check` 无输出；仅目标文件显示为新增/变更候选。未生成临时目录，residual=`0`。

## Remaining gap

未做真实 Unix 文件安装、PostgreSQL peer 查询、迁移、loopback、COS 或 Tencent 验证，原因是本轮明确 `local-only / lease=0`。后续 SERVER 轮次应复用该 database.env 与迁移前 peer gate；若 peer 不符，必须关闭同一 pool 后停止，不得 import migrate 或创建第二数据库事实。

