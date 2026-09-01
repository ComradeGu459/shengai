# TERM-PROVIDER-JSON-RELEASE-SERVER-26 结果

## outcome

`blocked`；`artifact_written=true`。

本轮完成了 BACK-25 + BACK-10 的官方 pnpm production deploy 候选构建和本地归档门，但唯一一次 SCP 批次在本机 PowerShell 原生参数展开处失败；未传输文件、未启动远端 runner、未切换 `current`/静态入口、未重启 unit。

## evidence

- 候选：`term-provider-json-20260830-r1`。
- 官方 pnpm deploy：`pnpm 11.21.0`，`170` packages，`reused=170/downloaded=0`；未拼接旧 `node_modules`，未修改仓库业务源码、package、lock 或配置。
- 最终候选 archive：`9,533,912` bytes；SHA-256=`d8e1d8e10c0e454869d6eb346d85163fe651ccf95dde429f04f0fcde383b6430`。
- manifest：`118,848` bytes；SHA-256=`7fcaf1871492282924a08675f8da97786aa093e560c7b332cc23d2bf12f4a610`；payload=`607` 项。
- audit：`272` bytes；SHA-256=`ab9dd4e542e3a59478d85a59e6b791fe86c5accdb1460b56ffdf4b1b9c32bfec`；bytes/SHA 均由命令变量生成。
- 归档边界：`15,024` members、`476` 个相对 symlink；Python tar 只读审计为 `absolute=0`、`escape=0`、`missing=0`；未使用展开后的 `83,783`-member 错误归档。
- 候选 dist 只读内容门：`thinking: { type: 'disabled' }`、`max_tokens: 16_384`、完整 JSON 结构示例均存在；本地 11-gate import probe 在未压缩官方 deploy 树上通过。
- SCP 首因：唯一批次命令返回 `exit=255`，安全 stderr 为 `scp.exe: stat local "(Join-Path": No such file or directory`。这是本机命令参数构造错误；未有远端候选文件传输，远端 runner 执行次数=`0`。
- 清理后服务器只读复核：固定 staging absent；`current` 仍为 `/opt/qimao-terms-cloud/releases/20260829-term-control-122a-r1`；静态入口仍为 `/srv/qimao-terms-cloud/system-frontend-20260829-term-control-122a-r1`；四 unit 均 `ActiveState=active`、`SubState=running`、`NRestarts=0`、`ExecMainStatus=0`；`/health`=`HTTP 200`、`status=ok`、`database=connected`。
- 外部调用计数：DeepSeek=`0`、COS=`0`、Tencent=`0`；生产 DB 写入=`0`；`provider.env`、`/etc`、unit/drop-in、canonical route 均未改动。

## remaining_gap

候选尚未完成测试服务器发布、四 unit 发布后健康门、active terms route 与实际服务器 dist 复核。按发布 runbook 的单 SCP/单 runner/失败即停止规则，本轮不能在同一任务重试 SCP。

## next_owner

`PLANNER → SERVER`：另签一次独立发布切片，消费本轮保留的候选三件套；只修正 SCP 的本地参数传递，禁止重建候选、重跑 pnpm deploy、增加 runner 分支或进行 Provider 调用。

## files

- `docs/deployment/TERM-PROVIDER-JSON-RELEASE-SERVER-26-RESULT.md`
- 仓库外保留候选：`term-provider-json-20260830-r1.tar.gz`、`term-provider-json-20260830-r1.manifest.json`、`term-provider-json-20260830-r1.sha256.audit`

## residual

- 测试服务器：固定 staging 已精确删除并复核 absent；release/static/current、四 unit、`provider.env`、DB 均保持基线。
- 本地临时候选 deploy 树、解包检查树、transfer 目录、runner、归档 helper 和 tar listing 已删除；仅保留上述三件候选交付物。
- 本轮未提交、未推送；脏工作树按要求保留。

## requires_user

`false`：既有授权覆盖候选发布；仅需由规划方签发新的独立发布切片，不能在本轮继续重试。
