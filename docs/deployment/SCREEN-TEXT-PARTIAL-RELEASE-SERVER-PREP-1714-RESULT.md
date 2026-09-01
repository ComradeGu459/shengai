artifact_written: true

# SCREEN-TEXT-PARTIAL-RELEASE-SERVER-PREP-1714

## outcome

```yaml
outcome: local_candidate_ready
slice_outcome: passed
remote_actions: 0
target: 103.36.63.67
requires_user: false
next_owner: PLANNER -> SERVER（另行授权后才可上传/执行）
```

本卡只完成 1712/1713 显式 partial Release 闭包的本机冻结和发布前门；未连接 `103.36.63.67`，未执行 SCP、root runner、迁移、current/static 切换、systemd、Provider/COS/业务 API 或数据库写入。

## 影响闭包

- public contract：`packages/contracts/src/screen-text.ts`。
- single migration：`backend/migrations/1754976034000_add_partial_screen_text_release.cjs`（`partial`、`excluded_episodes` 及一致性约束；down 可回滚）。
- server read/write：`backend/src/modules/screen-text/screen-text.read.repository.ts`、`backend/src/modules/screen-text/screen-text.write.repository.ts`。
- employee UI：`frontend/src/features/screen-text/ScreenTextWorkspace.tsx`、`frontend/src/features/screen-text/ScreenTextWorkspace.module.css`。
- 专项回归：`tests/backend/screen-text.test.ts`、`tests/frontend/ScreenTextWorkspace.test.tsx`（仅用于本机验证，不作为生产部署输入）。

归档沿用最近成熟的 backend/node_modules 及原子 `backend` + `static` 拓扑，仅替换当前构建的 screen-text 运行时闭包、员工静态产物和单一 6034000 migration；不引入新部署架构。

## frozen artifacts

| artifact | bytes | SHA-256 |
| --- | ---: | --- |
| `work/screen-text-partial-release-20260901-r1.tar.gz` | 9,308,173 | `695e477a34f62d67d77893fa3faa1d23fb28141e271916a4fdf32ab9c05c83c7` |
| `deploy/screen-text-partial-release-1714/runner.sh` | 17,004 | `bfe4cf32ae31a70adb63b1bdaa220e8b880c1c606b8fadc3c2049cffe8becde7` |
| `deploy/screen-text-partial-release-1714/db-migration-gate.mjs` | 4,855 | `c7d22cd1ca404773b6ef874c9988c7bd248596c7b83bfa02228769a5dd0232f7` |
| `deploy/screen-text-partial-release-1714/SHA256SUMS` | 277 | `archive/runner/helper hashes` |

`SHA256SUMS` 三行已逐字匹配上述 archive、runner 与 helper 的最终 bytes/SHA；archive 身份保持不变，未生成第二候选。

## local front door evidence

- migration syntax：`node --check backend/migrations/1754976034000_add_partial_screen_text_release.cjs`，exit `0`。
- partial-release专项测试：`pnpm exec vitest run tests/backend/screen-text.test.ts tests/frontend/ScreenTextWorkspace.test.tsx`，`2` files、`42/42` tests passed。
- dual-end typecheck：backend `pnpm --filter @qimao-terms-cloud/backend run typecheck` exit `0`；employee frontend `pnpm --filter @qimao-terms-cloud/frontend run typecheck` exit `0`。
- production build：frontend `pnpm --filter @qimao-terms-cloud/frontend run build` exit `0`（Vite `198 modules`；仅有既有单 chunk >500 kB warning）；backend `pnpm --filter @qimao-terms-cloud/backend run build`（contracts、backend tsc、sidecars）完成且无错误。
- backend entries：`node --check backend/dist/server.js` 与 `node --check backend/dist/workers/screen-text.worker.entry.js` exit `0`；dist 中 `screen-text.write.repository.js` 含 `SCREEN_TEXT_PARTIAL_RELEASE_BLOCKED` 与 `excluded_episodes`。
- static markers：构建资产包含 `确认部分发布`、`排除集`、`发布画面字版本`。
- helper：`node --check deploy/screen-text-partial-release-1714/db-migration-gate.mjs` exit `0`；`node ... --self-test` 输出 `helper_self_test=passed`。helper 只输出 gate/code/迁移名和 schema 结果，不输出 `DATABASE_URL` 或任何 Secret。
- runner policy：当前 runner 无 CR/LF、无 UTF-8 BOM；静态禁用 `source`、`eval`、`set -a`/`set +a` 命中；Linux `/bin/bash -n` 将在后续服务器前门执行。

## archive audit

```yaml
members: 14919
unique_member_paths: 14919
directories: 2190
regular: 11348
posix_symlinks: 476
internal_hardlinks: 905
top_level: backend,static
absolute_or_traversal_paths: 0
backend_server_entries: 1
screen_text_worker_entries: 1
new_migration_entries: 1
static_index_entries: 1
static_asset_files: 3
```

