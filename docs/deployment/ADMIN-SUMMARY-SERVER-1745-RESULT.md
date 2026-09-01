artifact_written: true

# ADMIN-SUMMARY-SERVER-1745

## outcome

```yaml
outcome: passed
slice_outcome: passed
release_id: admin-summary-20260901-r1
schema: qimao.application-release/v2
employee_static_mode: preserve
migration: none
fixed_entry_executions: 1
fixed_installations: 0
backend_restarts: 1
asr_restarts: 0
openvino_restarts: 0
screen_starts: 0
database_writes: 0
route_writes: 0
budget_writes: 0
engine_writes: 0
provider_calls: 0
cos_writes: 0
real_tasks: 0
rollback: not_required_release_passed
next_owner: 规划
requires_user: false
```

用户在本动作任务内直接确认后，已消费 1744 冻结三件套，完成一次上传、一次既有 fixed 入口调用和 backend+管理员静态发布。入口输出确认 `migration:none`、employee preserve、backend 单次重启及三 Worker 不重启；没有数据库、路由、预算、引擎、Provider、COS 或真实任务写入。

## files

本轮仅上传以下三项，内容未重建、未改写：

| role | local path | bytes | SHA-256 | remote result |
| --- | --- | ---: | --- | --- |
| declaration | `deploy/admin-summary-release-1744/application-release.declaration.json` | 1,028 | `c9313b556496d128070ad539deb66eccf11f3e7e914332398cf572a312ca26b5` | inbound consumed and removed |
| archive | `work/admin-summary-20260901-r1.tar.gz` | 8,963,703 | `76e2774720d288ef5115604d883790126aee649a9470f98ec73d1c8200c903bb` | inbound consumed and removed |
| SHA256SUMS | `deploy/admin-summary-release-1744/SHA256SUMS` | 202 | `c5a5534fb082aac3e596357f39da86fa24b23c76fe5365d481437e7f199f9de1` | inbound consumed and removed |

复用的 fixed 身份未改变：runner `39799B/b44236b0ea880822a7b6af2425f9f4f1f06a75d4961db15a9e02793142f2c5bf`，validator `22440B/449f3bbc4d66946d92bc174ddfd7cf98b54dc86e2d42f570514e7dedbc7f8fe0`。

## fixed execution evidence

```text
payload_gate=passed release:admin-summary-20260901-r1 migration:none fixed_entry:passed declaration:passed sha:closed
baseline=passed backend:active/running/0/0 asr:active/running/0/0 screen:inactive/dead/0/0 openvino:active/running/0/0 health:200 employee:200/200 employee_static:preserve system_static:true
archive_audit=passed members:14926 regular:11522 directories:2190 symlinks:476 hardlinks:738
candidate_gate=passed backend_entries:5 employee_static:preserve static_markers:0 system_static:true system_static_markers:4 imports:6
post_switch=passed health:200 unauth_admin_summary_overview:403/json/nonhtml employee:200/200 employee_static:preserve system_static:true backend:active/running/0/0/stable_pid_5s asr:active/running/0/0 screen:inactive/dead/0/0 openvino:active/running/0/0
terminal=passed release:/opt/qimao-terms-cloud/releases/admin-summary-20260901-r1 static:/srv/qimao-terms-cloud/frontend-asr-budget-default-off-20260901-r1 employee_static:preserve system_static:/srv/qimao-terms-cloud/system-frontend-admin-summary-20260901-r1 backend_restart:1 db_write:0 migration:none schema_retained:none cos_write:0 route_write:0 budget_write:0 provider_calls:0 asr_restart:0 openvino_restart:0 screen_start:0
```

入口只调用一次；未执行第二次传输、第二次发布或任何回滚。

## final pointers, services and HTTP

最终只读验收：

```text
backend_pointer=/opt/qimao-terms-cloud/releases/admin-summary-20260901-r1
employee_pointer=/srv/qimao-terms-cloud/frontend-asr-budget-default-off-20260901-r1
system_pointer=/srv/qimao-terms-cloud/system-frontend-admin-summary-20260901-r1
backend=active/running/success/0/909972
asr=active/running/success/0/694703
screen=inactive/dead/success/0/0
openvino=active/running/success/0/842128
http health/employee-root/employee-asr/system-root/system-overview=200/200/200/200/200
unauth_overview=403/application/json; charset=utf-8
system_static_markers=4/4
```

employee 指针逐字保持 1737 值；ASR PID `694703`、OpenVINO PID `842128` 未变，screen Worker 保持 inactive。发布后 inbound、runtime、三个 `.next` 和本 release 之前的临时目录均已由 fixed 入口清理；终态 residual=`0`。

## overview projection readback

在发布后的 current backend 上，以既有 qimao 身份通过一次只读 overview projection 回读，未读取 Secret、素材或原始 payload：

```json
{
  "environment": "development",
  "window": "24h",
  "overallStatus": "failed",
  "freshness": "fresh",
  "processedProjectCount": 1,
  "processedEpisodeCount": 51,
  "runningCount": 0,
  "queuedCount": 3,
  "failedCount": 24,
  "reconciliationRequiredCount": 1,
  "resourcePools": {
    "asr_api": "healthy queue=0 running=0 failed=22",
    "ocr_api": "empty queue=0 running=0 failed=0",
    "ocr_self_hosted_worker": "failed queue=3 running=0 failed=2 reconciliation=1",
    "delivery_generation": "empty queue=0 running=0 failed=0"
  },
  "topReasons": [
    "SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE",
    "SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE",
    "SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE"
  ],
  "pendingConfiguration": "not_configured",
  "recentAudit": "not_configured"
}
```

这证明管理员首页四问投影消费后端权威状态：当前是否正常=`当前处理受阻`，处理多少=`24h 1 个项目 / 51 集（当前运行 0，等待 3）`，失败原因=`当前任务处理失败`（最多 3 条），下一步=`处理当前问题`。历史统计仍保留在 24h 计数中，未由前端自行推导状态。

## local and remote gates

1744 冻结的本地证据在动作前再次核对：三项 bytes/SHA 匹配；固定 validator 36 cases、runner 19 cases、archive 14926 members（regular 11522 / directories 2190 / symlinks 476 / hardlinks 738）、backend 五入口/六 import、管理员四 marker 均通过。远端显式字段名基线通过：fixed 身份、三指针、unit 状态/PID、HTTP、锁和全局残留均符合；上传后 inbound 三项权限为 `qimao-deploy:qimao-deploy 0600` 且 SHA 完全匹配。

## remaining_gap and residual

本发布切片无剩余服务器缺口，`remaining_gap=none`、`residual=0`、`requires_user=false`。当前 overview 如实显示已有当前失败/待处理事项；本轮只发布状态源与摘要投影，没有处理队列、启动 Worker 或修复业务失败。

本地保留唯一冻结三件套与两项 fixed 源码；远端保留新的 immutable backend/system-static release、旧 target 回滚事实和已安装 fixed。未 reset、checkout、clean、stash、commit 或 push。
