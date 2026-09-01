# EMPLOYEE-ASR-PROD-SERVER-06

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## evidence

- 本片先完成只读前门：`object-storage.env` 为 `root:qimao 0640`，provider 为 `tencent-cos`，`QIMAO_S3_ACCESS_KEY_ID` 与 `QIMAO_S3_SECRET_ACCESS_KEY` 均非空；未输出任何值。`tencent-asr.env`、backend ASR drop-in、ASR worker drop-in 均不存在。
- 唯一配置脚本按授权原子写入 root-only `tencent-asr.env`（`root:qimao 0640`）及两个 root-owned `0644` drop-in，并成功执行一次 `daemon-reload`。ASR drop-in 内容固定为 backend/object-storage/tencent-asr 三份 EnvironmentFile 与 `/usr/local/bin/node --preserve-symlinks-main` 既有 ASR entry；backend drop-in 仅追加 Tencent env。
- `systemctl restart qimao-backend.service` 返回成功，但脚本紧随其后的首次 loopback health 检查为 curl exit `7`（连接 `127.0.0.1:3001` 被拒绝），因此在 `registry_probe` 之前按停止条件结束。没有执行 registry probe，也没有 enable/start ASR Worker。
- 同一脚本立即执行既定回滚：停止/禁用本轮 ASR（实际未启动）、移除本轮 env/drop-in、再次 `daemon-reload`、恢复 backend。回滚复核显示：
  - backend：`ActiveState=active`、`SubState=running`、`MainPID=674603`、`NRestarts=0`、`ExecMainStatus=0`；EnvironmentFiles 和 DropInPaths 恢复到本轮前值；
  - ASR：`LoadState=loaded`、`ActiveState=inactive`、`SubState=dead`、`MainPID=0`、`NRestarts=0`、`ExecMainStatus=0`、`UnitFileState=disabled`，仅加载原 `/etc/qimao-terms-cloud/backend.env`；
  - `tencent-asr.env`、两个本轮 drop-in 及 ASR drop-in 目录均 absent；
  - 回滚后只读 health 为 `200 application/json; charset=utf-8`；current 为 `/opt/qimao-terms-cloud/releases/term-budget-capability-20260830-r1`；规范 static 为 `/srv/qimao-terms-cloud/system-frontend-term-budget-capability-20260830-r1`；ASR route pointer=0、development budget pointer=0。
- 失败分类为 `BACKEND_HEALTH_PROBE_RACE`：`systemctl restart` 的成功返回不等于进程已经开始监听，当前 runner 没有 readiness wait，直接 curl 形成瞬时连接拒绝。回滚后 health=200 证明最终基线已恢复；本片不把该瞬时探测失败归因于 Tencent registry 或业务代码。

## external_counts

```yaml
deepseek: 0
tencent: 0
cos: 0
business_api_writes: 0
system_control_writes: 0
registry_probe: 0
asr_worker_enable_start: 0
backend_restart: 2
daemon_reload: 2
```

`backend_restart=2` 与 `daemon_reload=2` 分别是一次配置尝试和一次既定回滚恢复；不存在第二次业务尝试。

## rollback

已完成既定精确回滚。配置尝试期间创建的 env/drop-in 与临时目录均已删除，生产 backend/current/static/DB/control-plane/OCR 未改变。ASR Worker 未 enable、未 start。

## remaining_gap

本片未达到 runtime 接线验收：因 health 探针过早失败，零网络 registry 识别和 ASR Worker active/running 门均未执行。不得在本片追加等待、补丁或第二次 restart；后续切片只能在规划审核后修正同一 readiness 编排门，并从配置前门重新开始。

## next_owner

`PLANNER`：审核 `BACKEND_HEALTH_PROBE_RACE` 这一唯一编排首因后，派发下一片；下一片需保留 restart 后有界 readiness 事实，再进入 registry probe 和 ASR Worker 启动，不得修改业务源码或新增 fallback。

## residual

`0`：远端 env/drop-in、临时备份目录、ASR enable 状态、route/budget 写入均无残留；Provider/COS/业务 API 调用均为 0。仓库只新增本结果文档，其他脏工作树保持不变。

