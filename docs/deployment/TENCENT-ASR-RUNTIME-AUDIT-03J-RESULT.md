# TENCENT-ASR-RUNTIME-AUDIT-03J 结果

## outcome

`passed`

03I 不是业务依赖缺失，而是候选生成与验收合同错误：legacy deploy 后对 Junction 做递归解引用会破坏 pnpm virtual-store 的解析拓扑；同时要求传递依赖从应用 package 根直接 `require.resolve`，不符合 pnpm 严格依赖布局。官方 dedicated-lockfile deploy 的实际生产入口已全部加载，唯一 portable 路线已冻结为“内部 Junction → 相对 POSIX symlink tar”。

## evidence

- pnpm 官方文档说明 `deploy` 应在目标目录生成隔离、可复制到服务器的 `node_modules`；默认模式使用 dedicated lockfile，`--legacy` 会禁用该行为，并且仅用于未启用 injected workspace package 的兼容场景：<https://pnpm.io/cli/deploy>。
- pnpm 官方仓库已有 legacy deploy 丢失/错放传递依赖的公开缺陷，且 Windows Junction 跨平台复制是已知边界：<https://github.com/pnpm/pnpm/issues/9550>、<https://github.com/pnpm/pnpm/issues/13618>。
- 本地固定 pnpm=`11.21.0`。只在命令行临时启用 `inject-workspace-packages=true`，执行当前 backend 的 `--prod deploy`；dedicated lockfile 为 169 项、安装闭包 170 包，供应链策略验证通过，包内容 `reused=170/downloaded=0`。仓库 package、lock 与 workspace 配置均未修改。
- official deploy 树为 12,230 个文件、45,637,204 bytes、476 个 Junction；全部 Junction 目标都在同一 deploy 根内，外部目标为 0。
- 从应用 package 根直接解析 19 个“直接+传递”名称仍仅 4/19，这是严格 pnpm 布局的预期可见性，不是运行门。使用真实编译入口验证为 5/5：S3 compatible storage、Tencent ASR runtime、ASR Worker entry、app、server 均成功 import。
- 小型 Junction 归档实验先证明可把内部 Junction 写成相对 POSIX symlink；完整归档随后包含 14,894 个成员：11,325 个普通文件、905 个归档内 hardlink、2,188 个目录、476 个相对 symlink。symlink/hardlink 的绝对目标=0、缺失目标=0；package、派生 lock、server 与 ASR Worker entry 均存在。
- 冻结 handoff 为 `C:\Users\ComradeGu\Documents\七猫兼职\.asr03j\candidate.tar.gz`，大小 8,827,844 bytes，SHA-256=`7eac41e46d1b6a923d5d7bacc8c8d3198a61fe2e81e86e780dd3f6692b85ab56`。原 deploy 树、未压缩 tar、长路径失败产物、小型实验和临时审计脚本均已删除。

## remaining_gap

尚需 SERVER 在 Linux 临时目录复核 archive SHA、tar 链接边界，解包后以 `/usr/local/bin/node` 运行同一 5 个真实编译入口门。该门通过后才允许安装一个 immutable candidate，并在候选健康后取得固定官方 WAV，继续唯一 synthetic 业务闭环。

## next_owner

`SERVER`：消费同一冻结 archive；禁止重跑 pnpm deploy、`fs.cp(dereference)`、9 万文件实体化或应用根传递依赖 resolve 门。

## files

- `docs/deployment/TENCENT-ASR-RUNTIME-AUDIT-03J-RESULT.md`
- `docs/status/CURRENT.md`
- 临时 handoff archive（服务器消费后必须精确删除）

## residual

- 仓库业务代码、package、lock、workspace 配置、服务器、控制面、COS、Tencent、WAV 与 Secret 均未修改或访问。
- 仅保留上列唯一冻结 handoff archive；不存在 deploy 树、未压缩 tar、审计脚本或其他 03J 临时目录。

## requires_user

`false`：用户既有授权已覆盖同一 ASR candidate/synthetic 重放及失败自动回滚；无需再次确认。
