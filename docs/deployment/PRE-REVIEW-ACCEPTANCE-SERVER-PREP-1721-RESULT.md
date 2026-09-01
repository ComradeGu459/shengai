artifact_written: true

# PRE-REVIEW-ACCEPTANCE-SERVER-PREP-1721

## outcome

```yaml
outcome: local_release_candidate_ready
slice_outcome: passed
release_id: pre-review-acceptance-release-20260901-r1
schema: qimao.application-release/v1
migration: 1754976035000_lock_review_source_identity
remote_actions: 0
deployments: 0
transfers: 0
secret_reads: 0
provider_calls: 0
business_source_changes: 0
requires_user: false
next_owner: 规划（独立部署风险审核；通过后由规划唯一执行桥消费固定入口）
```

本轮已把 1719 的 backend/shared-contract 构建闭包与 1720 的员工静态构建冻结为一个本地候选。候选沿用 1714 已验收的生产依赖和链接图，只替换当前已构建的 backend `dist`、共享 contracts `dist` 与完整员工 static，并新增 `1754976035000_lock_review_source_identity.cjs`。没有修改业务源码、安装依赖、重新构建、连接服务器、传输文件、读取 Secret、调用 Provider、执行迁移、重启服务或切换链接。

## frozen baseline and targets

声明逐字冻结 `docs/status/CURRENT.md` 的正式基线：

| identity | frozen value |
| --- | --- |
| previous backend | `/opt/qimao-terms-cloud/releases/screen-text-partial-release-20260901-r1` |
| previous employee static | `/srv/qimao-terms-cloud/frontend-screen-text-partial-release-20260901-r1` |
| next backend | `/opt/qimao-terms-cloud/releases/pre-review-acceptance-release-20260901-r1` |
| next employee static | `/srv/qimao-terms-cloud/frontend-pre-review-acceptance-release-20260901-r1` |
| ASR | `active/running/0/0` |
| screen-text | `inactive/dead/0/0` |
| OpenVINO | `active/running/0/0` |

固定 runner 必须在任何候选副作用前逐字复核两个 previous target 和三项保留 unit；本候选不授权启动、停止或重启 ASR、screen-text、OpenVINO。

## payload identity

固定 inbound 的精确文件集为以下四件。`SHA256SUMS` 闭合列出声明、归档和 helper；它自身不递归列入自身，但其本地身份单独冻结如下。

| inbound basename | local source | bytes | SHA-256 |
| --- | --- | ---: | --- |
| `application-release.declaration.json` | `deploy/pre-review-acceptance-release-1721/application-release.declaration.json` | 1,136 | `6a62fd3f6fc5f6029b228e7867b2704c8d5233bf979de8e46a038540ce0ffdb6` |
| `pre-review-acceptance-release-20260901-r1.tar.gz` | `work/pre-review-acceptance-release-20260901-r1.tar.gz` | 9,317,278 | `d789f2b57c4d984e3a75d630bdd90565cebe67dab07b771a2fd87eccf49a65f2` |
| `db-migration-gate.mjs` | `deploy/pre-review-acceptance-release-1721/db-migration-gate.mjs` | 8,107 | `9365ae2057a4c24258b79450afcaf0ce33dc398cf8200506939c47bc26531e20` |
| `SHA256SUMS` | `deploy/pre-review-acceptance-release-1721/SHA256SUMS` | 306 | `91ca241931ca5d4e8e66ad6851ff43cc1b7d2b7300a2678b8ee951d450d0057c` |

声明、helper、SHA 文件均为 UTF-8 无 BOM、LF、CR bytes=`0`。实际文件 SHA 与 `SHA256SUMS` 三项逐项复算一致；固定 validator 的闭合文件集门输出 `{"outcome":"passed","files":3}`。

## archive composition and gates

成熟基线为 `work/screen-text-partial-release-20260901-r1.tar.gz`（9,308,173 bytes，SHA-256 `695e477a34f62d67d77893fa3faa1d23fb28141e271916a4fdf32ab9c05c83c7`）。候选执行以下唯一差量：

- 456 个 `backend/dist/**` regular members 与当前 `backend/dist` 文件集/字节逐项一致；
- 88 个已部署 `@qimao-terms-cloud/contracts/dist/**` regular members 与当前 `packages/contracts/dist` 文件集/字节逐项一致；
- `static/**` 与当前 `frontend/dist` 文件集/字节逐项一致，不保留旧 hash 资产；
- 新增且仅新增 `backend/migrations/1754976035000_lock_review_source_identity.cjs`，5,724 bytes，SHA-256 `7f405a637f4e89228c9f8ee5524669fd43a03b3cbf44c9f5cbe984ff8d57d0d7`。

按固定 runner 内嵌归档安全算法的本轮实审结果：

