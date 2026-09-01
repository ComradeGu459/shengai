# EMPLOYEE-ASR-PROD-FRONT-SERVER-08

## artifact

```yaml
artifact_written: true
outcome: passed
requires_user: false
```

## evidence

- fresh build：`pnpm --filter @qimao-terms-cloud/frontend run build`，正确仓库根下 exit `0`；Vite `198 modules transformed`；`frontend/dist/index.html` 存在，assets 数量 `3`；禁止文案扫描零命中。
- 本轮唯一 archive：`798540` bytes，SHA-256 `0beec7840fc648a95056e86eef76c938fccc68afd6ce9c2c76c653b0141dfbb6`。root 已校验归档并成功解包；本地归档已精确删除并复核 absent。
- root 解包门：stage assets=`3`；`index.html` 存在；正向 `test -n "$(find "$new/assets" -type f -print -quit)"` 通过；stage 禁止文案零命中；stage 无 symlink；stage 根为 `root:root 0755`，`index.html` 为 `root:root 0644`。
- 原子发布：`frontend.next` 经 `mv -Tf` 切换；最终 static link/realpath 均为 `/srv/qimao-terms-cloud/frontend-employee-asr-20260830-r1`；旧回滚目标 `/srv/qimao-terms-cloud/frontend-20260826-upload-cos-perf03-r1` 保留。
- HTTP/静态验收：线上静态禁用文案命中 `0`；health=`200 application/json; charset=utf-8`；`https://milaidi.online/`=`200 text/html`；员工 ASR 深链=`200 text/html`。
- 发布后逐属性只读核对：`qimao-backend.service` 为 `ActiveState=active`、`SubState=running`、`NRestarts=0`、`ExecMainStatus=0`；`qimao-worker@asr.worker.entry.js.service` 同为 `active/running/0/0`。
- 控制面只读指针未变：`asr`=`df527ca0-8fa9-4edd-abde-48cb355c6775`，`screen_text`=`7bd41c8c-18b0-46f3-83ec-17fdb0729b6f`，`terms`=`8e76ffde-83f6-4cad-b8ff-0f2bf620f38d`；budget=`78767e10-c54c-456e-9ec0-d2785df294a9`。

## external_counts

```yaml
frontend_build_success: 1
scp: 1
root_static_runner: 1
static_switch: 1
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

另有一次首次本地 build 命令因工作目录误指向父目录而未开始构建，exit `1`；未生成归档、未连接服务器，随后在正确仓库根以同一 build 命令成功完成。

## rollback

未触发回滚。切换成功后仅清理本轮 transfer/archive；未重启 backend 或 ASR Worker，未修改 route、budget、DB、env、Secret、Provider、COS 或业务数据。

## remaining_gap

本切片无剩余阻塞。route、budget 与 backend/Worker 接线按任务保持不变。

## next_owner

`PLANNER`：继续后续员工 ASR 验收编排。

## residual

`0`：远端 `/var/tmp/employee-asr-prod-front-08-transfer`、stage、next link 均 absent；新 static 与旧回滚目标保留；本地 archive absent。

