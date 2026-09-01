artifact_written: true

# FIXED-ENTRY-EMPLOYEE-PRESERVE-SERVER-1735

## outcome

```yaml
outcome: local_fixed_entry_refrozen
slice_outcome: passed
goal_gap: new fixed runner/validator are frozen locally but are not uploaded or installed; OCR-RUNTIME-CONFIG-SERVER-1734 payload was not built or executed
business_code_changes: 0
server_connections: 0
remote_transfers: 0
fixed_entry_installations: 0
application_release_executions: 0
migrations: 0
service_restarts: 0
database_writes: 0
provider_calls: 0
cos_writes: 0
real_ocr_calls: 0
next_owner: 规划
requires_user: true — external upload/install and any resumed 1734 release require a separate explicit authorization
```

现有固定声明式发布入口已在本地扩展 v2 `employeeStatic: preserve` 合同，1734 的发布拓扑首因已从代码层消除。preserve 模式严格锁定当前员工静态目标，archive 排除 `static/`，runner 在 baseline、stage、switch、rollback、post-switch 和 final cleanup 使用同一个 guard 验证员工 symlink 完全不变，并且不创建 employee stage/`.next`、不设置 employee created/switched flag。backend、system-static、migration、健康门及原有 rollback 路径保持不变。

本任务没有修改业务代码、migration 或 1734 payload，没有连接服务器、上传、安装或调用固定入口。

## frozen identities

| file | bytes | SHA-256 |
| --- | ---: | --- |
| `deploy/debian/bin/qimao-application-release` | 39,799 | `b44236b0ea880822a7b6af2425f9f4f1f06a75d4961db15a9e02793142f2c5bf` |
| `deploy/debian/bin/application-release-declaration.mjs` | 22,440 | `449f3bbc4d66946d92bc174ddfd7cf98b54dc86e2d42f570514e7dedbc7f8fe0` |
| `deploy/README.md` | 3,538 | `ab9938f09e1481160522c197bfec5a9222c9839055a9bfd55bdab34cfcf72e3c` |

上述 runner/validator 是唯一当前 fixed 源码，没有复制临时 runner 或创建第二套入口。README 仅记录合同和操作边界，不属于未来 fixed 安装 payload。

## declaration contract

兼容路径：

- v1 缺省 `replace`，声明、archive roots、员工 stage/switch/rollback 语义不变；
- 既有 v2 未提供 `release.employeeStatic` 时仍缺省 `replace`；
- v2 可显式提供 `employeeStatic={"mode":"replace"}`，要求既有 `previousStaticTarget/staticMarkers/static/`；
- 1721 v1、1725 legacy-v2、1727 v2 的真实 declaration + SHA closed-set 均通过新 validator，emit 均为 `employee_static_mode=replace`，其 probe/migration 归一值不变。

新 preserve 路径必须使用以下严格形状：

```json
{
  "release": {
    "employeeStatic": {
      "mode": "preserve",
      "expectedTarget": "/srv/qimao-terms-cloud/frontend-..."
    }
  }
}
```

preserve 仅允许 v2；release 不得再出现 `previousStaticTarget`，candidate 不得出现 `staticMarkers`，`expectedTarget` 必须是 canonical employee release 目标。validator 将 normalized previous/next employee target 都固定为 expectedTarget，并 emit `employee_static_mode=preserve`。非法 mode、缺 target、重复 previous target、越界 target、preserve 携带 marker、replace 携带 expectedTarget、replace 缺 previous target、v1 偷加 employeeStatic 均精确拒绝。

## runner safety data flow

- archive gate 的 roots 由 `(system_static_enabled, employee_static_mode)` 共同决定：v2 preserve 精确要求 `backend/ + system-static/`，发现任何 `static/` 即失败；replace 的 v1/v2 roots 不变。
- preserve 不创建或复制 employee stage，不验证员工 candidate marker；replace 仍执行原 stage 与 marker 门。
- `employee_static_finalize/switch` 是唯一 employee 新目录和链接写入口；preserve 分支只调用 guard，不执行 `mv/ln`，三个 employee side-effect flag 保持 `0/0/0`。
- rollback 只在 `static_switched=1` 时恢复员工链接；preserve 在 rollback 前后验证 expected target，并且不会 `rm` employee `.next`。`safe_remove` 对 employee stage/new target 额外要求 mode=`replace`，避免把 preserve 的 expected current target纳入可删除路径。
- backend 与 system-static 的创建、切换和失败恢复顺序未改变；migration gated/none、一次 backend restart 及 ASR/screen/OpenVINO 保持门未改变。

## fresh verification

```text
Git Bash 5.2.37 bash -n runner = passed
runner --self-test = runner_self_test=passed cases=19 statuses=401,403 employee=replace,preserve preserve_rollback=guarded
node --check validator = passed
validator --self-test = {"outcome":"passed","cases":36,"schemas":["qimao.application-release/v1","qimao.application-release/v2"]}
1721 v1 declaration/SHA = passed, employee=replace, probe=401, migration=gated
1725 legacy-v2 declaration/SHA = passed, employee=replace, probe=401, migration=gated
1727 v2 declaration/SHA = passed, employee=replace, probe=403, migration=none
1727 real archive audit in replace mode = members:14927 regular:11475 directories:2192 symlinks:476 hardlinks:784
preserve declaration fixture = expected employee locked, previous=next, static markers=0, gated 6037000, checksum files=3
preserve archive fixture = backend+system-static passed; adding static rejected with MEMBER_TOP_LEVEL_INVALID
replace archive fixtures = v1 backend+static and v2 backend+static+system-static passed; missing static rejected
preserve symlink fixture = employee target unchanged; stage/next absent; created/stage-created/switched flags=0/0/0
preserve rollback fixture = corrupted employee target rejected by the same guard
encoding = UTF-8 no BOM, LF, CR bytes=0
diff-check = passed
```

Windows Git Bash 默认会模拟而不创建真实 symlink；本地 symlink fixture 使用 `MSYS=winsymlinks:sys` 运行。目标 Debian 使用原生 symlink，无需该兼容参数。首次 guard 实现由多条独立断言组成，在 Bash `if` 上下文可能被最后一条成功掩盖；已按根因改为单一 `&&` 链，之后完整 runner/validator/fixture 门通过。archive 临时测试曾把提前拒绝码误期望为集合级错误，实际更早返回 `MEMBER_TOP_LEVEL_INVALID`；只修正临时测试期望，未放宽实现。

## remaining_gap

新 fixed runner/validator 尚未安装到 `qimao-test-server`，1734 的 backend + system-static + 6037000 候选也尚未构建冻结。规划下一步应先审核本地 fixed 身份和 preserve 合同；如接受，再创建独立 SERVER 安装任务并取得用户对两个新 fixed 哈希的直接授权。安装和远端 Bash/Node/self-test 完成后，才可恢复 1734 的候选构建与单次固定入口发布。

## residual

仅修改唯一 fixed runner、validator、`deploy/README.md` 并新增本文档。所有临时 symlink/declaration/archive fixture 已从系统临时目录精确清理；没有业务产物、第二 archive、服务器或数据库残留。既有脏树未 reset、checkout、clean、stash、commit 或 push。
