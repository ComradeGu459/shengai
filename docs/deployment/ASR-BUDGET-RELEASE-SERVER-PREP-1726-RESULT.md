artifact_written: true

# ASR-BUDGET-RELEASE-SERVER-PREP-1726

## outcome

```yaml
outcome: local_candidate_refrozen
slice_outcome: passed
goal_gap: fixed v2.1 and the three-file application payload are frozen locally but are not uploaded, installed, or executed on qimao-test-server
release_id: asr-budget-default-off-20260901-r1
schema: qimao.application-release/v2
probe_contract: systemUnauthenticatedProbe.expectedStatus=403
migration_mode_next_release: none
archive_rebuilt: false
business_code_changed: false
migration_changed: false
ssh_calls: 0
remote_writes: 0
service_restarts: 0
database_writes: 0
provider_calls: 0
cos_writes: 0
real_recognition_calls: 0
next_owner: 规划
requires_user: true — external upload, fixed-entry installation, and one release execution require a new explicit authorization
```

1725 的唯一首因已经在本地冻结层修正：管理员预算接口的未认证合同和真实响应均为 `403 application/json`、non-HTML；新声明显式携带 `candidate.systemUnauthenticatedProbe.expectedStatus: 403`，validator 只接受数值 `401` 或 `403`，runner 按声明 emit 的值验收，不再硬编码 `401`。本任务没有重新构建业务代码，也没有修改 archive 或 migration。

6036000 已在 1725 的固定入口中完成 migration 和严格 after gate，失败回滚策略按设计保留 schema。原 `db-migration-gate.mjs --before` 会明确拒绝 already-applied，因此 1726 没有篡改 helper 或增加 fallback，而是把下一次声明固定为 `migration.mode: none`：新的 inbound 不含 helper，runner 不执行 migration/systemd-run，终态应报告 `db_write:0 migration:none`。数据库中既有 6036000 是 1725 的已验证外部事实，不由本地 1726 重写。

## frozen identities

| artifact | bytes | SHA-256 |
| --- | ---: | --- |
| `deploy/debian/bin/qimao-application-release` | 33,479 | `dc125c82a770e8c6dead2a514cc64346460f417298400ab1c4fbf2e06022506c` |
| `deploy/debian/bin/application-release-declaration.mjs` | 17,424 | `3582da5267d3233352ae82a1fc50bd5382552f2aab78f88966f698dbe8a2dc18` |
| `deploy/asr-budget-default-off-release-1726/application-release.declaration.json` | 1,365 | `eea531921b8bfffa9c8322c715c8820db24a033d2be261a54e3c4413f5eedd3c` |
| `deploy/asr-budget-default-off-release-1726/SHA256SUMS` | 211 | `4ed0eebaba30ec5441ff7830d8e46a8f796f992a3c49447026374cc6461030ec` |

复用且未漂移的业务候选：

```text
archive=work/asr-budget-default-off-20260901-r1.tar.gz
bytes=9764557
sha256=056409a6b2ea23ee3f1bd8da39f41ad1786f8f343e78be394c8d2f217b921efc
archive_rebuilt=false
```

1725 原声明、helper、SHA 的 SHA-256 仍分别为 `1ce4e26b...603c`、`d5e386209b...3112`、`a486b0ab39...9391e`；本任务没有覆盖历史失败证据。新 `SHA256SUMS` 的闭合集精确为两项：新 declaration 与原 archive，不包含 helper，也不递归包含自身。

## contract and compatibility

validator 采用严格而向后兼容的两种输入：

- v1 `candidate.unauthenticatedProbe` 仍只允许 `label/path`，归一并 emit `probe_expected_status=401`；
- 旧 v2 `candidate.unauthenticatedProbe` 同样默认 `401`，使已冻结 1725 声明仍可审计；
- 新 v2 使用 `candidate.systemUnauthenticatedProbe`，必须同时提供 `label/path/expectedStatus`；
- `expectedStatus` 仅接受整数 `401` 或 `403`；`400`、`404`、字符串 `"403"`、同时携带新旧 probe、给 v1 偷加 status 都严格拒绝。

runner 只消费 validator 的 base64 emit：新增唯一 `probe_expected_status` 字段、field count 同步加一、解析后再次以 `401|403` 白名单防御；post-switch 使用 `probe_status_matches "$probe_expected_status" "$api_status"`，成功证据动态输出实际声明值。runner 内置纯本地 `--self-test`，复用同一 allow/match 函数覆盖两个合法值、三个非法值、两个匹配和两个错配，不触发 root/path/inbound/lock/service 逻辑。

## fresh local verification

```text
Git Bash 5.2.37: bash -n runner = passed
runner --self-test = runner_self_test=passed cases=9 statuses=401,403
node --check validator = passed
validator --self-test = {"outcome":"passed","cases":24,"schemas":["qimao.application-release/v1","qimao.application-release/v2"]}
1726 --validate = passed, releaseId=asr-budget-default-off-20260901-r1, migration=none
1725 legacy-v2 --validate = passed, migration=gated
1721 real-v1 --validate = passed, migration=gated
1721 real-v1 --verify-checksums = passed, files=3
1725 legacy-v2 --verify-checksums = passed, files=3
1726 --verify-checksums = passed, files=2
emit v1 = probe_expected_status:401, migration:gated
emit legacy-v2 = probe_expected_status:401, migration:gated
emit explicit-v2 = probe_expected_status:403, migration:none
runner dataflow = hardcoded_401:false, declaration_driven:true
archive SHA unchanged = true
1725 declaration/helper/SHA unchanged = true
runner/validator/declaration/SHA encoding = UTF-8 no BOM, LF, CR bytes:0
```

## exact future external transfer scope

本任务没有执行以下传输。若规划与用户批准下一次发布，外部写入范围必须精确限制为两个批次、五个本地文件：

1. fixed-entry 安装暂存，仅两项：
   - `deploy/debian/bin/qimao-application-release`
   - `deploy/debian/bin/application-release-declaration.mjs`
2. application inbound，仅三项：
   - `deploy/asr-budget-default-off-release-1726/application-release.declaration.json`
   - `work/asr-budget-default-off-20260901-r1.tar.gz`
   - `deploy/asr-budget-default-off-release-1726/SHA256SUMS`

不得上传 1725 `db-migration-gate.mjs`，不得重新运行 migration，不得把旧 1725 declaration/SHA 混入新 inbound。安装前必须在目标 Debian 对新 runner 执行 `/bin/bash -n` 与 `--self-test`、对新 validator 执行 Node syntax/24 项 self-test，并逐字核对上述 SHA；随后仍只允许调用一次既有 `/usr/local/sbin/qimao-application-release /var/tmp/qimao-application-release-inbound`。

## remaining_gap

远端当前仍是 1725 安装的 runner/validator 身份；1726 新 fixed 文件和三项 application inbound 尚未上传或安装，固定入口也未再次调用。规划需要复核“已应用 migration + 本轮 migration:none”边界，并在取得新的明确外部授权后创建独立 SERVER 发布任务；本地准备任务不得自行恢复发布。

## residual

本轮只新增 1726 declaration/SHA、修改唯一 fixed runner/validator 源码并写入本文档。没有第二 archive、没有 helper 副本、没有临时 staging；未连接 SSH、未读取 Secret、未修改服务器、数据库、服务、指针、Provider、COS 或业务数据，未 reset、checkout、clean、stash、commit 或 push。