本机 `tar -tzf` 与 Python `tarfile` 结构审计通过；Windows 不解包 POSIX symlink，因此未把本机解包失败误报成候选内容失败。与 1642 基底归档相比，内容差量为 23 个已构建 screen-text/OCR dist 文件、3 个员工 static asset 文件及 1 个 6034000 migration；成员路径无重复、无绝对路径或 `..`。

## rollback publish runbook（后续授权后唯一一次）

1. `qimao-deploy` 仅在固定目录 `/var/tmp/qimao-screen-text-partial-release-1714-inbound` 放入四个输入（archive、runner、`db-migration-gate.mjs`、SHA256SUMS）；root runner 先锁定 SHA、`/bin/bash -n`、helper self-test 和输入 owner/mode，任何门失败立即退出。
2. root 只读基线必须精确满足：`current -> /opt/qimao-terms-cloud/releases/ocr-media-error-20260831-r1`、员工 static -> `/srv/qimao-terms-cloud/frontend-asr-srt-compare-20260831-r2`，候选 release/static、stage、next 和 runtime 均不存在；backend active/running、`ExecMainStatus=0`、`NRestarts` 为非负整数；ASR=`active/running/0/0`、screen worker=`inactive/dead/0/0`、OpenVINO=`active/running/0/0`，health 与员工深链均 `200`。任一不符即 `BASELINE_GATE_FAILED`，不解包不重启。
3. 归档门只接受 `backend/` 与 `static/` 两个顶层，校验无绝对/穿越路径；解包到固定 runtime 后，以 root:qimao backend stage、root:root static stage 建立候选，逐入口 `node --check` + `qimao` 可读，导入 storage/ASR/screen worker/app/server，并检查 partial-release static markers。
4. 在任何切换前，以候选 release 的 `db-migration-gate.mjs --before --migration-dir <candidate>/backend/migrations` 通过 DB 门：`schema_migrations` 已有 `1754976033000_add_budget_enforcement_enabled`、没有 `1754976034000_add_partial_screen_text_release`，且候选待执行集合精确只有 6034000。helper 通过 systemd 原生 `EnvironmentFile=/etc/qimao-terms-cloud/backend.env`、`User=qimao`、`Group=qimao` 运行，不 shell source/env 解析。
5. 候选/DB 门通过后，先只把 `current` 原子指向 `/opt/qimao-terms-cloud/releases/screen-text-partial-release-20260901-r1`，旧 backend 进程保持不重启；随后以同一 systemd 原生 EnvironmentFile、qimao 身份、candidate `backend/dist/database/migrate.js` 执行唯一一次 migration（singleTransaction）。
6. migration 返回成功后立即标记 `schema_retained=1754976034000_add_partial_screen_text_release`，再运行 helper `--after` 校验 `schema_migrations`、`partial`/`excluded_episodes` 两列和 `screen_text_releases_partial_snapshot_valid` 约束；仅在该门通过后切换 static -> `/srv/qimao-terms-cloud/frontend-screen-text-partial-release-20260901-r1`，最后只重启 `qimao-backend.service`。不启动/重启 ASR、screen worker 或 OpenVINO。
7. 发布后必须通过 health `200`、screen-text release 未授权请求 `401 application/json` 且非 HTML、员工根页/深链 `200`、backend `active/running/0/0`、PID 5 秒稳定以及 ASR/screen/OpenVINO 状态保持基线；任何一门失败触发同一 runner 自动回滚。
8. 回滚顺序固定为：仅当链接仍指向候选时恢复 old current/static；migration 尚未成功时 DB 无部分写；migration 成功但后续门失败时恢复 old current/static/backend、**保留已应用 6034000，不执行 down**，终态明确 `schema_retained=1754976034000_add_partial_screen_text_release`；按尝试标志重启 backend 并等待 health；删除候选 stage/release/static、next、runtime 和 inbound；逐路径复核所有固定临时对象 absent。清理失败必须以 `rollback_or_cleanup=failed` 暴露，不得现场补丁或重放。

## remaining_gap

- 本机未运行 Linux `/bin/bash -n`、真实 Linux import 或 root/qimao 权限门；Windows 仅完成 archive listing/结构审计。
- old static 基线及候选在服务器上的真实 owner/mode、systemd/health/route 尚需部署片只读确认；本卡没有把假设写成已验证事实。
- 因此当前仅有本地 immutable candidate，尚未上传或部署；后续必须由规划审查冻结身份后重新授权一次 SCP/root runner，失败沿用本 runbook 自动回滚并精确清理。

## residual

本卡临时 staging、审计目录和临时打包 helper 已精确删除；工作区仅保留唯一 archive、runner、DB gate helper、SHA 清单和本结果文档。未提交、未推送、未清理用户既有脏树。
