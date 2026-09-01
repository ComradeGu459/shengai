# TENCENT-ASR-SERVER-03N-UNIT-PROBE

## outcome

`passed`

仅完成 systemd parser/drop-in 装载探针，未启动、重启或启用 ASR unit，未接触 candidate、env、Secret、WAV、DB、control-plane、COS 或 Tencent。

## evidence

- 基线 current 为 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`。
- `systemd-escape --template=qimao-worker@.service -- asr.worker.entry.js` 得到唯一实例名：`qimao-worker@asr.worker.entry.js.service`。
- 基线 unit 为 `loaded`、`inactive`、`disabled`；模板为 `/etc/systemd/system/qimao-worker@.service`，基线 `DropInPaths=` 为空。
- systemd unit search path 含 `/etc/systemd/system`；本实例 drop-in 精确目录为 `/etc/systemd/system/qimao-worker@asr.worker.entry.js.service.d/`。
- 临时文件为 root:root、0644 的 `override.conf`，内容仅为 `[Service]`、空 `ExecStart=` 与 `/usr/local/bin/node /opt/qimao-terms-cloud/current/backend/dist/workers/asr.worker.entry.js`。
- daemon-reload 后 `DropInPaths` 精确包含该 `override.conf`，effective ExecStart 精确为 `/usr/local/bin/node`；unit 仍为 inactive/disabled，证明未启动。
- 清理该文件并再次 daemon-reload 后，`DropInPaths=` 恢复为空，effective ExecStart 恢复为 `/usr/bin/node /opt/qimao-terms-cloud/current/backend/dist/workers/asr.worker.entry.js`。
- 清理后 current 仍为 06K；ASR inactive/disabled；backend、screen-text、upload-completion、OpenVINO 均 active，backend health 为 `status=ok`、`database=connected`。

## direct_cause

`systemd_manager_stale_before_03M_start`：03M 实际写入的实例路径为同一精确目录下的 `03m.conf`，内容包含 `[Service]`、`EnvironmentFile`、空 `ExecStart=` 与 `/usr/local/bin/node` ExecStart；但 03M 启动时 systemd 明确报告“unit/source/drop-ins changed on disk; run daemon-reload”，同时 effective ExecStart 仍为 `/usr/bin/node` 且退出 `203/EXEC`。本轮用 canonical `override.conf` 证明该目录与 ExecStart 内容可被 parser 正确采用，因此现有证据指向 start 前 systemd manager 未实际采用 03M 文件，而不是路径或指令内容被 parser 拒绝。

## minimal_fix

未来获授权的部署应在启动前：写入实例 drop-in 后执行一次 `systemctl daemon-reload`，再只读断言 `DropInPaths` 含目标文件且 effective ExecStart 为 `/usr/local/bin/node`；任一断言不成立即不得启动。无需修改模板或其他 Worker。

## remaining_gap

现有 03M 记录能证明 reload 未在 start 前生效，但不足以证明为何该次 daemon-reload 未生效；更深层原因保持 `evidence_unavailable`，本轮不猜测、不重放。

## next_owner

规划负责决定是否基于本探针结果发放新的、单次的 ASR 部署 lease；SERVER 不自动重试 03M。

## files

- `docs/deployment/TENCENT-ASR-SERVER-03N-UNIT-PROBE.md`

## residual

- 临时 `override.conf` 已删除，drop-in 目录无本轮文件。
- 未改变模板、其他 Worker、candidate、env、Secret、DB、control-plane、COS、Tencent 或 WAV。
- current 与既有服务健康状态保持 06K 基线。

## requires_user

无需用户补充凭据；如需继续部署，需由规划明确新的单次授权与 parser 断言门。

