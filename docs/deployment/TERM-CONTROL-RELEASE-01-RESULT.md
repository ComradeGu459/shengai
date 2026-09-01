# TERM-CONTROL-RELEASE-01 结果

## outcome

`blocked`；`artifact_written=true`。本轮严格按 `TERM-CONTROL-RELEASE-RUNBOOK.md` 只执行一次，远端 runner 在 Step 0 停止；未继续 Step 2–9，也未进行任何重试、补丁或备用路线。

## evidence

- 固定 122A-R1 三件套未重建、未覆盖；本机 archive bytes=`9417436`，SHA-256=`c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`。
- 本机 manifest SHA-256=`48cc60997ee4d52ae700e2eab879ab31a6c07f421796a2565f8721d95feef961`，文件数=`607`；PowerShell AST、两个 Node `--check` 与临时文件 CR byte=0 通过。本机无 Bash 可执行文件，未做本地 `bash -n`；远端 Bash 门未到达。
- 固定 staging `/tmp/qimao-term-control-release-final` 创建、一次 SCP 批次传输均返回 exit=`0`。
- 远端 Step 0 已读取目标 unit 与 upload/OCR/ASR 基线；backend 为 active/running、NRestarts=`0`，目标三个 Worker 为 inactive/dead、NRestarts=`0`，既有 upload 与 screen-text 为 active/running、NRestarts=`0`，既有 ASR 为 inactive/dead、NRestarts=`0`。
- Step 0 唯一首因：`sudo -n -u qimao -- /usr/local/bin/node /tmp/qimao-term-control-release-final/db-baseline.mjs` 返回 exit=`21`；安全 stderr 为 `MODULE_NOT_FOUND`，缺失固定 staging 内的 `db-baseline.mjs`。
- 该失败发生在生产写入前；没有 Step 2 staging 权限、Step 3 archive/tar/manifest/import、Step 4 provider、Step 5 migration 或 Step 6–8 发布/服务/健康门证据。

## migration / current / static / provider / units

- migration：`0`，未执行。
- provider.env：未安装、未修改、未输出值。
- backend release、current、管理员 static、四份 drop-in、daemon-reload：均未产生或执行；current/static 保持 Step 0 基线。
- 四目标 unit：未重启/启动，保持 Step 0 基线；既有 upload/OCR/ASR Worker 未触碰。
- DeepSeek、COS、Tencent、CreateRecTask：`0`；生产 DB、控制面、公网路由未修改。

## cleanup / residual

- 远端 runner 已执行其 EXIT trap rollback，报告 `rollback exit=0`；固定 staging 清理由同一 runner 完成。
- 本地临时传输目录已删除并复核 absent；固定候选三件套保留，未覆盖。
- `cleanup_errors=0`；本轮新增 release/static/provider/drop-in/unit/迁移残留=`0`。

## remaining_gap / next_owner / requires_user

- remaining_gap：Runbook Step 0 的文件化 DB 基线 helper 未进入远端 staging；本机 Bash 门也因执行器缺失未独立运行。本轮按 Step 0–3 失败硬停止，不修补、不重传、不重跑。
- next_owner：`规划`
- requires_user：`false`

## artifact

- artifact_written：本文件