```text
archive_audit=passed members:14920 regular:11349 directories:2190 symlinks:476 hardlinks:905
```

归档只有 `backend`、`static` 两个顶层；无重复、绝对路径、`..`、反斜杠、非法类型、跨根链接或悬空链接。14,198 个 `backend/node_modules/**` 依赖成员与基线链接闭包保持不变，14,347 个非覆盖成员的类型、mode、link target 及 regular bytes 与成熟基线逐项一致。`@tus/server` 和 `@qimao-terms-cloud/contracts` 的顶层 alias 均为归档内闭合 symlink。

五个固定入口均为 regular member，且针对归档同字节的本地构建产物执行 `node --check` 全部通过：

```text
backend/dist/server.js
backend/dist/workers/asr.worker.entry.js
backend/dist/workers/screen-text.worker.entry.js
backend/dist/workers/pre-review.worker.entry.js
backend/dist/workers/term-extraction.worker.entry.js
```

使用相同构建字节和本地生产依赖闭包执行固定六项 import（`@tus/server`、S3 storage、腾讯 ASR runtime、ASR worker、app、server）通过。Windows `tar.exe` 不能物化候选中的 POSIX symlink，因此未把一次失败的 Windows 解包误写成 Linux 运行通过；验证临时目录已安全删除。真实 Linux 解包、qimao 可读、五入口 syntax 和六项 import 仍由固定 runner 在任何迁移或链接切换前强制重复。

## strict declaration and static markers

固定 validator `application-release-declaration.mjs` 身份仍为 11,469 bytes / `4f064446c09ce40f4b27f980620377d25d813782d0ce237d72694c8a7ef3c3c3`；固定 runner 身份仍为 26,671 bytes / `96730a2c14951968afedfbc83aa14f570076c96d8a6b45f9ed9a259c1d8e3ee9`。本轮未修改二者。

本轮 validator 证据：Node syntax exit `0`；`--self-test` 输出 `{"outcome":"passed","cases":10,"schema":"qimao.application-release/v1"}`；严格声明 `--validate` 输出 `{"outcome":"passed","releaseId":"pre-review-acceptance-release-20260901-r1","migration":"gated"}`。未知字段、非法 target、控制字符 marker、helper 缺失、SHA 多余/缺失成员均由既有 v1 自测覆盖。

候选员工 assets 逐字包含以下五个声明 marker：

```text
前置审改会话已创建，正在准备对齐事实。
来源已经变化，历史会话只读
画面字来源为部分 Release
创建并固定来源
历史验收版本已发布，当前会话只读。
```

未认证探针冻结为 label=`subtitle_acceptance_sessions`、path=`/api/projects/00000000-0000-0000-0000-000000000000/subtitle-acceptance/sessions`；固定 runner 发布后要求 `401 + application/json + non-HTML`。

## migration identity contract

候选复用既有 `db-migration-gate.mjs` 合同并冻结到唯一 schema：

```text
previous=1754976034000_add_partial_screen_text_release
expected=1754976035000_lock_review_source_identity
helper_self_test=passed
db_gate=before passed pending=1754976035000_lock_review_source_identity
db_gate=after passed schema=1754976035000_lock_review_source_identity
```

`--self-test` 本轮精确单行输出 `helper_self_test=passed`，并覆盖 previous 缺失、expected 已应用及额外 pending 三个拒绝分支。真实 `--before` 只允许 6034000 已登记且 6035000 是唯一 pending；真实 `--after` 除登记身份外还核对：

- `pre_edit_sessions.screen_text_release_id` 为 nullable UUID；
- 到 `screen_text_releases` 的有效 `ON DELETE RESTRICT` FK；
- `pre_edit_sessions_screen_text_source_consistent` 有效 check constraint；
- `pre_edit_sessions_screen_text_release_id_index` 为 ready/valid；
- pre-edit session、pre-edit episode、acceptance session 三个 enabled source-identity trigger 与各自固定 function 名逐项一致；
- 所有能关联到既有 screen-text release 的历史 source snapshot 已完成 backfill。

helper 非零退出或 stdout 不是声明 schema 对应的精确单行时，固定 runner 均在相应阶段阻断。迁移只会由固定 runner 在 backend current 切到候选、旧 backend PID/状态仍保持后执行一次；after 身份通过前不会切员工 static 或重启 backend。

## unique execution command

候选经独立部署风险审核、四个 payload 文件以精确 basename/owner/mode 放入固定 inbound 后，规划唯一执行桥只能发出以下一个远端命令体：

```text
sudo -n /usr/local/sbin/qimao-application-release /var/tmp/qimao-application-release-inbound
```

不得复制历史任务 runner、不得改用 helper 或 validator 作为第二入口、不得手工执行 migrate、切链接或补跑 service 命令。

## remaining_gap

