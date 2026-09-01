# TENCENT-ASR-SERVER-03M 结果

## outcome

`blocked`

候选加载门通过，但 ASR Worker 稳定健康门失败；按任务卡立即停止，未进入 WAV、COS、Tencent ASR 或 synthetic 业务阶段。

## evidence

- 指定 candidate archive 本地核验通过：`8827999` bytes，SHA-256 为 `5300edf2a6bf151021bb0e959428e1f1496c269883dcf0ab9d2a0876d3459965`。
- 服务器 archive 核验通过：symlink `476`、hardlink `905`、坏名称 `0`、坏 symlink 目标 `0`、坏 hardlink 目标 `0`。
- Linux 五个真实入口加载通过：`5/5`。
- candidate 曾原子切换为 `20260828-tencent-asr-03m-r1`，06K release 保留作精确回滚点。
- ASR 实例启动稳定窗首检失败：effective ExecStart 仍为 `/usr/bin/node /opt/qimao-terms-cloud/current/backend/dist/workers/asr.worker.entry.js`，退出 `status=203/EXEC`，`NRestarts=1`；未达到任务要求的 `/usr/local/bin/node` 与 `NRestarts=0`。
- 失败时 backend、screen-text、upload-completion、OpenVINO 均 active，backend health 为 `status=ok`、`database=connected`。
- 未下载固定 WAV；未调用 COS、Tencent ASR、业务 API、DB/control-plane 写入；未创建 synthetic。
- 已恢复 current=06K，ASR 为 inactive/disabled，三项服务与 OpenVINO/health 再次核验正常。

## remaining_gap

目标 ASR 实例 drop-in 未在启动时形成要求的 effective ExecStart；本轮按“任一门失败立即恢复、禁止重试”停止，未继续诊断或重放。

## next_owner

规划负责决定是否创建新的、单次且受控的 systemd 实例 drop-in 装载修复任务；SERVER 不在本轮自行重试。

## files

- `docs/deployment/TENCENT-ASR-SERVER-03M-RESULT.md`

## residual

- current 已恢复 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`。
- 03M candidate release、服务器临时 archive/payload、临时 CSV、ASR env、ASR 实例 drop-in 均已删除。
- 本机 `.asr03m\candidate.tar.gz` handoff archive 已按任务要求删除。
- 未留下 WAV、COS 对象、Tencent Task、synthetic DB 记录或新的 control-plane 配置。

## requires_user

不需要用户补充凭据；需要规划确认后续是否单独授权修复 systemd 实例 drop-in 装载门。当前 03M 结论为 blocked-clean。

