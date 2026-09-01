# TENCENT-ASR-SERVER-03Q-R1-AUDIT

## outcome

`blocked`

仅只读检查 03P ASR Worker 两个日志文件；未 start/restart/reload，未改写或轮转日志，未重建 candidate，未读取 Secret 值/WAV，未执行 provider、DB、COS 或 control-plane 动作。

## evidence

- 已知 03P 启动时间为 `2026-08-28T08:32:06Z`。
- `worker-asr.worker.entry.js.log`：size=`0` bytes，mtime=`2026-08-28T07:47:43.241136Z`，tail 行数=`0`。
- `worker-asr.worker.entry.js.error.log`：size=`0` bytes，mtime=`2026-08-28T07:47:43.241136Z`，tail 行数=`0`。
- 两文件 mtime 均早于已知 03P 启动时间，且没有启动后的时间戳记录；只能谨慎裁决为“03P 启动后未产生可读文件日志”，不能把旧文件归属于 03P。
- 两文件均无稳定错误类、error code、退出语义或首个项目模块/行号；结果均为 `evidence_unavailable`。
- 因文件为空，未输出任何 Secret、连接串、对象键或供应商原始载荷。

## direct_cause

`evidence_unavailable`：日志链未为 03P 产生可读记录，无法证明 Worker 因配置、DB、direct-run、disabled 或其他具体分支退出。不能将 03P 的 inactive 归因于任一分支。

## minimal_fix

唯一最小复验观测点：下一次获授权的 ASR-only 启动后、任何 stop/清理前，立即同一时刻保存 systemd 的 `Result/ExecMainCode/ExecMainStatus/ActiveEnterTimestamp/InactiveEnterTimestamp`、unit 状态和两份日志的 size/mtime/tail；若日志仍为空，以 systemd 的第一条退出属性作为唯一继续分诊依据。未满足 active 且稳定的停止条件时，不进入 WAV/COS/Tencent/API/DB。

## remaining_gap

缺少 03P 进程退出的持久化日志与时间绑定；无法区分 clean exit、failed exit 或启动前置配置分支。

## next_owner

规划负责决定是否授权上述一次 ASR-only 观测；SERVER 不重放 03P，不进入 provider 或业务链。

## files

- `docs/deployment/TENCENT-ASR-SERVER-03Q-R1-AUDIT.md`

## residual

- 本轮无服务器写入；继承 03P blocked-clean 状态。
- 两份日志均保持原状且为空；未留下任何 candidate、env、override、WAV、COS、Tencent Task 或 synthetic 残留。

## requires_user

无需补充凭据；如需继续，需规划明确一次启动后立即保存 systemd 属性与日志元数据的 ASR-only 复验 lease。

