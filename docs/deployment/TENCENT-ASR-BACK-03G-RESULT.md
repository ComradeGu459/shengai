# TENCENT-ASR-BACK-03G 结果

outcome=passed

## evidence

- `backend/package.json` 将既有缓存版本 `typebox` `1.3.12` 声明为 production dependency；`pnpm-lock.yaml` 的 `backend` importer 已同步记录 `specifier: 1.3.12`、`version: 1.3.12`。
- `backend/node_modules/typebox` 由 pnpm 的现有 `.pnpm/typebox@1.3.12` 实体 Junction 解析，无手工复制或仓库内提交的 node_modules。
- 在 backend package context 执行 Node ESM import：`@fastify/type-provider-typebox` 与 `typebox/compile` 均成功（`BACKEND_PACKAGE_RESOLUTION_OK`）。
- 在一次性 ASCII 临时树中，将 provider 与 `typebox` 物理复制为普通文件后执行同样 ESM import，结果 `FLAT_IMPORT_OK`；临时树随后删除，`temp_exists=False`，无链接残留。
- backend typecheck：`tsc -p backend/tsconfig.json --noEmit`，exit 0。
- backend build：`tsc -p backend/tsconfig.build.json`，exit 0。
- 限定 `git diff --check -- backend/package.json pnpm-lock.yaml`，exit 0。

## behavior

backend 的生产运行时现在显式拥有 `typebox@1.3.12`，去 Junction/可搬运布局不会再因 `@fastify/type-provider-typebox` 的隐式 peer 兄弟缺失而无法加载；现有 `@sinclair/typebox` 导入与业务代码未改动。

## remaining_gap

未执行部署、服务器启动或真实 Tencent API。一次 `pnpm` wrapper 尝试因本机 supply-chain metadata/模块清理门未能直接运行脚本，后续验证使用已解析的本地 TypeScript/Node 入口，未升级依赖或联网取新版本。

## next_owner

PLANNING

## files

- `backend/package.json`
- `pnpm-lock.yaml`（仅 backend importer 的 typebox 条目为本片新增）
- `docs/deployment/TENCENT-ASR-BACK-03G-RESULT.md`

## residual

本地 PostgreSQL 未启动；未产生运行进程或临时目录。工作树中其他既有脏差量原样保留。

## requires_user

false
