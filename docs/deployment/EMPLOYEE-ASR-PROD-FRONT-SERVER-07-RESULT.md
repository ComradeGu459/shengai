# EMPLOYEE-ASR-PROD-FRONT-SERVER-07

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## evidence

- 本地重新执行员工 frontend production build：Vite `198 modules transformed`，exit `0`；`frontend/dist/index.html` 存在，构建生成 3 个 asset 文件。静态产物拒绝扫描对“模拟识别”“零外部网络”“新建模拟识别批次”无命中。
- 本片唯一临时 archive：`798543` bytes，SHA-256 `9c715bfa35630e3127d0e6566b17a56545649bcb3a458155fd8f5b6024758cc4`。已完成唯一 SCP，远端收到后由 root 校验 bytes/SHA 一致。
- 发布前只读基线：员工 static link/realpath 为 `/srv/qimao-terms-cloud/frontend-20260826-upload-cos-perf03-r1`；员工根和 `/projects/7df29118-056f-4709-a340-74f8c080268f/asr` 均为 `200 text/html`；backend、ASR Worker 均 `active/running`、`NRestarts=0`、`ExecMainStatus=0`、ASR `enabled`。route v3 为 `df527ca0-8fa9-4edd-abde-48cb355c6775`，budget v3 为 `78767e10-c54c-456e-9ec0-d2785df294a9`。
- root runner 已完成 archive 解包、入口和资产门、symlink 门、禁止文案门及权限门：stage 根为 `root:root 0755`，`index.html` 为 `root:root 0644`，assets=3。随后在新目标已 rename 后停止于 `new_static_entry_failed`。
- 唯一首因是 runner entry 判断式把 assets 非空写成失败条件：`[ -n "$(find "$new/assets" -type f -print -quit)" ]` 被置于失败分支，因此合法的 3 个 assets 触发了错误停止。候选 archive、构建产物和入口本身无差量证据；本片未修 runner，也未重跑。
- 同一 runner 已原子恢复旧 static；最终只读复核：
  - `/srv/qimao-terms-cloud/frontend` link/realpath 仍为 `/srv/qimao-terms-cloud/frontend-20260826-upload-cos-perf03-r1`；
  - 新 static、stage、next link、transfer 全 absent；旧 `index.html` 仍为 `root:root 0444`；
  - backend/ASR Worker 仍 `active/running`、`NRestarts=0`、`ExecMainStatus=0`，health=`200 application/json; charset=utf-8`；
  - route/budget 指针与发布前一致，未修改 backend release、env/unit、DB、Secret、Provider、COS 或业务数据。

## external_counts

```yaml
frontend_build: 1
scp: 1
root_static_runner: 1
static_switch_attempt: 1
static_rollback: 1
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

已完成既定 static 回滚；旧目标保留并继续服务。远端 transfer/stage/候选目标与 next link 均清理，本地唯一 archive 也已精确删除。没有执行 backend、ASR Worker 或其他服务重启。

## remaining_gap

去模拟化员工 static 尚未发布。唯一需要修正的是 runner 的 assets 非空判断，应由规划审核后把“assets 存在即通过”的条件修正；不涉及候选内容、构建入口或 backend/route/budget。

## next_owner

`PLANNER`：审核 `new_static_entry_failed` 的 runner 布尔判断首因后，再派发单一修正版发布切片；不得在本片追加第二路线。

## residual

`0`：远端 transfer/stage/新 static/next link、本地 archive 均无残留；生产 backend、ASR Worker、current、route、budget 与业务数据保持不变。

