# TENCENT-ASR-SERVER-03Q-AUDIT

## outcome

`blocked`

只读审计已完成；未 start/restart、未 daemon-reload、未重建 candidate、未读取 Secret 值/WAV，未执行 provider、DB、COS 或 control-plane 写入。03P 的退出时间窗证据不完整，因此不猜测根因。

## evidence

- journal 查询成功，保留记录数 `210`。
- 安全 lifecycle 分类显示最近一次相关启动事件为 `2026-08-28T08:32:06.913661Z`；该启动之后没有保留对应的 `Main process exited` 或 `Failed with result` 事件。
- 最近一次可见的进程退出事件早于该启动：`2026-08-28T08:08:21.074575Z`，`code=exited`、`status=203/EXEC`、`status_name=EXEC`；它属于更早历史，不能归因 03P。
- journal 中唯一提取到的安全错误码为历史 `EXEC`；03P 最近启动窗口没有可归属的安全错误码。环境键名提取结果为 `none`，未输出任何环境值。
- 03P 结束后读取的 systemd 保存属性为：`Type=simple`、`Restart=on-failure`、`Result=success`、`ExecMainCode=0`、`ExecMainStatus=0`。
- 03P 结束后 `ActiveEnterTimestamp=` 与 `InactiveEnterTimestamp=` 均为空，`DropInPaths=` 为空；因此上述 systemd 快照没有可用时间戳把 `success/0` 唯一绑定到 03P 启动窗口。
- 03P 回合已有观测为 `systemctl start` 返回 `0`、两次稳定检查均 `inactive`、`NRestarts=0`；backend、screen-text、upload-completion、OpenVINO 与 health 当时正常。未据此推断 direct-run、env 或配置原因。

## direct_cause

`evidence_unavailable_for_03P_process_exit`：03P 的 journal 没有第一条进程退出记录；清理后的 `Result=success`/`ExecMainCode=0` 仅说明当前保存快照与 clean exit 相容，时间戳缺失，不能作为 03P 时间窗的充分证明。现有证据不能裁决 Worker disabled、env 未生效、direct-run 判断或配置失败中的任一项。

## minimal_fix

唯一最小复验路径是下一次获授权的 ASR-only 运行：启动后、任何 stop/清理前立即读取并保存该 unit 的 `Result/ExecMainCode/ExecMainStatus/ActiveEnterTimestamp/InactiveEnterTimestamp`，同时按时间窗读取 journal 的第一条 lifecycle、`Main process exited` 与 `Failed with result`；只要 active 或退出证据不满足预期即停止，不进入 WAV/COS/Tencent/API/DB。

## remaining_gap

03P 的第一条进程退出原因与时间绑定未被 journald/systemd 持久保存；因此 clean exit 尚未被 03P 时间窗证明，failed 也未被证明。

## next_owner

规划负责决定是否授权上述一次 ASR-only 复验；SERVER 不重放 03P，不进入 provider 或业务链。

## files

- `docs/deployment/TENCENT-ASR-SERVER-03Q-AUDIT.md`

## residual

- 本轮仅执行只读 journal/systemd 审计。
- 继承 03P blocked-clean：current=06K，ASR inactive/disabled；无 candidate、env、override、WAV、COS、Tencent Task 或 synthetic 残留。

## requires_user

无需补充凭据；如需继续，需规划明确一次“启动前后立即保存 systemd/journal 退出证据”的 ASR-only 复验 lease。

