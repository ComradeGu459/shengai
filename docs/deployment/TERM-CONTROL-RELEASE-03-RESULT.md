# TERM-CONTROL-RELEASE-03 结果

## outcome

`blocked`；`artifact_written=true`。本轮只执行一次固定发布链；唯一远端 runner 在进入 Runbook Step 0 前的 provider stdin 格式门停止，未重试、未补 runner、未建立第二 staging 或备用路线。

## evidence

- 冻结候选三件套未重建、未覆盖：
  - archive bytes=`9417436`，SHA-256=`c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`
  - manifest bytes=`115768`，SHA-256=`48cc60997ee4d52ae700e2eab879ab31a6c07f421796a2565f8721d95feef961`
  - SHA 审计附件 bytes=`251`，SHA-256=`e5d778dcf37f4ec73256c1b17267c69176685029bd69c34a6ca9a20575124843`
- 本地 Secret schema 门通过；DeepSeek key 只在本机内存派生，未回显、未落盘、未进入命令参数、日志或报告。
- 本轮仅生成一个临时 LF `release-runner.sh`；新脚本 CR byte=`0`，本地既有 `worker-entry-import-probe.mjs` `node --check` 通过，声明 requiredEntries=`5`。
- 固定 SSH config/alias 的 staging absent 只读门 exit=`0`；固定 staging 创建成功；唯一一次 SCP exit=`0`，传输了冻结三件套、既有 probe/declaration 和 runner。
- 唯一一次远端 runner SSH exit=`22`，stdout 为：`phase_fail=provider_input exit=22`、`code=PROVIDER_INPUT_INVALID`。
- 唯一首因：本机向 SSH stdin 使用了 `WriteLine`，传入 CRLF；远端 Bash `read` 去掉 LF 但保留 CR，导致固定 provider 行不匹配。该命令发生在 runner 读入内存 provider 行后、Step 0 运行基线与任何服务器写入之前。
- 失败路径未执行 provider.env 安装、数据库迁移、release/static 切换、drop-in、daemon-reload、unit 启停、health/API/static 检查或任何 Provider 调用。

## migration / current / static / provider / units

- migration=`0`；现有迁移入口未调用。
- provider.env 写入=`0`；未读取既有 provider 内容，未安装或修改生产 provider.env。
- backend release/current、管理员 static、四份 drop-in、daemon-reload、四 unit 启停=`0`；本轮没有到达 Step 0 运行基线读取或生产发布阶段。
- DeepSeek/COS/Tencent/其他业务外部调用=`0`；未创建 engine、route、run 或任何生产业务事实。
- 生产 current、生产 DB、控制面、公网路由未被本轮命令写入；因硬门在生产基线读取前停止，未声称本轮新鲜重读这些只读状态。

## cleanup / residual

- 远端固定 `/tmp/qimao-term-control-release-final` 已由失败路径删除，并用同一 SSH config/alias 只读复核 `absent=true`。
- 本机临时 `C:\Users\ComradeGu\Documents\七猫兼职\term-control-release-03-work` 已精确删除并复核 `absent=true`；冻结候选三件套保留。
- 本轮未产生 release、static、provider、drop-in、迁移或服务残留；`cleanup_errors=0`；`residual=0`。

## remaining_gap / next_owner / requires_user

- `remaining_gap`：下一次发布编排需在不改变 Runbook 单 runner/单 SCP 预算的前提下，使用无 CR 的 stdin 写入方式（或等价文件化输入边界），并重新签发独立切片；本轮不修复、不重放。
- `next_owner=规划`
- `requires_user=false`

## artifact

- `artifact_written=true`：本文件。
