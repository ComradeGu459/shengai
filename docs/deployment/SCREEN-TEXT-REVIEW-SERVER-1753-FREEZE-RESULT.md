artifact_written: true

# SCREEN-TEXT-REVIEW-SERVER-1753-FREEZE

## outcome

```yaml
outcome: artifact_written
slice_outcome: local_release_bundle_frozen
release_id: screen-text-review-20260901-r1
schema: qimao.application-release/v2
employee_static_mode: replace
system_static_mode: preserve
migration: none
frozen_files: 5
server_connections: 0
remote_transfers: 0
fixed_entry_installations: 0
fixed_entry_executions: 0
database_writes: 0
service_restarts: 0
residual: 0
next_owner: 规划
requires_user: true
```

1752 的唯一闭包首因已按规划指定命令修正：使用 offline、non-legacy、`inject-workspace-packages=true` 的 pnpm deploy 生成自包含 backend。1753 复用已通过的 typecheck/build，不修改 pnpm 配置、workspace、lock、fixed 或业务源码。

声明锁定 backend 从 `admin-summary-20260901-r1` 切换到本 release；员工站从 `frontend-asr-budget-default-off-20260901-r1` 替换到派生新 target；管理员站使用 `systemStatic.mode=preserve`，expected/current target 为 `system-frontend-admin-summary-20260901-r1`。migration 精确为 `none`，未包含 helper。

## exact five-file action input

| role | local path | bytes | SHA-256 | fixed-entry destination / inbound basename |
|---|---|---:|---|---|
| fixed runner | `deploy/debian/bin/qimao-application-release` | 45743 | `d86a8907a8d4e5e9add9737158f2a62d4d0fa7937e1f56ca59a112694e6a7911` | `/usr/local/sbin/qimao-application-release` |
| fixed validator | `deploy/debian/bin/application-release-declaration.mjs` | 26901 | `a3748e2a5a861faa74c5adf0dad0a3dc5b5c65bc1270aa79ba83e749ae2bc3df` | `/usr/local/libexec/qimao-application-release-declaration.mjs` |
| declaration | `deploy/screen-text-review-release-1753/application-release.declaration.json` | 927 | `ba64dddcf316c0e5a8d5374edbb9456376dae9778668d54721f274609eee3738` | `/var/tmp/qimao-application-release-inbound/application-release.declaration.json` |
| archive | `work/screen-text-review-20260901-r1.tar.gz` | 9328201 | `c47c9fd3cb3c1e37e37e3f928689d2f377aa62951e099cfb927bf9b3ce9e5fbc` | `/var/tmp/qimao-application-release-inbound/screen-text-review-20260901-r1.tar.gz` |
| SHA256SUMS | `deploy/screen-text-review-release-1753/SHA256SUMS` | 207 | `1969685d7695c44b0f0373c14352c1430684216b878e1b830b7bb3a80c4f447a` | `/var/tmp/qimao-application-release-inbound/SHA256SUMS` |

`SHA256SUMS` 闭集严格只有 declaration 与 archive 两项；fixed 两项是独立安装输入。后续动作目标为既有 `qimao-test-server`：先原位安装并核对两个 fixed，再放入上述三项 inbound，最后只调用一次 `/usr/local/sbin/qimao-application-release /var/tmp/qimao-application-release-inbound`。

## local gates

- `pnpm exec vitest run tests/backend/screen-text.test.ts tests/frontend/ScreenTextWorkspace.test.tsx`：2 files、44/44 passed。
- 已复用 1752 通过的 `pnpm run typecheck` 与 `pnpm run build`：backend、frontend、system-frontend typecheck/build 通过；frontend 198 modules、system-frontend 45 modules。
- 指定 portable 命令：`pnpm --offline --config.inject-workspace-packages=true --filter '@qimao-terms-cloud/backend' deploy --prod <absolute-stage/backend>`；170 packages、reused 170、downloaded 0，lockfile supply-chain policies 169 entries 通过。
- backend 五入口 `node --check`、六项 portable import 通过；员工静态 marker `画面字`、`创建前置审改会话` 在 production assets 与 archive 均存在。
- validator：`node --check`、self-test `cases=46`、actual declaration validate、emit 与 SHA closed-set `files=2` 通过。
- runner：`bash -n`、self-test `cases=28` 通过（`MSYS=winsymlinks:sys`）。
- archive：`14926` members（regular `11522` / directories `2190` / symlinks `476` / hardlinks `738`），closed roots 精确为 `backend,static`；`system-static` members `0`、duplicates `0`、越界/非法链接 `0`。
- declaration/SHA 为 UTF-8 无 BOM、LF、CR bytes `0`；actual hashes 与 SHA256SUMS 完全一致。

本轮没有连接 qimao-test-server、上传、fixed 安装、固定入口调用、迁移、数据库写入、服务重启或业务任务。唯一临时 stage `work/screen-text-review-20260901-r1` 已审计后精确删除；唯一 archive 仍为 `work/screen-text-review-20260901-r1.tar.gz`。

## remaining_gap

等待规划在动作任务中确认并消费上述五件固定身份。服务器端仍需在一次受控动作中完成 fixed 安装、三项 inbound 上传、前门/基线门、一次 `migration.mode=none` 发布、失败自动回滚与残留复核；本冻结任务不代替该外部动作。
