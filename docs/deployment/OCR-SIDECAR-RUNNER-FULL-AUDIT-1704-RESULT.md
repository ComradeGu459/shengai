# OCR-SIDECAR-RUNNER-FULL-AUDIT-1704 结果

- `artifact_written`: `true`
- `outcome`: `passed`
- `target`: `103.36.63.67`（本轮未连接）
- `next_owner`: `规划 / SERVER`（如需部署，必须重新授权）
- `requires_user`: `false`

## 本轮修正

完整审计发现并一次修正 3 个 runner 缺陷：

1. 成功路径在 `set -u` 下读取未定义的 `old_asr_state`；
2. 成功路径在 `set -u` 下读取未定义的 `old_screen_state`；
3. baseline 虽校验 backend，成功路径却没有保存/比较 backend state。

现在 baseline 在服务校验通过后保存 ASR、screen、backend 的 state，以及 ASR/backend 的 MainPID；候选 restart 后逐项比较，避免旁路服务被意外重启或漂移。改动仅在 `deploy/ocr-sidecar-contract-1694/runner.sh`，archive 内容未改。

## 验收证据

- `D:\Git\bin\bash.exe --noprofile --norc -n deploy/ocr-sidecar-contract-1694/runner.sh`：exit `0`。
- assignment-aware shell AST 审计：`unassigned=`；唯一特殊变量 `EUID` 为 Bash 内建变量；`set -u` 全成功/回滚夹具实际通过。
- 全成功/回滚隔离夹具，exit `0`：

  `fixture=passed success=terminal_passed candidate_restart=1 asr_state_pid=unchanged backend_state_pid=unchanged screen=stopped env_proc_paths=new rollback_flags=runtime_stage_created,runtime_created,env_switched,dropin_installed,sidecar_restart_attempted cleanup=passed`

  成功尾段实际到达 `terminal=passed deployment:sidecar-contract-r1`；回滚验证 `runtime_stage_created=1`、`runtime_created=1`、`env_switched=1`、`dropin_installed=1`、`sidecar_restart_attempted=1`，并确认旧 drop-in/原 env/current 不变、screen 停止、ASR/backend state 与 PID 不变、inbound/run/stage/temp 全清理。`created_dropin_dir=0` 是 baseline 已存在 geometry drop-in 目录的必然状态，恢复分支已纳入静态审计。
- 项目固定 Node `v24.19.0` 候选 import/HTTP contract：exit `0`，实际通过 top-level await、dynamic import、`screen_text_local_ocr_v1`、HTTP `200` 与 `videoDurationMs=1234`。
- SHA staging：`sha256sum --strict -c SHA256SUMS`，archive 与 runner 均 `OK`，exit `0`。
- systemd drop-in 顺序沿用 1702 已通过的实测：`geometry-1628-r3.conf` < `zz-contract-1694-r1.conf`，候选最终覆盖 `WorkingDirectory`、`ExecStart`、`ReadOnlyPaths`；当前 runner 的 `zz-` 路径保持一致。
- 范围门：精确旧 `/contract-1694-r1.conf` 命中 `0`；`systemctl start=0`、`systemctl restart=2`；空比较命中 `0`；runner/SHA 清单 `CR=0`、无 UTF-8 BOM。

## 冻结三件套

| 文件 | bytes | SHA-256 |
| --- | ---: | --- |
| `work/ocr-sidecar-contract-20260901-r1.tar.gz` | 7,254 | `e6abe176e7907f6c52fecfbd3d3209c91b201456257d9671621598cedb43abc0` |
| `deploy/ocr-sidecar-contract-1694/runner.sh` | 21,505 | `a2d3852277fe1ca5e2bf21457cc30096902e7353d371ff23ab4a2af6c729121c` |
| `deploy/ocr-sidecar-contract-1694/SHA256SUMS` | 182 | `0d14f28c2089919319977a2f1abc1d06fd490590cc9ba28e2601da15795f8a38` |

## 服务器动作与残留

本轮未执行 SSH/SCP、上传、root、daemon-reload、systemd restart、API、Provider、Worker、队列、DB、COS、route 或 budget 动作。临时 fixture、trace、staging 均已删除。

`remaining_gap`：修正后的三件套尚未上传或部署；如需执行，须另行授权，并继续使用 runner 的自动回滚与精确清理路径。