- 本轮没有服务器读写、上传、发布、数据库连接或服务动作；因此 production migration、Linux 解包/import、未认证 API、员工根页/深链及发布后 unit/PID 稳定性尚未发生，只能由固定 runner 在真实执行时判定。
- 当前 Windows 环境没有可用 Bash/WSL，故本轮没有重新运行未修改 fixed runner 的 `bash -n`；其 bytes/SHA 与 1717 冻结及 1718 已安装验收身份一致，候选与它的 v1 validator/文件集合同已在本轮实测通过。
- 规划必须先做独立部署风险审核；任何上传和执行仍属于外部写动作，并受平台确认约束。本地候选本身不构成发布授权。

## residual

工作区只新增本切片的声明、helper、SHA 清单、唯一归档和本文档；失败的 Windows 解包临时目录已删除，未留下第二归档或 staging。既有脏树原样保留，未 reset、checkout、clean、stash、提交、推送或清理用户历史文件。

## 1722 fixed-entry execution and SERVER read-only verification

```yaml
outcome: deployed_and_read_only_verified
slice_outcome: passed
release_id: pre-review-acceptance-release-20260901-r1
migration: 1754976035000_lock_review_source_identity
planning_bridge_terminal: passed
server_verify_writes: 0
service_restarts_by_verify: 0
secret_reads: 0
business_row_reads: 0
requires_user: false
next_owner: 规划
```

规划唯一执行桥已回传 `terminal=passed`。SERVER 随后只通过既有 SSH/root 只读通道核对链接、固定文件身份、systemd 状态、HTTP、迁移登记与 PostgreSQL 系统目录；没有再次调用发布入口，没有传输、迁移、重启、链接切换、读取环境文件、Secret 或业务表行。

### deployed identity

| identity | verified value |
| --- | --- |
| backend current | `/opt/qimao-terms-cloud/releases/pre-review-acceptance-release-20260901-r1`；目标为 `root:qimao 0750` 普通目录 |
| employee static | `/srv/qimao-terms-cloud/frontend-pre-review-acceptance-release-20260901-r1` |
| fixed runner | 26,672 bytes / `6b2097610b50dfbb4ad9dd26b95ba8d375ded4fc87c8994ba0aaa69da2ceabbb` / `root:root 0750` / links=`1` |

固定 runner 是 1722-R1 修正 Debian `runuser=/usr/sbin/runuser` 后的新身份；1717/1718 的 `96730a2c...d8e3ee9` 只保留为安装历史，不再是当前服务器执行身份。

### migration and runtime gates

只读 SQL 使用本机 PostgreSQL peer，并且只访问 `schema_migrations`、`information_schema` 与 `pg_catalog`：

```text
migration=1
column=uuid/YES
constraint=pre_edit_sessions_screen_text_release_id_fkey/f/r/true/screen_text_releases
constraint=pre_edit_sessions_screen_text_source_consistent/c/ /true/-
index=pre_edit_sessions_screen_text_release_id_index/true/true
trigger=acceptance_sessions/acceptance_sessions_source_identity_immutable/reject_acceptance_source_identity_update/O
trigger=pre_edit_episodes/pre_edit_episodes_source_identity_immutable/reject_pre_edit_episode_source_identity_update/O
trigger=pre_edit_sessions/pre_edit_sessions_source_identity_immutable/reject_pre_edit_source_identity_update/O
```

`1754976035000_lock_review_source_identity` 精确登记一次；nullable UUID、`ON DELETE RESTRICT` FK、有效 check、ready/valid index 与三个 enabled 不可变身份 trigger 均成立。业务行 backfill 门已由固定 runner 的 `terminal=passed` 覆盖，SERVER 终验没有为重复证明而查询业务表。

四个 unit 的只读 `ActiveState/SubState/NRestarts/ExecMainStatus` 与 PID：

```text
backend=active/running/0/0 pid=873405
asr=active/running/0/0 pid=694703
screen=inactive/dead/0/0 pid=0
openvino=active/running/0/0 pid=842128
```

ASR 与 OpenVINO PID 分别仍为 1715/1718 已保存的 `694703`、`842128`，screen-text 继续停止；SERVER 终验没有产生任何 unit 动作。

### HTTP and cleanup gates

```text
health=200 application/json; charset=utf-8
employee_root=200 text/html
employee_pre_review=200 text/html
employee_subtitle_acceptance=200 text/html
unauthenticated_acceptance_sessions=401 application/json; charset=utf-8 nonhtml=true
residual_count=0
```

零残留集合覆盖固定 inbound、runtime、backend/static stage 与两个 `.next` 链接，共六项全部 absent。1721 的 production migration、Linux candidate gate、员工深链、未认证 API 和发布后 unit 稳定性缺口均由 1722 真实执行及本次独立只读终验关闭；产品后续里程碑仍由规划按 `CURRENT` 裁决。
