# EMPLOYEE-ASR-PROD-FRONT-SERVER-07-R1

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## evidence

- 本轮 fresh build：`pnpm --filter @qimao-terms-cloud/frontend run build`，exit `0`；Vite `198 modules transformed`；`frontend/dist/index.html` 存在，构建产物 assets 数量 `3`；禁止文案扫描零命中。
- 本轮唯一 archive：`798543` bytes，SHA-256 `dcb62696cc04e461439088cd691290c41d6d59106d58966566cc080e6d849790`。本地归档已精确删除并复核 absent。
- 发布前只读基线：static link/realpath 为 `/srv/qimao-terms-cloud/frontend-20260826-upload-cos-perf03-r1`；候选、stage、next link、transfer 均 absent；员工根与 `/projects/7df29118-056f-4709-a340-74f8c080268f/asr` 均 `200 text/html`；health `200 application/json; charset=utf-8`。
- 实际 canonical unit 为 `qimao-backend.service` 与 `qimao-worker@asr.worker.entry.js.service`。发布前/收尾只读均为 `active/running`，PID 分别 `675164`/`675224`，`NRestarts=0`，`ExecMainStatus=0`。
- 唯一 SCP 已执行且 exit `0`；唯一 root runner 已启动一次。runner 在解包、assets 新入口门和 static 原子切换之前停止：`terminal|failed|23|backend_baseline_unhealthy`。
- 唯一首因是 runner 的 `unit_facts` 把各次 `systemctl show --value` 的换行保留在字符串中，随后以单行模式匹配 canonical backend 基线，实际事实虽为 `active/running/PID/0/0`，却触发了 runner 自身的 `backend_baseline_unhealthy`。这是发布编排判断式错误，不是候选内容、assets 或服务健康差量。
- 由于在解包前停止，本轮未到达用户指定的新 static assets 门；本地独立 build 已证明 assets=`3`。未创建新 static、未切换 static、未重启任何 unit。
- 收尾只读事实：static link/realpath 仍为旧目标；新目标、stage、next link、transfer 均 absent；生产 route pointer 仍为 `development|asr|df527ca0-8fa9-4edd-abde-48cb355c6775`、`development|screen_text|7bd41c8c-18b0-46f3-83ec-17fdb0729b6f`、`development|terms|8e76ffde-83f6-4cad-b8ff-0f2bf620f38d`；budget pointer 仍为 `development|78767e10-c54c-456e-9ec0-d2785df294a9`。

## external_counts

```yaml
frontend_build: 1
scp: 1
root_static_runner: 1
static_switch: 0
static_rollback: 0
backend_restart: 0
asr_worker_restart: 0
route_writes: 0
budget_writes: 0
database_writes: 0
provider_calls: 0
cos_calls: 0
business_api_writes: 0
```

## rollback

runner 在切换前失败，未改变 static、unit、backend、route、budget 或数据库；其退出清理已移除远端 transfer/archive、stage、candidate、next link。本地唯一 archive 也已精确删除。收尾复核旧 static、health、公开页面、unit 与控制面指针保持基线。

## remaining_gap

员工去模拟化 static 尚未发布；本轮未执行到修正后的 `assets_count`/`test -n "$(find "$new/assets" -type f -print -quit)"` 新目标门。因本任务要求失败后停止且禁止第三次尝试，不再现场修补或重跑。

## next_owner

`PLANNER`：接收唯一 runner 编排首因，决定后续是否另行派发；不得把本轮误报为 static 发布成功。

## residual

`0`：远端 transfer/stage/新 static/next link 与本地 archive 均 absent；旧 static 保留并继续服务；生产 backend、ASR Worker、current、route、budget、DB、env、Secret、Provider、COS 和业务数据未变。

