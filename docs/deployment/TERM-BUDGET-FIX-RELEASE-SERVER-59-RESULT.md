# TERM-BUDGET-FIX-RELEASE-SERVER-59

## artifact_written

- `artifact_written`
- 本续片覆盖本结果文档；候选未重建，未生成 manifest/helper。
- `requires_user=false`

## outcome

- `blocked`
- 结论：`release_preflight_failed`。
- 唯一 transient 已启动一次并在 Step0 以 exit=`1` 结束；未重放、未现场修补。

## evidence

- 已只读读取 CURRENT `v4-1497` 与 SERVER-59 既有结果；本续片按唯一 direct-SCP 修正重建相同物理 checker/runner。
- SSH 前最小本地门全部通过：
  - SERVER-49 三件套完整 bytes/SHA：archive=`9,471,790`/`169b62a48f14dec962fcc9041c518e5b2fb36b0aefef15cefb4ad141b025804e`；manifest=`3,509,202`/`b7fc5b8d94704ced0c97cb1ff8c120878c183f0c9a252fae9b0c5dbfd8df967d`；audit=`1,562`/`7d20bfa30303af3e5695d080577aae8c997363840c6f0f3acec971f95b8221ea`。
  - Node `v24.19.0 --check` checker=`0`；Git Bash `--noprofile --norc -n` runner=`0`。
  - checker 对 checker 与 runner 的 CR byte 检查均为 `0`。
  - 真实 archive budget `.js.map` 安全提取并由 checker JSON.parse，exit=`0`。
  - 固定字符串精确搜索 `node -e` 无匹配。
- 当前 PowerShell 7 作用域中按指定参数数组执行唯一 SCP：`scp.exe` exit=`0`；传输三件套、checker、runner 成功进入固定 transfer。
- 唯一 transient：`qimao-term-budget-fix-release-59.service` 启动=`1`，运行约 `112ms`，结果 `exit-code`、主进程 status=`1`；未进入 migration、immutable release/static、current/static 切换、unit restart、health/API/static/route 发布门或 Provider。
- 同一 transient 的只读对账确定首因：`/opt/qimao-terms-cloud/current` 为 root:root、mode=`777` 的符号链接，link=`/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1`，但该 target 目录不存在；因此 Step0 current baseline 解析门失败。该 dangling symlink 是本片前已存在的基线，本片未修改。
- 清理/只读对账：fixed transfer=`absent`、staging=`absent`、candidate release=`absent`、candidate static=`absent`、transient=`not-found`；health 只读=`200`。systemd journal 未保留额外 runner 文本错误。
- 发布与外部写入计数：migration=`0`、current/static 切换=`0`、四 unit restart=`0`、DeepSeek=`0`、Tencent=`0`、COS=`0`、业务 API=`0`、Secret/CAM/provider.env=`0`。

## remaining_gap

- 候选未发布；current 基线是 dangling symlink，目标 release 缺失，故远端 Step0–9 未通过，route/四 unit/API/static 发布门未执行。
- 按停止规则不在本片恢复 current 目标、不重跑 transient、不增加诊断或修补 runner。

## next_owner

- `PLANNER`：审阅既有 current dangling symlink 的基线异常，另行决定可回滚目标恢复与后续发布窗口；本片不改生产路径。

## residual

- 本地 `C:\Users\ComradeGu\Documents\七猫兼职\term-budget-release-runner-20260830-r1` 已精确删除并核对不存在。
- 远端 transfer、staging、candidate release/static、status 与 transient 均不存在；既有 current dangling symlink 保留，未由本片修复。
- 候选三件套、46 冻结准备包及既有脏工作树均保留且未修改。
- SCP=`1`、transient=`1`；未发生 Provider、数据库业务数据或外部 API 写入。

## requires_user

- `false`
